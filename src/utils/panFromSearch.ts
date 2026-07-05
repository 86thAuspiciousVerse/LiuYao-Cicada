import { numberDivination, twoNumberDivination } from '../core/divination-methods'
import { paipan } from '../core/paipan'
import type { DivinationInput, HexagramPan, LiuQin, TrigramName } from '../core/types'

const LIU_QIN_OPTIONS: LiuQin[] = ['父母', '兄弟', '妻财', '官鬼', '子孙']

export function buildPanFromSearch(sp: URLSearchParams): HexagramPan | null {
  try {
    const date = sp.get('date') ? new Date(sp.get('date')!) : new Date()
    const question = sp.get('question') || undefined
    const yongShen = parseLiuQin(sp.get('yongShen'))

    const upper = sp.get('upper') as TrigramName
    const lower = sp.get('lower') as TrigramName
    if (upper && lower) {
      const dongYao = (sp.get('dongYao') || '').split(',').filter(Boolean).map(Number)
      return paipan({ upper, lower, dongYao, date, question, yongShen })
    }

    const n1 = Number(sp.get('n1'))
    const n2 = Number(sp.get('n2'))
    if (!Number.isNaN(n1) && !Number.isNaN(n2)) {
      const n3 = sp.get('n3')
      const input = n3 !== null
        ? numberDivination(n1, n2, Number(n3), date)
        : twoNumberDivination(n1, n2, date)
      if (question) (input as DivinationInput).question = question
      if (yongShen) (input as DivinationInput).yongShen = yongShen
      return paipan(input)
    }

    return null
  } catch {
    return null
  }
}

function parseLiuQin(value: string | null): LiuQin | undefined {
  if (!value) return undefined
  return LIU_QIN_OPTIONS.includes(value as LiuQin) ? value as LiuQin : undefined
}
