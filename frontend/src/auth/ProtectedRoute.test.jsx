import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../services/authService', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, login: vi.fn(), register: vi.fn(), fetchMe: vi.fn() };
});

import * as authService from '../services/authService';
import { AuthProvider } from './AuthContext';
import ProtectedRoute from './ProtectedRoute';

function renderAt(path, roles) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/connexion" element={<p>Page de connexion</p>} />
          <Route path="/acces-refuse" element={<p>Accès refusé</p>} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={roles}>
                <p>Contenu protégé</p>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renvoie un visiteur non connecté vers la page de connexion', async () => {
    renderAt('/admin');
    expect(await screen.findByText('Page de connexion')).toBeInTheDocument();
    expect(authService.fetchMe).not.toHaveBeenCalled();
  });

  it('renvoie vers la connexion si le jeton est expiré ou invalide, et le supprime', async () => {
    localStorage.setItem('token', 'expire');
    authService.fetchMe.mockRejectedValue(new authService.ApiError('Session expirée.', 401));
    renderAt('/admin');

    expect(await screen.findByText('Page de connexion')).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('refuse un utilisateur dont le rôle ne figure pas dans la liste', async () => {
    localStorage.setItem('token', 'jeton');
    authService.fetchMe.mockResolvedValue({ id: 1, email: 'p@x.dz', role: 'parent' });
    renderAt('/admin', ['administration', 'super_admin']);

    expect(await screen.findByText('Accès refusé')).toBeInTheDocument();
    expect(screen.queryByText('Contenu protégé')).not.toBeInTheDocument();
  });

  it('laisse passer un utilisateur dont le rôle est autorisé', async () => {
    localStorage.setItem('token', 'jeton');
    authService.fetchMe.mockResolvedValue({ id: 2, email: 'a@x.dz', role: 'administration' });
    renderAt('/admin', ['administration', 'super_admin']);

    expect(await screen.findByText('Contenu protégé')).toBeInTheDocument();
  });

  it('laisse passer tout utilisateur connecté quand aucun rôle n’est exigé', async () => {
    localStorage.setItem('token', 'jeton');
    authService.fetchMe.mockResolvedValue({ id: 3, email: 'e@x.dz', role: 'eleve' });
    renderAt('/admin');

    expect(await screen.findByText('Contenu protégé')).toBeInTheDocument();
  });
});
