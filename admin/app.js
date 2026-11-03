/* MaaCrave Admin — internal tool. Separate site, separate login, talks only to /v1/admin/* on the API. */
(() => {
  'use strict';
  const API = (window.MAACRAVE_API || '').replace(/\/$/, '');
  const KEY = 'maacrave.admin';
  const $app = document.getElementById('app');
  const state = { view: 'dashboard', email: '', step: 'email', filters: { apps: 'PENDING', role: '', reports: 'OPEN', payouts: 'OPEN', orders: '', users: '', support: 'OPEN' }, counts: {} };

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
  const statusBadge = (s) => `<span class="badge ${{ PENDING: 'warn', APPROVED: 'ok', REJECTED: 'err', SUSPENDED: 'err', OPEN: 'warn', INVESTIGATING: 'info', RESOLVED: 'ok', REQUESTED: 'warn', PROCESSING: 'info', PAID: 'ok', FAILED: 'err', DELIVERED: 'ok', CANCELLED: 'err', ANSWERED: 'ok', CLOSED: '' }[s] || 'brand'}">${esc(String(s).replace(/_/g, ' ').toLowerCase())}</span>`;
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
      state.counts = { applications: s.pendingApps, reports: s.openComplaints, payouts: s.pendingPayouts, support: s.openTickets };
      return `
        <div class="top"><div><h1>Today</h1><p class="muted">${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p></div></div>
        <div class="stats">
          <div class="stat hero">Sales delivered today<b>${tk(s.salesToday)}</b><span class="small">Commission ${tk(s.commissionToday)}</span></div>
          <div class="stat">Orders today<b>${s.ordersToday}</b><span class="muted small">${s.activeOrders} in progress</span></div>
          <div class="stat">Waiting for review<b>${s.pendingApps}</b><span class="muted small">cook & rider applications</span></div>
          <div class="stat">Open reports<b>${s.openComplaints}</b><span class="muted small">need a reply</span></div>
          <div class="stat">Payout requests<b>${s.pendingPayouts}</b><span class="muted small">to send</span></div>
          <div class="stat">Support<b>${s.openTickets || 0}</b><span class="muted small">waiting for a reply</span></div>
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
          <dt>Refund asked</dt><dd>${c.refundRequested ? tk(c.refundAmount) : 'No'}</dd>
          ${c.order.rider ? `<dt>Rider</dt><dd>${esc(c.order.rider.name || '—')}</dd>` : ''}
          ${c.refundedAmount ? `<dt>Refunded</dt><dd>${tk(c.refundedAmount)}${c.chargedTo ? ` · charged to ${esc(c.chargedTo.toLowerCase())}` : ''}</dd>` : ''}
          ${c.resolution ? `<dt>Our reply</dt><dd>${esc(c.resolution)}</dd>` : ''}</dl>
          ${c.status !== 'RESOLVED' ? `<div class="row mt">
            ${c.status === 'OPEN' ? `<button class="btn ghost" data-report="INVESTIGATING" data-id="${esc(c.id)}">Mark investigating</button>` : ''}
            <button class="btn ok" data-report="RESOLVED" data-id="${esc(c.id)}">Resolve</button>
            <button class="btn primary" data-report="REFUND" data-id="${esc(c.id)}" data-total="${c.order.total}" data-method="${esc(c.order.payment?.method || '')}">Resolve + refund</button>
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
        ${list.length ? `<table><thead><tr><th>Order</th><th>Customer</th><th>Kitchen</th><th>Rider</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>${list.map((o) => `<tr>
          <td><b>${esc(o.code)}</b><br><span class="muted small">${when(o.createdAt)}${o.batchId ? ' · group' : ''}</span></td>
          <td>${esc(o.customer?.name || '—')}<br><span class="muted small">${esc(o.customer?.phone || '')} · ${esc(o.area)}</span></td><td>${esc(o.cook.displayName)}</td>
          <td>${esc(o.rider?.name || '—')}${o.rider?.phone ? `<br><span class="muted small">${esc(o.rider.phone)}</span>` : ''}</td>
          <td>${tk(o.total)}<br><span class="muted small">${esc(o.payment?.method || '')} ${esc((o.payment?.status || '').toLowerCase())}</span></td><td>${statusBadge(o.status)}</td>
          <td><div class="row">${o.status === 'RIDER_ASSIGNED' ? `<button class="btn sm ghost" data-order="release-rider" data-id="${esc(o.id)}">Reassign rider</button>` : ''}${!['DELIVERED', 'CANCELLED'].includes(o.status) ? `<button class="btn sm danger" data-order="cancel" data-id="${esc(o.id)}">Cancel</button>` : ''}</div></td>
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

    async support() {
      const list = await api(`/admin/tickets?status=${state.filters.support || 'OPEN'}`);
      const roleName = { CUSTOMER: 'Customer', COOK: 'Cook', RIDER: 'Rider' };
      return `
        <div class="top"><div><h1>Support</h1><p class="muted">Messages from customers, cooks and riders. They get a notification when you reply.</p></div>${tabs('support', [['OPEN', 'Open'], ['CLOSED', 'Closed'], ['ALL', 'All']])}</div>
        <div class="list">${list.length ? list.map((t) => `<div class="card">
          <div class="row between"><div><h3>${esc(t.subject)}</h3><span class="muted small">${roleName[t.role] || t.role} · ${esc(t.user?.name || '—')} · ${esc(t.user?.phone || t.user?.email || '')} · ${when(t.createdAt)}</span></div>${statusBadge(t.status)}</div>
          <div class="thread">${t.messages.map((m) => `<div class="msg ${m.fromAdmin ? 'admin' : ''}"><p>${esc(m.body)}</p><span class="muted small">${m.fromAdmin ? 'MaaCrave · ' + esc(m.adminEmail || '') : esc(t.user?.name || 'User')} · ${when(m.createdAt)}</span></div>`).join('')}</div>
          ${t.status !== 'CLOSED' ? `<form class="reply" data-ticket="${esc(t.id)}"><textarea class="input" name="body" rows="2" maxlength="1500" required placeholder="Write a reply…"></textarea>
            <div class="row between"><label class="row small"><input type="checkbox" name="close"/> Close after sending</label><button class="btn primary" type="submit">Send reply</button></div></form>` : ''}
        </div>`).join('') : empty('No support requests here.')}</div>`;
    },

    async riders() {
      const list = await api('/admin/riders/wallets');
      return `
        <div class="top"><div><h1>Rider cash</h1><p class="muted">Cash riders collected on delivery and the earnings you owe them. Record every cash hand-in and every payout here — riders see it in their app.</p></div></div>
        ${list.length ? `<table><thead><tr><th>Rider</th><th>Cash in hand</th><th>Unpaid earnings</th><th>Balance</th><th></th></tr></thead><tbody>${list.map((r) => `<tr>
          <td><b>${esc(r.name || '—')}</b>${r.online ? ' <span class="badge ok">online</span>' : ''}<br><span class="muted small">${esc(r.phone || '')} · ${esc(r.vehicle)}</span></td>
          <td><b>${tk(r.cashInHand)}</b>${r.overLimit ? ' <span class="badge err">over limit</span>' : ''}<br><span class="muted small">limit ${tk(r.cashLimit)}</span></td>
          <td>${tk(r.unpaidEarnings)}<br><span class="muted small">earned ${tk(r.earnedTotal)}</span></td>
          <td>${r.balance > 0 ? `<span class="badge warn">rider owes ${tk(r.balance)}</span>` : r.balance < 0 ? `<span class="badge ok">we owe ${tk(-r.balance)}</span>` : '<span class="badge">settled</span>'}</td>
          <td><div class="row">${r.cashInHand > 0 ? `<button class="btn sm ghost" data-ledger="CASH_DEPOSIT" data-id="${esc(r.userId)}" data-max="${r.cashInHand}">Cash received</button>` : ''}${r.unpaidEarnings > 0 ? `<button class="btn sm ok" data-ledger="PAYOUT" data-id="${esc(r.userId)}" data-max="${r.unpaidEarnings}">Paid rider</button>` : ''}</div></td>
        </tr>`).join('')}</tbody></table>` : empty('No approved riders yet.')}
        <div class="card mt"><h3>How settlement works</h3><p class="muted">Each week: if a rider holds more cash than they earned, they hand in the difference. If they earned more, send the difference to their bKash and record it as “Paid rider”. Record both sides so the balance stays right.</p></div>`;
    },

    async rates() {
      const r = await api('/admin/rates');
      const n = (name, label, val, step = 1, hint = '') => `<label class="field">${label}<input class="input" type="number" min="0" step="${step}" name="${name}" value="${esc(val)}" required/>${hint ? `<span class="muted small">${hint}</span>` : ''}</label>`;
      const ex = (km) => r.riderBase + Math.round(km * r.riderPerKm);
      const fee = (km) => r.deliveryFee + Math.max(0, Math.ceil(km - r.freeKm)) * r.deliveryPerKm;
      return `
        <div class="top"><div><h1>Rates</h1><p class="muted">Version ${r.version}${r.updatedAt ? ' · changed ' + when(r.updatedAt) : ''}. Saving creates a new version: every cook and rider is notified and must accept before going online again.</p></div></div>
        <div class="stats">
          <div class="stat hero">Cook keeps<b>${100 - r.commissionPct}%</b><span class="small">commission ${r.commissionPct}%</span></div>
          <div class="stat">৳200 order<b>${tk(200 - Math.round(200 * r.commissionPct / 100))}</b><span class="muted small">to the cook</span></div>
          <div class="stat">4 km delivery<b>${tk(fee(4))}</b><span class="muted small">customer pays · rider gets ${tk(ex(4))}</span></div>
          <div class="stat">8 km delivery<b>${tk(fee(8))}</b><span class="muted small">customer pays · rider gets ${tk(ex(8))}</span></div>
        </div>
        <form id="ratesForm" class="card mt" autocomplete="off">
          <h3>Cooks</h3>
          <div class="grid2">${n('commissionPct', 'Commission %', r.commissionPct, 0.5)}${n('serviceFee', 'Service fee (customer) ৳', r.serviceFee)}</div>
          <h3 class="mt">Delivery (customer pays)</h3>
          <div class="grid2">${n('deliveryFee', 'Delivery fee ৳', r.deliveryFee)}${n('batchDeliveryFee', 'Group-order delivery ৳', r.batchDeliveryFee)}
            ${n('freeKm', 'Km included', r.freeKm, 0.5)}${n('deliveryPerKm', '৳ per extra km', r.deliveryPerKm)}</div>
          <h3 class="mt">Riders</h3>
          <div class="grid2">${n('riderBase', 'Base per drop ৳', r.riderBase)}${n('riderPerKm', '৳ per km', r.riderPerKm)}
            ${n('riderBatchDrop', 'Base per group drop ৳', r.riderBatchDrop)}${n('riderCashLimit', 'Cash limit ৳', r.riderCashLimit, 100)}</div>
          <label class="field mt">What changed (sent to all partners)<input class="input" name="summary" maxlength="200" required placeholder="e.g. Rider pay per km goes up from ৳6 to ৳7 from 10 Nov."/></label>
          <button class="btn primary mt" type="submit">Save new rates</button>
        </form>`;
    },

    async spotlights() {
      const rows = await api('/admin/spotlights');
      const DEF = [
        { slot: 1, layout: 'poster', title: 'Friday Biryani', titleBn: 'শুক্রবারের বিরিয়ানি', subtitle: 'Kacchi & tehari from home kitchens', subtitleBn: 'ঘরের হাঁড়ির কাচ্চি আর তেহারি', icon: 'soup', theme: 'crimson', animation: 'steam', action: 'category:rice', active: true },
        { slot: 2, title: 'Under ৳150', titleBn: '৳১৫০ এর মধ্যে', subtitle: 'Full meals on a student budget', subtitleBn: 'স্টুডেন্ট বাজেটে পেট ভরে', icon: 'percent', theme: 'saffron', animation: 'wiggle', action: 'maxPrice:150', active: true },
        { slot: 3, title: 'Light & healthy', titleBn: 'হালকা ও স্বাস্থ্যকর', subtitle: 'Less oil, more vegetables', subtitleBn: 'কম তেল, বেশি সবজি', icon: 'leaf', theme: 'forest', animation: 'float', action: 'category:healthy', active: true },
        { slot: 4, title: 'Meal plans', titleBn: 'মিল প্ল্যান', subtitle: 'Lunch box every day', subtitleBn: 'প্রতিদিন দুপুরের টিফিন', icon: 'coffee', theme: 'ocean', animation: 'pulse', action: 'plans', active: true },
        { slot: 5, title: 'Sweet tooth', titleBn: 'মিষ্টিমুখ', subtitle: 'Payesh, pitha & home desserts', subtitleBn: 'পায়েশ, পিঠা আর ঘরের মিষ্টি', icon: 'cake', theme: 'rose', animation: 'wiggle', action: 'category:dessert', active: true },
      ];
      const ICONS = ['soup', 'fish', 'drumstick', 'beef', 'leaf', 'cake', 'cookie', 'sun', 'moon', 'flame', 'sparkles', 'users', 'gift', 'heart', 'utensils', 'request', 'percent', 'coffee'];
      const THEMES = [['crimson', 'Crimson'], ['saffron', 'Saffron'], ['forest', 'Green'], ['night', 'Night'], ['rose', 'Rose'], ['ocean', 'Ocean']];
      const ANIMS = [['float', 'Float up & down'], ['steam', 'Rising steam'], ['pulse', 'Pulse rings'], ['shine', 'Light sweep'], ['wiggle', 'Wiggle'], ['spin', 'Slow spin']];
      const LAYOUTS = [['arch', 'Title band + picture'], ['poster', 'Full poster']];
      const ACTIONS = [['browse', 'Open Browse'], ['request', 'Request a dish'], ['groups', 'Group orders'], ['plans', 'Meal plans'], ['maxPrice:150', 'Under ৳150'], ['maxPrice:250', 'Under ৳250'],
        ...['rice', 'bengali', 'fish', 'chicken', 'beef', 'veg', 'snacks', 'breakfast', 'lunch', 'dinner', 'dessert', 'healthy'].map((c) => ['category:' + c, 'Category: ' + c])];
      const sel = (name, opts, v) => `<select class="input" name="${name}">${opts.map((o) => { const [val, label] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(val)}" ${val === v ? 'selected' : ''}>${esc(label)}</option>`; }).join('')}</select>`;
      return `
        <div class="top"><div><h1>Home spotlight</h1><p class="muted">The five animated cards under “What are you craving?” in the app. Changes appear within about 10 minutes.</p></div></div>
        <div class="spots">${[1, 2, 3, 4, 5].map((slot) => {
          const r = rows.find((x) => x.slot === slot) || DEF[slot - 1];
          return `<form class="card spot spot-${esc(r.theme)}" data-spot="${slot}">
            <div class="row between"><h3>Card ${slot}</h3><label class="row small"><input type="checkbox" name="active" ${r.active ? 'checked' : ''}/> Show in app</label></div>
            <label class="field">Title (English)<input class="input" name="title" maxlength="40" required value="${esc(r.title)}"/></label>
            <label class="field">শিরোনাম (বাংলা)<input class="input" name="titleBn" maxlength="40" required value="${esc(r.titleBn)}"/></label>
            <label class="field">Subtitle (English)<input class="input" name="subtitle" maxlength="70" required value="${esc(r.subtitle)}"/></label>
            <label class="field">উপশিরোনাম (বাংলা)<input class="input" name="subtitleBn" maxlength="70" required value="${esc(r.subtitleBn)}"/></label>
            <div class="grid2">
              <label class="field">Icon${sel('icon', ICONS, r.icon)}</label>
              <label class="field">Colour${sel('theme', THEMES, r.theme)}</label>
              <label class="field">Animation${sel('animation', ANIMS, r.animation)}</label>
              <label class="field">When tapped${sel('action', ACTIONS, r.action)}</label>
              <label class="field">Card style${sel('layout', LAYOUTS, r.layout || 'arch')}</label>
            </div>
            <div class="spot-pic">
              <img class="spot-preview ${r.hasImage ? '' : 'hide'}" alt="" ${r.hasImage ? `src="${esc(API + '/spotlights/' + slot + '/image?v=' + encodeURIComponent(r.updatedAt || ''))}"` : ''}/>
              <div class="spot-pic-body">
                <label class="field">Picture <span class="muted small">(optional — JPG/PNG, shown with a slow zoom. Without one, the animated icon is used.)</span><input class="input" type="file" name="image" accept="image/jpeg,image/png,image/webp"/></label>
                ${r.hasImage ? '<label class="row small"><input type="checkbox" name="removeImage"/> Remove picture</label>' : ''}
              </div>
            </div>
            <button class="btn primary" type="submit">Save card ${slot}</button>
          </form>`;
        }).join('')}</div>`;
    },

    async festivals() {
      const list = await api('/admin/festivals');
      // Times are entered and shown in Dhaka time (UTC+6).
      const local = (iso) => (iso ? new Date(new Date(iso).getTime() + 6 * 3600_000).toISOString().slice(0, 16) : '');
      const form = (f) => `<form class="card" data-fest="${f ? esc(f.id) : 'new'}" autocomplete="off">
          <div class="row between"><h3>${f ? esc(f.title) : 'New festival'}</h3>${f ? `<label class="row small"><input type="checkbox" name="active" ${f.active ? 'checked' : ''}/> Show in app</label>` : '<input type="hidden" name="active" value="on"/>'}</div>
          <div class="grid2">
            <label class="field">Name (English)<input class="input" name="title" maxlength="60" required value="${esc(f?.title || '')}" placeholder="Eid-ul-Adha feast"/></label>
            <label class="field">নাম (বাংলা)<input class="input" name="titleBn" maxlength="60" required value="${esc(f?.titleBn || '')}" placeholder="ঈদের দাওয়াত"/></label>
            <label class="field">Line (English)<input class="input" name="blurb" maxlength="240" value="${esc(f?.blurb || '')}" placeholder="Korma, polao and firni from mothers' kitchens"/></label>
            <label class="field">লাইন (বাংলা)<input class="input" name="blurbBn" maxlength="240" value="${esc(f?.blurbBn || '')}" placeholder="মায়েদের হাতের কোরমা, পোলাও আর ফিরনি"/></label>
            <label class="field">Pre-orders open (Dhaka time)<input class="input" type="datetime-local" name="opensAt" required value="${local(f?.opensAt)}"/></label>
            <label class="field">Pre-orders close<input class="input" type="datetime-local" name="closesAt" required value="${local(f?.closesAt)}"/></label>
            <label class="field">Delivery day &amp; time<input class="input" type="datetime-local" name="deliverOn" required value="${local(f?.deliverOn)}"/></label>
          </div>
          <button class="btn primary mt" type="submit">${f ? 'Save' : 'Create — cooks are notified'}</button>
        </form>`;
      return `<div class="top"><div><h1>Festivals</h1><p class="muted">Pre-order windows for Eid, Pohela Boishakh, pitha season, iftar… Cooks add special dishes; customers order ahead and food arrives on the day. Shown on Home from two weeks before opening.</p></div></div>
        ${form(null)}
        ${list.length ? `<h2 class="mt">All festivals</h2><div class="stack">${list.map(form).join('')}</div>` : ''}`;
    },

    async mothers() {
      const r = await api('/admin/featured');
      const cur = r.cooks.find((c) => c.id === r.featuredCookId);
      const img = (id) => (id ? `<img class="face" alt="" src="${esc(API + '/media/' + id)}"/>` : '<span class="face none">—</span>');
      return `<div class="top"><div><h1>Mother of the week</h1><p class="muted">One mother is featured at the top of Home with her photo, story and best dishes. Pick someone with a real photo and story; she is notified.</p></div>
          ${cur ? '<button class="btn" data-feature="">Remove feature</button>' : ''}</div>
        ${cur ? `<div class="card row">${img(cur.portraitId)}<div><b>${esc(cur.displayName)}</b> · ${esc(cur.area)}<div class="muted small">Featured now</div></div></div>` : '<p class="muted">Nobody is featured, so Home skips the card.</p>'}
        ${r.cooks.length ? `<table class="mt"><thead><tr><th></th><th>Mother</th><th>Rating</th><th>Meals</th><th>Story</th><th></th></tr></thead><tbody>${r.cooks.map((c) => `<tr>
          <td>${img(c.portraitId)}</td><td><b>${esc(c.displayName)}</b><div class="muted small">${esc(c.area)}${c.region ? ' · ' + esc(c.region) : ''}</div></td>
          <td>${c.ratingCount ? c.rating.toFixed(1) + '★ (' + c.ratingCount + ')' : 'New'}</td><td>${c.completedOrders}</td>
          <td class="small muted">${c.story ? esc(c.story.slice(0, 90)) + (c.story.length > 90 ? '…' : '') : '<i>No story yet</i>'}</td>
          <td>${c.id === r.featuredCookId ? '<span class="badge ok">Featured</span>' : `<button class="btn small" data-feature="${esc(c.id)}">Feature</button>`}</td></tr>`).join('')}</tbody></table>` : empty('No approved cooks yet.')}`;
    },

    async photos() {
      const kind = state.filters.photos || '';
      const list = await api('/admin/photos' + (kind ? '?kind=' + kind : ''));
      const tabs = [['', 'All'], ['DISH', 'Dishes'], ['PORTRAIT', 'Portraits'], ['KITCHEN', 'Kitchens']];
      return `<div class="top"><div><h1>Photos</h1><p class="muted">Every photo cooks upload, newest first. Remove anything that isn't their own real food, face or kitchen; the cook is told why.</p></div></div>
        <div class="tabs">${tabs.map(([k, l]) => `<button class="tab ${kind === k ? 'on' : ''}" data-filter="photos" data-value="${k}">${l}</button>`).join('')}</div>
        ${list.length ? `<div class="photos">${list.map((p) => `<figure class="card photo">
            <img loading="lazy" alt="" src="${esc(API + '/media/' + p.id)}"/>
            <figcaption><b>${esc(p.cook)}</b><span class="muted small">${esc(p.kind.toLowerCase())} · ${when(p.createdAt)}</span></figcaption>
            <button class="btn small danger" data-photo-remove="${esc(p.id)}">Remove</button>
          </figure>`).join('')}</div>` : empty('No photos yet.')}`;
    },

    async activity() {
      const list = await api('/admin/activity');
      return `<div class="top"><div><h1>Activity log</h1><p class="muted">Every admin action, newest first.</p></div></div>
        ${list.length ? `<table><thead><tr><th>When</th><th>Admin</th><th>Action</th><th>Detail</th></tr></thead><tbody>${list.map((l) => `<tr><td>${when(l.createdAt)}</td><td>${esc(l.adminEmail)}</td><td>${esc(l.action.replace(/_/g, ' ').toLowerCase())}</td><td class="muted small">${esc(l.detail || l.targetId || '')}</td></tr>`).join('')}</tbody></table>` : empty('Nothing yet.')}`;
    },
  };
  const NAV = [['dashboard', 'Dashboard'], ['applications', 'Applications'], ['reports', 'Reports'], ['support', 'Support'], ['users', 'People'], ['orders', 'Orders'], ['payouts', 'Cook payouts'], ['riders', 'Rider cash'], ['rates', 'Rates'], ['spotlights', 'Home spotlight'], ['festivals', 'Festivals'], ['mothers', 'Mother of the week'], ['photos', 'Photos'], ['activity', 'Activity log']];

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
  /** Pick one of a few choices; resolves to the chosen value or null. */
  function choose(title, text, options) {
    return new Promise((resolve) => {
      const m = document.createElement('div'); m.className = 'modal';
      m.innerHTML = `<div class="box"><h2>${esc(title)}</h2><p class="muted">${esc(text)}</p><div class="list">${options.map(([v, l, sub]) => `<button class="btn ghost choice" type="button" data-v="${esc(v)}"><b>${esc(l)}</b>${sub ? `<span class="muted small">${esc(sub)}</span>` : ''}</button>`).join('')}</div><button class="btn ghost" type="button" data-x>Cancel</button></div>`;
      document.body.appendChild(m);
      const close = (v) => { m.remove(); resolve(v); };
      m.addEventListener('click', (e) => { const b = e.target.closest('button'); if (e.target === m || (b && b.hasAttribute('data-x'))) return close(null); if (b && b.dataset.v) close(b.dataset.v); });
    });
  }
  async function showDoc(id) {
    const m = document.createElement('div'); m.className = 'modal'; m.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(m); m.addEventListener('click', () => m.remove());
    try { const d = await api('/admin/documents/' + encodeURIComponent(id)); const img = new Image(); img.alt = d.kind; img.src = `data:${d.mime};base64,${d.data}`; m.innerHTML = ''; m.appendChild(img); }
    catch (e) { m.remove(); toast(e.message); }
  }

  /** Resize a picture to at most 900px and turn it into a JPEG data URL (keeps uploads small). */
  function shrink(file) {
    return new Promise((resolve, reject) => {
      if (file.size > 15 * 1024 * 1024) return reject(new Error('That picture is too big. Use one under 15 MB.'));
      const url = URL.createObjectURL(file); const img = new Image();
      img.onload = () => {
        const k = Math.min(1, 900 / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        let q = 0.85, out = c.toDataURL('image/jpeg', q);
        while (out.length > 1_400_000 && q > 0.4) { q -= 0.1; out = c.toDataURL('image/jpeg', q); }
        resolve(out);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Couldn’t read that picture.')); };
      img.src = url;
    });
  }
  document.addEventListener('change', (e) => {
    const el = e.target;
    if (el.name !== 'image' || !el.files || !el.files[0]) return;
    const prev = el.closest('form').querySelector('.spot-preview');
    prev.src = URL.createObjectURL(el.files[0]); prev.classList.remove('hide');
  });

  /* ---------- events ---------- */
  document.addEventListener('submit', (e) => {
    if (e.target.id === 'loginForm') { e.preventDefault(); submitLogin(e.target); }
    if (e.target.id === 'userSearch') { e.preventDefault(); state.filters.users = e.target.q.value.trim(); render(); }
    if (e.target.id === 'ratesForm') {
      e.preventDefault();
      const f = e.target; const btn = f.querySelector('button[type=submit]');
      const v = (n) => f.elements.namedItem(n).value;
      const body = { summary: v('summary').trim() };
      ['commissionPct', 'serviceFee', 'deliveryFee', 'batchDeliveryFee', 'freeKm', 'deliveryPerKm', 'riderBase', 'riderPerKm', 'riderBatchDrop', 'riderCashLimit'].forEach((k) => { body[k] = Number(v(k)); });
      if (!confirm('Save these rates? Every cook and rider will be notified and asked to accept them.')) return;
      btn.disabled = true;
      api('/admin/rates', { method: 'POST', body }).then((r) => { toast(`Saved version ${r.version} · ${r.told} partners notified`); render(); }).catch((err) => { btn.disabled = false; toast(err.message); });
    }
    if (e.target.dataset.ticket) {
      e.preventDefault();
      const f = e.target; const btn = f.querySelector('button[type=submit]'); btn.disabled = true;
      const body = { body: f.elements.namedItem('body').value.trim(), close: f.elements.namedItem('close').checked };
      api('/admin/tickets/' + f.dataset.ticket + '/reply', { method: 'POST', body }).then(() => { toast('Reply sent'); render(); }).catch((err) => { btn.disabled = false; toast(err.message); });
    }
    if (e.target.dataset.fest) {
      e.preventDefault();
      const f = e.target; const btn = f.querySelector('button[type=submit]');
      const g = (n) => f.elements.namedItem(n);
      const dt = (n) => g(n).value + ':00+06:00';
      const act = g('active');
      const body = { title: g('title').value.trim(), titleBn: g('titleBn').value.trim(), blurb: g('blurb').value.trim(), blurbBn: g('blurbBn').value.trim(), opensAt: dt('opensAt'), closesAt: dt('closesAt'), deliverOn: dt('deliverOn'), active: act.type === 'checkbox' ? act.checked : true };
      const id = f.dataset.fest;
      btn.disabled = true;
      api('/admin/festivals' + (id === 'new' ? '' : '/' + id), { method: 'POST', body }).then(() => { toast(id === 'new' ? 'Festival created — cooks notified' : 'Saved'); render(); }).catch((err) => { btn.disabled = false; toast(err.message); });
    }
    if (e.target.dataset.spot) {
      e.preventDefault();
      const f = e.target; const btn = f.querySelector('button[type=submit]'); btn.disabled = true;
      const g = (n) => f.elements.namedItem(n); // not f.title / f.action — those are built-in form properties
      const body = { title: g('title').value.trim(), titleBn: g('titleBn').value.trim(), subtitle: g('subtitle').value.trim(), subtitleBn: g('subtitleBn').value.trim(), icon: g('icon').value, theme: g('theme').value, animation: g('animation').value, action: g('action').value, layout: g('layout').value, active: g('active').checked };
      const file = g('image').files && g('image').files[0];
      const rm = g('removeImage');
      if (rm && rm.checked && !file) body.removeImage = true;
      (file ? shrink(file).then((img) => { body.image = img; }) : Promise.resolve())
        .then(() => api('/admin/spotlights/' + f.dataset.spot, { method: 'POST', body })).then(() => { toast('Card ' + f.dataset.spot + ' saved'); render(); }).catch((err) => { btn.disabled = false; toast(err.message); });
    }
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
      if ('feature' in d) {
        el.disabled = true;
        await api('/admin/featured', { method: 'POST', body: { cookId: d.feature || null } });
        toast(d.feature ? 'Featured — she has been notified' : 'Feature removed'); return render();
      }
      if (d.photoRemove) {
        const note = await ask('Remove this photo?', 'Tell the cook why (e.g. “Not your own food”, “Blurry”)', true);
        if (note === null) return;
        el.disabled = true;
        await api('/admin/photos/' + d.photoRemove + '/remove', { method: 'POST', body: { note } });
        toast('Removed — the cook has been told'); return render();
      }
      if (d.decide) {
        const note = d.decide === 'approve' ? await ask('Approve this applicant?', 'Optional note (e.g. “Video call done 2 Nov”)', false)
          : await ask(d.decide === 'reject' ? 'What should they fix?' : 'Why suspend?', 'They will see this message', true);
        if (note === null) return;
        el.disabled = true;
        await api(`/admin/applications/${d.id}/${d.decide}`, { method: 'POST', body: { note: note || undefined } });
        toast(d.decide === 'approve' ? 'Approved — they have been notified' : 'Saved — they have been notified'); return render();
      }
      if (d.report) {
        let refundAmount; let chargedTo;
        if (d.report === 'REFUND') {
          const amt = await ask('Refund amount (৳)', `Order total ${tk(Number(d.total))} · ${d.method === 'COD' ? 'cash order — send it to their bKash' : 'online — a full refund goes back automatically'}. Leave empty for the full amount.`, false);
          if (amt === null) return;
          refundAmount = amt ? Math.round(Number(amt.replace(/[^\d.]/g, ''))) : undefined;
          if (amt && !(refundAmount > 0)) { toast('Enter a number'); return; }
          chargedTo = await choose('Who pays for this refund?', 'The cook or rider has it deducted from their earnings and is notified.', [
            ['COOK', 'The cook', 'Wrong, missing, spoiled or unsafe food'],
            ['RIDER', 'The rider', 'Lost, spilled or damaged in delivery'],
            ['MAACRAVE', 'MaaCrave', 'Our mistake, goodwill, or not sure'],
          ]);
          if (!chargedTo) return;
        }
        const note = await ask(d.report === 'INVESTIGATING' ? 'Message to the customer' : 'Resolution message to the customer', 'Optional', false);
        if (note === null) return;
        el.disabled = true;
        await api(`/admin/complaints/${d.id}`, { method: 'POST', body: { status: d.report === 'INVESTIGATING' ? 'INVESTIGATING' : 'RESOLVED', refund: d.report === 'REFUND', refundAmount, chargedTo, note: note || undefined } });
        toast('Report updated'); return render();
      }
      if (d.user) {
        const note = d.user === 'suspend' ? await ask('Suspend this person?', 'Reason (kept in the activity log)', true) : '';
        if (note === null) return;
        el.disabled = true;
        await api(`/admin/users/${d.id}/${d.user}`, { method: 'POST', body: d.user === 'suspend' ? { note } : {} });
        toast(d.user === 'suspend' ? 'Suspended and signed out' : 'Restored'); return render();
      }
      if (d.order) {
        const reason = await ask(d.order === 'cancel' ? 'Cancel this order?' : 'Give this order to another rider?', d.order === 'cancel' ? 'Reason — the customer, cook and rider are told. Online payments are refunded automatically.' : 'Reason (kept in the activity log)', true);
        if (reason === null) return;
        el.disabled = true;
        await api(`/admin/orders/${d.id}/${d.order}`, { method: 'POST', body: { reason } });
        toast(d.order === 'cancel' ? 'Order cancelled' : 'Offered to nearby riders again'); return render();
      }
      if (d.ledger) {
        const amt = await ask(d.ledger === 'PAYOUT' ? 'Earnings paid to the rider (৳)' : 'Cash received from the rider (৳)', `Up to ${tk(Number(d.max))}`, true);
        if (amt === null) return;
        const amount = Math.round(Number(amt.replace(/[^\d.]/g, '')));
        if (!(amount > 0)) { toast('Enter a number'); return; }
        const ref = await ask('Reference', d.ledger === 'PAYOUT' ? 'bKash transaction ID' : 'Receipt number or note (optional)', d.ledger === 'PAYOUT');
        if (ref === null) return;
        el.disabled = true;
        await api(`/admin/riders/${d.id}/ledger`, { method: 'POST', body: { kind: d.ledger, amount, reference: ref || undefined } });
        toast('Recorded — the rider can see it in Earnings'); return render();
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
