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

# ========== 打包 Node.js 运行时 ==========
# lzcapp:3.20.3 是 musl 精简容器（Alpine 系），没有 node / npm / npx，只有
# python3 + wget + sh。glibc 版 node 跑不起来，必须用官方 musl 构建。
# 但 nodejs.org 的 musl 构建仍动态链接 libstdc++ / libgcc_s（Alpine 上 nodejs 包的
# 正常依赖），容器里没有这两个库，需一并打入 backend/lib/ 再用 LD_LIBRARY_PATH 指过去。
NODE_VERSION="v24.22.0"
NODE_ARTIFACT="node-${NODE_VERSION}-linux-x64-musl.tar.xz"
NODE_SHA256="a8d2897df6cd50beb83b34f958b2ca32628389225b41841f2b157d83d317a867"
ALPINE_REPO="https://dl-cdn.alpinelinux.org/alpine/v3.22/main/x86_64"
LIBSTDCXX_APK="libstdc++-14.2.0-r6.apk"
LIBSTDCXX_SHA="939f7c99898f3e8154207a17f4acbe8bc40437e1bb1b43f5525620ca9e452a2e"
LIBGCC_APK="libgcc-14.2.0-r6.apk"
LIBGCC_SHA="04f3467bc967e705221a843fe4d3de5850db826e571686e0c0ed453d38cb5c59"

CACHE_DIR="$SCRIPT_DIR/_runtime_cache"
STAGE_DIR="$SCRIPT_DIR/_node_stage"
rm -rf "$STAGE_DIR"
mkdir -p "$CACHE_DIR" "$STAGE_DIR" "$SCRIPT_DIR/_lpk_content/backend/lib"

# 下载并校验；已缓存则跳过
fetch_verify() {
  [ -f "$2" ] && return 0
  echo "Downloading $1 ..."
  curl -fsSL "$1" -o "$2.tmp"
  echo "$3  $2.tmp" | sha256sum -c - >/dev/null || { echo "ERROR: sha256 校验失败: $1"; exit 1; }
  mv "$2.tmp" "$2"
}

fetch_verify "https://nodejs.org/dist/${NODE_VERSION}/${NODE_ARTIFACT}" \
  "$CACHE_DIR/$NODE_ARTIFACT" "$NODE_SHA256"
# GNU tar 对「指定 member + --strip-components」不生效（静默不解出），先解到临时目录再压
NODE_BIN_SRC="$STAGE_DIR/node-${NODE_VERSION}-linux-x64-musl/bin/node"
tar xJf "$CACHE_DIR/$NODE_ARTIFACT" -C "$STAGE_DIR" \
  "node-${NODE_VERSION}-linux-x64-musl/bin/node"

# 只带压缩包，不带解压后的二进制（127MB → 45MB，包体省 82MB）。
# 必须在盒子上带：lzcapp 容器里没有 node/npm，且 apk 源不可达（容器无公网、DNS 不解析外网）。
# 压成 .gz 而不是 .tar.xz：实测容器里只有 gzip/zcat，xz/xzcat/lzma 均未链接，.xz 解不开。
# start.sh 首启解压到持久卷 /lzcapp/var/runtime，路径含 sha256 前缀，天然幂等。
gzip -9 -c "$NODE_BIN_SRC" > "$SCRIPT_DIR/_lpk_content/backend/node.gz"
echo "$(sha256sum "$NODE_BIN_SRC" | cut -d' ' -f1)  node" \
  > "$SCRIPT_DIR/_lpk_content/backend/node.gz.sha256"

mkdir -p "$STAGE_DIR/a1" "$STAGE_DIR/a2"
fetch_verify "$ALPINE_REPO/$LIBSTDCXX_APK" "$CACHE_DIR/$LIBSTDCXX_APK" "$LIBSTDCXX_SHA"
fetch_verify "$ALPINE_REPO/$LIBGCC_APK" "$CACHE_DIR/$LIBGCC_APK" "$LIBGCC_SHA"
tar xzf "$CACHE_DIR/$LIBSTDCXX_APK" -C "$STAGE_DIR/a1" 2>/dev/null
tar xzf "$CACHE_DIR/$LIBGCC_APK" -C "$STAGE_DIR/a2" 2>/dev/null
STD_SO="$(find "$STAGE_DIR/a1" -name 'libstdc++.so.6.*' -type f | head -1)"
GCC_SO="$(find "$STAGE_DIR/a2" -name 'libgcc_s.so.1*' -type f | head -1)"
[ -z "$STD_SO" ] && { echo "ERROR: 未解出 libstdc++"; exit 1; }
[ -z "$GCC_SO" ] && { echo "ERROR: 未解出 libgcc_s"; exit 1; }
cp "$STD_SO" "$SCRIPT_DIR/_lpk_content/backend/lib/libstdc++.so.6"
cp "$GCC_SO" "$SCRIPT_DIR/_lpk_content/backend/lib/libgcc_s.so.1"
chmod 644 "$SCRIPT_DIR/_lpk_content/backend/lib/"*
rm -rf "$STAGE_DIR"
echo "Bundled runtime: node.gz $(du -h "$SCRIPT_DIR/_lpk_content/backend/node.gz" | cut -f1) (解压后 127M), libs $(du -sh "$SCRIPT_DIR/_lpk_content/backend/lib" | cut -f1)"

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

# 持久化数据目录（keys.json：API key 元信息，明文只在浏览器）。
# /lzcapp/pkg 在 compose 里是只读挂载，所以绝不能往包内 data/ 打软链（会 EROFS）。
mkdir -p /lzcapp/var/data

cd /lzcapp/pkg/content/backend

# lzcinit 通过 exec://3001 直接 exec 本脚本作为 API 进程，前台常驻，
# stdout/stderr 由 lzcinit 采集为容器日志。容器里没有 node/npm/npx，
# 包内自带 musl 构建的 node；tsx 直接跑 TS，免预编译。
#
# node 以 node.gz 携带（127MB -> 45MB，包体省 82MB），首启解压到持久卷，
# 路径含 sha256 前缀，因此天然幂等：同版本不重复解压，升级换新路径，
# 旧件顺手清掉。用 .gz 而不是 .tar.xz —— 实测 lzcapp 容器只有
# gzip/zcat，xz/xzcat/lzma 未链接，.xz 解不开。
RUNTIME_DIR=/lzcapp/var/runtime
EXPECTED="$(awk '{print $1}' node.gz.sha256)"
PREFIX="$(printf '%s' "$EXPECTED" | cut -c1-12)"
NODE_BIN="$RUNTIME_DIR/node-$PREFIX"
if [ ! -x "$NODE_BIN" ]; then
  mkdir -p "$RUNTIME_DIR"
  echo "[start] first boot: extracting node runtime $PREFIX ..."
  for old in "$RUNTIME_DIR"/node-*; do
    [ -f "$old" ] || continue
    rm -f "$old"
  done
  TMP="$RUNTIME_DIR/node-$PREFIX.part.$$"
  gzip -dc node.gz > "$TMP"
  chmod 755 "$TMP"
  GOT="$(sha256sum "$TMP" | cut -d' ' -f1)"
  if [ "$GOT" != "$EXPECTED" ]; then
    rm -f "$TMP"
    echo "ERROR: node runtime sha256 mismatch: got $GOT want $EXPECTED" >&2
    exit 1
  fi
  mv "$TMP" "$NODE_BIN"
  echo "[start] node runtime ready: $NODE_BIN"
fi

# node musl 构建动态链接 libstdc++ / libgcc_s（容器里没有），指向包内自带副本。
export LD_LIBRARY_PATH="$PWD/lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
# lzcinit 自带 healthcheck + start_period，这里无需再等就绪。
PORT="${PORT:-3001}"
export PORT
exec "$NODE_BIN" node_modules/tsx/dist/cli.mjs src/index.ts
STARTSCRIPT
chmod +x "$SCRIPT_DIR/_lpk_content/scripts/start.sh"

echo "Build complete: version=$VERSION"
