# FieldFlow — Offline Sync Strategy

## Problem Statement

The Farmer App must work in regions with intermittent or no internet connectivity.
Features like QR scanning, advisory viewing, and complaint filing must not depend
on live network access.

## Architecture

```
┌───────────────┐       Online       ┌───────────────┐
│  Farmer App   │ ──────────────────▶│  FieldFlow    │
│  (offline-    │ ◀──────────────────│  API Server   │
│   first)      │       Sync         │               │
│               │                    │               │
│  ┌─────────┐  │                    │  ┌─────────┐  │
│  │ IndexedDB│  │                    │  │PostgreSQL│  │
│  │ (local)  │  │                    │  │ (source  │  │
│  └─────────┘  │                    │  │  of truth)│  │
└───────────────┘                    │  └─────────┘  │
                                     └───────────────┘
```

## Local Storage (IndexedDB / SQLite)

Each feature has a local queue:

| Queue | Data | Trigger |
|-------|------|---------|
| scanQueue | { batchId, farmerId, result, scannedAt } | Every QR scan |
| complaintQueue | { batchId, farmerId, description, createdAt } | Complaint filed |
| advisoryCache | { upazila, cropType, advice, cachedAt } | Advisory fetched |

## Sync Protocol

```
1. App detects connectivity (navigator.onLine + heartbeat)
2. App reads all queued items from IndexedDB
3. POST /api/sync with { scans: [...], complaints: [...] }
4. Server processes each item, returns { scansSynced, complaintsSynced, errors }
5. App removes synced items from local queue
6. App refreshes advisoryCache from server
```

## Conflict Resolution

| Conflict | Strategy |
|----------|----------|
| Duplicate scan | Server deduplicates by (batchId, farmerId, scannedAt) |
| Complaint already exists | Server returns existing complaint ID |
| Batch no longer valid | Server rejects scan, app marks as sync error |
| Advisory updated | Cache is overwritten on successful sync |

## SMS Fallback Path

For farmers without smartphones or during extended offline periods:

```
1. Farmer sends SMS with batch code to gateway number
2. SMS gateway receives → calls /api/batches/verify via webhook
3. System sends verification result + advisory back via SMS
4. No app required — single SMS round-trip
```
