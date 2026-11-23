import 'dotenv/config';
import express from 'express';
import path from 'path';
import {
  createAccessPoint,
  deleteAccessPoint,
  getAccessPointById,
  listAccessPoints,
  updateAccessPoint,
} from './src/db/accessPoints.ts';
import {
  isValidTipoEntrada,
  isValidUuid,
  validateAccessPointInput,
  type TipoEntrada,
} from './src/lib/validation.ts';
import { requireAuth, type AuthRequest } from './src/middleware/auth.ts';

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '256kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/access-points', requireAuth, async (req: AuthRequest, res) => {
    try {
      const rawTipo = req.query.tipoEntrada;
      let tipoEntrada: TipoEntrada | undefined;

      if (typeof rawTipo === 'string' && rawTipo.trim() !== '') {
        const normalized = rawTipo.trim();
        if (!isValidTipoEntrada(normalized)) {
          res.status(400).json({
            error: 'Filtro inválido. Usá "con rampa" o "con escalones".',
          });
          return;
        }
        tipoEntrada = normalized;
      }

      const items = await listAccessPoints(tipoEntrada);
      res.json({ items });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Error al obtener los puntos de acceso.';
      res.status(500).json({ error: message });
    }
  });

  app.get(
    '/api/access-points/:id',
    requireAuth,
    async (req: AuthRequest, res) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id || !isValidUuid(id)) {
        res.status(400).json({ error: 'Identificador de punto inválido.' });
        return;
      }

      try {
        const item = await getAccessPointById(id);
        if (!item) {
          res.status(404).json({ error: 'Punto de acceso no encontrado.' });
          return;
        }
        res.json({ item });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Error al obtener el punto de acceso.';
        res.status(500).json({ error: message });
      }
    },
  );

  app.post('/api/access-points', requireAuth, async (req: AuthRequest, res) => {
    const validation = validateAccessPointInput(req.body ?? {});
    if (!validation.ok) {
      res.status(400).json({
        error: 'Revisá los campos ingresados.',
        errors: validation.errors,
      });
      return;
    }

    try {
      const created = await createAccessPoint(
        validation.value,
        req.user!.uid,
      );
      res.status(201).json({ item: created });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Error al crear el punto de acceso.';
      res.status(500).json({ error: message });
    }
  });

  app.put(
    '/api/access-points/:id',
    requireAuth,
    async (req: AuthRequest, res) => {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      if (!id || !isValidUuid(id)) {
        res.status(400).json({ error: 'Identificador de punto inválido.' });
        return;
      }

      const validation = validateAccessPointInput(req.body ?? {});
      if (!validation.ok) {
        res.status(400).json({
          error: 'Revisá los campos ingresados.',
          errors: validation.errors,
        });
        return;
      }

      try {
        const updated = await updateAccessPoint(id, validation.value);
        if (!updated) {
          res.status(404).json({ error: 'Punto de acceso no encontrado.' });
          return;
        }
        res.json({ item: updated });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Error al actualizar el punto de acceso.';
        res.status(500).json({ error: message });
      }
    },
  );

  app.delete(
    '/api/access-points/:id',
    requireAuth,
    async (req: AuthRequest, res) => {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      if (!id || !isValidUuid(id)) {
        res.status(400).json({ error: 'Identificador de punto inválido.' });
        return;
      }

      try {
        const deleted = await deleteAccessPoint(id);
        if (!deleted) {
          res.status(404).json({ error: 'Punto de acceso no encontrado.' });
          return;
        }
        res.json({ ok: true, id });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Error al eliminar el punto de acceso.';
        res.status(500).json({ error: message });
      }
    },
  );

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(import.meta.dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
