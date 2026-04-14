var SHEET_ID = '1dOZrzeFbca-g7YVGChWScxDy0HH2KA5QDhDX7ZP7T4g';

function doGet(e) {
  var page = e.parameter.page;
  var action = e.parameter.action;

  // External API calls (Github Pages)
  if (action === 'getDashboardData') {
    return getDashboardData(e);
  }
  if (action === 'getHistory') {
    return getHistory(e);
  }
  
  if (page === 'dashboard') {
    return HtmlService.createHtmlOutputFromFile('dashboard')
      .setTitle('Dashboard Thống Kê Task')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  // Mặc định trả về trang báo cáo (Form) cho web app nội bộ
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Báo cáo & Quản lý Task Nhóm')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// Hàm hỗ trợ nhận request từ các domain khác (ví dụ: host trên Github Pages)
function doPost(e) {
  try {
    var params = JSON.parse(e.postData.contents);
    var action = params.action;
    var data = params.data;
    var result = {};

    if (action === "submitTask") {
      result = submitTask(data);
    } else if (action === "loginUser") {
      result = loginUser(data.username, data.password);
    } else if (action === "updateContactId") {
      result = updateContactId(data.username, data.contactId);
    } else {
      result = { success: false, message: "Action không hợp lệ" };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Lỗi doPost: " + error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getScriptUrl() {
  return ScriptApp.getService().getUrl();
}

// Đây là hàm sẽ được gọi từ Frontend bằng google.script.run
function submitTask(formObject) {
  try {
    formObject.member_name = (formObject.member_name || '').toString().trim();
    formObject.task_name = (formObject.task_name || '').toString().trim();
    formObject.department = (formObject.department || '').toString().trim();
    formObject.task_desc = (formObject.task_desc || '').toString().trim().substring(0, 500);
    formObject.status = (formObject.status || '').toString().trim();
    formObject.priority = (formObject.priority || '').toString().trim();
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

    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      var lastMember = sheet.getRange(lastRow, 2).getValue();
      var lastTask = sheet.getRange(lastRow, 4).getValue();
      if (lastMember === formObject.member_name && lastTask === formObject.task_name) {
        return { success: false, message: "Task '" + formObject.task_name + "' đã được gửi trước đó bởi " + formObject.member_name + "." };
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

// API: Lịch sử 10 task gần nhất (cho form page)
function getHistory(e) {
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheets()[0];
    var lastRow = sheet.getLastRow();

    if (lastRow <= 1) {
      return ContentService.createTextOutput(JSON.stringify({
        success: true, data: [], total: 0
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var startRow = Math.max(2, lastRow - 9);
    var numRows = lastRow - startRow + 1;
    var data = sheet.getRange(startRow, 1, numRows, 8).getValues();

    var entries = data.map(function (row) {
      return {
        timestamp: safeFormatDate(row[0], "dd/MM/yyyy HH:mm"),
        member_name: row[1] || '',
        department: row[2] || '',
        task_name: row[3] || '',
        task_desc: row[4] || '',
        status: row[5] || '',
        priority: row[6] || '',
        deadline: safeFormatDate(row[7], "dd/MM/yyyy")
      };
    }).reverse();

    return ContentService.createTextOutput(JSON.stringify({
      success: true, data: entries, total: lastRow - 1
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false, message: "Lỗi: " + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ✅ API: Dashboard - Toàn bộ dữ liệu thống kê
function getDashboardData(e) {
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheets()[0];
    var lastRow = sheet.getLastRow();

    if (lastRow <= 1) {
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        data: {
          total: 0, byStatus: {}, byPriority: {}, byDepartment: {},
          byMember: {}, dailyCounts: {}, recentTasks: [],
          completionRate: 0, avgTasksPerDay: 0
        }
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var allData = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
    var total = allData.length;

    var byStatus = {};
    var byPriority = {};
    var byDepartment = {};
    var byMember = {};
    var dailyCounts = {};
    var completedCount = 0;

    for (var i = 0; i < allData.length; i++) {
      var row = allData[i];
      var dateStr = safeFormatDate(row[0], "yyyy-MM-dd");
      var member = (row[1] || 'Không rõ').toString();
      var dept = (row[2] || 'Không rõ').toString();
      var status = (row[5] || 'Không rõ').toString();
      var priority = (row[6] || 'Không rõ').toString();

      // Đếm theo status
      byStatus[status] = (byStatus[status] || 0) + 1;
      if (status.indexOf('hoàn thành') > -1 || status.indexOf('Hoàn thành') > -1) {
        completedCount++;
      }

      // Đếm theo priority
      byPriority[priority] = (byPriority[priority] || 0) + 1;

      // Đếm theo department
      byDepartment[dept] = (byDepartment[dept] || 0) + 1;

      // Đếm theo member
      byMember[member] = (byMember[member] || 0) + 1;

      // Đếm theo ngày
      if (dateStr) {
        dailyCounts[dateStr] = (dailyCounts[dateStr] || 0) + 1;
      }
    }

    // Recent 20 tasks (mới nhất trước)
    var recentStart = Math.max(0, allData.length - 20);
    var recentTasks = [];
    for (var j = allData.length - 1; j >= recentStart; j--) {
      var r = allData[j];
      recentTasks.push({
        timestamp: safeFormatDate(r[0], "dd/MM/yyyy HH:mm"),
        member_name: r[1] || '',
        department: r[2] || '',
        task_name: r[3] || '',
        task_desc: r[4] || '',
        status: r[5] || '',
        priority: r[6] || '',
        deadline: safeFormatDate(r[7], "dd/MM/yyyy")
      });
    }

    // Tính completion rate
    var completionRate = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    // Tính trung bình task/ngày
    var dayKeys = Object.keys(dailyCounts);
    var avgTasksPerDay = dayKeys.length > 0 ? Math.round((total / dayKeys.length) * 10) / 10 : 0;

    var result = {
      total: total,
      completedCount: completedCount,
      completionRate: completionRate,
      avgTasksPerDay: avgTasksPerDay,
      activeDays: dayKeys.length,
      byStatus: byStatus,
      byPriority: byPriority,
      byDepartment: byDepartment,
      byMember: byMember,
      dailyCounts: dailyCounts,
      recentTasks: recentTasks
    };

    return ContentService.createTextOutput(JSON.stringify({
      success: true, data: result
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false, message: "Lỗi dashboard: " + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Helper: Format date an toàn
function safeFormatDate(val, format) {
  try {
    if (!val) return '';
    var d = new Date(val);
    if (isNaN(d.getTime())) return val.toString();
    return Utilities.formatDate(d, "GMT+7", format);
  } catch (e) {
    return val ? val.toString() : '';
  }
}

// ========================
// PHẦN QUẢN LÝ NGƯỜI DÙNG (AUTH & MAPPING)
// ========================

// Hàm kiểm tra/tạo sheet Users
function getUsersSheet() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName("Users");
  if (!sheet) {
    sheet = ss.insertSheet("Users");
    sheet.appendRow(["Tên đăng nhập", "Mật khẩu", "Họ và Tên", "Contact ID (Telegram/Discord)"]);
    sheet.getRange("A1:D1").setFontWeight("bold").setBackground("#4b5563").setFontColor("white");
    
    // Thêm dữ liệu mẫu
    sheet.appendRow(["admin", "123456", "Nguyễn Văn Admin", ""]);
    sheet.appendRow(["nhanviena", "123456", "Nguyễn Văn A", ""]);
  }
  return sheet;
}

// API: Đăng nhập
function loginUser(username, password) {
  try {
    var sheet = getUsersSheet();
    var lastRow = sheet.getLastRow();
    
    if (lastRow < 2) return { success: false, message: "Hệ thống chưa có tài khoản nào. Vui lòng liên hệ Admin." };
    
    var data = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
    
    for (var i = 0; i < data.length; i++) {
      var rowUser = data[i][0].toString().trim();
      var rowPass = data[i][1].toString().trim();
      
      if (rowUser.toLowerCase() === username.toString().trim().toLowerCase() && rowPass === password.toString().trim()) {
        return {
          success: true,
          data: {
            username: rowUser,
            name: data[i][2] || '',
            contact_id: data[i][3] || ''
          }
        };
      }
    }
    
    return { success: false, message: "Tên đăng nhập hoặc mật khẩu không đúng!" };
  } catch (error) {
    return { success: false, message: "Lỗi hệ thống: " + error.toString() };
  }
}

// API: Cập nhật mã Telegram/Discord
function updateContactId(username, contactId) {
  try {
    var sheet = getUsersSheet();
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return { success: false, message: "Hệ thống trống." };
    
    var data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    
    for (var i = 0; i < data.length; i++) {
      if (data[i][0].toString().trim().toLowerCase() === username.toString().trim().toLowerCase()) {
        // Cập nhật cột 4 (Contact ID)
        sheet.getRange(i + 2, 4).setValue(contactId.toString().trim());
        return { success: true, message: "Cập nhật Contact ID thành công!" };
      }
    }
    return { success: false, message: "Không tìm thấy user." };
  } catch (error) {
    return { success: false, message: "Lỗi hệ thống: " + error.toString() };
  }
}
