import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class DealerService {
  async create(data: { name: string; phone: string; upazila: string; district: string; licenseNumber: string }) {
    return prisma.dealer.create({ data });
  }

  async findById(id: string) {
    return prisma.dealer.findUnique({ where: { id } });
  }

  async findByPhone(phone: string) {
    return prisma.dealer.findUnique({ where: { phone } });
  }

  async list(upazila?: string) {
    const where = upazila ? { upazila } : {};
    return prisma.dealer.findMany({ where, orderBy: { createdAt: "desc" } });
  }

  async verify(id: string) {
    return prisma.dealer.update({ where: { id }, data: { verified: true } });
  }
}
