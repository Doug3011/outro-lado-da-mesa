import { uid } from './ids';
import type { GroundConfig, PlaceObject, Scene } from '../types';

// "Place" = um cenário 3D salvo (nome + chão + objetos-imagem/modelo
// posicionados) — composto na Área do Mestre, reaproveitado depois em
// qualquer mesa 3D (ver placeToScene abaixo). Cada place é um JSON só (as
// imagens/modelos já vêm embutidos como data URL, mesmo formato usado em
// token/personagem/mapa), guardado no servidor local via /api/places — ver
// server/main.cjs (handlePlacesApi). Os tipos de chão/objeto vivem em
// types.ts porque uma mesa 3D de verdade (Scene.kind==='3d') usa exatamente
// os mesmos formatos — uma place é só a versão "salva fora de mesa" disso.

export type { GroundConfig, GroundMode, PlaceObject } from '../types';

export interface Place {
  id: string;
  name: string;
  updatedAt: number;
  ground: GroundConfig | null;
  groundSize?: number;
  sky?: boolean;
  objects: PlaceObject[];
}

export interface PlaceSummary {
  id: string;
  name: string;
  updatedAt: number;
}

export function newPlaceId(): string {
  return uid();
}

// Cria o cenário de uma mesa 3D a partir de uma place salva — cópia
// independente (a mesa não fica "presa" à place original: editar o cenário
// dentro da mesa não muda a place na Área do Mestre, e vice-versa).
export function placeToScene(place: Place, name?: string): Scene {
  return {
    id: uid(),
    name: name?.trim() || place.name,
    kind: '3d',
    map: { cols: 30, rows: 20, cellSize: 48, showGrid: true, metersPerCell: 1.5, fogHidden: [] },
    ground: place.ground,
    groundSize: place.groundSize,
    sky: place.sky,
    objects3d: place.objects,
    tokens: {},
  };
}

export async function fetchPlaces(): Promise<PlaceSummary[]> {
  try {
    const r = await fetch('/api/places');
    if (!r.ok) return [];
    return (await r.json()) as PlaceSummary[];
  } catch {
    return [];
  }
}

export async function fetchPlace(id: string): Promise<Place | null> {
  try {
    const r = await fetch(`/api/places/${id}`);
    if (!r.ok) return null;
    return (await r.json()) as Place;
  } catch {
    return null;
  }
}

export async function savePlace(place: Place): Promise<Place | null> {
  try {
    const r = await fetch(`/api/places/${place.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(place),
    });
    if (!r.ok) return null;
    return (await r.json()) as Place;
  } catch {
    return null;
  }
}

export async function deletePlace(id: string): Promise<void> {
  try {
    await fetch(`/api/places/${id}`, { method: 'DELETE' });
  } catch {
    /* ignora */
  }
}
