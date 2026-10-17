-- ══════════════════════════════════════════════════════════
--  RLS DÜZELTMESİ — toplantilar ve sohbet_okuma
--  Sorun: "for all" politikalarında "with check" eksikti,
--         bu yüzden INSERT reddediliyordu.
-- ══════════════════════════════════════════════════════════


-- ── ADIM 1 · ÖNCE TEŞHİS (hiçbir şey değiştirmez) ─────────
-- Uygulamaya giriş yapmış halde değil, SQL Editor'den çalıştırıyorsun;
-- bu yüzden auth.uid() burada NULL döner. Normaldir.
-- Asıl bakılacak: profil kaydın 'onayli' ve aktif mi?

select
  kp.id,
  kp.email,
  kp.buro_adi,
  kp.onay_durum,
  coalesce(kp.aktif, true) as aktif,
  case
    when kp.onay_durum <> 'onayli' then 'SORUN: profil onaylı değil → aktif_buro_id() NULL döner'
    when coalesce(kp.aktif, true) = false then 'SORUN: hesap pasif → aktif_buro_id() NULL döner'
    else 'Profil uygun'
  end as durum
from kullanici_profil kp
order by kp.created_at desc nulls last
limit 10;


-- ── ADIM 2 · POLİTİKALARI DÜZELT ──────────────────────────

-- Toplantılar
drop policy if exists "buro toplantilari" on public.toplantilar;
create policy "buro toplantilari" on public.toplantilar
  for all
  using      (buro_id = public.aktif_buro_id())
  with check (buro_id = public.aktif_buro_id());

-- Sohbet okuma kaydı
drop policy if exists "kendi okuma kaydi" on public.sohbet_okuma;
create policy "kendi okuma kaydi" on public.sohbet_okuma
  for all
  using      (kullanici_id = auth.uid())
  with check (kullanici_id = auth.uid());

-- Ekip mesajları — zaten ayrı ayrı tanımlıydı, yine de garantiye alalım
drop policy if exists "ekip mesajlari okuma" on public.ekip_mesajlari;
create policy "ekip mesajlari okuma" on public.ekip_mesajlari
  for select using (buro_id = public.aktif_buro_id());

drop policy if exists "ekip mesajlari yazma" on public.ekip_mesajlari;
create policy "ekip mesajlari yazma" on public.ekip_mesajlari
  for insert
  with check (buro_id = public.aktif_buro_id() and gonderen_id = auth.uid());

drop policy if exists "kendi mesajini duzenle" on public.ekip_mesajlari;
create policy "kendi mesajini duzenle" on public.ekip_mesajlari
  for update
  using      (gonderen_id = auth.uid() and buro_id = public.aktif_buro_id())
  with check (gonderen_id = auth.uid() and buro_id = public.aktif_buro_id());


-- ── ADIM 3 · DOĞRULA ──────────────────────────────────────
-- Her satırda "with_check" dolu olmalı (SELECT politikaları hariç).

select
  tablename  as tablo,
  policyname as politika,
  cmd        as islem,
  case when qual is null then '—' else 'var' end        as using_var,
  case when with_check is null then 'YOK' else 'var' end as with_check_var
from pg_policies
where schemaname = 'public'
  and tablename in ('toplantilar','sohbet_okuma','ekip_mesajlari')
order by tablename, policyname;
