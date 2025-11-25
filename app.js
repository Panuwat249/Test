const monthNames = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
renderTable(loadData());
}


function renderTable(data){
const tb = document.querySelector('#dataTable tbody');
tb.innerHTML = '';


data.sort((a,b)=> a.year-b.year || monthNames.indexOf(a.month)-monthNames.indexOf(b.month));


data.forEach((x,i)=>{
const tr = document.createElement('tr');
tr.innerHTML = `
<td>${x.year}</td>
<td>${x.month}</td>
<td>${x.line}</td>
<td>${x.type}</td>
<td>${x.details}</td>
<td><button onclick="openEdit(${i})">แก้ไข</button></td>
<td><button onclick="deleteData(${i})">ลบ</button></td>`;
tb.appendChild(tr);
});
}


function deleteData(i){
const d = loadData();
d.splice(i,1);
saveData(d);
renderTable(d);
}


/* Popup Edit */
let editIndex = null;
function openEdit(i){
const d = loadData()[i];
editIndex = i;
editYear.value = d.year;
editMonth.value = d.month;
editLine.value = d.line;
editType.value = d.type;
editDetails.value = d.details;
document.getElementById('editPopup').style.display = 'flex';
}
function closePopup(){ document.getElementById('editPopup').style.display = 'none'; }
function saveEdit(){
const d = loadData();
d[editIndex] = {
year: editYear.value,
month: editMonth.value,
line: editLine.value,
type: editType.value,
details: editDetails.value
};
saveData(d);
closePopup();
renderTable(d);
}


/* Advanced Search */
function filterData(){
const y = searchYear.value;
const m = searchMonth.value;
const l = searchLine.value;
const t = searchType.value;


let data = loadData();


if(y) data = data.filter(x=> x.year == y);
if(m) data = data.filter(x=> x.month == m);
if(l) data = data.filter(x=> x.line == l);
if(t) data = data.filter(x=> x.type == t);


renderTable(data);
}
