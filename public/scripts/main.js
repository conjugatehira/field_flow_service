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
    if (this.dataset.page === 'scans') loadScans();
    if (this.dataset.page === 'batches') loadBatchTable();
    if (this.dataset.page === 'complaints') loadComplaints();
  });
});

async function refreshData() {
  const stats = await api('/dealers/dashboard');
  document.getElementById('stat-batches').textContent = stats.totalBatches || 0;
  document.getElementById('stat-scans').textContent = stats.totalScans || 0;
  document.getElementById('stat-complaints').textContent = stats.pendingComplaints || 0;
  const rate = stats.totalBatches > 0 ? Math.round((1 - stats.flaggedBatches / stats.totalBatches) * 100) + '%' : '0%';
  document.getElementById('stat-verified').textContent = rate;

  const batches = await api('/batches');
  const feed = document.getElementById('scan-feed');
  if (batches.length) {
    feed.innerHTML = batches.slice(0, 5).map(b =>
      `<div class="scan-item verified"><i class="fas fa-check-circle"></i><span>${b.product_name} (${b.qr_code})</span><span class="time">${new Date(b.created_at).toLocaleDateString()}</span></div>`
    ).join('');
  } else {
    feed.innerHTML = '<div class="scan-item" style="color:var(--text-secondary)">No batches yet</div>';
  }
}

async function loadBatchTable() {
  const batches = await api('/batches');
  const tb = document.getElementById('batch-table');
  if (!batches.length) {
    tb.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-secondary)">No batches</td></tr>';
    return;
  }
  const rows = await Promise.all(batches.map(async b => {
    let qrImg = b.qr_code;
    try {
      const qrRes = await api('/batches/' + b.id + '/qr');
      qrImg = '<img src="' + qrRes.qrImage + '" style="width:36px;height:36px;background:#fff;padding:3px;border-radius:4px;cursor:pointer" onclick="window.open(this.src)" title="' + b.qr_code + '">';
    } catch(e) {}
    return '<tr><td>' + b.product_name + '</td><td>' + b.product_type + '</td><td>' + qrImg + '</td><td><span class="badge ' + b.status + '">' + b.status + '</span></td><td>' + new Date(b.created_at).toLocaleDateString() + '</td></tr>';
  }));
  tb.innerHTML = rows.join('');
}

async function loadScans() {
  const batches = await api('/batches');
  let allScans = [];
  for (const b of batches) {
    try {
      const logs = await api('/batches/' + b.id + '/scan-logs');
      logs.forEach(l => l.product_name = b.product_name);
      allScans = allScans.concat(logs);
    } catch(e) {}
  }
  allScans.sort((a, b) => new Date(b.scanned_at) - new Date(a.scanned_at));
  const tb = document.getElementById('scan-table');
  if (!allScans.length) {
    tb.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-secondary)">No scans yet</td></tr>';
    return;
  }
  tb.innerHTML = allScans.slice(0, 20).map(s =>
    '<tr><td>' + (s.product_name || s.batch_id) + '</td><td>' + (s.farmer_name || s.phone || 'N/A') + '</td><td><span class="badge ' + (s.result === 'authentic' ? 'quality' : 'counterfeit') + '">' + s.result + '</span></td><td>' + (s.location || '-') + '</td><td>' + new Date(s.scanned_at).toLocaleString() + '</td></tr>'
  ).join('');
}

async function loadComplaints() {
  const complaints = await api('/complaints');
  const ct = document.getElementById('complaints-table');
  if (!complaints.length) {
    ct.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-secondary)">No complaints</td></tr>';
    return;
  }
  ct.innerHTML = complaints.map(c =>
    '<tr><td>' + c.id.slice(0, 8) + '</td><td>' + (c.product_name || c.batch_id) + '</td><td>' + (c.phone || 'N/A') + '</td><td><span class="badge ' + (c.status === 'resolved' ? 'quality' : 'counterfeit') + '">' + c.status + '</span></td><td>' +
    (c.status !== 'resolved' ? '<button class="btn btn-sm btn-primary" onclick="updateStatus(\'' + c.id + '\',\'resolved\')">Resolve</button>' : '<span style="color:var(--primary)">Resolved</span>') + '</td></tr>'
  ).join('');
}

async function updateStatus(id, status) {
  await api('/complaints/' + id + '/status', { method: 'PATCH', body: JSON.stringify({ status }) });
  showToast('Complaint resolved');
  loadComplaints();
}

async function generateQR(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Generating...';

  const productName = document.getElementById('qr-product').value;
  const productType = document.getElementById('qr-type').value;
  const quantity = parseInt(document.getElementById('qr-quantity').value) || 1;
  const supplierId = document.getElementById('qr-supplier').value;
  const mfgDate = document.getElementById('qr-mfg').value || new Date().toISOString().split('T')[0];
  const expiryDate = document.getElementById('qr-exp').value || '2027-12-31';

  try {
    const data = await api('/batches', {
      method: 'POST',
      body: JSON.stringify({ productName, productType, supplierId: supplierId || undefined, mfgDate, expiryDate, quantity })
    });

    if (data.error) { showToast(data.error, 'times-circle'); btn.disabled = false; btn.innerHTML = '<i class="fas fa-qrcode"></i> Generate QR'; return; }

    document.getElementById('qr-title').textContent = productName + ' (' + productType + ')';
    document.getElementById('qr-sub').textContent = 'Code: ' + data.qr_code + ' | ID: ' + data.id.slice(0, 8);

    const qrRes = await api('/batches/' + data.id + '/qr');
    const qrContainer = document.getElementById('qrcode');
    qrContainer.innerHTML = '<img src="' + qrRes.qrImage + '" style="width:160px;height:160px;background:#fff;padding:8px;border-radius:8px" id="qrImg">';
    document.getElementById('qr-actions').style.display = 'flex';
    showToast('QR code generated for ' + productName);
    refreshData();
  } catch(err) {
    showToast('Error: ' + (err.message || err), 'times-circle');
  }
  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-qrcode"></i> Generate QR';
}

function downloadQR() {
  const img = document.getElementById('qrImg');
  if (!img) return;
  const link = document.createElement('a');
  link.download = 'fieldflow-qr.png';
  link.href = img.src;
  link.click();
}

function printQR() {
  const img = document.getElementById('qrImg');
  if (!img) return;
  const w = window.open('', '_blank');
  w.document.write('<img src="' + img.src + '" style="width:300px"/>');
  setTimeout(() => w.print(), 500);
}

refreshData();
