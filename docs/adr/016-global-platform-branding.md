# ADR-016: Global platform branding

**Status:** Accepted

## Context

Administrators need to customize the platform logo and all main theme colors for every quiz, while retaining light/dark mode. Hardcoded component colors cannot support this consistently.

## Decision

Store one global branding record in Postgres, with independent light/dark palettes defined by the shared contract. Accept only complete palettes of six-digit HEX colors; generate semantic CSS variables rather than accepting arbitrary CSS. Keep local mode preference and temporary preview separate from published settings. Route logo uploads through the existing self-hostable storage interface. Read settings publicly and guard writes with DB-backed admin/superadmin roles.

## Consequences

Main interface colors and game feedback share configurable tokens. Defaults keep initial rendering and offline fallback usable; clients refresh published settings periodically. Logo and palette writes preserve each other. Published logo files remain available for cached clients. Static favicon/social assets remain separate.
