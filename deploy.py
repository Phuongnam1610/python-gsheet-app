import subprocess
import sys

DEPLOY_ID = "AKfycbz82I5oG4o1N25QX6hpIvLXVqMK3xVypYLnynWaba_58eB3OgdMywoeBk8aGaIWboBP_Q"

def check_tool(name, cmd):
    try:
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True, check=True)
        return True
    except:
        print(f"[MISSING] Chua cai {name}.")
        return False

def run(desc, cmd):
    print(f"\n[RUN] {desc}...")
    result = subprocess.run(cmd, shell=True, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    output = (result.stdout + result.stderr).strip()
    if output:
        print(output)
    if result.returncode != 0:
        print(f"[ERROR] Loi o buoc: {desc}")
        return False
    print(f"[SUCCESS] {desc} - Thanh cong!")
    return True

def main():
    print("=" * 50)
    print(">>> DEPLOY TOAN BO - Apps Script + GitHub Pages")
    print("=" * 50)

    # Kiểm tra tools
    if not check_tool("clasp", ["clasp", "-v"]):
        print("-> Cai dat: npm install -g @google/clasp")
        sys.exit(1)
    if not check_tool("git", ["git", "--version"]):
        sys.exit(1)

    # Bước 1: Push code lên Apps Script
    if not run("Push code len Google Apps Script", "clasp push --force"):
        sys.exit(1)

    # Bước 2: Deploy Apps Script (giu nguyen URL)
    deploy_cmd = f'clasp deploy -i {DEPLOY_ID} -d "Auto deploy"'
    if not run("Deploy Apps Script (cung URL cu)", deploy_cmd):
        sys.exit(1)

    # Bước 3: Git commit & push  
    run("Git add", "git add .")
    run("Git commit", 'git commit -m "Update: dashboard + improvements" --allow-empty')
    if not run("Push len GitHub Pages", "git push"):
        print("[WARNING] Git push that bai. Kiem tra lai remote va credentials.")
        sys.exit(1)

    print("\n" + "=" * 50)
    print(">>> DEPLOY HOAN TAT!")
    print("=" * 50)
    print("Link Apps Script: URL giu nguyen, chi can refresh.")
    print("Link GitHub Pages: Cho 1-2 phut roi refresh.")
    print("=" * 50)

if __name__ == "__main__":
    main()
