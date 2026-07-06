import { describe, it, expect, vi, beforeAll } from "vitest";

// Mock prisma
vi.mock("@prisma/client", () => {
  const mockPrisma = {
    batch: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  };
  return { PrismaClient: vi.fn(() => mockPrisma) };
});

import { BatchService } from "../src/modules/batches/batch.service";

describe("BatchService", () => {
  let service: BatchService;
  let mockPrisma: any;

  beforeAll(() => {
    service = new BatchService();
    mockPrisma = new (await import("@prisma/client")).PrismaClient();
  });

  it("create should throw on invalid input", async () => {
    await expect(service.create({} as any)).rejects.toThrow();
  });

  it("findById returns null for missing batch", async () => {
    mockPrisma.batch.findUnique.mockResolvedValue(null);
    const result = await service.findById("nonexistent");
    expect(result).toBeNull();
  });

  it("findById returns batch when found", async () => {
    const mockBatch = { id: "batch-1", batchNumber: "IN-2026-001", productName: "UREA" };
    mockPrisma.batch.findUnique.mockResolvedValue(mockBatch);
    const result = await service.findById("batch-1");
    expect(result?.id).toBe("batch-1");
    expect(result?.productName).toBe("UREA");
  });
});
