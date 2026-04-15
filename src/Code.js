var SHEET_ID = '1dOZrzeFbca-g7YVGChWScxDy0HH2KA5QDhDX7ZP7T4g';
var VERSION = '2026-04-15 v4 (Webhook-Mode)';
var DISCORD_WEBHOOK_URL = 'https://discordapp.com/api/webhooks/1493771438656716885/TPyRKMgY8IXRjTaZnf9t6QpyEUD-3mJreIubOvpL8HGDqfVyZZ9YJxGZk_QCT6P7lcuX';

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
  if (action === 'getDebugInfo') {
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      version: VERSION,
      deployedAt: Utilities.formatDate(new Date(), 'GMT+7', 'dd/MM/yyyy HH:mm:ss'),
      executingAs: Session.getEffectiveUser().getEmail(),
      scriptId: ScriptApp.getScriptId()
    })).setMimeType(ContentService.MimeType.JSON);
  }

  if (page === 'dashboard') {
    return HtmlService.createHtmlOutputFromFile('dashboard')
      .setTitle('Dashboard Thß╗æng K├¬ Task')
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
    } else if (action === "updateUserInfo") {
      result = updateUserInfo(data.username, data.discord, data.gmail);
    } else if (action === "changeUserPassword") {
      result = changeUserPassword(data.mnv, data.oldPassword, data.newPassword);
    } else if (action === "sendQuickMessage") {
      result = sendQuickMessage(data.message, data.sendDiscord, data.sendEmail, data.targetEmails, data.targetDiscords, data.subject);
    } else if (action === "getTemplates") {
      result = getEmailTemplates();
    } else if (action === "saveTemplate") {
      result = saveEmailTemplate(data.id, data.name, data.subject, data.body);
    } else if (action === "deleteTemplate") {
      result = deleteEmailTemplate(data.id);
    } else if (action === "updateTask") {
      result = updateTask(data);
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
    var sheet = ss.getSheets()[0]; // Truy cß║¡p trang t├¡nh ─æß║ºu ti├¬n

    // Nếu sheet còn trống hoàn toàn, ta tự động tạo tiêu đề Header cho xịn
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['MNV', 'Thời gian báo cáo', 'Người thực hiện', 'Ban Tham Gia', 'Tên Báo Cáo / Task', 'Chi tiết công việc', 'Trạng thái', 'Mức ưu tiên', 'Deadline dự kiến', 'Discord ID', 'Gmail', 'Đã Nhắc Deadline?', 'Mã Task']);
      sheet.getRange("A1:M1").setFontWeight("bold").setBackground("#3b82f6").setFontColor("white");
    }

    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      var lastMember = sheet.getRange(lastRow, 3).getValue();
      var lastTask = sheet.getRange(lastRow, 5).getValue();
      if (lastMember === formObject.member_name && lastTask === formObject.task_name) {
        return { success: false, message: "Task '" + formObject.task_name + "' đã được gửi trước đó bởi " + formObject.member_name + "." };
      }
    }

    // Ghi một dòng mới xuống dưới cùng của Sheet
    var timestamp = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss");

    var taskId = "T-" + new Date().getTime().toString(36).toUpperCase() + "-" + Math.floor(Math.random() * 1000);
    sheet.appendRow([
      formObject.mnv || '',
      timestamp,
      formObject.member_name,
      formObject.department,
      formObject.task_name,
      formObject.task_desc,
      formObject.status,
      formObject.priority,
      formObject.deadline,
      formObject.discord_id || '',
      formObject.gmail || '',
      '',
      taskId
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
    var data = sheet.getRange(startRow, 1, numRows, 11).getValues();

    var entries = data.map(function (row) {
      return {
        mnv: row[0] || '',
        timestamp: safeFormatDate(row[1], "dd/MM/yyyy HH:mm"),
        member_name: row[2] || '',
        department: row[3] || '',
        task_name: row[4] || '',
        task_desc: row[5] || '',
        status: row[6] || '',
        priority: row[7] || '',
        deadline: safeFormatDate(row[8], "dd/MM/yyyy"),
        discord_id: row[9] || '',
        gmail: row[10] || ''
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

// Γ£à API: Dashboard - Toàn bộ dữ liệu thống kê
function getDashboardData(e) {
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheets()[0];
    var lastRow = sheet.getLastRow();

    var usersSheet = getUsersSheet();
    var lastRowUsers = usersSheet.getLastRow();
    var allUsers = [];
    if (lastRowUsers >= 2) {
      var uRaw = usersSheet.getRange(2, 1, lastRowUsers - 1, 7).getValues();
      for (var k = 0; k < uRaw.length; k++) {
        var uname = uRaw[k][1].toString().trim();
        allUsers.push({
          mnv: uRaw[k][0].toString().trim(),
          username: uname,
          name: uname,
          discord: uRaw[k][4] ? uRaw[k][4].toString().trim() : '',
          gmail: uRaw[k][5] ? uRaw[k][5].toString().trim() : '',
          department: uRaw[k][6] ? uRaw[k][6].toString().trim() : ''
        });
      }
    }

    if (lastRow <= 1) {
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        data: {
          total: 0, byStatus: {}, byPriority: {}, byDepartment: {},
          byMember: {}, dailyCounts: {}, recentTasks: [],
          completionRate: 0, avgTasksPerDay: 0, allUsers: allUsers
        }
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Lấy 13 Cột để lấy đủ Mã Task
    var allData = sheet.getRange(2, 1, lastRow - 1, 13).getValues();
    var total = allData.length;

    var byStatus = {};
    var byPriority = {};
    var byDepartment = {};
    var byMember = {};
    var dailyCounts = {};
    var completedCount = 0;

    for (var i = 0; i < allData.length; i++) {
      var row = allData[i];
      var dateStr = safeFormatDate(row[1], "yyyy-MM-dd");
      var member = (row[2] || 'Không rõ').toString();
      var dept = (row[3] || 'Không rõ').toString();
      var status = (row[6] || 'Không rõ').toString();
      var priority = (row[7] || 'Không rõ').toString();

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

    // Lấy toàn bộ Task thay vì chỉ 20 task
    var recentStart = 0;
    var recentTasks = [];
    for (var j = allData.length - 1; j >= recentStart; j--) {
      var r = allData[j];
      var tId = (r[12] || "").toString().trim();
      recentTasks.push({
        task_id: tId !== "" ? tId : ("FALLBACK-" + (j + 2)), // Mã Fallback cho task cũ chưa có Task ID
        row_index: j + 2,
        mnv: r[0] || '',
        timestamp: safeFormatDate(r[1], "dd/MM/yyyy HH:mm"),
        member_name: r[2] || '',
        department: r[3] || '',
        task_name: r[4] || '',
        task_desc: r[5] || '',
        status: r[6] || '',
        priority: r[7] || '',
        deadline: safeFormatDate(r[8], "dd/MM/yyyy"),
        deadline_raw: safeFormatDate(r[8], "yyyy-MM-dd"),
        discord_id: r[9] || '',
        gmail: r[10] || ''
      });
    }

    // Tính completion rate
    var completionRate = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    // Tính trung bình task/hằng ngày
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
      recentTasks: recentTasks,
      allUsers: allUsers
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

// Helper: Format date an to├án
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

  return sheet;
}

// API: Đăng nhập
function loginUser(username, password) {
  try {
    var sheet = getUsersSheet();
    var lastRow = sheet.getLastRow();

    if (lastRow < 2) return { success: false, message: "Sai tài khoản, mật khẩu, Vui lòng liên hệ admin" };

    var data = sheet.getRange(2, 1, lastRow - 1, 7).getValues();

    for (var i = 0; i < data.length; i++) {
      var rowMnv = data[i][0].toString().trim();
      var rowName = data[i][1].toString().trim();
      var rowPass = data[i][2].toString().trim();

      // Đăng nhập bằng MNV hoặc Tên (Hỗ trợ linh hoạt)
      if ((rowMnv.toLowerCase() === username.toString().trim().toLowerCase() || rowName.toLowerCase() === username.toString().trim().toLowerCase()) && rowPass === password.toString().trim()) {
        return {
          success: true,
          data: {
            mnv: rowMnv,
            username: rowName,
            name: rowName,
            role: (data[i][3] || 'user').toString().trim().toLowerCase(),
            discord_id: data[i][4] || '',
            gmail: data[i][5] || '',
            department: data[i][6] || ''
          }
        };
      }
    }

    return { success: false, message: "Sai tài khoản mật khẩu" };
  } catch (error) {
    return { success: false, message: "Lỗi hệ thống: " + error.toString() };
  }
}

// API: Cập nhật thông tin Discord & Gmail
function updateUserInfo(username, discord, gmail) {
  try {
    var sheet = getUsersSheet();
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return { success: false, message: "Hệ thống trống." };

    var data = sheet.getRange(2, 1, lastRow - 1, 1).getValues(); // Cột 1 là MNV
    var names = sheet.getRange(2, 2, lastRow - 1, 1).getValues(); // Cột 2 là Tên

    for (var i = 0; i < data.length; i++) {
      var _mnv = data[i][0].toString().trim().toLowerCase();
      var _name = names[i][0].toString().trim().toLowerCase();
      var _usr = username.toString().trim().toLowerCase();
      
      if (_mnv === _usr || _name === _usr) {
        // Cập nhật cột 5 (Discord) và 6 (Gmail)
        sheet.getRange(i + 2, 5).setValue(discord.toString().trim());
        sheet.getRange(i + 2, 6).setValue(gmail.toString().trim());
        return { success: true, message: "Cập nhật thông tin thành công!" };
      }
    }
    return { success: false, message: "Không tìm thấy user." };
  } catch (error) {
    return { success: false, message: "Lỗi hệ thống: " + error.toString() };
  }
}

// ========================
// PHẦN THÔNG BÁO QUÁ HẠN (OVERDUE NOTIFICATIONS)
// ========================

var DISCORD_WEBHOOK_URL = "https://discordapp.com/api/webhooks/1493771438656716885/TPyRKMgY8IXRjTaZnf9t6QpyEUD-3mJreIubOvpL8HGDqfVyZZ9YJxGZk_QCT6P7lcuX";

// Hàm Helper: Để bạn chạy (Run) 1 lần trên giao diện Apps Script nhằm tự động hóa vĩnh viễn
function installDailyTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'checkOverdueTasks') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  
  // Ca Sáng (8h - 9h sáng)
  ScriptApp.newTrigger('checkOverdueTasks')
           .timeBased()
           .everyDays(1)
           .atHour(8)
           .create();
           
  // Ca Tối (8h - 9h tối)
  ScriptApp.newTrigger('checkOverdueTasks')
           .timeBased()
           .everyDays(1)
           .atHour(20)
           .create();
           
  console.log("Đã cài đặt thành công tự động chạy báo cáo quá hạn 2 lần/ngày: [Sáng 8h-9h] và [Tối 20h-21h]!");
}

// Hàm này sẽ được gán vào Trigger chạy mỗi ngày (Daily)
function checkOverdueTasks() {
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheets()[0];
    var lastRow = sheet.getLastRow();
    
    if (lastRow < 2) return;
    
    var data = sheet.getRange(2, 1, lastRow - 1, 11).getValues();
    var today = new Date();
    today.setHours(0,0,0,0);
    
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      var status = (row[6] || '').toString().toLowerCase();
      var deadlineStr = row[8];
      
      // Bỏ qua task đã hoàn thành hoặc không có deadline
      if (status.indexOf('hoàn thành') > -1 || !deadlineStr) continue;
      
      // Parse ngày tháng deadline
      var deadlineDate;
      if (deadlineStr instanceof Date) {
        deadlineDate = deadlineStr;
      } else {
        // Cố gắng parse chuỗi dạng dd/mm/yyyy (hoặc yyyy-mm-dd)
        var parts = deadlineStr.toString().split(/[/-]/);
        if (parts.length === 3) {
           // Giả định định dạng VN là dd/mm/yyyy
           if (parts[0].length === 4) {
             deadlineDate = new Date(parts[0], parseInt(parts[1])-1, parts[2]); // yyyy-mm-dd
           } else {
             deadlineDate = new Date(parts[2], parseInt(parts[1])-1, parts[0]); // dd-mm-yyyy
           }
        } else {
           deadlineDate = new Date(deadlineStr);
        }
      }
      
      if (isNaN(deadlineDate.getTime())) continue; // Bỏ qua nếu parse lỗi
      
      deadlineDate.setHours(0,0,0,0);
      
      var diffTime = deadlineDate.getTime() - today.getTime();
      var diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      var taskName = row[4] || 'Không rõ';
      var memberName = row[2] || 'Bạn';
      var discordId = (row[9] || '').toString().trim();
      var gmail = (row[10] || '').toString().trim();
      
      // So sánh ngày
      if (diffDays < 0) {
         console.log("Phát hiện task quá hạn! [Task: " + taskName + "] - [Member: " + memberName + "]");

         if (!gmail || gmail.indexOf('@') === -1) {
             console.log("=> Bỏ qua gửi thư: " + memberName + " không có Email hợp lệ.");
         } else {
             sendOverdueEmail(gmail, memberName, taskName, deadlineDate);
         }
         
         if (!discordId || discordId === "") {
             console.log("=> Cảnh báo: " + memberName + " không có mốc ID Discord (Snowflake), sẽ chỉ gắn tên chữ.");
         }
         
         sendOverdueDiscord(discordId, memberName, taskName, deadlineDate);
         
      } else if (diffDays === 1) {
         console.log("Phát hiện task sắp đến hạn (1 ngày)! [Task: " + taskName + "] - [Member: " + memberName + "]");
         
         if (!gmail || gmail.indexOf('@') === -1) {
             console.log("=> Bỏ qua gửi thư: " + memberName + " không có Email hợp lệ.");
         } else {
             sendUpcomingEmail(gmail, memberName, taskName, deadlineDate);
         }
         
         if (!discordId || discordId === "") {
             console.log("=> Cảnh báo: " + memberName + " không có mốc ID Discord (Snowflake), sẽ chỉ gắn tên chữ.");
         }
         
         sendUpcomingDiscord(discordId, memberName, taskName, deadlineDate);
      }
    }
  } catch(e) {
    console.error("Lỗi khi kiểm tra task quá hạn:", e);
  }
}

// =======================
// THÔNG BÁO QUÁ HẠN (OVERDUE)
// =======================

function sendOverdueEmail(email, memberName, taskName, deadlineDate) {
  if (!email || email.indexOf('@') === -1) {
    return; // Đã check ở phía trên, return luôn cho an toàn
  }
  var deadlineFormatted = Utilities.formatDate(deadlineDate, "GMT+7", "dd/MM/yyyy");
  
  var subject = "[CANH BAO] Ban co Task chua hoan thanh da qua han!";
  var body = "Chào " + memberName + ",\n\n" +
             "Hệ thống quản lý Task nhận thấy bạn có công việc đã vượt quá thời hạn dự kiến mà vẫn chưa hoàn thành.\n\n" +
             "[!] Tên công việc đang làm: " + taskName + "\n" +
             "[*] Hạn chót (Deadline): " + deadlineFormatted + "\n\n" +
             "Vui lòng ưu tiên xử lý và cập nhật tiến độ lên form báo cáo nội bộ sớm nhất có thể.\n" +
             "Cảm ơn bạn đã hợp tác!\n\n" +
             "---\nĐây là email tự động từ Hệ thống Quản Lý Tác Vụ.";
             
  try {
    GmailApp.sendEmail(email, subject, body);
    console.log("=> THÀNH CÔNG: Đã gọi hàm GmailApp.sendEmail đến " + email);
  } catch (e) {
    console.error("=> THẤT BẠI: Lỗi khi thực thi GmailApp.sendEmail đến " + email + ":", e);
  }
}

function sendOverdueDiscord(discordId, memberName, taskName, deadlineDate) {
  if (!DISCORD_WEBHOOK_URL || DISCORD_WEBHOOK_URL.trim() === "") {
    console.log("=> Lỗi: DISCORD_WEBHOOK_URL đang bị trống!");
    return;
  }
  
  var deadlineFormatted = Utilities.formatDate(deadlineDate, "GMT+7", "dd/MM/yyyy");
  
  // Tag đúng định dạng người dùng trên discord: <@id>
  var mention = (discordId && discordId !== "") ? "<@" + discordId + ">" : memberName;
  
  var message = "🚨 **CẢNH BÁO CAO ĐỘ (OVERDUE)** 🚨\n\n" +
                "👤 **Nhân sự:** " + mention + "\n" +
                "📌 **Công việc quá hạn:** `" + taskName + "`\n" +
                "⏰ **Quá hạn từ:** " + deadlineFormatted + "\n\n" +
                "Vui lòng xử lý và phản hồi lại hệ thống sớm nhất có thể!";
                
  var payload = JSON.stringify({ content: message });
  
  try {
    var response = UrlFetchApp.fetch(DISCORD_WEBHOOK_URL, { method: "POST", contentType: "application/json", payload: payload, muteHttpExceptions: true });
    console.log("=> Hồi đáp từ Discord Webhook: Code " + response.getResponseCode());
  } catch(e) {
    console.error("=> THẤT BẠI: Lỗi khi gọi UrlFetchApp tới Discord Webhook:", e);
  }
}

// =======================
// THÔNG BÁO SẮP TỚI HẠN (UPCOMING)
// =======================

function sendUpcomingEmail(email, memberName, taskName, deadlineDate) {
  if (!email || email.indexOf('@') === -1) return;
  var deadlineFormatted = Utilities.formatDate(deadlineDate, "GMT+7", "dd/MM/yyyy");
  
  var subject = "[NHAC NHO] Sap toi han chot cong viec cua ban!";
  var body = "Chào " + memberName + ",\n\n" +
             "Hệ thống quản lý Task nhắc nhở thân thiện rằng bạn có công việc sắp đến hạn vào ngày mai.\n\n" +
             "[!] Tên công việc đang làm: " + taskName + "\n" +
             "[*] Hạn chót (Deadline): " + deadlineFormatted + "\n\n" +
             "Hãy đảm bảo bạn hoàn thành hoặc cập nhật tiến độ sớm để tránh bị quá hạn nhé!\n" +
             "Chúc bạn một ngày làm việc hiệu quả.\n\n" +
             "---\nĐây là email tự động từ Hệ thống Quản Lý Tác Vụ.";
             
  try {
    GmailApp.sendEmail(email, subject, body);
  } catch (e) {
    console.error("=> THẤT BẠI (Upcoming Email):", e);
  }
}

function sendUpcomingDiscord(discordId, memberName, taskName, deadlineDate) {
  if (!DISCORD_WEBHOOK_URL || DISCORD_WEBHOOK_URL.trim() === "") return;
  
  var deadlineFormatted = Utilities.formatDate(deadlineDate, "GMT+7", "dd/MM/yyyy");
  var mention = (discordId && discordId !== "") ? "<@" + discordId + ">" : memberName;
  
  var message = "⚠️ **NHẮC NHỞ SẮP TỚI HẠN CHÓT (UPCOMING)** ⚠️\n\n" +
                "👤 **Nhân sự:** " + mention + "\n" +
                "📌 **Công việc đang làm:** `" + taskName + "`\n" +
                "⏰ **Thời hạn:** " + deadlineFormatted + " (Ngàỳ mai)\n\n" +
                "Chỉ còn 1 ngày nữa là tới deadline rồi, hãy kiểm tra và hoàn thành sớm nhé!";
                
  var payload = JSON.stringify({ content: message });
  
  try {
    UrlFetchApp.fetch(DISCORD_WEBHOOK_URL, { method: "POST", contentType: "application/json", payload: payload, muteHttpExceptions: true });
  } catch(e) {
    console.error("=> THẤT BẠI (Upcoming Discord):", e);
  }
}

// API: Gửi thông báo nhanh từ Dashboard
function sendQuickMessage(message, sendDiscord, sendEmail, targetEmails, targetDiscords, subject) {
  var debugLog = [];
  function log(msg) { console.log(msg); debugLog.push(msg); }
  try {
    log("=== BẮT ĐẦU GỬI THÔNG BÁO === Version: " + VERSION);
    log("📝 Nội dung: " + message.substring(0, 80) + (message.length > 80 ? "..." : ""));
    log("⚙️  Kênh: Discord=" + sendDiscord + " | Email=" + sendEmail);
    log("📋 Target Discord IDs nhận được: " + JSON.stringify(targetDiscords));
    log("📋 Target Emails nhận được: " + JSON.stringify(targetEmails));

    var successD = false;
    var successE = false;

    // ── DISCORD ──────────────────────────────────
    if (sendDiscord) {
      if (!DISCORD_WEBHOOK_URL || DISCORD_WEBHOOK_URL.trim() === "") {
        log("❌ [Discord] DISCORD_WEBHOOK_URL đang trống, bỏ qua.");
      } else {
        log("🎮 [Discord] Bắt đầu xử lý gửi bằng Loa Phường (Webhook)...");
        var mentions = "";
        var discordList = [];

        if (targetDiscords && targetDiscords.length > 0) {
          if (targetDiscords[0] === "all") {
            mentions = "@everyone ";
            discordList.push("@everyone");
          } else {
            for (var j = 0; j < targetDiscords.length; j++) {
              var dId = (targetDiscords[j] || "").toString().trim();
              if (dId) {
                mentions += "<@" + dId + "> ";
                discordList.push("<@" + dId + ">");
              }
            }
          }
        }

        if (discordList.length === 0) {
          log("⚠️  [Discord] Không có Discord ID nào hợp lệ để mention.");
        } else {
          log("🏷️  [Discord] Sẽ " + (mentions === "@everyone " ? "báo động toàn server" : "réo tên (" + discordList.length + " người): " + discordList.join(", ")));
        }

        var discordContent = "📢 **THÔNG BÁO TỪ BAN QUẢN LÝ:**\n" + (mentions ? mentions + "\n" : "") + message;
        var payload = JSON.stringify({ content: discordContent });
        
        try {
          var resD = UrlFetchApp.fetch(DISCORD_WEBHOOK_URL, {
            method: "POST", contentType: "application/json", payload: payload, muteHttpExceptions: true
          });
          var httpCode = resD.getResponseCode();

          if (httpCode === 200 || httpCode === 204) {
            log("✅ [Discord Webhook] Đã réo tên thành công!");
          } else {
            log("❌ [Discord Webhook] Thất bại! Lỗi từ Discord: " + resD.getContentText());
          }
        } catch (errD) {
          log("❌ [Discord Webhook] Cột sóng đứt ngang: " + errD.toString());
        }
        successD = true;
      }
    }

    // ── EMAIL ─────────────────────────────────────
    if (sendEmail) {
      log("📧 [Email] Bắt đầu xử lý...");
      var validEmails = [];

      if (targetEmails && targetEmails.length > 0 && targetEmails[0] === "all") {
        log("📧 [Email] Chế độ: GỬI TẤT CẢ — đang đọc từ sheet Users...");
        var sheet = getUsersSheet();
        var lastRow = sheet.getLastRow();
        if (lastRow >= 2) {
          var emailData = sheet.getRange(2, 6, lastRow - 1, 1).getValues();
          for (var i = 0; i < emailData.length; i++) {
            var eStr = emailData[i][0].toString().trim();
            if (eStr.indexOf('@') > -1 && validEmails.indexOf(eStr) === -1) {
              validEmails.push(eStr);
            }
          }
        }
        log("📧 [Email] Lấy được " + validEmails.length + " email từ hệ thống.");
      } else if (targetEmails && targetEmails.length > 0) {
        log("📧 [Email] Chế độ: gửi theo danh sách được chọn...");
        for (var i = 0; i < targetEmails.length; i++) {
          var eStr = targetEmails[i].toString().trim();
          if (eStr.indexOf('@') > -1 && validEmails.indexOf(eStr) === -1) {
            validEmails.push(eStr);
          } else if (eStr.indexOf('@') === -1) {
            log("⚠️  [Email] Bỏ qua (không hợp lệ): " + eStr);
          }
        }
      }

      if (validEmails.length === 0) {
        log("❌ [Email] Không có email nào hợp lệ để gửi.");
      } else {
        var primaryEmail = validEmails[0];
        var bccEmails = validEmails.slice(1);

        log("📤 [Email] To (chính): " + primaryEmail);
        if (bccEmails.length > 0) {
          log("📤 [Email] BCC (" + bccEmails.length + " địa chỉ): " + bccEmails.join(", "));
        }
        log("📤 [Email] Tổng gửi: " + validEmails.length + " địa chỉ");

        var emailOptions = {
          to: primaryEmail,
          subject: subject || "📢 THÔNG BÁO TỪ QUẢN LÝ TRẠM",
          body: message || ""
        };
        if (bccEmails.length > 0) {
          emailOptions.bcc = bccEmails.join(",");
        }

        GmailApp.sendEmail(
          primaryEmail,
          emailOptions.subject,
          emailOptions.body,
          { bcc: emailOptions.bcc || "" }
        );
        log("✅ [Email] GmailApp.sendEmail() đã được gọi thành công!");
        successE = true;
      }
    }

    // ── KẾT QUẢ ──────────────────────────────────
    if (!successD && !successE) {
      log("⚠️  Không có tin nhắn nào được gửi đi (kiểm tra cấu hình).");
      return { success: false, message: "Chưa chọn người nhận hợp lệ hoặc thiếu cấu hình.", debug_log: debugLog };
    }

    log("=== ✅ KẾT THÚC GỬI THÔNG BÁO THÀNH CÔNG ===");
    return { success: true, message: "Đã gửi thông báo thành công!", debug_log: debugLog };
  } catch (error) {
    log("=== ❌ LỖI KHI GỬI THÔNG BÁO: " + error.toString());
    log("Stack: " + error.stack);
    return { success: false, message: "Lỗi gửi: " + error.toString(), debug_log: debugLog };
  }
}

// ========================
// PHẦN QUẢN LÝ MẪU EMAIL
// ========================

function checkAndInitTemplatesSheet() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName("EmailTemplates");
  
  if (!sheet) {
    sheet = ss.insertSheet("EmailTemplates");
    var headers = ["TemplateID", "Tên Mẫu", "Tiêu Đề (Subject)", "Nội Dung (Body)"];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, 4).setFontWeight("bold").setBackground("#3b82f6").setFontColor("white");
    
    // Add default templates
    var now = new Date().getTime();
    sheet.appendRow([
      "TPL_" + now,
      "🔥 Mẫu Nhắc Nhở Họp Khẩn",
      "📢 THÔNG BÁO: Họp Khẩn Cấp Toàn Đội",
      "Chào mọi người,\n\nBan quản lý thông báo tổ chức một cuộc họp khẩn cấp.\n\n⏰ Thời gian:\n📍 Địa điểm / Link Meet:\n📌 Nội dung cuộc họp:\n\nYêu cầu mọi người sắp xếp công việc để có mặt đúng giờ.\n\n---\nTrân trọng,\nHệ thống Quản lý Task"
    ]);
    sheet.appendRow([
      "TPL_" + (now + 1),
      "⏳ Mẫu Cảnh Báo Trễ Hạn",
      "🚨 CẢNH BÁO: Rút kinh nghiệm về việc chậm trễ tiến độ",
      "Chào bạn,\n\nHệ thống ghi nhận một số đầu việc của bạn đã vượt quá thời gian cam kết nhưng chưa được hoàn thành.\n\nVui lòng báo cáo lại nguyên nhân, các khó khăn (nếu có) và thời gian dự kiến hoàn thành mới nhất để ban quản lý có thể xem xét hỗ trợ kịp thời.\n\n---\nTrân trọng,\nHệ thống Quản lý Task"
    ]);
    sheet.appendRow([
      "TPL_" + (now + 2),
      "🎉 Mẫu Thông Báo Nhanh",
      "📢 THÔNG BÁO TỪ QUẢN LÝ TRẠM",
      "Đây là thông báo từ hệ thống dành cho bạn:\n\n[Nhập nội dung vào đây...]\n\n---\nTin nhắn tự động từ Trạm Quản Lý Tác Vụ."
    ]);
  }
  return sheet;
}

function getEmailTemplates() {
  try {
    var sheet = checkAndInitTemplatesSheet();
    var lastRow = sheet.getLastRow();
    var templates = [];
    
    if (lastRow > 1) {
      var data = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
      for (var i = 0; i < data.length; i++) {
        templates.push({
          id: data[i][0] ? data[i][0].toString() : "",
          name: data[i][1] ? data[i][1].toString() : "",
          subject: data[i][2] ? data[i][2].toString() : "",
          body: data[i][3] ? data[i][3].toString() : ""
        });
      }
    }
    return { success: true, data: templates };
  } catch (err) {
    return { success: false, message: "Lỗi lấy mẫu email: " + err.toString() };
  }
}

function saveEmailTemplate(id, name, subject, body) {
  try {
    var sheet = checkAndInitTemplatesSheet();
    var lastRow = sheet.getLastRow();
    
    if (id) {
       // Update existing
       if (lastRow > 1) {
         var data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
         for (var i = 0; i < data.length; i++) {
           if (data[i][0].toString() === id) {
             sheet.getRange(i + 2, 2).setValue(name);
             sheet.getRange(i + 2, 3).setValue(subject);
             sheet.getRange(i + 2, 4).setValue(body);
             return { success: true, message: "Cập nhật mẫu thành công!", id: id };
           }
         }
       }
    }
    
    // Create new
    var newId = "TPL_" + new Date().getTime();
    sheet.appendRow([newId, name, subject, body]);
    return { success: true, message: "Tạo mẫu mới thành công!", id: newId };
    
  } catch(err) {
    return { success: false, message: "Lỗi lưu mẫu: " + err.toString() };
  }
}

function deleteEmailTemplate(id) {
  try {
    var sheet = checkAndInitTemplatesSheet();
    var lastRow = sheet.getLastRow();
    
    if (lastRow > 1) {
       var data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
       for (var i = 0; i < data.length; i++) {
         if (data[i][0].toString() === id) {
           sheet.deleteRow(i + 2);
           return { success: true, message: "Đã xóa mẫu!" };
         }
       }
    }
    return { success: false, message: "Không tìm thấy mẫu để xóa." };
  } catch(err) {
    return { success: false, message: "Lỗi xóa mẫu: " + err.toString() };
  }
}

// ==================================
// CHỈNH SỬA TASK (UPDATE)
// ==================================

function updateTask(data) {
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheets()[0];
    var lastRow = sheet.getLastRow();
    
    var reqTaskId = data.taskId;
    var fallbackRowIndex = parseInt(data.rowIndex);
    var rowIndex = -1;
    
    // Tìm kiếm vị trí thực tế của Task thông qua Col 13
    if (lastRow > 1) {
       var allTaskIds = sheet.getRange(2, 13, lastRow - 1, 1).getValues();
       for (var i = 0; i < allTaskIds.length; i++) {
          if (allTaskIds[i][0] !== "" && allTaskIds[i][0] === reqTaskId) {
             rowIndex = i + 2; 
             break;
          }
       }
    }
    
    if (rowIndex === -1) {
       // Nếu không tìm thấy, dùng Fallback (áp dụng cho các dòng cũ)
       if (reqTaskId && reqTaskId.indexOf('FALLBACK-') === 0 && fallbackRowIndex > 1) {
          rowIndex = fallbackRowIndex;
       } else {
          return { success: false, message: "❌ Lỗi bảo vệ: Không thể tìm thấy Task trong cơ sở dữ liệu (Có thể task đã bị Cấp trên xoá mất)." };
       }
    }

    if (rowIndex < 2 || rowIndex > lastRow) {
      return { success: false, message: "Bản ghi không hợp lệ." };
    }
    
    // Bảo mật: Kiểm tra MNV người request có khớp với người sở hữu không (hoặc là admin/leader)
    var ownerMnv = sheet.getRange(rowIndex, 1).getValue().toString().trim();
    if (data.requestUserRole !== 'admin' && data.requestUserRole !== 'leader' && data.requestUserMnv !== ownerMnv) {
      return { success: false, message: "Bạn không có quyền sửa task của người khác! (Thiếu quyền)." };
    }
    
    // Cập nhật các cột (Column 6: desc, Col 7: status, Col 8: priority, Col 9: deadline)
    if(data.task_desc !== undefined) sheet.getRange(rowIndex, 6).setValue(data.task_desc);
    if(data.status !== undefined) sheet.getRange(rowIndex, 7).setValue(data.status);
    if(data.priority !== undefined) sheet.getRange(rowIndex, 8).setValue(data.priority);
    if(data.deadline !== undefined) sheet.getRange(rowIndex, 9).setValue(data.deadline);
    
    return { success: true, message: "Cập nhật công việc thành công!" };
  } catch(e) {
    return { success: false, message: "Lỗi cập nhật: " + e.toString() };
  }
}



// ==================================
// ĐỔI MẬT KHẨU BẮT BUỘC
// ==================================
function changeUserPassword(mnv, oldPass, newPass) {
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName("Users");
    if (!sheet) return { success: false, message: "Không tìm thấy CSDL Users." };
    
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
       var rowMnv = data[i][0] ? data[i][0].toString().trim() : "";
       if (rowMnv === mnv) {
          var rowPass = data[i][2] ? data[i][2].toString().trim() : "";
          if (rowPass === oldPass) {
             sheet.getRange(i + 1, 3).setValue(newPass);
             return { success: true, message: "Đổi mật khẩu thành công!" };
          } else {
             return { success: false, message: "Mật khẩu cũ xác thực không đúng!" };
          }
       }
    }
    return { success: false, message: "Không tìm thấy User trong Database." };
  } catch(e) {
    return { success: false, message: "Lỗi hệ thống: " + e.toString() };
  }
}
