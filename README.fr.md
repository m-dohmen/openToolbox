<img src="docs/social-preview.png" alt="openToolbox" width="100%">

# openToolbox

[English](README.md) · [Deutsch](README.de.md) · [中文](README.zh.md) · [Español](README.es.md) · **Français** · [日本語](README.ja.md) · [Português](README.pt.md)

**Livrer un outil interne fonctionnel sous la forme d'un seul fichier HTML. Sans serveur, sans
installation, sans réseau.**

openToolbox est un modèle destiné aux petits outils internes qui doivent circuler — par courriel,
clé USB ou lecteur partagé — et s'exécuter d'un double-clic sur un portable d'entreprise verrouillé.
Le fichier *est* à la fois l'application et la base de données : l'enregistrement écrit un nouveau
fichier HTML contenant les données.

Il est conçu pour une manière de travailler bien précise :

> « Construis-moi un outil de suivi des audits fournisseurs, à partir d'openToolbox. »

On pointe un agent de codage IA vers ce dépôt et il dispose de tout le nécessaire : le cadre, et le
fichier [`AGENTS.md`](AGENTS.md) qui lui indique exactement quoi demander et quel fichier modifier.

Une étape de moins avec le skill de [`plugin/`](plugin/) : une fois installé, décrivez l'outil
souhaité dans n'importe quel répertoire et l'agent va chercher le modèle lui-même. Claude Code et
Codex lisent le même `SKILL.md` — installation dans [`plugin/README.md`](plugin/README.md). Rien
d'obligatoire : la phrase ci-dessus fonctionne sans lui.

---

## Voir le résultat

[**Ouvrir les démos en ligne**](https://m-dohmen.github.io/openToolbox/demos/) — le même cadre en
six outils différents, du portefeuille de projets au registre des emballages. Ou téléchargez-en une
depuis [`docs/demos/`](docs/demos/) et double-cliquez. Le même fichier, sans serveur.

![La vue liste](docs/screenshots/list.png)

Deux types d'enregistrements qui se référencent mutuellement, des colonnes calculées, des filtres qui
comptent, et la version affichée à côté du titre. Tout cela provient d'un seul fichier :
`src/domain.js`.

![Le tableau de bord](docs/screenshots/dashboard.png)

Le tableau de bord porte sur les deux types d'enregistrements. Dessiné **sans bibliothèque
graphique** : les barres sont des largeurs CSS et l'anneau un unique cercle SVG. Les deux vues
s'impriment en un PDF propre.

---

## Ce que vous obtenez

- **Un fichier.** Environ 240 Ko, autonome. Double-clic, il fonctionne. Débranchez le réseau, il
  fonctionne toujours — la seule chose qui lui manquerait est le [compteur d'ouvertures](#le-compteur-douvertures),
  à un interrupteur visible de l'arrêt.
- **Le fichier est la base de données.** L'enregistrement écrit un nouveau HTML contenant les
  enregistrements. Pas de backend, pas de stockage navigateur, pas de synchronisation.
- **Chiffrement optionnel.** AES-256-GCM, clé dérivée par PBKDF2 avec 310 000 itérations. Sans la
  phrase secrète, le fichier n'est qu'un bloc illisible.
- **Assistant IA optionnel.** À pointer vers n'importe quel endpoint compatible OpenAI. Il lit les
  données, accepte des pièces jointes comme contexte supplémentaire et — sur instruction explicite
  uniquement — propose des modifications que vous validez avant application.
- **Personnalisable.** Cinq couleurs, un nom de produit et un logo SVG, modifiables dans
  l'application et enregistrés avec le fichier.
- **Modes clair et sombre**, raccourcis clavier, export CSV et JSON, utilisable jusqu'à la largeur
  d'un téléphone.
- **Import CSV avec correspondance des colonnes**, pour saisir de vraies données sans les retaper.
- **Deux langues d'interface** (anglais, allemand), réglage qui voyage avec le fichier.
- **Plusieurs types d'enregistrements et leurs relations**, quand un seul ne suffit pas.
- **Un widget d'échéances dans le tableau de bord**, activé par un seul champ du schéma — en retard,
  cette semaine, les 30 prochains jours — agrégé sur toutes les entités qui le déclarent.
- **Tableaux de bord et feuille de style d'impression**, parce qu'une analyse finit généralement en
  diapositive ou en annexe.
- **Un journal des modifications**, alimenté à chaque enregistrement : date, version et ce qui a
  changé.
- **Des exemples de prompts intégrés**, pour que le destinataire puisse faire modifier l'outil sans
  avoir lu cette page.
- **Un verrou sur la page des réglages**, pour qu'un outil confié à quelqu'un qui ne fait que saisir
  des données ne soit pas reconfiguré par mégarde.
- **Une ligne d'en-tête modifiable et jusqu'à cinq liens** dans la barre sombre du haut, vers ce qui
  accompagne l'outil.
- **Des règles de validation entre champs**, appliquées à l'identique dans le formulaire, à
  l'import CSV et aux changements proposés par l'IA.
- **Un assistant de saisie guidée** et un mode de collecte qui ouvre le fichier directement dessus,
  pour ceux qui n'ont qu'une chose à signaler.
- **Fusionner une copie renvoyée**, enregistrement par enregistrement, avec un comparatif champ par
  champ.
- **Un journal des modifications au niveau du champ**, déduit automatiquement à chaque enregistrement : quel enregistrement, quel champ, avant et après.
- **Des pièces jointes avec un budget de taille visible**, car un outil qu'on ne peut plus envoyer par courriel n'est plus cet outil.
- **Une page d'accueil modifiable**, pour que le fichier s'explique avant d'afficher un tableau.
- **Annuler/rétablir pour la session**, pour chaque création, modification et suppression, avec
  Ctrl/Cmd+Z et Ctrl/Cmd+Y ou les deux boutons dans la barre du fichier.
- **Recherche globale sur tous les champs de toutes les entités**, en direct, avec le nombre de
  résultats sur chaque onglet et les correspondances surlignées ; filtres par type de champ dans
  la barre latérale, avec puces amovibles — pour la session uniquement, rien n'est enregistré
  dans le fichier.
- **Colonnes triables dans chaque liste d'entités** : un clic trie croissant, un second
  décroissant, un troisième rend l'ordre du bloc de données ; la comparaison suit le type de
  champ (nombres numériquement, dates chronologiquement), les valeurs vides restent toujours en
  bas.
- **Dupliquer un enregistrement** depuis la ligne du tableau ou depuis le formulaire ouvert : toutes
  les valeurs sont reprises, le titre reçoit le suffixe localisé et la copie obtient son propre
  identifiant ; même chemin qu'une saisie manuelle — annulation, journal des modifications,
  écriture uniquement à l'enregistrement.
- **Entretien en masse avec sélection multiple** : ligne par ligne, par plage avec Maj+clic ou
  toutes les lignes visibles d'un coup ; barre d'actions pour fixer une valeur d'énumération ou
  supprimer avec confirmation comptée — une entrée de journal et un Ctrl+Z par action.
- **Tuiles d'indicateurs dans le tableau de bord** : le schéma déclare `metrics` et chaque entrée
  devient une tuile — `count` (avec filtre optionnel), `sum(champ)` ou `avg(champ)` sur des champs
  numériques ; calcul local au rendu, rien n'entre dans les données ; un clic saute à la liste de
  l'entité ; les déclarations invalides sont rejetées nommément, pas en silence.

## Démarrage rapide

```bash
git clone https://github.com/m-dohmen/openToolbox
cd openToolbox
npm install
npm run build     # → dist/index.html
```

Ouvrez `dist/index.html` dans un navigateur. C'est tout.

## Construire votre propre outil

Tout ce qui relève du métier tient dans **un seul fichier** : `src/domain.js`. On le remplace, on
reconstruit, c'est terminé.

```js
export const SCHEMA = {
  singular: 'risk',
  plural: 'risks',
  titleField: 'name',
  list: ['name', 'owner', 'review', 'likelihood', 'impact'],
  facets: ['likelihood', 'category'],
  fields: [
    { key: 'name', label: 'Risque', type: 'text', required: true },
    { key: 'category', label: 'Catégorie', type: 'enum', values: ['Opérationnel', 'Juridique', 'IT'] },
    { key: 'review', label: 'Date de revue', type: 'date' },
    { key: 'impact', label: 'Impact', type: 'number' },
  ],
}
```

Un champ peut aussi être **calculé** plutôt que stocké :

```js
{ key: 'score', label: 'Score de risque', type: 'computed', compute: (r) => r.likelihood * r.impact }
```

`compute(record)` s'exécute à chaque rendu et le résultat **n'est jamais écrit dans
l'enregistrement**. C'est tout l'intérêt : une valeur dérivée que l'on stocke devient fausse dès
qu'une de ses entrées change, et personne ne s'en aperçoit. On peut malgré tout trier et chercher
dessus, elle s'additionne dans la synthèse et figure dans l'export CSV ; dans le formulaire elle est
en lecture seule, et l'IA en est informée et se voit refuser nommément toute tentative d'écriture.

Ce seul schéma engendre les colonnes du tableau, le formulaire d'édition, les filtres latéraux,
l'export CSV, les instructions envoyées au modèle d'IA et la validation de tout ce qu'il propose en
retour.

## Plusieurs types d'enregistrements et relations

La plupart des outils n'ont besoin que d'un seul type. Dès qu'il en existe réellement deux ou plus
qui se référencent (fournisseurs et leurs certificats, projets et leurs jalons), on exporte
`ENTITIES` et on ajoute un champ `type: 'reference'` du côté qui pointe vers l'autre.

Dans le formulaire, un champ de référence apparaît comme une liste déroulante des enregistrements
cibles ; dans le tableau, comme une pastille cliquable portant le titre de la cible. Un clic bascule
vers ce type et ouvre l'enregistrement. La suppression d'un enregistrement encore référencé est
bloquée, et le message indique précisément ce qui le référence.

`examples/portfolio.domain.js` — la source de la démo ci-dessus — utilise toutes les fonctions à la
fois.

## Faire entrer les données

**Import CSV avec étape de correspondance.** Vous choisissez un fichier et la boîte de dialogue
liste chaque colonne détectée en regard d'une liste déroulante des champs. Les colonnes dont
l'en-tête correspond au libellé ou à la clé d'un champ sont présélectionnées, casse et ponctuation
ignorées. Le reste s'attribue à la main, ce qui n'est pas attribué reste de côté. Au choix : ajouter
à l'existant ou tout remplacer.

Le séparateur (`;`, virgule, tabulation), les guillemets et un BOM en tête sont détectés à partir du
fichier lui-même : un export Excel fonctionne donc sans préparation. Chaque cellule passe par le même
contrôle de type qu'une modification proposée par l'IA. **Rien n'échoue en silence** : l'écran de
résultat nomme chaque objection avec son numéro de ligne, une mauvaise valeur dans une cellule
laisse le reste de la ligne intact, et une ligne sans titre est ignorée plutôt qu'importée à moitié
vide.

Les identifiants sont toujours attribués par l'application, jamais repris du fichier.

## Numéros de version et journal des modifications

**La version** est du texte libre dans les réglages : `1.4`, `2026-T3`, `version finale pour le
comité`. Elle s'affiche à côté du titre et s'intègre au nom du fichier enregistré
(`project-portfolio-2.1-2026-08-15.html`), de sorte que dans un fil de courriel comportant quatre
pièces jointes, on reconnaît le bon fichier sans en ouvrir aucun.

**Le journal** écrit une entrée par enregistrement : horodatage, version et une note demandée dans
une courte boîte de dialogue au moment d'enregistrer. Les entrées sont rangées avec les données et
non avec les réglages : dans un fichier chiffré, le journal se trouve donc **à l'intérieur** de
l'enveloppe, là où doit figurer une note comme « budget corrigé après le constat d'audit ».

## Exemples de prompts

Le fichier construit explique comment le modifier. Aux endroits que l'on souhaite généralement
ajuster — l'en-tête, le tableau, les filtres, le tableau de bord, le formulaire, l'import CSV, la
zone IA — un encadré dans la couleur d'attention indique ce qui produit cette partie et propose un
prompt prêt à être confié à un agent IA, avec un bouton de copie.

L'idée : celui qui reçoit le fichier n'a besoin ni d'avoir lu cette page, ni de savoir que
`src/domain.js` existe, pour faire modifier l'outil.

Activé par défaut, car le rôle d'un modèle est d'enseigner. **À désactiver avant de remettre un
outil fini à quelqu'un qui ne fera qu'y saisir des données** : pour lui, ces encadrés ne sont que du
bruit.

## Pourquoi un fichier unique

Trois contraintes qui reviennent sans cesse en environnement réglementé et en grande entreprise :

- Héberger un petit outil suppose un serveur, une URL, un responsable d'exploitation et, le plus
  souvent, une revue de sécurité.
- Installer quoi que ce soit exige des droits d'administrateur que l'utilisateur n'a pas.
- Les données ne doivent pas quitter la machine.

Un fichier HTML unique contourne les trois. Et il est honnête sur ce qu'il est : l'utilisateur peut
lire l'intégralité du code source, et aucun service ne peut changer dans son dos.

## Verrouiller les réglages

Réglages → Sécurité → *Protéger les réglages* demande un mot et désactive toutes les commandes de la
page. Les champs restent **visibles et leurs valeurs lisibles** : le message est « pas maintenant »,
pas « cela ne vous regarde pas ». Le même mot les réactive pour la session en cours ; à la
réouverture du fichier ils sont de nouveau verrouillés, afin que la protection ne disparaisse pas
silencieusement après le premier enregistrement de l'auteur.

**C'est une protection contre les fausses manœuvres, pas une frontière de sécurité.** Qui détient le
fichier détient le code, et l'entrée du verrou peut être supprimée du bloc de données avec un
éditeur de texte. C'est un capot sur un interrupteur. Pour ce que personne ne doit vraiment lire, il
y a le chiffrement — lui est réel.

Le mot n'est pas non plus un mot de passe. Il est stocké sous forme d'empreinte SHA-256 salée pour
ne pas figurer en clair dans le fichier, mais le champ l'affiche ouvertement à dessein : pour un
capot, personne ne devrait réutiliser un vrai mot de passe, et « 123 » suffit. Aucune règle de
complexité.

## Le compteur d'ouvertures

La seule chose, dans un fichier construit, qui sorte sur le réseau de sa propre initiative. À
l'ouverture, il envoie une unique requête GET portant **le type d'outil** (`SCHEMA.singular`, par
exemple `action item`). Rien d'autre : ni enregistrements, ni contenu de champs, ni nom de fichier,
ni quoi que ce soit de saisi.

Trois choix délibérés, parce qu'un tel fichier finit entre les mains de gens qui ne l'ont pas
construit :

- **L'endpoint est un réglage visible et modifiable**, prérempli avec le compteur de l'auteur du
  modèle. On peut le pointer vers le sien ou vider le champ pour ne rien compter. Le réglage voyage
  avec le fichier.
- **C'est un interrupteur étiqueté** dans Réglages → Sécurité, l'adresse de destination écrite à
  côté. Pas un pixel caché.
- **Le chemin porte le type d'outil, jamais le nom du fichier.** Ce nom est modifiable par le
  destinataire et porte en pratique des noms de clients ; l'envoyer à un tiers reviendrait à divulguer
  une information qui appartient à celui qui a reçu le fichier.

Compteur désactivé et intégration IA désactivée, le fichier n'ouvre **aucune** connexion réseau.
Vérifiable dans l'onglet réseau, et garanti par la suite de tests.

## Limites à connaître

- **Ce qui n'est pas enregistré est perdu.** Il n'y a pas de sauvegarde automatique : sans fichier
  cible, elle ne peut pas exister. Le point ambre et l'avertissement à la fermeture de l'onglet sont
  le seul filet. Ctrl/Cmd+S enregistre.
- **Une machine, un fichier.** Pas de mode multi-utilisateur. Deux personnes modifiant le même
  fichier produisent deux vérités.
- **Les passerelles de messagerie filtrent les pièces jointes `.html`** plus souvent qu'elles ne les
  laissent passer. Envoyez le fichier compressé ou par transfert de fichiers, et testez le trajet une
  fois avec un fichier factice avant que cela ne compte vraiment.
- **Le chiffrement protège les données, pas l'accès à l'application.** Des rôles et des vues dans un
  fichier qui s'exécute localement ne seraient que de façade : qui détient le fichier détient le code.

## Licence

Apache License 2.0. Les fichiers source portent un en-tête `SPDX-License-Identifier`.

Dépendances : Preact (MIT), Vite (MIT), Playwright pour les tests uniquement (Apache 2.0). Le fichier
construit ne charge rien à l'exécution.

---

> **À propos de cette traduction** : le [README en anglais](README.md) fait foi ; en cas de
> divergence, c'est lui qui prime. La documentation détaillée (architecture, fonctionnement interne
> de l'intégration IA, sécurité) se trouve dans le [wiki](https://github.com/m-dohmen/openToolbox/wiki),
> uniquement en anglais.


<img src="docs/logo.svg" alt="openToolbox logo" width="96" height="96">
