import type { TrigramName, YinYang } from '../core/types'
import './HexagramGlyph.css'

const TRIGRAM_PATTERNS: Record<TrigramName, [YinYang, YinYang, YinYang]> = {
  乾: ['阳', '阳', '阳'],
  兑: ['阳', '阳', '阴'],
  离: ['阳', '阴', '阳'],
  震: ['阳', '阴', '阴'],
  巽: ['阴', '阳', '阳'],
  坎: ['阴', '阳', '阴'],
  艮: ['阴', '阴', '阳'],
  坤: ['阴', '阴', '阴'],
}

interface YaoMarkProps {
  yinYang: YinYang
  moving?: boolean
  compact?: boolean
  className?: string
}

export function YaoMark({ yinYang, moving = false, compact = false, className = '' }: YaoMarkProps) {
  const width = compact ? 54 : 66
  const height = compact ? 12 : 16
  const barHeight = compact ? 5 : 6
  const y = (height - barHeight) / 2
  const gap = compact ? 10 : 12
  const half = (width - gap) / 2

  return (
    <svg
      className={`yao-mark ${moving ? 'is-moving' : ''} ${className}`}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${yinYang}${moving ? '动爻' : '爻'}`}
    >
      {yinYang === '阳' ? (
        <rect x="0" y={y} width={width} height={barHeight} rx={barHeight / 2} />
      ) : (
        <>
          <rect x="0" y={y} width={half} height={barHeight} rx={barHeight / 2} />
          <rect x={half + gap} y={y} width={half} height={barHeight} rx={barHeight / 2} />
        </>
      )}
      {moving && (
        <circle
          className="yao-moving-dot"
          cx={width - 4}
          cy={height / 2}
          r={compact ? 2.2 : 2.8}
        />
      )}
    </svg>
  )
}

interface TrigramMarkProps {
  trigram: TrigramName
  className?: string
}

export function TrigramMark({ trigram, className = '' }: TrigramMarkProps) {
  const pattern = TRIGRAM_PATTERNS[trigram]

  return (
    <span className={`trigram-mark ${className}`} aria-label={`${trigram}卦`}>
      {[2, 1, 0].map(index => (
        <YaoMark
          key={index}
          yinYang={pattern[index]}
          compact
          className="trigram-mark-line"
        />
      ))}
    </span>
  )
}
