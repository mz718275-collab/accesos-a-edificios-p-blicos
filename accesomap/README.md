# AccesoMap — Registro Geográfico de Puntos de Acceso

Aplicación full-stack (React, Express, Drizzle ORM, PostgreSQL y Google Maps Platform) para gestionar puntos de acceso edilicio (`con rampa` / `con escalones`) con coordenadas en grados decimales validadas (`latitud` entre `-90` y `90`, `longitud` entre `-180` y `180`).

## Estructura de la tabla `puntos_acceso`

- `id` (`uuid`, clave primaria única autogenerada)
- `nombre_punto` (`text`)
- `latitud` (`double precision`, rango `-90` a `90`)
- `longitud` (`double precision`, rango `-180` a `180`)
- `edificio` (`text`)
- `calle_acceso` (`text`)
- `tipo_entrada` (`text`: `'con rampa'` o `'con escalones'`)

El script completo con restricciones `CHECK` y los 3 puntos de ejemplo se encuentra en `supabase/schema.sql`.

## Conexión con GitHub, Supabase, Render y Google Maps

1. **Supabase**: Ejecutá `supabase/schema.sql` en el SQL Editor de tu proyecto Supabase y copiá los parámetros individuales de conexión del Pooler (`SQL_HOST`, `SQL_PORT`, `SQL_DB_NAME`, `SQL_USER`, `SQL_PASSWORD`, con `SQL_SSL=true`).
2. **GitHub**: Subí este repositorio a GitHub.
3. **Render**: Creá un nuevo **Blueprint** o **Web Service** conectado al repositorio (usa `render.yaml`). Configurá las variables de entorno `SQL_HOST`, `SQL_PORT`, `SQL_DB_NAME`, `SQL_USER`, `SQL_PASSWORD`, `SQL_SSL=true` y `VITE_GOOGLE_MAPS_API_KEY`.
4. **Google Maps Platform**: Habilitá **Maps JavaScript API** en Google Cloud Console y restringí tu clave HTTP Referrer a tu dominio de Render.
