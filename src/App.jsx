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
  const [splash, setSplash] = useState(true);
  useEffect(() => { const t = setTimeout(() => setSplash(false), 3200); return () => clearTimeout(t); }, []);

  useEffect(() => {
    if (!tok.get()) { setReady(true); return; }
    api('me').then((r) => { if (r.ok) { setPhotoToken(r.ptoken); setUser(r); } else tok.clear(); setReady(true); });
  }, []);
  useEffect(() => { document.documentElement.dir = user && user.role === 'admin' ? 'rtl' : 'ltr'; }, [user]);

  const logout = async () => {
    await api('logout'); tok.clear(); resetPhotoToken(); cache.items = []; cache.next = '';
    setUser(null);
  };

  if (!ready || splash) return <div className="splash"><DrawLogo className="splogo" /></div>;
  if (!user) return <Login onOk={setUser} />;
  if (user.role !== 'admin') return <Couple user={user} onLogout={logout} />;
  return (
    <>
      <header>
        <span />
        <img className="logo" src={LOGO} alt="HM Studio" />
        <button className="link up" onClick={logout}>تسجيل الخروج</button>
      </header>
      <main className="wrap view" key="a"><Admin /></main>
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
        <p className="script lgtxt">Welcome to gallery<br /><span>Hamada Mohamed Photography</span></p>
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

/* ---------- أيقونات وزخارف الواجهة ---------- */
const Svg = ({ children, ...r }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...r}>{children}</svg>
);
const IcImage = (r) => <Svg {...r}><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="9" cy="9" r="1.6" /><path d="M4 17l5-5 4 4 3-3 4 4" /></Svg>;
const IcArrow = (r) => <Svg {...r}><path d="M4 12h16M14 6l6 6-6 6" /></Svg>;
const IcDownload = (r) => <Svg {...r}><path d="M12 4v11M7 11l5 5 5-5M5 20h14" /></Svg>;
const IcPencil = (r) => <Svg {...r}><path d="M4 20l1-4L16 5l3 3L8 19l-4 1zM14 7l3 3" /></Svg>;
const IcSend = (r) => <Svg {...r}><path d="M21 3L10 14M21 3l-7 18-4-7-7-4 18-7z" /></Svg>;
const IcHome = (r) => <Svg {...r}><path className="fl" d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" /></Svg>;
const IcStarO = (r) => <Svg {...r}><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" /></Svg>;
const IcGear = (r) => <Svg {...r}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></Svg>;

const HEART = 'M12 21C4 14 1 10 1 6.5A5.2 5.2 0 0 1 12 4.6 5.2 5.2 0 0 1 23 6.5C23 10 20 14 12 21Z';
const Swirl = ({ className }) => (
  <svg className={className} viewBox="0 0 120 40" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
    <g transform="translate(14 0) scale(.78)"><path d={HEART} /></g>
    <path d="M24 17C38 38 66 32 78 23S100 18 118 12" />
  </svg>
);
const Divider = () => (
  <svg className="hdiv" viewBox="0 0 260 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12H104M98 8l6 4-6 4M258 12H156M162 8l-6 4 6 4" />
    <g transform="translate(121 3) scale(.75)"><path d={HEART} /></g>
  </svg>
);
function Sprig({ className, flowers }) {
  const leaves = [[170, -35], [140, 40], [112, -40], [84, 38], [58, -38], [32, 30]];
  const blooms = [[56, 14], [41, 52], [30, 92]];
  return (
    <svg className={className} viewBox="0 0 100 200" aria-hidden="true">
      <path d="M18 198C28 150 36 100 56 6" fill="none" stroke="currentColor" strokeWidth="1.3" />
      {leaves.map(([y, r], i) => {
        const cx = 18 + (198 - y) * 0.198 + (r > 0 ? 11 : -11);
        return <ellipse key={i} cx={cx} cy={y} rx="15" ry="5" transform={`rotate(${r} ${cx} ${y})`} />;
      })}
      {flowers && blooms.map(([x, y], i) => (
        <g key={i}>
          {[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx={x} cy={y - 7} rx="4.4" ry="7" transform={`rotate(${a} ${x} ${y})`} />)}
          <circle cx={x} cy={y} r="2.4" className="ct" />
        </g>
      ))}
    </svg>
  );
}

function Feedback() {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const send = async () => {
    setBusy(true); setMsg('');
    const r = await api('feedback', { rating, text: text.trim() });
    setBusy(false);
    if (r.ok) { setText(''); setMsg('Thank you for your feedback ♥'); } else setMsg(en(r.error));
  };
  return (
    <section className="hfb" id="feedback">
      <Sprig className="hleaf" />
      <div className="hfbt"><h2 className="itl">Your Words Matter</h2><Swirl className="hsw2" /></div>
      <p className="hsub">Share your experience with us</p>
      <div className="hstars">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} aria-label={`${n} star${n > 1 ? 's' : ''}`} className={n <= rating ? 'on' : ''} onClick={() => setRating(n)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.1l-5.6 2.9 1.1-6.2L3 9.4l6.2-.9z" strokeLinejoin="round" /></svg>
          </button>
        ))}
      </div>
      <label className="hinp"><IcPencil /><input value={text} maxLength={500} placeholder="Your feedback..." onChange={(e) => setText(e.target.value)} /></label>
      <button className="hbtn fill hsend" disabled={busy} onClick={send}><IcSend />{busy ? 'Sending…' : 'Send Feedback'}</button>
      {msg && <p className="hmsg">{msg}</p>}
    </section>
  );
}

function DrawLogo({ className }) {
  return (
    <svg className={className} viewBox="0 0 360 356" aria-label="HM Studio" role="img">
      <path className="dl-fill" d="M196 20 L200 27 L203 36 L205 48 L206 49 L206 55 L207 56 L208 76 L207 77 L207 92 L206 93 L205 107 L204 108 L204 112 L203 113 L203 117 L202 118 L202 122 L201 123 L199 134 L191 159 L189 162 L183 179 L165 214 L165 216 L158 231 L150 257 L150 261 L149 262 L149 266 L147 272 L147 279 L146 280 L146 296 L145 297 L146 298 L147 320 L153 341 L160 354 L160 335 L161 334 L162 317 L163 316 L165 301 L166 300 L169 285 L172 278 L172 275 L176 266 L178 258 L188 237 L188 235 L206 203 L208 201 L210 202 L255 267 L315 180 L316 181 L316 318 L358 318 L359 317 L359 106 L318 105 L259 188 L257 189 L226 150 L227 136 L228 135 L229 110 L228 109 L228 95 L227 94 L227 87 L226 86 L225 76 L219 56 L212 41 L202 26Z M154 1 L159 14 L162 31 L163 32 L163 40 L164 41 L164 68 L163 69 L163 78 L162 79 L161 90 L160 91 L160 95 L159 96 L156 111 L154 115 L154 118 L144 145 L130 174 L128 176 L126 181 L122 185 L46 185 L45 184 L45 169 L44 168 L44 106 L0 106 L0 318 L43 318 L44 317 L44 229 L45 228 L108 228 L109 229 L109 232 L108 233 L107 245 L106 246 L106 254 L105 255 L105 282 L106 283 L107 296 L108 297 L108 301 L111 309 L111 312 L113 315 L115 322 L119 328 L118 327 L118 321 L117 320 L117 303 L118 302 L119 288 L120 287 L120 283 L121 282 L121 278 L122 277 L124 266 L132 242 L141 222 L141 220 L153 195 L155 193 L163 177 L163 175 L172 155 L179 133 L181 121 L183 116 L184 104 L185 103 L186 74 L185 73 L185 64 L184 63 L184 58 L183 57 L181 45 L177 34 L170 20 L163 10Z" fillRule="evenodd" />
      <path className="dl-stroke" pathLength="1" d="M196 20 L200 27 L203 36 L205 48 L206 49 L206 55 L207 56 L208 76 L207 77 L207 92 L206 93 L205 107 L204 108 L204 112 L203 113 L203 117 L202 118 L202 122 L201 123 L199 134 L191 159 L189 162 L183 179 L165 214 L165 216 L158 231 L150 257 L150 261 L149 262 L149 266 L147 272 L147 279 L146 280 L146 296 L145 297 L146 298 L147 320 L153 341 L160 354 L160 335 L161 334 L162 317 L163 316 L165 301 L166 300 L169 285 L172 278 L172 275 L176 266 L178 258 L188 237 L188 235 L206 203 L208 201 L210 202 L255 267 L315 180 L316 181 L316 318 L358 318 L359 317 L359 106 L318 105 L259 188 L257 189 L226 150 L227 136 L228 135 L229 110 L228 109 L228 95 L227 94 L227 87 L226 86 L225 76 L219 56 L212 41 L202 26Z M154 1 L159 14 L162 31 L163 32 L163 40 L164 41 L164 68 L163 69 L163 78 L162 79 L161 90 L160 91 L160 95 L159 96 L156 111 L154 115 L154 118 L144 145 L130 174 L128 176 L126 181 L122 185 L46 185 L45 184 L45 169 L44 168 L44 106 L0 106 L0 318 L43 318 L44 317 L44 229 L45 228 L108 228 L109 229 L109 232 L108 233 L107 245 L106 246 L106 254 L105 255 L105 282 L106 283 L107 296 L108 297 L108 301 L111 309 L111 312 L113 315 L115 322 L119 328 L118 327 L118 321 L117 320 L117 303 L118 302 L119 288 L120 287 L120 283 L121 282 L121 278 L122 277 L124 266 L132 242 L141 222 L141 220 L153 195 L155 193 L163 177 L163 175 L172 155 L179 133 L181 121 L183 116 L184 104 L185 103 L186 74 L185 73 L185 64 L184 63 L184 58 L183 57 L181 45 L177 34 L170 20 L163 10Z" fill="none" />
    </svg>
  );
}

function Home({ p, onOpen, onMenu }) {
  const [ph, setPh] = useState(cache.items.slice(0, 5));
  const [loaded, setLoaded] = useState(false);
  const [count, setCount] = useState(p.photos);
  useEffect(() => {
    wjson('/count').then((r) => r.ok && setCount(r.count));
    if (ph.length < 5) wjson('/list', { pageSize: 5 }).then((r) => r.ok && r.photos.length && setPh(r.photos));
  }, []);
  const cover = ph[0] ? sz(ph[0].t, 1600) : '';
  const pool = ph.length > 1 ? ph.slice(1) : ph;
  const tiles = pool.length ? [0, 1, 2, 3].map((i) => pool[i % pool.length]) : [];
  return (
    <div className="hm">
      <header className="hbar">
        <img className="hlogo" src={LOGO} alt="HM Studio" />
        <button className="hmenu" aria-label="Menu" onClick={onMenu}><i /><i /><i /></button>
      </header>
      <section className="hhero">
        {cover && <img className={'hcover' + (loaded ? ' in' : '')} src={cover} alt="" referrerPolicy="no-referrer" onLoad={() => setLoaded(true)} />}
        <div className="hshade" />
        <svg className="hwave" viewBox="0 0 852 70" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 26C110 2 230 34 430 24S720 -6 852 12V70H0Z" />
        </svg>
      </section>

      <div className="hnames">
        <h1 className="gv">{p.names}</h1>
        <Divider />
        <p className="hdate">{fmt(p.date).replace(/\//g, ' / ')}</p>
      </div>

      <Sprig className="hflw" flowers />

      <section className="hstat">
        <IcImage className="hic" />
        <div className="hcnt"><b>{count || 0}</b><span>Photos</span></div>
        <i className="hvl" />
        <p className="itl hwel">Welcome to our<br />Wedding Gallery</p>
        <Swirl className="hsw1" />
      </section>

      <div className="hbtns">
        <button className="hbtn fill" onClick={() => onOpen('view')}><IcImage />View Gallery<IcArrow /></button>
        <button className="hbtn" onClick={() => onOpen('all')}><IcDownload />Download All</button>
      </div>

      <Feedback />
    </div>
  );
}

function Sheet({ names, onClose, onLogout }) {
  return (
    <div className="sbg" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <i className="grab" />
        <p className="gv sname">{names}</p>
        <button className="hbtn fill" onClick={onLogout}>Sign out</button>
        <button className="hbtn" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

function Couple({ user, onLogout }) {
  const [view, setView] = useState({ name: 'home', mode: 'view' });
  const [tab, setTab] = useState('home');
  const [sheet, setSheet] = useState(false);
  const home = view.name === 'home';
  const open = (mode) => { setView({ name: 'gallery', mode }); setTab('gallery'); window.scrollTo(0, 0); };
  const goHome = () => { setView({ name: 'home', mode: 'view' }); setTab('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const goFeedback = () => {
    setTab('feedback');
    const go = () => { const el = document.getElementById('feedback'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
    if (home) go(); else { setView({ name: 'home', mode: 'view' }); setTimeout(go, 150); }
  };
  const active = sheet ? 'settings' : tab;
  const tabs = [
    ['home', 'Home', IcHome, goHome],
    ['gallery', 'Gallery', IcImage, () => open('view')],
    ['feedback', 'Feedback', IcStarO, goFeedback]
  ];
  return (
    <>
      <main className={(home ? 'home' : 'wrap gal') + ' view'} key={view.name}>
        {home
          ? <Home p={user.profile} onOpen={open} onMenu={() => setSheet(true)} />
          : <Gallery mode={view.mode} onBack={goHome} />}
      </main>
      <nav className="tabs">
        {tabs.map(([k, label, Ic, fn]) => (
          <button key={k} className={active === k ? 'on' : ''} onClick={fn}><Ic /><span>{label}</span></button>
        ))}
      </nav>
      {sheet && <Sheet names={user.profile.names} onClose={() => setSheet(false)} onLogout={onLogout} />}
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

// تجهيز دفعة صور (3 معًا): نكمل جلب الصور من مكان ما وقفنا لحد ما نوصل لحد أقصى للعدد أو للحجم، ونرجّع الصور وعددها
// الحد بالحجم بيحمي ذاكرة الآيفون، فلو الصور خفيفة الدفعة بتكبر، ولو تقيلة بتصغر لوحدها
async function prepareBatch(list, from, maxCount, maxBytes, label, setJob, stopRef) {
  const files = [];
  const fr = new Map();
  let k = from, bytes = 0;
  const upd = () => {
    let s = from; fr.forEach((v) => { s += v; });
    setJob({ label, pct: Math.min(100, Math.round((100 * s) / list.length)) });
  };
  upd();
  const run = async () => {
    while (k < list.length && !stopRef.current && k - from < maxCount && bytes < maxBytes) {
      const i = k++;
      fr.set(i, 0);
      const f = await fetchFile(list[i], (p) => { fr.set(i, p); upd(); });
      files[i - from] = f; bytes += f.size;
    }
  };
  await Promise.all([run(), run(), run()]);
  return { files: files.filter(Boolean), used: k - from };
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
    // آيفون: دفعات كبيرة (لحد 40 صورة أو حوالي 250 ميجا) عشان ضغطات "Save to Photos" تقل. لو الموقع هنج على الآيفون قلّل الرقمين
    const maxCount = isIOS ? 40 : 12;
    const maxBytes = isIOS ? 250 * 1024 * 1024 : Infinity;
    try {
      let from = 0, b = 0;
      while (from < list.length && !stopRef.current) {
        b++;
        const { files, used } = await prepareBatch(list, from, maxCount, maxBytes, list.length > maxCount ? `Preparing batch ${b}` : 'Preparing', setJob, stopRef);
        from += used;
        setJob(null);
        if (stopRef.current) break;
        const more = from < list.length;
        await deliver(files, more ? `Batch ${b} · ${files.length} photos · ${list.length - from} left` : (b > 1 ? `Last batch · ${files.length} photos` : `${files.length} photo${files.length > 1 ? 's' : ''} ready`));
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
