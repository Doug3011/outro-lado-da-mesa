# O Outro Lado da Mesa — Tabletop de Ordem Paranormal

> Nome anterior do projeto: "Outro Lado". Caminhos internos (pasta de save em
> `%APPDATA%\OutroLado\`, nome do pacote npm, chaves de `localStorage`) continuam
> com o nome antigo de propósito, pra não perder dados salvos de versões
> anteriores.

Mesa virtual para jogar **Ordem Paranormal RPG** com os amigos pelo navegador:
rolagem de dados no sistema da Ordem, fichas de personagem completas e um mapa
tático com grid e tokens — tudo sincronizado em tempo real.

## Recursos

- **Rolador de dados de Ordem**: rola `Nd20` pelo valor do atributo, pega o maior,
  soma o treino (Destreinado/Treinado/Veterano/Expert) e bônus. Atributo 0 rola
  `2d20` e pega o menor. Mostra crítico (20 natural), desastre (1) e sucesso/falha
  contra a DT.
- **Rolagem livre** com expressões: `2d6+3`, `4d20kh1`, `1d100`, etc.
- **Ficha de personagem**: atributos, NEX, PV/PE/Sanidade, 28 perícias com grau de
  treino, defesa/deslocamento/proteção, ataques, inventário com espaços, rituais
  (círculo + elemento) e condições. Botão de rolar direto de cada perícia.
- **Menu principal e biblioteca de fichas** (fora de qualquer mesa): antes de entrar
  numa mesa, o jogador tem um hub com três opções — **Meu Perfil** (página em cartão
  bordado, tema dourado: foto do player em polaroid com fita, nome, idade, aniversário,
  e as perguntas pro mestre te conhecer — personalidade, tipo de personagem que gosta,
  experiência, expectativas, limites de conteúdo — em formato pergunta/resposta; as
  fichas já criadas aparecem do lado como polaroids com foto e nome; botão "Salvar
  Perfil" em forma de fita/pergaminho. Tudo opcional, salvo só neste computador),
  **Minhas Fichas** (página cheia estilo cartaz, vermelha — biblioteca pessoal de
  personagens, independente de mesa; cada ficha é um card com retrato, classe/NEX,
  data e botão "Acessar Ficha" — é aqui que se cria e edita ficha agora) e
  **Entrar numa mesa**. Ao entrar como
  jogador, escolhe qual ficha da biblioteca leva pra aquela mesa (ou nenhuma, só
  pra observar/rolar dados soltos); o mestre vê a ficha vinculada e o perfil de
  cada jogador (aba "Perfis", só do mestre) assim que ele entra. **A mesa em si
  não cria mais ficha** — é só pra jogar; pra trocar de ficha durante o jogo, o
  botão "trocar ficha" na aba Ficha volta pra biblioteca sem precisar sair da mesa.
- **Assistente de criação** (estilo Cris, agora dentro de Minhas Fichas): conceito →
  atributos (point-buy, soma 9, máx 3, um pode ir a 0) → classe → perícias →
  revisão. As 26 **origens** do livro básico já preenchem automaticamente as 2
  perícias treinadas e o poder de origem (Tabela 1.1). Orçamento de perícias:
  `base da classe (3/7/5) + Intelecto + 2`.
- **Compêndio de rituais** (1º ao 4º círculo): na aba Rituais da ficha, "adicionar do
  compêndio" com filtro por nome/elemento — preenche nome, círculo, elemento e um
  resumo do efeito. Custo/alcance/resistência ficam para você preencher pelo livro.
  Vagas de ritual mostradas (limite = Intelecto); rituais ganhos por classe/trilha
  podem ser marcados como "não conta na vaga".
- **Trilhas**: escolhida na criação a partir de NEX 10% (ou depois, na ficha) — os 4
  poderes de cada uma das 15 trilhas (5 por classe) aparecem com resumo, e os que já
  desbloqueiam pelo NEX 40/65/99 entram sozinhos nas Habilidades conforme o NEX sobe.
  Alguns bônus numéricos de trilha já entram sozinhos na conta: PV (Casca Grossa),
  Iniciativa (Iniciativa Aprimorada) e carga (Inventário Otimizado).
- **Aba Progressão**: mostra o que falta escolher pro NEX atual — **Poder de Classe**
  (NEX 15/30/45/60/75/90, com as listas completas de Combatente/Especialista/Ocultista),
  **Transcender** (escolhe um dos 22 Poderes Paranormais do livro — Conhecimento, Energia,
  Morte ou Sangue — e já desconta a Sanidade daquele NEX automaticamente), **Versatilidade**
  (NEX 50%, poder de outra trilha da mesma classe), **Aumento de Atributo** (NEX
  20/50/80/95) e **Grau de Treinamento** (NEX 35/70). Cada escolha vira uma Habilidade
  na ficha e aplica o efeito mecânico simples que ela concede (treino de perícia, etc.).
  Um badge no nome da aba mostra quantas escolhas estão pendentes.
- **Regra opcional de Pontos de Determinação (PD)**: alterna na aba Geral da ficha
  entre a regra padrão (PE + Sanidade separados) e a regra alternativa do
  "Sobrevivendo ao Horror" que funde os dois num só medidor (PD); a barra de
  Esforço vira PD e a de Sanidade some enquanto ligada.
- **Cálculo automático da ficha**: PV/PE/Sanidade, Defesa (10+AGI), carga (FOR+5) e
  o orçamento de perícias recalculam sozinhos pelas regras; pode desligar.
- **Notificações de progressão**: ao subir de NEX, o dono do personagem (e o mestre)
  recebem um aviso mostrando o que ganharam — trilha, poder de classe, aumento de
  atributo, grau de treinamento — sem precisar decorar a tabela. Fica um histórico
  na aba "Notificações" (jogador vê só as do próprio personagem; mestre vê todas).
- **Histórico de Mesas** (menu principal): lista as mesas que você já jogou neste
  computador (como mestre ou jogador), com um botão pra entrar de novo direto.
- **Desafio Diário** (menu principal): de 3 em 3 horas, role 3d20 — revelados um de
  cada vez, com suspense — e tira um 20 natural em pelo menos um pra ganhar. Guarda
  vitórias/tentativas. Página cheia, estilo cartaz, em tons de **roxo** (tema do
  elemento Energia, que mexe com sorte/acaso na Ordem Paranormal). Cada vitória
  desbloqueia uma música nova pro menu (ver abaixo).
- **Trilha do menu com faixas desbloqueáveis**: além da trilha padrão, existe um
  conjunto de músicas extras (`public/menu-tracks/`) que só ficam disponíveis
  ganhando o Desafio Diário — uma por vitória, em ordem fixa. Em "Músicas" (menu
  principal), a seção "Música do menu" mostra quais já foram desbloqueadas e deixa
  escolher qual toca em loop, com botão de pausar/tocar; as bloqueadas aparecem
  como "🔒 ???". Progresso salvo localmente, independente de mesa.
- **Menu inicial com vídeo de fundo**: a tela de abertura (`public/mesa-bg.mp4`, mudo
  e em loop) cobre a tela inteira, com as opções em texto simples do lado esquerdo
  (sem caixas) — pra trocar o vídeo, só substituir esse arquivo e buildar de novo.
- **Mapa tático**: grid configurável, **cenários** (vários mapas por sala, o mestre
  alterna), **importação de imagens** de qualquer formato para fundo e token
  (redimensionadas automaticamente), tokens arrastáveis com barra de PV, zoom
  (botões ou `Ctrl + scroll` no mapa), **névoa de guerra** (o mestre esconde/revela
  células — jogadores não veem o que está encoberto, nem os tokens ali dentro) e
  régua de medição em quadrados e metros (1,5 m por quadrado). Token com imagem
  mostra ela como foi importada (sem recortar em círculo nem borda colorida) e
  pode ser girado (↺/↻ no editor do token) pra simular virar de lado. Com um token
  selecionado, atalhos de teclado: **←/→** gira 15° por vez, **↑/↓** ajusta o
  tamanho **pixel a pixel** (independente dos múltiplos de célula do seletor
  "Tamanho" — pra tokens que precisam ser só um pouquinho maiores/menores que os
  outros). Os atalhos são ignorados enquanto o foco estiver num campo de texto.
- **Tempo real**: histórico de rolagens e presença dos participantes. Compartilhe
  o link `/sala/CODIGO` com a mesa. Um botão "← Menu Inicial" na barra do topo
  leva direto de volta pro menu principal.
- **Tela cheia**: botão flutuante (canto inferior direito) ou tecla F11, em
  qualquer tela do app (menu ou mesa).
- **Trilho de ícones**: a lateral (Dados/Ficha/Histórico/Notificações, +Perfis
  pro mestre) usa um trilho vertical de ícones em vez de abas de texto — nunca
  quebra linha, e o sino de Notificações mostra um selo com a contagem do que
  ainda não foi visto. (Ícones são emoji por enquanto; arte própria — símbolos
  rituais da Ordem — é o próximo passo de identidade visual.) Bestiário e Chat
  foram removidos do aplicativo.
- **Cards de ficha com retrato**: em "Minhas Fichas" (menu principal) e no
  seletor de ficha dentro da mesa, cada ficha aparece como um card com o
  retrato do personagem, nome, classe/NEX e data de criação — em vez de um
  dropdown de texto.
- **Ficha em papel**: dentro de qualquer ficha (biblioteca ou mesa), o botão
  "📄 Ver ficha em papel" abre uma visão organizada estilo a folha oficial de
  agente — roda de atributos, tabela de perícias, caixas de PV/PE/Sanidade,
  escudo de Defesa e tabela de ataques. Tem botão de imprimir.
- **Abas de ficha do mestre**: na aba Ficha, o mestre abre a ficha de cada
  jogador vinculado numa aba estilo navegador (clicando "Abrir ficha" no
  card) — abre direto em papel, e a aba continua aberta mesmo trocando pra
  outras abas da mesa. Dá pra ter várias fichas abertas ao mesmo tempo e
  alternar entre elas, com "✕" pra fechar cada uma.
- **Trilha sonora do menu**: `public/menu-music.mp3` toca em loop, bem baixo
  (volume ambiente, não abafa nada), em todas as telas do menu principal —
  para sozinha ao entrar numa mesa. Pra trocar a música, só substituir esse
  arquivo e buildar de novo. Botão bem discreto no canto inferior esquerdo do
  hub (só um ícone de alto-falante, quase invisível em repouso) revela um
  controle de volume ao passar o mouse; o valor escolhido fica salvo.
- **Animação de rolagem**: toda rolagem (de qualquer participante) mostra um
  d20 "rolando" no canto inferior esquerdo por um instante, com som
  (`public/dice.mp3`), antes de assentar no resultado — dourado em crítico,
  cinza em falha crítica.
- **Músicas** (só no modo rede local): o mestre importa músicas do computador
  (vários arquivos de uma vez) e organiza em pastas — biblioteca fica salva
  na própria instalação (`%APPDATA%\OutroLado\music\`), disponível tanto no
  menu principal ("Músicas", pra gerenciar/pré-ouvir fora de mesa) quanto
  dentro de qualquer mesa que o mestre crie depois. Na aba Músicas da mesa, o
  mestre escolhe uma faixa e ela toca em tempo real pra todo mundo conectado
  (play/pause/parar, alternar faixa, e "Loop" ou "Próxima" — repete a mesma
  faixa ou avança sozinho pra próxima da pasta ao terminar); cada participante
  ajusta seu próprio volume, local, sem afetar os outros. Os arquivos são
  servidos pelo servidor local do mestre (com suporte a `Range`, pra tocar e
  buscar sem baixar tudo primeiro).
- **Sigilos piscando no menu**: de vez em quando (aleatório, ~3,5-11s), um
  sigilo pequeno (`public/sigils/`) aparece do nada em algum canto do vídeo
  de fundo, brilha rápido e some — o vídeo nunca para, é só um efeito por
  cima. `mix-blend-mode: screen` faz o fundo transparente dele se misturar
  natural com o vídeo escuro por trás.

## Rodando localmente

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173`. **Sem configuração de servidor**, o app roda em
*modo local*: sincroniza apenas entre abas do mesmo navegador (ótimo para testar).

## Modo online (jogar pela internet)

O tempo real usa o **Supabase Realtime** (canais de broadcast + presença).

1. Crie um projeto grátis em <https://supabase.com>.
2. Em **Project Settings → API**, copie a `Project URL` e a chave `anon public`.
3. Copie `.env.example` para `.env` e preencha:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
4. (Opcional, mas recomendado) No **SQL Editor** do Supabase, rode o conteúdo de
   [`schema.sql`](./schema.sql). Isso cria as tabelas `rooms`, `characters` e
   `tokens` para **persistir** fichas/tokens/mapa mesmo quando todos saem da sala.
   Sem isso, os dados vivem só no `localStorage` de quem está na sala e são
   ressincronizados entre os participantes conectados.
5. `npm run dev` de novo. O rodapé da home deve mostrar “Modo online”.

> As policies do `schema.sql` liberam acesso à chave `anon` (jogo entre amigos).
> Para algo mais fechado, adicione autenticação e troque as policies por regras
> com `auth.uid()`.

## Modo desktop (instalador / rede local / Radmin VPN)

O app roda como aplicativo Windows de verdade — **sem streaming de tela**: cada
jogador conecta seu próprio programa e move seu próprio boneco, o mestre só
controla o mapa/cenário. Nada de internet ou conta em lugar nenhum. É o jeito
recomendado pra jogar com amigos via **Radmin VPN**.

**Como funciona:**
1. Todos instalam o [Radmin VPN](https://www.radmin-vpn.com/) (grátis) e entram na
   mesma rede.
2. Todos instalam e abrem o **mesmo instalador do Outro Lado** (veja abaixo) —
   ele abre uma janela própria do app (não é o navegador) e um servidor local
   na porta `47300`.
3. Quem escolhe **Mestre** clica em "Hospedar mesa" — o app passa a anunciar a
   mesa na rede (broadcast UDP na porta `47310`, igual ao "Mundo de LAN" do
   Minecraft).
4. Quem escolhe **Jogador** vê a mesa aparecer sozinha na lista e entra com um
   clique (ou digita `host:porta` manualmente, caso a descoberta automática não
   funcione na rede de alguém).

**Se a mesa não aparecer pros jogadores:**
- Confirme que todos estão **conectados na mesma rede do Radmin VPN** (não só
  instalado — conectado).
- No primeiro uso, o **Firewall do Windows** costuma perguntar se permite o
  app na rede — tem que clicar em **Permitir acesso** (ideal marcar tanto "Rede
  privada" quanto "Rede pública", já que o adaptador do Radmin às vezes aparece
  como pública).
- Como último recurso, o mestre roda `ipconfig`, acha o IP do adaptador **Radmin
  VPN** (começa com `26.`) e passa `IP:47300` pro jogador digitar manualmente.

**Persistência:** a mesa fica salva em `%APPDATA%\OutroLado\save.json`, no
computador que hospeda — sobrevive a fechar/abrir o app e até a trocar de porta
ou IP. Cada evento (ficha, token, cenário, criatura) é gravado no servidor local
assim que acontece.

### Instalador (Electron + NSIS) — jeito recomendado

Gera um `Setup.exe` de verdade (ícone, atalho no menu Iniciar/área de trabalho,
desinstalador) em vez de um `.exe` avulso:

```powershell
powershell -File desktop\build-installer.ps1
```

Isso builda o frontend, copia pra dentro de `desktop\`, instala as dependências
do Electron (baixa o Electron na primeira vez — pode demorar) e empacota com o
`electron-builder`. O instalador final fica em `desktop\release\Outro Lado
Setup <versão>.exe` — é esse arquivo que se manda pros amigos instalarem.

O ícone atual (`desktop\build\icon.ico`) é um placeholder gerado por mim
(sigilo geométrico simples); troque por arte própria quando tiver.

> **Nota de bastidor:** na primeira vez que você (ou outra pessoa) gerar o
> instalador numa máquina nova, o `electron-builder` baixa uma ferramenta
> chamada `winCodeSign` — em algumas máquinas Windows sem "Modo de
> Desenvolvedor" ativado, a extração dela falha (arquivo `.dylib` do macOS que
> usa link simbólico, sem ver com Windows sem privilégio). Se isso acontecer,
> ative o **Modo de Desenvolvedor** em Configurações → Privacidade e segurança
> → Para desenvolvedores, e rode o build de novo.

## Deploy

Qualquer host de site estático serve (Vercel, Netlify, Cloudflare Pages, GitHub
Pages). Build:

```bash
npm run build      # gera dist/
npm run preview     # confere o build localmente
```

Defina `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` como variáveis de ambiente
no painel do host. Na Vercel/Netlify, configure o *rewrite* de todas as rotas
para `index.html` (SPA) — a Vercel já faz isso para projetos Vite; na Netlify,
adicione um `_redirects` com `/*  /index.html  200`.

## Stack

React 18 + TypeScript + Vite · Zustand (estado) · Supabase JS (realtime) ·
React Router.

Pastas principais:

| Caminho | O quê |
| --- | --- |
| `src/data/ordem.ts` | Tabelas do sistema: atributos, perícias, classes, elementos, condições. |
| `src/domain/dice.ts` | Motor de rolagem (teste de Ordem + parser de expressões). |
| `src/domain/character.ts` | Modelo da ficha e cálculos derivados. |
| `src/lib/realtime.ts` | Abstração de sala: Supabase broadcast ou `BroadcastChannel` local. |
| `src/store/useTableStore.ts` | Estado da mesa + sincronização + cache. |
| `src/components/` | `DiceRoller`, `RollLog`, `CharacterSheet`, `CharacterCard`, `BattleMap`. |

## Aviso

Projeto de fã, sem fins lucrativos. *Ordem Paranormal* é criação de Rafael Lange
(Cellbit) e da Jambô Editora. Este app não inclui textos de regras protegidos —
apenas nomes de atributos/perícias para organizar a mesa.
