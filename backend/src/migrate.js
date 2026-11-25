require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./config/db');

const dossier = path.join(__dirname, '..', 'migrations');

async function migrer() {
  await db.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    nom TEXT PRIMARY KEY,
    appliquee_le TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  const faites = new Set((await db.query('SELECT nom FROM schema_migrations')).rows.map((r) => r.nom));
  const fichiers = fs.readdirSync(dossier).filter((f) => f.endsWith('.sql')).sort();

  for (const f of fichiers) {
    if (faites.has(f)) {
      console.log(`déjà appliquée : ${f}`);
      continue;
    }
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query(fs.readFileSync(path.join(dossier, f), 'utf8'));
      await client.query('INSERT INTO schema_migrations(nom) VALUES($1)', [f]);
      await client.query('COMMIT');
      console.log(`appliquée : ${f}`);
    } catch (e) {
      await client.query('ROLLBACK');
      throw new Error(`échec de ${f} : ${e.message}`);
    } finally {
      client.release();
    }
  }
  console.log('Migrations terminées.');
}

migrer()
  .then(() => db.end())
  .catch((e) => {
    console.error(e.message);
    db.end();
    process.exit(1);
  });