# Zihnimin Kıvrımları · uygulama

Telefona kurulan kişisel günlük panel (PWA). Tek kullanıcı içindir. Kurulum ya da derleme gerektirmez: düz HTML, CSS ve JavaScript.

## Ne yapar?

- **☀️ Bugün:** kasadaki `05 Günlük Sistem/Görevler.md` dosyasından bugünün ve geciken görevleri, `00 Bu Hafta.md` dosyasından haftanın 3 işini gösterir. Her görev için **Bitti / Kısmen / Yarına / Gün / İptal** seçilir.
- **✍️ Giriş:** kafandan geçenler (karalama), günlük işler (diş, bakım, NBA, para, GYM), kaza namazı sayaçları ve vaktinde kılınamayan vakitler, staj saati, uyku saatleri.
- **Kaydet:** her şey tek bir dosyaya yazılır: `05 Günlük Sistem/Girdiler/YYYY-MM-DD.md`. Görevleri, alışkanlıkları, din takibini ve takvimi Claude (sabah/gece brifi) bu dosyaya göre günceller. Kurallar kasanın `CLAUDE.md` → "📱 Uygulama girdileri" bölümünde.
- Gün dönümü **05:00**: gece yarısından sonra girilenler bir önceki güne yazılır.
- Kaydedilmemiş girişler telefonda taslak olarak tutulur.

## Gizlilik

- Bu repoda kişisel veri yoktur. Veri, çalışma anında GitHub anahtarıyla gizli kasa reposundan okunur.
- Anahtar yalnızca telefonun tarayıcısında (localStorage) saklanır, hiçbir sunucuya gönderilmez (yalnızca api.github.com).
- `demo/` klasörü kasadan kopyalanmış veri içerir ve `.gitignore` ile dışarıda tutulur.

## Anahtar (token) nasıl alınır?

1. github.com → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token.
2. Repository access: **Only select repositories** → yalnızca kasa reposu.
3. Permissions → Repository permissions → **Contents: Read and write**. Başka izin verme.
4. Süreyi seç (ör. 1 yıl), oluştur, uygulamanın **Ayarlar** ekranına yapıştır → "Kaydet ve bağlan".

## Telefona kurulum

- **Android (Chrome):** siteyi aç → ⋮ menü → **Ana ekrana ekle / Uygulamayı yükle**.
- **iPhone (Safari):** siteyi aç → Paylaş → **Ana Ekrana Ekle**.

## Yerelde deneme

```bash
py -m http.server 8765
```

Sonra `http://localhost:8765/?demo` adresini aç. Demo modu `demo/` klasöründen okur ve hiçbir şey kaydetmez.

## 2. sürüm (Canlı tema)

- **Bugün:** selam, günün en önemli işi ve sıradaki sınava kalan gün, takvim şeridi (şu anki etkinlik vurgulu), kategori filtreleri, ilerleme halkası. Görev kartında **Bitti / Yarına / Diğer** (Diğer: Kısmen, başka güne al, İptal, kararı geri al).
- **Harita:** notların bağlantı haritası (dokununca not açılır), klasör kartları, arama, not okuyucu (bağlantılardan nota geçiş, "bu nota bağlı notlar").
- **Gidişat:** son 14 günün alışkanlık ısı haritası ve serileri, kalan kaza, haftalık GYM, staj ve uyku ortalaması.
- Hafif titreşim ve animasyonlar (sistemde "hareketi azalt" açıksa kapanır).

Okunan ek dosyalar (kullanıcının reposunda): `05 Günlük Sistem/Bugün.json` (sabah brifi yazar: günün özeti, takvim, yaklaşanlar) ve `06 Haritalar/harita.json` (notların bağlantı haritası; kasadaki bir betik üretir).

## Güvenlik

- Sayfada katı bir içerik güvenlik politikası (CSP) var: betik ve stil yalnızca bu siteden yüklenir, ağ isteği yalnızca `api.github.com`'a gidebilir. Dış kütüphane, takip kodu ya da analitik yoktur.
- Notlar ekrana HTML olarak değil, kaçışlanmış metin olarak basılır; not içindeki HTML ya da betik çalışmaz.
- Ayarlar → "Bu cihazdan anahtarı ve verileri sil" ile telefon tamamen temizlenir.

## Sıradaki

- Bildirimler, haritada yakınlaştırma.
