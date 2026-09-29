-- Execute no SQL Editor do seu projeto Supabase.
-- Cria as tabelas de persistencia da mesa e libera acesso anonimo (jogo entre amigos).
-- Se quiser algo mais fechado depois, troque as policies por regras baseadas em auth.uid().

create table if not exists public.rooms (
  code text primary key,
  scenes jsonb,             -- lista de cenarios: [{ id, name, map, tokens }]
  active_scene_id text,     -- cenario ativo da sala
  updated_at timestamptz default now()
);

create table if not exists public.characters (
  id text primary key,
  room_code text not null,
  data jsonb not null,
  updated_at timestamptz default now()
);
create index if not exists characters_room_idx on public.characters (room_code);

alter table public.rooms enable row level security;
alter table public.characters enable row level security;

-- Acesso total para a chave anon. Ajuste conforme a necessidade.
create policy "rooms open" on public.rooms for all using (true) with check (true);
create policy "characters open" on public.characters for all using (true) with check (true);

-- Realtime (broadcast) ja funciona sem tabela. Isto e so para o fallback de persistencia.
-- Obs.: imagens de mapa/token ficam embutidas como data URL dentro de rooms.scenes.
-- Para muitas imagens, migre os arquivos para o Supabase Storage e guarde so a URL.
