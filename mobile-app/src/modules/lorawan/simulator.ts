import type { LorawanReading } from '../../types';

export type PerfilConsumo = 'bajo' | 'medio' | 'alto' | 'industrial';

const PERFILES: Record<PerfilConsumo, { min: number; max: number }> = {
  bajo: { min: 0.3, max: 0.8 },
  medio: { min: 0.8, max: 1.5 },
  alto: { min: 1.5, max: 3.0 },
  industrial: { min: 2.5, max: 8.0 },
};

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

/** Simulación local LoRaWAN (también disponible vía API) */
export function simularLecturaLocal(
  codigo_medidor: string,
  perfil: PerfilConsumo = 'medio',
  acumuladoBase = 15400
): LorawanReading {
  const p = PERFILES[perfil];
  const consumo_dia = +rand(p.min, p.max).toFixed(2);
  return {
    codigo_medidor,
    fecha: new Date().toISOString().slice(0, 10),
    consumo_dia,
    consumo_acumulado: +(acumuladoBase + consumo_dia).toFixed(2),
    perfil,
    tecnologia: 'LoRaWAN',
    rssi: Math.floor(rand(-120, -70)),
    snr: +rand(5, 12).toFixed(1),
  };
}

export function simularMultiplesMedidores(
  codigos: string[],
  perfil: PerfilConsumo = 'medio'
): LorawanReading[] {
  return codigos.map((c, i) => simularLecturaLocal(c, perfil, 14000 + i * 120));
}
