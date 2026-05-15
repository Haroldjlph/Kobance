# Kobance

Votre compta, sans prise de tete.

Kobance est une application web de gestion comptable simple pour les petites entreprises. Elle permet de suivre les clients, fournisseurs, articles, devis, factures, achats, TVA, mouvements bancaires et rapprochements bancaires.

## Fonctionnalites

- Gestion des clients, fournisseurs et articles
- Creation de devis et conversion en facture
- Creation de factures avec lignes detaillees
- Gestion des avoirs
- Suivi des achats fournisseurs
- Calcul de TVA collectee, deductible et nette
- Tableau de bord mensuel
- Module Banque avec mouvements et rapprochements
- Collaboration par entreprise avec membres
- Export CSV
- Support WhatsApp
- Application installable sur mobile via PWA

## Structure

```text
Kobance/
  database/   Scripts SQL Supabase
  frontend/   Application React + Vite
  backend/    Ancienne base API Node/Prisma, non utilisee par le frontend actuel
```

Le frontend utilise directement Supabase.

## Prerequis

- Node.js
- npm
- Un projet Supabase
- Git pour publier le projet

## Installation locale

Depuis la racine du projet :

```powershell
cd frontend
npm install
```

Creer un fichier `frontend/.env` :

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_SUPPORT_WHATSAPP_NUMBER=
VITE_SUPPORT_WHATSAPP_MESSAGE=Bonjour, j'ai besoin d'aide sur Kobance.
```

Lancer en local :

```powershell
npm run dev
```

Pour tester sur mobile sur le meme reseau :

```powershell
npm run dev -- --host 0.0.0.0 --port 5174
```

## Base de donnees

Dans Supabase, executer les scripts dans l'ordre :

```text
database/001_init_compta_supabase.sql
database/002_add_purchase_lines.sql
```

Ces scripts creent les tables, index, fonctions et politiques RLS necessaires.

## Verification

Depuis `frontend` :

```powershell
npm run typecheck
npm run build
```

## Deploiement Vercel

Importer le depot GitHub dans Vercel avec ces reglages :

```text
Root Directory   : frontend
Install Command  : npm install
Build Command    : npm run build
Output Directory : dist
```

Ajouter les variables d'environnement dans Vercel :

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_SUPPORT_WHATSAPP_NUMBER=
VITE_SUPPORT_WHATSAPP_MESSAGE=Bonjour, j'ai besoin d'aide sur Kobance.
```

Dans Supabase, ajouter l'URL Vercel dans :

```text
Authentication > URL Configuration
```

Exemple :

```text
Site URL      : https://kobance.vercel.app
Redirect URLs : https://kobance.vercel.app/**
```

## Notes

Ne pas publier le fichier `.env`. Le `.gitignore` l'exclut deja.
