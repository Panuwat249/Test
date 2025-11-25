/* app.js for Red Line Data System
 - stores data in localStorage under 'redlineData'
 - months shown as Thai names; years are พ.ศ. (e.g., 2564)
 - supports add (add.html), index (list/search/edit/delete/export), dashboard (charts)
*/

/* ----- Constants ----- */
const STORAGE_KEY = 'redlineData';
const monthNames = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];

/* ----- Utility: load/save ----- */
function loadData(){
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch(e){
    return [];
  }
}
function saveData(data){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/* ----- Populate months & years for selects ----- */
function populateMonths(selectId, includeBlank=true){
  const sel = document.getElementById(selectId);
  if(!sel) return;
  let html = includeBlank ? '<option value="">-- เลือกเดือน --</option>' : '';
  monthNames.forEach(m => html += `<option value="${m}">${m}</option>`);
  sel.innerHTML = html;
}
function populateYears(selectId, start=2560, end=2580, includeBlank=true){
  const sel = document.getElementById(selectId);
  if(!sel) return;
  let html = includeBlank ? `<option value="">-- เลือกปี --</option>` : '';
  for(let y=start; y<=end; y++){
    html += `<option value="${y}">${y}</option>`;
  }
  sel.innerHTML = html;
}

/* Auto-populate on pages */
['month','editMonth','monthInput','searchMonth'].forEach(id => populateMonths(id));
populateYears('searchYear', 2555, 2585);
populateYears('dashboardYear', 2555, 2585, true);

/* ----- Add (add.html) ----- */
function addData(){
  const year = document.getElementById('yearInput')?.value;
  const month = document.getElementById('monthInput')?.value;
  const line = document.getElementById('lineInput')?.value;
  const type = document.getElementById('typeInput')?.value;
  const value = document.getElementById('valueInput')?.value;

  if(!year || !month || !line || !type || value === ''){ alert('กรุณากรอกทุกช่อง'); return; }

  const db = loadData();
  db.push({ year: Number(year), month, line, type, value: Number(value) });
  saveData(db);
  alert('บันทึกเรียบร้อย');
  // clear fields
  document.getElementById('yearInput').value='';
  document.getElementById('monthInput').value='';
  document.getElementById('lineInput').value='North';
  document.getElementById('typeInput').value='TSP';
  document.getElementById('valueInput').value='';
}

/* ----- Render table (index.html) ----- */
function renderTable(dataArray){
  const tbody = document.querySelector('#dataTable tbody');
  if(!tbody) return;
  // sort by year asc, month order from monthNames
  dataArray.sort((a,b) => (a.year - b.year) || (monthNames.indexOf(a.month) - monthNames.indexOf(b.month)));
  tbody.innerHTML = '';
  dataArray.forEach((r, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.year}</td>
      <td>${r.month}</td>
      <td>${r.line}</td>
      <td>${r.type}</td>
      <td>${r.value}</td>
      <td><button class="btn-edit" data-idx="${idx}">แก้ไข</button></td>
      <td><button class="btn-delete" data-idx="${idx}">ลบ</button></td>
    `;
    tbody.appendChild(tr);
  });

  // attach events
  document.querySelectorAll('.btn-delete').forEach(b=>{
    b.onclick = () => {
      const i = +b.dataset.idx;
      if(confirm('ต้องการลบรายการใช่หรือไม่?')) {
        const db = loadData(); db.splice(i,1); saveData(db); renderTable(db);
      }
    };
  });
  document.querySelectorAll('.btn-edit').forEach(b=>{
    b.onclick = () => {
      const i = +b.dataset.idx;
      openEditPopup(i);
    };
  });
}

/* initial render on index page */
if(document.querySelector('#dataTable tbody')) {
  renderTable(loadData());
}

/* ----- Search / Filter ----- */
function searchData(){
  const y = document.getElementById('searchYear')?.value;
  const m = document.getElementById('searchMonth')?.value;
  const l = document.getElementById('searchLine')?.value;
  const t = document.getElementById('searchType')?.value;
  let d = loadData();
  if(y) d = d.filter(x => String(x.year) === String(y));
  if(m) d = d.filter(x => x.month === m);
  if(l) d = d.filter(x => x.line === l);
  if(t) d = d.filter(x => x.type === t);
  renderTable(d);
}
function resetSearch(){
  document.getElementById('searchYear') && (document.getElementById('searchYear').value = '');
  document.getElementById('searchMonth') && (document.getElementById('searchMonth').value = '');
  document.getElementById('searchLine') && (document.getElementById('searchLine').value = '');
  document.getElementById('searchType') && (document.getElementById('searchType').value = '');
  renderTable(loadData());
}

/* ----- Edit Popup ----- */
let editingIdx = null;
function openEditPopup(i){
  const db = loadData();
  const row = db[i];
  if(!row) return alert('ไม่พบข้อมูล');
  editingIdx = i;
  document.getElementById('editYear').value = row.year;
  document.getElementById('editMonth').value = row.month;
  document.getElementById('editLine').value = row.line;
  document.getElementById('editType').value = row.type;
  document.getElementById('editValue').value = row.value;
  document.getElementById('editPopup').style.display = 'flex';
}
function closePopup(){
  editingIdx = null;
  document.getElementById('editPopup').style.display = 'none';
}
function saveEdit(){
  const y = document.getElementById('editYear')?.value;
  const m = document.getElementById('editMonth')?.value;
  const l = document.getElementById('editLine')?.value;
  const t = document.getElementById('editType')?.value;
  const v = document.getElementById('editValue')?.value;
  if(!y || !m || !l || !t || v === '') { alert('กรุณากรอกข้อมูลให้ครบ'); return; }
  const db = loadData();
  db[editingIdx] = { year: Number(y), month: m, line: l, type: t, value: Number(v) };
  saveData(db);
  closePopup();
  renderTable(db);
}

/* Connect popup's close on outside click */
document.addEventListener('click', (e)=>{
  const popup = document.getElementById('editPopup');
  if(!popup) return;
  if(e.target === popup) closePopup();
});

/* ----- Export Excel (SheetJS) ----- */
function exportExcel(){
  if(typeof XLSX === 'undefined') { alert('ยังไม่มีไลบรารี XLSX (SheetJS) ใน HTML — เพิ่ม CDN ก่อน export'); return; }
  const data = loadData();
  if(!data.length){ alert('ไม่มีข้อมูลให้ส่งออก'); return; }
  // Build array of arrays with header
  const header = ['ปี (พ.ศ.)','เดือน','สาย','ประเภท','จำนวน'];
  const aoa = [header];
  data.forEach(r => aoa.push([r.year, r.month, r.line, r.type, r.value]));
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  // set column widths for readability
  ws['!cols'] = [{wpx:80},{wpx:110},{wpx:100},{wpx:80},{wpx:70}];
  // create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  XLSX.writeFile(wb, 'RedLine_Report.xlsx');
}

/* ----- Export PDF (jsPDF + autotable) ----- */
function exportPDF(){
  if(typeof jspdf === 'undefined' && !(window.jspdf)) { alert('ยังไม่มี jsPDF ในหน้า — เพิ่ม CDN ก่อน export'); return; }
  const data = loadData();
  if(!data.length){ alert('ไม่มีข้อมูลให้ส่งออก'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('l','pt','a4');
  doc.setFontSize(14);
  doc.text('Red Line — รายงานข้อมูล', 40, 40);
  const rows = data.map(d => [d.year, d.month, d.line, d.type, d.value]);
  doc.autoTable({
    head: [['ปี (พ.ศ.)','เดือน','สาย','ประเภท','จำนวน']],
    body: rows,
    startY: 60,
    styles: { fontSize: 10 },
    headStyles: { fillColor: [184,0,0], textColor: 255 }
  });
  doc.save('RedLine_Report.pdf');
}

/* ----- Dashboard helpers (for dashboard.html) ----- */
(function initDashboardIfPresent(){
  // only run if dashboard canvas exists
  const chartTypeEl = document.getElementById('chartType');
  if(!chartTypeEl) return;
  const data = loadData();

  // Chart: counts by type
  const types = ['TSP','TSA','TA'];
  const countsByType = types.map(t => data.filter(d => d.type === t).length);
  new Chart(chartTypeEl.getContext('2d'), {
    type:'bar',
    data:{ labels: types, datasets: [{ label:'จำนวน', data: countsByType, backgroundColor:['#B80000','#FF8A65','#FFC107'] }]},
    options:{ responsive:true }
  });

  // Chart: by line
  const lines = ['North','West','Red'];
  const countsByLine = lines.map(l => data.filter(d => d.line === (l==='Red'?'Red':l)).length);
  const chartLineEl = document.getElementById('chartLine');
  new Chart(chartLineEl.getContext('2d'), {
    type:'doughnut',
    data:{ labels: ['North','West','Red Line'], datasets:[{ data: countsByLine, backgroundColor:['#1976d2','#43a047','#B80000'] }]},
    options:{ responsive:true }
  });

  // Monthly stacked chart for all years combined (per type)
  const months = monthNames.slice();
  const monthlyDatasets = types.map((type, idx) => {
    const dataPoints = months.map(m => data.filter(d => d.month === m && d.type === type).length);
    const colors = ['#B80000','#FF8A65','#FFC107'];
    return { label: type, data: dataPoints, backgroundColor: colors[idx], stack: 'stack1' };
  });
  const chartMonthlyEl = document.getElementById('chartMonthly');
  new Chart(chartMonthlyEl.getContext('2d'), {
    type:'bar',
    data:{ labels: months, datasets: monthlyDatasets },
    options:{ responsive:true, scales:{ x:{ stacked:true }, y:{ stacked:true } } }
  });

  // Year trend (line)
  const years = Array.from(new Set(data.map(d => d.year))).sort((a,b)=>a-b);
  const countsPerYear = years.map(y => data.filter(d => d.year === y).length);
  const chartYearEl = document.getElementById('chartYear');
  new Chart(chartYearEl.getContext('2d'), {
    type:'line',
    data:{ labels: years, datasets: [{ label:'จำนวน/ปี', data: countsPerYear, borderColor: '#B80000', fill:false }]},
    options:{ responsive:true }
  });
})();
