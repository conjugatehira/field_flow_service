# FieldFlow — Agri-Input Traceability & Advisory System

## System Overview

FieldFlow is a QR-based agri-input traceability and advisory platform for smallholder farmers in South Asia. It connects Suppliers → Dealers → Farmers through cryptographically signed QR codes, enabling instant product verification, counterfeit detection, personalized crop advisories, and structured complaint routing.

---

## 1. Actors & Roles

| Actor | Role | Access |
|---|---|---|
| **System Admin** | Manages master data, monitors fraud patterns | `/admin-portal` |
| **Agro-Dealer** | Registers batches, views complaints | `/dashboard` |
| **Supplier/Manufacturer** | Receives counterfeit flags, resolves complaints | `/supplier-portal` |
| **Farmer** | Scans QR, gets advisory, files complaints | `/verify-page` (public) |
| **SMS Gateway** | External — two-way SMS for feature phones | API integration |
| **Weather API** | External — weather data for advisory engine | API integration |

---

## 2. Architecture

```
[Dealer App/Web] -----\
                       \
[Farmer App/SMS] ------> [API Gateway (Express)] --> [Core Services]
                       /                                |
[Weather API] -------/                                  |
                                                  [SQLite DB]
                                                        |
                                          [SMS Gateway (Mock)]
                                          [Admin Dashboard]
                                          [Dealer Portal]
                                          [Supplier Portal]
```

---

## 3. End-to-End Workflows

### 3.1 Batch Registration (Dealer)

```
Dealer Login → Fill Batch Form → System generates:
  - Unique batch ID (UUID)
  - QR code (signed HMAC-SHA256 hash)
  - QR image (PNG via qrcode lib)
→ Batch stored in DB (status: active)
→ QR code printable/downloadable
```

**API:** `POST /batches` (auth: dealer/admin)

**Response:**
```json
{
  "id": "893e5740-...",
  "product_name": "Urea Fertilizer",
  "product_type": "fertilizer",
  "qr_code": "037d3e6f610753a8",
  "qr_signature": "ac778847...",
  "mfg_date": "2026-01-01",
  "expiry_date": "2027-01-01",
  "status": "active"
}
```

### 3.2 QR Verification (Farmer)

```
Farmer scans QR (or enters code) → POST /verify
System checks:
  1. Does QR code exist in DB?
  2. Is batch expired?
  3. Is batch flagged/recalled?
  4. Has this code been scanned before by this farmer?

Response:
  ✅ AUTHENTIC → product info + confirmation
  ⚠️ ALREADY SCANNED → warning + still authentic
  ❌ COUNTERFEIT → code not found
  🚩 FLAGGED → batch recalled by supplier
```

**API:** `POST /verify` (public)

### 3.3 Advisory Engine

```
Farmer sets crop_type + soil_type + upazila in profile
System fetches weather for upazila (OpenWeatherMap or mock)
Rule engine matches crop + soil + weather condition:
  - rice:dry → "Water paddy field immediately..."
  - wheat:rainy → "Avoid excess irrigation..."
  - potato:hot → "Apply mulch to conserve moisture..."
  - DEFAULT_NORMAL → "Weather is normal..."

Output delivered via SMS or app notification
```

**API:** `POST /advisory/generate` (auth: farmer)

### 3.4 Complaint Management

```
Trigger: Failed verification OR manual complaint
Flow:
  1. Farmer files complaint (POST /complaints)
  2. Batch status → 'flagged'
  3. Complaint auto-routed to batch's supplier
  4. Supplier views in portal → marks 'under_review' → 'resolved'
  5. Farmer notified via SMS on status change
```

**API:** `POST /complaints`, `PATCH /complaints/:id/status`

---

## 4. Data Model

### Core Entities

```
users (id, role, phone, name, upazila, crop_type, soil_type, password_hash)
  ├── dealers (id PK, user_id FK, license_no, business_name)
  ├── suppliers (id PK, user_id FK, name, contact, address)
  └── farmers (represented by users with role='farmer')

batches (id PK, product_name, product_type, dealer_id FK, supplier_id FK,
         qr_code UNIQUE, qr_signature, mfg_date, expiry_date, quantity, status)

scan_logs (id PK, batch_id FK, farmer_id FK, phone, location, result, scanned_at)

complaints (id PK, batch_id FK, farmer_id FK, phone, description,
            status, routed_to FK, created_at, updated_at)

advisories (id PK, crop_type, soil_type, upazila, condition_rule, message_template)

advisory_logs (id PK, farmer_id FK, advisory_id FK, channel, sent_at)

offline_sync_queue (id PK, farmer_id FK, action, payload, synced)
```

---

## 5. QR Code Security

- **Generation:** HMAC-SHA256 of `batchId:dealerId:productName:timestamp`
- **Code:** First 16 hex chars of SHA-256 hash (unique per batch)
- **Signature:** Full HMAC hex digest (verified server-side on scan)
- **QR Image:** Generated via `qrcode` npm package as base64 PNG

---

## 6. API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Register new user |
| POST | `/auth/login` | Public | Login, returns JWT |
| POST | `/batches` | Dealer/Admin | Create batch + QR |
| GET | `/batches` | Any | List batches |
| GET | `/batches/:id` | Any | Get batch details |
| GET | `/batches/:id/qr` | Any | Get QR image |
| GET | `/batches/:id/scan-logs` | Any | Get scan history |
| POST | `/verify` | Public | Verify QR code |
| GET | `/verify/history` | Farmer | Scan history |
| POST | `/complaints` | Public | File complaint |
| GET | `/complaints` | Any | List complaints |
| PATCH | `/complaints/:id/status` | Admin/Dealer/Supplier | Update status |
| POST | `/advisory/generate` | Farmer | Get advisory |
| GET | `/advisory/history` | Farmer | Advisory history |
| PATCH | `/farmers/profile` | Farmer | Update profile |
| GET | `/farmers/me` | Any | Get profile |
| GET | `/dealers/dashboard` | Dealer/Admin | Dashboard stats |
| GET | `/supplier/dashboard` | Supplier | Dashboard stats |
| GET | `/admin/users` | Admin | List all users |
| POST | `/sync` | Farmer | Offline sync |
| GET | `/health` | Public | Health check |

---

## 7. Test Accounts

| Role | Phone | Password | Portal URL |
|---|---|---|---|
| Admin | `01700000000` | `admin123` | `/admin-portal` |
| Dealer | `01711111111` | `dealer123` | `/dashboard` |
| Farmer | `01722222222` | `farmer123` | `/verify-page` |
| Supplier | `01733333333` | `supplier123` | `/supplier-portal` |

---

## 8. Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express (plain JS, no TypeScript) |
| Database | SQLite (via better-sqlite3) |
| Auth | JWT (jsonwebtoken) + bcrypt |
| QR Code | Server: qrcode (PNG), Client: canvas-rendered |
| SMS | Mock service (Twilio-ready interface) |
| Weather | OpenWeatherMap API (mock fallback) |
| Frontend | EJS templates + vanilla JS + CSS |
| Offline Sync | Queue table with idempotent replay |

---

## 9. As-Is vs To-Be

| Aspect | As-Is (Current) | To-Be (FieldFlow) |
|---|---|---|
| Authenticity check | None; farmers trust dealer visually | QR-based instant verification |
| Complaint routing | Informal, word-of-mouth | Structured digital trail: farmer → dealer → supplier |
| Advisory | Generic pamphlets | Personalized SMS tied to crop + soil + weather |
| Fraud detection | Reactive | Proactive via duplicate-scan detection + batch flagging |
| Data visibility | None | Real-time dashboards for admin, dealer, supplier |

---

## 10. Setup & Run

```bash
# Clone and enter directory
cd fieldflow

# Install dependencies
npm install

# Setup database and seed data
node db/setup.js
node db/seed.js

# Start server
npm run dev

# Or simply run:
run.bat
```

Server starts at **http://localhost:4000**

---

*Generated: July 2026*
