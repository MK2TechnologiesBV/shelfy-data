# shelfy-data

Locale-packs en defaults-index voor de [Shelfy](https://github.com/MK2TechnologiesBV/shelfy) app.

Zie [ADR-0019](https://github.com/MK2TechnologiesBV/shelfy/blob/main/docs/adr/0019-gelaagde-defaults-via-localepacks.md) voor de architectuur-context.

## Structuur

```
shelfy-data/
├── seeds/
│   ├── core-products.json       — handmatige seed: globaal-relevante staples
│   └── locale-BE.products.json  — BE-specifieke seeds (toekomst)
├── lookup/
│   └── v1/
│       ├── index.json           — gegenereerd: lijst beschikbare packs
│       ├── core.json            — gegenereerd: globale staples
│       └── locale-BE.json       — gegenereerd: BE-pack
└── scripts/
    └── build.mjs                — bouwt lookup/v1/* uit seeds/ via OFF
```

## Bouwen

Vereist Node.js ≥ 20.

```bash
node scripts/build.mjs
```

Het script:
1. Leest elke `seeds/*.json`.
2. Bevraagt voor elk seed-product Open Food Facts via de tekst-zoek-API.
3. Pakt het meest-bekeken matchende resultaat met `periods_after_opening` waar beschikbaar.
4. Schrijft het gecombineerde pack naar `lookup/v1/<id>.json`.
5. Werkt `lookup/v1/index.json` bij met SHA-256-hashes en bestandsgroottes.

Bij netwerk-falen of OFF-rate-limiting valt het script terug op de seed-data alleen (zonder OFF-verrijking) zodat de build deterministisch blijft.

## Bijdragen

Wijzigingen aan defaults gebeuren via PR op de `seeds/*.json`-bestanden, niet op de `lookup/v1/*`-bestanden (die zijn gegenereerd). CI bouwt automatisch en checkt de output mee.

## Schema

Zie [ADR-0019 §3](https://github.com/MK2TechnologiesBV/shelfy/blob/main/docs/adr/0019-gelaagde-defaults-via-localepacks.md) voor het pack- en index-schema.
