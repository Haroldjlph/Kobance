# Backend ComptaSimple

API Node.js + Express.

Technologies prevues :

- Express
- TypeScript
- Prisma
- PostgreSQL
- JWT
- bcrypt

## Configuration locale

Copier ou adapter le fichier `.env` :

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/comptasimple?schema=public"
JWT_SECRET="change-moi-en-local"
PORT=4000
```

La base PostgreSQL attendue s'appelle `comptasimple`.

Commandes utiles depuis le dossier `Compta/backend` :

```powershell
npm.cmd run prisma:generate
npm.cmd run prisma:migrate
npm.cmd run prisma:studio
```

Depuis la racine `Compta` :

```powershell
npm.cmd run prisma:generate
npm.cmd run prisma:migrate
npm.cmd run prisma:studio
```

## Authentification

Endpoints disponibles :

- `POST /api/auth/register` : inscription
- `POST /api/auth/login` : connexion
- `GET /api/auth/me` : profil utilisateur connecte

Les routes protegees attendent un header :

```http
Authorization: Bearer <token>
```
