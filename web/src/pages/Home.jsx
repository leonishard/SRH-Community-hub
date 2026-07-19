import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import './Home.css';

export function Home() {
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="home">
      <div className="home__hero">
        <div className="home__eyebrow caption mono">SRH AMBASSADOR HUB</div>
        <h1>{t.home.welcome}</h1>
        <p className="home__description">{t.home.description}</p>
        <div className="home__actions">
          {isAuthenticated ? (
            <Link to="/my-circle" className="btn btn--primary mono">
              {t.home.cta}
            </Link>
          ) : (
            <>
              <Link to="/discover" className="btn btn--primary mono">
                {t.home.ctaGuest}
              </Link>
              <Link to="/login" className="btn btn--outline mono">
                {t.home.secondaryGuest}
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
