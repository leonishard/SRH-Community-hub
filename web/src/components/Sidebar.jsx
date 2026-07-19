import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { API_URL } from '../api/client';
import './Sidebar.css';

export function Sidebar() {
  const { student, isAuthenticated, roleType, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();

  const navigate = useNavigate();

  const NAV_ITEMS = [
    { to: '/my-circle', label: t.nav.myCircle },
    { to: '/discover', label: t.nav.discover },
    { to: '/groups', label: t.nav.groups },
    { to: '/events', label: t.nav.events },
    { to: '/friends', label: t.nav.friends },
  ];
  const navItems = roleType === 'coordinator' ? [...NAV_ITEMS, { to: '/review', label: t.nav.review }] : NAV_ITEMS;

  function handleLogout() {
    logout();
    // If logging out from a guarded route (e.g. /my-circle), ProtectedRoute
    // will redirect to /login itself — landing on /discover otherwise gives
    // a friendlier "logged out" destination. Either way the sidebar (and
    // guest nav) stays visible since /login lives inside AppLayout too.
    navigate('/discover');
  }

  return (
    <header className="sidebar">
      <div className="sidebar__brand mono">{t.brand.toUpperCase()}</div>

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
            <div className="sidebar__user-text">
              {student ? (
                <Link to={`/students/${student.documentId}`} className="sidebar__user-name sidebar__user-name--link">
                  {student.name}
                </Link>
              ) : (
                <span className="sidebar__user-name">{t.signedIn}</span>
              )}
              <span className="sidebar__user-role caption">{t.roles[roleType] || roleType.replace('_', ' ')}</span>
            </div>
            <div className="sidebar__avatar">
              {student?.profilePicture?.url ? (
                <img src={`${API_URL}${student.profilePicture.url}`} alt="" />
              ) : (
                <div className="sidebar__avatar-placeholder" />
              )}
            </div>
          </div>
        ) : (
          <div className="sidebar__user">
            <div className="sidebar__user-text">
              <span className="sidebar__user-name">{t.guest}</span>
              <span className="sidebar__user-role caption">{t.browsingPublicly}</span>
            </div>
            <div className="sidebar__avatar">
              <div className="sidebar__avatar-placeholder" />
            </div>
          </div>
        )}

        <div className="sidebar__actions">
          <button type="button" className="sidebar__theme-toggle mono" onClick={toggleLanguage}>
            {language === 'en' ? 'DEUTSCH' : 'ENGLISH'}
          </button>

          <button type="button" className="sidebar__theme-toggle mono" onClick={toggleTheme}>
            {theme === 'dark' ? t.lightMode : t.darkMode}
          </button>

          {isAuthenticated ? (
            <button type="button" className="sidebar__logout mono" onClick={handleLogout}>
              {t.logOut}
            </button>
          ) : (
            <NavLink to="/login" className="sidebar__logout mono">
              {t.signIn}
            </NavLink>
          )}
        </div>
      </div>
    </header>
  );
}
