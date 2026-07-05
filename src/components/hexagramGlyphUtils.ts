import type { YaoResult, YinYang } from '../core/types'

export function yaoResultToYinYang(result: YaoResult): YinYang {
  return result === 6 || result === 8 ? '阴' : '阳'
}

export function isMovingYaoResult(result: YaoResult): boolean {
  return result === 6 || result === 9
}
