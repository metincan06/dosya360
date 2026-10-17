-- ══════════════════════════════════════════════════════════
--  GERÇEK ZAMANLI SOHBET — yayını aç
-- ══════════════════════════════════════════════════════════
-- Supabase Realtime, bir tablodaki değişiklikleri ancak o tablo
-- "supabase_realtime" yayınına eklendiyse dinleyicilere gönderir.


-- ── ADIM 1 · ÖNCE BAK ─────────────────────────────────────
-- ekip_mesajlari listede görünüyor mu?

select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
order by tablename;


-- ── ADIM 2 · YAYINA EKLE ──────────────────────────────────
do $blok$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'ekip_mesajlari'
  ) then
    alter publication supabase_realtime add table public.ekip_mesajlari;
    raise notice 'ekip_mesajlari yayına eklendi';
  else
    raise notice 'ekip_mesajlari zaten yayında';
  end if;
end
$blok$;

-- Satırın tamamı gönderilsin (varsayılan yalnızca anahtarları yollar)
alter table public.ekip_mesajlari replica identity full;


-- ── ADIM 3 · DOĞRULA ──────────────────────────────────────
select
  (select count(*) from pg_publication_tables
    where pubname='supabase_realtime' and tablename='ekip_mesajlari') as yayinda,
  (select relreplident from pg_class where relname='ekip_mesajlari') as replica_kimlik;
-- yayinda = 1  ve  replica_kimlik = f  olmalı
