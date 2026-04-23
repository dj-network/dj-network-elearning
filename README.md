# DJ Network E-learning

Application LMS séparée de la marketplace DJ Network.

Objectif :

- garder la marketplace existante intacte ;
- réutiliser la même interface ;
- brancher une base Turso, un bucket R2, un domaine et des secrets séparés ;
- réserver progressivement les contenus aux élèves inscrits en formation.
- ne pas embarquer Stripe : les accès sont gérés côté LMS/administration.

## Démarrage

```bash
npm install
npm run dev
```

## Environnement

Créer un fichier `.env` local à partir de `.env.example`.

Cette app ne doit pas réutiliser la base Turso ni le bucket R2 de la marketplace si les élèves et contenus doivent être isolés.

Stripe n'est pas requis dans cet espace e-learning.
