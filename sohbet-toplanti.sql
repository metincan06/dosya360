-- ══════════════════════════════════════════════════════════
--  EKİP SOHBETİ + TOPLANTI PLANLAMA
-- ══════════════════════════════════════════════════════════

-- ── 1) EKİP SOHBETİ ───────────────────────────────────────

create table if not exists public.ekip_mesajlari (
  id          bigserial primary key,
  buro_id     uuid not null references auth.users(id) on delete cascade,
  gonderen_id uuid not null references auth.users(id) on delete cascade,
  gonderen_ad text,
  metin       text not null,
  olusturma   timestamptz not null default now(),
  duzenlendi  boolean not null default false,
  silindi     boolean not null default false
);

create index if not exists mesaj_buro_zaman
  on public.ekip_mesajlari (buro_id, olusturma desc);

alter table public.ekip_mesajlari enable row level security;

-- Büro üyeleri kendi bürolarının mesajlarını okur
drop policy if exists "ekip mesajlari okuma" on public.ekip_mesajlari;
create policy "ekip mesajlari okuma" on public.ekip_mesajlari
  for select using (buro_id = public.aktif_buro_id());

-- Yalnızca kendi adına ve kendi bürosuna yazabilir
drop policy if exists "ekip mesajlari yazma" on public.ekip_mesajlari;
create policy "ekip mesajlari yazma" on public.ekip_mesajlari
  for insert with check (
    buro_id = public.aktif_buro_id() and gonderen_id = auth.uid()
  );

-- Kendi mesajını düzenleyip silebilir
drop policy if exists "kendi mesajini duzenle" on public.ekip_mesajlari;
create policy "kendi mesajini duzenle" on public.ekip_mesajlari
  for update using (gonderen_id = auth.uid() and buro_id = public.aktif_buro_id());

-- Okundu bilgisi: kullanıcı en son ne zaman baktı
create table if not exists public.sohbet_okuma (
  buro_id      uuid not null references auth.users(id) on delete cascade,
  kullanici_id uuid not null references auth.users(id) on delete cascade,
  son_okuma    timestamptz not null default now(),
  primary key (buro_id, kullanici_id)
);

alter table public.sohbet_okuma enable row level security;
drop policy if exists "kendi okuma kaydi" on public.sohbet_okuma;
create policy "kendi okuma kaydi" on public.sohbet_okuma
  for all using (kullanici_id = auth.uid());

create or replace function public.sohbet_okundu()
returns void
language sql
security definer
set search_path = public
as $fn$
  insert into sohbet_okuma (buro_id, kullanici_id, son_okuma)
  values (public.aktif_buro_id(), auth.uid(), now())
  on conflict (buro_id, kullanici_id) do update set son_okuma = now()
$fn$;

create or replace function public.sohbet_okunmamis()
returns int
language sql
stable
security definer
set search_path = public
as $fn$
  select coalesce(count(*), 0)::int
    from ekip_mesajlari m
   where m.buro_id = public.aktif_buro_id()
     and m.gonderen_id <> auth.uid()
     and m.silindi = false
     and m.olusturma > coalesce(
       (select son_okuma from sohbet_okuma
         where buro_id = public.aktif_buro_id() and kullanici_id = auth.uid()),
       '1970-01-01'::timestamptz)
$fn$;

grant execute on function public.sohbet_okundu()    to authenticated;
grant execute on function public.sohbet_okunmamis() to authenticated;


-- ── 2) TOPLANTILAR ────────────────────────────────────────

create table if not exists public.toplantilar (
  id            uuid primary key default gen_random_uuid(),
  buro_id       uuid not null references auth.users(id) on delete cascade,
  olusturan_id  uuid not null references auth.users(id) on delete cascade,
  olusturan_ad  text,
  baslik        text not null,
  aciklama      text,
  baslangic     timestamptz not null,
  sure_dk       int not null default 30,
  tur           text not null default 'muvekkil',  -- muvekkil | ekip
  toplanti_url  text,
  muvekkil_id   text,
  muvekkil_ad   text,
  dava_no       text,
  katilimcilar  jsonb not null default '[]'::jsonb, -- [{ad, email, tur}]
  davet_gonderildi boolean not null default false,
  durum         text not null default 'planlandi',  -- planlandi | tamamlandi | iptal
  etkinlik_id   text,
  olusturma     timestamptz not null default now()
);

create index if not exists toplanti_buro_zaman
  on public.toplantilar (buro_id, baslangic);

alter table public.toplantilar enable row level security;

drop policy if exists "buro toplantilari" on public.toplantilar;
create policy "buro toplantilari" on public.toplantilar
  for all using (buro_id = public.aktif_buro_id());


-- ── 3) Modül kaydı ────────────────────────────────────────
do $blok$
begin
  if to_regclass('public.moduller') is not null then
    insert into moduller (kod, ad, aciklama, sira, cekirdek) values
      ('sohbet',   'Ekip Sohbeti',       'Büro içi yazışma',              55, false),
      ('toplanti', 'Toplantı Planlama',  'Müvekkil ve ekip görüşmeleri',  56, false)
    on conflict (kod) do nothing;
  end if;

  if to_regclass('public.paket_moduller') is not null then
    insert into paket_moduller (paket_adi, modul_kod) values
      ('Buyume','sohbet'), ('Kurumsal','sohbet'),
      ('Buyume','toplanti'), ('Kurumsal','toplanti')
    on conflict do nothing;
  end if;
end
$blok$;
