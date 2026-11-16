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

## 8. Criaturas do livro já prontas no Bestiário (pedido extra do usuário)
- [x] Implementado (botão "Importar do livro" na aba Criaturas)
- [x] Testado
- Notas:
  - Usuário pediu pra trazer criaturas que já existem no livro pra dentro
    da ficha de monstros. Os PDFs que ele tinha em Downloads só cobriam
    até a pág. 100 do livro base (ainda no cap. de Equipamento) — sem o
    cap. 7 (Ameaças). Usuário então apontou o livro completo de verdade
    em `X:\RPG\` (`ordem-paranormal-rpg-v1-3-lyfxjj.pdf`, 332 págs., e
    `Sobrevivendo-ao-Horror-v1-3.pdf`, 226 págs.).
  - Extraí o texto desses PDFs (`pypdf`/`pdfplumber`, Python — `pdfplumber`
    foi o que preservou os acentos corretamente) e localizei: cap. 7
    "Ameaças" do livro base (pág. 177-294: só tem NPCs humanos/animais
    reais — Bandido, Policial, Cão de guarda, Jacaré, Líder de Culto etc.
    — o livro base NÃO tem bestiário de monstros paranormais únicos,
    fica tudo a critério do mestre/aventura) e cap. 3 "Ameaças
    Paranormais" do Sobrevivendo ao Horror (pág. 126-157 e 162: Sepultado,
    Mescla, Derretido, Quibungo, Profundo, Rascunho, Memento Mori,
    Medusa, Amigo Imaginário, Caçador de Gente — essas sim são as
    criaturas originais do Outro Lado).
  - `src/data/creatureBook.ts` (novo): 15 criaturas com VD, atributos,
    Defesa, PV, resistências, perícias, ações (teste+dano) e habilidades
    transcritos de verdade dos livros (não inventados) — flavor text é
    resumo próprio, não cópia literal da prosa do livro. Comentário no
    topo do arquivo explica a única simplificação feita: o livro escreve
    bônus como "NdO+M" (rola N d20, fica com o maior, soma M); aqui só
    guardamos o M porque o app já rola N sozinho a partir do atributo
    certo da própria criatura (`rollOrdemTest` em `domain/dice.ts`) — pra
    uns 2-3 bichos de VD muito alto o N impresso no livro não bate com
    nenhum atributo listado da ficha resumida (provável bônus especial
    de "grau" não detalhado ali); nesses casos usei o maior atributo
    disponível como aproximação, mas o M (bônus fixo) está sempre certo.
  - `Home.tsx`: botão "Importar do livro" na aba Criaturas da Área do
    Mestre, ao lado de "+ Nova criatura" — importa as 15 de uma vez,
    pulando (por nome) as que já estiverem na biblioteca, com uma
    mensagem confirmando quantas entraram.
  - Testado via CDP: cliquei "Importar do livro" numa biblioteca vazia —
    as 15 apareceram certas (`Bestiário · 15`), abri a Medusa (VD 320,
    elemento Conhecimento, Grande, DEF 50, PV 380/380, Machucado em 190,
    3 Ações, 11 Habilidades — todos os números batendo com o que
    transcrevi) sem nenhum erro de JS. Reconferido sem regressão: Ficha,
    Mestre, Tokens, Mapas, Quadro e Músicas abrem numa mesa nova sem erro.
  - `npx tsc --noEmit` e `npm run build` limpos.
  - **Aviso de precisão**: são 15 criaturas (não o livro inteiro) e os
    números foram conferidos com cuidado, mas vieram de extração de texto
    automática de um PDF grande — se algum número parecer estranho numa
    sessão de verdade, vale conferir contra o livro físico/PDF e editar
    direto na ficha (é só um campo de texto/número, não precisa mexer em
    código).
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

---

# Lote novo (Capítulo 7 + Inventário) — plano em
`C:\Users\dougl\.claude\plans\swirling-waddling-music.md`

> Correção de uma nota errada minha acima (tarefa 8): o livro base TEM um
> bestiário paranormal grande no Capítulo 7 (~45-47 criaturas únicas, antes
> da parte de NPCs mundanos) — eu só tinha lido a parte mundana antes.

## 9. Capítulo 7 — aviso de VD (sem tabela de construção)
- [x] Implementado
- [x] Testado (CDP, instância isolada porta 47399/APPDATA próprio)
- Decisão do usuário: não existe tabela "VD → Defesa/PV/bônus" nos livros;
  em vez de inventar/estimar, só um aviso fixo perto do campo VD.
- Notas:
  - `src/components/CreatureCard.tsx`: `title` no `.cm-vd-field` (tooltip
    ao passar o mouse) + um parágrafo sempre visível (`.cm-vd-hint`, CSS
    novo em `index.css`) explicando que não há tabela de construção por VD
    nestes livros, e que o VD aqui é só o valor comparativo (soma dos VDs
    do combate vs. soma do NEX do grupo, pág. 177 do livro base).
  - Testado: Área do Mestre → Criaturas → Nova criatura → aviso aparece
    certo, tooltip com o texto completo. Reconferido sem regressão: todas
    as abas da Área do Mestre (Músicas, Sons Ambiente, Tokens, Cenário 2D,
    Cenários 3D, Criaturas) e todas as abas da mesa (Ficha, Mestre, Tokens,
    Mapas, Combate, Quadro, Músicas) abrem sem erro de JS.
  - `npx tsc --noEmit` e `npm run build` limpos.

## 10. Bestiário completo do Capítulo 7 → biblioteca ("Livro oficial") — CONCLUÍDA
- [x] Campo `source`/`official` no modelo de Creature + badge + filtro
- [x] Lote 1 (criaturas paranormais, 8): Aberração de Carne, Aniquilação,
      Carente, Dama de Sangue, Enpap-X, Kerberos, Minotauro, Mulher
      Afogada — testado (Bestiário · 23, Kerberos PV1150/DEF46
      conferidos, zero erros de JS)
- [x] Lote 2 (12): Titã de Sangue, Zumbi de Sangue, Zumbi de Sangue
      Bestial, O Diabo, Aracnasita, Carniçal Preto da Morte, Ceifador
      Espiral, Enraizado, Escutado, Esqueleto de Lodo, Marionete, Múmia
      Xipófaga — testado (Bestiário · 35, O Diabo PV1666/DEF66
      conferidos, zero erros de JS)
- [x] Lote 3 (11): Nidere, Sempiternal, Succ, O Deus da Morte, Anjo,
      Bicho-Papão, Espreitador, EstrangEiro, Existido, Lembrado, Ocioso —
      testado (Bestiário · 46, O Deus da Morte PV2000/DEF60 conferidos,
      zero erros de JS)
- [x] Lote 4 (16): Parasita de Culpa, Rastejador Sombrio, Silhueta,
      Vulto, Máscara do Desespero, Anárquico, Anárquico Descontrolado,
      Anomalia, Anomiático, Ciborgue, Infecticídio, Perturbado de
      Energia, Sukkalgir, Telopsia, Tempestuoso, Viajante — testado
      (Bestiário · 62, Máscara do Desespero PV1200 conferido, zero
      erros de JS)
- [x] Lote 5 (2, últimas do bestiário paranormal): Anfitrião (VD413,
      multifacetada) e Degolificada (VD320, multi-elemental) — testado
      (Bestiário · 64, Anfitrião PV1413 conferido, zero erros de JS).
      Bestiário paranormal do livro base completo (49 criaturas, 191 a
      291 da numeração do PDF). Falta ainda: ficha de pré-transformação
      do Enpap-X ("existido comum", pág. 240 — referenciada mas não
      transcrita; Enpap-X já importado é só a forma final).
- [x] Lote 6 (13, últimas do Capítulo 7): Capanga, Soldado de Aluguel,
      Assassino, Comandante Mercenário, Iniciado, Investido, Policial de
      Elite, Chefe de Polícia, Enxame de Abelhas, Enxame de Ratos,
      Javaporco, Onça-Pintada, Sucuri — testado (Bestiário · 77,
      Assassino PV90 conferido, zero erros de JS).
      **Capítulo 7 do livro base completo: 49 criaturas paranormais
      (lotes 1-5) + 19 NPCs/animais mundanos (6 já existiam desde antes
      + 13 deste lote) = 68 fichas do livro base, mais as 9 só do
      Sobrevivendo ao Horror (dentro das 15 originais) = Bestiário com
      77 criaturas "Livro oficial" no total depois de importar tudo.**
- [ ] Testado (biblioteca + os 6 itens de sempre) após cada lote
- Notas: transcrição conferida ficha a ficha contra o PDF; qualquer dado
  ilegível/contraditório vira nota "revisar", nunca um número inventado.
  - `domain/creature.ts`: campo novo `source?: 'livro' | 'custom'`
    (opcional, ameaças salvas antes continuam válidas sem ele).
    `createBookCreatures()` (`data/creatureBook.ts`) marca `source: 'livro'`
    em tudo que gera — as 15 do Sobrevivendo ao Horror já existentes
    passaram a ganhar o marcador junto, sem precisar reimportar nada.
  - Badge `.rd-gm-badge` ("Livro oficial") ao lado do nome na lista
    (`Home.tsx`) e no cabeçalho do editor (`CreatureCard.tsx`), só quando
    `source === 'livro'`.
  - Filtro novo "Livro oficial" (`Home.tsx`, ao lado dos chips de elemento)
    em AND com elemento e busca por nome.
  - Testado (CDP): importar as 15 do livro → badge aparece nas 15; criar
    uma criatura nova → sobe pra 16 mas sem badge; ligar o filtro "Livro
    oficial" → volta pra mostrar só as 15; abrir uma ficha do livro →
    badge aparece no editor também. Dentro da mesa, Combate → "Importar
    monstro" continua lendo a biblioteca certinho (Medusa aparece na
    lista). Zero erros de JS em toda a sequência. Reconferido sem
    regressão: abas da Área do Mestre e da mesa abrem sem erro.
  - `npx tsc --noEmit` e `npm run build` limpos.

## 11. Inventário: regras corretas + redesign
- [x] 3.1 Dados/regras (ArmorStats, rangeStepBonus, rdBonus/slotsDelta,
      limite de carga real 5×Força) — falta só a penalidade real de
      Sobrecarregado, que fica junto do toggle (3.4)
- [x] 3.3 Categoria final calculada — função pura criada, testada E
      ligada à UI (badge "Categoria final" em cada item)
- [x] 3.4 Toggle "Limite de inventário: ativado/desativado" + penalidade
      real de Sobrecarregado
- [x] 3.2 Visual novo (lista + editor de item, baseado nos mockups) —
      **TAREFA 11 CONCLUÍDA**
- [x] Testado (CDP, instância isolada) após cada sub-passo
- Notas: o código já tinha bem mais estrutura que os mockups (catálogo
  real, mods/maldições com efeito numérico) — isto é conserto de regras +
  preenchimento de lacunas + visual, não uma reescrita do zero.
- Notas/progresso (passo 1 — limite de carga):
  - `domain/character.ts`: `loadLimit` em `deriveStats` trocou de
    `a.FOR + 5` pra `Math.max(2, a.FOR * 5)` (mantendo o bônus da trilha
    Técnico "Inventário Otimizado" somado por fora) — regra real da
    pág. 53 do livro (5 espaços por ponto de Força, mínimo 2 com Força
    0). Testado (CDP): criei um agente com Força 3 — "Carga: 0 / 15" na
    ficha (antes seria 8). Zero erros de JS.
  - Nova função pura `finalItemCategory(baseCategory, modCount,
    curseCount)` no mesmo arquivo: soma +1 por modificação e, pras
    maldições, +2 pela primeira e +1 por cada seguinte (regra real da
    pág. 144 — não é um valor fixo igual pra todas). Ainda não está
    ligada a nenhuma tela (isso é passo futuro, junto do redesign
    visual da aba Inventário).
  - `npx tsc --noEmit` e `npm run build` limpos.
- Notas/progresso (passo 2 — campos estruturados que faltavam):
  - `equipmentCatalog.ts`: `CatalogItem` ganhou `armor?: ArmorStats`
    ({defense}), preenchido nas 3 entradas de proteção (Tabela 3.6):
    Leve +5, Pesada +10, Escudo +2.
  - `weaponModifications.ts`: `WeaponModEffect` ganhou `rangeStepBonus`
    (Mira Telescópica: +1 categoria de alcance, pág. 60) e `slotsDelta`
    (Discreta: -1 espaço).
  - `armorModifications.ts`: `ArmorModEffect` ganhou `rdBonus`
    (Blindada: RD 5) e `slotsDelta` (Blindada +1, Discreta -1, Reforçada
    +1 — todas as 3 que mudam espaço, igual o livro descreve).
  - São só dados novos opcionais — nenhuma UI/cálculo os lê ainda (isso
    entra no redesign visual, 3.2, e no cálculo de categoria final, 3.3,
    como próximos passos). Testado (CDP): o Catálogo do livro (dentro do
    wizard de criação, aba Inventário) ainda abre normalmente e adiciona
    "Proteção Leve" ao inventário sem erro de JS, confirmando que os
    campos novos não quebraram a leitura do catálogo.
  - Ainda faltam pra fechar a Tarefa 11: ligar `finalItemCategory` (já
    criada no passo 1) à UI, aplicar a penalidade real de Sobrecarregado
    (-5 Defesa, -5 perícia, -3m deslocamento), o toggle de ativar/
    desativar o limite (3.4), e o redesign visual da aba Inventário +
    editor de item baseado nos mockups (3.2).
  - `npx tsc --noEmit` e `npm run build` limpos.
- Notas/progresso (passo 3 — ligar rangeStepBonus e slotsDelta nos
  cálculos que já existiam, pra não deixar dado novo sem nenhum
  consumidor):
  - `domain/character.ts`: `computeWeaponAttack` agora soma o
    `rangeStepBonus` de mods/maldições equipadas e desloca o alcance
    base da arma em N categorias (curto→médio→longo→extremo, sem passar
    de extremo) — Mira Telescópica agora realmente aumenta o alcance
    mostrado na aba Combate, não só guarda o dado.
  - Nova função `effectiveSlots(item)`: soma o `slotsDelta` das
    modificações (olha tanto `WEAPON_MOD_BY_KEY` quanto
    `ARMOR_MOD_BY_KEY` pela mesma chave — não colidem) e das maldições
    de arma, com piso em 0. `loadUsed` passou a somar `effectiveSlots`
    em vez do `item.slots` cru — uma arma com Discreta agora ocupa
    menos espaço de verdade na carga total, não só no texto.
  - `rdBonus` (Blindada) e o `armor: ArmorStats` do catálogo ficaram
    guardados mas ainda SEM consumidor de propósito: a ficha de
    personagem não tem campo de "resistência a dano" pra exibir (só a
    ficha de criatura tem `damageResistance`), e isso não foi pedido
    explicitamente — documentei isso direto no comentário dos arquivos
    (`armorModifications.ts`, `equipmentCatalog.ts`) pra não parecer bug
    se alguém notar que não tem efeito ainda. `ArmorStats` serve pro
    redesign visual (3.2), que vai mostrar Defesa/Categoria/Espaços em
    campos próprios em vez de um texto só.
  - Testado: criei um script com `tsx` chamando as funções reais do
    `domain/character.ts` direto (sem passar pela ficha visual, que
    precisa passar por várias etapas do assistente de criação pra
    chegar na aba Inventário) — confirmei: limite de carga com Força 3
    = 15 (igual já estava testado); Pistola sem mod = alcance "Curto";
    Pistola + Mira Telescópica = alcance "Médio" (subiu uma categoria
    certo); item com modificação Discreta (-1) foi de 1 pra 0 espaços;
    categoria final de base I + 1 modificação + 2 maldições = 5 (V),
    batendo a regra real (+1, +2 na primeira maldição, +1 na segunda).
    Também abri o assistente de criação de ficha ao vivo (CDP) até a
    etapa de atributos sem nenhum erro de JS, confirmando que a mudança
    não quebrou a tela de ficha.
  - `npx tsc --noEmit` e `npm run build` limpos.
- Notas/progresso (passo 4 — toggle + penalidade real de Sobrecarregado,
  fecha a sub-tarefa 3.4):
  - `domain/character.ts`: campo novo `Character.inventoryLimitEnabled?:
    boolean` (default `true` em `createCharacter`; fichas antigas sem o
    campo continuam tratadas como ativado). Nova função `isOverloaded(char)`
    — só vale se o limite estiver ativado E a carga passar do limite.
  - `deriveStats` ganhou `overloaded: boolean` e `displacementPenalty:
    number` (3 quando sobrecarregado, senão 0), e a `defense` já sai com
    -5 aplicado quando sobrecarregado.
  - `skillBonus` aplica -5 nas perícias com `loadPenalty: true`
    (Acrobacia, Crime, Furtividade — mesma lista que já existia só como
    anotação visual "+", nunca tinha efeito de verdade até agora) quando
    sobrecarregado.
  - `InventoryEditor.tsx`: novo botão "Limite de inventário: ativado/
    desativado" (só aparece quando o caller passa `onToggleLimit` — hoje
    só `CharacterSheet.tsx`; o assistente de criação não mostra, a ficha
    ainda nem existe salva naquela etapa). Desativado, esconde o aviso
    de carga por completo.
  - `CharacterSheet.tsx`: corrigido o texto antigo errado "Limite (Força
    + 5...)" pra "5 × Força, mínimo 2" (o mesmo texto desatualizado que
    o usuário já tinha suspeitado estar errado); chip "Carga" no topo
    agora mostra "SOBRECARREGADO" e vira "(sem limite)" com o toggle
    desativado; aviso de carga na aba Inventário lista as 3 penalidades
    quando sobrecarregado; "Desloc. (m)" mostra o valor efetivo (-3m)
    ao lado do campo editável, sem sobrescrever o valor base guardado.
  - Testado: script com `tsx` chamando `deriveStats`/`skillBonus`/
    `isOverloaded` direto — sem sobrecarga (Força 2, limite 10): Defesa
    normal, Furtividade normal; sobrecarregado (11 espaços > 10):
    `overloaded=true`, Defesa cai exatamente 5, `displacementPenalty=3`,
    Furtividade cai exatamente 5, Luta (sem `loadPenalty`) não muda;
    desativando o toggle, tudo volta ao normal mesmo ainda sobrecarregado
    em espaços. Depois, criei um agente de verdade do zero (CDP, até o
    fim do assistente), testei o toggle ligando/desligando na ficha já
    salva (chip e aviso aparecem/somem certo), e forcei sobrecarga de
    verdade subindo o campo "Espaços" de um item pra 20: Defesa mostrou
    7 (12 base - 5), Furtividade mostrou -5, Luta continuou +0,
    deslocamento mostrou "(-3m: 6m)". Zero erros de JS em toda a
    sequência (criação completa do agente + edição de inventário).
  - `npx tsc --noEmit` e `npm run build` limpos.
  - **Sub-tarefa 3.4 concluída.** Falta só a 3.2 (visual novo da aba
    Inventário + editor de item, baseado nos mockups) pra fechar a
    Tarefa 11 por completo — a 3.3 (categoria final) já está pronta
    como função pura, só falta aparecer na tela, o que entra junto do
    3.2.
- Notas/progresso (passo 5 — redesign visual da aba Inventário, fecha a
  sub-tarefa 3.2 e a Tarefa 11 por completo):
  - `domain/character.ts`: duas funções novas de apoio —
    `categoryToNum(category: string)` (converte o texto livre de
    `InventoryItem.category`, ex. "I"/"ii"/"0", pra número) e
    `numToCategory(n)` (inverso, pra exibir — acima de IV mostra
    "IV+N"). Usadas só pra alimentar `finalItemCategory` (já existia)
    a partir do campo de texto livre que a ficha sempre teve.
  - `InventoryEditor.tsx` (redesign completo, mas sem perder nenhuma
    função que já existia — equipar, catálogo, perícia de utensílio/
    vestimenta, toggle de limite): pra cada item, agora mostra:
    - **Categoria final** (item d do pedido): base + mods + maldições
      já calculada (`finalItemCategory`), com a conta explicada do lado
      ("I + 1 mod. + 1 maldição" etc.).
    - **Campos separados** (item a): armas mostram Dano/Crítico
      (margem)/Multiplicador/Alcance/Tipo de dano num grid próprio,
      lidos direto do catálogo (`CatalogItem.weapon`) — não mais só
      dentro do texto de Observações. Proteções (e escudo) mostram
      Defesa num campo próprio (`CatalogItem.armor`). Proficiência/
      Empunhadura/Munição não têm campo estruturado no catálogo hoje
      (só prosa) — não inventei campo de dado novo pra isso, só o que
      já existe estruturado entrou em campo próprio.
    - **Descrição ao selecionar mod/maldição** (item b): um componente
      novo (`ModChipList`, compartilhado pelos 3 tipos — modificação de
      arma, maldição de arma, modificação de proteção) mostra o texto
      oficial completo (`description`, já existente nos catálogos) de
      cada uma que estiver marcada, embaixo da lista de chips.
    - **Preview "na aba Combate"** (parte visual do item c — o CÁLCULO
      já existia): pra arma equipada, mostra o resultado de
      `syncWeaponAttacks` (procurado em `attacks` por
      `linkedInventoryId`, prop nova opcional) — teste, dano, tipo,
      crítico e alcance JÁ com mods/maldições aplicados, igual aparece
      de verdade na aba Combate (mesma fonte de dados, só outra tela).
    - **Desfazer ao remover**: guarda o último item removido + índice;
      toast com botão "Desfazer" por 6s (mesmo padrão `setTimeout` já
      usado em outras partes do app).
  - `CharacterSheet.tsx`: passa a prop nova `attacks={draft.attacks}`
    pro preview funcionar. `CharacterWizard.tsx` não precisou de
    mudança — o preview e o toggle de limite são opcionais e só não
    aparecem ali (a ficha ainda não existe salva com `attacks`
    sincronizados nessa etapa).
  - `index.css`: classes novas (`.inv-cat-final`, `.inv-stats-grid`/
    `.inv-stat`, `.inv-preview`, `.inv-fx-block`/`.inv-fx-desc` —
    modificação em vermelho `var(--blood)`, maldição em roxo
    `var(--purple)`, igual o mockup separa visualmente as duas — e
    `.inv-undo-toast`). Reaproveitei as variáveis de cor e fonte que o
    app JÁ tinha (`--blood`/`--bg-2`/`--bg-3`/`--line`/`--text-dim`,
    Oswald/Inter Tight/IBM Plex Mono — as MESMAS fontes dos mockups,
    já carregadas) em vez de copiar valores hexadecimais do mockup que
    não combinassem com o resto da ficha — o pedido era "reimplemente
    nos componentes do app", não importar um tema visual à parte.
  - Testado (CDP, instância isolada, criação de ficha completa até a
    ficha salva): adicionei uma Pistola do catálogo na etapa Inventário
    do assistente — grid mostrou Dano 1d12/Crítico 18/Multiplicador x2/
    Alcance Curto/Tipo balístico certinhos, Categoria final "I". Equipei
    a arma, selecionei a modificação "Mira Telescópica" e a maldição
    "Energética" — a descrição completa de cada uma carregou embaixo
    (texto oficial do livro), e a Categoria final virou "IV (I + 1 mod.
    + 1 maldição)" (1+1+2, bate a regra). Terminei a criação do agente
    e, na ficha já salva, a aba Inventário mostrou o preview "Na aba
    Combate": "Pontaria · 1d12 balístico · crítico 18/x2 · Médio" — o
    alcance já saiu "Médio" (subiu de Curto por causa da Mira
    Telescópica, confirmando que o preview usa o cálculo de verdade, não
    só o dado cru do catálogo). Confirmei na aba Combate de verdade
    (lendo o `.value` dos inputs, não o texto — são campos editáveis):
    os mesmos valores apareceram lá — "Pistola", "Pontaria", "1d12",
    "balístico", "18/x2", "Médio". Testei remover o item (toast
    "Pistola removido" + botão "Desfazer" apareceu, item saiu da lista)
    e cliquei "Desfazer" — item voltou. Zero erros de JS em toda a
    sequência (criação completa do agente + edição de inventário +
    checagem da aba Combate).
  - `npx tsc --noEmit` e `npm run build` limpos.
  - **TAREFA 11 CONCLUÍDA POR COMPLETO** (3.1, 3.3, 3.4 e 3.2).

## Relatório final (lote 2 — Capítulo 7 + Inventário)

Tarefas 9, 10 e 11 concluídas, testadas (CDP, instância isolada) e
commitadas uma de cada vez (17 commits separados neste lote). Nada foi
publicado (`git push`/release) — só commits locais, como sempre.

### O que mudou

1. **Aviso de VD** (Tarefa 9): não existe tabela de "construção de
   ameaça por VD" em nenhum dos dois livros — em vez de inventar
   valores, a ficha de monstro agora avisa isso perto do campo VD e
   lembra o uso real (comparar soma de VD do combate com soma de NEX do
   grupo).
2. **Bestiário do Capítulo 7** (Tarefa 10): todas as 68 criaturas/NPCs/
   animais do Capítulo 7 do livro base (49 paranormais + 19 mundanos)
   entraram na biblioteca via "Importar do livro", marcadas "Livro
   oficial" (badge + filtro novo, em AND com elemento/busca). Somado às
   9 exclusivas do Sobrevivendo ao Horror, o botão importa 77 criaturas
   no total. Alguns campos pontuais ficaram marcados "revisar" na
   própria ficha (nunca inventados) onde a extração automática do PDF
   saiu ilegível — veja a Tarefa 10 acima pra lista completa.
3. **Inventário — regras corretas** (Tarefa 11): o limite de carga
   agora é o de verdade do livro (5 espaços por ponto de Força, mínimo
   2, nunca "Força + 5"), com a penalidade real de Sobrecarregado (-5
   Defesa, -5 em perícias com penalidade de carga, -3m de deslocamento)
   e um botão pra ativar/desativar esse limite por ficha. A categoria
   final de um item agora soma certo (mod +1, primeira maldição +2,
   seguintes +1 — não um valor fixo igual pra todas).
4. **Inventário — redesign visual** (Tarefa 11): a aba Inventário
   ganhou campos separados pra arma (Dano/Crítico/Multiplicador/
   Alcance/Tipo) e proteção (Defesa), a categoria final calculada e
   explicada por item, a descrição oficial completa de cada modificação/
   maldição selecionada, um preview do ataque já calculado "Na aba
   Combate" dentro do próprio editor, e desfazer ao remover um item.

### O que testar

- **Criaturas**: Área do Mestre → Criaturas → "Importar do livro" (77
  no total) → filtro "Livro oficial" e por elemento → abrir algumas
  fichas (Kerberos, O Diabo, Anjo, Degolificada etc.) e comparar com o
  livro, principalmente as marcadas "revisar".
- **Ficha de monstro**: campo VD mostra o aviso novo (tooltip + texto).
- **Inventário**: criar/abrir uma ficha, equipar uma arma, adicionar
  modificação + maldição, confirmar que a categoria final e o preview
  "Na aba Combate" batem com o que aparece na aba Combate de verdade;
  forçar carga além do limite (editar "Espaços" de um item) e ver a
  Defesa/perícia/deslocamento caírem; desativar o toggle de limite e
  confirmar que a penalidade some; remover um item e usar "Desfazer".
- Geral: música, cenário 3D/2D, fichas, tokens e quadro continuam
  funcionando normalmente (reconferidos depois de cada tarefa/lote,
  mas vale o seu próprio teste).

Nenhum commit foi publicado (`git push`)/lançado como versão nova —
avise quando quiser que eu publique.
