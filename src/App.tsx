import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ManualPage from './pages/ManualPage'
import TimePage from './pages/TimePage'
import NumberPage from './pages/NumberPage'
import ShakePage from './pages/ShakePage'
import ResultPage from './pages/ResultPage'
import DebugPage from './pages/DebugPage'
import SettingsPage from './pages/SettingsPage'
import AnalysisPage from './pages/AnalysisPage'
import BottomNav from './components/BottomNav'
import './App.css'

export default function App() {
  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/manual" element={<ManualPage />} />
        <Route path="/time" element={<TimePage />} />
        <Route path="/number" element={<NumberPage />} />
        <Route path="/shake" element={<ShakePage />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="/analysis" element={<AnalysisPage />} />
        <Route path="/debug" element={<DebugPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
      <BottomNav />
    </div>
  )
}
