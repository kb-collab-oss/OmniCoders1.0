import { Link } from 'react-router-dom';

export function ForbiddenPage() {
  return (
    <div className="container page">
      <h1>Accès refusé</h1>
      <p>Vous n'avez pas les droits nécessaires pour consulter cette page.</p>
      <Link to="/">Retour à l'accueil</Link>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <div className="container page">
      <h1>Page introuvable</h1>
      <p>Cette page n'existe pas ou a été déplacée.</p>
      <Link to="/">Retour à l'accueil</Link>
    </div>
  );
}
