// ============================================================
// 排盘序列化 — 将排盘结果 + 关系数据序列化为 AI 可读的 Markdown
// src/core/ 零依赖原则 — 纯 TypeScript 纯函数
// ============================================================

import type {
  HexagramPan,
  ExtractedRelations,
  YaoLine,
  DiZhi,
  LiuQin,
  Wuxing,
  YaoRelation,
} from './types';
import { PALACE_WUXING, getPalace } from './palace';
import { diZhiWuxing } from './wuxing';

// ============================================================
// 辅助函数
// ============================================================

/** 爻索引 0-5 → 中文名称 */
const YAO_NAMES: string[] = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];

function yaoIndexToName(i: number): string {
  return YAO_NAMES[i];
}

/** 地支 → 地支+五行，如 "子" → "子水" */
function formatDiZhiWuxing(dz: DiZhi): string {
  return dz + diZhiWuxing(dz);
}

/** 地支·六亲，如 "戌土·妻财" */
function formatDiZhiLiuQin(dz: DiZhi, wx: Wuxing, lq: LiuQin): string {
  return dz + wx + '·' + lq;
}

/** 格式化 Date → "2026年6月22日 00:44" */
function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const h = d.getHours().toString().padStart(2, '0');
  const min = d.getMinutes().toString().padStart(2, '0');
  return `${y}年${m}月${day}日 ${h}:${min}`;
}

/** 构建本卦装卦表的一行（含伏神列和动变列） */
function buildOriginalRow(yao: YaoLine): string {
  // 动爻在爻位后加标记
  const yaoName = yaoIndexToName(yao.index) + (yao.isDong ? ' ◂动' : '');
  const diZhiWx = formatDiZhiWuxing(yao.diZhi);
  const wx = yao.diZhiWuxing;
  const shiYing = yao.shiYing ?? '-';
  const xunKong = yao.isXunKong ? '旬空' : '-';
  const yuePo = yao.isYuePo ? '月破' : '-';

  // 伏神列：有则显示伏神（藏爻）的地支·六亲
  let fuShenStr = '-';
  if (yao.fuShen) {
    fuShenStr = formatDiZhiLiuQin(yao.fuShen.diZhi, yao.fuShen.diZhiWuxing, yao.fuShen.liuQin);
  }

  // 动变列：动爻显示 "→ 变后地支·变后六亲"
  let dongBianStr = '-';
  if (yao.isDong && yao.changed) {
    dongBianStr = `→ ${formatDiZhiLiuQin(yao.changed.diZhi, yao.changed.diZhiWuxing, yao.changed.liuQin)}`;
  }

  return `| ${yaoName} | ${diZhiWx} | ${wx} | ${yao.liuQin} | ${yao.liuShou} | ${shiYing} | ${xunKong} | ${yuePo} | ${fuShenStr} | ${dongBianStr} |`;
}

/** 构建变卦装卦表的一行（无伏神列和动变列） */
function buildChangedRow(yao: YaoLine): string {
  // 由本卦动爻变来的爻位加标记
  const yaoName = yaoIndexToName(yao.index) + (yao.isDong ? ' ◂变' : '');
  const diZhiWx = formatDiZhiWuxing(yao.diZhi);
  const wx = yao.diZhiWuxing;
  const shiYing = yao.shiYing ?? '-';
  const xunKong = yao.isXunKong ? '旬空' : '-';
  const yuePo = yao.isYuePo ? '月破' : '-';

  return `| ${yaoName} | ${diZhiWx} | ${wx} | ${yao.liuQin} | ${yao.liuShou} | ${shiYing} | ${xunKong} | ${yuePo} |`;
}

/** 排序爻间关系：世应优先 → 动爻相关 → 有意义的其他关系 */
function sortYaoRelations(
  relations: YaoRelation[],
  shiIdx: number,
  yingIdx: number,
  dongIndices: number[],
): YaoRelation[] {
  const shiYing: YaoRelation[] = [];
  const dongRelated: YaoRelation[] = [];
  const other: YaoRelation[] = [];

  const dongSet = new Set(dongIndices);

  for (const rel of relations) {
    const [a, b] = rel.yaos;

    // 世应关系优先（仅本卦爻关系，交叉关系不在此列）
    if (rel.changedSide === undefined &&
        ((a === shiIdx && b === yingIdx) || (a === yingIdx && b === shiIdx))) {
      shiYing.push(rel);
      continue;
    }

    // 动爻相关其次（含变爻交叉关系）
    if (rel.changedSide !== undefined || dongSet.has(a) || dongSet.has(b)) {
      dongRelated.push(rel);
      continue;
    }

    other.push(rel);
  }

  // 其他关系：extractor 已过滤全默认对，直接通过
  return [...shiYing, ...dongRelated, ...other];
}

// ============================================================
// 公开函数
// ============================================================

/**
 * 将排盘结果 + 关系数据序列化为 AI 可读的 Markdown 文本
 *
 * 生成的文本包含 10 个章节（按顺序）：
 *   1. 卦象标题    2. 时间信息    3. 卦象基本信息
 *   4. 用神分析    5. 本卦装卦表  6. 变卦装卦表（可选）
 *   7. 爻间关系    8. 动爻分析    9. 日月建影响
 *  10. 伏神详情（可选）
 *
 * @param pan       排盘完整输出
 * @param relations 关系提取结果
 * @returns Markdown 格式的字符串，供 AI 分析使用
 */
export function serializeForAI(
  pan: HexagramPan,
  relations: ExtractedRelations,
): string {
  const sections: string[] = [];

  // ============================================================
  // 1. 卦象标题
  // ============================================================
  if (pan.changed) {
    sections.push(
      `# ${pan.original.info.symbol} ${pan.original.info.name}（本卦）→ ${pan.changed.info.symbol} ${pan.changed.info.name}（变卦）`,
    );
  } else {
    sections.push(`# ${pan.original.info.symbol} ${pan.original.info.name}`);
  }
  sections.push('');

  // ============================================================
  // 2. 时间信息
  // ============================================================
  sections.push('## 时间');
  sections.push('');

  const t = pan.time;
  sections.push(`- 公历: ${formatDate(t.solarDate)}`);
  sections.push(`- 农历: ${t.lunarYear}年 ${t.lunarMonth}月 ${t.lunarDay}`);
  sections.push(`- 四柱: 年${t.yearGanZhi} 月${t.monthGanZhi} 日${t.dayGanZhi} 时${t.hourGanZhi}`);
  sections.push(`- 日空: ${t.xunKong[0]}${t.xunKong[1]}`);
  sections.push('');

  // ============================================================
  // 3. 卦象基本信息
  // ============================================================
  sections.push('## 卦象信息');
  sections.push('');

  const orig = pan.original;
  const palaceWx = PALACE_WUXING[orig.palace.palace];
  sections.push(
    `- 本卦: ${orig.info.name} (${orig.info.symbol}) 第${orig.info.index}卦 · ${orig.palace.palace}宫${palaceWx} · ${orig.palace.position}卦`,
  );

  if (pan.changed) {
    const chPalace = getPalace(pan.changed.info.index);
    const chPalaceWx = PALACE_WUXING[chPalace.palace];
    sections.push(
      `- 变卦: ${pan.changed.info.name} (${pan.changed.info.symbol}) 第${pan.changed.info.index}卦 · ${chPalace.palace}宫${chPalaceWx} · ${chPalace.position}卦`,
    );
  }

  sections.push(`- ${relations.hexagramImagery.shiYaoPosition}，${relations.hexagramImagery.yingYaoPosition}`);
  sections.push('');

  // ============================================================
  // 4. 用神分析
  // ============================================================
  sections.push('## 用神');
  sections.push('');

  const ys = relations.yongShenAnalysis;
  if (!ys) {
    sections.push('未指定用神（需根据占问推断）');
  } else {
    const yaoNameList = ys.yaoIndices.map(i => yaoIndexToName(i)).join('、');
    sections.push(`- 用神: ${ys.yongShen}`);
    sections.push(`- 位置: ${yaoNameList}`);

    const statuses: string[] = [];
    if (ys.isShiYao) statuses.push('世爻持用神');
    if (ys.isYingYao) statuses.push('应爻持用神');
    if (ys.isYongShenKong) statuses.push('旬空');
    if (ys.isYongShenPo) statuses.push('月破');
    if (ys.isYongShenDong) statuses.push('动爻');
    if (statuses.length > 0) {
      sections.push(`- 状态: ${statuses.join(' / ')}`);
    }

    const yuanIndices = ys.yuanShenIndices.map(i => yaoIndexToName(i)).join('、');
    sections.push(`- 原神: ${ys.yuanShen}（${yuanIndices}）`);

    const jiIndices = ys.jiShenIndices.map(i => yaoIndexToName(i)).join('、');
    sections.push(`- 忌神: ${ys.jiShen}（${jiIndices}）`);

    const chouIndices = ys.chouShenIndices.map(i => yaoIndexToName(i)).join('、');
    sections.push(`- 仇神: ${ys.chouShen}（${chouIndices}）`);
  }
  sections.push('');

  // ============================================================
  // 5. 本卦装卦表
  // ============================================================
  sections.push('## 本卦装卦');
  sections.push('');
  sections.push('| 爻位 | 地支 | 五行 | 六亲 | 六神 | 世应 | 旬空 | 月破 | 伏神 | 动变 |');
  sections.push('|------|------|------|------|------|------|------|------|------|------|');

  for (let i = 5; i >= 0; i--) {
    sections.push(buildOriginalRow(orig.yaoLines[i]));
  }
  sections.push('');

  // ============================================================
  // 6. 变卦装卦表
  // ============================================================
  if (pan.changed) {
    sections.push('## 变卦装卦');
    sections.push('');
    sections.push('| 爻位 | 地支 | 五行 | 六亲 | 六神 | 世应 | 旬空 | 月破 |');
    sections.push('|------|------|------|------|------|------|------|------|');

    for (let i = 5; i >= 0; i--) {
      sections.push(buildChangedRow(pan.changed.yaoLines[i]));
    }
    sections.push('');
  }

  // ============================================================
  // 7. 爻间关系
  // ============================================================
  sections.push('## 爻间关系');
  sections.push('');
  sections.push('| 爻对 | 地支关系 | 五行关系 |');
  sections.push('|------|----------|----------|');

  const shiIdx = relations.hexagramImagery.shiYaoIndex;
  const yingIdx = relations.hexagramImagery.yingYaoIndex;
  const dongIndices = pan.dongYaoIndices;

  const sortedRelations = sortYaoRelations(
    relations.yaoRelations,
    shiIdx,
    yingIdx,
    dongIndices,
  );

  if (sortedRelations.length === 0) {
    sections.push('| - | - | - |');
  } else {
    for (const rel of sortedRelations) {
      const [aIdx, bIdx] = rel.yaos;
      // 爻对标识（含变爻交叉标记）
      const isCross = rel.changedSide !== undefined;
      // 获取爻数据：交叉关系中 changed 侧取变卦数据
      const getYaoData = (idx: number, isChanged: boolean) => {
        if (isChanged && pan.changed) return pan.changed.yaoLines[idx];
        return orig.yaoLines[idx];
      };
      const yaoA = getYaoData(aIdx, isCross && rel.changedSide === 0);
      const yaoB = getYaoData(bIdx, isCross && rel.changedSide === 1);

      // 世应标签仅用于本卦爻关系（交叉关系不用）
      const isShiYingPair = !isCross && (
        (aIdx === shiIdx && bIdx === yingIdx) || (aIdx === yingIdx && bIdx === shiIdx)
      );

      let label: string;
      if (isShiYingPair) {
        const shiYao = orig.yaoLines[shiIdx];
        const yingYao = orig.yaoLines[yingIdx];
        const shiPart = `${yaoIndexToName(shiIdx)}${formatDiZhiWuxing(shiYao.diZhi)}·${shiYao.liuQin}`;
        const yingPart = `${yaoIndexToName(yingIdx)}${formatDiZhiWuxing(yingYao.diZhi)}·${yingYao.liuQin}`;
        label = `世(${shiPart}) ↔ 应(${yingPart})`;
      } else {
        const aTag = isCross && rel.changedSide === 0 ? '(变)' : '';
        const bTag = isCross && rel.changedSide === 1 ? '(变)' : '';
        const aPart = `${yaoIndexToName(aIdx)}${aTag}${formatDiZhiWuxing(yaoA.diZhi)}·${yaoA.liuQin}`;
        const bPart = `${yaoIndexToName(bIdx)}${bTag}${formatDiZhiWuxing(yaoB.diZhi)}·${yaoB.liuQin}`;
        label = `${aPart} ↔ ${bPart}`;
      }

      // 地支关系：合并六冲/六合/六害/三刑
      const dzRels: string[] = [];
      if (rel.chong) dzRels.push('六冲');
      if (rel.he) dzRels.push(`六合(${rel.he})`);
      if (rel.hai) dzRels.push('六害');
      if (rel.xing) dzRels.push('三刑');
      const dzRelStr = dzRels.length > 0 ? dzRels.join('、') : '-';

      // 五行关系 — 将 A/B 替换为实际爻位名（变爻带标记）
      const aName = yaoIndexToName(aIdx) + (isCross && rel.changedSide === 0 ? '(变)' : '');
      const bName = yaoIndexToName(bIdx) + (isCross && rel.changedSide === 1 ? '(变)' : '');
      const wxRelMap: Record<string, string> = {
        'A生B': `${aName}生${bName}`,
        'A克B': `${aName}克${bName}`,
        'B生A': `${bName}生${aName}`,
        'B克A': `${bName}克${aName}`,
        '比和': '比和',
      };
      const wxRelStr = wxRelMap[rel.wuxingRelation] || rel.wuxingRelation;

      sections.push(`| ${label} | ${dzRelStr} | ${wxRelStr} |`);
    }
  }
  sections.push('');

  // ============================================================
  // 8. 动爻分析
  // ============================================================
  sections.push('## 动爻分析');
  sections.push('');

  if (relations.dongYaoAnalysis.length === 0) {
    sections.push('无动爻');
  } else {
    sections.push('| 动爻 | 本象 | 变化 | 进退 | 回头 |');
    sections.push('|------|------|------|------|------|');

    for (const dya of relations.dongYaoAnalysis) {
      const yaoName = yaoIndexToName(dya.yaoIndex);
      const originalStr = `${formatDiZhiWuxing(dya.originalDiZhi)}·${dya.originalLiuQin}`;
      const changedStr = `${formatDiZhiWuxing(dya.changedDiZhi)}·${dya.changedLiuQin}`;
      const jinTui = dya.jinTuiShen ?? '-';

      const HUITOU_DESC: Record<string, string> = {
        '回头生': '回头生（变爻回头生本爻）',
        '回头克': '回头克（变爻回头克本爻）',
        '泄气':   '泄气（本爻生变爻）',
        '耗气':   '耗气（本爻克变爻）',
        '比和':   '比和',
      };
      let huiTouStr = HUITOU_DESC[dya.huiTouRelation] || dya.huiTouRelation;
      if (dya.huiTouHe) {
        huiTouStr += `·化${dya.huiTouHe}合`;
      }
      if (dya.huiTouChong) {
        huiTouStr += '·化冲';
      }

      sections.push(`| ${yaoName} | ${originalStr} | ${changedStr} | ${jinTui} | ${huiTouStr} |`);
    }
  }
  sections.push('');

  // ============================================================
  // 9. 日月建影响
  // ============================================================
  sections.push('## 日月建影响');
  sections.push('');
  sections.push(
    `| 爻位 | 月建(${t.yueJian}${t.yueJianWuxing}) | 日辰(${t.riChen}${t.riChenWuxing}) | 旬空 | 月破 | 暗动 |`,
  );
  sections.push('|------|------------|------------|------|------|------|');

  // 本爻在前（上→初），变爻在后（上→初）
  const benYao = relations.timeInfluences.filter(ti => ti.source === '本').reverse();
  const bianYao = relations.timeInfluences.filter(ti => ti.source === '变').reverse();

  for (const ti of [...benYao, ...bianYao]) {
    const baseName = yaoIndexToName(ti.yaoIndex);
    const yaoName = ti.source === '变' ? `${baseName}(变)` : baseName;
    const yueStr = ti.yueRelation;
    const riStr = ti.riRelation;
    const xunKongStr = ti.isXunKong ? '旬空' : '-';
    const yuePoStr = ti.yueRelation === '月破' ? '月破' : '-';
    // 变爻不判断暗动
    const anDongStr = ti.source === '变' ? '-' : (ti.isAnDong ? '暗动' : '-');

    sections.push(`| ${yaoName} | ${yueStr} | ${riStr} | ${xunKongStr} | ${yuePoStr} | ${anDongStr} |`);
  }
  sections.push('');

  // ============================================================
  // 10. 伏神详情
  // ============================================================
  if (relations.fuShenSummary.length > 0) {
    sections.push('## 伏神');
    sections.push('');
    sections.push('| 爻位 | 飞神 | 伏神 | 飞伏关系 |');
    sections.push('|------|------|------|----------|');

    for (const fs of relations.fuShenSummary) {
      const yaoName = yaoIndexToName(fs.yaoIndex);
      const feiShenStr = formatDiZhiLiuQin(
        fs.feiShenDiZhi,
        diZhiWuxing(fs.feiShenDiZhi),
        fs.feiShenLiuQin,
      );
      const fuShenStr = formatDiZhiLiuQin(
        fs.fuShenDiZhi,
        diZhiWuxing(fs.fuShenDiZhi),
        fs.fuShenLiuQin,
      );

      const feiFuRels: string[] = [];
      // 五行生克关系（伏神=A, 飞神=B）
      const wxMap: Record<string, string> = {
        'A生B': '伏生飞', 'A克B': '伏克飞',
        'B生A': '飞生伏', 'B克A': '飞克伏',
        '比和': '比和',
      };
      feiFuRels.push(wxMap[fs.feiFuWuxingRelation] || fs.feiFuWuxingRelation);
      if (fs.feiFuChong) feiFuRels.push('六冲');
      if (fs.feiFuHe) feiFuRels.push(`六合(${fs.feiFuHe})`);
      const feiFuStr = feiFuRels.join('、');

      sections.push(`| ${yaoName} | ${feiShenStr} | ${fuShenStr} | ${feiFuStr} |`);
    }
    sections.push('');
  }

  return sections.join('\n');
}
