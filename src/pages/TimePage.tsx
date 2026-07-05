import { useNavigate } from 'react-router-dom'
import { useState, useMemo } from 'react'
import { Solar } from 'lunar-typescript'
import { timeDivination } from '../core/divination-methods'
import type { LiuQin } from '../core/types'
import './TimePage.css'

const LIU_QIN_OPTIONS: LiuQin[] = ['父母', '兄弟', '妻财', '官鬼', '子孙']

export default function TimePage() {
  const navigate = useNavigate()
  const [question, setQuestion] = useState('')
  const [yongShen, setYongShen] = useState<LiuQin | ''>('')
  const [useCustomDate, setUseCustomDate] = useState(false)

  // 将 Date 格式化为 datetime-local 所需的 YYYY-MM-DDTHH:mm 格式
  const formatLocalDateTime = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const h = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    return `${y}-${m}-${day}T${h}:${min}`
  }

  const now = new Date()
  const [customDate, setCustomDate] = useState<string>(formatLocalDateTime(now))

  // 根据 useCustomDate 获取当前起卦时间对应的 Date 对象
  const getActiveDate = (): Date => {
    return useCustomDate ? new Date(customDate) : new Date()
  }

  const lunarInfo = useMemo(() => {
    const solar = Solar.fromDate(getActiveDate())
    const lunar = solar.getLunar()
    return {
      dateStr: `${lunar.getYearInChinese()}年${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
      yearGanZhi: lunar.getYearInGanZhi(),
      monthGanZhi: lunar.getMonthInGanZhi(),
      dayGanZhi: lunar.getDayInGanZhi(),
      hourGanZhi: lunar.getTimeInGanZhi(),
      yueJian: lunar.getMonthZhi(),
      riChen: lunar.getDayZhi(),
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customDate, useCustomDate])

  const handleDivination = () => {
    const input = useCustomDate ? timeDivination(new Date(customDate)) : timeDivination()
    const params = new URLSearchParams({
      upper: input.upper,
      lower: input.lower,
      dongYao: input.dongYao.join(','),
      method: 'time',
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
    <div className="time-page">
      <header className="page-header">
        <button className="back-btn" onClick={handleBack} aria-label="返回">
          <span aria-hidden="true">&larr;</span>
        </button>
        <h1 className="page-title">时间起卦</h1>
      </header>

      <main className="page-content">
        <section className="card lunar-card">
          <h2 className="card-title">
            <span className="card-title-accent" />
            农历信息
          </h2>
          <dl className="lunar-grid">
            <div className="lunar-item">
              <dt>农历</dt>
              <dd>{lunarInfo.dateStr}</dd>
            </div>
            <div className="lunar-item">
              <dt>年柱</dt>
              <dd>{lunarInfo.yearGanZhi}</dd>
            </div>
            <div className="lunar-item">
              <dt>月柱</dt>
              <dd>{lunarInfo.monthGanZhi}</dd>
            </div>
            <div className="lunar-item">
              <dt>日柱</dt>
              <dd>{lunarInfo.dayGanZhi}</dd>
            </div>
            <div className="lunar-item">
              <dt>时柱</dt>
              <dd>{lunarInfo.hourGanZhi}</dd>
            </div>
            <div className="lunar-item lunar-item--highlight">
              <dt>月建</dt>
              <dd>{lunarInfo.yueJian}</dd>
            </div>
            <div className="lunar-item lunar-item--highlight">
              <dt>日辰</dt>
              <dd>{lunarInfo.riChen}</dd>
            </div>
          </dl>
        </section>

        <section className="card date-picker-card">
          <h2 className="card-title">
            <span className="card-title-accent" />
            起卦时间
          </h2>

          <label className="toggle-label">
            <input
              type="checkbox"
              className="toggle-input"
              checked={useCustomDate}
              onChange={e => setUseCustomDate(e.target.checked)}
            />
            <span className="toggle-track">
              <span className="toggle-thumb" />
            </span>
            <span className="toggle-text">指定日期</span>
          </label>

          {useCustomDate ? (
            <input
              type="datetime-local"
              className="input-field"
              value={customDate}
              onChange={e => setCustomDate(e.target.value)}
            />
          ) : (
            <p className="hint-text">使用当前时间起卦</p>
          )}
        </section>

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

        <button className="divination-btn" onClick={handleDivination}>
          起卦
        </button>
      </main>
    </div>
  )
}
