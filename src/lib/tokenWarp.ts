// Deformação "puppet warp" de token (pedido do usuário: marcar pontos
// fixos/móveis numa imagem e o ponto móvel balança, deformando só a
// região perto dele, de forma suave, como tecido/adorno balançando) —
// módulo único, reaproveitado pelo editor (TokenAnimationEditor.tsx), a
// mesa 3D (Battle3D.tsx) e a camada WebGL da mesa 2D (BattleMap.tsx), pra
// a pré-visualização bater exatamente com o resultado na mesa depois.
//
// A deformação roda no vertex shader (GPU), não em JS por vértice — pedido
// explícito do usuário de leveza com vários tokens animados ao mesmo
// tempo. Pontos FIXOS nunca entram no shader em tempo real: eles só
// servem, no momento em que o rig é editado, pra calcular o `radius` de
// cada ponto móvel (distância até o fixo mais próximo) — é esse raio que
// limita a deformação à região perto do ponto, como pedido.
import * as THREE from 'three';
import type { AnimationPoint, TokenAnimationRig } from '../types';

// Mais que suficiente pra um chapéu + capa + cabelo num token só; limite
// baixo de propósito pra manter o shader simples e leve.
export const WARP_MAX_POINTS = 12;

// Resolução da malha — alta o bastante pra deformação ficar suave, baixa o
// bastante pra não pesar com vários tokens animados ao mesmo tempo.
export const WARP_SEGMENTS = 16;

// Raio padrão (fração do tamanho do token) quando um ponto móvel não tem
// nenhum ponto fixo por perto pra calcular a distância — evita radius 0
// (sem efeito nenhum) ou um raio gigante (deformaria o token inteiro).
const DEFAULT_RADIUS = 0.3;

export function createWarpGeometry(): THREE.PlaneGeometry {
  return new THREE.PlaneGeometry(1, 1, WARP_SEGMENTS, WARP_SEGMENTS);
}

// Recalcula o `radius` de cada ponto móvel (distância até o ponto fixo
// mais próximo) — chamado pelo editor toda vez que algum ponto se move,
// adiciona ou remove. Pontos fixos voltam sem alteração.
export function computeRadii(points: AnimationPoint[]): AnimationPoint[] {
  const fixed = points.filter((p) => p.type === 'fixed');
  return points.map((p) => {
    if (p.type !== 'moving') return p;
    if (fixed.length === 0) return { ...p, radius: DEFAULT_RADIUS };
    let best = Infinity;
    for (const f of fixed) {
      const d = Math.hypot(p.u - f.u, p.v - f.v);
      if (d < best) best = d;
    }
    return { ...p, radius: Math.max(0.02, best) };
  });
}

export const WARP_VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform int uPointCount;
  uniform vec2 uPointUV[${WARP_MAX_POINTS}];
  // x = intensidade, y = velocidade, z = direção (radianos), w = raio
  uniform vec4 uPointParams[${WARP_MAX_POINTS}];
  uniform float uBreathScale;

  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec3 pos = position;
    for (int i = 0; i < ${WARP_MAX_POINTS}; i++) {
      if (i >= uPointCount) break;
      vec2 pUV = uPointUV[i];
      vec4 params = uPointParams[i];
      float dist = distance(uv, pUV);
      float falloff = 1.0 - smoothstep(0.0, max(params.w, 0.001), dist);
      float osc = sin(uTime * params.y + float(i) * 1.37);
      vec2 dir = vec2(cos(params.z), sin(params.z));
      pos.xy += dir * params.x * osc * falloff;
    }
    pos.xy *= uBreathScale;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

export const WARP_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D map;
  varying vec2 vUv;
  void main() {
    vec4 color = texture2D(map, vUv);
    if (color.a < 0.01) discard;
    gl_FragColor = color;
  }
`;

export interface WarpUniforms {
  uTime: { value: number };
  uPointCount: { value: number };
  uPointUV: { value: THREE.Vector2[] };
  uPointParams: { value: THREE.Vector4[] };
  uBreathScale: { value: number };
  map: { value: THREE.Texture | null };
  [key: string]: THREE.IUniform;
}

export function createWarpUniforms(texture?: THREE.Texture | null): WarpUniforms {
  const uv: THREE.Vector2[] = [];
  const params: THREE.Vector4[] = [];
  for (let i = 0; i < WARP_MAX_POINTS; i++) {
    uv.push(new THREE.Vector2(0, 0));
    params.push(new THREE.Vector4(0, 0, 0, 0));
  }
  return {
    uTime: { value: 0 },
    uPointCount: { value: 0 },
    uPointUV: { value: uv },
    uPointParams: { value: params },
    uBreathScale: { value: 1 },
    map: { value: texture ?? null },
  };
}

// Escreve os pontos móveis do rig nos uniforms — só precisa rodar de novo
// quando o rig muda (não todo frame; `uTime`/`uBreathScale` são os únicos
// que mudam a cada frame, ver updateWarpTime abaixo).
export function applyRigToUniforms(uniforms: WarpUniforms, rig: TokenAnimationRig | null | undefined): void {
  const moving = (rig?.points ?? []).filter((p) => p.type === 'moving').slice(0, WARP_MAX_POINTS);
  uniforms.uPointCount.value = moving.length;
  for (let i = 0; i < WARP_MAX_POINTS; i++) {
    const p = moving[i];
    if (!p) {
      uniforms.uPointUV.value[i].set(0, 0);
      uniforms.uPointParams.value[i].set(0, 0, 0, 0);
      continue;
    }
    uniforms.uPointUV.value[i].set(p.u, p.v);
    const dirRad = ((p.direction ?? 0) * Math.PI) / 180;
    uniforms.uPointParams.value[i].set(p.intensity ?? 0, p.speed ?? 0, dirRad, p.radius ?? DEFAULT_RADIUS);
  }
}

export function updateWarpTime(uniforms: WarpUniforms, time: number): void {
  uniforms.uTime.value = time;
}

// Fator de escala de "respiração" (pulsar sutil) — compartilhado pelos 3
// lugares (CSS 2D sem rig deriva a mesma fórmula via keyframes, tokens com
// rig usam esta função direto). Fase por token (hash simples do id) pra
// nem todo token pulsar junto.
const BREATH_AMPLITUDE = 0.03;
const BREATH_SPEED = 1.3; // rad/s

function hashPhase(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return (h % 1000) / 1000 * Math.PI * 2;
}

export function breathingScale(time: number, tokenId: string, enabled: boolean): number {
  if (!enabled) return 1;
  return 1 + BREATH_AMPLITUDE * Math.sin(time * BREATH_SPEED + hashPhase(tokenId));
}
