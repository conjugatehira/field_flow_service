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
  const data = await api('/supplier/dashboard');
  document.getElementById('stat-pending').textContent = data.pendingComplaints || 0;
  document.getElementById('stat-total').textContent = data.totalComplaints || 0;
  document.getElementById('stat-flagged').textContent = data.flaggedBatches || 0;

  const feed = document.getElementById('complaint-feed');
  if (data.complaints && data.complaints.length) {
    feed.innerHTML = data.complaints.slice(0, 5).map(c =>
      '<tr><td>' + c.product_name + '</td><td>' + (c.dealer_name || '-') + '</td><td>' + (c.phone || 'N/A') + '</td><td><span class="badge ' + c.status + '">' + c.status + '</span></td><td>' +
      (c.status !== 'resolved' ? '<button class="btn btn-sm btn-primary" onclick="resolveComplaint(\'' + c.id + '\')">Resolve</button>' : '<span style="color:var(--primary)">Done</span>') + '</td></tr>'
    ).join('');
  } else {
    feed.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-secondary)">No complaints</td></tr>';
  }

  const tb = document.getElementById('complaint-table');
  if (data.complaints) {
    tb.innerHTML = data.complaints.map(c =>
      '<tr><td>' + c.id.slice(0, 8) + '</td><td>' + c.product_name + '</td><td>' + (c.dealer_name || '-') + '</td><td><span class="badge ' + c.status + '">' + c.status + '</span></td><td>' +
      (c.status !== 'resolved' ? '<button class="btn btn-sm btn-primary" onclick="resolveComplaint(\'' + c.id + '\')">Resolve</button>' : '<span style="color:var(--primary)">Resolved</span>') + '</td></tr>'
    ).join('');
  }

  const bt = document.getElementById('batch-table');
  if (data.batches) {
    bt.innerHTML = data.batches.map(b =>
      '<tr><td>' + b.product_name + '</td><td>' + b.dealer_id.slice(0, 8) + '</td><td style="font-family:monospace;font-size:0.85em">' + b.qr_code + '</td><td><span class="badge ' + b.status + '">' + b.status + '</span></td></tr>'
    ).join('');
  }
}

async function resolveComplaint(id) {
  await api('/complaints/' + id + '/status', { method: 'PATCH', body: JSON.stringify({ status: 'resolved' }) });
  showToast('Complaint resolved');
  refreshData();
}

refreshData();
