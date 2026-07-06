import { z } from "zod";

// ── Batch ──
export const ProductType = z.enum(["Fertilizer", "Pesticide", "Seed"]);
export type ProductType = z.infer<typeof ProductType>;

export const BatchSchema = z.object({
  id: z.string().ulid(),
  batchNumber: z.string(),
  productType: ProductType,
  productName: z.string(),
  quantity: z.number().positive(),
  dealerId: z.string().ulid(),
  supplierId: z.string().ulid(),
  mfgDate: z.string().date(),
  expiryDate: z.string().date(),
  qrSignature: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Batch = z.infer<typeof BatchSchema>;

export const CreateBatchInput = BatchSchema.omit({
  id: true,
  qrSignature: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateBatchInput = z.infer<typeof CreateBatchInput>;

// ── Farmer ──
export const SoilType = z.enum(["Alluvial", "Clay", "Sandy", "Loamy", "Barind"]);
export type SoilType = z.infer<typeof SoilType>;

export const CropType = z.enum([
  "Rice (Aman)",
  "Rice (Boro)",
  "Wheat",
  "Maize",
  "Jute",
  "Potato",
  "Mustard",
]);
export type CropType = z.infer<typeof CropType>;

export const FarmerSchema = z.object({
  id: z.string().ulid(),
  phone: z.string().regex(/^\+?[1-9]\d{6,14}$/),
  name: z.string(),
  upazila: z.string(),
  district: z.string(),
  cropType: CropType,
  soilType: SoilType,
  languagePref: z.enum(["bn", "en"]),
  createdAt: z.string().datetime(),
});
export type Farmer = z.infer<typeof FarmerSchema>;

// ── Dealer ──
export const DealerSchema = z.object({
  id: z.string().ulid(),
  name: z.string(),
  phone: z.string(),
  upazila: z.string(),
  district: z.string(),
  licenseNumber: z.string(),
  verified: z.boolean(),
  createdAt: z.string().datetime(),
});
export type Dealer = z.infer<typeof DealerSchema>;

// ── Supplier ──
export const SupplierSchema = z.object({
  id: z.string().ulid(),
  name: z.string(),
  licenseNumber: z.string(),
  phone: z.string(),
  createdAt: z.string().datetime(),
});
export type Supplier = z.infer<typeof SupplierSchema>;

// ── Complaint ──
export const ComplaintStatus = z.enum([
  "Pending",
  "UnderReview",
  "Escalated",
  "Resolved",
  "Dismissed",
]);
export type ComplaintStatus = z.infer<typeof ComplaintStatus>;

export const ComplaintSchema = z.object({
  id: z.string().ulid(),
  batchId: z.string().ulid(),
  farmerId: z.string().ulid(),
  status: ComplaintStatus,
  routedTo: z.enum(["Dealer", "Supplier"]),
  description: z.string().optional(),
  resolvedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Complaint = z.infer<typeof ComplaintSchema>;

// ── Advisory ──
export const WeatherCondition = z.enum([
  "Normal",
  "Dry",
  "Rainy",
  "Flood",
  "Heatwave",
]);
export type WeatherCondition = z.infer<typeof WeatherCondition>;

export const AdvisoryRuleSchema = z.object({
  id: z.string().ulid(),
  cropType: CropType,
  soilType: SoilType,
  weatherCondition: WeatherCondition,
  messageTemplateBn: z.string(),
  messageTemplateEn: z.string(),
  priority: z.number().int().min(1).max(5),
});
export type AdvisoryRule = z.infer<typeof AdvisoryRuleSchema>;

// ── Traceability Event ──
export const TraceabilityEventSchema = z.object({
  id: z.string().ulid(),
  batchId: z.string().ulid(),
  actorType: z.enum(["Supplier", "Dealer", "Farmer"]),
  actorId: z.string().ulid(),
  eventType: z.enum([
    "Manufactured",
    "Distributed",
    "Received",
    "Scanned",
    "Reported",
  ]),
  location: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.string().datetime(),
});
export type TraceabilityEvent = z.infer<typeof TraceabilityEventSchema>;
