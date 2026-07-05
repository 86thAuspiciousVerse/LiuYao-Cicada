// ============================================================
// 六亲计算模块
// src/core/ 零依赖原则 — 纯 TypeScript 纯函数
// ============================================================

import type { Wuxing, DiZhi, LiuQin } from './types';
import { isSheng, isKe, diZhiWuxing } from './wuxing';

/**
 * 六亲规则: 以卦宫五行为"我"，爻地支五行与"我"的生克关系定六亲
 *
 *   关系     | 六亲
 *   同我     | 兄弟
 *   生我 (我生?) | 父母 (生我者 — 生我者为父母)
 *   Wait, let me re-check:
 *   生我 → 父母 (生我者为父母)
 *   我生 → 子孙 (我生者为子孙)
 *   克我 → 官鬼 (克我者为官鬼)
 *   我克 → 妻财 (我克者为妻财)
 *   同我 → 兄弟 (同我者为兄弟)
 */

/**
 * 计算单个爻的六亲
 *
 * @param gongWuxing 卦宫五行 ("我")
 * @param yaoDizhi   爻的地支
 * @returns 该爻的六亲
 */
export function getLiuQin(gongWuxing: Wuxing, yaoDizhi: DiZhi): LiuQin {
  const yaoWuxing = diZhiWuxing(yaoDizhi);

  // 同我 → 兄弟
  if (gongWuxing === yaoWuxing) {
    return '兄弟';
  }

  // 生我 → 父母 (宫五行被爻五行所生，即爻五行生宫五行)
  if (isSheng(yaoWuxing, gongWuxing)) {
    return '父母';
  }

  // 我生 → 子孙 (宫五行生爻五行)
  if (isSheng(gongWuxing, yaoWuxing)) {
    return '子孙';
  }

  // 克我 → 官鬼 (爻五行克宫五行)
  if (isKe(yaoWuxing, gongWuxing)) {
    return '官鬼';
  }

  // 我克 → 妻财 (宫五行克爻五行)
  // 五种关系必然匹配一种，此为最后一种
  return '妻财';
}

/**
 * 计算完整六爻的六亲列表
 *
 * @param gongWuxing 卦宫五行 ("我")
 * @param dizhiList  六爻的地支数组，长度应为 6 (初爻→上爻)
 * @returns 长度为 6 的六亲数组
 */
export function getLiuQinList(gongWuxing: Wuxing, dizhiList: DiZhi[]): LiuQin[] {
  return dizhiList.map(dizhi => getLiuQin(gongWuxing, dizhi));
}
