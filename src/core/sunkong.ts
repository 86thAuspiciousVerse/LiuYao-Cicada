// ============================================================
// 旬空 + 月破 + 日冲判断模块
// src/core/ 零依赖原则 — 纯 TypeScript 纯函数
// ============================================================

import type { DiZhi } from './types';
import { isChong } from './ganzhi';

/**
 * 判断一个爻是否落空亡 (旬空)
 *
 * 旬空规则: 日干支所在旬中没有的两个地支即为旬空。
 * 如甲子旬中戌亥空，甲戌旬中申酉空，等等。
 *
 * @param yaoDizhi      爻的地支
 * @param xunKongDizhis 旬空的两个地支 (来自 TimeInfo.xunKong)
 * @returns true 如果该爻落空亡
 */
export function isXunKong(yaoDizhi: DiZhi, xunKongDizhis: [DiZhi, DiZhi]): boolean {
  return yaoDizhi === xunKongDizhis[0] || yaoDizhi === xunKongDizhis[1];
}

/**
 * 判断一个爻是否月破
 *
 * 月破规则: 月建地支与爻地支构成六冲关系即为月破。
 *   子午冲, 丑未冲, 寅申冲, 卯酉冲, 辰戌冲, 巳亥冲
 *
 * @param yaoDizhi      爻的地支
 * @param yueJianDizhi  月建地支 (如正月建寅)
 * @returns true 如果该爻月破
 */
export function isYuePo(yaoDizhi: DiZhi, yueJianDizhi: DiZhi): boolean {
  return isChong(yaoDizhi, yueJianDizhi);
}

/**
 * 判断是否有日冲关系 (用于暗动/日破判断，不预判旺衰)
 *
 * 日冲规则: 日辰地支与爻地支构成六冲关系即为日冲。
 * 如日辰为子，爻为午则日冲。旺相者暗动，休囚者日破。
 * 此处只判断是否六冲，不判断旺衰。
 *
 * @param yaoDizhi      爻的地支
 * @param riChenDizhi   日辰地支
 * @returns true 如果构成日冲关系
 */
export function hasRiChong(yaoDizhi: DiZhi, riChenDizhi: DiZhi): boolean {
  return isChong(yaoDizhi, riChenDizhi);
}
