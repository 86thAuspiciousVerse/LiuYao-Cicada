// ============================================================
// 八宫卦序 + 宫五行 + 世应位置模块
// src/core/ 零依赖原则 — 纯 TypeScript 纯函数
// ============================================================

import type { TrigramName, Wuxing, PalaceInfo } from './types';

// ---------- 宫位名称与五行 ----------

/** 八宫名称列表 */
export const PALACE_NAMES: TrigramName[] = ['乾', '震', '坎', '艮', '坤', '巽', '离', '兑'];

/** 八宫五行: 乾兑金, 震巽木, 坎水, 离火, 艮坤土 */
export const PALACE_WUXING: Record<TrigramName, Wuxing> = {
  乾: '金',
  兑: '金',
  离: '火',
  震: '木',
  巽: '木',
  坎: '水',
  艮: '土',
  坤: '土',
};

// ---------- 世应位置常量 ----------

/** 世爻位置 (0-5 对应初-上), 按位置类型: 本宫→5, 一世→0, 二世→1, 三世→2, 四世→3, 五世→4, 游魂→3, 归魂→2 */
const SHI_YAO_POSITION: Record<string, number> = {
  '本宫': 5,
  '一世': 0,
  '二世': 1,
  '三世': 2,
  '四世': 3,
  '五世': 4,
  '游魂': 3,
  '归魂': 2,
} as const;

/** 根据世爻索引计算应爻索引: 应爻 = 世爻 + 3 (模 6) */
function getYingYaoIndex(shiYaoIndex: number): number {
  return (shiYaoIndex + 3) % 6;
}

// ---------- 八宫六十四卦完整排列 ----------

/**
 * 八宫六十四卦排列 (按京房八宫卦序)
 *
 * 每宫 8 卦顺序: 本宫 → 一世 → 二世 → 三世 → 四世 → 五世 → 游魂 → 归魂
 */
interface PalaceEntry {
  hexagramIndex: number;  // 对应 HEXAGRAM_TABLE 索引 1-64
  position: '本宫' | '一世' | '二世' | '三世' | '四世' | '五世' | '游魂' | '归魂';
}

/** 八宫各自的 8 卦索引 */
const PALACE_HEXAGRAMS: Record<TrigramName, PalaceEntry[]> = {
  乾: [
    { hexagramIndex: 1,  position: '本宫' },  // 乾为天
    { hexagramIndex: 44, position: '一世' },  // 天风姤
    { hexagramIndex: 33, position: '二世' },  // 天山遁
    { hexagramIndex: 12, position: '三世' },  // 天地否
    { hexagramIndex: 20, position: '四世' },  // 风地观
    { hexagramIndex: 23, position: '五世' },  // 山地剥
    { hexagramIndex: 35, position: '游魂' },  // 火地晋
    { hexagramIndex: 14, position: '归魂' },  // 火天大有
  ],
  震: [
    { hexagramIndex: 51, position: '本宫' },  // 震为雷
    { hexagramIndex: 16, position: '一世' },  // 雷地豫
    { hexagramIndex: 40, position: '二世' },  // 雷水解
    { hexagramIndex: 32, position: '三世' },  // 雷风恒
    { hexagramIndex: 46, position: '四世' },  // 地风升
    { hexagramIndex: 48, position: '五世' },  // 水风井
    { hexagramIndex: 28, position: '游魂' },  // 泽风大过
    { hexagramIndex: 17, position: '归魂' },  // 泽雷随
  ],
  坎: [
    { hexagramIndex: 29, position: '本宫' },  // 坎为水
    { hexagramIndex: 60, position: '一世' },  // 水泽节
    { hexagramIndex: 3,  position: '二世' },  // 水雷屯
    { hexagramIndex: 63, position: '三世' },  // 水火既济
    { hexagramIndex: 49, position: '四世' },  // 泽火革
    { hexagramIndex: 55, position: '五世' },  // 雷火丰
    { hexagramIndex: 36, position: '游魂' },  // 地火明夷
    { hexagramIndex: 7,  position: '归魂' },  // 地水师
  ],
  艮: [
    { hexagramIndex: 52, position: '本宫' },  // 艮为山
    { hexagramIndex: 22, position: '一世' },  // 山火贲
    { hexagramIndex: 26, position: '二世' },  // 山天大畜
    { hexagramIndex: 41, position: '三世' },  // 山泽损
    { hexagramIndex: 38, position: '四世' },  // 火泽睽
    { hexagramIndex: 10, position: '五世' },  // 天泽履
    { hexagramIndex: 61, position: '游魂' },  // 风泽中孚
    { hexagramIndex: 53, position: '归魂' },  // 风山渐
  ],
  坤: [
    { hexagramIndex: 2,  position: '本宫' },  // 坤为地
    { hexagramIndex: 24, position: '一世' },  // 地雷复
    { hexagramIndex: 19, position: '二世' },  // 地泽临
    { hexagramIndex: 11, position: '三世' },  // 地天泰
    { hexagramIndex: 34, position: '四世' },  // 雷天大壮
    { hexagramIndex: 43, position: '五世' },  // 泽天夬
    { hexagramIndex: 5,  position: '游魂' },  // 水天需
    { hexagramIndex: 8,  position: '归魂' },  // 水地比
  ],
  巽: [
    { hexagramIndex: 57, position: '本宫' },  // 巽为风
    { hexagramIndex: 9,  position: '一世' },  // 风天小畜
    { hexagramIndex: 37, position: '二世' },  // 风火家人
    { hexagramIndex: 42, position: '三世' },  // 风雷益
    { hexagramIndex: 25, position: '四世' },  // 天雷无妄
    { hexagramIndex: 21, position: '五世' },  // 火雷噬嗑
    { hexagramIndex: 27, position: '游魂' },  // 山雷颐
    { hexagramIndex: 18, position: '归魂' },  // 山风蛊
  ],
  离: [
    { hexagramIndex: 30, position: '本宫' },  // 离为火
    { hexagramIndex: 56, position: '一世' },  // 火山旅
    { hexagramIndex: 50, position: '二世' },  // 火风鼎
    { hexagramIndex: 64, position: '三世' },  // 火水未济
    { hexagramIndex: 4,  position: '四世' },  // 山水蒙
    { hexagramIndex: 59, position: '五世' },  // 风水涣
    { hexagramIndex: 6,  position: '游魂' },  // 天水讼
    { hexagramIndex: 13, position: '归魂' },  // 天火同人
  ],
  兑: [
    { hexagramIndex: 58, position: '本宫' },  // 兑为泽
    { hexagramIndex: 47, position: '一世' },  // 泽水困
    { hexagramIndex: 45, position: '二世' },  // 泽地萃
    { hexagramIndex: 31, position: '三世' },  // 泽山咸
    { hexagramIndex: 39, position: '四世' },  // 水山蹇
    { hexagramIndex: 15, position: '五世' },  // 地山谦
    { hexagramIndex: 62, position: '游魂' },  // 雷山小过
    { hexagramIndex: 54, position: '归魂' },  // 雷泽归妹
  ],
};

// ---------- 构建快速查找表 ----------

/**
 * 六十四卦八宫查找表，索引为卦序 1-64
 * PALACE_LOOKUP[i] 对应 HEXAGRAM_TABLE[i-1] 的宫位信息
 */
const PALACE_LOOKUP: (PalaceInfo | null)[] = new Array(65).fill(null);

// 填充查找表
for (const palaceName of PALACE_NAMES) {
  const entries = PALACE_HEXAGRAMS[palaceName];
  const wuxing = PALACE_WUXING[palaceName];
  for (const entry of entries) {
    const shiYaoIndex = SHI_YAO_POSITION[entry.position];
    PALACE_LOOKUP[entry.hexagramIndex] = {
      palace: palaceName,
      wuxing,
      shiYaoIndex,
      yingYaoIndex: getYingYaoIndex(shiYaoIndex),
      position: entry.position,
    };
  }
}

// ---------- 公开函数 ----------

/**
 * 根据六十四卦索引获取其宫位信息 (所属八宫、世应位置等)
 *
 * @param hexagramIndex 卦序 1-64 (对应 HEXAGRAM_TABLE 索引)
 * @returns PalaceInfo 宫位信息
 * @throws 若索引超出 1-64 范围或未找到对应宫位
 */
export function getPalace(hexagramIndex: number): PalaceInfo {
  if (hexagramIndex < 1 || hexagramIndex > 64) {
    throw new Error(`卦序索引超出范围: ${hexagramIndex}，有效范围 1-64`);
  }
  const info = PALACE_LOOKUP[hexagramIndex];
  if (!info) {
    throw new Error(`未找到卦序 ${hexagramIndex} 的宫位信息`);
  }
  return info;
}

/**
 * 根据宫名称获取该宫的全部卦序索引 (按京房卦序排列)
 *
 * @param palace 宫名 (八纯卦名)
 * @returns 该宫 8 卦的索引数组 [本宫, 一世, ..., 归魂]
 */
export function getPalaceHexagrams(palace: TrigramName): number[] {
  return PALACE_HEXAGRAMS[palace].map(entry => entry.hexagramIndex);
}
