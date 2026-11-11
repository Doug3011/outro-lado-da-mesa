// Efeitos NUMÉRICOS automáticos de itens do catálogo (equipmentCatalog.ts)
// quando marcados como "equipado" no inventário — pedido do usuário:
// "um exemplo o colete aumenta a proteção, então o valor vai ser calculado
// automaticamente". Só cobre os poucos itens cujo efeito mapeia direto num
// campo numérico já existente da ficha (Defesa/Proteção/bônus de perícia);
// a maioria dos itens do catálogo tem efeitos narrativos (gasta PE, condição
// etc.) que continuam só como texto em `notes` — aplicados manualmente pelo
// jogador/mestre, igual já funcionava antes. Chave = `CatalogItem.id`.

export interface EquipEffect {
  defenseBonus?: number; // soma à Defesa (ver deriveStats em domain/character.ts)
  protection?: number; // soma à Proteção (resistência a dano de armadura)
  skillBonus?: number; // soma à perícia escolhida em `InventoryItem.boostSkill`
  needsSkillChoice?: boolean; // true: a UI deve pedir pra escolher a perícia antes de poder equipar
}

export const EQUIPMENT_EFFECTS: Record<string, EquipEffect> = {
  'protecao-leve': { defenseBonus: 5 },
  'protecao-pesada': { defenseBonus: 10, protection: 2 },
  escudo: { defenseBonus: 2 },
  utensilio: { skillBonus: 2, needsSkillChoice: true },
  vestimenta: { skillBonus: 2, needsSkillChoice: true },
};
