import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import './Sidebar.css';

const NAV_ITEMS = [
  { to: '/my-circle', label: 'My Circle' },
  { to: '/discover', label: 'Discover' },
  { to: '/groups', label: 'Groups' },
  { to: '/events', label: 'Events' },
];

export function Sidebar() {
  const { student, isAuthenticated, roleType, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/discover');
  }

  return (
    <aside className="sidebar">
      <div className="sidebar__brand mono">SRH AMBASSADOR HUB</div>

      <nav className="sidebar__nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `sidebar__nav-item mono${isActive ? ' sidebar__nav-item--active' : ''}`}
          >
            {item.label.toUpperCase()}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__footer">
        {isAuthenticated ? (
          <div className="sidebar__user">
            <div className="sidebar__user-name">{student?.name || 'Signed in'}</div>
            <div className="sidebar__user-role caption">{roleType.replace('_', ' ')}</div>
          </div>
        ) : (
          <div className="sidebar__user">
            <div className="sidebar__user-name">Guest</div>
            <div className="sidebar__user-role caption">browsing publicly</div>
          </div>
        )}

        <button type="button" className="sidebar__theme-toggle mono" onClick={toggleTheme}>
          {theme === 'dark' ? 'LIGHT MODE' : 'DARK MODE'}
        </button>

        {isAuthenticated ? (
          <button type="button" className="sidebar__logout mono" onClick={handleLogout}>
            LOG OUT
          </button>
        ) : (
          <NavLink to="/login" className="sidebar__logout mono">
            SIGN IN
          </NavLink>
        )}
      </div>
    </aside>
  );
}
