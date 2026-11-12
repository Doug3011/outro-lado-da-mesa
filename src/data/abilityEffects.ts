// Efeito numérico de uma habilidade (poder de classe, de trilha, geral ou
// paranormal) sobre a ficha — pedido do usuário: "itens equipados e
// habilidades escolhidas devem alterar os valores da ficha
// automaticamente". A maioria dos poderes do livro é só texto (sem
// mecânica numérica isolada o bastante pra valer a pena cadastrar — ex.
// "Artista Marcial" muda o próprio dano desarmado, que é regra à parte);
// este mapa cobre só os casos de BÔNUS SIMPLES, aplicável de forma
// genérica (soma numa perícia, soma no dano de uma categoria de arma).
//
// Chave = NOME da habilidade exatamente como aparece em `Ability.name`
// (char.abilities não guarda a `key` da definição original — classe/
// trilha/geral/paranormal viram todos o mesmo card genérico só com nome/
// fonte/descrição, ver CharacterSheet.tsx) — por isso a chave aqui é o
// nome, não um id.
export interface AbilityEffect {
  skillBonus?: { skill: string; amount: number };
  // 'fogo' = arma de disparo balístico ou de chamas (pistola, fuzil,
  // lança-chamas...); 'disparo' = arco/besta (Pontaria, mas não é arma de
  // fogo); 'corpo-a-corpo' = perícia Luta. Ver weaponCategory() em
  // character.ts.
  weaponDamageBonus?: { category: 'fogo' | 'disparo' | 'corpo-a-corpo'; amount: number };
  defenseBonus?: number;
}

export const ABILITY_EFFECTS: Record<string, AbilityEffect> = {
  // Especialista (pg 39 do livro) — "+2 em rolagens de dano com armas de fogo".
  'Balística Avançada': { weaponDamageBonus: { category: 'fogo', amount: 2 } },
  // Operações Especiais (trilha de Combatente) — "+5 em Iniciativa".
  // Migrado do caso hardcoded que existia em skillBonus() pra cá.
  'Iniciativa Aprimorada': { skillBonus: { skill: 'iniciativa', amount: 5 } },
};
