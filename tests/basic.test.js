const { Pool } = require("pg");

// Memes variables que docker-compose.yml / .env.example
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "carnet_scolaire",
});

afterAll(() => pool.end());

// Execute du SQL dans une transaction TOUJOURS annulee : rien ne reste en base.
async function inRollback(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    return await fn(client);
  } finally {
    await client.query("ROLLBACK");
    client.release();
  }
}

// =====================================================================
//connexion + schema (database/init.sql)
// =====================================================================

test("la base repond", async () => {
  const res = await pool.query("SELECT 1 AS ok");
  expect(res.rows[0].ok).toBe(1);
});


const tables = [
  "etablissement", "utilisateur", "enseignant", "parent", "classe", "eleve",
  "matiere", "periode", "affectation", "note", "absence", "devoir",
  "emploi_du_temps", "message", "message_destinataire", "autorisation",
  "autorisation_reponse", "incident", "incident_eleve",
];

test.each(tables)("la table %s existe", async (table) => {
  const res = await pool.query("SELECT to_regclass($1) AS t", [`public.${table}`]);
  expect(res.rows[0].t).not.toBeNull();
});

test("la base refuse un role inconnu (CHECK sur utilisateur.role)", async () => {
  const code = await inRollback(async (c) => {
    const etab = await c.query(
      "INSERT INTO etablissement (nom, code, annee_active) VALUES ('T', 'TEST-ROLE', '2026-2027') RETURNING id"
    );
    try {
      await c.query(
        "INSERT INTO utilisateur (etablissement_id, email, mot_de_passe_hash, role) VALUES ($1, $2, $3, $4)",
        [etab.rows[0].id, "role@test.invalid", "hash", "pirate"]
      );
      return "INSERT_OK";
    } catch (e) {
      return e.code;
    }
  });
  expect(code).toBe("23514"); // violation de contrainte CHECK
});

test("la base refuse deux comptes avec le meme email", async () => {
  const code = await inRollback(async (c) => {
    const etab = await c.query(
      "INSERT INTO etablissement (nom, code, annee_active) VALUES ('T', 'TEST-EMAIL', '2026-2027') RETURNING id"
    );
    const insert = "INSERT INTO utilisateur (etablissement_id, email, mot_de_passe_hash, role) VALUES ($1, $2, $3, $4)";
    await c.query(insert, [etab.rows[0].id, "doublon@test.invalid", "hash", "eleve"]);
    try {
      await c.query(insert, [etab.rows[0].id, "doublon@test.invalid", "hash", "eleve"]);
      return "INSERT_OK";
    } catch (e) {
      return e.code;
    }
  });
  expect(code).toBe("23505"); // violation d'unicite
});

test("aucun mot de passe en clair dans le seed (hash bcrypt ou argon2)", async () => {
  const res = await pool.query("SELECT mot_de_passe_hash FROM utilisateur");
  for (const row of res.rows) {
    expect(row.mot_de_passe_hash).toMatch(/^\$(2[aby]|argon2)/);
  }
});