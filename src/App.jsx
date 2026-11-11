import { useEffect, useState } from 'react';
import { api, tok } from './api';

const fmt = (d) => (d ? new Date(d).toLocaleDateString('ar-EG', { dateStyle: 'long' }) : '');
const gen = () => Math.random().toString(36).slice(2, 6) + Math.random().toString(36).slice(2, 6);

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!tok.get()) { setReady(true); return; }
    api('me').then((r) => { if (r.ok) setUser(r); else tok.clear(); setReady(true); });
  }, []);

  const logout = async () => { await api('logout'); tok.clear(); setUser(null); };

  if (!ready) return <div className="center muted">جارٍ التحميل…</div>;
  if (!user) return <Login onOk={setUser} />;
  return (
    <>
      <header>
        <span className="brand">Wedding Gallery</span>
        <button className="btn ghost sm" onClick={logout}>تسجيل الخروج</button>
      </header>
      <main className="wrap">
        {user.role === 'admin' ? <Admin /> : <Home p={user.profile} />}
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

function Home({ p }) {
  return (
    <>
      <section className="hero">
        <div className="ov">
          <p>أهلًا بكما</p>
          <h1 className="script">{p.names}</h1>
          <p>{fmt(p.date)}</p>
        </div>
      </section>
      <div className="card" style={{ marginTop: '1rem' }}>
        <p style={{ margin: 0 }}>مبروك! ذكرى يومكم الجميل محفوظة هنا، وسنفعّل عرض الصور وتنزيلها في الخطوة القادمة.</p>
        <div className="stat"><b>{p.photos}</b><span className="muted">صورة في الألبوم</span></div>
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
  const toggle = async (c) => { await api('setActive', { id: c.id, active: !c.active }); load(); };
  const edit = (c) => { setDone(null); setF({ ...c, password: '' }); window.scrollTo(0, document.body.scrollHeight); };
  const copy = () => navigator.clipboard.writeText(
    `أهلًا ${done.n} 💍\nرابط الألبوم: ${location.href.split('#')[0]}\nاسم المستخدم: ${done.u}\nكلمة المرور: ${done.p}`);

  return (
    <>
      <h2>لوحة التحكم</h2>
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
