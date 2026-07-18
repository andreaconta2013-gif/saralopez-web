create table if not exists public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  phone text not null,
  company text not null,
  monthly_sales text not null,
  services text[] not null,
  monthly_quote numeric(10,2) not null,
  email_status text not null default 'pending'
);

alter table public.quote_requests enable row level security;
