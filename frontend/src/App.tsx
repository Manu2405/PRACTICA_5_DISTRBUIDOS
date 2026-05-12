import { Navigate, Route, Routes } from 'react-router-dom'

import { AppLayout } from '@/components/layout/AppLayout'
import Administracion from '@/pages/Administracion'
import Contabilidad from '@/pages/Contabilidad'
import Factura from '@/pages/Factura'
import Operacional from '@/pages/Operacional'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/operacional" replace />} />
        <Route path="/operacional" element={<Operacional />} />
        <Route path="/contabilidad" element={<Contabilidad />} />
        <Route path="/administracion" element={<Administracion />} />
        <Route path="/factura" element={<Factura />} />
      </Route>
    </Routes>
  )
}
