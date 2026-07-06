import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("[seed] Starting...");

  // Suppliers
  const supplier1 = await prisma.supplier.create({
    data: {
      name: "AgroCorp Ltd.",
      licenseNumber: "SUP-2026-8842",
      phone: "+8801712345601",
    },
  });
  const supplier2 = await prisma.supplier.create({
    data: {
      name: "GreenField Bangladesh",
      licenseNumber: "SUP-2026-7711",
      phone: "+8801712345602",
    },
  });

  // Dealers
  const dealer1 = await prisma.dealer.create({
    data: {
      name: "Alam Store",
      phone: "+8801712345610",
      upazila: "Mymensingh Sadar",
      district: "Mymensingh",
      licenseNumber: "DLR-2026-001",
      verified: true,
    },
  });
  const dealer2 = await prisma.dealer.create({
    data: {
      name: "Karim Traders",
      phone: "+8801712345611",
      upazila: "Netrokona Sadar",
      district: "Netrokona",
      licenseNumber: "DLR-2026-002",
      verified: true,
    },
  });

  // Farmers
  const farmer1 = await prisma.farmer.create({
    data: {
      phone: "+8801712345620",
      name: "Rahim Uddin",
      upazila: "Mymensingh Sadar",
      district: "Mymensingh",
      cropType: "Rice (Boro)",
      soilType: "Alluvial",
      languagePref: "bn",
    },
  });
  const farmer2 = await prisma.farmer.create({
    data: {
      phone: "+8801712345621",
      name: "Mita Begum",
      upazila: "Netrokona Sadar",
      district: "Netrokona",
      cropType: "Maize",
      soilType: "Loamy",
      languagePref: "bn",
    },
  });

  // Advisory Rules
  await prisma.advisoryRule.createMany({
    data: [
      {
        cropType: "Rice (Boro)",
        soilType: "Alluvial",
        weatherCondition: "Dry",
        messageTemplateBn: "শুকনো মৌসুমে ধানের জমিতে সপ্তাহে ২ দিন সেচ দিন। ইউরিয়া সার উপরি প্রয়োগ করুন।",
        messageTemplateEn: "Irrigate paddy fields twice a week during dry season. Apply top-dressing urea.",
        priority: 1,
      },
      {
        cropType: "Rice (Boro)",
        soilType: "Alluvial",
        weatherCondition: "Rainy",
        messageTemplateBn: "বৃষ্টির সময় ধানের জমিতে পানি নিষ্কাশনের ব্যবস্থা করুন। ছত্রাকনাশক স্প্রে করুন।",
        messageTemplateEn: "Ensure drainage in paddy fields during rain. Apply fungicide.",
        priority: 1,
      },
      {
        cropType: "Maize",
        soilType: "Loamy",
        weatherCondition: "Normal",
        messageTemplateBn: "ভুট্টা ক্ষেতে প্রয়োজনীয় সেচ ও আগাছা ব্যবস্থাপনা করুন।",
        messageTemplateEn: "Irrigate maize fields as needed and manage weeds.",
        priority: 2,
      },
      {
        cropType: "Maize",
        soilType: "Loamy",
        weatherCondition: "Dry",
        messageTemplateBn: "খরায় ভুট্টার ফলন কমতে পারে। জৈসার স্প্রে করুন এবং মালচিং করুন।",
        messageTemplateEn: "Drought may reduce maize yield. Apply boron spray and mulching.",
        priority: 1,
      },
      {
        cropType: "Potato",
        soilType: "Sandy",
        weatherCondition: "Rainy",
        messageTemplateBn: "বৃষ্টিতে আলু ক্ষেতে পানি জমলে পচন রোগ হতে পারে। উচ্চ জমিতে চাষ করুন।",
        messageTemplateEn: "Waterlogging in potato fields may cause rot. Plant on raised beds.",
        priority: 1,
      },
    ],
  });

  console.log("[seed] Complete!");
  console.log(`  Suppliers: ${supplier1.name}, ${supplier2.name}`);
  console.log(`  Dealers: ${dealer1.name}, ${dealer2.name}`);
  console.log(`  Farmers: ${farmer1.name}, ${farmer2.name}`);
}

main()
  .catch((e) => {
    console.error("[seed] Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
