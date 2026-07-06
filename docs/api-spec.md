# FieldFlow API Reference

## Base URL
```
http://localhost:4000/api
```

## Health
```bash
curl http://localhost:4000/health
```

## Dealer Management
```bash
# Create dealer
curl -X POST http://localhost:4000/api/dealers \
  -H "Content-Type: application/json" \
  -d '{"name":"Alam Store","phone":"+8801712345610","upazila":"Mymensingh Sadar","district":"Mymensingh","licenseNumber":"DLR-2026-001"}'

# List dealers
curl http://localhost:4000/api/dealers

# Get dealer by ID
curl http://localhost:4000/api/dealers/<dealerId>

# Verify dealer
curl -X PATCH http://localhost:4000/api/dealers/<dealerId>/verify
```

## Farmer Management
```bash
# Create farmer
curl -X POST http://localhost:4000/api/farmers \
  -H "Content-Type: application/json" \
  -d '{"phone":"+8801712345620","name":"Rahim Uddin","upazila":"Mymensingh Sadar","district":"Mymensingh","cropType":"Rice (Boro)","soilType":"Alluvial","languagePref":"bn"}'

# List farmers
curl http://localhost:4000/api/farmers

# Get farmer
curl http://localhost:4000/api/farmers/<farmerId>
```

## Batch Registration & QR
```bash
# Register a new batch (returns QR code data)
curl -X POST http://localhost:4000/api/batches \
  -H "Content-Type: application/json" \
  -d '{"batchNumber":"IN-2026-001","productType":"Fertilizer","productName":"UREA 46% N","quantity":500,"dealerId":"<dealerId>","supplierId":"<supplierId>","mfgDate":"2026-01-15","expiryDate":"2028-01-15"}'

# Verify a QR code
curl -X POST http://localhost:4000/api/batches/verify \
  -H "Content-Type: application/json" \
  -d '{"qrEncoded":"<encodedQR>"}'

# Get batch
curl http://localhost:4000/api/batches/<batchId>

# List batches by dealer
curl http://localhost:4000/api/batches/dealer/<dealerId>
```

## Advisory
```bash
# Get advisory for a farmer
curl http://localhost:4000/api/advisory/advise/<farmerId>

# Create advisory rule
curl -X POST http://localhost:4000/api/advisory/rules \
  -H "Content-Type: application/json" \
  -d '{"cropType":"Rice (Boro)","soilType":"Alluvial","weatherCondition":"Dry","messageTemplateBn":"শুকনো মৌসুমে সেচ দিন","messageTemplateEn":"Irrigate during dry season","priority":1}'

# List rules
curl http://localhost:4000/api/advisory/rules
```

## Weather
```bash
# Get weather for an upazila
curl http://localhost:4000/api/weather/Mymensingh%20Sadar
```

## Complaints
```bash
# File a complaint
curl -X POST http://localhost:4000/api/complaints \
  -H "Content-Type: application/json" \
  -d '{"batchId":"<batchId>","farmerId":"<farmerId>","description":"Suspected counterfeit fertilizer"}'

# List complaints
curl http://localhost:4000/api/complaints

# List by farmer
curl http://localhost:4000/api/complaints/farmer/<farmerId>

# List by supplier
curl http://localhost:4000/api/complaints/supplier/<supplierId>

# Update complaint status
curl -X PATCH http://localhost:4000/api/complaints/<complaintId>/status \
  -H "Content-Type: application/json" \
  -d '{"status":"Escalated"}'
```

## Traceability
```bash
# Get chain-of-custody for a batch
curl http://localhost:4000/api/traceability/batch/<batchId>

# Record a traceability event
curl -X POST http://localhost:4000/api/traceability/events \
  -H "Content-Type: application/json" \
  -d '{"batchId":"<batchId>","actorType":"Dealer","actorId":"<dealerId>","eventType":"Distributed","location":"Mymensingh Sadar"}'

# Recent events
curl http://localhost:4000/api/traceability/events
```

## SMS Gateway
```bash
# Send SMS
curl -X POST http://localhost:4000/api/sms/send \
  -H "Content-Type: application/json" \
  -d '{"to":"+8801712345620","text":"Your product is verified","language":"en"}'

# Send advisory SMS
curl -X POST http://localhost:4000/api/sms/advisory \
  -H "Content-Type: application/json" \
  -d '{"phone":"+8801712345620","farmerName":"Rahim","advice":"Irrigate fields","language":"bn"}'

# Send verification result
curl -X POST http://localhost:4000/api/sms/verification \
  -H "Content-Type: application/json" \
  -d '{"phone":"+8801712345620","productName":"UREA 46% N","verified":true,"language":"bn"}'
```

## Offline Sync
```bash
# Sync queued scans and complaints from offline farmer app
curl -X POST http://localhost:4000/sync \
  -H "Content-Type: application/json" \
  -d '{"scans":[{"batchId":"<batchId>","farmerId":"<farmerId>","result":"Verified","scannedAt":"2026-07-06T10:00:00Z"}],"complaints":[{"batchId":"<batchId>","farmerId":"<farmerId>","description":"Counterfeit","createdAt":"2026-07-06T10:00:00Z"}]}'
```
