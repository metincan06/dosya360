-- ══════════════════════════════════════════════════════════
--  PAKET BAŞVURULARI — ana sayfadaki "Başlayın" formu
-- ══════════════════════════════════════════════════════════

create table if not exists public.paket_basvurulari (
  id          uuid primary key default gen_random_uuid(),
  ad          text not null,
  buro_adi    text,
  email       text not null,
  telefon     text,
  paket       text not null,
  kisi_sayisi text,
  not_metni   text,
  durum       text not null default 'yeni',
  kaynak_ip   text,
  olusturma   timestamptz not null default now(),
  islem_notu  text
);

create index if not exists basvuru_tarih on public.paket_basvurulari (olusturma desc);
create index if not exists basvuru_durum on public.paket_basvurulari (durum);

alter table public.paket_basvurulari enable row level security;

-- Ziyaretçi yazamaz/okuyamaz; sadece aşağıdaki fonksiyon üzerinden kayıt açılır.
-- Admin tümünü görür.
drop policy if exists "admin basvurulari gorur" on public.paket_basvurulari;
create policy "admin basvurulari gorur" on public.paket_basvurulari
  for all using (public.is_admin());

-- ── Başvuru alma fonksiyonu ───────────────────────────────
-- Anonim çağrılabilir. Aynı e-postadan 10 dakikada en fazla 2 başvuru.

create or replace function public.paket_basvuru(
  p_ad      text,
  p_email   text,
  p_paket   text,
  p_buro    text default null,
  p_telefon text default null,
  p_kisi    text default null,
  p_not     text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_son int;
  v_id  uuid;
begin
  -- Temel doğrulama
  if coalesce(trim(p_ad),'') = '' then
    return json_build_object('ok', false, 'hata', 'Ad zorunludur');
  end if;
  if coalesce(trim(p_email),'') = '' or position('@' in p_email) < 2 then
    return json_build_object('ok', false, 'hata', 'Geçerli bir e-posta girin');
  end if;
  if length(p_ad) > 120 or length(p_email) > 160
     or coalesce(length(p_buro),0) > 160 or coalesce(length(p_not),0) > 600 then
    return json_build_object('ok', false, 'hata', 'Girdiğiniz bilgiler fazla uzun');
  end if;
  if p_paket not in ('Başlangıç','Büyüme','Kurumsal') then
    return json_build_object('ok', false, 'hata', 'Geçersiz paket');
  end if;

  -- Spam koruması
  select count(*) into v_son
    from paket_basvurulari
   where lower(email) = lower(trim(p_email))
     and olusturma > now() - interval '10 minutes';
  if v_son >= 2 then
    return json_build_object('ok', false,
      'hata', 'Kısa süre içinde birden fazla başvuru aldık. Birazdan tekrar deneyin.');
  end if;

  insert into paket_basvurulari
    (ad, buro_adi, email, telefon, paket, kisi_sayisi, not_metni)
  values
    (trim(p_ad), nullif(trim(coalesce(p_buro,'')),''), lower(trim(p_email)),
     nullif(trim(coalesce(p_telefon,'')),''), p_paket, p_kisi,
     nullif(trim(coalesce(p_not,'')),''))
  returning id into v_id;

  return json_build_object('ok', true, 'id', v_id);
end;
$fn$;

revoke all on function public.paket_basvuru(text,text,text,text,text,text,text) from public;
grant execute on function public.paket_basvuru(text,text,text,text,text,text,text)
  to anon, authenticated;

-- ── Admin paneli için liste ───────────────────────────────
create or replace function public.basvuru_listesi()
returns setof public.paket_basvurulari
language sql
stable
security definer
set search_path = public
as $fn$
  select * from paket_basvurulari
   where public.is_admin()
   order by olusturma desc
   limit 500
$fn$;

create or replace function public.basvuru_durum_degistir(p_id uuid, p_durum text, p_not text default null)
returns json
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if not public.is_admin() then
    return json_build_object('ok', false, 'hata', 'Yetkisiz');
  end if;
  if p_durum not in ('yeni','arandi','demo_verildi','satis','olumsuz') then
    return json_build_object('ok', false, 'hata', 'Geçersiz durum');
  end if;
  update paket_basvurulari
     set durum = p_durum,
         islem_notu = coalesce(p_not, islem_notu)
   where id = p_id;
  return json_build_object('ok', true);
end;
$fn$;

grant execute on function public.basvuru_listesi() to authenticated;
grant execute on function public.basvuru_durum_degistir(uuid,text,text) to authenticated;
