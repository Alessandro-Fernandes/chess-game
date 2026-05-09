# Chess Game with AI Bot

Un jeu d'échecs complet avec un bot IA utilisant l'algorithme Minimax avec élagage alpha-bêta.

## Fonctionnalités

- **Jeu d'échecs complet** : Toutes les règles d'échecs standard
- **Bot IA intelligent** : Utilise l'algorithme Minimax avec élagage alpha-bêta
- **Interface web moderne** : Design responsive avec animations
- **Validation des mouvements** : Vérification des mouvements légaux et échec
- **Historique des coups** : Suivi de tous les mouvements
- **Contrôles de jeu** : Nouvelle partie, annuler coup, mouvement du bot

## Comment jouer

1. **Vous jouez les blancs** - Cliquez sur une pièce pour la sélectionner
2. Les cases légales sont mises en évidence
3. Cliquez sur une case pour déplacer la pièce
4. Le bot (noir) joue automatiquement après votre coup
5. Le jeu détecte l'échec et les mouvements illégaux

## Déploiement sur GitHub Pages

Ce jeu peut être déployé gratuitement sur GitHub Pages :

### Étapes :

1. **Créez un repository GitHub** avec ce code
2. **Allez dans Settings > Pages**
3. **Sélectionnez "Deploy from a branch"**
4. **Choisissez la branche main et le dossier root (/)**
5. **Sauvegardez et attendez le déploiement**

Votre jeu sera accessible à l'adresse : `https://votre-nom-utilisateur.github.io/nom-du-repo/`

## Structure du projet

```
chess-game/
├── index.html      # Interface principale
├── styles.css      # Styles CSS
├── chess.js        # Logique du jeu et bot IA
└── README.md       # Documentation
```

## Technologies utilisées

- **HTML5** : Structure de l'interface
- **CSS3** : Styles et animations
- **JavaScript (ES6+)** : Logique du jeu et IA

## Algorithme IA

Le bot utilise :
- **Minimax** avec élagage alpha-bêta pour l'optimisation
- **Évaluation positionnelle** avec tables de pièces
- **Profondeur de recherche** configurable (par défaut 3 niveaux)
- **Tables de position** pour chaque type de pièce

## Développement local

Pour développer localement :
1. Clonez le repository
2. Ouvrez `index.html` dans votre navigateur
3. Le jeu fonctionne entièrement côté client

## Licence

Ce projet est open source et peut être utilisé librement.