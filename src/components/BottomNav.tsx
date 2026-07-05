import { NavLink, useLocation } from 'react-router-dom'
import './BottomNav.css'

export default function BottomNav() {
  const location = useLocation()
  const isResultFlow = location.pathname === '/result' || location.pathname === '/analysis'

  if (isResultFlow) return null

  return (
    <nav className="bottom-nav" aria-label="主导航">
      <NavLink to="/" end className={({ isActive }) => `bottom-nav-item${isActive ? ' is-active' : ''}`}>
        <span className="bottom-nav-mark">卦</span>
        <span>起卦</span>
      </NavLink>
      <NavLink to="/settings" className={({ isActive }) => `bottom-nav-item${isActive ? ' is-active' : ''}`}>
        <span className="bottom-nav-mark">设</span>
        <span>设置</span>
      </NavLink>
    </nav>
  )
}
