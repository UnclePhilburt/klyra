-- Purchase records are written only by the trusted commerce backend.
create table public.supporter_orders (
 id uuid primary key,
 user_id uuid not null references auth.users(id),
 environment text not null check (environment in ('sandbox','production')),
 square_order_id text unique,
 created_at timestamptz not null default now()
);
create table public.supporter_payments (
 payment_id text primary key,
 order_id uuid not null references public.supporter_orders(id),
 status text not null,
 amount bigint not null,
 refunded bigint not null default 0,
 currency text not null,
 square_updated_at timestamptz not null,
 receipt_url text,
 updated_at timestamptz not null default now()
);
alter table public.supporter_orders enable row level security;
alter table public.supporter_payments enable row level security;
revoke all on public.supporter_orders, public.supporter_payments from anon, authenticated;
grant select on public.supporter_orders, public.supporter_payments to authenticated;
grant all on public.supporter_orders, public.supporter_payments to service_role;
create policy supporter_own_orders on public.supporter_orders for select to authenticated using (user_id=auth.uid());
create policy supporter_own_payments on public.supporter_payments for select to authenticated using
 (exists(select 1 from public.supporter_orders o where o.id=order_id and o.user_id=auth.uid()));
-- Out-of-order or duplicate webhook deliveries cannot overwrite newer state.
create function public.record_supporter_payment(p_payment_id text,p_order_id uuid,p_status text,p_amount bigint,p_refunded bigint,p_currency text,p_updated timestamptz,p_receipt text)
returns void language sql security definer set search_path=public as $$
 insert into supporter_payments(payment_id,order_id,status,amount,refunded,currency,square_updated_at,receipt_url)
 values(p_payment_id,p_order_id,p_status,p_amount,p_refunded,p_currency,p_updated,p_receipt)
 on conflict(payment_id) do update set status=excluded.status,amount=excluded.amount,refunded=excluded.refunded,
 currency=excluded.currency,square_updated_at=excluded.square_updated_at,receipt_url=excluded.receipt_url,updated_at=now()
 where excluded.square_updated_at >= supporter_payments.square_updated_at;
$$;
revoke all on function public.record_supporter_payment(text,uuid,text,bigint,bigint,text,timestamptz,text) from public,anon,authenticated;
grant execute on function public.record_supporter_payment(text,uuid,text,bigint,bigint,text,timestamptz,text) to service_role;
