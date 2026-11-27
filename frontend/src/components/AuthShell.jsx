import { Link } from 'react-router-dom';
import Logo from './Logo';

// Mise en page des pages connexion / inscription : panneau bleu à gauche, formulaire à droite.
// Volontairement sans navbar ni footer : le logo ramène à l'accueil.
export default function AuthShell({ title, text, children }) {
  return (
    <div className="auth-split">
      <aside className="auth-panel">
        <span className="circle circle-1" aria-hidden="true" />
        <span className="circle circle-2" aria-hidden="true" />
        <span className="circle circle-3" aria-hidden="true" />
        <Link to="/" className="brand" aria-label="Carnet de correspondance, retour à l'accueil">
          <Logo size={36} />
          <span className="brand-name">Carnet de correspondance</span>
        </Link>
        <div className="auth-panel-text">
          <p className="auth-panel-title">{title}</p>
          <p>{text}</p>
        </div>
        <svg className="auth-wave" viewBox="0 0 800 90" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 40C140 8 260 6 400 26s280 24 400-8v72H0z" fill="#fff" fillOpacity=".28" />
          <path d="M0 62c120-20 250-26 400-10s290 14 400-6v44H0z" fill="#fff" fillOpacity=".22" />
        </svg>
      </aside>
      <main className="auth-main">
        <div className="auth-form">{children}</div>
      </main>
    </div>
  );
}
