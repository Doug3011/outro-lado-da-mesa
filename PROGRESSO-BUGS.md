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
- [ ] Solução do Rabbit entendida
- [ ] Aplicada no tabletop (cenário 3D)
- [ ] Aplicada no tabletop (música)
- [ ] Reconexão automática confirmada
- Notas/meio do caminho:

## 3. Ficha de personagem — tela cheia de escolha de origem
- [ ] Implementado (lista + descrição/perícias/poder sem selecionar +
      "Escolher esta origem" + fechar sem escolher)
- [ ] Testado
- Notas/meio do caminho:

## 4. Vincular token à ficha — bug dos tokens salvos não aparecendo
- [ ] Causa raiz encontrada
- [ ] Corrigido (na criação E na ficha já criada)
- [ ] Testado
- Notas/meio do caminho:

## 5. Área do Mestre — design novo + Fichas de Monstros + remover Mapas
- [ ] Design novo aplicado na Área do Mestre (menu inicial)
- [ ] Botão "Mapas" removido (Cenário 2D/3D já cobrem)
- [ ] "Fichas de Monstros": biblioteca (criar/editar/apagar/listar) com
      filtro por elemento funcionando de verdade
- [ ] Design novo aplicado na ficha de monstro DENTRO da mesa
      (combate + criação)
- [ ] Testado
- Notas/meio do caminho:

## 6. Importar monstro da biblioteca pra mesa (botão "Importar monstro")
- [ ] Implementado (copia ficha + token se tiver, só mestre vê)
- [ ] Testado
- Notas/meio do caminho:

## 7. Importar ameaça pelo link do CRIS
- [x] Viabilidade testada (ver Investigação inicial) — **NÃO VIÁVEL**
- [x] Inviável confirmado: usuário avisado, nada adicionado (nenhuma
      alternativa) — ver relatório final
- Notas: SPA sem renderização no servidor, mesmo HTML em toda URL
  testada (`/`, `/robots.txt`, `/sitemap.xml`, `/ameacas`).

## Relatório final (preencher no fim)
- O que mudou:
- O que o usuário deve testar:
