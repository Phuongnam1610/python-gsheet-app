var SHEET_ID = '1dOZrzeFbca-g7YVGChWScxDy0HH2KA5QDhDX7ZP7T4g';

function doGet(e) {
  // Trả về file HTML giao diện Form.
  return HtmlService.createHtmlOutputFromFile('index')
      .setTitle('Báo cáo & Quản lý Task Nhóm')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// Đây là hàm sẽ được gọi từ Frontend bằng google.script.run
function submitTask(formObject) {
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheets()[0]; // Truy cập trang tính đầu tiên
    
    // Nếu sheet còn trống hoàn toàn, ta tự động tạo tiêu đề Header cho xịn
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Thời gian báo cáo', 'Người thực hiện', 'Ban Tham Gia', 'Tên Báo Cáo / Task', 'Chi tiết công việc', 'Trạng thái', 'Mức ưu tiên', 'Deadline dự kiến']);
      sheet.getRange("A1:H1").setFontWeight("bold").setBackground("#3b82f6").setFontColor("white");
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
