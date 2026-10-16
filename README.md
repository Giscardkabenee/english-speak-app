# English Speak 🎤

Une application pour apprendre l'anglais **en parlant**, inspirée de Speak. Tu choisis une petite leçon (au café, à l'aéroport, entretien d'embauche…), tu parles dans le micro, et **Sam**, ton tuteur IA, te répond à voix haute, corrige tes erreurs en français et te propose une façon plus naturelle de le dire.

C'est une application web installable sur téléphone (PWA) : elle s'ouvre dans le navigateur et peut être ajoutée à l'écran d'accueil comme une vraie app.

## Fonctionnalités

- **Conversation orale** avec un tuteur IA (Claude, d'Anthropic) dans 5 mises en situation.
- **Reconnaissance vocale** de ce que tu dis et **voix anglaise** pour les réponses (avec un bouton « lentement »).
- **Corrections en français** après chaque phrase, avec une note sur 100 et une version plus naturelle à réécouter.
- **Traduction** de chaque réponse du tuteur en un clic.
- **Exercice de prononciation** : écoute une phrase clé, répète-la, et les mots bien reconnus passent au vert.
- **3 niveaux** (débutant, intermédiaire, avancé) et un compteur de jours d'affilée.
- Possibilité d'**écrire au clavier** si le micro n'est pas disponible.

## Ce qu'il te faut

- [Node.js](https://nodejs.org) version 20.12 ou plus récente.
- Une clé API Anthropic : crée-la sur [console.anthropic.com](https://console.anthropic.com/). Les conversations sont facturées sur ton compte Anthropic.
- Un navigateur avec reconnaissance vocale : **Chrome** (ordinateur ou Android) ou **Safari** (iPhone, Mac). Firefox ne la prend pas en charge, mais tu peux y écrire tes réponses.

## Lancer l'application

```bash
git clone https://github.com/Giscardkabenee/english-speak-app.git
cd english-speak-app
npm install
cp .env.example .env      # puis ouvre .env et colle ta clé ANTHROPIC_API_KEY
npm start
```

Ouvre ensuite <http://localhost:3000> et autorise l'accès au micro.

> ⚠️ Ne publie jamais ton fichier `.env` : il contient ta clé. Il est déjà exclu de Git par `.gitignore`.

### Sur ton téléphone

Le micro du navigateur ne fonctionne qu'en **HTTPS** (ou sur `localhost`). Pour tester sur ton téléphone, le plus simple est de déployer l'app sur un hébergeur Node qui fournit le HTTPS (Render, Railway, Fly.io…) en définissant la variable `ANTHROPIC_API_KEY` dans ses réglages. Ouvre ensuite l'adresse sur ton téléphone et choisis « Ajouter à l'écran d'accueil ».

## Réglages (fichier `.env`)

| Variable | Rôle | Par défaut |
|---|---|---|
| `ANTHROPIC_API_KEY` | Ta clé API Anthropic (obligatoire) | — |
| `CLAUDE_MODEL` | Le modèle Claude utilisé par le tuteur | `claude-opus-5-5` |
| `PORT` | Le port du serveur | `3000` |

## Organisation du code

```
server.js          serveur Express : sert l'interface et l'API /api/chat
tutor.js           appel à Claude : consigne du tuteur et format de réponse (réponse, traduction, corrections, note)
lessons.js         les leçons et les phrases de prononciation (facile d'en ajouter)
public/
  index.html       l'interface
  app.js           micro, voix, conversation, exercice de prononciation
  scoring.js       comparaison mot à mot pour la prononciation
  style.css        le style (clair et sombre)
  sw.js, manifest  ce qui rend l'app installable
test/              tests (npm test)
```

### Ajouter une leçon

Ajoute un objet dans `lessons.js` avec un `id`, un `emoji`, un `title`, un `goal` (en français, pour l'apprenant), un `scenario` (en anglais, pour le tuteur) et quelques `phrases` à prononcer.

## Limites de cette première version

- La note de prononciation compare les mots reconnus par le navigateur avec la phrase attendue : elle ne mesure pas l'accent finement comme une app spécialisée.
- La progression (jours d'affilée) est enregistrée uniquement dans le navigateur, sans compte utilisateur.
