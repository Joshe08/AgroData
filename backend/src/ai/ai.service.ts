import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClimaService } from '../clima/clima.service';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private prisma: PrismaService,
    private climaService: ClimaService,
  ) {}

  // ─── HERRAMIENTAS DE DATOS CONTROLADAS (DATA TOOLS) ──────────────────────────

  async getFincas(orgId: string) {
    return this.prisma.finca.findMany({
      where: { organizationId: orgId },
      include: {
        lotes: { select: { id: true, name: true, area: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getProducciones(orgId: string) {
    return this.prisma.produccion.findMany({
      where: { lote: { finca: { organizationId: orgId } } },
      include: {
        lote: {
          include: {
            finca: { select: { id: true, name: true, location: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getInventario(orgId: string) {
    return this.prisma.inventario.findMany({
      where: { organizationId: orgId },
      include: {
        finca: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getFinanzas(orgId: string) {
    return this.prisma.finanza.findMany({
      where: { organizationId: orgId },
      orderBy: { date: 'desc' },
      take: 20,
    });
  }

  async getWeatherForFinca(finca: any) {
    const lat = finca?.latitude ?? 10.4631;
    const lon = finca?.longitude ?? -73.2532;
    return this.climaService.getCurrentWeather(finca?.location || 'Valledupar', lat, lon);
  }

  // ─── GENERACIÓN DE ASESORÍAS GENERALES PARA EL DASHBOARD ───────────────────

  async getAdvisories(orgId: string) {
    const [inventory, finances, productions, fincas] = await Promise.all([
      this.getInventario(orgId),
      this.getFinanzas(orgId),
      this.getProducciones(orgId),
      this.getFincas(orgId),
    ]);

    const activeProds = productions.filter((p) => p.status === 'ACTIVE');
    const weather = await this.climaService.getWeather(
      fincas[0]?.latitude ?? 10.4631,
      fincas[0]?.longitude ?? -73.2532,
    );

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return this.generateSmartMockAdvisories(inventory, finances, activeProds, weather, fincas);
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `
        Eres un asesor agrícola experto de AgroData para el departamento del Cesar, Colombia.
        Analiza los datos reales de la organización y genera exactamente 3 recomendaciones concretas y personalizadas en formato JSON:

        DATOS REALES:
        - Fincas registradas (${fincas.length}): ${JSON.stringify(fincas.map((f) => ({ name: f.name, area: f.area, loc: f.location })))}
        - Producciones activas (${activeProds.length}): ${JSON.stringify(activeProds.map((p) => ({ name: p.name, type: p.type, yield: p.expectedYield, unit: p.unit, finca: p.lote?.finca?.name })))}
        - Inventario (${inventory.length} items): ${JSON.stringify(inventory.map((i) => ({ name: i.name, qty: i.quantity, unit: i.unit, minAlert: i.minAlertQuantity })))}
        - Finanzas recientes: ${JSON.stringify(finances.slice(0, 8).map((f) => ({ type: f.type, cat: f.category, amount: f.amount })))}
        - Clima actual: ${weather.temperature}°C, ${weather.humidity}% humedad, ${weather.conditions}.

        Devuelve ÚNICAMENTE un arreglo JSON con 3 elementos:
        [
          {
            "id": "adv-1",
            "type": "WARNING" | "INFO" | "CRITICAL",
            "title": "Título descriptivo",
            "message": "Mensaje fundamentado en los datos reales del usuario.",
            "category": "INVENTARIO" | "CLIMA" | "FINANZAS" | "CULTIVO"
          }
        ]
      `;

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini timeout')), 12000),
      );
      const geminiPromise = model.generateContent(prompt);
      const result = (await Promise.race([geminiPromise, timeoutPromise])) as any;
      const cleanText = result.response.text().trim().replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanText);
    } catch (error) {
      this.logger.warn(`Gemini API unavailable, using internal smart advisory engine: ${(error as any)?.message}`);
      return this.generateSmartMockAdvisories(inventory, finances, activeProds, weather, fincas);
    }
  }

  // ─── CONSULTAS PERSONALIZADAS Y PREGUNTAS EN VIVO ───────────────────────────

  async getCustomRecomendaciones(orgId: string, consulta: string, contexto: any) {
    const [inventory, finances, productions, fincas] = await Promise.all([
      this.getInventario(orgId),
      this.getFinanzas(orgId),
      this.getProducciones(orgId),
      this.getFincas(orgId),
    ]);

    const activeProds = productions.filter((p) => p.status === 'ACTIVE');
    const targetFinca = contexto?.finca || fincas[0];
    const weather = await this.climaService.getWeather(
      targetFinca?.latitude ?? 10.4631,
      targetFinca?.longitude ?? -73.2532,
    );

    // Intent recognition on user's query against real database values
    const queryResult = this.evaluateDirectQuery(consulta, fincas, activeProds, inventory, finances, weather);
    if (queryResult) {
      return queryResult;
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return this.generateSmartFallback(consulta, inventory, finances, activeProds, weather, contexto, fincas);
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `
        Eres AgroIA, el asistente experto y analista agrícola de AgroData para el departamento del Cesar, Colombia.
        El usuario ha preguntado: "${consulta}"

        DATOS REALES DE LA ORGANIZACIÓN DEL USUARIO:
        - Fincas (${fincas.length}): ${JSON.stringify(fincas.map((f) => ({ nombre: f.name, hectareas: f.area, ubicacion: f.location, lotes: f.lotes.length })))}
        - Producciones activas (${activeProds.length}): ${JSON.stringify(activeProds.map((p) => ({ nombre: p.name, tipo: p.type, finca: p.lote?.finca?.name })))}
        - Inventario con alertas de bajo stock: ${JSON.stringify(inventory.filter((i) => i.quantity <= i.minAlertQuantity).map((i) => ({ nombre: i.name, cantidad: i.quantity, minimo: i.minAlertQuantity, unidad: i.unit })))}
        - Total de insumos registrados: ${inventory.length}
        - Finanzas (últimos registros): Ingresos totales acumulados: ${finances.filter((f) => f.type === 'INGRESO').reduce((s, f) => s + f.amount, 0)}, Gastos totales acumulados: ${finances.filter((f) => f.type === 'GASTO').reduce((s, f) => s + f.amount, 0)}
        - Clima actual: ${weather.temperature}°C, humedad ${weather.humidity}%, ${weather.conditions}.

        Responde a la pregunta del usuario utilizando sus datos REALES. No inventes cifras ni nombres.
        Devuelve estrictamente un objeto JSON con el siguiente formato:
        {
          "resumen": "Respuesta clara, ejecutiva y con datos exactos.",
          "recomendaciones": [
            {
              "titulo": "Título de la recomendación",
              "descripcion": "Descripción del paso a seguir.",
              "prioridad": "alta" | "media" | "baja",
              "categoria": "CLIMA" | "RIEGO" | "PLAGAS" | "FERTILIZACION" | "COSECHA" | "ECONOMICO" | "SUELO" | "GENERAL"
            }
          ]
        }
      `;

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini timeout')), 15000),
      );
      const geminiPromise = model.generateContent(prompt);
      const result = (await Promise.race([geminiPromise, timeoutPromise])) as any;
      const cleanText = result.response.text().trim().replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanText);
    } catch (error) {
      this.logger.warn(`Gemini unavailable, processing with local analytical engine: ${(error as any)?.message}`);
      return this.generateSmartFallback(consulta, inventory, finances, activeProds, weather, contexto, fincas);
    }
  }

  // ─── EVALUADOR DE CONSULTAS DIRECTAS BASADO EN DATOS REALES ─────────────────

  private evaluateDirectQuery(
    consulta: string,
    fincas: any[],
    productions: any[],
    inventory: any[],
    finances: any[],
    weather: any
  ) {
    const q = consulta.toLowerCase().trim();

    // 1. Preguntas sobre Fincas
    if (q.includes('cuantas fincas') || q.includes('cuántas fincas') || q.includes('mis fincas') || (q.includes('fincas') && q.includes('tengo'))) {
      const nombres = fincas.map((f) => `${f.name} (${f.area} ha en ${f.location || 'Cesar'})`).join(', ');
      const totalHa = fincas.reduce((acc, f) => acc + (f.area || 0), 0);
      return {
        resumen: fincas.length === 0
          ? 'Actualmente no tienes fincas registradas en tu organización. Puedes agregar tu primer predio desde el módulo "Mis Fincas".'
          : `Actualmente tienes ${fincas.length} finca(s) registrada(s) con un total de ${totalHa.toFixed(1)} hectáreas: ${nombres}.`,
        recomendaciones: [
          {
            titulo: 'Verificación de Coordenadas GPS',
            descripcion: 'Asegúrate de que cada predio cuente con coordenadas GPS guardadas para monitorear el pronóstico meteorológico satelital en tiempo real.',
            prioridad: 'media',
            categoria: 'GENERAL',
          },
        ],
      };
    }

    // 2. Preguntas sobre Producción
    if (q.includes('produccion') || q.includes('producción') || q.includes('cultivo') || q.includes('cosecha')) {
      const totalProds = productions.length;
      const listaProds = productions.map((p) => `${p.name} (${p.type}) en ${p.lote?.finca?.name || 'predio'}`).join(', ');
      return {
        resumen: totalProds === 0
          ? 'No registras producciones activas en este momento. Puedes crear un nuevo ciclo productivo desde el módulo "Producción".'
          : `Tienes ${totalProds} producción(es) activa(s) registrada(s): ${listaProds}.`,
        recomendaciones: [
          {
            titulo: 'Control de Diario de Campo',
            descripcion: 'Registra oportunamente las labores fitosanitarias, riegos y fertilizaciones en el diario de producción de cada lote.',
            prioridad: 'alta',
            categoria: 'COSECHA',
          },
        ],
      };
    }

    // 3. Preguntas sobre Inventario Bajo
    if (q.includes('poco inventario') || q.includes('stock bajo') || q.includes('por agotar') || q.includes('insumos')) {
      const bajoStock = inventory.filter((i) => i.quantity <= i.minAlertQuantity);
      if (bajoStock.length === 0) {
        return {
          resumen: `Todos los insumos (${inventory.length} items registrados) se encuentran con niveles por encima del stock mínimo. No hay alertas críticas de abastecimiento.`,
          recomendaciones: [
            {
              titulo: 'Inventario en Óptimas Condiciones',
              descripcion: 'Continúa realizando inventarios periódicos antes de iniciar aplicaciones masivas en campo.',
              prioridad: 'baja',
              categoria: 'GENERAL',
            },
          ],
        };
      }
      const detalle = bajoStock.map((i) => `${i.name}: ${i.quantity} ${i.unit} (mínimo: ${i.minAlertQuantity})`).join('; ');
      return {
        resumen: `Se detectaron ${bajoStock.length} producto(s) en nivel crítico o por agotarse en bodega: ${detalle}.`,
        recomendaciones: [
          {
            titulo: 'Reponer Insumos Críticos',
            descripcion: 'Gestiona la compra con tus proveedores antes de la próxima fertilización o jornada de aspersión programada.',
            prioridad: 'alta',
            categoria: 'FERTILIZACION',
          },
        ],
      };
    }

    // 4. Preguntas sobre Gastos y Finanzas
    if (q.includes('cuanto gaste') || q.includes('cuánto gasté') || q.includes('gastos') || q.includes('costos') || q.includes('balance') || q.includes('ingresos')) {
      const gastos = finances.filter((f) => f.type === 'GASTO').reduce((acc, f) => acc + f.amount, 0);
      const ingresos = finances.filter((f) => f.type === 'INGRESO').reduce((acc, f) => acc + f.amount, 0);
      const balance = ingresos - gastos;
      const formatCOP = (v: number) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

      return {
        resumen: `En tus registros contables recientes acumulas ${formatCOP(ingresos)} en ingresos y ${formatCOP(gastos)} en gastos, generando un balance neto de ${formatCOP(balance)}.`,
        recomendaciones: [
          {
            titulo: 'Control de Costos Operativos',
            descripcion: 'Asocia cada gasto a su lote o predio correspondiente para calcular con precisión la rentabilidad por hectárea.',
            prioridad: 'media',
            categoria: 'ECONOMICO',
          },
        ],
      };
    }

    // 5. Preguntas sobre Clima
    if (q.includes('clima') || q.includes('tiempo') || q.includes('llueve') || q.includes('llover') || q.includes('temperatura')) {
      return {
        resumen: `En tus predios del departamento del Cesar se registran actualmente ${weather.temperature}°C, ${weather.humidity}% de humedad relativa y condiciones de ${weather.conditions.toLowerCase()}. La velocidad del viento es de ${weather.windSpeed} km/h con probabilidad de lluvia del ${weather.rainProbability}%.`,
        recomendaciones: [
          {
            titulo: weather.rainProbability >= 60 ? 'Alerta de Lluvia' : 'Condiciones Faborables',
            descripcion: weather.rainProbability >= 60
              ? 'Se prevén precipitaciones en las próximas horas. Suspenda aplicaciones químicas foliares para evitar lavado del producto.'
              : 'Tiempo propicio para actividades de campo y riego controlado en las primeras horas del día.',
            prioridad: weather.rainProbability >= 60 ? 'alta' : 'baja',
            categoria: 'CLIMA',
          },
        ],
      };
    }

    return null;
  }

  // ─── ADVISORIES LOCALES INTELIGENTES BASADOS EN DATOS ────────────────────────

  private generateSmartMockAdvisories(
    inventory: any[],
    finances: any[],
    productions: any[],
    weather: any,
    fincas: any[]
  ) {
    const advisories = [];
    const bajoStock = inventory.filter((i) => i.quantity <= i.minAlertQuantity);

    // 1. Alerta de Inventario
    if (bajoStock.length > 0) {
      advisories.push({
        id: 'adv-inv-1',
        type: 'WARNING',
        category: 'INVENTARIO',
        title: `${bajoStock.length} Insumo(s) con Stock Bajo`,
        message: `El producto "${bajoStock[0].name}" tiene solo ${bajoStock[0].quantity} ${bajoStock[0].unit} disponibles (mínimo recomendado: ${bajoStock[0].minAlertQuantity}). Reponga existencias para evitar interrupciones de campo.`,
      });
    } else {
      advisories.push({
        id: 'adv-inv-ok',
        type: 'INFO',
        category: 'INVENTARIO',
        title: 'Inventario Abastecido',
        message: `Los ${inventory.length} insumos registrados en bodega cuentan con niveles superiores a su umbral de seguridad.`,
      });
    }

    // 2. Alerta de Clima Agrícola
    if (weather.temperature >= 35) {
      advisories.push({
        id: 'adv-clima-calor',
        type: 'CRITICAL',
        category: 'CLIMA',
        title: `Calor Extremo (${weather.temperature}°C) en la Zona`,
        message: 'Elevada evapotranspiración. Programe el riego por goteo exclusivamente antes de las 7:00 AM o después de las 6:30 PM para maximizar la absorción radicular.',
      });
    } else if (weather.rainProbability >= 65) {
      advisories.push({
        id: 'adv-clima-lluvia',
        type: 'WARNING',
        category: 'CLIMA',
        title: `Precipitaciones Previstas (${weather.rainProbability}%)`,
        message: 'Probabilidad alta de lluvias. Suspenda labores de fumigación foliar y asegure canales de evacuación en lotes bajos.',
      });
    } else {
      advisories.push({
        id: 'adv-clima-optimo',
        type: 'INFO',
        category: 'CLIMA',
        title: 'Condiciones Climáticas Estables',
        message: `Temperatura de ${weather.temperature}°C y viento a ${weather.windSpeed} km/h. Condiciones favorables para labores de campo y monitoreo fitosanitario.`,
      });
    }

    // 3. Alerta de Producción o Finanzas
    if (productions.length > 0) {
      advisories.push({
        id: 'adv-prod-1',
        type: 'INFO',
        category: 'CULTIVO',
        title: `Seguimiento a ${productions[0].name}`,
        message: `La producción en el lote "${productions[0].lote?.name || 'principal'}" de ${productions[0].lote?.finca?.name || 'su predio'} se encuentra activa. Mantenga actualizado el diario de campo.`,
      });
    } else {
      advisories.push({
        id: 'adv-prod-vacia',
        type: 'INFO',
        category: 'CULTIVO',
        title: 'Planificación de Nuevos Lotes',
        message: `Cuenta con ${fincas.length} finca(s) registradas. Inicie un nuevo ciclo agrícola o ganadero desde el módulo de Producciones.`,
      });
    }

    return advisories;
  }

  private generateSmartFallback(
    consulta: string,
    inventory: any[],
    finances: any[],
    productions: any[],
    weather: any,
    contexto: any,
    fincas: any[]
  ) {
    const q = (consulta || '').toLowerCase();
    const fincaNombre = contexto?.finca?.nombre || fincas[0]?.name || 'su predio';

    if (q.includes('riego') || q.includes('agua') || q.includes('hídrico')) {
      return {
        resumen: `Bajo una temperatura de ${weather.temperature}°C y humedad del ${weather.humidity}% en ${fincaNombre}, el riego por goteo temprano es fundamental para reducir pérdidas por evaporación en el Cesar.`,
        recomendaciones: [
          {
            titulo: 'Riego Temprano Programado',
            descripcion: 'Inicie el suministro hídrico entre las 5:00 AM y 7:00 AM para asegurar una penetración radicular óptima.',
            prioridad: 'alta',
            categoria: 'RIEGO',
          },
          {
            titulo: 'Conservación de Humedad con Cobertura',
            descripcion: 'Aplique cobertura vegetal o rastrojo sobre la cama de siembra para disminuir la temperatura edáfica.',
            prioridad: 'media',
            categoria: 'SUELO',
          },
        ],
      };
    }

    if (q.includes('plaga') || q.includes('enfermedad') || q.includes('hongo')) {
      return {
        resumen: `En la región del Cesar, las temperaturas de ${weather.temperature}°C con vientos de ${weather.windSpeed} km/h predisponen a ataques de insectos chupadores (trips, ácaros). Se aconseja inspección fitosanitaria semanal.`,
        recomendaciones: [
          {
            titulo: 'Monitoreo Sistemático de Campo',
            descripcion: 'Revise 25 plantas por lote en cuadrícula o patrón en W, examinando el envés de hojas tiernas.',
            prioridad: 'alta',
            categoria: 'PLAGAS',
          },
          {
            titulo: 'Manejo Preventivo y Selectivo',
            descripcion: 'Emplee primero productos biológicos o sales potásicas antes de recurrir a moléculas de amplio espectro.',
            prioridad: 'media',
            categoria: 'PLAGAS',
          },
        ],
      };
    }

    return {
      resumen: `Análisis para ${fincaNombre}: Cuenta con ${fincas.length} predio(s) y ${productions.length} producción(es) activa(s). Con clima actual de ${weather.temperature}°C y humedad al ${weather.humidity}%, el sistema recomienda mantener al día el inventario y el diario de labores.`,
      recomendaciones: [
        {
          titulo: 'Planificación Agronómica Integral',
          descripcion: 'Revise los lotes asignados y confirme la disponibilidad de insumos en bodega antes de programar jornales.',
          prioridad: 'media',
          categoria: 'GENERAL',
        },
      ],
    };
  }
}
