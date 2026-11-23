-- Script SQL equivalente para ejecutar en Supabase SQL Editor
-- Crea la tabla puntos_acceso con ID único (UUID), coordenadas validadas en grados decimales
-- y los campos propios del proyecto: edificio, calle_acceso y tipo_entrada.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.users (
  id SERIAL PRIMARY KEY,
  uid TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.puntos_acceso (
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
);

-- Carga inicial de 3 ejemplos en ubicaciones distintas
INSERT INTO public.puntos_acceso (
  nombre_punto,
  latitud,
  longitud,
  edificio,
  calle_acceso,
  tipo_entrada
)
SELECT * FROM (
  VALUES
    (
      'Acceso Norte Ciudad Universitaria',
      -34.544180::double precision,
      -58.439720::double precision,
      'Pabellón I — FCEN UBA',
      'Av. Intendente Güiraldes 2160',
      'con rampa'
    ),
    (
      'Entrada Histórica Paseo Colón',
      -34.617639::double precision,
      -58.368295::double precision,
      'Facultad de Ingeniería — FIUBA',
      'Av. Paseo Colón 850',
      'con escalones'
    ),
    (
      'Ingreso Lateral Plaza Houssay',
      -34.598350::double precision,
      -58.397920::double precision,
      'Facultad de Medicina — UBA',
      'Paraguay 2155',
      'con rampa'
    )
) AS seed(nombre_punto, latitud, longitud, edificio, calle_acceso, tipo_entrada)
WHERE NOT EXISTS (SELECT 1 FROM public.puntos_acceso);
