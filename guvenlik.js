"use strict";
/* Güvenlik çekirdeği: şifreli anahtar kasası, GitHub bağlantısı ve Claude (YZ) çağrısı.
   - Anahtarlar (GitHub token, Claude API anahtarı) cihazda yalnızca AES-GCM ile ŞİFRELİ durur.
     Şifre anahtarı kullanıcının PIN'inden PBKDF2-SHA256 (600.000 tur) ile türetilir; PIN hiçbir yere yazılmaz.
   - Kasa açıkken çözülmüş anahtarlar yalnızca bu sayfanın hafızasındadır; kilitlenince silinir.
   - GitHub'a yalnızca "05 Günlük Sistem/Girdiler/" altına yazılabilir. */

const Kasa = (() => {
  const ANAHTAR = "zk-kasa"; const DENEME = "zk-kasa-deneme";
  const enc = new TextEncoder(), dec = new TextDecoder();
  const b64 = (u8) => { let s = ""; for (const b of u8) s += String.fromCharCode(b); return btoa(s); };
  const ub64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  let icerik = null, anahtar = null, tuz = null;

  async function turet(pin, t) {
    const ham = await crypto.subtle.importKey("raw", enc.encode(pin), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "PBKDF2", salt: t, iterations: 600000, hash: "SHA-256" }, ham, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  }
  function kayitli() { try { return JSON.parse(localStorage.getItem(ANAHTAR) || "null"); } catch { return null; } }
  async function yaz(veri) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, anahtar, enc.encode(JSON.stringify(veri))));
    localStorage.setItem(ANAHTAR, JSON.stringify({ surum: 1, tuz: b64(tuz), iv: b64(iv), ct: b64(ct) }));
    icerik = veri;
  }
  function pinUygun(pin) { return typeof pin === "string" && pin.length >= 6 && pin.length <= 64; }

  return {
    varMi: () => !!kayitli(),
    acikMi: () => !!icerik,
    oku: () => (icerik ? JSON.parse(JSON.stringify(icerik)) : null),
    pinUygun,
    async kur(pin, veri) {
      if (!pinUygun(pin)) throw new Error("PIN en az 6 karakter olmalı.");
      tuz = crypto.getRandomValues(new Uint8Array(16)); anahtar = await turet(pin, tuz);
      await yaz(veri); localStorage.removeItem(DENEME);
    },
    async ac(pin) {
      const v = kayitli(); if (!v) throw new Error("Kasa yok.");
      const hatali = Number(localStorage.getItem(DENEME) || 0);
      if (hatali >= 10) { this.sil(); throw new Error("10 kez yanlış PIN girildi; kasa güvenlik için silindi. Anahtarları yeniden gir."); }
      const t = ub64(v.tuz); const k = await turet(pin, t);
      try {
        const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: ub64(v.iv) }, k, ub64(v.ct));
        icerik = JSON.parse(dec.decode(pt)); anahtar = k; tuz = t; localStorage.removeItem(DENEME);
      } catch {
        localStorage.setItem(DENEME, String(hatali + 1));
        await new Promise((r) => setTimeout(r, 400 * (hatali + 1)));
        throw new Error(`PIN yanlış (${hatali + 1}/10).`);
      }
    },
    async guncelle(degisiklik) {
      if (!icerik || !anahtar) throw new Error("Önce kasayı aç.");
      await yaz({ ...icerik, ...degisiklik });
    },
    kilitle() { icerik = null; anahtar = null; tuz = null; },
    sil() { try { localStorage.removeItem(ANAHTAR); localStorage.removeItem(DENEME); } catch { /* yok */ } this.kilitle(); },
  };
})();

/* ---------- GitHub (Contents API) ---------- */
const GITHUB_YAZILABILIR = "05 Günlük Sistem/Girdiler/";
function ghBilgi() {
  const k = Kasa.oku(); const g = k && k.github;
  if (!g || !g.token || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(g.repo || "")) throw new Error("GitHub bağlantısı yok ya da kasa kilitli.");
  return g;
}
function ghYol(yol) { return yol.split("/").map(encodeURIComponent).join("/"); }
function ghB64Coz(b64) { const bin = atob(b64.replace(/\n/g, "")); return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))); }
function ghB64Yap(metin) { const b = new TextEncoder().encode(metin); let bin = ""; for (let i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(bin); }
async function githubOku(yol) {
  const g = ghBilgi();
  const r = await fetch(`https://api.github.com/repos/${g.repo}/contents/${ghYol(yol)}?ref=${encodeURIComponent(g.dal || "main")}`, {
    headers: { Authorization: `Bearer ${g.token}`, Accept: "application/vnd.github+json" }, cache: "no-store", referrerPolicy: "no-referrer", credentials: "omit",
  });
  if (r.status === 404) return null;
  if (r.status === 401 || r.status === 403) throw new Error("GitHub anahtarı geçersiz ya da izni yok (Ayarlar → Veri kaynağı).");
  if (!r.ok) throw new Error(`GitHub hatası ${r.status}`);
  const j = await r.json();
  if (j.content == null) {
    if (typeof j.git_url !== "string" || !j.git_url.startsWith("https://api.github.com/")) throw new Error("Beklenmeyen GitHub yanıtı.");
    const r2 = await fetch(j.git_url, { headers: { Authorization: `Bearer ${g.token}`, Accept: "application/vnd.github.raw" }, referrerPolicy: "no-referrer", credentials: "omit" });
    return { metin: await r2.text(), sha: j.sha };
  }
  return { metin: ghB64Coz(j.content), sha: j.sha };
}
async function githubYaz(yol, metin, mesaj, sha) {
  if (!yol.startsWith(GITHUB_YAZILABILIR) || yol.includes("..")) throw new Error("Uygulama yalnızca Girdiler klasörüne yazabilir.");
  const g = ghBilgi();
  const govde = { message: mesaj, content: ghB64Yap(metin), branch: g.dal || "main" }; if (sha) govde.sha = sha;
  const r = await fetch(`https://api.github.com/repos/${g.repo}/contents/${ghYol(yol)}`, {
    method: "PUT", referrerPolicy: "no-referrer", credentials: "omit",
    headers: { Authorization: `Bearer ${g.token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
    body: JSON.stringify(govde),
  });
  if (r.status === 409 || r.status === 422) { const e = new Error("çakışma"); e.cakisma = true; throw e; }
  if (!r.ok) throw new Error(`Kaydedilemedi (GitHub ${r.status})`);
  return { sha: (await r.json()).content.sha };
}

/* ---------- Claude (YZ) ---------- */
const YZ_MODELLER = [
  ["claude-opus-5-5", "Claude Opus 5.5 (önerilen, en akıllı)"],
  ["claude-sonnet-5-5", "Claude Sonnet 5.5 (hızlı, daha ucuz)"],
  ["claude-haiku-5-5", "Claude Haiku 5.5 (en hızlı, en ucuz)"],
];
async function yzSdkYukle() {
  if (globalThis.AnthropicSDK) return globalThis.AnthropicSDK;
  await new Promise((tamam, hata) => {
    const s = document.createElement("script"); s.src = "vendor/anthropic-sdk.js";
    s.onload = tamam; s.onerror = () => hata(new Error("Claude bileşeni yüklenemedi (internet?)."));
    document.head.append(s);
  });
  return globalThis.AnthropicSDK;
}
/* Tek istek, yapılandırılmış JSON yanıt. Opus/Sonnet'te güvenlik reddine karşı sunucu tarafı yedek model açık. */
async function yzIste({ sistem, mesaj, sema, model, maxTokens = 8000 }) {
  const k = Kasa.oku(); const anahtar = k && k.yz && k.yz.anahtar;
  if (!anahtar) throw new Error("Claude anahtarı yok ya da kasa kilitli (Ayarlar → Yapay zekâ).");
  const Anthropic = await yzSdkYukle();
  const client = new Anthropic({ apiKey: anahtar, dangerouslyAllowBrowser: true, maxRetries: 1, timeout: 120000 });
  const secilen = model || "claude-opus-5-5";
  const istek = {
    model: secilen, max_tokens: maxTokens, system: sistem,
    messages: [{ role: "user", content: mesaj }],
    output_config: { effort: "low", format: { type: "json_schema", schema: sema } },
  };
  let yanit;
  try {
    yanit = secilen === "claude-haiku-5-5"
      ? await client.messages.create(istek)
      : await client.beta.messages.create({ ...istek, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new Error("Claude anahtarı geçersiz.");
    if (e instanceof Anthropic.PermissionDeniedError) throw new Error("Bu anahtarın bu modele izni yok.");
    if (e instanceof Anthropic.RateLimitError) throw new Error("Çok sık istek gönderildi; biraz sonra tekrar dene.");
    if (e instanceof Anthropic.BadRequestError) throw new Error("İstek reddedildi: " + (e.message || "geçersiz istek").slice(0, 160));
    if (e instanceof Anthropic.APIConnectionError) throw new Error("Claude'a bağlanılamadı (internet?).");
    if (e instanceof Anthropic.APIError) throw new Error(`Claude hatası (${e.status || "?"}).`);
    throw e;
  }
  if (yanit.stop_reason === "refusal") throw new Error("Claude bu isteği yanıtlamadı.");
  if (yanit.stop_reason === "max_tokens") throw new Error("Yanıt yarıda kesildi; daha kısa bir metinle dene.");
  const metin = yanit.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  try { return JSON.parse(metin); } catch { throw new Error("Claude'un yanıtı okunamadı."); }
}
