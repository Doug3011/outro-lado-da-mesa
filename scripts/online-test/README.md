# Ambiente de teste online (Parte 2 — "O Outro Lado da Mesa")

Simula 1 mestre + N jogadores em computadores diferentes, cada um com
sua própria condição de rede, tudo rodando nesta máquina (mesmo
princípio dos testes de bug fix do resto do projeto: instâncias Electron
isoladas, porta/perfil/CDP próprios — só que várias ao mesmo tempo e
conectadas numa mesa só).

## Como rodar

```powershell
cd scripts\online-test
.\launch-cluster.ps1 -Players 4        # sobe 1 mestre + 4 jogadores
node join-table.mjs                     # mestre hospeda, jogadores entram
# ... rodar os testes que quiser nos clientes já conectados ...
.\teardown.ps1                          # encerra tudo no fim
```

`launch-cluster.ps1` grava `cluster-roles.json` com a porta HTTP (modo
LAN, endereço `127.0.0.1:<porta>`) e a porta CDP de cada instância.
`join_one.mjs <cdpPort> <nome> <portaHttpDoMestre> <perfil>` entra com UM
jogador só, útil pra testar de novo sem reiniciar o cluster inteiro.

### Mesa "Pela internet" (Supabase), em vez de rede local

O app tem DOIS modos de mesa bem diferentes, e os dois merecem teste:
modo **Rede local** (`host:porta`, usado acima) e modo **Pela internet**
(Supabase Realtime, sem Radmin/VPN — provavelmente como o usuário
realmente joga com gente longe). Precisa do `.env` do projeto com
`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` configurados (já estão).

```powershell
node host_internet.mjs                              # mestre hospeda, gera um código, salva em internet-room-code.json
node join_internet.mjs 9602 jogador1 <CODIGO> latencia50
node join_internet.mjs 9603 jogador2 <CODIGO> latencia150
node join_internet.mjs 9604 jogador3 <CODIGO> latencia300
node join_internet.mjs 9605 jogador4 <CODIGO> latencia600
```

Entre os jogadores UM DE CADA VEZ (mesmo motivo do achado abaixo sobre
`join-table.mjs`) — `join_internet.mjs` já confirma "AO VIVO" antes de
devolver o controle.

### Testar a mesa 3D (`test-3d.mjs`)

```powershell
node test-3d.mjs lan         # depois de join-table.mjs
node test-3d.mjs internet    # depois de host_internet.mjs + join_internet.mjs
```

O app usa um transporte DIFERENTE pra cada modo (achado desta sessão, não
documentado antes): no modo **lan**, cada cliente desenha a própria cena
3D localmente a partir do cenário sincronizado (sem vídeo nenhum — o
script confirma que tem `<canvas>` e ZERO `<video>`). No modo
**internet**, o mestre transmite a própria tela 3D por WebRTC
(`AvBroadcastController.tsx`) e cada jogador recebe vídeo de verdade (o
script confirma `<video>` com `videoWidth/Height` reais, não só presente).

**Pegadinha achada**: com várias janelas do cluster empilhadas no mesmo
desktop, o Windows/Chromium pode marcar a do mestre como "ocluída" e
travar o `canvas` dele em 300x150 (o padrão do HTML, nunca desenha nada
de verdade) — isso faz o teste do modo internet falhar com vídeo `0x0`
travado em "Preparando a mesa…" nos jogadores, mesmo sem nenhum bug real.
`SetForegroundWindow` sozinho não resolve. Rode:

```powershell
.\fix-window-occlusion.ps1 -CdpPort 9601
```

antes de `test-3d.mjs internet` se isso acontecer (minimiza e restaura a
janela do mestre, forçando o Chromium a recalcular a oclusão direito).

## Perfis de rede (`cdp_lib.mjs`)

Usa `Network.emulateNetworkConditions` do Chrome DevTools Protocol — o
mesmo throttling de verdade do painel Network do DevTools, aplicado por
cliente (cada jogador é uma aba/processo isolado, então o throttling de
um não afeta os outros nem o mestre).

| Perfil | Latência | Banda |
|---|---|---|
| `latencia50` / `latencia150` / `latencia300` / `latencia600` | 50/150/300/600ms | sem limite |
| `bandaBaixa` | 150ms | ~256kbps down / 64kbps up |

`join-table.mjs` já aplica 50/150/300/600ms nos 4 primeiros jogadores
(ordem pedida) e `bandaBaixa` num 5º, se houver.

**Sobre perda de pacote**: o CDP (`Network.emulateNetworkConditions`) não
tem parâmetro de perda de pacote — só latência e banda. Simular perda de
pacote de verdade no Windows exigiria uma ferramenta à parte como
`clumsy` (usa um driver WinDivert) — não está instalada nesta máquina, e
instalar um driver de rede é uma decisão que pede autorização antes de
fazer. Fica como item pendente, não inventado nem aproximado silenciosamente.

## O que já foi confirmado com isso (ver PROGRESSO-BUGS.md)

- Conexão simultânea de 1 mestre + 4 jogadores (cada um com uma condição
  de rede diferente) com sincronização de presença confirmada nos dois
  sentidos (mestre vê os 4, cada jogador vê os outros 3 + o mestre), zero
  erro de JS, mesmo no perfil de 600ms de latência. Testado nos dois
  modos (rede local e pela internet).
- Mesa 3D: modo local-render (lan) e transmissão WebRTC (internet) — ver
  `test-3d.mjs` acima, achados completos no PROGRESSO-BUGS.md.
- Jogador caindo e voltando: matar o processo e reabrir funciona —
  presença atualiza certo e o jogador recupera o estado (inclusive vídeo
  da mesa 3D) ao reentrar com o mesmo código.

## Limitação achada: `offline: true` não derruba conexão já aberta

`Network.emulateNetworkConditions({ offline: true })` **não corta** uma
conexão já estabelecida (testado em WebSocket `/lan/room` e em WebRTC) —
é uma limitação conhecida do Chromium (essa emulação bloqueia requisição
NOVA, não socket já aberto), não um jeito de simular queda transitória de
rede. Pra testar queda de verdade: matar o processo inteiro (mais
realista, é o que os scripts acima fazem) ou forçar o estado da
`RTCPeerConnection` via DevTools (mais cirúrgico, usado na tarefa 2 do
PROGRESSO-BUGS.md pra testar o ICE restart).

## O que ainda falta (próximos passos)

- Testar propagação de cada funcionalidade específica (dados, tokens,
  música, quadro, chat) com o cluster já de pé.
- Teste de estresse (sessão longa, muitas ações rápidas).
- Testar a mesa 3D pela internet com mais de 4 jogadores assistindo ao
  mesmo tempo (teto real não medido ainda).
- Decidir sobre instalar `clumsy` pra perda de pacote de verdade.
