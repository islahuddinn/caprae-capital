create extension if not exists pgcrypto;

create table if not exists targets (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'demo',
  company_name text not null,
  domain text not null,
  industry text not null default 'Unknown industry',
  location text not null default 'Unknown location',
  revenue numeric,
  employees integer,
  founded integer,
  owner_name text,
  email text,
  linkedin text,
  confidence text not null default 'Medium' check (confidence in ('High', 'Medium', 'Low')),
  description text not null default '',
  status text not null default 'New' check (status in ('New', 'Researching', 'Contacted', 'Qualified')),
  assignee text not null default 'Unassigned',
  follow_up date,
  next_action text not null default 'Research target',
  score integer not null check (score between 0 and 100),
  priority text not null check (priority in ('High', 'Medium', 'Low')),
  signals jsonb not null default '[]'::jsonb,
  risks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, domain)
);

create index if not exists targets_queue_idx on targets (workspace_id, score desc, updated_at desc);
create index if not exists targets_status_idx on targets (workspace_id, status);

create table if not exists target_events (
  id uuid primary key default gen_random_uuid(),
  target_id uuid not null references targets(id) on delete cascade,
  workspace_id text not null default 'demo',
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists target_events_idx on target_events (target_id, created_at desc);
