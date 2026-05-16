import express from 'express';
import cors from 'cors';
import db from './db.js';
import { registrarConsultas } from './consultas.js';

// MVC Routes
import operacionalRoutes from './src/routes/operacionalRoutes.js';
import contabilidadRoutes from './src/routes/contabilidadRoutes.js';
import alcaldiaRoutes from './src/routes/alcaldiaRoutes.js';
import administracionRoutes from './src/routes/administracionRoutes.js';
import catalogosRoutes from './src/routes/catalogosRoutes.js';
import consultasRoutes from './src/routes/consultasRoutes.js';
import visorRoutes from './src/routes/visorRoutes.js';
import facturacionRoutes from './src/routes/facturacionRoutes.js';
import notificacionRoutes from './src/routes/notificacionRoutes.js';

const app = express();
app.use(cors({ origin: ['http://localhost:5173','http://localhost:5174','http://localhost:3000'], credentials: true }));
app.use(express.json());
app.use('/recibos', express.static('./recibos'));

// HEALTH
app.get('/health', async (_, res) => {
  try { await db.execute('SELECT now() FROM system.local'); res.json({ status:'ok', database:'connected', service:'semapa-backend' }); }
  catch { res.status(503).json({ status:'error', database:'disconnected' }); }
});

// MOUNT MVC ROUTES
// Todas las rutas han sido refactorizadas al patrón MVC
app.use('/api/mvc/operacional', operacionalRoutes);
app.use('/api/mvc/contabilidad', contabilidadRoutes);
app.use('/api/mvc/alcaldia', alcaldiaRoutes);
app.use('/api/mvc/administracion', administracionRoutes);
app.use('/api/mvc/catalogos', catalogosRoutes);
app.use('/api/mvc/consultas', consultasRoutes);
app.use('/api/mvc/visor', visorRoutes);
app.use('/api/mvc/factura', facturacionRoutes);
app.use('/api/mvc/notificacion', notificacionRoutes);

// COMPATIBILIDAD (Para que el frontend viejo siga funcionando mientras se migra)
// Se re-montan en la misma ruta base
app.use('/api/operacional', operacionalRoutes);
app.use('/api/contabilidad', contabilidadRoutes);
app.use('/api/alcaldia', alcaldiaRoutes);
app.use('/api/administracion', administracionRoutes);
app.use('/api/catalogos', catalogosRoutes);
app.use('/api/consultas', consultasRoutes);
app.use('/api/visor', visorRoutes);
app.use('/api/factura', facturacionRoutes);
app.use('/api/notificacion', notificacionRoutes);

// 25 CONSULTAS ESTRATÉGICAS
registrarConsultas(app, db);

// START
await db.connect();
console.log('✅ Cassandra conectada');
app.listen(8080, () => { console.log('🚀 SEMAPA Backend en http://localhost:8080 (MVC Activo)'); });
