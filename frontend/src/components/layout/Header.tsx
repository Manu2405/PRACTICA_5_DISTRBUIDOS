import { Button } from '@/components/ui/button'

export function Header() {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-border bg-background/80 px-6 py-3">
      <div className="flex flex-1 items-center gap-3">
        <input
          type="search"
          placeholder="Buscar cliente o medidor…"
          className="h-9 max-w-md flex-1 rounded-md border border-border bg-transparent px-3 text-sm outline-none ring-accent focus:ring-2"
        />
        <Button type="button" variant="outline" size="sm">
          Filtros
        </Button>
        <Button type="button" variant="outline" size="sm">
          Rango de fechas
        </Button>
      </div>
      <div className="h-9 w-9 rounded-full border border-border bg-foreground/10" title="Usuario" />
    </header>
  )
}
