import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { extract } from '../core/extractor'
import { serializeForAI } from '../core/serializer'
import { buildPanFromSearch } from '../utils/panFromSearch'
import { readAISettings, saveAISettings } from '../utils/aiSettings'
import type { AIProviderType } from '../ai'
import type { ExtractedRelations, HexagramPan, YaoLine } from '../core/types'
import { isChong, isHe } from '../core/ganzhi'
import { wuxingRelation } from '../core/wuxing'
import './AnalysisPage.css'

const YAO_POS = ['初', '二', '三', '四', '五', '上']

export default function AnalysisPage() {
  const [searchParams] = useSearchParams()
  const pan = useMemo(() => buildPanFromSearch(searchParams), [searchParams])
  const relations = useMemo(() => pan ? extract(pan) : null, [pan])
  const serializedPan = useMemo(
    () => pan && relations ? serializeForAI(pan, relations) : '',
    [pan, relations],
  )
  const settings = readAISettings()
  const [aiProvider, setAiProvider] = useState<AIProviderType>(settings.provider)
  const [model, setModel] = useState(settings.model)
  const [aiText, setAiText] = useState('')
  const [aiError, setAiError] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisMode, setAnalysisMode] = useState<'idle' | 'local' | 'remote'>('idle')

  if (!pan || !relations) {
    return (
      <div className="analysis-page">
        <Link to="/" className="analysis-back">返回</Link>
        <p className="analysis-empty">排盘参数异常，请重新起卦。</p>
      </div>
    )
  }

  const handleAnalyze = async () => {
    setAiError('')
    setAiText('')
    setIsAnalyzing(true)
    saveAISettings({ provider: aiProvider, model })

    try {
      setAnalysisMode('remote')
      const result = await requestServerAnalysis({
        provider: aiProvider,
        model: model.trim() || undefined,
        serializedPan,
        question: pan.question,
        yongShen: pan.yongShen,
      })
      setAiText(result.content)
    } catch (err) {
      setAnalysisMode('idle')
      setAiError(formatAIError(err))
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleLocalSummary = () => {
    setAiError('')
    setAiText(buildLocalAnalysis(pan, relations))
    setAnalysisMode('local')
  }

  return (
    <div className="analysis-page">
      <header className="analysis-header">
        <Link to={`/result?${searchParams.toString()}`} className="analysis-back">返回</Link>
        <div>
          <h1>AI 解析</h1>
          <p>{pan.original.info.name}{pan.changed ? ` 之 ${pan.changed.info.name}` : ''}</p>
        </div>
      </header>

      <section className="analysis-card">
        <div className="analysis-summary">
          <span>{pan.question ? `占问：${pan.question}` : '未填写占问事项'}</span>
          <span>{pan.yongShen ? `用神：${pan.yongShen}` : '用神由 AI 推断'}</span>
        </div>

        <div className="analysis-config">
          <label>
            <span>提供商</span>
            <select value={aiProvider} onChange={e => setAiProvider(e.target.value as AIProviderType)}>
              <option value="openai">OpenAI 兼容</option>
              <option value="claude">Claude</option>
            </select>
          </label>
          <label>
            <span>API Key</span>
            <input value="由服务端环境变量读取" disabled />
          </label>
          <label>
            <span>模型</span>
            <input value={model} onChange={e => setModel(e.target.value)} placeholder={aiProvider === 'openai' ? '服务端默认或 gpt-4o' : '服务端默认 Claude 模型'} />
          </label>
          <label>
            <span>Base URL</span>
            <input value="由服务端环境变量读取" disabled />
          </label>
        </div>

        <div className="analysis-actions">
          <button className="analysis-run" onClick={handleAnalyze} disabled={isAnalyzing}>
            {isAnalyzing ? '解析中...' : '调用服务端 AI 解析'}
          </button>
          <button className="analysis-local" onClick={handleLocalSummary} disabled={isAnalyzing}>
            生成本地摘要
          </button>
        </div>
      </section>

      {aiError && <div className="analysis-error">{aiError}</div>}

      {aiText && (
        <article className="analysis-output">
          <div className="analysis-output-head">
            {analysisMode === 'remote' ? 'AI 返回结果' : '本地规则摘要'}
          </div>
          <pre>{aiText}</pre>
        </article>
      )}

      <details className="analysis-source">
        <summary>排盘数据</summary>
        <pre>{serializedPan}</pre>
      </details>
    </div>
  )
}

interface ServerAnalysisRequest {
  provider: AIProviderType
  model?: string
  serializedPan: string
  question?: string
  yongShen?: string
}

interface ServerAnalysisResponse {
  content: string
}

async function requestServerAnalysis(request: ServerAnalysisRequest): Promise<ServerAnalysisResponse> {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(request),
  })

  let data: unknown = null
  try {
    data = await response.json()
  } catch {
    // Keep the clearer status-based error below.
  }

  if (!response.ok) {
    const message = getServerErrorMessage(data) ?? `服务端 AI 代理返回 HTTP ${response.status}`
    throw new Error(message)
  }

  if (!isServerAnalysisResponse(data)) {
    throw new Error('服务端 AI 代理返回格式异常')
  }

  return data
}

function getServerErrorMessage(data: unknown): string | undefined {
  if (typeof data !== 'object' || data === null) return undefined
  const error = (data as { error?: unknown }).error
  return typeof error === 'string' ? error : undefined
}

function isServerAnalysisResponse(data: unknown): data is ServerAnalysisResponse {
  return typeof data === 'object' &&
    data !== null &&
    typeof (data as { content?: unknown }).content === 'string'
}

function formatAIError(err: unknown): string {
  if (err instanceof Error) return `解析失败：${err.message}`
  return '解析失败：未知错误'
}

function buildLocalAnalysis(pan: HexagramPan, relations: ExtractedRelations): string {
  const lines: string[] = []
  const shi = pan.original.yaoLines[pan.original.palace.shiYaoIndex]
  const ying = pan.original.yaoLines[pan.original.palace.yingYaoIndex]
  const yong = relations.yongShenAnalysis

  lines.push('## 卦象总览')
  lines.push(`${pan.original.info.name}${pan.changed ? ` 之 ${pan.changed.info.name}` : '，静卦无变。'}`)
  lines.push(`本卦属${pan.original.palace.palace}宫${pan.original.palace.wuxing}，${pan.original.palace.position}。`)
  lines.push('')

  lines.push('## 世应')
  lines.push(`世爻：${formatYaoBrief(shi)}；应爻：${formatYaoBrief(ying)}。`)
  lines.push(`世应五行关系：${describeWuxingRelation(shi, ying)}。` +
    (isChong(shi.diZhi, ying.diZhi) ? ' 世应地支六冲。' : '') +
    (isHe(shi.diZhi, ying.diZhi) ? ` 世应六合化${isHe(shi.diZhi, ying.diZhi)}。` : ''))
  lines.push('')

  lines.push('## 用神')
  if (yong) {
    const positions = yong.yaoIndices.map(i => `${YAO_POS[i]}爻`).join('、') || '不上卦'
    lines.push(`用神为${yong.yongShen}，位置：${positions}。`)
    lines.push(`原神为${yong.yuanShen}，忌神为${yong.jiShen}，仇神为${yong.chouShen}。`)
  } else {
    lines.push('未指定用神。本地摘要不替你推断用神，远程 AI 会结合占问事项推断。')
  }
  lines.push('')

  lines.push('## 动爻')
  if (relations.dongYaoAnalysis.length === 0) {
    lines.push('本卦无动爻。')
  } else {
    for (const d of relations.dongYaoAnalysis) {
      lines.push(`${YAO_POS[d.yaoIndex]}爻 ${d.originalDiZhi}${d.originalLiuQin} 化 ${d.changedDiZhi}${d.changedLiuQin}，${d.huiTouRelation}。`)
    }
  }

  return lines.join('\n')
}

function formatYaoBrief(yao: YaoLine): string {
  const flags = [yao.isDong ? '动' : '', yao.isXunKong ? '旬空' : '', yao.isYuePo ? '月破' : ''].filter(Boolean)
  return `${YAO_POS[yao.index]}爻 ${yao.diZhi}${yao.diZhiWuxing}·${yao.liuQin}·${yao.liuShou}` +
    (flags.length > 0 ? `（${flags.join('、')}）` : '')
}

function describeWuxingRelation(a: YaoLine, b: YaoLine): string {
  const rel = wuxingRelation(a.diZhiWuxing, b.diZhiWuxing)
  if (rel === 'A生B') return `${YAO_POS[a.index]}爻生${YAO_POS[b.index]}爻`
  if (rel === 'B生A') return `${YAO_POS[b.index]}爻生${YAO_POS[a.index]}爻`
  if (rel === 'A克B') return `${YAO_POS[a.index]}爻克${YAO_POS[b.index]}爻`
  if (rel === 'B克A') return `${YAO_POS[b.index]}爻克${YAO_POS[a.index]}爻`
  return '比和'
}
