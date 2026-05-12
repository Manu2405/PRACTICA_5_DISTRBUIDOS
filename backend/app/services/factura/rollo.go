package factura

import (
	"bytes"
	"errors"
	"fmt"

	"github.com/go-pdf/fpdf"

	"semapa/backend/app/schemas"
)

// TicketRollo PDF ticket ~80 mm de ancho.
func TicketRollo(meta schemas.FacturaMeta) ([]byte, error) {
	if meta.Numero == "" {
		return nil, errors.New("numero requerido")
	}
	pdf := fpdf.NewCustom(&fpdf.InitType{
		OrientationStr: "P",
		UnitStr:          "mm",
		SizeStr:          "",
		Size:             fpdf.SizeType{Wd: 80, Ht: 200},
		FontDirStr:       "",
	})
	pdf.AddPage()
	pdf.SetFont("helvetica", "", 11)
	pdf.SetXY(8, 12)
	pdf.CellFormat(64, 6, fmt.Sprintf("SEMAPA — Recibo %s", meta.Numero), "", 1, "L", false, 0, "")
	if meta.Cliente != "" {
		pdf.SetX(8)
		pdf.CellFormat(64, 6, "Cliente: "+meta.Cliente, "", 1, "L", false, 0, "")
	}
	if meta.Periodo != "" {
		pdf.SetX(8)
		pdf.CellFormat(64, 6, "Periodo: "+meta.Periodo, "", 1, "L", false, 0, "")
	}
	if meta.Importe != "" {
		cur := meta.Currency
		if cur == "" {
			cur = "Bs"
		}
		pdf.SetX(8)
		pdf.CellFormat(64, 6, fmt.Sprintf("Importe (%s): %s", cur, meta.Importe), "", 1, "L", false, 0, "")
	}
	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
