import type { TipoEntrada } from '../lib/validation.ts';

export interface AccessPoint {
  id: string;
  nombrePunto: string;
  latitud: number;
  longitud: number;
  edificio: string;
  calleAcceso: string;
  tipoEntrada: TipoEntrada;
  createdByUid?: string | null;
  createdAt: string;
  updatedAt: string;
}
