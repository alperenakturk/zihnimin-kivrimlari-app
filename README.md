# Zihnimin Kıvrımları · uygulama (pilot)

Telefona kurulan kişisel günlük panel (PWA). Tek kullanıcı içindir. Derleme gerektirmez: düz HTML, CSS ve JavaScript.

> **Pilot sürüm:** uygulama hiçbir hesaba, sunucuya ya da API'ye bağlanmaz ve anahtar istemez. Ekrandaki görevler, notlar ve sayılar `ornek.js` içindeki **uydurma** örnek veridir. Kaydedilen girişler yalnızca cihazın tarayıcısında (localStorage) kalır.

Adres: https://zihnimin-kivrimlari.swm-server.workers.dev (Cloudflare Workers, sabit dosyalar)

## Ekranlar

- **☀️ Bugün:** selam, günün en önemli işi ve sıradaki sınava kalan gün, takvim şeridi, kategori filtreleri, ilerleme halkası. Görev kartında **Bitti / Yarına / Diğer** (Kısmen, başka güne al, İptal, kararı geri al).
- **✍️ Giriş:** karalama, günlük işler, kaza namazı sayaçları ve kaçan vakitler, staj saati, uyku saatleri.
- **◎ Harita:** notların bağlantı haritası, klasör kartları, arama, not okuyucu.
- **▤ Gidişat:** 14 günlük alışkanlık ısı haritası ve seriler, kalan kaza, haftalık GYM, staj ve uyku.

## Güvenlik

- Sayfa dışarıya hiçbir istek atamaz: içerik güvenlik politikası (CSP) `connect-src 'self'`; dış betik, stil, yazı tipi, analitik ya da takip kodu yok.
- Sunucu başlıkları (`_headers`): CSP, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy` (kamera, mikrofon, konum kapalı), HSTS.
- Notlar kaçışlanmış metin olarak basılır; not içindeki HTML ya da betik çalışmaz.
- Ayarlar → "Bu cihazdaki girişleri ve ayarları sil".
- Bu repoda kişisel veri yoktur ve olmamalıdır. `demo/` (yerel deneme verisi) `.gitignore` ile dışarıda tutulur.

## Telefona kurulum

- **Android (Chrome):** adresi aç → ⋮ → **Uygulamayı yükle**.
- **iPhone (Safari):** adresi aç → Paylaş → **Ana Ekrana Ekle**.

## Yerelde deneme ve yayın

```bash
py -m http.server 8765
```

Yayın: dosyalar (index.html, styles.css, app.js, ornek.js, sw.js, manifest, simgeler, `_headers`) Cloudflare Workers'a `wrangler deploy` ile yüklenir (`assets.directory`).

## Sonra

Gerçek veriye geçiş ayrı ve güvenli bir bağlantı yöntemiyle (kişisel adres + kimlik doğrulama) ele alınacak; o zamana kadar uygulama yalnızca örnek veriyle çalışır.
