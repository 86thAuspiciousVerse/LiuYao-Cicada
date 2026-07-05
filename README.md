# 六爻蝉

六爻蝉是一个基于 React 和 Vite 的六爻起卦与排盘工具，面向移动端和桌面浏览器使用。项目支持多种起卦方式、传统六爻排盘展示、爻位关系查看，以及可选的 AI 解读。

## 功能特性

- 手动起卦：逐爻选择老阴、老阳、少阴、少阳。
- 时间起卦：基于农历年月日时生成卦象。
- 数字起卦：输入数字快速起卦。
- 排盘展示：显示本卦、变卦、六神、六亲、地支五行、伏神、世应、旬空、月破等信息。
- 爻位关系：选择两爻后展示生克比和、六合、六冲等关系。
- 最近排盘：在浏览器本地保存最近排盘记录。
- AI 解析：通过服务端代理支持 OpenAI 兼容接口和 Claude；也可生成本地规则摘要。

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

如果要在开发环境测试远程 AI，请另开一个终端启动服务端代理：

```bash
npm run api
```

Vite 开发服务会把 `/api` 请求转发到 `http://127.0.0.1:8787`。

## 常用脚本

```bash
npm run dev      # 启动开发服务
npm run api      # 启动 AI 代理和静态文件服务
npm start        # 同 npm run api，适合生产环境启动
npm run lint     # 运行 ESLint
npm run build    # 类型检查并构建生产包
npm run preview  # 预览生产构建
```

## AI 配置

AI Key 不保存在浏览器中，也不由前端直接请求官方 API。远程 AI 统一通过服务端 `/api/analyze` 代理调用。

复制 `.env.example` 为 `.env`，然后在 `.env` 中填写真实密钥：

```bash
cp .env.example .env
```

PowerShell 可以使用：

```powershell
Copy-Item .env.example .env
```

常用环境变量：

```text
PORT=8787
AI_PROVIDER=openai

OPENAI_API_KEY=你的 OpenAI 或兼容接口 Key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o

ANTHROPIC_API_KEY=你的 Anthropic Key
ANTHROPIC_BASE_URL=https://api.anthropic.com
ANTHROPIC_MODEL=你的 Claude 模型名
```

进入应用的“设置”页面可以选择提供商和模型。Base URL 与 API Key 只从服务端环境变量读取。

`.env` 已被忽略，请不要把真实 API Key 放进源码、README 或提交记录。

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

构建后可用内置服务启动生产预览和 AI 代理：

```bash
npm start
```
