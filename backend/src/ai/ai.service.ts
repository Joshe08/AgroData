import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClimaService } from '../clima/clima.service';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private prisma: PrismaService,
    private climaService: ClimaService,
  ) {}

  // ─── CONSULTAS A LA BASE DE DATOS (DATA TOOLS) ─────────────────────────────

  async getFincas(orgId: string) {
    return this.prisma.finca.findMany({
      where: { organizationId: orgId },
      include: {
        lotes: true,
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
        diarios: { orderBy: { date: 'desc' }, take: 10 },
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
      include: {
        finca: { select: { id: true, name: true } },
        produccion: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
      take: 100,
    });
  }

  async getPersonal(orgId: string) {
    return this.prisma.empleado.findMany({
      where: { organizationId: orgId },
      include: {
        finca: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getMaquinaria(orgId: string) {
    return this.prisma.maquinaria.findMany({
      where: { organizationId: orgId },
      include: {
        finca: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getWeatherForFinca(finca: any) {
    const lat = finca?.latitude ?? 10.4631;
    const lon = finca?.longitude ?? -73.2532;
    return this.climaService.getWeather(lat, lon);
  }

  // ─── INSTANTÁNEA GLOBAL DE LA BASE DE DATOS (BUSINESS INTELLIGENCE) ─────────

  async getGlobalDatabaseSnapshot(orgId: string, fincaId?: string) {
    const [fincasRaw, produccionesRaw, inventarioRaw, finanzasRaw, personalRaw, maquinariaRaw] =
      await Promise.all([
        this.getFincas(orgId),
        this.getProducciones(orgId),
        this.getInventario(orgId),
        this.getFinanzas(orgId),
        this.getPersonal(orgId),
        this.getMaquinaria(orgId),
      ]);

    // Filtrar por finca si se seleccionó una específica
    const fincas = fincaId ? fincasRaw.filter((f) => f.id === fincaId) : fincasRaw;
    const producciones = fincaId
      ? produccionesRaw.filter((p) => p.lote?.finca?.id === fincaId)
      : produccionesRaw;
    const inventario = fincaId
      ? inventarioRaw.filter((i) => i.fincaId === fincaId || i.finca?.id === fincaId)
      : inventarioRaw;
    const finanzas = fincaId
      ? finanzasRaw.filter((f) => f.fincaId === fincaId || f.finca?.id === fincaId)
      : finanzasRaw;
    const personal = fincaId
      ? personalRaw.filter((p) => p.fincaId === fincaId || p.finca?.id === fincaId)
      : personalRaw;
    const maquinaria = fincaId
      ? maquinariaRaw.filter((m) => m.fincaId === fincaId || m.finca?.id === fincaId)
      : maquinariaRaw;

    const weatherTarget = fincas[0] || fincasRaw[0];
    const weather = await this.getWeatherForFinca(weatherTarget);

    // Métricas globales calculadas
    const totalHectareas = fincas.reduce((s, f) => s + (f.area || 0), 0);
    const totalLotes = fincas.reduce((s, f) => s + (f.lotes?.length || 0), 0);
    const produccionesActivas = producciones.filter((p) => p.status === 'ACTIVE');

    const totalIngresos = finanzas
      .filter((f) => f.type === 'INGRESO')
      .reduce((s, f) => s + f.amount, 0);
    const totalGastos = finanzas
      .filter((f) => f.type === 'GASTO')
      .reduce((s, f) => s + f.amount, 0);
    const balanceNeto = totalIngresos - totalGastos;

    const inventarioBajoStock = inventario.filter((i) => i.quantity <= i.minAlertQuantity);
    const valorInventario = inventario.reduce((s, i) => s + (i.quantity || 0) * (i.costo || 0), 0);

    const maquinariaOperativa = maquinaria.filter(
      (m) => m.status === 'OPERATIVE' || (m as any).estado === 'OPERATIVO',
    );
    const nominaMensual = personal.reduce((s, p) => s + (p.dailyRate || 0), 0);

    return {
      fincas,
      producciones,
      produccionesActivas,
      inventario,
      inventarioBajoStock,
      finanzas,
      personal,
      maquinaria,
      maquinariaOperativa,
      weather,
      kpis: {
        fincasCount: fincas.length,
        totalHectareas,
        totalLotes,
        produccionesActivasCount: produccionesActivas.length,
        totalIngresos,
        totalGastos,
        balanceNeto,
        inventarioCount: inventario.length,
        inventarioBajoStockCount: inventarioBajoStock.length,
        valorInventario,
        personalCount: personal.length,
        nominaMensual,
        maquinariaCount: maquinaria.length,
        maquinariaOperativaCount: maquinariaOperativa.length,
      },
    };
  }

  // ─── CHAT INTELIGENTE MULTITURNO CON ACCESO TOTAL A LA BASE DE DATOS ───────

  async chat(
    orgId: string,
    messages: ChatMessage[],
    fincaId?: string,
    imageBase64?: string,
  ) {
    const snapshot = await this.getGlobalDatabaseSnapshot(orgId, fincaId);
    const userMessage = messages[messages.length - 1]?.content || '';

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      this.logger.warn('GEMINI_API_KEY no configurada. Utilizando motor analítico local.');
      if (imageBase64) {
        return this.generateImageFallback(userMessage, snapshot);
      }
      return this.generateSmartChatFallback(userMessage, snapshot);
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      // Modelo multimodal rápido y preciso con Google Search grounding
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        tools: [{ googleSearch: {} } as any],
      });

      // Preparar el resumen estructurado de la base de datos real
      const dbContext = {
        resumenEjecutivo: snapshot.kpis,
        climaActualCesar: {
          temp: `${snapshot.weather.temperature}°C`,
          humedad: `${snapshot.weather.humidity}%`,
          condicion: snapshot.weather.conditions,
          lluviaProb: `${snapshot.weather.rainProbability}%`,
          viento: `${snapshot.weather.windSpeed} km/h`,
        },
        predios: snapshot.fincas.map((f) => ({
          nombre: f.name,
          areaHa: f.area,
          lotes: f.lotes.map((l) => ({
            nombre: l.name,
            area: l.area,
            suelo: l.soilType,
            cultivo: l.cultivoActual,
            estado: l.status,
            riego: l.sistemaRiego,
          })),
        })),
        produccionesEnCurso: snapshot.produccionesActivas.map((p) => ({
          nombre: p.name,
          tipo: p.type,
          finca: p.lote?.finca?.name,
          lote: p.lote?.name,
          rendimientoEsperado: `${p.expectedYield || 0} ${p.unit || ''}`,
          diariosRecientes: p.diarios?.slice(0, 3).map((d) => ({
            actividad: d.activity,
            plagas: d.diseases,
            abono: d.fertilizerUsed,
            riegoLitros: d.waterIrrigation,
          })),
        })),
        alertasStockBodega: snapshot.inventarioBajoStock.map((i) => ({
          insumo: i.name,
          disponible: `${i.quantity} ${i.unit}`,
          minimoAlerta: `${i.minAlertQuantity} ${i.unit}`,
          proveedor: i.proveedor,
        })),
        finanzasRecientes: snapshot.finanzas.slice(0, 10).map((f) => ({
          tipo: f.type,
          categoria: f.category,
          monto: f.amount,
          concepto: f.description,
          finca: f.finca?.name,
        })),
        maquinaria: snapshot.maquinaria.map((m) => ({
          equipo: m.name,
          tipo: m.tipo,
          estado: m.status,
          horas: m.horasUso,
          finca: m.finca?.name,
        })),
        personal: snapshot.personal.map((p) => ({
          nombre: `${p.name} ${p.lastName || ''}`.trim(),
          cargo: p.role,
          finca: p.finca?.name,
        })),
      };

      const systemPrompt = `
Eres AgroIA, el Copiloto Agronómico y Analista Ejecutivo de AgroData para el Departamento del Cesar, Colombia.
Cuentas con acceso en tiempo real a la base de datos empresarial de la organización agropecuaria.
También tienes acceso a búsqueda en internet para complementar cualquier información que no esté en la base de datos interna.

DATOS VIVOS Y REALES DE LA BASE DE DATOS (AUDITORÍA ACTUAL):
${JSON.stringify(dbContext, null, 2)}

INSTRUCCIONES Y REGLAS OPERATIVAS:
1. Responde SIEMPRE fundamentado en las cifras y datos REALES suministrados arriba. NUNCA inventes nombres de predios, cultivos, hectáreas ni montos que no existan en la base de datos.
2. Si el usuario pide un análisis global, cruza la información entre departamentos (ej. cómo las finanzas afectan la siembra, cómo el clima condiciona el inventario de fertilizantes o los turnos de riego).
3. Si la base de datos interna no contiene información suficiente para responder (precios de mercado, normativa ICA, dosis técnicas de productos, ciclos de plagas, recomendaciones varietales, condiciones externas del Cesar), usa la búsqueda en internet para complementar. En ese caso, indica claramente qué información proviene de la base de datos interna y qué proviene de fuentes externas.
4. Conoce la agronomía propia del Cesar:
   - Valledupar, Codazzi, La Paz: arroz de riego/secano, maíz, ganadería de doble propósito, altas temperaturas diurnas.
   - San Alberto, San Martín, Aguachica: palma de aceite, cereales, suelos aluviales fértiles.
   - Serranía del Perijá y estribaciones de la Sierra Nevada: café especial bajo sombra, cacao, frutales.
5. Si el usuario adjunta una fotografía o consulta sobre sanidad vegetal, actúa como fitopatólogo experto:
   - Identifica la plaga, enfermedad o carencia nutricional.
   - Recomienda un plan de Manejo Integrado de Plagas (MIP).
   - Revisa si en su inventario actual tienen insumos compatibles para aplicar de inmediato.
   - Si no tienes información suficiente en la base de datos, busca en internet dosis, períodos de carencia y alternativas registradas ante el ICA Colombia.
6. Si el usuario te pide registrar un gasto, diario o insumo, incluye al final de tu respuesta el bloque de acción ejecutable:
   <<<ACTION:{"type":"REGISTRAR_GASTO"|"REGISTRAR_DIARIO"|"ACTUALIZAR_INVENTARIO","data":{...}}>>>
7. Utiliza formato Markdown profesional (negritas, listas estructuradas, tablas técnicas).
8. ESTRICTAMENTE PROHIBIDO usar emojis o emoticones en tus respuestas. Mantén un tono técnico, formal, sobrio y analítico de informe agronómico.
`;

      // Construir historial de mensajes para Gemini
      const conversationHistory = messages.slice(0, -1).map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      const chatHistory = [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: 'Entendido. Soy AgroIA, tu copiloto agronómico con acceso total a los datos de tu organización en el Cesar. Cuando la base de datos interna no sea suficiente, consultaré fuentes externas para complementar el análisis.' }] },
        ...conversationHistory,
      ];

      // Intentar con Google Search grounding; si falla, reintentar sin grounding
      let chatSession: any;
      try {
        chatSession = model.startChat({ history: chatHistory });
      } catch {
        const modelPlain = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        chatSession = modelPlain.startChat({ history: chatHistory });
      }

      let contentParts: any[] = [{ text: userMessage }];

      if (imageBase64) {
        // Extraer mimeType si viene en formato data:image/jpeg;base64,...
        const match = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        const mimeType = match ? match[1] : 'image/jpeg';
        const rawBase64 = match ? match[2] : imageBase64;

        contentParts = [
          {
            inlineData: {
              data: rawBase64,
              mimeType,
            },
          },
          { text: userMessage || 'Analiza esta imagen desde una perspectiva agronómica y fitosanitaria.' },
        ];
      }

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini timeout')), 25000),
      );

      const responsePromise = chatSession.sendMessage(contentParts);
      const result = (await Promise.race([responsePromise, timeoutPromise])) as any;
      let text = result.response.text();

      // Detectar si Gemini usó búsqueda web (grounding metadata)
      const groundingMetadata = result.response?.candidates?.[0]?.groundingMetadata;
      const usedWebSearch = !!(groundingMetadata?.webSearchQueries?.length > 0 || groundingMetadata?.searchEntryPoint);

      // Extraer acción sugerida si existe
      let actionSuggestion = null;
      const actionMatch = text.match(/<<<ACTION:(.*?)>>>/);
      if (actionMatch) {
        try {
          actionSuggestion = JSON.parse(actionMatch[1]);
          text = text.replace(/<<<ACTION:(.*?)>>>/, '').trim();
        } catch (e) {
          this.logger.warn(`Error al parsear action sugerida: ${e}`);
        }
      }

      const suggestions = this.generateFollowUpQuestions(userMessage, snapshot);
      const sources = ['Base de Datos AgroData', 'Fincas & Lotes', 'Finanzas', 'Inventario', 'Clima'];
      if (usedWebSearch) {
        sources.push('Búsqueda Web (Google)');
      }

      return {
        text,
        fuente: usedWebSearch
          ? 'AgroIA + Base de Datos + Búsqueda Web (Gemini)'
          : 'AgroIA + Base de Datos en Tiempo Real (Gemini)',
        suggestions,
        actionSuggestion,
        sources,
        kpis: snapshot.kpis,
      };
    } catch (error) {
      this.logger.warn(`Gemini API unavailable: ${(error as any)?.message}. Usando motor analítico local.`);
      if (imageBase64) {
        return this.generateImageFallback(userMessage, snapshot);
      }
      return this.generateSmartChatFallback(userMessage, snapshot);
    }
  }

  // ─── EJECUCIÓN DE ACCIONES POR LENGUAJE NATURAL ─────────────────────────────

  async executeAction(orgId: string, action: { type: string; data: any }) {
    const { type, data } = action;

    if (type === 'REGISTRAR_GASTO' || type === 'REGISTRAR_INGRESO') {
      const created = await this.prisma.finanza.create({
        data: {
          type: type === 'REGISTRAR_INGRESO' ? 'INGRESO' : 'GASTO',
          category: data.category || 'VARIOS',
          amount: parseFloat(data.amount || data.monto || 0),
          description: data.description || data.descripcion || 'Registrado mediante AgroIA',
          fincaId: data.fincaId || null,
          produccionId: data.produccionId || null,
          organizationId: orgId,
        },
      });
      return { success: true, message: `Transacción por $${created.amount.toLocaleString('es-CO')} registrada correctamente.`, record: created };
    }

    if (type === 'REGISTRAR_DIARIO') {
      if (!data.produccionId) {
        throw new Error('Se requiere especificar la producción para el diario de campo.');
      }
      const created = await this.prisma.diarioProduccion.create({
        data: {
          produccionId: data.produccionId,
          activity: data.activity || data.actividad || 'Labor de campo',
          observations: data.observations || data.observaciones || null,
          diseases: data.diseases || data.plagas || null,
          fertilizerUsed: data.fertilizerUsed || data.abono || null,
          waterIrrigation: data.waterIrrigation ? parseFloat(data.waterIrrigation) : null,
        },
      });
      return { success: true, message: 'Entrada en el diario de campo registrada con éxito.', record: created };
    }

    if (type === 'ACTUALIZAR_INVENTARIO') {
      const created = await this.prisma.inventario.create({
        data: {
          name: data.name || data.nombre,
          category: data.category || data.categoria || 'INSUMO',
          quantity: parseFloat(data.quantity || data.cantidad || 0),
          unit: data.unit || data.unidad || 'unidades',
          minAlertQuantity: parseFloat(data.minAlertQuantity || data.stockMinimo || 10),
          costo: data.costo ? parseFloat(data.costo) : null,
          proveedor: data.proveedor || null,
          fincaId: data.fincaId || null,
          organizationId: orgId,
        },
      });
      return { success: true, message: `Insumo "${created.name}" agregado a bodega.`, record: created };
    }

    throw new Error(`Tipo de acción no soportado: ${type}`);
  }

  // ─── GENERADOR DE PREGUNTAS SUGERIDAS INTELIGENTES ──────────────────────────

  private generateFollowUpQuestions(query: string, snapshot: any): string[] {
    const q = (query || '').toLowerCase();
    const suggestions: string[] = [];

    if (q.includes('gasto') || q.includes('costo') || q.includes('finanza')) {
      suggestions.push('¿Cuáles son los insumos que más gastos generan en bodega?');
      suggestions.push('¿Cuál es el margen operativo por predio?');
    } else if (q.includes('inventario') || q.includes('stock')) {
      suggestions.push('¿Qué insumos debo reponer urgentemente para no frenar labores?');
      suggestions.push('¿Cuánto dinero total tenemos inmovilizado en bodega?');
    } else if (q.includes('clima') || q.includes('lluvia') || q.includes('riego')) {
      suggestions.push('¿Cómo optimizar los turnos de riego con las temperaturas del Cesar?');
      suggestions.push('¿Hay riesgo fitosanitario por la humedad actual?');
    } else {
      suggestions.push('Hazme un balance integral de todo el negocio');
      suggestions.push('¿Qué maquinaria requiere mantenimiento próximamente?');
      suggestions.push('¿Cómo están los rendimientos esperados en las cosechas activas?');
    }

    return suggestions.slice(0, 3);
  }

  // ─── ANÁLISIS DE IMAGEN (FALLBACK SIN GEMINI) ────────────────────────────────

  private generateImageFallback(query: string, snapshot: any) {
    const { kpis, weather, fincas, produccionesActivas, inventarioBajoStock } = snapshot;
    const q = (query || '').toLowerCase();

    const cultivosActivos = produccionesActivas.map((p: any) => p.name).join(', ') || 'sin ciclos activos';
    const insumos = inventarioBajoStock.map((i: any) => i.name).join(', ') || 'ninguno';

    // Seleccionar el análisis según el tipo de consulta
    let diagnosticoEspecifico = '';

    if (q.includes('hoja') || q.includes('mancha') || q.includes('amarill') || q.includes('necrosis') || q.includes('clorosis')) {
      diagnosticoEspecifico = `
**Posibles causas de afecciones foliares (basado en contexto del Cesar):**

- **Deficiencia de Nitrógeno:** Clorosis generalizada en hojas inferiores, color verde-amarillento uniforme. Tratamiento: Urea al 1-2% foliar o aplicación edáfica 80-120 kg N/ha.
- **Cercospora / Alternaria:** Manchas circulares o angulares con halo clorótico. Tratamiento: Mancozeb 80 WP (2 kg/ha) o Azoxystrobin (0.5 L/ha).
- **Deficiencia de Hierro (clorosis intervenal):** Hojas jóvenes amarillas con nervaduras verdes. Tratamiento: Quelato de hierro EDDHA foliar 0.3%.
- **Quemadura solar:** Manchas blanquecinas irregulares en exposición directa. Manejo cultural: sombreado parcial o riego al amanecer.`;
    } else if (q.includes('plaga') || q.includes('insecto') || q.includes('bicho') || q.includes('gusano') || q.includes('barren')) {
      diagnosticoEspecifico = `
**Plagas frecuentes en el Cesar y plan MIP:**

- **Diatraea saccharalis (barrenador del tallo):** Perforaciones en el tallo con aserrín. Liberación de Cotesia flavipes (parasitoide) + Trichoderma spp. Umbral económico: >5% tallos afectados.
- **Spodoptera frugiperda (cogollero del maíz):** Defoliación con excrementos en el cogollo. Spinosad 120 SC (0.3 L/ha) o Clorantraniliprole (150 mL/ha).
- **Mosca blanca (Bemisia tabaci):** Fumagina + transmisión de geminivirus. Imidacloprid 350 SC (150 mL/ha) rotando con Spiromesifen.
- **Trips:** Plateado en hojas. Abamectina 1.8 EC (500 mL/ha). Evitar aplicar en horas de calor.`;
    } else if (q.includes('hongo') || q.includes('fungi') || q.includes('mildiu') || q.includes('roya') || q.includes('pudri')) {
      diagnosticoEspecifico = `
**Enfermedades fungosas comunes en el Cesar:**

- **Phytophthora spp. (pudrición radicular):** Síntomas: marchitez súbita, raíces oscuras. Metalaxil-M + Mancozeb drench al suelo.
- **Roya (Puccinia spp.):** Pústulas anaranjadas en el envés. Tebuconazol 25 EW (750 mL/ha) o Propiconazol 25 EC (500 mL/ha).
- **Mildiu velloso:** Masa grisácea en el envés con clorosis superior. Fosetil-Al 80 WP (3 kg/ha) + manejo de humedad.
- **Fusarium:** Marchitez vascular + coloración parda en el xilema. Rotación de cultivos y Trichoderma harzianum como biocontrolador preventivo.`;
    } else {
      diagnosticoEspecifico = `
**Evaluacion fitosanitaria general (contexto Cesar, temperatura ${weather.temperature}°C, humedad ${weather.humidity}%):**

- A **${weather.temperature}°C** y **${weather.humidity}%** de humedad, las condiciones favorecen el desarrollo de hongos foliares si la humedad relativa supera el 80% en horas nocturnas.
- Probabilidad de lluvia del **${weather.rainProbability}%**: suspenda fumigaciones foliares si llueve dentro de las 2 horas siguientes a la aplicación.
- Monitoree semanalmente los cultivos activos: **${cultivosActivos}**. Revise el envés de las hojas, los tallos y el cuello de la raíz.
- En los lotes con sistemas de riego por aspersión, revise signos de Botrytis y Mildiu en períodos de alta humedad foliar.`;
    }

    const text = `### Analisis Fitosanitario — Diagnostico Local AgroData

**Nota:** Para un diagnostico de imagen con inteligencia artificial avanzada, configure la clave GEMINI_API_KEY en el servidor. El siguiente analisis se basa en el contexto agronomico real de su organizacion en el Cesar.

${diagnosticoEspecifico}

---

**Inventario disponible para tratamiento:**
- Insumos con stock critico: **${insumos || 'Ninguno'}**
- Verifique en bodega la disponibilidad de fungicidas, insecticidas y fertilizantes foliares antes de iniciar el plan de manejo.

**Condiciones actuales del Cesar:**
- Temperatura: **${weather.temperature}°C** | Humedad: **${weather.humidity}%** | Lluvia: **${weather.rainProbability}%**
- Fincas monitoreadas: **${kpis.fincasCount}** (${kpis.totalHectareas.toFixed(1)} ha total)

**Recomendacion de seguimiento:**
Registre el diagnostico en el diario de campo del cultivo afectado para generar historico fitosanitario y optimizar el plan MIP a largo plazo.`;

    return {
      text,
      fuente: 'Motor Analítico Local AgroData — Diagnostico Fitosanitario (Cesar)',
      suggestions: [
        '¿Qué insumos de bodega son compatibles con el plan MIP propuesto?',
        '¿Cuál es el estado actual de los cultivos activos en mis lotes?',
        '¿Hay riesgo fitosanitario por la humedad actual en el Cesar?',
      ],
      actionSuggestion: null,
      sources: ['Base de Datos AgroData', 'Contexto Agronómico Cesar', 'Manual ICA Colombia'],
      kpis,
      isImageAnalysis: true,
    };
  }

  // ─── MOTOR ANALÍTICO LOCAL INTELIGENTE (CUANDO GEMINI ESTÁ OFFLINE) ──────────

  private generateSmartChatFallback(query: string, snapshot: any) {
    const q = (query || '').toLowerCase().trim();
    const formatCOP = (v: number) =>
      new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

    const { kpis, weather, fincas, produccionesActivas, inventarioBajoStock, maquinaria } = snapshot;

    let text = '';
    const suggestions: string[] = [
      '¿Qué insumos tienen stock crítico?',
      '¿Cuál es el estado de la maquinaria?',
      '¿Cómo afectará el clima del Cesar a mis cultivos esta semana?',
    ];

    if (q.includes('balance') || q.includes('global') || q.includes('todo') || q.includes('resumen') || q.includes('negocio')) {
      text = `### Diagnostico y Analisis Global de la Organizacion

**1. Territorio y Predios:**
- Administras **${kpis.fincasCount} predio(s)** con un area catastral acumulada de **${kpis.totalHectareas.toFixed(1)} hectareas** distribuidas en **${kpis.totalLotes} parcelas o lotes**.

**2. Operacion de Cultivos y Cosechas:**
- Cuentas con **${kpis.produccionesActivasCount} ciclo(s) productivo(s) activo(s)** (${produccionesActivas.map((p: any) => p.name).join(', ') || 'sin cosechas en curso'}).

**3. Salud Financiera:**
- **Ingresos Registrados:** ${formatCOP(kpis.totalIngresos)}
- **Costos y Gastos:** ${formatCOP(kpis.totalGastos)}
- **Margen Operativo Neto:** **${formatCOP(kpis.balanceNeto)}** (${kpis.balanceNeto >= 0 ? 'Superavit operativo' : 'Deficit contable'}).

**4. Inventario y Almacen:**
- Registras **${kpis.inventarioCount} insumos** valorados en **${formatCOP(kpis.valorInventario)}**. 
- Existen **${kpis.inventarioBajoStockCount} producto(s) en umbral critico de stock** (${inventarioBajoStock.map((i: any) => i.name).join(', ') || 'Ninguno'}).

**5. Condiciones Agrometeorologicas (Cesar):**
- Temperatura actual: **${weather.temperature}°C** | Humedad: **${weather.humidity}%** | Probabilidad de lluvia: **${weather.rainProbability}%**.`;
    } else if (q.includes('maquinaria') || q.includes('tractor') || q.includes('equipo')) {
      const operativas = maquinaria.filter((m: any) => m.status === 'OPERATIVE');
      text = `### Auditoria de Maquinaria y Equipos

- **Total de unidades:** ${maquinaria.length} equipos registrados.
- **Operatividad:** **${operativas.length} operativas** de ${maquinaria.length}.
- **Flota registrada:** ${maquinaria.map((m: any) => `${m.name} (${m.status === 'OPERATIVE' ? 'Operativo' : 'En Mantenimiento'}, ${m.horasUso || 0} hrs)`).join('; ')}.
- **Recomendacion agronomica:** Programa cambio de lubricantes y filtros en equipos con mas de 250 horas de labor de campo.`;
    } else {
      text = `### Consulta Agronomica Procesada

Actualmente tu organizacion cuenta con **${kpis.fincasCount} fincas (${kpis.totalHectareas.toFixed(1)} ha)** en el Cesar, con balance financiero de **${formatCOP(kpis.balanceNeto)}** y clima de **${weather.temperature}°C (${weather.conditions})**.

Si deseas un analisis detallado sobre fitosanidad, costos o fertilizacion para tus lotes, formula tu pregunta especifica o sube una fotografia para diagnostico directo.`;
    }

    return {
      text,
      fuente: 'Motor Analítico Local AgroData (Cesar)',
      suggestions,
      actionSuggestion: null,
      sources: ['Base de Datos SQLite', 'Servicio Meteorológico Cesar'],
      kpis,
    };
  }

  // ─── RECOMENDACIONES LEGACY (COMPATIBILIDAD CON VISTAS EXISTENTES) ──────────

  async getAdvisories(orgId: string) {
    const snapshot = await this.getGlobalDatabaseSnapshot(orgId);
    const advisories: any[] = [];

    // Alerta de Stock
    if (snapshot.inventarioBajoStock.length > 0) {
      advisories.push({
        id: 'adv-inv-1',
        type: 'WARNING',
        category: 'INVENTARIO',
        title: `${snapshot.inventarioBajoStock.length} Insumo(s) en Nivel Crítico`,
        message: `El producto "${snapshot.inventarioBajoStock[0].name}" tiene solo ${snapshot.inventarioBajoStock[0].quantity} ${snapshot.inventarioBajoStock[0].unit} disponibles. Reponga existencias para no detener labores.`,
      });
    } else {
      advisories.push({
        id: 'adv-inv-ok',
        type: 'INFO',
        category: 'INVENTARIO',
        title: 'Bodega Abastecida',
        message: `Todos los ${snapshot.inventario.length} insumos en inventario cuentan con existencias superiores a la cuota mínima.`,
      });
    }

    // Alerta de Clima
    const w = snapshot.weather;
    const temp = w?.temperature ?? 28;
    const rainProb = w?.rainProbability ?? 20;

    if (temp >= 35) {
      advisories.push({
        id: 'adv-clima-calor',
        type: 'CRITICAL',
        category: 'CLIMA',
        title: `Calor Intenso en el Cesar (${temp}°C)`,
        message: 'Elevada evapotranspiración. Programe el riego por goteo exclusivamente antes de las 7:00 AM o al atardecer.',
      });
    } else if (rainProb >= 60) {
      advisories.push({
        id: 'adv-clima-lluvia',
        type: 'WARNING',
        category: 'CLIMA',
        title: `Lluvias Previstas (${rainProb}%)`,
        message: 'Suspenda fumigaciones foliares para evitar lavado de producto por precipitación.',
      });
    } else {
      advisories.push({
        id: 'adv-clima-ok',
        type: 'INFO',
        category: 'CLIMA',
        title: 'Condiciones Agrometeorológicas Óptimas',
        message: `${temp}°C y viento a ${w?.windSpeed ?? 10} km/h. Condiciones favorables para monitoreo de plagas y labores de campo.`,
      });
    }

    // Alerta de Producción o Finanzas
    if (snapshot.produccionesActivas.length > 0) {
      advisories.push({
        id: 'adv-prod-act',
        type: 'INFO',
        category: 'CULTIVO',
        title: `Monitoreo a ${snapshot.produccionesActivas[0].name}`,
        message: `Producción activa en el lote "${snapshot.produccionesActivas[0].lote?.name || 'Principal'}". Registre las labores en el diario de campo.`,
      });
    } else {
      advisories.push({
        id: 'adv-prod-0',
        type: 'INFO',
        category: 'CULTIVO',
        title: 'Planificación de Lotes',
        message: `Cuentas con ${snapshot.fincas.length} finca(s). Registra un nuevo ciclo productivo en el módulo de Producciones.`,
      });
    }

    return advisories;
  }

  async getCustomRecomendaciones(orgId: string, consulta: string, contexto: any) {
    const messages: ChatMessage[] = [{ role: 'user', content: consulta }];
    const chatRes = await this.chat(orgId, messages, contexto?.finca?.id);

    return {
      resumen: chatRes.text,
      fuente: chatRes.fuente,
      recomendaciones: [
        {
          titulo: 'Análisis Integral del Asesor AgroIA',
          descripcion: chatRes.text.slice(0, 300) + '...',
          prioridad: 'alta',
          categoria: 'GENERAL',
        },
      ],
    };
  }
}
