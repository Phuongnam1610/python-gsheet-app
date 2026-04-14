var SHEET_ID = '1dOZrzeFbca-g7YVGChWScxDy0HH2KA5QDhDX7ZP7T4g';
var SECRET_KEY = 'TASK_RPT_2026_SECURE';

function doGet(e) {
  // Nếu request có parameter action=history → trả JSON lịch sử
  if (e && e.parameter && e.parameter.action === 'history') {
    return getHistory(e);
  }

  // Mặc định: Trả về file HTML giao diện Form (giữ lại cho backward compatibility).
  return HtmlService.createHtmlOutputFromFile('index')
      .setTitle('Báo cáo & Quản lý Task Nhóm')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// API Endpoint: Nhận dữ liệu từ frontend bên ngoài qua fetch()
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    // ✅ Xác thực secret key chống spam
    if (!data._key || data._key !== SECRET_KEY) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: "Yêu cầu không hợp lệ. Vui lòng sử dụng form chính thức."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Xóa key khỏi data trước khi xử lý
    delete data._key;

    var result = submitTask(data);
    return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: "Lỗi xử lý request: " + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Hàm xử lý chính — được gọi từ cả doPost lẫn google.script.run
function submitTask(formObject) {
  try {
    // ✅ Validate dữ liệu đầu vào
    if (!formObject.member_name || !formObject.task_name || !formObject.department) {
      return { success: false, message: "Vui lòng điền đầy đủ: Thành viên, Ban phụ trách và Tên task." };
    }

    if (!formObject.status || !formObject.priority) {
      return { success: false, message: "Vui lòng chọn Trạng thái và Mức ưu tiên." };
    }

    // ✅ Sanitize & trim dữ liệu
    formObject.member_name = formObject.member_name.toString().trim();
    formObject.task_name = formObject.task_name.toString().trim();
    formObject.department = formObject.department.toString().trim();
    formObject.task_desc = (formObject.task_desc || '').toString().trim().substring(0, 500);
    formObject.status = formObject.status.toString().trim();
    formObject.priority = formObject.priority.toString().trim();
    formObject.deadline = (formObject.deadline || '').toString().trim();

    if (formObject.task_name.length < 3) {
      return { success: false, message: "Tên task phải có ít nhất 3 ký tự." };
    }

    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheets()[0]; // Truy cập trang tính đầu tiên

    // Nếu sheet còn trống hoàn toàn, ta tự động tạo tiêu đề Header cho xịn
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Thời gian báo cáo', 'Người thực hiện', 'Ban Tham Gia', 'Tên Báo Cáo / Task', 'Chi tiết công việc', 'Trạng thái', 'Mức ưu tiên', 'Deadline dự kiến']);
      sheet.getRange("A1:H1").setFontWeight("bold").setBackground("#3b82f6").setFontColor("white");
    }

    // ✅ Chống gửi trùng: Kiểm tra dòng cuối cùng
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      var lastMember = sheet.getRange(lastRow, 2).getValue();
      var lastTask = sheet.getRange(lastRow, 4).getValue();
      if (lastMember === formObject.member_name && lastTask === formObject.task_name) {
        return { success: false, message: "Task '" + formObject.task_name + "' đã được gửi trước đó bởi " + formObject.member_name + ". Vui lòng thay đổi tên task hoặc kiểm tra lại." };
      }
    }

    // Ghi một dòng mới xuống dưới cùng của Sheet
    var timestamp = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss");

    sheet.appendRow([
      timestamp,
      formObject.member_name,
      formObject.department,
      formObject.task_name,
      formObject.task_desc,
      formObject.status,
      formObject.priority,
      formObject.deadline
    ]);

    return { success: true, message: "Dữ liệu task đã được đẩy lên hệ thống thành công!" };
  } catch (error) {
    return { success: false, message: "Có sự cố khi ghi dữ liệu: " + error.toString() };
  }
}

// ✅ API trả về lịch sử 10 task gần nhất
function getHistory(e) {
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheets()[0];
    var lastRow = sheet.getLastRow();

    if (lastRow <= 1) {
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        data: [],
        total: 0
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Lấy 10 dòng gần nhất
    var startRow = Math.max(2, lastRow - 9);
    var numRows = lastRow - startRow + 1;
    var data = sheet.getRange(startRow, 1, numRows, 8).getValues();

    var entries = data.map(function(row) {
      return {
        timestamp: Utilities.formatDate(new Date(row[0]), "GMT+7", "dd/MM/yyyy HH:mm"),
        member_name: row[1],
        department: row[2],
        task_name: row[3],
        task_desc: row[4],
        status: row[5],
        priority: row[6],
        deadline: row[7] ? Utilities.formatDate(new Date(row[7]), "GMT+7", "dd/MM/yyyy") : ''
      };
    }).reverse(); // Mới nhất lên đầu

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      data: entries,
      total: lastRow - 1
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: "Không thể tải lịch sử: " + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
