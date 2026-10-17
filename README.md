# Mon espace

Appli perso pour apprendre, bouger, cuisiner et entraîner son cerveau, en sessions courtes de 10 à 20 minutes, sur téléphone comme sur ordinateur. Elle fonctionne sans compte, sans serveur et sans IA. Toutes les données restent sur l’appareil.

> **État : tranches 1 à 3 de la phase 1.** Sont prêts :
> - le noyau : écran Aujourd’hui, répétition espacée FSRS, XP, série, badges, sauvegarde ;
> - le **chinois** : tons et 50 premiers mots HSK 1 ;
> - le **lingala** : salutations et dialogue, contenu « à vérifier / vérifié », corrections, enregistrement au micro ;
> - le **code** : chapitre 1 de la mission Hélios, en Python dans le navigateur ;
> - l’**import de contenu** en CSV ou JSON ;
> - l’**informatique « DSI »**, module cybersécurité : fiche, jeu « repère le phishing », quiz et flashcards ;
> - l’espace **Cerveau** : jeu de séquence et calcul mental adaptatifs, avec un jeu du jour.
>
> Le sport et la cuisine arrivent en tranche 4.

## Lancer l’appli

Prérequis : [Node.js](https://nodejs.org) 22 ou plus récent.

```bash
npm install
npm run dev        # http://localhost:5173
```

Autres commandes :

| Commande | Rôle |
|---|---|
| `npm test` | Tests Vitest (répétition espacée, série, correcteurs, contenu, sauvegarde) |
| `npm run typecheck` | Vérification TypeScript |
| `npm run build` | Version de production dans `dist/`, avec service worker (hors ligne) |
| `npm run preview` | Sert `dist/` sur le réseau local, port 4173 |
| `npm run build:artifact` | Aperçu en une seule page (`artifact/`), sans service worker |

La voix chinoise vient de la synthèse vocale du navigateur. Chrome et Edge sur ordinateur en fournissent une. Sur Android, installe la voix « Chinois (Chine) » dans *Paramètres › Synthèse vocale*. Tu peux la tester dans *Réglages › Voix et micro*.

## Sur le téléphone

**Pour essayer tout de suite**, en réseau local :

```bash
npm run build && npm run preview
```

Ouvre ensuite sur le téléphone l’adresse `http://<IP-de-ton-ordinateur>:4173` (Vite l’affiche sous « Network »).

Limite : sans HTTPS, le navigateur bloque **l’installation en PWA, le mode hors ligne et le micro**. Les leçons, les tons, le tracé et les révisions fonctionnent ; les exercices oraux sont masqués.

**Pour l’installer pour de bon** (prévu en phase 2), il faut servir `dist/` en HTTPS, par exemple avec GitHub Pages ou Netlify. L’appli utilise des chemins relatifs et un routage par `#`, donc n’importe quel hébergement statique convient. Une fois en ligne :

- Android / Chrome : menu ⋮ › *Installer l’application* ;
- iPhone / Safari : bouton Partager › *Sur l’écran d’accueil*.

## Tes données

- Tout est stocké dans IndexedDB, sur l’appareil.
- *Réglages › Mes données › Exporter* télécharge une sauvegarde JSON complète, qui inclura les enregistrements audio dès la tranche 2. *Importer* remplace toutes les données par celles du fichier.
- Exporte régulièrement : un navigateur peut vider son stockage s’il manque de place, et il n’y a pas encore de synchronisation entre appareils.

## Ajouter ou modifier du contenu

Le contenu pédagogique se trouve dans `content/`, séparé du code, versionné et validé par des schémas zod (`src/content/schemas.ts`). Si un fichier est invalide, `npm test` échoue et le message indique quoi corriger.

### Vocabulaire chinois : `content/chinese/hsk1.json`

```json
{
  "id": "hsk1-xiexie",
  "hanzi": "谢谢",
  "pinyin": "xièxie",
  "syllables": ["xiè", "xie"],
  "fr": "merci",
  "example": { "hanzi": "谢谢你！", "pinyin": "Xièxie nǐ !", "fr": "Merci à toi !" }
}
```

- `id` : unique et stable. Ne le change plus une fois le mot appris, sinon sa carte de révision sera perdue.
- `syllables` : le pinyin découpé en syllabes, avec les accents. Les tons et les couleurs en sont déduits, ton neutre compris (sans accent). Collées bout à bout, sans apostrophe, les syllabes doivent redonner `pinyin`.
- `example` : facultatif.
- Une leçon (`lessons[]`) liste des `id` de mots ; les leçons s’affichent dans l’ordre du fichier.

Les données de tracé des caractères sont copiées automatiquement depuis `hanzi-writer-data` vers `public/hanzi/` à chaque `npm run dev` et `npm run build`. Un nouveau caractère ajouté au contenu se trace donc aussi hors ligne.

### Syllabes de l’entraînement des tons : `content/chinese/tones.json`

Ce sont des couples `{ "hanzi": "妈", "pinyin": "mā" }`. Un test vérifie que les 4 tons y sont aussi nombreux les uns que les autres. Choisis des caractères dont la prononciation isolée ne fait pas de doute : c’est le caractère que la voix lit.

### Lingala : `content/lingala/greetings.json`

Chaque entrée a la forme `{ "id", "ln", "fr", "notes", "category", "status" }`, où `status` vaut `"to-verify"` ou `"verified"`. Tout le contenu livré est marqué `"to-verify"` : il a été rédigé sans relecture par un locuteur natif.

Les dialogues (`dialogues[]`) sont des suites de répliques `{ speaker, ln, fr }`. Dans l’exercice, tu joues le rôle de B.

Depuis l’appli, *Lingala › Lexique et vérification* permet de :
- corriger une entrée (seules les différences avec l’original sont gardées, *Annuler mes corrections* revient à l’original) ;
- la marquer « vérifiée » ;
- enregistrer sa prononciation au micro, en notant qui parle.

Le dernier enregistrement d’une entrée sert aux exercices d’écoute. Une entrée sans enregistrement n’en a pas : il n’existe pas de voix de synthèse lingala fiable.

### Code : `content/code/chapter1.json`

Une mission contient :
- `story`, le récit ;
- `task`, la consigne (le texte entre `` ` `` s’affiche comme du code) ;
- `starter`, le code de départ ;
- `tests`, une liste `{ name, code }` d’`assert` Python exécutés après le code de l’élève (la variable `sortie` contient ce qu’il a affiché) ;
- `hints`, les indices progressifs ;
- `solution` ;
- `cards`, les notions ajoutées à la répétition espacée une fois la mission réussie.

`npm test` exécute chaque solution dans Pyodide et vérifie qu’elle passe tous ses tests, et que le code de départ en rate au moins un.

Python (Pyodide, environ 13 Mo) est copié dans `public/pyodide/` et tourne dans un Web Worker. Une boucle infinie est coupée au bout de 6 s. Python n’est téléchargé qu’à la première ouverture d’une mission, puis gardé en cache pour le hors-ligne.

### Informatique : `content/it/cyber.json`

Un module DSI contient :
- `sheet`, la fiche : des sections dont le texte accepte `**gras**`, `*italique*` et `` `code` `` ;
- `quiz`, des questions dont `answer` est l’index de la bonne option ;
- `cards`, les flashcards ajoutées à la révision une fois la fiche lue ;
- `phishing`, les messages de la simulation.

Un message de la simulation porte un `verdict` (`phishing` ou `legit`) et des `clues`, les indices révélés après la réponse. `{link}` dans `body` marque l’emplacement du lien : en le touchant, on voit sa vraie destination.

Les noms d’entreprises et les domaines des messages sont fictifs.

### Importer du vocabulaire depuis l’appli

*Réglages › Mon contenu* accepte un CSV (séparateur `;` ou `,`, avec en-tête) ou un JSON :

```csv
lingala;francais;notes;categorie
Ndeko;Frère, sœur;Aussi « ami proche »;famille
```

```csv
hanzi;pinyin;francais
电话;diàn huà;téléphone
```

- Les lignes invalides sont listées avec la raison du refus.
- Les doublons sont ignorés.
- Les entrées lingala importées arrivent dans *Mes ajouts*, marquées « à vérifier ».
- Les mots chinois importés arrivent dans *Mes mots*, 10 nouveaux mots par leçon.

## Architecture

```
content/            contenu pédagogique (JSON versionné)
src/core/           noyau partagé par tous les espaces
  db.ts             schéma IndexedDB (Dexie) : cartes, journal d'activité, progression, réglages, audio
  srs.ts            répétition espacée FSRS (ts-fsrs), état sérialisable
  cards.ts          création / notation / file des cartes dues
  activity.ts       journal unique d'activité → XP, minutes, série
  gamification.ts   niveaux, série de jours, badges
  today.ts          agrégation de l'écran Aujourd'hui
  backup.ts         export / import de sauvegarde (audio compris)
  speech.ts         synthèse et reconnaissance vocales
  modules.ts        contrats SpaceModule / TrackModule
src/spaces/
  registry.ts       liste des espaces et des parcours (le seul endroit où on les branche)
  learn/chinese/    parcours chinois : leçons, tons, tracé, cartes de révision
  learn/lingala/    parcours lingala : leçons, dialogues, lexique, corrections, audio
  learn/code/       parcours code : missions, éditeur, worker Python (Pyodide)
  learn/it/         parcours informatique : module cyber (fiche, phishing, quiz)
  brain/            espace Cerveau : séquence, calcul mental, jeu du jour
src/screens/        Aujourd'hui, Révisions, Progression, Réglages
tests/              Vitest
```

Principes :

- **Un seul journal d’activité.** Chaque leçon, révision, tracé ou coche manuelle écrit une ligne `activity`. La série de jours, l’XP, les minutes et l’état « fait » de l’écran Aujourd’hui en sont tous calculés. Une séance de sport faite hors de l’appli, une fois cochée, compte donc dans la série.
- **Une seule file de révision.** Tous les parcours créent des `cards` (identifiant `parcours:élément:type`). Chaque parcours fournit le rendu de ses cartes, recto et verso.
- **Brancher un nouvel espace ou parcours** se fait en trois étapes : créer un dossier dans `src/spaces/`, exporter un objet qui respecte `TrackModule` ou `SpaceModule` (`getTodayItems`, `cards`), puis l’ajouter dans `registry.ts` et déclarer ses routes dans `App.tsx`.
- **Pas de dark patterns.** Une erreur ne fait jamais perdre d’XP, et la série ne casse pas le matin tant qu’hier a été fait. Pas de notification insistante.

### Comment marche une leçon de chinois

1. Les mots sont présentés par groupes de 5 : caractère, pinyin coloré par ton, audio et exemple. Le bouton « Je connais déjà » sort le mot de la leçon et le programme loin dans le temps.
2. Trois QCM par mot : sens, écoute, production. Une erreur renvoie l’exercice 3 cases plus loin.
3. Viennent ensuite la répétition orale (si le micro est disponible) et le tracé d’un caractère par groupe.
4. En fin de leçon, chaque mot crée deux cartes FSRS (reconnaissance et production). Leur première note dépend des erreurs : 0 → « Bien », 1 → « Difficile », 2 ou plus → « À revoir ».

## Feuille de route

- **Tranche 4** : sport (minuteur, journal, programme débutant) ; cuisine (recettes, inventaire, liste de courses, plats faisables) ; foyer de 2 adultes + 1 enfant.
- **Phases suivantes** : hébergement HTTPS, autres modules DSI et simulations, dialogues chinois et HSK 2–3, nutrition Ciqual, agenda des repas, méditation et tai chi, quiz façon Pix, tuteur IA optionnel, synchronisation.
