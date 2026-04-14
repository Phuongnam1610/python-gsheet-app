import subprocess
import sys
import os

DEPLOYMENT_ID_FILE = ".clasp_deployment_id"

def check_clasp_installed():
    try:
        subprocess.run(["clasp", "-v"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False

def get_or_ask_deployment_id():
    # Kiểm tra file lưu ID
    if os.path.exists(DEPLOYMENT_ID_FILE):
        with open(DEPLOYMENT_ID_FILE, "r") as f:
            deployment_id = f.read().strip()
            if deployment_id:
                return deployment_id

    print("\n[!] Hệ thống cần mã DEPLOYMENT ID của Apps Script để giữ cho Link Web không bao giờ bị đổi.")
    print("Cách lấy:")
    print("1. Vào giao diện trình duyệt Google Apps Script > Bấm 'Deploy' > 'Manage deployments'.")
    print("2. Copy chuỗi mã ở dòng 'Deployment ID' (ví dụ: AKfycbwABC...).")
    deployment_id = input("\nNhập Deployment ID của bạn vào đây: ").strip()
    
    if deployment_id:
        with open(DEPLOYMENT_ID_FILE, "w") as f:
            f.write(deployment_id)
        print("[+] Đã lưu cấu hình Deployment ID.\n")
    return deployment_id

def push_and_deploy():
    print("[PUSH] Bắt đầu đẩy mã nguồn lên Google Apps Script...")
    
    if not check_clasp_installed():
        print("[ERROR] Bạn chưa cài đặt clasp. Chạy lệnh: npm install -g @google/clasp")
        sys.exit(1)
        
    deployment_id = get_or_ask_deployment_id()
    if not deployment_id:
        print("[ERROR] Cần có Deployment ID để đảm bảo URL cố định. Hủy lệnh.")
        sys.exit(1)
        
    try:
        # Bước 1: Đẩy code mới lên project
        print(">> Đang đẩy Code...")
        push_res = subprocess.run(["clasp", "push", "--force"], shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if push_res.returncode != 0:
            print("[ERROR] Lỗi khi push code:")
            print(push_res.stderr)
            return

        # Bước 2: Deploy đè version mới lên link cũ (Giữ nguyên URL)
        print(">> Đang đóng gói phiên bản mới lên Link cũ (Tránh đổi URL)...")
        deploy_cmd = f'clasp deploy -i "{deployment_id}" -d "Auto Update via deploy.py"'
        deploy_res = subprocess.run(deploy_cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        
        if deploy_res.returncode == 0:
            print("[SUCCESS] Hoàn tất! Code mới đã lêm sóng trên đường Link cũ.")
            print(deploy_res.stdout)
        else:
            print("[WARNING] Đẩy code thành công nhưng lỗi lúc chốt phiên bản. Link cũ có thể chưa hiện nút chức năng.")
            print(deploy_res.stderr)
            
    except Exception as e:
        print(f"[ERROR] Xảy ra lỗi bất ngờ: {e}")

if __name__ == "__main__":
    push_and_deploy()
