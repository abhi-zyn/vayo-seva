-- VayoSeva: run once in Supabase → SQL Editor → New query → paste → Run.
-- Users can only READ their own rows. All writes go through the app's server
-- (service-role key), after it has checked the user and verified the payment.
-- Scanned PDFs are NOT stored: only which documents were sent and page counts.

create table if not exists public.applications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  ref           text not null unique,              -- e.g. AKS-261031-4629
  service_id    text not null,                     -- id in data/services.json
  service_name  text not null,                     -- exact e-District service name
  status        text not null default 'pending_payment'
                check (status in ('pending_payment', 'paid', 'sent', 'failed')),
  fee_inr       integer not null default 0,        -- VayoSeva service fee charged
  data          jsonb not null,                    -- answers; ID numbers masked after sending
  documents     jsonb not null default '[]',       -- [{ name, pages, provided }]
  created_at    timestamptz not null default now(),
  sent_at       timestamptz
);

create index if not exists applications_user_created on public.applications (user_id, created_at desc);

create table if not exists public.payments (
  id                   uuid primary key default gen_random_uuid(),
  application_id       uuid not null references public.applications (id) on delete cascade,
  user_id              uuid not null references auth.users (id) on delete cascade,
  razorpay_order_id    text not null unique,
  razorpay_payment_id  text,
  amount_paise         integer not null,
  status               text not null default 'created'
                       check (status in ('created', 'paid', 'failed')),
  created_at           timestamptz not null default now(),
  paid_at              timestamptz
);

create index if not exists payments_application on public.payments (application_id);

-- Row-level security: each signed-in user sees only their own rows.
alter table public.applications enable row level security;
alter table public.payments enable row level security;

drop policy if exists "own applications" on public.applications;
create policy "own applications" on public.applications
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "own payments" on public.payments;
create policy "own payments" on public.payments
  for select to authenticated using (user_id = auth.uid());

-- No insert/update/delete policies on purpose: only the server (service role) writes.
