import { useEffect, useState, type FormEvent } from 'react';
import { Accessibility, Crosshair, Footprints, X } from 'lucide-react';
import {
  validateAccessPointInput,
  validateLatitud,
  validateLongitud,
  type AccessPointValidationErrors,
  type TipoEntrada,
} from '../lib/validation.ts';
import type { AccessPoint } from '../types/accessPoint.ts';

interface PointFormModalProps {
  isOpen: boolean;
  editingPoint: AccessPoint | null;
  pickedCoords: { lat: number; lng: number } | null;
  pickMode: boolean;
  onTogglePickMode: () => void;
  onClose: () => void;
  onSave: (payload: {
    nombrePunto: string;
    edificio: string;
    calleAcceso: string;
    tipoEntrada: TipoEntrada;
    latitud: number;
    longitud: number;
  }) => Promise<void>;
}

export function PointFormModal({
  isOpen,
  editingPoint,
  pickedCoords,
  pickMode,
  onTogglePickMode,
  onClose,
  onSave,
}: PointFormModalProps) {
  const [nombrePunto, setNombrePunto] = useState('');
  const [edificio, setEdificio] = useState('');
  const [calleAcceso, setCalleAcceso] = useState('');
  const [tipoEntrada, setTipoEntrada] = useState<TipoEntrada>('con rampa');
  const [latitud, setLatitud] = useState('');
  const [longitud, setLongitud] = useState('');
  const [errors, setErrors] = useState<AccessPointValidationErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    if (editingPoint) {
      setNombrePunto(editingPoint.nombrePunto);
      setEdificio(editingPoint.edificio);
      setCalleAcceso(editingPoint.calleAcceso);
      setTipoEntrada(editingPoint.tipoEntrada);
      setLatitud(String(editingPoint.latitud));
      setLongitud(String(editingPoint.longitud));
    } else {
      setNombrePunto('');
      setEdificio('');
      setCalleAcceso('');
      setTipoEntrada('con rampa');
      setLatitud('');
      setLongitud('');
    }
    setErrors({});
    setSubmitError(null);
  }, [isOpen, editingPoint]);

  useEffect(() => {
    if (pickedCoords && isOpen) {
      setLatitud(String(pickedCoords.lat));
      setLongitud(String(pickedCoords.lng));
      setErrors((prev) => ({
        ...prev,
        latitud: undefined,
        longitud: undefined,
      }));
    }
  }, [pickedCoords, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleLatBlur = () => {
    if (!latitud.trim()) return;
    const res = validateLatitud(latitud);
    setErrors((prev) => ({ ...prev, latitud: res.valid ? undefined : res.error }));
  };

  const handleLngBlur = () => {
    if (!longitud.trim()) return;
    const res = validateLongitud(longitud);
    setErrors((prev) => ({ ...prev, longitud: res.valid ? undefined : res.error }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const result = validateAccessPointInput({
      nombrePunto,
      edificio,
      calleAcceso,
      tipoEntrada,
      latitud,
      longitud,
    });

    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      await onSave(result.value);
      onClose();
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'No se pudo guardar el punto de acceso.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-end bg-slate-950/35 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="point-form-title"
    >
      <div className="flex h-full w-full max-w-lg flex-col border-l border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2
            id="point-form-title"
            className="font-display text-lg font-semibold text-slate-900"
          >
            {editingPoint ? 'Editar punto de acceso' : 'Nuevo punto de acceso'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar formulario"
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto px-6 py-5">
          {submitError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800">
              {submitError}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="nombrePunto"
                className="block text-sm font-medium text-slate-800"
              >
                Nombre del punto
              </label>
              <input
                id="nombrePunto"
                type="text"
                value={nombrePunto}
                onChange={(e) => setNombrePunto(e.target.value)}
                placeholder="Ej. Acceso Norte Pabellón Central"
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/15"
              />
              {errors.nombrePunto && (
                <p className="mt-1 text-xs text-red-700">{errors.nombrePunto}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="edificio"
                className="block text-sm font-medium text-slate-800"
              >
                Edificio
              </label>
              <input
                id="edificio"
                type="text"
                value={edificio}
                onChange={(e) => setEdificio(e.target.value)}
                placeholder="Ej. Facultad de Ingeniería"
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/15"
              />
              {errors.edificio && (
                <p className="mt-1 text-xs text-red-700">{errors.edificio}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="calleAcceso"
                className="block text-sm font-medium text-slate-800"
              >
                Calle de acceso
              </label>
              <input
                id="calleAcceso"
                type="text"
                value={calleAcceso}
                onChange={(e) => setCalleAcceso(e.target.value)}
                placeholder="Ej. Av. Paseo Colón 850"
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/15"
              />
              {errors.calleAcceso && (
                <p className="mt-1 text-xs text-red-700">{errors.calleAcceso}</p>
              )}
            </div>

            <div>
              <span className="block text-sm font-medium text-slate-800">
                Tipo de entrada
              </span>
              <div className="mt-1.5 grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setTipoEntrada('con rampa')}
                  className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                    tipoEntrada === 'con rampa'
                      ? 'bg-white text-teal-800 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Accessibility className="h-4 w-4" />
                  <span>Con rampa</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTipoEntrada('con escalones')}
                  className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                    tipoEntrada === 'con escalones'
                      ? 'bg-white text-amber-800 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Footprints className="h-4 w-4" />
                  <span>Con escalones</span>
                </button>
              </div>
              {errors.tipoEntrada && (
                <p className="mt-1 text-xs text-red-700">{errors.tipoEntrada}</p>
              )}
            </div>

            <div className="border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-800">
                  Coordenadas en grados decimales
                </span>
                <button
                  type="button"
                  onClick={onTogglePickMode}
                  className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                    pickMode
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Crosshair className="h-3.5 w-3.5" />
                  <span>{pickMode ? 'Modo mapa activo' : 'Tomar del mapa'}</span>
                </button>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="latitud"
                    className="block text-xs font-medium text-slate-600"
                  >
                    Latitud (−90 a 90)
                  </label>
                  <input
                    id="latitud"
                    type="text"
                    inputMode="decimal"
                    value={latitud}
                    onChange={(e) => setLatitud(e.target.value)}
                    onBlur={handleLatBlur}
                    placeholder="-34.603722"
                    className="font-mono-nums mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/15"
                  />
                  {errors.latitud && (
                    <p className="mt-1 text-xs text-red-700">{errors.latitud}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="longitud"
                    className="block text-xs font-medium text-slate-600"
                  >
                    Longitud (−180 a 180)
                  </label>
                  <input
                    id="longitud"
                    type="text"
                    inputMode="decimal"
                    value={longitud}
                    onChange={(e) => setLongitud(e.target.value)}
                    onBlur={handleLngBlur}
                    placeholder="-58.381592"
                    className="font-mono-nums mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/15"
                  />
                  {errors.longitud && (
                    <p className="mt-1 text-xs text-red-700">{errors.longitud}</p>
                  )}
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Usá punto decimal (ej. <span className="font-mono-nums">-34.544180</span> y <span className="font-mono-nums">-58.439720</span>).
              </p>
            </div>
          </div>

          <div className="mt-auto flex items-center justify-end gap-3 border-t border-slate-200 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 disabled:opacity-60 whitespace-nowrap"
            >
              {submitting
                ? 'Guardando...'
                : editingPoint
                  ? 'Guardar cambios'
                  : 'Agregar punto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
