const { PrismaClient } = require('./dist/src/generated/client/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');

const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

async function seedAllOrgs() {
  const orgs = await prisma.organization.findMany();
  console.log(`Encontradas ${orgs.length} organizaciones.`);

  for (const org of orgs) {
    console.log(`\n========================================`);
    console.log(`Poblando datos para: ${org.name} (${org.id})`);

    // Actualizar suscripción a PREMIUM
    await prisma.organization.update({
      where: { id: org.id },
      data: { subscription: 'PREMIUM', status: 'ACTIVE' },
    });

    // 1. Fincas
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
        coordenadas: JSON.stringify([
          { lat: 10.0210, lng: -73.2410 },
          { lat: 10.0215, lng: -73.2310 },
          { lat: 10.0140, lng: -73.2305 },
          { lat: 10.0135, lng: -73.2405 },
        ]),
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
        coordenadas: JSON.stringify([
          { lat: 8.3180, lng: -73.6220 },
          { lat: 8.3190, lng: -73.6110 },
          { lat: 8.3070, lng: -73.6100 },
          { lat: 8.3060, lng: -73.6210 },
        ]),
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
        coordenadas: JSON.stringify([
          { lat: 10.2700, lng: -73.3600 },
          { lat: 10.2710, lng: -73.3460 },
          { lat: 10.2560, lng: -73.3450 },
          { lat: 10.2550, lng: -73.3590 },
        ]),
      },
    ];

    const fincas = [];
    for (const f of fincasData) {
      let existing = await prisma.finca.findFirst({
        where: { name: f.name, organizationId: org.id },
      });
      if (!existing) {
        existing = await prisma.finca.create({
          data: { ...f, organizationId: org.id },
        });
        console.log(`  + Finca creada: ${existing.name}`);
      } else {
        // Asegurar que tenga coordenadas si no las tenía
        if (!existing.coordenadas) {
          existing = await prisma.finca.update({
            where: { id: existing.id },
            data: { coordenadas: f.coordenadas },
          });
        }
        console.log(`  = Finca existente: ${existing.name}`);
      }
      fincas.push(existing);
    }

    // 2. Lotes con coordenadas delimitadas precisas
    const lotesData = [
      {
        name: 'Lote 1 - Arroz Norte',
        area: 18.0,
        soilType: 'Franco Limoso',
        cultivoActual: 'Arroz IR-42',
        sistemaRiego: 'Aspersión',
        status: 'ACTIVO',
        ph: 6.2,
        fincaIdx: 0,
        coordenadas: JSON.stringify([
          { lat: 10.0210, lng: -73.2410 },
          { lat: 10.0215, lng: -73.2355 },
          { lat: 10.0175, lng: -73.2355 },
          { lat: 10.0170, lng: -73.2410 },
        ]),
      },
      {
        name: 'Lote 2 - Maíz Centro',
        area: 14.5,
        soilType: 'Franco',
        cultivoActual: 'Maíz ICA-V-109',
        sistemaRiego: 'Aspersión',
        status: 'ACTIVO',
        ph: 6.5,
        fincaIdx: 0,
        coordenadas: JSON.stringify([
          { lat: 10.0215, lng: -73.2355 },
          { lat: 10.0215, lng: -73.2310 },
          { lat: 10.0175, lng: -73.2310 },
          { lat: 10.0175, lng: -73.2355 },
        ]),
      },
      {
        name: 'Lote 3 - Sorgo Sur',
        area: 12.0,
        soilType: 'Franco Limoso',
        cultivoActual: 'Sorgo híbrido',
        sistemaRiego: 'Secano',
        status: 'ACTIVO',
        ph: 6.8,
        fincaIdx: 0,
        coordenadas: JSON.stringify([
          { lat: 10.0170, lng: -73.2410 },
          { lat: 10.0175, lng: -73.2355 },
          { lat: 10.0135, lng: -73.2355 },
          { lat: 10.0135, lng: -73.2405 },
        ]),
      },
      {
        name: 'Lote A - Palma de Aceite',
        area: 45.0,
        soilType: 'Arcillo Franco',
        cultivoActual: 'Palma de aceite Elaeis',
        sistemaRiego: 'Gravedad',
        status: 'ACTIVO',
        ph: 5.8,
        fincaIdx: 1,
        coordenadas: JSON.stringify([
          { lat: 8.3180, lng: -73.6220 },
          { lat: 8.3190, lng: -73.6160 },
          { lat: 8.3120, lng: -73.6155 },
          { lat: 8.3115, lng: -73.6215 },
        ]),
      },
      {
        name: 'Lote B - Yuca',
        area: 20.0,
        soilType: 'Franco Arenoso',
        cultivoActual: 'Yuca ICA-Catumare',
        sistemaRiego: 'Secano',
        status: 'ACTIVO',
        ph: 6.0,
        fincaIdx: 1,
        coordenadas: JSON.stringify([
          { lat: 8.3190, lng: -73.6160 },
          { lat: 8.3190, lng: -73.6110 },
          { lat: 8.3120, lng: -73.6110 },
          { lat: 8.3120, lng: -73.6155 },
        ]),
      },
      {
        name: 'Potreros Norte',
        area: 60.0,
        soilType: 'Franco Arcilloso',
        cultivoActual: 'Pastura Brachiaria',
        sistemaRiego: 'Secano',
        status: 'ACTIVO',
        ph: 6.4,
        fincaIdx: 2,
        coordenadas: JSON.stringify([
          { lat: 10.2700, lng: -73.3600 },
          { lat: 10.2710, lng: -73.3460 },
          { lat: 10.2630, lng: -73.3455 },
          { lat: 10.2625, lng: -73.3595 },
        ]),
      },
      {
        name: 'Potreros Sur',
        area: 55.0,
        soilType: 'Arcilloso',
        cultivoActual: 'Pastura Angleton',
        sistemaRiego: 'Secano',
        status: 'PASTOREO',
        ph: 6.1,
        fincaIdx: 2,
        coordenadas: JSON.stringify([
          { lat: 10.2625, lng: -73.3595 },
          { lat: 10.2630, lng: -73.3455 },
          { lat: 10.2560, lng: -73.3450 },
          { lat: 10.2550, lng: -73.3590 },
        ]),
      },
    ];

    const lotes = [];
    for (const l of lotesData) {
      const finca = fincas[l.fincaIdx];
      if (!finca) continue;
      const { fincaIdx, ...loteFields } = l;
      let existing = await prisma.lote.findFirst({
        where: { name: loteFields.name, fincaId: finca.id },
      });
      if (!existing) {
        existing = await prisma.lote.create({
          data: { ...loteFields, fincaId: finca.id },
        });
        console.log(`    + Lote creado: ${existing.name}`);
      } else {
        // Actualizar coordenadas si no las tiene
        if (!existing.coordenadas) {
          existing = await prisma.lote.update({
            where: { id: existing.id },
            data: { coordenadas: loteFields.coordenadas },
          });
        }
      }
      lotes.push(existing);
    }

    // 3. Producciones
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
      let existing = await prisma.produccion.findFirst({
        where: { name: prodFields.name, loteId: lote.id },
      });
      if (!existing) {
        existing = await prisma.produccion.create({
          data: { ...prodFields, loteId: lote.id },
        });
        console.log(`    + Producción: ${existing.name}`);
      }
      producciones.push(existing);
    }

    // 4. Diarios de producción
    if (producciones[0]) {
      const diarioExist = await prisma.diarioProduccion.findFirst({
        where: { produccionId: producciones[0].id },
      });
      if (!diarioExist) {
        await prisma.diarioProduccion.createMany({
          data: [
            { produccionId: producciones[0].id, activity: 'Preparación de suelo y nivelación con Grader', observations: 'Suelo en óptimas condiciones de humedad.', fertilizerUsed: 'Urea 46% - 150 kg/ha', waterIrrigation: 85000, date: new Date('2026-03-02') },
            { produccionId: producciones[0].id, activity: 'Siembra directa por voleo', observations: 'Densidad: 180 kg/ha semilla certificada IR-42', fertilizerUsed: 'DAP 18-46-0 - 80 kg/ha', waterIrrigation: 92000, date: new Date('2026-03-10') },
            { produccionId: producciones[0].id, activity: 'Aplicación herbicida pre-emergente', observations: 'Control de malezas en bordes de caballón.', fertilizerUsed: null, waterIrrigation: 0, date: new Date('2026-03-18') },
            { produccionId: producciones[0].id, activity: 'Primer riego de macollamiento', observations: 'Lámina de agua uniforme de 5 cm. Germinación del 85%.', waterIrrigation: 110000, date: new Date('2026-04-01') },
          ],
        });
        console.log(`    + Diarios de campo registrados`);
      }
    }

    // 5. Inventario
    const inventarioItems = [
      { name: 'Urea 46% Nitrógeno', category: 'FERTILIZANTE', quantity: 850, unit: 'kg', minAlertQuantity: 200, costo: 1850, proveedor: 'Fertiagro del Cesar', fincaIdx: 0 },
      { name: 'DAP 18-46-0', category: 'FERTILIZANTE', quantity: 420, unit: 'kg', minAlertQuantity: 150, costo: 2200, proveedor: 'Agrosemillas Valledupar', fincaIdx: 0 },
      { name: 'Semilla Arroz IR-42 Certificada', category: 'SEMILLA', quantity: 380, unit: 'kg', minAlertQuantity: 180, costo: 3400, proveedor: 'Fedearroz Cesar', fincaIdx: 0 },
      { name: 'Herbicida Propanil 36% SC', category: 'INSUMO', quantity: 85, unit: 'litros', minAlertQuantity: 30, costo: 28000, proveedor: 'Agroinsumos del Norte', fincaIdx: 0 },
      { name: 'Fungicida Trifloxistrobina', category: 'INSUMO', quantity: 12, unit: 'litros', minAlertQuantity: 20, costo: 95000, proveedor: 'Bayer CropScience', fincaIdx: 0 },
      { name: 'Aceite de Palma RFF', category: 'PRODUCTO', quantity: 1200, unit: 'kg', minAlertQuantity: 500, costo: 1650, proveedor: 'Palmeras del Magdalena', fincaIdx: 1 },
      { name: 'Semilla Maíz ICA-V109 Cert.', category: 'SEMILLA', quantity: 95, unit: 'kg', minAlertQuantity: 60, costo: 8500, proveedor: 'ICA Regional Cesar', fincaIdx: 0 },
      { name: 'Combustible ACPM', category: 'INSUMO', quantity: 320, unit: 'litros', minAlertQuantity: 100, costo: 5200, proveedor: 'Terpel', fincaIdx: 2 },
    ];

    for (const item of inventarioItems) {
      const finca = fincas[item.fincaIdx];
      const { fincaIdx, ...itemFields } = item;
      const existing = await prisma.inventario.findFirst({
        where: { name: itemFields.name, organizationId: org.id },
      });
      if (!existing) {
        await prisma.inventario.create({
          data: { ...itemFields, fincaId: finca?.id || null, organizationId: org.id },
        });
      }
    }
    console.log(`    + Inventario poblado`);

    // 6. Finanzas (distribuidas en los últimos 6 meses para visualización en dashboard)
    const nowRef = new Date();
    const getMonthDate = (monthsAgo, day) => new Date(nowRef.getFullYear(), nowRef.getMonth() - monthsAgo, day, 10, 0, 0);

    const finanzasItems = [
      { type: 'INGRESO', category: 'VENTA_COSECHA', amount: 28500000, description: 'Venta lote arroz ciclo temprano al molino del Cesar', date: getMonthDate(5, 14), fincaIdx: 0 },
      { type: 'GASTO', category: 'INSUMOS', amount: 8200000, description: 'Compra de fertilizantes y semillas certificadas', date: getMonthDate(5, 20), fincaIdx: 0 },
      { type: 'INGRESO', category: 'VENTA_GANADO', amount: 21000000, description: 'Comercialización novillos ceba - Feria ganadera Valledupar', date: getMonthDate(4, 18), fincaIdx: 1 },
      { type: 'GASTO', category: 'MANO_DE_OBRA', amount: 6900000, description: 'Pago labores preparación y siembra', date: getMonthDate(4, 25), fincaIdx: 0 },
      { type: 'INGRESO', category: 'VENTA_COSECHA', amount: 24800000, description: 'Venta fruto palma RFF - Palmeras Magdalena', date: getMonthDate(3, 10), fincaIdx: 1 },
      { type: 'GASTO', category: 'COMBUSTIBLE', amount: 4800000, description: 'Suministro ACPM bombas de riego y maquinaria', date: getMonthDate(3, 18), fincaIdx: 0 },
      { type: 'INGRESO', category: 'VENTA_COSECHA', amount: 31200000, description: 'Venta maíz tecnificado granel - Coagro Cesar', date: getMonthDate(2, 22), fincaIdx: 0 },
      { type: 'GASTO', category: 'MANTENIMIENTO', amount: 7600000, description: 'Overhaul y mantenimiento preventivo maquinaria', date: getMonthDate(2, 28), fincaIdx: 0 },
      { type: 'INGRESO', category: 'VENTA_GANADO', amount: 27400000, description: 'Subasta terneros destete alta genética', date: getMonthDate(1, 16), fincaIdx: 1 },
      { type: 'GASTO', category: 'INSUMOS', amount: 9300000, description: 'Control fitosanitario foliares y bioestimulantes', date: getMonthDate(1, 24), fincaIdx: 0 },
      { type: 'INGRESO', category: 'VENTA_COSECHA', amount: 34500000, description: 'Liquidación comercialización cosecha actual', date: getMonthDate(0, 12), fincaIdx: 0 },
      { type: 'GASTO', category: 'MANO_DE_OBRA', amount: 11200000, description: 'Nómina quincenal operarios y jornaleros', date: getMonthDate(0, 19), fincaIdx: 0 },
    ];

    const finCount = await prisma.finanza.count({ where: { organizationId: org.id } });
    if (finCount === 0) {
      for (const fin of finanzasItems) {
        const finca = fincas[fin.fincaIdx];
        const { fincaIdx, ...finFields } = fin;
        await prisma.finanza.create({
          data: { ...finFields, fincaId: finca?.id || null, organizationId: org.id },
        });
      }
      console.log(`    + 9 transacciones financieras creadas`);
    }

    // 7. Personal
    const personalItems = [
      { name: 'José', lastName: 'Díaz Mendoza', documento: `77892341-${org.id.slice(0, 3)}`, role: 'Operario agrícola', dailyRate: 85000, status: 'ACTIVE', fincaIdx: 0 },
      { name: 'Pedro', lastName: 'González Ariza', documento: `84571293-${org.id.slice(0, 3)}`, role: 'Tractorista', dailyRate: 110000, status: 'ACTIVE', fincaIdx: 0 },
      { name: 'María', lastName: 'Torres Suárez', documento: `50431876-${org.id.slice(0, 3)}`, role: 'Auxiliar de campo', dailyRate: 80000, status: 'ACTIVE', fincaIdx: 0 },
      { name: 'Andrés', lastName: 'Romero Paz', documento: `91234567-${org.id.slice(0, 3)}`, role: 'Supervisor de lotes', dailyRate: 130000, status: 'ACTIVE', fincaIdx: 1 },
      { name: 'Luz', lastName: 'Martínez Ríos', documento: `46782034-${org.id.slice(0, 3)}`, role: 'Encargada bodega', dailyRate: 90000, status: 'ACTIVE', fincaIdx: 0 },
    ];

    for (const emp of personalItems) {
      const finca = fincas[emp.fincaIdx];
      const { fincaIdx, ...empFields } = emp;
      const existing = await prisma.empleado.findFirst({
        where: { documento: empFields.documento, organizationId: org.id },
      });
      if (!existing) {
        await prisma.empleado.create({
          data: { ...empFields, fincaId: finca?.id || null, organizationId: org.id, fechaIngreso: new Date('2025-01-01') },
        });
      }
    }
    console.log(`    + Personal registrado`);

    // 8. Maquinaria
    const maquinariaItems = [
      { name: 'Tractor John Deere 5075E', tipo: 'TRACTOR', marca: 'John Deere', modelo: '5075E', placa: `AGR-01-${org.id.slice(0, 3)}`, status: 'OPERATIVE', horasUso: 1248, valor: 185000000, lastMaintenance: new Date('2026-02-05'), nextMaintenance: new Date('2026-08-05'), fincaIdx: 0 },
      { name: 'Cosechadora Massey Ferguson 7274', tipo: 'COSECHADORA', marca: 'Massey Ferguson', modelo: '7274', placa: `AGR-02-${org.id.slice(0, 3)}`, status: 'OPERATIVE', horasUso: 876, valor: 420000000, lastMaintenance: new Date('2026-01-15'), nextMaintenance: new Date('2026-07-15'), fincaIdx: 0 },
      { name: 'Bomba de Riego Grundfos 7.5HP', tipo: 'BOMBA', marca: 'Grundfos', modelo: 'CM10-A', placa: `AGR-03-${org.id.slice(0, 3)}`, status: 'OPERATIVE', horasUso: 3400, valor: 18000000, lastMaintenance: new Date('2026-03-01'), nextMaintenance: new Date('2026-09-01'), fincaIdx: 0 },
      { name: 'Tractor Case IH Farmall 90', tipo: 'TRACTOR', marca: 'Case IH', modelo: 'Farmall 90', placa: `AGR-04-${org.id.slice(0, 3)}`, status: 'MAINTENANCE', horasUso: 2100, valor: 142000000, lastMaintenance: new Date('2026-04-10'), nextMaintenance: new Date('2026-10-10'), fincaIdx: 1 },
    ];

    for (const maq of maquinariaItems) {
      const finca = fincas[maq.fincaIdx];
      const { fincaIdx, ...maqFields } = maq;
      const existing = await prisma.maquinaria.findFirst({
        where: { placa: maqFields.placa, organizationId: org.id },
      });
      if (!existing) {
        await prisma.maquinaria.create({
          data: { ...maqFields, fincaId: finca?.id || null, organizationId: org.id, fechaAdquisicion: new Date('2022-06-01') },
        });
      }
    }
    console.log(`    + Maquinaria registrada`);
  }

  console.log('\n>>> TODAS LAS ORGANIZACIONES TIENEN SUS DATOS COMPLETOS <<<');
}

seedAllOrgs()
  .catch(e => { console.error('Error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
