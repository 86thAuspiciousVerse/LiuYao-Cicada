// ============================================================
// 六兽 (六神) 模块
// src/core/ 零依赖原则 — 纯 TypeScript 纯函数
// ============================================================

import type { TianGan, LiuShou } from './types';
import { liuShouOffset } from './ganzhi';

/**
 * 六神固定顺序: 青龙 → 朱雀 → 勾陈 → 腾蛇 → 白虎 → 玄武
 *
 * 六神配爻规则:
 * 从初爻开始起排，每爻一位，顺序循环
 * 起首由起卦日的日干决定
 */
export const LIU_SHOU_ORDER: LiuShou[] = ['青龙', '朱雀', '勾陈', '腾蛇', '白虎', '玄武'];

/**
 * 根据日干获取六条爻的六兽列表
 *
 * 日干起首:
 *   甲乙日 → 青龙起 (偏移 0)
 *   丙丁日 → 朱雀起 (偏移 1)
 *   戊日   → 勾陈起 (偏移 2)
 *   己日   → 腾蛇起 (偏移 3)
 *   庚辛日 → 白虎起 (偏移 4)
 *   壬癸日 → 玄武起 (偏移 5)
 *
 * @param riGan 起卦日的天干
 * @returns 长度为 6 的六兽数组，索引 0-5 对应初爻到上爻
 */
export function getLiuShouList(riGan: TianGan): LiuShou[] {
  const offset = liuShouOffset(riGan);
  const result: LiuShou[] = [];

  for (let i = 0; i < 6; i++) {
    const index = (offset + i) % 6;
    result.push(LIU_SHOU_ORDER[index]);
  }

  return result;
}
