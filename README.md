# English Speak 🎤

Une app **Android** pour apprendre l'anglais **en parlant**, inspirée de Speak. Tu choisis une petite leçon (au café, à l'aéroport, entretien d'embauche…), tu parles dans le micro, et **Sam**, ton tuteur IA, te répond à voix haute, corrige tes erreurs en français et te propose une façon plus naturelle de le dire.

## Installer l'app sur ton téléphone

1. Sur ton téléphone Android, connecte-toi à GitHub et ouvre la page **Releases** de ce dépôt (colonne de droite sur la page d'accueil du dépôt, ou `…/english-speak-app/releases`).
2. Dans la dernière version, touche **English-Speak.apk** pour le télécharger.
3. Ouvre le fichier téléchargé. Android te demande d'autoriser l'installation d'apps depuis ton navigateur (ou ton gestionnaire de fichiers) : accepte, puis touche **Installer**.
4. Si Google Play Protect affiche un avertissement (« app inconnue »), choisis **Installer quand même** : c'est normal pour une app qui ne vient pas du Play Store.

À chaque modification du code, GitHub construit automatiquement un nouvel APK (onglet **Actions**) et le publie dans les Releases. Pour mettre à jour, il suffit d'installer le nouvel APK par-dessus l'ancien : ta clé et ta progression sont conservées.

## Premier lancement : ta clé gratuite

Sam utilise Gemini, l'IA de Google, qui propose une **offre gratuite** (sans carte bancaire) :

1. Va sur [aistudio.google.com](https://aistudio.google.com/) et connecte-toi avec ton compte Google.
2. Touche **Get API key**, puis **Create API key**, et copie la clé (elle commence en général par `AIza`).
3. Dans l'app, touche **⚙️** en haut à droite, colle la clé et touche **Enregistrer**.

La clé reste enregistrée uniquement sur ton téléphone ; l'app envoie tes phrases directement à Google, sans autre serveur. L'offre gratuite limite le nombre de messages par minute et par jour : si la limite est atteinte, l'app essaie automatiquement un autre modèle Gemini gratuit, sinon elle te demande de réessayer plus tard. Avec l'offre gratuite, Google peut utiliser tes échanges pour améliorer ses produits. L'onglet **Prononciation** fonctionne sans clé.

## Fonctionnalités

- **Conversation orale** avec un tuteur IA dans 5 mises en situation.
- **Reconnaissance vocale** d'Android pour ce que tu dis, **voix anglaise** pour les réponses (avec un bouton « lentement »).
- **Corrections en français** après chaque phrase, avec une note sur 100 et une version plus naturelle à réécouter.
- **Traduction** de chaque réponse du tuteur en un clic.
- **Exercice de prononciation** : écoute une phrase clé, répète-la, et les mots bien reconnus passent au vert.
- **3 niveaux** (débutant, intermédiaire, avancé) et un compteur de jours d'affilée.
- Possibilité d'**écrire au clavier** si le micro n'est pas disponible.

Le micro utilise la reconnaissance vocale de Google : l'app **Google** doit être installée et à jour sur le téléphone (c'est le cas sur la plupart des Android).

## Pour les développeurs

Il faut Node.js 22 ou plus récent.

```bash
npm install
npm run dev        # version web sur http://localhost:3000 (Chrome), pratique pour tester
npm test           # tests
npm run android    # construit l'interface et la copie dans le projet Android
```

Pour construire l'APK sur ton ordinateur, il faut Android Studio (ou le SDK Android et Java 21) : après `npm run android`, lance `cd android && ./gradlew assembleDebug`. Le fichier se trouve ensuite dans `android/app/build/outputs/apk/debug/`. Sinon, GitHub Actions le fait pour toi (`.github/workflows/android.yml`).

### Organisation du code

```
src/
  main.js          interface : leçons, conversation, prononciation, réglages
  tutor.js         appel à Gemini : consigne du tuteur et format de réponse (réponse, traduction, corrections, note)
  speech.js        micro et voix (plugins Android natifs, ou API du navigateur en version web)
  lessons.js       les leçons et les phrases de prononciation (facile d'en ajouter)
  scoring.js       comparaison mot à mot pour la prononciation
public/            index.html, style.css, icône
android/           projet Android (Capacitor)
build.mjs          assemble l'interface dans www/
test/              tests
```

### Ajouter une leçon

Ajoute un objet dans `src/lessons.js` avec un `id`, un `emoji`, un `title`, un `goal` (en français, pour l'apprenant), un `scenario` (en anglais, pour le tuteur) et quelques `phrases` à prononcer.

## Limites de cette version

- L'APK est signé avec une clé de développement incluse dans le dépôt : très bien pour ton usage personnel, mais il faudra une vraie clé privée pour publier sur le Play Store.
- La note de prononciation compare les mots reconnus avec la phrase attendue : elle ne mesure pas l'accent finement comme une app spécialisée.
- La progression est enregistrée uniquement sur le téléphone, sans compte utilisateur.
