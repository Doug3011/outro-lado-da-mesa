// Catálogo de equipamentos, modificações e itens amaldiçoados do livro de
// regras de Ordem Paranormal (Capítulo 3: Equipamento, e Itens Amaldiçoados)
// — pedido do usuário: "clicar no item e ele ser adicionado ao inventário",
// cobrindo tanto equipamento comum quanto modificações (melhorias) e
// maldições. Extraído direto do PDF do livro (capítulo de Equipamento,
// páginas 50-67 do livro; Itens Amaldiçoados, páginas 144-151) — números e
// nomes conferidos contra o texto original.
//
// Cada entrada vira uma linha de inventário ao ser clicada (ver
// EquipmentCatalogDialog.tsx) — `category` é a categoria do item (0/I/II/
// III/IV) pra itens de verdade, ou o AUMENTO de categoria ("+I"/"+II") pra
// modificações/maldições, que não são itens próprios — modificam um item já
// existente (some ao total de categoria dele, não ocupam espaço próprio).

export interface CatalogItem {
  id: string;
  name: string;
  category: string; // '0' | 'I' | 'II' | 'III' | 'IV' (item) ou '+I' / '+II' (modificação/maldição — aumento de categoria)
  slots: number;
  notes: string;
}

export interface CatalogGroup {
  id: string;
  label: string;
  items: CatalogItem[];
}

export const EQUIPMENT_CATALOG: CatalogGroup[] = [
  {
    id: 'armas',
    label: '⚔️ Armas',
    items: [
      // Armas Simples
      { id: 'faca', name: 'Faca', category: '0', slots: 1, notes: 'Corpo a corpo leve (ágil). Dano 1d4, crítico 19, corte. Pode ser arremessada (alcance curto).' },
      { id: 'martelo', name: 'Martelo', category: '0', slots: 1, notes: 'Corpo a corpo leve. Dano 1d6, crítico x2, impacto.' },
      { id: 'punhal', name: 'Punhal', category: '0', slots: 1, notes: 'Corpo a corpo leve (ágil). Dano 1d4, crítico x3, perfuração. Usado por cultistas em rituais.' },
      { id: 'bastao', name: 'Bastão', category: '0', slots: 1, notes: 'Corpo a corpo uma mão (1d6) ou duas mãos (1d8), crítico x2, impacto.' },
      { id: 'machete', name: 'Machete', category: '0', slots: 1, notes: 'Corpo a corpo uma mão. Dano 1d6, crítico 19, corte.' },
      { id: 'lanca', name: 'Lança', category: '0', slots: 1, notes: 'Corpo a corpo uma mão. Dano 1d6, crítico x2, perfuração. Pode ser arremessada (alcance curto).' },
      { id: 'cajado', name: 'Cajado', category: '0', slots: 2, notes: 'Corpo a corpo duas mãos (ágil). Dano 1d6, crítico x2, impacto. Pode ser usado como arma de uma mão + leve com Combater com Duas Armas.' },
      { id: 'arco', name: 'Arco', category: '0', slots: 2, notes: 'Disparo, duas mãos. Dano 1d6, crítico x3, alcance médio, perfuração. Usa Flechas (categoria 0, 1 espaço).' },
      { id: 'besta', name: 'Besta', category: '0', slots: 2, notes: 'Disparo, duas mãos. Dano 1d8, crítico 19, alcance médio, perfuração. Recarregar exige ação de movimento. Usa Flechas.' },
      { id: 'pistola', name: 'Pistola', category: 'I', slots: 1, notes: 'Fogo, leve. Dano 1d12, crítico 18, alcance curto, balístico. Usa Balas curtas (categoria 0, 1 espaço).' },
      { id: 'revolver', name: 'Revólver', category: 'I', slots: 1, notes: 'Fogo, leve. Dano 2d6, crítico 19/x3, alcance curto, balístico. Usa Balas curtas.' },
      { id: 'fuzil-caca-livro', name: 'Fuzil de Caça', category: 'I', slots: 2, notes: 'Fogo, duas mãos. Dano 2d8, crítico 19/x3, alcance médio, balístico. Usa Balas longas (categoria I, 1 espaço).' },
      // Armas Táticas
      { id: 'machadinha', name: 'Machadinha', category: '0', slots: 1, notes: 'Tática, corpo a corpo leve. Dano 1d6, crítico x3, corte. Pode ser arremessada (alcance curto).' },
      { id: 'nunchaku', name: 'Nunchaku', category: '0', slots: 1, notes: 'Tática, corpo a corpo leve (ágil). Dano 1d8, crítico x2, impacto.' },
      { id: 'corrente', name: 'Corrente', category: '0', slots: 1, notes: 'Tática, corpo a corpo uma mão. Dano 1d8, crítico x2, impacto. +2 em testes de desarmar e derrubar.' },
      { id: 'espada', name: 'Espada', category: 'I', slots: 1, notes: 'Tática, corpo a corpo uma mão (1d8) ou duas mãos (1d10), crítico 19, corte.' },
      { id: 'florete', name: 'Florete', category: 'I', slots: 1, notes: 'Tática, corpo a corpo uma mão (ágil). Dano 1d6, crítico 18, corte.' },
      { id: 'machado', name: 'Machado', category: 'I', slots: 1, notes: 'Tática, corpo a corpo uma mão. Dano 1d8, crítico x3, corte.' },
      { id: 'maca', name: 'Maça', category: 'I', slots: 1, notes: 'Tática, corpo a corpo uma mão. Dano 2d4, crítico x2, impacto.' },
      { id: 'acha', name: 'Acha', category: 'I', slots: 2, notes: 'Tática, corpo a corpo duas mãos. Dano 1d12, crítico x3, corte.' },
      { id: 'gadanho', name: 'Gadanho', category: 'I', slots: 2, notes: 'Tática, corpo a corpo duas mãos. Dano 2d4, crítico x4, corte.' },
      { id: 'katana', name: 'Katana', category: 'I', slots: 2, notes: 'Tática, corpo a corpo duas mãos (ágil; veterano em Luta pode usar como uma mão). Dano 1d10, crítico 19, corte.' },
      { id: 'marreta', name: 'Marreta', category: 'I', slots: 2, notes: 'Tática, corpo a corpo duas mãos. Dano 3d4, crítico x2, impacto.' },
      { id: 'montante', name: 'Montante', category: 'I', slots: 2, notes: 'Tática, corpo a corpo duas mãos. Dano 2d6, crítico 19, corte.' },
      { id: 'motosserra', name: 'Motosserra', category: 'I', slots: 2, notes: 'Tática, corpo a corpo duas mãos. Dano 3d6, crítico x2, corte. Rolou 6? Role +1 dado de dano. –O em testes de ataque. Ligar gasta ação de movimento.' },
      { id: 'arco-composto', name: 'Arco Composto', category: 'I', slots: 2, notes: 'Tática, disparo duas mãos. Dano 1d10, crítico x3, alcance médio, perfuração. Soma Força ao dano (diferente de arcos comuns). Usa Flechas.' },
      { id: 'balestra', name: 'Balestra', category: 'I', slots: 2, notes: 'Tática, disparo duas mãos. Dano 1d12, crítico 19, alcance médio, perfuração. Recarregar exige ação de movimento. Usa Flechas.' },
      { id: 'submetralhadora', name: 'Submetralhadora', category: 'I', slots: 1, notes: 'Tática, fogo uma mão, automática. Dano 2d6, crítico 19/x3, alcance curto, balístico. Usa Balas curtas.' },
      { id: 'espingarda', name: 'Espingarda', category: 'I', slots: 2, notes: 'Tática, fogo duas mãos. Dano 4d6, crítico x3, alcance curto, balístico (metade do dano além do alcance médio). Usa Cartuchos (categoria I, 1 espaço).' },
      { id: 'fuzil-assalto-livro', name: 'Fuzil de Assalto', category: 'II', slots: 2, notes: 'Tática, fogo duas mãos, automática. Dano 2d10, crítico 19/x3, alcance médio, balístico. Usa Balas longas.' },
      { id: 'fuzil-precisao-livro', name: 'Fuzil de Precisão', category: 'III', slots: 2, notes: 'Tática, fogo duas mãos. Dano 2d10, crítico 19/x3, alcance longo, balístico. Veterano em Pontaria mirando: +5 na margem de ameaça. Usa Balas longas.' },
      // Armas Pesadas
      { id: 'bazuca', name: 'Bazuca', category: 'III', slots: 2, notes: 'Pesada, fogo duas mãos. Dano 10d8, crítico x2, alcance médio, impacto. Atinge um raio de 3m (Reflexos DT Agi reduz à metade pra quem não for o alvo direto). Recarregar exige ação de movimento. Usa Foguete (categoria I, 1 espaço, dura 1 disparo).' },
      { id: 'lanca-chamas-livro', name: 'Lança-chamas', category: 'III', slots: 2, notes: 'Pesada, fogo duas mãos. Dano 6d6, crítico x2, alcance curto, fogo. Atinge todos numa linha de 1,5m de largura; alvos pegam fogo. Usa Combustível (categoria I, 1 espaço).' },
      { id: 'metralhadora-livro', name: 'Metralhadora', category: 'II', slots: 2, notes: 'Pesada, fogo duas mãos, automática. Dano 2d12, crítico 19/x3, alcance médio, balístico. Exige Força 4+ ou apoiar em tripé (ação de movimento), senão –5 nos ataques. Usa Balas longas.' },
    ],
  },
  {
    id: 'municoes',
    label: '🔫 Munições',
    items: [
      { id: 'balas-curtas', name: 'Balas Curtas (pacote)', category: '0', slots: 1, notes: 'Pistolas, revólveres, submetralhadoras. 1 pacote dura 2 cenas.' },
      { id: 'balas-longas', name: 'Balas Longas (pacote)', category: 'I', slots: 1, notes: 'Fuzis e metralhadoras. 1 pacote dura 1 cena.' },
      { id: 'cartuchos', name: 'Cartuchos (pacote)', category: 'I', slots: 1, notes: 'Espingardas. 1 pacote dura 1 cena.' },
      { id: 'combustivel', name: 'Combustível (tanque)', category: 'I', slots: 1, notes: 'Lança-chamas. Dura 1 cena.' },
      { id: 'flechas', name: 'Flechas (pacote)', category: '0', slots: 1, notes: 'Arcos e bestas. Reaproveitadas após o combate — 1 pacote dura a missão inteira.' },
      { id: 'foguete', name: 'Foguete', category: 'I', slots: 1, notes: 'Bazuca. Cada foguete dura só 1 disparo (não 1 cena).' },
    ],
  },
  {
    id: 'protecoes',
    label: '🛡️ Proteções',
    items: [
      { id: 'protecao-leve', name: 'Proteção Leve', category: 'I', slots: 2, notes: 'Defesa +5. Jaqueta de couro pesada ou colete de kevlar — uso comum de seguranças e policiais.' },
      { id: 'protecao-pesada', name: 'Proteção Pesada', category: 'II', slots: 5, notes: 'Defesa +10. Resistência a balístico, corte, impacto e perfuração 2. –5 em testes de perícia com penalidade de carga (desconfortável/volumosa).' },
      { id: 'escudo', name: 'Escudo', category: 'I', slots: 2, notes: 'Defesa +2 (acumula com proteção). Precisa ser empunhado numa mão. Conta como proteção pesada pra proficiência.' },
    ],
  },
  {
    id: 'geral',
    label: '🎒 Equipamento Geral',
    items: [
      // Acessórios
      { id: 'kit-pericia', name: 'Kit de Perícia', category: '0', slots: 1, notes: 'Ferramentas necessárias pra certas perícias/usos. Sem o kit: –5 no teste. Especifique a perícia ao adicionar.' },
      { id: 'utensilio', name: 'Utensílio', category: 'I', slots: 1, notes: '+2 numa perícia à escolha (exceto Luta/Pontaria) — ex.: smartphone (Ciências), notebook (Tecnologia). Precisa ser empunhado. Especifique a perícia ao adicionar.' },
      { id: 'vestimenta', name: 'Vestimenta', category: 'I', slots: 1, notes: '+2 numa perícia à escolha (exceto Luta/Pontaria) — ex.: botas (Atletismo), terno (Diplomacia). Máximo 2 vestimentas ativas ao mesmo tempo. Especifique a perícia ao adicionar.' },
      // Explosivos
      { id: 'granada-atordoamento', name: 'Granada de Atordoamento', category: '0', slots: 1, notes: 'Raio 6m. Atordoado 1 rodada (Fortitude DT Agi reduz pra ofuscado+surdo 1 rodada).' },
      { id: 'granada-fragmentacao', name: 'Granada de Fragmentação', category: 'I', slots: 1, notes: 'Raio 6m. 8d6 de dano de perfuração (Reflexos DT Agi reduz à metade).' },
      { id: 'granada-fumaca', name: 'Granada de Fumaça', category: '0', slots: 1, notes: 'Raio 6m. Cego + camuflagem total por 2 rodadas.' },
      { id: 'granada-incendiaria', name: 'Granada Incendiária', category: 'I', slots: 1, notes: 'Raio 6m. 6d6 de dano de fogo + fica em chamas (Reflexos DT Agi reduz dano à metade e evita a condição).' },
      { id: 'mina-antipessoal', name: 'Mina Antipessoal', category: 'I', slots: 1, notes: 'Ativada por controle remoto (alcance longo). Cone de 6m, 12d6 de dano de perfuração (Reflexos DT Int reduz à metade). Instalar: ação completa + Tática DT 15.' },
      // Itens Operacionais
      { id: 'algemas', name: 'Algemas', category: '0', slots: 1, notes: 'Par de algemas de aço. Prender os dois pulsos: –5 em testes com as mãos, impede conjuração. Escapar: Acrobacia DT 30.' },
      { id: 'arpeu', name: 'Arpéu', category: '0', slots: 1, notes: 'Prender exige Pontaria DT 15. Subir com corda: +5 em Atletismo.' },
      { id: 'bandoleira', name: 'Bandoleira', category: 'I', slots: 1, notes: '1x por rodada, saca ou guarda um item do inventário como ação livre.' },
      { id: 'binoculos', name: 'Binóculos', category: '0', slots: 1, notes: '+5 em Percepção pra observar coisas distantes.' },
      { id: 'bloqueador-sinal', name: 'Bloqueador de Sinal', category: 'I', slots: 1, notes: 'Impede celulares em alcance médio de se conectar.' },
      { id: 'cicatrizante', name: 'Cicatrizante', category: 'I', slots: 1, notes: 'Ação padrão: cura 2d8+2 PV em você ou ser adjacente.' },
      { id: 'corda', name: 'Corda', category: '0', slots: 1, notes: '10m de corda resistente. +5 em Atletismo pra descer buraco/prédio; amarrar pessoas etc.' },
      { id: 'equip-sobrevivencia', name: 'Equipamento de Sobrevivência', category: '0', slots: 2, notes: 'Mochila com saco de dormir, panelas, GPS etc. +5 em Sobrevivência pra acampar/orientar-se, mesmo sem treino.' },
      { id: 'lanterna-tatica', name: 'Lanterna Tática', category: 'I', slots: 1, notes: 'Ilumina cone de 9m. Ação de movimento: mira nos olhos (alcance curto) — ofusca 1 rodada, alvo fica imune pelo resto da cena.' },
      { id: 'mascara-gas', name: 'Máscara de Gás', category: '0', slots: 1, notes: '+10 em Fortitude contra efeitos que dependam de respiração.' },
      { id: 'mochila-militar', name: 'Mochila Militar', category: 'I', slots: 0, notes: 'Não ocupa espaço. Aumenta a capacidade de carga em +2 espaços.' },
      { id: 'oculos-visao-termica', name: 'Óculos de Visão Térmica', category: 'I', slots: 1, notes: 'Elimina penalidade em testes por camuflagem.' },
      { id: 'pe-de-cabra', name: 'Pé de Cabra', category: '0', slots: 1, notes: '+5 em Força pra arrombar portas. Pode ser usado em combate como bastão.' },
      { id: 'pistola-dardos', name: 'Pistola de Dardos', category: 'I', slots: 1, notes: 'Leve, alcance curto. Acerto: inconsciente até o fim da cena (Fortitude DT Agi reduz pra desprevenido+lento 1 rodada). Vem com 2 dardos.' },
      { id: 'pistola-sinalizadora', name: 'Pistola Sinalizadora', category: '0', slots: 1, notes: 'Disparo leve, alcance curto, 2d6 de dano de fogo. Vem com 2 cargas.' },
      { id: 'soqueira', name: 'Soqueira', category: '0', slots: 1, notes: '+1 em dano desarmado e torna o dano letal. Pode receber modificações/maldições de arma corpo a corpo.' },
      { id: 'spray-pimenta', name: 'Spray de Pimenta', category: '0', slots: 1, notes: 'Ação padrão contra adjacente: cego por 1d4 rodadas (Fortitude DT Agi evita). Dura 2 usos.' },
      { id: 'taser', name: 'Taser', category: 'I', slots: 1, notes: 'Ação padrão contra adjacente: 1d6 de dano de eletricidade + atordoado 1 rodada (Fortitude DT Agi evita). Dura 2 usos.' },
      { id: 'traje-hazmat', name: 'Traje Hazmat', category: 'I', slots: 2, notes: '+5 em resistência contra efeitos ambientais. Resistência a químico 10.' },
    ],
  },
  {
    id: 'paranormais',
    label: '🔮 Itens Paranormais',
    items: [
      { id: 'amarras-elemento', name: 'Amarras de (Elemento)', category: 'II', slots: 1, notes: 'Armadilha 3x3m (2 PE, ação completa: Reflexos DT Int ou fica imóvel até o fim da cena) ou Laçar (1 PE, ação padrão, alcance curto: Vontade DT Agi ou fica paralisado; manter custa 1 PE/rodada). Especifique o elemento.' },
      { id: 'camera-aura', name: 'Câmera de Aura Paranormal', category: 'II', slots: 1, notes: 'Amaldiçoada com Energia. Ação padrão + 1 PE: tira foto que revela auras paranormais (cor = elemento) em pessoas/objetos.' },
      { id: 'componentes-ritualisticos', name: 'Componentes Ritualísticos de (Elemento)', category: '0', slots: 1, notes: 'Necessários pra conjurar rituais do elemento (Sangue/Morte/Conhecimento/Energia — não existe de Medo). Especifique o elemento.' },
      { id: 'emissor-pulsos', name: 'Emissor de Pulsos Paranormais', category: 'II', slots: 1, notes: 'Ação completa + 1 PE: emite pulso de um elemento, atrai criaturas desse elemento e afasta do elemento oposto (Vontade DT Pre evita).' },
      { id: 'escuta-ruidos', name: 'Escuta de Ruídos Paranormais', category: 'II', slots: 1, notes: 'Ação completa + 2 PE: grava ruídos paranormais por até 24h. Ouvir: +5 em Ocultismo pra identificar criatura.' },
      { id: 'medidor-membrana', name: 'Medidor de Estabilidade da Membrana', category: 'II', slots: 1, notes: 'Treinado em Ocultismo: avalia a Membrana de uma área, indicando chance de manifestação (não é definitivo).' },
      { id: 'scanner-manifestacao', name: 'Scanner de Manifestação Paranormal de (Elemento)', category: 'II', slots: 1, notes: 'Ação padrão pra ativar, 1 PE/rodada: sabe a direção de manifestações ativas do elemento escolhido em alcance longo. Especifique o elemento.' },
    ],
  },
  {
    id: 'mods-armas',
    label: '🔧 Melhoria: Armas',
    items: [
      { id: 'mod-certeira', name: 'Certeira', category: '+I', slots: 0, notes: 'Modificação (corpo a corpo e disparo). +2 em testes de ataque.' },
      { id: 'mod-cruel', name: 'Cruel', category: '+I', slots: 0, notes: 'Modificação (corpo a corpo e disparo). +2 em rolagens de dano.' },
      { id: 'mod-discreta-arma', name: 'Discreta', category: '+I', slots: 0, notes: 'Modificação (corpo a corpo, disparo e fogo). +5 em testes pra ocultar e reduz o espaço em –1.' },
      { id: 'mod-perigosa', name: 'Perigosa', category: '+I', slots: 0, notes: 'Modificação (corpo a corpo e disparo). +2 em margem de ameaça.' },
      { id: 'mod-tatica', name: 'Tática', category: '+I', slots: 0, notes: 'Modificação (corpo a corpo, disparo e fogo). Pode sacar como ação livre.' },
      { id: 'mod-alongada', name: 'Alongada', category: '+I', slots: 0, notes: 'Modificação (só armas de fogo). +2 em testes de ataque.' },
      { id: 'mod-calibre-grosso', name: 'Calibre Grosso', category: '+I', slots: 0, notes: 'Modificação (só armas de fogo). Aumenta o dano em mais 1 dado do mesmo tipo. Exige munição própria de calibre grosso.' },
      { id: 'mod-compensador', name: 'Compensador', category: '+I', slots: 0, notes: 'Modificação (só armas automáticas). Anula a penalidade por disparar rajadas.' },
      { id: 'mod-ferrolho-automatico', name: 'Ferrolho Automático', category: '+I', slots: 0, notes: 'Modificação (só armas de fogo). A arma se torna automática.' },
      { id: 'mod-mira-laser', name: 'Mira Laser', category: '+I', slots: 0, notes: 'Modificação (só armas de fogo). +2 em margem de ameaça.' },
      { id: 'mod-mira-telescopica', name: 'Mira Telescópica', category: '+I', slots: 0, notes: 'Modificação (só armas de fogo). Aumenta o alcance em 1 categoria e permite Ataque Furtivo em qualquer alcance.' },
      { id: 'mod-silenciador', name: 'Silenciador', category: '+I', slots: 0, notes: 'Modificação (só armas de fogo). Reduz em –OO a penalidade em Furtividade pra se esconder após atacar.' },
      { id: 'mod-visao-calor', name: 'Visão de Calor', category: '+I', slots: 0, notes: 'Modificação (só armas de fogo). Ignora camuflagem do alvo ao disparar.' },
      { id: 'mod-explosiva', name: 'Explosiva', category: '+I', slots: 0, notes: 'Modificação de munição (balas curtas/longas). Aumenta o dano em +2d6.' },
      { id: 'mod-dum-dum', name: 'Dum Dum', category: '+I', slots: 0, notes: 'Modificação de munição (balas curtas/longas). +1 no multiplicador de crítico.' },
    ],
  },
  {
    id: 'mods-protecoes',
    label: '🔧 Melhoria: Proteções',
    items: [
      { id: 'mod-antibombas', name: 'Antibombas', category: '+I', slots: 0, notes: 'Só proteção pesada. +5 em resistência contra efeitos de área.' },
      { id: 'mod-blindada', name: 'Blindada', category: '+I', slots: 0, notes: 'Só proteção pesada. Resistência a dano 5 e +1 espaço.' },
      { id: 'mod-discreta-protecao', name: 'Discreta', category: '+I', slots: 0, notes: 'Só proteção leve. –1 espaço, +5 em Crime pra ocultar (mesmo sem treino).' },
      { id: 'mod-reforcada', name: 'Reforçada', category: '+I', slots: 0, notes: '+2 na Defesa e +1 espaço. Não acumula com Discreta.' },
    ],
  },
  {
    id: 'mods-acessorios',
    label: '🔧 Melhoria: Acessórios',
    items: [
      { id: 'mod-aprimorado', name: 'Aprimorado', category: '+I', slots: 0, notes: 'O bônus em perícia do acessório sobe pra +5.' },
      { id: 'mod-discreto-acessorio', name: 'Discreto', category: '+I', slots: 0, notes: '–1 espaço, +5 em Crime pra ocultar (mesmo sem treino).' },
      { id: 'mod-funcao-adicional', name: 'Função Adicional', category: '+I', slots: 0, notes: '+2 numa perícia adicional à escolha (sujeito à aprovação do mestre).' },
      { id: 'mod-instrumental', name: 'Instrumental', category: '+I', slots: 0, notes: 'O acessório funciona como um kit de perícia específico.' },
    ],
  },
  {
    id: 'maldicoes-armas',
    label: '💀 Maldição: Armas',
    items: [
      { id: 'maldicao-antielemento', name: 'Antielemento', category: '+II', slots: 0, notes: '[Conhecimento] Contra criatura de um elemento (role 1d4 ou escolha): gaste 2 PE e, se acertar, +4d8 de dano.' },
      { id: 'maldicao-ritualistica', name: 'Ritualística', category: '+II', slots: 0, notes: '[Conhecimento] Armazena um ritual (pagando o PE normal) pra descarregar como ação livre ao acertar um ataque.' },
      { id: 'maldicao-senciente', name: 'Senciente', category: '+II', slots: 0, notes: '[Conhecimento] 2 PE + ação de movimento: a arma flutua e ataca sozinha 1x/rodada (precisa 1 PE/rodada pra manter).' },
      { id: 'maldicao-empuxo', name: 'Empuxo', category: '+II', slots: 0, notes: '[Energia] Só corpo a corpo. Pode ser arremessada em alcance curto, +1 dado de dano ao arremessar, e volta voando pra você no mesmo turno.' },
      { id: 'maldicao-energetica', name: 'Energética', category: '+II', slots: 0, notes: '[Energia] 2 PE/ataque: +5 em ataque, ignora RD e converte todo o dano pra Energia.' },
      { id: 'maldicao-vibrante', name: 'Vibrante', category: '+II', slots: 0, notes: '[Energia] Concede Ataque Extra (Operações Especiais); se já tem, reduz o custo em –1 PE.' },
      { id: 'maldicao-consumidora', name: 'Consumidora', category: '+II', slots: 0, notes: '[Morte] 2 PE ao atacar; se acertar, alvo fica imóvel por 1 rodada.' },
      { id: 'maldicao-erosiva', name: 'Erosiva', category: '+II', slots: 0, notes: '[Morte] +1d8 de dano de Morte. 2 PE ao atacar; se acertar, +2d4 de dano de Morte no início dos 2 próximos turnos do alvo.' },
      { id: 'maldicao-repulsora', name: 'Repulsora', category: '+II', slots: 0, notes: '[Morte] +2 de Defesa empunhada. 2 PE num bloqueio: +5 adicional de Defesa.' },
      { id: 'maldicao-lancinante', name: 'Lancinante', category: '+II', slots: 0, notes: '[Sangue] +1d8 de dano de Sangue (multiplicado em crítico).' },
      { id: 'maldicao-predadora', name: 'Predadora', category: '+II', slots: 0, notes: '[Sangue] Anula camuflagem/cobertura leves, dobra a margem de ameaça; se à distância, +1 categoria de alcance.' },
      { id: 'maldicao-sanguinaria', name: 'Sanguinária', category: '+II', slots: 0, notes: '[Sangue] Alvo sangra (2d6/rodada por acerto, cumulativo). Crítico: drena sangue, +2d10 PV temporários pra você.' },
    ],
  },
  {
    id: 'maldicoes-protecoes',
    label: '💀 Maldição: Proteções',
    items: [
      { id: 'maldicao-abascanta', name: 'Abascanta', category: '+II', slots: 0, notes: '[Conhecimento] +5 em resistência contra rituais. 1x/cena, reação: reflete um ritual de volta ao conjurador (pagando o custo em PE dele).' },
      { id: 'maldicao-profetica', name: 'Profética', category: '+II', slots: 0, notes: '[Conhecimento] Resistência a Conhecimento 10. 2 PE num teste de resistência: role de novo.' },
      { id: 'maldicao-cinetica', name: 'Cinética', category: '+II', slots: 0, notes: '[Energia] +2 de Defesa e resistência a dano 2 (leve/escudo) ou 5 (pesada).' },
      { id: 'maldicao-lepida', name: 'Lépida', category: '+II', slots: 0, notes: '[Energia] +10 em Atletismo e +3m de deslocamento. 2 PE: até o fim do turno ignora terreno difícil, ganha deslocamento de escalada e imunidade a queda até 9m.' },
      { id: 'maldicao-voltaica', name: 'Voltaica', category: '+II', slots: 0, notes: '[Energia] Resistência a Energia 10. 2 PE + ação de movimento: até o fim da cena, causa 2d6 de dano de Energia em adjacentes no fim de cada turno.' },
      { id: 'maldicao-letargica', name: 'Letárgica', category: '+II', slots: 0, notes: '[Morte] +2 de Defesa. 25% (leve/escudo) ou 50% (pesada) de chance de ignorar dano extra de crítico/furtivo.' },
      { id: 'maldicao-repulsiva', name: 'Repulsiva', category: '+II', slots: 0, notes: '[Morte] Resistência a Morte 10. 2 PE + ação de movimento: até o fim da cena, quem atacar você corpo a corpo sofre 2d8 de dano de Morte.' },
      { id: 'maldicao-regenerativa', name: 'Regenerativa', category: '+II', slots: 0, notes: '[Sangue] Resistência a Sangue 10. 1 PE + ação de movimento: recupera 1d12 PV.' },
      { id: 'maldicao-sadica', name: 'Sádica', category: '+II', slots: 0, notes: '[Sangue] +1 em ataque e dano pra cada 10 pontos de dano sofridos desde o fim do seu último turno.' },
    ],
  },
  {
    id: 'maldicoes-acessorios',
    label: '💀 Maldição: Acessórios',
    items: [
      { id: 'maldicao-carisma', name: 'Carisma', category: '+II', slots: 0, notes: '[Conhecimento] +1 em Presença (sem PE adicional).' },
      { id: 'maldicao-conjuracao', name: 'Conjuração', category: '+II', slots: 0, notes: '[Conhecimento] Tem um ritual de 1º círculo embutido — conjure como se conhecesse (ou –1 PE se já conhece).' },
      { id: 'maldicao-escudo-mental', name: 'Escudo Mental', category: '+II', slots: 0, notes: '[Conhecimento] Resistência mental 10.' },
      { id: 'maldicao-reflexao', name: 'Reflexão', category: '+II', slots: 0, notes: '[Conhecimento] 1x/rodada: reflete um ritual de volta ao conjurador (pagando o custo em PE dele).' },
      { id: 'maldicao-sagacidade', name: 'Sagacidade', category: '+II', slots: 0, notes: '[Conhecimento] +1 em Intelecto (sem perícias/treinamentos adicionais).' },
      { id: 'maldicao-defesa', name: 'Defesa', category: '+II', slots: 0, notes: '[Energia] +5 de Defesa.' },
      { id: 'maldicao-destreza', name: 'Destreza', category: '+II', slots: 0, notes: '[Energia] +1 em Agilidade.' },
      { id: 'maldicao-potencia', name: 'Potência', category: '+II', slots: 0, notes: '[Energia] +1 na DT de suas habilidades, poderes e rituais.' },
      { id: 'maldicao-esforco-adicional', name: 'Esforço Adicional', category: '+II', slots: 0, notes: '[Morte] +5 PE (ativa só após 1 dia de uso).' },
      { id: 'maldicao-disposicao', name: 'Disposição', category: '+II', slots: 0, notes: '[Sangue] +1 em Vigor.' },
      { id: 'maldicao-pujanca', name: 'Pujança', category: '+II', slots: 0, notes: '[Sangue] +1 em Força.' },
      { id: 'maldicao-vitalidade', name: 'Vitalidade', category: '+II', slots: 0, notes: '[Sangue] +15 PV (ativa só após 1 dia de uso).' },
      { id: 'maldicao-protecao-elemental', name: 'Proteção Elemental', category: '+II', slots: 0, notes: '[Varia] Resistência 10 contra um elemento à escolha. Conta como item desse elemento.' },
    ],
  },
  {
    id: 'amaldicoados-sangue',
    label: '🩸 Amaldiçoado: Sangue',
    items: [
      { id: 'coracao-pulsante', name: 'Coração Pulsante', category: 'II', slots: 1, notes: 'Reação: esprema o coração pra reduzir um dano sofrido à metade. Cada uso: Fortitude DT 15 (+5 por uso adicional no dia) ou o item é destruído.' },
      { id: 'coroa-espinhos', name: 'Coroa de Espinhos', category: 'II', slots: 1, notes: '1x/rodada, reação: transforma dano mental que sofreria em dano de Sangue. Enquanto vestida, não recupera sanidade por descanso. Precisa vestir 1 semana pra ativar.' },
      { id: 'frasco-vitalidade', name: 'Frasco de Vitalidade', category: 'II', slots: 1, notes: '1 minuto + até 20 PV de dano: enche o frasco com seu sangue. Ação padrão: bebe e recupera o mesmo tanto de PV (Fortitude DT 20 ou fica enjoado 1 rodada).' },
      { id: 'perola-sangue', name: 'Pérola de Sangue', category: 'II', slots: 1, notes: 'Ação de movimento: absorve a pérola, +5 em Agilidade/Força/Vigor até o fim da cena. Depois: Fortitude DT 20 ou fica fatigado (falhar por 5+: parada cardíaca, morrendo).' },
      { id: 'punhos-enraivecidos', name: 'Punhos Enraivecidos', category: 'II', slots: 1, notes: 'Par de soqueiras. Desarmado +1d8 de dano de Sangue, letal. Acerto desarmado: pode atacar de novo pagando 2 PE a mais a cada vez.' },
      { id: 'seringa-transfiguracao', name: 'Seringa de Transfiguração', category: 'II', slots: 1, notes: 'Ação padrão: suga sangue de um alvo adjacente (ataque corpo a corpo se não-voluntário). Outra ação padrão: injeta em outra pessoa, transfigurando a aparência dela (como Distorcer Aparência, duração 1 dia).' },
    ],
  },
  {
    id: 'amaldicoados-morte',
    label: '☠️ Amaldiçoado: Morte',
    items: [
      { id: 'amarras-mortais', name: 'Amarras Mortais', category: 'II', slots: 1, notes: '1x/rodada, ação padrão + 2 PE: agarra alvo Grande ou menor em alcance curto com +10 no teste oposto. Ação de movimento: puxa um alvo agarrado pra adjacente.' },
      { id: 'casaco-lodo', name: 'Casaco de Lodo', category: 'II', slots: 1, notes: 'Resistência a corte, impacto, Morte e perfuração 5. Vulnerabilidade a dano balístico e de Energia.' },
      { id: 'coletora', name: 'Coletora', category: 'II', slots: 1, notes: 'Punhal. Ação completa: apunhala alguém morrendo, mata e absorve 1d8 PE (armazena até 20). Usa o PE armazenado como seu após 1 semana portando. Pesadelos constantes enquanto porta (descanso sempre ruim).' },
      { id: 'cranio-espiral', name: 'Crânio Espiral', category: 'II', slots: 1, notes: '1x/rodada, ação livre: ganha uma ação padrão adicional na rodada. Cada uso: Vontade DT 15 (+5 por uso adicional no dia) ou envelhece 1d4 anos e não pode mais usar nesse dia.' },
      { id: 'frasco-lodo', name: 'Frasco de Lodo', category: 'II', slots: 1, notes: 'Ação padrão: aplica em ferimento. Recente (até 1 rodada): cura 6d8+20 PV. Antigo: 1d par cura 3d8+10, ímpar infecciona e causa 3d8+10 de dano de Morte. Uso único.' },
      { id: 'vislumbre-fim', name: 'Vislumbre do Fim', category: 'II', slots: 1, notes: 'Ação de movimento, mirando um ser visível: revela info sobre a morte dele (contador de tempo pra pessoas comuns; pior resistência + vulnerabilidades pra Marcados/criaturas).' },
    ],
  },
  {
    id: 'amaldicoados-conhecimento',
    label: '📖 Amaldiçoado: Conhecimento',
    items: [
      { id: 'aneis-elo-mental', name: 'Anéis do Elo Mental', category: 'II', slots: 1, notes: 'Par de anéis — 24h de uso por 2 pessoas ativa uma ligação telepática (Invadir Mente) enquanto usarem. Testes de Vontade usam o melhor dos dois; dano mental de uma é sofrido por ambas; condições mentais/medo afetam as duas.' },
      { id: 'lanterna-reveladora', name: 'Lanterna Reveladora', category: 'II', slots: 1, notes: 'Ação padrão + 1 PE: liga por 1 cena, emite luz com propriedades de Terceiro Olho. Incomoda criaturas de Sangue iluminadas (atacam você antes de outros alvos na mesma categoria de alcance).' },
      { id: 'mascara-pessoas-sombras', name: 'Máscara das Pessoas nas Sombras', category: 'II', slots: 1, notes: 'Resistência a Conhecimento 10. Ação de movimento + 2 PE: teletransporta entre sombras em alcance médio. Vestir é como assinar um acordo com a Seita das Máscaras — consequências a critério do mestre.' },
      { id: 'municao-jurada', name: 'Munição Jurada', category: 'II', slots: 1, notes: 'Ritual de 1h vincula a bala a um alvo conhecido. Contra ele: +10 em ataque, dobra margem de ameaça, +6d12 de dano de Conhecimento. Enquanto a possuir: –2 em Defesa e ataque contra qualquer outro alvo.' },
      { id: 'pergaminho-pertinacia', name: 'Pergaminho da Pertinácia', category: 'II', slots: 1, notes: 'Ação padrão: +5 PE temporários até o fim da cena. Cada uso: Ocultismo DT 15 (+5 por uso adicional no dia) ou o pergaminho se desfaz.' },
    ],
  },
  {
    id: 'amaldicoados-energia',
    label: '⚡ Amaldiçoado: Energia',
    items: [
      { id: 'arcabuz-moretti', name: 'Arcabuz dos Moretti', category: 'II', slots: 1, notes: 'Arma simples, fogo, uma mão. +2 em ataque, dano de Energia, alcance curto, crítico x3, sem munição. Ao disparar, role 1d6 pro dano: 1) 2d4, 2) 2d6, 3) 2d8, 4) 2d10, 5) 2d12, 6) 2d20.' },
      { id: 'bateria-reversa', name: 'Bateria Reversa', category: 'II', slots: 1, notes: 'Ação padrão + 2 PE: absorve carga de um dispositivo eletrônico em alcance curto (descarrega ele). Se cheia, ação padrão transfere a carga pra outro dispositivo descarregado. Cada uso: Ocultismo DT 15 (+5/uso no dia) ou explode (12d6 de dano de Energia em 3m).' },
      { id: 'peitoral-segunda-chance', name: 'Peitoral da Segunda Chance', category: 'II', slots: 1, notes: 'Se reduzido a 0 PV: gasta 5 PE automaticamente pra reanimar com 4d10 PV. Falha se não tiver PE suficiente. 1 em 1d10 de chance de matar instantaneamente em vez disso.' },
      { id: 'relogio-arnaldo', name: 'Relógio de Arnaldo', category: 'II', slots: 1, notes: '1x/rodada, 1 PE: role de novo qualquer dado com resultado 1. Custo sobe +1 a cada ativação no mesmo dia. Item único.' },
      { id: 'talisma-sorte', name: 'Talismã da Sorte', category: 'II', slots: 1, notes: 'Ao sofrer dano vestindo: reação + 3 PE, role 1d4. 2-3: evita o dano. 4: evita mas o talismã se desfaz. 1: sofre o DOBRO do dano e o talismã se desfaz.' },
      { id: 'teclado-conexao-neural', name: 'Teclado de Conexão Neural', category: 'II', slots: 1, notes: 'Plugado (ação de movimento): usa o computador sem impedimento de idioma/tecnologia, +10 em hackear, metade do tempo pra localizar arquivo. Sofre 1d6 de dano mental por rodada de uso.' },
      { id: 'tela-pesadelo', name: 'Tela do Pesadelo', category: 'II', slots: 1, notes: 'Ação padrão + 2 PE pra ativar. Próxima pessoa que tocar: Vontade DT (sua escolha +5) ou atordoada + 4d6 de dano mental, repetindo o teste toda rodada até passar ou alguém destruir a tela.' },
      { id: 'veiculo-energizado', name: 'Veículo Energizado', category: 'II', slots: 1, notes: 'Não precisa de combustível. Reação + Pilotagem DT 25: veículo e ocupantes viram energia por um instante, atravessando um obstáculo pra evitar colisão.' },
    ],
  },
  {
    id: 'amaldicoados-medo',
    label: '😱 Amaldiçoado: Medo',
    items: [
      { id: 'jaqueta-verissimo', name: 'Jaqueta de Veríssimo', category: 'IV', slots: 1, notes: 'Item único. Resistência a dano paranormal 15. Reação + 2 PE: vira o alvo do dano que um aliado adjacente ia sofrer, no lugar dele.' },
      { id: 'dedo-decepado', name: 'Dedo Decepado', category: 'II', slots: 1, notes: 'Concede um poder paranormal do dono original (elemento = elemento da maldição). Dormir/relaxar: 1 em 1d4 chance de não recuperar PV/PE/sanidade (memórias do antigo dono) + –10 em Diplomacia se visto usando. Precisa vestir 1 semana pra ativar.' },
      { id: 'selos-paranormais', name: 'Selos Paranormais', category: 'variável', slots: 1, notes: 'Cada selo tem um ritual embutido — categoria = círculo do ritual. Ativar: empunhar + ler em voz alta (ação padrão ou a do ritual). Sem conhecer o ritual: Ocultismo DT 20 + custo em PE. Selo se desfaz em cinzas após o uso.' },
    ],
  },
];
