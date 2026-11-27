import api from '../api';

// Erreur « propre » pour l'interface : un statut HTTP (0 = serveur injoignable) et un message lisible.
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function toApiError(err) {
  if (err?.response) {
    const { status, data } = err.response;
    return new ApiError(data?.message || `Erreur ${status}`, status);
  }
  return new ApiError('Impossible de joindre le serveur. Vérifiez votre connexion.', 0);
}

async function call(request) {
  try {
    return (await request()).data;
  } catch (err) {
    throw toApiError(err);
  }
}

// Contrat d'API attendu du backend (routes sous /api) :
//   POST /auth/login     {email, password}                                          -> 200 {token, user}  | 401
//   POST /auth/register  {nom, prenom, email, password, codeInvitation, consentement:true} -> 201 {token, user} | 400/409/422
//   GET  /auth/me        (jeton envoyé par src/api.js)                              -> 200 user           | 401
// user = {id, email, role, nom, prenom}   (nom/prenom peuvent être absents pour l'administration)
export const login = (email, password) => call(() => api.post('/auth/login', { email, password }));
export const register = (payload) => call(() => api.post('/auth/register', payload));
export const fetchMe = () => call(() => api.get('/auth/me'));
