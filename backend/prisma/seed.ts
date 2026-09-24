import { PrismaClient } from "../src/generated/client/client";
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || 'file:./dev.db',
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // ── Organizaciones ──
  const org1 = await prisma.organization.upsert({
    where: { id: "19918424-c9bb-49d2-bf5e-3878edd08cc9" },
    update: {},
    create: {
      id: "19918424-c9bb-49d2-bf5e-3878edd08cc9",
      name: "Asociación Agro Cesar",
      nit: "900.123.456-7",
      subscription: "PREMIUM",
    },
  });

  const org2 = await prisma.organization.upsert({
    where: { id: "daba1ba2-1646-4f63-a929-ff6ed1ef9997" },
    update: {},
    create: {
      id: "daba1ba2-1646-4f63-a929-ff6ed1ef9997",
      name: "Hacienda Napoles",
      nit: "1233332244",
      subscription: "FREE",
    },
  });

  const org3 = await prisma.organization.upsert({
    where: { id: "2704e718-68e0-47fb-9f71-d2ccc8cf7051" },
    update: {},
    create: {
      id: "2704e718-68e0-47fb-9f71-d2ccc8cf7051",
      name: "IntregaCore Agro",
      nit: "23347777443",
      subscription: "FREE",
    },
  });

  const org4 = await prisma.organization.upsert({
    where: { id: "383201c7-3b92-4661-8496-115139fecf31" },
    update: {},
    create: {
      id: "383201c7-3b92-4661-8496-115139fecf31",
      name: "El prado",
      subscription: "FREE",
    },
  });

  // ── Usuarios (passwordHash ya hasheadas con bcrypt) ──
  await prisma.user.upsert({
    where: { email: "zuletajoseangel4@gmail.com" },
    update: {},
    create: {
      id: "b157e892-1171-4b80-87b4-4b00f3e6a123",
      email: "zuletajoseangel4@gmail.com",
      passwordHash: "$2b$10$u2WJkNRmqlrrHzvHT6.2ouoJAjjPO1N5wZqXQmPhxBo6ksTLqQ4wK",
      name: "José Ángel Zuleta",
      role: "SUPERADMIN",
      organizationId: org1.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "alejandramogollonvargas@gmail.com" },
    update: {},
    create: {
      id: "ff332b3d-7733-45f3-81ea-8a6034ae2e1e",
      email: "alejandramogollonvargas@gmail.com",
      passwordHash: "$2b$10$EFY.ZcKpQnU8ZQ6OWEXvue6Lso9gety9OPs3WjVhv1k9w1lXIfSES",
      name: "Alejandra Mogollón Vargas",
      role: "PROPIETARIO",
      organizationId: org2.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "luigivsqz4@gmail.com" },
    update: {},
    create: {
      id: "8bf819ea-e14f-4840-9de7-2af56495c929",
      email: "luigivsqz4@gmail.com",
      passwordHash: "$2b$10$9Wp16Wzk.D2Wl2f1LiEL5Oscwz7fe.fSkjKQQPmmXQSwtgQNyYfjG",
      name: "Luigi Vasquez",
      role: "PROPIETARIO",
      organizationId: org3.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "santiagoroca@gmail.com" },
    update: {},
    create: {
      id: "c948cc63-1c6d-45d6-968b-16c3c6e10337",
      email: "santiagoroca@gmail.com",
      passwordHash: "$2b$10$e33D6K46U.0KbyXa0/TPh.MWyBRGgioq/0A6O4B6N39nGiX6bkMmW",
      name: "Santigap",
      role: "AGRONOMO",
      organizationId: org3.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "eduinsns@gmail.com" },
    update: {},
    create: {
      id: "4a14c7ea-7cf0-47c1-8375-74c1f318442f",
      email: "eduinsns@gmail.com",
      passwordHash: "$2b$10$JrxYav.f0qAZnXuaqLQUqOevl1shVOfm8nfHrkkr.7NrwnBt0AbTi",
      name: "Eduin Sanchez",
      role: "ADMIN",
      organizationId: org4.id,
    },
  });

  console.log("✅ Seed completado — organizaciones y usuarios creados.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
