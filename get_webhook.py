import subprocess
import os
os.chdir('d:/python-gsheet-app')
out = subprocess.check_output(['git', '--no-pager', 'show', 'a391246:src/Code.js']).decode('utf-8')
for line in out.splitlines():
    if 'DISCORD_WEBHOOK_URL' in line:
        print(line)
