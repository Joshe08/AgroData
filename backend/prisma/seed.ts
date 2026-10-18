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
    update: {
      passwordHash: "$2b$10$ZPxZ.XyT7o/p30Bp94TqkOQs6uiA0hk6FGdso6Ap2r0bmAiEC0DQq",
      role: "SUPERADMIN",
    },
    create: {
      id: "b157e892-1171-4b80-87b4-4b00f3e6a123",
      email: "zuletajoseangel4@gmail.com",
      passwordHash: "$2b$10$ZPxZ.XyT7o/p30Bp94TqkOQs6uiA0hk6FGdso6Ap2r0bmAiEC0DQq",
      name: "José Ángel Zuleta",
      role: "SUPERADMIN",
      organizationId: org1.id,
    },
  });

  const testPasswordHash = "$2b$10$ZPxZ.XyT7o/p30Bp94TqkOQs6uiA0hk6FGdso6Ap2r0bmAiEC0DQq"; // melioda123

  await prisma.user.upsert({
    where: { email: "alejandramogollonvargas@gmail.com" },
    update: {
      passwordHash: testPasswordHash,
      role: "PROPIETARIO",
    },
    create: {
      id: "ff332b3d-7733-45f3-81ea-8a6034ae2e1e",
      email: "alejandramogollonvargas@gmail.com",
      passwordHash: testPasswordHash,
      name: "Alejandra Mogollón Vargas",
      role: "PROPIETARIO",
      organizationId: org2.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "luigivsqz4@gmail.com" },
    update: { passwordHash: testPasswordHash },
    create: {
      id: "8bf819ea-e14f-4840-9de7-2af56495c929",
      email: "luigivsqz4@gmail.com",
      passwordHash: testPasswordHash,
      name: "Luigi Vasquez",
      role: "PROPIETARIO",
      organizationId: org3.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "santiagoroca@gmail.com" },
    update: { passwordHash: testPasswordHash },
    create: {
      id: "c948cc63-1c6d-45d6-968b-16c3c6e10337",
      email: "santiagoroca@gmail.com",
      passwordHash: testPasswordHash,
      name: "Santigap",
      role: "AGRONOMO",
      organizationId: org3.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "eduinsns@gmail.com" },
    update: { passwordHash: testPasswordHash },
    create: {
      id: "4a14c7ea-7cf0-47c1-8375-74c1f318442f",
      email: "eduinsns@gmail.com",
      passwordHash: testPasswordHash,
      name: "Eduin Sanchez",
      role: "ADMIN",
      organizationId: org4.id,
    },
  });

  // ── Finca Hacienda Nápoles ──
  const fincaNapoles = await prisma.finca.upsert({
    where: { id: "b02bc16b-1420-437c-9709-0da25ac7684d" },
    update: {
      name: "Hacienda Nápoles",
      location: "Valledupar, Cesar",
      area: 2345.0,
      description: "Predio ganadero y agrícola principal con vocación agroforestal y pasturas tecnificadas.",
      latitude: 10.423597,
      longitude: -73.257142,
      tipoExplotacion: "MIXTA",
      estado: "ACTIVA",
      tipoSuelo: "Franco Arcilloso",
      fuenteAgua: "Río o quebrada permanente",
      sistemaRiego: "Aspersión / Cañón",
      tipoAcceso: "Carretera destapada (afirmado)",
      departamento: "Cesar",
      municipio: "Valledupar",
      vereda: "Vereda El Salguero",
      referenciaAcceso: "Km 12 Vía La Paz - Valledupar",
      actividades: JSON.stringify(["AGRICULTURA", "GANADERIA"]),
      organizationId: org2.id,
    },
    create: {
      id: "b02bc16b-1420-437c-9709-0da25ac7684d",
      name: "Hacienda Nápoles",
      location: "Valledupar, Cesar",
      area: 2345.0,
      description: "Predio ganadero y agrícola principal con vocación agroforestal y pasturas tecnificadas.",
      latitude: 10.423597,
      longitude: -73.257142,
      tipoExplotacion: "MIXTA",
      estado: "ACTIVA",
      tipoSuelo: "Franco Arcilloso",
      fuenteAgua: "Río o quebrada permanente",
      sistemaRiego: "Aspersión / Cañón",
      tipoAcceso: "Carretera destapada (afirmado)",
      departamento: "Cesar",
      municipio: "Valledupar",
      vereda: "Vereda El Salguero",
      referenciaAcceso: "Km 12 Vía La Paz - Valledupar",
      actividades: JSON.stringify(["AGRICULTURA", "GANADERIA"]),
      organizationId: org2.id,
    },
  });

  // ── Lotes / Parcelas ──
  const lote1 = await prisma.lote.upsert({
    where: { id: "lote-napoles-01" },
    update: {},
    create: {
      id: "lote-napoles-01",
      name: "Lote 1 - Palma & Maíz",
      area: 450.0,
      soilType: "Franco Arcilloso",
      fincaId: fincaNapoles.id,
    },
  });

  const lote2 = await prisma.lote.upsert({
    where: { id: "lote-napoles-02" },
    update: {},
    create: {
      id: "lote-napoles-02",
      name: "Lote 2 - Pastos Braquiaria",
      area: 800.0,
      soilType: "Franco Arenoso",
      fincaId: fincaNapoles.id,
    },
  });

  const lote3 = await prisma.lote.upsert({
    where: { id: "lote-napoles-03" },
    update: {},
    create: {
      id: "lote-napoles-03",
      name: "Lote 3 - Potrero El Río",
      area: 600.0,
      soilType: "Aluvial / Fértil",
      fincaId: fincaNapoles.id,
    },
  });

  // ── Producciones Activas ──
  const prod1 = await prisma.produccion.upsert({
    where: { id: "prod-napoles-01" },
    update: {},
    create: {
      id: "prod-napoles-01",
      name: "Maíz Tecnificado Híbrido",
      type: "AGRICOLA_MAIZ",
      status: "ACTIVE",
      startDate: new Date("2026-08-01"),
      endDate: new Date("2026-12-15"),
      expectedYield: 3200.0,
      actualYield: 450.0,
      unit: "Toneladas",
      loteId: lote1.id,
      metadata: JSON.stringify({
        etapa: "VEGETATIVO",
        variedad: "Híbrido Pioneer 30F35",
        densidad: "65,000 plantas/ha",
      }),
    },
  });

  const prod2 = await prisma.produccion.upsert({
    where: { id: "prod-napoles-02" },
    update: {},
    create: {
      id: "prod-napoles-02",
      name: "Ganado Doble Propósito Cebú - Guzerá",
      type: "PECUARIA_GANADO",
      status: "ACTIVE",
      startDate: new Date("2026-06-10"),
      expectedYield: 250.0,
      actualYield: 180.0,
      unit: "Cabezas",
      loteId: lote2.id,
      metadata: JSON.stringify({
        etapa: "CEBA",
        raza: "Brahman x Guzerá",
        pesoPromedio: "385 kg",
      }),
    },
  });

  // ── Diarios de Producción ──
  await prisma.diarioProduccion.createMany({
    data: [
      {
        id: "diario-napoles-01",
        date: new Date("2026-09-10"),
        activity: "Fertilización foliar y control biológico",
        observations: "Buen desarrollo radicular y de hoja. Sin presencia de cogollero.",
        fertilizerUsed: "Urea 46% + Micorrizas líquidas",
        waterIrrigation: 1200,
        produccionId: prod1.id,
      },
      {
        id: "diario-napoles-02",
        date: new Date("2026-09-25"),
        activity: "Pesaje y rotación de potrero",
        observations: "Ganancia de peso diaria promedio de 680g/animal en Lote 2.",
        produccionId: prod2.id,
      },
    ],
  }).catch(() => {});

  // ── Inventario en Bodega ──
  await prisma.inventario.createMany({
    data: [
      {
        id: "inv-napoles-01",
        name: "Urea 46% Granulada",
        category: "FERTILIZANTE",
        quantity: 45.0,
        unit: "Bultos (50kg)",
        minAlertQuantity: 15.0,
        proveedor: "Monómeros del Cesar",
        costo: 145000,
        fincaId: fincaNapoles.id,
        organizationId: org2.id,
      },
      {
        id: "inv-napoles-02",
        name: "Semilla de Maíz Pioneer 30F35",
        category: "SEMILLA",
        quantity: 20.0,
        unit: "Bolsas (60k semillas)",
        minAlertQuantity: 8.0,
        proveedor: "Agroinsumos del Cesar",
        costo: 380000,
        fincaId: fincaNapoles.id,
        organizationId: org2.id,
      },
      {
        id: "inv-napoles-03",
        name: "Sal Mineralizada 8% Ganadería",
        category: "INSUMO",
        quantity: 6.0, // Alerta stock bajo
        unit: "Bultos (40kg)",
        minAlertQuantity: 10.0,
        proveedor: "Somex Valledupar",
        costo: 92000,
        fincaId: fincaNapoles.id,
        organizationId: org2.id,
      },
      {
        id: "inv-napoles-04",
        name: "Ivermectina al 1% antiparasitario",
        category: "MEDICAMENTO",
        quantity: 12.0,
        unit: "Frascos (500ml)",
        minAlertQuantity: 5.0,
        proveedor: "Veterinaria El Ganadero",
        costo: 68000,
        fincaId: fincaNapoles.id,
        organizationId: org2.id,
      },
    ],
  }).catch(() => {});

  // ── Finanzas / Movimientos de Dinero ──
  await prisma.finanza.createMany({
    data: [
      {
        id: "fin-napoles-01",
        type: "INGRESO",
        category: "VENTA_COSECHA",
        amount: 28500000,
        description: "Venta de lote de novillos cebados a Frigorífico del Cesar",
        date: new Date("2026-09-15"),
        fincaId: fincaNapoles.id,
        produccionId: prod2.id,
        organizationId: org2.id,
      },
      {
        id: "fin-napoles-02",
        type: "GASTO",
        category: "FERTILIZANTE",
        amount: 6525000,
        description: "Compra de 45 bultos de urea y micronutrientes para Lote 1",
        date: new Date("2026-09-18"),
        fincaId: fincaNapoles.id,
        produccionId: prod1.id,
        organizationId: org2.id,
      },
      {
        id: "fin-napoles-03",
        type: "GASTO",
        category: "MANO_DE_OBRA",
        amount: 3200000,
        description: "Pago quincenal de jornales y mantenimiento de cercas",
        date: new Date("2026-09-30"),
        fincaId: fincaNapoles.id,
        organizationId: org2.id,
      },
      {
        id: "fin-napoles-04",
        type: "INGRESO",
        category: "VENTA_COSECHA",
        amount: 14200000,
        description: "Anticipo de compra de cosecha de maíz",
        date: new Date("2026-10-05"),
        fincaId: fincaNapoles.id,
        produccionId: prod1.id,
        organizationId: org2.id,
      },
    ],
  }).catch(() => {});

  // ── Empleados / Personal de Campo ──
  await prisma.empleado.createMany({
    data: [
      {
        id: "emp-napoles-01",
        name: "Carlos",
        lastName: "Mendoza Silva",
        documento: "77.189.432",
        email: "carlos.mendoza@agrodatacesar.com",
        phone: "3145678901",
        role: "Administrador de Finca / Capataz",
        status: "ACTIVE",
        dailyRate: 65000,
        fechaIngreso: new Date("2024-03-15"),
        fincaId: fincaNapoles.id,
        notes: "Encargado general de operaciones y maquinaria.",
        organizationId: org2.id,
      },
      {
        id: "emp-napoles-02",
        name: "Jairo",
        lastName: "Gutiérrez Vega",
        documento: "1.065.234.890",
        email: "jairo.vaquero@gmail.com",
        phone: "3128901234",
        role: "Vaquero principal / Ganadero",
        status: "ACTIVE",
        dailyRate: 50000,
        fechaIngreso: new Date("2025-01-10"),
        fincaId: fincaNapoles.id,
        notes: "Manejo de ganado cebú, vacunación y rotación de potreros.",
        organizationId: org2.id,
      },
      {
        id: "emp-napoles-03",
        name: "Marlon",
        lastName: "Duque Orozco",
        documento: "1.066.789.012",
        email: "marlon.tractor@gmail.com",
        phone: "3189012345",
        role: "Operador de Tractor y Maquinaria",
        status: "ACTIVE",
        dailyRate: 55000,
        fechaIngreso: new Date("2025-05-02"),
        fincaId: fincaNapoles.id,
        notes: "Certificado en manejo de maquinaria pesada y rastras.",
        organizationId: org2.id,
      },
    ],
  }).catch(() => {});

  // ── Maquinaria y Equipos ──
  await prisma.maquinaria.createMany({
    data: [
      {
        id: "maq-napoles-01",
        name: "Tractor John Deere 6110M",
        tipo: "TRACTOR",
        marca: "John Deere",
        modelo: "6110M 4WD 110 HP",
        status: "OPERATIVE",
        fincaId: fincaNapoles.id,
        fechaAdquisicion: new Date("2023-08-20"),
        valor: 245000000,
        horasUso: 1420,
        observaciones: "Operativo con mantenimiento de 1000 horas realizado.",
        lastMaintenance: new Date("2026-08-15"),
        maintenanceCost: 1850000,
        organizationId: org2.id,
      },
      {
        id: "maq-napoles-02",
        name: "Rastra de Discos Pesada 24 Discos",
        tipo: "IMPLEMENTO",
        marca: "Baldan",
        modelo: "CRI 24 x 26",
        status: "OPERATIVE",
        fincaId: fincaNapoles.id,
        fechaAdquisicion: new Date("2024-02-10"),
        valor: 38000000,
        horasUso: 480,
        observaciones: "Discos y chumaceras en excelente estado.",
        lastMaintenance: new Date("2026-07-20"),
        maintenanceCost: 450000,
        organizationId: org2.id,
      },
      {
        id: "maq-napoles-03",
        name: "Bomba Sumergible Pozo Profundo 15HP",
        tipo: "EQUIPO_RIEGO",
        marca: "Franklin Electric",
        modelo: "Serie STS 4 Pulgadas",
        status: "OPERATIVE",
        fincaId: fincaNapoles.id,
        fechaAdquisicion: new Date("2024-11-05"),
        valor: 18500000,
        horasUso: 2100,
        observaciones: "Suministro constante de agua para Lote 1 y bebederos.",
        lastMaintenance: new Date("2026-09-01"),
        maintenanceCost: 320000,
        organizationId: org2.id,
      },
    ],
  }).catch(() => {});

  console.log("✅ Seed completado — organizaciones, usuarios y datos de prueba para Hacienda Nápoles listos.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
