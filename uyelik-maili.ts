// Dosya360 — Üyelik e-postası
// Supabase Edge Function · Deno
//
// Kayıt sonrası hoş geldiniz maili gönderir ve admine bildirim yollar.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SITE = 'https://dosya360.com'
const GONDEREN = 'Dosya360 <hello@dosya360.com>'
const ADMIN = 'hello@dosya360.com'

function yanit(g: unknown, d = 200) {
  return new Response(JSON.stringify(g), {
    status: d,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function hosgeldin(ad: string, buro: string) {
  return `<!DOCTYPE html>
<html lang="tr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F4F5F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F5F7;padding:32px 16px">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:10px;overflow:hidden">

    <tr><td style="background:#0B1629;padding:26px 30px">
      <div style="font-size:19px;font-weight:600;color:#C9A84C;letter-spacing:.2px">Dosya360</div>
      <div style="font-size:12px;color:rgba(255,255,255,.42);margin-top:3px">Hukuk Bürosu Yönetim Sistemi</div>
    </td></tr>

    <tr><td style="padding:32px 30px 24px">
      <div style="font-size:19px;font-weight:600;color:#0C111D;margin-bottom:12px">
        ${ad ? ad + ', hoş' : 'Hoş'} geldiniz
      </div>
      <div style="font-size:14px;color:#475467;line-height:1.7;margin-bottom:22px">
        ${buro ? '<strong>' + buro + '</strong> için hesabınız' : 'Hesabınız'} hazır.
        Onay beklemenize gerek yok; hemen giriş yapıp kullanmaya başlayabilirsiniz.
        İlk 14 gün ücretsiz deneme sürenizdir.
      </div>

      <div style="font-size:13.5px;color:#475467;line-height:1.75;background:#F9FAFB;border-radius:6px;padding:16px 18px;margin-bottom:22px">
        <div style="font-weight:600;color:#0C111D;margin-bottom:8px">Şimdi neler yapabilirsiniz</div>
        · Müvekkil ve dava kayıtlarınızı oluşturursunuz<br>
        · Duruşma tarihlerini girer, yedi gün kala uyarı alırsınız<br>
        · Müvekkile tek tıkla WhatsApp hatırlatması gönderirsiniz<br>
        · Ekibinizi davet eder, aynı veriyi paylaşırsınız
      </div>

      <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:22px">
        <tr><td style="background:#0B1629;border-radius:6px">
          <a href="${SITE}" style="display:inline-block;padding:13px 30px;font-size:14.5px;font-weight:600;color:#C9A84C;text-decoration:none">
            Hesabınıza giriş yapın
          </a>
        </td></tr>
      </table>

      <div style="font-size:12.5px;color:#98A2B3;line-height:1.65">
        Sorularınız için bu e-postayı yanıtlayabilir ya da
        <a href="https://wa.me/905439274906" style="color:#8A6D1F;text-decoration:none">WhatsApp</a>
        üzerinden bize ulaşabilirsiniz.
      </div>
    </td></tr>

    <tr><td style="padding:18px 30px;border-top:1px solid #EAECF0;background:#FCFCFD">
      <div style="font-size:12px;color:#98A2B3">
        <a href="${SITE}" style="color:#98A2B3;text-decoration:none">dosya360.com</a>
        &nbsp;·&nbsp;
        <a href="mailto:hello@dosya360.com" style="color:#98A2B3;text-decoration:none">hello@dosya360.com</a>
      </div>
    </td></tr>

  </table>
</td></tr>
</table>
</body></html>`
}

function adminBildirim(ad: string, buro: string, email: string, tel: string) {
  return `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#F4F5F7;font-family:-apple-system,Arial,sans-serif">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden">
    <div style="background:#0B1629;padding:18px 24px">
      <div style="font-size:15px;font-weight:600;color:#C9A84C">Yeni kayıt · hesap açıldı</div>
    </div>
    <div style="padding:22px 24px">
      <table style="width:100%;font-size:14px;color:#344054;border-collapse:collapse">
        <tr><td style="padding:7px 0;color:#667085;width:120px">Büro</td><td style="padding:7px 0;font-weight:600">${buro || '—'}</td></tr>
        <tr><td style="padding:7px 0;color:#667085">Avukat</td><td style="padding:7px 0">${ad || '—'}</td></tr>
        <tr><td style="padding:7px 0;color:#667085">E-posta</td><td style="padding:7px 0">${email}</td></tr>
        <tr><td style="padding:7px 0;color:#667085">Telefon</td><td style="padding:7px 0">${tel || '—'}</td></tr>
      </table>
      <div style="margin-top:18px">
        <a href="${SITE}/admin.html" style="display:inline-block;padding:11px 22px;background:#0B1629;color:#C9A84C;border-radius:6px;font-size:14px;font-weight:600;text-decoration:none">Admin panelinde aç</a>
      </div>
    </div>
  </div>
</body></html>`
}

Deno.serve(async (istek: Request) => {
  if (istek.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (istek.method !== 'POST') return yanit({ ok: false, hata: 'Yalnızca POST' }, 405)

  try {
    const yetki = istek.headers.get('Authorization')
    if (!yetki) return yanit({ ok: false, hata: 'Oturum bulunamadı' }, 401)

    const url = Deno.env.get('SUPABASE_URL')!
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const servis = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resend = Deno.env.get('RESEND_API_KEY')

    const kullanici = createClient(url, anon, { global: { headers: { Authorization: yetki } } })
    const { data: oturum, error: oHata } = await kullanici.auth.getUser()
    if (oHata || !oturum?.user) return yanit({ ok: false, hata: 'Oturum geçersiz' }, 401)

    const u = oturum.user
    const email = String(u.email || '')
    if (!email) return yanit({ ok: false, hata: 'E-posta yok' }, 400)

    const yonetim = createClient(url, servis)

    // Bu kullanıcıya daha önce gönderildi mi
    const { data: kayit } = await yonetim
      .from('islem_gunlugu').select('id')
      .eq('buro_id', u.id).eq('islem', 'hosgeldin_maili').limit(1).maybeSingle()
    if (kayit) return yanit({ ok: true, atlandi: true })

    const { data: profil } = await yonetim
      .from('kullanici_profil').select('avukat_adi, buro_adi, telefon')
      .eq('id', u.id).maybeSingle()

    const ad = profil?.avukat_adi || ''
    const buro = profil?.buro_adi || ''
    const tel = profil?.telefon || ''

    if (!resend) return yanit({ ok: false, hata: 'RESEND_API_KEY tanımlı değil' }, 500)

    const gonder = (kime: string, konu: string, html: string, yanitla?: string) =>
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resend}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: GONDEREN, to: [kime], subject: konu, html,
          reply_to: yanitla || 'hello@dosya360.com',
        }),
      })

    let uyeGitti = false
    try {
      const c = await gonder(email, 'Dosya360 · hesabınız hazır', hosgeldin(ad, buro))
      uyeGitti = c.ok
    } catch (_) { /* sessiz */ }

    // Admine bildirim — başarısız olsa da akışı bozmasın
    try {
      await gonder(ADMIN, `Yeni kayıt · ${buro || email}`, adminBildirim(ad, buro, email, tel), email)
    } catch (_) { /* sessiz */ }

    if (uyeGitti) {
      await yonetim.from('islem_gunlugu').insert({
        buro_id: u.id, islem: 'hosgeldin_maili', detay: email,
      })
    }

    return yanit({ ok: true, eposta: uyeGitti })
  } catch (e) {
    return yanit({ ok: false, hata: String(e).slice(0, 200) }, 500)
  }
})
