// Seed script - datos de demostración AgroData Cesar
// Ejecutar: node seed-demo.js (desde la carpeta backend/)

const { PrismaClient } = require('./dist/src/generated/client/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const bcrypt = require('bcrypt');

const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Buscando organización existente...');

  // Obtener org y primer usuario admin existente
  let org = await prisma.organization.findFirst({
    orderBy: { createdAt: 'asc' },
  });

  if (!org) {
    console.log('No hay organización. Creando org de demostración...');
    org = await prisma.organization.create({
      data: {
        name: 'Agropecuaria El Cesar S.A.S.',
        nit: '900.123.456-7',
        orgType: 'EMPRESA',
        subscription: 'PREMIUM',
        status: 'ACTIVE',
        phone: '+57 315 4782 019',
        address: 'Valledupar, Cesar, Colombia',
      },
    });
    const hash = await bcrypt.hash('demo1234', 10);
    await prisma.user.create({
      data: {
        email: 'admin@agrocesar.co',
        passwordHash: hash,
        name: 'Carlos Andrés Pérez',
        role: 'PROPIETARIO',
        organizationId: org.id,
      },
    });
    console.log('Org y usuario admin creados.');
  }

  const orgId = org.id;
  console.log('OrgID:', orgId);

  // ─── FINCAS ───────────────────────────────────────────────────────────────
  const fincasData = [
    {
      name: 'Finca La Esperanza',
      location: 'Vereda El Totumo, Codazzi, Cesar',
      area: 85.5,
      latitude: 10.0175,
      longitude: -73.2358,
      tipoExplotacion: 'AGRICOLA',
      tipoSuelo: 'Franco Limoso',
      fuenteAgua: 'Pozo profundo + canal de riego',
      sistemaRiego: 'Aspersión',
      municipio: 'Codazzi',
      departamento: 'Cesar',
      vereda: 'El Totumo',
      estado: 'ACTIVA',
    },
    {
      name: 'Finca San Martín de Loba',
      location: 'Vereda La Paz, Aguachica, Cesar',
      area: 120.0,
      latitude: 8.3127,
      longitude: -73.6164,
      tipoExplotacion: 'MIXTA',
      tipoSuelo: 'Arcillo Franco',
      fuenteAgua: 'Río Magdalena + jagüey',
      sistemaRiego: 'Gravedad',
      municipio: 'Aguachica',
      departamento: 'Cesar',
      vereda: 'La Paz',
      estado: 'ACTIVA',
    },
    {
      name: 'Hacienda Palmira',
      location: 'Km 12 vía Valledupar-La Paz, Cesar',
      area: 200.0,
      latitude: 10.2631,
      longitude: -73.3532,
      tipoExplotacion: 'PECUARIA',
      tipoSuelo: 'Franco Arcilloso',
      fuenteAgua: 'Acueducto veredal + jagüey propio',
      sistemaRiego: 'Secano',
      municipio: 'Valledupar',
      departamento: 'Cesar',
      vereda: 'El Hatillo',
      estado: 'ACTIVA',
    },
  ];

  const fincas = [];
  for (const f of fincasData) {
    const existing = await prisma.finca.findFirst({ where: { name: f.name, organizationId: orgId } });
    if (!existing) {
      const created = await prisma.finca.create({ data: { ...f, organizationId: orgId } });
      fincas.push(created);
      console.log('Finca creada:', created.name);
    } else {
      fincas.push(existing);
      console.log('Finca ya existe:', existing.name);
    }
  }

  // ─── LOTES ────────────────────────────────────────────────────────────────
  const lotesData = [
    // Lotes de La Esperanza
    { name: 'Lote 1 - Arroz Norte', area: 18.0, soilType: 'Franco Limoso', cultivoActual: 'Arroz IR-42', sistemaRiego: 'Aspersión', status: 'ACTIVO', ph: 6.2, fincaIdx: 0 },
    { name: 'Lote 2 - Maíz Centro', area: 14.5, soilType: 'Franco', cultivoActual: 'Maíz ICA-V-109', sistemaRiego: 'Aspersión', status: 'ACTIVO', ph: 6.5, fincaIdx: 0 },
    { name: 'Lote 3 - Sorgo Sur', area: 12.0, soilType: 'Franco Limoso', cultivoActual: 'Sorgo híbrido', sistemaRiego: 'Secano', status: 'ACTIVO', ph: 6.8, fincaIdx: 0 },
    // Lotes de San Martín
    { name: 'Lote A - Palma de Aceite', area: 45.0, soilType: 'Arcillo Franco', cultivoActual: 'Palma de aceite Elaeis', sistemaRiego: 'Gravedad', status: 'ACTIVO', ph: 5.8, fincaIdx: 1 },
    { name: 'Lote B - Yuca', area: 20.0, soilType: 'Franco Arenoso', cultivoActual: 'Yuca ICA-Catumare', sistemaRiego: 'Secano', status: 'ACTIVO', ph: 6.0, fincaIdx: 1 },
    // Lotes de Palmira
    { name: 'Potreros Norte', area: 60.0, soilType: 'Franco Arcilloso', cultivoActual: 'Pastura Brachiaria', sistemaRiego: 'Secano', status: 'ACTIVO', ph: 6.4, fincaIdx: 2 },
    { name: 'Potreros Sur', area: 55.0, soilType: 'Arcilloso', cultivoActual: 'Pastura Angleton', sistemaRiego: 'Secano', status: 'PASTOREO', ph: 6.1, fincaIdx: 2 },
  ];

  const lotes = [];
  for (const l of lotesData) {
    const finca = fincas[l.fincaIdx];
    if (!finca) continue;
    const { fincaIdx, ...loteFields } = l;
    const existing = await prisma.lote.findFirst({ where: { name: loteFields.name, fincaId: finca.id } });
    if (!existing) {
      const created = await prisma.lote.create({ data: { ...loteFields, fincaId: finca.id } });
      lotes.push(created);
      console.log('Lote creado:', created.name);
    } else {
      lotes.push(existing);
      console.log('Lote ya existe:', existing.name);
    }
  }

  // ─── PRODUCCIONES ─────────────────────────────────────────────────────────
  const prodData = [
    { name: 'Ciclo Arroz 2026-A', type: 'AGRICOLA_ARROZ', startDate: new Date('2026-03-01'), expectedYield: 7200, unit: 'kg', status: 'ACTIVE', loteIdx: 0 },
    { name: 'Maíz Tecnificado 2026', type: 'AGRICOLA_MAIZ', startDate: new Date('2026-04-15'), expectedYield: 5800, unit: 'kg', status: 'ACTIVE', loteIdx: 1 },
    { name: 'Sorgo Ciclo 1', type: 'AGRICOLA_SORGO', startDate: new Date('2026-05-01'), expectedYield: 4200, unit: 'kg', status: 'ACTIVE', loteIdx: 2 },
    { name: 'Palma de Aceite - Cosecha Q2', type: 'AGRICOLA_PALMA', startDate: new Date('2026-01-10'), expectedYield: 22000, unit: 'kg RFF', status: 'ACTIVE', loteIdx: 3 },
    { name: 'Levante Bovino 2026', type: 'PECUARIA_GANADO', startDate: new Date('2026-02-01'), expectedYield: 18000, unit: 'kg PV', status: 'ACTIVE', loteIdx: 5 },
  ];

  const producciones = [];
  for (const pd of prodData) {
    const lote = lotes[pd.loteIdx];
    if (!lote) continue;
    const { loteIdx, ...prodFields } = pd;
    const existing = await prisma.produccion.findFirst({ where: { name: prodFields.name, loteId: lote.id } });
    if (!existing) {
      const created = await prisma.produccion.create({ data: { ...prodFields, loteId: lote.id } });
      producciones.push(created);
      console.log('Producción creada:', created.name);
    } else {
      producciones.push(existing);
    }
  }

  // ─── DIARIOS DE CAMPO ─────────────────────────────────────────────────────
  if (producciones[0]) {
    const diarioExist = await prisma.diarioProduccion.findFirst({ where: { produccionId: producciones[0].id } });
    if (!diarioExist) {
      await prisma.diarioProduccion.createMany({
        data: [
          { produccionId: producciones[0].id, activity: 'Preparación de suelo y nivelación con Grader', observations: 'Suelo en buenas condiciones. Humedad adecuada.', fertilizerUsed: 'Urea 46% - 150 kg/ha', waterIrrigation: 85000, date: new Date('2026-03-02') },
          { produccionId: producciones[0].id, activity: 'Siembra directa por voleo', observations: 'Densidad de siembra: 180 kg/ha semilla certificada IR-42', fertilizerUsed: 'DAP 18-46-0 - 80 kg/ha', waterIrrigation: 92000, date: new Date('2026-03-10') },
          { produccionId: producciones[0].id, activity: 'Aplicación herbicida pre-emergente', observations: 'Control de caminadora y arroz rojo. Sin lluvia por 24h.', diseases: 'Presencia leve de arroz rojo en bordes', fertilizerUsed: null, waterIrrigation: 0, date: new Date('2026-03-18') },
          { produccionId: producciones[0].id, activity: 'Primer riego de macollamiento', observations: 'Lámina de agua 5 cm. 78% de germinación.', waterIrrigation: 110000, date: new Date('2026-04-01') },
          { produccionId: producciones[0].id, activity: 'Fertilización nitrogenada fraccionada', observations: 'Aplicación foliar en macollamiento. Plantas con buen vigor vegetativo.', fertilizerUsed: 'Urea 46% - 120 kg/ha', waterIrrigation: 95000, date: new Date('2026-04-20') },
        ],
      });
      console.log('Diarios de campo creados para arroz');
    }
  }

  // ─── INVENTARIO ───────────────────────────────────────────────────────────
  const inventarioItems = [
    { name: 'Urea 46% Nitrógeno', category: 'FERTILIZANTE', quantity: 850, unit: 'kg', minAlertQuantity: 200, costo: 1850, proveedor: 'Fertiagro del Cesar', fincaIdx: 0 },
    { name: 'DAP 18-46-0', category: 'FERTILIZANTE', quantity: 420, unit: 'kg', minAlertQuantity: 150, costo: 2200, proveedor: 'Agrosemillas Valledupar', fincaIdx: 0 },
    { name: 'Semilla Arroz IR-42 Certificada', category: 'SEMILLA', quantity: 380, unit: 'kg', minAlertQuantity: 180, costo: 3400, proveedor: 'Fedearroz Cesar', fincaIdx: 0 },
    { name: 'Herbicida Propanil 36% SC', category: 'INSUMO', quantity: 85, unit: 'litros', minAlertQuantity: 30, costo: 28000, proveedor: 'Agroinsumos del Norte', fincaIdx: 0 },
    { name: 'Fungicida Trifloxistrobina', category: 'INSUMO', quantity: 12, unit: 'litros', minAlertQuantity: 20, costo: 95000, proveedor: 'Bayer CropScience', fincaIdx: 0 },
    { name: 'Aceite de Palma RFF', category: 'PRODUCTO', quantity: 1200, unit: 'kg', minAlertQuantity: 500, costo: 1650, proveedor: 'Palmeras del Magdalena', fincaIdx: 1 },
    { name: 'Abono Orgánico Compostado', category: 'FERTILIZANTE', quantity: 2500, unit: 'kg', minAlertQuantity: 800, costo: 450, proveedor: 'Bioagro Cesar', fincaIdx: 1 },
    { name: 'Semilla Maíz ICA-V109 Cert.', category: 'SEMILLA', quantity: 95, unit: 'kg', minAlertQuantity: 60, costo: 8500, proveedor: 'ICA Regional Cesar', fincaIdx: 0 },
    { name: 'Bomba de fumigación Jacto', category: 'HERRAMIENTA', quantity: 4, unit: 'unidades', minAlertQuantity: 2, costo: 780000, proveedor: 'Agrimaq Ltda.', fincaIdx: 0 },
    { name: 'Combustible ACPM', category: 'INSUMO', quantity: 320, unit: 'litros', minAlertQuantity: 100, costo: 5200, proveedor: 'Terpel', fincaIdx: 2 },
  ];

  for (const item of inventarioItems) {
    const finca = fincas[item.fincaIdx];
    const { fincaIdx, ...itemFields } = item;
    const existing = await prisma.inventario.findFirst({ where: { name: itemFields.name, organizationId: orgId } });
    if (!existing) {
      await prisma.inventario.create({ data: { ...itemFields, fincaId: finca?.id || null, organizationId: orgId } });
      console.log('Inventario:', itemFields.name);
    }
  }

  // ─── FINANZAS ─────────────────────────────────────────────────────────────
  const finanzasItems = [
    // Ingresos
    { type: 'INGRESO', category: 'VENTA_COSECHA', amount: 32500000, description: 'Venta arroz cosecha 2025-B al molino del Cesar', date: new Date('2026-01-15'), fincaIdx: 0 },
    { type: 'INGRESO', category: 'VENTA_COSECHA', amount: 18700000, description: 'Venta RFF palma de aceite - Palmeras Magdalena', date: new Date('2026-02-10'), fincaIdx: 1 },
    { type: 'INGRESO', category: 'VENTA_GANADO', amount: 24000000, description: 'Venta 8 novillas de levante - Feria ganadera Valledupar', date: new Date('2026-03-05'), fincaIdx: 2 },
    { type: 'INGRESO', category: 'SUBSIDIO', amount: 5200000, description: 'Subsidio AIS - Alianza para la Innovación Agropecuaria', date: new Date('2026-01-28'), fincaIdx: 0 },
    { type: 'INGRESO', category: 'VENTA_COSECHA', amount: 9800000, description: 'Venta maíz tecnificado - Coagro Cesar', date: new Date('2026-04-20'), fincaIdx: 0 },
    // Gastos
    { type: 'GASTO', category: 'INSUMOS', amount: 8750000, description: 'Compra fertilizantes temporada arroz 2026-A', date: new Date('2026-02-20'), fincaIdx: 0 },
    { type: 'GASTO', category: 'MANO_DE_OBRA', amount: 5600000, description: 'Pago jornales - preparación suelo y siembra arroz', date: new Date('2026-03-15'), fincaIdx: 0 },
    { type: 'GASTO', category: 'COMBUSTIBLE', amount: 2100000, description: 'ACPM para tractores y bombas de riego - Marzo 2026', date: new Date('2026-03-31'), fincaIdx: 0 },
    { type: 'GASTO', category: 'MANTENIMIENTO', amount: 3800000, description: 'Mantenimiento tractor John Deere 5075E - 500 hrs', date: new Date('2026-02-05'), fincaIdx: 0 },
    { type: 'GASTO', category: 'INSUMOS', amount: 4200000, description: 'Herbicidas y fungicidas palma Q1 2026', date: new Date('2026-01-22'), fincaIdx: 1 },
    { type: 'GASTO', category: 'MANO_DE_OBRA', amount: 7200000, description: 'Nómina empleados - Marzo 2026 (6 trabajadores)', date: new Date('2026-03-31'), fincaIdx: 0 },
    { type: 'GASTO', category: 'SERVICIOS', amount: 1850000, description: 'Servicio energía eléctrica y comunicaciones predios', date: new Date('2026-03-28'), fincaIdx: 0 },
  ];

  for (const fin of finanzasItems) {
    const finca = fincas[fin.fincaIdx];
    const { fincaIdx, ...finFields } = fin;
    await prisma.finanza.create({ data: { ...finFields, fincaId: finca?.id || null, organizationId: orgId } });
  }
  console.log('Finanzas creadas:', finanzasItems.length, 'registros');

  // ─── PERSONAL ─────────────────────────────────────────────────────────────
  const personalItems = [
    { name: 'José', lastName: 'Díaz Mendoza', documento: '77892341', role: 'Operario agrícola', dailyRate: 85000, status: 'ACTIVE', fincaIdx: 0 },
    { name: 'Pedro', lastName: 'González Ariza', documento: '84571293', role: 'Tractorista', dailyRate: 110000, status: 'ACTIVE', fincaIdx: 0 },
    { name: 'María', lastName: 'Torres Suárez', documento: '50431876', role: 'Auxiliar de campo', dailyRate: 80000, status: 'ACTIVE', fincaIdx: 0 },
    { name: 'Andrés', lastName: 'Romero Paz', documento: '91234567', role: 'Supervisor de lotes', dailyRate: 130000, status: 'ACTIVE', fincaIdx: 1 },
    { name: 'Luz', lastName: 'Martínez Ríos', documento: '46782034', role: 'Encargada bodega', dailyRate: 90000, status: 'ACTIVE', fincaIdx: 0 },
    { name: 'Fernando', lastName: 'Pérez Cárdenas', documento: '79823415', role: 'Vaquero / ganadero', dailyRate: 95000, status: 'ACTIVE', fincaIdx: 2 },
  ];

  for (const emp of personalItems) {
    const finca = fincas[emp.fincaIdx];
    const { fincaIdx, ...empFields } = emp;
    const existing = await prisma.empleado.findFirst({ where: { documento: empFields.documento, organizationId: orgId } });
    if (!existing) {
      await prisma.empleado.create({ data: { ...empFields, fincaId: finca?.id || null, organizationId: orgId, fechaIngreso: new Date('2025-01-01') } });
      console.log('Empleado:', empFields.name, empFields.lastName);
    }
  }

  // ─── MAQUINARIA ───────────────────────────────────────────────────────────
  const maquinariaItems = [
    { name: 'Tractor John Deere 5075E', tipo: 'TRACTOR', marca: 'John Deere', modelo: '5075E', placa: 'AGR-001', status: 'OPERATIVE', horasUso: 1248, valor: 185000000, lastMaintenance: new Date('2026-02-05'), nextMaintenance: new Date('2026-08-05'), fincaIdx: 0 },
    { name: 'Cosechadora Massey Ferguson 7274', tipo: 'COSECHADORA', marca: 'Massey Ferguson', modelo: '7274 Advanced', placa: 'AGR-002', status: 'OPERATIVE', horasUso: 876, valor: 420000000, lastMaintenance: new Date('2026-01-15'), nextMaintenance: new Date('2026-07-15'), fincaIdx: 0 },
    { name: 'Bomba de Riego Grundfos 7.5HP', tipo: 'BOMBA', marca: 'Grundfos', modelo: 'CM10-A', placa: 'AGR-003', status: 'OPERATIVE', horasUso: 3400, valor: 18000000, lastMaintenance: new Date('2026-03-01'), nextMaintenance: new Date('2026-09-01'), fincaIdx: 0 },
    { name: 'Tractor Case IH Farmall 90', tipo: 'TRACTOR', marca: 'Case IH', modelo: 'Farmall 90', placa: 'AGR-004', status: 'MAINTENANCE', horasUso: 2100, valor: 142000000, lastMaintenance: new Date('2026-04-10'), nextMaintenance: new Date('2026-10-10'), fincaIdx: 1 },
    { name: 'Fumigadora de arrastre Jacto AM-18', tipo: 'FUMIGADORA', marca: 'Jacto', modelo: 'AM-18', placa: 'AGR-005', status: 'OPERATIVE', horasUso: 540, valor: 32000000, lastMaintenance: new Date('2026-02-20'), nextMaintenance: new Date('2026-08-20'), fincaIdx: 1 },
  ];

  for (const maq of maquinariaItems) {
    const finca = fincas[maq.fincaIdx];
    const { fincaIdx, ...maqFields } = maq;
    const existing = await prisma.maquinaria.findFirst({ where: { placa: maqFields.placa, organizationId: orgId } });
    if (!existing) {
      await prisma.maquinaria.create({ data: { ...maqFields, fincaId: finca?.id || null, organizationId: orgId, fechaAdquisicion: new Date('2022-06-01') } });
      console.log('Maquinaria:', maqFields.name);
    }
  }

  console.log('\n✓ Seed completado exitosamente.');
  console.log(`  Org: ${org.name} (${orgId})`);
  console.log(`  Fincas: ${fincas.length} | Lotes: ${lotes.length} | Producciones: ${producciones.length}`);
}

main()
  .catch((e) => { console.error('Error en seed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
