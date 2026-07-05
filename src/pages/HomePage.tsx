import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { clearHistoryRecords, getHistoryRecords, type HistoryRecord } from '../utils/history'
import './HomePage.css'

const CARDS = [
  { mark: '手', title: '手动起卦', desc: '逐爻选择老少阴阳', path: '/manual' },
  { mark: '时', title: '时间起卦', desc: '基于农历年月日时', path: '/time' },
  { mark: '数', title: '数字起卦', desc: '输入数字快速成卦', path: '/number' },
]

export default function HomePage() {
  const navigate = useNavigate()
  const [history, setHistory] = useState<HistoryRecord[]>(() => getHistoryRecords())

  const handleClearHistory = () => {
    clearHistoryRecords()
    setHistory([])
  }

  return (
    <div className="home">
      <header className="home-header">
        <p className="home-subtitle">六爻蝉</p>
        <h1 className="home-title">起卦</h1>
      </header>
      <div className="home-cards">
        {CARDS.map((card) => (
          <button
            key={card.path}
            className="home-card"
            onClick={() => navigate(card.path)}
          >
            <span className="home-card-mark">{card.mark}</span>
            <div className="home-card-text">
              <span className="home-card-title">{card.title}</span>
              <span className="home-card-desc">{card.desc}</span>
            </div>
          </button>
        ))}
      </div>

      {history.length > 0 && (
        <section className="home-history">
          <div className="home-history-head">
            <h2>最近排盘</h2>
            <button onClick={handleClearHistory}>清空</button>
          </div>
          <div className="home-history-list">
            {history.slice(0, 5).map(record => (
              <button
                key={record.id}
                className="home-history-item"
                onClick={() => navigate(record.url)}
              >
                <span className="home-history-title">{record.title}</span>
                <span className="home-history-subtitle">
                  {record.question || record.subtitle}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
