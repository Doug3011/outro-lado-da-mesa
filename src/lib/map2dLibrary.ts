import { uid } from './ids';
import { DEFAULT_MAP } from '../types';
import type { Scene } from '../types';

export type { Map2D, Map2DSummary } from '../types';
import type { Map2D, Map2DSummary } from '../types';

// "Mapa 2D" = uma composição de cenário salva (chão/grade + peças
// posicionadas, ver MapObject2D) — montada na Área do Mestre, reaproveitada
// depois em qualquer mesa 2D (ver map2dToScene abaixo). Mesmo padrão de
// placeLibrary.ts (cenário 3D): cada mapa é um JSON só (peças já vêm com a
// imagem embutida), guardado no servidor local via /api/map2d — ver
// server/main.cjs (handleMap2DApi).

export function newMap2DId(): string {
  return uid();
}

// Cria o cenário de uma mesa 2D a partir de um mapa salvo — cópia
// independente (a mesa não fica "presa" ao mapa original: editar o cenário
// dentro da mesa não muda o mapa salvo na Área do Mestre, e vice-versa).
export function map2dToScene(map2d: Map2D, name?: string): Scene {
  return {
    id: uid(),
    name: name?.trim() || map2d.name,
    kind: '2d',
    map: {
      cols: map2d.cols,
      rows: map2d.rows,
      cellSize: map2d.cellSize,
      background: map2d.background,
      showGrid: true,
      metersPerCell: 1.5,
      fogHidden: [],
      objects2d: map2d.objects2d,
    },
    ground: null,
    objects3d: [],
    tokens: {},
  };
}

export async function fetchMap2Ds(): Promise<Map2DSummary[]> {
  try {
    const r = await fetch('/api/map2d');
    if (!r.ok) return [];
    return (await r.json()) as Map2DSummary[];
  } catch {
    return [];
  }
}

export async function fetchMap2D(id: string): Promise<Map2D | null> {
  try {
    const r = await fetch(`/api/map2d/${id}`);
    if (!r.ok) return null;
    return (await r.json()) as Map2D;
  } catch {
    return null;
  }
}

export async function saveMap2D(map2d: Map2D): Promise<Map2D | null> {
  try {
    const r = await fetch(`/api/map2d/${map2d.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(map2d),
    });
    if (!r.ok) return null;
    return (await r.json()) as Map2D;
  } catch {
    return null;
  }
}

export async function deleteMap2D(id: string): Promise<void> {
  try {
    await fetch(`/api/map2d/${id}`, { method: 'DELETE' });
  } catch {
    /* ignora */
  }
}

export function blankMap2D(id: string): Map2D {
  return {
    id,
    name: 'Novo mapa',
    updatedAt: Date.now(),
    cols: DEFAULT_MAP.cols,
    rows: DEFAULT_MAP.rows,
    cellSize: DEFAULT_MAP.cellSize,
    background: undefined,
    objects2d: [],
  };
}
