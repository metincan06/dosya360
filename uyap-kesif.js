/* ═══════════════════════════════════════════════════════════
   DOSYA360 · UYAP YAPI KEŞFİ
   ───────────────────────────────────────────────────────────
   Ne yapar : UYAP sayfasının teknik yapısını çıkarır
   Ne yapmaz: Hiçbir yere veri göndermez, hiçbir şey değiştirmez

   GİZLİLİK: İsim, TC ve telefon bilgileri otomatik maskelenir.
   Çıktıda müvekkil bilgisi görünmez.

   KULLANIM
   1. UYAP Avukat Portal'a normal şekilde girin
   2. Dosya listesi sayfasını açın
   3. F12 tuşuna basın, "Console" sekmesine geçin
   4. Konsola "allow pasting" yazıp Enter'a basın (Chrome isterse)
   5. Bu dosyanın tamamını yapıştırıp Enter'a basın
   6. Sayfada birkaç işlem yapın (sayfa çevirin, bir dosyaya girin)
   7. Konsola  d360rapor()  yazıp Enter'a basın
   8. Panoya kopyalanan metni gönderin
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';
  if (window.__d360) { console.log('%cZaten çalışıyor. Rapor için: d360rapor()', 'color:#C9A84C'); return; }
  window.__d360 = true;

  var istekler = [];
  var enFazla = 40;

  /* ── Maskeleme ───────────────────────────────────────── */
  function maskele(m) {
    if (typeof m !== 'string') return m;
    return m
      // TC kimlik
      .replace(/\b[1-9]\d{10}\b/g, '[TC]')
      // Telefon
      .replace(/\b(?:0|90|\+90)?\s?5\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}\b/g, '[TEL]')
      // IBAN
      .replace(/\bTR\d{24}\b/g, '[IBAN]')
      // E-posta
      .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[EPOSTA]')
      // JSON içindeki ad-soyad benzeri alanlar
      .replace(/("(?:ad|adi|soyad|soyadi|adSoyad|adiSoyadi|isim|unvan|kisiAdi|vekilAdi|taraf|tarafAdi|muvekkil)"\s*:\s*)"[^"]*"/gi, '$1"[AD]"')
      // Büyük harfle yazılmış üç kelimelik isimler (UYAP'ta yaygın)
      .replace(/\b[A-ZÇĞİÖŞÜ]{2,}\s+[A-ZÇĞİÖŞÜ]{2,}(\s+[A-ZÇĞİÖŞÜ]{2,})?\b/g, function (e) {
        var korunan = ['ASLIYE', 'HUKUK', 'CEZA', 'MAHKEMESI', 'MAHKEMESİ', 'ICRA', 'İCRA',
          'MUDURLUGU', 'MÜDÜRLÜĞÜ', 'BOLGE', 'BÖLGE', 'ADLIYE', 'ADLİYE', 'YARGITAY',
          'DANISTAY', 'DANIŞTAY', 'AGIR', 'AĞIR', 'SULH', 'TICARET', 'TİCARET', 'IS', 'İŞ',
          'AILE', 'AİLE', 'TUKETICI', 'TÜKETİCİ', 'KADASTRO', 'VERGI', 'VERGİ', 'IDARE', 'İDARE',
          'ESAS', 'KARAR', 'DOSYA', 'DURUSMA', 'DURUŞMA', 'TARIH', 'TARİH', 'NO', 'TC'];
        var parcalar = e.split(/\s+/);
        for (var i = 0; i < parcalar.length; i++) {
          if (korunan.indexOf(parcalar[i]) > -1) return e;
        }
        return '[AD]';
      });
  }

  function kisalt(m, n) {
    m = maskele(String(m || ''));
    return m.length > n ? m.slice(0, n) + ' …(kısaltıldı)' : m;
  }

  function kaydet(yontem, adres, durum, govde, yanit) {
    if (istekler.length >= enFazla) return;
    try {
      if (!adres) return;
      if (/\.(js|css|png|jpg|jpeg|gif|svg|woff2?|ttf|ico)(\?|$)/i.test(adres)) return;
      istekler.push({
        yontem: yontem,
        adres: String(adres).split('?')[0],
        sorgu: String(adres).indexOf('?') > -1 ? kisalt(String(adres).split('?')[1], 200) : '',
        durum: durum,
        istek: govde ? kisalt(govde, 400) : '',
        yanit: kisalt(yanit, 1400)
      });
      console.log('%c[D360] ' + yontem + ' ' + String(adres).split('?')[0],
        'color:#C9A84C;font-weight:600', durum);
    } catch (e) { }
  }

  /* ── fetch dinleyici ─────────────────────────────────── */
  var asilFetch = window.fetch;
  window.fetch = function () {
    var adres = (arguments[0] && arguments[0].url) || arguments[0];
    var ayar = arguments[1] || {};
    var yontem = ayar.method || 'GET';
    var govde = ayar.body ? String(ayar.body) : '';
    return asilFetch.apply(this, arguments).then(function (y) {
      try {
        y.clone().text().then(function (t) { kaydet(yontem, adres, y.status, govde, t); }).catch(function () { });
      } catch (e) { }
      return y;
    });
  };

  /* ── XHR dinleyici ───────────────────────────────────── */
  var asilAc = XMLHttpRequest.prototype.open;
  var asilGonder = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (y, a) {
    this.__y = y; this.__a = a;
    return asilAc.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function (govde) {
    var x = this;
    x.addEventListener('load', function () {
      kaydet(x.__y, x.__a, x.status, govde ? String(govde) : '', x.responseText);
    });
    return asilGonder.apply(this, arguments);
  };

  /* ── Sayfa yapısı ────────────────────────────────────── */
  function sayfaYapisi() {
    var s = '';
    s += 'Adres        : ' + location.href.split('?')[0] + '\n';
    s += 'Başlık       : ' + document.title + '\n';
    s += 'Ekran        : ' + screen.width + 'x' + screen.height + '\n\n';

    // Tablolar
    var tablolar = document.querySelectorAll('table, [role="grid"], .dx-datagrid');
    s += '── TABLOLAR (' + tablolar.length + ') ──\n';
    for (var i = 0; i < Math.min(tablolar.length, 4); i++) {
      var t = tablolar[i];
      s += '\n[' + (i + 1) + '] etiket=' + t.tagName.toLowerCase();
      s += ' id=' + (t.id || '—');
      s += ' sinif=' + (t.className || '—').toString().slice(0, 140) + '\n';

      var basliklar = t.querySelectorAll('th, [role="columnheader"], .dx-header-row td');
      if (basliklar.length) {
        var b = [];
        for (var j = 0; j < basliklar.length; j++) b.push(basliklar[j].textContent.trim());
        s += '    Sütunlar: ' + b.join(' | ') + '\n';
      }

      var satirlar = t.querySelectorAll('tbody tr, [role="row"], .dx-data-row');
      s += '    Satır sayısı (DOM): ' + satirlar.length + '\n';
      if (satirlar.length) {
        var ilk = satirlar[0];
        s += '    İlk satır sınıf: ' + (ilk.className || '—').toString().slice(0, 120) + '\n';
        var hucreler = ilk.querySelectorAll('td, [role="gridcell"]');
        for (var k = 0; k < Math.min(hucreler.length, 12); k++) {
          s += '      hücre[' + k + '] sinif=' + (hucreler[k].className || '—').toString().slice(0, 60)
            + ' icerik="' + kisalt(hucreler[k].textContent.trim(), 60) + '"\n';
        }
      }
    }

    // Sayfalama
    var sayfalama = document.querySelectorAll('.dx-pager, .pagination, [class*="pager"], [class*="paging"]');
    s += '\n── SAYFALAMA (' + sayfalama.length + ') ──\n';
    for (var m = 0; m < Math.min(sayfalama.length, 2); m++) {
      s += '  sinif=' + (sayfalama[m].className || '—').toString().slice(0, 140) + '\n';
      s += '  metin=' + kisalt(sayfalama[m].textContent.trim(), 160) + '\n';
    }

    // Çerçeveler
    var cerceveler = document.querySelectorAll('iframe');
    s += '\n── IFRAME (' + cerceveler.length + ') ──\n';
    for (var n = 0; n < cerceveler.length; n++) {
      s += '  src=' + (cerceveler[n].src || '—').split('?')[0] + '\n';
    }

    // Kullanılan kütüphaneler
    s += '\n── KÜTÜPHANELER ──\n';
    var kutuphaneler = {
      'DevExtreme': !!window.DevExpress,
      'jQuery': !!window.jQuery,
      'React': !!document.querySelector('#root, [data-reactroot]'),
      'Angular': !!window.ng || !!document.querySelector('[ng-version]'),
      'Vue': !!window.Vue
    };
    for (var ad in kutuphaneler) s += '  ' + ad + ': ' + (kutuphaneler[ad] ? 'var' : 'yok') + '\n';

    return s;
  }

  /* ── Rapor ───────────────────────────────────────────── */
  window.d360rapor = function () {
    var r = '';
    r += '═══ DOSYA360 · UYAP KEŞİF RAPORU ═══\n';
    r += 'Tarih: ' + new Date().toLocaleString('tr-TR') + '\n';
    r += 'NOT: İsim, TC, telefon ve e-posta bilgileri maskelenmiştir.\n\n';
    r += '████ SAYFA YAPISI ████\n\n' + sayfaYapisi();
    r += '\n\n████ AĞ İSTEKLERİ (' + istekler.length + ') ████\n';

    for (var i = 0; i < istekler.length; i++) {
      var s = istekler[i];
      r += '\n───────────────────────────────\n';
      r += s.yontem + ' ' + s.adres + '  [' + s.durum + ']\n';
      if (s.sorgu) r += 'Sorgu : ' + s.sorgu + '\n';
      if (s.istek) r += 'Gönderilen:\n' + s.istek + '\n';
      r += 'Dönen:\n' + s.yanit + '\n';
    }

    console.log(r);
    try {
      copy(r);
      console.log('%c✓ Panoya kopyalandı — yapıştırıp gönderebilirsiniz',
        'color:#12805C;font-weight:600;font-size:13px');
    } catch (e) {
      console.log('%cKopyalanamadı. Yukarıdaki metni elle seçip kopyalayın.', 'color:#B45309');
    }
    return istekler.length + ' istek, ' + r.length + ' karakter';
  };

  console.log('%c✓ Dosya360 keşif betiği çalışıyor',
    'color:#12805C;font-weight:600;font-size:14px');
  console.log('%cŞimdi: sayfa çevirin, bir dosyaya girin, duruşma listesine bakın.',
    'color:#475467');
  console.log('%cSonra konsola şunu yazın:  d360rapor()',
    'color:#C9A84C;font-weight:600;font-size:13px');
})();
