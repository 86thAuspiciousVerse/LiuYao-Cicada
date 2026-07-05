import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AIProviderType } from '../ai'
import { readAISettings, saveAISettings } from '../utils/aiSettings'
import './SettingsPage.css'

export default function SettingsPage() {
  const navigate = useNavigate()
  const initial = readAISettings()
  const [provider, setProvider] = useState<AIProviderType>(initial.provider)
  const [apiKey, setApiKey] = useState(initial.apiKey)
  const [model, setModel] = useState(initial.model)
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    saveAISettings({ provider, apiKey, model, baseUrl })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1800)
  }

  return (
    <div className="settings-page">
      <header className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)} aria-label="返回">
          <span aria-hidden="true">&larr;</span>
        </button>
        <h1 className="page-title">设置</h1>
      </header>

      <main className="settings-content">
        <section className="settings-card">
          <h2 className="settings-card-title">AI 解析</h2>
          <div className="settings-fields">
            <label className="settings-field">
              <span>提供商</span>
              <select
                value={provider}
                onChange={e => setProvider(e.target.value as AIProviderType)}
              >
                <option value="openai">OpenAI 兼容</option>
                <option value="claude">Claude</option>
              </select>
            </label>

            <label className="settings-field">
              <span>API Key</span>
              <input
                type="password"
                placeholder="不填写时使用本地规则摘要"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
              />
            </label>

            <label className="settings-field">
              <span>模型</span>
              <input
                placeholder={provider === 'openai' ? '默认 gpt-4o' : '默认 claude-sonnet-4-6'}
                value={model}
                onChange={e => setModel(e.target.value)}
              />
            </label>

            <label className="settings-field">
              <span>Base URL</span>
              <input
                placeholder={provider === 'openai' ? 'https://api.openai.com/v1' : 'https://api.anthropic.com'}
                value={baseUrl}
                onChange={e => setBaseUrl(e.target.value)}
              />
            </label>
          </div>
        </section>

        <section className="settings-card settings-note">
          <h2 className="settings-card-title">解析模式</h2>
          <p>结果页会优先使用这里保存的 AI 配置。未保存 API Key 时，系统会生成本地规则摘要。</p>
        </section>

        <button className="settings-save" onClick={handleSave}>
          {saved ? '已保存' : '保存设置'}
        </button>
      </main>
    </div>
  )
}
