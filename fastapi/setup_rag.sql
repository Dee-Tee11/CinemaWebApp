-- Enable UUID extension if not enabled
create extension if not exists "uuid-ossp";

-- Table for User Personas (The "Brain")
create table if not exists user_personas (
    user_id uuid references auth.users not null primary key,
    persona_text text,
    last_updated timestamp with time zone default timezone('utc'::text, now())
);

-- Table for Request Logs (Debugging RAG)
create table if not exists recommendation_logs (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users,
    query_text text,
    persona_snapshot text,
    llm_reasoning text,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Policy to allow users to read/write their own persona
alter table user_personas enable row level security;

create policy "Users can read own persona"
on user_personas for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can update own persona"
on user_personas for update
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own persona"
on user_personas for insert
to authenticated
with check (auth.uid() = user_id);
