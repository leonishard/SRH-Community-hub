import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import './Sidebar.css';

const NAV_ITEMS = [
  { to: '/my-circle', label: 'My Circle' },
  { to: '/discover', label: 'Discover' },
  { to: '/groups', label: 'Groups' },
  { to: '/events', label: 'Events' },
  { to: '/friends', label: 'Friends' },
];

export function Sidebar() {
  const { student, isAuthenticated, roleType, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const navItems = roleType === 'coordinator' ? [...NAV_ITEMS, { to: '/review', label: 'Review' }] : NAV_ITEMS;

  function handleLogout() {
    logout();
    // If logging out from a guarded route (e.g. /my-circle), ProtectedRoute
    // will redirect to /login itself — landing on /discover otherwise gives
    // a friendlier "logged out" destination. Either way the sidebar (and
    // guest nav) stays visible since /login lives inside AppLayout too.
    navigate('/discover');
  }

  return (
    <aside className="sidebar">
      <div className="sidebar__brand mono">SRH AMBASSADOR HUB</div>

      <nav className="sidebar__nav">
        {navItems.map((item) => (
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
            {student ? (
              <Link to={`/students/${student.documentId}`} className="sidebar__user-name sidebar__user-name--link">
                {student.name}
              </Link>
            ) : (
              <div className="sidebar__user-name">Signed in</div>
            )}
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
