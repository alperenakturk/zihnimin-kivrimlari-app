"use strict";
/* Zihnimin Kıvrımları — kişisel günlük panel.
   Kasa (GitHub repo) okunur; o günün girişleri tek bir "girdi" dosyasına yazılır:
   05 Günlük Sistem/Girdiler/YYYY-MM-DD.md  (içinde ```json bloğu).
   Görevler/Alışkanlıklar/Din Takibi dosyalarını Claude (brifler) bu girdiye göre günceller. */

const YOL = {
  gorevler: "05 Günlük Sistem/Görevler.md",
  hafta: "00 Bu Hafta.md",
  girdiKlasor: "05 Günlük Sistem/Girdiler",
};
const ALISKANLIK = [
  ["dis", "Diş"], ["bakim", "Kişisel bakım"], ["nba", "NBA Fantasy"], ["para", "Para hesabı"], ["gym", "GYM"],
];
const VAKIT = [
  ["sabah", "Sabah"], ["ogle", "Öğle"], ["ikindi", "İkindi"], ["aksam", "Akşam"], ["yatsi", "Yatsı"], ["vitir", "Vitir"],
];
const KARAR_AD = { bitti: "Bitti", kismen: "Kısmen", yarin: "Yarına", iptal: "İptal", gun: "Ertelendi" };
const GUN_DONUMU_SAAT = 5; // 05:00'ten önce girilenler bir önceki güne yazılır

const $ = (s) => document.querySelector(s);
const demo = new URLSearchParams(location.search).has("demo");

const durum = {
  gun: gunHesapla(),
  gorevler: [],
  hafta: [],
  girdi: null,     // o günün girdisi (JSON)
  girdiSha: null,
  degisti: false,
};

/* ---------- tarih ---------- */
function iso(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function gunHesapla() {
  const d = new Date();
  if (d.getHours() < GUN_DONUMU_SAAT) d.setDate(d.getDate() - 1);
  return iso(d);
}
function gunEkle(isoGun, n) {
  const [y, m, g] = isoGun.split("-").map(Number);
  const d = new Date(y, m - 1, g + n);
  return iso(d);
}
function gunYazi(isoGun) {
  const [y, m, g] = isoGun.split("-").map(Number);
  return new Date(y, m - 1, g).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });
}

/* ---------- ayarlar ---------- */
function ayarOku() {
  try { return JSON.parse(localStorage.getItem("zk-ayar") || "{}"); } catch { return {}; }
}
function ayarYaz(a) {
  try { localStorage.setItem("zk-ayar", JSON.stringify(a)); } catch { /* özel pencere */ }
}

/* ---------- GitHub ---------- */
function b64Coz(b64) {
  const bin = atob(b64.replace(/\n/g, ""));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}
function b64Yap(metin) {
  const baytlar = new TextEncoder().encode(metin);
  let bin = "";
  for (let i = 0; i < baytlar.length; i += 0x8000) bin += String.fromCharCode(...baytlar.subarray(i, i + 0x8000));
  return btoa(bin);
}
function apiYol(yol) {
  const a = ayarOku();
  return `https://api.github.com/repos/${a.repo}/contents/${yol.split("/").map(encodeURIComponent).join("/")}`;
}
async function dosyaOku(yol) {
  if (demo) {
    const r = await fetch("demo/" + yol.split("/").map(encodeURIComponent).join("/"), { cache: "no-store" });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`demo dosyası okunamadı: ${yol}`);
    return { metin: await r.text(), sha: null };
  }
  const a = ayarOku();
  const r = await fetch(`${apiYol(yol)}?ref=${encodeURIComponent(a.dal || "main")}`, {
    headers: { Authorization: `Bearer ${a.token}`, Accept: "application/vnd.github+json" },
    cache: "no-store",
  });
  if (r.status === 404) return null;
  if (r.status === 401 || r.status === 403) throw new Error("Anahtar geçersiz ya da izni yok (Ayarlar).");
  if (!r.ok) throw new Error(`GitHub hatası ${r.status}`);
  const j = await r.json();
  return { metin: b64Coz(j.content), sha: j.sha };
}
async function dosyaYaz(yol, metin, mesaj, sha) {
  if (demo) return { sha: null };
  const a = ayarOku();
  const govde = { message: mesaj, content: b64Yap(metin), branch: a.dal || "main" };
  if (sha) govde.sha = sha;
  const r = await fetch(apiYol(yol), {
    method: "PUT",
    headers: { Authorization: `Bearer ${a.token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
    body: JSON.stringify(govde),
  });
  if (r.status === 409 || r.status === 422) {
    const e = new Error("çakışma"); e.cakisma = true; throw e;
  }
  if (!r.ok) throw new Error(`Kaydedilemedi (GitHub ${r.status})`);
  const j = await r.json();
  return { sha: j.content.sha };
}

/* ---------- ayrıştırma ---------- */
function gorevleriAyristir(md) {
  const sonuc = [];
  let bolum = "";
  for (const satir of md.split(/\r?\n/)) {
    const b = satir.match(/^##\s+(.*)$/);
    if (b) { bolum = b[1].trim(); continue; }
    const m = satir.match(/^- \[( |\/)\] (.*)$/);
    if (!m) continue;
    const govde = m[2];
    const planli = (govde.match(/⏳\s*(\d{4}-\d{2}-\d{2})/) || [])[1] || null;
    const son = (govde.match(/📅\s*(\d{4}-\d{2}-\d{2})/) || [])[1] || null;
    const oncelik = (govde.match(/[⏫🔼🔽]/u) || [""])[0];
    const etiketler = govde.match(/#[\p{L}\p{N}_-]+/gu) || [];
    // görevin adı: ilk işaretten (öncelik, tarih, etiket, not) öncesi
    const ad = govde.split(/\s(?:⏫|🔼|🔽|⏳|📅|#[\p{L}\p{N}_-]|—)/u)[0].trim();
    const notMetni = govde.includes(" — ") ? govde.slice(govde.indexOf(" — ") + 3).trim() : "";
    sonuc.push({ ad, planli, son, oncelik, etiketler, not: notMetni, bekliyor: m[1] === "/", bolum, satir });
  }
  return sonuc;
}
function haftayiAyristir(md) {
  const i = md.indexOf("## Bu haftanın 3 işi");
  if (i < 0) return [];
  const parca = md.slice(i).split(/\n## /)[0];
  return [...parca.matchAll(/^\d+\.\s+\[( |x)\]\s+(.*)$/gm)].map((m) => ({
    bitti: m[1] === "x",
    metin: m[2].replace(/\*\*/g, "").replace(/\[\[([^\]|]+)\|?([^\]]*)\]\]/g, (_, a, b) => b || a),
  }));
}
function bosGirdi(gun) {
  return {
    surum: 1, gun, islendi: false, guncelleme: null,
    gorevler: {},                       // ad -> { karar, gun? }
    aliskanlik: {},                     // dis/bakim/nba/para/gym -> true
    kaza: {},                           // sabah.. -> kılınan adet
    kacan: [],                          // vaktinde kılınamayan vakitler
    staj_saat: null, yatti: "", kalkti: "", karalama: "",
  };
}
function girdiAyristir(md, gun) {
  const m = md && md.match(/```json\s*([\s\S]*?)```/);
  if (!m) return bosGirdi(gun);
  try { return Object.assign(bosGirdi(gun), JSON.parse(m[1])); } catch { return bosGirdi(gun); }
}
function girdiMarkdown(g) {
  const s = [];
  s.push(`# Girdi · ${g.gun}`, "");
  s.push("*Zihnimin Kıvrımları uygulamasından. Claude bu dosyayı işleyince JSON'da `\"islendi\": true` yapar; uygulama yeni giriş kaydederse tekrar `false` olur.*", "");
  s.push("## Özet", "");
  const kararlar = Object.entries(g.gorevler);
  if (kararlar.length) {
    s.push("**Görevler:**");
    for (const [ad, k] of kararlar) s.push(`- ${ad} → ${KARAR_AD[k.karar] || k.karar}${k.gun ? " (" + k.gun + ")" : ""}`);
    s.push("");
  }
  const yapilan = ALISKANLIK.filter(([k]) => g.aliskanlik[k]).map(([, ad]) => ad);
  if (yapilan.length) s.push(`**Yapılanlar:** ${yapilan.join(", ")}`, "");
  const kaza = VAKIT.filter(([k]) => g.kaza[k] > 0).map(([k, ad]) => `${ad} +${g.kaza[k]}`);
  if (kaza.length) s.push(`**Kılınan kaza:** ${kaza.join(", ")}`, "");
  if (g.kacan.length) s.push(`**Vaktinde kılınamayan:** ${g.kacan.map((k) => VAKIT.find((v) => v[0] === k)[1]).join(", ")}`, "");
  if (g.staj_saat) s.push(`**Staj:** ${g.staj_saat} saat`, "");
  if (g.yatti || g.kalkti) s.push(`**Uyku:** yattı ${g.yatti || "?"} · kalktı ${g.kalkti || "?"}`, "");
  if (g.karalama.trim()) s.push("**Kafamdan geçenler:**", "", g.karalama.trim(), "");
  s.push("## Veri", "", "```json", JSON.stringify(g, null, 2), "```", "");
  return s.join("\n");
}

/* ---------- çizim ---------- */
function bugunMu(t) { return t.planli && t.planli <= durum.gun || t.son && t.son <= durum.gun; }
function ciz() {
  $("#tarih").textContent = gunYazi(durum.gun) + (demo ? " · DEMO" : "");
  // hafta
  const h = $("#hafta"); h.replaceChildren();
  if (!durum.hafta.length) h.append(li("bos", "Bu hafta için iş yazılmamış."));
  for (const x of durum.hafta) h.append(li(x.bitti ? "bitti" : "", (x.bitti ? "✓ " : "○ ") + x.metin));

  const acik = durum.gorevler.filter((t) => !t.bekliyor);
  const bugun = acik.filter(bugunMu).sort(siralama);
  const ucGun = gunEkle(durum.gun, 3);
  const diger = durum.gorevler.filter((t) => !bugun.includes(t) && (t.bekliyor || (t.son && t.son <= ucGun) || (t.planli && t.planli <= ucGun))).sort(siralama);

  gorevListesi($("#gorevler"), bugun, "Bugün için planlı görev yok.");
  gorevListesi($("#bekleyenler"), diger, "Yok.");
  const karari = bugun.filter((t) => durum.girdi.gorevler[t.ad]).length;
  $("#sayac-bugun").textContent = bugun.length ? `${karari}/${bugun.length}` : "";
  $("#sayac-bekleyen").textContent = diger.length || "";

  // giriş
  $("#karalama").value = durum.girdi.karalama;
  $("#staj").value = durum.girdi.staj_saat ?? "";
  $("#yatti").value = durum.girdi.yatti;
  $("#kalkti").value = durum.girdi.kalkti;
  aliskanlikCiz(); namazCiz();
  kaydetDurum();
}
function li(sinif, metin) { const e = document.createElement("li"); if (sinif) e.className = sinif; e.textContent = metin; return e; }
function siralama(a, b) {
  const p = { "⏫": 0, "🔼": 1, "🔽": 2, "": 1.5 };
  return (p[a.oncelik] - p[b.oncelik]) || String(a.son || a.planli || "9").localeCompare(String(b.son || b.planli || "9"));
}
function gorevListesi(ul, liste, bosMetin) {
  ul.replaceChildren();
  if (!liste.length) { ul.append(li("bos", bosMetin)); return; }
  const sablon = $("#sablon-gorev");
  for (const t of liste) {
    const e = sablon.content.firstElementChild.cloneNode(true);
    const k = durum.girdi.gorevler[t.ad];
    const gec = (t.planli && t.planli < durum.gun) || (t.son && t.son < durum.gun);
    e.classList.toggle("gecikmis", !!gec && !k);
    e.classList.toggle("bugun", !gec && bugunMu(t) && !k);
    e.querySelector(".oncelik").textContent = t.oncelik || "•";
    e.querySelector(".metin").textContent = t.ad;
    const bilgi = [];
    if (t.bekliyor) bilgi.push("bekliyor");
    if (t.son) bilgi.push("📅 " + kisaTarih(t.son));
    if (t.planli && t.planli !== t.son) bilgi.push("⏳ " + kisaTarih(t.planli));
    bilgi.push(t.bolum.replace(/^\S+\s/, ""));
    e.querySelector(".etiketler").textContent = bilgi.join(" · ");
    if (t.not) e.title = t.not;
    if (k) {
      e.classList.add("kararli", k.karar);
      const r = e.querySelector(".karar");
      r.textContent = (KARAR_AD[k.karar] || k.karar) + (k.gun ? " → " + kisaTarih(k.gun) : "");
      r.classList.add(k.karar === "yarin" || k.karar === "gun" ? "ertele" : k.karar);
    }
    for (const d of e.querySelectorAll(".dugmeler button")) {
      if (k && k.karar === d.dataset.karar) d.classList.add("secili");
      d.addEventListener("click", () => kararVer(t, d.dataset.karar));
    }
    ul.append(e);
  }
}
function kisaTarih(isoGun) {
  if (isoGun === durum.gun) return "bugün";
  if (isoGun === gunEkle(durum.gun, 1)) return "yarın";
  const [, m, g] = isoGun.split("-").map(Number);
  return `${g}.${m}`;
}
function kararVer(t, karar) {
  const g = durum.girdi.gorevler;
  if (g[t.ad] && g[t.ad].karar === karar) { delete g[t.ad]; degisti(); ciz(); return; }
  if (karar === "gun") {
    const gun = prompt("Hangi güne? (YYYY-AA-GG)", gunEkle(durum.gun, 2));
    if (!gun || !/^\d{4}-\d{2}-\d{2}$/.test(gun)) return;
    g[t.ad] = { karar, gun };
  } else if (karar === "yarin") {
    g[t.ad] = { karar, gun: gunEkle(durum.gun, 1) };
  } else {
    g[t.ad] = { karar };
  }
  degisti(); ciz();
}
function aliskanlikCiz() {
  const kap = $("#aliskanliklar"); kap.replaceChildren();
  for (const [k, ad] of ALISKANLIK) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "kutucuk" + (durum.girdi.aliskanlik[k] ? " acik" : "");
    b.innerHTML = `<span class="kare">${durum.girdi.aliskanlik[k] ? "✓" : ""}</span><span></span>`;
    b.lastChild.textContent = ad;
    b.addEventListener("click", () => {
      if (durum.girdi.aliskanlik[k]) delete durum.girdi.aliskanlik[k]; else durum.girdi.aliskanlik[k] = true;
      degisti(); aliskanlikCiz();
    });
    kap.append(b);
  }
}
function namazCiz() {
  const kap = $("#namaz"); kap.replaceChildren();
  for (const [k, ad] of VAKIT) {
    const kacti = durum.girdi.kacan.includes(k);
    const n = durum.girdi.kaza[k] || 0;
    const sat = document.createElement("div");
    sat.className = "vakit" + (kacti ? " kacti" : "");
    sat.innerHTML = `<button type="button" class="vakit-ad"><span></span><small></small></button>
      <div class="sayac"><button type="button" aria-label="azalt">−</button><output></output><button type="button" aria-label="artır">+</button></div>`;
    sat.querySelector(".vakit-ad span").textContent = ad;
    sat.querySelector(".vakit-ad small").textContent = kacti ? "bugün kılınamadı" : "bugün kılındı";
    sat.querySelector("output").textContent = n;
    sat.querySelector(".vakit-ad").addEventListener("click", () => {
      const l = durum.girdi.kacan;
      if (kacti) l.splice(l.indexOf(k), 1); else l.push(k);
      if (k === "yatsi" && !kacti && !l.includes("vitir")) l.push("vitir"); // kural: yatsı kaçarsa vitir de
      degisti(); namazCiz();
    });
    const [eksi, arti] = sat.querySelectorAll(".sayac button");
    eksi.addEventListener("click", () => { if (n > 0) { durum.girdi.kaza[k] = n - 1; if (!durum.girdi.kaza[k]) delete durum.girdi.kaza[k]; degisti(); namazCiz(); } });
    arti.addEventListener("click", () => { durum.girdi.kaza[k] = n + 1; degisti(); namazCiz(); });
    kap.append(sat);
  }
}

/* ---------- kaydet ---------- */
function degisti() { durum.degisti = true; kaydetDurum(); taslakSakla(); }
function kaydetDurum() {
  const b = $("#kaydet");
  b.disabled = !durum.degisti;
  const g = durum.girdi;
  $("#kayit-durum").textContent = durum.degisti ? "Kaydedilmemiş değişiklik var"
    : g && g.guncelleme ? `Kaydedildi ${new Date(g.guncelleme).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}${g.islendi ? " · Claude işledi ✓" : ""}` : "";
}
function taslakSakla() {
  try { localStorage.setItem("zk-taslak", JSON.stringify(durum.girdi)); } catch { /* yok say */ }
}
function taslakAl(gun) {
  try {
    const t = JSON.parse(localStorage.getItem("zk-taslak") || "null");
    return t && t.gun === gun ? t : null;
  } catch { return null; }
}
async function kaydet() {
  const b = $("#kaydet");
  b.disabled = true; $("#kayit-durum").textContent = "Kaydediliyor…";
  durum.girdi.islendi = false;
  durum.girdi.guncelleme = new Date().toISOString();
  const yol = `${YOL.girdiKlasor}/${durum.gun}.md`;
  try {
    let sonuc;
    try {
      sonuc = await dosyaYaz(yol, girdiMarkdown(durum.girdi), `Uygulama girdisi: ${durum.gun}`, durum.girdiSha);
    } catch (e) {
      if (!e.cakisma) throw e;
      const son = await dosyaOku(yol);        // başkası yazdıysa en yeni sha ile tekrar dene
      sonuc = await dosyaYaz(yol, girdiMarkdown(durum.girdi), `Uygulama girdisi: ${durum.gun}`, son && son.sha);
    }
    durum.girdiSha = sonuc.sha;
    durum.degisti = false;
    try { localStorage.removeItem("zk-taslak"); } catch { /* yok say */ }
    kaydetDurum();
    if (demo) $("#kayit-durum").textContent = "Demo: kaydedilmedi (gerçek modda kasaya yazılır)";
  } catch (e) {
    $("#kayit-durum").textContent = "⚠️ " + e.message;
    b.disabled = false;
  }
}

/* ---------- yükleme ---------- */
async function yukle() {
  const bilgi = $("#durum-bugun");
  const a = ayarOku();
  if (!demo && (!a.repo || !a.token)) {
    bilgi.className = "bilgi"; bilgi.textContent = "Önce Ayarlar'dan repo ve anahtar gir (ya da adrese ?demo ekleyip dene).";
    durum.girdi = bosGirdi(durum.gun); ciz(); ekranAc("ayar"); return;
  }
  bilgi.className = "bilgi"; bilgi.textContent = "Kasadan okunuyor…";
  try {
    const [g, h, gi] = await Promise.all([
      dosyaOku(YOL.gorevler), dosyaOku(YOL.hafta), dosyaOku(`${YOL.girdiKlasor}/${durum.gun}.md`),
    ]);
    durum.gorevler = g ? gorevleriAyristir(g.metin) : [];
    durum.hafta = h ? haftayiAyristir(h.metin) : [];
    durum.girdi = girdiAyristir(gi && gi.metin, durum.gun);
    durum.girdiSha = gi && gi.sha;
    const taslak = taslakAl(durum.gun);
    if (taslak && (!durum.girdi.guncelleme || taslak.guncelleme === durum.girdi.guncelleme)) {
      // kaydedilmemiş yerel taslak: kasadaki sürümden sonra yapılmışsa onu kullan
      if (JSON.stringify(taslak) !== JSON.stringify(durum.girdi)) { durum.girdi = taslak; durum.degisti = true; }
    }
    bilgi.textContent = ""; bilgi.className = "bilgi";
  } catch (e) {
    bilgi.className = "bilgi kotu"; bilgi.textContent = "⚠️ " + e.message;
    durum.girdi = durum.girdi || bosGirdi(durum.gun);
  }
  ciz();
}

/* ---------- gezinme ve olaylar ---------- */
function ekranAc(ad) {
  for (const s of document.querySelectorAll(".ekran")) s.classList.toggle("aktif", s.id === "ekran-" + ad);
  for (const b of document.querySelectorAll(".alt button")) b.classList.toggle("aktif", b.dataset.ekran === ad);
  $(".kaydet-cubugu").style.display = ad === "ayar" ? "none" : "";
}
for (const b of document.querySelectorAll(".alt button")) b.addEventListener("click", () => ekranAc(b.dataset.ekran));
$("#kaydet").addEventListener("click", kaydet);
$("#yenile").addEventListener("click", () => {
  if (durum.degisti && !confirm("Kaydedilmemiş değişiklikler var. Yine de kasadan yenileyeyim mi? (Taslak telefonda saklı kalır.)")) return;
  durum.gun = gunHesapla(); yukle();
});
$("#karalama").addEventListener("input", (e) => { durum.girdi.karalama = e.target.value; degisti(); });
$("#staj").addEventListener("input", (e) => { durum.girdi.staj_saat = e.target.value === "" ? null : Number(e.target.value); degisti(); });
$("#yatti").addEventListener("input", (e) => { durum.girdi.yatti = e.target.value; degisti(); });
$("#kalkti").addEventListener("input", (e) => { durum.girdi.kalkti = e.target.value; degisti(); });

(function ayarEkrani() {
  const a = ayarOku();
  $("#ayar-repo").value = a.repo || "";
  $("#ayar-dal").value = a.dal || "main";
  $("#ayar-token").value = a.token || "";
  $("#ayar-kaydet").addEventListener("click", async () => {
    ayarYaz({ repo: $("#ayar-repo").value.trim(), dal: $("#ayar-dal").value.trim() || "main", token: $("#ayar-token").value.trim() });
    const d = $("#ayar-durum");
    d.className = "bilgi"; d.textContent = "Deneniyor…";
    try {
      const r = await dosyaOku(YOL.gorevler);
      if (!r) throw new Error("Görevler dosyası bulunamadı; repo adı doğru mu?");
      d.className = "bilgi iyi"; d.textContent = "Bağlandı ✓";
      await yukle(); ekranAc("bugun");
    } catch (e) { d.className = "bilgi kotu"; d.textContent = "⚠️ " + e.message; }
  });
})();

window.addEventListener("beforeunload", (e) => { if (durum.degisti) { e.preventDefault(); e.returnValue = ""; } });
document.addEventListener("visibilitychange", () => {
  // uygulamaya geri dönüldüğünde gün değiştiyse yeniden yükle
  if (document.visibilityState === "visible" && gunHesapla() !== durum.gun && !durum.degisti) { durum.gun = gunHesapla(); yukle(); }
});
if ("serviceWorker" in navigator && !demo) navigator.serviceWorker.register("sw.js").catch(() => {});

yukle();
