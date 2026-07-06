import { PrismaClient } from "@prisma/client";
import type { WeatherCondition } from "@fieldflow/shared-types";

const prisma = new PrismaClient();

export class AdvisoryService {
  async getAdvice(params: {
    cropType: string;
    soilType: string;
    weatherCondition: WeatherCondition;
    languagePref: string;
  }) {
    const rule = await prisma.advisoryRule.findFirst({
      where: {
        cropType: params.cropType,
        soilType: params.soilType,
        weatherCondition: params.weatherCondition,
      },
      orderBy: { priority: "asc" },
    });

    if (!rule) {
      const fallback = await prisma.advisoryRule.findFirst({
        where: {
          cropType: params.cropType,
          weatherCondition: params.weatherCondition,
        },
        orderBy: { priority: "asc" },
      });
      if (!fallback) return null;
      return params.languagePref === "bn" ? fallback.messageTemplateBn : fallback.messageTemplateEn;
    }

    return params.languagePref === "bn" ? rule.messageTemplateBn : rule.messageTemplateEn;
  }

  async createRule(data: {
    cropType: string;
    soilType: string;
    weatherCondition: string;
    messageTemplateBn: string;
    messageTemplateEn: string;
    priority?: number;
  }) {
    return prisma.advisoryRule.create({ data });
  }

  async listRules() {
    return prisma.advisoryRule.findMany({ orderBy: { priority: "asc" } });
  }

  async deleteRule(id: string) {
    return prisma.advisoryRule.delete({ where: { id } });
  }
}
