/* Dosya360 Web Asistanı — yükleyici
   Kullanım: <script src="https://dosya360.com/bot.js" data-buro="BURO_ID"></script>
   Bağımlılık yok. Hata durumunda sessizce durur, ana siteyi etkilemez. */
(function () {
  'use strict';

  try {
    if (window.__d360Bot) return;
    window.__d360Bot = true;

    var script = document.currentScript;
    if (!script) {
      var hepsi = document.getElementsByTagName('script');
      for (var i = hepsi.length - 1; i >= 0; i--) {
        if (hepsi[i].src && hepsi[i].src.indexOf('bot.js') > -1) { script = hepsi[i]; break; }
      }
    }
    if (!script) return;

    var buro = script.getAttribute('data-buro');
    if (!buro) {
      try { console.log('[Dosya360] data-buro bulunamadi'); } catch (e) {}
      return;
    }

    var kaynak = script.src.replace(/\/bot\.js.*$/, '');
    var konum  = (script.getAttribute('data-konum') || 'sag').toLowerCase();
    var sag    = konum !== 'sol';

    var KAPALI_G = 168, KAPALI_Y = 56;
    var ACIK_G   = 380, ACIK_Y   = 580;

    var kutu = document.createElement('div');
    kutu.id = 'd360-bot';
    kutu.style.cssText = [
      'position:fixed',
      'bottom:20px',
      (sag ? 'right:20px' : 'left:20px'),
      'width:' + KAPALI_G + 'px',
      'height:' + KAPALI_Y + 'px',
      'z-index:2147483000',
      'border:0',
      'background:transparent',
      'transition:width .18s ease,height .18s ease',
      'max-width:calc(100vw - 40px)',
      'max-height:calc(100vh - 40px)',
      'pointer-events:none'
    ].join(';');

    var cerceve = document.createElement('iframe');
    cerceve.title = 'Web asistanı';
    cerceve.setAttribute('allow', 'clipboard-write');
    cerceve.style.cssText = 'width:100%;height:100%;border:0;background:transparent;color-scheme:normal;pointer-events:auto';

    var adres = kaynak + '/bot.html'
      + '?buro=' + encodeURIComponent(buro)
      + '&host=' + encodeURIComponent(location.hostname)
      + '&url='  + encodeURIComponent(location.href.slice(0, 300))
      + '&konum=' + (sag ? 'sag' : 'sol');

    cerceve.src = adres;
    kutu.appendChild(cerceve);

    function yerlestir() {
      if (document.body) document.body.appendChild(kutu);
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', yerlestir);
    } else {
      yerlestir();
    }

    window.addEventListener('message', function (olay) {
      if (!olay.data || olay.data.kaynak !== 'd360') return;
      if (olay.origin !== kaynak && kaynak.indexOf(olay.origin) !== 0) {
        try { console.log('[Dosya360] mesaj reddedildi', { gelen: olay.origin, beklenen: kaynak }); } catch (e) {}
        return;
      }

      if (olay.data.tip === 'ac') {
        var mobil = window.innerWidth < 480;
        kutu.style.width  = mobil ? 'calc(100vw - 24px)' : ACIK_G + 'px';
        kutu.style.height = mobil ? 'calc(100vh - 24px)' : ACIK_Y + 'px';
        if (mobil) { kutu.style.bottom = '12px'; kutu.style[sag ? 'right' : 'left'] = '12px'; }
      } else if (olay.data.tip === 'kapat') {
        kutu.style.width  = KAPALI_G + 'px';
        kutu.style.height = KAPALI_Y + 'px';
        kutu.style.bottom = '20px';
        kutu.style[sag ? 'right' : 'left'] = '20px';
      } else if (olay.data.tip === 'gizle') {
        kutu.style.display = 'none';
      }
    });
  } catch (e) {
    /* sessiz: ana site etkilenmesin */
  }
})();
