# CLAUDE.md — guia rápido do projeto

> Isto é um guia, não um histórico. Pra histórico/estado detalhado de
> tarefas, leia `PROGRESSO-BUGS.md` (e releia sempre que o usuário disser
> "continua de onde parou").

## O que é

**"O Outro Lado da Mesa"** (nome anterior: "Outro Lado" — caminhos
internos como `%APPDATA%\OutroLado\` continuam com o nome antigo de
propósito, pra não perder save de versão anterior) — mesa virtual pra
**Ordem Paranormal RPG**: fichas completas, rolagem de dados do sistema,
mapa 2D com grid/tokens, cenário 3D, quadro de investigação, música e
sons ambiente, tudo sincronizado em tempo real entre mestre e jogadores.

Distribuído como app desktop (Electron, Windows) com instalador próprio
e auto-update via GitHub Releases.

## Stack e estrutura

- **Front-end**: React 18 + TypeScript + Vite, Zustand (`src/store/`),
  React Router. 3D com `@react-three/fiber`/`drei`/`three`.
- **Sincronização**: dois transportes bem diferentes, ver
  `src/lib/realtime.ts` (`connectRoom`) — **não são a mesma coisa**:
  - **Rede local** (código `host:porta`): WebSocket relay rodando dentro
    do próprio app (`desktop/server.cjs`), sem internet. Cenário 3D:
    cada cliente desenha a própria cena local (sincroniza só chão/
    objetos).
  - **Pela internet** (código de 6 caracteres, sem `:`): Supabase
    Realtime (channel `room:<code>`) pro estado da mesa; cenário 3D e
    música usam WebRTC de verdade por cima disso
    (`src/components/AvBroadcastController.tsx` — o mestre transmite a
    própria tela 3D + áudio, jogador só recebe vídeo/áudio).
- **Pastas principais** (`src/`): `pages/` (telas: Home, Room...),
  `components/` (UI — ficha, mapas, 3D, música, quadro...), `domain/`
  (regras do jogo: `character.ts` é o maior arquivo, cálculo de
  derivados), `data/` (catálogos: perícias, equipamentos, poderes,
  origens, bestiário — ver seção de livros abaixo), `lib/` (realtime,
  persistência, avMix/WebRTC...), `store/` (`useTableStore.ts`, estado
  da mesa).
- **`desktop/`**: wrapper Electron. `main.js` cria a janela (carrega
  `http://localhost:<porta>` do `server.cjs` embutido); `server.cjs` é
  **standalone** (dá pra rodar fora do Electron, sem código específico
  dele) — permite testar o servidor sem abrir janela nenhuma.
  `package.json` daqui tem a versão REAL do app (a da raiz é só do
  pacote npm interno, não sobe).
- **`server/`**: outra build do servidor, usada pelo modo "portátil"
  (`.exe` que abre no `msedge --app=`, sem Electron).
- **`scripts/online-test/`**: ambiente de teste com várias instâncias
  Electron simuladas (mestre + N jogadores, cada uma com throttling de
  rede via CDP) — ver `README.md` lá antes de testar qualquer coisa de
  rede/online.

## Como rodar / buildar / gerar instalador

```powershell
npm run dev              # dev server (Vite), modo local (sem Supabase se .env vazio)
npm run build            # tsc -b && vite build -> dist/ (precisa rodar antes de empacotar)
npm run typecheck        # ATENÇÃO: "tsc -b --noEmit" dá erro de config (TS6310) nesse projeto,
                          # é falso positivo conhecido — use `npx tsc --noEmit` pra checar de verdade

cd desktop
npm run dist              # empacota o instalador (release/OutroLado-Setup.exe), sem publicar
npm run dist:publish      # empacota E publica no GitHub Releases (precisa GH_TOKEN no ambiente)
```

**Publicar uma nova versão** (depois de `npm run build` na raiz):
1. Bump `desktop/package.json` → `version`.
2. `cd desktop; $env:GH_TOKEN = (gh auth token); npm run dist:publish`
3. A release sai como **draft** — sempre rodar depois:
   `gh release edit vX.Y.Z --repo Doug3011/outro-lado-da-mesa --draft=false`
   (senão o auto-update não alcança ninguém). Confirmar com
   `gh release view vX.Y.Z --json assets` que as URLs não ficam
   "untagged-...".
4. `git.exe`/`gh.exe` não estão no PATH desta sessão por padrão — usar
   caminho completo (`C:\Program Files\Git\bin\git.exe` /
   `C:\Program Files\GitHub CLI\gh.exe`) ou prefixar `$env:PATH`.

## Regras e decisões combinadas

- **Nunca pode quebrar** (reconferir sempre, nas 6 áreas, depois de
  qualquer mudança): música, cenário 3D, cenário 2D, fichas, tokens,
  inventário, quadro de investigação.
- **Nunca inventar regra/número do sistema.** Livros de referência:
  `X:\RPG\ordem-paranormal-rpg-v1-3-lyfxjj.pdf` (livro básico) e
  `X:\RPG\Sobrevivendo-ao-Horror-v1-3.pdf` (suplemento). Se a regra
  não existir ou estiver ilegível/ambígua no PDF, marcar "revisar" em
  vez de chutar ou aproximar em silêncio.
- **Mudanças pequenas, uma por vez, testando depois de cada uma** —
  não misturar várias correções não relacionadas num commit só.
- **Publicar sem perguntar**: só correção de bug pequena/isolada (push +
  release direto). Qualquer mudança maior (feature nova, redesign,
  lote grande de tarefas) pede autorização explícita antes de subir.
- **Testes locais**: usar `$env:ORDEM_PORT` diferente de 47300 (o app
  real do usuário pode estar aberto nela) + `$env:APPDATA` isolado.
  Testando o `.exe`/fonte do Electron: sempre
  `Remove-Item Env:\ELECTRON_RUN_AS_NODE` antes (a sessão seta isso
  globalmente; sem remover, o app morre na hora sem log).
- **Não mexer no projeto "Ribbit"** (tema do usuário às vezes chama de
  "Rabbit") em `C:\Users\dougl\tela-radmin` — é o projeto **Suvaco da
  Jinx**, separado deste. Só serviu de referência de solução (WebRTC
  sem TURN) pra `AvBroadcastController.tsx`, não é código compartilhado.
- **Designs/mockups**: ficam em `D:\Usuários\Downloads` quando o usuário
  manda um `.html`/`.zip` novo pra seguir — ler o mockup inteiro antes
  de implementar, mas adaptar ao código/arquitetura já existente (não
  reescrever componente do zero só pra bater 1:1 com o mockup).
- **`PROGRESSO-BUGS.md`** é o histórico vivo de tarefas: criar lá cada
  tarefa, marcar ao terminar, registrar causa raiz e o que foi testado.
  É o primeiro arquivo a ler quando o usuário disser "continua de onde
  parou".
- **Responder sempre em português.**

## O que está pela metade agora

- **Habilidades/poderes afetando a ficha automaticamente** (ligados a
  PV/PE/SAN, defesa, limite de PE por turno, resistências, perícias
  etc., com texto real dos livros) — ~45 poderes já ligados
  (origem/trilha/classe/paranormal/poderes gerais do suplemento).
  **Faltam**: a maioria dos poderes de trilha restantes (a maior parte
  "gasta PE", mas alguns tipo "Técnica Letal" ainda dão pra ligar com
  bônus por categoria de arma), poderes de classe restantes, afinidades
  elementais, 8 poderes gerais do suplemento, e a tabela-resumo final
  pro usuário (habilidade | origem | livro/pág | efeito | status).
- **Varredura de bugs focada no modo online** — ambiente de teste criado
  e funcionando (`scripts/online-test/`). Já testado: conexão simultânea
  mestre+4 jogadores com latência simulada (50-600ms) nos dois
  transportes (LAN e internet), cenário 3D nos dois modos, música via
  WebRTC. **Faltam**: dados/combate/iniciativa/tokens no 2D/quadro/chat
  (sincronia, duplicação, perda), teste de estresse (sessão longa, ações
  rápidas, troca de cenário repetida), CPU/memória/FPS em cliente fraco,
  varredura tela-por-tela offline, relatório final por gravidade e as
  correções em si.
- **Versão publicada atualmente**: v2.6.0 (ver GitHub Releases de
  `Doug3011/outro-lado-da-mesa`).
