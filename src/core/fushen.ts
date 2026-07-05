// ============================================================
// 伏神模块 — 本卦六亲不全时从本宫首卦补入
// src/core/ 零依赖原则 — 纯 TypeScript 纯函数
// ============================================================

import type { YaoLine, TrigramName, LiuQin } from './types';
import { getNaJiaDizhi } from './najia';
import { getLiuQinList } from './liuqin';
import { PALACE_WUXING } from './palace';
import { diZhiWuxing } from './wuxing';

/** 六亲全集 (5种) */
const ALL_LIUQIN: LiuQin[] = ['父母', '兄弟', '妻财', '官鬼', '子孙'];

/**
 * 给本卦的 6 条爻补充伏神信息
 *
 * 伏神规则:
 * 1. 统计本卦 6 爻的六亲集合，看缺哪几个
 * 2. 六亲齐全 → 无伏神，直接返回原数组
 * 3. 对每个缺失的六亲，在本宫首卦（八纯卦）中查找该六亲首次出现的爻位
 * 4. 在该爻位上，将本宫首卦对应的地支+六亲作为伏神 (fuShen)
 * 5. 飞神 = 本卦该爻位当前的六亲内容
 * 6. 若本宫首卦在该爻位的六亲与本卦完全一致 → 不设伏神
 *
 * @param yaoLines      本卦当前 6 条爻（已有六亲、地支）
 * @param palaceTrigram 本卦所属宫名（如 '乾'、'兑'）
 * @returns 更新后的 YaoLine[]，带 fuShen 字段（无伏神的爻 fuShen 为 undefined）
 */
export function fillFuShen(
  yaoLines: YaoLine[],
  palaceTrigram: TrigramName,
): YaoLine[] {
  // --- 1. 检查六亲是否齐全 ---

  const presentLiuQin = new Set<LiuQin>();
  for (const yao of yaoLines) {
    presentLiuQin.add(yao.liuQin);
  }

  // 五种六亲都出现了 → 无伏神
  if (presentLiuQin.size >= 5) {
    return yaoLines.map(y => ({ ...y, fuShen: undefined }));
  }

  // --- 2. 获取本宫首卦（八纯卦）的纳甲与六亲 ---

  // 本宫首卦 = 该宫的八纯卦，卦名与宫名相同
  const palaceDizhi = getNaJiaDizhi(palaceTrigram);      // 6 个地支
  const palaceWuxing = PALACE_WUXING[palaceTrigram];      // 宫五行
  const palaceLiuQin = getLiuQinList(palaceWuxing, palaceDizhi); // 6 个六亲

  // --- 3. 找出缺失的六亲 ---

  const missingLiuQin = ALL_LIUQIN.filter(
    lq => !presentLiuQin.has(lq),
  );

  // --- 4. 逐个补充伏神 ---

  // 先浅拷贝本卦所有爻，并将 fuShen 重置为 undefined
  const result: YaoLine[] = yaoLines.map(y => ({
    ...y,
    fuShen: undefined,
  }));

  for (const missing of missingLiuQin) {
    // 在本宫首卦中找到该六亲首次出现的位置（从初爻往上找）
    const pos = palaceLiuQin.indexOf(missing);
    if (pos === -1) {
      // 防御性编程：本宫首卦不可能缺少某六亲，但保持健壮
      continue;
    }

    // 若本宫首卦在该爻位的六亲与本卦相同 → 该爻位已自带此六亲，不需伏神
    if (result[pos].liuQin === palaceLiuQin[pos]) {
      continue;
    }

    // 补充伏神（用本宫首卦在该爻位的地支+六亲）
    result[pos] = {
      ...result[pos],
      fuShen: {
        diZhi: palaceDizhi[pos],
        diZhiWuxing: diZhiWuxing(palaceDizhi[pos]),
        liuQin: palaceLiuQin[pos],
      },
    };
  }

  return result;
}
