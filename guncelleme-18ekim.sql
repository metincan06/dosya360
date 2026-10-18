-- ══════════════════════════════════════════════════════════
--  18 EKİM GÜNCELLEMESİ
--  1) Kullanıcı listesi düzeltmesi (davet kabul edenler görünsün)
--  2) Kayıt formu: "Bizi nereden duydunuz?"
--  3) Google Drive klasör kaydı
-- ══════════════════════════════════════════════════════════
-- NOT: Önce isim-davet.sql çalıştırılmış olmalı (gorunen_ad alanı).


-- ── 1) KULLANICI LİSTESİ ──────────────────────────────────
-- Sorun: uygulama buro_uyeleri ile kullanici_profil'i PostgREST
-- üzerinden birleştirmeye çalışıyordu; aralarında tanımlı bir
-- yabancı anahtar olmadığı için sorgu sessizce hata veriyor ve
-- liste boş kalıyordu. Artık tek fonksiyon dönüyor.

create or replace function public.buro_kullanicilari()
returns table (
  kullanici_id uuid,
  eposta       text,
  gercek_ad    text,
  gorunen_ad   text,
  rol          text,
  katilma      timestamptz,
  sahip        boolean
)
language sql
stable
security definer
set search_path = public
as $fn$
  -- Büro sahibi
  select p.id,
         p.email,
         coalesce(nullif(p.avukat_adi,''), p.email),
         null::text,
         'sahip'::text,
         p.created_at,
         true
    from kullanici_profil p
   where p.id = public.aktif_buro_id()

  union all

  -- Daveti kabul edip katılan üyeler
  select p.id,
         p.email,
         coalesce(nullif(p.avukat_adi,''), p.email),
         nullif(bu.gorunen_ad,''),
         coalesce(bu.rol,'avukat'),
         bu.created_at,
         false
    from buro_uyeleri bu
    join kullanici_profil p on p.id = bu.kullanici_id
   where bu.buro_id = public.aktif_buro_id()
   order by 7 desc, 6
$fn$;

grant execute on function public.buro_kullanicilari() to authenticated;


-- ── 2) BİZİ NEREDEN DUYDUNUZ ──────────────────────────────
alter table public.kullanici_profil
  add column if not exists kaynak       text,
  add column if not exists kaynak_detay text;

comment on column public.kullanici_profil.kaynak is
  'sosyal_medya | tv | referans | arama | baro | reklam | diger';

-- Rapor: hangi kanaldan kaç kayıt geldi
create or replace view public.kayit_kaynaklari as
select coalesce(nullif(kaynak,''),'belirtilmedi') as kanal,
       count(*) as kayit,
       max(created_at) as son_kayit
  from kullanici_profil
 group by 1
 order by 2 desc;


-- ── 3) GOOGLE DRIVE KLASÖRÜ ───────────────────────────────
-- Her avukat kendi Drive hesabına bağlanır; uygulamanın oluşturduğu
-- "Dosya360" klasörünün kimliği burada saklanır. Erişim anahtarı
-- (token) VERİTABANINDA TUTULMAZ — yalnızca tarayıcı oturumunda durur.
alter table public.kullanici_profil
  add column if not exists google_klasor_id text,
  add column if not exists google_eposta    text;


-- ── 4) DOĞRULA ────────────────────────────────────────────
select
  (select count(*) from pg_proc where proname='buro_kullanicilari') as liste_fn,
  (select count(*) from information_schema.columns
    where table_name='kullanici_profil' and column_name='kaynak') as kaynak_alani,
  (select count(*) from information_schema.columns
    where table_name='kullanici_profil' and column_name='google_klasor_id') as drive_alani;
-- Üçü de 1 olmalı

-- Kaynak dağılımını görmek için:
-- select * from kayit_kaynaklari;
