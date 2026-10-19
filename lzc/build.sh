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
package: cloud.lazycat.app.lzeditor
version: ${VERSION}
name: LZEditor
description: 轻文档markdown编辑器，AI 辅助写作
author: sikenali
license: MIT
homepage: https://github.com/sikenali/lzeditor
min_os_version: 1.5.0
unsupported_platforms:
  - ios
locales:
  zh-CN:
    name: LZEditor
    description: 轻文档markdown编辑器，AI 辅助写作
  en:
    name: LZEditor
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
# 复制 src 目录本身（不是其内容）：index.ts 靠 ../data 定位 backend/data/keys.json，
# start.sh 也按 backend/src/index.ts 启动。拷成 backend/index.ts 会两处都错位。
cp -a "$PROJECT_ROOT/server/src" "$SCRIPT_DIR/_lpk_content/backend/"
cp "$PROJECT_ROOT/server/package.json" "$SCRIPT_DIR/_lpk_content/backend/"

# 运行时依赖必须按传递闭包完整复制。两个历史坑：
#   1) 之前没建 node_modules 目录，第一条 cp 因目标不存在而把 express 整体拷成了
#      node_modules 本身，包内从此没有 express。
#   2) 之前手工列白名单，漏掉 @anthropic-ai/sdk / openai / express 的传递依赖
#      （node-fetch、body-parser…），后端启动即 ERR_MODULE_NOT_FOUND。
# 这里从项目根 node_modules 递归解析闭包：离线、确定、去重。@types/* 只是类型，运行时
# 永不加载，剔除以省体积。tsx 是 devDependency 不会被 npm 装进后端，手动列入闭包。
BACKEND_NM="$SCRIPT_DIR/_lpk_content/backend/node_modules"
DEPS_LIST="$SCRIPT_DIR/_backend_deps.txt"
node -e '
const fs=require("fs"),path=require("path");
const root=process.argv[1];
const roots=["express","cors","@anthropic-ai/sdk","openai","tsx","esbuild","@esbuild/linux-x64"];
const seen=new Set(),queue=[...roots];
while(queue.length){
  const n=queue.pop();
  if(seen.has(n)||n.startsWith("@types/")) continue;
  seen.add(n);
  const pj=path.join(root,n,"package.json");
  if(!fs.existsSync(pj)){console.error("missing dependency: "+n);process.exit(1);}
  for(const d of Object.keys(JSON.parse(fs.readFileSync(pj)).dependencies||{})) queue.push(d);
}
fs.writeFileSync(process.argv[2],[...seen].sort().join("\n")+"\n");' \
  "$PROJECT_ROOT/node_modules" "$DEPS_LIST"

mkdir -p "$BACKEND_NM/.bin"
while IFS= read -r mod; do
  [ -z "$mod" ] && continue
  mkdir -p "$BACKEND_NM/$(dirname "$mod")"
  cp -a "$PROJECT_ROOT/node_modules/$mod" "$BACKEND_NM/$mod"
done < "$DEPS_LIST"
rm -f "$DEPS_LIST"
# npx 靠 node_modules/.bin 解析，盒子里没有 npm 缓存，必须自带
ln -sf ../tsx/dist/cli.mjs "$BACKEND_NM/.bin/tsx"

# 数据目录（keys.json：API key 元信息，明文只在浏览器）
mkdir -p "$SCRIPT_DIR/_lpk_content/backend/data"
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
# 持久化 keys.json 到持久卷。
# 后端早已从 SQLite 改成 JSON 文件存储，之前持久化的是 keys.db，
# 那是 SQLite 时代的遗留接线：既复制不到文件，SQLITE_DB_PATH 也没人读，
# 结果 API key 元信息全写进会丢的包目录里。
if [ ! -f /lzcapp/var/data/keys.json ]; then
  cp /lzcapp/pkg/content/backend/data/keys.json /lzcapp/var/data/keys.json 2>/dev/null || true
fi
# 后端固定读写 <backend>/data/keys.json，用软链把它接到持久卷
ln -sf /lzcapp/var/data/keys.json /lzcapp/pkg/content/backend/data/keys.json 2>/dev/null || true

# 启动后端（tsx 直接跑 TypeScript，PORT=3001）
# 优先用包内自带的 tsx，避免依赖盒子上的 npx / 联网 npm install
cd /lzcapp/pkg/content/backend
if [ -f node_modules/tsx/dist/cli.mjs ]; then
  TSX_CMD="node node_modules/tsx/dist/cli.mjs"
elif command -v npx >/dev/null 2>&1; then
  TSX_CMD="npx tsx"
else
  echo "ERROR: 包内无 tsx 且 npx 不可用"
  exit 1
fi
PORT=$PORT $TSX_CMD src/index.ts >>/app/logs/backend.log 2>&1 &
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
