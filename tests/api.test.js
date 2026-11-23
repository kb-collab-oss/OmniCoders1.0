// Tests de l'API : necessitent le backend demarre (backend/src/server.js).
// Si le backend n'existe pas encore, la CI ignore ce fichier (voir tests.yml).
const API = process.env.API_URL || "http://localhost:4000/api";
const ORIGIN = new URL(API).origin;

// =====================================================================
// SPRINT 0 - API : le serveur demarre
// =====================================================================

test("le serveur repond sur /health", async () => {
  let status;
  for (const url of [`${API}/health`, `${ORIGIN}/health`]) {
    const res = await fetch(url);
    status = res.status;
    if (status === 200) break;
  }
  expect(status).toBe(200);
});

// =====================================================================
// SPRINT 1 - Authentification : retirer .skip quand /auth/login et les
// routes protegees existent
// =====================================================================

test.skip("une route protegee sans jeton renvoie 401", async () => {
  const res = await fetch(`${API}/me/notes`);
  expect(res.status).toBe(401);
});

test.skip("une connexion avec de mauvais identifiants est refusee", async () => {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "inconnu@test.invalid", password: "faux" }),
  });
  expect(res.status).toBe(401);
});
