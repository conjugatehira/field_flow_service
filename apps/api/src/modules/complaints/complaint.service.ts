import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class ComplaintService {
  async create(data: {
    batchId: string;
    farmerId: string;
    description?: string;
  }) {
    const batch = await prisma.batch.findUnique({ where: { id: data.batchId } });
    if (!batch) throw new Error("Batch not found");

    const complaint = await prisma.complaint.create({
      data: {
        batchId: data.batchId,
        farmerId: data.farmerId,
        routedTo: "Supplier",
        description: data.description,
      },
      include: { batch: true, farmer: true },
    });

    return complaint;
  }

  async list(status?: string) {
    const where = status ? { status } : {};
    return prisma.complaint.findMany({
      where,
      include: { batch: true, farmer: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async listByFarmer(farmerId: string) {
    return prisma.complaint.findMany({
      where: { farmerId },
      include: { batch: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async listBySupplier(supplierId: string) {
    return prisma.complaint.findMany({
      where: { batch: { supplierId } },
      include: { batch: true, farmer: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateStatus(id: string, status: string) {
    const data: any = { status };
    if (status === "Resolved") {
      data.resolvedAt = new Date();
    }
    return prisma.complaint.update({ where: { id }, data });
  }

  async findById(id: string) {
    return prisma.complaint.findUnique({
      where: { id },
      include: { batch: true, farmer: true },
    });
  }
}
