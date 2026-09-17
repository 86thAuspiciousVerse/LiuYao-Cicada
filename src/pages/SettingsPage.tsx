import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AIProviderType } from '../ai'
import { readAISettings, saveAISettings } from '../utils/aiSettings'
import './SettingsPage.css'

export default function SettingsPage() {
  const navigate = useNavigate()
  const initial = readAISettings()
  const [provider, setProvider] = useState<AIProviderType>(initial.provider)
  const [providerName, setProviderName] = useState(initial.providerName)
  const [model, setModel] = useState(initial.model)
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl)
  const [apiKey, setApiKey] = useState(initial.apiKey)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    saveAISettings({ provider, providerName, model, baseUrl, apiKey })
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
              <span>服务商名称</span>
              <input
                value={providerName}
                onChange={e => setProviderName(e.target.value)}
                placeholder={provider === 'openai' ? '例如：DeepSeek、硅基流动、Ollama' : '例如：Claude'}
                autoComplete="organization"
              />
            </label>

            <label className="settings-field">
              <span>模型</span>
              <input
                placeholder={provider === 'openai' ? '服务端默认或 gpt-4o' : '服务端默认 Claude 模型'}
                value={model}
                onChange={e => setModel(e.target.value)}
                autoComplete="off"
              />
            </label>

            <label className="settings-field">
              <span>Base URL</span>
              <input
                type="url"
                value={baseUrl}
                onChange={e => setBaseUrl(e.target.value)}
                placeholder={provider === 'openai' ? '留空使用服务端默认；例如 https://api.example.com/v1' : '留空使用服务端默认'}
                autoComplete="url"
                spellCheck={false}
              />
            </label>

            <label className="settings-field">
              <span>API Key</span>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="留空使用服务端环境变量"
                autoComplete="new-password"
              />
            </label>
          </div>
        </section>

        <section className="settings-card settings-note">
          <h2 className="settings-card-title">解析模式</h2>
          <p>远程 AI 通过服务端代理调用。这里填写的配置会保存在当前浏览器本地，并随请求发送给服务端；留空时使用服务端环境变量。公共设备请不要保存 API Key。</p>
        </section>

        <button className="settings-save" onClick={handleSave}>
          {saved ? '已保存' : '保存设置'}
        </button>
      </main>
    </div>
  )
}
