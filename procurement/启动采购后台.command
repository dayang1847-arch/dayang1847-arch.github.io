#!/bin/zsh
set -eu
task_dir="$(cd -- "$(dirname -- "$0")" && pwd)"
task_python="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3"
if [ ! -x "$task_python" ]; then
  task_python="$(command -v python3 || true)"
fi
if [ -z "$task_python" ]; then
  echo "请先安装 Python 3.10 或更高版本，再重新打开此启动文件。"
  read -r "?按回车关闭"
  exit 1
fi
exec "$task_python" "$task_dir/backend/server.py"
