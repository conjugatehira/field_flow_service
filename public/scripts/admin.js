const TOKEN = localStorage.getItem('token');
if (!TOKEN) window.location.href = '/auth/login';

async function api(path, opts = {}) {
  opts.headers = { ...opts.headers, 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json' };
  const res = await fetch(path, opts);
  if (res.status === 401) { localStorage.removeItem('token'); window.location.href = '/auth/login'; }
  return res.json();
}

function showToast(msg, icon) {
  const t = document.getElementById('toast');
  document.getElementById('toast-icon').className = 'fas fa-' + (icon || 'check-circle');
  document.getElementById('toast-message').textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', function(e) {
    e.preventDefault();
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    this.classList.add('active');
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + this.dataset.page).classList.add('active');
    document.getElementById('page-title').textContent = this.querySelectorAll('span')[0].textContent;
  });
});

async function refreshData() {
  const users = await api('/admin/users');
  const batches = await api('/batches');
  const complaints = await api('/complaints');

  document.getElementById('stat-users').textContent = users.length || 0;
  document.getElementById('stat-batches').textContent = batches.length || 0;
  document.getElementById('stat-complaints').textContent = complaints.length || 0;
  const flagged = batches.filter(b => b.status === 'flagged').length;
  document.getElementById('stat-verified').textContent = batches.length ? Math.round((1 - flagged / batches.length) * 100) + '%' : '0%';

  document.getElementById('user-list').innerHTML = users.slice(0, 5).map(u =>
    '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)">' +
    '<span>' + u.name + '</span><span style="color:var(--text-secondary);font-size:0.85em">' + u.role + '</span></div>'
  ).join('') || 'No users';

  document.getElementById('complaint-list').innerHTML = complaints.slice(0, 5).map(c =>
    '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)">' +
    '<span>' + (c.product_name || c.batch_id) + '</span><span class="badge ' + c.status + '">' + c.status + '</span></div>'
  ).join('') || 'No complaints';

  document.getElementById('user-table').innerHTML = users.map(u =>
    '<tr><td>' + u.name + '</td><td>' + u.phone + '</td><td><span class="badge ' + u.role + '">' + u.role + '</span></td><td>' + (u.upazila || '-') + '</td></tr>'
  ).join('');

  document.getElementById('batch-table').innerHTML = batches.map(b =>
    '<tr><td>' + b.product_name + '</td><td>' + (b.dealer_name || b.dealer_id?.slice(0,8) || '-') + '</td><td><span class="badge ' + b.status + '">' + b.status + '</span></td><td>' + new Date(b.created_at).toLocaleDateString() + '</td></tr>'
  ).join('');

  document.getElementById('complaint-table').innerHTML = complaints.map(c =>
    '<tr><td>' + (c.product_name || c.batch_id) + '</td><td>' + (c.phone || 'N/A') + '</td><td><span class="badge ' + c.status + '">' + c.status + '</span></td><td>' + (c.routed_to?.slice(0,8) || 'Unassigned') + '</td></tr>'
  ).join('');

  const suppliers = await api('/suppliers');
  document.getElementById('supplier-table').innerHTML = suppliers.map(s =>
    '<tr><td>' + s.name + '</td><td>' + (s.contact || '-') + '</td><td style="font-family:monospace;font-size:0.85em">' + s.id.slice(0,12) + '...</td></tr>'
  ).join('');
}

document.getElementById('supplier-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('sup-name').value;
  const contact = document.getElementById('sup-contact').value;
  await api('/suppliers', { method: 'POST', body: JSON.stringify({ name, contact }) });
  showToast('Supplier added');
  document.getElementById('sup-name').value = '';
  document.getElementById('sup-contact').value = '';
  refreshData();
});

refreshData();
