create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique not null,
  full_name text,
  created_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Untitled document'
    check (char_length(title) between 1 and 200),
  content jsonb not null default '{"type":"doc","content":[]}'::jsonb,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.document_shares (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  shared_with uuid not null references public.profiles (id) on delete cascade,
  permission text not null check (permission in ('viewer', 'editor')),
  created_at timestamptz not null default now(),
  unique (document_id, shared_with)
);

create index documents_owner_id_idx on public.documents (owner_id);
create index document_shares_shared_with_idx on public.document_shares (shared_with);
create index document_shares_document_id_idx on public.document_shares (document_id);

create or replace function public.prevent_owner_self_share()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (
    select 1 from public.documents d
    where d.id = new.document_id and d.owner_id = new.shared_with
  ) then
    raise exception 'A document cannot be shared with its owner';
  end if;
  return new;
end;
$$;

create trigger document_shares_before_insert
  before insert on public.document_shares
  for each row execute function public.prevent_owner_self_share();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.prevent_document_owner_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.owner_id is distinct from old.owner_id then
    raise exception 'Document owner cannot be changed';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger documents_before_update
  before update on public.documents
  for each row execute function public.prevent_document_owner_change();

-- These SECURITY DEFINER helpers read both tables outside caller RLS, avoiding
-- recursive policy evaluation between documents and document_shares.
create or replace function public.is_document_owner(doc_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.documents d
    where d.id = doc_id and d.owner_id = (select auth.uid())
  );
$$;

create or replace function public.can_view_document(doc_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_document_owner(doc_id) or exists (
    select 1 from public.document_shares s
    where s.document_id = doc_id and s.shared_with = (select auth.uid())
  );
$$;

create or replace function public.can_edit_document(doc_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_document_owner(doc_id) or exists (
    select 1 from public.document_shares s
    where s.document_id = doc_id
      and s.shared_with = (select auth.uid())
      and s.permission = 'editor'
  );
$$;

alter table public.profiles enable row level security;
alter table public.documents enable row level security;
alter table public.document_shares enable row level security;

create policy "Authenticated users can read profiles"
  on public.profiles for select to authenticated
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "Users can view documents they can access"
  on public.documents for select to authenticated
  using (public.can_view_document(id));

create policy "Users can create documents they own"
  on public.documents for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "Owners and editors can update documents"
  on public.documents for update to authenticated
  using (public.can_edit_document(id))
  with check (public.can_edit_document(id));

create policy "Owners can delete documents"
  on public.documents for delete to authenticated
  using (public.is_document_owner(id));

create policy "Owners and recipients can read document shares"
  on public.document_shares for select to authenticated
  using (public.is_document_owner(document_id) or shared_with = (select auth.uid()));

create policy "Owners can create document shares"
  on public.document_shares for insert to authenticated
  with check (public.is_document_owner(document_id));

create policy "Owners can update document shares"
  on public.document_shares for update to authenticated
  using (public.is_document_owner(document_id))
  with check (public.is_document_owner(document_id));

create policy "Owners can delete document shares"
  on public.document_shares for delete to authenticated
  using (public.is_document_owner(document_id));
