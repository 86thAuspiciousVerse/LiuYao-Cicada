// ============================================================
// 天干地支 + 六冲六合三合刑害关系表
// src/core/ 零依赖原则 — 纯 TypeScript 纯函数
// ============================================================

import type { TianGan, DiZhi, Wuxing } from './types';

/** 十天干 */
export const TIANGAN: TianGan[] = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

/** 十二地支 */
export const DIZHI: DiZhi[] = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// ---------- 关系对照表 ----------

/** 地支六冲: 子午冲, 丑未冲, 寅申冲, 卯酉冲, 辰戌冲, 巳亥冲 */
export const LIU_CHONG: [DiZhi, DiZhi][] = [
  ['子', '午'],
  ['丑', '未'],
  ['寅', '申'],
  ['卯', '酉'],
  ['辰', '戌'],
  ['巳', '亥'],
];

/** 地支六合: [地支1, 地支2, 合化五行] */
export const LIU_HE: [DiZhi, DiZhi, Wuxing][] = [
  ['子', '丑', '土'],
  ['寅', '亥', '木'],
  ['卯', '戌', '火'],
  ['辰', '酉', '金'],
  ['巳', '申', '水'],
  ['午', '未', '火'],
];

/** 地支三合: [地支1, 地支2, 地支3, 合化五行] */
export const SAN_HE: [DiZhi, DiZhi, DiZhi, Wuxing][] = [
  ['申', '子', '辰', '水'],
  ['亥', '卯', '未', '木'],
  ['寅', '午', '戌', '火'],
  ['巳', '酉', '丑', '金'],
];

/** 地支六害: 子未害, 丑午害, 寅巳害, 卯辰害, 申亥害, 酉戌害 */
export const LIU_HAI: [DiZhi, DiZhi][] = [
  ['子', '未'],
  ['丑', '午'],
  ['寅', '巳'],
  ['卯', '辰'],
  ['申', '亥'],
  ['酉', '戌'],
];

/** 地支三刑: 子卯刑(无礼), 寅巳申刑(无恩), 丑戌未刑(恃势), 辰午酉亥自刑 */
export const SAN_XING: DiZhi[][] = [
  ['子', '卯'],          // 无礼之刑
  ['寅', '巳', '申'],    // 无恩之刑
  ['丑', '戌', '未'],    // 恃势之刑
  ['辰'],                // 自刑
  ['午'],                // 自刑
  ['酉'],                // 自刑
  ['亥'],                // 自刑
];

// ---------- 内部工具 ----------

/** 天干 → 索引 (0-9) */
const TIANGAN_INDEX: Record<TianGan, number> = {
  甲: 0, 乙: 1, 丙: 2, 丁: 3, 戊: 4,
  己: 5, 庚: 6, 辛: 7, 壬: 8, 癸: 9,
};

/** 地支 → 索引 (0-11) */
const DIZHI_INDEX: Record<DiZhi, number> = {
  子: 0, 丑: 1, 寅: 2, 卯: 3, 辰: 4, 巳: 5,
  午: 6, 未: 7, 申: 8, 酉: 9, 戌: 10, 亥: 11,
};

/** 六冲快速查找: 双向编码 */
const CHONG_SET: ReadonlySet<string> = new Set(
  LIU_CHONG.flatMap(([a, b]) => [`${a}${b}`, `${b}${a}`])
);

/** 六合快速查找: 键为 "地支1地支2" 和 "地支2地支1", 值为合化五行 */
const HE_MAP: Record<string, Wuxing> = {};
for (const [a, b, w] of LIU_HE) {
  HE_MAP[`${a}${b}`] = w;
  HE_MAP[`${b}${a}`] = w;
}

/**
 * 计算日干支在六十甲子中的索引 (0-59)
 * 六十甲子: 甲子=0, 乙丑=1, ..., 癸亥=59
 */
function getGanZhiIndex(tianGan: TianGan, diZhi: DiZhi): number {
  const ganIdx = TIANGAN_INDEX[tianGan];
  const zhiIdx = DIZHI_INDEX[diZhi];
  // 遍历 0-59 找到满足 n%10===ganIdx && n%12===zhiIdx 的 n
  for (let i = 0; i < 60; i++) {
    if (i % 10 === ganIdx && i % 12 === zhiIdx) {
      return i;
    }
  }
  // 正常不会执行到这里（天干地支组合在六十甲子中必然有且只有一个解）
  return -1;
}

// ---------- 公开函数 ----------

/**
 * 判断两个地支是否有冲关系
 */
export function isChong(a: DiZhi, b: DiZhi): boolean {
  return CHONG_SET.has(`${a}${b}`);
}

/**
 * 判断两个地支是否有六合关系
 * @returns 合化五行, 若不合则返回 null
 */
export function isHe(a: DiZhi, b: DiZhi): Wuxing | null {
  return HE_MAP[`${a}${b}`] ?? null;
}

/**
 * 判断动爻进退神
 * 经典六爻进神/退神仅发生于同五行连续位移:
 * 进神: 寅→卯(木), 巳→午(火), 申→酉(金), 亥→子(水)
 * 退神: 卯→寅, 午→巳, 酉→申, 子→亥
 * 土(辰戌丑未)无进退。
 */
export function jinTuiShen(before: DiZhi, after: DiZhi): '进神' | '退神' | null {
  const JIN_TUI_MAP: Record<string, '进神' | '退神'> = {
    '寅卯': '进神', '巳午': '进神', '申酉': '进神', '亥子': '进神',
    '卯寅': '退神', '午巳': '退神', '酉申': '退神', '子亥': '退神',
  };
  return JIN_TUI_MAP[`${before}${after}`] ?? null;
}

/**
 * 根据日干获取六兽起首的偏移量
 * 甲乙→0, 丙丁→1, 戊→2, 己→3, 庚辛→4, 壬癸→5
 */
export function liuShouOffset(riGan: TianGan): number {
  const idx = TIANGAN_INDEX[riGan];
  // 甲乙(0-1)→0, 丙丁(2-3)→1, 戊(4)→2, 己(5)→3, 庚辛(6-7)→4, 壬癸(8-9)→5
  if (idx <= 1) return 0;
  if (idx <= 3) return 1;
  if (idx === 4) return 2;
  if (idx === 5) return 3;
  if (idx <= 7) return 4;
  return 5; // idx 8-9
}

/**
 * 六甲旬空: 输入日干支(如 '丙午'), 返回旬空的两个地支
 *
 * 算法:
 * 1. 将日干支转换为六十甲子索引
 * 2. 找到所属的旬起点（最近的甲日）
 * 3. 旬起点的地支 +10、+11 (mod 12) 即为旬空
 */
export function getXunKong(dayGanZhi: string): [DiZhi, DiZhi] {
  const tianGan = dayGanZhi[0] as TianGan;
  const diZhi = dayGanZhi[1] as DiZhi;

  const dayIndex = getGanZhiIndex(tianGan, diZhi);
  // 旬起点: 最近的甲日 (索引为 10 的倍数)
  const xunStart = Math.floor(dayIndex / 10) * 10;
  // 旬空为旬起点之后的第 10、11 个地支
  const kong1 = DIZHI[(xunStart + 10) % 12];
  const kong2 = DIZHI[(xunStart + 11) % 12];

  return [kong1, kong2];
}
