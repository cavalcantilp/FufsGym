# FufsGym

PWA de suivi de musculation — planification des programmes, séances et progression — 100 % hors ligne, sans compte ni serveur. Identité visuelle reprise de [FitnessFufs](https://github.com/cavalcantilp/FitnessFufs) (mêmes composants, mêmes cartes, même barre d'onglets), avec l'accent bleu remplacé par un rouge musculation.

## Fonctionnalités

- **Calendrier** — historique des séances, jours d'entraînement mis en évidence, série de jours consécutifs.
- **Planification** — création de programmes (ex. Push/Pull/Legs), chaque jour composé d'exercices avec séries et répétitions cibles.
- **S'entraîner** — lancement d'une séance (jour suggéré du programme actif ou séance libre), saisie des séries au fil de l'entraînement, référence "dernière fois" par exercice.
- **Progression** — volume total soulevé dans le temps, estimation du 1RM par exercice (formule d'Epley), records personnels.

Toutes les données sont stockées localement (`localStorage`) sur l'appareil.

## Développement

```bash
npm install
npm run dev       # serveur de développement
npm run build     # build de production (tsc + vite)
npm run typecheck # vérification des types seule
npm run preview   # sert le build de production
```

## Stack

React 19, TypeScript, Vite, vite-plugin-pwa. Aucune dépendance backend.
