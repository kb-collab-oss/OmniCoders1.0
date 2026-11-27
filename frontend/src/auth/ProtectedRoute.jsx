import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

// Usage : <ProtectedRoute roles={['administration','super_admin']}><Page/></ProtectedRoute>
// Sans `roles` : il suffit d'être connecté.
// Attention : cela masque l'interface, ce n'est PAS une sécurité. C'est le backend qui contrôle les droits.
export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <p className="status-message">Chargement…</p>;
  if (!user) return <Navigate to="/connexion" replace state={{ from: location }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/acces-refuse" replace />;
  return children;
}
