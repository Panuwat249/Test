const monthNames = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
  "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];

// Populate year/month selects
function populateFilters() {
  const yearFrom = document.getElementById('filterYearFrom');
  const yearTo = document.getElementById('filterYearTo');
  const monthFrom = document.getElementById('filterMonthFrom');
  const monthTo = document.getElementById('filterMonthTo');

  let htmlYear = '';
  for(let y=2555;y<=2585;y++){ htmlYear += `<option value="${y}">${y}</option>`; }
  yearFrom.innerHTML = htmlYear; yearTo.innerHTML = htmlYear;

  let htmlMonth = '';
  monthNames.forEach((m,i)=>{ htmlMonth += `<option value="${i}">${m}</option>`; });
  monthFrom.innerHTML = htmlMonth; monthTo.innerHTML = htmlMonth;
}
populateFilters();

// Load data from localStorage
function loadData(){
  try { return JSON.parse(localStorage.getItem('redlineData')||'[]'); } 
  catch(e){ return []; }
}

// Filter and render
let chartInstance = null;

function applyFilters(){
  const yFrom = parseInt(document.getElementById('filterYearFrom').value);
  const yTo = parseInt(document.getElementById('filterYearTo').value);
  const mFrom = parseInt(document.getElementById('filterMonthFrom').value);
  const mTo = parseInt(document.getElementById('filterMonthTo').value);
  const line = document.getElementById('filterLine').value;
  const type = document.getElementById('filterType').value;

  let data = loadData();

  data = data.filter(d=>{
    return (!isNaN(yFrom)?d.year>=yFrom:true) &&
           (!isNaN(yTo)?d.year<=yTo:true) &&
           (!isNaN(mFrom)?monthNames.indexOf(d.month)>=mFrom:true) &&
           (!isNaN(mTo)?monthNames.indexOf(d.month)<=mTo:true) &&
           (!line||d.line===line) &&
           (!type||d.type===type);
  });

  renderTable(data);
  renderChart(data);
}

// Reset
function resetFilters(){
  document.getElementById('filterYearFrom').value='';
  document.getElementById('filterYearTo').value='';
  document.getElementById('filterMonthFrom').value='';
  document.getElementById('filterMonthTo').value='';
  document.getElementById('filterLine').value='';
  document.getElementById('filterType').value='';
  applyFilters();
}

// Render table
function renderTable(data){
  const tbody = document.querySelector('#dashboardTable tbody');
  tbody.innerHTML='';
  let sum=0;
  data.sort((a,b)=>a.year-b.year || monthNames.indexOf(a.month)-monthNames.indexOf(b.month));
  data.forEach(r=>{
    const tr = document.createElement('tr');
    tr.innerHTML=`<td>${r.year}</td><td>${r.month}</td><td>${r.line}</td><td>${r.type}</td><td>${r.value}</td>`;
    tbody.appendChild(tr);
    sum+=r.value;
  });
  const avg = data.length? (sum/data.length).toFixed(2) : 0;
  document.getElementById('averageValue').innerText = avg;
}

// Render chart
function renderChart(data){
  const ctx = document.getElementById('lineChart').getContext('2d');
  if(chartInstance){ chartInstance.destroy(); }

  // Aggregate by month-year
  let grouped = {};
  data.forEach(d=>{
    const key = `${d.year}-${monthNames.indexOf(d.month)}`;
    grouped[key] = (grouped[key]||0)+d.value;
  });

  const keys = Object.keys(grouped).sort((a,b)=>{
    const [y1,m1] = a.split('-').map(Number);
    const [y2,m2] = b.split('-').map(Number);
    return y1-y2 || m1-m2;
  });
  const labels = keys.map(k=>{
    const [y,m] = k.split('-').map(Number);
    return `${monthNames[m]} ${y}`;
  });
  const values = keys.map(k=>grouped[k]);
  const avg = values.length? values.reduce((a,b)=>a+b,0)/values.length : 0;
  const avgArray = values.map(_=>avg);

  chartInstance = new Chart(ctx,{
    type:'line',
    data:{
      labels:labels,
      datasets:[
        {label:'จำนวน', data:values, borderColor:'#B80000', fill:false, tension:0.2},
        {label:'ค่าเฉลี่ย', data:avgArray, borderColor:'#FF8A65', borderDash:[5,5], fill:false}
      ]
    },
    options:{
      responsive:true,
      plugins:{ legend:{ position:'top'}},
      scales:{ y:{ beginAtZero:true } }
    }
  });
}

// Initial render
applyFilters();
