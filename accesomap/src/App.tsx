import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  Accessibility,
  Footprints,
  LogOut,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { AccessMap } from './components/AccessMap.tsx';
import { DeployGuide } from './components/DeployGuide.tsx';
import { PointFormModal } from './components/PointFormModal.tsx';
import { auth, googleAuthProvider } from './lib/firebase.ts';
import type { TipoEntrada } from './lib/validation.ts';
import type { AccessPoint } from './types/accessPoint.ts';

type FilterOption = 'todos' | TipoEntrada;
type ActiveTab = 'mapa' | 'despliegue';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('mapa');

  const [points, setPoints] = useState<AccessPoint[]>([]);
  const [loadingPoints, setLoadingPoints] = useState(false);
  const [pointsError, setPointsError] = useState<string | null>(null);

  const [filterTipo, setFilterTipo] = useState<FilterOption>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPoint, setSelectedPoint] = useState<AccessPoint | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPoint, setEditingPoint] = useState<AccessPoint | null>(null);
  const [pickCoordinatesMode, setPickCoordinatesMode] = useState(false);
  const [pickedCoords, setPickedCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const handler = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handler);
    return () => window.removeEventListener('gmp-quota-exceeded', handler);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const authorizedFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      if (!auth.currentUser) {
        throw new Error('Debés iniciar sesión para realizar esta operación.');
      }
      const token = await auth.currentUser.getIdToken();
      const headers = new Headers(options.headers);
      headers.set('Authorization', `Bearer ${token}`);
      if (options.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      return fetch(url, { ...options, headers });
    },
    [],
  );

  const fetchPoints = useCallback(
    async (tipo: FilterOption) => {
      if (!auth.currentUser) {
        return;
      }
      setLoadingPoints(true);
      setPointsError(null);
      try {
        const params =
          tipo === 'todos'
            ? ''
            : `?tipoEntrada=${encodeURIComponent(tipo)}`;
        const res = await authorizedFetch(`/api/access-points${params}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(
            data.error || 'No se pudieron cargar los puntos de acceso.',
          );
        }
        const loaded: AccessPoint[] = data.items ?? [];
        setPoints(loaded);
        setSelectedPoint((prev) => {
          if (!prev) return null;
          return loaded.find((p) => p.id === prev.id) ?? null;
        });
      } catch (err) {
        setPointsError(
          err instanceof Error
            ? err.message
            : 'Ocurrió un error al consultar los puntos.',
        );
      } finally {
        setLoadingPoints(false);
      }
    },
    [authorizedFetch],
  );

  useEffect(() => {
    if (user) {
      fetchPoints(filterTipo);
    } else {
      setPoints([]);
      setSelectedPoint(null);
    }
  }, [user, filterTipo, fetchPoints]);

  const filteredPoints = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return points;
    }
    return points.filter(
      (pt) =>
        pt.nombrePunto.toLowerCase().includes(q) ||
        pt.edificio.toLowerCase().includes(q) ||
        pt.calleAcceso.toLowerCase().includes(q),
    );
  }, [points, searchQuery]);

  const handleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err) {
      setAuthError(
        err instanceof Error
          ? 'No se pudo completar el inicio de sesión con Google. Verificá si el navegador bloqueó la ventana emergente.'
          : 'Error al iniciar sesión.',
      );
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setPoints([]);
    setSelectedPoint(null);
    setActiveTab('mapa');
  };

  const openCreateModal = () => {
    setEditingPoint(null);
    setPickedCoords(null);
    setPickCoordinatesMode(false);
    setActiveTab('mapa');
    setIsFormOpen(true);
  };

  const openEditModal = (point: AccessPoint) => {
    setEditingPoint(point);
    setPickedCoords(null);
    setPickCoordinatesMode(false);
    setIsFormOpen(true);
  };

  const closeFormModal = () => {
    setIsFormOpen(false);
    setEditingPoint(null);
    setPickCoordinatesMode(false);
    setPickedCoords(null);
  };

  const handleSavePoint = async (payload: {
    nombrePunto: string;
    edificio: string;
    calleAcceso: string;
    tipoEntrada: TipoEntrada;
    latitud: number;
    longitud: number;
  }) => {
    if (editingPoint) {
      const res = await authorizedFetch(`/api/access-points/${editingPoint.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo actualizar el punto.');
      }
      await fetchPoints(filterTipo);
      if (data.item) {
        setSelectedPoint(data.item);
      }
      return;
    }

    const res = await authorizedFetch('/api/access-points', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'No se pudo crear el punto.');
    }

    const nextFilter: FilterOption =
      filterTipo !== 'todos' && filterTipo !== payload.tipoEntrada
        ? 'todos'
        : filterTipo;
    if (nextFilter !== filterTipo) {
      setFilterTipo(nextFilter);
    } else {
      await fetchPoints(nextFilter);
    }
    if (data.item) {
      setSelectedPoint(data.item);
    }
  };

  const handleDeletePoint = async (id: string) => {
    setDeletingId(id);
    setPointsError(null);
    try {
      const res = await authorizedFetch(`/api/access-points/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo eliminar el punto.');
      }
      setConfirmDeleteId(null);
      if (selectedPoint?.id === id) {
        setSelectedPoint(null);
      }
      await fetchPoints(filterTipo);
    } catch (err) {
      setPointsError(
        err instanceof Error ? err.message : 'Error al eliminar el punto.',
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      {quotaExceeded && (
        <div className="sticky top-0 z-50 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-xs text-amber-900 shadow-sm md:text-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-amber-950 underline hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-8 border-b border-slate-200 bg-white px-6">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('mapa');
          }}
          className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          AccesoMap
        </a>

        <nav className="flex items-center gap-6 text-sm font-medium text-slate-600">
          <button
            type="button"
            onClick={() => setActiveTab('mapa')}
            className={`whitespace-nowrap shrink-0 transition-colors ${
              activeTab === 'mapa'
                ? 'text-slate-900 underline decoration-teal-700 decoration-2 underline-offset-8'
                : 'hover:text-slate-900'
            }`}
          >
            Mapa y puntos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('despliegue')}
            className={`whitespace-nowrap shrink-0 transition-colors ${
              activeTab === 'despliegue'
                ? 'text-slate-900 underline decoration-teal-700 decoration-2 underline-offset-8'
                : 'hover:text-slate-900'
            }`}
          >
            Despliegue
          </button>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <>
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 whitespace-nowrap shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span>Agregar punto</span>
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                title={user.email ?? 'Cerrar sesión'}
                aria-label="Cerrar sesión"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 whitespace-nowrap shrink-0"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleSignIn}
              disabled={authLoading}
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              Iniciar sesión
            </button>
          )}
        </div>
      </header>

      {activeTab === 'despliegue' ? (
        <main className="flex-1 bg-white">
          <DeployGuide />
        </main>
      ) : authLoading ? (
        <main className="flex flex-1 items-center justify-center p-8">
          <p className="text-sm text-slate-500">Cargando sesión...</p>
        </main>
      ) : !user ? (
        <main className="mx-auto flex w-full max-w-6xl flex-1 items-center px-6 py-12">
          <div className="grid w-full grid-cols-1 items-stretch gap-10 lg:grid-cols-12">
            <div className="flex flex-col justify-center lg:col-span-7">
              <p className="text-xs font-medium text-teal-700">
                Accesibilidad urbana y edilicia
              </p>
              <h1 className="font-display mt-3 max-w-2xl text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl [text-wrap:balance]">
                Mapa de puntos de acceso con validación geográfica en grados decimales
              </h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">
                Administrá entradas de edificios con rampa o con escalones en una tabla relacional PostgreSQL, filtrá por tipo de acceso y visualizá cada registro ubicado sobre Google Maps.
              </p>

              <div className="mt-8 grid max-w-xl grid-cols-1 gap-4 border-t border-slate-200 pt-6 sm:grid-cols-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    CRUD completo
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    Alta, listado, edición y eliminación en PostgreSQL.
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Filtro de entradas
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    Clasificación por rampa o escalones con 3 ejemplos iniciales.
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Coordenadas validadas
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    Latitud entre −90 y 90, longitud entre −180 y 180.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center lg:col-span-5">
              <div className="w-full rounded-xl border border-slate-200 bg-white p-8">
                <MapPin className="h-7 w-7 text-teal-700" />
                <h2 className="font-display mt-4 text-xl font-semibold text-slate-900">
                  Ingresá al panel geográfico
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Iniciá sesión con tu cuenta de Google para consultar los puntos registrados, filtrarlos y administrar ubicaciones en el mapa.
                </p>

                {authError && (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800">
                    {authError}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSignIn}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                >
                  <span>Iniciar sesión con Google</span>
                </button>
              </div>
            </div>
          </div>
        </main>
      ) : (
        <main className="flex flex-1 flex-col lg:flex-row lg:overflow-hidden">
          <section className="flex w-full flex-col border-b border-slate-200 bg-white lg:h-[calc(100vh-4rem)] lg:w-[460px] lg:shrink-0 lg:border-b-0 lg:border-r">
            <div className="border-b border-slate-200 p-5">
              <div className="flex items-baseline justify-between gap-3">
                <h1 className="font-display text-lg font-semibold text-slate-900">
                  Puntos de acceso
                </h1>
                <span className="font-mono-nums text-xs text-slate-500">
                  {filteredPoints.length}{' '}
                  {filteredPoints.length === 1 ? 'registro' : 'registros'}
                </span>
              </div>

              <div className="mt-3 relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre, edificio o calle..."
                  aria-label="Buscar puntos de acceso"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/15"
                />
              </div>

              <div
                className="mt-3 grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1"
                role="tablist"
                aria-label="Filtrar por tipo de entrada"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={filterTipo === 'todos'}
                  onClick={() => setFilterTipo('todos')}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    filterTipo === 'todos'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={filterTipo === 'con rampa'}
                  onClick={() => setFilterTipo('con rampa')}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    filterTipo === 'con rampa'
                      ? 'bg-white text-teal-800 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Con rampa
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={filterTipo === 'con escalones'}
                  onClick={() => setFilterTipo('con escalones')}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    filterTipo === 'con escalones'
                      ? 'bg-white text-amber-800 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Con escalones
                </button>
              </div>
            </div>

            {pointsError && (
              <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-xs text-red-800">
                {pointsError}
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              {loadingPoints ? (
                <div className="divide-y divide-slate-200">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="animate-pulse px-5 py-4">
                      <div className="h-4 w-2/3 rounded bg-slate-200" />
                      <div className="mt-2 h-3 w-4/5 rounded bg-slate-100" />
                      <div className="mt-2.5 h-3 w-1/2 rounded bg-slate-100" />
                    </div>
                  ))}
                </div>
              ) : filteredPoints.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                  <MapPin className="h-7 w-7 text-slate-400" />
                  <p className="mt-3 font-display text-sm font-semibold text-slate-900">
                    No hay puntos para mostrar
                  </p>
                  <p className="mt-1 max-w-xs text-xs text-slate-500">
                    {searchQuery || filterTipo !== 'todos'
                      ? 'Probá cambiar el filtro o limpiar la búsqueda.'
                      : 'Agregá el primer punto de acceso para verlo ubicado en Google Maps.'}
                  </p>
                  {filterTipo === 'todos' && !searchQuery && (
                    <button
                      type="button"
                      onClick={openCreateModal}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-medium text-white hover:bg-teal-800"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Agregar primer punto</span>
                    </button>
                  )}
                </div>
              ) : (
                <ul className="divide-y divide-slate-200">
                  {filteredPoints.map((point) => {
                    const isSelected = selectedPoint?.id === point.id;
                    const isRamp = point.tipoEntrada === 'con rampa';
                    const isConfirmingDelete = confirmDeleteId === point.id;

                    return (
                      <li
                        key={point.id}
                        className={`transition-colors ${
                          isSelected ? 'bg-teal-50/60' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            setSelectedPoint(point);
                            setConfirmDeleteId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setSelectedPoint(point);
                            }
                          }}
                          className="cursor-pointer px-5 py-4 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-teal-700"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <h2 className="font-display truncate text-sm font-semibold text-slate-900">
                                {point.nombrePunto}
                              </h2>
                              <p className="mt-0.5 truncate text-xs text-slate-600">
                                {point.edificio} · {point.calleAcceso}
                              </p>
                            </div>

                            <div
                              className="flex items-center gap-1 shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => openEditModal(point)}
                                aria-label={`Editar ${point.nombrePunto}`}
                                className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-200/70 hover:text-slate-900"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmDeleteId(
                                    isConfirmingDelete ? null : point.id,
                                  )
                                }
                                aria-label={`Eliminar ${point.nombrePunto}`}
                                className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-700"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                            <span
                              className={`inline-flex items-center gap-1.5 font-medium ${
                                isRamp ? 'text-teal-700' : 'text-amber-700'
                              }`}
                            >
                              {isRamp ? (
                                <Accessibility className="h-3.5 w-3.5" />
                              ) : (
                                <Footprints className="h-3.5 w-3.5" />
                              )}
                              <span>
                                {isRamp ? 'Con rampa' : 'Con escalones'}
                              </span>
                            </span>

                            <span className="font-mono-nums text-[11px] text-slate-500">
                              {point.latitud.toFixed(6)}, {point.longitud.toFixed(6)}
                            </span>
                          </div>

                          {isConfirmingDelete && (
                            <div
                              className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="font-medium text-red-900">
                                ¿Eliminar este punto?
                              </span>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="rounded px-2 py-1 text-slate-700 hover:bg-white"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  disabled={deletingId === point.id}
                                  onClick={() => handleDeletePoint(point.id)}
                                  className="rounded bg-red-700 px-2.5 py-1 font-medium text-white hover:bg-red-800 disabled:opacity-60"
                                >
                                  {deletingId === point.id
                                    ? 'Eliminando...'
                                    : 'Confirmar'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          <section className="relative h-[480px] flex-1 lg:h-[calc(100vh-4rem)]">
            <AccessMap
              points={filteredPoints}
              selectedPoint={selectedPoint}
              onSelectPoint={setSelectedPoint}
              pickCoordinatesMode={isFormOpen && pickCoordinatesMode}
              pickedCoords={pickedCoords}
              onMapPickCoordinates={(coords) => setPickedCoords(coords)}
            />
          </section>
        </main>
      )}

      <PointFormModal
        isOpen={isFormOpen}
        editingPoint={editingPoint}
        pickedCoords={pickedCoords}
        pickMode={pickCoordinatesMode}
        onTogglePickMode={() => setPickCoordinatesMode((v) => !v)}
        onClose={closeFormModal}
        onSave={handleSavePoint}
      />
    </div>
  );
}
