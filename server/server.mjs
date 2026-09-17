import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')
const DIST_DIR = path.resolve(ROOT_DIR, 'dist')
const MAX_BODY_BYTES = 1024 * 1024

loadEnvFile(path.join(ROOT_DIR, '.env'))

const PORT = Number(process.env.PORT || 8787)
const HOST = process.env.HOST || '127.0.0.1'

const MIME_TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.ico', 'image/x-icon'],
])

class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)

    if (url.pathname === '/api/health') {
      return sendJson(res, 200, { ok: true })
    }

    if (url.pathname === '/api/analyze') {
      if (req.method !== 'POST') throw new HttpError(405, '只支持 POST /api/analyze')
      return await handleAnalyze(req, res)
    }

    if (req.method === 'GET' || req.method === 'HEAD') {
      return await serveStatic(url.pathname, res, req.method === 'HEAD')
    }

    throw new HttpError(405, '不支持的请求方法')
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500
    const message = err instanceof Error ? err.message : '服务端异常'
    sendJson(res, status, { error: message })
  }
})

server.listen(PORT, HOST, () => {
  console.log(`LiuYao Cicada server listening on http://${HOST}:${PORT}`)
})

async function handleAnalyze(req, res) {
  const body = await readJsonBody(req)
  const payload = normalizeAnalyzePayload(body)
  const result = payload.provider === 'claude'
    ? await callClaude(payload)
    : await callOpenAI(payload)

  sendJson(res, 200, result)
}

async function callOpenAI(payload) {
  const apiKey = payload.apiKey || process.env.OPENAI_API_KEY || process.env.AI_API_KEY
  const baseUrl = normalizeBaseUrl(payload.baseUrl || process.env.OPENAI_BASE_URL || process.env.AI_BASE_URL || 'https://api.openai.com/v1')
  if (!apiKey && isOfficialOpenAIUrl(baseUrl)) {
    throw new HttpError(500, '服务端未配置 OPENAI_API_KEY')
  }

  const model = payload.model || process.env.OPENAI_MODEL || process.env.AI_MODEL || 'gpt-4o'
  const endpoint = `${baseUrl}/chat/completions`

  const headers = {
    'content-type': 'application/json',
  }
  if (apiKey) headers.authorization = `Bearer ${apiKey}`

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      temperature: getTemperature(),
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: buildUserMessage(payload) },
      ],
    }),
  })

  const data = await parseProviderResponse(response, 'OpenAI')
  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== 'string' || !content.trim()) {
    throw new HttpError(502, 'OpenAI 返回了空的响应内容')
  }

  return {
    provider: 'openai',
    model,
    content,
    usage: data.usage
      ? { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens }
      : undefined,
    timestamp: new Date().toISOString(),
  }
}

async function callClaude(payload) {
  const apiKey = payload.apiKey || process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || process.env.AI_API_KEY
  if (!apiKey) throw new HttpError(500, '服务端未配置 ANTHROPIC_API_KEY')

  const baseUrl = normalizeBaseUrl(payload.baseUrl || process.env.ANTHROPIC_BASE_URL || process.env.CLAUDE_BASE_URL || 'https://api.anthropic.com')
  const model = payload.model || process.env.ANTHROPIC_MODEL || process.env.CLAUDE_MODEL || process.env.AI_MODEL
  if (!model) throw new HttpError(500, '服务端未配置 ANTHROPIC_MODEL，或前端未填写 Claude 模型')

  const endpoint = `${baseUrl}/v1/messages`
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': process.env.ANTHROPIC_VERSION || '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: getMaxTokens(),
      temperature: getTemperature(),
      system: buildSystemPrompt(),
      messages: [{ role: 'user', content: buildUserMessage(payload) }],
    }),
  })

  const data = await parseProviderResponse(response, 'Claude')
  const content = Array.isArray(data.content)
    ? data.content
      .filter(block => block?.type === 'text' && typeof block.text === 'string')
      .map(block => block.text)
      .join('\n')
    : ''

  if (!content.trim()) throw new HttpError(502, 'Claude 返回了空的响应内容')

  return {
    provider: 'claude',
    model,
    content,
    usage: data.usage
      ? { inputTokens: data.usage.input_tokens, outputTokens: data.usage.output_tokens }
      : undefined,
    timestamp: new Date().toISOString(),
  }
}

async function parseProviderResponse(response, providerName) {
  let data
  try {
    data = await response.json()
  } catch (err) {
    throw new HttpError(502, `${providerName} 返回了无法解析的响应`)
  }

  if (!response.ok) {
    const message = data?.error?.message || data?.message || `HTTP ${response.status}: ${response.statusText}`
    throw new HttpError(response.status >= 500 ? 502 : response.status, `${providerName} 调用失败：${message}`)
  }

  return data
}

function normalizeAnalyzePayload(body) {
  if (!body || typeof body !== 'object') throw new HttpError(400, '请求体必须是 JSON 对象')

  const provider = typeof body.provider === 'string'
    ? body.provider
    : process.env.AI_PROVIDER || 'openai'
  if (provider !== 'openai' && provider !== 'claude') {
    throw new HttpError(400, 'provider 只能是 openai 或 claude')
  }

  const serializedPan = typeof body.serializedPan === 'string' ? body.serializedPan.trim() : ''
  if (!serializedPan) throw new HttpError(400, '缺少排盘数据 serializedPan')

  return {
    provider,
    providerName: readOptionalText(body.providerName),
    model: typeof body.model === 'string' && body.model.trim() ? body.model.trim() : undefined,
    baseUrl: readOptionalText(body.baseUrl),
    apiKey: readOptionalText(body.apiKey),
    serializedPan,
    question: typeof body.question === 'string' ? body.question.trim() : '',
    yongShen: typeof body.yongShen === 'string' ? body.yongShen.trim() : '',
  }
}

async function readJsonBody(req) {
  let size = 0
  const chunks = []

  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) throw new HttpError(413, '请求体过大')
    chunks.push(chunk)
  }

  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) throw new HttpError(400, '请求体不能为空')

  try {
    return JSON.parse(raw)
  } catch {
    throw new HttpError(400, '请求体不是有效 JSON')
  }
}

async function serveStatic(requestPath, res, headOnly) {
  if (!existsSync(DIST_DIR)) {
    throw new HttpError(404, 'dist 不存在，请先运行 npm run build')
  }

  const decodedPath = decodeURIComponent(requestPath)
  const safePath = decodedPath === '/' ? '/index.html' : decodedPath
  let filePath = path.resolve(DIST_DIR, `.${safePath}`)

  if (!filePath.startsWith(DIST_DIR)) throw new HttpError(403, '非法路径')

  try {
    const info = await stat(filePath)
    if (info.isDirectory()) filePath = path.join(filePath, 'index.html')
  } catch {
    filePath = path.join(DIST_DIR, 'index.html')
  }

  const ext = path.extname(filePath)
  res.writeHead(200, {
    'content-type': MIME_TYPES.get(ext) || 'application/octet-stream',
  })

  if (!headOnly) res.end(await readFile(filePath))
  else res.end()
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(data))
}

function normalizeBaseUrl(value) {
  const normalized = value.trim().replace(/\/+$/, '')
  let parsed
  try {
    parsed = new URL(normalized)
  } catch {
    throw new HttpError(400, 'Base URL 必须是有效的 http(s) 地址')
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new HttpError(400, 'Base URL 必须使用 http 或 https')
  }
  return normalized
}

function isOfficialOpenAIUrl(value) {
  try {
    return new URL(value).hostname === 'api.openai.com'
  } catch {
    return false
  }
}

function readOptionalText(value) {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function getMaxTokens() {
  const value = Number(process.env.AI_MAX_TOKENS || 4096)
  return Number.isFinite(value) && value > 0 ? value : 4096
}

function getTemperature() {
  const value = Number(process.env.AI_TEMPERATURE || 0.45)
  return Number.isFinite(value) ? value : 0.45
}

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return

  const content = readFileSync(filePath, 'utf8')
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const index = trimmed.indexOf('=')
    if (index === -1) continue

    const key = trimmed.slice(0, index).trim()
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '')
    if (key && process.env[key] === undefined) process.env[key] = value
  }
}

function buildSystemPrompt() {
  return `你是一位精通六爻预测的易学专家。请根据提供的排盘数据，进行系统性的六爻分析。

分析框架：
1. 用神定位：如果用户指定了用神，直接使用；如果未指定，根据占问事项推断用神
2. 旺衰判断：根据用神在日月建下的状态、动爻变化、原神忌神的位置判断用神旺衰
3. 世应分析：世爻代表问卦人，应爻代表对方或事情，分析世应关系及各自状态
4. 动爻解读：分析动爻变化及其对用神的影响
5. 冲合分析：六冲主散、六合主成，结合具体爻位分析吉凶
6. 伏神判断：若有用神不上卦，分析飞伏关系
7. 特殊组合：三合局、三刑、六害等特殊关系的影响

输出章节：
## 卦象总览
## 用神分析
## 世爻分析
## 动爻解读
## 日月建影响
## 关键爻间关系
## 综合判断
## 建议

重要原则：
- 基于排盘数据中的客观事实进行分析，不要编造数据中没有的信息
- 旺衰判断要给出具体理由
- 吉凶判断要温和、建设性，避免绝对化表述
- 使用传统文化术语但要让现代人能看懂
- 回答使用中文`
}

function buildUserMessage(request) {
  const parts = []
  if (request.question) {
    parts.push(`占问事项：${request.question}`)
    parts.push('')
  }
  if (request.yongShen) {
    parts.push(`指定用神：${request.yongShen}`)
    parts.push('')
  }
  parts.push('排盘数据如下：')
  parts.push('')
  parts.push(request.serializedPan)
  return parts.join('\n')
}
