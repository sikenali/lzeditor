#!/bin/bash
# 本地打包脚本：构建 contentdir → 生成 LPK → 重命名为版本化文件名
set -euo pipefail

# 版本号：优先使用 LPK_VERSION 环境变量，其次从 git tag 获取
LPK_TAG="${LPK_VERSION:-}"
LPK_TAG="${LPK_TAG#v}"
if [ -z "$LPK_TAG" ]; then
  LPK_TAG=$(git -C "$(dirname "$0")/.." describe --tags --abbrev=0 2>/dev/null | sed 's/^v//' || echo "0.1.0")
fi
export LPK_VERSION="$LPK_TAG"
echo "Packaging version: $LPK_VERSION"

# 1. 运行 build.sh（build.sh 读取 LPK_VERSION 环境变量）
bash "$(dirname "$0")/build.sh"

# 2. 调用 lzc-cli 生成 LPK
# 查找 lzc-cli 二进制位置
CLI_BIN=""
for candidate in \
  "$(npm root -g)/@lazycatcloud/lzc-cli/scripts/cli.js" \
  "/usr/local/lib/node_modules/@lazycatcloud/lzc-cli/scripts/cli.js" \
  "/opt/homebrew/lib/node_modules/@lazycatcloud/lzc-cli/scripts/cli.js" \
  "/tmp/package/scripts/cli.js"; do
  if [ -f "$candidate" ]; then
    CLI_BIN="$candidate"
    break
  fi
done

if [ -z "$CLI_BIN" ]; then
  echo "ERROR: lzc-cli not found. Install with: npm install -g @lazycatcloud/lzc-cli"
  exit 1
fi

echo "Using lzc-cli: $CLI_BIN"
"$CLI_BIN" project release -o output.lpk

# 3. 重命名
LPK_NAME="cloud.lazycat.app.lazycateditor-${LPK_VERSION}.lpk"
if [ -f output.lpk ]; then
  mv output.lpk "$LPK_NAME"
  echo "Done: $LPK_NAME"
fi
