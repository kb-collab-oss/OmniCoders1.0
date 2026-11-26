# OmniCoders1.0 — Carnet de correspondance numérique

Application web responsive qui numérise le carnet de correspondance papier entre l'école, les élèves et
les parents : notes, absences, messages, autorisations, emploi du temps et devoirs. Les données concernent
des mineurs : droits d'accès stricts par rôle et accès journalisés.

## Rôles

Élève · Parent (peut suivre plusieurs enfants) · Enseignant · Administration/Direction · Super-administrateur

## Architecture

```
Navigateur ──► Frontend React (nginx, :8080) ──► API Express (:4000) ──► PostgreSQL (:5432)
```

| Dossier / fichier | Contenu |
|---|---|
| `backend/` | API Node.js / Express (avec `Dockerfile`) |
| `frontend/` | Application React (avec `Dockerfile` et `nginx.conf`) |
| `docker-compose.yml` | Lance la base, le backend et le frontend ensemble |
| `.env.example` | Modèle de configuration à copier en `.env` |

## Prérequis

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Compose v2) et Git
- Node.js 20 ou plus, seulement pour développer sans Docker

## Lancer le projet

```bash
git clone https://github.com/kb-collab-oss/OmniCoders1.0.git
cd OmniCoders1.0
cp .env.example .env        # PowerShell : Copy-Item .env.example .env
# éditer .env : renseigner DB_PASSWORD et JWT_SECRET (voir ci-dessous)
docker compose up --build
```

| Service | Adresse |
|---|---|
| Application web | http://localhost:8080 |
| API | http://localhost:4000 |
| PostgreSQL | localhost:5432 |

Arrêter : `docker compose down` (ajouter `-v` pour effacer aussi les données de la base).

## Variables d'environnement

| Variable | Rôle | Valeur par défaut |
|---|---|---|
| `DB_USER` | Utilisateur PostgreSQL | `postgres` |
| `DB_PASSWORD` | Mot de passe PostgreSQL | **obligatoire** |
| `DB_NAME` | Nom de la base | `carnet_scolaire` |
| `JWT_SECRET` | Clé de signature des jetons de connexion (32 caractères minimum) | **obligatoire** |

Générer un secret :

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

> Le dépôt est public : ne jamais commiter le fichier `.env` ni un mot de passe. Seul `.env.example`
> (sans vraies valeurs) est versionné.

## Organisation du travail (Git)

- `main` : version stable. `develop` : intégration des fonctionnalités terminées.
- Une branche par tâche, créée depuis `develop` : `feature/<nom>` (ou `docs/<nom>`, `fix/<nom>`).
- Aucun push direct sur `main` ni `develop` : on ouvre une pull request vers `develop`,
  relue par un autre membre, avec le pipeline CI au vert avant fusion.
- Messages de commit : `feat(backend): …`, `fix(frontend): …`, `docs: …`, `chore: …`.

## Qualité et exploitation (objectifs DevOps du thème)

- Intégration continue (GitHub Actions) à chaque push et pull request : lint, tests, build.
- Tests automatiques des droits : par exemple, un parent ne peut pas lire les notes d'un autre élève.
- Environnement de recette alimenté uniquement par des données fictives.
- Accès journalisés (journal d'audit) ; route de contrôle de santé `/health`.
- Secrets uniquement dans les variables d'environnement, jamais dans le code.

## Documentation

La planification des sprints, les cas d'utilisation et le modèle de données sont dans `docs/`
(à compléter au fil des sprints).
