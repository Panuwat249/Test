/* app.js — Red Line Data System (API-enabled, fallback localStorage)
   - Replace API_BASE and API_KEY with your Google Apps Script Web App URL and API key.
   - Works with existing HTML IDs used previously:
     - add.html: yearInput, monthInput, lineInput, typeInput, valueInput
     - index.html: dataTable (tbody), searchYear, searchMonth, searchLine, searchType, editPopup etc.
     - dashboard.html: chartType, chartLine, chartMonthly, chartYear, chartMonthly etc.
*/

/* ---------- CONFIG ---------- */
// Put your deployed Apps Script Web App URL here (the exec URL)
const API_BASE = "https://script.google.com/macros/s/AKfycbyNAFF9yGqIFaKLKgCOfpz-HwlMRzUBwYWhFHu67L_rP_2uRwY3Py_s50vX4Oysyfo/exec"; // e.g. "https://script.google.com/macros/s/XXXXX/exec"
// If you set REDLINE_API_KEY in Script Properties, put it here:
const API_KEY = "REDLINE_API_KEY"; // e.g. "my_secret_key"

// Polling interval (ms) for near-real-time refresh when using API
const POLLING_MS = 60000; // 60 seconds

/* ---------- Constants / Utils ---------- */
const STORAGE_KEY = 'redlineData';
const monthNames = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
  "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];

function isApiEnabled(){
  return typeof API_BASE === 'string' && API_BASE.trim().length > 0;
}

/* ---------- API helpers (for Google Apps Script) ---------- */
async function apiGet(params = {}){
  if(!isApiEnabled()) throw new Error('API not configured');
  const p = {...params};
  if(API_KEY) p.key = API_KEY;
  const qs = new URLSearchParams(p).toString();
  const url = `${API_BASE}?${qs}`;
  const res = await fetch(url, { method: 'GET' });
  if(!res.ok) throw new Error('API GET failed: ' + res.status);
  return await res.json();
}

async function apiPost(obj = {}){
  if(!isApiEnabled()) throw new Error('API not configured');
  const body = {...obj, key: API_KEY};
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if(!res.ok) throw new Error('API POST failed: ' + res.status);
  return await res.json();
}

async function apiPut(obj = {}){
  if(!isApiEnabled()) throw new Error('API not configured');
  const body = {...obj, key: API_KEY};
  // Try real PUT first
  let res = await fetch(API_BASE, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if(!res.ok){
    // fallback: POST with _method=PUT (Apps Script still handles real PUT usually)
    res = await fetch(API_BASE + '?_method=PUT', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  }
  if(!res.ok) throw new Error('API PUT failed: ' + res.status);
  return await res.json();
}

async function apiDelete(params = {}){
  if(!isApiEnabled()) throw new Error('API not configured');
  const p = {...params};
  if(API_KEY) p.key = API_KEY;
  const qs = new URLSearchParams(p).toString();
  // Try DELETE
  let res = await fetch(`${API_BASE}?${qs}`, { method: 'DELETE' });
  if(!res.ok){
    // fallback: POST with _method=DELETE
    res = await fetch(`${API_BASE}?_method=DELETE&${qs}`, { method: 'POST' });
  }
  if(!res.ok) throw new Error('API DELETE failed: ' + res.status);
  return await res.json();
}

/* ---------- Local fallback (localStorage) ---------- */
function loadLocal(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch(e){ return []; }
}
function saveLocal(data){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/* ---------- Unified data functions (use API if available, otherwise local) ---------- */
async function loadData(filter = {}) {
  if(isApiEnabled()){
    try {
      // Google Apps Script doGet supports query params year/month/line/type
      const resp = await apiGet(filter);
      // If the script returns array directly or object { ... }
      if(Array.isArray(resp)) return resp;
      if(resp && Array.isArray(resp.data)) return resp.data;
      return resp;
    } catch(err){
      console.warn('API load failed, falling back to local:', err);
      return loadLocal();
    }
  } else {
    return loadLocal();
  }
}

async function addData(record){
  if(isApiEnabled()){
    try {
      return await apiPost(record);
    } catch(err){
      console.warn('API add failed, fallback to local:', err);
      const db = loadLocal(); db.push(record); saveLocal(db); return {ok:true};
    }
  } else {
    const db = loadLocal(); db.push(record); saveLocal(db); return {ok:true};
  }
}

async function updateData(identifier, record){
  // identifier: object with _row or index when local
  if(isApiEnabled()){
    try {
      // prefer _row if provided
      const payload = {...record};
      if(identifier && identifier._row) payload._row = identifier._row;
      else if(identifier && identifier.id) payload.id = identifier.id;
      return await apiPut(payload);
    } catch(err){
      console.warn('API update failed, fallback to local:', err);
      // fallback local: identifier.index
      const db = loadLocal();
      if(Number.isInteger(identifier)) { db[identifier] = record; saveLocal(db); return {ok:true}; }
      return {error:'no_local_update'};
    }
  } else {
    const db = loadLocal();
    if(Number.isInteger(identifier)) { db[identifier] = record; saveLocal(db); return {ok:true}; }
    return {error:'no_local_update'};
  }
}

async function deleteData(identifier){
  if(isApiEnabled()){
    try {
      // identifier: {_row: n} or {id: val}
      if(typeof identifier === 'object'){
        return await apiDelete(identifier);
      } else if(Number.isInteger(identifier)){
        // we need row number — fetch all to find mapping by index
        const all = await loadData();
        const item = all[identifier];
        if(item && item._row) return await apiDelete({_row: item._row});
        // fallback: cannot delete
        throw new Error('No _row to delete');
      } else throw new Error('Invalid identifier for delete');
    } catch(err){
      console.warn('API delete failed, fallback local:', err);
      const db = loadLocal(); if(Number.isInteger(identifier)){ db.splice(identifier,1); saveLocal(db); return {ok:true}; }
      return {error:'no_local_delete'};
    }
  } else {
    const db = loadLocal(); if(Number.isInteger(identifier)){ db.splice(identifier,1); saveLocal(db); return {ok:true}; }
    return {error:'no_local_delete'};
  }
}

/* ---------- UI helpers & population ---------- */
function populateMonths(selectId, includeBlank = true){
  const sel = document.getElementById(selectId);
  if(!sel) return;
  let html = includeBlank ? '<option value="">-- เลือกเดือน --</option>' : '';
  monthNames.forEach(m => html += `<option value="${m}">${m}</option>`);
  sel.innerHTML = html;
}
function populateYears(selectId, start=2560, end=2585, includeBlank=true){
  const sel = document.getElementById(selectId);
  if(!sel) return;
  let html = includeBlank ? '<option value="">-- เลือกปี --</option>' : '';
  for(let y = start; y <= end; y++) html += `<option value="${y}">${y}</option>`;
  sel.innerHTML = html;
}

/* Call populators for known IDs (if present) */
['month','editMonth','monthInput','searchMonth'].forEach(id => populateMonths(id));
populateYears('searchYear', 2564, 2585);
populateYears('dashboardYear', 2564, 2585, true);

/* ---------- Table rendering ---------- */
async function renderTable(filter = {}){
  const tbody = document.querySelector('#dataTable tbody') || document.querySelector('#dataTableBody') || document.getElementById('dataBody');
  if(!tbody) return;
  tbody.innerHTML = '';
  const rows = await loadData(filter);
  // Normalize: ensure rows is array of objects with fields year, month, line, type, value, maybe _row
  const normalized = Array.isArray(rows) ? rows : [];
  // sort
  normalized.sort((a,b) => {
    const ya = Number(a.year), yb = Number(b.year);
    if(ya !== yb) return ya - yb;
    const ma = monthNames.indexOf(a.month), mb = monthNames.indexOf(b.month);
    return ma - mb;
  });

  normalized.forEach((r, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.year ?? ''}</td>
      <td>${r.month ?? ''}</td>
      <td>${r.line ?? ''}</td>
      <td>${r.type ?? ''}</td>
      <td>${r.value ?? ''}</td>
      <td><button class="btn-edit" data-idx="${idx}">แก้ไข</button></td>
      <td><button class="btn-delete" data-idx="${idx}">ลบ</button></td>
    `;
    tbody.appendChild(tr);
  });

  // Attach listeners
  tbody.querySelectorAll('.btn-delete').forEach(btn => {
    btn.onclick = async () => {
      const i = +btn.dataset.idx;
      if(!confirm('ต้องการลบรายการนี้หรือไม่?')) return;
      // Delete using index mapping: need _row if API; pass index and deleteData will handle fallback
      const res = await deleteData(i);
      if(res && res.error) alert('ลบไม่สำเร็จ: ' + (res.error || JSON.stringify(res)));
      await renderTable(filter);
    };
  });

  tbody.querySelectorAll('.btn-edit').forEach(btn => {
    btn.onclick = async () => {
      const i = +btn.dataset.idx;
      openEditPopup(i);
    };
  });
}

/* Auto initial render */
document.addEventListener('DOMContentLoaded', () => {
  // If on index page and table exists, render
  if(document.querySelector('#dataTable tbody')) renderTable();
  // Start polling if API enabled
  if(isApiEnabled()){
    setInterval(()=> {
      if(document.querySelector('#dataTable tbody')) renderTable();
      // Optionally refresh dashboard charts if present
      if(typeof refreshDashboard === 'function') refreshDashboard();
    }, POLLING_MS);
  }
});

/* ---------- Add data (called from add.html) ---------- */
async function addDataHandler(e){
  // if used as form submit handler, prevent default
  if(e && e.preventDefault) e.preventDefault();
  const year = document.getElementById('yearInput')?.value;
  const month = document.getElementById('monthInput')?.value;
  const line = document.getElementById('lineInput')?.value;
  const type = document.getElementById('typeInput')?.value;
  const value = document.getElementById('valueInput')?.value;
  if(!year || !month || !line || !type || (value === '' || value === null)){ alert('กรุณากรอกข้อมูลให้ครบ'); return; }

  const record = { year: Number(year), month, line, type, value: Number(value) };
  const res = await addData(record);
  if(res && res.error){ alert('เพิ่มข้อมูลล้มเหลว: ' + JSON.stringify(res)); return; }
  alert('เพิ่มข้อมูลเรียบร้อย');
  // If on add.html, clear inputs
  if(document.getElementById('yearInput')) {
    document.getElementById('yearInput').value=''; document.getElementById('monthInput').value=''; document.getElementById('lineInput').value='North';
    document.getElementById('typeInput').value='TSP'; document.getElementById('valueInput').value='';
  }
  // redirect back to index if desired
  if(location.pathname.endsWith('add.html')) location.href = 'index.html';
}

/* If add form exists, attach handler */
document.addEventListener('DOMContentLoaded', () => {
  const formBtn = document.querySelector('#addButton') || document.querySelector('#dataForm') || document.getElementById('addButtonManual');
  // If form element present, attach submit
  const formEl = document.getElementById('dataForm');
  if(formEl) formEl.addEventListener('submit', addDataHandler);
  // If there is a standalone add button (not a form), attach click
  const addBtn = document.getElementById('addManualBtn') || document.getElementById('addButton');
  if(addBtn) addBtn.onclick = addDataHandler;
});

/* ---------- Edit popup ---------- */
let currentEditingIndex = null;
function openEditPopup(index){
  currentEditingIndex = index;
  // load record by index (from API or local)
  loadData().then(arr => {
    const rec = arr[index];
    if(!rec) { alert('ไม่พบข้อมูล'); return; }
    // fill popup inputs (Ids: editYear, editMonth, editLine, editType, editValue)
    document.getElementById('editYear').value = rec.year ?? '';
    document.getElementById('editMonth').value = rec.month ?? '';
    document.getElementById('editLine').value = rec.line ?? 'North';
    document.getElementById('editType').value = rec.type ?? 'TSP';
    document.getElementById('editValue').value = rec.value ?? '';
    // store _row in hidden input for API usage
    const hidden = document.getElementById('editRowId');
    if(hidden) hidden.value = rec._row || '';
    // show popup
    const popup = document.getElementById('editPopup');
    if(popup) popup.style.display = 'flex';
  });
}
function closeEditPopup(){
  const popup = document.getElementById('editPopup');
  if(popup) popup.style.display = 'none';
  currentEditingIndex = null;
}
async function saveEditHandler(){
  // read inputs
  const y = document.getElementById('editYear')?.value;
  const m = document.getElementById('editMonth')?.value;
  const l = document.getElementById('editLine')?.value;
  const t = document.getElementById('editType')?.value;
  const v = document.getElementById('editValue')?.value;
  if(!y || !m || !l || !t || (v === '' || v === null)){ alert('กรุณากรอกข้อมูลให้ครบ'); return; }

  // Build record
  const record = { year: Number(y), month: m, line: l, type: t, value: Number(v) };

  // Determine identifier for update: prefer _row if present
  const hidden = document.getElementById('editRowId');
  if(hidden && hidden.value){
    // update via _row
    const payload = {...record, _row: Number(hidden.value)};
    const res = await updateData(payload, record);
    if(res && res.error) alert('อัปเดตไม่สำเร็จ: ' + JSON.stringify(res));
  } else if(Number.isInteger(currentEditingIndex)){
    // update by index in local fallback
    const res = await updateData(currentEditingIndex, record);
    if(res && res.error) alert('อัปเดตไม่สำเร็จ: ' + JSON.stringify(res));
  } else {
    // try to find matching record and update by properties (last resort) - not implemented
    alert('ไม่ทราบไอดีสำหรับการแก้ไข');
  }

  closeEditPopup();
  await renderTable();
}

/* Attach edit popup actions */
document.addEventListener('DOMContentLoaded', () => {
  const saveBtn = document.getElementById('saveEditBtn') || document.getElementById('saveEdit');
  if(saveBtn) saveBtn.onclick = saveEditHandler;
  const closeBtn = document.getElementById('closeEditBtn') || document.getElementById('closeEdit');
  if(closeBtn) closeBtn.onclick = closeEditPopup;
  // also close when clicking outside popup-content
  document.addEventListener('click', (e) => {
    const popup = document.getElementById('editPopup');
    if(!popup) return;
    if(e.target === popup) closeEditPopup();
  });
});

/* ---------- Search & Reset functions ---------- */
async function searchData(){
  const y = document.getElementById('searchYear')?.value;
  const m = document.getElementById('searchMonth')?.value;
  const l = document.getElementById('searchLine')?.value;
  const t = document.getElementById('searchType')?.value;
  // If API enabled, pass params to loadData
  const filter = {};
  if(y) filter.year = y;
  if(m) filter.month = m;
  if(l) filter.line = l;
  if(t) filter.type = t;
  await renderTable(filter);
}
function resetSearch(){
  if(document.getElementById('searchYear')) document.getElementById('searchYear').value='';
  if(document.getElementById('searchMonth')) document.getElementById('searchMonth').value='';
  if(document.getElementById('searchLine')) document.getElementById('searchLine').value='';
  if(document.getElementById('searchType')) document.getElementById('searchType').value='';
  renderTable();
}

/* ---------- Export (Excel / PDF) ---------- */
async function exportExcel(){
  if(typeof XLSX === 'undefined'){ alert('SheetJS not loaded (XLSX)'); return; }
  const data = await loadData();
  if(!data || data.length === 0){ alert('ไม่มีข้อมูลให้ส่งออก'); return; }
  const header = ['ปี (พ.ศ.)','เดือน','สาย','ประเภท','จำนวน'];
  const aoa = [header];
  data.forEach(r => aoa.push([r.year, r.month, r.line, r.type, r.value]));
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{wpx:80},{wpx:110},{wpx:100},{wpx:80},{wpx:70}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  XLSX.writeFile(wb, 'RedLine_Report.xlsx');
}

async function exportPDF(){
  if(!(window.jspdf || typeof jspdf !== 'undefined')){ alert('jsPDF not loaded'); return; }
  const data = await loadData();
  if(!data || data.length === 0){ alert('ไม่มีข้อมูลให้ส่งออก'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('l','pt','a4');
  doc.setFontSize(14);
  doc.text('Red Line — รายงานข้อมูล', 40, 40);
  const rows = data.map(d => [d.year,d.month,d.line,d.type,d.value]);
  doc.autoTable({
    head:[['ปี (พ.ศ.)','เดือน','สาย','ประเภท','จำนวน']],
    body:rows,
    startY:60,
    styles:{fontSize:10},
    headStyles:{fillColor:[184,0,0], textColor:255}
  });
  doc.save('RedLine_Report.pdf');
}

/* ---------- Dashboard helpers (still works but uses async loadData) ---------- */
async function initDashboardIfPresent(){
  const chartTypeEl = document.getElementById('chartType');
  if(!chartTypeEl) return;
  const data = await loadData();

  // counts by type
  const types = ['TSP','TSA','TA'];
  const countsByType = types.map(t => data.filter(d => d.type === t).length);
  new Chart(chartTypeEl.getContext('2d'), {
    type:'bar',
    data:{ labels: types, datasets: [{ label:'จำนวน', data: countsByType, backgroundColor:['#B80000','#FF8A65','#FFC107'] }]},
    options:{ responsive:true }
  });

  // by line
  const lines = ['North','West','Red'];
  const countsByLine = lines.map(l => data.filter(d => (l==='Red'? d.line==='Red' : d.line===l)).length);
  const chartLineEl = document.getElementById('chartLine');
  if(chartLineEl){
    new Chart(chartLineEl.getContext('2d'), {
      type:'doughnut',
      data:{ labels: ['North','West','Red Line'], datasets:[{ data: countsByLine, backgroundColor:['#1976d2','#43a047','#B80000'] }]},
      options:{ responsive:true }
    });
  }

  // monthly stacked
  const months = monthNames.slice();
  const monthlyDatasets = types.map((type, idx) => {
    const dataPoints = months.map(m => data.filter(d => d.month === m && d.type === type).length);
    const colors = ['#B80000','#FF8A65','#FFC107'];
    return { label: type, data: dataPoints, backgroundColor: colors[idx], stack: 'stack1' };
  });
  const chartMonthlyEl = document.getElementById('chartMonthly');
  if(chartMonthlyEl){
    new Chart(chartMonthlyEl.getContext('2d'), {
      type:'bar',
      data:{ labels: months, datasets: monthlyDatasets },
      options:{ responsive:true, scales:{ x:{ stacked:true }, y:{ stacked:true } } }
    });
  }

  // year trend line
  const years = Array.from(new Set(data.map(d => d.year))).sort((a,b)=>a-b);
  const countsPerYear = years.map(y => data.filter(d => d.year === y).length);
  const chartYearEl = document.getElementById('chartYear');
  if(chartYearEl){
    new Chart(chartYearEl.getContext('2d'), {
      type:'line',
      data:{ labels: years, datasets: [{ label:'จำนวน/ปี', data: countsPerYear, borderColor: '#B80000', fill:false }]},
      options:{ responsive:true }
    });
  }
}
initDashboardIfPresent();

/* ---------- End of file ---------- */
