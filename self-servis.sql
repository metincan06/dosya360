-- ══════════════════════════════════════════════════════════
--  SELF SERVİS ÜYELİK + ZİYARETÇİ SAYACI
-- ══════════════════════════════════════════════════════════
-- Kayıt olan doğrudan girer. Yönetici kontrolü devam eder:
-- admin panelinden hesap dondurulabilir (buro_durum_degistir).


-- ── 1) ONAY BEKLEMESİ KALKIYOR ────────────────────────────

-- Yeni kayıtlar baştan onaylı gelsin
alter table public.kullanici_profil
  alter column onay_durum set default 'onayli';

-- Şu an beklemede olanları da aç (reddedilmişlere dokunma)
update public.kullanici_profil
   set onay_durum = 'onayli'
 where onay_durum = 'bekliyor';

-- Profil kaydı bir tetikleyiciyle oluşuyorsa o da onaylı yazsın
do $blok$
begin
  if exists (select 1 from pg_proc where proname = 'handle_new_user') then
    raise notice 'handle_new_user tetikleyicisi var — onay_durum alanını elle kontrol edin';
  end if;
end
$blok$;


-- ── 2) DENEME ABONELİĞİ ───────────────────────────────────
-- Kullanıcı Yönetimi ekranı aktif abonelik ister. Kayıt olan
-- herkese 14 günlük deneme açılır; süre dolunca erişim kesilmez,
-- yalnızca panelde "deneme bitti" görünür. Süreyi değiştirmek
-- için aşağıdaki 14 sayısını güncelleyin.

create or replace function public.deneme_acilsin()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  -- Ekip üyesine değil, yalnızca büro sahibine açılır
  if exists (select 1 from buro_uyeleri where kullanici_id = new.id) then
    return new;
  end if;
  if exists (select 1 from abonelikler where buro_id = new.id) then
    return new;
  end if;

  insert into abonelikler (buro_id, paket_adi, periyot, max_kullanici, tutar, durum, bitis)
  values (new.id, 'Deneme', 'aylik', 3, 0, 'aktif', now() + interval '14 days');

  return new;
exception when others then
  return new;   -- abonelik açılamazsa kayıt yine de tamamlansın
end
$fn$;

do $blok$
begin
  if to_regclass('public.abonelikler') is not null then
    -- bitis alanı yoksa ekle
    if not exists (select 1 from information_schema.columns
                    where table_name='abonelikler' and column_name='bitis') then
      alter table public.abonelikler add column bitis timestamptz;
    end if;

    drop trigger if exists tr_deneme_acilsin on public.kullanici_profil;
    create trigger tr_deneme_acilsin
      after insert on public.kullanici_profil
      for each row execute function public.deneme_acilsin();
  end if;
end
$blok$;

-- Hâlihazırdaki aboneliği olmayan büro sahiplerine de aç
insert into public.abonelikler (buro_id, paket_adi, periyot, max_kullanici, tutar, durum, bitis)
select kp.id, 'Deneme', 'aylik', 3, 0, 'aktif', now() + interval '14 days'
  from kullanici_profil kp
 where coalesce(kp.rol,'kullanici') <> 'admin'
   and not exists (select 1 from buro_uyeleri bu where bu.kullanici_id = kp.id)
   and not exists (select 1 from abonelikler a where a.buro_id = kp.id);


-- ── 3) ZİYARETÇİ SAYACI ───────────────────────────────────
-- Çerez yok, kişi tanımlanmaz. Yalnızca sayfa, kaynak ve gün tutulur.
-- IP ve tarayıcı bilgisi KAYDEDİLMEZ.

create table if not exists public.ziyaretler (
  id        bigserial primary key,
  gun       date not null default current_date,
  sayfa     text not null,
  kaynak    text,                       -- instagram, linkedin, google, dogrudan
  olay      text not null default 'goruntuleme',  -- goruntuleme | fiyat | basvuru_acildi
  cihaz     text,                       -- mobil | masaustu
  olusturma timestamptz not null default now()
);

create index if not exists ziyaret_gun on public.ziyaretler (gun desc);
create index if not exists ziyaret_olay on public.ziyaretler (olay, gun desc);

alter table public.ziyaretler enable row level security;

-- Siteye giren herkes yazabilir, kimse okuyamaz
drop policy if exists "ziyaret yaz" on public.ziyaretler;
create policy "ziyaret yaz" on public.ziyaretler
  for insert to anon, authenticated with check (true);

-- Kaydı anon anahtarla yazan fonksiyon — tabloya doğrudan erişim gerekmesin
create or replace function public.ziyaret_kaydet(
  p_sayfa  text,
  p_kaynak text default null,
  p_olay   text default 'goruntuleme',
  p_cihaz  text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if length(coalesce(p_sayfa,'')) > 120 then return; end if;
  if p_olay not in ('goruntuleme','fiyat','basvuru_acildi') then return; end if;

  insert into ziyaretler (sayfa, kaynak, olay, cihaz)
  values (left(p_sayfa,120), left(coalesce(p_kaynak,'dogrudan'),40), p_olay,
          case when p_cihaz = 'mobil' then 'mobil' else 'masaustu' end);
end
$fn$;

grant execute on function public.ziyaret_kaydet(text,text,text,text) to anon, authenticated;


-- ── 4) YÖNETİCİ RAPORU ────────────────────────────────────
create or replace function public.ziyaret_ozeti(p_gun int default 30)
returns json
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  v json;
begin
  if not public.is_admin() then
    return json_build_object('ok', false, 'hata', 'Yetkisiz');
  end if;

  select json_build_object(
    'ok', true,
    'gun_sayisi', p_gun,
    'toplam',   (select count(*) from ziyaretler where gun > current_date - p_gun and olay='goruntuleme'),
    'fiyat',    (select count(*) from ziyaretler where gun > current_date - p_gun and olay='fiyat'),
    'basvuru_acildi', (select count(*) from ziyaretler where gun > current_date - p_gun and olay='basvuru_acildi'),
    'basvuru_gonderildi', (select count(*) from paket_basvurulari where created_at > now() - (p_gun || ' days')::interval),
    'kayit',    (select count(*) from kullanici_profil where created_at > now() - (p_gun || ' days')::interval),
    'kaynaklar',(select coalesce(json_agg(x), '[]'::json) from (
                   select coalesce(kaynak,'dogrudan') as kaynak, count(*) as adet
                     from ziyaretler
                    where gun > current_date - p_gun and olay='goruntuleme'
                    group by 1 order by 2 desc limit 10) x),
    'gunluk',   (select coalesce(json_agg(y), '[]'::json) from (
                   select gun, count(*) as adet
                     from ziyaretler
                    where gun > current_date - p_gun and olay='goruntuleme'
                    group by 1 order by 1) y),
    'cihaz',    (select coalesce(json_agg(z), '[]'::json) from (
                   select cihaz, count(*) as adet
                     from ziyaretler
                    where gun > current_date - p_gun and olay='goruntuleme'
                    group by 1) z)
  ) into v;

  return v;
end
$fn$;

grant execute on function public.ziyaret_ozeti(int) to authenticated;


-- ── 5) DOĞRULA ────────────────────────────────────────────
select
  (select count(*) from kullanici_profil where onay_durum='bekliyor') as bekleyen_kalmadi,
  (select count(*) from pg_proc where proname='ziyaret_kaydet')       as sayac_fn,
  (select count(*) from pg_proc where proname='ziyaret_ozeti')        as rapor_fn,
  (select count(*) from pg_trigger where tgname='tr_deneme_acilsin')  as deneme_tetik;
-- bekleyen_kalmadi = 0, diğer üçü = 1 olmalı
