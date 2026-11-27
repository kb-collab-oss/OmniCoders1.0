// API SIMULÉE pour développer l'interface sans backend (VITE_MOCK_API=true, `npm run dev` uniquement).
// Elle remplace l'adaptateur HTTP d'axios : aucune requête réseau n'est envoyée.
// Absente du build de production (voir src/main.jsx).
import { AxiosError } from 'axios';
import api from '../api';

const DEMO_PASSWORD = 'Demo1234';
const DEMO_INVITATION = 'DEMO-2026';
const ROLES = ['eleve', 'parent', 'enseignant', 'administration', 'super_admin'];
const registered = new Set();

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function reply(config, status, data) {
  const response = { status, statusText: '', data, headers: {}, config };
  if (status >= 400) {
    throw new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_REQUEST', config, null, response);
  }
  return response;
}

// « parent@demo.dz » -> rôle parent ; « administration@demo.dz » -> rôle administration ; etc.
function userFromEmail(email) {
  const prefix = email.split('@')[0].toLowerCase();
  const role = ROLES.includes(prefix) ? prefix : 'parent';
  const identity = role === 'administration' || role === 'super_admin' ? {} : { prenom: 'Utilisateur', nom: 'Démo' };
  return { id: `mock-${role}`, email, role, ...identity };
}

export function setupMock() {
  api.defaults.adapter = async (config) => {
    await wait(400);
    const route = `${(config.method || 'get').toUpperCase()} ${config.url}`;
    const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data || {};

    if (route === 'POST /auth/login') {
      if (body.password !== DEMO_PASSWORD) return reply(config, 401, { message: 'Identifiants incorrects.' });
      const user = userFromEmail(body.email);
      return reply(config, 200, { token: `mock.${user.role}.${body.email}`, user });
    }

    if (route === 'POST /auth/register') {
      if (body.codeInvitation !== DEMO_INVITATION)
        return reply(config, 400, { message: "Code d'invitation invalide ou expiré." });
      if (registered.has(body.email) || body.email.startsWith('existe@'))
        return reply(config, 409, { message: 'Un compte existe déjà avec cette adresse e-mail.' });
      registered.add(body.email);
      const user = { id: `mock-new-${Date.now()}`, email: body.email, role: 'parent', prenom: body.prenom, nom: body.nom };
      return reply(config, 201, { token: `mock.parent.${body.email}`, user });
    }

    if (route === 'GET /auth/me') {
      const [, role, email] = String(config.headers?.Authorization || '').replace('Bearer ', '').split('.');
      if (!ROLES.includes(role)) return reply(config, 401, { message: 'Session expirée.' });
      return reply(config, 200, userFromEmail(email));
    }

    return reply(config, 404, { message: 'Route simulée introuvable.' });
  };
}
