# FieldFlow — Agent Context

## Domain
Agri-input traceability + advisory for smallholder farmers (South Asia).
Actors: Supplier → Dealer → Farmer. QR-coded batches; SMS-first UX (low connectivity).

## Core entities
- Batch: id, product_type, dealer_id, supplier_id, mfg_date, expiry, qr_signature
- Farmer: id, phone, upazila, crop_type, soil_type, language_pref
- Complaint: batch_id, farmer_id, status, routed_to (dealer/supplier)
- Advisory: crop_type + soil_type + weather_condition -> message_template

## Non-negotiable constraints
- SMS gateway is primary channel; app is secondary/enhancement — every feature
  must degrade gracefully to SMS.
- Offline tolerance: farmer app must queue scans/complaints locally and sync
  when connectivity returns; no feature can assume live network.
- QR codes must be cryptographically signed (not just sequential IDs) to
  resist counterfeiting.
- Advisory content is data-driven (rules/templates), not hardcoded strings.

## Build order (do not reorder)
1. Data model + migrations (batches, dealers, farmers, complaints)
2. QR signing/verification service (this is the trust anchor — get it right first)
3. Batch registration + dealer portal MVP
4. Farmer scan-and-verify flow (online only, no SMS yet)
5. SMS gateway adapter + offline queue/sync
6. Weather adapter + advisory rule engine
7. Complaint routing to supplier
8. Traceability chain-of-custody view

## Working Procedure

### Phase 0 — Setup
1. Scaffold repo per structure above, init git, docker-compose for Postgres/Redis.
2. Write `AGENTS.md` (above) so every subsequent session has context without re-explaining.

### Phase 1 — Plan mode per module
For each module in the build order:
1. Switch agent to **plan mode** — ask it to draft the data model / API contract / edge cases before writing code.
2. Review the plan, correct assumptions (especially offline conflict resolution and QR signing scheme).
3. Switch to **build mode**, implement one module, write tests for it before moving to the next.

### Phase 2 — Vertical slices, not layers
Don't build "all models then all controllers." Build one full slice at a time (batch registration end-to-end: model → API → dealer portal screen → test) so each phase is independently demoable.

### Phase 3 — Offline/SMS as first-class, not bolted on
Before building the farmer-facing scan flow, implement the offline queue and SMS fallback path first.

### Phase 4 — Verification checkpoints
After each module, have the agent write/run:
- Unit tests for the module
- One integration test simulating the offline→online sync path
- A manual test script (curl commands or Postman collection) for the dealer/farmer flow

### Phase 5 — Documentation as you go
Have the agent update `docs/as-is-to-be.md` and `docs/supply-chain-model.md` after each phase, not at the end.
