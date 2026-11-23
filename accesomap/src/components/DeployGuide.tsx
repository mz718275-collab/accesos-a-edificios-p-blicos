import { Check, Copy, Database, GitBranch, Map, Server } from 'lucide-react';
import { useState } from 'react';

const SUPABASE_SQL_SNIPPET = `CREATE TABLE IF NOT EXISTS public.puntos_acceso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_punto TEXT NOT NULL,
  latitud DOUBLE PRECISION NOT NULL CHECK (latitud >= -90 AND latitud <= 90),
  longitud DOUBLE PRECISION NOT NULL CHECK (longitud >= -180 AND longitud <= 180),
  edificio TEXT NOT NULL,
  calle_acceso TEXT NOT NULL,
  tipo_entrada TEXT NOT NULL CHECK (tipo_entrada IN ('con rampa', 'con escalones')),
  created_by_uid TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);`;

export function DeployGuide() {
  const [copied, setCopied] = useState(false);

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_SQL_SNIPPET);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard may be restricted in some iframes
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="border-b border-slate-200 pb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
          Arquitectura y despliegue
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          Este proyecto incluye la configuración lista para publicar el código en GitHub, desplegar el servidor Express + React en Render y conectarlo a una tabla PostgreSQL en Supabase junto con Google Maps Platform.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2">
        <section className="border-b border-slate-200 pb-6 md:border-b-0 md:border-r md:pr-8">
          <div className="flex items-center gap-2.5 text-slate-900">
            <Database className="h-5 w-5 text-teal-700" />
            <h2 className="font-display text-base font-semibold">
              1. Tabla en Supabase (PostgreSQL)
            </h2>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            El archivo <span className="font-mono-nums text-slate-800">supabase/schema.sql</span> define la tabla <span className="font-mono-nums text-slate-800">puntos_acceso</span> con restricciones de rango para grados decimales (<span className="font-mono-nums">−90..90</span> y <span className="font-mono-nums">−180..180</span>) y carga los 3 registros iniciales.
          </p>
          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-800 px-3.5 py-2 text-xs text-slate-300">
              <span className="font-mono-nums">supabase/schema.sql</span>
              <button
                type="button"
                onClick={handleCopySql}
                className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-teal-400" />
                    <span>Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copiar SQL</span>
                  </>
                )}
              </button>
            </div>
            <pre className="font-mono-nums overflow-x-auto p-3.5 text-xs leading-relaxed text-slate-200">
              {SUPABASE_SQL_SNIPPET}
            </pre>
          </div>
        </section>

        <div className="space-y-6">
          <section className="border-b border-slate-200 pb-5">
            <div className="flex items-center gap-2.5 text-slate-900">
              <GitBranch className="h-5 w-5 text-teal-700" />
              <h2 className="font-display text-base font-semibold">
                2. Repositorio en GitHub
              </h2>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Subí el proyecto completo (incluyendo <span className="font-mono-nums text-slate-800">render.yaml</span>, <span className="font-mono-nums text-slate-800">server.ts</span> y <span className="font-mono-nums text-slate-800">src/db/schema.ts</span>) a tu repositorio en GitHub sin incluir archivos <span className="font-mono-nums text-slate-800">.env</span> locales.
            </p>
          </section>

          <section className="border-b border-slate-200 pb-5">
            <div className="flex items-center gap-2.5 text-slate-900">
              <Server className="h-5 w-5 text-teal-700" />
              <h2 className="font-display text-base font-semibold">
                3. Web Service en Render
              </h2>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Conectá tu repo en Render usando <span className="font-mono-nums text-slate-800">render.yaml</span> (<span className="font-mono-nums">npm install &amp;&amp; npm run build</span> y <span className="font-mono-nums">npm start</span>) y definí en Environment Variables los parámetros de conexión de Supabase (<span className="font-mono-nums">SQL_HOST</span>, <span className="font-mono-nums">SQL_PORT</span>, <span className="font-mono-nums">SQL_DB_NAME</span>, <span className="font-mono-nums">SQL_USER</span>, <span className="font-mono-nums">SQL_PASSWORD</span>, <span className="font-mono-nums">SQL_SSL=true</span>).
            </p>
          </section>

          <section>
            <div className="flex items-center gap-2.5 text-slate-900">
              <Map className="h-5 w-5 text-teal-700" />
              <h2 className="font-display text-base font-semibold">
                4. Clave de Google Maps Platform
              </h2>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Configurá <span className="font-mono-nums text-slate-800">VITE_GOOGLE_MAPS_API_KEY</span> en Render y restringí la clave en Google Cloud Console por HTTP Referrer hacia tu dominio de producción y únicamente para Maps JavaScript API.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
