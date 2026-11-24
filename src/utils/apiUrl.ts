/**
 * OpenAI/Anthropic 兼容端点的 URL 拼接。
 *
 * 设置里的厂商端点是「API 根」（可能带 `/v1`、`/v2`、`/v4`、`/v1beta/openai`
 * 等版本段），不能假设末尾一定是 `/v1`。直接去掉 `/v1` 再拼 `/v1/...` 会把
 * 百度 `/v2`、智谱 `/v4`、Google `/v1beta/openai` 拼成不存在的地址。
 *
 * 规则：先剥掉用户可能已经写上的具体接口后缀，再拼目标接口；已以目标接口
 * 结尾时原样返回，避免出现 `.../chat/completions/chat/completions`。
 */

const ENDPOINT_SUFFIXES = [
  "/chat/completions",
  "/messages",
  "/models",
];

/** 把「完整接口地址」还原成 API 根；普通根地址原样返回。 */
export function apiRoot(endpoint: string): string {
  let root = String(endpoint || "").trim().replace(/\/+$/, "");
  for (const suffix of ENDPOINT_SUFFIXES) {
    if (root.endsWith(suffix)) {
      root = root.slice(0, -suffix.length);
      break;
    }
  }
  return root;
}

/** 拼接目标接口（如 `chat/completions`、`models`、`messages`）。 */
export function resolveApiUrl(endpoint: string, path: string): string {
  const target = String(path || "").replace(/^\/+/, "");
  const root = apiRoot(endpoint);
  if (!root) return `/${target}`;
  if (root.endsWith(`/${target}`)) return root;
  return `${root}/${target}`;
}
