# FieldFlow — Data Model

## Entity-Relationship Diagram (Text)

```
Supplier ──1:N── Batch ──1:N── ScanEvent
  │                    │
  │                    └──1:N── TraceabilityEvent
  │                    │
  │                    └──1:N── Complaint ──N:1── Farmer
  │
  └── (referenced by Complaint.routedTo)

Dealer ──1:N── Batch

Farmer ──1:N── ScanEvent
  │
  └──1:N── Complaint

AdvisoryRule (standalone lookup)
  (cropType, soilType, weatherCondition) → message
```

## Tables

### Batch
| Column | Type | Notes |
|--------|------|-------|
| id | ULID | Primary key |
| batchNumber | String | Unique, human-readable |
| productType | String | Fertilizer / Pesticide / Seed |
| productName | String | e.g. "UREA 46% N" |
| quantity | Float | Kg or Ltr |
| dealerId | FK→Dealer | Who registered |
| supplierId | FK→Supplier | Manufacturer |
| mfgDate | DateTime | |
| expiryDate | DateTime | |
| qrSignature | String | HMAC-SHA256 signature |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### Farmer
| Column | Type | Notes |
|--------|------|-------|
| id | ULID | |
| phone | String | Unique, E.164 format |
| name | String | |
| upazila | String | Sub-district in BD |
| district | String | |
| cropType | String | Rice, Maize, etc. |
| soilType | String | Alluvial, Clay, Sandy, Loamy, Barind |
| languagePref | String | bn/en |
| createdAt | DateTime | |

### Dealer
| Column | Type | Notes |
|--------|------|-------|
| id | ULID | |
| name | String | |
| phone | String | Unique |
| upazila | String | |
| district | String | |
| licenseNumber | String | Unique, government registration |
| verified | Boolean | Admin-verified status |
| createdAt | DateTime | |

### Supplier
| Column | Type | Notes |
|--------|------|-------|
| id | ULID | |
| name | String | |
| licenseNumber | String | Unique |
| phone | String | |
| createdAt | DateTime | |

### Complaint
| Column | Type | Notes |
|--------|------|-------|
| id | ULID | |
| batchId | FK→Batch | |
| farmerId | FK→Farmer | |
| status | String | Pending / UnderReview / Escalated / Resolved / Dismissed |
| routedTo | String | Dealer or Supplier |
| description | String? | Optional details |
| resolvedAt | DateTime? | |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### ScanEvent
| Column | Type | Notes |
|--------|------|-------|
| id | ULID | |
| batchId | FK→Batch | |
| farmerId | FK→Farmer | |
| result | String | Verified / Counterfeit / Expired |
| synced | Boolean | Offline sync flag |
| scannedAt | DateTime | |
| syncedAt | DateTime? | |

### AdvisoryRule
| Column | Type | Notes |
|--------|------|-------|
| id | ULID | |
| cropType | String | |
| soilType | String | |
| weatherCondition | String | Normal / Dry / Rainy / Flood / Heatwave |
| messageTemplateBn | String | Bengali advisory text |
| messageTemplateEn | String | English advisory text |
| priority | Int | 1 (highest) – 5 (lowest) |

### TraceabilityEvent
| Column | Type | Notes |
|--------|------|-------|
| id | ULID | |
| batchId | FK→Batch | |
| actorType | String | Supplier / Dealer / Farmer |
| actorId | String | FK to respective table |
| eventType | String | Manufactured / Distributed / Received / Scanned / Reported |
| location | String? | |
| metadata | JSON? | Flexible extra data |
| timestamp | DateTime | |
