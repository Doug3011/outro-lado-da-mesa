import { createPortal } from 'react-dom';
import { activeScene, useTableStore } from '../store/useTableStore';
import { useIdentity } from '../hooks/useIdentity';
import { randomColor, uid } from '../lib/ids';
import type { Character } from '../domain/character';
import type { Token } from '../types';

// Escolhe (ou cria) o token que representa este personagem na mesa — pedido
// do usuário: "na hora da criação da ficha você vai lá e adiciona um token
// nela, caso você não tenha o token na hora, não tem problema, depois você
// pode abrir a ficha e adicionar o token". Usado em dois lugares:
//
//   - logo depois de criar a ficha no wizard (CharacterLibrary.tsx), com
//     `mode="create"` — passo OPCIONAL, sempre com "Pular por enquanto" bem
//     visível, nunca bloqueia a criação da ficha.
//   - a qualquer momento depois, pela ação "Vincular token" dentro da ficha
//     aberta (CharacterSheet.tsx), com `mode="manage"` — mesma escolha, mas
//     também mostra/permite desvincular o token já ligado, se houver.
//
// Lista os tokens do CENÁRIO ATIVO em `useTableStore` — esse estado sobrevive
// a sair de uma mesa (ver `disconnect()` em useTableStore.ts, que não limpa
// `scenes`/`activeSceneId`), então mesmo na biblioteca de fichas (fora de
// qualquer sala) ainda mostra os tokens do último cenário visitado nesta
// sessão. Sem nenhuma mesa visitada ainda, só sobra a opção de pular — não
// tem mapa nenhum pra listar/criar token.
export function TokenLinkDialog({
  character,
  mode = 'manage',
  onClose,
}: {
  character: Character;
  mode?: 'create' | 'manage';
  onClose: () => void;
}) {
  const { me } = useIdentity();
  const scenes = useTableStore((s) => s.scenes);
  const activeSceneId = useTableStore((s) => s.activeSceneId);
  const upsertToken = useTableStore((s) => s.upsertToken);
  const scene = scenes.length > 0 ? activeScene({ scenes, activeSceneId }) : null;

  const tokens = scene ? Object.values(scene.tokens) : [];
  const linked = tokens.find((t) => t.characterId === character.id) ?? null;
  const available = tokens.filter((t) => !t.characterId);

  // Vincula um token já plantado no mapa (sem dono ainda) — mantém label e
  // imagem do token como estavam (pode já ter sido customizado antes do
  // personagem existir), só liga o `characterId` e sincroniza o PV atual.
  const link = (t: Token) => {
    upsertToken({
      ...t,
      characterId: character.id,
      hp: { current: character.pv.current, max: character.pv.max },
    });
    onClose();
  };

  const unlink = () => {
    if (!linked) return;
    upsertToken({ ...linked, characterId: undefined });
  };

  // Cria um token novo do zero pra esse personagem — mesma lógica de
  // "+ do personagem" (ver addFromCharacter em BattleMap.tsx/Battle3D.tsx),
  // só que partindo da ficha em vez do mapa.
  const createNew = () => {
    if (!scene) return;
    const pos =
      scene.kind === '3d'
        ? { x: 0, y: 0 }
        : { x: Math.floor(scene.map.cols / 2), y: Math.floor(scene.map.rows / 2) };
    const t: Token = {
      id: uid(),
      label: character.name,
      color: randomColor(character.id),
      image: character.image,
      ...pos,
      size: 1,
      ownerId: me.id,
      characterId: character.id,
      hp: { current: character.pv.current, max: character.pv.max },
    };
    upsertToken(t);
    onClose();
  };

  return createPortal(
    <div
      className="prompt-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="map-picker" style={{ maxWidth: 460 }}>
        <div className="map-picker-head">
          <span className="map-picker-title">
            {mode === 'create' ? 'Vincular a um token?' : `Token de ${character.name}`}
          </span>
          <button className="small ghost map-picker-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="map-picker-body">
          {mode === 'create' && (
            <p className="faint" style={{ fontSize: 12, marginTop: -4, marginBottom: 12 }}>
              Escolha um token já na mesa pra representar <b>{character.name}</b>, ou crie um
              novo agora. Se preferir, pule — dá pra vincular depois, abrindo a ficha.
            </p>
          )}

          {linked && (
            <div
              className="map-picker-blank"
              style={{ marginBottom: 14, cursor: 'default', alignItems: 'center' }}
            >
              <span
                className="asset-thumb"
                style={{
                  width: 40,
                  height: 40,
                  flex: 'none',
                  backgroundImage: linked.image ? `url(${linked.image})` : undefined,
                  backgroundColor: linked.image ? undefined : linked.color,
                }}
              />
              <div style={{ flex: 1 }}>
                <div>
                  Token atual: <b>{linked.label}</b>
                </div>
                <button className="small ghost" style={{ marginTop: 4 }} onClick={unlink}>
                  Desvincular
                </button>
              </div>
            </div>
          )}

          {!scene && (
            <p className="empty">
              Nenhuma mesa visitada ainda nesta sessão — entre numa sala com mapa pra vincular
              um token.
            </p>
          )}

          {scene && (
            <>
              <button className="map-picker-blank" onClick={createNew}>
                <span className="map-picker-blank-ico">＋</span>
                {linked ? 'Criar outro token pra esse personagem' : 'Criar token novo nesse cenário'}
              </button>

              {available.length > 0 ? (
                <div className="asset-grid">
                  {available.map((t) => (
                    <button key={t.id} className="asset-card" onClick={() => link(t)}>
                      <div
                        className="asset-thumb"
                        style={{
                          backgroundImage: t.image ? `url(${t.image})` : undefined,
                          backgroundColor: t.image ? undefined : t.color,
                        }}
                      />
                      <span className="asset-name" title={t.label}>
                        {t.label}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="faint" style={{ fontSize: 12 }}>
                  Nenhum token sem dono nesse cenário ainda.
                </p>
              )}
            </>
          )}

          <div className="prompt-actions" style={{ marginTop: 14 }}>
            <button className="ghost" onClick={onClose}>
              {mode === 'create' ? 'Pular por enquanto' : 'Fechar'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
