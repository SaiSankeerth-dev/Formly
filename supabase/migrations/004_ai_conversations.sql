-- =====================================================================
-- 004_ai_conversations.sql
-- Saarthi AI: User-Owned Conversations and Messages with Strict RLS
-- =====================================================================

create table if not exists ai_conversations (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null,
  title                 text not null default 'New Conversation',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table if not exists ai_messages (
  id                    uuid primary key default gen_random_uuid(),
  conversation_id       uuid not null references ai_conversations(id) on delete cascade,
  user_id               uuid not null,
  role                  text not null check (role in ('user', 'assistant', 'system')),
  content               text not null,
  intent                text,
  metadata              jsonb,
  created_at            timestamptz not null default now()
);

create index if not exists idx_ai_conversations_user
on ai_conversations(user_id, updated_at desc);

create index if not exists idx_ai_messages_conversation
on ai_messages(conversation_id, created_at asc);

create index if not exists idx_ai_messages_user
on ai_messages(user_id);

-- RLS
alter table ai_conversations enable row level security;
alter table ai_messages enable row level security;

-- ai_conversations policies
create policy "Users can view own conversations"
  on ai_conversations for select
  using (auth.uid() = user_id);

create policy "Users can insert own conversations"
  on ai_conversations for insert
  with check (auth.uid() = user_id);

create policy "Users can update own conversations"
  on ai_conversations for update
  using (auth.uid() = user_id);

create policy "Users can delete own conversations"
  on ai_conversations for delete
  using (auth.uid() = user_id);

-- ai_messages policies
create policy "Users can view own messages"
  on ai_messages for select
  using (auth.uid() = user_id);

create policy "Users can insert own messages"
  on ai_messages for insert
  with check (auth.uid() = user_id);
