import { describe, expect, it } from 'vitest';
import { passwordIssues, validateLogin, validateRegister } from './validators';

const validRegister = {
  prenom: 'Amina',
  nom: 'Benali',
  email: 'amina@exemple.dz',
  password: 'Motdepasse1',
  confirmPassword: 'Motdepasse1',
  codeInvitation: 'DEMO-2026',
  consentement: true,
};

describe('validateLogin', () => {
  it('exige e-mail et mot de passe', () => {
    expect(validateLogin({ email: '', password: '' })).toEqual({
      email: "L'adresse e-mail est obligatoire.",
      password: 'Le mot de passe est obligatoire.',
    });
  });

  it('refuse un e-mail mal formé', () => {
    expect(validateLogin({ email: 'pas-un-email', password: 'x' }).email).toBe('Adresse e-mail invalide.');
  });

  it('accepte des identifiants bien formés', () => {
    expect(validateLogin({ email: 'a@b.dz', password: 'x' })).toEqual({});
  });
});

describe('passwordIssues', () => {
  it('signale chaque règle non respectée', () => {
    expect(passwordIssues('abc')).toEqual(['8 caractères minimum', 'au moins un chiffre']);
    expect(passwordIssues('12345678')).toEqual(['au moins une lettre']);
  });

  it('ne signale rien pour un mot de passe conforme', () => {
    expect(passwordIssues('Motdepasse1')).toEqual([]);
  });
});

describe('validateRegister', () => {
  it('accepte un formulaire complet', () => {
    expect(validateRegister(validRegister)).toEqual({});
  });

  it('refuse des mots de passe différents', () => {
    expect(validateRegister({ ...validRegister, confirmPassword: 'Autre1234' }).confirmPassword).toBe(
      'Les mots de passe ne correspondent pas.',
    );
  });

  it('refuse un mot de passe faible', () => {
    const errors = validateRegister({ ...validRegister, password: 'abc', confirmPassword: 'abc' });
    expect(errors.password).toContain('trop faible');
  });

  it("exige le code d'invitation, le nom, le prénom et le consentement", () => {
    const errors = validateRegister({
      ...validRegister,
      codeInvitation: ' ',
      nom: '',
      prenom: '',
      consentement: false,
    });
    expect(Object.keys(errors).sort()).toEqual(['codeInvitation', 'consentement', 'nom', 'prenom']);
  });
});
