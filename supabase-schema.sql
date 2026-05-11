-- Run this in the Supabase SQL editor (Project > SQL Editor > New Query)

create table if not exists users (
  id         text primary key,
  username   text not null,
  created_at timestamptz default now()
);

create table if not exists boards (
  id            text primary key,
  team_name     text not null,
  created_at    bigint not null,
  password_hash text,
  owner         text references users(id) on delete cascade,
  columns       jsonb not null default '[]',
  expires_at    bigint not null,
  creator_ip    text
);

-- Index to speed up owner lookups and cleanup queries
create index if not exists boards_owner_idx      on boards(owner);
create index if not exists boards_expires_at_idx on boards(expires_at);
create index if not exists boards_creator_ip_idx on boards(creator_ip);

-- Disable Row Level Security — access is controlled by the backend service role key
alter table users  disable row level security;
alter table boards disable row level security;
