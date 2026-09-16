#!/bin/sh
set -e

# 脚本所在目录（lzc/）
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# 项目根目录
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# 版本号：优先使用 LPK_VERSION 环境变量（自动剥离 v 前缀），其次从 git tag 提取，最后回退 0.1.0
LPK_TAG="${LPK_VERSION:-}"
LPK_TAG="${LPK_TAG#v}"
VERSION="${LPK_TAG:-$(cd "$PROJECT_ROOT" && git describe --tags --abbrev=0 2>/dev/null | sed 's/^v//' || true)}"
VERSION="${VERSION:-0.1.0}"
echo "Building version: $VERSION"

# 动态写入 package.yml
cat > "$SCRIPT_DIR/package.yml" <<PKGEOF
package: cloud.lazycat.app.lazycateditor
version: ${VERSION}
name: 懒猫编辑器
description: 轻文档markdown编辑器，AI 辅助写作
author: sikenali
license: MIT
homepage: https://github.com/sikenali/lzeditor
min_os_version: 1.5.0
unsupported_platforms:
  - ios
locales:
  zh-CN:
    name: 懒猫编辑器
    description: 轻文档markdown编辑器，AI 辅助写作
  en:
    name: LazyCat Editor
    description: Lightweight markdown document editor with AI assistance
permissions:
  required:
    - net.internet
    - net.local
PKGEOF

# 清理旧产物
rm -rf "$SCRIPT_DIR/_lpk_content"
mkdir -p "$SCRIPT_DIR/_lpk_content/backend"
mkdir -p "$SCRIPT_DIR/_lpk_content/frontend"
mkdir -p "$SCRIPT_DIR/_lpk_content/scripts"

# ========== 构建后端 ==========
echo "Building backend..."

# 服务器用 tsx 直接运行 TypeScript，无需预编译。
# 复制源文件 + package.json + node_modules（含 native 模块 better-sqlite3/bcryptjs）
cp -a "$PROJECT_ROOT/server/src/." "$SCRIPT_DIR/_lpk_content/backend/"
cp "$PROJECT_ROOT/server/package.json" "$SCRIPT_DIR/_lpk_content/backend/"

# 复制 native 模块（better-sqlite3, bcryptjs）和关键依赖
for mod in better-sqlite3 bcryptjs express cors @anthropic-ai/sdk openai dotenv; do
  if [ -d "$PROJECT_ROOT/node_modules/$mod" ]; then
    cp -a "$PROJECT_ROOT/node_modules/$mod" "$SCRIPT_DIR/_lpk_content/backend/node_modules/"
  fi
done

# 复制运行时依赖的子包（openai 等带子路径的）
cp -a "$PROJECT_ROOT/node_modules/openai" "$SCRIPT_DIR/_lpk_content/backend/node_modules/" 2>/dev/null || true
cp -a "$PROJECT_ROOT/node_modules/@anthropic-ai" "$SCRIPT_DIR/_lpk_content/backend/node_modules/" 2>/dev/null || true

# 复制数据目录（keys.db）
cp -a "$PROJECT_ROOT/server/data/." "$SCRIPT_DIR/_lpk_content/backend/data/" 2>/dev/null || true

# ========== 构建前端 ==========
echo "Building frontend..."
rm -rf "$PROJECT_ROOT/dist"
(cd "$PROJECT_ROOT" && npm run build)
if [ ! -f "$PROJECT_ROOT/dist/index.html" ]; then
  echo "ERROR: frontend build failed, dist/index.html missing"
  exit 1
fi
cp -a "$PROJECT_ROOT/dist/." "$SCRIPT_DIR/_lpk_content/frontend/"

# 写入版本文件，供前端 "关于" 页面动态读取
echo "{\"version\":\"${VERSION}\"}" > "$SCRIPT_DIR/_lpk_content/frontend/version.json"

# ========== 创建启动脚本 ==========
cat > "$SCRIPT_DIR/_lpk_content/scripts/start.sh" << 'STARTSCRIPT'
#!/bin/sh
set -e

# 创建数据目录
mkdir -p /lzcapp/var/data /app/logs
# 持久化 keys.db 到持久卷
if [ ! -f /lzcapp/var/data/keys.db ]; then
  cp /lzcapp/pkg/content/backend/data/keys.db /lzcapp/var/data/keys.db 2>/dev/null || true
fi
# 让后端指向持久化路径
export SQLITE_DB_PATH=/lzcapp/var/data/keys.db
ln -sf /lzcapp/var/data/keys.db /lzcapp/pkg/content/backend/data/keys.db 2>/dev/null || true

# 启动后端（tsx 直接跑 TypeScript，PORT=3001）
cd /lzcapp/pkg/content/backend
PORT=$PORT npx tsx src/index.ts >>/app/logs/backend.log 2>&1 &
BACKEND_PID=$!

# 等待后端就绪（最多 30 次 × 2s = 60s）
for i in $(seq 1 30); do
  sleep 2
  if wget -qO- http://127.0.0.1:$PORT/api/health >/dev/null 2>&1; then
    echo "backend healthy after ${i}x2s"
    break
  fi
  if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "backend exited with code $?, logs:"
    cat /app/logs/backend.log
    exit 1
  fi
done

# 前端由 lzcinit 静态服务，无需额外启动
# 任一进程退出则结束容器
while kill -0 $BACKEND_PID 2>/dev/null; do
  sleep 2
done

echo "container stopped: backend=$BACKEND_PID"
echo "=== backend log ==="
cat /app/logs/backend.log
exit 0
STARTSCRIPT
chmod +x "$SCRIPT_DIR/_lpk_content/scripts/start.sh"

echo "Build complete: version=$VERSION"
