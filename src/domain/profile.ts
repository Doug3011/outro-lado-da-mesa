import type { Element } from '../data/ordem';

// Perfil do jogador — informação de "fora do personagem" (OOC), pensada pro
// mestre conhecer melhor quem vai jogar: personalidade, tipo de personagem
// preferido, expectativas e limites de conteúdo. Não é a ficha do agente —
// é sobre a pessoa por trás dela. Fica salvo localmente, independente de mesa.

export interface PlayerProfile {
  photo?: string; // foto do jogador (não do personagem) — data URL
  age: string;
  birthday: string;
  personality: string;
  favoriteType: string;
  experience: string;
  expectations: string;
  limits: string;
  notes: string;
  // Resultado do teste "qual elemento combina com você" (sobre a pessoa,
  // não sobre uma ficha específica) — ver ElementQuizPage.tsx.
  elementResult?: Element;
}

export interface ProfileField {
  key: keyof PlayerProfile;
  label: string;
  placeholder: string;
}

export const PROFILE_FIELDS: ProfileField[] = [
  {
    key: 'personality',
    label: 'Como você costuma ser numa mesa de RPG?',
    placeholder: 'Ex.: mais quieto, prefiro ouvir e reagir · ou tomo a frente e conduzo as cenas...',
  },
  {
    key: 'favoriteType',
    label: 'Que tipo de personagem você gosta de jogar?',
    placeholder: 'Ex.: combatente na linha de frente, investigador cauteloso, ocultista curioso...',
  },
  {
    key: 'experience',
    label: 'Sua experiência com RPG de mesa',
    placeholder: 'Ex.: já joguei bastante · é minha primeira vez · só joguei outros sistemas...',
  },
  {
    key: 'expectations',
    label: 'O que você espera dessa mesa/campanha?',
    placeholder: 'Ex.: quero investigação e mistério, quero ação, quero terror pesado...',
  },
  {
    key: 'limits',
    label: 'Tem algum tema que prefere evitar na mesa?',
    placeholder: 'Ex.: violência contra crianças, temas médicos específicos, nada em especial...',
  },
  {
    key: 'notes',
    label: 'Mais alguma coisa que o mestre deveria saber?',
    placeholder: 'Fica à vontade — esse campo é livre.',
  },
];

export function emptyProfile(): PlayerProfile {
  return {
    photo: undefined,
    age: '',
    birthday: '',
    personality: '',
    favoriteType: '',
    experience: '',
    expectations: '',
    limits: '',
    notes: '',
    elementResult: undefined,
  };
}

export function hasFilledProfile(p: PlayerProfile): boolean {
  return Object.entries(p).some(
    ([k, v]) => k !== 'photo' && k !== 'elementResult' && typeof v === 'string' && v.trim().length > 0,
  );
}
