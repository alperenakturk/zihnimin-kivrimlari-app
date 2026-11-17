"use strict";
/* Pilot sürüm için UYDURMA örnek veri. Gerçek kişi, ders ya da kurum bilgisi YOKTUR.
   Tarihler bugüne göre üretilir, böylece örnek her gün güncel görünür.
   Dosya adları ve biçimleri gerçek kasanın biçimiyle aynıdır (ileride gerçek veriye geçiş kolay olsun). */
const ORNEK = (() => {
  const p = (n) => String(n).padStart(2, "0");
  const g = (n) => { const d = new Date(); if (d.getHours() < 5) d.setDate(d.getDate() - 1); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
  const gunAdi = (n) => ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"][new Date(g(n) + "T12:00").getDay()];

  const gorevler = `# Görevler

> Örnek görev listesi (uydurma).

## 🎓 Okul
- [ ] Veritabanı ödevini bitir ⏫ ⏳ ${g(0)} 📅 ${g(1)} #okul — ER diyagramı + 5 sorgu
- [ ] İstatistik vizesine çalış ⏫ ⏳ ${g(0)} 📅 ${g(2)} #okul — 1–6. bölümler
- [ ] Web projesinin giriş sayfasını yap 🔼 ⏳ ${g(-1)} #okul — dün kalmıştı
- [ ] Grup toplantısı notlarını paylaş 🔽 ⏳ ${g(1)} #okul
- [/] Hocadan proje konusu onayı bekleniyor 🔼 #okul

## 💼 Staj & Kariyer
- [ ] CV'yi güncelle (son projeyi ekle) 🔼 ⏳ ${g(0)} #staj
- [ ] Staj ilanlarına bak ve 2 başvuru yap 🔼 ⏳ ${g(2)} 📅 ${g(5)} #staj
- [ ] Bu hafta 20 saat staj — sayaç 12 / 20 🔼 📅 ${g(4)} #staj

## 🛠 Kişisel Proje
- [ ] Uygulamanın ayarlar ekranını tasarla 🔼 ⏳ ${g(0)} #proje
- [ ] Hata raporlarını gözden geçir 🔽 ⏳ ${g(3)} #proje

## 💪 Sağlık
- [ ] Spor salonu (bacak günü) 🔼 ⏳ ${g(0)} #sağlık

## 🏠 Günlük Hayat
- [ ] Faturaları öde ⏫ ⏳ ${g(0)} 📅 ${g(0)} #hayat
- [ ] Market alışverişi 🔽 ⏳ ${g(1)} #hayat
`;

  const hafta = `# Bu Hafta

## Bu haftanın 3 işi

1. [ ] **İstatistik vizesi** için 3 gün çalış
2. [x] **Web projesi** ilk sürümü teslim ✅
3. [ ] **Staj başvurusu** en az 2 tane

## Yaklaşan tarihler
`;

  const bugun = {
    gun: g(0),
    en_onemli: "İstatistik vizesine çalış (2 gün kaldı)",
    takvim: [
      { bas: null, bit: null, baslik: "Faturaların son günü", yer: "", tur: "kisisel" },
      { bas: "09:00", bit: "10:50", baslik: "İstatistik dersi", yer: "A-201", tur: "ders" },
      { bas: "11:00", bit: "12:00", baslik: "Proje grubu toplantısı", yer: "Kütüphane", tur: "proje" },
      { bas: "13:30", bit: "16:20", baslik: "Veritabanı laboratuvarı", yer: "Lab 2", tur: "ders" },
      { bas: "18:30", bit: "20:00", baslik: "Spor salonu", yer: "", tur: "kisisel" },
      { bas: "20:30", bit: "22:00", baslik: "Masa oyunu akşamı", yer: "Kulüp odası", tur: "sosyal" },
    ],
    gunler: [],
    yaklasan: [
      { tarih: g(1), baslik: "Veritabanı ödevi teslimi", tur: "teslim" },
      { tarih: g(2), baslik: "İstatistik vizesi", tur: "sinav" },
      { tarih: g(6), baslik: "Web projesi sunumu", tur: "sinav" },
      { tarih: g(12), baslik: "Pazarlama raporu", tur: "teslim" },
    ],
  };

  // 7 günlük takvim: haftanın gününe göre örnek ders programı
  const program = {
    1: [["09:00", "10:50", "İstatistik dersi", "A-201", "ders"], ["14:00", "15:00", "Ayşe Hoca ile görüşme", "Ofis", "proje"]],
    2: [["09:00", "10:50", "İstatistik dersi", "A-201", "ders"], ["13:30", "16:20", "Veritabanı laboratuvarı", "Lab 2", "ders"]],
    3: [["10:30", "13:20", "Web geliştirme", "Lab 1", "ders"], ["17:00", "18:00", "Kulüp toplantısı", "B-110", "sosyal"]],
    4: [["09:00", "17:00", "Staj", "Ofis", "staj"]],
    5: [["13:30", "16:20", "Pazarlama", "B-305", "ders"], ["19:00", "20:00", "Spor salonu", "", "kisisel"]],
    6: [["09:00", "17:00", "Staj", "Ofis", "staj"], ["20:00", "23:00", "Aile yemeği", "", "kisisel"]],
    0: [["11:00", "12:00", "Haftalık tur", "", "kisisel"]],
  };
  for (let i = 0; i < 7; i++) {
    const gd = new Date(g(i) + "T12:00").getDay();
    const t = i === 0 ? bugun.takvim : (program[gd] || []).map(([bas, bit, baslik, yer, tur]) => ({ bas, bit, baslik, yer, tur }));
    bugun.gunler.push({ gun: g(i), takvim: t });
  }

  // alışkanlıklar: son 35 gün, sabit ama düzensiz bir desen
  const desen = Array.from({ length: 35 }, (_, i) => [0, 1, 2, 3, 4].map((k) => ((i * 7 + k * 3 + (i % 4) * k) % 5 === 0 && i % 3 !== 0 ? "0" : "1")).join(""));
  let tablo = "| Tarih | Diş | Bakım | Kaza | NBA | Para | Skor | Not |\n|---|---|---|---|---|---|---|---|\n";
  desen.forEach((d, i) => {
    const n = i - desen.length; const c = d.split("").map((x) => (x === "1" ? "✓" : ""));
    tablo += `| ${g(n)} ${gunAdi(n)} | ${c.join(" | ")} | ${d.split("1").length - 1}/5 | |\n`;
  });
  const aliskanlik = `# Alışkanlıklar\n\nÖrnek veri.\n\n${tablo}`;

  const din = `# Din Takibi

## Durum

| Kalem | Başlangıç | Net (kılınan − kaçan) | **Kalan** |
|---|---|---|---|
| Sabah | 120 | +8 | **112** |
| Öğle | 110 | +3 | **107** |
| İkindi | 105 | −2 | **107** |
| Akşam | 100 | +5 | **95** |
| Yatsı | 200 | −4 | **204** |
| Vitir | 200 | −5 | **205** |
| **Toplam kaza** | 835 | +5 | **830** |
| 21. Cüz (okuma) | 40 | 6 kayıt | 34 + her Cuma 1 |
| Kelime-i Tevhid | 10.000 | 2.000 | 8.000 + her Cuma 1.000 |

## Kayıtlar

| Tarih | Kayıt |
|---|---|
| ${g(-6)} | Sabah +2, Yatsı −1, Vitir −1 |
| ${g(-5)} | Öğle +1 |
| ${g(-4)} | Akşam +2 · 21. Cüz 1 |
| ${g(-3)} | kılınamadı: İkindi (−1) |
| ${g(-2)} | Sabah +1, Akşam +1 |
| ${g(-1)} | Yatsı +1 · Kelime-i Tevhid 1.000 |
`;

  let gym = "", uyku = "";
  [-20, -18, -15, -13, -11, -8, -6, -4, -2, -1].forEach((n) => { gym += `| ${g(n)} | |\n`; });
  [["00:30", "07:40", "7:10"], ["01:15", "08:00", "6:45"], ["23:55", "08:00", "8:05"], ["00:40", "08:10", "7:30"], ["02:10", "08:30", "6:20"], ["00:20", "08:10", "7:50"], ["00:45", "08:00", "7:15"]]
    .forEach(([y, k, sr], i) => { uyku += `| ${g(i - 7)} | ${y} | ${k} | ${sr} | |\n`; });
  const uykuGym = `# Uyku ve GYM Takibi

## Uyku

| Sabah | Yattı | Kalktı | Süre | Not |
|---|---|---|---|---|
${uyku}
## GYM

| Tarih | Not |
|---|---|
${gym}`;

  // notlar ve harita
  const notlar = {
    "00 Bu Hafta.md": hafta,
    "01 Karalama.md": "# Karalama\n\nAklına geleni buraya dök. Sonra Claude yerlerine dağıtır.\n\n- Kulüp için yeni oyun önerisi: kooperatif bir kart oyunu\n- [[Web Projesi]] için renk paleti bul\n",
    "02 Projeler/Web Projesi.md": "# Web Projesi\n\n*Durum: aktif*\n\nDers projesi: küçük bir kitap takip sitesi. Bağlı: [[Veritabanı]] · [[Web Geliştirme]] · [[Ayşe Hoca]]\n\n## Sıradaki adım\n\n- [ ] Giriş sayfası\n- [x] Veritabanı şeması\n\n| Hafta | İş | Durum |\n|---|---|---|\n| 1 | Fikir | ✅ |\n| 2 | Şema | ✅ |\n| 3 | Arayüz | ⏳ |\n",
    "02 Projeler/Staj Arayışı.md": "# Staj Arayışı\n\nHedef: yaz stajı. Bağlı: [[CV]] · [[Kariyer Fuarı]]\n\n> Her hafta en az 2 başvuru.\n",
    "03 Hakkımda/Profil.md": "# Profil\n\nÖrnek kullanıcı profili. Bölüm: Yönetim Bilişim Sistemleri (örnek). İlgi alanları: [[Web Geliştirme]], [[Veri Analizi]], masa oyunları.\n",
    "03 Hakkımda/CV.md": "# CV\n\nSon sürüm: bu ay. Eklenecek: [[Web Projesi]].\n",
    "04 Bağlantılar/Ayşe Hoca.md": "# Ayşe Hoca\n\nÖrnek hoca. Dersleri: [[Veritabanı]], [[Web Geliştirme]]. Görüşme: Salı 14:00.\n",
    "04 Bağlantılar/Web Geliştirme.md": "# Web Geliştirme\n\nKonu düğümü. Bağlı: [[Web Projesi]] · [[Veritabanı]] · [[İstatistik]]\n",
    "04 Bağlantılar/Veri Analizi.md": "# Veri Analizi\n\nKonu düğümü. Bağlı: [[İstatistik]] · [[Veritabanı]]\n",
    "04 Bağlantılar/Kariyer Fuarı.md": "# Kariyer Fuarı\n\nGelecek ay. Hazırlık: [[CV]].\n",
    "05 Günlük Sistem/Görevler.md": gorevler,
    "05 Günlük Sistem/Görevler Arşivi.md": `# Görevler Arşivi\n\n- [x] Web projesi ilk sürümü teslim 🔼 ✅ ${g(-1)} #okul\n- [x] Kütüphane kitabını iade et 🔽 ✅ ${g(-2)} #hayat\n- [x] Staj formunu imzalat ⏫ ✅ ${g(-3)} #staj\n- [x] Eski ödev dosyalarını düzenle 🔽 ✅ ${g(-5)} #okul — iptal\n- [x] Diş randevusu al 🔼 ✅ ${g(-6)} #sağlık\n`,
    "05 Günlük Sistem/Okuma ve İzleme.md": "# Okuma ve İzleme\n\n| Ne | Tür | Neden | Durum |\n|---|---|---|---|\n| Örnek kitap: Alışkanlıkların Gücü | kitap | düzen kurmak | okunuyor |\n| Örnek video: Veritabanı indeksleri | video | ders | izlenecek |\n| Örnek makale: Oyun tasarımında akış | makale | hobi | bitti |\n",
    "06 Haritalar/Drive Rehberi.md": "# Drive Rehberi\n\nÖrnek \"X nerede?\" tablosu.\n\n| Ne | Nerede |\n|---|---|\n| Güncel CV | `Kariyer/CV/` |\n| Ders notları | `Üniversite/Dersler/<dönem>/` |\n| Staj belgeleri | `Kariyer/Staj/` |\n| Fotoğraflar | `Fotoğraflar/<yıl>/` |\n\nBağlı: [[CV]] · [[Staj Arayışı]]\n",
    "05 Günlük Sistem/Alışkanlıklar.md": aliskanlik,
    "05 Günlük Sistem/Din Takibi.md": din,
    "05 Günlük Sistem/Uyku ve GYM Takibi.md": uykuGym,
    "07 Dersler/Veritabanı.md": "# Veritabanı\n\n**Hoca:** [[Ayşe Hoca]] · Salı 13:30 Lab 2\n\n## Değerlendirme\n\nVize %30 · Proje %30 · Final %40\n\n## Konular\n\n1. ER diyagramı\n2. SQL sorguları\n3. Normalizasyon\n",
    "07 Dersler/İstatistik.md": "# İstatistik\n\nPazartesi ve Salı 09:00. Vize: iki gün sonra. Bağlı: [[Veri Analizi]]\n",
    "08 Mekanlar/Kampüs.md": "# Kampüs\n\nÇalışmak için sessiz yerler: kütüphane 3. kat, [[Web Projesi]] grubu ile buluşma noktası.\n",
  };
  const dugumler = Object.keys(notlar).filter((y) => !y.includes("Günlük Sistem/A") && !y.includes("Din") && !y.includes("Uyku")).map((yol) => {
    const ad = yol.split("/").pop().replace(/\.md$/, "");
    const ozet = (notlar[yol].split("\n").find((s) => s && !/^[#|>\-*\d]/.test(s)) || "").replace(/\[\[([^\]|]+)\|?([^\]]*)\]\]/g, (_, a, b) => b || a).slice(0, 120);
    return { yol, ad, klasor: yol.includes("/") ? yol.split("/")[0] : "Kök", ozet };
  });
  const adla = new Map(dugumler.map((d) => [d.ad.toLowerCase(), d.yol]));
  const kenar = new Set();
  for (const d of dugumler) for (const m of notlar[d.yol].matchAll(/\[\[([^\]|#]+)/g)) { const h = adla.get(m[1].trim().toLowerCase()); if (h && h !== d.yol) kenar.add([d.yol, h].sort().join("\u0001")); }

  return {
    ...notlar,
    "05 Günlük Sistem/Bugün.json": JSON.stringify(bugun),
    "06 Haritalar/harita.json": JSON.stringify({ surum: 1, dugumler, kenarlar: [...kenar].map((k) => k.split("\u0001")) }),
  };
})();
