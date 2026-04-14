import subprocess
import sys
import os
import re

DEPLOY_ID = "AKfycbz82I5oG4o1N25QX6hpIvLXVqMK3xVypYLnynWaba_58eB3OgdMywoeBk8aGaIWboBP_Q"

def check_tool(name, cmd):
    try:
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True, check=True)
        return True
    except:
        print(f"[MISSING] Missing {name}.")
        return False

def run(desc, cmd):
    print(f"\n[RUN] {desc}...")
    result = subprocess.run(cmd, shell=True, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    output = (result.stdout + result.stderr).strip()
    if output:
        print(output)
    if result.returncode != 0:
        print(f"[ERROR] Error at step: {desc}")
        return False
    print(f"[SUCCESS] {desc} - Success!")
    return True

def build_docs():
    print(f"\n[RUN] Building docs for GitHub Pages...")
    src_dir = "src"
    docs_dir = "docs"
    
    if not os.path.exists(docs_dir):
        os.makedirs(docs_dir)
        
    script_url_raw = f'https://script.google.com/macros/s/{DEPLOY_ID}/exec'
    
    for filename in os.listdir(src_dir):
        if filename.endswith(".html"):
            src_path = os.path.join(src_dir, filename)
            docs_path = os.path.join(docs_dir, filename)
            
            with open(src_path, "r", encoding="utf-8") as f:
                content = f.read()
            
            # Replace APP_SCRIPT_URL inside the script tag
            content = re.sub(
                r'const\s+APP_SCRIPT_URL\s*=\s*".*?";',
                f'const APP_SCRIPT_URL = "{script_url_raw}";',
                content
            )
            
            with open(docs_path, "w", encoding="utf-8") as f:
                f.write(content)
                
    print("[SUCCESS] Building docs - Success!")
    return True

def push_and_deploy():
    print("=" * 60)
    print(">>> FULL DEPLOY: Apps Script + GitHub Pages")
    print("=" * 60)

    # Check tools
    if not check_tool("clasp", ["clasp", "-v"]):
        print("-> Install: npm install -g @google/clasp")
        sys.exit(1)
    if not check_tool("git", ["git", "--version"]):
        sys.exit(1)

    # Step 1: Push code to Apps Script
    if not run("Push code to Google Apps Script", "clasp push --force"):
        sys.exit(1)

    # Step 2: Deploy Apps Script (same ID)
    deploy_cmd = f'clasp deploy -i {DEPLOY_ID} -d "Auto deploy"'
    if not run("Deploy Apps Script (same URL)", deploy_cmd):
        sys.exit(1)

    # Step 3: Build docs and Git commit & push
    build_docs()
    
    run("Git add", "git add .")
    run("Git commit", 'git commit -m "Auto-deploy: update source and docs" --allow-empty')
    if not run("Push to GitHub Pages", "git push"):
        print("[WARNING] Git push failed. Check remote and credentials.")
        sys.exit(1)

    print("\n" + "=" * 60)
    print(">>> DEPLOY COMPLETE!")
    print("=" * 60)
    print("Apps Script: URL unchanged, just refresh.")
    print("GitHub Pages: Wait 1-2 min then refresh.")
    print("=" * 60)

if __name__ == "__main__":
    push_and_deploy()