package services

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/jung-kurt/gofpdf"
)

// DatosRecibo contiene la info para generar el recibo
type DatosRecibo struct {
	NumeroContrato string
	NombreTitular  string
	Identificador  string
	TipoPersona    string
	Direccion      string
	Distrito       string
	Zona           string
	TarifaAlias    string
	Periodo        string
	ConsumoM3      float64
	MontoBs        float64
	NumeroMedidor  string
}

const baseDir = "./recibos"

func ensureDir(dir string) {
	os.MkdirAll(dir, 0755)
}

// GenerarMediaCarta genera un recibo formato media carta (Letter/2)
func GenerarMediaCarta(d DatosRecibo) (string, error) {
	dir := filepath.Join(baseDir, "media_carta")
	ensureDir(dir)
	filename := fmt.Sprintf("%s-%s.pdf", d.NumeroContrato, d.Periodo)
	path := filepath.Join(dir, filename)

	pdf := gofpdf.New("P", "mm", "Letter", "")
	pdf.SetMargins(15, 15, 15)
	pdf.AddPage()

	// Header - Fondo azul
	pdf.SetFillColor(0, 102, 204)
	pdf.Rect(0, 0, 216, 38, "F")
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Helvetica", "B", 22)
	pdf.SetXY(15, 8)
	pdf.Cell(0, 10, "SEMAPA")
	pdf.SetFont("Helvetica", "", 9)
	pdf.SetXY(15, 20)
	pdf.Cell(0, 6, "Servicio Municipal de Agua Potable y Alcantarillado")
	pdf.SetXY(15, 26)
	pdf.Cell(0, 6, "Cochabamba - Bolivia")

	// Título recibo
	pdf.SetTextColor(0, 102, 204)
	pdf.SetFont("Helvetica", "B", 14)
	pdf.SetXY(15, 45)
	pdf.Cell(0, 8, fmt.Sprintf("RECIBO DE CONSUMO - %s", d.Periodo))

	// Línea
	pdf.SetDrawColor(0, 102, 204)
	pdf.SetLineWidth(0.5)
	pdf.Line(15, 55, 200, 55)

	// Datos del cliente
	pdf.SetTextColor(60, 60, 60)
	pdf.SetFont("Helvetica", "B", 10)
	pdf.SetXY(15, 60)
	pdf.Cell(0, 7, "DATOS DEL TITULAR")

	y := 70.0
	row := func(label, value string) {
		pdf.SetFont("Helvetica", "B", 9)
		pdf.SetXY(15, y)
		pdf.Cell(50, 6, label)
		pdf.SetFont("Helvetica", "", 9)
		pdf.SetXY(65, y)
		pdf.Cell(0, 6, value)
		y += 7
	}

	row("Contrato:", d.NumeroContrato)
	row("Titular:", d.NombreTitular)
	row("Identificador:", d.Identificador)
	row("Tipo:", d.TipoPersona)
	row("Direccion:", d.Direccion)
	row("Distrito:", d.Distrito)
	row("Zona:", d.Zona)
	row("Tarifa:", d.TarifaAlias)

	// Línea
	y += 3
	pdf.Line(15, y, 200, y)
	y += 5

	// Detalle consumo
	pdf.SetTextColor(0, 102, 204)
	pdf.SetFont("Helvetica", "B", 10)
	pdf.SetXY(15, y)
	pdf.Cell(0, 7, "DETALLE DE CONSUMO")
	y += 10

	pdf.SetTextColor(60, 60, 60)
	row("Periodo:", d.Periodo)
	if d.NumeroMedidor != "" {
		row("Medidor:", d.NumeroMedidor)
	}
	row("Consumo:", fmt.Sprintf("%.2f m3", d.ConsumoM3))
	row("Estado:", "pendiente")

	// Total
	y += 5
	pdf.SetDrawColor(0, 102, 204)
	pdf.Line(15, y, 200, y)
	y += 8

	pdf.SetTextColor(0, 102, 204)
	pdf.SetFont("Helvetica", "B", 18)
	pdf.SetXY(15, y)
	totalStr := fmt.Sprintf("TOTAL A PAGAR: Bs %.2f", d.MontoBs)
	pdf.CellFormat(185, 12, totalStr, "", 0, "C", false, 0, "")
	y += 18

	pdf.SetDrawColor(0, 102, 204)
	pdf.Line(15, y, 200, y)
	y += 8

	// Footer
	pdf.SetTextColor(150, 150, 150)
	pdf.SetFont("Helvetica", "", 7)
	pdf.SetXY(15, y)
	pdf.CellFormat(185, 5, "Este documento es un comprobante digital generado por el sistema SEMAPA.", "", 0, "C", false, 0, "")
	y += 5
	pdf.SetXY(15, y)
	pdf.CellFormat(185, 5, "Para consultas: 800-10-1234 | www.semapa.gob.bo", "", 0, "C", false, 0, "")

	return filepath.Join("media_carta", filename), pdf.OutputFileAndClose(path)
}

// GenerarRolloTermico genera un recibo formato ticket térmico (80mm ancho)
func GenerarRolloTermico(d DatosRecibo) (string, error) {
	dir := filepath.Join(baseDir, "rollo_termico")
	ensureDir(dir)
	filename := fmt.Sprintf("%s-%s.pdf", d.NumeroContrato, d.Periodo)
	path := filepath.Join(dir, filename)

	// 80mm ancho, alto dinámico
	pdf := gofpdf.NewCustom(&gofpdf.InitType{
		UnitStr: "mm",
		Size:    gofpdf.SizeType{Wd: 80, Ht: 200},
	})
	pdf.SetMargins(5, 5, 5)
	pdf.AddPage()

	// Header
	pdf.SetFont("Courier", "B", 14)
	pdf.CellFormat(70, 8, "SEMAPA", "", 1, "C", false, 0, "")
	pdf.SetFont("Courier", "", 8)
	pdf.CellFormat(70, 5, "RECIBO DE AGUA", "", 1, "C", false, 0, "")
	pdf.CellFormat(70, 5, "------------------------------", "", 1, "C", false, 0, "")

	// Datos
	line := func(label, value string) {
		pdf.SetFont("Courier", "B", 7)
		pdf.Cell(25, 4, label)
		pdf.SetFont("Courier", "", 7)
		pdf.Cell(45, 4, value)
		pdf.Ln(4.5)
	}

	line("Cliente:", truncate(d.NombreTitular, 28))
	line("Contrato:", d.NumeroContrato)
	line("ID:", d.Identificador)
	line("Periodo:", d.Periodo)
	if d.NumeroMedidor != "" {
		line("Medidor:", d.NumeroMedidor)
	}
	line("Tarifa:", d.TarifaAlias)
	line("Distrito:", d.Distrito)
	line("Zona:", truncate(d.Zona, 28))

	pdf.SetFont("Courier", "", 8)
	pdf.CellFormat(70, 5, "------------------------------", "", 1, "C", false, 0, "")

	// Consumo y total
	pdf.SetFont("Courier", "B", 8)
	pdf.Cell(35, 5, "Consumo:")
	pdf.SetFont("Courier", "", 8)
	pdf.Cell(35, 5, fmt.Sprintf("%.2f m3", d.ConsumoM3))
	pdf.Ln(6)

	pdf.SetFont("Courier", "B", 12)
	pdf.CellFormat(70, 8, fmt.Sprintf("TOTAL: Bs %.2f", d.MontoBs), "", 1, "C", false, 0, "")

	pdf.SetFont("Courier", "", 8)
	pdf.CellFormat(70, 5, "------------------------------", "", 1, "C", false, 0, "")

	// Footer
	pdf.SetFont("Courier", "", 6)
	pdf.CellFormat(70, 4, "Gracias por su pago puntual", "", 1, "C", false, 0, "")
	pdf.CellFormat(70, 4, "SEMAPA - Cochabamba", "", 1, "C", false, 0, "")
	pdf.CellFormat(70, 4, "800-10-1234", "", 1, "C", false, 0, "")

	return filepath.Join("rollo_termico", filename), pdf.OutputFileAndClose(path)
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max-3] + "..."
}
