import { PrismaClient } from '../src/generated/client/client';
import { UserRole } from '../src/generated/client/enums';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaBetterSqlite3({
  url: 'file:./dev.db',
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // Clear existing database
  console.log('Cleaning up existing data...');
  try {
    await prisma.diarioProduccion.deleteMany({});
    await prisma.produccion.deleteMany({});
    await prisma.lote.deleteMany({});
    await prisma.finca.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.inventario.deleteMany({});
    await prisma.finanza.deleteMany({});
    await prisma.empleado.deleteMany({});
    await prisma.maquinaria.deleteMany({});
    await prisma.organization.deleteMany({});
  } catch (error) {
    console.log('Clear error (expected if running first time):', error);
  }

  console.log('Seeding database...');

  // Create default organization
  const org = await prisma.organization.create({
    data: {
      name: 'Asociación Agro Cesar',
      nit: '900.123.456-7',
      subscription: 'PREMIUM',
    },
  });

  // Create hashed password for admin
  const passwordHash = await bcrypt.hash('melioda123', 10);

  // Create default users
  const admin = await prisma.user.create({
    data: {
      email: 'zuletajoseangel4@gmail.com',
      name: 'José Ángel Zuleta',
      passwordHash,
      role: 'SUPERADMIN', // Maps to the UserRole enum
      organizationId: org.id,
    },
  });

  const worker = await prisma.user.create({
    data: {
      email: 'trabajador@agrodata.com',
      name: 'Carlos Gómez',
      passwordHash,
      role: 'TRABAJADOR',
      organizationId: org.id,
    },
  });

  const agronomist = await prisma.user.create({
    data: {
      email: 'agronomo@agrodata.com',
      name: 'Laura Restrepo',
      passwordHash,
      role: 'AGRONOMO',
      organizationId: org.id,
    },
  });

  // Create some fincas
  const finca1 = await prisma.finca.create({
    data: {
      name: 'Hacienda El Oasis',
      location: 'Kilómetro 12 Vía la Paz, Valledupar',
      area: 45.5,
      latitude: 10.4283,
      longitude: -73.2038,
      organizationId: org.id,
    },
  });

  // Create some lotes
  const lote1 = await prisma.lote.create({
    data: {
      name: 'Lote Norte - Café',
      area: 12.0,
      soilType: 'Franco Arcilloso',
      fincaId: finca1.id,
    },
  });

  const lote2 = await prisma.lote.create({
    data: {
      name: 'Lote Sur - Cacao',
      area: 8.5,
      soilType: 'Franco Arenoso',
      fincaId: finca1.id,
    },
  });

  // Create some active productions
  const prod1 = await prisma.produccion.create({
    data: {
      name: 'Cultivo Café Castillo',
      type: 'AGRICOLA_CAFE',
      status: 'ACTIVE',
      startDate: new Date('2025-10-01'),
      expectedYield: 15000.0,
      unit: 'kg',
      loteId: lote1.id,
      metadata: JSON.stringify({
        variety: 'Castillo',
        density: 5000,
        lastSoilAnalysis: '2025-09-15',
      }),
    },
  });

  // Add some inventory items
  await prisma.inventario.createMany({
    data: [
      {
        name: 'Fertilizante NPK 15-15-15',
        category: 'FERTILIZANTE',
        quantity: 12.0, // only 12 bags left!
        unit: 'bultos',
        minAlertQuantity: 15.0, // triggers warning
        organizationId: org.id,
      },
      {
        name: 'Semilla Café Castillo',
        category: 'SEMILLA',
        quantity: 50.0,
        unit: 'kg',
        minAlertQuantity: 10.0,
        organizationId: org.id,
      },
      {
        name: 'Machete Corona 22"',
        category: 'HERRAMIENTA',
        quantity: 8.0,
        unit: 'unidades',
        minAlertQuantity: 5.0,
        organizationId: org.id,
      },
    ],
  });

  // Add some financial records
  await prisma.finanza.createMany({
    data: [
      {
        type: 'GASTO',
        category: 'FERTILIZANTE',
        amount: 1500000.0,
        description: 'Compra de 10 bultos de NPK 15-15-15',
        date: new Date('2026-06-15'),
        organizationId: org.id,
      },
      {
        type: 'GASTO',
        category: 'MANO_DE_OBRA',
        amount: 800000.0,
        description: 'Jornales de limpia lote norte',
        date: new Date('2026-07-02'),
        organizationId: org.id,
      },
      {
        type: 'INGRESO',
        category: 'VENTA',
        amount: 6800000.0,
        description: 'Venta de excedente cosecha anterior',
        date: new Date('2026-07-10'),
        organizationId: org.id,
      },
    ],
  });

  // Add some staff
  await prisma.empleado.createMany({
    data: [
      {
        name: 'Mateo Orozco',
        role: 'Recolector / Operario',
        status: 'ACTIVE',
        dailyRate: 45000.0,
        phone: '3157894561',
        organizationId: org.id,
      },
      {
        name: 'Sofia Martinez',
        role: 'Contabilidad / Administración',
        status: 'ACTIVE',
        dailyRate: 65000.0,
        phone: '3006549872',
        organizationId: org.id,
      },
    ],
  });

  // Add machinery
  await prisma.maquinaria.createMany({
    data: [
      {
        name: 'Guadañadora Husqvarna 541RS',
        status: 'OPERATIVE',
        lastMaintenance: new Date('2026-05-10'),
        maintenanceCost: 120000.0,
        organizationId: org.id,
      },
      {
        name: 'Bomba de Espalda Royal Condor 20L',
        status: 'OPERATIVE',
        lastMaintenance: new Date('2026-06-22'),
        maintenanceCost: 25000.0,
        organizationId: org.id,
      },
    ],
  });

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
