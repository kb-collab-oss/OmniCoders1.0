import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import Logo from './Logo';

function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/', { replace: true });
  }

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link to="/" className="brand" aria-label="Carnet de correspondance, accueil">
          <Logo />
          <span className="brand-name">Carnet</span>
        </Link>
        <nav className="nav" aria-label="Navigation principale">
          {user ? (
            <>
              <NavLink to="/espace" className="nav-link">
                Mon espace
              </NavLink>
              <button type="button" className="btn btn-ghost" onClick={handleLogout}>
                Se déconnecter
              </button>
            </>
          ) : (
            <>
              <NavLink to="/connexion" className="nav-link">
                Connexion
              </NavLink>
              <Link to="/inscription" className="btn btn-highlight">
                Créer un compte
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  const { user } = useAuth();

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-about">
          <Link to="/" className="brand brand-light" aria-label="Carnet de correspondance, accueil">
            <Logo size={32} />
            <span className="brand-name">Carnet</span>
          </Link>
          <p>
            Le carnet de correspondance numérique qui relie les élèves, les parents, les enseignants et
            l’administration.
          </p>
        </div>

        <nav aria-label="Pour chacun">
          <h2>Pour chacun</h2>
          <ul>
            <li>Élèves</li>
            <li>Parents</li>
            <li>Enseignants</li>
            <li>Administration</li>
          </ul>
        </nav>

        <nav aria-label="Accès">
          <h2>Accès</h2>
          <ul>
            {user ? (
              <li>
                <Link to="/espace">Mon espace</Link>
              </li>
            ) : (
              <>
                <li>
                  <Link to="/connexion">Se connecter</Link>
                </li>
                <li>
                  <Link to="/inscription">Créer un compte</Link>
                </li>
              </>
            )}
          </ul>
        </nav>

        <div>
          <h2>Le projet</h2>
          <ul>
            <li>Équipe OmniCoders</li>
            <li>Mini-projet DevOps</li>
            <li>Thème 9 : carnet de correspondance</li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <div className="container">
          <p>© 2026 OmniCoders. Projet pédagogique : les données de démonstration sont fictives.</p>
        </div>
      </div>
    </footer>
  );
}

export default function SiteLayout() {
  return (
    <div className="site">
      <Header />
      <main className="site-main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
