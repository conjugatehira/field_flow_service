import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class FarmerService {
  async create(data: {
    phone: string;
    name: string;
    upazila: string;
    district: string;
    cropType: string;
    soilType: string;
    languagePref?: string;
  }) {
    return prisma.farmer.create({
      data: { ...data, languagePref: data.languagePref ?? "bn" },
    });
  }

  async findById(id: string) {
    return prisma.farmer.findUnique({ where: { id } });
  }

  async findByPhone(phone: string) {
    return prisma.farmer.findUnique({ where: { phone } });
  }

  async list(upazila?: string) {
    const where = upazila ? { upazila } : {};
    return prisma.farmer.findMany({ where, orderBy: { createdAt: "desc" } });
  }

  async update(id: string, data: Partial<{
    cropType: string;
    soilType: string;
    languagePref: string;
    upazila: string;
  }>) {
    return prisma.farmer.update({ where: { id }, data });
  }
}
