"use strict";
/* Zihnimin Kıvrımları · kişisel günlük panel (PWA)
   PİLOT: hiçbir sunucuya bağlanmaz, anahtar istemez. Örnek (uydurma) veriyle çalışır; girişler yalnızca bu cihazda kalır.
   Okur:  05 Günlük Sistem/Görevler.md · 00 Bu Hafta.md · 05 Günlük Sistem/Bugün.json
          06 Haritalar/harita.json · Alışkanlıklar.md · Din Takibi.md · Uyku ve GYM Takibi.md · notlar
   Yazar: yalnızca 05 Günlük Sistem/Girdiler/YYYY-MM-DD.md (özet + ```json bloğu). */

const YOL = {
  gorevler: "05 Günlük Sistem/Görevler.md",
  hafta: "00 Bu Hafta.md",
  bugun: "05 Günlük Sistem/Bugün.json",
  harita: "06 Haritalar/harita.json",
  aliskanlik: "05 Günlük Sistem/Alışkanlıklar.md",
  din: "05 Günlük Sistem/Din Takibi.md",
  uyku: "05 Günlük Sistem/Uyku ve GYM Takibi.md",
  girdiKlasor: "05 Günlük Sistem/Girdiler",
};
const ALISKANLIK = [["dis", "Diş"], ["bakim", "Kişisel bakım"], ["nba", "NBA Fantasy"], ["para", "Para hesabı"], ["gym", "GYM"]];
const VAKIT = [["sabah", "Sabah"], ["ogle", "Öğle"], ["ikindi", "İkindi"], ["aksam", "Akşam"], ["yatsi", "Yatsı"], ["vitir", "Vitir"]];
const KARAR_AD = { bitti: "Bitti", kismen: "Kısmen", yarin: "Yarına", iptal: "İptal", gun: "Ertelendi" };
const KATEGORI = [
  [/okul/i, "okul", "Okul"], [/staj|kariyer/i, "staj", "Staj"], [/proje/i, "proje", "Proje"], [/geek/i, "geek", "Geek"],
  [/güvenlik/i, "guv", "Güvenlik"], [/sağlık/i, "saglik", "Sağlık"], [/hayat/i, "hayat", "Hayat"],
];
const KLASOR_RENK = {
  "02 Projeler": "proje", "03 Hakkımda": "geek", "04 Bağlantılar": "staj", "05 Günlük Sistem": "hayat",
  "06 Haritalar": "diger", "07 Dersler": "okul", "08 Mekanlar": "saglik", "Kök": "guv",
};
const TUR_RENK = { ders: "okul", sinav: "guv", staj: "staj", sosyal: "geek", proje: "proje", kisisel: "hayat", teslim: "guv" };
const SURUM_AD = "4.0 (pilot)";

const $ = (s) => document.querySelector(s);
const durum = {
  gun: gunHesapla(), gorevler: [], hafta: [], plan: null, girdi: null, girdiSha: null,
  degisti: false, kategori: "hepsi", ekran: "bugun",
  harita: null, haritaYuklendi: false, notYigini: [], gidisatYuklendi: false, sayfaGorev: null,
};

/* ---------- yardımcılar ---------- */
function iso(d) { const p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; }
function gunDonumu() { const v = Number(ayarOku().donum); return Number.isInteger(v) && v >= 0 && v <= 6 ? v : 5; }
function gunHesapla() { const d = new Date(); if (d.getHours() < gunDonumu()) d.setDate(d.getDate() - 1); return iso(d); }
function tarihNesne(g) { const [y, m, d] = g.split("-").map(Number); return new Date(y, m - 1, d); }
function gunEkle(g, n) { const d = tarihNesne(g); d.setDate(d.getDate() + n); return iso(d); }
function gunFarki(a, b) { return Math.round((tarihNesne(b) - tarihNesne(a)) / 864e5); }
function gunYazi(g) { return tarihNesne(g).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" }); }
function kisaTarih(g) {
  if (g === durum.gun) return "bugün";
  if (g === gunEkle(durum.gun, 1)) return "yarın";
  if (g === gunEkle(durum.gun, -1)) return "dün";
  return tarihNesne(g).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}
function el(etiket, sinif, metin) { const e = document.createElement(etiket); if (sinif) e.className = sinif; if (metin != null) e.textContent = metin; return e; }
function titret() { if (ayarOku().hareket === false) return; try { navigator.vibrate && navigator.vibrate(12); } catch { /* yok */ } }
function kategoriBul(bolum) { for (const [r, k, ad] of KATEGORI) if (r.test(bolum)) return { k, ad }; return { k: "diger", ad: "Diğer" }; }
function renk(k) { return getComputedStyle(document.documentElement).getPropertyValue(`--k-${k}`).trim() || "#6b7385"; }
function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

/* ---------- ayarlar ---------- */
function ayarOku() { try { return JSON.parse(localStorage.getItem("zk-ayar") || "{}"); } catch { return {}; } }
function ayarYaz(a) { try { localStorage.setItem("zk-ayar", JSON.stringify(a)); } catch { /* özel pencere */ } }
function ayarGuncelle(d) { ayarYaz({ ...ayarOku(), ...d }); }

/* ---------- PİLOT DEPOLAMA ----------
   Pilot sürüm hiçbir sunucuya bağlanmaz: okunan veri ornek.js'teki UYDURMA örnektir,
   kaydedilen girişler yalnızca bu cihazın tarayıcısında (localStorage) kalır. */
const GIRDI_ON = "zk-girdi:";
function githubModu() { return ayarOku().kaynak === "github" && Kasa.acikMi() && !!(Kasa.oku().github || {}).token; }
async function dosyaOku(yol) {
  if (githubModu()) return githubOku(yol);
  if (yol.startsWith(YOL.girdiKlasor + "/")) {
    let v = null; try { v = localStorage.getItem(GIRDI_ON + yol); } catch { /* özel pencere */ }
    return v == null ? null : { metin: v, sha: null };
  }
  const m = ORNEK[yol];
  return m == null ? null : { metin: m, sha: null };
}
async function dosyaYaz(yol, metin, mesaj, sha) {
  if (githubModu()) return githubYaz(yol, metin, mesaj, sha);
  if (!yol.startsWith(YOL.girdiKlasor + "/")) throw new Error("Pilot sürüm yalnızca kendi girişlerini kaydeder.");
  try { localStorage.setItem(GIRDI_ON + yol, metin); } catch { throw new Error("Bu tarayıcı kayda izin vermiyor (özel pencere?)."); }
  return { sha: null };
}

/* ---------- yeni işler ---------- */
const YENI_KAT = [["okul", "Okul", "okul"], ["staj", "Staj", "staj"], ["proje", "Proje", "proje"], ["hayat", "Hayat", "hayat"], ["saglik", "Sağlık", "sağlık"], ["geek", "Geek", "geek"], ["guv", "Güvenlik", "güvenlik"]];
function yeniGorevNesne(y) {
  const k = YENI_KAT.find((x) => x[0] === y.kat) || ["diger", "Diğer"];
  return { ad: y.ad, planli: y.gun || null, son: y.son || null, oncelik: y.oncelik || "🔼", not: "", bekliyor: false, bolum: k[1], kat: { k: k[0], ad: k[1] }, yeni: true };
}
function gorevleriBirlestir() {
  durum.gorevler = (durum.anaGorevler || []).concat((durum.girdi.yeni_gorevler || []).map(yeniGorevNesne));
}
function yeniAc(gun) {
  const f = $("#yeni"); $("#yeni-ad").value = ""; $("#yeni-son").value = ""; $("#yeni-gun").value = gun || durum.gun; $("#yeni-gun").min = durum.gun;
  $("#yeni-hata").hidden = true; durum.yeniKat = durum.yeniKat || "okul"; durum.yeniOnem = "🔼";
  yeniCiz(); $("#perde").hidden = false; f.hidden = false; setTimeout(() => $("#yeni-ad").focus(), 50);
}
function yeniKapat() { $("#yeni").hidden = true; if ($("#sayfa").hidden) $("#perde").hidden = true; }
function yeniCiz() {
  const kk = $("#yeni-kat"); kk.replaceChildren();
  for (const [k, ad] of YENI_KAT) {
    const b = el("button", "kat" + (durum.yeniKat === k ? " secili" : "")); b.type = "button"; b.setAttribute("role", "radio"); b.setAttribute("aria-checked", String(durum.yeniKat === k));
    const n = el("span", "kat-nokta"); n.style.background = renk(k); b.append(n, ad);
    b.addEventListener("click", () => { durum.yeniKat = k; yeniCiz(); }); kk.append(b);
  }
  for (const b of document.querySelectorAll("#yeni-onem button")) { const s = b.dataset.onem === durum.yeniOnem; b.classList.toggle("secili", s); b.setAttribute("aria-checked", String(s)); }
}
for (const b of document.querySelectorAll("#yeni-onem button")) b.addEventListener("click", () => { durum.yeniOnem = b.dataset.onem; yeniCiz(); });
$("#yeni-vazgec").addEventListener("click", yeniKapat);
$("#yeni-ad").addEventListener("input", () => { $("#yeni-hata").hidden = true; });
$("#yeni").addEventListener("submit", (e) => {
  e.preventDefault();
  const ad = $("#yeni-ad").value.trim().replace(/\s+/g, " "); const hata = $("#yeni-hata");
  const goster = (m) => { hata.textContent = m; hata.hidden = false; };
  if (ad.length < 3) return goster("Ne yapılacağını yaz (en az 3 harf).");
  if (/[⏫🔼🔽⏳📅✅#|]/u.test(ad)) return goster("Adda ⏫ ⏳ 📅 # | gibi işaretler olmasın.");
  if (durum.gorevler.some((t) => t.ad.toLocaleLowerCase("tr") === ad.toLocaleLowerCase("tr"))) return goster("Bu adla bir iş zaten var.");
  const gun = $("#yeni-gun").value || null; const son = $("#yeni-son").value || null;
  if (gun && son && son < gun) return goster("Son tarih, yapacağın günden önce olamaz.");
  durum.girdi.yeni_gorevler = durum.girdi.yeni_gorevler || [];
  durum.girdi.yeni_gorevler.push({ ad, kat: durum.yeniKat, oncelik: durum.yeniOnem, gun, son });
  gorevleriBirlestir(); titret(); degisti(); yeniKapat(); ekraniYenile();
});
for (const b of document.querySelectorAll("[data-yeni]")) b.addEventListener("click", () => yeniAc(b.dataset.yeni === "takvim" ? durum.secGun : durum.gun));
function ekraniYenile() {
  cizBugun();
  if (durum.ekran === "takvim") cizTakvimEkrani();
  if (durum.ekran === "gorevler") cizTumGorevler();
  if (durum.ekran === "giris") cizGiris();
}

/* ---------- ayrıştırma ---------- */
function gorevleriAyristir(md) {
  const sonuc = []; let bolum = "";
  for (const satir of md.split(/\r?\n/)) {
    const b = satir.match(/^##\s+(.*)$/); if (b) { bolum = b[1].trim(); continue; }
    const m = satir.match(/^- \[( |\/)\] (.*)$/); if (!m) continue;
    const g = m[2];
    sonuc.push({
      ad: g.split(/\s(?:⏫|🔼|🔽|⏳|📅|#[\p{L}\p{N}_-]|—)/u)[0].trim(),
      planli: (g.match(/⏳\s*(\d{4}-\d{2}-\d{2})/) || [])[1] || null,
      son: (g.match(/📅\s*(\d{4}-\d{2}-\d{2})/) || [])[1] || null,
      oncelik: (g.match(/[⏫🔼🔽]/u) || [""])[0],
      not: g.includes(" — ") ? g.slice(g.indexOf(" — ") + 3).trim() : "",
      bekliyor: m[1] === "/", bolum, kat: kategoriBul(bolum), satir: g,
    });
  }
  return sonuc;
}
function haftayiAyristir(md) {
  const i = md.indexOf("## Bu haftanın 3 işi"); if (i < 0) return [];
  const parca = md.slice(i).split(/\n## /)[0];
  return [...parca.matchAll(/^\d+\.\s+\[( |x)\]\s+(.*)$/gm)].map((m) => ({
    bitti: m[1] === "x",
    metin: m[2].replace(/\*\*/g, "").replace(/\[\[([^\]|]+)\\?\|?([^\]]*)\]\]/g, (_, a, b) => b || a).replace(/✅.*$/, "").trim(),
  }));
}
function tabloSatirlari(md, baslikIceren) {
  // baslikIceren içeren ilk tablo: [{sütun: değer}]
  const satirlar = md.split(/\r?\n/); const sonuc = [];
  for (let i = 0; i < satirlar.length; i++) {
    if (!satirlar[i].startsWith("|") || !satirlar[i].includes(baslikIceren)) continue;
    const bas = hucreler(satirlar[i]);
    for (let j = i + 2; j < satirlar.length && satirlar[j].startsWith("|"); j++) {
      const h = hucreler(satirlar[j]); const o = {}; bas.forEach((b, k) => (o[b] = h[k] || "")); sonuc.push(o);
    }
    break;
  }
  return sonuc;
}
function hucreler(s) { return s.replace(/\\\|/g, "\u0000").split("|").slice(1, -1).map((x) => x.replace(/\u0000/g, "|").replace(/\*\*/g, "").trim()); }
function bosGirdi(gun) {
  return { surum: 1, gun, islendi: false, guncelleme: null, gorevler: {}, aliskanlik: {}, kaza: {}, kacan: [], staj_saat: null, yatti: "", kalkti: "", karalama: "", yeni_gorevler: [] };
}
function girdiAyristir(md, gun) {
  const m = md && md.match(/```json\s*([\s\S]*?)```/); if (!m) return bosGirdi(gun);
  try { return Object.assign(bosGirdi(gun), JSON.parse(m[1])); } catch { return bosGirdi(gun); }
}
function girdiMarkdown(g) {
  const s = [`# Girdi · ${g.gun}`, "", "*Zihnimin Kıvrımları uygulamasından. Claude bu dosyayı işleyince JSON'da `\"islendi\": true` yapar; uygulama yeni giriş kaydederse tekrar `false` olur.*", "", "## Özet", ""];
  const kar = Object.entries(g.gorevler);
  if ((g.yeni_gorevler || []).length) {
    s.push("**Yeni işler** (Görevler.md biçiminde):");
    for (const y of g.yeni_gorevler) s.push(`- [ ] ${y.ad} ${y.oncelik || "🔼"}${y.gun ? " ⏳ " + y.gun : ""}${y.son ? " 📅 " + y.son : ""} #${YENI_KAT.find((k) => k[0] === y.kat)?.[2] || "diger"}`);
    s.push("");
  }
  if (kar.length) { s.push("**Görevler:**"); for (const [ad, k] of kar) s.push(`- ${ad} → ${KARAR_AD[k.karar] || k.karar}${k.gun ? " (" + k.gun + ")" : ""}`); s.push(""); }
  const y = ALISKANLIK.filter(([k]) => g.aliskanlik[k]).map(([, a]) => a); if (y.length) s.push(`**Yapılanlar:** ${y.join(", ")}`, "");
  const kz = VAKIT.filter(([k]) => g.kaza[k] > 0).map(([k, a]) => `${a} +${g.kaza[k]}`); if (kz.length) s.push(`**Kılınan kaza:** ${kz.join(", ")}`, "");
  if (g.kacan.length) s.push(`**Vaktinde kılınamayan:** ${g.kacan.map((k) => VAKIT.find((v) => v[0] === k)[1]).join(", ")}`, "");
  if (g.staj_saat) s.push(`**Staj:** ${g.staj_saat} saat`, "");
  if (g.yatti || g.kalkti) s.push(`**Uyku:** yattı ${g.yatti || "?"} · kalktı ${g.kalkti || "?"}`, "");
  if (g.karalama.trim()) s.push("**Kafamdan geçenler:**", "", g.karalama.trim(), "");
  s.push("## Veri", "", "```json", JSON.stringify(g, null, 2), "```", "");
  return s.join("\n");
}

/* ---------- BUGÜN ---------- */
function bugunMu(t) { return (t.planli && t.planli <= durum.gun) || (t.son && t.son <= durum.gun); }
function bugunListesi() { return durum.gorevler.filter((t) => !t.bekliyor && bugunMu(t)).sort(siralama); }
function siralama(a, b) {
  const p = { "⏫": 0, "🔼": 1, "": 1.5, "🔽": 2 };
  return (p[a.oncelik] - p[b.oncelik]) || String(a.son || a.planli || "9").localeCompare(String(b.son || b.planli || "9"));
}
function cizBugun() {
  const ad = ayarOku().ad; const s = new Date().getHours();
  $("#selam").textContent = (s < 12 ? "Günaydın" : s < 18 ? "İyi günler" : "İyi akşamlar") + (ad ? `, ${ad}` : "");
  $("#tarih").textContent = gunYazi(durum.gun) + " · pilot";
  cizOzet(); cizTakvim();
  const bugun = bugunListesi();
  // kategoriler
  const sayac = {}; for (const t of bugun) sayac[t.kat.k] = (sayac[t.kat.k] || { ad: t.kat.ad, n: 0 }), sayac[t.kat.k].n++;
  const kk = $("#kategoriler"); kk.replaceChildren();
  if (Object.keys(sayac).length > 1) {
    const ekle = (k, metin) => {
      const b = el("button", "kat" + (durum.kategori === k ? " secili" : ""), metin); b.setAttribute("role", "tab");
      b.addEventListener("click", () => { durum.kategori = k; cizBugun(); }); kk.append(b);
    };
    ekle("hepsi", `Hepsi ${bugun.length}`);
    for (const [k, v] of Object.entries(sayac)) ekle(k, `${v.ad} ${v.n}`);
  } else durum.kategori = "hepsi";
  const gorunen = durum.kategori === "hepsi" ? bugun : bugun.filter((t) => t.kat.k === durum.kategori);
  gorevListesi($("#gorevler"), gorunen, "Bugün için planlı iş yok. Güzel bir gün.");
  // hafta
  const h = $("#hafta"); h.replaceChildren();
  if (!durum.hafta.length) h.append(el("li", "bos", "Bu hafta için iş yazılmamış."));
  for (const x of durum.hafta) h.append(el("li", x.bitti ? "bitti" : "", (x.bitti ? "✓  " : "○  ") + x.metin));
  // bekleyen ve yaklaşan
  const ucGun = gunEkle(durum.gun, 3);
  const diger = durum.gorevler.filter((t) => !bugun.includes(t) && (t.bekliyor || (t.son && t.son <= ucGun) || (t.planli && t.planli <= ucGun))).sort(siralama);
  gorevListesi($("#bekleyenler"), diger, "Yok.");
  $("#sayac-bekleyen").textContent = diger.length || "";
  halka();
}
function halka() {
  const bugun = bugunListesi(); const n = bugun.length; const k = bugun.filter((t) => durum.girdi.gorevler[t.ad]).length;
  const oran = n ? k / n : 0;
  $("#halka-dolu").style.strokeDashoffset = String(113.1 * (1 - oran));
  $("#halka-yazi").textContent = n ? `${k}/${n}` : "–";
  $("#halka").classList.toggle("tam", n > 0 && k === n);
  $("#halka").setAttribute("aria-label", `Bugünün işlerinden ${k}/${n} karara bağlandı`);
}
function cizOzet() {
  const p = durum.plan; const kutu = $("#ozet");
  const enOnemli = p && p.gun === durum.gun && p.en_onemli ? p.en_onemli : (bugunListesi().find((t) => t.oncelik === "⏫") || {}).ad;
  const yak = ((p && p.yaklasan) || []).filter((y) => y.tarih >= durum.gun).sort((a, b) => a.tarih.localeCompare(b.tarih));
  const sinav = yak.find((y) => y.tur === "sinav") || yak[0];
  if (!enOnemli && !sinav) { kutu.hidden = true; return; }
  kutu.hidden = false;
  $("#ozet-etiket").textContent = enOnemli ? "Bugünün en önemli işi" : "Sıradaki";
  $("#ozet-is").textContent = enOnemli || "";
  $("#ozet-is").hidden = !enOnemli;
  if (sinav) {
    const f = gunFarki(durum.gun, sinav.tarih);
    $("#ozet-sinav").textContent = `${sinav.baslik} · ${f === 0 ? "bugün" : f === 1 ? "yarın" : f + " gün kaldı"}`;
  } else $("#ozet-sinav").textContent = "";
}
function cizTakvim() {
  const p = durum.plan; const kutu = $("#takvim-kutu");
  if (!p || p.gun !== durum.gun || !(p.takvim || []).length) { kutu.hidden = true; return; }
  kutu.hidden = false;
  const tg = $("#tumgun"); tg.replaceChildren(); const ol = $("#takvim"); ol.replaceChildren();
  const simdi = new Date(); const dk = simdi.getHours() * 60 + simdi.getMinutes(); const bugunGercek = iso(simdi) === durum.gun;
  const dakika = (s) => { const [h, m] = (s || "0:0").split(":").map(Number); return h * 60 + m; };
  for (const e of p.takvim) {
    if (!e.bas) { tg.append(el("span", "", e.baslik)); continue; }
    const li = el("li");
    const saat = el("span", "saat"); saat.append(el("span", "s1", e.bas), el("span", "s2", e.bit || ""));
    const serit = el("span", "serit"); serit.style.background = renk(TUR_RENK[e.tur] || "diger");
    const ic = el("div"); ic.append(el("div", "baslik", e.baslik)); if (e.yer) ic.append(el("div", "yer", e.yer));
    li.append(saat, serit, ic);
    if (bugunGercek && e.bit && dakika(e.bit) <= dk) li.classList.add("gecti");
    else if (bugunGercek && dakika(e.bas) <= dk) li.classList.add("simdi");
    ol.append(li);
  }
  ol.hidden = !ol.children.length;
}
function gorevListesi(ul, liste, bosMetin) {
  ul.replaceChildren();
  if (!liste.length) { ul.append(el("li", "bos", bosMetin)); return; }
  const sablon = $("#sablon-gorev");
  for (const t of liste) {
    const e = sablon.content.firstElementChild.cloneNode(true);
    const k = durum.girdi.gorevler[t.ad];
    const gec = (t.planli && t.planli < durum.gun) || (t.son && t.son < durum.gun);
    e.querySelector(".nokta").style.background = renk(t.kat.k);
    e.querySelector(".metin").textContent = t.ad;
    if (t.yeni) e.querySelector(".metin").append(el("span", "rozet-yeni", "yeni"));
    e.querySelector(".oncelik").textContent = t.oncelik === "⏫" ? "önemli" : "";
    const et = e.querySelector(".etiketler");
    const parcalar = [];
    if (t.bekliyor) parcalar.push("bekliyor");
    if (t.son) parcalar.push("son: " + kisaTarih(t.son));
    if (t.planli && t.planli !== t.son && !(t.planli === durum.gun)) parcalar.push("plan: " + kisaTarih(t.planli));
    parcalar.push(t.kat.ad);
    if (gec && !k) { const g = el("span", "gec", "gecikti · "); et.append(g); }
    et.append(parcalar.join(" · "));
    if (t.not) e.title = t.not;
    if (k) {
      e.classList.add("kararli", k.karar);
      const r = e.querySelector(".karar");
      r.textContent = (KARAR_AD[k.karar] || k.karar) + (k.gun ? " → " + kisaTarih(k.gun) : "");
      r.classList.add(k.karar === "yarin" || k.karar === "gun" ? "ertele" : k.karar);
    }
    for (const d of e.querySelectorAll(".dugmeler button")) {
      const kd = d.dataset.karar;
      if (k && (k.karar === kd || (kd === "diger" && ["kismen", "gun", "iptal"].includes(k.karar)))) d.classList.add("secili");
      d.addEventListener("click", () => {
        if (kd === "diger") return sayfaAc(t);
        kararVer(t, kd); e.classList.add("pop");
      });
    }
    ul.append(e);
  }
}
function kararVer(t, karar, gun) {
  const g = durum.girdi.gorevler;
  if (karar === "sil") {
    durum.girdi.yeni_gorevler = (durum.girdi.yeni_gorevler || []).filter((y) => y.ad !== t.ad); delete g[t.ad];
    gorevleriBirlestir(); titret(); degisti(); ekraniYenile(); return;
  }
  if (karar === "geri" || (g[t.ad] && g[t.ad].karar === karar && !gun)) delete g[t.ad];
  else if (karar === "yarin") g[t.ad] = { karar, gun: gunEkle(durum.gun, 1) };
  else if (karar === "kismen") g[t.ad] = { karar, gun: gun || gunEkle(durum.gun, 1) };
  else if (karar === "gun") g[t.ad] = { karar, gun };
  else g[t.ad] = { karar };
  titret(); degisti(); ekraniYenile();
}
function sayfaAc(t) {
  durum.sayfaGorev = t;
  $("#sayfa-baslik").textContent = t.ad;
  const gi = $("#sayfa-gun"); gi.value = gunEkle(durum.gun, 2); gi.min = gunEkle(durum.gun, 1);
  $("#sayfa-geri").hidden = !durum.girdi.gorevler[t.ad];
  $("#sayfa-sil").hidden = !t.yeni;
  $("#perde").hidden = false; $("#sayfa").hidden = false;
  $("#sayfa").querySelector("button").focus();
}
function sayfaKapat() { $("#perde").hidden = true; $("#sayfa").hidden = true; durum.sayfaGorev = null; }
$("#perde").addEventListener("click", () => { sayfaKapat(); yeniKapat(); if (typeof yzKapat === "function") yzKapat(); if (typeof kilitKapat === "function" && !$("#kilit").hidden) kilitKapat(false); });
for (const b of document.querySelectorAll("#sayfa button")) {
  b.addEventListener("click", () => { const t = durum.sayfaGorev; if (b.dataset.karar !== "kapat" && t) kararVer(t, b.dataset.karar); sayfaKapat(); });
}
$("#sayfa-gun").addEventListener("change", (e) => {
  const t = durum.sayfaGorev; if (t && /^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) kararVer(t, "gun", e.target.value); sayfaKapat();
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape") { if (!$("#yeni").hidden) yeniKapat(); else if (!$("#sayfa").hidden) sayfaKapat(); } });

/* ---------- GİRİŞ ---------- */
function cizGirisOzet() {
  const g = durum.girdi; const parca = [
    ["günlük işler", Object.keys(g.aliskanlik).length > 0],
    ["namaz", Object.keys(g.kaza).length > 0 || g.kacan.length > 0],
    ["staj", g.staj_saat != null],
    ["uyku", !!(g.yatti && g.kalkti)],
    ["karalama", !!g.karalama.trim()],
  ];
  const n = parca.filter((x) => x[1]).length; const kap = $("#giris-ozet"); kap.replaceChildren();
  const ic = el("div"); ic.append(el("b", "", `${n}/5 bölüm dolu`), el("small", "", n === 5 ? "Bugünün girişi tamam." : "Eksik: " + parca.filter((x) => !x[1]).map((x) => x[0]).join(", ")));
  const c = el("div", "cubuk"); const i = el("i"); c.append(i); i.style.width = `${(n / 5) * 100}%`; if (n === 5) i.style.background = "var(--iyi)";
  kap.append(ic, c);
}
function cizGiris() {
  cizGirisOzet();
  $("#karalama").value = durum.girdi.karalama;
  $("#staj").value = durum.girdi.staj_saat ?? "";
  $("#yatti").value = durum.girdi.yatti; $("#kalkti").value = durum.girdi.kalkti;
  const kap = $("#aliskanliklar"); kap.replaceChildren();
  for (const [k, ad] of ALISKANLIK) {
    const acik = !!durum.girdi.aliskanlik[k];
    const b = el("button", "kutucuk" + (acik ? " acik" : "")); b.type = "button"; b.setAttribute("aria-pressed", String(acik));
    b.append(el("span", "kare", acik ? "✓" : ""), el("span", "", ad));
    b.addEventListener("click", () => { if (acik) delete durum.girdi.aliskanlik[k]; else durum.girdi.aliskanlik[k] = true; titret(); degisti(); cizGiris(); });
    kap.append(b);
  }
  const nk = $("#namaz"); nk.replaceChildren();
  for (const [k, ad] of VAKIT) {
    const kacti = durum.girdi.kacan.includes(k); const n = durum.girdi.kaza[k] || 0;
    const sat = el("div", "vakit" + (kacti ? " kacti" : ""));
    const adb = el("button", "vakit-ad"); adb.type = "button"; adb.append(el("span", "", ad), el("small", "", kacti ? "bugün kılınamadı" : "bugün kılındı"));
    adb.addEventListener("click", () => {
      const l = durum.girdi.kacan;
      if (kacti) l.splice(l.indexOf(k), 1); else { l.push(k); if (k === "yatsi" && !l.includes("vitir")) l.push("vitir"); }
      titret(); degisti(); cizGiris();
    });
    const sy = el("div", "sayac");
    const eksi = el("button", "", "−"); eksi.type = "button"; eksi.setAttribute("aria-label", `${ad} kazasını azalt`);
    const arti = el("button", "", "+"); arti.type = "button"; arti.setAttribute("aria-label", `${ad} kazasını artır`);
    const out = el("output", "", String(n));
    eksi.addEventListener("click", () => { if (n > 0) { if (n === 1) delete durum.girdi.kaza[k]; else durum.girdi.kaza[k] = n - 1; titret(); degisti(); cizGiris(); } });
    arti.addEventListener("click", () => { durum.girdi.kaza[k] = n + 1; titret(); degisti(); cizGiris(); });
    sy.append(eksi, out, arti); sat.append(adb, sy); nk.append(sat);
  }
}
$("#karalama").addEventListener("input", (e) => { durum.girdi.karalama = e.target.value; degisti(); cizGirisOzet(); });
$("#staj").addEventListener("input", (e) => { durum.girdi.staj_saat = e.target.value === "" ? null : Number(e.target.value); degisti(); cizGirisOzet(); });
$("#yatti").addEventListener("input", (e) => { durum.girdi.yatti = e.target.value; degisti(); cizGirisOzet(); });
$("#kalkti").addEventListener("input", (e) => { durum.girdi.kalkti = e.target.value; degisti(); cizGirisOzet(); });

/* ---------- KAYDET ---------- */
let kayitMesaj = "";
function degisti() { durum.degisti = true; kayitMesaj = ""; kaydetDurum(); try { localStorage.setItem("zk-taslak", JSON.stringify(durum.girdi)); } catch { /* yok */ } }
function kaydetDurum() {
  const g = durum.girdi; const cubuk = $("#kaydet-cubugu"); const yazi = $("#kayit-durum");
  const uygun = durum.ekran === "bugun" || durum.ekran === "giris";
  let m = kayitMesaj;
  if (!m && durum.degisti) m = "Kaydedilmemiş değişiklik var";
  else if (!m && g && g.guncelleme) m = `Kaydedildi ${new Date(g.guncelleme).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}${g.islendi ? " · Claude işledi ✓" : ""}`;
  yazi.textContent = m; yazi.classList.toggle("kotu", m.startsWith("⚠"));
  $("#kaydet").hidden = !durum.degisti;
  cubuk.hidden = !uygun || !m;
}
async function kaydet() {
  const b = $("#kaydet"); b.disabled = true; kayitMesaj = "Kaydediliyor…"; kaydetDurum();
  const yedek = { islendi: durum.girdi.islendi, guncelleme: durum.girdi.guncelleme };
  durum.girdi.islendi = false; durum.girdi.guncelleme = new Date().toISOString();
  const yol = `${YOL.girdiKlasor}/${durum.gun}.md`; const mesaj = `Uygulama girdisi: ${durum.gun}`;
  try {
    let s;
    try { s = await dosyaYaz(yol, girdiMarkdown(durum.girdi), mesaj, durum.girdiSha); }
    catch (e) { if (!e.cakisma) throw e; const son = await dosyaOku(yol); s = await dosyaYaz(yol, girdiMarkdown(durum.girdi), mesaj, son && son.sha); }
    durum.girdiSha = s.sha; durum.degisti = false; titret();
    try { localStorage.removeItem("zk-taslak"); } catch { /* yok */ }
    kayitMesaj = "";
  } catch (e) {
    Object.assign(durum.girdi, yedek); kayitMesaj = "⚠️ " + e.message;
  }
  b.disabled = false; kaydetDurum();
}
$("#kaydet").addEventListener("click", kaydet);

/* ---------- HARİTA ---------- */
async function haritaYukle() {
  if (durum.haritaYuklendi) return; durum.haritaYuklendi = true;
  try {
    const r = await dosyaOku(YOL.harita);
    if (!r) throw new Error("Harita verisi yok.");
    const v = JSON.parse(r.metin);
    const adla = new Map(); const komsu = new Map();
    for (const d of v.dugumler) { adla.set(d.ad.toLowerCase(), d); komsu.set(d.yol, new Set()); }
    for (const [a, b] of v.kenarlar) { komsu.get(a)?.add(b); komsu.get(b)?.add(a); }
    durum.harita = { ...v, adla, komsu, yolla: new Map(v.dugumler.map((d) => [d.yol, d])) };
    cizKlasorler(); miniKur();
  } catch (e) { durum.haritaYuklendi = false; bilgi(e.message, "kotu"); }
}
function cizKlasorler() {
  const h = durum.harita; const say = {};
  for (const d of h.dugumler) say[d.klasor] = (say[d.klasor] || 0) + 1;
  const kap = $("#klasorler"); kap.replaceChildren();
  for (const [k, n] of Object.entries(say).sort()) {
    const b = el("button", "klasor"); b.style.borderTopColor = renk(KLASOR_RENK[k] || "diger");
    b.append(el("b", "", k.replace(/^\d+\s/, "")), el("span", "", `${n} not`));
    b.addEventListener("click", () => klasorAc(k)); kap.append(b);
  }
}
function notDugmesi(d) {
  const li = el("li"); const b = el("button"); b.append(el("b", "", d.ad), el("span", "", d.ozet || d.klasor));
  b.addEventListener("click", () => notAc(d.yol)); li.append(b); return li;
}
function haritaGorunum(ad) {
  $("#harita-ana").hidden = ad !== "ana"; $("#klasor-gorunum").hidden = ad !== "klasor"; $("#not-gorunum").hidden = ad !== "not";
  window.scrollTo({ top: 0 });
}
function klasorAc(k) {
  $("#klasor-baslik").textContent = k.replace(/^\d+\s/, "");
  const ul = $("#klasor-notlar"); ul.replaceChildren();
  for (const d of durum.harita.dugumler.filter((x) => x.klasor === k)) ul.append(notDugmesi(d));
  durum.notYigini = []; haritaGorunum("klasor");
}
$("#klasor-geri").addEventListener("click", () => haritaGorunum("ana"));
$("#not-geri").addEventListener("click", () => {
  durum.notYigini.pop(); const onceki = durum.notYigini.pop();
  if (onceki) notAc(onceki); else haritaGorunum($("#klasor-notlar").children.length ? "klasor" : "ana");
});
async function notAc(yol) {
  durum.notYigini.push(yol); haritaGorunum("not");
  const d = durum.harita.yolla.get(yol); const kap = $("#not-icerik");
  $("#not-yol").textContent = yol.replace(/\.md$/, "").split("/").join(" › ");
  kap.textContent = "Yükleniyor…";
  try {
    const r = await dosyaOku(yol); if (!r) throw new Error("Not bulunamadı.");
    kap.innerHTML = mdHtml(r.metin, d ? d.ad : "");
  } catch (e) { kap.textContent = "⚠️ " + e.message; }
  const ul = $("#not-baglar"); ul.replaceChildren();
  const komsular = [...(durum.harita.komsu.get(yol) || [])].map((y) => durum.harita.yolla.get(y)).filter(Boolean).sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
  for (const k of komsular) ul.append(notDugmesi(k));
  if (!komsular.length) ul.append(el("li", "bos", "Bağlantı yok."));
}
$("#not-icerik").addEventListener("click", (e) => {
  const w = e.target.closest(".wl"); if (!w) return;
  const d = durum.harita.adla.get(w.dataset.ad.toLowerCase()); if (d) notAc(d.yol);
});
$("#ara").addEventListener("input", (e) => {
  const q = e.target.value.trim().toLocaleLowerCase("tr"); const ul = $("#ara-sonuc"); ul.replaceChildren();
  if (!q || !durum.harita) { ul.hidden = true; return; }
  const bulunan = durum.harita.dugumler.filter((d) => (d.ad + " " + d.ozet).toLocaleLowerCase("tr").includes(q)).slice(0, 20);
  for (const d of bulunan) ul.append(notDugmesi(d));
  if (!bulunan.length) ul.append(el("li", "bos", "Bulunamadı."));
  ul.hidden = false;
});

/* küçük, bağımsız markdown çevirici (HTML kaçışlı; satır içi stil ya da betik üretmez) */
function satirIci(s) {
  let h = esc(s);
  h = h.replace(/`([^`]+)`/g, "<code>$1</code>");
  h = h.replace(/\[\[([^\]|#]+?)\\?(?:#[^\]|]*)?(?:\\?\|([^\]]*))?\]\]/g, (_, hedef, ad) => {
    const t = hedef.trim(); const var_ = durum.harita && durum.harita.adla.has(t.toLowerCase());
    return `<button class="wl${var_ ? "" : " yok"}" data-ad="${t}">${ad || t}</button>`;
  });
  h = h.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  h = h.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
  h = h.replace(/~~([^~]+)~~/g, "<s>$1</s>");
  return h;
}
function mdHtml(md, baslik) {
  md = md.replace(/^---\n[\s\S]*?\n---\n/, "").replace(/<!--[\s\S]*?-->/g, "");
  const s = md.split(/\r?\n/); const out = []; let i = 0;
  if (baslik && !/^#\s/.test(s.find((x) => x.trim()) || "")) out.push(`<h1>${esc(baslik)}</h1>`);
  while (i < s.length) {
    const l = s[i];
    if (/^```/.test(l)) { const b = []; i++; while (i < s.length && !/^```/.test(s[i])) b.push(s[i++]); i++; out.push(`<pre>${esc(b.join("\n"))}</pre>`); continue; }
    const hm = l.match(/^(#{1,4})\s+(.*)$/); if (hm) { const n = Math.min(hm[1].length + (hm[1].length === 1 ? 0 : 0), 4); out.push(`<h${n}>${satirIci(hm[2])}</h${n}>`); i++; continue; }
    if (/^\s*(---|\*\*\*)\s*$/.test(l)) { out.push("<hr>"); i++; continue; }
    if (l.startsWith("|")) {
      const rows = []; while (i < s.length && s[i].startsWith("|")) rows.push(s[i++]);
      const ic = (r) => r.replace(/\\\|/g, "\u0000").split("|").slice(1, -1).map((c) => satirIci(c.replace(/\u0000/g, "\\|").trim()));
      let t = '<div class="tablo"><table>';
      if (rows.length > 1 && /^\|\s*:?-/.test(rows[1])) { t += "<thead><tr>" + ic(rows[0]).map((c) => `<th>${c}</th>`).join("") + "</tr></thead>"; rows.splice(0, 2); }
      t += "<tbody>" + rows.map((r) => "<tr>" + ic(r).map((c) => `<td>${c}</td>`).join("") + "</tr>").join("") + "</tbody></table></div>";
      out.push(t); continue;
    }
    if (/^>\s?/.test(l)) { const b = []; while (i < s.length && /^>\s?/.test(s[i])) b.push(s[i++].replace(/^>\s?/, "")); out.push(`<blockquote>${b.map(satirIci).join("<br>")}</blockquote>`); continue; }
    const lm = l.match(/^(\s*)([-*]|\d+\.)\s+(.*)$/);
    if (lm) {
      const sirali = /\d/.test(lm[2]); const items = [];
      while (i < s.length) { const m = s[i].match(/^(\s*)([-*]|\d+\.)\s+(.*)$/); if (!m) break; items.push(m); i++; }
      out.push((sirali ? "<ol>" : "<ul>") + items.map((m) => {
        let t = m[3]; let kutu = "";
        const km = t.match(/^\[( |x|\/)\]\s+(.*)$/i); if (km) { kutu = km[1].toLowerCase() === "x" ? "☑" : km[1] === "/" ? "◐" : "☐"; t = km[2]; }
        return `<li>${kutu ? `<span class="kutu">${kutu}</span>` : ""}${satirIci(t)}</li>`;
      }).join("") + (sirali ? "</ol>" : "</ul>"));
      continue;
    }
    if (!l.trim()) { i++; continue; }
    const p = []; while (i < s.length && s[i].trim() && !/^(#{1,4}\s|```|\||>|\s*([-*]|\d+\.)\s)/.test(s[i])) p.push(s[i++]);
    out.push(`<p>${p.map(satirIci).join("<br>")}</p>`);
  }
  return out.join("\n");
}

/* mini harita: küçük bir kuvvet yerleşimi (dış kütüphane yok) */
let mini = null;
function miniKur() {
  const h = durum.harita; const tuval = $("#mini");
  const N = h.dugumler.map((d, i) => ({ d, x: Math.cos(i) * 100 + Math.random(), y: Math.sin(i) * 100 + Math.random(), vx: 0, vy: 0, der: h.komsu.get(d.yol).size }));
  const idx = new Map(N.map((n, i) => [n.d.yol, i]));
  const K = h.kenarlar.map(([a, b]) => [idx.get(a), idx.get(b)]).filter(([a, b]) => a != null && b != null);
  for (let it = 0; it < 260; it++) {
    const alfa = 1 - it / 260;
    for (let i = 0; i < N.length; i++) for (let j = i + 1; j < N.length; j++) {
      const a = N[i], b = N[j]; let dx = a.x - b.x, dy = a.y - b.y; const d2 = dx * dx + dy * dy + 0.01;
      if (d2 > 90000) continue; const f = (900 / d2) * alfa; dx *= f; dy *= f; a.vx += dx; a.vy += dy; b.vx -= dx; b.vy -= dy;
    }
    for (const [i, j] of K) { const a = N[i], b = N[j]; const dx = b.x - a.x, dy = b.y - a.y; const d = Math.hypot(dx, dy) || 1; const f = ((d - 38) / d) * 0.04 * alfa; a.vx += dx * f; a.vy += dy * f; b.vx -= dx * f; b.vy -= dy * f; }
    for (const n of N) { n.vx -= n.x * 0.004 * alfa; n.vy -= n.y * 0.004 * alfa; n.x += n.vx; n.y += n.vy; n.vx *= 0.6; n.vy *= 0.6; }
  }
  mini = { N, K, tuval, z: 1, px: 0, py: 0 }; miniCiz();
}
function miniCiz() {
  if (!mini) return;
  const { N, K, tuval } = mini; const dpr = window.devicePixelRatio || 1;
  const w = tuval.clientWidth, hgt = tuval.clientHeight; if (!w) return;
  tuval.width = w * dpr; tuval.height = hgt * dpr;
  const c = tuval.getContext("2d"); c.scale(dpr, dpr); c.clearRect(0, 0, w, hgt);
  const xs = N.map((n) => n.x), ys = N.map((n) => n.y);
  const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
  const k = Math.min((w - 24) / (maxx - minx || 1), (hgt - 24) / (maxy - miny || 1));
  const ox = (w - (maxx - minx) * k) / 2 - minx * k, oy = (hgt - (maxy - miny) * k) / 2 - miny * k;
  const { z, px, py } = mini; // kullanıcının yakınlaştırması ve kaydırması
  for (const n of N) { n.sx = (n.x * k + ox) * z + px; n.sy = (n.y * k + oy) * z + py; n.r = (2.5 + Math.min(7, Math.sqrt(n.der) * 1.3)) * Math.min(2, Math.sqrt(z)); }
  const css = getComputedStyle(document.documentElement); const yaziR = css.getPropertyValue("--yazi").trim() || "#1b2230"; const kartR = css.getPropertyValue("--kart").trim() || "#fff";
  c.strokeStyle = css.getPropertyValue("--harita-cizgi").trim() || "rgba(107,115,133,.18)"; c.lineWidth = 0.7; c.beginPath();
  for (const [i, j] of K) { c.moveTo(N[i].sx, N[i].sy); c.lineTo(N[j].sx, N[j].sy); } c.stroke();
  for (const n of N) { c.fillStyle = renk(KLASOR_RENK[n.d.klasor] || "diger"); c.beginPath(); c.arc(n.sx, n.sy, n.r, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = yaziR; c.font = "600 10px system-ui, sans-serif"; c.textAlign = "center";
  // en çok bağlantılı notların adı; birbirinin üstüne binenler atlanır
  const kutular = [];
  for (const n of [...N].sort((a, b) => b.der - a.der).slice(0, 14 + Math.round(z * 10))) {
    const ad = n.d.ad.replace(/^\d+\s/, ""); const gen = c.measureText(ad).width;
    const k = { x: n.sx - gen / 2 - 3, y: n.sy - n.r - 15, w: gen + 6, h: 13 };
    if (k.x < 0 || k.x + k.w > w || k.y < 0) continue;
    if (kutular.some((o) => k.x < o.x + o.w && o.x < k.x + k.w && k.y < o.y + o.h && o.y < k.y + k.h)) continue;
    kutular.push(k);
    c.globalAlpha = 0.85; c.fillStyle = kartR; c.fillRect(k.x, k.y, k.w, k.h); c.globalAlpha = 1;
    c.fillStyle = yaziR; c.fillText(ad, n.sx, n.sy - n.r - 5);
    if (kutular.length >= Math.round(6 * z)) break;
  }
}
/* harita: dokun = not aç · sürükle = kaydır · iki parmak / tekerlek = yakınlaştır (yalnızca haritanın içinde) */
function miniYakinlastir(carpan, cx, cy) {
  if (!mini) return; const z = Math.max(1, Math.min(6, mini.z * carpan)); const f = z / mini.z;
  if (cx == null) { cx = mini.tuval.clientWidth / 2; cy = mini.tuval.clientHeight / 2; }
  mini.px = cx - (cx - mini.px) * f; mini.py = cy - (cy - mini.py) * f; mini.z = z;
  if (z === 1) { mini.px = 0; mini.py = 0; }
  miniCiz();
}
const parmak = new Map(); let surukle = null;
const tuvalNoktasi = (e) => { const r = $("#mini").getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
$("#mini").addEventListener("pointerdown", (e) => {
  $("#mini").setPointerCapture(e.pointerId); parmak.set(e.pointerId, tuvalNoktasi(e));
  surukle = { bas: tuvalNoktasi(e), oynadi: false, iki: parmak.size > 1 };
});
$("#mini").addEventListener("pointermove", (e) => {
  if (!mini || !parmak.has(e.pointerId)) return;
  const once = parmak.get(e.pointerId); const simdi = tuvalNoktasi(e);
  if (parmak.size === 2) {
    const [a, b] = [...parmak.values()]; const eskiMesafe = Math.hypot(a.x - b.x, a.y - b.y);
    parmak.set(e.pointerId, simdi); const [c, d] = [...parmak.values()]; const yeniMesafe = Math.hypot(c.x - d.x, c.y - d.y);
    if (eskiMesafe > 0) miniYakinlastir(yeniMesafe / eskiMesafe, (c.x + d.x) / 2, (c.y + d.y) / 2);
    if (surukle) { surukle.oynadi = true; surukle.iki = true; }
    return;
  }
  parmak.set(e.pointerId, simdi);
  if (surukle && Math.hypot(simdi.x - surukle.bas.x, simdi.y - surukle.bas.y) > 6) surukle.oynadi = true;
  if (surukle && surukle.oynadi && mini.z > 1) { mini.px += simdi.x - once.x; mini.py += simdi.y - once.y; miniCiz(); }
});
function parmakBitti(e) {
  parmak.delete(e.pointerId);
  if (e.type === "pointerup" && surukle && !surukle.oynadi && !surukle.iki && parmak.size === 0 && mini) {
    const { x, y } = tuvalNoktasi(e); let en = null, ed = 22 * 22;
    for (const n of mini.N) { const d = (n.sx - x) ** 2 + (n.sy - y) ** 2; if (d < ed) { ed = d; en = n; } }
    if (en) { titret(); durum.notYigini = []; notAc(en.d.yol); }
  }
  if (parmak.size === 0) surukle = null;
}
$("#mini").addEventListener("pointerup", parmakBitti);
$("#mini").addEventListener("pointercancel", parmakBitti);
$("#mini").addEventListener("wheel", (e) => { e.preventDefault(); const { x, y } = tuvalNoktasi(e); miniYakinlastir(e.deltaY < 0 ? 1.15 : 1 / 1.15, x, y); }, { passive: false });
$("#mini-buyut").addEventListener("click", () => miniYakinlastir(1.5));
$("#mini-kucult").addEventListener("click", () => miniYakinlastir(1 / 1.5));
$("#mini-sifirla").addEventListener("click", () => { if (mini) { mini.z = 1; mini.px = 0; mini.py = 0; miniCiz(); } });
window.addEventListener("resize", () => { if (durum.ekran === "harita") miniCiz(); });

/* ---------- GİDİŞAT ---------- */
async function gidisatYukle() {
  if (durum.gidisatYuklendi) return; durum.gidisatYuklendi = true;
  try {
    const [a, d, u, g] = await Promise.all([dosyaOku(YOL.aliskanlik), dosyaOku(YOL.din), dosyaOku(YOL.uyku), dosyaOku(YOL.gorevler)]);
    cizIsi(a ? tabloSatirlari(a.metin, "Tarih") : []);
    cizKaza(d ? tabloSatirlari(d.metin, "Kalem") : []);
    cizHaftaSayac(u ? u.metin : "", g ? g.metin : "");
  } catch (e) { durum.gidisatYuklendi = false; bilgi(e.message, "kotu"); }
}
function cizIsi(satirlar) {
  const gunler = Array.from({ length: 14 }, (_, i) => gunEkle(durum.gun, i - 13));
  const harita = new Map(satirlar.map((s) => [(s.Tarih || "").slice(0, 10), s]));
  const sutunlar = ["Diş", "Bakım", "Kaza", "NBA", "Para"];
  const kap = $("#isi"); kap.replaceChildren();
  const ust = el("div", "isi-satir isi-gunler"); ust.append(el("span"));
  for (const g of gunler) ust.append(el("span", "", String(tarihNesne(g).getDate())));
  kap.append(ust);
  const seriler = $("#seriler"); seriler.replaceChildren();
  for (const s of sutunlar) {
    const r = el("div", "isi-satir"); r.append(el("span", "", s));
    for (const g of gunler) { const v = harita.get(g); const h = el("span", "isi-hucre" + (v && v[s] && v[s].includes("✓") ? " var" : "")); h.title = `${g}: ${s}`; r.append(h); }
    kap.append(r);
    // seri: dünden geriye kesintisiz ✓
    let seri = 0; for (let i = 0; i < 60; i++) { const v = harita.get(gunEkle(durum.gun, -1 - i)); if (v && v[s] && v[s].includes("✓")) seri++; else break; }
    const son14 = gunler.filter((g) => { const v = harita.get(g); return v && v[s] && v[s].includes("✓"); }).length;
    const k = el("div", "kart"); k.append(el("p", "k-etiket", s), el("p", "k-deger", seri ? `${seri} gün` : "–"), el("p", "k-alt", `seri · 14 günde ${son14}`));
    seriler.append(k);
  }
}
function cizKaza(satirlar, hedef = "#kaza-ozet") {
  const kap = $(hedef); kap.replaceChildren();
  const sayi = (s) => Number(String(s).replace(/[^\d]/g, "")) || 0;
  const toplam = satirlar.find((s) => /toplam/i.test(s.Kalem || ""));
  const vakitler = satirlar.filter((s) => VAKIT.some(([, ad]) => ad === s.Kalem));
  if (!vakitler.length) { kap.append(el("p", "bos", "Din Takibi tablosu okunamadı.")); return; }
  const kalanSut = Object.keys(vakitler[0]).find((k) => /kalan/i.test(k));
  const basSut = Object.keys(vakitler[0]).find((k) => /başlangıç/i.test(k));
  const t = el("div", "kaza-toplam"); t.append(el("span", "soluk", "Toplam kalan"), el("b", "", toplam && kalanSut ? toplam[kalanSut] : "?"));
  kap.append(t);
  const enCok = Math.max(...vakitler.map((v) => sayi(v[kalanSut])), 1);
  for (const v of vakitler) {
    const r = el("div", "kaza-satir"); const c = el("div", "cubuk"); const i = el("i"); c.append(i);
    i.style.width = `${(sayi(v[kalanSut]) / enCok) * 100}%`;
    if (basSut && sayi(v[kalanSut]) < sayi(v[basSut])) i.style.background = "var(--iyi)";
    r.append(el("span", "", v.Kalem), c, el("b", "", String(sayi(v[kalanSut]))));
    kap.append(r);
  }
}
function cizHaftaSayac(uykuMd, gorevMd) {
  const kap = $("#hafta-sayac"); kap.replaceChildren();
  const bugun = tarihNesne(durum.gun); const pzt = gunEkle(durum.gun, -((bugun.getDay() + 6) % 7));
  // GYM
  const gymBolum = uykuMd.split(/\n## GYM/)[1] || "";
  const gym = [...gymBolum.matchAll(/^\|\s*(\d{4}-\d{2}-\d{2})/gm)].map((m) => m[1]).filter((g) => g >= pzt && g <= durum.gun).length;
  kap.append(sayacKart("GYM", `${gym}/3`, gym / 3, "bu hafta"));
  // staj
  const sm = gorevMd.match(/sayaç\s*(\d+(?:[.,]\d+)?)\s*\/\s*20/i);
  const st = sm ? Number(sm[1].replace(",", ".")) : null;
  kap.append(sayacKart("Staj", st == null ? "?" : `${st}/20`, (st || 0) / 20, "saat bu hafta"));
  // uyku
  const uyku = uykuMd.split(/\n## GYM/)[0];
  const sureler = tabloSatirlari(uyku, "Süre").map((s) => s["Süre"]).filter((x) => /^\d+:\d{2}$/.test(x)).slice(-7)
    .map((x) => { const [h, m] = x.split(":").map(Number); return h * 60 + m; });
  const ort = sureler.length ? Math.round(sureler.reduce((a, b) => a + b, 0) / sureler.length) : null;
  kap.append(sayacKart("Uyku ort.", ort == null ? "?" : `${Math.floor(ort / 60)}:${String(ort % 60).padStart(2, "0")}`, ort ? ort / 480 : 0, `son ${sureler.length} gece`));
}
function sayacKart(etiket, deger, oran, alt) {
  const k = el("div", "kart"); const c = el("div", "cubuk"); const i = el("i"); c.append(i);
  requestAnimationFrame(() => { i.style.width = `${Math.max(0, Math.min(1, oran)) * 100}%`; if (oran >= 1) i.style.background = "var(--iyi)"; });
  k.append(el("p", "k-etiket", etiket), el("p", "k-deger", deger), el("p", "k-alt", alt), c); return k;
}

/* ---------- TAKVİM (7 gün) ---------- */
function gununGorevleri(gun) {
  return durum.gorevler.filter((t) => !t.bekliyor && (t.planli === gun || t.son === gun || (gun === durum.gun && bugunMu(t)))).sort(siralama);
}
function cizTakvimEkrani() {
  if (!durum.secGun || durum.secGun < durum.gun) durum.secGun = durum.gun;
  const p = durum.plan || {}; const gunler = Array.from({ length: 7 }, (_, i) => gunEkle(durum.gun, i));
  const yak = (p.yaklasan || []).filter((y) => y.tarih >= durum.gun).sort((a, b) => a.tarih.localeCompare(b.tarih));
  const serit = $("#gun-seridi"); serit.replaceChildren();
  for (const g of gunler) {
    const d = tarihNesne(g); const b = el("button", "gun" + (g === durum.secGun ? " secili" : "")); b.setAttribute("role", "tab");
    b.setAttribute("aria-selected", String(g === durum.secGun));
    b.append(el("small", "", d.toLocaleDateString("tr-TR", { weekday: "short" })), el("b", "", String(d.getDate())), el("i", yak.some((y) => y.tarih === g) ? "var" : ""));
    b.addEventListener("click", () => { durum.secGun = g; titret(); cizTakvimEkrani(); });
    serit.append(b);
  }
  const sg = durum.secGun;
  $("#takvim-gun-baslik").textContent = kisaTarih(sg) === "bugün" || kisaTarih(sg) === "yarın" ? `${kisaTarih(sg)} · ${gunYazi(sg)}` : gunYazi(sg);
  const gunPlan = ((p.gunler || []).find((x) => x.gun === sg) || (p.gun === sg ? { takvim: p.takvim } : null));
  const tg = $("#t-tumgun"); tg.replaceChildren(); const ol = $("#t-takvim"); ol.replaceChildren();
  const etk = (gunPlan && gunPlan.takvim) || [];
  for (const e of etk) {
    if (!e.bas) { tg.append(el("span", "", e.baslik)); continue; }
    const li = el("li"); const saat = el("span", "saat"); saat.append(el("span", "s1", e.bas), el("span", "s2", e.bit || ""));
    const s = el("span", "serit"); s.style.background = renk(TUR_RENK[e.tur] || "diger");
    const ic = el("div"); ic.append(el("div", "baslik", e.baslik)); if (e.yer) ic.append(el("div", "yer", e.yer));
    li.append(saat, s, ic); ol.append(li);
  }
  if (!ol.children.length) { const li = el("li"); li.append(el("span", "saat", ""), el("span"), el("div", "yer", gunPlan ? "Saatli etkinlik yok." : "Bu gün için takvim bilgisi henüz yok.")); ol.append(li); }
  gorevListesi($("#t-gorevler"), gununGorevleri(sg), "Bu güne planlı iş yok.");
  const ul = $("#t-yaklasan"); ul.replaceChildren();
  for (const y of yak.slice(0, 8)) {
    const f = gunFarki(durum.gun, y.tarih); const li = el("li");
    li.append(el("span", "kalan" + (f <= 2 ? " yakin" : ""), f === 0 ? "bugün" : f === 1 ? "yarın" : `${f} gün`));
    const ic = el("div"); ic.append(el("span", "", y.baslik), el("small", "", gunYazi(y.tarih) + (y.tur === "teslim" ? " · teslim" : " · sınav")));
    li.append(ic); ul.append(li);
  }
  if (!ul.children.length) ul.append(el("li", "bos", "Yaklaşan sınav ya da teslim yok."));
}

/* ---------- DAHA ---------- */
function cizDaha() {
  const acik = durum.gorevler.length; const gec = durum.gorevler.filter((t) => (t.planli && t.planli < durum.gun) || (t.son && t.son < durum.gun)).length;
  $("#m-gorev").textContent = `${acik} açık iş${gec ? ` · ${gec} gecikmiş` : ""}`;
}

/* ---------- TÜM GÖREVLER ---------- */
const G_FILTRE = [["hepsi", "Hepsi"], ["gec", "Gecikmiş"], ["bugun", "Bugün"], ["hafta", "7 gün"], ["bekleyen", "Bekleyen"], ["tarihsiz", "Tarihsiz"]];
async function cizTumGorevler() {
  durum.gFiltre = durum.gFiltre || "hepsi";
  const q = ($("#g-ara").value || "").trim().toLocaleLowerCase("tr"); const hafta = gunEkle(durum.gun, 7);
  const uy = (t) => {
    const gec = (t.planli && t.planli < durum.gun) || (t.son && t.son < durum.gun);
    switch (durum.gFiltre) {
      case "gec": return gec && !t.bekliyor;
      case "bugun": return !t.bekliyor && bugunMu(t);
      case "hafta": return !t.bekliyor && ((t.planli && t.planli <= hafta) || (t.son && t.son <= hafta));
      case "bekleyen": return t.bekliyor;
      case "tarihsiz": return !t.planli && !t.son && !t.bekliyor;
      default: return true;
    }
  };
  const liste = durum.gorevler.filter((t) => uy(t) && (!q || (t.ad + " " + t.not).toLocaleLowerCase("tr").includes(q)));
  const f = $("#g-filtre"); f.replaceChildren();
  for (const [k, ad] of G_FILTRE) {
    const n = durum.gorevler.filter((t) => { const o = durum.gFiltre; durum.gFiltre = k; const r = uy(t); durum.gFiltre = o; return r; }).length;
    const b = el("button", "kat" + (durum.gFiltre === k ? " secili" : ""), `${ad} ${n}`); b.setAttribute("role", "tab");
    b.addEventListener("click", () => { durum.gFiltre = k; cizTumGorevler(); }); f.append(b);
  }
  const kap = $("#g-gruplar"); kap.replaceChildren();
  const gruplar = new Map(); for (const t of liste) { if (!gruplar.has(t.kat.k)) gruplar.set(t.kat.k, { ad: t.kat.ad, l: [] }); gruplar.get(t.kat.k).l.push(t); }
  if (!gruplar.size) kap.append(el("p", "bos", "Bu filtrede iş yok."));
  for (const [k, gr] of gruplar) {
    const h = el("h2", "grup-baslik"); const n = el("span", "nokta"); n.style.background = renk(k); h.append(n, `${gr.ad} · ${gr.l.length}`);
    const ul = el("ul", "liste"); gorevListesi(ul, gr.l.sort(siralama), ""); kap.append(h, ul);
  }
  if (!durum.arsiv) { const a = await dosyaOku("05 Günlük Sistem/Görevler Arşivi.md"); durum.arsiv = a ? a.metin : ""; }
  const ar = $("#g-arsiv"); ar.replaceChildren();
  const bitenler = [...durum.arsiv.matchAll(/^- \[x\] (.*)$/gm)].slice(0, 15);
  for (const m of bitenler) {
    const g = m[1]; const ad = g.split(/\s(?:⏫|🔼|🔽|⏳|📅|✅|#[\p{L}\p{N}_-]|—)/u)[0].trim(); const t = (g.match(/✅\s*(\d{4}-\d{2}-\d{2})/) || [])[1];
    ar.append(el("li", g.includes("iptal") ? "bitti" : "", `${g.includes("iptal") ? "✕" : "✓"}  ${ad}${t ? " · " + kisaTarih(t) : ""}`));
  }
  if (!bitenler.length) ar.append(el("li", "bos", "Arşiv boş."));
}
$("#g-ara").addEventListener("input", () => cizTumGorevler());

/* ---------- ALIŞKANLIKLAR ---------- */
const A_SUTUN = ["Diş", "Bakım", "Kaza", "NBA", "Para"];
async function aliskanlikYukle() {
  if (!durum.alisSatir) { const a = await dosyaOku(YOL.aliskanlik); durum.alisSatir = a ? tabloSatirlari(a.metin, "Tarih") : []; }
  durum.aSec = durum.aSec || "Hepsi"; cizAliskanlik();
}
function cizAliskanlik() {
  const harita = new Map(durum.alisSatir.map((s) => [(s.Tarih || "").slice(0, 10), s]));
  const yapildi = (g, s) => { const v = harita.get(g); if (!v) return null; return s === "Hepsi" ? A_SUTUN.filter((k) => (v[k] || "").includes("✓")).length : (v[s] || "").includes("✓"); };
  const sec = $("#a-secim"); sec.replaceChildren();
  for (const s of ["Hepsi", ...A_SUTUN]) { const b = el("button", "kat" + (durum.aSec === s ? " secili" : ""), s); b.addEventListener("click", () => { durum.aSec = s; cizAliskanlik(); }); sec.append(b); }
  const s = durum.aSec;
  // son 5 hafta (Pazartesi başlangıçlı)
  const bugun = tarihNesne(durum.gun); const pzt = gunEkle(durum.gun, -((bugun.getDay() + 6) % 7) - 28);
  const ay = $("#a-takvim"); ay.replaceChildren();
  for (const g of ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"]) ay.append(el("span", "", g));
  let topYap = 0, topGun = 0;
  for (let i = 0; i < 35; i++) {
    const g = gunEkle(pzt, i); const d = el("i", "", String(tarihNesne(g).getDate()));
    if (g > durum.gun) d.className = "bos";
    else {
      const y = yapildi(g, s); if (y != null) topGun++;
      if (s === "Hepsi") { if (y) { d.style.background = `color-mix(in srgb, var(--iyi) ${Math.round((y / 5) * 100)}%, var(--cizgi-acik))`; d.style.color = y >= 3 ? "#fff" : ""; topYap += y / 5; } }
      else if (y) { d.classList.add("var"); topYap++; }
      if (g === durum.gun) d.classList.add("bugun");
      d.title = g;
    }
    ay.append(d);
  }
  // seri ve oran
  const seri = (k) => { let n = 0; for (let i = 1; i < 90; i++) { const y = yapildi(gunEkle(durum.gun, -i), k); if (k === "Hepsi" ? y === 5 : y) n++; else break; } return n; };
  let enUzun = 0, su = 0; for (let i = 60; i >= 1; i--) { const y = yapildi(gunEkle(durum.gun, -i), s); if (s === "Hepsi" ? y === 5 : y) { su++; enUzun = Math.max(enUzun, su); } else su = 0; }
  const oz = $("#a-ozet"); oz.replaceChildren();
  const kart = (e, d, a) => { const k = el("div", "kart"); k.append(el("p", "k-etiket", e), el("p", "k-deger kucuk-d", d), el("p", "k-alt", a)); return k; };
  oz.append(kart("Şu anki seri", `${seri(s)} gün`, s === "Hepsi" ? "5/5 günler" : "dünden geriye"),
    kart("En uzun seri", `${enUzun} gün`, "son 60 gün"),
    kart("Oran", topGun ? `%${Math.round((topYap / topGun) * 100)}` : "–", "son 5 hafta"));
  // haftalık skor
  const hk = $("#a-hafta"); hk.replaceChildren();
  for (let w = 4; w >= 0; w--) {
    const bas = gunEkle(durum.gun, -((bugun.getDay() + 6) % 7) - w * 7); let t = 0, n = 0;
    for (let i = 0; i < 7; i++) { const g = gunEkle(bas, i); if (g > durum.gun) break; const y = yapildi(g, s); if (y != null) { n++; t += s === "Hepsi" ? y / 5 : y ? 1 : 0; } }
    const oran = n ? t / n : 0; const c = el("div", "cubuk-s"); const k = el("div", "kolon" + (oran >= 0.85 ? " tam" : ""));
    requestAnimationFrame(() => (k.style.height = `${Math.max(3, oran * 100)}%`));
    c.append(k, el("b", "", `%${Math.round(oran * 100)}`), el("small", "", w === 0 ? "bu hafta" : `${tarihNesne(bas).getDate()}.${tarihNesne(bas).getMonth() + 1}`));
    hk.append(c);
  }
}

/* ---------- DİN ---------- */
async function dinYukle() {
  const d = await dosyaOku(YOL.din); const md = d ? d.metin : "";
  const durumT = tabloSatirlari(md, "Kalem"); cizKaza(durumT, "#d-kaza");
  const ok = $("#d-okuma"); ok.replaceChildren();
  for (const s of durumT.filter((x) => /cüz|tevhid|okuma/i.test(x.Kalem || ""))) {
    const kalanSut = Object.keys(s).find((k) => /kalan/i.test(k));
    const k = el("div", "kart"); k.append(el("p", "k-etiket", s.Kalem.replace(/\s*\(.*\)/, "")), el("p", "k-deger kucuk-d", String(s[kalanSut] || "").split("+")[0].trim()), el("p", "k-alt", "kalan · her Cuma artar"));
    ok.append(k);
  }
  if (!ok.children.length) ok.append(el("p", "bos", "Okuma kaydı yok."));
  const kayit = tabloSatirlari(md.slice(md.indexOf("## Kayıtlar")), "Tarih").slice(-8).reverse();
  const ul = $("#d-kayit"); ul.replaceChildren();
  for (const r of kayit) { const li = el("li"); li.append(el("b", "", kisaTarih(r.Tarih) + " "), el("span", "soluk", r["Kayıt"] || "")); ul.append(li); }
  if (!kayit.length) ul.append(el("li", "bos", "Kayıt yok."));
}

/* ---------- UYKU VE GYM ---------- */
async function uykuYukle() {
  const u = await dosyaOku(YOL.uyku); const md = u ? u.metin : "";
  const [uykuMd, gymMd = ""] = md.split(/\n## GYM/);
  const geceler = tabloSatirlari(uykuMd, "Süre").filter((s) => /^\d+:\d{2}$/.test(s["Süre"])).slice(-7);
  const dk = (x) => { const [h, m] = x.split(":").map(Number); return h * 60 + m; };
  const gk = $("#u-geceler"); gk.replaceChildren();
  for (const s of geceler) {
    const r = el("div", "gece"); const c = el("div", "cubuk"); const i = el("i"); c.append(i);
    const v = dk(s["Süre"]); requestAnimationFrame(() => (i.style.width = `${Math.min(100, (v / 600) * 100)}%`));
    if (v >= 450) i.style.background = "var(--iyi)"; else if (v < 390) i.style.background = "var(--uyari)";
    r.append(el("span", "soluk", tarihNesne(s.Sabah).toLocaleDateString("tr-TR", { weekday: "short" })), c, el("b", "", s["Süre"]));
    r.title = `yattı ${s["Yattı"]} · kalktı ${s["Kalktı"]}`; gk.append(r);
  }
  if (!geceler.length) gk.append(el("p", "bos", "Uyku kaydı yok."));
  const ort = geceler.length ? Math.round(geceler.reduce((a, s) => a + dk(s["Süre"]), 0) / geceler.length) : 0;
  const yatis = geceler.map((s) => { let v = dk(s["Yattı"] || "0:0"); if (v < 12 * 60) v += 24 * 60; return v; });
  const ortY = yatis.length ? Math.round(yatis.reduce((a, b) => a + b, 0) / yatis.length) % (24 * 60) : null;
  const sapma = yatis.length ? Math.round(Math.sqrt(yatis.reduce((a, b) => a + (b - yatis.reduce((x, y) => x + y, 0) / yatis.length) ** 2, 0) / yatis.length)) : null;
  const hm = (v) => `${Math.floor(v / 60)}:${String(v % 60).padStart(2, "0")}`;
  const oz = $("#u-ozet"); oz.replaceChildren();
  const kart = (e, d, a) => { const k = el("div", "kart"); k.append(el("p", "k-etiket", e), el("p", "k-deger kucuk-d", d), el("p", "k-alt", a)); return k; };
  oz.append(kart("Ortalama", geceler.length ? hm(ort) : "?", "saat uyku"), kart("Yatış", ortY == null ? "?" : hm(ortY), "ortalama"), kart("Düzen", sapma == null ? "?" : `±${sapma} dk`, "yatış oynaması"));
  // GYM: son 5 hafta, hedef 3
  const gunler = [...gymMd.matchAll(/^\|\s*(\d{4}-\d{2}-\d{2})/gm)].map((m) => m[1]);
  const bugun = tarihNesne(durum.gun); const hk = $("#u-gym"); hk.replaceChildren();
  for (let w = 4; w >= 0; w--) {
    const bas = gunEkle(durum.gun, -((bugun.getDay() + 6) % 7) - w * 7); const son = gunEkle(bas, 6);
    const n = gunler.filter((g) => g >= bas && g <= son).length;
    const c = el("div", "cubuk-s"); const k = el("div", "kolon" + (n >= 3 ? " tam" : ""));
    requestAnimationFrame(() => (k.style.height = `${Math.max(3, Math.min(1, n / 3) * 100)}%`));
    c.append(k, el("b", "", `${n}/3`), el("small", "", w === 0 ? "bu hafta" : `${tarihNesne(bas).getDate()}.${tarihNesne(bas).getMonth() + 1}`));
    hk.append(c);
  }
}

/* ---------- REHBERLER ---------- */
async function rehberYukle() {
  await haritaYukle(); const ul = $("#r-liste"); ul.replaceChildren();
  if (!durum.harita) return;
  const rehber = durum.harita.dugumler.filter((d) => d.klasor === "06 Haritalar" || d.ad.toLocaleLowerCase("tr").includes("okuma ve izleme"));
  for (const d of rehber) {
    const li = notDugmesi(d);
    li.querySelector("button").addEventListener("click", () => ekranAc("harita"), { capture: true });
    ul.append(li);
  }
  if (!rehber.length) ul.append(el("li", "bos", "Rehber notu yok."));
}

/* ---------- yükleme ve gezinme ---------- */
let bilgiZaman = 0;
function bilgi(m, tur) {
  const b = $("#durum"); b.hidden = !m; b.textContent = m || ""; b.className = "bilgi" + (tur ? " " + tur : "");
  clearTimeout(bilgiZaman); if (m && tur === "iyi") bilgiZaman = setTimeout(() => { b.hidden = true; }, 4000);
}
function taslakAl(gun) { try { const t = JSON.parse(localStorage.getItem("zk-taslak") || "null"); return t && t.gun === gun ? t : null; } catch { return null; } }
async function yukle() {
  bilgi("");
  if (ayarOku().kaynak === "github" && !Kasa.acikMi()) {
    if (Kasa.varMi()) { const tamam = await kilitAc("Kasandaki verine bağlanmak için PIN'ini gir."); if (!tamam) bilgi("Kasa kilitli: örnek veri gösteriliyor. Kasayı açmak için ↻.", ""); }
    else bilgi("GitHub kaynağı seçili ama anahtar yok: örnek veri gösteriliyor (Ayarlar → Veri kaynağı).");
  }
  durum.alisSatir = null; durum.arsiv = null;
  try {
    const [g, h, p, gi] = await Promise.all([dosyaOku(YOL.gorevler), dosyaOku(YOL.hafta), dosyaOku(YOL.bugun), dosyaOku(`${YOL.girdiKlasor}/${durum.gun}.md`)]);
    durum.anaGorevler = g ? gorevleriAyristir(g.metin) : [];
    durum.hafta = h ? haftayiAyristir(h.metin) : [];
    try { durum.plan = p ? JSON.parse(p.metin) : null; } catch { durum.plan = null; }
    durum.girdi = girdiAyristir(gi && gi.metin, durum.gun); durum.girdiSha = gi && gi.sha;
    const t = taslakAl(durum.gun);
    if (t && (!durum.girdi.guncelleme || t.guncelleme === durum.girdi.guncelleme) && JSON.stringify(t) !== JSON.stringify(durum.girdi)) { durum.girdi = t; durum.degisti = true; }
    bilgi("");
  } catch (e) { bilgi("⚠️ " + e.message, "kotu"); durum.girdi = durum.girdi || bosGirdi(durum.gun); }
  durum.haritaYuklendi = false; durum.gidisatYuklendi = false;
  gorevleriBirlestir();
  cizBugun(); cizGiris(); kaydetDurum();
  if (durum.ekran === "harita") haritaYukle(); if (durum.ekran === "gidisat") gidisatYukle();
}
const ALT_EKRAN = ["gorevler", "aliskanlik", "din", "uyku", "rehber", "gidisat", "ayar"];
function ekranAc(ad) {
  durum.ekran = ad;
  const sekme = ALT_EKRAN.includes(ad) ? "daha" : ad;
  for (const s of document.querySelectorAll(".ekran")) s.classList.toggle("aktif", s.id === "ekran-" + ad);
  for (const b of document.querySelectorAll(".alt button")) { const ak = b.dataset.ekran === sekme; b.classList.toggle("aktif", ak); b.setAttribute("aria-current", ak ? "page" : "false"); }
  if (ad === "harita") { haritaYukle().then(() => requestAnimationFrame(miniCiz)); }
  if (ad === "gidisat") gidisatYukle();
  if (ad === "takvim") cizTakvimEkrani();
  if (ad === "daha") cizDaha();
  if (ad === "gorevler") cizTumGorevler();
  if (ad === "aliskanlik") aliskanlikYukle();
  if (ad === "din") dinYukle();
  if (ad === "uyku") uykuYukle();
  if (ad === "rehber") rehberYukle();
  kaydetDurum(); window.scrollTo({ top: 0 });
}
for (const b of document.querySelectorAll(".alt button")) b.addEventListener("click", () => { if (b.dataset.ekran === "harita" && durum.ekran === "harita") haritaGorunum("ana"); ekranAc(b.dataset.ekran); });
for (const b of document.querySelectorAll("[data-git]")) b.addEventListener("click", () => ekranAc(b.dataset.git));
$("#ayar-ac").addEventListener("click", () => ekranAc(durum.ekran === "ayar" ? "bugun" : "ayar"));

/* ---------- AYARLAR ---------- */
function temaUygula() {
  const a = ayarOku(); const kok = document.documentElement;
  kok.dataset.tema = a.tema || "acik"; kok.dataset.boyut = a.boyut || "normal"; kok.dataset.hareket = a.hareket === false ? "kapali" : "acik";
  const koyu = kok.dataset.tema === "koyu" || (kok.dataset.tema === "oto" && matchMedia("(prefers-color-scheme: dark)").matches);
  $("#tema-rengi").content = koyu ? "#121318" : "#f4f6fb";
  if (mini) miniCiz();
}
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", temaUygula);
function parcaliBagla(sec, anahtar, varsayilan, sonra) {
  const kap = $(sec);
  const ciz = () => { const v = ayarOku()[anahtar] || varsayilan; for (const b of kap.querySelectorAll("button")) { const s = b.dataset.deger === v; b.classList.toggle("secili", s); b.setAttribute("role", "radio"); b.setAttribute("aria-checked", String(s)); } };
  for (const b of kap.querySelectorAll("button")) b.addEventListener("click", () => { ayarGuncelle({ [anahtar]: b.dataset.deger }); ciz(); titret(); sonra && sonra(); });
  ciz(); return ciz;
}
function durumYaz(sec, m, tur) { const e = $(sec); e.hidden = !m; e.textContent = m || ""; e.className = "bilgi" + (tur ? " " + tur : ""); }
function kasaDurumCiz() {
  const a = ayarOku(); const k = Kasa.oku();
  $("#kasa-durum").textContent = !Kasa.varMi() ? "Kayıtlı anahtar yok." : Kasa.acikMi()
    ? `Kasa açık · ${[k.github && k.github.token ? "GitHub" : "", k.yz && k.yz.anahtar ? "Claude" : ""].filter(Boolean).join(" + ") || "boş"}` : "Kasa kilitli 🔒";
  $("#github-alanlar").hidden = a.kaynak !== "github";
  $("#kaynak-aciklama").textContent = a.kaynak === "github"
    ? "Gerçek kasan okunur; girişler GitHub'daki Girdiler klasörüne yazılır. Anahtar PIN'inle şifrelenir."
    : "Hiçbir yere bağlanmaz. Görevler ve notlar uydurma örnektir; girişler yalnızca bu cihazda kalır.";
  $("#kaynak-rozet").textContent = githubModu() ? "GitHub kasasına bağlı" : "pilot (örnek veri)";
  if (k && k.github) { $("#gh-repo").value = k.github.repo || ""; $("#gh-dal").value = k.github.dal || "main"; }
  $("#gh-token").placeholder = k && k.github && k.github.token ? "•••• kayıtlı (değiştirmek için yaz)" : "github_pat_…";
  $("#yz-acik").checked = !!a.yzAcik; $("#yz-alanlar").hidden = !a.yzAcik; $("#yz-ayikla").hidden = !a.yzAcik;
  $("#yz-anahtar").placeholder = k && k.yz && k.yz.anahtar ? "•••• kayıtlı (değiştirmek için yaz)" : "sk-ant-…";
  $("#yz-model").value = a.yzModel || "claude-opus-5-5";
}
/* Kasaya bir şey yazmak: kasa yoksa PIN belirlenir, kilitliyse açılır */
async function kasayaYaz(degisiklik) {
  if (!Kasa.varMi()) { const ok = await kilitAc(null, true, degisiklik); return ok; }
  if (!Kasa.acikMi() && !(await kilitAc("Değişikliği kaydetmek için PIN'ini gir."))) return false;
  await Kasa.guncelle(degisiklik); return true;
}
let kilitCoz = null;
function kilitAc(aciklama, yeniPin = false, ilkVeri = null) {
  return new Promise((coz) => {
    kilitCoz = coz; const f = $("#kilit");
    $("#kilit-baslik").textContent = yeniPin ? "🔐 PIN belirle" : "🔐 Kasayı aç";
    $("#kilit-aciklama").textContent = yeniPin ? "Anahtarların bu PIN ile şifrelenecek. En az 6 karakter; unutursan anahtarları yeniden girmen gerekir." : (aciklama || "");
    $("#kilit-tekrar-satir").hidden = !yeniPin; $("#kilit-tamam").textContent = yeniPin ? "Şifrele ve kaydet" : "Aç";
    $("#kilit-pin").value = ""; $("#kilit-pin2").value = ""; $("#kilit-hata").hidden = true;
    f.dataset.yeni = yeniPin ? "1" : ""; f._ilk = ilkVeri;
    $("#perde").hidden = false; f.hidden = false; setTimeout(() => $("#kilit-pin").focus(), 50);
  });
}
function kilitKapat(sonuc) { $("#kilit").hidden = true; if ($("#sayfa").hidden && $("#yeni").hidden && $("#yz-sayfa").hidden) $("#perde").hidden = true; if (kilitCoz) { const c = kilitCoz; kilitCoz = null; c(sonuc); } }
$("#kilit-vazgec").addEventListener("click", () => kilitKapat(false));
$("#kilit").addEventListener("submit", async (e) => {
  e.preventDefault(); const f = $("#kilit"); const pin = $("#kilit-pin").value; const hata = $("#kilit-hata");
  const goster = (m) => { hata.textContent = m; hata.hidden = false; };
  $("#kilit-tamam").disabled = true;
  try {
    if (f.dataset.yeni) {
      if (!Kasa.pinUygun(pin)) return goster("PIN en az 6 karakter olmalı.");
      if (pin !== $("#kilit-pin2").value) return goster("İki PIN aynı değil.");
      await Kasa.kur(pin, f._ilk || {});
    } else await Kasa.ac(pin);
    kilitKapat(true); kasaDurumCiz();
  } catch (err) { goster(err.message); kasaDurumCiz(); }
  finally { $("#kilit-tamam").disabled = false; $("#kilit-pin").value = ""; $("#kilit-pin2").value = ""; }
});

(function ayarEkrani() {
  const a = ayarOku();
  $("#surum").textContent = SURUM_AD;
  $("#ayar-ad").value = a.ad || "";
  $("#ayar-ad").addEventListener("change", (e) => { ayarGuncelle({ ad: e.target.value.trim().slice(0, 40) }); cizBugun(); });
  parcaliBagla("#ayar-tema", "tema", "acik", temaUygula);
  parcaliBagla("#ayar-boyut", "boyut", "normal", temaUygula);
  $("#ayar-hareket").checked = a.hareket !== false;
  $("#ayar-hareket").addEventListener("change", (e) => { ayarGuncelle({ hareket: e.target.checked }); temaUygula(); });
  $("#ayar-donum").value = String(gunDonumu());
  $("#ayar-donum").addEventListener("change", (e) => { ayarGuncelle({ donum: Number(e.target.value) }); if (!durum.degisti) { durum.gun = gunHesapla(); yukle(); } });
  parcaliBagla("#ayar-kaynak", "kaynak", "pilot", () => { kasaDurumCiz(); if (!durum.degisti) yukle(); });
  // GitHub
  const ghAlanlari = () => {
    const repo = $("#gh-repo").value.trim(); const dal = $("#gh-dal").value.trim() || "main"; const token = $("#gh-token").value.trim();
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) throw new Error("Repo 'kullanici/repo' biçiminde olmalı.");
    if (token && !/^(github_pat_|ghp_)[A-Za-z0-9_]{20,}$/.test(token)) throw new Error("Bu bir GitHub anahtarına benzemiyor.");
    const eski = (Kasa.oku() || {}).github || {};
    if (!token && !eski.token) throw new Error("Anahtarı yaz.");
    return { repo, dal, token: token || eski.token };
  };
  $("#gh-kaydet").addEventListener("click", async () => {
    try { const g = ghAlanlari(); if (await kasayaYaz({ github: g })) { $("#gh-token").value = ""; durumYaz("#gh-durum", "Kaydedildi ve şifrelendi ✓", "iyi"); kasaDurumCiz(); if (!durum.degisti) yukle(); } }
    catch (e) { durumYaz("#gh-durum", "⚠️ " + e.message, "kotu"); }
  });
  $("#gh-dene").addEventListener("click", async () => {
    durumYaz("#gh-durum", "Deneniyor…");
    try {
      const g = ghAlanlari(); const r = await fetch(`https://api.github.com/repos/${g.repo}`, { headers: { Authorization: `Bearer ${g.token}`, Accept: "application/vnd.github+json" }, referrerPolicy: "no-referrer", credentials: "omit", cache: "no-store" });
      if (r.status === 401) throw new Error("Anahtar geçersiz.");
      if (r.status === 403 || r.status === 404) throw new Error("Bu repoya erişim yok (anahtarın izinlerini kontrol et).");
      if (!r.ok) throw new Error(`GitHub hatası ${r.status}`);
      const j = await r.json(); durumYaz("#gh-durum", `Bağlandı ✓ · ${j.private ? "gizli" : "herkese açık"} repo${j.private ? "" : " — kasa reposunun gizli olması gerekir!"}`, j.private ? "iyi" : "kotu");
    } catch (e) { durumYaz("#gh-durum", "⚠️ " + e.message, "kotu"); }
  });
  // YZ
  for (const [id, ad] of YZ_MODELLER) { const o = document.createElement("option"); o.value = id; o.textContent = ad; $("#yz-model").append(o); }
  $("#yz-acik").addEventListener("change", (e) => { ayarGuncelle({ yzAcik: e.target.checked }); kasaDurumCiz(); });
  $("#yz-model").addEventListener("change", (e) => ayarGuncelle({ yzModel: e.target.value }));
  $("#yz-kaydet").addEventListener("click", async () => {
    const anahtar = $("#yz-anahtar").value.trim(); const eski = ((Kasa.oku() || {}).yz || {}).anahtar;
    try {
      if (anahtar && !/^sk-ant-[A-Za-z0-9_-]{20,}$/.test(anahtar)) throw new Error("Bu bir Claude API anahtarına benzemiyor.");
      if (!anahtar && !eski) throw new Error("Anahtarı yaz.");
      if (await kasayaYaz({ yz: { anahtar: anahtar || eski } })) { $("#yz-anahtar").value = ""; durumYaz("#yz-durum", "Kaydedildi ve şifrelendi ✓", "iyi"); kasaDurumCiz(); }
    } catch (e) { durumYaz("#yz-durum", "⚠️ " + e.message, "kotu"); }
  });
  $("#yz-dene").addEventListener("click", async () => {
    if (!Kasa.acikMi() && Kasa.varMi() && !(await kilitAc("Denemek için PIN'ini gir."))) return;
    durumYaz("#yz-durum", "Claude'a soruluyor…");
    try {
      const r = await yzIste({ model: ayarOku().yzModel, sistem: "Sadece istenen JSON'u döndür.", mesaj: "Bağlantı testi. tamam alanını true yap.", maxTokens: 2000,
        sema: { type: "object", properties: { tamam: { type: "boolean" } }, required: ["tamam"], additionalProperties: false } });
      durumYaz("#yz-durum", r.tamam ? "Claude bağlı ✓" : "Yanıt geldi ama beklenen değil.", r.tamam ? "iyi" : "kotu");
    } catch (e) { durumYaz("#yz-durum", "⚠️ " + e.message, "kotu"); }
  });
  // Güvenlik
  $("#ayar-otokilit").checked = a.otoKilit !== false;
  $("#ayar-otokilit").addEventListener("change", (e) => ayarGuncelle({ otoKilit: e.target.checked }));
  $("#kasa-kilitle").addEventListener("click", () => { Kasa.kilitle(); kasaDurumCiz(); titret(); if (ayarOku().kaynak === "github" && !durum.degisti) yukle(); });
  $("#kasa-pin").addEventListener("click", async () => {
    if (!Kasa.varMi()) return alert("Önce bir anahtar kaydet.");
    if (!Kasa.acikMi() && !(await kilitAc("Önce mevcut PIN'ini gir."))) return;
    const veri = Kasa.oku(); await kilitAc(null, true, veri); kasaDurumCiz();
  });
  $("#kasa-sil").addEventListener("click", () => {
    if (!confirm("GitHub ve Claude anahtarları bu cihazdan silinsin mi? (Hesaplarındaki anahtarlar silinmez; gerekirse onları ayrıca iptal et.)")) return;
    Kasa.sil(); ayarGuncelle({ kaynak: "pilot" }); kasaDurumCiz(); if (!durum.degisti) yukle();
  });
  // Veri
  $("#veri-disa").addEventListener("click", () => {
    const girdiler = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith(GIRDI_ON)) girdiler[k.slice(GIRDI_ON.length)] = localStorage.getItem(k); }
    const { ad, tema, boyut, hareket, donum, yzModel } = ayarOku();
    const blob = new Blob([JSON.stringify({ uygulama: "zihnimin-kivrimlari", surum: 1, tarih: new Date().toISOString(), ayar: { ad, tema, boyut, hareket, donum, yzModel }, girdiler }, null, 2)], { type: "application/json" });
    const u = URL.createObjectURL(blob); const l = document.createElement("a"); l.href = u; l.download = `kivrimlar-yedek-${durum.gun}.json`; document.body.append(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 1000);
    durumYaz("#veri-durum", `${Object.keys(girdiler).length} günlük giriş dışa aktarıldı.`, "iyi");
  });
  $("#veri-ice").addEventListener("change", async (e) => {
    const dosya = e.target.files[0]; e.target.value = ""; if (!dosya) return;
    try {
      if (dosya.size > 2e6) throw new Error("Dosya çok büyük.");
      const j = JSON.parse(await dosya.text());
      if (j.uygulama !== "zihnimin-kivrimlari" || typeof j.girdiler !== "object") throw new Error("Bu bir Kıvrımlar yedeği değil.");
      let n = 0;
      for (const [yol, metin] of Object.entries(j.girdiler)) {
        if (!/^05 Günlük Sistem\/Girdiler\/\d{4}-\d{2}-\d{2}\.md$/.test(yol) || typeof metin !== "string" || metin.length > 200000) continue;
        localStorage.setItem(GIRDI_ON + yol, metin); n++;
      }
      const iz = ["ad", "tema", "boyut", "hareket", "donum", "yzModel"]; const yeni = {};
      for (const k of iz) if (j.ayar && j.ayar[k] !== undefined) yeni[k] = j.ayar[k];
      ayarGuncelle(yeni); temaUygula(); durumYaz("#veri-durum", `${n} günlük giriş içe aktarıldı ✓`, "iyi"); if (!durum.degisti) yukle();
    } catch (err) { durumYaz("#veri-durum", "⚠️ " + err.message, "kotu"); }
  });
  $("#ayar-sil").addEventListener("click", async () => {
    if (!confirm("Bu cihazdaki tüm girişler, ayarlar ve anahtarlar silinsin mi? Geri alınamaz.")) return;
    try { localStorage.clear(); } catch { /* yok */ }
    try { for (const k of await caches.keys()) await caches.delete(k); } catch { /* yok */ }
    location.reload();
  });
  $("#guncelle").addEventListener("click", async () => {
    try { const r = await navigator.serviceWorker.getRegistration(); if (r) await r.update(); } catch { /* yok */ }
    location.reload();
  });
  temaUygula(); kasaDurumCiz();
})();

/* ---------- YZ: karalamadan iş çıkar ---------- */
$("#yz-ayikla").addEventListener("click", async () => {
  const metin = durum.girdi.karalama.trim(); const b = $("#yz-ayikla");
  if (metin.length < 10) return alert("Önce 'Kafamdan geçenler' kutusuna biraz yaz.");
  if (!ayarOku().yzOnay && !confirm("Karalama metnin işlenmek üzere Anthropic'e (Claude) gönderilecek. Devam edilsin mi?")) return;
  ayarGuncelle({ yzOnay: true });
  if (!Kasa.acikMi() && Kasa.varMi() && !(await kilitAc("Claude'u kullanmak için PIN'ini gir."))) return;
  b.disabled = true; const eski = b.textContent; b.textContent = "✨ Claude düşünüyor…";
  try {
    const kat = YENI_KAT.map((k) => k[0]);
    const r = await yzIste({
      model: ayarOku().yzModel,
      sistem: `Kullanıcının günlük notundan yapılacak işleri çıkaran bir asistansın. Bugün ${durum.gun} (${gunYazi(durum.gun)}). Yalnızca gerçekten yapılması gereken somut işleri çıkar; zaten yapılmış olanları alma. Her iş kısa, eylemle başlayan Türkçe bir cümle olsun. Tarih belirtilmişse YYYY-AA-GG biçiminde gun alanına yaz, belirtilmemişse boş bırak. Kategori: ${kat.join(", ")}.`,
      mesaj: metin,
      sema: {
        type: "object", additionalProperties: false, required: ["isler"],
        properties: { isler: { type: "array", items: {
          type: "object", additionalProperties: false, required: ["ad", "kat", "onem", "gun"],
          properties: { ad: { type: "string" }, kat: { type: "string", enum: kat }, onem: { type: "string", enum: ["yuksek", "orta", "dusuk"] }, gun: { type: "string" } },
        } } },
      },
    });
    yzOnerileriGoster((r.isler || []).slice(0, 15));
  } catch (e) { alert("⚠️ " + e.message); }
  finally { b.disabled = false; b.textContent = eski; }
});
let yzOneriler = [];
function yzOnerileriGoster(liste) {
  const ONEM = { yuksek: "⏫", orta: "🔼", dusuk: "🔽" };
  yzOneriler = liste.map((x) => ({
    ad: String(x.ad || "").replace(/[⏫🔼🔽⏳📅✅#|]/gu, "").replace(/\s+/g, " ").trim().slice(0, 140),
    kat: YENI_KAT.some((k) => k[0] === x.kat) ? x.kat : "hayat", oncelik: ONEM[x.onem] || "🔼",
    gun: /^\d{4}-\d{2}-\d{2}$/.test(x.gun || "") && x.gun >= durum.gun ? x.gun : durum.gun, son: null, sec: true,
  })).filter((x) => x.ad.length >= 3 && !durum.gorevler.some((t) => t.ad.toLocaleLowerCase("tr") === x.ad.toLocaleLowerCase("tr")));
  const ul = $("#yz-oneriler"); ul.replaceChildren();
  $("#yz-bilgi").textContent = yzOneriler.length ? "Eklemek istemediklerinin işaretini kaldır." : "Karalamada yeni bir iş bulunamadı.";
  yzOneriler.forEach((o, i) => {
    const li = el("li"); const lb = el("label", "yz-oneri"); const cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = true;
    cb.addEventListener("change", () => (yzOneriler[i].sec = cb.checked));
    const n = el("span", "kat-nokta"); n.style.background = renk(o.kat);
    const ic = el("span"); ic.append(el("b", "", o.ad), el("small", "", `${YENI_KAT.find((k) => k[0] === o.kat)[1]} · ${kisaTarih(o.gun)} · ${o.oncelik}`));
    lb.append(cb, n, ic); li.append(lb); ul.append(li);
  });
  $("#yz-ekle").hidden = !yzOneriler.length;
  $("#perde").hidden = false; $("#yz-sayfa").hidden = false;
}
function yzKapat() { $("#yz-sayfa").hidden = true; if ($("#sayfa").hidden && $("#yeni").hidden && $("#kilit").hidden) $("#perde").hidden = true; }
$("#yz-vazgec").addEventListener("click", yzKapat);
$("#yz-ekle").addEventListener("click", () => {
  const sec = yzOneriler.filter((o) => o.sec); if (!sec.length) return yzKapat();
  durum.girdi.yeni_gorevler = durum.girdi.yeni_gorevler || [];
  for (const o of sec) durum.girdi.yeni_gorevler.push({ ad: o.ad, kat: o.kat, oncelik: o.oncelik, gun: o.gun, son: null });
  gorevleriBirlestir(); titret(); degisti(); yzKapat(); ekraniYenile(); bilgi(`${sec.length} iş eklendi ✓ (Kaydet'e basmayı unutma)`, "iyi");
});

window.addEventListener("beforeunload", (e) => { if (durum.degisti) { e.preventDefault(); e.returnValue = ""; } });
let gizlendi = 0;
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") { gizlendi = Date.now(); return; }
  if (gizlendi && Date.now() - gizlendi > 5 * 60000 && ayarOku().otoKilit !== false && Kasa.acikMi()) { Kasa.kilitle(); kasaDurumCiz(); if (ayarOku().kaynak === "github" && !durum.degisti) { yukle(); return; } }
  if (durum.degisti) return;
  const g = gunHesapla(); if (g !== durum.gun) { durum.gun = g; yukle(); } else if (durum.ekran === "bugun") cizTakvim();
});
// iPhone Safari "user-scalable=no"yu yok sayar: iki parmakla büyütmeyi burada engelle
document.addEventListener("gesturestart", (e) => e.preventDefault());
document.addEventListener("touchmove", (e) => { if (e.touches.length > 1 && !e.target.closest("#mini")) e.preventDefault(); }, { passive: false });

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
  // yeni sürüm gelince (kaydedilmemiş değişiklik yoksa) bir kez kendini yenile
  let yenilendi = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (!yenilendi && !durum.degisti) { yenilendi = true; location.reload(); } });
}
yukle();
