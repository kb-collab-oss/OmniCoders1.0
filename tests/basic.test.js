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

// test (integrite referentielle)
test("un élève avec un parent_id inexistant est refusé (clé étrangère)", async () => {
  await expect(
    pool.query(
      `INSERT INTO eleve (nom, prenom, date_naissance, niveau, parent_id)
       VALUES ('Test', 'Orphelin', '2016-05-10', 'CP', 999999)`
    )
  ).rejects.toThrow(/foreign key|23503/i);
});

//Test relation 1-N 
test("un même parent peut avoir plusieurs élèves (relation 1-N)", async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    //  Creation d un utilisateur avec le role PARENT
    const parentRes = await client.query(
      `INSERT INTO utilisateur (email, mot_de_passe_hash, nom, prenom, role)
       VALUES ('parent.multi@test.local', '$2b$10$abcdefghijklmnopqrstuv', 'Dupont', 'Jean', 'PARENT')
       RETURNING id`
    );
    const parentId = parentRes.rows[0].id;

    //  Insertion de deux eleves rattaches au meme parent_id
    await client.query(
      `INSERT INTO eleve (nom, prenom, date_naissance, niveau, parent_id)
       VALUES
         ('Dupont', 'Léo', '2016-03-12', 'CE1', $1),
         ('Dupont', 'Emma', '2018-09-24', 'CP', $1)`,
      [parentId]
    );

    // Verification que les 2 eleves sont bien lies a ce parent
    const elevesRes = await client.query(
      "SELECT id FROM eleve WHERE parent_id = $1",
      [parentId]
    );
    expect(elevesRes.rows.length).toBe(2);

    // Annulation pour laisser la base propre apres le test
    await client.query("ROLLBACK");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}); 


test("droit_acces, droit_justification, droit_signature et droit_messages valent true par défaut", async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const parentRes = await client.query(
      `INSERT INTO utilisateur (email, mot_de_passe_hash, nom, prenom, role)
       VALUES ('parent.droits@test.local', '$2b$10$abcdefghijklmnopqrstuv', 'Martin', 'Claire', 'PARENT')
       RETURNING id`
    );

    const parentId = parentRes.rows[0].id;

    const eleveRes = await client.query(
      `INSERT INTO eleve (nom, prenom, date_naissance, niveau, parent_id)
       VALUES ('Martin', 'Lucas', '2017-04-15', 'CP', $1)
       RETURNING droit_acces, droit_justification, droit_signature, droit_messages`,
      [parentId]
    );

    // Verification que les 4 valeurs par defaut valent true
    expect(eleveRes.rows[0]).toEqual({
      droit_acces: true,
      droit_justification: true,
      droit_signature: true,
      droit_messages: true,
    });

    await client.query("ROLLBACK");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

const fs = require("fs");
const path = require("path");

test("aucun mot de passe en clair dans le seed (hash bcrypt ou argon2)", async () => {
  const seedPath = path.resolve(__dirname, "../database/seed.sql");
  if (!fs.existsSync(seedPath)) return; 

  const res = await pool.query("SELECT mot_de_passe_hash FROM utilisateur");
  expect(res.rows.length).toBeGreaterThan(0);
  for (const row of res.rows) {
    expect(row.mot_de_passe_hash).toMatch(/^\$(2[aby]|argon2)/);
  }
});