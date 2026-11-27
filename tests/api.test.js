
const API = process.env.API_URL || "http://localhost:4000/api";
const ORIGIN = new URL(API).origin;


// SPRINT 0 - API : le serveur demarre

test("le serveur repond sur /health", async () => {
  let status;
  for (const url of [`${API}/health`, `${ORIGIN}/health`]) {
    const res = await fetch(url);
    status = res.status;
    if (status === 200) break;
  }
  expect(status).toBe(200);
});

// SPRINT 1 - Authentification : s'active automatiquement des que
// /auth/login existe (statut != 404)

async function authPrete() {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  return res.status !== 404;
}

test("une route protegee sans jeton renvoie 401", async () => {
  if (!(await authPrete())) return;

  const res = await fetch(`${API}/me/notes`);
  expect(res.status).toBe(401);
});

test("une connexion avec de mauvais identifiants est refusee", async () => {
  if (!(await authPrete())) return;

  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "inconnu@test.invalid", password: "faux" }),
  });
  expect(res.status).toBe(401);
});