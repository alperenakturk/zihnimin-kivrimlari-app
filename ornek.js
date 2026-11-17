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
    yaklasan: [
      { tarih: g(1), baslik: "Veritabanı ödevi teslimi", tur: "teslim" },
      { tarih: g(2), baslik: "İstatistik vizesi", tur: "sinav" },
      { tarih: g(6), baslik: "Web projesi sunumu", tur: "sinav" },
      { tarih: g(12), baslik: "Pazarlama raporu", tur: "teslim" },
    ],
  };

  // alışkanlıklar: son 20 gün, sabit ama düzensiz bir desen
  const desen = ["11101", "11011", "10111", "11111", "01101", "11110", "11011", "10101", "11111", "11101", "01111", "11011", "11111", "10110", "11101", "11111", "11010", "01111", "11111", "11101"];
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
`;

  let gym = "", uyku = "";
  [-6, -4, -2, -1].forEach((n) => { if (g(n) >= g(-((new Date(g(0) + "T12:00").getDay() + 6) % 7))) gym += `| ${g(n)} | |\n`; });
  ["7:10", "6:45", "8:05", "7:30", "6:20", "7:50", "7:15"].forEach((s, i) => { uyku += `| ${g(i - 7)} | 00:30 | 07:40 | ${s} | |\n`; });
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
