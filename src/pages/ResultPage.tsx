import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getPalace } from '../core/palace'
import { wuxingRelation } from '../core/wuxing'
import { isChong, isHe } from '../core/ganzhi'
import { saveHistoryRecord } from '../utils/history'
import { buildPanFromSearch } from '../utils/panFromSearch'
import { YaoMark } from '../components/HexagramGlyph'
import type { YaoLine, Wuxing } from '../core/types'
import './ResultPage.css'

const YAO_POS = ['初', '二', '三', '四', '五', '上']

const WUXING_COLOR: Record<Wuxing, string> = {
  '金': '#A9823A',
  '木': '#2F7D52',
  '水': '#2E6EA5',
  '火': '#B7352D',
  '土': '#8E6A32',
}

interface SelKey {
  src: '本' | '变'
  idx: number
}

export default function ResultPage() {
  const [searchParams] = useSearchParams()
  const pan = useMemo(() => buildPanFromSearch(searchParams), [searchParams])
  const [sel, setSel] = useState<SelKey[]>([])

  useEffect(() => {
    if (!pan) return
    const params = searchParams.toString()
    saveHistoryRecord({
      title: pan.changed ? `${pan.original.info.name} 之 ${pan.changed.info.name}` : pan.original.info.name,
      subtitle: `${pan.time.yearGanZhi}年 ${pan.time.monthGanZhi}月 ${pan.time.dayGanZhi}日 ${pan.time.hourGanZhi}时`,
      method: searchParams.get('method') || 'unknown',
      question: pan.question,
      url: `/result?${params}`,
    })
  }, [pan, searchParams])

  const toggleYao = useCallback((sk: SelKey) => {
    setSel(prev => {
      const key = `${sk.src}:${sk.idx}`
      const prevKey = (s: SelKey) => `${s.src}:${s.idx}`
      if (prev.some(s => prevKey(s) === key)) return prev.filter(s => prevKey(s) !== key)
      if (prev.length >= 2) return [prev[1], sk]
      return [...prev, sk]
    })
  }, [])

  if (!pan) return <ErrorState />

  const originalTopDown = [...pan.original.yaoLines].reverse()
  const changedLines = pan.changed?.yaoLines ?? pan.original.yaoLines
  const changedTopDown = [...changedLines].reverse()

  const findYao = (sk: SelKey): YaoLine | undefined => {
    const list = sk.src === '本' ? pan.original.yaoLines : pan.changed?.yaoLines
    return list?.[sk.idx]
  }

  const selectedYaos = sel.map(findYao).filter(Boolean) as YaoLine[]
  const relation = selectedYaos.length === 2 ? getRelation(selectedYaos[0], selectedYaos[1]) : null
  const params = searchParams.toString()
  const relationActive = Boolean(relation)

  return (
    <div className={`result-page ${relationActive ? 'is-relating' : ''}`}>
      <div className="result-content">
        <header className="result-header">
          <Link to="/" className="result-back">返回</Link>
          <div>
            <h1>{pan.original.info.name}{pan.changed ? ` 之 ${pan.changed.info.name}` : ''}</h1>
            <p>{pan.time.yearGanZhi}年 {pan.time.monthGanZhi}月 {pan.time.dayGanZhi}日 {pan.time.hourGanZhi}时 · 日空 {pan.time.xunKong[0]}{pan.time.xunKong[1]}</p>
          </div>
        </header>

        <section className="result-hero">
          <div>
            <span className="result-label">本卦</span>
            <strong>{pan.original.info.name}</strong>
            <span>{pan.original.palace.palace}宫 · {pan.original.palace.position}</span>
          </div>
          <div>
            <span className="result-label">{pan.changed ? '变卦' : '静卦'}</span>
            <strong>{pan.changed ? pan.changed.info.name : pan.original.info.name}</strong>
            <span>{pan.changed ? `${getPalace(pan.changed.info.index).palace}宫` : '无动爻，卦体不变'}</span>
          </div>
        </section>

        <section className="pan-board">
          <div className="pan-board-head">
            <div className="pan-god-title">六神</div>
            <div className="pan-main-title">主卦【{pan.original.palace.palace}】{pan.original.info.name}</div>
            <div className="pan-changed-title">
              {pan.changed
                ? `变卦【${getPalace(pan.changed.info.index).palace}】${pan.changed.info.name}`
                : `静卦【${pan.original.palace.palace}】${pan.original.info.name}`}
            </div>
          </div>
          <div className="pan-lines">
            {originalTopDown.map((yao, displayIndex) => {
              const changedYao = changedTopDown[displayIndex]
              const changedMarked = pan.dongYaoIndices.includes(yao.index)
              return (
                <PanLineRow
                  key={yao.index}
                  original={yao}
                  changed={changedYao}
                  changedMarked={changedMarked}
                  selectedOriginal={isSelected(sel, '本', yao.index)}
                  selectedChanged={isSelected(sel, '变', yao.index)}
                  onSelectOriginal={() => toggleYao({ src: '本', idx: yao.index })}
                  onSelectChanged={() => toggleYao({ src: '变', idx: yao.index })}
                />
              )
            })}
          </div>
        </section>

        <p className="select-hint">先点一爻让它浮起，再点第二爻查看生克冲合。</p>

        <div className="result-actions">
          <Link to={`/analysis?${params}`} className="result-primary-action">AI 解析</Link>
          <Link to={`/debug?${params}`} className="result-secondary-action">排盘数据</Link>
        </div>
      </div>

      {relation && (
        <RelationOverlay
          left={selectedYaos[0]}
          right={selectedYaos[1]}
          relation={relation}
          onClose={() => setSel([])}
        />
      )}
    </div>
  )
}

function PanLineRow({
  original,
  changed,
  changedMarked,
  selectedOriginal,
  selectedChanged,
  onSelectOriginal,
  onSelectChanged,
}: {
  original: YaoLine
  changed: YaoLine
  changedMarked: boolean
  selectedOriginal: boolean
  selectedChanged: boolean
  onSelectOriginal: () => void
  onSelectChanged: () => void
}) {
  return (
    <div className="pan-line-row">
      <div className="pan-god">{original.liuShou}</div>
      <button
        className={`pan-yao-cell pan-main-cell ${selectedOriginal ? 'is-selected' : ''}`}
        onClick={onSelectOriginal}
      >
        <FuShen fuShen={original.fuShen} />
        <YaoMark yinYang={original.yinYang} moving={original.isDong} className="pan-yao-mark" />
        <YaoText yao={original} />
      </button>
      <button
        className={`pan-yao-cell pan-changed-cell ${selectedChanged ? 'is-selected' : ''} ${changedMarked ? 'is-changed' : ''}`}
        onClick={onSelectChanged}
      >
        <YaoMark yinYang={changed.yinYang} moving={false} className="pan-yao-mark" />
        <YaoText yao={changed} changed={changedMarked} />
      </button>
    </div>
  )
}

function FuShen({ fuShen }: { fuShen?: YaoLine['fuShen'] }) {
  if (!fuShen) return <span className="pan-fushen" aria-hidden="true" />

  return (
    <span className="pan-fushen">
      <b>{fuShen.liuQin}</b>
      <i style={{ color: WUXING_COLOR[fuShen.diZhiWuxing] }}>{fuShen.diZhi}{fuShen.diZhiWuxing}</i>
    </span>
  )
}

function YaoText({ yao, changed = false }: { yao: YaoLine; changed?: boolean }) {
  return (
    <span className="pan-yao-text">
      <span className="pan-liuqin">{yao.liuQin}</span>
      <span className="pan-dizhi" style={{ color: WUXING_COLOR[yao.diZhiWuxing] }}>
        {yao.diZhi}{yao.diZhiWuxing}
      </span>
      <span className="pan-flags">
        {yao.shiYing && <em>{yao.shiYing}</em>}
        {changed && <em>变</em>}
        {yao.isXunKong && <em>空</em>}
        {yao.isYuePo && <em>破</em>}
      </span>
    </span>
  )
}

function RelationOverlay({
  left,
  right,
  relation,
  onClose,
}: {
  left: YaoLine
  right: YaoLine
  relation: RelationView
  onClose: () => void
}) {
  const arrowClass = relation.direction === 'left' ? ' points-left'
    : relation.direction === 'both' ? ' points-both'
    : ''
  const actionText = relation.direction === 'both' ? `-${relation.action}-` : `-${relation.action}->`

  return (
    <div className="relation-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="relation-sheet" onClick={event => event.stopPropagation()}>
        <button className="relation-close" onClick={onClose} aria-label="关闭关系展示">×</button>
        <div className="relation-lineup">
          <MiniYao yao={left} side="left" />
          <div className={`relation-arrow${arrowClass}`}>
            <svg viewBox="0 0 180 42" aria-hidden="true">
              <defs>
                <marker id="arrow-head" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                  <path d="M0,0 L8,4 L0,8 Z" />
                </marker>
                <marker id="arrow-head-start" markerWidth="8" markerHeight="8" refX="1" refY="4" orient="auto">
                  <path d="M8,0 L0,4 L8,8 Z" />
                </marker>
              </defs>
              <line
                x1="16"
                y1="21"
                x2="164"
                y2="21"
                markerEnd={relation.direction !== 'left' ? 'url(#arrow-head)' : undefined}
                markerStart={relation.direction !== 'right' ? 'url(#arrow-head-start)' : undefined}
              />
            </svg>
            <strong className="relation-formula">
              <span style={{ color: WUXING_COLOR[relation.leftWuxing] }}>{relation.leftWuxing}</span>
              <em>{actionText}</em>
              <span style={{ color: WUXING_COLOR[relation.rightWuxing] }}>{relation.rightWuxing}</span>
            </strong>
            {relation.tags.length > 0 && <span>{relation.tags.join(' · ')}</span>}
          </div>
          <MiniYao yao={right} side="right" />
        </div>
      </div>
    </div>
  )
}

function MiniYao({ yao, side }: { yao: YaoLine; side: 'left' | 'right' }) {
  return (
    <div className={`mini-yao from-${side}`}>
      <span>{YAO_POS[yao.index]}爻</span>
      <YaoMark yinYang={yao.yinYang} moving={yao.isDong} compact />
      <strong>{yao.liuQin}</strong>
      <b className="mini-yao-branch" style={{ color: WUXING_COLOR[yao.diZhiWuxing] }}>
        {yao.diZhi}{yao.diZhiWuxing}
      </b>
    </div>
  )
}

interface RelationView {
  primary: string
  action: '生' | '克' | '比和'
  leftWuxing: Wuxing
  rightWuxing: Wuxing
  tags: string[]
  direction: 'right' | 'left' | 'both'
}

function getRelation(a: YaoLine, b: YaoLine): RelationView {
  const rel = wuxingRelation(a.diZhiWuxing, b.diZhiWuxing)
  const tags: string[] = []
  let primary = '比和'
  let action: RelationView['action'] = '比和'
  let direction: RelationView['direction'] = 'both'
  let leftWuxing = a.diZhiWuxing
  let rightWuxing = b.diZhiWuxing

  if (rel === 'A生B') {
    primary = `${a.diZhiWuxing}生${b.diZhiWuxing}`
    action = '生'
    direction = 'right'
  } else if (rel === 'A克B') {
    primary = `${a.diZhiWuxing}克${b.diZhiWuxing}`
    action = '克'
    direction = 'right'
  } else if (rel === 'B生A') {
    primary = `${b.diZhiWuxing}生${a.diZhiWuxing}`
    action = '生'
    direction = 'left'
    leftWuxing = b.diZhiWuxing
    rightWuxing = a.diZhiWuxing
  } else if (rel === 'B克A') {
    primary = `${b.diZhiWuxing}克${a.diZhiWuxing}`
    action = '克'
    direction = 'left'
    leftWuxing = b.diZhiWuxing
    rightWuxing = a.diZhiWuxing
  }

  if (isChong(a.diZhi, b.diZhi)) tags.push('六冲')
  const heWx = isHe(a.diZhi, b.diZhi)
  if (heWx) tags.push(`六合化${heWx}`)

  return { primary, action, leftWuxing, rightWuxing, tags, direction }
}

function isSelected(sel: SelKey[], src: '本' | '变', idx: number): boolean {
  return sel.some(item => item.src === src && item.idx === idx)
}

function ErrorState() {
  return (
    <div className="result-error">
      <Link to="/" className="result-back">返回</Link>
      <p>排盘参数异常，请重新起卦。</p>
    </div>
  )
}
