# ADR-017: Server-owned classic history navigation

**Status:** Accepted

## Context

Hosts need to return to a previous question or media slide. Scored questions
must show the stored result; unscored questions must accept changed votes or
additional word-cloud/open-text responses. The original client ordering assumed
that question indices only increase, and answer submissions identified an item
only by its index.

## Decision

- `host-back` is a host-only intent with the expected navigation revision. The
  core chooses the previous index (the last item when leaving the final screen).
- Retain all answer hashes and scores. Track the highest visited index. Visiting
  a scored item, including forward navigation through history, opens its reveal
  only. Unscored items reopen with a new answer window; polls/ratings replace
  their answer and word clouds/open text append within existing caps. Slides
  remain manual. Reopened questions never close early on the respondent count.
- Persist `revision`, `maxVisitedIndex` and `reopened` in Redis. History moves
  increment revision, as do subsequent item changes. Broadcast personalized
  snapshots. Clients compare revision before phase/index and submit the revision
  with their answer; old visits cannot affect current UI or stored responses.
- Commit metadata and scheduling atomically, comparing the expected phase,
  index and revision. Answer writes also check the active visit and membership.
  Finalization checks the expected visit before its existing single claim.
- Final reports use the highest visited index. No per-answer Postgres writes or
  schema migration. Duels do not support history navigation.

## Consequences

The first-answer scoring rule remains intact. Navigation can reduce the current
index without confusing stale-message protection. A scored question abandoned
mid-window by going back cannot resume scoring later: it is already visited and
therefore review-only. Ended sessions remain terminal. Reconnects restore the
current visit and all previously accepted responses.

## Evidence

`game-engine/core/machine.ts`, `core/revisit.ts`, `game-store.service.ts`,
`packages/contract/src/socket.ts`, `gameSlice.ts`; navigation core, shell,
Redis atomicity and client reducer specs.
