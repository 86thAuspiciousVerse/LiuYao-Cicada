// ============================================================
// 起卦方法模块 — 时间起卦 / 数字起卦 / 手动指定
// src/core/ 零依赖原则 — 纯 TypeScript 纯函数（lunar-typescript 除外）
// ============================================================
//
// ## 研究成果汇总
//
// ### 时间起卦算法（梅花易数 / 六爻通用）
//
// 搜索来源:
//   - 梅花易数年月日起例 (daoisms.com.cn)
//   - 梅花易数年月日时起卦法 (meipian.cn)
//   - 六爻时间起卦详细步骤 (yishihui.net)
//   - 六爻按时间起卦法 (zhouyi.wiki)
//   等十余篇文章一致认同以下算法。
//
// #### 取数规则
//
//   年支序数: 子=1 丑=2 寅=3 卯=4 辰=5 巳=6
//            午=7 未=8 申=9 酉=10 戌=11 亥=12
//   月数:     农历月数 正月=1 ~ 十二月=12
//   日数:     农历日数 初一=1 ~ 三十=30
//   时支序数: 与年支相同 子时=1 ~ 亥时=12
//
//   分歧说明:
//     - 年支 "序数" 存在两种说法:
//       (A) 地支序数 1-12（主流，本项目采用）
//       (B) 年干支在六十甲子中的序位 1-60（少数说法）
//       两者只影响绝对数值, 不影响算法结构。
//     - 少数资料将上卦也纳入时辰,
//       即 上卦=(年+月+日+时)%8,
//       但这会使上卦=下卦, 丧失区分度, 故不取。
//
// #### 计算公式
//
//   上卦 = (年支序数 + 月数 + 日数) % 8
//   下卦 = (年支序数 + 月数 + 日数 + 时支序数) % 8
//   动爻 = (年支序数 + 月数 + 日数 + 时支序数) % 6
//
//   - 余数 0 → 上卦/下卦视为 8（坤卦）
//   - 余数 0 → 动爻视为 6（上爻）
//   - 若总和 < 除数, 直接取和数
//
// #### 数字 → 八卦映射
//
//   1=乾☰  2=兑☱  3=离☲  4=震☳
//   5=巽☴  6=坎☵  7=艮☶  8=坤☷
//
//   此为 "先天八卦数"（来源: 周易·系辞传），
//   所有搜索来源一致，无分歧。
//
// ============================================================

import { Solar } from 'lunar-typescript';
import type { TrigramName, DivinationInput, YaoResult, YinYang } from './types';

// ============================================================
// 常量
// ============================================================

/**
 * 地支序数映射
 * 子=1 丑=2 寅=3 卯=4 辰=5 巳=6
 * 午=7 未=8 申=9 酉=10 戌=11 亥=12
 */
const DIZHI_ORDER: ReadonlyArray<string> = [
  '子', '丑', '寅', '卯', '辰', '巳',
  '午', '未', '申', '酉', '戌', '亥',
];

/**
 * 八卦数字映射 (1-8 → 卦名)
 *
 * 先天八卦数（源自《周易·系辞传》"天地定位, 山泽通气"）:
 *   1=乾☰  2=兑☱  3=离☲  4=震☳
 *   5=巽☴  6=坎☵  7=艮☶  8=坤☷
 */
export const NUMBER_TO_TRIGRAM: Record<number, TrigramName> = {
  1: '乾',
  2: '兑',
  3: '离',
  4: '震',
  5: '巽',
  6: '坎',
  7: '艮',
  8: '坤',
};

/**
 * 八卦 → 数字 (先天数) 反向查找
 */
export const TRIGRAM_TO_NUMBER: Record<TrigramName, number> = {
  乾: 1,
  兑: 2,
  离: 3,
  震: 4,
  巽: 5,
  坎: 6,
  艮: 7,
  坤: 8,
};

const PATTERN_TO_TRIGRAM: Record<string, TrigramName> = {
  '阳阳阳': '乾',
  '阳阳阴': '兑',
  '阳阴阳': '离',
  '阳阴阴': '震',
  '阴阳阳': '巽',
  '阴阳阴': '坎',
  '阴阴阳': '艮',
  '阴阴阴': '坤',
};

// ============================================================
// 辅助函数
// ============================================================

/**
 * 将地支字符转换为其序数 (子=1, 丑=2, ..., 亥=12)
 *
 * @param branch 地支字符
 * @returns 序数 1-12; 未知输入返回 0
 */
export function branchToNumber(branch: string): number {
  const index = DIZHI_ORDER.indexOf(branch);
  return index >= 0 ? index + 1 : 0;
}

/**
 * 将小时数 (0-23) 转换为时支序数 (子=1, ..., 亥=12)
 *
 * 时辰对照:
 *   子时 23:00-00:59   午时 11:00-12:59
 *   丑时 01:00-02:59   未时 13:00-14:59
 *   寅时 03:00-04:59   申时 15:00-16:59
 *   卯时 05:00-06:59   酉时 17:00-18:59
 *   辰时 07:00-08:59   戌时 19:00-20:59
 *   巳时 09:00-10:59   亥时 21:00-22:59
 *
 * 注意: 夜子时 (23:00-00:59) 在日期交接处理上存在分歧:
 *   - 主流观点: 日数取当日, 时支取子 (23:00-00:59 均属当日亥时之后)
 *   - 少数观点: 23:00-23:59 仍属当日亥时 (需查阅具体时辰划分)
 *   本项目采用主流观点, 与 lunar-typescript 的行为一致.
 *
 * @param hour 0-23
 * @returns 时支序数 1-12
 */
export function hourToBranchNumber(hour: number): number {
  // 子时跨越两天: 23:00-00:59
  if (hour >= 23 || hour < 1) return 1; // 子=1
  // 01:00-02:59 -> 丑 -> 2
  // 03:00-04:59 -> 寅 -> 3
  // ...
  // 21:00-22:59 -> 亥 -> 12
  const branchIndex = Math.floor((hour + 1) / 2);
  return branchIndex + 1;
}

// ============================================================
// 公开函数
// ============================================================

/**
 * 时间起卦 — 根据农历年月日时计算上卦、下卦、动爻
 *
 * ## 算法
 *
 *   起卦时间 → 农历年支序数 + 月数 + 日数 + 时支序数
 *
 *   上卦 = (年支 + 月 + 日) % 8   → 余 0 则取 8 (坤)
 *   下卦 = (年支 + 月 + 日 + 时支) % 8   → 余 0 则取 8 (坤)
 *   动爻 = (年支 + 月 + 日 + 时支) % 6   → 余 0 则取 6 (上爻)
 *
 * ## 取数说明
 *
 *   - **年支序数**: 取农历年之"地支"序数 (子=1 ~ 亥=12)
 *     注意: 此处用的是"地支序数", 不是"农历年数字",
 *     也不是"六十甲子序位"。例如 2026(丙午)→午→7。
 *
 *   - **月数**: 农历月份序数 正=1 ~ 十二=12。
 *     闰月取同月数 (如闰五月仍取 5)。
 *
 *   - **日数**: 农历日数 初一=1 ~ 三十=30。
 *
 *   - **时支序数**: 时辰地支序数 子时=1 ~ 亥时=12。
 *
 * ## 分歧说明
 *
 *   1. **年支 vs 年六十甲子序位**:
 *      主流说取年地支序数 1-12, 少数说取年干支在六十甲子的序位 1-60。
 *      本项目采用主流 1-12 方案。
 *
 *   2. **年支以立春为界?**
 *      八字 (Bazi) 中年柱以立春为界, 但时间起卦取"农历年"地支,
 *      以正月初一为界。两者在正月大概率一致, 但节前/年后有差异。
 *      本项目采用 lunar-typescript 的 `getYearZhiIndex()` (以农历年为准)。
 *      若需立春版本, 可改用 `getYearZhiIndexByLiChun()`.
 *
 *   3. **上卦用 3 数还是 4 数?**
 *      统一算法: 上卦=年+月+日, 下卦=年+月+日+时。
 *      若上卦也加时辰则上下卦相同, 失去区分意义。
 *
 * @param date  起卦时间 (默认当前时间)
 * @returns     DivinationInput 排盘入参
 */
export function timeDivination(date?: Date): DivinationInput {
  const d = date ?? new Date();
  const solar = Solar.fromDate(d);
  const lunar = solar.getLunar();

  // ---- 取数 ----

  // 年支序数: lunar-typescript 返回 0-11 (子=0, 丑=1, ... 亥=11)
  // 注: `getYearZhiIndex()` 基于农历年 (正月初一为界);
  //     备选: `getYearZhiIndexByLiChun()` 基于立春.
  const yearBranchNum = lunar.getYearZhiIndex() + 1;

  // 农历月数 (1-12); 闰月与正月的月数相同
  const monthNum = lunar.getMonth();

  // 农历日数 (1-30)
  const dayNum = lunar.getDay();

  // 时支序数: lunar-typescript 返回 0-11 (子=0 ~ 亥=11)
  const hourBranchNum = lunar.getTimeZhiIndex() + 1;

  // ---- 计算 ----

  // 上卦 = (年支 + 月 + 日) % 8, 余 0 取 8 (坤)
  let upperNum = (yearBranchNum + monthNum + dayNum) % 8;
  if (upperNum === 0) upperNum = 8;

  // 下卦 = (年支 + 月 + 日 + 时支) % 8, 余 0 取 8 (坤)
  let lowerNum = (yearBranchNum + monthNum + dayNum + hourBranchNum) % 8;
  if (lowerNum === 0) lowerNum = 8;

  // 动爻 = (年支 + 月 + 日 + 时支) % 6, 余 0 取 6 (上爻)
  let dongYaoNum = (yearBranchNum + monthNum + dayNum + hourBranchNum) % 6;
  if (dongYaoNum === 0) dongYaoNum = 6;

  return {
    upper: NUMBER_TO_TRIGRAM[upperNum],
    lower: NUMBER_TO_TRIGRAM[lowerNum],
    dongYao: [dongYaoNum - 1], // 0-index: 初爻=0 ~ 上爻=5
    date: d,
  };
}

/**
 * 三数起卦 — 用户输入 3 个自然数计算卦象
 *
 * ## 算法
 *
 *   上卦 = n1 % 8   → 余 0 取 8 (坤)
 *   下卦 = n2 % 8   → 余 0 取 8 (坤)
 *   动爻 = n3 % 6   → 余 0 取 6 (上爻)
 *
 * ## 来源
 *
 *   此法源自梅花易数 "数字起卦法"。
 *
 * @param n1    第一个数字 (上卦用)
 * @param n2    第二个数字 (下卦用)
 * @param n3    第三个数字 (动爻用)
 * @param date  起卦时间 (默认当前时间)
 * @returns     DivinationInput 排盘入参
 */
export function numberDivination(
  n1: number,
  n2: number,
  n3: number,
  date?: Date,
): DivinationInput {
  const d = date ?? new Date();

  // 上卦
  let upperNum = n1 % 8;
  if (upperNum <= 0) upperNum = 8;

  // 下卦
  let lowerNum = n2 % 8;
  if (lowerNum <= 0) lowerNum = 8;

  // 动爻
  let dongYaoNum = n3 % 6;
  if (dongYaoNum <= 0) dongYaoNum = 6;

  return {
    upper: NUMBER_TO_TRIGRAM[upperNum],
    lower: NUMBER_TO_TRIGRAM[lowerNum],
    dongYao: [dongYaoNum - 1], // 0-index: 初爻=0 ~ 上爻=5
    date: d,
  };
}

/**
 * 二数起卦 — 用户输入 2 个自然数计算卦象
 *
 * ## 算法
 *
 *   上卦 = n1 % 8   → 余 0 取 8 (坤)
 *   下卦 = n2 % 8   → 余 0 取 8 (坤)
 *   动爻 = (n1 + n2) % 6   → 余 0 取 6 (上爻)
 *
 * ## 来源
 *
 *   梅花易数二数起卦法。上卦由第一数定，下卦由第二数定，
 *   动爻由两数之和定。此法适用于仅有两个数字的场景。
 *
 * @param n1    第一个数字 (上卦用)
 * @param n2    第二个数字 (下卦用)
 * @param date  起卦时间 (默认当前时间)
 * @returns     DivinationInput 排盘入参
 */
export function twoNumberDivination(
  n1: number,
  n2: number,
  date?: Date,
): DivinationInput {
  const d = date ?? new Date();

  // 上卦: num <= 0 取 8, 否则 n1 % 8, 余 0 取 8
  let upperNum: number;
  if (n1 <= 0) {
    upperNum = 8;
  } else {
    upperNum = n1 % 8;
    if (upperNum === 0) upperNum = 8;
  }

  // 下卦: 同上
  let lowerNum: number;
  if (n2 <= 0) {
    lowerNum = 8;
  } else {
    lowerNum = n2 % 8;
    if (lowerNum === 0) lowerNum = 8;
  }

  // 动爻 = (n1 + n2) % 6, 余 0 取 6 → dongYao = [num - 1] (0-index)
  let dongYaoNum = (n1 + n2) % 6;
  if (dongYaoNum <= 0) dongYaoNum = 6;

  return {
    upper: NUMBER_TO_TRIGRAM[upperNum],
    lower: NUMBER_TO_TRIGRAM[lowerNum],
    dongYao: [dongYaoNum - 1], // 0-index: 初爻=0 ~ 上爻=5
    date: d,
  };
}

/**
 * 铜钱起卦 — 六次投币结果生成卦象
 *
 * 爻从下往上记录:
 *   6 = 老阴（动）
 *   7 = 少阳（静）
 *   8 = 少阴（静）
 *   9 = 老阳（动）
 *
 * @param results 六爻结果，必须按初爻→上爻顺序传入
 * @param date    起卦时间（默认当前时间）
 * @returns       DivinationInput 排盘入参
 */
export function coinDivination(
  results: YaoResult[],
  date?: Date,
): DivinationInput {
  if (results.length !== 6) {
    throw new Error(`铜钱起卦必须提供 6 个爻，收到: ${results.length}`);
  }

  const yinYang = results.map(resultToYinYang);
  const lower = patternToTrigram(yinYang.slice(0, 3));
  const upper = patternToTrigram(yinYang.slice(3, 6));
  const dongYao = results
    .map((value, index) => (value === 6 || value === 9 ? index : -1))
    .filter(index => index >= 0);

  return {
    upper,
    lower,
    dongYao,
    date: date ?? new Date(),
  };
}

/**
 * 手动指定卦象 — 用户直接选择上下卦和动爻
 *
 * @param upper    上卦 (如 '乾')
 * @param lower    下卦 (如 '坤')
 * @param dongYao  动爻索引列表 (0=初爻 ~ 5=上爻)
 * @param date     起卦时间 (默认当前时间)
 * @returns        DivinationInput 排盘入参
 *
 * @throws 若 dongYao 包含超出 0-5 范围的值
 */
export function manualDivination(
  upper: TrigramName,
  lower: TrigramName,
  dongYao: number[],
  date?: Date,
): DivinationInput {
  const d = date ?? new Date();

  // 校验动爻索引
  for (const yao of dongYao) {
    if (yao < 0 || yao > 5) {
      throw new Error(
        `动爻索引必须在 0-5 之间 (初爻=0 ~ 上爻=5), 收到: ${yao}`,
      );
    }
  }

  return {
    upper,
    lower,
    dongYao: [...new Set(dongYao)].sort((a, b) => a - b), // 去重排序
    date: d,
  };
}

function resultToYinYang(result: YaoResult): YinYang {
  if (result === 6 || result === 8) return '阴';
  if (result === 7 || result === 9) return '阳';
  throw new Error(`无效铜钱爻值: ${result}`);
}

function patternToTrigram(pattern: YinYang[]): TrigramName {
  const key = pattern.join('');
  const trigram = PATTERN_TO_TRIGRAM[key];
  if (!trigram) {
    throw new Error(`无法识别三爻阴阳组合: ${key}`);
  }
  return trigram;
}
