-- Love Confession - schema.sql
-- Chạy file này trong Supabase SQL Editor.
-- File này chỉ tạo cấu trúc và trigger; quyền truy cập nằm ở policies.sql.

create extension if not exists pgcrypto;

create table if not exists public.consents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'agreed',
  created_at timestamptz not null default now(),
  user_agent text
);

create table if not exists public.admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_consents_created_at on public.consents (created_at desc);
create index if not exists idx_consents_name_lower on public.consents (lower(name));
create index if not exists idx_admins_user_id on public.admins (user_id);

-- Database là nguồn thời gian chính và ép status về agreed.
-- Như vậy client không thể tự gửi created_at/status giả thông qua Data API nếu chỉ có
-- quyền INSERT các cột name/user_agent.
create or replace function public.normalize_consent()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.name := left(btrim(new.name), 80);
  new.status := 'agreed';
  new.created_at := now();
  if new.user_agent is not null then
    new.user_agent := left(new.user_agent, 512);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_normalize_consent on public.consents;
create trigger trg_normalize_consent
before insert on public.consents
for each row execute function public.normalize_consent();

-- Bật Postgres Changes/Reatime cho bảng consents.
-- Supabase hosted thường đã có publication supabase_realtime.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
       from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'consents'
     ) then
    alter publication supabase_realtime add table public.consents;
  end if;
end;
$$;
