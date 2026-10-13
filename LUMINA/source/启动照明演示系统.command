#!/bin/zsh
cd -- "$(dirname -- "$0")"
if command -v node >/dev/null 2>&1; then
  node scripts/launch.mjs
elif [[ -x /opt/homebrew/bin/node ]]; then
  /opt/homebrew/bin/node scripts/launch.mjs
else
  print '请先安装 Node.js 22.13 或更新版本，再重新打开。'
  read '?按回车关闭'
fi
