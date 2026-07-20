# FieldFlow — Architecture & Workflow Diagrams

## System Architecture

```mermaid
graph TB
    subgraph "External"
        W[Weather API]
        S[SMS Gateway]
    end

    subgraph "Users"
        A[Admin]
        D[Dealer]
        F[Farmer]
        SP[Supplier]
    end

    subgraph "FieldFlow API Server"
        API[API Gateway<br/>Express.js]
        BM[Batch Management]
        VM[Verification Module]
        AM[Advisory Engine]
        CM[Complaint Module]
        SM[SMS Service]
        WM[Weather Service]
        OM[Offline Sync]
    end

    subgraph "Database"
        DB[(SQLite DB)]
        TL[(Trace Log)]
    end

    A --> API
    D --> API
    F --> API
    SP --> API
    W --> WM
    WM --> AM
    S --> SM
    API --> BM
    API --> VM
    API --> AM
    API --> CM
    API --> SM
    API --> OM
    BM --> DB
    VM --> DB
    AM --> DB
    CM --> DB
    OM --> DB
```

## Batch Registration Workflow

```mermaid
sequenceDiagram
    participant D as Dealer
    participant API as API
    participant QR as QR Service
    participant DB as Database

    D->>API: POST /batches<br/>{product, type, dates, quantity}
    API->>API: Verify JWT + role
    API->>QR: generateQrCode(batchId, dealerId, name)
    QR-->>API: {code, signature}
    API->>DB: INSERT batch with QR data
    DB-->>API: batch record
    API-->>D: 201 Created + batch JSON
    D->>API: GET /batches/:id/qr
    API->>QR: generateQrImage(code)
    QR-->>API: data:image/png;base64,...
    API-->>D: QR image
```

## QR Verification Workflow

```mermaid
sequenceDiagram
    participant F as Farmer
    participant API as API
    participant DB as Database
    participant SMS as SMS Service

    F->>API: POST /verify<br/>{qrCode, phone}
    API->>DB: Lookup batch by qr_code
    alt Code not found
        API->>DB: Log scan as counterfeit
        API->>SMS: Send alert SMS
        API-->>F: ❌ Counterfeit
    else Code found
        alt Batch expired
            API-->>F: ✅ Authentic but expired
        else Batch flagged
            API-->>F: 🚩 Flagged by supplier
        else Already scanned
            API-->>F: ✅ Authentic (already scanned)
        else First scan
            API->>DB: Log scan as authentic
            API-->>F: ✅ Authentic + product info
        end
    end
```

## Advisory Engine Workflow

```mermaid
sequenceDiagram
    participant F as Farmer
    participant API as API
    participant W as Weather API
    participant R as Rule Engine

    F->>API: POST /advisory/generate
    API->>API: Get farmer profile (crop, soil, upazila)
    API->>W: getWeather(upazila)
    W-->>API: {condition, temp}
    API->>R: Match crop + soil + condition
    R-->>API: Advisory message template
    API->>API: Store in advisories table
    API-->>F: {cropType, condition, message}
```

## Complaint Routing Workflow

```mermaid
sequenceDiagram
    participant F as Farmer
    participant API as API
    participant DB as Database
    participant D as Dealer
    participant SP as Supplier
    participant SMS as SMS Service

    F->>API: POST /complaints<br/>{batchId, description}
    API->>DB: Find batch + linked supplier
    API->>DB: INSERT complaint (routed_to = supplier)
    API->>DB: UPDATE batch status = 'flagged'
    API->>SMS: Notify farmer
    API-->>F: Complaint filed
    SP->>API: GET /supplier/dashboard (sees complaint)
    SP->>API: PATCH /complaints/:id/status (resolved)
    API->>SMS: Notify farmer "Complaint resolved"
```

## Data Flow — Offline Sync

```mermaid
sequenceDiagram
    participant F as Farmer App
    participant Q as Sync Queue
    participant API as API
    participant DB as Database

    Note over F: Offline Mode
    F->>F: Queue scan/complaint locally
    F->>Q: INSERT offline_sync_queue
    Note over F: Connectivity Restored
    F->>API: POST /sync<br/>{farmerId, actions}
    API->>API: Process each action
    API->>DB: INSERT scan_log / complaint
    API->>Q: UPDATE synced = true
    API-->>F: {synced: N, results: [...]}
```

## Actor Interactions

```mermaid
graph LR
    subgraph "Actors"
        A[Admin]
        D[Dealer]
        SP[Supplier]
        F[Farmer]
    end

    subgraph "System Modules"
        BR[Batch Registration]
        QR[QR Generation]
        VF[Verification]
        AD[Advisory]
        CP[Complaint]
        SMS[SMS Gateway]
        TR[Traceability]
    end

    D --> BR
    BR --> QR
    F --> VF
    VF --> AD
    F --> CP
    CP --> SP
    CP --> A
    SP --> TR
    A --> TR
    SMS --> F
```

## Deployment View

```mermaid
graph TB
    subgraph "Server (localhost:4000)"
        N[Node.js Process]
        E[Express Routes]
        SQ[SQLite DB File]
    end

    subgraph "Static Files"
        CSS[style.css]
        JS[main.js / admin.js / supplier.js]
    end

    subgraph "Views"
        IDX[index.ejs]
        DLR[dealer.ejs]
        SUP[supplier.ejs]
        ADM[admin.ejs]
        VRF[verify.ejs]
    end

    N --> E
    E --> SQ
    E --> CSS
    E --> JS
    E --> IDX
    E --> DLR
    E --> SUP
    E --> ADM
    E --> VRF
```
