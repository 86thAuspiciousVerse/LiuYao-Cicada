// ============================================================
// 排盘总入口 — 接收起卦参数，编排所有装卦模块，输出完整 HexagramPan
// src/core/ 零依赖原则 — 纯 TypeScript 纯函数（lunar-typescript 除外）
// ============================================================

import { Solar } from 'lunar-typescript';

import type {
  DivinationInput,
  HexagramPan,
  TrigramName,
  YaoLine,
  TimeInfo,
  TianGan,
  DiZhi,
  YinYang,
} from './types';
import { lookupHexagram } from './hexagram';
import { getPalace, PALACE_WUXING } from './palace';
import { getNaJiaDizhi } from './najia';
import { getLiuQinList } from './liuqin';
import { getLiuShouList } from './liushou';
import { isXunKong, isYuePo } from './sunkong';
import { diZhiWuxing } from './wuxing';
import { getXunKong, TIANGAN, DIZHI } from './ganzhi';
import { fillFuShen } from './fushen';

// ============================================================
// 八卦三爻阴阳模式表
// ============================================================

/** 卦名 → 三爻阴阳字符串 (从下到上) */
const TRIGRAM_YINYANG: Record<TrigramName, string> = {
  乾: '阳阳阳',
  兑: '阳阳阴',
  离: '阳阴阳',
  震: '阳阴阴',
  巽: '阴阳阳',
  坎: '阴阳阴',
  艮: '阴阴阳',
  坤: '阴阴阴',
};

/** 三爻阴阳字符串 → 卦名 (反向查找) */
const YINYANG_PATTERN: Record<string, TrigramName> = {
  阳阳阳: '乾',
  阳阳阴: '兑',
  阳阴阳: '离',
  阳阴阴: '震',
  阴阳阳: '巽',
  阴阳阴: '坎',
  阴阴阳: '艮',
  阴阴阴: '坤',
};

/** 十二时辰对应地支 (按 2 小时一辰) */
const SHI_CHEN_MAP: [number, number, DiZhi][] = [
  [23, 0, '子'],   // 23:00-00:59
  [1, 2, '丑'],    // 01:00-02:59
  [3, 4, '寅'],    // 03:00-04:59
  [5, 6, '卯'],    // 05:00-06:59
  [7, 8, '辰'],    // 07:00-08:59
  [9, 10, '巳'],   // 09:00-10:59
  [11, 12, '午'],  // 11:00-12:59
  [13, 14, '未'],  // 13:00-14:59
  [15, 16, '申'],  // 15:00-16:59
  [17, 18, '酉'],  // 17:00-18:59
  [19, 20, '戌'],  // 19:00-20:59
  [21, 22, '亥'],  // 21:00-22:59
];

// ============================================================
// 辅助函数
// ============================================================

/**
 * 取一个卦中特定位置的爻阴阳
 *
 * @param trigram 八卦之一
 * @param innerPos 在该卦内部的位置 (0-2, 从下到上)
 * @returns '阳' 或 '阴'
 */
function getTrigramYinYang(trigram: TrigramName, innerPos: number): YinYang {
  return TRIGRAM_YINYANG[trigram][innerPos] as YinYang;
}

/**
 * 根据小时数获取时辰地支
 *
 * @param hour 0-23 小时
 * @returns 对应的时辰地支
 */
function hourToShiChen(hour: number): DiZhi {
  for (const [start, end, dz] of SHI_CHEN_MAP) {
    // 子时特殊处理：23:00-00:59 跨天
    if (dz === '子') {
      if (hour >= 23 || hour <= 0) return dz;
    } else {
      if (hour >= start && hour <= end) return dz;
    }
  }
  return '子'; // fallback
}

/**
 * 根据日干和时支计算时干，进而得到时干支
 *
 * 五鼠遁口诀:
 *   甲己还加甲, 乙庚丙作初, 丙辛从戊起, 丁壬庚子居, 戊癸何方发, 壬子是真途
 *
 * @param riGan 日干
 * @param shiZhi 时支
 * @returns 时干支字符串 (如 "丙申")
 */
function calcHourGanZhi(riGan: TianGan, shiZhi: DiZhi): string {
  const riGanIdx = TIANGAN.indexOf(riGan);
  const shiZhiIdx = DIZHI.indexOf(shiZhi);

  // 子时天干偏移: 甲己→甲(0), 乙庚→丙(2), 丙辛→戊(4), 丁壬→庚(6), 戊癸→壬(8)
  const ganStartMap: Record<number, number> = { 0: 0, 1: 0, 2: 2, 3: 2, 4: 4, 5: 4, 6: 6, 7: 6, 8: 8, 9: 8 };
  const ganStart = ganStartMap[riGanIdx] ?? 0;

  const ganIdx = (ganStart + shiZhiIdx) % 10;
  return `${TIANGAN[ganIdx]}${shiZhi}`;
}

// ============================================================
// 公开函数
// ============================================================

/**
 * 根据原卦 + 动爻位置计算变卦后的新卦名
 *
 * 将动爻位的阴阳翻转，通过 YINYANG_PATTERN 查找新的卦名。
 * 只处理传入的 3 爻内的索引 (0-2)。
 *
 * @param original             原卦名
 * @param changingTrigramPos  动爻在该卦内部的位置数组 (0-2, 从下到上)
 *                            如初爻动 → [0], 二三爻动 → [1, 2]
 * @returns 变后的卦名; 如果不改变返回 null
 */
export function getChangedTrigram(
  original: TrigramName,
  changingTrigramPos: number[],
): TrigramName | null {
  if (changingTrigramPos.length === 0) return null;

  const pattern = TRIGRAM_YINYANG[original].split('') as YinYang[];
  for (const pos of changingTrigramPos) {
    if (pos < 0 || pos > 2) continue;
    pattern[pos] = pattern[pos] === '阳' ? '阴' : '阳';
  }

  const newPattern = pattern.join('');
  return YINYANG_PATTERN[newPattern];
}

/**
 * 从 Date 提取完整的排盘时间信息
 *
 * 使用 lunar-typescript 的 Solar / Lunar 计算干支，回退到手算逻辑。
 *
 * @param date 起卦的公历时间
 * @returns TimeInfo 时间信息
 */
export function extractTimeInfo(date: Date): TimeInfo {
  try {
    // 优先使用 lunar-typescript
    const solar = Solar.fromDate(date);
    const lunar = solar.getLunar();

    const yearGanZhi = lunar.getYearInGanZhi();
    const monthGanZhi = lunar.getMonthInGanZhi();
    const dayGanZhi = lunar.getDayInGanZhi();
    const hourGanZhi = lunar.getTimeInGanZhi();

    const riGan = dayGanZhi[0] as TianGan;
    const riZhi = dayGanZhi[1] as DiZhi;
    const yueJian = monthGanZhi[1] as DiZhi;

    return {
      solarDate: date,
      lunarYear: yearGanZhi,
      lunarMonth: lunar.getMonthInChinese(),
      lunarDay: lunar.getDayInChinese(),
      shiChen: hourGanZhi[1],
      yearGanZhi,
      monthGanZhi,
      dayGanZhi,
      hourGanZhi,
      riGan,
      riZhi,
      yueJian,
      yueJianWuxing: diZhiWuxing(yueJian),
      riChen: riZhi,
      riChenWuxing: diZhiWuxing(riZhi),
      xunKong: getXunKong(dayGanZhi),
    };
  } catch {
    // lunar-typescript 不可用时的手算回退
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();

    // 简化的时支
    const shiChen = hourToShiChen(hour);

    // 注：年干支、月干支、日干支需要完整的节气计算才能精确，
    // 这里仅提供最基本的 fallback，说明此信息需 lunar-typescript
    const fallbackDayGanZhi = '甲子'; // 无法精确计算
    const fallbackMonthGanZhi = '甲子';
    const fallbackYearGanZhi = '甲子';
    const hourGanZhi = calcHourGanZhi('甲', shiChen);

    const riGan = fallbackDayGanZhi[0] as TianGan;
    const riZhi = fallbackDayGanZhi[1] as DiZhi;
    const yueJian = fallbackMonthGanZhi[1] as DiZhi;

    return {
      solarDate: date,
      lunarYear: `${year}`,
      lunarMonth: `${month}`,
      lunarDay: `${day}`,
      shiChen,
      yearGanZhi: fallbackYearGanZhi,
      monthGanZhi: fallbackMonthGanZhi,
      dayGanZhi: fallbackDayGanZhi,
      hourGanZhi,
      riGan,
      riZhi,
      yueJian,
      yueJianWuxing: diZhiWuxing(yueJian),
      riChen: riZhi,
      riChenWuxing: diZhiWuxing(riZhi),
      xunKong: getXunKong(fallbackDayGanZhi),
    };
  }
}

/**
 * 排盘主函数
 *
 * 接收起卦参数，编排所有装卦模块，输出完整 HexagramPan。
 *
 * 流程:
 *   1. 查本卦  2. 查宫  3. 装纳甲  4. 装六亲  5. 时间信息
 *   6. 装六兽  7. 旬空  8. 月破  9. 世应  10. 组装本卦爻
 *   11. 动爻 → 变卦  12. 伏神  13. 返回
 *
 * @param input 起卦参数
 * @returns 完整 HexagramPan
 */
export function paipan(input: DivinationInput): HexagramPan {
  const { upper, lower, dongYao, date, question, yongShen } = input;

  // ============================================================
  // 1. 查本卦
  // ============================================================
  const originalInfo = lookupHexagram(upper, lower);

  // ============================================================
  // 2. 查宫
  // ============================================================
  const palace = getPalace(originalInfo.index);
  const palaceWuxing = PALACE_WUXING[palace.palace];

  // ============================================================
  // 3. 装本卦纳甲
  // ============================================================
  // 下卦取该卦八纯卦纳甲的前 3 个 (初→三)
  const lowerDizhi = getNaJiaDizhi(lower).slice(0, 3);
  // 上卦取该卦八纯卦纳甲的后 3 个 (四→上)
  const upperDizhi = getNaJiaDizhi(upper).slice(3, 6);
  const hexagramDizhi: DiZhi[] = [...lowerDizhi, ...upperDizhi]; // 6 个地支

  // ============================================================
  // 4. 装六亲 (以宫五行为"我")
  // ============================================================
  const liuQinList = getLiuQinList(palaceWuxing, hexagramDizhi);

  // ============================================================
  // 5. 获取时间信息
  // ============================================================
  const time = extractTimeInfo(date);

  // ============================================================
  // 6. 装六兽
  // ============================================================
  const liuShouList = getLiuShouList(time.riGan);

  // 7. 旬空  8. 月破  9. 标记世应
  // 以上三项在组装 YaoLine 时内联计算
  // ============================================================
  const { shiYaoIndex, yingYaoIndex } = palace;

  // ============================================================
  // 10. 组装本卦 YaoLine[]
  // ============================================================
  const originalYaoLines: YaoLine[] = hexagramDizhi.map((dz, i) => {
    // 该爻的阴阳：0-2 在下卦, 3-5 在上卦
    const trigram: TrigramName = i <= 2 ? lower : upper;
    const innerPos = i <= 2 ? i : i - 3;

    return {
      index: i,
      diZhi: dz,
      diZhiWuxing: diZhiWuxing(dz),
      yinYang: getTrigramYinYang(trigram, innerPos),
      isDong: dongYao.includes(i),
      liuQin: liuQinList[i],
      liuShou: liuShouList[i],
      shiYing: i === shiYaoIndex ? '世' : i === yingYaoIndex ? '应' : null,
      isXunKong: isXunKong(dz, time.xunKong),
      isYuePo: isYuePo(dz, time.yueJian),
      fuShen: undefined,
      changed: undefined,
    };
  });

  // ============================================================
  // 11. 处理动爻 → 计算变卦 (完整装卦)
  // ============================================================
  const hasDongYao = dongYao.length > 0;
  let changedResult: HexagramPan['changed'] = null;

  if (hasDongYao) {
    // 11a. 推算变卦的上下卦 (getChangedTrigram)
    const lowerChanges = dongYao.filter(i => i <= 2);
    const upperChanges = dongYao.filter(i => i >= 3).map(i => i - 3);

    const newLower = getChangedTrigram(lower, lowerChanges);
    const newUpper = getChangedTrigram(upper, upperChanges);

    const changedLower = newLower ?? lower;
    const changedUpper = newUpper ?? upper;

    // 11b. 查变卦信息 (lookupHexagram)
    const changedInfo = lookupHexagram(changedUpper, changedLower);

    // 11c. 查变卦宫位 (getPalace) → 获取变卦世应位置
    const changedPalace = getPalace(changedInfo.index);

    // 11d. 装变卦纳甲: 用变卦上下卦的 getNaJiaDizhi → 下卦前3 + 上卦后3
    const changedLowerDizhi = getNaJiaDizhi(changedLower).slice(0, 3);
    const changedUpperDizhi = getNaJiaDizhi(changedUpper).slice(3, 6);
    const changedDizhi: DiZhi[] = [...changedLowerDizhi, ...changedUpperDizhi];

    // 11e. 装变卦六亲: getLiuQinList(本卦宫五行, 变卦纳甲)
    const changedLiuQinList = getLiuQinList(palaceWuxing, changedDizhi);

    // 11f. 六兽: 同本卦 (复用 liuShouList)
    // 11g. 旬空: 复用本卦旬空判断
    // 11h. 标记变卦世应 (用变卦 palace 的 shiYaoIndex/yingYaoIndex)
    const { shiYaoIndex: changedShiYaoIndex, yingYaoIndex: changedYingYaoIndex } = changedPalace;

    // 11i. 组装变卦 YaoLine[] — 每条爻都是独立完整的
    const changedYaoLines: YaoLine[] = changedDizhi.map((dz, i) => {
      const trigram: TrigramName = i <= 2 ? changedLower : changedUpper;
      const innerPos = i <= 2 ? i : i - 3;

      return {
        index: i,
        diZhi: dz,
        diZhiWuxing: diZhiWuxing(dz),
        yinYang: getTrigramYinYang(trigram, innerPos),
        isDong: dongYao.includes(i),
        liuQin: changedLiuQinList[i],
        liuShou: liuShouList[i],
        shiYing: i === changedShiYaoIndex ? '世' : i === changedYingYaoIndex ? '应' : null,
        isXunKong: isXunKong(dz, time.xunKong),
        isYuePo: isYuePo(dz, time.yueJian),
        fuShen: undefined,
        changed: undefined, // 11j. 变卦不设 changed
      };
    });

    changedResult = {
      info: changedInfo,
      yaoLines: changedYaoLines,
    };
  }

  // 给本卦动爻标记 changed 子对象（指向变卦后的值）
  const originalYaoLinesWithChanged = originalYaoLines.map((yao, i) => {
    if (hasDongYao && dongYao.includes(i) && changedResult) {
      const cy = changedResult.yaoLines[i];
      return {
        ...yao,
        changed: {
          diZhi: cy.diZhi,
          diZhiWuxing: cy.diZhiWuxing,
          liuQin: cy.liuQin,
          yinYang: cy.yinYang,
        },
      };
    }
    return { ...yao, changed: undefined };
  });

  // ============================================================
  // 12. 查伏神
  // ============================================================
  const yaoLinesWithFuShen = fillFuShen(originalYaoLinesWithChanged, palace.palace);

  // ============================================================
  // 13. 组装 HexagramPan 并返回
  // ============================================================
  return {
    original: {
      info: originalInfo,
      palace,
      yaoLines: yaoLinesWithFuShen,
    },
    changed: changedResult,
    time,
    dongYaoIndices: [...dongYao],
    hasDongYao,
    yongShen,
    question,
  };
}
