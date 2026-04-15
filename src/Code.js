var SHEET_ID = '1dOZrzeFbca-g7YVGChWScxDy0HH2KA5QDhDX7ZP7T4g';
var VERSION = '2026-04-15 v3 (debug-enabled)';

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
    } else if (action === "sendQuickMessage") {
      result = sendQuickMessage(data.message, data.sendDiscord, data.sendEmail);
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
      sheet.appendRow(['MNV', 'Thời gian báo cáo', 'Người thực hiện', 'Ban Tham Gia', 'Tên Báo Cáo / Task', 'Chi tiết công việc', 'Trạng thái', 'Mức ưu tiên', 'Deadline dự kiến', 'Discord ID', 'Gmail']);
      sheet.getRange("A1:K1").setFontWeight("bold").setBackground("#3b82f6").setFontColor("white");
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
      formObject.gmail || ''
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
      var uRaw = usersSheet.getRange(2, 1, lastRowUsers - 1, 6).getValues();
      for (var k = 0; k < uRaw.length; k++) {
        var uname = uRaw[k][3].toString().trim();
        allUsers.push({
          mnv: uRaw[k][0].toString(),
          username: uRaw[k][1].toString(),
          name: uname ? uname : uRaw[k][1].toString(),
          discord: uRaw[k][4].toString(),
          gmail: uRaw[k][5].toString()
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

    var allData = sheet.getRange(2, 1, lastRow - 1, 11).getValues();
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

    // Recent 20 tasks (mới nhất trước)
    var recentStart = Math.max(0, allData.length - 20);
    var recentTasks = [];
    for (var j = allData.length - 1; j >= recentStart; j--) {
      var r = allData[j];
      recentTasks.push({
        mnv: r[0] || '',
        timestamp: safeFormatDate(r[1], "dd/MM/yyyy HH:mm"),
        member_name: r[2] || '',
        department: r[3] || '',
        task_name: r[4] || '',
        task_desc: r[5] || '',
        status: r[6] || '',
        priority: r[7] || '',
        deadline: safeFormatDate(r[8], "dd/MM/yyyy"),
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

    var data = sheet.getRange(2, 1, lastRow - 1, 6).getValues();

    for (var i = 0; i < data.length; i++) {
      var rowMnv = data[i][0].toString().trim();
      var rowUser = data[i][1].toString().trim();
      var rowPass = data[i][2].toString().trim();

      if (rowUser.toLowerCase() === username.toString().trim().toLowerCase() && rowPass === password.toString().trim()) {
        return {
          success: true,
          data: {
            mnv: rowMnv,
            username: rowUser,
            name: data[i][3] || '',
            discord_id: data[i][4] || '',
            gmail: data[i][5] || ''
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

    var data = sheet.getRange(2, 2, lastRow - 1, 1).getValues(); // Cột 2 là Username

    for (var i = 0; i < data.length; i++) {
      if (data[i][0].toString().trim().toLowerCase() === username.toString().trim().toLowerCase()) {
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
      
      // So sánh ngày
      if (deadlineDate < today) {
         var taskName = row[4] || 'Không rõ';
         var memberName = row[2] || 'Bạn';
         var discordId = (row[9] || '').toString().trim();
         var gmail = (row[10] || '').toString().trim();
         
         console.log("Phát hiện task quá hạn! [Task: " + taskName + "] - [Member: " + memberName + "] - [Email: " + gmail + "] - [Discord: " + discordId + "]");

         // Gửi Email
         sendOverdueEmail(gmail, memberName, taskName, deadlineDate);
         
         // Gửi Discord
         sendOverdueDiscord(discordId, memberName, taskName, deadlineDate);
      }
    }
  } catch(e) {
    console.error("Lỗi khi kiểm tra task quá hạn:", e);
  }
}

function sendOverdueEmail(email, memberName, taskName, deadlineDate) {
  console.log("Đang xử lý gửi Email cho: " + email);
  if (!email || email.indexOf('@') === -1) {
    console.log("=> Lỗi: Định dạng email không hợp lệ hoặc trống (" + email + ")");
    return;
  }
  var deadlineFormatted = Utilities.formatDate(deadlineDate, "GMT+7", "dd/MM/yyyy");
  
  var subject = "🚨 CẢNH BÁO: Bạn có Task chưa hoàn thành đã quá hạn!";
  var body = "Chào " + memberName + ",\n\n" +
             "Hệ thống quản lý Task nhận thấy bạn có công việc đã vượt quá thời hạn dự kiến mà vẫn chưa hoàn thành.\n\n" +
             "📌 Tên công việc đang làm: " + taskName + "\n" +
             "⏰ Hạn chót (Deadline): " + deadlineFormatted + "\n\n" +
             "Vui lòng ưu tiên xử lý và cập nhật tiến độ lên form báo cáo nội bộ sớm nhất có thể.\n" +
             "Cảm ơn bạn đã hợp tác!\n\n" +
             "---\nĐây là email tự động từ Hệ thống Quản Lý Tác Vụ.";
             
  try {
    MailApp.sendEmail({
      to: email,
      subject: subject,
      body: body
    });
    console.log("=> THÀNH CÔNG: Đã gọi hàm MailApp.sendEmail đến " + email);
  } catch (e) {
    console.error("=> THẤT BẠI: Lỗi khi thực thi MailApp.sendEmail đến " + email + ":", e);
  }
}

function sendOverdueDiscord(discordId, memberName, taskName, deadlineDate) {
  console.log("Đang xử lý gửi Discord cho ID: " + discordId + " qua Webhook: " + DISCORD_WEBHOOK_URL);
  if (!DISCORD_WEBHOOK_URL || DISCORD_WEBHOOK_URL.trim() === "") {
    console.log("=> Lỗi: DISCORD_WEBHOOK_URL đang bị trống!");
    return;
  }
  
  var deadlineFormatted = Utilities.formatDate(deadlineDate, "GMT+7", "dd/MM/yyyy");
  
  // Tag đúng định dạng người dùng trên discord: <@id>
  var mention = (discordId && discordId !== "") ? "<@" + discordId + ">" : memberName;
  
  var message = "🚨 **CẢNH BÁO QUÁ HẠN TASK (OVERDUE)** 🚨\n\n" +
                "👤 **Nhân sự:** " + mention + "\n" +
                "📌 **Công việc đang làm:** `" + taskName + "`\n" +
                "⏰ **Quá hạn từ:** " + deadlineFormatted + "\n\n" +
                "Vui lòng xử lý và phản hồi lại hệ thống sớm nhất có thể!";
                
  var payload = JSON.stringify({
    content: message
  });
  
  var params = {
    method: "POST",
    contentType: "application/json",
    payload: payload,
    muteHttpExceptions: true
  };
  
  try {
    var response = UrlFetchApp.fetch(DISCORD_WEBHOOK_URL, params);
    console.log("=> Hồi đáp từ Discord: Code " + response.getResponseCode() + ", Body: " + response.getContentText());
  } catch(e) {
    console.error("=> THẤT BẠI: Lỗi khi gọi UrlFetchApp tới Discord Webhook:", e);
  }
}

// API: Gửi thông báo nhanh từ Dashboard
function sendQuickMessage(message, sendDiscord, sendEmail, targetEmails, targetDiscords) {
  var debugLog = []; // Log trả về thẳng frontend
  function log(msg) { console.log(msg); debugLog.push(msg); }
  try {
    log("=== BẮT ĐẦU GỬI THÔNG BÁO === Version: " + VERSION);
    console.log("Nội dung tin nhắn: ", message);
    console.log("Tùy chọn: Gửi Discord(" + sendDiscord + "), Gửi Email(" + sendEmail + ")");
    console.log("Target Discord IDs: ", targetDiscords);
    console.log("Target Emails: ", targetEmails);

    var successD = false;
    var successE = false;

    // Gửi Discord Broadcast
    if (sendDiscord && DISCORD_WEBHOOK_URL !== "") {
      console.log("-> Đang xử lý gửi Discord. Webhook URL có tồn tại.");
      var mentions = "";
      if (targetDiscords && targetDiscords.length > 0) {
         for (var j = 0; j < targetDiscords.length; j++) {
           if (targetDiscords[j]) {
             if (targetDiscords[j] === "all") { mentions = "@everyone "; break; }
             else mentions += "<@" + targetDiscords[j] + "> ";
           }
         }
      }
      console.log("Danh sách mention Discord: ", mentions);
      var payload = JSON.stringify({ content: "📢 **THÔNG BÁO TỪ BAN QUẢN LÝ:**\n" + mentions + "\n" + message });
      var resD = UrlFetchApp.fetch(DISCORD_WEBHOOK_URL, {
        method: "POST", contentType: "application/json", payload: payload, muteHttpExceptions: true
      });
      console.log("=> Kết quả Discord (HTTP Code): ", resD.getResponseCode(), resD.getContentText());
      successD = true;
    }

    // Gửi Email Broadcast (BCC)
    if (sendEmail) {
      console.log("-> Đang xử lý gửi Email...");
      var validEmails = [];
      if (targetEmails && targetEmails.length > 0 && targetEmails[0] === "all") {
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
      } else if (targetEmails && targetEmails.length > 0) {
        for(var i=0; i<targetEmails.length; i++) {
           var eStr = targetEmails[i].toString().trim();
           if (eStr.indexOf('@') > -1 && validEmails.indexOf(eStr) === -1) {
              validEmails.push(eStr);
           }
        }
      }

      console.log("Danh sách Email hợp lệ để gửi BCC: ", validEmails);
      if (validEmails.length > 0) {
        var bccList = validEmails.join(",");
        MailApp.sendEmail({
          to: "noreply@system.com",
          bcc: bccList,
          subject: "📢 THÔNG BÁO TỪ QUẢN LÝ TRẠM",
          body: "Đây là thông báo từ hệ thống dành cho bạn:\n\n" + message + "\n\n---\nTin nhắn tự động từ Trạm Quản Lý Tác Vụ."
        });
        console.log("=> Đã gọi lệnh MailApp.sendEmail thành công.");
        successE = true;
      } else {
        console.log("=> Không có email nào hợp lệ để gửi.");
      }
    }

    if (!successD && !successE) {
      log("=> Cảnh báo: Không có tin nhắn nào được gửi đi.");
      return { success: false, message: "Chưa chọn người nhận hợp lệ hoặc thiếu cấu hình.", debug_log: debugLog };
    }

    log("=== KẾT THÚC GỬI THÔNG BÁO OK ===");
    return { success: true, message: "Đã thiết lập gửi thông báo thành công!", debug_log: debugLog };
  } catch (error) {
    log("=== LỖI KHI GỬI THÔNG BÁO: " + error.toString());
    log("Stack: " + error.stack);
    return { success: false, message: "Lỗi gửi: " + error.toString(), debug_log: debugLog };
  }
}
