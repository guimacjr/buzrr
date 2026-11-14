# ADR-018: Portable quiz and appearance packages

**Status:** Accepted

## Context

Hosts need to share quizzes, including media, across installations without
copying game reports or participant data. Administrators need the same workflow
for global colors, logos and avatar choices, including offline self-hosting.

## Decision

Use `.buzrr.zip` files containing a versioned `manifest.json`, either `quiz.json`
or `appearance.json`, and content-addressed media. The contract package owns
schemas; Nest owns validation, authorization, media transfer and persistence.
Preview validates the whole file without writes; import validates again.

Quiz imports create private copies owned by the importing account, subject to
quiz capacity. Question handlers validate all seven types. New IDs and draft
moderation states are assigned; reports, participant records, approval states,
category assignments and account IDs do not travel. Registration field
definitions and presentation settings do travel.

Appearance imports require admin/superadmin roles, with independent choices for
colors, logo and avatars. Avatars can be added or replaced; replacement keeps
old image objects available to existing players and reports. Builtin avatars
use validated bundled identifiers; custom images are embedded in the archive.

## Consequences

Packages work across local, S3-compatible and Cloudinary destinations. Exports
read only URLs belonging to the configured storage driver; inaccessible or
previous-provider media must be uploaded again. Import never fetches remote URLs
from a package. Format versions are independent of the live socket contract;
unsupported versions fail explicitly.

Compressed uploads are limited to 100 MB, media to 50 MB each, JSON to 2 MB per
file and total expanded contents to 200 MB. Extraction stays in memory, bounds
actual inflated output, rejects unexpected paths/duplicates and checks media
hashes. DB changes are transactional, with cleanup of newly uploaded objects on
failure. Process crashes during upload can still leave unreferenced objects;
there is no persistent import job or orphan reaper. Identical assets are stored
once in the ZIP but uploaded separately for each quiz question because editing
a question deletes its replaced media.

## Alternatives

CSV/Excel remains useful for bulk question authoring but cannot preserve all
question types and settings. JSON alone cannot carry media independently of the
source installation. Neither replaces the portable package workflow.

## Evidence

`packages/contract/src/portability.ts`,
`apps/server/src/modules/portability/`,
`apps/server/src/common/storage/`,
`apps/web/src/components/Admin/Packages/`.
