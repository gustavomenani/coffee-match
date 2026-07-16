import { PrismaClient, Role, Gender } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: "speeddate-br" },
    update: {},
    create: {
      name: "SpeedDate BR",
      slug: "speeddate-br",
    },
  });

  const passwordHash = await bcrypt.hash("admin123456", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@speeddate.local" },
    update: {},
    create: {
      email: "admin@speeddate.local",
      passwordHash,
      name: "Admin",
      phone: "11999999999",
      gender: Gender.male,
      birthDate: new Date("1990-01-01"),
      role: Role.admin,
    },
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: admin.id,
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      userId: admin.id,
    },
  });

  console.log("Seeded org", org.slug, "admin", admin.email);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
