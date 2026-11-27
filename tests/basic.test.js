const fs = require("fs");
const path = require("path");
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
// Connexion + schema (database/init.sql)
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

// =====================================================================
// Lien parent-eleve (relation 1-N) et valeurs par defaut des droits
// =====================================================================

test("un élève avec un parent_id inexistant est refusé (clé étrangère)", async () => {
  const code = await inRollback(async (c) => {
    const etab = await c.query(
      "INSERT INTO etablissement (nom, code, annee_active) VALUES ('Ecole FK', 'ETAB-FK', '2026-2027') RETURNING id"
    );
    try {
      await c.query(
        `INSERT INTO eleve (etablissement_id, parent_id, nom, prenom, date_naissance, matricule)
         VALUES ($1, 999999, 'Test', 'Orphelin', '2016-05-10', 'MAT-FK-01')`,
        [etab.rows[0].id]
      );
      return "INSERT_OK";
    } catch (e) {
      return e.code;
    }
  });
  expect(code).toBe("23503"); // violation de cle etrangere
});

test("un même parent peut avoir plusieurs élèves (relation 1-N)", async () => {
  const count = await inRollback(async (c) => {
    const etabId = (
      await c.query("INSERT INTO etablissement (nom, code, annee_active) VALUES ('Ecole Multi', 'ETAB-MULTI', '2026-2027') RETURNING id")
    ).rows[0].id;

    const userId = (
      await c.query(
        "INSERT INTO utilisateur (etablissement_id, email, mot_de_passe_hash, role) VALUES ($1, 'parent.multi@test.local', '$2b$10$abcdefghijklmnopqrstuv', 'parent') RETURNING id",
        [etabId]
      )
    ).rows[0].id;

    const parentId = (
      await c.query(
        "INSERT INTO parent (etablissement_id, utilisateur_id, nom, prenom) VALUES ($1, $2, 'Dupont', 'Jean') RETURNING id",
        [etabId, userId]
      )
    ).rows[0].id;

    await c.query(
      `INSERT INTO eleve (etablissement_id, parent_id, nom, prenom, date_naissance, matricule)
       VALUES
         ($1, $2, 'Dupont', 'Léo', '2016-03-12', 'MAT-MULTI-01'),
         ($1, $2, 'Dupont', 'Emma', '2018-09-24', 'MAT-MULTI-02')`,
      [etabId, parentId]
    );

    const res = await c.query("SELECT id FROM eleve WHERE parent_id = $1", [parentId]);
    return res.rows.length;
  });
  expect(count).toBe(2);
});

test("droit_acces, droit_justification, droit_signature et droit_messages valent true par défaut", async () => {
  const droits = await inRollback(async (c) => {
    const etabId = (
      await c.query("INSERT INTO etablissement (nom, code, annee_active) VALUES ('Ecole Droits', 'ETAB-DROITS', '2026-2027') RETURNING id")
    ).rows[0].id;

    const userId = (
      await c.query(
        "INSERT INTO utilisateur (etablissement_id, email, mot_de_passe_hash, role) VALUES ($1, 'parent.droits@test.local', '$2b$10$abcdefghijklmnopqrstuv', 'parent') RETURNING id",
        [etabId]
      )
    ).rows[0].id;

    const parentId = (
      await c.query(
        "INSERT INTO parent (etablissement_id, utilisateur_id, nom, prenom) VALUES ($1, $2, 'Martin', 'Claire') RETURNING id",
        [etabId, userId]
      )
    ).rows[0].id;

    const res = await c.query(
      `INSERT INTO eleve (etablissement_id, parent_id, nom, prenom, date_naissance, matricule)
       VALUES ($1, $2, 'Martin', 'Lucas', '2017-04-15', 'MAT-DROITS-01')
       RETURNING droit_acces, droit_justification, droit_signature, droit_messages`,
      [etabId, parentId]
    );
    return res.rows[0];
  });

  expect(droits).toEqual({
    droit_acces: true,
    droit_justification: true,
    droit_signature: true,
    droit_messages: true,
  });
});

// Securite des mots de passe dans le seed

test("aucun mot de passe en clair dans le seed (hash bcrypt ou argon2)", async () => {
  const seedPath = path.resolve(__dirname, "../database/seed.sql");
  if (!fs.existsSync(seedPath)) return;

  const res = await pool.query("SELECT mot_de_passe_hash FROM utilisateur");
  if (res.rows.length === 0) return;

  for (const row of res.rows) {
    expect(row.mot_de_passe_hash).toMatch(/^\$(2[aby]|argon2)/);
  }
});