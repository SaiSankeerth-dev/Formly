-- =====================================================================
-- 003_SUPABASE_AUTH_RLS.SQL
-- Single Source of Truth: Supabase Auth (auth.users)
-- Row Level Security (RLS) policies and citizen relation tables
-- =====================================================================

-- Ensure uuid extension
create extension if not exists "uuid-ossp";

-- 1. CITIZEN PROFILES (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  full_name text,
  date_of_birth date,
  gender text,
  occupation text,
  education text,
  phone text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Ensure user_id column exists if table was pre-existing
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'id'
  ) then
    alter table public.profiles add column id uuid references auth.users(id) on delete cascade;
    if not exists (
      select 1 from information_schema.table_constraints
      where table_schema = 'public' and table_name = 'profiles' and constraint_type = 'PRIMARY KEY'
    ) then
      alter table public.profiles add primary key (id);
    end if;
  end if;
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'full_name'
  ) then
    alter table public.profiles add column full_name text;
  end if;
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'phone'
  ) then
    alter table public.profiles add column phone text;
  end if;
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'user_id'
  ) then
    alter table public.profiles add column user_id uuid references auth.users(id) on delete cascade;
  end if;
end $$;

-- 2. CITIZEN ADDRESSES
create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  state text,
  district text,
  mandal text,
  village text,
  address_line text,
  pincode text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. CITIZEN DOCUMENTS
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null,
  original_filename text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  sha256 text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. CITIZEN APPLICATIONS
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  service_id text not null,
  service_name text not null,
  state text not null default 'DRAFT',
  current_step text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon;
  end if;

  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'documents' and column_name = 'user_id'
  ) then
    alter table public.documents add column user_id uuid references auth.users(id) on delete cascade;
  end if;

  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'applications' and column_name = 'user_id'
  ) then
    alter table public.applications add column user_id uuid references auth.users(id) on delete cascade;
  end if;

  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'applications' and column_name = 'citizen_user_id'
  ) then
    alter table public.applications add column citizen_user_id text;
  end if;

  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'applications' and column_name = 'service_name'
  ) then
    alter table public.applications add column service_name text default 'Government Service';
  end if;

  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'applications' and column_name = 'state'
  ) then
    alter table public.applications add column state text default 'DRAFT';
  end if;
end $$;

alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.documents enable row level security;
alter table public.applications enable row level security;

-- PROFILES POLICIES
drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or user_id = auth.uid());

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid() or user_id = auth.uid());

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid() or user_id = auth.uid())
  with check (id = auth.uid() or user_id = auth.uid());

-- ADDRESSES POLICIES
drop policy if exists "Users can view their own address" on public.addresses;
create policy "Users can view their own address"
  on public.addresses for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can create their own address" on public.addresses;
create policy "Users can create their own address"
  on public.addresses for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can update their own address" on public.addresses;
create policy "Users can update their own address"
  on public.addresses for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- DOCUMENTS POLICIES
drop policy if exists "Users can view their own documents" on public.documents;
create policy "Users can view their own documents"
  on public.documents for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can create their own documents" on public.documents;
create policy "Users can create their own documents"
  on public.documents for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can update their own documents" on public.documents;
create policy "Users can update their own documents"
  on public.documents for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can delete their own documents" on public.documents;
create policy "Users can delete their own documents"
  on public.documents for delete
  to authenticated
  using (user_id = auth.uid());

-- APPLICATIONS POLICIES
drop policy if exists "Users can view their own applications" on public.applications;
create policy "Users can view their own applications"
  on public.applications for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can create their own applications" on public.applications;
create policy "Users can create their own applications"
  on public.applications for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can update their own applications" on public.applications;
create policy "Users can update their own applications"
  on public.applications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- =====================================================================
-- AUTOMATIC PROFILE TRIGGER ON AUTH.USERS
-- =====================================================================

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'auth' and table_name = 'users') then
    if not exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'raw_user_meta_data') then
      alter table auth.users add column raw_user_meta_data jsonb default '{}'::jsonb;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'phone') then
      alter table auth.users add column phone text default '';
    end if;
  end if;
end $$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  user_data jsonb;
  meta jsonb;
  extracted_name text;
  extracted_phone text;
begin
  user_data := to_jsonb(new);
  meta := coalesce(user_data->'raw_user_meta_data', '{}'::jsonb);
  extracted_name := coalesce(meta->>'full_name', meta->>'name', user_data->>'email', '');
  extracted_phone := coalesce(user_data->>'phone', '');

  if not exists (
    select 1 from public.profiles 
    where (id is not null and id = new.id) or (user_id is not null and user_id = new.id)
  ) then
    insert into public.profiles (id, user_id, full_name, phone)
    values (
      new.id,
      new.id,
      extracted_name,
      extracted_phone
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
