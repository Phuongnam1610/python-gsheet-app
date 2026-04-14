import os

filepath = r"d:\python-gsheet-app\src\Code.js"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# mapping for common corrupted characters:
mapping = {
    "Thß╗¥i gian b├ío c├ío": "Thời gian báo cáo",
    "Ng╞░ß╗¥i thß╗▒c hiß╗çn": "Người thực hiện",
    "T├¬n B├ío C├ío / Task": "Tên Báo Cáo / Task",
    "Chi tiß║┐t c├┤ng viß╗çc": "Chi tiết công việc",
    "Trß║íng th├íi": "Trạng thái",
    "Mß╗⌐c ╞░u ti├¬n": "Mức ưu tiên",
    "Deadline dß╗▒ kiß║┐n": "Deadline dự kiến",
    "Lß╗ùi hß╗ç thß╗æng:": "Lỗi hệ thống:",
    "Cß║¡p nhß║¡t th├ánh c├┤ng!": "Cập nhật thành công!",
    "Kh├┤ng t├¼m thß║Ñy user.": "Không tìm thấy user.",
    "Hß╗ç thß╗æng trß╗æng.": "Hệ thống trống.",
    "Action kh├┤ng hß╗úp lß╗ç": "Action không hợp lệ",
    "Mß║╖c ─æß╗ïnh trß║ú vß╗ü trang b├ío c├ío (Form) cho web app nß╗Öi bß╗Ö": "Mặc định trả về trang báo cáo (Form) cho web app nội bộ",
    "B├ío c├ío & Quß║ún l├╜ Task Nh├│m": "Báo cáo & Quản lý Task Nhóm",
    "H├ám hß╗ù trß╗ú nhß║¡n request tß╗½ c├íc domain kh├íc": "Hàm hỗ trợ nhận request từ các domain khác",
    "v├¡ dß╗Ñ:": "ví dụ:",
    "host tr├¬n": "host trên",
    "Lß╗ùi doPost:": "Lỗi doPost:",
    "─É├óy l├á h├ám sß║╜ ─æ╞░ß╗úc gß╗ìi tß╗½ Frontend bß║▒ng": "Đây là hàm sẽ được gọi từ Frontend bằng",
    "T├¬n task phß║úi c├│ ├¡t nhß║Ñt 3 k├╜ tß╗▒.": "Tên task phải có ít nhất 3 ký tự.",
    "Nß║┐u sheet c├▓n trß╗æng ho├án to├án, ta tß╗▒ ─æß╗Öng tß║ío ti├¬u ─æß╗ü Header cho xß╗ïn": "Nếu sheet còn trống hoàn toàn, ta tự động tạo tiêu đề Header cho xịn",
    "─æ├ú ─æ╞░ß╗úc gß╗¡i tr╞░ß╗¢c ─æ├│ bß╗ƒi": "đã được gửi trước đó bởi",
    "Ghi mß╗Öt d├▓ng mß╗¢i xuß╗æng d╞░ß╗¢i c├╣ng cß╗ºa Sheet": "Ghi một dòng mới xuống dưới cùng của Sheet",
    "Dß╗» liß╗çu task ─æ├ú ─æ╞░ß╗úc ─æß║⌐y l├¬n hß╗ç thß╗æng th├ánh c├┤ng!": "Dữ liệu task đã được đẩy lên hệ thống thành công!",
    "C├│ sß╗▒ cß╗æ khi ghi dß╗» liß╗çu:": "Có sự cố khi ghi dữ liệu:",
    "Lß╗ïch sß╗¡ 10 task gß║ºn nhß║Ñt (cho form page)": "Lịch sử 10 task gần nhất (cho form page)",
    "Lß╗ùi:": "Lỗi:",
    "To├án bß╗Ö dß╗» liß╗çu thß╗æng k├¬": "Toàn bộ dữ liệu thống kê",
    "Kh├┤ng r├╡": "Không rõ",
    "─Éß║┐m theo status": "Đếm theo status",
    "ho├án th├ánh": "hoàn thành",
    "Ho├án th├ánh": "Hoàn thành",
    "─Éß║┐m theo priority": "Đếm theo priority",
    "─Éß║┐m theo department": "Đếm theo department",
    "─Éß║┐m theo member": "Đếm theo member",
    "─Éß║┐m theo ng├áy": "Đếm theo ngày",
    "mß╗¢i nhß║Ñt tr╞░ß╗¢c": "mới nhất trước",
    "T├¡nh completion rate": "Tính completion rate",
    "T├¡nh trung b├¼nh task/ng├áy": "Tính trung bình task/ngày",
    "Lß╗ùi dashboard:": "Lỗi dashboard:",
    "PHß║ªN QUß║óN L├¥ NG╞»ß╗£I D├ÖNG (AUTH & MAPPING)": "PHẦN QUẢN LÝ NGƯỜI DÙNG (AUTH & MAPPING)",
    "H├ám kiß╗âm tra/tß║ío sheet Users": "Hàm kiểm tra/tạo sheet Users",
    "─É─âng nhß║¡p": "Đăng nhập",
    "Cß║¡p nhß║¡t m├ú Telegram/Discord": "Cập nhật mã Telegram/Discord",
    "Dashboard Thß╗æng K├¬ Task": "Dashboard Thống Kê Task",
    "Cập nhật thông tin Discord & Gmail": "Cập nhật thông tin Discord & Gmail"
}

for k, v in mapping.items():
    content = content.replace(k, v)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
print("Done!")
