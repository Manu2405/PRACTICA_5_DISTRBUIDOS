package factura

import (
	"bytes"
	"errors"
	"fmt"

	"github.com/go-pdf/fpdf"

	"semapa/backend/app/schemas"
)

// HojaMediaCarta PDF media carta (mitad de altura letter en mm).
func HojaMediaCarta(meta schemas.FacturaMeta) ([]byte, error) {
	if meta.Numero == "" {
		return nil, errors.New("numero requerido")
	}
	const letterW = 215.9
	const letterH = 139.7 // ~media carta en altura
	pdf := fpdf.NewCustom(&fpdf.InitType{
		OrientationStr: "P",
		UnitStr:          "mm",
		SizeStr:          "",
		Size:             fpdf.SizeType{Wd: letterW, Ht: letterH},
		FontDirStr:       "",
	})
	pdf.AddPage()
	pdf.SetFont("helvetica", "", 12)
	pdf.SetXY(20, 20)
	pdf.CellFormat(0, 8, fmt.Sprintf("SEMAPA — Factura %s", meta.Numero), "", 1, "L", false, 0, "")
	if meta.Cliente != "" {
		pdf.SetX(20)
		pdf.CellFormat(0, 8, "Cliente: "+meta.Cliente, "", 1, "L", false, 0, "")
	}
	if meta.Periodo != "" {
		pdf.SetX(20)
		pdf.CellFormat(0, 8, "Periodo: "+meta.Periodo, "", 1, "L", false, 0, "")
	}
	if meta.Importe != "" {
		cur := meta.Currency
		if cur == "" {
			cur = "Bs"
		}
		pdf.SetX(20)
		pdf.CellFormat(0, 8, fmt.Sprintf("Importe (%s): %s", cur, meta.Importe), "", 1, "L", false, 0, "")
	}
	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
