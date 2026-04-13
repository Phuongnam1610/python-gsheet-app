import subprocess
import sys
import os

def check_clasp_installed():
    try:
        # Kiểm tra xem máy đã cài clasp chưa
        subprocess.run(["clasp", "-v"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False

def push_to_appscript():
    print("🚀 Bắt đầu quá trình đẩy mã nguồn lên Google Apps Script...")
    
    if not check_clasp_installed():
        print("❌ Lỗi: Bạn chưa cài đặt clasp. Vui lòng cài đặt Node.js và chạy lệnh: npm install -g @google/clasp")
        sys.exit(1)
        
    try:
        # Chạy lệnh clasp push
        # Lưu ý: Yêu cầu bạn đã chạy `clasp login` trước đó
        result = subprocess.run(["clasp", "push", "--force"], 
                                shell=True, 
                                stdout=subprocess.PIPE, 
                                stderr=subprocess.PIPE,
                                text=True)
                                
        if result.returncode == 0:
            print("✅ Đẩy mã nguồn thành công!")
            print(result.stdout)
        else:
            print("❌ Đã xảy ra lỗi khi đẩy code. Vui lòng đảm bảo bạn đã chạy `clasp login`.")
            print("Chi tiết lỗi:")
            print(result.stderr)
            
    except Exception as e:
        print(f"❌ Xảy ra lỗi bất ngờ: {e}")

if __name__ == "__main__":
    push_to_appscript()
