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

Conexão simultânea de 1 mestre + 4 jogadores (cada um com uma condição de
rede diferente) com sincronização de presença confirmada nos dois
sentidos (mestre vê os 4, cada jogador vê os outros 3 + o mestre), zero
erro de JS, mesmo no perfil de 600ms de latência.

## O que ainda falta (próximos passos)

- Testar propagação de cada funcionalidade específica (dados, tokens,
  música, quadro, chat) com o cluster já de pé.
- Teste de estresse (sessão longa, muitas ações rápidas).
- Fallback de conexão direta falhando (simular desligar a rede de um
  jogador no meio — dá pra fazer com `Network.emulateNetworkConditions`
  passando `offline: true`, ver `setOffline()` em `cdp_lib.mjs`).
- Decidir sobre instalar `clumsy` pra perda de pacote de verdade.
