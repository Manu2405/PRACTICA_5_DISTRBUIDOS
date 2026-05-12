import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import OperacionalPage from './pages/OperacionalPage';
import ContabilidadPage from './pages/ContabilidadPage';
import AdministracionPage from './pages/AdministracionPage';
import FacturaPage from './pages/FacturaPage';
import ConsultasPage from './pages/ConsultasPage';
import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/operacional" replace />} />
            <Route path="/operacional" element={<OperacionalPage />} />
            <Route path="/contabilidad" element={<ContabilidadPage />} />
            <Route path="/administracion" element={<AdministracionPage />} />
            <Route path="/factura" element={<FacturaPage />} />
            <Route path="/consultas" element={<ConsultasPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
