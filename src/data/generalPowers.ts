// Poderes Gerais — suplemento "Sobrevivendo ao Horror" de Ordem Paranormal
// RPG (Tabela 2.3 "Poderes Gerais"). Diferente dos poderes de origem/classe/
// paranormais, estes poderes não exigem elemento e qualquer personagem pode
// comprá-los ao cumprir o pré-requisito (quando houver).
// Só temos nome + pré-requisito do livro (não a descrição mecânica completa)
// — summary é um resumo plausível baseado no nome, sem números/bônus
// inventados que não constam na fonte.

export interface GeneralPowerDef {
  key: string;
  name: string;
  prereq: string; // ex.: 'Agi 2', 'Treinado na perícia', '—' quando não há
  summary: string; // resumo curto do que o nome sugere, 1 frase — sem mecânica numérica inventada quando não souber
}

export const GENERAL_POWERS: GeneralPowerDef[] = [
  {
    key: 'acrobatico',
    name: 'Acrobático',
    prereq: 'Agi 2',
    summary: 'Melhora acrobacias e movimentos ágeis em combate.',
  },
  {
    key: 'as-do-volante',
    name: 'Ás do Volante',
    prereq: 'Agi 2',
    summary: 'Torna você excepcional ao pilotar veículos.',
  },
  {
    key: 'atletico',
    name: 'Atlético',
    prereq: 'For 2',
    summary: 'Melhora desempenho físico em testes de força e atletismo.',
  },
  {
    key: 'atraente',
    name: 'Atraente',
    prereq: 'Pre 2',
    summary: 'Dá vantagem em situações sociais pela aparência.',
  },
  {
    key: 'dedos-ageis',
    name: 'Dedos Ágeis',
    prereq: 'Agi 2',
    summary: 'Facilita tarefas manuais delicadas, como destravar ou manipular objetos pequenos.',
  },
  {
    key: 'detector-mentiras',
    name: 'Detector de Mentiras',
    prereq: 'Pre 2',
    summary: 'Ajuda a perceber quando alguém está mentindo.',
  },
  {
    key: 'especialista-emergencias',
    name: 'Especialista em Emergências',
    prereq: 'Int 2',
    summary: 'Melhora a reação em situações de emergência/primeiros socorros.',
  },
  {
    key: 'estigmado',
    name: 'Estigmado',
    prereq: '—',
    summary: 'Marca o personagem de alguma forma ligada ao paranormal, trazendo uma vantagem incomum.',
  },
  {
    key: 'foco-pericia',
    name: 'Foco em Perícia',
    prereq: 'Treinado na perícia',
    summary: 'Aprimora o desempenho numa perícia já treinada.',
  },
  {
    key: 'inventario-organizado',
    name: 'Inventário Organizado',
    prereq: 'Int 2',
    summary: 'Facilita encontrar e administrar itens carregados.',
  },
  {
    key: 'informado',
    name: 'Informado',
    prereq: 'Int 2',
    summary: 'Dá acesso a informações úteis com mais facilidade.',
  },
  {
    key: 'interrogador',
    name: 'Interrogador',
    prereq: 'For 2',
    summary: 'Melhora a capacidade de intimidar e extrair informações de alguém.',
  },
  {
    key: 'mentiroso-nato',
    name: 'Mentiroso Nato',
    prereq: 'Pre 2',
    summary: 'Torna enganações mais convincentes.',
  },
  {
    key: 'observador',
    name: 'Observador',
    prereq: 'Int 2',
    summary: 'Melhora a capacidade de notar detalhes do ambiente.',
  },
  {
    key: 'pai-de-pet',
    name: 'Pai de Pet',
    prereq: 'Pre 2',
    summary: 'Fortalece o vínculo e desempenho junto de um animal de estimação.',
  },
  {
    key: 'palavras-devocao',
    name: 'Palavras de Devoção',
    prereq: 'Pre 2',
    summary: 'Usa discurso religioso/inspirador para confortar ou motivar outros.',
  },
  {
    key: 'parceiro',
    name: 'Parceiro',
    prereq: 'Treinado em Diplomacia, NEX 30%',
    summary: 'Formaliza uma parceria próxima com outro personagem, trazendo benefícios mútuos.',
  },
  {
    key: 'pensamento-tatico',
    name: 'Pensamento Tático',
    prereq: 'Int 2',
    summary: 'Melhora a capacidade de planejar e agir taticamente.',
  },
  {
    key: 'personalidade-esoterica',
    name: 'Personalidade Esotérica',
    prereq: 'Int 2',
    summary: 'Dá vantagem ao lidar com temas e conhecimentos ocultos.',
  },
  {
    key: 'persuasivo',
    name: 'Persuasivo',
    prereq: 'Pre 2',
    summary: 'Melhora a capacidade de convencer outras pessoas.',
  },
  {
    key: 'pesquisador-cientifico',
    name: 'Pesquisador Científico',
    prereq: 'Int 2',
    summary: 'Melhora o desempenho em pesquisas e análises científicas.',
  },
  {
    key: 'proativo',
    name: 'Proativo',
    prereq: 'Agi 2',
    summary: 'Dá vantagem em agir rápido, antes dos outros.',
  },
  {
    key: 'provisoes-emergencia',
    name: 'Provisões de Emergência',
    prereq: '—',
    summary: 'Garante ter sempre à mão algum suprimento útil guardado para emergências.',
  },
  {
    key: 'racionalidade-inflexivel',
    name: 'Racionalidade Inflexível',
    prereq: 'Int 3',
    summary: 'Fortalece a resistência mental através da lógica e da razão.',
  },
  {
    key: 'rato-de-computador',
    name: 'Rato de Computador',
    prereq: 'Int 2',
    summary: 'Melhora o desempenho com computadores e tecnologia.',
  },
  {
    key: 'resposta-rapida',
    name: 'Resposta Rápida',
    prereq: 'Agi 2',
    summary: 'Melhora a capacidade de reagir rapidamente a situações inesperadas.',
  },
  {
    key: 'talentoso',
    name: 'Talentoso',
    prereq: 'Pre 2',
    summary: 'Dá um talento notável que chama atenção positiva.',
  },
  {
    key: 'teimosia-obstinada',
    name: 'Teimosia Obstinada',
    prereq: 'Pre 2',
    summary: 'Fortalece a resistência a ser convencido ou dominado por outros.',
  },
  {
    key: 'tenacidade',
    name: 'Tenacidade',
    prereq: 'Vig 2',
    summary: 'Melhora a resistência física e a capacidade de aguentar adversidades.',
  },
  {
    key: 'sentidos-aguçados',
    name: 'Sentidos Aguçados',
    prereq: 'Pre 2',
    summary: 'Aguça a percepção sensorial do personagem.',
  },
  {
    key: 'sobrevivencialista',
    name: 'Sobrevivencialista',
    prereq: 'Int 2',
    summary: 'Melhora o desempenho em situações de sobrevivência no ermo.',
  },
  {
    key: 'sorrateiro',
    name: 'Sorrateiro',
    prereq: 'Agi 2',
    summary: 'Melhora a capacidade de se mover e agir sem ser notado.',
  },
  {
    key: 'vitalidade-reforcada',
    name: 'Vitalidade Reforçada',
    prereq: 'Vig 2',
    summary: 'Fortalece a vitalidade física do personagem.',
  },
  {
    key: 'vontade-inabalavel',
    name: 'Vontade Inabalável',
    prereq: 'Pre 2',
    summary: 'Fortalece a resistência mental e emocional do personagem.',
  },
];

export const GENERAL_POWER_BY_KEY: Record<string, GeneralPowerDef> = Object.fromEntries(
  GENERAL_POWERS.map((p) => [p.key, p]),
);
