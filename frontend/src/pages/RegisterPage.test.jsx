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
import RegisterPage from './RegisterPage';

function renderRegister() {
  return render(
    <MemoryRouter initialEntries={['/inscription']}>
      <AuthProvider>
        <Routes>
          <Route path="/inscription" element={<RegisterPage />} />
          <Route path="/espace" element={<p>Espace connecté</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

async function fillForm({ password = 'Motdepasse1', confirm = 'Motdepasse1', consent = true } = {}) {
  await userEvent.type(screen.getByLabelText('Prénom'), 'Amina');
  await userEvent.type(screen.getByLabelText('Nom'), 'Benali');
  await userEvent.type(screen.getByLabelText('Adresse e-mail'), 'amina@exemple.dz');
  await userEvent.type(screen.getByLabelText('Mot de passe'), password);
  await userEvent.type(screen.getByLabelText('Confirmer le mot de passe'), confirm);
  await userEvent.type(screen.getByLabelText("Code d'invitation"), 'DEMO-2026');
  if (consent) await userEvent.click(screen.getByRole('checkbox'));
}

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('refuse des mots de passe différents sans appeler le serveur', async () => {
    renderRegister();
    await fillForm({ confirm: 'Different123' });
    await userEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }));

    expect(await screen.findByText('Les mots de passe ne correspondent pas.')).toBeInTheDocument();
    expect(authService.register).not.toHaveBeenCalled();
  });

  it('exige le consentement', async () => {
    renderRegister();
    await fillForm({ consent: false });
    await userEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }));

    expect(await screen.findByText(/accepter le traitement des données/)).toBeInTheDocument();
    expect(authService.register).not.toHaveBeenCalled();
  });

  it("envoie les bonnes données, sans champ « rôle » ni confirmation, puis redirige", async () => {
    authService.register.mockResolvedValue({
      token: 'jeton-test',
      user: { id: 2, email: 'amina@exemple.dz', role: 'parent', prenom: 'Amina', nom: 'Benali' },
    });
    renderRegister();
    await fillForm();
    await userEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }));

    expect(await screen.findByText('Espace connecté')).toBeInTheDocument();
    expect(authService.register).toHaveBeenCalledWith({
      prenom: 'Amina',
      nom: 'Benali',
      email: 'amina@exemple.dz',
      password: 'Motdepasse1',
      codeInvitation: 'DEMO-2026',
      consentement: true,
    });
    expect(localStorage.getItem('token')).toBe('jeton-test');
  });

  it("affiche le message du serveur si le code d'invitation est refusé", async () => {
    authService.register.mockRejectedValue(
      new authService.ApiError("Code d'invitation invalide ou expiré.", 400),
    );
    renderRegister();
    await fillForm();
    await userEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }));

    expect(await screen.findByRole('alert')).toHaveTextContent("Code d'invitation invalide ou expiré.");
  });
});
