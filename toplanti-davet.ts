// Dosya360 — Toplantı daveti
// Fonksiyon adı: toplanti-davet
// Katılımcılara takvim daveti (ICS) + toplantı bağlantısı gönderir.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GONDEREN = 'Dosya360 <hello@dosya360.com>'
const DESTEK = 'hello@dosya360.com'

function kac(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function icsKacis(s: unknown): string {
  return String(s ?? '')
    .replace(/\\/g, '\\\\').replace(/;/g, '\\;')
    .replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

function katla(satir: string): string {
  if (satir.length <= 75) return satir
  let out = satir.slice(0, 75), kalan = satir.slice(75)
  while (kalan.length > 74) { out += '\r\n ' + kalan.slice(0, 74); kalan = kalan.slice(74) }
  return out + (kalan ? '\r\n ' + kalan : '')
}

const utc = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

function icsUret(t: Record<string, unknown>, katilimcilar: { ad?: string; email: string }[]): string {
  const bas = new Date(String(t.baslangic))
  const bit = new Date(bas.getTime() + Number(t.sure_dk ?? 30) * 60000)
  const url = String(t.toplanti_url ?? '')

  const aciklama = [
    String(t.aciklama ?? '').trim(),
    url ? `Katılım bağlantısı: ${url}` : '',
    t.dava_no ? `Dosya: ${t.dava_no}` : '',
    '— Dosya360',
  ].filter(Boolean).join('\n')

  const s = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Dosya360//Toplanti//TR',
    'CALSCALE:GREGORIAN', 'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:d360-tp-${t.id}@dosya360.com`,
    `DTSTAMP:${utc(new Date())}`,
    `DTSTART:${utc(bas)}`,
    `DTEND:${utc(bit)}`,
    katla('SUMMARY:' + icsKacis(t.baslik)),
    katla('DESCRIPTION:' + icsKacis(aciklama)),
    'SEQUENCE:0',
    'STATUS:CONFIRMED',
    katla(`ORGANIZER;CN=${icsKacis(t.olusturan_ad ?? 'Dosya360')}:mailto:${DESTEK}`),
  ]
  if (url) s.push(katla('LOCATION:' + icsKacis(url)))
  for (const k of katilimcilar) {
    s.push(katla(
      `ATTENDEE;CN=${icsKacis(k.ad || k.email)};RSVP=TRUE;` +
      `PARTSTAT=NEEDS-ACTION;ROLE=REQ-PARTICIPANT:mailto:${k.email}`,
    ))
  }
  s.push(
    'BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY',
    katla('DESCRIPTION:' + icsKacis('30 dakika sonra: ' + String(t.baslik ?? ''))),
    'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  )
  return s.join('\r\n')
}

function mailGovde(t: Record<string, unknown>, buroAdi: string): string {
  const bas = new Date(String(t.baslangic))
  const tarih = bas.toLocaleDateString('tr-TR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    timeZone: 'Europe/Istanbul',
  })
  const saat = bas.toLocaleTimeString('tr-TR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul',
  })
  const url = String(t.toplanti_url ?? '')

  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F4F7FC;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F7FC;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:540px;background:#fff;border-radius:16px;
        border:1px solid #E6EBF3;overflow:hidden">

        <tr><td style="padding:26px 30px;border-bottom:1px solid #EFF3F8">
          <div style="font-size:19px;font-weight:700;color:#0F1B2E;letter-spacing:-.5px">
            &#9878; Dosya360</div>
        </td></tr>

        <tr><td style="padding:30px">
          <div style="font-size:13px;color:#6B7A94;margin-bottom:6px">
            ${kac(buroAdi)} sizi bir görüşmeye davet ediyor</div>
          <div style="font-size:23px;font-weight:700;color:#0F1B2E;line-height:1.3;
            letter-spacing:-.6px;margin-bottom:22px">${kac(t.baslik)}</div>

          <table width="100%" cellpadding="0" cellspacing="0"
            style="background:#FAFBFD;border:1px solid #E3E9F2;border-radius:12px;margin-bottom:22px">
            <tr><td style="padding:16px 18px">
              <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">
                <tr>
                  <td style="padding:5px 0;color:#6B7A94;width:88px">Tarih</td>
                  <td style="padding:5px 0;color:#0F1B2E;font-weight:600">${kac(tarih)}</td>
                </tr>
                <tr>
                  <td style="padding:5px 0;color:#6B7A94">Saat</td>
                  <td style="padding:5px 0;color:#0F1B2E;font-weight:600">
                    ${kac(saat)} <span style="color:#6B7A94;font-weight:400">
                    · ${kac(t.sure_dk)} dakika</span></td>
                </tr>
                ${t.dava_no ? `<tr>
                  <td style="padding:5px 0;color:#6B7A94">Dosya</td>
                  <td style="padding:5px 0;color:#0F1B2E;font-weight:600">${kac(t.dava_no)}</td>
                </tr>` : ''}
              </table>
            </td></tr>
          </table>

          ${t.aciklama ? `<div style="font-size:14px;color:#53627A;line-height:1.65;
            margin-bottom:22px">${kac(t.aciklama)}</div>` : ''}

          ${url ? `<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
            <a href="${kac(url)}" style="display:inline-block;background:#A8822E;color:#fff;
              text-decoration:none;padding:14px 32px;border-radius:999px;font-size:15px;
              font-weight:600;letter-spacing:-.2px">Görüşmeye katıl</a>
          </td></tr></table>
          <div style="font-size:12px;color:#8D99AE;text-align:center;margin-top:12px;
            word-break:break-all">${kac(url)}</div>` : ''}

          <div style="font-size:12.5px;color:#8D99AE;margin-top:24px;padding-top:20px;
            border-top:1px solid #EFF3F8;line-height:1.6">
            Ekteki takvim dosyasını açarak görüşmeyi takviminize ekleyebilirsiniz.
            Görüşmeden 30 dakika önce hatırlatma alırsınız.
          </div>
        </td></tr>

        <tr><td style="padding:18px 30px;background:#FAFBFD;border-top:1px solid #EFF3F8;
          font-size:12px;color:#8D99AE;text-align:center">
          <a href="mailto:${DESTEK}" style="color:#8D99AE;text-decoration:none">${DESTEK}</a>
          &nbsp;·&nbsp; Dosya360
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`
}

Deno.serve(async (req) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const yetki = req.headers.get('Authorization')
    if (!yetki) {
      return new Response(JSON.stringify({ ok: false, hata: 'Yetkisiz' }),
        { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    const sbKul = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: yetki } } },
    )
    const { data: { user } } = await sbKul.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ ok: false, hata: 'Oturum geçersiz' }),
        { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    const { toplanti_id } = await req.json()
    if (!toplanti_id) {
      return new Response(JSON.stringify({ ok: false, hata: 'Toplantı kimliği eksik' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    // Toplantıyı kullanıcının kendi yetkisiyle oku — RLS başka büroyu engeller
    const { data: t, error: tErr } = await sbKul
      .from('toplantilar').select('*').eq('id', toplanti_id).maybeSingle()
    if (tErr || !t) {
      return new Response(JSON.stringify({ ok: false, hata: 'Toplantı bulunamadı' }),
        { status: 404, headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    const katilimcilar = (Array.isArray(t.katilimcilar) ? t.katilimcilar : [])
      .filter((k: { email?: string }) => k?.email && String(k.email).includes('@'))
    if (!katilimcilar.length) {
      return new Response(JSON.stringify({ ok: false, hata: 'E-postası olan katılımcı yok' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
    }
    if (katilimcilar.length > 20) {
      return new Response(JSON.stringify({ ok: false, hata: 'En fazla 20 katılımcı' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    // Büro adı
    const sbYonetim = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const { data: profil } = await sbYonetim
      .from('kullanici_profil').select('buro_adi, email')
      .eq('id', t.buro_id).maybeSingle()
    const buroAdi = profil?.buro_adi || 'Hukuk bürosu'

    const ics = icsUret(t, katilimcilar)
    const html = mailGovde(t, buroAdi)
    const ekB64 = btoa(String.fromCharCode(...new TextEncoder().encode(ics)))

    const anahtar = Deno.env.get('RESEND_API_KEY')
    if (!anahtar) {
      return new Response(JSON.stringify({ ok: false, hata: 'Mail servisi yapılandırılmamış' }),
        { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    let gonderilen = 0
    const hatalar: string[] = []
    for (const k of katilimcilar) {
      try {
        const c = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${anahtar}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: GONDEREN,
            to: [k.email],
            reply_to: profil?.email || DESTEK,
            subject: `Görüşme daveti · ${t.baslik}`,
            html,
            attachments: [{ filename: 'toplanti.ics', content: ekB64 }],
          }),
        })
        if (c.ok) gonderilen++
        else hatalar.push(`${k.email}: ${c.status}`)
      } catch (e) {
        hatalar.push(`${k.email}: ${(e as Error).message}`)
      }
    }

    if (gonderilen > 0) {
      await sbYonetim.from('toplantilar')
        .update({ davet_gonderildi: true }).eq('id', toplanti_id)
    }

    return new Response(JSON.stringify({
      ok: gonderilen > 0, gonderilen, toplam: katilimcilar.length,
      hatalar: hatalar.length ? hatalar : undefined,
    }), { headers: { ...cors, 'Content-Type': 'application/json' } })

  } catch (e) {
    return new Response(JSON.stringify({ ok: false, hata: (e as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
