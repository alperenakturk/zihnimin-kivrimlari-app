# Zihnimin Kıvrımları · uygulama (pilot)

Telefona kurulan kişisel günlük panel (PWA). Tek kullanıcı içindir. Derleme gerektirmez: düz HTML, CSS ve JavaScript.

> **Varsayılan: pilot.** Uygulama kendiliğinden hiçbir hesaba ya da API'ye bağlanmaz. Ekrandaki görevler, notlar ve sayılar `ornek.js` içindeki **uydurma** örnek veridir; girişler yalnızca cihazın tarayıcısında (localStorage) kalır. GitHub kasası ve Claude bağlantısı yalnızca Ayarlar'dan bilerek açılırsa çalışır.

## Ayarlar

- **Profil:** ad. **Görünüm:** Açık / Koyu / Otomatik tema, yazı boyutu, animasyon ve titreşim. **Gün:** gün dönümü saati.
- **Veri kaynağı:** Pilot (örnek veri) ya da GitHub kasası (repo, dal, fine-grained token; yalnızca `05 Günlük Sistem/Girdiler/` altına yazar). "Bağlantıyı dene" reponun gizli olup olmadığını da söyler.
- **Yapay zekâ (Claude):** API anahtarı ve model (Opus 5.5 varsayılan, Sonnet 5.5, Haiku 5.5). Özellik: Giriş → "Karalamadan iş çıkar" (yalnızca karalama metni gönderilir, ilk kullanımda onay sorulur). Anthropic'in resmi JS SDK'sı `vendor/anthropic-sdk.js` olarak pakete dahil, yalnızca özellik kullanılınca yüklenir; Opus/Sonnet'te güvenlik reddine karşı sunucu tarafı yedek model (`fallbacks: "default"`) açık.
- **Güvenlik:** anahtarlar PIN ile şifreli kasada (AES-256-GCM, PBKDF2-SHA256 600.000 tur; PIN en az 6 karakter; 10 yanlış PIN'de kasa silinir), arka planda 5 dk sonra otomatik kilit, şimdi kilitle, PIN değiştir, anahtarları sil.
- **Veri:** girişleri JSON olarak dışa / içe aktarma (anahtarlar dosyaya yazılmaz), tüm verileri silme.

Adres: https://zihnimin-kivrimlari.swm-server.workers.dev (Cloudflare Workers, sabit dosyalar)

## Ekranlar

- **☀️ Bugün:** selam, günün en önemli işi ve sıradaki sınava kalan gün, takvim şeridi, kategori filtreleri, ilerleme halkası. Görev kartında **Bitti / Yarına / Diğer** (Kısmen, başka güne al, İptal, kararı geri al).
- **✍️ Giriş:** karalama, günlük işler, kaza namazı sayaçları ve kaçan vakitler, staj saati, uyku saatleri.
- **◎ Harita:** notların bağlantı haritası, klasör kartları, arama, not okuyucu.
- **▦ Takvim:** 7 günlük şerit; seçilen günün etkinlikleri, o günün işleri, yaklaşan sınav ve teslimler (kalan gün).
- **☰ Daha:** Tüm görevler (arama, filtreler: gecikmiş, bugün, 7 gün, bekleyen, tarihsiz; kategori grupları; son bitenler) · Alışkanlıklar (5 haftalık takvim, seri, en uzun seri, oran, haftalık skor) · Din takibi (kalan kaza, okumalar, son kayıtlar) · Uyku ve GYM (son 7 gece, ortalama, yatış düzeni, haftalık GYM) · Gidişat · Rehberler · Ayarlar.
- **＋ Yeni iş:** Bugün ve Takvim ekranından ad, kategori, önem, yapılacak gün ve son tarih ile iş ekleme; girdi dosyasına `Görevler.md` biçiminde yazılır.
- **Harita:** iki parmak / fare tekerleği ile yakınlaştırma, sürükleyerek kaydırma, +/−/⟲ düğmeleri (sayfanın kendisi büyümez).
- **Bilgisayar:** 900 px üstünde sol kenarda menü, iki sütunlu Bugün / Takvim / Giriş, ortada açılan pencereler. Chrome / Edge'de adres çubuğundaki "Yükle" simgesiyle bilgisayara da uygulama olarak kurulur.
- **▤ Gidişat:** 14 günlük alışkanlık ısı haritası ve seriler, kalan kaza, haftalık GYM, staj ve uyku.

## Güvenlik

- Sayfa yalnızca kendisine, `api.github.com` ve `api.anthropic.com`'a bağlanabilir (CSP `connect-src`); bu ikisine de yalnızca kullanıcı Ayarlar'dan bağlantıyı açarsa istek gider. Dış betik, stil, yazı tipi, analitik ya da takip kodu yok.
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
