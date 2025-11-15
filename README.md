# Gestion Finance

Application web moderne de gestion de budget et d'investissements personnels, inspirée d'un système de suivi Google Sheets.

## Fonctionnalités principales

### 1. Gestion du budget mensuel
- ✅ Saisie manuelle des dépenses quotidiennes avec date, catégorie et montant
- ✅ 9 catégories fixes : loyer, électricité/gaz, mobile, sport, voiture/logement, courses, essence, Amazon, autres
- ✅ Calcul automatique : total frais, salaire du mois, mis de côté bourse, mis de côté épargne, reste disponible
- ✅ Vue mensuelle avec tableau récapitulatif et filtres par mois/année

### 2. Suivi des investissements (PEA)
- ✅ Portfolio d'actions avec quantité, prix d'achat, frais, valeur actuelle
- ✅ Support des principales actions : S&P500, MSCI World, Airbus, STMicroelectronics, Dassault Systèmes, Carrefour, Sword Group, Alstom, et ETF
- ✅ Calcul automatique de la performance globale et par action
- ✅ Historique complet des transactions (achat/vente)
- ✅ Mise à jour manuelle des prix actuels

### 3. Dashboard global
- ✅ Patrimoine total bourse
- ✅ Bénéfice/perte global
- ✅ Performance mensuelle et annuelle (en %)
- ✅ Total livrets d'épargne
- ✅ Graphique de l'évolution du patrimoine sur 12 mois
- ✅ Accès rapide aux différentes sections

### 4. Projections long terme
- ✅ Simulation de croissance du portefeuille basée sur la performance moyenne
- ✅ Calcul avec investissement mensuel moyen configurable
- ✅ Projections à 10, 20, 30, 40, 50 ans
- ✅ Graphique de projection avec courbes de croissance
- ✅ Tableau détaillé avec investissement total, gains et rendement

### 5. Récapitulatif mensuel (historique)
- ✅ Vue chronologique mois par mois
- ✅ Pour chaque mois : total frais, salaire, épargne bourse, épargne livrets, reste
- ✅ Calcul automatique depuis les dépenses saisies
- ✅ Export en CSV
- ✅ Indicateurs de statut (positif/négatif)

## Stack technique

### Frontend
- **Next.js 14** (App Router)
- **React 18**
- **TypeScript**
- **Tailwind CSS**
- **Shadcn/ui** (composants UI)
- **Recharts** (graphiques)
- **Lucide React** (icônes)

### Backend
- **Next.js API Routes**
- **NextAuth.js** (authentification JWT)
- **MongoDB** avec **Mongoose** (base de données)
- **bcryptjs** (hashage des mots de passe)
- **Zod** (validation des données)

### Fonctionnalités
- 🌙 Dark mode
- 📱 Responsive (mobile et desktop)
- 🔐 Authentification sécurisée
- 📊 Graphiques interactifs
- 📥 Export CSV
- ⚡ Performance optimisée

## Installation

### Prérequis
- Node.js 18+
- MongoDB (local ou cloud - MongoDB Atlas recommandé)
- npm ou yarn

### Étapes d'installation

1. **Cloner le repository**
```bash
git clone <url-du-repo>
cd gestion-finance
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer les variables d'environnement**

Créez un fichier `.env` à la racine du projet :

```bash
cp .env.example .env
```

Modifiez le fichier `.env` avec vos propres valeurs :

```env
# MongoDB - Remplacez par votre URI MongoDB
MONGODB_URI=mongodb://localhost:27017/gestion-finance
# Ou pour MongoDB Atlas :
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/gestion-finance

# NextAuth - Générez une clé secrète sécurisée
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=votre-clé-secrète-ici

# Pour générer une clé secrète aléatoire :
# openssl rand -base64 32

# Environnement
NODE_ENV=development
```

4. **Démarrer MongoDB (si local)**

Si vous utilisez MongoDB localement :
```bash
mongod
```

Si vous utilisez MongoDB Atlas, assurez-vous que votre IP est autorisée dans les règles réseau.

5. **Lancer l'application en développement**
```bash
npm run dev
```

L'application sera accessible sur [http://localhost:3000](http://localhost:3000)

6. **Créer votre premier compte**

Accédez à [http://localhost:3000/register](http://localhost:3000/register) pour créer un compte.

## Scripts disponibles

```bash
# Développement
npm run dev

# Build de production
npm run build

# Démarrer en production
npm run start

# Linter
npm run lint
```

## Déploiement sur Vercel

L'application est optimisée pour un déploiement sur Vercel.

### Déploiement automatique

1. **Pusher le code sur GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <votre-repo-github>
git push -u origin main
```

2. **Connecter à Vercel**
   - Allez sur [vercel.com](https://vercel.com)
   - Cliquez sur "Import Project"
   - Sélectionnez votre repository GitHub
   - Configurez les variables d'environnement :
     - `MONGODB_URI`
     - `NEXTAUTH_SECRET`
     - `NEXTAUTH_URL` (URL de votre application Vercel)
   - Cliquez sur "Deploy"

### Déploiement manuel via CLI

```bash
# Installer Vercel CLI
npm i -g vercel

# Déployer
vercel

# Déployer en production
vercel --prod
```

## Déploiement sur Netlify

L'application peut aussi être déployée sur Netlify.

1. Installez le plugin Next.js pour Netlify :
```bash
npm install -D @netlify/plugin-nextjs
```

2. Créez un fichier `netlify.toml` :
```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

3. Déployez via l'interface Netlify ou CLI.

## Configuration MongoDB

### MongoDB Atlas (recommandé pour la production)

1. Créez un compte sur [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Créez un cluster gratuit
3. Créez un utilisateur de base de données
4. Autorisez votre IP (ou 0.0.0.0/0 pour tous)
5. Récupérez la connection string et ajoutez-la dans `.env`

### MongoDB local (développement)

```bash
# Installation sur macOS avec Homebrew
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# Installation sur Windows
# Téléchargez l'installeur depuis mongodb.com

# Installation sur Linux (Ubuntu)
sudo apt-get install mongodb
sudo systemctl start mongodb
```

## Structure du projet

```
gestion-finance/
├── app/
│   ├── api/                    # API Routes
│   │   ├── auth/              # Authentification
│   │   ├── budget/            # Gestion du budget
│   │   ├── investissements/   # Gestion des investissements
│   │   ├── dashboard/         # Données du dashboard
│   │   ├── historique/        # Historique mensuel
│   │   └── settings/          # Paramètres utilisateur
│   ├── dashboard/             # Page dashboard
│   ├── budget/                # Page budget
│   ├── investissements/       # Page investissements
│   ├── projections/           # Page projections
│   ├── historique/            # Page historique
│   ├── login/                 # Page connexion
│   ├── register/              # Page inscription
│   ├── layout.tsx             # Layout principal
│   └── globals.css            # Styles globaux
├── components/
│   ├── ui/                    # Composants UI (Shadcn)
│   ├── navbar.tsx             # Navigation
│   └── theme-provider.tsx     # Gestion du thème
├── lib/
│   ├── db/
│   │   ├── mongodb.ts         # Connexion MongoDB
│   │   └── models/            # Modèles Mongoose
│   ├── utils.ts               # Utilitaires
│   └── validations/           # Schémas de validation
├── types/
│   └── index.ts               # Types TypeScript
├── .env.example               # Variables d'environnement exemple
├── .gitignore
├── package.json
├── README.md
├── tailwind.config.ts
└── tsconfig.json
```

## Utilisation

### 1. Premier démarrage

1. **Inscrivez-vous** sur la page d'inscription
2. **Configurez vos paramètres** dans le Dashboard (icône paramètres) :
   - Salaire mensuel
   - Investissement mensuel moyen
   - Performance moyenne mensuelle (%)
   - Total livrets d'épargne

### 2. Gestion du budget

1. Accédez à **Budget**
2. Sélectionnez le mois/année
3. Cliquez sur **Ajouter** pour saisir une dépense
4. Visualisez le récapitulatif et les dépenses par catégorie

### 3. Suivi des investissements

1. Accédez à **Investissements**
2. Cliquez sur **Nouvelle transaction**
3. Saisissez achat ou vente d'action
4. Mettez à jour les prix actuels dans le portfolio
5. Consultez l'historique des transactions

### 4. Projections

1. Accédez à **Projections**
2. Visualisez l'évolution estimée sur 10-50 ans
3. Basé sur vos paramètres de performance et investissement

### 5. Historique mensuel

1. Accédez à **Historique**
2. Ajoutez un récapitulatif manuellement ou
3. Utilisez le calcul automatique depuis vos dépenses
4. Exportez en CSV si nécessaire

## Sécurité

- ✅ Mots de passe hashés avec bcrypt
- ✅ Authentification JWT sécurisée
- ✅ Validation des données avec Zod
- ✅ Protection des routes API
- ✅ Variables d'environnement pour les secrets

## Support et contribution

Pour signaler un bug ou proposer une amélioration, ouvrez une issue sur GitHub.

## Licence

MIT

## Auteur

Développé avec ❤️ pour la gestion financière personnelle
