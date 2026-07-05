import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { coinDivination } from '../core/divination-methods'
import { lookupHexagram } from '../core/hexagram'
import { YaoMark } from '../components/HexagramGlyph'
import { isMovingYaoResult, yaoResultToYinYang } from '../components/hexagramGlyphUtils'
import type { LiuQin, YaoResult } from '../core/types'
import './ManualPage.css'

const YAO_NAMES = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻']
const LIU_QIN_OPTIONS: LiuQin[] = ['父母', '兄弟', '妻财', '官鬼', '子孙']
const YAO_OPTIONS: Array<{ value: YaoResult; label: string; tone: string }> = [
  { value: 7, label: '少阳', tone: 'yang' },
  { value: 9, label: '老阳', tone: 'moving-yang' },
  { value: 8, label: '少阴', tone: 'yin' },
  { value: 6, label: '老阴', tone: 'moving-yin' },
]

export default function ManualPage() {
  const navigate = useNavigate()
  const [results, setResults] = useState<YaoResult[]>([7, 7, 7, 7, 7, 7])
  const [question, setQuestion] = useState('')
  const [yongShen, setYongShen] = useState<LiuQin | ''>('')

  const preview = useMemo(() => coinDivination(results), [results])
  const previewHexagram = useMemo(
    () => lookupHexagram(preview.upper, preview.lower),
    [preview],
  )
  const movingCount = preview.dongYao.length

  const updateLine = (index: number, value: YaoResult) => {
    setResults(prev => prev.map((item, i) => (i === index ? value : item)))
  }

  const handleSubmit = () => {
    const input = coinDivination(results)
    const params = new URLSearchParams({
      upper: input.upper,
      lower: input.lower,
      dongYao: input.dongYao.join(','),
      method: 'manual',
      date: input.date.toISOString(),
      yaoResults: results.join(','),
    })
    if (question.trim()) params.set('question', question.trim())
    if (yongShen) params.set('yongShen', yongShen)
    navigate(`/result?${params.toString()}`)
  }

  return (
    <div className="manual">
      <header className="manual-header">
        <button className="manual-back" onClick={() => navigate(-1)} aria-label="返回">
          ←
        </button>
        <div>
          <h1 className="manual-title">手动起卦</h1>
          <p className="manual-subtitle">默认乾为天，逐爻选择四象</p>
        </div>
      </header>

      <section className="manual-preview">
        <div>
          <span className="manual-preview-label">当前卦象</span>
          <strong>{previewHexagram.name}</strong>
        </div>
        <span>{movingCount > 0 ? `${movingCount} 个动爻` : '静卦'}</span>
      </section>

      <section className="manual-line-editor">
        {[5, 4, 3, 2, 1, 0].map(index => {
          const value = results[index]
          const option = YAO_OPTIONS.find(item => item.value === value)!
          const moving = isMovingYaoResult(value)
          return (
            <div className={`manual-line-row ${option.tone}`} key={index}>
              <div className="manual-line-visual">
                <span>{YAO_NAMES[index]}</span>
                <YaoMark yinYang={yaoResultToYinYang(value)} moving={moving} />
              </div>
              <div className="manual-yao-options" aria-label={`${YAO_NAMES[index]}四象`}>
                {YAO_OPTIONS.map(item => {
                  const selected = value === item.value
                  return (
                    <button
                      key={item.value}
                      type="button"
                      className={`manual-yao-option ${item.tone}${selected ? ' is-selected' : ''}`}
                      onClick={() => updateLine(index, item.value)}
                    >
                      <YaoMark
                        yinYang={yaoResultToYinYang(item.value)}
                        moving={isMovingYaoResult(item.value)}
                        compact
                      />
                      <span>{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </section>

      <section className="manual-context">
        <label className="manual-field">
          <span>占问事项</span>
          <input
            type="text"
            placeholder="请输入您想占问的事情……"
            value={question}
            onChange={e => setQuestion(e.target.value)}
          />
        </label>
        <label className="manual-field">
          <span>用神</span>
          <select value={yongShen} onChange={e => setYongShen(e.target.value as LiuQin | '')}>
            <option value="">自动推断</option>
            {LIU_QIN_OPTIONS.map(item => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
      </section>

      <button className="manual-submit active" onClick={handleSubmit}>
        起卦
      </button>
    </div>
  )
}
