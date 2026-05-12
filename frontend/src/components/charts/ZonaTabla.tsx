type Row = { zona: string; pct: number }

const rows: Row[] = [
  { zona: 'Centro', pct: 72 },
  { zona: 'Sur', pct: 54 },
  { zona: 'Norte', pct: 61 },
]

export function ZonaTabla() {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-foreground/5">
          <tr>
            <th className="px-4 py-2 font-medium">Zona</th>
            <th className="px-4 py-2 font-medium">Cobertura</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.zona} className="border-b border-border last:border-0">
              <td className="px-4 py-2">{r.zona}</td>
              <td className="px-4 py-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-foreground/10">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${r.pct}%` }} />
                  </div>
                  <span className="w-10 text-right tabular-nums text-muted">{r.pct}%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
