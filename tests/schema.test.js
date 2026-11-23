
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "carnet_scolaire",
});

afterAll(() => pool.end());

// Codes d'erreur PostgreSQL
const NOT_NULL = "23502";
const FOREIGN_KEY = "23503";
const UNIQUE = "23505";
const CHECK = "23514";

// Execute fn(client) dans une transaction annulee a la fin.
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

// Lance une requete censee echouer et renvoie le code d'erreur PostgreSQL
// (SAVEPOINT : la transaction reste utilisable apres l'erreur).
async function errorCode(client, sql, params = []) {
  await client.query("SAVEPOINT s");
  try {
    await client.query(sql, params);
    return "INSERT_OK";
  } catch (e) {
    await client.query("ROLLBACK TO SAVEPOINT s");
    return e.code;
  } finally {
    await client.query("RELEASE SAVEPOINT s").catch(() => {});
  }
}

// Jeu de donnees minimal valide : un etablissement, un enseignant, un eleve, etc.
async function fixtures(c) {
  const one = async (sql, p) => (await c.query(sql, p)).rows[0].id;
  const etab = await one(
    "INSERT INTO etablissement (nom, code, annee_active) VALUES ('Lycee', 'FIX-1', '2026-2027') RETURNING id"
  );
  const userEns = await one(
    "INSERT INTO utilisateur (etablissement_id, email, mot_de_passe_hash, role) VALUES ($1, 'ens@fix.test', 'h', 'enseignant') RETURNING id",
    [etab]
  );
  const ens = await one(
    "INSERT INTO enseignant (etablissement_id, utilisateur_id, nom, prenom) VALUES ($1, $2, 'N', 'P') RETURNING id",
    [etab, userEns]
  );
  const classe = await one(
    "INSERT INTO classe (etablissement_id, nom, niveau, annee_scolaire) VALUES ($1, '1A', '1', '2026-2027') RETURNING id",
    [etab]
  );
  const matiere = await one(
    "INSERT INTO matiere (etablissement_id, libelle) VALUES ($1, 'Maths') RETURNING id",
    [etab]
  );
  const periode = await one(
    "INSERT INTO periode (etablissement_id, nom, debut, fin) VALUES ($1, 'T1', '2026-09-01', '2026-12-20') RETURNING id",
    [etab]
  );
  const eleve = await one(
    "INSERT INTO eleve (etablissement_id, classe_id, nom, prenom, matricule) VALUES ($1, $2, 'E', 'E', 'M-001') RETURNING id",
    [etab, classe]
  );
  return { etab, userEns, ens, classe, matiere, periode, eleve };
}

// =====================================================================
// Cles primaires
// =====================================================================

test("chaque table du schema possede une cle primaire", async () => {
  const res = await pool.query(`
    SELECT t.table_name
    FROM information_schema.tables t
    WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
      AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints c
        WHERE c.table_schema = 'public' AND c.table_name = t.table_name
          AND c.constraint_type = 'PRIMARY KEY')`);
  expect(res.rows.map((r) => r.table_name)).toEqual([]);
});

// =====================================================================
// Cles etrangeres, NOT NULL, unicite
// =====================================================================

describe("cles etrangeres, NOT NULL, unicite", () => {
  test("FK : un eleve ne peut pas referencer un etablissement inexistant", async () => {
    const code = await inRollback((c) =>
      errorCode(c, "INSERT INTO eleve (etablissement_id, nom, prenom, matricule) VALUES (999999, 'A', 'B', 'X')")
    );
    expect(code).toBe(FOREIGN_KEY);
  });

  test("FK : une note ne peut pas referencer un eleve inexistant", async () => {
    const code = await inRollback(async (c) => {
      const f = await fixtures(c);
      return errorCode(
        c,
        `INSERT INTO note (eleve_id, matiere_id, enseignant_id, periode_id, valeur, date_evaluation)
         VALUES (999999, $1, $2, $3, 10, '2026-10-01')`,
        [f.matiere, f.ens, f.periode]
      );
    });
    expect(code).toBe(FOREIGN_KEY);
  });

  test("NOT NULL : un utilisateur sans email est refuse", async () => {
    const code = await inRollback(async (c) => {
      const f = await fixtures(c);
      return errorCode(
        c,
        "INSERT INTO utilisateur (etablissement_id, mot_de_passe_hash, role) VALUES ($1, 'h', 'eleve')",
        [f.etab]
      );
    });
    expect(code).toBe(NOT_NULL);
  });

  test("NOT NULL : un utilisateur doit appartenir a un etablissement", async () => {
    const code = await inRollback((c) =>
      errorCode(c, "INSERT INTO utilisateur (email, mot_de_passe_hash, role) VALUES ('a@b.test', 'h', 'eleve')")
    );
    expect(code).toBe(NOT_NULL);
  });

  test("UNIQUE : deux etablissements ne peuvent pas avoir le meme code", async () => {
    const code = await inRollback(async (c) => {
      await fixtures(c);
      return errorCode(c, "INSERT INTO etablissement (nom, code, annee_active) VALUES ('Autre', 'FIX-1', '2026-2027')");
    });
    expect(code).toBe(UNIQUE);
  });

  test("UNIQUE : le matricule d'un eleve est unique dans un etablissement", async () => {
    const code = await inRollback(async (c) => {
      const f = await fixtures(c);
      return errorCode(
        c,
        "INSERT INTO eleve (etablissement_id, nom, prenom, matricule) VALUES ($1, 'X', 'Y', 'M-001')",
        [f.etab]
      );
    });
    expect(code).toBe(UNIQUE);
  });

  test("le meme matricule est autorise dans deux etablissements differents (isolation)", async () => {
    const code = await inRollback(async (c) => {
      await fixtures(c);
      const e2 = (
        await c.query("INSERT INTO etablissement (nom, code, annee_active) VALUES ('B', 'FIX-2', '2026-2027') RETURNING id")
      ).rows[0].id;
      return errorCode(
        c,
        "INSERT INTO eleve (etablissement_id, nom, prenom, matricule) VALUES ($1, 'X', 'Y', 'M-001')",
        [e2]
      );
    });
    expect(code).toBe("INSERT_OK");
  });

  test("UNIQUE : un meme compte utilisateur ne peut pas etre deux enseignants", async () => {
    const code = await inRollback(async (c) => {
      const f = await fixtures(c);
      return errorCode(
        c,
        "INSERT INTO enseignant (etablissement_id, utilisateur_id, nom, prenom) VALUES ($1, $2, 'Z', 'Z')",
        [f.etab, f.userEns]
      );
    });
    expect(code).toBe(UNIQUE);
  });
});

// =====================================================================
// Contraintes metier (CHECK)
// =====================================================================

describe("contraintes metier (CHECK)", () => {
  const noteSql = `INSERT INTO note (eleve_id, matiere_id, enseignant_id, periode_id, valeur, bareme, date_evaluation, statut)
                   VALUES ($1, $2, $3, $4, $5, $6, '2026-10-01', $7)`;
  const noteParams = (f, valeur, bareme = 20, statut = "normale") => [f.eleve, f.matiere, f.ens, f.periode, valeur, bareme, statut];

  test("note : une note valide est acceptee", async () => {
    const code = await inRollback(async (c) => errorCode(c, noteSql, noteParams(await fixtures(c), 15)));
    expect(code).toBe("INSERT_OK");
  });

  test("note : une valeur superieure au bareme est refusee", async () => {
    const code = await inRollback(async (c) => errorCode(c, noteSql, noteParams(await fixtures(c), 25, 20)));
    expect(code).toBe(CHECK);
  });

  test("note : une valeur negative est refusee", async () => {
    const code = await inRollback(async (c) => errorCode(c, noteSql, noteParams(await fixtures(c), -1)));
    expect(code).toBe(CHECK);
  });

  test("note : un bareme nul ou negatif est refuse", async () => {
    const code = await inRollback(async (c) => errorCode(c, noteSql, noteParams(await fixtures(c), 0, 0)));
    expect(code).toBe(CHECK);
  });

  test("note : un statut inconnu est refuse", async () => {
    const code = await inRollback(async (c) => errorCode(c, noteSql, noteParams(await fixtures(c), 10, 20, "triche")));
    expect(code).toBe(CHECK);
  });

  test("periode : la fin doit etre apres le debut", async () => {
    const code = await inRollback(async (c) => {
      const f = await fixtures(c);
      return errorCode(
        c,
        "INSERT INTO periode (etablissement_id, nom, debut, fin) VALUES ($1, 'T2', '2026-12-20', '2026-12-20')",
        [f.etab]
      );
    });
    expect(code).toBe(CHECK);
  });

  test("matiere : un coefficient nul ou negatif est refuse", async () => {
    const code = await inRollback(async (c) => {
      const f = await fixtures(c);
      return errorCode(c, "INSERT INTO matiere (etablissement_id, libelle, coefficient) VALUES ($1, 'Art', 0)", [f.etab]);
    });
    expect(code).toBe(CHECK);
  });

  test("emploi du temps : l'heure de fin doit etre apres l'heure de debut", async () => {
    const code = await inRollback(async (c) => {
      const f = await fixtures(c);
      return errorCode(
        c,
        `INSERT INTO emploi_du_temps (classe_id, matiere_id, enseignant_id, jour, heure_debut, heure_fin)
         VALUES ($1, $2, $3, 'lundi', '10:00', '09:00')`,
        [f.classe, f.matiere, f.ens]
      );
    });
    expect(code).toBe(CHECK);
  });

  test("emploi du temps : un jour inconnu est refuse", async () => {
    const code = await inRollback(async (c) => {
      const f = await fixtures(c);
      return errorCode(
        c,
        `INSERT INTO emploi_du_temps (classe_id, matiere_id, enseignant_id, jour, heure_debut, heure_fin)
         VALUES ($1, $2, $3, 'funday', '08:00', '09:00')`,
        [f.classe, f.matiere, f.ens]
      );
    });
    expect(code).toBe(CHECK);
  });

  test("absence : un type ou un statut de justification inconnu est refuse", async () => {
    const codes = await inRollback(async (c) => {
      const f = await fixtures(c);
      const sql = "INSERT INTO absence (eleve_id, date_absence, type, statut_justification) VALUES ($1, '2026-10-02', $2, $3)";
      return [
        await errorCode(c, sql, [f.eleve, "disparition", "non_justifiee"]),
        await errorCode(c, sql, [f.eleve, "absence", "peut_etre"]),
        await errorCode(c, sql, [f.eleve, "retard", "justifiee"]),
      ];
    });
    expect(codes).toEqual([CHECK, CHECK, "INSERT_OK"]);
  });

  test("absence : une duree negative ou nulle est refusee", async () => {
    const code = await inRollback(async (c) => {
      const f = await fixtures(c);
      return errorCode(c, "INSERT INTO absence (eleve_id, date_absence, type, duree_minutes) VALUES ($1, '2026-10-02', 'retard', 0)", [f.eleve]);
    });
    expect(code).toBe(CHECK);
  });

  test("incident : le type doit etre incident, sanction ou recompense", async () => {
    const codes = await inRollback(async (c) => {
      const f = await fixtures(c);
      const sql = "INSERT INTO incident (declarant_id, type, date_incident, description) VALUES ($1, $2, '2026-10-03', 'd')";
      return [
        await errorCode(c, sql, [f.userEns, "recompense"]),
        await errorCode(c, sql, [f.userEns, "punition"]),
      ];
    });
    expect(codes).toEqual(["INSERT_OK", CHECK]);
  });

  test("incident : une gravite inconnue est refusee", async () => {
    const code = await inRollback(async (c) => {
      const f = await fixtures(c);
      return errorCode(
        c,
        "INSERT INTO incident (declarant_id, date_incident, description, gravite) VALUES ($1, '2026-10-03', 'd', 'enorme')",
        [f.userEns]
      );
    });
    expect(code).toBe(CHECK);
  });

  test("eleve : un statut inconnu est refuse", async () => {
    const code = await inRollback(async (c) => {
      const f = await fixtures(c);
      return errorCode(
        c,
        "INSERT INTO eleve (etablissement_id, nom, prenom, matricule, statut) VALUES ($1, 'A', 'B', 'M-9', 'fantome')",
        [f.etab]
      );
    });
    expect(code).toBe(CHECK);
  });

  test("autorisation : une reponse inconnue est refusee, et une reponse par eleve", async () => {
    const codes = await inRollback(async (c) => {
      const f = await fixtures(c);
      const aut = (
        await c.query("INSERT INTO autorisation (createur_id, titre) VALUES ($1, 'Sortie') RETURNING id", [f.userEns])
      ).rows[0].id;
      const sql = "INSERT INTO autorisation_reponse (autorisation_id, eleve_id, reponse) VALUES ($1, $2, $3)";
      return [
        await errorCode(c, sql, [aut, f.eleve, "peut-etre"]),
        await errorCode(c, sql, [aut, f.eleve, "accord"]),
        await errorCode(c, sql, [aut, f.eleve, "refus"]), // doublon (autorisation, eleve)
      ];
    });
    expect(codes).toEqual([CHECK, "INSERT_OK", UNIQUE]);
  });
});

// =====================================================================
// Valeurs par defaut (confidentialite et etat initial)
// =====================================================================

describe("valeurs par defaut", () => {
  test("un nouveau compte est actif, sans double authentification", async () => {
    const row = await inRollback(async (c) => {
      const f = await fixtures(c);
      return (await c.query("SELECT actif, double_auth FROM utilisateur WHERE id = $1", [f.userEns])).rows[0];
    });
    expect(row).toEqual({ actif: true, double_auth: false });
  });

  test("une note n'est PAS publiee par defaut (invisible des familles)", async () => {
    const publiee = await inRollback(async (c) => {
      const f = await fixtures(c);
      const id = (
        await c.query(
          `INSERT INTO note (eleve_id, matiere_id, enseignant_id, periode_id, valeur, date_evaluation)
           VALUES ($1, $2, $3, $4, 12, '2026-10-01') RETURNING id`,
          [f.eleve, f.matiere, f.ens, f.periode]
        )
      ).rows[0].id;
      return (await c.query("SELECT publiee FROM note WHERE id = $1", [id])).rows[0].publiee;
    });
    expect(publiee).toBe(false);
  });

  test("un incident n'est PAS visible des familles par defaut (TS-14)", async () => {
    const visible = await inRollback(async (c) => {
      const f = await fixtures(c);
      const id = (
        await c.query(
          "INSERT INTO incident (declarant_id, date_incident, description) VALUES ($1, '2026-10-03', 'd') RETURNING id",
          [f.userEns]
        )
      ).rows[0].id;
      return (await c.query("SELECT visible_familles FROM incident WHERE id = $1", [id])).rows[0].visible_familles;
    });
    expect(visible).toBe(false);
  });

  test("un eleve est 'actif' par defaut", async () => {
    const statut = await inRollback(async (c) => {
      const f = await fixtures(c);
      return (await c.query("SELECT statut FROM eleve WHERE id = $1", [f.eleve])).rows[0].statut;
    });
    expect(statut).toBe("actif");
  });
});

// =====================================================================
// Suppression en cascade
// =====================================================================

test("supprimer un message supprime ses destinataires (ON DELETE CASCADE)", async () => {
  const count = await inRollback(async (c) => {
    const f = await fixtures(c);
    const msg = (
      await c.query("INSERT INTO message (expediteur_id, contenu) VALUES ($1, 'Bonjour') RETURNING id", [f.userEns])
    ).rows[0].id;
    await c.query("INSERT INTO message_destinataire (message_id, utilisateur_id) VALUES ($1, $2)", [msg, f.userEns]);
    await c.query("DELETE FROM message WHERE id = $1", [msg]);
    return Number((await c.query("SELECT count(*) FROM message_destinataire WHERE message_id = $1", [msg])).rows[0].count);
  });
  expect(count).toBe(0);
});

test("on ne peut pas supprimer un etablissement qui a encore des utilisateurs", async () => {
  const code = await inRollback(async (c) => {
    const f = await fixtures(c);
    return errorCode(c, "DELETE FROM etablissement WHERE id = $1", [f.etab]);
  });
  expect(code).toBe(FOREIGN_KEY);
});