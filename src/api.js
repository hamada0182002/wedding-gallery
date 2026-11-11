import { API_URL, WORKER_URL } from './config';

const K = 'wg_token';
export const tok = {
  get: () => { try { return localStorage.getItem(K); } catch { return null; } },
  set: (t) => { try { localStorage.setItem(K, t); } catch { /* ignore */ } },
  clear: () => { try { localStorage.removeItem(K); } catch { /* ignore */ } }
};

// نرسل النص كـ text/plain لتجنب طلبات CORS preflight التي لا يدعمها Apps Script
export async function api(action, data = {}) {
  try {
    const r = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, token: tok.get(), ...data })
    });
    return await r.json();
  } catch {
    return { ok: false, error: 'تعذر الاتصال بالسيرفر، تأكد من الإنترنت وحاول مرة أخرى' };
  }
}

/* ---------- خادم الصور (Cloudflare Worker) ---------- */
// التصريح قصير المدة يصدره Apps Script للحساب المسجَّل فقط، ويحمل معرّف مجلده موقّعًا
let pt = null;
async function photoToken(force) {
  if (!force && pt && Date.now() < pt.exp) return pt.t;
  const r = await api('photoToken');
  if (!r.ok) throw new Error(r.error || 'تعذر الحصول على تصريح الصور');
  pt = { t: r.token, exp: Date.now() + 90 * 60 * 1000 };
  return pt.t;
}
export const resetPhotoToken = () => { pt = null; };

export async function wfetch(path, params = {}, retry = true) {
  const qs = new URLSearchParams({ ...params, token: await photoToken(!retry) });
  const r = await fetch(`${WORKER_URL}${path}?${qs}`);
  if (r.status === 401 && retry) return wfetch(path, params, false);
  return r;
}

export async function wjson(path, params = {}) {
  try {
    const r = await wfetch(path, params);
    return r.ok ? await r.json() : { ok: false, error: 'تعذر تحميل الصور، حاول مرة أخرى' };
  } catch (e) {
    return { ok: false, error: e.message || 'تعذر الاتصال بخادم الصور' };
  }
}
