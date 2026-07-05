import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { coinDivination } from '../core/divination-methods'
import { YaoMark } from '../components/HexagramGlyph'
import { isMovingYaoResult, yaoResultToYinYang } from '../components/hexagramGlyphUtils'
import type { LiuQin, YaoResult } from '../core/types'
import './ShakePage.css'

const YAO_NAMES = ['初', '二', '三', '四', '五', '上']
const LIU_QIN_OPTIONS: LiuQin[] = ['父母', '兄弟', '妻财', '官鬼', '子孙']

type MotionPermission = 'granted' | 'denied'

interface DeviceMotionEventWithPermissionConstructor {
  new(type: string, eventInitDict?: DeviceMotionEventInit): DeviceMotionEvent
  requestPermission?: () => Promise<MotionPermission>
}

function castCoinLine(): YaoResult {
  const bytes = new Uint8Array(3)
  window.crypto.getRandomValues(bytes)
  const sum = Array.from(bytes).reduce((total, value) => {
    return total + (value % 2 === 0 ? 2 : 3)
  }, 0)
  return sum as YaoResult
}

function resultLabel(value: YaoResult): string {
  switch (value) {
    case 6: return '老阴 动'
    case 7: return '少阳'
    case 8: return '少阴'
    case 9: return '老阳 动'
  }
}

export default function ShakePage() {
  const navigate = useNavigate()
  const [results, setResults] = useState<YaoResult[]>([])
  const [question, setQuestion] = useState('')
  const [yongShen, setYongShen] = useState<LiuQin | ''>('')
  const [isListening, setIsListening] = useState(false)
  const [motionMessage, setMotionMessage] = useState('')
  const lastShakeAt = useRef(0)

  const addLine = useCallback(() => {
    setResults(prev => {
      if (prev.length >= 6) return prev
      return [...prev, castCoinLine()]
    })
  }, [])

  const handleMotion = useCallback((event: DeviceMotionEvent) => {
    const acc = event.accelerationIncludingGravity
    if (!acc) return
    const x = acc.x ?? 0
    const y = acc.y ?? 0
    const z = acc.z ?? 0
    const magnitude = Math.sqrt(x * x + y * y + z * z)
    const now = Date.now()

    if (magnitude > 22 && now - lastShakeAt.current > 1200) {
      lastShakeAt.current = now
      addLine()
    }
  }, [addLine])

  useEffect(() => {
    if (!isListening) return
    window.addEventListener('devicemotion', handleMotion)
    return () => window.removeEventListener('devicemotion', handleMotion)
  }, [isListening, handleMotion])

  const handleListen = async () => {
    if (results.length >= 6) return

    if (!('DeviceMotionEvent' in window)) {
      setMotionMessage('当前浏览器不支持摇动传感器，请使用投一爻。')
      return
    }

    const motion = DeviceMotionEvent as unknown as DeviceMotionEventWithPermissionConstructor
    if (motion.requestPermission) {
      const permission = await motion.requestPermission()
      if (permission !== 'granted') {
        setMotionMessage('未获得传感器权限，请使用投一爻。')
        return
      }
    }

    setMotionMessage('已开始监听摇动，每次有效摇动生成一爻。')
    setIsListening(true)
  }

  const handleReset = () => {
    setResults([])
    setIsListening(false)
    setMotionMessage('')
  }

  const handleSubmit = () => {
    if (results.length !== 6) return
    const input = coinDivination(results)
    const params = new URLSearchParams({
      upper: input.upper,
      lower: input.lower,
      dongYao: input.dongYao.join(','),
      method: 'shake',
      date: input.date.toISOString(),
      yaoResults: results.join(','),
    })
    if (question.trim()) params.set('question', question.trim())
    if (yongShen) params.set('yongShen', yongShen)
    navigate(`/result?${params.toString()}`)
  }

  const handleBack = () => {
    navigate(-1)
  }

  const completed = results.length === 6

  return (
    <div className="shake-page">
      <header className="page-header">
        <button className="back-btn" onClick={handleBack} aria-label="返回">
          <span aria-hidden="true">&larr;</span>
        </button>
        <h1 className="page-title">摇动起卦</h1>
      </header>

      <main className="page-content">
        <section className="shake-card shake-board">
          <div className="shake-progress">
            <span>已成 {results.length}/6 爻</span>
            <span>{completed ? '可排盘' : `下一爻：${YAO_NAMES[results.length] ?? '-'}`}</span>
          </div>

          <div className="shake-lines">
            {[5, 4, 3, 2, 1, 0].map(index => {
              const value = results[index]
              const moving = value ? isMovingYaoResult(value) : false
              return (
                <div className={'shake-line' + (moving ? ' is-moving' : '')} key={index}>
                  <span className="shake-line-name">{YAO_NAMES[index]}</span>
                  <span className="shake-line-symbol">
                    {value ? (
                      <YaoMark yinYang={yaoResultToYinYang(value)} moving={moving} />
                    ) : (
                      <span className="shake-line-empty" aria-label="待定" />
                    )}
                  </span>
                  <span className="shake-line-label">{value ? resultLabel(value) : '待定'}</span>
                </div>
              )
            })}
          </div>

          <div className="shake-actions">
            <button
              className="shake-primary"
              onClick={addLine}
              disabled={completed}
            >
              投一爻
            </button>
            <button
              className="shake-secondary"
              onClick={handleListen}
              disabled={completed || isListening}
            >
              {isListening ? '监听中' : '摇动监听'}
            </button>
            <button className="shake-secondary" onClick={handleReset}>
              重置
            </button>
          </div>

          {motionMessage && <p className="shake-message">{motionMessage}</p>}
        </section>

        <section className="shake-card shake-context">
          <label className="shake-field">
            <span>占问事项</span>
            <input
              type="text"
              placeholder="请输入您想占问的事情……"
              value={question}
              onChange={e => setQuestion(e.target.value)}
            />
          </label>
          <label className="shake-field">
            <span>用神</span>
            <select
              value={yongShen}
              onChange={e => setYongShen(e.target.value as LiuQin | '')}
            >
              <option value="">自动推断</option>
              {LIU_QIN_OPTIONS.map(item => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
        </section>

        <button
          className="shake-submit"
          disabled={!completed}
          onClick={handleSubmit}
        >
          完成起卦
        </button>
      </main>
    </div>
  )
}
