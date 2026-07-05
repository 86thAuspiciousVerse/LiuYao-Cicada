// ============================================================
// 五行生克关系模块
// src/core/ 零依赖原则 — 纯 TypeScript 纯函数
// ============================================================

import type { Wuxing, DiZhi, WuxingRelation } from './types';

/** 五行列表 */
export const WUXING_LIST = ['金', '木', '水', '火', '土'] as const;

// ---------- 生克映射表 ----------

/** 相生关系: 金→水→木→火→土→金 */
const SHENG_MAP: Record<Wuxing, Wuxing> = {
  金: '水',
  水: '木',
  木: '火',
  火: '土',
  土: '金',
};

/** 相克关系: 金→木→土→水→火→金 */
const KE_MAP: Record<Wuxing, Wuxing> = {
  金: '木',
  木: '土',
  土: '水',
  水: '火',
  火: '金',
};

/** 地支五行对照: 亥子水, 寅卯木, 巳午火, 申酉金, 辰戌丑未土 */
const DIZHI_WUXING_MAP: Record<DiZhi, Wuxing> = {
  子: '水',
  丑: '土',
  寅: '木',
  卯: '木',
  辰: '土',
  巳: '火',
  午: '火',
  未: '土',
  申: '金',
  酉: '金',
  戌: '土',
  亥: '水',
};

// ---------- 公开函数 ----------

/**
 * 判断五行 A 是否生 B
 * @returns true 如果 A 生 B
 */
export function isSheng(a: Wuxing, b: Wuxing): boolean {
  return SHENG_MAP[a] === b;
}

/**
 * 判断五行 A 是否克 B
 * @returns true 如果 A 克 B
 */
export function isKe(a: Wuxing, b: Wuxing): boolean {
  return KE_MAP[a] === b;
}

/**
 * 返回两个五行之间的生克关系描述
 * @returns 'A生B' | 'A克B' | 'B生A' | 'B克A' | '比和'
 */
export function wuxingRelation(a: Wuxing, b: Wuxing): WuxingRelation {
  if (a === b) return '比和';
  if (isSheng(a, b)) return 'A生B';
  if (isSheng(b, a)) return 'B生A';
  if (isKe(a, b)) return 'A克B';
  // isKe(b, a) 必然成立
  return 'B克A';
}

/**
 * 获取地支对应的五行
 * 亥子=水, 寅卯=木, 巳午=火, 申酉=金, 辰戌丑未=土
 */
export function diZhiWuxing(dz: DiZhi): Wuxing {
  return DIZHI_WUXING_MAP[dz];
}
