import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClimaService } from '../clima/clima.service';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class AiService {
  constructor(
    private prisma: PrismaService,
    private climaService: ClimaService,
  ) {}

  async getAdvisories(orgId: string) {
    const inventory = await this.prisma.inventario.findMany({
      where: { organizationId: orgId },
    });

    const finances = await this.prisma.finanza.findMany({
      where: { organizationId: orgId },
      orderBy: { date: 'desc' },
      take: 10,
    });

    const productions = await this.prisma.produccion.findMany({
      where: { lote: { finca: { organizationId: orgId } }, status: 'ACTIVE' },
      include: { lote: { include: { finca: true } } },
    });

    // Get weather context (defaulting to Valledupar coordinates)
    const weather = await this.climaService.getWeather(10.4631, -73.2532);

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return this.generateSmartMockAdvisories(inventory, finances, productions, weather);
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      // We will use gemini-1.5-flash which is widely compatible and fast
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `
        Eres un asesor agrícola experto e inteligente para la región del departamento del Cesar, Colombia (Plataforma AgroData Cesar).
        Tu tarea es analizar los datos actuales de la finca del usuario y generar exactamente 3 recomendaciones concretas, de alto valor, personalizadas y accionables.

        DATOS DE PRODUCCIONES ACTIVAS (CULTIVOS/ANIMALES):
        ${JSON.stringify(productions.map(p => ({ name: p.name, type: p.type, expectedYield: p.expectedYield, unit: p.unit, finca: p.lote.finca.name, lote: p.lote.name })))}

        DATOS DEL INVENTARIO DE INSUMOS Y HERRAMIENTAS:
        ${JSON.stringify(inventory.map(i => ({ name: i.name, category: i.category, quantity: i.quantity, unit: i.unit, minAlert: i.minAlertQuantity })))}

        HISTORIAL FINANCIERO RECIENTE (INGRESOS/GASTOS):
        ${JSON.stringify(finances.map(f => ({ type: f.type, category: f.category, amount: f.amount, description: f.description })))}

        PRONÓSTICO METEOROLÓGICO DE VALLEDUPAR:
        Temperatura actual: ${weather.temperature}°C, Humedad: ${weather.humidity}%, Condiciones: ${weather.conditions}.
        Pronóstico semanal: ${JSON.stringify(weather.forecast)}

        Genera exactamente 3 tarjetas de asesoramiento en formato JSON. Devuelve ÚNICAMENTE el arreglo JSON. No incluyas bloques de código markdown (\`\`\`json ... \`\`\`) ni texto adicional. El formato de salida debe ser exactamente:
        [
          {
            "id": "string-unico-1",
            "type": "WARNING" | "INFO" | "CRITICAL",
            "title": "Título corto y llamativo de la recomendación",
            "message": "Mensaje detallado y contextualizado explicando qué hacer y por qué, usando los nombres de los cultivos o insumos del agricultor.",
            "category": "INVENTARIO" | "CLIMA" | "FINANZAS" | "CULTIVO"
          }
        ]
      `;

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini timeout')), 15000),
      );

      const geminiPromise = model.generateContent(prompt);
      const result = await Promise.race([geminiPromise, timeoutPromise]) as any;
      const responseText = result.response.text().trim();
      const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanText);
    } catch (error) {
      console.log('Gemini unavailable, using smart local engine:', (error as any)?.message);
      return this.generateSmartMockAdvisories(inventory, finances, productions, weather);
    }
  }

  async getCustomRecomendaciones(orgId: string, consulta: string, contexto: any) {
    const inventory = await this.prisma.inventario.findMany({
      where: { organizationId: orgId },
    });

    const finances = await this.prisma.finanza.findMany({
      where: { organizationId: orgId },
      orderBy: { date: 'desc' },
      take: 10,
    });

    const productions = await this.prisma.produccion.findMany({
      where: { lote: { finca: { organizationId: orgId } }, status: 'ACTIVE' },
      include: { lote: { include: { finca: true } } },
    });

    const weather = await this.climaService.getWeather(10.4631, -73.2532);
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return this.generateSmartFallback(consulta, inventory, finances, productions, weather, contexto);
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `
        Eres un asesor agrícola experto de la región del Cesar, Colombia (AgroData Cesar).
        El usuario ha hecho la siguiente consulta: "${consulta}"

        Aquí están los datos de su organización actual:
        - Finca de contexto: ${JSON.stringify(contexto?.finca || 'Ninguna seleccionada')}
        - Producciones de contexto: ${JSON.stringify(contexto?.producciones || [])}
        - Cultivos activos en base de datos: ${JSON.stringify(productions.map(p => ({ name: p.name, type: p.type })))}
        - Inventario de insumos: ${JSON.stringify(inventory.map(i => ({ name: i.name, quantity: i.quantity, unit: i.unit })))}
        - Finanzas recientes: ${JSON.stringify(finances.map(f => ({ type: f.type, category: f.category, amount: f.amount })))}
        - Clima actual en Cesar: Temperatura: ${weather.temperature}°C, Humedad: ${weather.humidity}%, Condiciones: ${weather.conditions}.

        Responde a la consulta de forma profesional, clara y accionable adaptada al clima caluroso del Cesar y al tipo de cultivo que tiene.
        Entrega la respuesta estrictamente en formato JSON:
        {
          "resumen": "Tu respuesta detallada a la pregunta del usuario, incorporando datos de su clima, finanzas o inventario si es pertinente.",
          "recomendaciones": [
            {
              "titulo": "Título de la recomendación",
              "descripcion": "Descripción detallada del paso a seguir.",
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
      const result = await Promise.race([geminiPromise, timeoutPromise]) as any;
      const responseText = result.response.text().trim();
      const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanText);
    } catch (error) {
      console.log('Gemini unavailable for custom query, using local fallback:', (error as any)?.message);
      return this.generateSmartFallback(consulta, inventory, finances, productions, weather, contexto);
    }
  }

  private generateSmartFallback(consulta: string, inventory: any[], finances: any[], productions: any[], weather: any, contexto: any) {
    const q = (consulta || '').toLowerCase();
    const fincaNombre = contexto?.finca?.nombre || 'su finca';

    if (q.includes('riego') || q.includes('agua') || q.includes('hídrico') || q.includes('hídrica')) {
      return {
        resumen: `Analizando las necesidades de riego para ${fincaNombre} en el departamento del Cesar, bajo una temperatura ambiente de ${weather.temperature}°C y humedad de ${weather.humidity}%, es crítico planificar el riego de forma estratégica. La evaporación en la zona es alta, por lo que el riego tradicional por inundación resulta ineficiente.`,
        recomendaciones: [
          {
            titulo: 'Horario Óptimo de Riego',
            descripcion: 'Programe los ciclos de riego por goteo exclusivamente entre las 5:00 AM y 7:00 AM o después de las 6:30 PM para asegurar la máxima infiltración y absorción por parte de las raíces.',
            prioridad: 'alta',
            categoria: 'RIEGO',
          },
          {
            titulo: 'Uso de Mantillo o Mulch',
            descripcion: 'Coloque coberturas orgánicas en la base de los cultivos para conservar la humedad del suelo y reducir la temperatura de la zona radicular.',
            prioridad: 'media',
            categoria: 'SUELO',
          },
        ],
      };
    }

    if (q.includes('plaga') || q.includes('enfermedad') || q.includes('insecto') || q.includes('hongo') || q.includes('prev')) {
      return {
        resumen: `Las condiciones secas e insolación del Cesar favorecen ácaros, trips y mosca blanca. Por otro lado, en temporadas de lluvias dispersas, la alternancia de calor y humedad potencia la antracnosis y pudriciones. Se recomienda monitorear con trampas cromáticas amarillas.`,
        recomendaciones: [
          {
            titulo: 'Monitoreo Fitosanitario Semanal',
            descripcion: 'Haga recorridos en W por los lotes y revise al menos 20 plantas por hectárea, prestando especial atención al envés de las hojas y brotes nuevos.',
            prioridad: 'alta',
            categoria: 'PLAGAS',
          },
          {
            titulo: 'Manejo Integrado (MIP)',
            descripcion: 'Antes de aplicar agroquímicos de categoría roja, utilice extractos de neem, jabón potásico o insecticidas selectivos para preservar la fauna benéfica.',
            prioridad: 'media',
            categoria: 'PLAGAS',
          },
        ],
      };
    }

    if (q.includes('fertiliz') || q.includes('abono') || q.includes('urea') || q.includes('nutri')) {
      return {
        resumen: `Para optimizar la fertilización en los suelos de textura franco-arenosa o arcillosa del Cesar, el abono nitrogenado debe aplicarse sobre suelo húmedo. La aplicación de urea a pleno sol genera pérdidas de nitrógeno de hasta un 40% por volatilización.`,
        recomendaciones: [
          {
            titulo: 'Aplicación Fraccionada de Nutrientes',
            descripcion: 'Divida el requerimiento total de fertilizante en 3 o 4 dosis a lo largo del ciclo. Esto maximiza la eficiencia de asimilación del cultivo y disminuye costos.',
            prioridad: 'alta',
            categoria: 'FERTILIZACION',
          },
          {
            titulo: 'Incorporación Inmediata',
            descripcion: 'Incorpore el fertilizante granulado ligeramente en el suelo (a 5-10 cm de profundidad) o active el riego inmediatamente después de la aplicación.',
            prioridad: 'alta',
            categoria: 'FERTILIZACION',
          },
        ],
      };
    }

    if (q.includes('costo') || q.includes('gasto') || q.includes('dinero') || q.includes('finanz') || q.includes('ahorr') || q.includes('redu')) {
      return {
        resumen: `Para optimizar las finanzas en ${fincaNombre}, es recomendable analizar los costos fijos (mano de obra) e insumos variables. Su registro contable histórico reporta gastos que pueden optimizarse mediante planeación oportuna de compras.`,
        recomendaciones: [
          {
            titulo: 'Planificación de Compras Consolidadas',
            descripcion: 'Asóciese con productores del Cesar para comprar fertilizantes y semillas por volumen, logrando descuentos comerciales de hasta el 15%.',
            prioridad: 'alta',
            categoria: 'ECONOMICO',
          },
          {
            titulo: 'Monitoreo de Eficiencia de Maquinaria',
            descripcion: 'Controle el gasto de combustible en tractores y motobombas. Realice mantenimientos preventivos a tiempo para evitar reparaciones costosas.',
            prioridad: 'media',
            categoria: 'ECONOMICO',
          },
        ],
      };
    }

    if (q.includes('cosech') || q.includes('recolec') || q.includes('rendi')) {
      return {
        resumen: `La planificación de la cosecha en el Cesar debe considerar la logística del transporte y el estado de madurez fisiológica. El calor extremo puede acelerar la descomposición poscosecha de frutas y granos si no se cuenta con una cadena de frío o despacho rápido.`,
        recomendaciones: [
          {
            titulo: 'Organización de Cuadrillas',
            descripcion: 'Programe la labor de recolección en jornadas que inicien a las 4:30 AM para finalizar antes del mediodía, resguardando la salud de los trabajadores y la frescura del producto.',
            prioridad: 'alta',
            categoria: 'COSECHA',
          },
          {
            titulo: 'Control de Humedad Pos-Cosecha',
            descripcion: 'Asegure un almacenamiento temporal a la sombra y con ventilación cruzada antes de trasladar el producto al centro de acopio o comprador final.',
            prioridad: 'media',
            categoria: 'COSECHA',
          },
        ],
      };
    }

    // Default general response
    return {
      resumen: `Asesoría general de AgroData Cesar para ${fincaNombre}. He analizado tu consulta sobre "${consulta}" en relación con tus cultivos registrados y el clima caluroso actual de la región de ${weather.location || 'Valledupar'}. A continuación, te presento sugerencias generales para mantener tu producción en óptimo rendimiento:`,
      recomendaciones: [
        {
          titulo: 'Completar Diarios de Campo',
          descripcion: 'Asegúrese de documentar las actividades diarias, riego e insumos en el módulo de Producciones para alimentar el historial predictivo de AgroIA.',
          prioridad: 'baja',
          categoria: 'GENERAL',
        },
        {
          titulo: 'Vigilar Clima Local',
          descripcion: 'Consulte periódicamente el módulo de clima para ajustar preventivamente las fechas de siembra, fertilización y controles fitosanitarios.',
          prioridad: 'media',
          categoria: 'CLIMA',
        },
      ],
    };
  }

  private generateSmartMockAdvisories(inventory: any[], finances: any[], productions: any[], weather: any) {
    const advisories = [];

    // 1. Analyze inventory levels
    const lowStockItems = inventory.filter(i => i.quantity < i.minAlertQuantity);
    if (lowStockItems.length > 0) {
      const item = lowStockItems[0];
      advisories.push({
        id: 'adv-inv-low',
        type: 'CRITICAL',
        title: 'Reabastecimiento de Insumos',
        message: `El inventario de "${item.name}" tiene actualmente ${item.quantity} ${item.unit}, que es menor al umbral de alerta de ${item.minAlertQuantity} ${item.unit}. Planifique una compra pronto para no retrasar sus labores.`,
        category: 'INVENTARIO',
      });
    } else {
      advisories.push({
        id: 'adv-inv-ok',
        type: 'INFO',
        title: 'Nivel de Insumos Correcto',
        message: 'Sus fertilizantes, semillas y herramientas registran niveles óptimos. No se requieren compras inmediatas.',
        category: 'INVENTARIO',
      });
    }

    // 2. Weather advisory
    const rainDays = weather.forecast.filter((f: any) => f.rainProb > 60);
    if (rainDays.length > 0) {
      const day = rainDays[0];
      advisories.push({
        id: 'adv-clima-rain',
        type: 'WARNING',
        title: 'Ajuste de Riego y Fertilización',
        message: `Se pronostican lluvias (${day.rainProb}% prob. de ${day.conditions.toLowerCase()}) para el ${day.day.toLowerCase()}. Posponga cualquier fertilización foliar o aplicación de fungicidas para evitar el lavado del producto.`,
        category: 'CLIMA',
      });
    } else {
      advisories.push({
        id: 'adv-clima-dry',
        type: 'WARNING',
        title: 'Planificación de Riego por Sequía',
        message: 'Se pronostica un clima muy seco y caluroso en el departamento del Cesar. Incremente la frecuencia de riego por goteo en cultivos sensibles durante la madrugada para optimizar la humedad del suelo.',
        category: 'CLIMA',
      });
    }

    // 3. Crop productivity advisory
    if (productions.length > 0) {
      const crop = productions[0];
      advisories.push({
        id: 'adv-prod-active',
        type: 'INFO',
        title: `Seguimiento: ${crop.name}`,
        message: `Su producción de tipo "${crop.type.replace('AGRICOLA_', '')}" está activa en el lote "${crop.lote.name}". Recuerde registrar las fertilizaciones y controles de plagas en el Diario para trazar su rendimiento de producción.`,
        category: 'CULTIVO',
      });
    } else {
      advisories.push({
        id: 'adv-prod-none',
        type: 'INFO',
        title: 'Configure una Producción',
        message: 'No posee producciones agrícolas o pecuarias activas. Inicie una producción en Fincas & Lotes para llevar un control financiero exacto de sus costos.',
        category: 'CULTIVO',
      });
    }

    return advisories;
  }
}
