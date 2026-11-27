import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authService from '../services/authService';

const AuthContext = createContext(null);

// Même clé que l'intercepteur de src/api.js, qui ajoute « Authorization: Bearer <jeton> » à chaque requête.
// Piste d'amélioration : cookie httpOnly posé par le backend (le jeton ne serait plus lisible par le JavaScript).
const TOKEN_KEY = 'token';

const readToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};
const writeToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* stockage indisponible : la session durera le temps de la page */
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(readToken()));

  // Au chargement : si un jeton existe, on récupère l'utilisateur correspondant.
  useEffect(() => {
    if (!readToken()) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    authService
      .fetchMe()
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch(() => {
        if (!cancelled) writeToken(null); // jeton expiré ou invalide
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const startSession = useCallback((result) => {
    writeToken(result.token);
    setUser(result.user);
    return result.user;
  }, []);

  const login = useCallback(
    async (email, password) => startSession(await authService.login(email, password)),
    [startSession],
  );
  const register = useCallback(
    async (payload) => startSession(await authService.register(payload)),
    [startSession],
  );
  const logout = useCallback(() => {
    writeToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé à l’intérieur de <AuthProvider>');
  return ctx;
}
