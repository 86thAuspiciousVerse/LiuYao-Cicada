# 六爻蝉

六爻蝉是一个基于 React 和 Vite 的六爻起卦与排盘工具，面向移动端和桌面浏览器使用。项目支持多种起卦方式、传统六爻排盘展示、爻位关系查看，以及可选的 AI 解读。

## 功能特性

- 手动起卦：逐爻选择老阴、老阳、少阴、少阳。
- 时间起卦：基于农历年月日时生成卦象。
- 数字起卦：输入数字快速起卦。
- 排盘展示：显示本卦、变卦、六神、六亲、地支五行、伏神、世应、旬空、月破等信息。
- 爻位关系：选择两爻后展示生克比和、六合、六冲等关系。
- 最近排盘：在浏览器本地保存最近排盘记录。
- AI 解析：支持 OpenAI 兼容接口和 Claude；未配置 API Key 时使用本地规则摘要。

## 技术栈

- React 19
- TypeScript
- Vite
- React Router
- Capacitor
- lunar-typescript

## 本地开发

```bash
npm install
npm run dev
```

默认开发服务由 Vite 启动，终端会输出本地访问地址。

## 常用脚本

```bash
npm run dev      # 启动开发服务
npm run lint     # 运行 ESLint
npm run build    # 类型检查并构建生产包
npm run preview  # 预览生产构建
```

## AI 配置

进入应用的“设置”页面可以填写 AI 提供商、API Key、模型和 Base URL。

配置保存在浏览器本地，不需要写入仓库。请不要把真实 API Key 放进源码、README 或提交记录。

## 项目结构

```text
src/
  ai/          AI 分析接口与提示词
  components/ 复用组件
  core/       六爻排盘、干支、五行、纳甲等核心逻辑
  pages/      页面与对应样式
  utils/      历史记录、参数解析和设置读写
public/       静态资源
```

## 构建

```bash
npm run build
```

构建产物输出到 `dist/`，该目录不纳入版本控制。
