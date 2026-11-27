import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../services/authService', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, login: vi.fn(), register: vi.fn(), fetchMe: vi.fn() };
});

import * as authService from '../services/authService';
import { AuthProvider } from '../auth/AuthContext';
import HomePage from './HomePage';

const renderHome = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <HomePage />
      </AuthProvider>
    </MemoryRouter>,
  );

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("annonce le carnet de correspondance sans bouton d'action dans le hero", () => {
    renderHome();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Le carnet de correspondance');
    expect(screen.queryByRole('link', { name: 'Se connecter' })).not.toBeInTheDocument();
  });

  it('présente les fonctionnalités principales', () => {
    renderHome();
    for (const title of ['Notes et bulletins', 'Absences et retards', 'Messagerie', 'Autorisations et sorties']) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    }
  });
});
