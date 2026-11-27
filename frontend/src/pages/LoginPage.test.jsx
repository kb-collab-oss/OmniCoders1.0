import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../services/authService', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, login: vi.fn(), register: vi.fn(), fetchMe: vi.fn() };
});

import * as authService from '../services/authService';
import { AuthProvider } from '../auth/AuthContext';
import LoginPage from './LoginPage';

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/connexion']}>
      <AuthProvider>
        <Routes>
          <Route path="/connexion" element={<LoginPage />} />
          <Route path="/espace" element={<p>Espace connecté</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("affiche les erreurs et n'appelle pas l'API si le formulaire est vide", async () => {
    renderLogin();
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));

    expect(await screen.findByText("L'adresse e-mail est obligatoire.")).toBeInTheDocument();
    expect(screen.getByText('Le mot de passe est obligatoire.')).toBeInTheDocument();
    expect(authService.login).not.toHaveBeenCalled();
  });

  it("connecte l'utilisateur, mémorise le jeton sous la clé « token » et redirige", async () => {
    authService.login.mockResolvedValue({
      token: 'jeton-test',
      user: { id: 1, email: 'a@b.dz', role: 'parent', prenom: 'A', nom: 'B' },
    });
    renderLogin();

    await userEvent.type(screen.getByLabelText('Adresse e-mail'), 'a@b.dz');
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'Secret123');
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));

    expect(await screen.findByText('Espace connecté')).toBeInTheDocument();
    expect(authService.login).toHaveBeenCalledWith('a@b.dz', 'Secret123');
    expect(localStorage.getItem('token')).toBe('jeton-test'); // clé lue par src/api.js
  });

  it('affiche un message générique si les identifiants sont faux (401)', async () => {
    authService.login.mockRejectedValue(new authService.ApiError('Identifiants incorrects.', 401));
    renderLogin();

    await userEvent.type(screen.getByLabelText('Adresse e-mail'), 'a@b.dz');
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'faux');
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Adresse e-mail ou mot de passe incorrect.');
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('affiche le message du serveur pour les autres erreurs (ex. compte bloqué)', async () => {
    authService.login.mockRejectedValue(new authService.ApiError('Compte temporairement bloqué.', 429));
    renderLogin();

    await userEvent.type(screen.getByLabelText('Adresse e-mail'), 'a@b.dz');
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'x');
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Compte temporairement bloqué.');
  });

  it("permet d'afficher et de masquer le mot de passe", async () => {
    renderLogin();
    const input = screen.getByLabelText('Mot de passe');
    expect(input).toHaveAttribute('type', 'password');

    await userEvent.click(screen.getByRole('button', { name: 'Afficher le mot de passe' }));
    expect(input).toHaveAttribute('type', 'text');
  });
});
