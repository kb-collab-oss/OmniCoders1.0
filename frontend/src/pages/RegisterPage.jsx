import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { validateRegister } from '../auth/validators';
import TextField from '../components/TextField';
import PasswordField from '../components/PasswordField';
import AuthShell from '../components/AuthShell';

const INITIAL = {
  prenom: '',
  nom: '',
  email: '',
  password: '',
  confirmPassword: '',
  codeInvitation: '',
  consentement: false,
};

export default function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();

  const [values, setValues] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user && !loading) return <Navigate to="/espace" replace />;

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setValues((v) => ({ ...v, [name]: type === 'checkbox' ? checked : value }));
    setErrors((e) => ({ ...e, [name]: undefined }));
    setServerError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const found = validateRegister(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setLoading(true);
    setServerError('');
    try {
      // Pas de champ « rôle » : il est déterminé par le code d'invitation, côté serveur.
      await register({
        prenom: values.prenom.trim(),
        nom: values.nom.trim(),
        email: values.email.trim(),
        password: values.password,
        codeInvitation: values.codeInvitation.trim(),
        consentement: values.consentement,
      });
      navigate('/espace', { replace: true });
    } catch (err) {
      setServerError(err.message || 'Une erreur est survenue. Réessayez.');
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Rejoignez votre établissement"
      text="Créez votre compte avec le code d'invitation remis par l'école."
    >
      <section>
        <h1>Créer mon compte</h1>
        <p className="auth-subtitle">Le code d’invitation vous a été remis par l’établissement.</p>
        <form onSubmit={handleSubmit} noValidate>
          {serverError && (
            <div className="alert" role="alert">
              {serverError}
            </div>
          )}
          <div className="field-row">
            <TextField
              label="Prénom"
              name="prenom"
              autoComplete="given-name"
              value={values.prenom}
              onChange={handleChange}
              error={errors.prenom}
            />
            <TextField
              label="Nom"
              name="nom"
              autoComplete="family-name"
              value={values.nom}
              onChange={handleChange}
              error={errors.nom}
            />
          </div>
          <TextField
            label="Adresse e-mail"
            name="email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={handleChange}
            error={errors.email}
          />
          <PasswordField
            label="Mot de passe"
            name="password"
            autoComplete="new-password"
            hint="8 caractères minimum, avec au moins une lettre et un chiffre."
            value={values.password}
            onChange={handleChange}
            error={errors.password}
          />
          <PasswordField
            label="Confirmer le mot de passe"
            name="confirmPassword"
            autoComplete="new-password"
            value={values.confirmPassword}
            onChange={handleChange}
            error={errors.confirmPassword}
          />
          <TextField
            label="Code d'invitation"
            name="codeInvitation"
            autoComplete="off"
            value={values.codeInvitation}
            onChange={handleChange}
            error={errors.codeInvitation}
          />
          <div className="field">
            <label className="checkbox">
              <input
                type="checkbox"
                name="consentement"
                checked={values.consentement}
                onChange={handleChange}
                aria-invalid={errors.consentement ? 'true' : undefined}
              />
              <span>
                J'accepte que mes données, et celles de mon ou mes enfants, soient traitées par
                l'établissement pour le suivi scolaire.
              </span>
            </label>
            {errors.consentement && <p className="field-error">{errors.consentement}</p>}
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Création…' : 'Créer mon compte'}
          </button>
        </form>
      </section>
      <p className="auth-footer">
        Déjà un compte ? <Link to="/connexion">Se connecter</Link>
      </p>
    </AuthShell>
  );
}
