import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api, tok, wjson, wfetch, resetPhotoToken, setPhotoToken } from './api';
import { LOGO } from './logo';

const fmt = (d) => { const m = String(d || '').match(/(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : ''; };
const sz = (u, n) => (u ? u.replace(/=s\d+(-c)?$/, '=s' + n) : '');
const cache = { items: [], next: '' };   // الصور المحمّلة تبقى في الذاكرة ليكون الرجوع للمعرض فوريًا
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
// يقبل رابط المجلد كاملًا ويستخرج منه المعرّف تلقائيًا
const folderOf = (v) => {
  const m = String(v).match(/folders\/([\w-]+)/);
  return m ? m[1] : String(v).trim().split(/[?&#\s]/)[0];
};
const gen = () => Math.random().toString(36).slice(2, 6) + Math.random().toString(36).slice(2, 6);
// رسائل الخطأ للعرسان بالإنجليزية فقط
const en = (e = '') => /غير صحيحة/.test(e) ? 'Incorrect username or password'
  : /موقوف/.test(e) ? 'This account is suspended. Please contact the studio'
  : /محاولات كثيرة/.test(e) ? 'Too many attempts. Please try again in 15 minutes'
  : /تعذر الاتصال|انتهت/.test(e) ? 'Connection problem. Please try again'
  : 'Something went wrong. Please try again';

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState({ name: 'home', mode: 'view' });

  useEffect(() => {
    if (!tok.get()) { setReady(true); return; }
    api('me').then((r) => { if (r.ok) { setPhotoToken(r.ptoken); setUser(r); } else tok.clear(); setReady(true); });
  }, []);
  useEffect(() => { document.documentElement.dir = user && user.role === 'admin' ? 'rtl' : 'ltr'; }, [user]);

  const logout = async () => {
    await api('logout'); tok.clear(); resetPhotoToken(); cache.items = []; cache.next = '';
    setUser(null); setView({ name: 'home', mode: 'view' });
  };

  if (!ready) return <div className="center"><img className="logo big pulse" src={LOGO} alt="" /></div>;
  if (!user) return <Login onOk={setUser} />;
  const admin = user.role === 'admin';
  return (
    <>
      <header>
        <span />
        <img className="logo" src={LOGO} alt="HM Studio" />
        <button className="link up" onClick={logout}>{admin ? 'تسجيل الخروج' : 'Sign out'}</button>
      </header>
      <main className="wrap view" key={admin ? 'a' : view.name}>
        {admin ? <Admin />
          : view.name === 'gallery' ? <Gallery mode={view.mode} onBack={() => setView({ name: 'home', mode: 'view' })} />
          : <Home p={user.profile} onOpen={(mode) => setView({ name: 'gallery', mode })} />}
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
    if (!u.trim() || !p) return setErr('Please enter your username and password');
    setBusy(true); setErr('');
    const r = await api('login', { username: u, password: p });
    setBusy(false);
    if (!r.ok) return setErr(en(r.error));
    tok.set(r.token); setPhotoToken(r.ptoken); onOk(r);
  };

  return (
    <div className="center view">
      <div className="login">
        <img className="logo big" src={LOGO} alt="HM Studio" />
        <label className="up">Username</label>
        <input value={u} onChange={(e) => setU(e.target.value)} autoComplete="username" autoCapitalize="none" />
        <label className="up">Password</label>
        <input type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password"
               onKeyDown={(e) => e.key === 'Enter' && submit()} />
        <p className="err">{err}</p>
        <button className="btn fill" disabled={busy} onClick={submit}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </div>
    </div>
  );
}

function Home({ p, onOpen }) {
  const [cover, setCover] = useState(cache.items[0] ? sz(cache.items[0].t, 1600) : '');
  const [loaded, setLoaded] = useState(false);
  const [count, setCount] = useState(p.photos);
  useEffect(() => {
    wjson('/count').then((r) => r.ok && setCount(r.count));
    if (!cover) wjson('/list', { pageSize: 1 }).then((r) => r.ok && r.photos[0] && setCover(sz(r.photos[0].t, 1600)));
  }, []);
  return (
    <>
      <section className="hero">
        {cover && <img className={'cover' + (loaded ? ' in' : '')} src={cover} alt="" referrerPolicy="no-referrer" onLoad={() => setLoaded(true)} />}
        <div className="env">
          <h1 className="script">{p.names}</h1>
          <p className="up date">{fmt(p.date)}</p>
        </div>
      </section>
      <section className="intro">
        <h2 className="up">Your Gallery</h2>
        <p className="up muted">{count} Photos</p>
        <div className="row">
          <button className="btn" onClick={() => onOpen('view')}>View gallery</button>
          <button className="btn fill" onClick={() => onOpen('all')}>Download all</button>
        </div>
      </section>
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
  const del = async (c) => {
    if (!window.confirm(`حذف حساب "${c.names}" نهائيًا؟\nسيتم حذف الحساب وتقييمه، والصور على Drive لن تتأثر.`)) return;
    const r = await api('deleteCouple', { id: c.id });
    if (!r.ok) return setMsg(r.error);
    if (f.id === c.id) setF(EMPTY);
    load();
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
                <td><button className="btn ghost sm" onClick={() => edit(c)}>تعديل</button>{' '}
                  <button className="btn ghost sm" onClick={() => del(c)}>حذف</button></td>
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
          <div>
            <label>رابط مجلد Drive (أو الـ ID)</label>
            <input value={f.folderId} placeholder="الصق رابط المجلد كامل هنا"
                   onChange={(e) => setF({ ...f, folderId: folderOf(e.target.value) })} />
            <p className="note" style={{ marginTop: '-.5rem' }}>يُستخرج المعرّف تلقائيًا من الرابط.</p>
          </div>
        </div>
        <p className="err">{msg}</p>
        <button className="btn" disabled={busy} onClick={save}>{busy ? 'جارٍ الحفظ…' : f.id ? 'حفظ التعديلات' : 'إضافة الحساب'}</button>{' '}
        {f.id && <button className="btn ghost" onClick={() => setF(EMPTY)}>إلغاء</button>}
      </div>
    </>
  );
}

// الصورة الأصلية بجودتها الكاملة: بث مباشر من Drive عبر Worker بدون أي نسخ أو ضغط، مع نسبة التقدم
async function fetchFile(it, onP) {
  const r = await wfetch('/file', { id: it.id });
  if (!r.ok) throw new Error('fail');
  const total = +r.headers.get('Content-Length') || 0;
  const rd = r.body.getReader();
  const parts = [];
  let got = 0;
  for (;;) {
    const { done, value } = await rd.read();
    if (done) break;
    parts.push(value); got += value.length;
    if (total) onP(got / total);
  }
  onP(1);
  return new File(parts, it.n, { type: 'image/jpeg' });
}

// تجهيز مجموعة صور (3 معًا) مع شريط تقدم إجمالي
async function prepare(list, label, setJob, stopRef) {
  const fr = list.map(() => 0);
  const files = [];
  const upd = () => setJob({ label, pct: Math.round((100 * fr.reduce((a, b) => a + b, 0)) / list.length) });
  upd();
  let k = 0;
  const run = async () => {
    while (k < list.length && !stopRef.current) {
      const i = k++;
      files[i] = await fetchFile(list[i], (p) => { fr[i] = p; upd(); });
    }
  };
  await Promise.all([run(), run(), run()]);
  return files;
}

// أندرويد والكمبيوتر: تنزيل مباشر لكل صورة كملف مستقل
function saveToDevice(files) {
  files.forEach((f, i) => setTimeout(() => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(f); a.download = f.name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 8000);
  }, i * 600));
}

function Thumb({ it, picked, onClick }) {
  const [ok, setOk] = useState(false);
  return (
    <img loading="lazy" referrerPolicy="no-referrer" src={sz(it.t, 400)} alt="" onClick={onClick}
         className={(ok ? 'in ' : '') + (picked ? 'picked' : '')} onLoad={() => setOk(true)}
         ref={(el) => { if (el && !ok && el.complete && el.naturalWidth) setOk(true); }} />
  );
}

// الصورة الكبيرة: نجرب رابط جوجل المصغّر أولًا، ولو فشل (منتهي أو محظور) نجيب الصورة من الـ Worker مباشرة
function FullImg({ it, cls }) {
  const [src, setSrc] = useState(sz(it.t, 1280));
  const tried = useRef(false);
  const blob = useRef('');
  const fallback = async () => {
    if (tried.current) return;
    tried.current = true;
    try {
      const r = await wfetch('/file', { id: it.id });
      if (!r.ok) return;
      blob.current = URL.createObjectURL(await r.blob());
      setSrc(blob.current);
    } catch { /* ignore */ }
  };
  useEffect(() => { if (!it.t) fallback(); return () => { if (blob.current) URL.revokeObjectURL(blob.current); }; }, []);
  return <img src={src} className={cls} alt="" referrerPolicy="no-referrer" onError={fallback} />;
}

function Gallery({ mode, onBack }) {
  const [items, setItems] = useState(cache.items);
  const [next, setNext] = useState(cache.next);   // '' = أول صفحة، null = انتهت الصور
  const [busy, setBusy] = useState(false);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(-1);
  const [dir, setDir] = useState(1);
  const [pick, setPick] = useState(false);
  const [sel, setSel] = useState([]);
  const [msg, setMsg] = useState('');
  const [job, setJob] = useState(null);           // شريط التحميل
  const [ready, setReady] = useState(null);       // ملفات جاهزة للحفظ في الصور (آيفون)
  const end = useRef(null);
  const x0 = useRef(0);
  const stopRef = useRef(false);
  const resumeRef = useRef(null);

  const more = async () => {
    if (busy || next === null) return;
    setBusy(true);
    const r = await wjson('/list', { pageToken: next || '', pageSize: 48 });
    setBusy(false);
    if (!r.ok) { setNext(null); return setMsg('Could not load photos'); }
    const merged = [...items, ...r.photos];
    cache.items = merged; cache.next = r.next || null;
    setItems(merged); setNext(r.next || null);
  };
  useEffect(() => {
    const o = new IntersectionObserver((e) => e[0].isIntersecting && more(), { rootMargin: '700px' });
    if (end.current) o.observe(end.current);
    return () => o.disconnect();
  });
  useEffect(() => { wjson('/count').then((r) => r.ok && setTotal(r.count)); if (mode === 'all') runAll(); }, []);
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(''), 4500); return () => clearTimeout(t); }, [msg]);

  // تقليب مرتب: لا يلف من الأخيرة للأولى ولا العكس
  const atEnd = open >= items.length - 1 && next === null;
  const go = (d) => {
    const n = open + d;
    if (n < 0 || n >= items.length) return;
    setDir(d); setOpen(n);
    if (n > items.length - 6) more();
  };
  useEffect(() => {
    if (open < 0) return;
    const k = (e) => { if (e.key === 'Escape') setOpen(-1); if (e.key === 'ArrowLeft') go(-1); if (e.key === 'ArrowRight') go(1); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  });
  useEffect(() => {   // منع تحريك الصفحة من ورا الصورة
    if (open < 0) return;
    const o = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = o; };
  }, [open >= 0]);
  useEffect(() => {   // تحميل مسبق للصورة التالية والسابقة
    if (open < 0) return;
    [1, -1].forEach((d) => {
      const it = items[open + d];
      if (it) { const im = new Image(); im.referrerPolicy = 'no-referrer'; im.src = sz(it.t, 1280); }
    });
  }, [open]);

  const tap = (i) => (pick ? setSel((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i])) : (setDir(1), setOpen(i)));

  // iOS: لازم ضغطة من المستخدم لفتح قائمة الحفظ، لذلك نعرض زر "Save to Photos" لكل دفعة
  const deliver = (files, label) => {
    if (isIOS && navigator.canShare && navigator.canShare({ files })) {
      return new Promise((res) => { resumeRef.current = res; setReady({ files, label }); });
    }
    saveToDevice(files);
    return Promise.resolve();
  };
  const downloadList = async (list) => {
    stopRef.current = false;
    const size = isIOS ? 10 : 12;
    const n = Math.ceil(list.length / size);
    try {
      for (let b = 0; b < n && !stopRef.current; b++) {
        const part = list.slice(b * size, (b + 1) * size);
        const files = await prepare(part, n > 1 ? `Preparing ${b + 1} / ${n}` : 'Preparing', setJob, stopRef);
        setJob(null);
        if (stopRef.current) break;
        await deliver(files, n > 1 ? `Batch ${b + 1} / ${n} · ${files.length} photos` : `${files.length} photo${files.length > 1 ? 's' : ''} ready`);
      }
      if (!stopRef.current) setMsg('Done');
    } catch (e) { setJob(null); setMsg('Something went wrong. Please try again'); }
  };
  const runAll = async () => {
    setJob({ label: 'Loading album', pct: 0 });
    let all = [], t = '';
    try {
      do {
        const r = await wjson('/list', { pageToken: t, pageSize: 100 });
        if (!r.ok) throw new Error('list');
        all = all.concat(r.photos); t = r.next || '';
      } while (t);
    } catch (e) { setJob(null); return setMsg('Could not load the album'); }
    if (!all.length) { setJob(null); return setMsg('No photos yet'); }
    await downloadList(all);
  };
  const saveReady = async () => {
    try {
      await navigator.share({ files: ready.files });
      const r = resumeRef.current; setReady(null); r && r();
    } catch (e) { if (e.name !== 'AbortError') setMsg('Could not save. Please try again'); }
  };
  const skip = () => { const r = resumeRef.current; setReady(null); r && r(); };
  const stop = () => { stopRef.current = true; const r = resumeRef.current; setReady(null); setJob(null); r && r(); };

  return (
    <>
      <div className="bar2">
        <button className="btn sm" onClick={onBack}>← Back</button>
        <button className="btn sm" onClick={() => { setPick(!pick); setSel([]); }}>{pick ? 'Cancel' : 'Select'}</button>
        {pick && <button className="btn sm fill" disabled={!sel.length} onClick={() => { downloadList(sel.map((i) => items[i])); setSel([]); setPick(false); }}>Download ({sel.length})</button>}
        {!pick && <button className="btn sm fill" onClick={runAll}>Download all</button>}
      </div>
      <div className="mas">
        {items.map((it, i) => <Thumb key={it.id} it={it} picked={sel.includes(i)} onClick={() => tap(i)} />)}
      </div>
      {!items.length && next === null && <p className="up muted center-t">No photos yet</p>}
      <div ref={end} style={{ height: 40 }} />
      {busy && <p className="up muted center-t pulse">Loading…</p>}
      {msg && <div className="toast up">{msg}</div>}

      {job && (
        <div className="jobp">
          <div className="up">{job.label}</div>
          <div className="bar"><i style={{ width: job.pct + '%' }} /></div>
          <div className="up muted">{job.pct}%</div>
          <button className="link up" onClick={stop}>Cancel</button>
        </div>
      )}
      {ready && (
        <div className="jobp">
          <div className="up">{ready.label}</div>
          <div className="row" style={{ justifyContent: 'center', marginTop: '.6rem' }}>
            <button className="btn fill sm" onClick={saveReady}>Save to Photos</button>
            <button className="btn sm" onClick={skip}>Skip</button>
            <button className="btn sm" onClick={stop}>Stop</button>
          </div>
        </div>
      )}

      {open >= 0 && items[open] && createPortal(
        <div className="lb" onTouchStart={(e) => { x0.current = e.touches[0].clientX; }}
             onTouchEnd={(e) => { const d = e.changedTouches[0].clientX - x0.current; if (Math.abs(d) > 50) go(d < 0 ? 1 : -1); }}>
          <div className="lbbar">
            <span className="up">{open + 1} / {total || items.length}</span>
            <span>
              <button className="btn sm" onClick={() => downloadList([items[open]])}>{isIOS ? 'Save to Photos' : 'Download'}</button>{' '}
              <button className="btn sm" onClick={() => setOpen(-1)}>Close ✕</button>
            </span>
          </div>
          <button className="nv" style={{ left: '.8rem' }} disabled={open === 0} onClick={() => go(-1)}>‹</button>
          <img src={sz(items[open].t, 400)} className="lbthumb" alt="" referrerPolicy="no-referrer" />
          <FullImg key={items[open].id} it={items[open]} cls={'lbfull ' + (dir > 0 ? 'sn' : 'sp')} />
          <button className="nv" style={{ right: '.8rem' }} disabled={atEnd} onClick={() => go(1)}>›</button>
        </div>,
        document.body
      )}
    </>
  );
}
