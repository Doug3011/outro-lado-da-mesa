// Poderes Gerais — suplemento "Sobrevivendo ao Horror" de Ordem Paranormal
// RPG (Tabela 2.3 "Poderes Gerais", págs. 33-36). Diferente dos poderes de
// origem/classe/paranormais, estes poderes não exigem elemento e qualquer
// personagem pode comprá-los ao cumprir o pré-requisito (quando houver).
// Texto completo lido e conferido direto do PDF nesta leva — os summaries
// abaixo são paráfrase do texto real (antes eram um resumo genérico a
// partir só do nome, sem mecânica numérica).

export interface GeneralPowerDef {
  key: string;
  name: string;
  prereq: string; // ex.: 'Agi 2', 'Treinado na perícia', '—' quando não há
  summary: string; // resumo curto do texto real do livro
}

export const GENERAL_POWERS: GeneralPowerDef[] = [
  {
    key: 'acrobatico',
    name: 'Acrobático',
    prereq: 'Agi 2',
    summary:
      'Treina (ou +2 se já treinado) em Acrobacia; terreno difícil não reduz seu deslocamento nem impede investidas.',
  },
  {
    key: 'as-do-volante',
    name: 'Ás do Volante',
    prereq: 'Agi 2',
    summary:
      'Treina (ou +2) em Pilotagem; 1x/rodada, testa Pilotagem pra evitar dano sofrido num veículo que está pilotando.',
  },
  {
    key: 'atletico',
    name: 'Atlético',
    prereq: 'For 2',
    summary: 'Treina (ou +2) em Atletismo; +3m de deslocamento.',
  },
  {
    key: 'atraente',
    name: 'Atraente',
    prereq: 'Pre 2',
    summary: '+5 em Artes, Diplomacia, Enganação e Intimidação contra quem possa se sentir fisicamente atraído por você.',
  },
  {
    key: 'dedos-ageis',
    name: 'Dedos Ágeis',
    prereq: 'Agi 2',
    summary:
      'Treina (ou +2) em Crime; arromba como ação padrão, furta como ação livre (1x/rodada) e sabota como ação completa.',
  },
  {
    key: 'detector-mentiras',
    name: 'Detector de Mentiras',
    prereq: 'Pre 2',
    summary: 'Treina (ou +2) em Intuição; outros sofrem –10 em Enganação pra mentir pra você.',
  },
  {
    key: 'especialista-emergencias',
    name: 'Especialista em Emergências',
    prereq: 'Int 2',
    summary:
      'Treina (ou +2) em Medicina; aplica cicatrizantes/medicamentos como ação de movimento, e 1x/rodada como ação livre.',
  },
  {
    key: 'estigmado',
    name: 'Estigmado',
    prereq: '—',
    summary: 'Sempre que sofre dano mental de efeitos de medo, pode convertê-lo (1 pra 1) em perda de PV em vez disso.',
  },
  {
    key: 'foco-pericia',
    name: 'Foco em Perícia',
    prereq: 'Treinado na perícia',
    summary: 'Escolhe uma perícia (exceto Luta/Pontaria) já treinada e rola +O nela; repetível pra perícias diferentes.',
  },
  {
    key: 'inventario-organizado',
    name: 'Inventário Organizado',
    prereq: 'Int 2',
    summary: 'Soma Intelecto no limite de espaços que pode carregar; itens de meio espaço passam a ocupar 1/4 de espaço.',
  },
  {
    key: 'informado',
    name: 'Informado',
    prereq: 'Int 2',
    summary:
      'Treina (ou +2) em Atualidades; pode usar Atualidades no lugar de outra perícia pra testes de informação, com aprovação do mestre.',
  },
  {
    key: 'interrogador',
    name: 'Interrogador',
    prereq: 'For 2',
    summary: 'Treina (ou +2) em Intimidação; pode coagir como ação padrão, 1x/cena contra a mesma pessoa.',
  },
  {
    key: 'mentiroso-nato',
    name: 'Mentiroso Nato',
    prereq: 'Pre 2',
    summary: 'Treina (ou +2) em Enganação; penalidade por mentiras muito implausíveis cai pra –O.',
  },
  {
    key: 'observador',
    name: 'Observador',
    prereq: 'Int 2',
    summary: 'Treina (ou +2) em Investigação; soma Intelecto em Intuição.',
  },
  {
    key: 'pai-de-pet',
    name: 'Pai de Pet',
    prereq: 'Pre 2',
    summary: 'Treina (ou +2) em Adestramento; tem um animal de estimação aliado que dá +2 em duas perícias à escolha.',
  },
  {
    key: 'palavras-devocao',
    name: 'Palavras de Devoção',
    prereq: 'Pre 2',
    summary:
      'Treina (ou +2) em Religião; 1x/cena, gasta 3 PE + ação completa numa oração que dá resistência a dano mental 5 a quem participar, até o fim da cena.',
  },
  {
    key: 'parceiro',
    name: 'Parceiro',
    prereq: 'Treinado em Diplomacia, NEX 30%',
    summary: 'Tem um parceiro (aliado de um tipo à escolha) que o acompanha e se arrisca pra ajudar nas missões.',
  },
  {
    key: 'pensamento-tatico',
    name: 'Pensamento Tático',
    prereq: 'Int 2',
    summary:
      'Treina (ou +2) em Tática; passando em Tática pra analisar terreno, você e aliados próximos ganham ação de movimento extra no 1º turno do próximo combate ali.',
  },
  {
    key: 'personalidade-esoterica',
    name: 'Personalidade Esotérica',
    prereq: 'Int 2',
    summary: '+3 PE; treina (ou +2 se já treinado) em Ocultismo.',
  },
  {
    key: 'persuasivo',
    name: 'Persuasivo',
    prereq: 'Pre 2',
    summary: 'Treina (ou +2) em Diplomacia; penalidade por pedir coisas custosas ou perigosas cai em –5.',
  },
  {
    key: 'pesquisador-cientifico',
    name: 'Pesquisador Científico',
    prereq: 'Int 2',
    summary: 'Treina (ou +2) em Ciências; pode usar Ciências no lugar de Ocultismo/Sobrevivência pra identificar criaturas/animais.',
  },
  {
    key: 'proativo',
    name: 'Proativo',
    prereq: 'Agi 2',
    summary: 'Treina (ou +2) em Iniciativa; tirando 19 ou 20 num dado de Iniciativa, ganha ação padrão extra no 1º turno.',
  },
  {
    key: 'provisoes-emergencia',
    name: 'Provisões de Emergência',
    prereq: '—',
    summary: 'Tem um esconderijo de emergência; 1x/missão, recupera equipamento equivalente à sua patente.',
  },
  {
    key: 'racionalidade-inflexivel',
    name: 'Racionalidade Inflexível',
    prereq: 'Int 3',
    summary: 'Usa Intelecto no lugar de Presença como atributo-chave de Vontade e pra calcular pontos de esforço.',
  },
  {
    key: 'rato-de-computador',
    name: 'Rato de Computador',
    prereq: 'Int 2',
    summary:
      'Treina (ou +2) em Tecnologia; hackeia/localiza arquivo/opera dispositivo como ação completa; 1x/cena de investigação, busca pista por Tecnologia sem gastar rodada.',
  },
  {
    key: 'resposta-rapida',
    name: 'Resposta Rápida',
    prereq: 'Agi 2',
    summary:
      'Treina (ou +2) em Reflexos; ao falhar em Percepção pra não ficar desprevenido, gasta 2 PE pra rolar de novo usando Reflexos.',
  },
  {
    key: 'talentoso',
    name: 'Talentoso',
    prereq: 'Pre 2',
    summary: 'Treina (ou +2) em Artes; testando Artes pra impressionar, o bônus de perícia sobe +1 a cada 5 pontos que passar da DT.',
  },
  {
    key: 'teimosia-obstinada',
    name: 'Teimosia Obstinada',
    prereq: 'Pre 2',
    summary:
      'Treina (ou +2) em Vontade; contra efeito que cause condição mental ou mude sua atitude, gasta 2 PE pra +5 no teste de Vontade.',
  },
  {
    key: 'tenacidade',
    name: 'Tenacidade',
    prereq: 'Vig 2',
    summary:
      'Treina (ou +2) em Fortitude; morrendo mas consciente (1+ PV), pode testar Fortitude como ação livre (DT sobe a cada teste na cena) pra sair de morrendo.',
  },
  {
    key: 'sentidos-aguçados',
    name: 'Sentidos Aguçados',
    prereq: 'Pre 2',
    summary:
      'Treina (ou +2) em Percepção; não fica desprevenido contra quem não pode ver, e rerola a chance de falha por camuflagem ao errar um ataque por causa dela.',
  },
  {
    key: 'sobrevivencialista',
    name: 'Sobrevivencialista',
    prereq: 'Int 2',
    summary:
      'Treina (ou +2) em Sobrevivência; +2 em testes pra resistir a efeitos de clima; terreno difícil natural não reduz deslocamento nem impede investidas.',
  },
  {
    key: 'sorrateiro',
    name: 'Sorrateiro',
    prereq: 'Agi 2',
    summary: 'Treina (ou +2) em Furtividade; sem penalidade por se mover normalmente furtivo, nem por seguir alguém sem esconderijo/movimento.',
  },
  {
    key: 'vitalidade-reforcada',
    name: 'Vitalidade Reforçada',
    prereq: 'Vig 2',
    summary: '+1 PV a cada 5% de NEX e +2 em Fortitude.',
  },
  {
    key: 'vontade-inabalavel',
    name: 'Vontade Inabalável',
    prereq: 'Pre 2',
    summary: '+1 PE a cada 10% de NEX e +2 em Vontade.',
  },
];

export const GENERAL_POWER_BY_KEY: Record<string, GeneralPowerDef> = Object.fromEntries(
  GENERAL_POWERS.map((p) => [p.key, p]),
);
