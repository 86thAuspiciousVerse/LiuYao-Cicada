// ============================================================
// 六十四卦全表 + 上下卦查找模块
// src/core/ 零依赖原则 — 纯 TypeScript 纯函数
// ============================================================

import type { TrigramName, HexagramInfo } from './types';

/**
 * 六十四卦完整表 (按《周易》通行本顺序, 索引 1-64)
 *
 * Unicode 卦符:
 * ䷀乾 ䷁坤 ䷂屯 ䷃蒙 ䷄需 ䷅讼 ䷆师 ䷇比
 * ䷈小畜 ䷉履 ䷊泰 ䷋否 ䷌同人 ䷍大有 ䷎谦 ䷏豫
 * ䷐随 ䷑蛊 ䷒临 ䷓观 ䷔噬嗑 ䷕贲 ䷖剥 ䷗复
 * ䷘无妄 ䷙大畜 ䷚颐 ䷛大过 ䷜坎 ䷝离 ䷞咸 ䷟恒
 * ䷠遁 ䷡大壮 ䷢晋 ䷣明夷 ䷤家人 ䷥睽 ䷦蹇 ䷧解
 * ䷨损 ䷩益 ䷪夬 ䷫姤 ䷬萃 ䷭升 ䷮困 ䷯井
 * ䷰革 ䷱鼎 ䷲震 ䷳艮 ䷴渐 ䷵归妹 ䷶丰 ䷷旅
 * ䷸巽 ䷹兑 ䷺涣 ䷻节 ䷼中孚 ䷽小过 ䷾既济 ䷿未济
 */
export const HEXAGRAM_TABLE: HexagramInfo[] = [
  // 1-8
  { index: 1, name: '乾为天',   upper: '乾', lower: '乾', symbol: '䷀' },
  { index: 2, name: '坤为地',   upper: '坤', lower: '坤', symbol: '䷁' },
  { index: 3, name: '水雷屯',   upper: '坎', lower: '震', symbol: '䷂' },
  { index: 4, name: '山水蒙',   upper: '艮', lower: '坎', symbol: '䷃' },
  { index: 5, name: '水天需',   upper: '坎', lower: '乾', symbol: '䷄' },
  { index: 6, name: '天水讼',   upper: '乾', lower: '坎', symbol: '䷅' },
  { index: 7, name: '地水师',   upper: '坤', lower: '坎', symbol: '䷆' },
  { index: 8, name: '水地比',   upper: '坎', lower: '坤', symbol: '䷇' },
  // 9-16
  { index: 9, name: '风天小畜', upper: '巽', lower: '乾', symbol: '䷈' },
  { index: 10, name: '天泽履',  upper: '乾', lower: '兑', symbol: '䷉' },
  { index: 11, name: '地天泰',  upper: '坤', lower: '乾', symbol: '䷊' },
  { index: 12, name: '天地否',  upper: '乾', lower: '坤', symbol: '䷋' },
  { index: 13, name: '天火同人', upper: '乾', lower: '离', symbol: '䷌' },
  { index: 14, name: '火天大有', upper: '离', lower: '乾', symbol: '䷍' },
  { index: 15, name: '地山谦',  upper: '坤', lower: '艮', symbol: '䷎' },
  { index: 16, name: '雷地豫',  upper: '震', lower: '坤', symbol: '䷏' },
  // 17-24
  { index: 17, name: '泽雷随',  upper: '兑', lower: '震', symbol: '䷐' },
  { index: 18, name: '山风蛊',  upper: '艮', lower: '巽', symbol: '䷑' },
  { index: 19, name: '地泽临',  upper: '坤', lower: '兑', symbol: '䷒' },
  { index: 20, name: '风地观',  upper: '巽', lower: '坤', symbol: '䷓' },
  { index: 21, name: '火雷噬嗑', upper: '离', lower: '震', symbol: '䷔' },
  { index: 22, name: '山火贲',  upper: '艮', lower: '离', symbol: '䷕' },
  { index: 23, name: '山地剥',  upper: '艮', lower: '坤', symbol: '䷖' },
  { index: 24, name: '地雷复',  upper: '坤', lower: '震', symbol: '䷗' },
  // 25-32
  { index: 25, name: '天雷无妄', upper: '乾', lower: '震', symbol: '䷘' },
  { index: 26, name: '山天大畜', upper: '艮', lower: '乾', symbol: '䷙' },
  { index: 27, name: '山雷颐',  upper: '艮', lower: '震', symbol: '䷚' },
  { index: 28, name: '泽风大过', upper: '兑', lower: '巽', symbol: '䷛' },
  { index: 29, name: '坎为水',  upper: '坎', lower: '坎', symbol: '䷜' },
  { index: 30, name: '离为火',  upper: '离', lower: '离', symbol: '䷝' },
  { index: 31, name: '泽山咸',  upper: '兑', lower: '艮', symbol: '䷞' },
  { index: 32, name: '雷风恒',  upper: '震', lower: '巽', symbol: '䷟' },
  // 33-40
  { index: 33, name: '天山遁',  upper: '乾', lower: '艮', symbol: '䷠' },
  { index: 34, name: '雷天大壮', upper: '震', lower: '乾', symbol: '䷡' },
  { index: 35, name: '火地晋',  upper: '离', lower: '坤', symbol: '䷢' },
  { index: 36, name: '地火明夷', upper: '坤', lower: '离', symbol: '䷣' },
  { index: 37, name: '风火家人', upper: '巽', lower: '离', symbol: '䷤' },
  { index: 38, name: '火泽睽',  upper: '离', lower: '兑', symbol: '䷥' },
  { index: 39, name: '水山蹇',  upper: '坎', lower: '艮', symbol: '䷦' },
  { index: 40, name: '雷水解',  upper: '震', lower: '坎', symbol: '䷧' },
  // 41-48
  { index: 41, name: '山泽损',  upper: '艮', lower: '兑', symbol: '䷨' },
  { index: 42, name: '风雷益',  upper: '巽', lower: '震', symbol: '䷩' },
  { index: 43, name: '泽天夬',  upper: '兑', lower: '乾', symbol: '䷪' },
  { index: 44, name: '天风姤',  upper: '乾', lower: '巽', symbol: '䷫' },
  { index: 45, name: '泽地萃',  upper: '兑', lower: '坤', symbol: '䷬' },
  { index: 46, name: '地风升',  upper: '坤', lower: '巽', symbol: '䷭' },
  { index: 47, name: '泽水困',  upper: '兑', lower: '坎', symbol: '䷮' },
  { index: 48, name: '水风井',  upper: '坎', lower: '巽', symbol: '䷯' },
  // 49-56
  { index: 49, name: '泽火革',  upper: '兑', lower: '离', symbol: '䷰' },
  { index: 50, name: '火风鼎',  upper: '离', lower: '巽', symbol: '䷱' },
  { index: 51, name: '震为雷',  upper: '震', lower: '震', symbol: '䷲' },
  { index: 52, name: '艮为山',  upper: '艮', lower: '艮', symbol: '䷳' },
  { index: 53, name: '风山渐',  upper: '巽', lower: '艮', symbol: '䷴' },
  { index: 54, name: '雷泽归妹', upper: '震', lower: '兑', symbol: '䷵' },
  { index: 55, name: '雷火丰',  upper: '震', lower: '离', symbol: '䷶' },
  { index: 56, name: '火山旅',  upper: '离', lower: '艮', symbol: '䷷' },
  // 57-64
  { index: 57, name: '巽为风',  upper: '巽', lower: '巽', symbol: '䷸' },
  { index: 58, name: '兑为泽',  upper: '兑', lower: '兑', symbol: '䷹' },
  { index: 59, name: '风水涣',  upper: '巽', lower: '坎', symbol: '䷺' },
  { index: 60, name: '水泽节',  upper: '坎', lower: '兑', symbol: '䷻' },
  { index: 61, name: '风泽中孚', upper: '巽', lower: '兑', symbol: '䷼' },
  { index: 62, name: '雷山小过', upper: '震', lower: '艮', symbol: '䷽' },
  { index: 63, name: '水火既济', upper: '坎', lower: '离', symbol: '䷾' },
  { index: 64, name: '火水未济', upper: '离', lower: '坎', symbol: '䷿' },
];

/** 构建上卦+下卦→HexagramInfo 的快速查找表 */
const HEXAGRAM_LOOKUP: Record<string, HexagramInfo> = {};
for (const h of HEXAGRAM_TABLE) {
  const key = `${h.upper}:${h.lower}`;
  HEXAGRAM_LOOKUP[key] = h;
}

/**
 * 根据上卦(外卦)和下卦(内卦)查找对应的六十四卦
 * @throws 若找不到对应的卦（理论上不应发生）
 */
export function lookupHexagram(upper: TrigramName, lower: TrigramName): HexagramInfo {
  const key = `${upper}:${lower}`;
  const result = HEXAGRAM_LOOKUP[key];
  if (!result) {
    throw new Error(`没有找到上卦${upper}下卦${lower}对应的卦`);
  }
  return result;
}
