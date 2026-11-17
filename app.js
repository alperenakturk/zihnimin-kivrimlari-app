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
const GUN_DONUMU_SAAT = 5;

const $ = (s) => document.querySelector(s);
const durum = {
  gun: gunHesapla(), gorevler: [], hafta: [], plan: null, girdi: null, girdiSha: null,
  degisti: false, kategori: "hepsi", ekran: "bugun",
  harita: null, haritaYuklendi: false, notYigini: [], gidisatYuklendi: false, sayfaGorev: null,
};

/* ---------- yardımcılar ---------- */
function iso(d) { const p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; }
function gunHesapla() { const d = new Date(); if (d.getHours() < GUN_DONUMU_SAAT) d.setDate(d.getDate() - 1); return iso(d); }
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
function titret() { try { navigator.vibrate && navigator.vibrate(12); } catch { /* yok */ } }
function kategoriBul(bolum) { for (const [r, k, ad] of KATEGORI) if (r.test(bolum)) return { k, ad }; return { k: "diger", ad: "Diğer" }; }
function renk(k) { return getComputedStyle(document.documentElement).getPropertyValue(`--k-${k}`).trim() || "#6b7385"; }
function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

/* ---------- ayarlar ---------- */
function ayarOku() { try { return JSON.parse(localStorage.getItem("zk-ayar") || "{}"); } catch { return {}; } }
function ayarYaz(a) { try { localStorage.setItem("zk-ayar", JSON.stringify(a)); } catch { /* özel pencere */ } }

/* ---------- PİLOT DEPOLAMA ----------
   Pilot sürüm hiçbir sunucuya bağlanmaz: okunan veri ornek.js'teki UYDURMA örnektir,
   kaydedilen girişler yalnızca bu cihazın tarayıcısında (localStorage) kalır. */
const GIRDI_ON = "zk-girdi:";
async function dosyaOku(yol) {
  if (yol.startsWith(YOL.girdiKlasor + "/")) {
    let v = null; try { v = localStorage.getItem(GIRDI_ON + yol); } catch { /* özel pencere */ }
    return v == null ? null : { metin: v, sha: null };
  }
  const m = ORNEK[yol];
  return m == null ? null : { metin: m, sha: null };
}
async function dosyaYaz(yol, metin) {
  if (!yol.startsWith(YOL.girdiKlasor + "/")) throw new Error("Pilot sürüm yalnızca kendi girişlerini kaydeder.");
  try { localStorage.setItem(GIRDI_ON + yol, metin); } catch { throw new Error("Bu tarayıcı kayda izin vermiyor (özel pencere?)."); }
  return { sha: null };
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
  return { surum: 1, gun, islendi: false, guncelleme: null, gorevler: {}, aliskanlik: {}, kaza: {}, kacan: [], staj_saat: null, yatti: "", kalkti: "", karalama: "" };
}
function girdiAyristir(md, gun) {
  const m = md && md.match(/```json\s*([\s\S]*?)```/); if (!m) return bosGirdi(gun);
  try { return Object.assign(bosGirdi(gun), JSON.parse(m[1])); } catch { return bosGirdi(gun); }
}
function girdiMarkdown(g) {
  const s = [`# Girdi · ${g.gun}`, "", "*Zihnimin Kıvrımları uygulamasından. Claude bu dosyayı işleyince JSON'da `\"islendi\": true` yapar; uygulama yeni giriş kaydederse tekrar `false` olur.*", "", "## Özet", ""];
  const kar = Object.entries(g.gorevler);
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
    const saat = el("span", "saat"); saat.append(e.bas, document.createElement("br"), e.bit || "");
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
  if (karar === "geri" || (g[t.ad] && g[t.ad].karar === karar && !gun)) delete g[t.ad];
  else if (karar === "yarin") g[t.ad] = { karar, gun: gunEkle(durum.gun, 1) };
  else if (karar === "kismen") g[t.ad] = { karar, gun: gun || gunEkle(durum.gun, 1) };
  else if (karar === "gun") g[t.ad] = { karar, gun };
  else g[t.ad] = { karar };
  titret(); degisti(); cizBugun();
}
function sayfaAc(t) {
  durum.sayfaGorev = t;
  $("#sayfa-baslik").textContent = t.ad;
  const gi = $("#sayfa-gun"); gi.value = gunEkle(durum.gun, 2); gi.min = gunEkle(durum.gun, 1);
  $("#sayfa-geri").hidden = !durum.girdi.gorevler[t.ad];
  $("#perde").hidden = false; $("#sayfa").hidden = false;
  $("#sayfa").querySelector("button").focus();
}
function sayfaKapat() { $("#perde").hidden = true; $("#sayfa").hidden = true; durum.sayfaGorev = null; }
$("#perde").addEventListener("click", sayfaKapat);
for (const b of document.querySelectorAll("#sayfa button")) {
  b.addEventListener("click", () => { const t = durum.sayfaGorev; if (b.dataset.karar !== "kapat" && t) kararVer(t, b.dataset.karar); sayfaKapat(); });
}
$("#sayfa-gun").addEventListener("change", (e) => {
  const t = durum.sayfaGorev; if (t && /^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) kararVer(t, "gun", e.target.value); sayfaKapat();
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#sayfa").hidden) sayfaKapat(); });

/* ---------- GİRİŞ ---------- */
function cizGiris() {
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
$("#karalama").addEventListener("input", (e) => { durum.girdi.karalama = e.target.value; degisti(); });
$("#staj").addEventListener("input", (e) => { durum.girdi.staj_saat = e.target.value === "" ? null : Number(e.target.value); degisti(); });
$("#yatti").addEventListener("input", (e) => { durum.girdi.yatti = e.target.value; degisti(); });
$("#kalkti").addEventListener("input", (e) => { durum.girdi.kalkti = e.target.value; degisti(); });

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
  mini = { N, K, tuval }; miniCiz();
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
  for (const n of N) { n.sx = n.x * k + ox; n.sy = n.y * k + oy; n.r = 2.5 + Math.min(7, Math.sqrt(n.der) * 1.3); }
  c.strokeStyle = "rgba(107,115,133,.18)"; c.lineWidth = 0.7; c.beginPath();
  for (const [i, j] of K) { c.moveTo(N[i].sx, N[i].sy); c.lineTo(N[j].sx, N[j].sy); } c.stroke();
  for (const n of N) { c.fillStyle = renk(KLASOR_RENK[n.d.klasor] || "diger"); c.beginPath(); c.arc(n.sx, n.sy, n.r, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = "#1b2230"; c.font = "600 10px system-ui, sans-serif"; c.textAlign = "center";
  // en çok bağlantılı notların adı; birbirinin üstüne binenler atlanır
  const kutular = [];
  for (const n of [...N].sort((a, b) => b.der - a.der).slice(0, 14)) {
    const ad = n.d.ad.replace(/^\d+\s/, ""); const gen = c.measureText(ad).width;
    const k = { x: n.sx - gen / 2 - 3, y: n.sy - n.r - 15, w: gen + 6, h: 13 };
    if (k.x < 0 || k.x + k.w > w || k.y < 0) continue;
    if (kutular.some((o) => k.x < o.x + o.w && o.x < k.x + k.w && k.y < o.y + o.h && o.y < k.y + k.h)) continue;
    kutular.push(k);
    c.fillStyle = "rgba(255,255,255,.85)"; c.fillRect(k.x, k.y, k.w, k.h);
    c.fillStyle = "#1b2230"; c.fillText(ad, n.sx, n.sy - n.r - 5);
    if (kutular.length >= 6) break;
  }
}
$("#mini").addEventListener("click", (e) => {
  if (!mini) return; const r = mini.tuval.getBoundingClientRect(); const x = e.clientX - r.left, y = e.clientY - r.top;
  let en = null, ed = 22 * 22;
  for (const n of mini.N) { const d = (n.sx - x) ** 2 + (n.sy - y) ** 2; if (d < ed) { ed = d; en = n; } }
  if (en) { titret(); durum.notYigini = []; notAc(en.d.yol); }
});
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
function cizKaza(satirlar) {
  const kap = $("#kaza-ozet"); kap.replaceChildren();
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

/* ---------- yükleme ve gezinme ---------- */
function bilgi(m, tur) { const b = $("#durum"); b.hidden = !m; b.textContent = m || ""; b.className = "bilgi" + (tur ? " " + tur : ""); }
function taslakAl(gun) { try { const t = JSON.parse(localStorage.getItem("zk-taslak") || "null"); return t && t.gun === gun ? t : null; } catch { return null; } }
async function yukle() {
  bilgi("");
  try {
    const [g, h, p, gi] = await Promise.all([dosyaOku(YOL.gorevler), dosyaOku(YOL.hafta), dosyaOku(YOL.bugun), dosyaOku(`${YOL.girdiKlasor}/${durum.gun}.md`)]);
    durum.gorevler = g ? gorevleriAyristir(g.metin) : [];
    durum.hafta = h ? haftayiAyristir(h.metin) : [];
    try { durum.plan = p ? JSON.parse(p.metin) : null; } catch { durum.plan = null; }
    durum.girdi = girdiAyristir(gi && gi.metin, durum.gun); durum.girdiSha = gi && gi.sha;
    const t = taslakAl(durum.gun);
    if (t && (!durum.girdi.guncelleme || t.guncelleme === durum.girdi.guncelleme) && JSON.stringify(t) !== JSON.stringify(durum.girdi)) { durum.girdi = t; durum.degisti = true; }
    bilgi("");
  } catch (e) { bilgi("⚠️ " + e.message, "kotu"); durum.girdi = durum.girdi || bosGirdi(durum.gun); }
  durum.haritaYuklendi = false; durum.gidisatYuklendi = false;
  cizBugun(); cizGiris(); kaydetDurum();
  if (durum.ekran === "harita") haritaYukle(); if (durum.ekran === "gidisat") gidisatYukle();
}
function ekranAc(ad) {
  durum.ekran = ad;
  for (const s of document.querySelectorAll(".ekran")) s.classList.toggle("aktif", s.id === "ekran-" + ad);
  for (const b of document.querySelectorAll(".alt button")) { const ak = b.dataset.ekran === ad; b.classList.toggle("aktif", ak); b.setAttribute("aria-current", ak ? "page" : "false"); }
  if (ad === "harita") { haritaYukle().then(() => requestAnimationFrame(miniCiz)); }
  if (ad === "gidisat") gidisatYukle();
  kaydetDurum(); window.scrollTo({ top: 0 });
}
for (const b of document.querySelectorAll(".alt button")) b.addEventListener("click", () => { if (b.dataset.ekran === "harita" && durum.ekran === "harita") haritaGorunum("ana"); ekranAc(b.dataset.ekran); });
$("#ayar-ac").addEventListener("click", () => ekranAc(durum.ekran === "ayar" ? "bugun" : "ayar"));

(function ayarEkrani() {
  const a = ayarOku();
  $("#ayar-ad").value = a.ad || "";
  $("#ayar-ad").addEventListener("change", (e) => { ayarYaz({ ad: e.target.value.trim().slice(0, 40) }); cizBugun(); });
  $("#ayar-sil").addEventListener("click", async () => {
    if (!confirm("Bu cihazdaki tüm girişler ve ayarlar silinsin mi?")) return;
    try { localStorage.clear(); } catch { /* yok */ }
    try { for (const k of await caches.keys()) await caches.delete(k); } catch { /* yok */ }
    location.reload();
  });
})();

window.addEventListener("beforeunload", (e) => { if (durum.degisti) { e.preventDefault(); e.returnValue = ""; } });
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible" || durum.degisti) return;
  const g = gunHesapla(); if (g !== durum.gun) { durum.gun = g; yukle(); } else if (durum.ekran === "bugun") cizTakvim();
});
// iPhone Safari "user-scalable=no"yu yok sayar: iki parmakla büyütmeyi burada engelle
document.addEventListener("gesturestart", (e) => e.preventDefault());
document.addEventListener("touchmove", (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
  // yeni sürüm gelince (kaydedilmemiş değişiklik yoksa) bir kez kendini yenile
  let yenilendi = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (!yenilendi && !durum.degisti) { yenilendi = true; location.reload(); } });
}
yukle();
