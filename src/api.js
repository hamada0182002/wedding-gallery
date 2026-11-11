import { API_URL } from './config';

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
