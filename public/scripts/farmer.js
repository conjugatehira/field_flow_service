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
    if (this.dataset.page === 'verify') loadScanHistory();
    if (this.dataset.page === 'profile') loadProfile();
    if (this.dataset.page === 'advisory') loadAdvisoryHistory();
    if (this.dataset.page === 'complaints') loadComplaints();
    if (this.dataset.page === 'settings') loadSettings();
  });
});

async function refreshData() {
  const data = await api('/farmers/dashboard');
  if (data.error) return;

  document.getElementById('stat-scans').textContent = data.stats.totalScans || 0;
  document.getElementById('stat-advisories').textContent = data.stats.totalAdvisories || 0;
  document.getElementById('stat-complaints').textContent = data.stats.totalComplaints || 0;
  document.getElementById('stat-pending').textContent = data.stats.pendingComplaints || 0;

  const feed = document.getElementById('scan-feed');
  if (data.recentScans && data.recentScans.length) {
    feed.innerHTML = data.recentScans.slice(0, 5).map(s =>
      '<div class="scan-item ' + (s.result === 'authentic' ? 'verified' : 'counterfeit') + '">' +
      '<i class="fas fa-' + (s.result === 'authentic' ? 'check-circle' : 'times-circle') + '"></i>' +
      '<span>' + (s.product_name || 'Unknown') + '</span>' +
      '<span class="time">' + new Date(s.scanned_at).toLocaleDateString() + '</span></div>'
    ).join('');
  } else {
    feed.innerHTML = '<div class="scan-item" style="color:var(--text-secondary)">No scans yet</div>';
  }

  const af = document.getElementById('advisory-feed');
  if (data.recentAdvisories && data.recentAdvisories.length) {
    const a = data.recentAdvisories[0];
    af.innerHTML = '<div class="advisory-item"><span class="badge weather">' + a.condition_rule + '</span><p>' + a.message_template.slice(0, 80) + '...</p><span class="time">' + new Date(a.sent_at).toLocaleDateString() + '</span></div>';
  } else {
    af.innerHTML = '<div class="scan-item" style="color:var(--text-secondary)">No advisories yet. Set your crop type first.</div>';
  }
}

async function verifyProduct(e) {
  e.preventDefault();
  const code = document.getElementById('verify-code').value.trim();
  if (!code) return;

  const btn = e.target.querySelector('button');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Checking...';

  const data = await api('/verify', {
    method: 'POST',
    body: JSON.stringify({ qrCode: code, farmerId: (await api('/farmers/me')).id })
  });

  const div = document.getElementById('verify-result');
  div.style.display = 'block';

  if (data.authentic) {
    div.className = 'result authentic';
    div.style.background = '#1b5e20';
    div.innerHTML = '<div style="font-size:1.3em;font-weight:bold;color:#4caf50">&#10003; Authentic</div>' +
      '<div style="margin-top:8px"><span class="label" style="color:#a0c0b0">Product:</span> <strong>' + (data.product || 'N/A') + '</strong></div>' +
      '<div><span class="label" style="color:#a0c0b0">Manufactured:</span> ' + (data.mfgDate || 'N/A') + '</div>' +
      '<div><span class="label" style="color:#a0c0b0">Expires:</span> ' + (data.expiryDate || 'N/A') + '</div>' +
      (data.expired ? '<div style="color:#ffab40;margin-top:8px">&#9888; This product is EXPIRED</div>' : '') +
      (data.alreadyScanned ? '<div style="color:#ffab40;margin-top:8px">&#9888; Already scanned before</div>' : '');
  } else {
    div.className = 'result fake';
    div.style.background = '#b71c1c';
    div.innerHTML = '<div style="font-size:1.3em;font-weight:bold;color:#ef5350">&#10007; ' +
      (data.reason === 'recalled' ? 'RECALLED' : data.reason === 'flagged' ? 'FLAGGED' : 'Counterfeit') + '</div>' +
      '<div style="margin-top:8px;color:#e0e0e0">' + (data.message || 'Unknown product') + '</div>';
  }

  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-search"></i> Verify';
  loadScanHistory();
}

async function loadScanHistory() {
  const scans = await api('/verify/history');
  const tb = document.getElementById('scan-history-table');
  if (!scans || !scans.length) {
    tb.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-secondary)">No scans yet</td></tr>';
    return;
  }
  tb.innerHTML = scans.map(s =>
    '<tr><td>' + (s.product_name || s.batch_id?.slice(0, 8) || 'N/A') + '</td>' +
    '<td><span class="badge ' + (s.result === 'authentic' ? 'quality' : 'counterfeit') + '">' + s.result + '</span></td>' +
    '<td>' + new Date(s.scanned_at).toLocaleString() + '</td></tr>'
  ).join('');
}

async function loadProfile() {
  const user = await api('/farmers/me');
  if (user.error) return;
  document.getElementById('prof-name').value = user.name || '';
  document.getElementById('prof-phone').value = user.phone || '';
  document.getElementById('prof-upazila').value = user.upazila || '';
  document.getElementById('prof-crop').value = user.crop_type || '';
  document.getElementById('prof-soil').value = user.soil_type || '';
}

async function updateProfile(e) {
  e.preventDefault();
  const name = document.getElementById('prof-name').value;
  const upazila = document.getElementById('prof-upazila').value;
  const cropType = document.getElementById('prof-crop').value;
  const soilType = document.getElementById('prof-soil').value;

  const data = await api('/farmers/profile', {
    method: 'PATCH',
    body: JSON.stringify({ name, upazila, cropType, soilType })
  });

  if (data.error) {
    showToast(data.error, 'times-circle');
  } else {
    showToast('Profile saved');
    refreshData();
  }
}

async function getAdvisory() {
  const div = document.getElementById('advisory-result');
  div.style.display = 'block';
  div.innerHTML = '<div><i class="fas fa-spinner fa-pulse"></i> Generating advisory...</div>';
  div.style.background = '#1a237e';

  const data = await api('/farmers/advisory', { method: 'POST' });

  if (data.error) {
    div.style.background = '#b71c1c';
    div.innerHTML = '<div style="color:#ef5350">' + data.error + '</div>';
    return;
  }

  div.style.background = '#1b5e20';
  div.innerHTML = '<div style="font-size:1.1em;font-weight:bold;color:#4caf50">&#10003; Advisory</div>' +
    '<div style="margin-top:8px"><span style="color:#a0c0b0">Crop:</span> <strong>' + data.cropType + '</strong> | ' +
    '<span style="color:#a0c0b0">Condition:</span> <span class="badge weather">' + data.condition + '</span> | ' +
    '<span style="color:#a0c0b0">Temp:</span> ' + data.temperature + '&#8451;</div>' +
    '<div style="margin-top:12px;padding:12px;background:rgba(0,0,0,0.2);border-radius:8px;line-height:1.5">' + data.message + '</div>';

  loadAdvisoryHistory();
}

async function loadAdvisoryHistory() {
  const advisories = await api('/advisory/history');
  const tb = document.getElementById('advisory-history-table');
  if (!advisories || !advisories.length) {
    tb.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-secondary)">No advisories yet</td></tr>';
    return;
  }
  tb.innerHTML = advisories.map(a =>
    '<tr><td>' + (a.crop_type || '-') + '</td>' +
    '<td><span class="badge weather">' + (a.condition_rule || '-') + '</span></td>' +
    '<td style="max-width:300px;white-space:normal;font-size:0.85em">' + (a.message_template?.slice(0, 60) || '') + '...</td>' +
    '<td>' + new Date(a.sent_at).toLocaleDateString() + '</td></tr>'
  ).join('');
}

async function fileComplaint(e) {
  e.preventDefault();
  const code = document.getElementById('comp-code').value.trim();
  const desc = document.getElementById('comp-desc').value.trim();
  if (!code || !desc) return;

  const btn = e.target.querySelector('button');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Filing...';

  const batches = await api('/batches?qr=' + encodeURIComponent(code));
  if (!batches || !batches.length) {
    showToast('Batch not found for this QR code', 'times-circle');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> File Complaint';
    return;
  }
  const batchId = batches[0].id;

  const data = await api('/complaints', {
    method: 'POST',
    body: JSON.stringify({ batchId, description: desc })
  });

  if (data.error) {
    showToast(data.error, 'times-circle');
  } else {
    showToast('Complaint filed');
    document.getElementById('comp-code').value = '';
    document.getElementById('comp-desc').value = '';
    loadComplaints();
  }

  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-paper-plane"></i> File Complaint';
}

async function loadComplaints() {
  const complaints = await api('/complaints');
  const ct = document.getElementById('complaint-table');
  if (!complaints || !complaints.length) {
    ct.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-secondary)">No complaints</td></tr>';
    return;
  }
  ct.innerHTML = complaints.map(c =>
    '<tr><td style="font-family:monospace;font-size:0.85em">' + c.id.slice(0, 8) + '</td>' +
    '<td>' + (c.product_name || c.batch_id?.slice(0, 8) || 'N/A') + '</td>' +
    '<td><span class="badge ' + (c.status === 'resolved' ? 'quality' : 'counterfeit') + '">' + c.status + '</span></td>' +
    '<td>' + new Date(c.created_at).toLocaleDateString() + '</td></tr>'
  ).join('');
}

async function loadSettings() {
  const user = await api('/farmers/me');
  if (user.error) return;
  document.getElementById('settings-info').innerHTML =
    '<div style="background:var(--surface2);padding:12px;border-radius:8px">' +
    '<div><span style="color:var(--text-secondary)">Name:</span> ' + (user.name || '-') + '</div>' +
    '<div><span style="color:var(--text-secondary)">Phone:</span> ' + (user.phone || '-') + '</div>' +
    '<div><span style="color:var(--text-secondary)">Crop:</span> ' + (user.crop_type || 'Not set') + '</div>' +
    '<div><span style="color:var(--text-secondary)">Location:</span> ' + (user.upazila || 'Not set') + '</div>' +
    '</div>';
}

refreshData();