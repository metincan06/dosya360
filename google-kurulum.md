# Google Drive ve Takvim bağlantısı — kurulum

Bu bir kerelik senin yapacağın kurulum. Sonrasında her avukat uygulamanın
**Ayarlar** ekranından kendi Google hesabını bağlıyor; kimse başkasının
dosyasını görmüyor.

---

## Neden gerekli

Avukatın belgesi senin sunucuna değil, **kendi Drive'ına** yükleniyor.
Bunun için Google'ın "bu uygulama benim adıma dosya oluşturabilir"
iznini vermesi gerekiyor. O izni isteyebilmek için Google Cloud'da bir
**OAuth istemci kimliği** oluşturuyorsun.

Maliyeti yok. Drive ve Calendar API'leri bu kullanım için ücretsiz.

---

## 1 · Proje aç

1. [console.cloud.google.com](https://console.cloud.google.com) → giriş yap
2. Üstteki proje seçiciden **Yeni proje** → ad: `Dosya360` → Oluştur

## 2 · İki API'yi aç

Sol menü → **API'ler ve Hizmetler → Kitaplık**. Şu ikisini arayıp
**Etkinleştir** de:

- Google Drive API
- Google Calendar API

## 3 · İzin ekranı

Sol menü → **OAuth izin ekranı**

| Alan | Değer |
|---|---|
| Kullanıcı türü | **Harici** |
| Uygulama adı | Dosya360 |
| Destek e-postası | kendi adresin |
| Uygulama logosu | sitedeki logo (isteğe bağlı) |
| Uygulama ana sayfası | `https://dosya360.com` |
| Gizlilik politikası | `https://dosya360.com/kvkk.html` |
| Yetkili alan adı | `dosya360.com` |

**Kapsamlar** adımında şu üçünü ekle:

```
https://www.googleapis.com/auth/drive.file
https://www.googleapis.com/auth/calendar.events
email
```

## 4 · İstemci kimliği oluştur

Sol menü → **Kimlik Bilgileri → Kimlik bilgisi oluştur → OAuth istemci kimliği**

- Uygulama türü: **Web uygulaması**
- Ad: `Dosya360 Web`
- **Yetkili JavaScript kaynakları** — ikisini de ekle:
  ```
  https://dosya360.com
  https://www.dosya360.com
  ```
- Yönlendirme URI'si gerekmiyor, boş bırak.

Oluştur dedikten sonra çıkan **İstemci Kimliği**'ni kopyala. Şuna benzer:

```
418273645219-a1b2c3d4e5f6g7h8.apps.googleusercontent.com
```

## 5 · Uygulamaya yaz

`uygulama.html` dosyasında, dosyanın başlarında şu satır var:

```js
const GOOGLE_ISTEMCI_ID = ''
```

Tırnakların arasına kopyaladığın kimliği yapıştır:

```js
const GOOGLE_ISTEMCI_ID = '418273645219-a1b2c3d4e5f6g7h8.apps.googleusercontent.com'
```

Kaydet, GitHub'a at. Ayarlar ekranındaki "kurulum tamamlanmadı" uyarısı
kaybolur, yerine **Google hesabımı bağla** butonu gelir.

---

## 6 · Doğrulama — bunu atlama

Google, uygulamalar "hassas" kapsam istediğinde doğrulama ister.
`calendar.events` hassas sayılıyor, `drive.file` sayılmıyor.

**Doğrulanmamış haldeyken:**

- Uygulama **Test** modundayken yalnızca senin eklediğin test
  kullanıcıları (en fazla 100 e-posta) bağlanabilir.
- **Üretim**'e alırsan herkes bağlanabilir ama ilk girişte
  *"Google bu uygulamayı doğrulamadı"* uyarısı çıkar. Avukat
  **Gelişmiş → Dosya360'a git (güvenli değil)** diyerek geçebilir;
  ama bu ekran satışta güven kırar.

**Yapman gereken:** OAuth izin ekranında **Doğrulama için gönder**.
Google gizlilik politikanı, alan adı sahipliğini ve kapsamları neden
istediğini soran bir form ile 1-3 dakikalık tanıtım videosu istiyor —
videoda izin ekranını ve iznin ne işe yaradığını göstermen yeterli.
Sonuç genelde **2-6 hafta** sürüyor.

**O zamana kadarki öneri:** uygulamayı **Test** modunda bırak,
demo verdiğin avukatların e-postalarını test kullanıcısı olarak ekle.
Hem uyarı ekranı çıkmaz hem de kaç kişinin bağlandığını görürsün.
Doğrulama gelince Üretim'e alırsın.

---

## Güvenlik notları

- Erişim anahtarı (token) **veritabanına yazılmıyor**, yalnızca
  tarayıcı oturumunda duruyor. Sekme kapanınca siliniyor.
- `drive.file` kapsamı, uygulamanın **yalnızca kendi oluşturduğu**
  dosyaları görmesini sağlıyor. Avukatın diğer Drive dosyaları
  Dosya360'a görünmüyor — bunu satışta söyleyebilirsin.
- Veritabanında yalnızca bağlı Google adresi ve klasör kimliği
  tutuluyor (`google_eposta`, `google_klasor_id`).
- İstemci kimliği gizli bir bilgi değil, kaynak kodda görünmesi normal.
  Gizli olan **istemci sırrı** (client secret) — ona hiç ihtiyacımız yok,
  tarayıcıdan çalıştığımız için oluşturmana bile gerek yok.

---

## Çalışmazsa

| Belirti | Sebebi |
|---|---|
| "popup_closed" veya pencere hemen kapanıyor | JavaScript kaynağına alan adı eklenmemiş, ya da yanlış yazılmış (http/https, www farkı) |
| "access_denied" | Test modunda ve o e-posta test kullanıcısı değil |
| "idpiframe_initialization_failed" | Tarayıcı üçüncü taraf çerezleri engelliyor |
| Belge yüklenmiyor, takvim çalışıyor | Ayarlar'da "Belgeleri Drive'a yükle" kapalı |
| Oturum izni süresi doldu uyarısı | Normal, anahtar 1 saatlik. "Yenileyin" linki yeterli |
