// ============================================================
// 八卦属性数据模块
// src/core/ 零依赖原则 — 纯 TypeScript 纯函数
// ============================================================

import type { TrigramName, TrigramInfo } from './types';

/**
 * 八卦完整属性表
 *
 * 八卦属性:
 *   乾☰ 金 阳 先天1 天 南
 *   兑☱ 金 阴 先天2 泽 东南
 *   离☲ 火 阴 先天3 火 东
 *   震☳ 木 阳 先天4 雷 东北
 *   巽☴ 木 阴 先天5 风 西南
 *   坎☵ 水 阳 先天6 水 西
 *   艮☶ 土 阳 先天7 山 西北
 *   坤☷ 土 阴 先天8 地 北
 */
export const BAGUA: Record<TrigramName, TrigramInfo> = {
  乾: {
    name: '乾',
    symbol: '☰',
    wuxing: '金',
    yinYang: '阳',
    xiantian: 1,
    nature: '天',
    direction: '南',
  },
  兑: {
    name: '兑',
    symbol: '☱',
    wuxing: '金',
    yinYang: '阴',
    xiantian: 2,
    nature: '泽',
    direction: '东南',
  },
  离: {
    name: '离',
    symbol: '☲',
    wuxing: '火',
    yinYang: '阴',
    xiantian: 3,
    nature: '火',
    direction: '东',
  },
  震: {
    name: '震',
    symbol: '☳',
    wuxing: '木',
    yinYang: '阳',
    xiantian: 4,
    nature: '雷',
    direction: '东北',
  },
  巽: {
    name: '巽',
    symbol: '☴',
    wuxing: '木',
    yinYang: '阴',
    xiantian: 5,
    nature: '风',
    direction: '西南',
  },
  坎: {
    name: '坎',
    symbol: '☵',
    wuxing: '水',
    yinYang: '阳',
    xiantian: 6,
    nature: '水',
    direction: '西',
  },
  艮: {
    name: '艮',
    symbol: '☶',
    wuxing: '土',
    yinYang: '阳',
    xiantian: 7,
    nature: '山',
    direction: '西北',
  },
  坤: {
    name: '坤',
    symbol: '☷',
    wuxing: '土',
    yinYang: '阴',
    xiantian: 8,
    nature: '地',
    direction: '北',
  },
};
