import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class TraceabilityService {
  async recordEvent(data: {
    batchId: string;
    actorType: string;
    actorId: string;
    eventType: string;
    location?: string;
    metadata?: Record<string, unknown>;
  }) {
    return prisma.traceabilityEvent.create({ data });
  }

  async getChainForBatch(batchId: string) {
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        dealer: true,
        supplier: true,
        events: { orderBy: { timestamp: "asc" } },
        complaints: {
          include: { farmer: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!batch) return null;

    return {
      batch: {
        id: batch.id,
        batchNumber: batch.batchNumber,
        productName: batch.productName,
        productType: batch.productType,
        mfgDate: batch.mfgDate,
        expiryDate: batch.expiryDate,
      },
      supplier: batch.supplier,
      dealer: batch.dealer,
      timeline: batch.events.map((e) => ({
        eventType: e.eventType,
        actorType: e.actorType,
        actorId: e.actorId,
        location: e.location,
        metadata: e.metadata,
        timestamp: e.timestamp,
      })),
      complaints: batch.complaints.map((c) => ({
        id: c.id,
        farmer: c.farmer,
        status: c.status,
        description: c.description,
        createdAt: c.createdAt,
      })),
    };
  }

  async listRecentEvents(limit = 50) {
    return prisma.traceabilityEvent.findMany({
      orderBy: { timestamp: "desc" },
      take: limit,
    });
  }
}
