function doGet(e){
  
  var op = e.parameter.action;
  var ss=SpreadsheetApp.openByUrl("ใส่ url ของชีต");//////////////
  var sheet = ss.getSheetByName("แผ่น1");
 
  if(op=="insert")
    return insert_value(e,sheet);

  if(op=="read")
    return read_value(e,ss);
  
  if(op=="update")
    return update_value(e,sheet);
  
  if(op=="delete")
    return delete_value(e,sheet);
  
   else{  return HtmlService.createTemplateFromFile('index')/////////////
      .evaluate().setTitle('ระบบเพิ่ม/ลบ/แก้ไข'); }
}

function insert_value(request,sheet){
  var id = request.parameter.id;
  var name = request.parameter.name;
  var nickname = request.parameter.nickname;
  var phone = request.parameter.phone;//////////
  
  var flag=1;
  var lr= sheet.getLastRow();
  for(var i=1;i<=lr;i++){
    var id1 = sheet.getRange(i, 2).getValue();
    if(id1==id){
      flag=0;
  var result="มีรหัสนักเรียนนี้อยู่ในระบบแล้ว!!";
    } }
   if(flag==1){
  var d = new Date();
    var currentTime = d.toLocaleString();
  var rowData = sheet.appendRow([currentTime,id,name,nickname]);  
  var result="เพิ่มข้อมูลเรียบร้อยแล้ว!!";
  }
     result = JSON.stringify({
    "result": result
  });  
    
  return ContentService
  .createTextOutput(request.parameter.callback + "(" + result + ")")
  .setMimeType(ContentService.MimeType.JAVASCRIPT);   
  }

function read_value(request,ss){
  var output  = ContentService.createTextOutput(),
      data    = {};
  //ถ้าลืมเปลี่ยนชื่อชีตตรงนี้ จะโหลดข้อมูลมาแสดงไม่ได้
      var sheet="แผ่น1";/////////////////////////
  data.records = readData_(ss, sheet);
  var callback = request.parameters.callback;
  if (callback === undefined) {
    output.setContent(JSON.stringify(data));
  } else {
    output.setContent(callback + "(" + JSON.stringify(data) + ")");
  }
  output.setMimeType(ContentService.MimeType.JAVASCRIPT);
  return output;
}

function readData_(ss, sheetname, properties) {
  if (typeof properties == "undefined") {
    properties = getHeaderRow_(ss, sheetname);
    properties = properties.map(function(p) { return p.replace(/\s+/g, '_'); });
  }
  var rows = getDataRows_(ss, sheetname),
      data = [];
  for (var r = 0, l = rows.length; r < l; r++) {
    var row     = rows[r],
        record  = {};
    for (var p in properties) {
      record[properties[p]] = row[p];
    }
    data.push(record);
  }
  return data;
}

function getDataRows_(ss, sheetname) {
  var sh = ss.getSheetByName(sheetname);
  return sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
}

function getHeaderRow_(ss, sheetname) {
  var sh = ss.getSheetByName(sheetname);
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];  
} 
  
function update_value(request,sheet){
var output  = ContentService.createTextOutput();
  var id = request.parameter.id;
  var name = request.parameter.name;  
  var nickname = request.parameter.nickname;
  var phone = request.parameter.phone;//////////////////
  var flag=0;
  var lr= sheet.getLastRow();
  for(var i=1;i<=lr;i++){
    var rid = sheet.getRange(i, 2).getValue();
    if(rid==id){
      sheet.getRange(i,3).setValue(name);
      sheet.getRange(i,4).setValue(nickname);
      sheet.getRange(i,5).setValue(phone);//////////////////
      var result="อัปเดทข้อมูลเรียบร้อยแล้ว!!";
      flag=1;
    }
}
  if(flag==0)
    var result="ไม่มีรหัสนักเรียนนี้ในระบบ!!";
  
   result = JSON.stringify({
    "result": result
  });  
    
  return ContentService
  .createTextOutput(request.parameter.callback + "(" + result + ")")
  .setMimeType(ContentService.MimeType.JAVASCRIPT);   
}

function delete_value(request,sheet){
  var output  = ContentService.createTextOutput();
  var id = request.parameter.id;
  var name = request.parameter.name;
  var nickname = request.parameter.nickname;
  var phone = request.parameter.phone;///////////////////
  var flag=0;
  var lr= sheet.getLastRow();
  for(var i=1;i<=lr;i++){
    var rid = sheet.getRange(i, 2).getValue();
    if(rid==id){
      sheet.deleteRow(i);
      var result="ลบข้อมูลเรียบร้อยแล้ว!!";
      flag=1;
    }
  }
  if(flag==0)
    var result="ไม่พบรหัสนักเรียนนี้ในระบบ!!";
   result = JSON.stringify({
    "result": result
  });  
    
  return ContentService
  .createTextOutput(request.parameter.callback + "(" + result + ")")
  .setMimeType(ContentService.MimeType.JAVASCRIPT);   
}
