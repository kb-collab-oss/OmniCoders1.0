import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { validateLogin } from '../auth/validators';
import TextField from '../components/TextField';
import PasswordField from '../components/PasswordField';
import AuthShell from '../components/AuthShell';

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  // Déjà connecté : inutile de montrer le formulaire
  if (user && !loading) return <Navigate to="/espace" replace />;

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((e) => ({ ...e, [name]: undefined }));
    setServerError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const found = validateLogin(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setLoading(true);
    setServerError('');
    try {
      await login(values.email.trim(), values.password);
      navigate(location.state?.from?.pathname || '/espace', { replace: true });
    } catch (err) {
      // Message identique pour e-mail inconnu et mot de passe faux : on ne révèle pas quels comptes existent.
      setServerError(
        err.status === 401
          ? 'Adresse e-mail ou mot de passe incorrect.'
          : err.message || 'Une erreur est survenue. Réessayez.',
      );
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Bon retour parmi nous"
      text="Retrouvez les notes, les messages et le suivi de votre établissement."
    >
      <section>
        <h1>Connexion</h1>
        <p className="auth-subtitle">Accédez au carnet de correspondance de votre établissement.</p>
        <form onSubmit={handleSubmit} noValidate>
          {serverError && (
            <div className="alert" role="alert">
              {serverError}
            </div>
          )}
          <TextField
            label="Adresse e-mail"
            name="email"
            type="email"
            autoComplete="username"
            value={values.email}
            onChange={handleChange}
            error={errors.email}
          />
          <PasswordField
            label="Mot de passe"
            name="password"
            autoComplete="current-password"
            value={values.password}
            onChange={handleChange}
            error={errors.password}
          />
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </section>
      <p className="auth-footer">
        Pas encore de compte ? <Link to="/inscription">Créer mon compte</Link>
      </p>
    </AuthShell>
  );
}
