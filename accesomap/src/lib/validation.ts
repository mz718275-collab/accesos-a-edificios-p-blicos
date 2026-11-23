export const TIPOS_ENTRADA = ['con rampa', 'con escalones'] as const;
export type TipoEntrada = (typeof TIPOS_ENTRADA)[number];

export interface AccessPointFormInput {
  nombrePunto: string;
  latitud: string | number;
  longitud: string | number;
  edificio: string;
  calleAcceso: string;
  tipoEntrada: string;
}

export interface ValidatedAccessPointInput {
  nombrePunto: string;
  latitud: number;
  longitud: number;
  edificio: string;
  calleAcceso: string;
  tipoEntrada: TipoEntrada;
}

export interface AccessPointValidationErrors {
  nombrePunto?: string;
  latitud?: string;
  longitud?: string;
  edificio?: string;
  calleAcceso?: string;
  tipoEntrada?: string;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(id: string): boolean {
  return UUID_REGEX.test(id);
}

export function isValidTipoEntrada(value: string): value is TipoEntrada {
  return value === 'con rampa' || value === 'con escalones';
}

export function parseDecimalCoordinate(value: string | number): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  const normalized = value.trim().replace(',', '.');
  if (!normalized) {
    return null;
  }
  if (!/^[+-]?(\d+(\.\d+)?|\.\d+)$/.test(normalized)) {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function validateLatitud(value: string | number): {
  valid: boolean;
  numeric?: number;
  error?: string;
} {
  const num = parseDecimalCoordinate(value);
  if (num === null) {
    return {
      valid: false,
      error: 'Ingresá una latitud válida en grados decimales.',
    };
  }
  if (num < -90 || num > 90) {
    return {
      valid: false,
      error: 'La latitud debe estar entre −90 y 90 grados decimales.',
    };
  }
  return { valid: true, numeric: num };
}

export function validateLongitud(value: string | number): {
  valid: boolean;
  numeric?: number;
  error?: string;
} {
  const num = parseDecimalCoordinate(value);
  if (num === null) {
    return {
      valid: false,
      error: 'Ingresá una longitud válida en grados decimales.',
    };
  }
  if (num < -180 || num > 180) {
    return {
      valid: false,
      error: 'La longitud debe estar entre −180 y 180 grados decimales.',
    };
  }
  return { valid: true, numeric: num };
}

export function validateAccessPointInput(
  raw: Partial<AccessPointFormInput> | Record<string, unknown>,
):
  | { ok: true; value: ValidatedAccessPointInput }
  | { ok: false; errors: AccessPointValidationErrors } {
  const errors: AccessPointValidationErrors = {};

  const nombrePunto =
    typeof raw.nombrePunto === 'string' ? raw.nombrePunto.trim() : '';
  const edificio = typeof raw.edificio === 'string' ? raw.edificio.trim() : '';
  const calleAcceso =
    typeof raw.calleAcceso === 'string' ? raw.calleAcceso.trim() : '';
  const tipoEntrada =
    typeof raw.tipoEntrada === 'string' ? raw.tipoEntrada.trim() : '';

  if (!nombrePunto) {
    errors.nombrePunto = 'El nombre del punto es obligatorio.';
  } else if (nombrePunto.length > 140) {
    errors.nombrePunto = 'El nombre del punto no puede superar los 140 caracteres.';
  }

  if (!edificio) {
    errors.edificio = 'El edificio es obligatorio.';
  } else if (edificio.length > 140) {
    errors.edificio = 'El nombre del edificio no puede superar los 140 caracteres.';
  }

  if (!calleAcceso) {
    errors.calleAcceso = 'La calle de acceso es obligatoria.';
  } else if (calleAcceso.length > 180) {
    errors.calleAcceso = 'La calle de acceso no puede superar los 180 caracteres.';
  }

  if (!isValidTipoEntrada(tipoEntrada)) {
    errors.tipoEntrada = 'Seleccioná "con rampa" o "con escalones".';
  }

  const latCheck = validateLatitud(
    typeof raw.latitud === 'number' || typeof raw.latitud === 'string'
      ? raw.latitud
      : '',
  );
  if (!latCheck.valid) {
    errors.latitud = latCheck.error;
  }

  const lngCheck = validateLongitud(
    typeof raw.longitud === 'number' || typeof raw.longitud === 'string'
      ? raw.longitud
      : '',
  );
  if (!lngCheck.valid) {
    errors.longitud = lngCheck.error;
  }

  if (
    Object.keys(errors).length > 0 ||
    !isValidTipoEntrada(tipoEntrada) ||
    latCheck.numeric === undefined ||
    lngCheck.numeric === undefined
  ) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      nombrePunto,
      latitud: latCheck.numeric,
      longitud: lngCheck.numeric,
      edificio,
      calleAcceso,
      tipoEntrada,
    },
  };
}
