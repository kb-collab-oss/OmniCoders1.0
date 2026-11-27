
CARNET SCOLAIRE - GUIDE DU PROJET ET DES TESTS
# OmniCoders1.0
Projet DevOps : Application web responsive pour la numérisation du carnet de correspondance scolaire  permettant la communication et le suivi entre l'etablissement, les parents et les eleves (gestion des droits d'acces, justifications d'absences, signatures de documents et messagerie).

1. ARCHITECTURE DU PROJET :

carnet-scolaire/
  .github/workflows/tests.yml   : Pipeline CI/CD GitHub Actions (base, migrations, lint,
                                  tests)
  backend/                      : API REST (Node.js / Express)
  frontend/                     : Interface utilisateur (Web)
  database/init.sql             : Schema initial PostgreSQL (tables, contraintes, valeurs
                                  par defaut)
  database/seed.sql             : Donnees fictives de test (optionnel au demarrage)
  tests/basic.test.js           : Tests du schema SQL, contraintes FK et valeurs par defaut
  tests/api.test.js             : Tests des routes API et controle des permissions (Sprint 
                                  1+)
  tests/package.json            : Dependances de test (jest, pg)
  tests/package-lock.json       : Versions verrouillees pour des installations deterministes


2. PREREQUIS :
Avant de lancer le projet ou les tests en local, installer :

- Node.js (version 18 ou superieure recommandee) et npm
- PostgreSQL (version 14 ou superieure) installe et actif en local
- Git

3. CONFIGURATION DE LA BASE DE DONNEES (POSTGRESQL)

Les tests s'executent sur une base PostgreSQL nommee carnet_scolaire.
Etape 1 : Creer la base de donnees
  psql -U postgres -c "CREATE DATABASE carnet_scolaire;"

Etape 2 : Charger le schema initial (init.sql)
  psql -v ON_ERROR_STOP=1 -U postgres -d carnet_scolaire -f database/init.sql

Etape 3 : Charger les donnees de test (seed.sql - optionnel)
  psql -v ON_ERROR_STOP=1 -U postgres -d carnet_scolaire -f database/seed.sql

4. INSTALLATION DES DEPENDANCES DE TEST

Place-toi dans le dossier tests et utilise npm ci afin d'installer exactement les versions definies dans package-lock.json :
  cd tests
  npm ci

5. LANCER LES TESTS EN LOCAL

La suite de tests utilise la variable d'environnement DB_PASSWORD pour se connecter a PostgreSQL (par defaut sur localhost, port 5432, utilisateur postgres, base carnet_scolaire).

A) Lancer tous les tests (Base de donnees + API, necessite le backend demarre) :
Sous Linux / macOS : DB_PASSWORD=ton_mot_de_passe_postgres 
 npm test
Sous Windows (PowerShell) : $env:DB_PASSWORD="ton_mot_de_passe_postgres"
 npm test
Sous Windows (Invite de commandes cmd) :
 set DB_PASSWORD=ton_mot_de_passe_postgres
 npm test

B) Lancer uniquement les tests de la base de donnees (Sprint 0 / Backend absent) :
Sous Linux / macOS :
 DB_PASSWORD=ton_mot_de_passe_postgres npx jest --runInBand --testPathIgnorePatterns 'api\.test\.js$'
Sous Windows (PowerShell) :
 $env:DB_PASSWORD="ton_mot_de_passe_postgres"
 npx jest --runInBand --testPathIgnorePatterns 'api\.test\.js$'


6. DETAIL DES FICHIERS DE TESTS
- tests/basic.test.js (Tests de structure et d'integrite SQL) :
  * Verifie la presence des tables principales (utilisateur, eleve, etc.).

  * Relation Parent-Eleve (1-N) : verifie qu'un eleve avec un parent_id inexistant est refuse (cle etrangere) et qu'un meme parent peut avoir plusieurs eleves.

  * Valeurs par defaut des droits : verifie que droit_acces, droit_justification, droit_signature et droit_messages valent true par defaut sur un nouvel eleve.

  * Securite des mots de passe : verifie que les mots de passe sont hashes (bcrypt ou argon2) via test.skip tant que seed.sql est vide.

  * Isolation : utilise des transactions (BEGIN / ROLLBACK) pour laisser la base vierge apres chaque test.

- tests/api.test.js (Tests d'integration HTTP - Sprint 1+) :

  * Contient les tests des routes API (authentification, verification des blocages 403 Forbidden quand un droit passe a false).

7. PIPELINE CI/CD (GITHUB ACTIONS)

  Le workflow .github/workflows/tests.yml s'execute automatiquement a chaque push et pull_request :

  1. Demarre un service PostgreSQL vierge.

  2. Charge database/init.sql avec arret immediat en cas d'erreur (ON_ERROR_STOP=1).

  3. Si le backend est present, execute npm run migrate deux fois de suite dans backend/ pour valider les migrations et leur idempotence.

  4. Charge database/seed.sql s'il est present.

  5. Installe les dependances dans tests/ via npm ci et lance Jest (--runInBand).


8. DEPANNAGE COURANT

 - Erreur "password authentication failed for user postgres" :
  Verifie que la variable DB_PASSWORD correspond bien a ton mot de passe PostgreSQL local.
 
 - Erreur "database carnet_scolaire does not exist" :
  Execute : psql -U postgres -c "CREATE DATABASE carnet_scolaire;" puis recharge database/init.sql.

 - Reinitialiser completement la base locale :
 
  psql -U postgres -c "DROP DATABASE IF EXISTS carnet_scolaire;"

  psql -U postgres -c "CREATE DATABASE carnet_scolaire;"

  psql -v ON_ERROR_STOP=1 -U postgres -d carnet_scolaire -f database/init.sql