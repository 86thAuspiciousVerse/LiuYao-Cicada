// ============================================================
// 调试页面 — 查看排盘结果的 AI 格式化 Markdown 文本
// ============================================================

import { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { paipan } from '../core/paipan';
import { extract } from '../core/extractor';
import { serializeForAI } from '../core/serializer';
import { numberDivination, twoNumberDivination } from '../core/divination-methods';
import type { TrigramName, HexagramPan, LiuQin } from '../core/types';
import './DebugPage.css';

const LIU_QIN_OPTIONS: LiuQin[] = ['父母', '兄弟', '妻财', '官鬼', '子孙'];

// ============================================================
// 参数解析（复用 ResultPage 的 buildPan 逻辑）
// ============================================================

function parseLiuQin(value: string | null): LiuQin | undefined {
  if (!value) return undefined;
  return LIU_QIN_OPTIONS.includes(value as LiuQin) ? value as LiuQin : undefined;
}

function buildPan(sp: URLSearchParams): HexagramPan | null {
  try {
    const date = sp.get('date') ? new Date(sp.get('date')!) : new Date();
    const question = sp.get('question') || undefined;
    const yongShen = parseLiuQin(sp.get('yongShen'));

    // 所有起卦方式都会传 upper/lower/dongYao → 优先使用
    const upper = sp.get('upper') as TrigramName;
    const lower = sp.get('lower') as TrigramName;
    if (upper && lower) {
      const dongYao = (sp.get('dongYao') || '').split(',').filter(Boolean).map(Number);
      return paipan({ upper, lower, dongYao, date, question, yongShen });
    }

    // Fallback: 通过 n1/n2/n3 还原数字起卦
    const n1 = Number(sp.get('n1'));
    const n2 = Number(sp.get('n2'));
    if (!isNaN(n1) && !isNaN(n2)) {
      const n3 = sp.get('n3');
      const input = n3 !== null
        ? numberDivination(n1, n2, Number(n3), date)
        : twoNumberDivination(n1, n2, date);
      if (question) input.question = question;
      if (yongShen) input.yongShen = yongShen;
      return paipan(input);
    }

    return null;
  } catch { return null; }
}

// ============================================================
// 简单的 Markdown → HTML 渲染器
// ============================================================

function renderMarkdown(md: string): string {
  const lines = md.split('\n');
  const htmlParts: string[] = [];
  let inTable = false;
  let inCodeBlock = false;
  let inList = false;
  let tableRows: string[] = [];
  let codeLines: string[] = [];

  function flushTable() {
    if (tableRows.length > 0) {
      htmlParts.push('<table>' + tableRows.join('') + '</table>');
      tableRows = [];
    }
    inTable = false;
  }

  function flushList() {
    if (inList) {
      htmlParts.push('</ul>');
      inList = false;
    }
  }

  function flushCode() {
    if (inCodeBlock) {
      htmlParts.push('</code></pre>');
      codeLines = [];
      inCodeBlock = false;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 代码块
    if (line.startsWith('```')) {
      flushTable();
      flushList();
      if (inCodeBlock) {
        flushCode();
      } else {
        inCodeBlock = true;
        htmlParts.push('<pre><code class="md-code-block">');
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(escapeHtml(line));
      continue;
    }

    // 空行: 刷新表格和列表
    if (line.trim() === '') {
      flushTable();
      flushList();
      htmlParts.push('<div class="md-empty-line"></div>');
      continue;
    }

    // 表格行
    if (line.startsWith('|') && line.endsWith('|')) {
      flushList();
      // 分隔行（|---|）跳过
      if (/^\|[-| ]+\|$/.test(line)) continue;

      inTable = true;
      const cells = line
        .split('|')
        .filter(c => c !== '')
        .map(c => escapeHtml(c.trim()));

      const isHeader = !inTable || tableRows.length === 0;
      const tag = isHeader ? 'th' : 'td';
      tableRows.push(
        '<tr>' + cells.map(c => `<${tag}>${c}</${tag}>`).join('') + '</tr>',
      );
      continue;
    }

    // 如果之前在表格中，现在遇到非表格行，刷新表格
    if (inTable) {
      flushTable();
    }

    // 标题
    if (line.startsWith('### ')) {
      flushList();
      htmlParts.push(`<h3>${parseInline(line.slice(4))}</h3>`);
      continue;
    }
    if (line.startsWith('## ')) {
      flushList();
      htmlParts.push(`<h2>${parseInline(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith('# ')) {
      flushList();
      htmlParts.push(`<h1>${parseInline(line.slice(2))}</h1>`);
      continue;
    }

    // 无序列表
    if (line.startsWith('- ')) {
      if (!inList) {
        inList = true;
        htmlParts.push('<ul>');
      }
      htmlParts.push(`<li>${parseInline(line.slice(2))}</li>`);
      continue;
    }

    // 普通段落
    flushList();
    htmlParts.push(`<p>${parseInline(line)}</p>`);
  }

  // 收尾
  flushTable();
  flushList();
  flushCode();

  return htmlParts.join('\n');
}

/** 转义 HTML 特殊字符 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** 解析行内标记：**bold** */
function parseInline(text: string): string {
  // 先转义
  let s = escapeHtml(text);
  // **bold** → <strong>
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  return s;
}

// ============================================================
// 错误状态
// ============================================================

function ErrorState({ message }: { message?: string }) {
  return (
    <div className="debug-error">
      <Link to="/" className="debug-back">← 返回</Link>
      <p>{message || '排盘参数异常，请重新起卦。'}</p>
    </div>
  );
}

// ============================================================
// 主组件
// ============================================================

type TabKey = 'raw' | 'preview';

export default function DebugPage() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabKey>('preview');
  const [copied, setCopied] = useState(false);

  const pan = useMemo(() => buildPan(searchParams), [searchParams]);

  const markdown = useMemo(() => {
    if (!pan) return '';
    const relations = extract(pan);
    return serializeForAI(pan, relations);
  }, [pan]);

  const renderedHtml = useMemo(() => renderMarkdown(markdown), [markdown]);

  if (!pan) return <ErrorState />;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipbaord API 不可用时 fallback
      const ta = document.createElement('textarea');
      ta.value = markdown;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 构建返回链接（保留全部参数）
  const backParams = new URLSearchParams();
  for (const [k, v] of searchParams.entries()) {
    backParams.set(k, v);
  }
  const backUrl = `/result?${backParams.toString()}`;

  return (
    <div className="debug-page">
      <header className="debug-header">
        <Link to={backUrl} className="debug-back">← 返回</Link>
        <h1 className="debug-title">调试输出</h1>
        <div style={{ width: 40 }} />
      </header>

      {/* Tab 切换 */}
      <div className="debug-tabs">
        <button
          className={'debug-tab' + (activeTab === 'preview' ? ' is-active' : '')}
          onClick={() => setActiveTab('preview')}
        >
          渲染预览
        </button>
        <button
          className={'debug-tab' + (activeTab === 'raw' ? ' is-active' : '')}
          onClick={() => setActiveTab('raw')}
        >
          原始 Markdown
        </button>
      </div>

      {/* 内容区 */}
      <div className="debug-content">
        {activeTab === 'raw' ? (
          <div className="debug-raw">
            <pre><code className="md-raw-code">{markdown}</code></pre>
          </div>
        ) : (
          <div
            className="debug-rendered"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        )}
      </div>

      {/* 复制按钮 */}
      <div className="debug-footer">
        <button className="debug-copy-btn" onClick={handleCopy}>
          {copied ? '已复制!' : '复制到剪贴板'}
        </button>
      </div>
    </div>
  );
}
