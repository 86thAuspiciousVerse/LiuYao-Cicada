import { useNavigate } from 'react-router-dom'
import { useState, useMemo } from 'react'
import { numberDivination, twoNumberDivination } from '../core/divination-methods'
import { lookupHexagram } from '../core/hexagram'
import { getPalace } from '../core/palace'
import type { LiuQin } from '../core/types'
import './NumberPage.css'

const LIU_QIN_OPTIONS: LiuQin[] = ['父母', '兄弟', '妻财', '官鬼', '子孙']

export default function NumberPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'two' | 'three'>('three')
  const [n1, setN1] = useState('')
  const [n2, setN2] = useState('')
  const [n3, setN3] = useState('')
  const [question, setQuestion] = useState('')
  const [yongShen, setYongShen] = useState<LiuQin | ''>('')

  const preview = useMemo(() => {
    try {
      if (mode === 'three') {
        if (!n1 || !n2 || !n3) return null
        const v1 = Number(n1); const v2 = Number(n2); const v3 = Number(n3)
        if (isNaN(v1) || isNaN(v2) || isNaN(v3)) return null
        // 直接用核心函数计算，确保与起卦一致
        const input = numberDivination(v1, v2, v3)
        const hex = lookupHexagram(input.upper, input.lower)
        const palace = getPalace(hex.index)
        return {
          hexagramName: hex.name,
          hexagramSymbol: hex.symbol,
          palaceName: palace.palace,
          upper: input.upper,
          lower: input.lower,
          dongYao: input.dongYao[0] + 1, // 转为 1-based 显示
        }
      } else {
        if (!n1 || !n2) return null
        const v1 = Number(n1); const v2 = Number(n2)
        if (isNaN(v1) || isNaN(v2)) return null
        const input = twoNumberDivination(v1, v2)
        const hex = lookupHexagram(input.upper, input.lower)
        const palace = getPalace(hex.index)
        return {
          hexagramName: hex.name,
          hexagramSymbol: hex.symbol,
          palaceName: palace.palace,
          upper: input.upper,
          lower: input.lower,
          dongYao: input.dongYao[0] + 1,
          dongYaoDesc: `动爻 = (${v1} + ${v2}) % 6 = ${(v1 + v2) % 6 || 6} → 第${input.dongYao[0] + 1}爻`,
        }
      }
    } catch { return null }
  }, [n1, n2, n3, mode])

  const allFilled = mode === 'three'
    ? n1 !== '' && n2 !== '' && n3 !== '' &&
      !isNaN(Number(n1)) && !isNaN(Number(n2)) && !isNaN(Number(n3))
    : n1 !== '' && n2 !== '' &&
      !isNaN(Number(n1)) && !isNaN(Number(n2))

  const handleDivination = () => {
    if (!allFilled) return
    const input = mode === 'two'
      ? twoNumberDivination(Number(n1), Number(n2))
      : numberDivination(Number(n1), Number(n2), Number(n3))
    const params = new URLSearchParams({
      upper: input.upper,
      lower: input.lower,
      dongYao: input.dongYao.join(','),
      method: 'number',
      date: input.date.toISOString(),
    })
    if (question.trim()) {
      params.set('question', question.trim())
    }
    if (yongShen) {
      params.set('yongShen', yongShen)
    }
    navigate(`/result?${params.toString()}`)
  }

  const handleBack = () => {
    navigate(-1)
  }

  return (
    <div className="number-page">
      <header className="page-header">
        <button className="back-btn" onClick={handleBack} aria-label="返回">
          <span aria-hidden="true">&larr;</span>
        </button>
        <h1 className="page-title">数字起卦</h1>
      </header>

      <main className="page-content">
        {/* 模式切换 */}
        <div className="mode-tabs">
          <button
            className={`mode-tab${mode === 'three' ? ' mode-tab--active' : ''}`}
            onClick={() => setMode('three')}
          >
            三数起卦
          </button>
          <button
            className={`mode-tab${mode === 'two' ? ' mode-tab--active' : ''}`}
            onClick={() => setMode('two')}
          >
            二数起卦
          </button>
        </div>

        <section className="card input-card">
          <div className="number-inputs">
            <div className="number-field">
              <label htmlFor="num-upper">上卦数</label>
              <input
                id="num-upper"
                className="input-field"
                type="number"
                min="1"
                step="1"
                placeholder="如 123"
                value={n1}
                onChange={e => setN1(e.target.value)}
              />
            </div>
            <div className="number-field">
              <label htmlFor="num-lower">下卦数</label>
              <input
                id="num-lower"
                className="input-field"
                type="number"
                min="1"
                step="1"
                placeholder="如 456"
                value={n2}
                onChange={e => setN2(e.target.value)}
              />
            </div>
            {mode === 'three' && (
              <div className="number-field">
                <label htmlFor="num-yao">动爻数</label>
                <input
                  id="num-yao"
                  className="input-field"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="如 789"
                  value={n3}
                  onChange={e => setN3(e.target.value)}
                />
              </div>
            )}
          </div>
        </section>

        {preview && (
          <section className="card preview-card">
            <h2 className="card-title">
              <span className="card-title-accent" />
              预览
            </h2>
            <div className="preview-hexagram">
              <span className="preview-symbol">{preview.hexagramSymbol}</span>
              <span className="preview-name">{preview.hexagramName}</span>
              <span className="preview-palace">{preview.palaceName}宫</span>
            </div>
            <div className="preview-grid">
              <div className="preview-item">
                <span className="preview-label">上卦</span>
                <span className="preview-value">{preview.upper}</span>
              </div>
              <div className="preview-item">
                <span className="preview-label">下卦</span>
                <span className="preview-value">{preview.lower}</span>
              </div>
              <div className="preview-item">
                <span className="preview-label">动爻</span>
                <span className="preview-value">第{preview.dongYao}爻</span>
              </div>
            </div>
            {preview.dongYaoDesc && (
              <div className="dongyao-calc">{preview.dongYaoDesc}</div>
            )}
          </section>
        )}

        {!preview && (
          <section className="card hint-card">
            <p className="hint-text">
              {mode === 'three' ? '请输入三个数字，预览卦象' : '请输入两个数字，预览卦象'}
            </p>
          </section>
        )}

        <section className="card input-card">
          <label className="input-label" htmlFor="question">
            占问事项 <span className="optional">（可选）</span>
          </label>
          <input
            id="question"
            className="input-field"
            type="text"
            placeholder="请输入您想占问的事情……"
            value={question}
            onChange={e => setQuestion(e.target.value)}
          />
          <label className="input-label" htmlFor="yongShen">
            用神 <span className="optional">（可选）</span>
          </label>
          <select
            id="yongShen"
            className="input-field"
            value={yongShen}
            onChange={e => setYongShen(e.target.value as LiuQin | '')}
          >
            <option value="">自动推断</option>
            {LIU_QIN_OPTIONS.map(item => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </section>

        <button
          className="divination-btn"
          disabled={!allFilled}
          onClick={handleDivination}
        >
          起卦
        </button>
      </main>
    </div>
  )
}
