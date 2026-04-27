-- ============================================================
-- URCRide — Ricorrenza eventi + RLS aperto a tutti gli utenti
-- Incolla nell'SQL Editor di Supabase e clicca Run
-- ============================================================

-- ── Nuovi campi sulla tabella events ─────────────────────────
alter table public.events
  add column if not exists recurrence text default 'none'
    check (recurrence in ('none', 'weekly', 'biweekly', 'monthly')),
  add column if not exists recurrence_end_date date,
  add column if not exists recurrence_group_id uuid;

-- ── RLS: sostituisce la policy "Admin gestisce eventi" ───────
-- La policy originale blocca insert/update/delete a tutti tranne gli admin.
-- Ora separiamo i permessi: tutti possono creare, solo il creatore (o admin)
-- può modificare/eliminare.

drop policy if exists "Admin gestisce eventi" on public.events;

-- Tutti gli utenti autenticati possono creare eventi
create policy "Utenti autenticati possono creare eventi"
  on public.events for insert
  with check (auth.role() = 'authenticated');

-- Il creatore o un admin può modificare
create policy "Creatore o admin può modificare eventi"
  on public.events for update
  using (
    auth.uid() = created_by or
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- Il creatore o un admin può eliminare
create policy "Creatore o admin può eliminare eventi"
  on public.events for delete
  using (
    auth.uid() = created_by or
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );
