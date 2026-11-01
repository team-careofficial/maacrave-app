/* MaaCrave Admin — internal tool. Separate site, separate login, talks only to /v1/admin/* on the API. */
(() => {
  'use strict';
  const API = (window.MAACRAVE_API || '').replace(/\/$/, '');
  const KEY = 'maacrave.admin';
  const $app = document.getElementById('app');
  const state = { view: 'dashboard', email: '', step: 'email', filters: { apps: 'PENDING', role: '', reports: 'OPEN', payouts: 'OPEN', orders: '', users: '' }, counts: {} };

  /* ---------- helpers ---------- */
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const tk = (n) => '৳' + Math.round(n || 0).toLocaleString('en-IN');
  const when = (d) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const session = {
    get() { try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch { return null; } },
    set(v) { try { sessionStorage.setItem(KEY, JSON.stringify(v)); } catch { /* storage blocked */ } },
    clear() { try { sessionStorage.removeItem(KEY); } catch { /* storage blocked */ } },
  };
  let toastTimer;
  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
  }
  async function api(path, opts = {}) {
    const s = session.get();
    let res;
    try {
      res = await fetch(API + path, {
        method: opts.method || 'GET',
        headers: { Accept: 'application/json', ...(opts.body ? { 'Content-Type': 'application/json' } : {}), ...(s?.token ? { Authorization: 'Bearer ' + s.token } : {}) },
        body: opts.body ? JSON.stringify(opts.body) : undefined,
      });
    } catch { throw new Error('Can’t reach the MaaCrave API. If it was asleep, wait a minute and try again.'); }
    const data = await res.json().catch(() => null);
    if (res.status === 401 && s?.token) { session.clear(); render(); throw new Error('Session expired. Sign in again.'); }
    if (!res.ok) throw new Error(Array.isArray(data?.message) ? data.message[0] : data?.message || 'Something went wrong.');
    return data;
  }
  const LOGO = '<svg width="26" height="26" viewBox="6 4 52 52"><path d="M32 16.2c-2.3-1.8-5.2-3.6-5.2-5.8 0-2.5 3.2-3.4 5.2-1.3 2-2.1 5.2-1.2 5.2 1.3 0 2.2-2.9 4-5.2 5.8z" fill="currentColor"/><path d="M13.5 32 32 21l18.5 11" fill="none" stroke="currentColor" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 35.5h32v5.2C48 47.5 42.5 53 35.7 53h-7.4C21.5 53 16 47.5 16 40.7z" fill="currentColor"/></svg>';
  const brand = (dark) => `<div class="brand ${dark ? 'dark' : ''}"><span class="logo">${LOGO}</span><span>Maa<span class="accent">Crave</span> <span class="muted small">Admin</span></span></div>`;
  const statusBadge = (s) => `<span class="badge ${{ PENDING: 'warn', APPROVED: 'ok', REJECTED: 'err', SUSPENDED: 'err', OPEN: 'warn', INVESTIGATING: 'info', RESOLVED: 'ok', REQUESTED: 'warn', PROCESSING: 'info', PAID: 'ok', FAILED: 'err', DELIVERED: 'ok', CANCELLED: 'err' }[s] || 'brand'}">${esc(String(s).replace(/_/g, ' ').toLowerCase())}</span>`;
  const tabs = (key, items) => `<div class="tabs">${items.map(([v, l]) => `<button class="tab ${state.filters[key] === v ? 'on' : ''}" data-filter="${key}" data-value="${esc(v)}">${esc(l)}</button>`).join('')}</div>`;
  const empty = (msg) => `<div class="card empty">${esc(msg)}</div>`;

  /* ---------- login ---------- */
  function renderLogin(error) {
    $app.innerHTML = `
      <div class="login">
        <div class="login-hero">
          ${brand(false)}
          <div><h1>Run MaaCrave safely.</h1><p>Verify mothers and riders, handle reports and refunds, and keep the community trusted.</p></div>
          <p class="small">Restricted. Every action is logged.</p>
        </div>
        <div class="login-panel">
          <form class="login-box" id="loginForm" autocomplete="on">
            <div class="brand dark">${'<span class="logo">' + LOGO + '</span>'}<span>Admin sign in</span></div>
            ${state.step === 'email' ? `
              <label class="field">Work email<input class="input" name="email" type="email" required autocomplete="email" placeholder="you@gmail.com" value="${esc(state.email)}" /></label>
              <button class="btn primary" type="submit">Send sign-in code</button>
              <p class="muted small">Only approved team emails can sign in. A 6-digit code is sent to your inbox.</p>` : `
              <p>Code sent to <b>${esc(state.email)}</b>. It expires in 5 minutes.</p>
              <label class="field">6-digit code<input class="input" name="code" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" required autocomplete="one-time-code" autofocus /></label>
              <button class="btn primary" type="submit">Sign in</button>
              <button class="btn ghost" type="button" data-action="back-email">Use another email</button>`}
            ${error ? `<p class="badge err">${esc(error)}</p>` : ''}
          </form>
        </div>
      </div>`;
  }
  async function submitLogin(form) {
    const btn = form.querySelector('button[type=submit]'); btn.disabled = true;
    try {
      if (state.step === 'email') {
        state.email = form.email.value.trim().toLowerCase();
        await api('/admin/auth/request', { method: 'POST', body: { email: state.email } });
        state.step = 'code'; renderLogin();
      } else {
        const r = await api('/admin/auth/verify', { method: 'POST', body: { email: state.email, code: form.code.value.trim() } });
        session.set({ token: r.token, email: r.email }); state.step = 'email'; render();
      }
    } catch (e) { renderLogin(e.message); }
  }

  /* ---------- views ---------- */
  const VIEWS = {
    async dashboard() {
      const s = await api('/admin/stats');
      state.counts = { applications: s.pendingApps, reports: s.openComplaints, payouts: s.pendingPayouts };
      return `
        <div class="top"><div><h1>Today</h1><p class="muted">${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p></div></div>
        <div class="stats">
          <div class="stat hero">Sales delivered today<b>${tk(s.salesToday)}</b><span class="small">Commission ${tk(s.commissionToday)}</span></div>
          <div class="stat">Orders today<b>${s.ordersToday}</b><span class="muted small">${s.activeOrders} in progress</span></div>
          <div class="stat">Waiting for review<b>${s.pendingApps}</b><span class="muted small">cook & rider applications</span></div>
          <div class="stat">Open reports<b>${s.openComplaints}</b><span class="muted small">need a reply</span></div>
          <div class="stat">Payout requests<b>${s.pendingPayouts}</b><span class="muted small">to send</span></div>
          <div class="stat">People<b>${s.users}</b><span class="muted small">${s.cooks} cooks · ${s.riders} riders</span></div>
        </div>
        <div class="card mt"><h3>Quick start</h3><p class="muted">Check <b>Applications</b> first — mothers can’t sell until you approve them. Open each NID and kitchen photo before approving.</p>
          <div class="row"><button class="btn primary" data-go="applications">Review applications</button><button class="btn ghost" data-go="reports">Open reports</button></div></div>`;
    },

    async applications() {
      const f = state.filters;
      const list = await api(`/admin/applications?status=${f.apps}${f.role ? '&role=' + f.role : ''}`);
      return `
        <div class="top"><div><h1>Applications</h1><p class="muted">Mothers and riders waiting for verification.</p></div>
          <div class="row">${tabs('role', [['', 'All'], ['COOK', 'Cooks'], ['RIDER', 'Riders']])}${tabs('apps', [['PENDING', 'Pending'], ['APPROVED', 'Approved'], ['REJECTED', 'Rejected'], ['SUSPENDED', 'Suspended']])}</div></div>
        <div class="list">${list.length ? list.map((a) => {
          const u = a.user; const p = a.role === 'COOK' ? u.cook : u.rider;
          return `<div class="card">
            <div class="row between"><div><h3>${esc(a.role === 'COOK' ? p?.displayName || u.name : u.name)}</h3>
              <span class="muted small">${a.role === 'COOK' ? 'Mother / Cook' : 'Rider'} · applied ${when(a.updatedAt)}</span></div>${statusBadge(a.status)}</div>
            <dl class="kv my">
              <dt>Name</dt><dd>${esc(u.name)}</dd>
              <dt>Phone</dt><dd>${esc(u.phone || '—')}</dd>
              <dt>Email</dt><dd>${esc(u.email || '—')}</dd>
              <dt>Area</dt><dd>${esc(p?.area || u.area || '—')}</dd>
              <dt>NID last 4</dt><dd>${esc(p?.nidLast4 || '—')}</dd>
              ${a.role === 'COOK' ? `<dt>Specialties</dt><dd>${esc((p?.specialties || []).join(', ') || '—')}</dd><dt>Hours · capacity</dt><dd>${esc(p?.hours)} · ${esc(p?.dailyCapacity)} portions/day</dd><dt>Experience</dt><dd>${esc(p?.experience || '—')}</dd><dt>Kitchen</dt><dd>${esc(p?.kitchenInfo || '—')}</dd>` : `<dt>Vehicle</dt><dd>${esc(p?.vehicle)}</dd>`}
              ${a.note ? `<dt>Last note</dt><dd>${esc(a.note)}</dd>` : ''}
            </dl>
            <div class="docs">${u.documents.length ? u.documents.map((d) => `<button class="doc" data-doc="${esc(d.id)}">View<br>${esc(d.kind.replace('_', ' ').toLowerCase())}</button>`).join('') : '<span class="muted small">No photos uploaded (applied before photos were required).</span>'}</div>
            <div class="row mt">
              ${a.status !== 'APPROVED' ? `<button class="btn ok" data-decide="approve" data-id="${esc(a.id)}">Approve</button>` : ''}
              ${a.status === 'PENDING' ? `<button class="btn danger" data-decide="reject" data-id="${esc(a.id)}">Ask for changes</button>` : ''}
              ${a.status === 'APPROVED' ? `<button class="btn danger" data-decide="suspend" data-id="${esc(a.id)}">Suspend</button>` : ''}
            </div></div>`;
        }).join('') : empty('Nothing here. New applications appear as soon as someone applies.')}</div>`;
    },

    async reports() {
      const list = await api(`/admin/complaints?status=${state.filters.reports}`);
      return `
        <div class="top"><div><h1>Reports</h1><p class="muted">Problems customers reported on their orders.</p></div>${tabs('reports', [['OPEN', 'Open'], ['RESOLVED', 'Resolved'], ['ALL', 'All']])}</div>
        <div class="list">${list.length ? list.map((c) => `<div class="card">
          <div class="row between"><div><h3>${esc(c.type)} · ${esc(c.order.code)}</h3><span class="muted small">${when(c.createdAt)} · by ${esc(c.user.name || 'Customer')} (${esc(c.user.phone || c.user.email || '')})</span></div>${statusBadge(c.status)}</div>
          <p>${esc(c.text)}</p>
          <dl class="kv"><dt>Kitchen</dt><dd>${esc(c.order.cook.displayName)}</dd><dt>Order total</dt><dd>${tk(c.order.total)} · ${esc(c.order.payment?.method || '—')} ${c.order.payment ? statusBadge(c.order.payment.status) : ''}</dd>
          <dt>Refund asked</dt><dd>${c.refundRequested ? tk(c.refundAmount) : 'No'}</dd></dl>
          ${c.status !== 'RESOLVED' ? `<div class="row mt">
            ${c.status === 'OPEN' ? `<button class="btn ghost" data-report="INVESTIGATING" data-id="${esc(c.id)}">Mark investigating</button>` : ''}
            <button class="btn ok" data-report="RESOLVED" data-id="${esc(c.id)}">Resolve</button>
            ${c.order.payment?.status === 'PAID' ? `<button class="btn primary" data-report="REFUND" data-id="${esc(c.id)}">Resolve + refund</button>` : ''}
          </div>` : ''}</div>`).join('') : empty('No reports. 🎉')}</div>`;
    },

    async users() {
      const list = await api(`/admin/users${state.filters.users ? '?q=' + encodeURIComponent(state.filters.users) : ''}`);
      return `
        <div class="top"><div><h1>People</h1><p class="muted">Search by name, phone or email.</p></div>
          <form id="userSearch" class="row"><input class="input" name="q" placeholder="Search…" value="${esc(state.filters.users)}" /><button class="btn ghost" type="submit">Search</button></form></div>
        ${list.length ? `<table><thead><tr><th>Name</th><th>Contact</th><th>Roles</th><th>Orders</th><th>Joined</th><th></th></tr></thead><tbody>${list.map((u) => `<tr>
          <td><b>${esc(u.name || '—')}</b><br><span class="muted small">${esc(u.area || '')}</span></td>
          <td>${esc(u.phone || '')}<br><span class="muted small">${esc(u.email || '')}</span></td>
          <td>${u.roles.map((r) => `<span class="badge ${r.status === 'APPROVED' ? 'ok' : r.status === 'PENDING' ? 'warn' : 'err'}">${esc(r.role.toLowerCase())}</span>`).join(' ')}</td>
          <td>${u._count.orders}</td><td>${when(u.createdAt)}</td>
          <td>${u.deletedAt ? '<span class="badge">deleted</span>' : u.suspended ? `<button class="btn sm ok" data-user="restore" data-id="${esc(u.id)}">Restore</button>` : `<button class="btn sm danger" data-user="suspend" data-id="${esc(u.id)}">Suspend</button>`}</td>
        </tr>`).join('')}</tbody></table>` : empty('No people found.')}`;
    },

    async orders() {
      const list = await api(`/admin/orders${state.filters.orders ? '?status=' + state.filters.orders : ''}`);
      return `
        <div class="top"><div><h1>Orders</h1><p class="muted">Latest 80 orders.</p></div>${tabs('orders', [['', 'All'], ['SUBMITTED', 'New'], ['PREPARING', 'Cooking'], ['ON_THE_WAY', 'On the way'], ['DELIVERED', 'Delivered'], ['CANCELLED', 'Cancelled']])}</div>
        ${list.length ? `<table><thead><tr><th>Order</th><th>Customer</th><th>Kitchen</th><th>Rider</th><th>Total</th><th>Status</th></tr></thead><tbody>${list.map((o) => `<tr>
          <td><b>${esc(o.code)}</b><br><span class="muted small">${when(o.createdAt)}${o.batchId ? ' · group' : ''}</span></td>
          <td>${esc(o.customer?.name || '—')}<br><span class="muted small">${esc(o.area)}</span></td><td>${esc(o.cook.displayName)}</td><td>${esc(o.rider?.name || '—')}</td>
          <td>${tk(o.total)}<br><span class="muted small">${esc(o.payment?.method || '')} ${esc((o.payment?.status || '').toLowerCase())}</span></td><td>${statusBadge(o.status)}</td>
        </tr>`).join('')}</tbody></table>` : empty('No orders yet.')}`;
    },

    async payouts() {
      const list = await api(`/admin/payouts?status=${state.filters.payouts}`);
      return `
        <div class="top"><div><h1>Payouts</h1><p class="muted">Send money to the cook’s bKash, then mark it paid with the transaction ID.</p></div>${tabs('payouts', [['OPEN', 'To send'], ['ALL', 'All']])}</div>
        ${list.length ? `<table><thead><tr><th>Kitchen</th><th>Amount</th><th>Send to</th><th>Requested</th><th>Status</th><th></th></tr></thead><tbody>${list.map((p) => `<tr>
          <td><b>${esc(p.cook.displayName)}</b><br><span class="muted small">${esc(p.cook.user?.phone || '')}</span></td><td><b>${tk(p.amount)}</b></td><td>${esc(p.method)}</td><td>${when(p.createdAt)}</td><td>${statusBadge(p.status)}${p.providerRef ? `<br><span class="muted small">${esc(p.providerRef)}</span>` : ''}</td>
          <td>${['REQUESTED', 'PROCESSING'].includes(p.status) ? `<div class="row"><button class="btn sm ok" data-payout="PAID" data-id="${esc(p.id)}">Mark paid</button><button class="btn sm danger" data-payout="FAILED" data-id="${esc(p.id)}">Failed</button></div>` : ''}</td>
        </tr>`).join('')}</tbody></table>` : empty('No payout requests.')}`;
    },

    async activity() {
      const list = await api('/admin/activity');
      return `<div class="top"><div><h1>Activity log</h1><p class="muted">Every admin action, newest first.</p></div></div>
        ${list.length ? `<table><thead><tr><th>When</th><th>Admin</th><th>Action</th><th>Detail</th></tr></thead><tbody>${list.map((l) => `<tr><td>${when(l.createdAt)}</td><td>${esc(l.adminEmail)}</td><td>${esc(l.action.replace(/_/g, ' ').toLowerCase())}</td><td class="muted small">${esc(l.detail || l.targetId || '')}</td></tr>`).join('')}</tbody></table>` : empty('Nothing yet.')}`;
    },
  };
  const NAV = [['dashboard', 'Dashboard'], ['applications', 'Applications'], ['reports', 'Reports'], ['users', 'People'], ['orders', 'Orders'], ['payouts', 'Payouts'], ['activity', 'Activity log']];

  async function render() {
    const s = session.get();
    if (!s?.token) return renderLogin();
    $app.innerHTML = `
      <div class="shell">
        <aside class="side">${brand(true)}
          ${NAV.map(([k, l]) => `<button class="nav ${state.view === k ? 'on' : ''}" data-go="${k}"><span>${l}</span>${state.counts[k] ? `<span class="count">${state.counts[k]}</span>` : ''}</button>`).join('')}
          <div class="foot"><div class="muted">Signed in as</div><b>${esc(s.email)}</b><br><button class="btn sm ghost mt" data-action="logout">Sign out</button></div>
        </aside>
        <main id="view"><div class="spinner"></div></main>
      </div>`;
    try { document.getElementById('view').innerHTML = await VIEWS[state.view](); }
    catch (e) { const v = document.getElementById('view'); if (v) v.innerHTML = `<div class="card empty">${esc(e.message)}<br><br><button class="btn ghost" data-go="${state.view}">Try again</button></div>`; }
  }

  /* ---------- modals ---------- */
  function ask(title, label, required) {
    return new Promise((resolve) => {
      const m = document.createElement('div'); m.className = 'modal';
      m.innerHTML = `<form class="box"><h2>${esc(title)}</h2><label class="field">${esc(label)}<textarea class="input" name="t" rows="3" maxlength="300" ${required ? 'required' : ''}></textarea></label><div class="row"><button class="btn primary" type="submit">Confirm</button><button class="btn ghost" type="button" data-x>Cancel</button></div></form>`;
      document.body.appendChild(m);
      const close = (v) => { m.remove(); resolve(v); };
      m.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); close(m.querySelector('textarea').value.trim()); });
      m.addEventListener('click', (e) => { if (e.target === m || e.target.hasAttribute('data-x')) close(null); });
      m.querySelector('textarea').focus();
    });
  }
  async function showDoc(id) {
    const m = document.createElement('div'); m.className = 'modal'; m.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(m); m.addEventListener('click', () => m.remove());
    try { const d = await api('/admin/documents/' + encodeURIComponent(id)); const img = new Image(); img.alt = d.kind; img.src = `data:${d.mime};base64,${d.data}`; m.innerHTML = ''; m.appendChild(img); }
    catch (e) { m.remove(); toast(e.message); }
  }

  /* ---------- events ---------- */
  document.addEventListener('submit', (e) => {
    if (e.target.id === 'loginForm') { e.preventDefault(); submitLogin(e.target); }
    if (e.target.id === 'userSearch') { e.preventDefault(); state.filters.users = e.target.q.value.trim(); render(); }
  });
  document.addEventListener('click', async (e) => {
    const el = e.target.closest('button'); if (!el) return;
    const d = el.dataset;
    try {
      if (d.action === 'back-email') { state.step = 'email'; return renderLogin(); }
      if (d.action === 'logout') { session.clear(); state.view = 'dashboard'; return render(); }
      if (d.go) { state.view = d.go; return render(); }
      if (d.filter) { state.filters[d.filter] = d.value; return render(); }
      if (d.doc) return showDoc(d.doc);
      if (d.decide) {
        const note = d.decide === 'approve' ? await ask('Approve this applicant?', 'Optional note (e.g. “Video call done 2 Nov”)', false)
          : await ask(d.decide === 'reject' ? 'What should they fix?' : 'Why suspend?', 'They will see this message', true);
        if (note === null) return;
        el.disabled = true;
        await api(`/admin/applications/${d.id}/${d.decide}`, { method: 'POST', body: { note: note || undefined } });
        toast(d.decide === 'approve' ? 'Approved — they have been notified' : 'Saved — they have been notified'); return render();
      }
      if (d.report) {
        const note = await ask(d.report === 'INVESTIGATING' ? 'Message to the customer' : 'Resolution message to the customer', 'Optional', false);
        if (note === null) return;
        el.disabled = true;
        await api(`/admin/complaints/${d.id}`, { method: 'POST', body: { status: d.report === 'INVESTIGATING' ? 'INVESTIGATING' : 'RESOLVED', refund: d.report === 'REFUND', note: note || undefined } });
        toast('Report updated'); return render();
      }
      if (d.user) {
        const note = d.user === 'suspend' ? await ask('Suspend this person?', 'Reason (kept in the activity log)', true) : '';
        if (note === null) return;
        el.disabled = true;
        await api(`/admin/users/${d.id}/${d.user}`, { method: 'POST', body: d.user === 'suspend' ? { note } : {} });
        toast(d.user === 'suspend' ? 'Suspended and signed out' : 'Restored'); return render();
      }
      if (d.payout) {
        const ref = await ask(d.payout === 'PAID' ? 'Mark payout as paid' : 'Mark payout as failed', d.payout === 'PAID' ? 'bKash transaction ID' : 'Reason', d.payout === 'PAID');
        if (ref === null) return;
        el.disabled = true;
        await api(`/admin/payouts/${d.id}`, { method: 'POST', body: { status: d.payout, reference: ref || undefined } });
        toast('Payout updated'); return render();
      }
    } catch (err) { el.disabled = false; toast(err.message); }
  });

  if (!API) $app.innerHTML = '<div class="empty">Set the API address in config.js.</div>'; else render();
})();
