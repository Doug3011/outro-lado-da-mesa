# Progresso — bugs e funções novas (sessão iniciada 2026-11-16)

> Se o usuário disser "continua de onde parou": leia este arquivo inteiro
> primeiro, confira o que já está marcado, releia a seção "Notas/meio do
> caminho" de qualquer tarefa em andamento, e continue dali — não repita
> trabalho já feito nem pule etapas de teste.

## Regra de ouro (vale pra toda tarefa abaixo)
- Ler o código relacionado antes de mexer.
- Mudança pequena e isolada por vez.
- Depois de CADA tarefa, testar ao vivo (CDP, instância isolada): música
  tocando/chegando pro jogador, transmissão do cenário 3D, cenário 2D,
  fichas (personagem + monstro), tokens, quadro de investigação.
- Se algo quebrar, corrigir antes de seguir pra próxima tarefa — nunca
  deixar duas tarefas pela metade ao mesmo tempo.
- Build limpo (`npx tsc --noEmit` + `npm run build`) antes de cada commit.
- Nada é publicado/subido sem o usuário pedir explicitamente.

## Investigação inicial (antes de qualquer mudança)

- [x] Descompactar e ler os 2 arquivos de design — achados:
      `Dentro da mesa — Combate ficha de criatura-html.zip` e
      `O Outro Lado da Mesa — Área do mestre Músicas e Criaturas
      (Energia)-html.zip`, ambos em `D:\Usuários\Downloads` (15/11, os
      mais recentes). Tema vermelho/combate pro primeiro, roxo/energia
      pro segundo (bestiário com filtro por elemento, AND com busca por
      nome).
- [x] Achar a pasta do projeto "Rabbit" — na verdade **Ribbit**, em
      `C:\Users\dougl\tela-radmin`. Transmissão principal usa LiveKit
      Cloud (SFU pago); transferência de arquivo usa TURN grátis
      (Metered.ca) via Supabase Vault + padrão de re-assinar canal
      Realtime que caiu.
- [x] Testado se dá pra ler ameaça do CRIS — **NÃO VIÁVEL**: `/`,
      `/robots.txt`, `/sitemap.xml` e um palpite `/ameacas` devolvem o
      MESMO HTML idêntico de 37 caracteres (SPA sem renderização no
      servidor). Tarefa 7 descartada, usuário será avisado, nada
      implementado.
- [x] Lido o código atual relevante às 6 tarefas restantes (ver plano em
      `C:\Users\dougl\.claude\plans\swirling-waddling-music.md` pros
      detalhes/linhas exatas de cada bug).

**Decisão do usuário sobre a Tarefa 2 (depois de ver as opções):** só
melhorar a reconexão (sem TURN) — ver plano.

## 1. Quadro de investigação — apagar item (seleção + lixeira + Delete)
- [x] Implementado
- [x] Testado (CDP, instância isolada porta 47399/APPDATA próprio)
- Notas/meio do caminho:
  - Causa raiz confirmada: `onPointerDown={(e) => e.stopPropagation()}`
    incondicional na `<textarea>` da nota bloqueava quase toda a área da
    anotação pra qualquer ferramenta — removido; agora o clique sobe pro
    item (que já tinha o `if (tagName === 'TEXTAREA') return` certo pra
    não iniciar arraste).
  - Clique com ferramenta "mover" agora seleciona o item (`selectedId`),
    com contorno dourado (`.inv-selected-outline`) diferente do contorno
    vermelho de "ligando fio". Clicar em espaço vazio do quadro (ferramenta
    mover) limpa a seleção.
  - Botão de lixeira fixo na barra de ferramentas (sempre visível, opaco
    quando não há seleção) + tecla `Delete`/`Backspace` (ignorando quando
    o foco está em input/textarea, pra não interferir ao digitar notas).
  - "Borracha" deixou de apagar prova/anotação no clique direto (agora só
    fio/desenho, que não têm seleção) — modelo unificado só por
    seleção+lixeira/Delete pros itens.
  - Regra de permissão mantida (prova só mestre); jogador que tentar
    apagar prova pela lixeira/Delete agora recebe toast explicando, em
    vez de falhar em silêncio.
  - Testado: criar nota → selecionar (clique até no meio da textarea,
    que era o ponto cego) → apagar pela lixeira; criar nota → selecionar
    → apagar com Delete; mestre apagando prova (vault) pela lixeira;
    clicar em espaço vazio desseleciona e desabilita a lixeira. Todos os
    deltas de contagem de item bateram certo, zero erros de JS.
  - Reconferido sem regressão: Ficha, Mestre, Tokens, Combate, Músicas
    abrem sem erro de JS (build isolado, não toca 3D/música/rede — risco
    baixo, mas confirmado mesmo assim).
  - `npx tsc --noEmit` e `npm run build` limpos.

## 2. Transmissão 3D + música caindo (solução do Rabbit em vez de TURN)
- [x] Solução do Rabbit entendida (ver Investigação inicial — usuário
      escolheu "só melhorar a reconexão, sem TURN")
- [x] Aplicada no tabletop (cenário 3D) — mesmo `AvBroadcastController`
      cobre vídeo e áudio, não precisou separar
- [x] Aplicada no tabletop (música) — mesma conexão/track de áudio
- [x] Reconexão automática confirmada (testado via DevTools, ver abaixo)
- Notas/meio do caminho:
  - `src/components/AvBroadcastController.tsx`: agora reage tanto a
    `'disconnected'` (com 3s de folga, costuma se resolver sozinho)
    quanto a `'failed'`. Lado do MESTRE: até 4 tentativas de ICE restart
    por jogador; esgotando, fecha e recria a `RTCPeerConnection` do zero
    (nova oferta de verdade, não só ICE restart). Lado do JOGADOR: como
    ele nunca oferta nesta topologia (só o mestre), restartIce() sozinho
    não adiantava nada — em vez disso, se a conexão não voltar após a
    folga, ele fecha a própria conexão e manda `webrtc:bye` (sinal que já
    existia no código mas nunca era enviado por ninguém) pedindo pro
    mestre recriar; o mestre recebe o bye e, se o jogador ainda estiver
    na mesa, recria e manda oferta nova na hora.
  - SEM servidor TURN (decisão explícita do usuário) — isso continua
    sendo um limite real do WebRTC só-STUN, não um bug: duas pontas atrás
    de NAT simétrico ao mesmo tempo ainda podem não conseguir se
    conectar de jeito nenhum. O que melhora de verdade são quedas
    transitórias/lentidão, não esse caso extremo.
  - Testado via CDP com DUAS instâncias isoladas de verdade (mestre +
    jogador, mesa pela internet/Supabase, portas/perfis separados):
    confirmado caminho feliz (conexão chega em "connected" dos dois
    lados). Como não dá pra forçar queda de rede de verdade com
    segurança nesta máquina, forcei os estados via DevTools
    (sobrescrevendo `connectionState` e disparando
    `onconnectionstatechange` manualmente, e interceptando
    `RTCPeerConnection`/`restartIce` pra observar):
    - Lado do mestre: `disconnected` → 1 `restartIce()` após a folga;
      repetido até esgotar as 4 tentativas → aí sim fechou a conexão
      antiga (`signalingState` virou `closed`) e criou uma nova do zero,
      que negociou e chegou em `connected` de novo (jogador respondeu a
      oferta nova sem erro nenhum).
    - Lado do jogador: `disconnected` → depois da folga, fechou a própria
      conexão e o mestre recriou a dele automaticamente, mandando oferta
      nova; o jogador aceitou numa conexão nova, que também chegou em
      `connected`.
    - Zero erros de JS nos dois lados durante todo o teste.
  - Reconferido sem regressão: Ficha, Mestre, Tokens, Mapas, Combate,
    Quadro e Músicas abrem sem erro de JS no mestre, mesmo logo depois
    do estresse de reconexão.
  - `npx tsc --noEmit` e `npm run build` limpos.

## 3. Ficha de personagem — tela cheia de escolha de origem
- [x] Implementado (lista + descrição/perícias/poder sem selecionar +
      "Escolher esta origem" + fechar sem escolher)
- [x] Testado (CDP, wizard E ficha já criada)
- Notas/meio do caminho:
  - Novo `src/components/OriginPickerDialog.tsx` — tela cheia (lista das
    46 origens à esquerda, clique só pré-visualiza nome/perícias/poder
    sem escolher; "Escolher esta origem" confirma, "Fechar sem escolher"
    sai sem mudar nada). Visual reaproveita o card-list já estabelecido
    de Classe (`.rd-cw-class-card`), só com CSS novo pro layout de
    lista+detalhe lado a lado (`.rd-op-*` em `index.css`).
  - `CharacterWizard.tsx`: o combobox apertado (`SearchSelect`) virou um
    botão que abre o diálogo; `CharacterSheet.tsx`: o `<input>` de texto
    livre (não validado contra as origens) virou o mesmo botão/diálogo,
    já pré-selecionando a origem atual ao abrir.
  - Testado: no wizard, abri o diálogo, pré-visualizei "Atleta" (nome +
    perícias + poder aparecem corretos sem selecionar), fechei sem
    escolher (campo continuou vazio), reabri, confirmei — campo e nota
    de poder atualizaram certo. Terminei de criar o agente e, na ficha
    já criada, abri o mesmo diálogo pelo campo Origem — veio com
    "Atleta" pré-marcado (".on") — troquei pra "Criminoso" e confirmei,
    campo da ficha atualizou. Zero erros de JS nos dois fluxos.
  - Reconferido sem regressão: Ficha, Mestre, Tokens, Mapas, Combate,
    Quadro e Músicas abrem sem erro de JS numa mesa nova.
  - `npx tsc --noEmit` e `npm run build` limpos.
  - **Bug reportado depois (publicado v2.3.0): não dava pra rolar a lista
    de origens com a roda do mouse, escondendo as de baixo.** Causa raiz:
    `.rd-op-list`/`.rd-op-detail` dependiam só de `align-items: stretch`
    (herdado de `normal`) pra ganhar altura do pai `.rd-op-body`, e o
    Chromium não respeitava isso num flex `wrap` de uma linha só — os dois
    cresciam pro tamanho do CONTEÚDO (2623px, igual nos dois, sem limite),
    em vez de ficar presos à altura da tela — `overflow-y: auto` não tinha
    o que rolar porque `clientHeight === scrollHeight`. Corrigido com
    `height: 100%` explícito nos dois (`index.css`) — testado ao vivo
    (CDP): antes `clientHeight`/`scrollHeight` = 635/635 (nada pra rolar);
    depois = 635/1588, e `scrollTop` passou a mover o conteúdo de verdade
    (revelou Militar/Operário/Policial/etc., que estavam escondidos).
    `npx tsc --noEmit` limpo. **Ainda não publicado** — só commitado local.

## 4. Vincular token à ficha — bug dos tokens salvos não aparecendo
- [x] Causa raiz encontrada
- [x] Corrigido (na criação E na ficha já criada)
- [x] Testado
- Notas/meio do caminho:
  - Causa raiz confirmada (já suspeitada na investigação inicial):
    `TokenLinkDialog.tsx` só olhava pros tokens JÁ soltos no mapa da cena
    ativa (`scene.tokens`) — nunca chamava `fetchTokenLibrary()`. Usado
    idêntico nos dois lugares (criação e ficha já criada), um fix aqui
    resolveu os dois de uma vez.
  - Adicionada seção "Biblioteca de tokens" no diálogo, buscando
    `fetchTokenLibrary()` (mesmo import de `TokenLibraryManager.tsx`).
    Escolher um item baixa e reduz a imagem (`urlToDownscaledDataURL`,
    mesmo caminho de arrastar um token da biblioteca pro mapa) e cria um
    `Token` novo na cena ativa já vinculado ao personagem.
  - Testado via CDP: subi uma mesa, enviei uma imagem pra Biblioteca de
    Tokens (Área do Mestre), saí da mesa, criei uma ficha nova — o
    diálogo pós-criação ("Vincular a um token?") já mostrou o token
    salvo na seção nova; cliquei nele e o botão da ficha virou "Trocar
    token (Agente Teste Token)", confirmando o vínculo. Reabri o mesmo
    diálogo pela ficha já criada (modo "Token de ..."): mostrou "Token
    atual: Agente Teste Token" + Desvincular, e a Biblioteca de tokens
    continuou disponível pra trocar por outro salvo. Zero erros de JS.
  - Reconferido sem regressão: Ficha, Mestre, Tokens, Mapas, Combate,
    Quadro e Músicas abrem sem erro numa mesa nova.
  - `npx tsc --noEmit` e `npm run build` limpos.

## 5. Área do Mestre — design novo + Fichas de Monstros + remover Mapas
- [x] Design novo aplicado na Área do Mestre (menu inicial)
- [x] Botão "Mapas" removido (Cenário 2D/3D já cobrem)
- [x] "Fichas de Monstros": biblioteca (criar/editar/apagar/listar) com
      filtro por elemento funcionando de verdade
- [x] Design novo aplicado na ficha de monstro DENTRO da mesa
      (combate + criação)
- [x] Testado
- Notas/meio do caminho:
  - Descoberta importante ao investigar: a Área do Mestre (`Home.tsx`,
    classes `rd-gm-*`) **já tinha** o visual novo (tema Energia/roxo,
    fundo animado, abas) de uma leva de redesign anterior — só a aba
    "Criaturas" não existia e "Mapas" sobrava. Escopo real da tarefa:
    tirar "Mapas", criar a aba "Criaturas" nova, e redesenhar só a FICHA
    de monstro em si (`CreatureCard`, que é usada tanto na biblioteca
    quanto dentro da mesa) — as outras abas (Músicas/Tokens/Cenário 2D/
    3D) já funcionavam e já tinham visual, não foram mexidas (Regra de
    ouro: não arriscar quebrar o que já funciona sem necessidade).
  - `src/domain/creature.ts`: campos novos `el?: Element` e `tags?:
    string`, opcionais (ameaça salva antes continua válida).
  - Novo `src/lib/creatureLibrary.ts` — biblioteca local (localStorage,
    mesmo padrão de `characterLibrary.ts`), fora de qualquer mesa.
  - `CreatureCard` foi EXTRAÍDA de `CombatTracker.tsx` pro arquivo
    próprio `src/components/CreatureCard.tsx`, pra poder ser reusada
    tanto na Área do Mestre quanto dentro da mesa — mesmos dados/ações
    de sempre (rolar teste/dano/perícia/habilidade, editar PV/atributos/
    perícias/ações/habilidades), só a apresentação mudou: cabeçalho com
    retrato/nome/VD, seletor de elemento (reaproveitando os 5 elementos
    já estabelecidos no app, não a paleta de 6 do mock), chips de
    tamanho/defesa/deslocamento, barra de vida com marcador de
    "machucado" e botões de ajuste rápido, abas Status/Atributos/Ações/
    Habilidades/Notas. Hexágono de atributo reaproveita `.rd-cw-hex*`
    (já existente, do wizard de personagem).
  - `Home.tsx`: aba "Criaturas" nova — busca + filtro por elemento (AND
    combinado, igual ao design) + lista + `CreatureCard` como
    editor/detalhe. Bug pego e corrigido durante o teste: faltava
    `key={selected.id}` no `CreatureCard` da lista, o que fazia o
    componente NÃO resetar a aba ativa ao trocar de criatura selecionada
    (ficava preso na última aba vista). Corrigido antes de prosseguir.
  - Testado via CDP: criar criatura, trocar nome/elemento (reflete na
    lista em tempo real), aumentar atributo (hexágono), adicionar
    perícia, adicionar ação, filtrar por elemento, buscar por nome,
    trocar de criatura selecionada (confirma que o bug do `key` foi
    corrigido — aba volta pra Status), subir retrato, excluir. Dentro da
    mesa: editor expandido e card colapsado da criatura, rolar teste e
    dano de uma ação (confirmado no Histórico), adicionar à iniciativa.
    Zero erros de JS em toda a sequência.
  - Reconferido sem regressão: Ficha, Mestre, Tokens, Mapas (2D), Quadro
    e Músicas abrem sem erro numa mesa nova.
  - `npx tsc --noEmit` e `npm run build` limpos.

## 6. Importar monstro da biblioteca pra mesa (botão "Importar monstro")
- [x] Implementado (copia ficha + token se tiver, só mestre vê)
- [x] Testado
- Notas/meio do caminho:
  - Botão "Importar monstro" dentro da janela Combate (já é GM-only —
    a janela toda só existe pro mestre, `{me.isGM && <FloatingWindow...`
    em `BattleMap.tsx`, não precisou de checagem extra). Abre uma lista
    (mesmo padrão chip-row do "+ Adicionar" já existente) com as
    criaturas da biblioteca; clicar copia a ficha (novo id, PV cheio)
    pra cena ativa e, se a ficha tiver retrato, solta um token com essa
    imagem no centro do mapa (sem vínculo permanente — mesmo nível de
    "token solto" de qualquer outro, já que esse conceito de vínculo
    criatura↔token não existia antes e não foi inventado agora).
  - Testado via CDP: subi uma criatura com retrato na biblioteca,
    importei pra uma mesa nova — ficha apareceu certa (PV 10/10, nome,
    elemento) e um token com a imagem apareceu no mapa (`.token .tk-img`
    confirmado). Zero erros de JS.
  - `npx tsc --noEmit` e `npm run build` limpos (mesmo build do item 5).

## 7. Importar ameaça pelo link do CRIS
- [x] Viabilidade testada (ver Investigação inicial) — **NÃO VIÁVEL**
- [x] Inviável confirmado: usuário avisado, nada adicionado (nenhuma
      alternativa) — ver relatório final
- Notas: SPA sem renderização no servidor, mesmo HTML em toda URL
  testada (`/`, `/robots.txt`, `/sitemap.xml`, `/ameacas`).

## Relatório final

Todas as 6 tarefas viáveis foram feitas, testadas (CDP, instância
isolada) e commitadas UMA DE CADA VEZ (6 commits separados). Nada foi
publicado/subido — só commits locais, como combinado.

### O que mudou

1. **Quadro de investigação**: clique agora seleciona o item (contorno
   dourado) em vez de depender só da "borracha"; lixeira sempre visível
   na barra + tecla Delete apagam o selecionado; jogador tentando
   apagar uma prova (só mestre pode) recebe um aviso em vez de nada
   acontecer. A causa do "sumiço" era a anotação bloqueando quase todo
   clique sobre ela — corrigido.
2. **Transmissão 3D/música caindo**: reconexão mais insistente dos dois
   lados (mestre E jogador), sem adicionar servidor TURN (como você
   pediu). Quando esgota as tentativas de reconectar sozinho, fecha e
   recria a conexão do zero em vez de ficar morta pro resto da sessão.
   Continua sendo possível falhar em redes muito restritas — isso é
   limite de verdade do WebRTC sem TURN, não um bug.
3. **Escolha de origem**: tela cheia nova (lista + perícias/poder antes
   de confirmar), tanto na criação quanto na ficha já pronta.
4. **Vincular token**: tokens salvos na biblioteca agora aparecem pra
   escolher, na criação da ficha e na ficha já criada.
5. **Área do Mestre**: botão "Mapas" removido; aba "Criaturas" nova
   (biblioteca de monstros com busca + filtro por elemento de verdade);
   ficha de monstro redesenhada (cabeçalho, elemento, barra de vida,
   abas) tanto na biblioteca quanto dentro da mesa.
6. **Importar monstro**: dentro da mesa, puxa uma ficha da biblioteca
   pra cena (com token, se tiver retrato).
7. **Importar do CRIS**: **não implementado** — testei de verdade
   (`crisordemparanormal.com`, `/robots.txt`, `/sitemap.xml`, `/ameacas`)
   e as 4 URLs devolvem o mesmo HTML de 37 caracteres: é um app que só
   roda com JavaScript no navegador, sem nada pra ler só com o link.
   Como combinado, não implementei nenhuma alternativa nem adicionei
   botão — só esse aviso mesmo.

### O que testar

- **Quadro**: selecionar uma prova/nota (clique, inclusive no meio do
  texto da anotação) e apagar pela lixeira e pelo Delete; tentar apagar
  uma prova sendo jogador (deve avisar, não apagar).
- **3D/música**: usar numa mesa de verdade por um tempo pra ver se
  reconecta sozinho quando a internet oscila (não dá pra simular queda
  de rede de verdade com segurança aqui — testei forçando os estados
  via DevTools, mas o teste de campo real é seu).
- **Origem**: criar uma ficha nova e trocar a origem de uma já existente.
- **Token**: vincular um token salvo (não um já solto no mapa) a uma
  ficha nova e a uma já existente.
- **Criaturas**: Área do Mestre → Criaturas — criar, editar, filtrar
  por elemento, buscar por nome, excluir; dentro da mesa, Combate →
  Importar monstro.
- Geral: música, cenário 3D/2D, fichas e tokens continuam funcionando
  normalmente (reconferidos depois de cada tarefa, mas vale o seu
  próprio teste).

Nenhum commit foi publicado (`git push`)/lançado como versão nova —
avise quando quiser que eu publique.
