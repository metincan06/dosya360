-- ══════════════════════════════════════════════════════════
--  KULLANICIYA İSİM VERME + DAVET SİLME
-- ══════════════════════════════════════════════════════════
-- Büro sahibi, ekip üyelerine görünen bir isim verebilsin
-- ("Stj. Av. Ayşe" gibi) ve gönderdiği bekleyen daveti silebilsin.


-- ── 1) Görünen ad alanı ───────────────────────────────────
alter table public.buro_uyeleri
  add column if not exists gorunen_ad text;


-- ── 2) Ekip listesi artık görünen adı tercih etsin ────────
create or replace function public.buro_uyeleri_listesi()
returns table (kullanici_id uuid, ad text, eposta text, rol text)
language sql
stable
security definer
set search_path = public
as $fn$
  select p.id,
         coalesce(
           nullif(bu.gorunen_ad, ''),
           nullif(p.avukat_adi, ''),
           p.email
         ) as ad,
         p.email,
         coalesce(bu.rol, 'sahip') as rol
  from kullanici_profil p
  left join buro_uyeleri bu on bu.kullanici_id = p.id
  where p.id = public.aktif_buro_id()
     or bu.buro_id = public.aktif_buro_id()
$fn$;

grant execute on function public.buro_uyeleri_listesi() to authenticated;


-- ── 3) İsim verme ─────────────────────────────────────────
-- Yalnızca büro sahibi başkasına isim verir; herkes kendi adını
-- değiştirebilir. Geçmiş sohbet mesajlarındaki ad da güncellenir.

create or replace function public.uye_adi_degistir(
  p_kullanici_id uuid,
  p_ad           text
)
returns text
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_buro uuid := public.aktif_buro_id();
  v_ad   text := nullif(btrim(coalesce(p_ad, '')), '');
begin
  if v_buro is null then
    raise exception 'Oturum bulunamadı';
  end if;

  if v_ad is not null and length(v_ad) > 60 then
    raise exception 'İsim en fazla 60 karakter olabilir';
  end if;

  -- Başkasının adını yalnızca büro sahibi değiştirebilir
  if p_kullanici_id <> auth.uid() and v_buro <> auth.uid() then
    raise exception 'Bu işlem için büro sahibi olmanız gerekir';
  end if;

  -- Hedef kişi gerçekten bu büronun üyesi mi?
  if not exists (
    select 1 from buro_uyeleri
     where buro_id = v_buro and kullanici_id = p_kullanici_id
  ) and p_kullanici_id <> v_buro then
    raise exception 'Bu kişi büronuzun üyesi değil';
  end if;

  if p_kullanici_id = v_buro then
    -- Büro sahibinin kendi adı profilde tutulur
    update kullanici_profil set avukat_adi = v_ad where id = v_buro;
  else
    update buro_uyeleri
       set gorunen_ad = v_ad
     where buro_id = v_buro and kullanici_id = p_kullanici_id;
  end if;

  -- Geçmiş mesajlarda da yeni ad görünsün
  if to_regclass('public.ekip_mesajlari') is not null and v_ad is not null then
    update ekip_mesajlari
       set gonderen_ad = v_ad
     where buro_id = v_buro and gonderen_id = p_kullanici_id;
  end if;

  return coalesce(v_ad, '(kaldırıldı)');
end
$fn$;

grant execute on function public.uye_adi_degistir(uuid, text) to authenticated;


-- ── 4) Davet silme ────────────────────────────────────────
-- Bekleyen daveti iptal eder; kabul edilmiş daveti silmez.

create or replace function public.davet_sil(p_davet_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_buro  uuid := public.aktif_buro_id();
  v_email text;
  v_durum text;
begin
  if v_buro is null then
    raise exception 'Oturum bulunamadı';
  end if;

  if v_buro <> auth.uid() then
    raise exception 'Daveti yalnızca büro sahibi silebilir';
  end if;

  select email, durum into v_email, v_durum
    from davetler
   where id = p_davet_id and buro_id = v_buro;

  if v_email is null then
    raise exception 'Davet bulunamadı';
  end if;

  if v_durum = 'kabul_edildi' then
    raise exception 'Bu davet kabul edilmiş, silinemez. Kullanıcıyı ekipten çıkarın.';
  end if;

  delete from davetler where id = p_davet_id and buro_id = v_buro;
  return v_email;
end
$fn$;

grant execute on function public.davet_sil(uuid) to authenticated;


-- ── 5) DOĞRULA ────────────────────────────────────────────
select
  (select count(*) from information_schema.columns
    where table_name='buro_uyeleri' and column_name='gorunen_ad') as ad_alani,
  (select count(*) from pg_proc where proname='uye_adi_degistir')  as isim_fn,
  (select count(*) from pg_proc where proname='davet_sil')         as davet_fn;
-- Üçü de 1 olmalı
