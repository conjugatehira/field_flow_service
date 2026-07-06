# FieldFlow — As-Is vs To-Be Analysis

## As-Is (Current Problem)

| Issue | Description |
|-------|-------------|
| No verification mechanism | Farmers cannot verify if agri-inputs (fertilizer, pesticide, seed) are authentic at point of purchase |
| Counterfeit prevalence | Spurious inputs flood the market — same packaging, no traceability |
| Farmers have no recourse | A farmer who suspects counterfeit has no channel to report or escalate |
| Dealers unaware | Dealers cannot distinguish genuine stock from infiltrated counterfeits in their own inventory |
| Supplier accountability gap | Suppliers face no consequences for counterfeit entering their distribution chain |
| Crop losses | Fake inputs cause yield reduction, financial loss, and debt cycles for smallholders |

## To-Be (Solution)

| Capability | How FieldFlow Addresses It |
|------------|---------------------------|
| QR-based verification | Every batch gets a cryptographically signed QR — scannable via app or SMS code entry |
| Counterfeit detection | Tampered QR or missing signature raises an immediate alert |
| Farmer complaint channel | One-tap complaint filing routes directly to the batch's registered supplier |
| Dealer transparency | Dealer dashboard shows scan stats, counterfeit flags, and traceability chain |
| Supplier accountability | Suppliers receive all counterfeit flags against their batches with full chain-of-custody |
| Advisory value-add | Weather + crop + soil → personalized advisory SMS drives adoption beyond verification |

## Supply Chain Comparison

```
As-Is:
  Supplier ──(blind ship)──▶ Dealer ──(blind sell)──▶ Farmer
                                                           │
                                                      Crop failure
                                                           │
                                                      No recourse

To-Be:
  Supplier ──(register batch + QR)──▶ Dealer ──(scan QR)──▶ Farmer
                                      │                      │
                                  Dashboard             Scan & verify
                                      │                      │
                                Counterfeit alert ──▶ Complaint filed
                                      │                      │
                                  Traceability         SMS advisory
```
