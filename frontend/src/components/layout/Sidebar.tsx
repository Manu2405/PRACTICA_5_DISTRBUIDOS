import { Link, useLocation } from 'react-router-dom'

const links = [
  { to: '/operacional', label: 'Operacional' },
  { to: '/contabilidad', label: 'Contabilidad' },
  { to: '/administracion', label: 'Administración' },
  { to: '/factura', label: 'Factura' },
]

export function Sidebar() {
  const { pathname } = useLocation()
  return (
    <aside className="flex w-56 flex-col border-r border-border bg-background/80 p-4">
      <div className="mb-6 font-semibold tracking-tight text-accent">SEMAPA</div>
      <nav className="flex flex-col gap-1">
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className={`rounded-md px-3 py-2 text-sm transition-colors hover:bg-foreground/10 ${
              pathname.startsWith(l.to) ? 'bg-foreground/10 text-accent' : 'text-muted'
            }`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
