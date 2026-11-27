import { useAuth } from '../auth/AuthContext';
import { ROLE_LABELS } from '../auth/roles';

// Page provisoire : le tableau de bord de chaque rôle sera construit dans les tâches suivantes du sprint 1.
export default function DashboardPage() {
  const { user } = useAuth();
  const name = [user.prenom, user.nom].filter(Boolean).join(' ') || user.email;

  return (
    <div className="container page">
      <h1>Bonjour {name}</h1>
      <p>
        Espace : <strong>{ROLE_LABELS[user.role] ?? user.role}</strong>
      </p>
      <p className="muted">Votre tableau de bord sera disponible prochainement.</p>
    </div>
  );
}
