// ============================================================
// 六爻核心类型定义
// src/core/ 零依赖原则 — 不引用 React / React Native
// ============================================================

/** 五行 */
export type Wuxing = '金' | '木' | '水' | '火' | '土';

/** 八卦名称 */
export type TrigramName = '乾' | '兑' | '离' | '震' | '巽' | '坎' | '艮' | '坤';

/** 天干 */
export type TianGan = '甲' | '乙' | '丙' | '丁' | '戊' | '己' | '庚' | '辛' | '壬' | '癸';

/** 地支 */
export type DiZhi = '子' | '丑' | '寅' | '卯' | '辰' | '巳' | '午' | '未' | '申' | '酉' | '戌' | '亥';

/** 阴阳 */
export type YinYang = '阳' | '阴';

/** 爻的四象结果 (铜钱起卦) */
export type YaoResult = 6 | 7 | 8 | 9;
// 6=老阴(交·动), 7=少阳(单), 8=少阴(拆), 9=老阳(重·动)

/** 六亲 */
export type LiuQin = '父母' | '兄弟' | '妻财' | '官鬼' | '子孙';

/** 六兽 */
export type LiuShou = '青龙' | '朱雀' | '勾陈' | '腾蛇' | '白虎' | '玄武';

/** 世应标注 */
export type ShiYing = '世' | '应' | null;

/** 八卦属性 */
export interface TrigramInfo {
  name: TrigramName;
  symbol: string;      // ☰☱☲☳☴☵☶☷
  wuxing: Wuxing;
  yinYang: YinYang;
  xiantian: number;    // 先天数 1-8
  nature: string;       // 天/泽/火/雷/风/水/山/地
  direction: string;    // 方位
}

/** 六十四卦信息 */
export interface HexagramInfo {
  index: number;         // 1-64
  name: string;          // 如"乾为天"
  upper: TrigramName;
  lower: TrigramName;
  symbol: string;        // Unicode 卦符 ䷀䷁...
}

/** 宫位信息 */
export interface PalaceInfo {
  palace: TrigramName;   // 所属八宫
  wuxing: Wuxing;        // 宫五行
  shiYaoIndex: number;   // 世爻位置 0-5（初-上）
  yingYaoIndex: number;  // 应爻位置 0-5
  position: '本宫' | '一世' | '二世' | '三世' | '四世' | '五世' | '游魂' | '归魂';
}

/** 单爻 (装卦后) */
export interface YaoLine {
  index: number;          // 0-5 初爻到上爻

  // 纳甲
  diZhi: DiZhi;
  diZhiWuxing: Wuxing;

  // 爻本身的阴阳
  yinYang: YinYang;
  isDong: boolean;        // 是否为动爻

  // 六亲
  liuQin: LiuQin;

  // 六兽
  liuShou: LiuShou;

  // 世应
  shiYing: ShiYing;

  // 旬空
  isXunKong: boolean;     // 是否落空亡

  // 月破 (与月建相冲)
  isYuePo: boolean;        // 是否月破

  // 伏神 (本卦六亲不全时从本宫补)
  fuShen?: {
    diZhi: DiZhi;
    diZhiWuxing: Wuxing;
    liuQin: LiuQin;
  };

  // 变卦相关 (仅动爻)
  changed?: {
    diZhi: DiZhi;
    diZhiWuxing: Wuxing;
    liuQin: LiuQin;
    yinYang: YinYang;
  };
}

/** 时间信息 */
export interface TimeInfo {
  solarDate: Date;         // 公历日期
  lunarYear: string;       // 农历年 如"丙午"
  lunarMonth: string;      // 农历月
  lunarDay: string;        // 农历日
  shiChen: string;         // 时辰 如"申"
  yearGanZhi: string;      // 年干支
  monthGanZhi: string;     // 月干支
  dayGanZhi: string;       // 日干支
  hourGanZhi: string;      // 时干支
  riGan: TianGan;          // 日干（六兽用）
  riZhi: DiZhi;            // 日支（暗动/日破用）
  yueJian: DiZhi;          // 月建地支
  yueJianWuxing: Wuxing;   // 月建五行
  riChen: DiZhi;           // 日辰地支
  riChenWuxing: Wuxing;    // 日辰五行
  xunKong: [DiZhi, DiZhi]; // 旬空的两个地支
}

/** 起卦参数 */
export interface DivinationInput {
  upper: TrigramName;       // 上卦
  lower: TrigramName;       // 下卦
  dongYao: number[];        // 动爻索引 0-5（初爻=0 到 上爻=5）
  date: Date;               // 起卦公历时间
  question?: string;        // 用户占问事项
  yongShen?: LiuQin;        // 用户指定用神 (可选)
}

/** 完整卦盘 — 排盘输出 */
export interface HexagramPan {
  // 本卦
  original: {
    info: HexagramInfo;
    palace: PalaceInfo;
    yaoLines: YaoLine[];
  };

  // 变卦 (无动爻则为 null)
  changed: {
    info: HexagramInfo;
    yaoLines: YaoLine[];    // 只含静爻+动爻的变后状态
  } | null;

  // 时间信息
  time: TimeInfo;

  // 元数据
  dongYaoIndices: number[];  // 动爻索引
  hasDongYao: boolean;
  yongShen?: LiuQin;         // 用户手动指定的用神（留空=未指定）
  question?: string;          // 用户占问事项
}

// ============================================================
// Extractor 输出类型 — 排盘 → 结构化关系
// ============================================================

/** 五行生克关系（A 对 B） */
export type WuxingRelation = 'A生B' | 'A克B' | 'B生A' | 'B克A' | '比和';

/** 日月建对单爻的影响 */
export interface TimeInfluence {
  yaoIndex: number;
  /** 来源: '本'=本卦爻, '变'=变卦爻 */
  source: '本' | '变';
  /** 月建五行与爻地支五行的关系 */
  yueRelation: '月生爻' | '月克爻' | '爻生月' | '爻克月' | '比和' | '月破';
  /** 日辰五行与爻地支五行的关系 */
  riRelation: '日生爻' | '日克爻' | '爻生日' | '爻克日' | '比和' | '日冲';
  isXunKong: boolean;
  /** 日冲标记: 爻被日辰冲 */
  hasRiChong: boolean;
  /** 暗动: 日冲 + 非月破 + 非旬空（仅本卦爻） */
  isAnDong: boolean;
  yueJianDiZhi: DiZhi;
  riChenDiZhi: DiZhi;
}

/** 爻间两两关系 */
export interface YaoRelation {
  yaos: [number, number];   // 两个爻的索引 (0-5)
  chong: boolean;           // 地支六冲
  he: Wuxing | null;        // 地支六合（含化五行）
  hai: boolean;             // 地支六害
  xing: boolean;            // 地支三刑
  wuxingRelation: WuxingRelation; // 五行生克关系（A 对 B）
  /** 变爻交叉标记: yaos[0] 或 yaos[1] 是变卦爻 (0=yaos[0]是变爻, 1=yaos[1]是变爻) */
  changedSide?: 0 | 1;
}

/** 动爻分析 */
export interface DongYaoAnalysis {
  yaoIndex: number;
  originalDiZhi: DiZhi;
  changedDiZhi: DiZhi;
  originalLiuQin: LiuQin;
  changedLiuQin: LiuQin;
  /** 进退神: 同五行连续位移 */
  jinTuiShen: '进神' | '退神' | null;
  /** 变回头: changed 五行 vs original 五行 */
  huiTouRelation: '回头生' | '回头克' | '泄气' | '耗气' | '比和';
  /** 化回头合: original 地支与 changed 地支是否六合 */
  huiTouHe: Wuxing | null;
  /** 化回头冲: original 地支与 changed 地支是否六冲 */
  huiTouChong: boolean;
}

/** 用神分析 */
export interface YongShenAnalysis {
  /** 最终使用的用神（用户指定 或 占问推断） */
  yongShen: LiuQin;
  /** 用神所在的爻索引（可能多个） */
  yaoIndices: number[];
  /** 用神是否在世爻 */
  isShiYao: boolean;
  /** 原神: 生用神的六亲 */
  yuanShen: LiuQin;
  /** 忌神: 克用神的六亲 */
  jiShen: LiuQin;
  /** 仇神: 生忌神的六亲 = 克原神的六亲 */
  chouShen: LiuQin;
  /** 原神/忌神/仇神所在爻索引 */
  yuanShenIndices: number[];
  jiShenIndices: number[];
  chouShenIndices: number[];
  /** 用神所在爻的状态标记 */
  isYongShenKong: boolean;
  isYongShenPo: boolean;
  isYongShenDong: boolean;
  /** 用神是否在应爻 */
  isYingYao: boolean;
}

/** 伏神摘要 */
export interface FuShenSummary {
  yaoIndex: number;         // 伏神挂在哪个爻下
  fuShenDiZhi: DiZhi;
  fuShenLiuQin: LiuQin;
  feiShenDiZhi: DiZhi;     // 飞神（所在爻本气）地支
  feiShenLiuQin: LiuQin;
  /** 伏神与飞神地支关系 */
  feiFuChong: boolean;
  feiFuHe: Wuxing | null;
  /** 伏神与飞神五行生克: 伏生飞/伏克飞/飞生伏/飞克伏/比和 */
  feiFuWuxingRelation: WuxingRelation;
}

/** Extractor 完整输出 — 排盘的结构化关系汇总 */
export interface ExtractedRelations {
  /** 卦象基本信息 */
  hexagramImagery: {
    hexagramName: string;
    hexagramSymbol: string;
    upperTrigram: TrigramName;
    lowerTrigram: TrigramName;
    palaceWuxing: Wuxing;
    shiYaoIndex: number;
    yingYaoIndex: number;
    shiYaoPosition: string;    // 如 "世在三爻"
    yingYaoPosition: string;   // 如 "应在六爻"
  };

  /** 本卦爻间两两关系（15对，仅包含 non-null 关系） */
  yaoRelations: YaoRelation[];

  /** 动爻分析（无动爻则为空数组） */
  dongYaoAnalysis: DongYaoAnalysis[];

  /** 日月建对每爻的影响（6条） */
  timeInfluences: TimeInfluence[];

  /** 伏神摘要（无伏神则为空数组） */
  fuShenSummary: FuShenSummary[];

  /** 用神分析（无法确定用神则为 null） */
  yongShenAnalysis: YongShenAnalysis | null;
}
