# shelfy-data

Publieke statische host voor de Shelfy-app: LocalePacks + defaults-index (ADR-0019),
de synthetic-price-feed en de grouping-feed. **Machine-published — niet met de hand
bewerken.**

`lookup/v1/*`, `synthetic-price-feed/*` en `grouping/*` worden gepubliceerd door de
pijplijn in [shelfy-server](https://github.com/MK2TechnologiesBV/shelfy-server). Cureer
de LocalePacks via een PR op `localepacks/seeds/` in dat repo; de pijplijn publiceert
de gebouwde bestanden hier byte-equivalent.

Zie [ADR-0019](https://github.com/MK2TechnologiesBV/shelfy/blob/main/docs/adr/0019-gelaagde-defaults-via-localepacks.md)
voor het pack- en index-schema.
