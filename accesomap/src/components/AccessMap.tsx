/// <reference types="google.maps" />
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  APILoadingStatus,
  APIProvider,
  AdvancedMarker,
  InfoWindow,
  Map,
  Pin,
  useAdvancedMarkerRef,
  useApiLoadingStatus,
  useMap,
  useMapsLibrary,
  type MapMouseEvent,
} from '@vis.gl/react-google-maps';
import { Accessibility, Footprints, LocateFixed, MapPin } from 'lucide-react';
import type { AccessPoint } from '../types/accessPoint.ts';

const DEFAULT_CENTER = { lat: -34.5867, lng: -58.402 };
const DEFAULT_ZOOM = 12;

interface AccessMapProps {
  points: AccessPoint[];
  selectedPoint: AccessPoint | null;
  onSelectPoint: (point: AccessPoint | null) => void;
  pickCoordinatesMode?: boolean;
  pickedCoords?: { lat: number; lng: number } | null;
  onMapPickCoordinates?: (coords: { lat: number; lng: number }) => void;
}

interface MarkerItemProps {
  point: AccessPoint;
  isSelected: boolean;
  onSelect: (point: AccessPoint) => void;
  registerMarker: (
    id: string,
    marker: google.maps.marker.AdvancedMarkerElement | null,
  ) => void;
}

function AccessPointMarker({
  point,
  isSelected,
  onSelect,
  registerMarker,
}: MarkerItemProps) {
  const [markerRef, marker] = useAdvancedMarkerRef();

  useEffect(() => {
    registerMarker(point.id, marker);
    return () => {
      registerMarker(point.id, null);
    };
  }, [point.id, marker, registerMarker]);

  const isRamp = point.tipoEntrada === 'con rampa';

  return (
    <AdvancedMarker
      ref={markerRef}
      position={{ lat: point.latitud, lng: point.longitud }}
      title={point.nombrePunto}
      zIndex={isSelected ? 1000 : isRamp ? 10 : 5}
      onClick={() => onSelect(point)}
    >
      <Pin
        background={isRamp ? '#0f766e' : '#b45309'}
        borderColor={
          isSelected ? '#0f172a' : isRamp ? '#115e59' : '#92400e'
        }
        glyphColor="#ffffff"
        scale={isSelected ? 1.3 : 1}
      />
    </AdvancedMarker>
  );
}

interface CameraControllerProps {
  points: AccessPoint[];
  selectedPoint: AccessPoint | null;
  fitTrigger: number;
}

function MapCameraController({
  points,
  selectedPoint,
  fitTrigger,
}: CameraControllerProps) {
  const map = useMap();
  const coreLib = useMapsLibrary('core');
  const hasFittedInitialRef = useRef(false);

  useEffect(() => {
    if (!map || !selectedPoint) {
      return;
    }
    map.panTo({ lat: selectedPoint.latitud, lng: selectedPoint.longitud });
    const currentZoom = map.getZoom();
    if (typeof currentZoom === 'number' && currentZoom < 15) {
      map.setZoom(16);
    }
  }, [map, selectedPoint]);

  useEffect(() => {
    if (!map || !coreLib || points.length === 0) {
      return;
    }
    if (selectedPoint && fitTrigger === 0 && hasFittedInitialRef.current) {
      return;
    }
    if (fitTrigger === 0 && hasFittedInitialRef.current) {
      return;
    }
    hasFittedInitialRef.current = true;

    if (points.length === 1) {
      map.panTo({ lat: points[0].latitud, lng: points[0].longitud });
      map.setZoom(15);
      return;
    }

    const bounds = new coreLib.LatLngBounds();
    for (const pt of points) {
      bounds.extend({ lat: pt.latitud, lng: pt.longitud });
    }
    map.fitBounds(bounds, { top: 64, right: 64, bottom: 64, left: 64 });
  }, [map, coreLib, points, selectedPoint, fitTrigger]);

  return null;
}

function MapStatusOverlay({ hasKey }: { hasKey: boolean }) {
  const status = useApiLoadingStatus();

  if (!hasKey) {
    return (
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100/95 p-6 text-center">
        <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6">
          <MapPin className="mx-auto mb-3 h-7 w-7 text-slate-500" />
          <p className="font-display text-base font-semibold text-slate-900">
            Falta configurar la clave de Google Maps
          </p>
          <p className="mt-1.5 text-sm text-slate-600">
            Agregá la variable <span className="font-mono-nums">VITE_GOOGLE_MAPS_API_KEY</span> para visualizar el mapa interactivo.
          </p>
        </div>
      </div>
    );
  }

  if (status === APILoadingStatus.FAILED || status === APILoadingStatus.AUTH_FAILURE) {
    return (
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100/95 p-6 text-center">
        <div className="max-w-md rounded-xl border border-amber-200 bg-white p-6">
          <p className="font-display text-base font-semibold text-slate-900">
            No se pudo cargar Google Maps
          </p>
          <p className="mt-1.5 text-sm text-slate-600">
            Verificá que la API de Maps JavaScript esté habilitada y que la clave sea válida para este dominio.
          </p>
        </div>
      </div>
    );
  }

  return null;
}

export function AccessMap({
  points,
  selectedPoint,
  onSelectPoint,
  pickCoordinatesMode = false,
  pickedCoords = null,
  onMapPickCoordinates,
}: AccessMapProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';
  const [markersById, setMarkersById] = useState<
    Record<string, google.maps.marker.AdvancedMarkerElement | null>
  >({});
  const [fitTrigger, setFitTrigger] = useState(0);

  const registerMarker = useCallback(
    (id: string, marker: google.maps.marker.AdvancedMarkerElement | null) => {
      setMarkersById((prev) => {
        if (prev[id] === marker) {
          return prev;
        }
        return { ...prev, [id]: marker };
      });
    },
    [],
  );

  const handleMapClick = useCallback(
    (event: MapMouseEvent) => {
      if (!pickCoordinatesMode || !onMapPickCoordinates) {
        return;
      }
      const latLng = event.detail.latLng;
      if (latLng) {
        onMapPickCoordinates({
          lat: Number(latLng.lat.toFixed(6)),
          lng: Number(latLng.lng.toFixed(6)),
        });
      }
    },
    [pickCoordinatesMode, onMapPickCoordinates],
  );

  const selectedMarker = selectedPoint ? markersById[selectedPoint.id] ?? null : null;

  return (
    <div className="relative h-full w-full min-h-[420px] bg-slate-100">
      <APIProvider apiKey={apiKey} libraries={['marker']} language="es">
        <Map
          mapId="DEMO_MAP_ID"
          defaultCenter={DEFAULT_CENTER}
          defaultZoom={DEFAULT_ZOOM}
          gestureHandling="greedy"
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl={true}
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          onClick={handleMapClick}
          className="h-full w-full"
        >
          <MapCameraController
            points={points}
            selectedPoint={selectedPoint}
            fitTrigger={fitTrigger}
          />

          {points.map((point) => (
            <AccessPointMarker
              key={point.id}
              point={point}
              isSelected={selectedPoint?.id === point.id}
              onSelect={(pt) => onSelectPoint(pt)}
              registerMarker={registerMarker}
            />
          ))}

          {pickCoordinatesMode && pickedCoords && (
            <AdvancedMarker position={pickedCoords} title="Ubicación seleccionada">
              <Pin
                background="#0f172a"
                borderColor="#ffffff"
                glyphColor="#ffffff"
                scale={1.15}
              />
            </AdvancedMarker>
          )}

          {selectedPoint && selectedMarker && (
            <InfoWindow
              anchor={selectedMarker}
              pixelOffset={[0, -4]}
              maxWidth={290}
              onCloseClick={() => onSelectPoint(null)}
            >
              <div className="p-1 text-slate-900">
                <p className="font-display text-sm font-semibold leading-snug text-slate-900">
                  {selectedPoint.nombrePunto}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  {selectedPoint.edificio} · {selectedPoint.calleAcceso}
                </p>
                <div className="mt-2 flex items-center gap-1.5 text-xs font-medium">
                  {selectedPoint.tipoEntrada === 'con rampa' ? (
                    <span className="inline-flex items-center gap-1 text-teal-700">
                      <Accessibility className="h-3.5 w-3.5" />
                      Con rampa
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-700">
                      <Footprints className="h-3.5 w-3.5" />
                      Con escalones
                    </span>
                  )}
                </div>
                <p className="font-mono-nums mt-1.5 text-[11px] text-slate-500">
                  {selectedPoint.latitud.toFixed(6)}, {selectedPoint.longitud.toFixed(6)}
                </p>
              </div>
            </InfoWindow>
          )}
        </Map>

        <MapStatusOverlay hasKey={Boolean(apiKey)} />
      </APIProvider>

      <div className="pointer-events-none absolute top-3 left-3 z-20 flex flex-wrap items-center gap-2">
        {points.length > 0 && (
          <button
            type="button"
            onClick={() => {
              onSelectPoint(null);
              setFitTrigger((n) => n + 1);
            }}
            className="pointer-events-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white/95 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            <LocateFixed className="h-3.5 w-3.5 text-slate-600" />
            <span className="whitespace-nowrap">Ver todos ({points.length})</span>
          </button>
        )}

        {pickCoordinatesMode && (
          <div className="pointer-events-auto rounded-lg border border-slate-900/15 bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm">
            Hacé clic en el mapa para fijar las coordenadas
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute bottom-4 left-3 z-20 hidden sm:flex items-center gap-4 rounded-lg border border-slate-200 bg-white/95 px-3 py-1.5 text-xs text-slate-700 shadow-sm backdrop-blur-sm">
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <Accessibility className="h-3.5 w-3.5 text-teal-700" />
          <span>Con rampa</span>
        </span>
        <span className="text-slate-300" aria-hidden="true">
          ·
        </span>
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <Footprints className="h-3.5 w-3.5 text-amber-700" />
          <span>Con escalones</span>
        </span>
      </div>
    </div>
  );
}
