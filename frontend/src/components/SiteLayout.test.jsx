import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../services/authService', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, login: vi.fn(), register: vi.fn(), fetchMe: vi.fn() };
});

import * as authService from '../services/authService';
import { AuthProvider } from '../auth/AuthContext';
import SiteLayout from './SiteLayout';

const renderLayout = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <Routes>
          <Route element={<SiteLayout />}>
            <Route path="/" element={<p>Contenu</p>} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );

describe('SiteLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('affiche Connexion et Créer un compte dans la barre de navigation pour un visiteur', () => {
    renderLayout();
    const nav = screen.getByRole('navigation', { name: 'Navigation principale' });
    expect(within(nav).getByRole('link', { name: 'Connexion' })).toHaveAttribute('href', '/connexion');
    expect(within(nav).getByRole('link', { name: 'Créer un compte' })).toHaveAttribute('href', '/inscription');
  });

  it('affiche Mon espace et Se déconnecter une fois connecté', async () => {
    localStorage.setItem('token', 'jeton');
    authService.fetchMe.mockResolvedValue({ id: 1, email: 'p@x.dz', role: 'parent' });
    renderLayout();

    const nav = screen.getByRole('navigation', { name: 'Navigation principale' });
    expect(await within(nav).findByRole('link', { name: 'Mon espace' })).toHaveAttribute('href', '/espace');
    expect(within(nav).getByRole('button', { name: 'Se déconnecter' })).toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'Connexion' })).not.toBeInTheDocument();
  });

  it('contient un pied de page avec le nom du projet', () => {
    renderLayout();
    expect(screen.getByRole('contentinfo')).toHaveTextContent('OmniCoders');
  });
});
