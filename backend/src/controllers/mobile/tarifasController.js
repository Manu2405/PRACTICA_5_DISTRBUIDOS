import db from '../../../db.js';
import { calcularMontoPorConsumo, calcularMontoMultiplesMedidores } from '../../services/tarifaService.js';

const dec = (v) => (v != null ? parseFloat(v.toString()) : 0);

export const getTarifas = async (req, res) => {
  try {
    const rows = (await db.execute('SELECT * FROM catalogo_tarifas')).rows;
    const categoria = req.query.categoria;
    const filtered = categoria
      ? rows.filter((r) => (r.categoria || '').toUpperCase().includes(categoria.toUpperCase()))
      : rows;
    res.json(
      filtered.map((r) => ({
        alias: r.alias,
        categoria: r.categoria,
        descripcion: r.descripcion,
        consumoMinimoM3: dec(r.consumo_minimo_m3),
        cargoFijo: dec(r.cargo_fijo),
        rangos: {
          r13_25: dec(r.rango_13_25),
          r26_50: dec(r.rango_26_50),
          r51_75: dec(r.rango_51_75),
          r76_100: dec(r.rango_76_100),
          r101_150: dec(r.rango_101_150),
          r151mas: dec(r.rango_151_mas),
        },
        moneda: r.moneda || 'BOB',
      }))
    );
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const calcularFactura = async (req, res) => {
  const { consumo_m3, tarifa_alias, medidores, numero_contrato } = req.body;

  try {
    let tarifaAlias = tarifa_alias;

    if (numero_contrato && !tarifaAlias) {
      const ct = (
        await db.execute('SELECT tarifa_alias FROM contratos_por_numero WHERE numero_contrato = ?', [
          numero_contrato,
        ], { prepare: true })
      ).rows[0];
      if (ct) tarifaAlias = ct.tarifa_alias;
    }

    if (!tarifaAlias) return res.status(400).json({ error: 'tarifa_alias o numero_contrato requerido' });

    const tarifa = (
      await db.execute('SELECT * FROM catalogo_tarifas WHERE alias = ?', [tarifaAlias], { prepare: true })
    ).rows[0];
    if (!tarifa) return res.status(404).json({ error: 'Tarifa no encontrada' });

    let resultado;
    if (Array.isArray(medidores) && medidores.length > 0) {
      resultado = calcularMontoMultiplesMedidores(medidores, tarifa);
    } else if (consumo_m3 == null) {
      return res.status(400).json({ error: 'consumo_m3 o medidores[] requerido' });
    } else {
      resultado = calcularMontoPorConsumo(consumo_m3, tarifa);
    }

    res.json({
      ...resultado,
      tarifaAlias,
      reglamento: 'SEMAPA - Política Tarifaria (bloques progresivos R1/R2/R3)',
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
