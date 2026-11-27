// Validation côté navigateur = confort de saisie uniquement.
// Le backend DOIT refaire les mêmes contrôles : on ne fait jamais confiance au navigateur.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function passwordIssues(password) {
  const issues = [];
  if (password.length < 8) issues.push('8 caractères minimum');
  if (!/[A-Za-z]/.test(password)) issues.push('au moins une lettre');
  if (!/\d/.test(password)) issues.push('au moins un chiffre');
  return issues;
}

export function validateLogin({ email, password }) {
  const errors = {};
  if (!email.trim()) errors.email = "L'adresse e-mail est obligatoire.";
  else if (!EMAIL_RE.test(email.trim())) errors.email = 'Adresse e-mail invalide.';
  if (!password) errors.password = 'Le mot de passe est obligatoire.';
  return errors;
}

export function validateRegister(values) {
  const errors = {};
  if (!values.prenom.trim()) errors.prenom = 'Le prénom est obligatoire.';
  if (!values.nom.trim()) errors.nom = 'Le nom est obligatoire.';

  if (!values.email.trim()) errors.email = "L'adresse e-mail est obligatoire.";
  else if (!EMAIL_RE.test(values.email.trim())) errors.email = 'Adresse e-mail invalide.';

  const issues = passwordIssues(values.password);
  if (!values.password) errors.password = 'Le mot de passe est obligatoire.';
  else if (issues.length) errors.password = `Mot de passe trop faible : ${issues.join(', ')}.`;

  if (!values.confirmPassword) errors.confirmPassword = 'Veuillez confirmer le mot de passe.';
  else if (values.confirmPassword !== values.password)
    errors.confirmPassword = 'Les mots de passe ne correspondent pas.';

  if (!values.codeInvitation.trim()) errors.codeInvitation = "Le code d'invitation est obligatoire.";

  if (!values.consentement)
    errors.consentement = 'Vous devez accepter le traitement des données pour continuer.';
  return errors;
}
