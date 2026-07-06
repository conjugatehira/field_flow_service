import { PrismaClient } from "@prisma/client";
import { signPayload } from "./qr.util";
import type { CreateBatchInput } from "@fieldflow/shared-types";

const prisma = new PrismaClient();

export class BatchService {
  async create(input: CreateBatchInput) {
    const batch = await prisma.batch.create({
      data: {
        batchNumber: input.batchNumber,
        productType: input.productType,
        productName: input.productName,
        quantity: input.quantity,
        dealerId: input.dealerId,
        supplierId: input.supplierId,
        mfgDate: new Date(input.mfgDate),
        expiryDate: new Date(input.expiryDate),
        qrSignature: "", // placeholder, updated below
      },
    });

    const qrData = signPayload({
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      productType: batch.productType,
      productName: batch.productName,
      mfgDate: batch.mfgDate.toISOString().split("T")[0],
      expiryDate: batch.expiryDate.toISOString().split("T")[0],
      dealerId: batch.dealerId,
    });

    await prisma.batch.update({
      where: { id: batch.id },
      data: { qrSignature: qrData.signature },
    });

    return { ...batch, qrSignature: qrData.signature, qrPayload: qrData.payload };
  }

  async findById(id: string) {
    return prisma.batch.findUnique({ where: { id } });
  }

  async findByBatchNumber(batchNumber: string) {
    return prisma.batch.findUnique({ where: { batchNumber } });
  }

  async listByDealer(dealerId: string) {
    return prisma.batch.findMany({
      where: { dealerId },
      orderBy: { createdAt: "desc" },
    });
  }

  async listBySupplier(supplierId: string) {
    return prisma.batch.findMany({
      where: { supplierId },
      orderBy: { createdAt: "desc" },
    });
  }
}
