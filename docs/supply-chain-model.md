# FieldFlow — Supply Chain Model

## Actors and Roles

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Supplier   │ ──▶ │    Dealer    │ ──▶ │    Farmer    │
│ (manufacture │     │  (retail)    │     │  (consumer)  │
│  / import)   │     │              │     │              │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       │  Registers batch   │  Scans at arrival  │  Scans at purchase
       │  + prints QR       │  + verifies stock  │  + verifies authenticity
       └────────────────────┴────────────────────┘
```

## Chain-of-Custody Flow

1. **Supplier** manufactures or imports a batch of agri-input
2. **Supplier** registers batch in FieldFlow → system generates cryptographically signed QR
3. **Supplier** prints QR labels and affixes to each unit
4. **Dealer** receives shipment, scans QR to verify authenticity before accepting
5. **Dealer** sells to farmer; farmer scans QR at point of sale
6. Each scan creates a **TraceabilityEvent** — building an immutable chain-of-custody
7. If QR fails verification at any step, the actor files a **Complaint**
8. Complaint is **auto-routed to the supplier** who created the batch

## Data Flow

```
Batch Registration
  Supplier/Dealer ──▶ POST /api/batches ──▶ Prisma DB ──▶ QR signed with HMAC-SHA256

QR Verification
  Farmer ──▶ POST /api/batches/verify ──▶ decode QR ──▶ verify HMAC ──▶ check expiry
             │                                              │
             └── Verified ──▶ { verified: true, batch }     │
             └── Failed   ──▶ { verified: false, reason }   └──▶ Create TraceabilityEvent

Advisory
  Farmer ──▶ GET /api/advisory/advise/:farmerId
             │
             ├── Fetch farmer profile (crop, soil, upazila)
             ├── Fetch weather (via API or mock)
             ├── Match AdvisoryRule (crop × soil × weather)
             └── Return advice message (bn/en)

Complaint Routing
  Farmer ──▶ POST /api/complaints
             │
             ├── Look up batch supplier
             ├── Create Complaint (status: Pending, routedTo: Supplier)
             ├── Notify supplier via SMS
             └── Track through Escalated → Resolved
```

## Offline Flow

```
Farmer App (offline)
  ┌─────────────────────────────┐
  │  1. Scan QR (cached key)    │
  │  2. Verify locally (HMAC)   │
  │  3. Queue result + complaint │
  │  4. Sync on reconnect        │
  └──────────┬──────────────────┘
             │ POST /sync (when online)
             ▼
  Server processes queued events
  Creates ScanEvent + Complaint records
```
