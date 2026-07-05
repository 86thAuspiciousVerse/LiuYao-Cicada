// ============================================================
// 六爻排盘关系提取器 — 从 HexagramPan 提取结构化关系数据
// src/core/ 零依赖原则 — 纯 TypeScript 纯函数
// ============================================================

import type {
  HexagramPan,
  ExtractedRelations,
  YaoRelation,
  DongYaoAnalysis,
  TimeInfluence,
  FuShenSummary,
  YongShenAnalysis,
  YaoLine,
  DiZhi,
  LiuQin,
  Wuxing,
} from './types';
import { wuxingRelation, isSheng, isKe, diZhiWuxing, WUXING_LIST } from './wuxing';
import { isChong, isHe, jinTuiShen, LIU_HAI, SAN_XING } from './ganzhi';

// ============================================================
// 辅助常量
// ============================================================

/** 爻位中文名称（0-5 → 初爻-六爻） */
const YAO_POSITION_NAMES = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'] as const;

// ============================================================
// 辅助函数
// ============================================================

/**
 * 判断两个地支是否构成六害
 */
function hasHai(a: DiZhi, b: DiZhi): boolean {
  return LIU_HAI.some(([x, y]) => (a === x && b === y) || (a === y && b === x));
}

/**
 * 判断两个地支是否在同一三刑组中
 */
function hasXing(a: DiZhi, b: DiZhi): boolean {
  return SAN_XING.some(group => group.includes(a) && group.includes(b));
}

/**
 * 根据宫五行获取指定六亲对应的五行
 *
 * 六亲系统中各六亲的五行含义：
 *   兄弟 = 宫五行（同我）
 *   父母 = 生宫五行者
 *   子孙 = 宫五行所生
 *   官鬼 = 克宫五行者
 *   妻财 = 宫五行所克
 *
 * @param liuQin  六亲名称
 * @param gongWx  卦宫五行
 * @returns 该六亲对应的五行
 */
function liuQinToWuxing(liuQin: LiuQin, gongWx: Wuxing): Wuxing {
  switch (liuQin) {
    case '兄弟':
      return gongWx;
    case '父母':
      // 生宫五行者
      return WUXING_LIST.find(w => isSheng(w, gongWx))!;
    case '子孙':
      // 宫五行所生
      return WUXING_LIST.find(w => isSheng(gongWx, w))!;
    case '官鬼':
      // 克宫五行者
      return WUXING_LIST.find(w => isKe(w, gongWx))!;
    case '妻财':
      // 宫五行所克
      return WUXING_LIST.find(w => isKe(gongWx, w))!;
  }
}

/**
 * 根据五行和宫五行确定对应的六亲
 *
 * 六亲规则（同 liuqin.ts 的 getLiuQin，但直接使用五行值而非地支）：
 *   同我 → 兄弟
 *   生我 → 父母
 *   我生 → 子孙
 *   克我 → 官鬼
 *   我克 → 妻财
 *
 * @param wx     爻五行
 * @param gongWx 卦宫五行（"我"）
 * @returns 六亲名称
 */
function wuxingToLiuQin(wx: Wuxing, gongWx: Wuxing): LiuQin {
  if (wx === gongWx) return '兄弟';
  if (isSheng(wx, gongWx)) return '父母';  // 生我者父母
  if (isSheng(gongWx, wx)) return '子孙';  // 我生者子孙
  if (isKe(wx, gongWx)) return '官鬼';    // 克我者官鬼
  return '妻财';                            // 我克者妻财
}

/**
 * 查找生某五行的五行
 * 如：土生金 → shengWuxing('金') → '土'
 */
function shengWuxing(wx: Wuxing): Wuxing {
  return WUXING_LIST.find(w => isSheng(w, wx))!;
}

/**
 * 查找克某五行的五行
 * 如：火克金 → keWuxing('金') → '火'
 */
function keWuxing(wx: Wuxing): Wuxing {
  return WUXING_LIST.find(w => isKe(w, wx))!;
}

/**
 * 将 wuxingRelation 的结果映射为月建关系描述
 */
function mapYueRelation(rel: string): TimeInfluence['yueRelation'] {
  switch (rel) {
    case 'A生B': return '月生爻';
    case 'A克B': return '月克爻';
    case 'B生A': return '爻生月';
    case 'B克A': return '爻克月';
    default:     return '比和';
  }
}

/**
 * 将 wuxingRelation 的结果映射为日辰关系描述
 */
function mapRiRelation(rel: string): TimeInfluence['riRelation'] {
  switch (rel) {
    case 'A生B': return '日生爻';
    case 'A克B': return '日克爻';
    case 'B生A': return '爻生日';
    case 'B克A': return '爻克日';
    default:     return '比和';
  }
}

// ============================================================
// 子函数
// ============================================================

/**
 * 提取卦象基本信息
 *
 * @param pan 完整卦盘
 * @returns 包含卦名、卦符、上下卦、宫五行、世应位置的结构
 */
export function extractHexagramImagery(pan: HexagramPan): ExtractedRelations['hexagramImagery'] {
  const { original } = pan;
  const { info, palace } = original;

  return {
    hexagramName: info.name,
    hexagramSymbol: info.symbol,
    upperTrigram: info.upper,
    lowerTrigram: info.lower,
    palaceWuxing: palace.wuxing,
    shiYaoIndex: palace.shiYaoIndex,
    yingYaoIndex: palace.yingYaoIndex,
    shiYaoPosition: `世在${YAO_POSITION_NAMES[palace.shiYaoIndex]}`,
    yingYaoPosition: `应在${YAO_POSITION_NAMES[palace.yingYaoIndex]}`,
  };
}

/**
 * 提取本卦六爻间的两两关系（C(6,2)=15 对）
 *
 * 对每对爻判断：六冲、六合、六害、三刑、五行生克。
 * 只保留有至少一项非默认关系的对，减少噪声。
 *
 * @param yaoLines 本卦六爻数组
 * @returns 爻间关系数组
 */
/** 计算两爻关系（内部辅助） */
function computeYaoRelation(
  aDiZhi: DiZhi, aWuxing: Wuxing,
  bDiZhi: DiZhi, bWuxing: Wuxing,
  i: number, j: number,
  changedSide?: 0 | 1,
): YaoRelation {
  const chong = isChong(aDiZhi, bDiZhi);
  const he = isHe(aDiZhi, bDiZhi);
  const hai = hasHai(aDiZhi, bDiZhi);
  const xing = hasXing(aDiZhi, bDiZhi);
  const wxRel = wuxingRelation(aWuxing, bWuxing);

  return {
    yaos: [i, j],
    chong,
    he,
    hai,
    xing,
    wuxingRelation: wxRel,
    ...(changedSide !== undefined ? { changedSide } : {}),
  };
}

/**
 * 提取本卦六爻间的两两关系（C(6,2)=15 对）及变爻交叉关系
 *
 * @param yaoLines 本卦六爻数组
 * @param changedLines 变卦六爻数组（可选，用于变爻交叉关系）
 * @param dongYaoIndices 动爻索引数组
 * @returns 爻间关系数组
 */
export function extractYaoRelations(
  yaoLines: YaoLine[],
  changedLines?: YaoLine[],
  dongYaoIndices?: number[],
): YaoRelation[] {
  const relations: YaoRelation[] = [];

  // 本卦爻间关系 (15 pairs)
  for (let i = 0; i < 6; i++) {
    for (let j = i + 1; j < 6; j++) {
      const a = yaoLines[i];
      const b = yaoLines[j];
      const rel = computeYaoRelation(a.diZhi, a.diZhiWuxing, b.diZhi, b.diZhiWuxing, i, j);

      // 只保留有至少一项非默认关系的对
      if (!rel.chong && rel.he === null && !rel.hai && !rel.xing && rel.wuxingRelation === '比和') {
        continue;
      }
      relations.push(rel);
    }
  }

  // 变爻与本卦其他爻的交叉关系
  if (changedLines && dongYaoIndices && dongYaoIndices.length > 0) {
    for (const di of dongYaoIndices) {
      const c = changedLines[di];
      for (let j = 0; j < 6; j++) {
        if (j === di) continue; // 跳过自身
        const b = yaoLines[j];
        const rel = computeYaoRelation(c.diZhi, c.diZhiWuxing, b.diZhi, b.diZhiWuxing, di, j, 0);

        if (!rel.chong && rel.he === null && !rel.hai && !rel.xing && rel.wuxingRelation === '比和') {
          continue;
        }
        relations.push(rel);
      }
    }
  }

  return relations;
}

/**
 * 提取动爻分析
 *
 * 对每个动爻分析：
 * - 本爻与变爻的地支、五行、六亲
 * - 进退神（同五行连续位移）
 * - 回头生/回头克/比和（变爻五行 vs 本爻五行）
 * - 回头合/回头冲（变爻地支 vs 本爻地支）
 *
 * @param pan 完整卦盘
 * @returns 动爻分析数组（无动爻则返回空数组）
 */
export function extractDongYaoAnalysis(pan: HexagramPan): DongYaoAnalysis[] {
  if (!pan.hasDongYao || !pan.changed) return [];

  return pan.dongYaoIndices
    .filter(index => pan.original.yaoLines[index]?.changed) // 防御性过滤
    .map(index => {
    const originalYao = pan.original.yaoLines[index];
    const changedYao = originalYao.changed!; // 经 filter 保证非空

    const originalWx = originalYao.diZhiWuxing;
    const changedWx = changedYao.diZhiWuxing;

    // 回头关系：变爻五行 vs 本爻五行（五行全排列）
    //   回头生 = 变回头生本; 回头克 = 变回头克本; 泄气 = 本生变;
    //   耗气 = 本克变; 比和 = 同五行
    let huiTouRelation: DongYaoAnalysis['huiTouRelation'];
    if (isSheng(changedWx, originalWx)) {
      huiTouRelation = '回头生';     // 变生本
    } else if (isKe(changedWx, originalWx)) {
      huiTouRelation = '回头克';     // 变克本
    } else if (isSheng(originalWx, changedWx)) {
      huiTouRelation = '泄气';       // 本生变（本气被泄）
    } else if (isKe(originalWx, changedWx)) {
      huiTouRelation = '耗气';       // 本克变（本气被耗）
    } else {
      huiTouRelation = '比和';       // 同五行
    }

    return {
      yaoIndex: index,
      originalDiZhi: originalYao.diZhi,
      changedDiZhi: changedYao.diZhi,
      originalLiuQin: originalYao.liuQin,
      changedLiuQin: changedYao.liuQin,
      jinTuiShen: jinTuiShen(originalYao.diZhi, changedYao.diZhi),
      huiTouRelation,
      huiTouHe: isHe(originalYao.diZhi, changedYao.diZhi),
      huiTouChong: isChong(originalYao.diZhi, changedYao.diZhi),
    };
  });
}

/**
 * 提取日月建对每爻的影响（6条）
 *
 * 对每爻计算：
 * - 月建关系：月破 / 月生爻 / 月克爻 / 爻生月 / 爻克月 / 比和
 * - 日辰关系：日冲 / 日生爻 / 日克爻 / 爻生日 / 爻克日 / 比和
 * - 旬空标记
 * - 日冲标记（含暗动/日破判断信息）
 *
 * @param pan 完整卦盘
 * @returns 六爻的日月影响数组
 */
export function extractTimeInfluences(pan: HexagramPan): TimeInfluence[] {
  const { time } = pan;
  const { yueJian, riChen, yueJianWuxing, riChenWuxing } = time;

  const buildEntry = (
    yao: { diZhi: DiZhi; diZhiWuxing: Wuxing; isXunKong: boolean; isYuePo: boolean },
    i: number,
    source: '本' | '变',
  ): TimeInfluence => {
    // ---- 月建关系 ----
    let yueRelation: TimeInfluence['yueRelation'];
    if (yao.isYuePo) {
      yueRelation = '月破';
    } else {
      yueRelation = mapYueRelation(wuxingRelation(yueJianWuxing, yao.diZhiWuxing));
    }

    // ---- 日辰关系 ----
    const hasRiChongFlag = isChong(riChen, yao.diZhi);
    let riRelation: TimeInfluence['riRelation'];
    if (hasRiChongFlag) {
      riRelation = '日冲';
    } else {
      riRelation = mapRiRelation(wuxingRelation(riChenWuxing, yao.diZhiWuxing));
    }

    // 暗动仅本卦爻判断，变爻不判断
    const isAnDong = source === '本'
      && hasRiChongFlag && !yao.isXunKong && !yao.isYuePo;

    return {
      yaoIndex: i,
      source,
      yueRelation,
      riRelation,
      isXunKong: yao.isXunKong,
      hasRiChong: hasRiChongFlag,
      isAnDong,
      yueJianDiZhi: yueJian,
      riChenDiZhi: riChen,
    };
  };

  const results: TimeInfluence[] = pan.original.yaoLines.map((yao, i) =>
    buildEntry(yao, i, '本'),
  );

  // 变卦爻（仅动爻位置，避免冗余）
  if (pan.changed && pan.hasDongYao) {
    for (const idx of pan.dongYaoIndices) {
      const yao = pan.changed.yaoLines[idx];
      results.push(buildEntry(yao, idx, '变'));
    }
  }

  return results;
}

/**
 * 提取伏神摘要
 *
 * 遍历本卦六爻，找到有伏神的爻，记录：
 * - 伏神地支、六亲
 * - 飞神（本爻）地支、六亲
 * - 伏神与飞神的地支六冲/六合关系
 *
 * @param pan 完整卦盘
 * @returns 伏神摘要数组（无伏神则返回空数组）
 */
export function extractFuShenSummary(pan: HexagramPan): FuShenSummary[] {
  const summaries: FuShenSummary[] = [];

  for (const yao of pan.original.yaoLines) {
    if (yao.fuShen) {
      summaries.push({
        yaoIndex: yao.index,
        fuShenDiZhi: yao.fuShen.diZhi,
        fuShenLiuQin: yao.fuShen.liuQin,
        feiShenDiZhi: yao.diZhi,
        feiShenLiuQin: yao.liuQin,
        feiFuChong: isChong(yao.fuShen.diZhi, yao.diZhi),
        feiFuHe: isHe(yao.fuShen.diZhi, yao.diZhi),
        feiFuWuxingRelation: wuxingRelation(
          diZhiWuxing(yao.fuShen.diZhi),
          diZhiWuxing(yao.diZhi),
        ),
      });
    }
  }

  return summaries;
}

/**
 * 提取用神分析
 *
 * 分析用神的定位、状态，以及原神/忌神/仇神。
 *
 * 确定规则：
 * - 优先使用用户指定的用神（pan.yongShen）
 * - 不从占问事项推断（那是 AI 分析层的职责）
 *
 * 原神/忌神/仇神计算：
 *   原神 = 生用神的六亲
 *   忌神 = 克用神的六亲
 *   仇神 = 生忌神的六亲（即克原神的六亲）
 *
 * 算法：
 *   ① liuQinToWuxing：将六亲映射为五行
 *   ② shengWuxing / keWuxing：找生/克该五行的五行
 *   ③ wuxingToLiuQin：将结果五行映射回六亲
 *
 * @param pan 完整卦盘
 * @returns 用神分析对象，无法确定用神则返回 null
 */
export function extractYongShenAnalysis(pan: HexagramPan): YongShenAnalysis | null {
  // 没用神则返回 null
  if (!pan.yongShen) return null;

  const yongShen = pan.yongShen;
  const gongWx = pan.original.palace.wuxing;
  const yaoLines = pan.original.yaoLines;

  // ---- 用神定位 ----

  // 用神所在的爻索引（可能多个，如用神为兄弟时可能有两爻相同六亲）
  const yaoIndices = yaoLines
    .filter(y => y.liuQin === yongShen)
    .map(y => y.index);

  // 用神是否在世爻/应爻
  const isShiYao = yaoLines.some(y => y.liuQin === yongShen && y.shiYing === '世');
  const isYingYao = yaoLines.some(y => y.liuQin === yongShen && y.shiYing === '应');

  // ---- 用神状态 ----

  const yongShenYaos = yaoLines.filter(y => y.liuQin === yongShen);
  const isYongShenKong = yongShenYaos.some(y => y.isXunKong);
  const isYongShenPo = yongShenYaos.some(y => y.isYuePo);
  const isYongShenDong = yongShenYaos.some(y => y.isDong);

  // ---- 原神 / 忌神 / 仇神 ----

  // 用神对应的五行
  const yongShenWx = liuQinToWuxing(yongShen, gongWx);

  // 原神 = 生用神的六亲
  const yuanShen = wuxingToLiuQin(shengWuxing(yongShenWx), gongWx);

  // 忌神 = 克用神的六亲
  const jiShen = wuxingToLiuQin(keWuxing(yongShenWx), gongWx);

  // 仇神 = 生忌神的六亲（即克原神的六亲）
  const chouShen = wuxingToLiuQin(shengWuxing(keWuxing(yongShenWx)), gongWx);

  // 原神/忌神/仇神在本卦中的爻索引
  const yuanShenIndices = yaoLines
    .filter(y => y.liuQin === yuanShen)
    .map(y => y.index);
  const jiShenIndices = yaoLines
    .filter(y => y.liuQin === jiShen)
    .map(y => y.index);
  const chouShenIndices = yaoLines
    .filter(y => y.liuQin === chouShen)
    .map(y => y.index);

  return {
    yongShen,
    yaoIndices,
    isShiYao,
    isYingYao,
    yuanShen,
    jiShen,
    chouShen,
    yuanShenIndices,
    jiShenIndices,
    chouShenIndices,
    isYongShenKong,
    isYongShenPo,
    isYongShenDong,
  };
}

// ============================================================
// 主入口函数
// ============================================================

/**
 * 从 HexagramPan 提取结构化关系数据
 *
 * 整合所有子函数的输出，返回完整的 ExtractedRelations。
 * 供 AI 分析层使用，所有关系在提取层预计算，AI 只负责解读。
 *
 * @param pan 完整卦盘（排盘输出）
 * @returns 结构化关系数据
 */
export function extract(pan: HexagramPan): ExtractedRelations {
  return {
    hexagramImagery: extractHexagramImagery(pan),
    yaoRelations: extractYaoRelations(
      pan.original.yaoLines,
      pan.changed?.yaoLines,
      pan.dongYaoIndices,
    ),
    dongYaoAnalysis: extractDongYaoAnalysis(pan),
    timeInfluences: extractTimeInfluences(pan),
    fuShenSummary: extractFuShenSummary(pan),
    yongShenAnalysis: extractYongShenAnalysis(pan),
  };
}
