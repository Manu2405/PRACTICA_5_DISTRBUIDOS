package services

import "strconv"

type TarifaRow struct {
	Alias            string
	Categoria        string
	ConsumoMinimoM3  float64
	CargoFijo        float64
	R13_25           float64
	R26_50           float64
	R51_75           float64
	R76_100          float64
	R101_150         float64
	R151Mas          float64
}

type BloqueDetalle struct {
	Bloque   string  `json:"bloque"`
	M3       float64 `json:"m3"`
	Tarifa   float64 `json:"tarifa"`
	Subtotal float64 `json:"subtotal"`
}

type CalculoResult struct {
	ConsumoM3       float64         `json:"consumoM3"`
	MontoBs         float64         `json:"montoBs"`
	CargoFijo       float64         `json:"cargoFijo"`
	ConsumoMinimo   float64         `json:"consumoMinimo"`
	Categoria       string          `json:"categoria"`
	Alias           string          `json:"alias"`
	ExcesoM3        float64         `json:"excesoM3"`
	DetalleBloques  []BloqueDetalle `json:"detalleBloques"`
}

func dec(v interface{}) float64 {
	switch x := v.(type) {
	case float64:
		return x
	case float32:
		return float64(x)
	case int:
		return float64(x)
	case int64:
		return float64(x)
	default:
		if x != nil {
			f, _ := strconv.ParseFloat(stringify(x), 64)
			return f
		}
	}
	return 0
}

func stringify(v interface{}) string {
	switch x := v.(type) {
	case string:
		return x
	default:
		return ""
	}
}

func CalcularMonto(consumoM3 float64, t TarifaRow) CalculoResult {
	minimo := t.ConsumoMinimoM3
	if minimo == 0 {
		minimo = 12
	}
	cargo := t.CargoFijo
	consumo := consumoM3
	if consumo < 0 {
		consumo = 0
	}
	monto := cargo
	detalle := []BloqueDetalle{{Bloque: "0-" + formatF(minimo), M3: consumo, Tarifa: 0, Subtotal: cargo}}

	if consumo <= minimo {
		return CalculoResult{
			ConsumoM3: consumo, MontoBs: monto, CargoFijo: cargo, ConsumoMinimo: minimo,
			Categoria: t.Categoria, Alias: t.Alias, ExcesoM3: 0, DetalleBloques: detalle,
		}
	}

	exceso := consumo - minimo
	bloques := []struct {
		desde, hasta float64
		tarifa       float64
		label        string
	}{
		{13, 25, t.R13_25, "13-25"},
		{26, 50, t.R26_50, "26-50"},
		{51, 75, t.R51_75, "51-75"},
		{76, 100, t.R76_100, "76-100"},
		{101, 150, t.R101_150, "101-150"},
		{151, 1e9, t.R151Mas, "151+"},
	}

	detalle = append(detalle, BloqueDetalle{Bloque: "0-" + formatF(minimo), M3: minimo, Tarifa: 0, Subtotal: cargo})
	for _, b := range bloques {
		if exceso <= 0 {
			break
		}
		ancho := b.hasta - b.desde + 1
		if b.hasta > 1e8 {
			ancho = exceso
		}
		m3 := exceso
		if m3 > ancho {
			m3 = ancho
		}
		sub := m3 * b.tarifa
		monto += sub
		detalle = append(detalle, BloqueDetalle{Bloque: b.label, M3: m3, Tarifa: b.tarifa, Subtotal: sub})
		exceso -= m3
	}

	return CalculoResult{
		ConsumoM3: consumo, MontoBs: monto, CargoFijo: cargo, ConsumoMinimo: minimo,
		Categoria: t.Categoria, Alias: t.Alias, ExcesoM3: consumo - minimo, DetalleBloques: detalle,
	}
}

func formatF(f float64) string {
	return strconv.FormatFloat(f, 'f', 0, 64)
}
