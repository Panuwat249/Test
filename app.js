function loadData() {
  return JSON.parse(localStorage.getItem('redlineData') || '[]');
}
function saveData(data) {
  localStorage.setItem('redlineData', JSON.stringify(data));
}

// Handle form submit
if (document.getElementById('dataForm')) {
  document.getElementById('dataForm').addEventListener('submit', e => {
    e.preventDefault();
    const data = loadData();

    data.push({
      year: year.value,
      month: month.value,
      line: line.value,
      type: type.value,
      details: details.value
    });

    saveData(data);
    alert('บันทึกสำเร็จ');
    location.href = 'index.html';
  });
}

// Load table
if (document.getElementById('dataTable')) {
  const tbody = document.querySelector('#dataTable tbody');
  const data = loadData().sort((a,b)=> a.year-b.year || a.month-b.month);

  data.forEach((item,i)=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.year}</td>
      <td>${item.month}</td>
      <td>${item.line}</td>
      <td>${item.type}</td>
      <td>${item.details}</td>
      <td><button onclick="editData(${i})">แก้ไข</button></td>
      <td><button onclick="deleteData(${i})">ลบ</button></td>`;
    tbody.appendChild(tr);
  });
}

function deleteData(i){
  const data = loadData();
  data.splice(i,1);
  saveData(data);
  location.reload();
}

function editData(i){
  alert("ระบบแก้ไขสามารถเพิ่มได้ภายหลัง");
}

// Dashboard Charts
if (document.getElementById('barChart')){
  const data = loadData();
  const counts = { TSP:0, TSA:0, TA:0 };
  data.forEach(d=> counts[d.type]++);

  new Chart(barChart,{
    type:'bar',
    data:{ labels:['TSP','TSA','TA'], datasets:[{ data:Object.values(counts) }] }
  });

  const lineCounts = { North:0, West:0 };
  data.forEach(d=> lineCounts[d.line]++);

  new Chart(pieChart,{
    type:'pie',
    data:{ labels:['North','West'], datasets:[{ data:Object.values(lineCounts) }] }
  });
}
