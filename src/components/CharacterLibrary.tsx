import type { CSSProperties } from 'react';
import { useState } from 'react';
import type { Character } from '../domain/character';
import { CLASS_BY_KEY, ELEMENT_COLOR } from '../data/ordem';
import { deleteMyCharacter, loadMyCharacters, saveMyCharacter } from '../lib/characterLibrary';
import { uid } from '../lib/ids';
import { CrisImportError, importFromCris } from '../lib/crisImport';
import { isElectron } from '../lib/windowControls';
import { askText } from '../state/promptDialog';
import { ArrowRightIcon, BackChevronIcon, BrandEyeIcon, ImportCrisIcon, PlusIcon } from './icons';
import { CharacterSheet } from './CharacterSheet';
import { CharacterWizard } from './CharacterWizard';
import { TokenLinkDialog } from './TokenLinkDialog';

// Brasas subindo no canto do fundo — mesma fórmula da referência
// (Fichas-Mesa.dc.html, `renderVals().embers`): posição/tamanho/duração
// derivados só do índice, nada aleatório (evita re-sortear a cada render).
// Concentradas na metade direita da tela porque é onde fica o sigilo
// girando (ver .rd-library-sigil-spin em index.css).
const LIBRARY_EMBERS: CSSProperties[] = Array.from({ length: 18 }, (_, i) => {
  const left = 45 + ((i * 29) % 55);
  const size = 2 + (i % 3);
  const dur = 8 + (i % 5) * 2;
  const delay = -((i * 1.9) % dur);
  return {
    left: `${left}%`,
    width: size,
    height: size,
    animationDuration: `${dur}s`,
    animationDelay: `${delay.toFixed(1)}s`,
  };
});

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('pt-BR');
}

// Biblioteca de fichas do jogador — vive fora de qualquer mesa. É aqui que se
// cria e edita ficha agora; a mesa só recebe uma cópia vinculada (veja
// roomLinks.ts / Home.tsx).
export function CharacterLibrary({
  ownerId,
  defaultPlayer,
  startWizard,
  onBack,
}: {
  ownerId: string;
  defaultPlayer: string;
  // Entra direto no fluxo de criação — usado pelo botão "Nova ficha" do Meu
  // Perfil (redesign Passo 7), que já quer abrir no wizard em vez de cair na
  // grade de fichas primeiro.
  startWizard?: boolean;
  onBack: () => void;
}) {
  const [list, setList] = useState<Character[]>(loadMyCharacters);
  const [selId, setSelId] = useState<string | null>(null);
  const [wizard, setWizard] = useState(startWizard ?? false);
  const [importing, setImporting] = useState(false);
  // Logo depois de criar uma ficha nova, oferece (sem obrigar) vincular um
  // token já na mesa a ela — ver TokenLinkDialog.tsx. `null` = fechado.
  const [linkPrompt, setLinkPrompt] = useState<Character | null>(null);
  const selected = list.find((c) => c.id === selId) ?? null;
  // Wizard/ficha aberta leem melhor num container um pouco mais estreito
  // que a grade de cartões (que quer toda a largura disponível) — ver
  // .rd-library-main-compact em index.css.
  const compact = wizard || !!selected;

  const refresh = () => setList(loadMyCharacters());

  // "Importar da Cris": alternativa ao wizard manual — cola o link da própria
  // ficha em crisordemparanormal.com e traz os dados prontos (ver
  // src/lib/crisImport.ts). Só funciona no app desktop (precisa do Electron
  // pra renderizar a SPA deles numa janela escondida).
  const onImportCris = async () => {
    const url = await askText(
      'Cole o link da sua ficha no C.R.I.S. (ex.: https://crisordemparanormal.com/agente/SEU_ID):',
    );
    if (!url?.trim()) return;
    setImporting(true);
    try {
      const c = await importFromCris(url.trim(), ownerId);
      saveMyCharacter(c);
      refresh();
      setSelId(c.id);
    } catch (e) {
      const msg = e instanceof CrisImportError ? e.message : 'Não deu pra importar essa ficha. Confira o link e tente de novo.';
      alert(msg);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="rd-library">
      <div className="rd-library-bg" aria-hidden="true">
        <div className="rd-library-glow" />
        <div className="rd-library-sigil-spin">
          <img className="rd-library-sigil-img" src="/sigils/sigilo-original.svg" alt="" />
        </div>
        <div className="rd-library-embers">
          {LIBRARY_EMBERS.map((style, i) => (
            <span key={i} className="rd-library-ember" style={style} />
          ))}
        </div>
        <div className="rd-scanlines" />
        <div className="rd-vignette" />
      </div>

      <div className="rd-library-top">
        <BrandEyeIcon />
        <span className="rd-library-top-text">O Outro Lado da Mesa</span>
      </div>

      <div className={'rd-library-main' + (compact ? ' rd-library-main-compact' : '')}>
        {wizard ? (
          <CharacterWizard
            ownerId={ownerId}
            defaultPlayer={defaultPlayer}
            onCancel={() => setWizard(false)}
            onDone={(c) => {
              saveMyCharacter(c);
              refresh();
              setSelId(c.id);
              setWizard(false);
              setLinkPrompt(c);
            }}
          />
        ) : selected ? (
          <>
            <div className="row rd-library-sheet-actions" style={{ marginBottom: 10 }}>
              <button className="rd-btn-ghost" style={{ flex: 1 }} onClick={() => setSelId(null)}>
                <BackChevronIcon /> voltar à lista de fichas
              </button>
              <button
                className="rd-btn-ghost"
                onClick={() => {
                  const copy: Character = {
                    ...selected,
                    id: uid(),
                    name: `${selected.name} (cópia)`,
                    updatedAt: Date.now(),
                  };
                  saveMyCharacter(copy);
                  refresh();
                  setSelId(copy.id);
                }}
              >
                Duplicar
              </button>
              <button
                className="rd-btn-ghost"
                style={{ flex: 'none' }}
                onClick={() => {
                  if (confirm(`Excluir a ficha de ${selected.name}?`)) {
                    deleteMyCharacter(selected.id);
                    refresh();
                    setSelId(null);
                  }
                }}
              >
                Excluir
              </button>
            </div>
            <CharacterSheet
              key={selected.id}
              character={selected}
              onSave={(c) => {
                saveMyCharacter(c);
                refresh();
              }}
            />
          </>
        ) : (
          <>
            <button className="rd-library-back" onClick={onBack}>
              <BackChevronIcon /> VOLTAR
            </button>

            <div className="rd-library-head">
              <div className="rd-library-head-row">
                <h1 className="rd-library-title">
                  MINHAS <span>FICHAS</span>
                </h1>
                <span className="rd-library-crumb">
                  // {list.length} {list.length === 1 ? 'AGENTE' : 'AGENTES'} EM ARQUIVO
                </span>
              </div>
              <span className="rd-library-rule" />
              <p className="rd-library-sub">
                Crie e edite suas fichas por aqui, fora de qualquer mesa. Ao entrar numa mesa
                como jogador, você escolhe qual dessas fichas leva com você.
              </p>
              <div className="rd-library-actions">
                <button className="rd-btn-primary" onClick={() => setWizard(true)}>
                  <PlusIcon /> CRIAR FICHA
                </button>
                {isElectron && (
                  <button className="rd-btn-ghost" disabled={importing} onClick={onImportCris}>
                    <ImportCrisIcon /> {importing ? 'Importando…' : 'Importar da Cris'}
                  </button>
                )}
              </div>
            </div>

            {list.length === 0 && (
              <p className="rd-library-empty">
                Você ainda não criou nenhuma ficha. Clique em "Criar ficha" pra começar —
                pode fazer isso antes mesmo de entrar numa mesa.
              </p>
            )}

            <div className="rd-library-grid">
              {list.map((c) => (
                <LibraryCard key={c.id} character={c} onClick={() => setSelId(c.id)} />
              ))}
              <button className="rd-library-new-card" onClick={() => setWizard(true)}>
                <span className="rd-library-new-icon">
                  <PlusIcon />
                </span>
                <span className="rd-library-new-title">NOVO AGENTE</span>
                <span className="rd-library-new-sub">Comece uma ficha do zero</span>
              </button>
            </div>
          </>
        )}
      </div>

      {linkPrompt && (
        <TokenLinkDialog
          character={linkPrompt}
          mode="create"
          onClose={() => setLinkPrompt(null)}
        />
      )}
    </div>
  );
}

// Cartão de ficha da grade — só desta tela (não é o `.char-card`/
// CharacterCard.tsx compartilhado com a Mesa do Mestre/painel do jogador,
// que continua intocado). Retrato grande, código curto derivado do id
// real (não é um "número de registro" de verdade, só decoração — a ficha
// não tem esse campo), nome, classe e barra de NEX animada, fiel à
// referência (Fichas-Mesa.dc.html).
function LibraryCard({ character, onClick }: { character: Character; onClick: () => void }) {
  const created = character.createdAt ?? character.updatedAt;
  const elementColor = character.affinityElement ? ELEMENT_COLOR[character.affinityElement] : undefined;
  const style = elementColor ? ({ '--el-accent': elementColor } as CSSProperties) : undefined;
  const code = character.id.slice(-4).toUpperCase();
  return (
    <button className="rd-library-card" style={style} onClick={onClick}>
      <span
        className="rd-library-card-portrait"
        style={character.image ? { backgroundImage: `url(${character.image})` } : undefined}
      >
        {!character.image && (
          <span className="rd-library-card-portrait-initial">
            {character.name?.[0]?.toUpperCase() ?? '?'}
          </span>
        )}
        <span className="rd-library-card-code">#{code}</span>
      </span>
      <span className="rd-library-card-body">
        <span className="rd-library-card-name">{character.name || 'Sem nome'}</span>
        <span className="rd-library-card-class">{CLASS_BY_KEY[character.classe]?.name ?? character.classe}</span>
        <span className="rd-library-card-nex">
          <span className="rd-library-card-nex-row">
            <span>NEX</span>
            <span>{character.nex}%</span>
          </span>
          <span className="rd-library-card-nex-bar">
            <span className="rd-library-card-nex-fill" style={{ width: `${character.nex}%` }} />
          </span>
        </span>
        <span className="rd-library-card-foot">
          <span className="rd-library-card-date">Registrada em {formatDate(created)}</span>
          <span className="rd-library-card-cta">
            ACESSAR <ArrowRightIcon />
          </span>
        </span>
      </span>
    </button>
  );
}
