import { describe, it, expect, vi } from "vitest";
import { BatchService } from "../src/modules/batches/batch.service";

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

describe("BatchService", () => {
  const service = new BatchService();

  it("findById returns null for missing batch", async () => {
    const { PrismaClient } = await import("@prisma/client");
    const mockPrisma = new (PrismaClient as any)();
    mockPrisma.batch.findUnique.mockResolvedValue(null);
    const result = await service.findById("nonexistent");
    expect(result).toBeNull();
  });

  it("findById returns batch when found", async () => {
    const { PrismaClient } = await import("@prisma/client");
    const mockPrisma = new (PrismaClient as any)();
    const mockBatch = { id: "batch-1", batchNumber: "IN-2026-001", productName: "UREA" };
    mockPrisma.batch.findUnique.mockResolvedValue(mockBatch);
    const result = await service.findById("batch-1");
    expect(result?.id).toBe("batch-1");
    expect(result?.productName).toBe("UREA");
  });
});
