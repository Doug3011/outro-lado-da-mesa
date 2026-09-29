// Faixas de música do MENU (tela inicial) — diferente da biblioteca
// compartilhada da mesa (lib/musicLibrary.ts, arquivos importados pelo
// mestre e tocados via servidor local). Essas aqui vêm junto com o app
// (public/menu-tracks/) e são desbloqueadas jogando o Desafio Diário.

export interface MenuTrack {
  id: string;
  name: string;
  file: string;
}

// Sempre disponível, nunca precisa desbloquear.
export const DEFAULT_MENU_TRACK: MenuTrack = {
  id: 'default',
  name: 'Trilha padrão',
  file: '/menu-music.mp3',
};

// Desbloqueadas uma de cada vez, nesta ordem, tirando 20 natural no Desafio
// Diário.
export const UNLOCKABLE_MENU_TRACKS: MenuTrack[] = [
  { id: 'tipora', name: 'Tipora', file: '/menu-tracks/tipora.mp3' },
  { id: 'amigos', name: 'Amigos', file: '/menu-tracks/amigos.mp3' },
  { id: 'ferias', name: 'Férias', file: '/menu-tracks/ferias.mp3' },
  { id: 'passado-misterioso', name: 'Passado Misterioso', file: '/menu-tracks/passado-misterioso.mp3' },
  { id: 'nao-abra-a-porta', name: 'Não Abra a Porta', file: '/menu-tracks/nao-abra-a-porta.mp3' },
];

export const ALL_MENU_TRACKS: MenuTrack[] = [DEFAULT_MENU_TRACK, ...UNLOCKABLE_MENU_TRACKS];
