import { useEffect, useRef, useState } from 'react';
import { api, tok } from './api';

const fmt = (d) => (d ? new Date(d).toLocaleDateString('ar-EG', { dateStyle: 'long' }) : '');
const sz = (u, n) => (u ? u.replace(/=s\d+(-c)?$/, '=s' + n) : '');
const cache = { items: [], next: '' };   // يحفظ الصور المحمّلة ليكون الرجوع للمعرض فوريًا
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const gen = () => Math.random().toString(36).slice(2, 6) + Math.random().toString(36).slice(2, 6);

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState({ name: 'home', pick: false });

  useEffect(() => {
    if (!tok.get()) { setReady(true); return; }
    api('me').then((r) => { if (r.ok) setUser(r); else tok.clear(); setReady(true); });
  }, []);

  const logout = async () => { await api('logout'); tok.clear(); cache.items = []; cache.next = ''; setUser(null); setView({ name: 'home', pick: false }); };

  if (!ready) return <div className="center muted">جارٍ التحميل…</div>;
  if (!user) return <Login onOk={setUser} />;
  return (
    <>
      <header>
        <span className="brand">Wedding Gallery</span>
        <button className="btn ghost sm" onClick={logout}>تسجيل الخروج</button>
      </header>
      <main className="wrap">
        {user.role === 'admin' ? <Admin />
          : view.name === 'gallery' ? <Gallery pickInit={view.pick} onBack={() => setView({ name: 'home', pick: false })} />
          : <Home p={user.profile} onOpen={(pick) => setView({ name: 'gallery', pick })} />}
      </main>
    </>
  );
}

function Login({ onOk }) {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!u.trim() || !p) return setErr('اكتب اسم المستخدم وكلمة المرور');
    setBusy(true); setErr('');
    const r = await api('login', { username: u, password: p });
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    tok.set(r.token); onOk(r);
  };

  return (
    <div className="center">
      <div className="card login">
        <h1>Wedding Gallery</h1>
        <p className="muted">ألبوم فرحكم، في مكان واحد آمن</p>
        <label>اسم المستخدم</label>
        <input value={u} onChange={(e) => setU(e.target.value)} autoComplete="username" />
        <label>كلمة المرور</label>
        <input type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password"
               onKeyDown={(e) => e.key === 'Enter' && submit()} />
        <p className="err">{err}</p>
        <button className="btn full" disabled={busy} onClick={submit}>{busy ? 'جارٍ الدخول…' : 'دخول'}</button>
      </div>
    </div>
  );
}

function Home({ p, onOpen }) {
  const [cover, setCover] = useState(cache.items[0] ? sz(cache.items[0].t, 1600) : '');
  useEffect(() => {
    if (p.photos && !cover) api('photos', { pageSize: 1 }).then((r) => r.ok && r.photos[0] && setCover(sz(r.photos[0].t, 1600)));
  }, [p.photos]);
  return (
    <>
      <section className="hero">
        {cover && <img className="cover" src={cover} alt="" referrerPolicy="no-referrer" />}
        <div className="ov">
          <p>أهلًا بكما</p>
          <h1 className="script">{p.names}</h1>
          <p>{fmt(p.date)}</p>
        </div>
      </section>
      <div className="card" style={{ marginTop: '1rem' }}>
        <p style={{ margin: 0 }}>مبروك! ذكرى يومكم الجميل محفوظة هنا بجودتها الكاملة، شاهدوها وحمّلوها وقتما أحببتم.</p>
        <div className="stat"><b>{p.photos}</b><span className="muted">صورة في الألبوم</span></div>
        <div className="row">
          <button className="btn" onClick={() => onOpen(false)}>عرض الصور</button>
          <button className="btn ghost" onClick={() => onOpen(true)}>تنزيل الصور</button>
        </div>
      </div>
    </>
  );
}

const EMPTY = { names: '', date: '', username: '', password: '', driveAccount: 'Drive 1', folderId: '', active: true };

function Admin() {
  const [list, setList] = useState([]);
  const [f, setF] = useState(EMPTY);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  const load = () => api('listCouples').then((r) => r.ok && setList(r.couples));
  useEffect(() => { load(); }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const save = async () => {
    setBusy(true); setMsg('');
    const r = await api('saveCouple', { couple: f });
    setBusy(false);
    if (!r.ok) return setMsg(r.error);
    if (f.password) setDone({ n: f.names, u: f.username, p: f.password });
    setF(EMPTY); load();
  };
  const sync = async () => {
    setBusy(true); const r = await api('syncPhotos'); setBusy(false);
    if (r.ok) setList(r.couples); else setMsg(r.error);
  };
  const toggle = async (c) => { await api('setActive', { id: c.id, active: !c.active }); load(); };
  const edit = (c) => { setDone(null); setF({ ...c, password: '' }); window.scrollTo(0, document.body.scrollHeight); };
  const copy = () => navigator.clipboard.writeText(
    `أهلًا ${done.n} 💍\nرابط الألبوم: ${location.href.split('#')[0]}\nاسم المستخدم: ${done.u}\nكلمة المرور: ${done.p}`);

  return (
    <>
      <h2>لوحة التحكم</h2>
      <p><button className="btn ghost sm" disabled={busy} onClick={sync}>{busy ? 'جارٍ التحديث…' : 'تحديث عدد الصور من Drive'}</button></p>
      <div className="stats">
        <div className="card"><b>{list.length}</b>حسابات</div>
        <div className="card"><b>{list.filter((c) => c.active).length}</b>فعّالة</div>
        <div className="card"><b>{list.reduce((a, c) => a + c.photos, 0)}</b>إجمالي الصور</div>
      </div>

      <div className="card tblw">
        <table>
          <thead><tr><th>الأسماء</th><th>التاريخ</th><th>المستخدم</th><th>Drive</th><th>صور</th><th>الحالة</th><th></th></tr></thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id}>
                <td>{c.names}</td><td>{fmt(c.date)}</td><td>{c.username}</td><td>{c.driveAccount}</td><td>{c.photos}</td>
                <td><button className={'btn sm' + (c.active ? '' : ' ghost')} onClick={() => toggle(c)}>{c.active ? 'فعّال' : 'موقوف'}</button></td>
                <td><button className="btn ghost sm" onClick={() => edit(c)}>تعديل</button></td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan="7" className="muted">لا توجد حسابات بعد. أضف أول عروسين من النموذج بالأسفل.</td></tr>}
          </tbody>
        </table>
      </div>

      {done && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h3>تم حفظ الحساب</h3>
          <p>اسم المستخدم: <b>{done.u}</b> — كلمة المرور: <b>{done.p}</b></p>
          <p className="note">كلمة المرور لا تُعرض مرة أخرى، انسخ البيانات وأرسلها للعرسان الآن.</p>
          <button className="btn sm" onClick={copy}>نسخ بيانات الدخول</button>
        </div>
      )}

      <div className="card" style={{ marginTop: '1rem' }}>
        <h3>{f.id ? 'تعديل حساب' : 'إضافة عروسين جدد'}</h3>
        <div className="grid2">
          <div><label>أسماء العروسين</label><input value={f.names} onChange={set('names')} /></div>
          <div><label>تاريخ الفرح</label><input type="date" value={f.date} onChange={set('date')} /></div>
          <div><label>اسم المستخدم (Username)</label><input value={f.username} onChange={set('username')} /></div>
          <div>
            <label>كلمة المرور {f.id && '(اتركها فارغة لعدم التغيير)'}</label>
            <div className="inline"><input value={f.password} onChange={set('password')} />
              <button className="btn ghost sm" onClick={() => setF({ ...f, password: gen() })}>توليد</button></div>
          </div>
          <div><label>حساب Google Drive</label><input value={f.driveAccount} onChange={set('driveAccount')} /></div>
          <div><label>معرّف المجلد (Folder ID)</label><input value={f.folderId} onChange={set('folderId')} /></div>
        </div>
        <p className="err">{msg}</p>
        <button className="btn" disabled={busy} onClick={save}>{busy ? 'جارٍ الحفظ…' : f.id ? 'حفظ التعديلات' : 'إضافة الحساب'}</button>{' '}
        {f.id && <button className="btn ghost" onClick={() => setF(EMPTY)}>إلغاء</button>}
      </div>
    </>
  );
}

// تجهيز الصورة الأصلية على أجزاء (3 ميجا لكل طلب) بدون أي نسخ على Drive
async function fetchFile(it, say) {
  const chunks = [];
  let parts = 1;
  for (let p = 0; p < parts; p++) {
    const r = await api('download', { id: it.id, part: p });
    if (!r.ok) { say(r.error); return null; }
    parts = r.parts;
    chunks.push(Uint8Array.from(atob(r.data), (c) => c.charCodeAt(0)));
    say(`جارٍ تجهيز الصورة الأصلية… ${p + 1}/${parts}`);
  }
  return new File(chunks, it.n, { type: 'image/jpeg' });
}

// أندرويد والكمبيوتر: تنزيل عادي
function saveToDevice(files) {
  files.forEach((f, i) => setTimeout(() => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(f); a.download = f.name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 8000);
  }, i * 700));
}

function Gallery({ pickInit, onBack }) {
  const [items, setItems] = useState(cache.items);
  const [next, setNext] = useState(cache.next);   // '' = أول صفحة، null = انتهت الصور
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(-1);
  const [pick, setPick] = useState(pickInit);
  const [sel, setSel] = useState([]);
  const [msg, setMsg] = useState('');
  const [ready, setReady] = useState(null);       // ملفات جاهزة للحفظ في الصور (آيفون)
  const end = useRef(null);
  const x0 = useRef(0);

  const more = async () => {
    if (busy || next === null) return;
    setBusy(true);
    const r = await api('photos', { pageToken: next || undefined, pageSize: 48 });
    setBusy(false);
    if (!r.ok) { setNext(null); return setMsg(r.error); }
    const merged = [...items, ...r.photos];
    cache.items = merged; cache.next = r.next || null;
    setItems(merged); setNext(r.next || null);
  };
  useEffect(() => {
    const o = new IntersectionObserver((e) => e[0].isIntersecting && more(), { rootMargin: '700px' });
    if (end.current) o.observe(end.current);
    return () => o.disconnect();
  });
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(''), 5000); return () => clearTimeout(t); }, [msg]);

  const go = (d) => { const n = (open + d + items.length) % items.length; setOpen(n); if (n > items.length - 6) more(); };
  useEffect(() => {
    if (open < 0) return;
    const k = (e) => { if (e.key === 'Escape') setOpen(-1); if (e.key === 'ArrowLeft') go(1); if (e.key === 'ArrowRight') go(-1); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  });
  // تحميل مسبق للصورة التالية والسابقة ليصبح التنقل فوريًا
  useEffect(() => {
    if (open < 0) return;
    [1, -1].forEach((d) => {
      const it = items[(open + d + items.length) % items.length];
      if (it) { const im = new Image(); im.referrerPolicy = 'no-referrer'; im.src = sz(it.t, 1280); }
    });
  }, [open]);

  const tap = (i) => (pick ? setSel((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i])) : setOpen(i));

  const deliver = (files) => {
    if (isIOS && navigator.canShare && navigator.canShare({ files })) { setReady(files); setMsg(''); }
    else { saveToDevice(files); setMsg('تم التنزيل'); }
  };
  const dlSel = async () => {
    if (isIOS && sel.length > 15) return setMsg('اختاروا 15 صورة كحد أقصى في المرة الواحدة');
    const files = [];
    for (let k = 0; k < sel.length; k++) {
      setMsg(`جارٍ تجهيز ${k + 1} من ${sel.length}…`);
      const f = await fetchFile(items[sel[k]], setMsg);
      if (!f) return;
      files.push(f);
    }
    setSel([]); deliver(files);
  };
  const dlOne = async () => { const f = await fetchFile(items[open], setMsg); if (f) deliver([f]); };
  // لازم يتنفذ مباشرة من ضغطة المستخدم، لذلك هو زر منفصل بعد تجهيز الصور
  const saveReady = async () => {
    try { await navigator.share({ files: ready }); setMsg('تم الحفظ'); setReady(null); }
    catch (e) { if (e.name !== 'AbortError') setMsg('تعذر الحفظ، جرّبوا مرة أخرى'); }
  };

  return (
    <>
      <div className="bar2">
        <button className="btn ghost sm" onClick={onBack}>رجوع</button>
        <button className="btn ghost sm" onClick={() => { setPick(!pick); setSel([]); }}>{pick ? 'إلغاء التحديد' : 'تحديد صور للتنزيل'}</button>
        {pick && <button className="btn sm" disabled={!sel.length} onClick={dlSel}>تنزيل المحدد ({sel.length})</button>}
      </div>
      <div className="mas">
        {items.map((it, i) => (
          <img key={it.id} loading="lazy" referrerPolicy="no-referrer" src={sz(it.t, 400)} alt={it.n}
               className={sel.includes(i) ? 'picked' : ''} onClick={() => tap(i)} />
        ))}
      </div>
      {!items.length && next === null && <p className="muted">لا توجد صور في الألبوم بعد.</p>}
      <div ref={end} style={{ height: 40 }} />
      {busy && <p className="muted center-t">جارٍ تحميل المزيد…</p>}
      {msg && <div className="toast">{msg}</div>}
      {ready && (
        <div className="savebar">
          <button className="btn" onClick={saveReady}>حفظ {ready.length} {ready.length > 1 ? 'صور' : 'صورة'} في الصور</button>
          <button className="btn ghost" onClick={() => setReady(null)}>إلغاء</button>
        </div>
      )}

      {open >= 0 && items[open] && (
        <div className="lb" onTouchStart={(e) => { x0.current = e.touches[0].clientX; }}
             onTouchEnd={(e) => { const d = e.changedTouches[0].clientX - x0.current; if (Math.abs(d) > 50) go(d < 0 ? 1 : -1); }}>
          <div className="lbbar">
            <span>{open + 1} / {items.length}</span>
            <span><button className="btn sm" onClick={dlOne}>{isIOS ? 'حفظ في الصور' : 'تنزيل الأصلية'}</button>{' '}
              <button className="btn ghost sm light" onClick={() => setOpen(-1)}>إغلاق ✕</button></span>
          </div>
          <button className="nv" style={{ right: '.8rem' }} onClick={() => go(-1)}>›</button>
          <img src={sz(items[open].t, 400)} className="lbthumb" alt="" referrerPolicy="no-referrer" />
          <img key={items[open].id} src={sz(items[open].t, 1280)} className="lbfull" alt="" referrerPolicy="no-referrer" />
          <button className="nv" style={{ left: '.8rem' }} onClick={() => go(1)}>‹</button>
        </div>
      )}
    </>
  );
}
