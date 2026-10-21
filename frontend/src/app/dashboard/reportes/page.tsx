'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  fincasApi,
  produccionesApi,
  inventarioApi,
  finanzasApi,
  personalApi,
  maquinariaApi,
} from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/store/toastStore';
import {
  FileText,
  Download,
  Printer,
  DollarSign,
  Package,
  Sprout,
  MapPin,
  Calendar,
  Users,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Layers,
  Filter,
  Wrench,
  Sparkles,
  ChevronDown,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type ReportCategory = 'todo' | 'produccion' | 'finanzas' | 'inventario' | 'fincas' | 'personal' | 'maquinaria';
type PeriodOption = 'TODO' | 'MES_ACTUAL' | 'ULTIMOS_30_DIAS' | 'ANIO_ACTUAL';

interface Finca {
  id: string | number;
  nombre: string;
}

interface KpiItem {
  label: string;
  val: string | number;
  note: string;
  color?: string;
}

export default function ReportesPage() {
  const { user } = useAuthStore();
  const userRole = user?.rol || 'TRABAJADOR';
  const isSalaryPrivileged =
    userRole === 'PROPIETARIO' || userRole === 'ADMIN' || userRole === 'SUPERADMIN' || userRole === 'CONTADOR';

  const allCategoryTabs = [
    {
      id: 'todo' as ReportCategory,
      label: 'Consolidado Global',
      desc: 'Todas las áreas del sistema',
      icon: <Layers size={18} color="#10b981" />,
      roles: ['PROPIETARIO', 'ADMIN', 'SUPERADMIN', 'CONTADOR', 'AGRONOMO', 'ADMIN_PRODUCCION'],
    },
    {
      id: 'produccion' as ReportCategory,
      label: 'Producción',
      desc: 'Cultivos, ganado y cosechas',
      icon: <Sprout size={18} color="#fbbf24" />,
      roles: ['PROPIETARIO', 'ADMIN', 'SUPERADMIN', 'AGRONOMO', 'ADMIN_PRODUCCION'],
    },
    {
      id: 'finanzas' as ReportCategory,
      label: 'Finanzas',
      desc: 'Ingresos, costos y balances',
      icon: <DollarSign size={18} color="#34d399" />,
      roles: ['PROPIETARIO', 'ADMIN', 'SUPERADMIN', 'CONTADOR'],
    },
    {
      id: 'inventario' as ReportCategory,
      label: 'Inventario',
      desc: 'Insumos y alertas de stock',
      icon: <Package size={18} color="#60a5fa" />,
      roles: ['PROPIETARIO', 'ADMIN', 'SUPERADMIN', 'AGRONOMO', 'ADMIN_PRODUCCION', 'CONTADOR'],
    },
    {
      id: 'fincas' as ReportCategory,
      label: 'Fincas y Predios',
      desc: 'Hectáreas y parcelas',
      icon: <MapPin size={18} color="#a78bfa" />,
      roles: ['PROPIETARIO', 'ADMIN', 'SUPERADMIN', 'AGRONOMO', 'ADMIN_PRODUCCION'],
    },
    {
      id: 'personal' as ReportCategory,
      label: 'Personal',
      desc: 'Mano de obra y nómina',
      icon: <Users size={18} color="#f472b6" />,
      roles: ['PROPIETARIO', 'ADMIN', 'SUPERADMIN', 'ADMIN_PRODUCCION', 'CONTADOR'],
    },
    {
      id: 'maquinaria' as ReportCategory,
      label: 'Maquinaria',
      desc: 'Flota y mantenimientos',
      icon: <Wrench size={18} color="#f59e0b" />,
      roles: ['PROPIETARIO', 'ADMIN', 'SUPERADMIN', 'ADMIN_PRODUCCION'],
    },
  ];

  const availableTabs = allCategoryTabs.filter((t) => t.roles.includes(userRole));
  const defaultTab = availableTabs[0]?.id || 'produccion';

  const [reportType, setReportType] = useState<ReportCategory>(defaultTab);
  const [fincas, setFincas] = useState<Finca[]>([]);
  const [selectedFinca, setSelectedFinca] = useState<string>('ALL');
  const [period, setPeriod] = useState<PeriodOption>('TODO');
  const [loading, setLoading] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Raw data for single category
  const [rawData, setRawData] = useState<any[]>([]);

  // Consolidated state for 'todo' view
  const [allData, setAllData] = useState<{
    fincas: any[];
    producciones: any[];
    inventario: any[];
    finanzas: any[];
    personal: any[];
    maquinaria: any[];
  }>({
    fincas: [],
    producciones: [],
    inventario: [],
    finanzas: [],
    personal: [],
    maquinaria: [],
  });

  // Load fincas for the filter
  useEffect(() => {
    fincasApi
      .getAll()
      .then((res) => {
        setFincas(res.data || []);
      })
      .catch(() => {});
  }, []);

  // Fetch all modules helper
  const fetchAllModules = useCallback(async () => {
    const [fRes, pRes, iRes, finRes, perRes, mRes] = await Promise.allSettled([
      fincasApi.getAll(),
      produccionesApi.getAll(),
      inventarioApi.getAll(),
      finanzasApi.getAll(),
      personalApi.getAll(),
      maquinariaApi.getAll(),
    ]);

    return {
      fincas: fRes.status === 'fulfilled' ? fRes.value.data || [] : [],
      producciones: pRes.status === 'fulfilled' ? pRes.value.data || [] : [],
      inventario: iRes.status === 'fulfilled' ? iRes.value.data || [] : [],
      finanzas: finRes.status === 'fulfilled' ? finRes.value.data || [] : [],
      personal: perRes.status === 'fulfilled' ? perRes.value.data || [] : [],
      maquinaria: mRes.status === 'fulfilled' ? mRes.value.data || [] : [],
    };
  }, []);

  // Fetch data based on active reportType
  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      if (reportType === 'todo') {
        const full = await fetchAllModules();
        setAllData(full);
      } else if (reportType === 'produccion') {
        const res = await produccionesApi.getAll();
        setRawData(res.data || []);
      } else if (reportType === 'finanzas') {
        const res = await finanzasApi.getAll();
        setRawData(res.data || []);
      } else if (reportType === 'inventario') {
        const res = await inventarioApi.getAll();
        setRawData(res.data || []);
      } else if (reportType === 'fincas') {
        const res = await fincasApi.getAll();
        setRawData(res.data || []);
      } else if (reportType === 'personal') {
        const res = await personalApi.getAll();
        setRawData(res.data || []);
      } else if (reportType === 'maquinaria') {
        const res = await maquinariaApi.getAll();
        setRawData(res.data || []);
      }
    } catch {
      useToastStore.getState().error('Error al cargar datos para el reporte.');
    } finally {
      setLoading(false);
    }
  }, [reportType, fetchAllModules]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Format currency in COP
  const formatCOP = (val: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val);

  // Common filter helper for arrays
  const filterDataset = useCallback(
    (items: any[], isFincaCollection = false) => {
      let result = [...items];

      if (selectedFinca !== 'ALL') {
        result = result.filter((item) => {
          if (isFincaCollection) {
            return String(item.id) === selectedFinca;
          }
          const itemFincaId = String(item.fincaId || item.finca?.id);
          return itemFincaId === selectedFinca;
        });
      }

      if (period !== 'TODO' && !isFincaCollection) {
        const now = new Date();
        result = result.filter((item) => {
          const dateStr =
            item.date ||
            item.fecha ||
            item.startDate ||
            item.fechaInicio ||
            item.fechaIngreso ||
            item.fechaAdquisicion ||
            item.createdAt;
          if (!dateStr) return true;
          const itemDate = new Date(dateStr);

          if (period === 'ULTIMOS_30_DIAS') {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(now.getDate() - 30);
            return itemDate >= thirtyDaysAgo;
          }
          if (period === 'MES_ACTUAL') {
            return (
              itemDate.getMonth() === now.getMonth() &&
              itemDate.getFullYear() === now.getFullYear()
            );
          }
          if (period === 'ANIO_ACTUAL') {
            return itemDate.getFullYear() === now.getFullYear();
          }
          return true;
        });
      }

      return result;
    },
    [selectedFinca, period]
  );

  // Filter single category rawData
  const filteredData = useMemo(() => {
    return filterDataset(rawData, reportType === 'fincas');
  }, [rawData, reportType, filterDataset]);

  // Filter all categories for 'todo' view
  const filteredAllData = useMemo(() => {
    return {
      fincas: filterDataset(allData.fincas, true),
      producciones: filterDataset(allData.producciones),
      inventario: filterDataset(allData.inventario),
      finanzas: filterDataset(allData.finanzas),
      personal: filterDataset(allData.personal),
      maquinaria: filterDataset(allData.maquinaria),
    };
  }, [allData, filterDataset]);

  // Compute domain-specific KPIs
  const kpis: KpiItem[] = useMemo(() => {
    if (reportType === 'todo') {
      const { fincas: fList, producciones: pList, inventario: iList, finanzas: finList, personal: perList, maquinaria: mList } = filteredAllData;

      const totalHas = fList.reduce((acc, f) => acc + (f.hectareas || f.area || 0), 0);
      const activas = pList.filter((p) => p.status === 'ACTIVE' || p.estado === 'ACTIVE' || p.estado === 'SIEMBRA' || p.estado === 'CRECIMIENTO').length;
      const bajoStock = iList.filter((i) => (i.stockMinimo || i.minAlertQuantity) && (i.quantity || i.cantidad || 0) <= (i.stockMinimo || i.minAlertQuantity)).length;
      const ingresos = finList.filter((t) => t.type === 'INGRESO' || t.tipo === 'INGRESO').reduce((sum, t) => sum + (t.amount || t.monto || 0), 0);
      const gastos = finList.filter((t) => t.type === 'GASTO' || t.tipo === 'GASTO').reduce((sum, t) => sum + (t.amount || t.monto || 0), 0);
      const balance = ingresos - gastos;
      const maqOperativa = mList.filter((m) => (m.estado || m.status) === 'OPERATIVO' || (m.estado || m.status) === 'OPERATIVE').length;

      return [
        { label: 'Predios y Hectáreas', val: `${fList.length} fincas (${totalHas.toFixed(1)} ha)`, note: 'Superficie registrada' },
        { label: 'Ciclos Productivos', val: `${activas} activos / ${pList.length} total`, note: 'Cultivos y ganadería' },
        { label: 'Inventario en Bodega', val: `${iList.length} ítems (${bajoStock} alertas)`, note: 'Control de insumos', color: bajoStock > 0 ? '#f87171' : undefined },
        { label: 'Margen Neto Operativo', val: formatCOP(balance), note: `Ingresos: ${formatCOP(ingresos)} · Gastos: ${formatCOP(gastos)}`, color: balance >= 0 ? '#34d399' : '#f87171' },
        { label: 'Equipo Humano', val: `${perList.length} colaboradores`, note: 'Fuerza operativa' },
        { label: 'Flota de Maquinaria', val: `${maqOperativa} operativas de ${mList.length}`, note: 'Equipos y tracción', color: '#38bdf8' },
      ];
    }
    if (reportType === 'produccion') {
      const total = filteredData.length;
      const activas = filteredData.filter((p) => p.status === 'ACTIVE' || p.estado === 'ACTIVE' || p.estado === 'SIEMBRA' || p.estado === 'CRECIMIENTO').length;
      const totalArea = filteredData.reduce((acc, p) => acc + (parseFloat(p.expectedYield || p.cantidadSembrada || 0) || 0), 0);
      return [
        { label: 'Ciclos Productivos', val: total, note: 'Registrados en el período' },
        { label: 'Producciones Activas', val: activas, note: 'En campo o levante' },
        { label: 'Área / Escala Total', val: `${totalArea.toLocaleString('es-CO')} ha/unid`, note: 'Superficie comprometida' },
      ];
    }
    if (reportType === 'finanzas') {
      const ingresos = filteredData.filter((t) => t.type === 'INGRESO' || t.tipo === 'INGRESO').reduce((sum, t) => sum + (t.amount || t.monto || 0), 0);
      const gastos = filteredData.filter((t) => t.type === 'GASTO' || t.tipo === 'GASTO').reduce((sum, t) => sum + (t.amount || t.monto || 0), 0);
      const balance = ingresos - gastos;
      return [
        { label: 'Ingresos Totales', val: formatCOP(ingresos), note: 'Ventas y entradas operativas', color: '#34d399' },
        { label: 'Gastos Totales', val: formatCOP(gastos), note: 'Costos e insumos', color: '#f87171' },
        { label: 'Margen Operativo Neto', val: formatCOP(balance), note: balance >= 0 ? 'Superávit en período' : 'Déficit en período', color: balance >= 0 ? '#34d399' : '#f87171' },
      ];
    }
    if (reportType === 'inventario') {
      const totalItems = filteredData.length;
      const bajoStock = filteredData.filter((i) => (i.stockMinimo || i.minAlertQuantity) && (i.quantity || i.cantidad || 0) <= (i.stockMinimo || i.minAlertQuantity)).length;
      const valorAproximado = filteredData.reduce((acc, i) => acc + ((i.quantity || i.cantidad || 0) * (i.costo || 0)), 0);
      return [
        { label: 'Total Insumos', val: totalItems, note: 'Referencias en inventario' },
        { label: 'Alertas de Stock', val: bajoStock, note: 'Requieren compra urgente', color: bajoStock > 0 ? '#f87171' : undefined },
        { label: 'Valoración en Bodega', val: formatCOP(valorAproximado), note: 'Inversión en almacén' },
      ];
    }
    if (reportType === 'fincas') {
      const totalFincas = filteredData.length;
      const totalHas = filteredData.reduce((acc, f) => acc + (f.hectareas || f.area || 0), 0);
      const totalLotes = filteredData.reduce((acc, f) => acc + (f.lotes?.length || 0), 0);
      return [
        { label: 'Predios Registrados', val: totalFincas, note: 'Fincas en organización' },
        { label: 'Área Total de Predios', val: `${totalHas.toLocaleString('es-CO')} ha`, note: 'Superficie catastral' },
        { label: 'Parcelas / Potreros', val: totalLotes, note: 'Lotes delimitados' },
      ];
    }
    if (reportType === 'personal') {
      const totalPersonal = filteredData.length;
      if (isSalaryPrivileged) {
        const totalNomina = filteredData.reduce((acc, p) => acc + (p.salario || p.dailyRate || 0), 0);
        const promedio = totalPersonal > 0 ? totalNomina / totalPersonal : 0;
        return [
          { label: 'Total Colaboradores', val: totalPersonal, note: 'Personal activo' },
          { label: 'Nómina Mensual', val: formatCOP(totalNomina), note: 'Presupuesto mano de obra' },
          { label: 'Salario Promedio', val: formatCOP(promedio), note: 'Por trabajador/mes' },
        ];
      } else {
        const conFinca = filteredData.filter((p) => p.fincaId || p.finca).length;
        const contratos = new Set(filteredData.map((p) => p.tipoContrato || 'TERMINO_FIJO')).size;
        return [
          { label: 'Total Colaboradores', val: totalPersonal, note: 'Personal activo' },
          { label: 'Asignados a Predio', val: conFinca, note: 'Con finca designada' },
          { label: 'Modalidades Contrato', val: contratos, note: 'Tipos contractuales' },
        ];
      }
    }
    if (reportType === 'maquinaria') {
      const total = filteredData.length;
      const operativas = filteredData.filter((m) => (m.estado || m.status) === 'OPERATIVO' || (m.estado || m.status) === 'OPERATIVE').length;
      const valorTotal = filteredData.reduce((acc, m) => acc + (m.valor || 0), 0);
      return [
        { label: 'Total Equipos y Maquinaria', val: total, note: 'Activos registrados' },
        { label: 'Maquinaria Operativa', val: `${operativas} / ${total}`, note: 'Listas para labor', color: '#34d399' },
        { label: 'Valoración Estimada de Flota', val: formatCOP(valorTotal), note: 'Patrimonio en maquinaria' },
      ];
    }
    return [];
  }, [reportType, filteredData, filteredAllData, isSalaryPrivileged]);

  // Build common headers and rows for single category
  const getTableData = (type: ReportCategory, data: any[]) => {
    let headers: string[] = [];
    let rows: any[][] = [];

    if (type === 'produccion') {
      headers = ['ID', 'Producción / Cultivo', 'Tipo Sector', 'Finca / Predio', 'Parcela / Lote', 'Estado', 'Fecha Inicio', 'Fecha Cosecha', 'Escala / Cantidad'];
      rows = data.map((p) => [
        p.id,
        p.name || p.variedad || p.tipo,
        p.tipo,
        p.finca?.nombre || `Finca #${p.fincaId}`,
        p.lote?.nombre || 'Lote Principal',
        p.estado || p.status,
        p.startDate || p.fechaInicio ? format(new Date(p.startDate || p.fechaInicio), 'dd/MM/yyyy') : '-',
        p.endDate || p.fechaEstimadaCosecha ? format(new Date(p.endDate || p.fechaEstimadaCosecha), 'dd/MM/yyyy') : '-',
        `${p.expectedYield || p.cantidadSembrada || 0} ${p.unit || p.unidadMedida || ''}`.trim(),
      ]);
    } else if (type === 'finanzas') {
      headers = ['ID', 'Tipo', 'Categoría', 'Monto (COP)', 'Finca', 'Fecha', 'Descripción'];
      rows = data.map((t) => [
        t.id,
        t.tipo || t.type,
        t.categoria || t.category,
        t.monto || t.amount || 0,
        t.finca?.nombre || `Finca #${t.fincaId}`,
        t.fecha || t.date ? format(new Date(t.fecha || t.date), 'dd/MM/yyyy') : '-',
        t.descripcion || t.description || 'Sin descripción',
      ]);
    } else if (type === 'inventario') {
      headers = ['ID', 'Producto / Insumo', 'Categoría', 'Finca / Bodega', 'Cantidad', 'Unidad', 'Stock Mínimo', 'Costo Unitario (COP)', 'Proveedor'];
      rows = data.map((i) => [
        i.id,
        i.nombre || i.name,
        i.categoria || i.category,
        i.finca?.nombre || `Finca #${i.fincaId}`,
        i.cantidad || i.quantity || 0,
        i.unidad || i.unit || 'unidades',
        i.stockMinimo || i.minAlertQuantity || 0,
        i.costo || 0,
        i.proveedor || 'N/A',
      ]);
    } else if (type === 'fincas') {
      headers = ['ID', 'Nombre del Predio', 'Ubicación Geográfica', 'Área Total (ha)', 'Tipo Suelo', 'Parcelas / Lotes'];
      rows = data.map((f) => [
        f.id,
        f.nombre || f.name,
        f.ubicacion || f.location,
        f.hectareas || f.area || 0,
        f.tipoSuelo || 'Franco',
        f.lotes?.length || 0,
      ]);
    } else if (type === 'personal') {
      headers = isSalaryPrivileged
        ? ['ID', 'Nombre Colaborador', 'Cargo / Función', 'Finca Asignada', 'Salario Mensual (COP)', 'Modalidad Contrato', 'Teléfono']
        : ['ID', 'Nombre Colaborador', 'Cargo / Función', 'Finca Asignada', 'Modalidad Contrato', 'Teléfono'];
      rows = data.map((p) => {
        const base = [
          p.id,
          p.nombre || p.name,
          p.cargo || p.role,
          p.finca?.nombre || `Finca #${p.fincaId}`,
        ];
        if (isSalaryPrivileged) {
          base.push(p.salario || p.dailyRate || 0);
        }
        base.push(
          p.tipoContrato || p.status || 'TERMINO_FIJO',
          p.telefono || p.phone || 'N/A'
        );
        return base;
      });
    } else if (type === 'maquinaria') {
      headers = ['ID', 'Nombre / Equipo', 'Tipo', 'Marca', 'Modelo', 'Placa / Serial', 'Estado', 'Finca Asignada', 'Horas Uso', 'Valor Estimado (COP)'];
      rows = data.map((m) => [
        m.id,
        m.nombre || m.name,
        m.tipo || 'EQUIPO',
        m.marca || '-',
        m.modelo || '-',
        m.placa || '-',
        m.estado || m.status || 'OPERATIVO',
        m.finca?.nombre || `Finca #${m.fincaId}`,
        m.horasUso || 0,
        m.valor || 0,
      ]);
    }

    return { headers, rows };
  };

  // Export current active view to Excel
  const exportToExcel = async () => {
    if (reportType === 'todo') {
      await exportAllToExcel();
      return;
    }

    if (filteredData.length === 0) {
      useToastStore.getState().warning('No hay datos disponibles para exportar con los filtros seleccionados.');
      return;
    }

    try {
      const {
        generateExcelReport,
        buildFincasModulo,
        buildProduccionesModulo,
        buildInventarioModulo,
        buildFinanzasModulo,
        buildPersonalModulo,
        buildMaquinariaModulo,
      } = await import('@/lib/excelGenerator');

      const orgName = user?.organizationName || 'AgroData';
      const fincaLabel =
        selectedFinca === 'ALL'
          ? 'Todas las fincas'
          : fincas.find((f) => String(f.id) === selectedFinca)?.nombre || selectedFinca;
      const periodoLabel = period.replace(/_/g, ' ');

      let modulo;
      if (reportType === 'fincas') modulo = buildFincasModulo(filteredData);
      else if (reportType === 'produccion') modulo = buildProduccionesModulo(filteredData);
      else if (reportType === 'inventario') modulo = buildInventarioModulo(filteredData);
      else if (reportType === 'finanzas') modulo = buildFinanzasModulo(filteredData);
      else if (reportType === 'personal') modulo = buildPersonalModulo(filteredData, isSalaryPrivileged);
      else modulo = buildMaquinariaModulo(filteredData);

      generateExcelReport({
        organizationName: orgName,
        periodo: periodoLabel,
        fincaLabel,
        kpis,
        modulos: [modulo],
      });

      useToastStore.getState().success('Reporte Excel generado exitosamente.');
    } catch (e) {
      console.error(e);
      useToastStore.getState().error('Error al generar el archivo Excel.');
    }
  };

  // ─── EXPORTAR ABSOLUTAMENTE TODO A EXCEL ────────────────────────────────────
  const exportAllToExcel = async () => {
    setExportingAll(true);
    useToastStore.getState().info('Consolidando todos los módulos para el archivo Excel maestro...');

    try {
      const {
        generateExcelReport,
        buildFincasModulo,
        buildProduccionesModulo,
        buildInventarioModulo,
        buildFinanzasModulo,
        buildPersonalModulo,
        buildMaquinariaModulo,
      } = await import('@/lib/excelGenerator');

      // Obtener datos de todos los módulos
      const full = allData.fincas.length > 0 ? allData : await fetchAllModules();

      const fList = filterDataset(full.fincas, true);
      const pList = filterDataset(full.producciones);
      const iList = filterDataset(full.inventario);
      const finList = filterDataset(full.finanzas);
      const perList = filterDataset(full.personal);
      const mList = filterDataset(full.maquinaria);

      const totalHas = fList.reduce((acc, f) => acc + (f.hectareas || f.area || 0), 0);
      const activas = pList.filter((p) => p.status === 'ACTIVE' || p.estado === 'ACTIVE').length;
      const bajoStock = iList.filter((i) => (i.stockMinimo || i.minAlertQuantity) && (i.quantity || i.cantidad || 0) <= (i.stockMinimo || i.minAlertQuantity)).length;
      const ingresos = finList.filter((t) => t.type === 'INGRESO' || t.tipo === 'INGRESO').reduce((sum, t) => sum + (t.amount || t.monto || 0), 0);
      const gastos = finList.filter((t) => t.type === 'GASTO' || t.tipo === 'GASTO').reduce((sum, t) => sum + (t.amount || t.monto || 0), 0);
      const balance = ingresos - gastos;

      const globalKpis: KpiItem[] = [
        { label: 'Predios y Hectáreas Totales', val: `${fList.length} predios (${totalHas.toFixed(1)} ha)`, note: 'Consolidado general' },
        { label: 'Ciclos Productivos Activos', val: `${activas} activos de ${pList.length}`, note: 'Producción agrícola y pecuaria' },
        { label: 'Insumos en Bodega / Alertas', val: `${iList.length} referencias (${bajoStock} alertas de stock)`, note: 'Almacén general' },
        { label: 'Margen Financiero Operativo', val: formatCOP(balance), note: `Ingresos: ${formatCOP(ingresos)} · Gastos: ${formatCOP(gastos)}` },
        { label: 'Personal y Colaboradores', val: `${perList.length} colaboradores`, note: 'Nómina y contratos' },
        { label: 'Flota de Maquinaria y Equipos', val: `${mList.length} equipos registrados`, note: 'Inventario de activos fijos' },
      ];

      const orgName = user?.organizationName || 'AgroData';
      const fincaLabel =
        selectedFinca === 'ALL'
          ? 'Todos los predios'
          : fincas.find((f) => String(f.id) === selectedFinca)?.nombre || selectedFinca;
      const periodoLabel = period.replace(/_/g, ' ');

      const modulos = [
        buildFincasModulo(fList),
        buildProduccionesModulo(pList),
        buildInventarioModulo(iList),
        buildFinanzasModulo(finList),
        buildPersonalModulo(perList, isSalaryPrivileged),
        buildMaquinariaModulo(mList),
      ];

      generateExcelReport({
        organizationName: orgName,
        periodo: periodoLabel,
        fincaLabel,
        kpis: globalKpis,
        modulos,
        customFileName: `AgroData_REPORTE_CONSOLIDADO_TOTAL_${format(new Date(), 'yyyy-MM-dd')}.xlsx`,
      });

      useToastStore.getState().success('¡Reporte Excel consolidado con ABSOLUTAMENTE TODO generado con éxito!');
    } catch (e) {
      console.error(e);
      useToastStore.getState().error('Error al exportar todos los datos a Excel.');
    } finally {
      setExportingAll(false);
      setShowExportMenu(false);
    }
  };

  // ─── EXPORTAR ABSOLUTAMENTE TODO A PDF ──────────────────────────────────────
  const exportAllToPDF = async () => {
    setExportingAll(true);
    useToastStore.getState().info('Generando informe ejecutivo consolidado en PDF...');

    try {
      const { generateConsolidatedPDFReport } = await import('@/lib/pdfGenerator');

      const full = allData.fincas.length > 0 ? allData : await fetchAllModules();

      const fList = filterDataset(full.fincas, true);
      const pList = filterDataset(full.producciones);
      const iList = filterDataset(full.inventario);
      const finList = filterDataset(full.finanzas);
      const perList = filterDataset(full.personal);
      const mList = filterDataset(full.maquinaria);

      const totalHas = fList.reduce((acc, f) => acc + (f.hectareas || f.area || 0), 0);
      const activas = pList.filter((p) => p.status === 'ACTIVE' || p.estado === 'ACTIVE').length;
      const bajoStock = iList.filter((i) => (i.stockMinimo || i.minAlertQuantity) && (i.quantity || i.cantidad || 0) <= (i.stockMinimo || i.minAlertQuantity)).length;
      const ingresos = finList.filter((t) => t.type === 'INGRESO' || t.tipo === 'INGRESO').reduce((sum, t) => sum + (t.amount || t.monto || 0), 0);
      const gastos = finList.filter((t) => t.type === 'GASTO' || t.tipo === 'GASTO').reduce((sum, t) => sum + (t.amount || t.monto || 0), 0);
      const balance = ingresos - gastos;

      const globalKpis: KpiItem[] = [
        { label: 'Predios Totales', val: `${fList.length} (${totalHas.toFixed(1)} ha)`, note: 'Superficie' },
        { label: 'Producciones Activas', val: `${activas} de ${pList.length}`, note: 'En campo' },
        { label: 'Insumos en Bodega', val: `${iList.length} (${bajoStock} alertas)`, note: 'Inventario' },
        { label: 'Margen Operativo', val: formatCOP(balance), note: 'Superávit / Déficit' },
        { label: 'Personal Activo', val: `${perList.length} colaboradores`, note: 'Mano de obra' },
        { label: 'Maquinaria y Flota', val: `${mList.length} equipos`, note: 'Operatividad' },
      ];

      const orgName = user?.organizationName || 'AgroData';
      const fincaLabel =
        selectedFinca === 'ALL'
          ? 'Todos los predios'
          : fincas.find((f) => String(f.id) === selectedFinca)?.nombre || selectedFinca;
      const periodoLabel = period.replace(/_/g, ' ');

      const tFincas = getTableData('fincas', fList);
      const tProds = getTableData('produccion', pList);
      const tInv = getTableData('inventario', iList);
      const tFin = getTableData('finanzas', finList);
      const tPer = getTableData('personal', perList);
      const tMaq = getTableData('maquinaria', mList);

      const sections = [
        { title: '1. Fincas y Predios Registrados', headers: tFincas.headers, rows: tFincas.rows.map((r) => r.map(String)) },
        { title: '2. Producciones Agrícolas y Ganaderas', headers: tProds.headers, rows: tProds.rows.map((r) => r.map(String)) },
        { title: '3. Insumos y Control de Inventario', headers: tInv.headers, rows: tInv.rows.map((r) => r.map(String)) },
        { title: '4. Registro Financiero y Costos', headers: tFin.headers, rows: tFin.rows.map((r) => r.map(String)) },
        { title: '5. Personal y Mano de Obra', headers: tPer.headers, rows: tPer.rows.map((r) => r.map(String)) },
        { title: '6. Maquinaria, Vehículos y Equipos', headers: tMaq.headers, rows: tMaq.rows.map((r) => r.map(String)) },
      ];

      generateConsolidatedPDFReport({
        organizationName: orgName,
        fincaLabel,
        periodLabel: periodoLabel,
        kpis: globalKpis,
        sections,
      });

      useToastStore.getState().success('¡Informe PDF maestro consolidado generado exitosamente!');
    } catch (e) {
      console.error(e);
      useToastStore.getState().error('Error al generar el informe PDF consolidado.');
    } finally {
      setExportingAll(false);
      setShowExportMenu(false);
    }
  };

  // Single category PDF trigger
  const handlePrint = async () => {
    if (reportType === 'todo') {
      await exportAllToPDF();
      return;
    }

    if (filteredData.length === 0) {
      useToastStore.getState().warning('No hay datos disponibles para exportar.');
      return;
    }

    try {
      const { generatePDFReport } = await import('@/lib/pdfGenerator');
      const orgName = user?.organizationName || 'AgroData';
      const fincaLabel =
        selectedFinca === 'ALL'
          ? 'Todas las fincas'
          : fincas.find((f) => String(f.id) === selectedFinca)?.nombre || selectedFinca;
      const periodoLabel = period.replace('_', ' ');
      const { headers, rows } = getTableData(reportType, filteredData);

      generatePDFReport({
        organizationName: orgName,
        reportType,
        fincaLabel,
        periodLabel: periodoLabel,
        kpis,
        headers,
        rows: rows.map((r) => r.map((c) => String(c))),
      });
      useToastStore.getState().success('Reporte PDF generado exitosamente.');
    } catch (e) {
      console.error(e);
      useToastStore.getState().error('Error al generar el PDF.');
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 60 }} className="report-container">
      {/* Top Header - Hidden on print */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 className="font-display" style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
              Centro de Reportes y Análisis Operativo
            </h1>
            <span
              style={{
                fontSize: 11,
                padding: '3px 8px',
                borderRadius: 20,
                background: 'rgba(16,185,129,0.15)',
                color: '#10b981',
                fontWeight: 600,
                border: '1px solid rgba(16,185,129,0.3)',
              }}
            >
              Auditoría Integral
            </span>
          </div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 4 }}>
            Consolida indicadores clave, audita predios y exporta reportes individuales o el consolidado total.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', position: 'relative' }}>
          {/* BOTÓN MAESTRO: EXPORTAR ABSOLUTAMENTE TODO */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={exportingAll || loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                transition: 'all 0.2s',
              }}
            >
              {exportingAll ? (
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <Sparkles size={16} />
              )}
              <span>Exportar Absolutamente Todo</span>
              <ChevronDown size={14} />
            </button>

            {/* Dropdown Options for Exporting Everything */}
            {showExportMenu && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '115%',
                  background: 'var(--color-surface, #1e293b)',
                  border: '1px solid var(--color-border, #334155)',
                  borderRadius: 12,
                  boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
                  padding: 8,
                  zIndex: 50,
                  minWidth: 280,
                }}
              >
                <div style={{ padding: '8px 12px', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Auditoría Maestra (6 Módulos)
                </div>

                <button
                  onClick={exportAllToExcel}
                  disabled={exportingAll}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-text)',
                    fontSize: 13,
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(16,185,129,0.12)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <Download size={16} color="#10b981" />
                  <div>
                    <div style={{ fontWeight: 600 }}>Excel Maestro (.xlsx)</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>6 hojas con fincas, cosechas, finanzas...</div>
                  </div>
                </button>

                <button
                  onClick={exportAllToPDF}
                  disabled={exportingAll}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-text)',
                    fontSize: 13,
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.12)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <FileText size={16} color="#f87171" />
                  <div>
                    <div style={{ fontWeight: 600 }}>PDF Ejecutivo Consolidado</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Portada, balance y tablas completas</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Botones para el módulo seleccionado */}
          <button
            onClick={handlePrint}
            disabled={loading || (reportType !== 'todo' && filteredData.length === 0)}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', fontSize: 13 }}
            title="Exportar vista activa a PDF"
          >
            <Printer size={16} />
            <span>PDF {reportType !== 'todo' ? `(${reportType})` : ''}</span>
          </button>

          <button
            onClick={exportToExcel}
            disabled={loading || (reportType !== 'todo' && filteredData.length === 0)}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', fontSize: 13 }}
            title="Exportar vista activa a Excel"
          >
            <Download size={16} />
            <span>Excel {reportType !== 'todo' ? `(${reportType})` : ''}</span>
          </button>
        </div>
      </div>

      {/* Category Tabs - Hidden on print */}
      <div
        className="no-print"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: 10,
          marginBottom: 24,
        }}
      >
        {availableTabs.map((tab) => {
          const active = reportType === tab.id;
          return (
            <div
              key={tab.id}
              onClick={() => {
                setReportType(tab.id as ReportCategory);
                setShowExportMenu(false);
              }}
              className="card"
              style={{
                padding: '12px 14px',
                cursor: 'pointer',
                borderRadius: 12,
                border: active ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
                background: active ? 'rgba(16, 185, 129, 0.08)' : 'var(--color-surface)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                transition: 'all 0.2s',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {tab.icon}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: active ? 'var(--color-primary)' : 'var(--color-text)' }}>
                  {tab.label}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {tab.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter Control Bar - Hidden on print */}
      <div
        className="no-print card"
        style={{
          padding: '14px 18px',
          marginBottom: 24,
          display: 'flex',
          gap: 14,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-muted)', fontSize: 13, fontWeight: 600 }}>
          <Filter size={15} />
          <span>Filtros de auditoría:</span>
        </div>

        {/* Finca filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>Predio:</span>
          <select
            className="input-field"
            style={{ width: 'auto', minWidth: 170, padding: '7px 12px', fontSize: 13 }}
            value={selectedFinca}
            onChange={(e) => setSelectedFinca(e.target.value)}
          >
            <option value="ALL">Todos los predios</option>
            {fincas.map((f) => (
              <option key={f.id} value={String(f.id)}>
                {f.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Period filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>Período:</span>
          <select
            className="input-field"
            style={{ width: 'auto', minWidth: 160, padding: '7px 12px', fontSize: 13 }}
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodOption)}
          >
            <option value="TODO">Histórico completo</option>
            <option value="MES_ACTUAL">Mes en curso</option>
            <option value="ULTIMOS_30_DIAS">Últimos 30 días</option>
            <option value="ANIO_ACTUAL">Año en curso</option>
          </select>
        </div>

        <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-text-subtle)' }}>
          {reportType === 'todo'
            ? `Consolidando 6 módulos operativos`
            : `${filteredData.length} registros filtrados`}
        </div>
      </div>

      {/* PRINT-ONLY HEADER */}
      <div className="print-only" style={{ display: 'none', marginBottom: 20, borderBottom: '2px solid #333', paddingBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px', color: '#111' }}>
              AGRODATA · REPORTE OPERATIVO
            </h1>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#333' }}>
              Organización: {user?.organizationName || 'AgroData'}
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 11, color: '#555' }}>
            <div>Fecha de Emisión: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}</div>
            <div>Tipo: {reportType.toUpperCase()}</div>
            <div>
              Predio:{' '}
              {selectedFinca === 'ALL'
                ? 'Todos los predios'
                : fincas.find((f) => String(f.id) === selectedFinca)?.nombre || selectedFinca}
            </div>
            <div>Período: {period.replace('_', ' ')}</div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="dashboard-kpi-grid kpi-grid" style={{ marginBottom: 24 }}>
        {kpis.map((kpi, idx) => (
          <div
            key={idx}
            className="card"
            style={{
              padding: '16px 18px',
              borderLeft: '4px solid var(--color-primary)',
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4, fontWeight: 500 }}>
              {kpi.label}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: kpi.color || 'var(--color-text)', marginBottom: 4 }}>
              {kpi.val}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>{kpi.note}</div>
          </div>
        ))}
      </div>

      {/* VISTA CONSOLIDADA GLOBAL (CUANDO SELECCIONA 'TODO') */}
      {reportType === 'todo' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Banner de descarga total */}
          <div
            className="card"
            style={{
              padding: '24px',
              background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(59,130,246,0.05) 100%)',
              border: '1.5px solid rgba(16,185,129,0.3)',
              borderRadius: 16,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Sparkles size={20} color="#10b981" />
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                  Auditoría General Agropecuaria (Todos los Módulos)
                </h2>
              </div>
              <p style={{ color: 'var(--color-text-muted)', fontSize: 13, margin: 0, maxWidth: 650 }}>
                Este reporte agrupa la totalidad de datos operativos: fincas, parcelas, cosechas, insumos en bodega,
                movimientos contables, nómina de personal y flota de maquinaria en una sola descarga estructurada.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={exportAllToExcel}
                disabled={exportingAll}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', fontWeight: 600 }}
              >
                <Download size={16} />
                <span>Descargar Excel Maestro (.xlsx)</span>
              </button>
              <button
                onClick={exportAllToPDF}
                disabled={exportingAll}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', fontWeight: 600 }}
              >
                <FileText size={16} />
                <span>Descargar PDF Maestro</span>
              </button>
            </div>
          </div>

          {/* Tarjetas resumen de cada módulo */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {/* Fincas */}
            <div className="card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MapPin size={18} color="#a78bfa" />
                  <span style={{ fontWeight: 600, fontSize: 14 }}>Fincas y Predios</span>
                </div>
                <span className="badge badge-info">{filteredAllData.fincas.length} registros</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 12 }}>
                {filteredAllData.fincas.map((f) => f.nombre).slice(0, 3).join(', ')}
                {filteredAllData.fincas.length > 3 ? '...' : ''}
              </p>
              <button
                onClick={() => setReportType('fincas')}
                style={{ background: 'none', border: 'none', color: '#a78bfa', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Ver detalle de predios →
              </button>
            </div>

            {/* Producciones */}
            <div className="card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sprout size={18} color="#fbbf24" />
                  <span style={{ fontWeight: 600, fontSize: 14 }}>Producciones y Cosechas</span>
                </div>
                <span className="badge badge-warning">{filteredAllData.producciones.length} ciclos</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 12 }}>
                {filteredAllData.producciones.map((p) => p.name || p.variedad || p.tipo).slice(0, 3).join(', ')}
                {filteredAllData.producciones.length > 3 ? '...' : ''}
              </p>
              <button
                onClick={() => setReportType('produccion')}
                style={{ background: 'none', border: 'none', color: '#fbbf24', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Ver detalle de producción →
              </button>
            </div>

            {/* Inventario */}
            <div className="card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Package size={18} color="#60a5fa" />
                  <span style={{ fontWeight: 600, fontSize: 14 }}>Inventario y Almacén</span>
                </div>
                <span className="badge badge-info">{filteredAllData.inventario.length} insumos</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 12 }}>
                {filteredAllData.inventario.map((i) => i.nombre).slice(0, 3).join(', ')}
                {filteredAllData.inventario.length > 3 ? '...' : ''}
              </p>
              <button
                onClick={() => setReportType('inventario')}
                style={{ background: 'none', border: 'none', color: '#60a5fa', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Ver almacén e insumos →
              </button>
            </div>

            {/* Finanzas */}
            <div className="card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <DollarSign size={18} color="#34d399" />
                  <span style={{ fontWeight: 600, fontSize: 14 }}>Finanzas y Movimientos</span>
                </div>
                <span className="badge badge-success">{filteredAllData.finanzas.length} transacciones</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 12 }}>
                Flujo de caja, compras operativas, ventas de cosecha e ingresos registrados.
              </p>
              <button
                onClick={() => setReportType('finanzas')}
                style={{ background: 'none', border: 'none', color: '#34d399', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Ver balance financiero →
              </button>
            </div>

            {/* Personal */}
            <div className="card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Users size={18} color="#f472b6" />
                  <span style={{ fontWeight: 600, fontSize: 14 }}>Personal y Colaboradores</span>
                </div>
                <span className="badge badge-info">{filteredAllData.personal.length} colaboradores</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 12 }}>
                Mano de obra, asignaciones por finca y contratos del equipo operativo.
              </p>
              <button
                onClick={() => setReportType('personal')}
                style={{ background: 'none', border: 'none', color: '#f472b6', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Ver nómina y personal →
              </button>
            </div>

            {/* Maquinaria */}
            <div className="card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Wrench size={18} color="#f59e0b" />
                  <span style={{ fontWeight: 600, fontSize: 14 }}>Maquinaria y Equipos</span>
                </div>
                <span className="badge badge-warning">{filteredAllData.maquinaria.length} equipos</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 12 }}>
                Tractores, implementos agrícolas, vehículos y control de mantenimientos.
              </p>
              <button
                onClick={() => setReportType('maquinaria')}
                style={{ background: 'none', border: 'none', color: '#f59e0b', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Ver flota de maquinaria →
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* VISTA TABULAR DE MÓDULO INDIVIDUAL */
        <div className="card report-table-card" style={{ overflow: 'hidden', padding: 0 }}>
          {loading ? (
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 48, borderRadius: 8 }} />
              ))}
            </div>
          ) : filteredData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-subtle)' }}>
              <FileText size={44} style={{ margin: '0 auto 14px', opacity: 0.2 }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>
                No se encontraron registros con los filtros aplicados
              </p>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                Intenta seleccionar otro predio o cambiar el rango de fecha.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                {/* PRODUCCIÓN TABLE */}
                {reportType === 'produccion' && (
                  <>
                    <thead>
                      <tr>
                        <th>Producción / Cultivo</th>
                        <th>Sector</th>
                        <th>Predio</th>
                        <th>Parcela</th>
                        <th>Estado</th>
                        <th>Fecha Siembra</th>
                        <th>Fecha Cosecha</th>
                        <th style={{ textAlign: 'right' }}>Área / Escala</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((p) => (
                        <tr key={p.id}>
                          <td style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                            {p.name || p.variedad || p.tipo}
                          </td>
                          <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{p.tipo}</td>
                          <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{p.finca?.nombre || `Finca #${p.fincaId}`}</td>
                          <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{p.lote?.nombre || 'Lote Principal'}</td>
                          <td>
                            <span className="badge badge-info" style={{ fontSize: 11 }}>
                              {p.estado || p.status}
                            </span>
                          </td>
                          <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                            {p.startDate || p.fechaInicio ? format(new Date(p.startDate || p.fechaInicio), 'dd/MM/yyyy') : '-'}
                          </td>
                          <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                            {p.endDate || p.fechaEstimadaCosecha ? format(new Date(p.endDate || p.fechaEstimadaCosecha), 'dd/MM/yyyy') : '-'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>
                            {p.expectedYield || p.cantidadSembrada || 0} {p.unit || p.unidadMedida || 'ha'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

                {/* FINANZAS TABLE */}
                {reportType === 'finanzas' && (
                  <>
                    <thead>
                      <tr>
                        <th>Tipo</th>
                        <th>Categoría</th>
                        <th>Predio</th>
                        <th>Fecha</th>
                        <th>Descripción</th>
                        <th style={{ textAlign: 'right' }}>Monto (COP)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((t) => {
                        const isIngreso = t.tipo === 'INGRESO' || t.type === 'INGRESO';
                        return (
                          <tr key={t.id}>
                            <td>
                              <span className={`badge ${isIngreso ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: 11 }}>
                                {isIngreso ? 'Ingreso' : 'Gasto'}
                              </span>
                            </td>
                            <td style={{ fontWeight: 600, color: 'var(--color-text)' }}>{t.categoria || t.category}</td>
                            <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{t.finca?.nombre || `Finca #${t.fincaId}`}</td>
                            <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                              {t.fecha || t.date ? format(new Date(t.fecha || t.date), 'dd/MM/yyyy') : '-'}
                            </td>
                            <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{t.descripcion || t.description || '-'}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: isIngreso ? '#34d399' : '#f87171' }}>
                              {formatCOP(t.monto || t.amount || 0)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </>
                )}

                {/* INVENTARIO TABLE */}
                {reportType === 'inventario' && (
                  <>
                    <thead>
                      <tr>
                        <th>Insumo / Producto</th>
                        <th>Categoría</th>
                        <th>Ubicación / Predio</th>
                        <th>Existencia</th>
                        <th>Stock Mín.</th>
                        <th>Costo Unitario</th>
                        <th>Proveedor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((i) => (
                        <tr key={i.id}>
                          <td style={{ fontWeight: 600, color: 'var(--color-text)' }}>{i.nombre || i.name}</td>
                          <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{i.categoria || i.category}</td>
                          <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{i.finca?.nombre || `Finca #${i.fincaId}`}</td>
                          <td style={{ fontWeight: 600 }}>
                            {i.cantidad || i.quantity || 0} <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 400 }}>{i.unidad || i.unit}</span>
                          </td>
                          <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{i.stockMinimo || i.minAlertQuantity || '-'}</td>
                          <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{i.costo ? formatCOP(i.costo) : '-'}</td>
                          <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{i.proveedor || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

                {/* FINCAS TABLE */}
                {reportType === 'fincas' && (
                  <>
                    <thead>
                      <tr>
                        <th>Nombre del Predio</th>
                        <th>Ubicación Geográfica</th>
                        <th>Área Total</th>
                        <th>Tipo Suelo</th>
                        <th style={{ textAlign: 'right' }}>Parcelas / Lotes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((f) => (
                        <tr key={f.id}>
                          <td style={{ fontWeight: 600, color: 'var(--color-text)' }}>{f.nombre || f.name}</td>
                          <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{f.ubicacion || f.location}</td>
                          <td style={{ fontWeight: 600 }}>{f.hectareas || f.area || 0} ha</td>
                          <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{f.tipoSuelo || 'Franco'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{f.lotes?.length || 0} parcelas</td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

                {/* PERSONAL TABLE */}
                {reportType === 'personal' && (
                  <>
                    <thead>
                      <tr>
                        <th>Colaborador</th>
                        <th>Cargo / Función</th>
                        <th>Predio Asignado</th>
                        <th>Contrato</th>
                        <th>Teléfono</th>
                        {isSalaryPrivileged && <th style={{ textAlign: 'right' }}>Salario Mensual</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((p) => (
                        <tr key={p.id}>
                          <td style={{ fontWeight: 600, color: 'var(--color-text)' }}>{p.nombre || p.name}</td>
                          <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{p.cargo || p.role}</td>
                          <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{p.finca?.nombre || `Finca #${p.fincaId}`}</td>
                          <td style={{ fontSize: 12 }}>{p.tipoContrato || p.status || 'TERMINO_FIJO'}</td>
                          <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{p.telefono || p.phone || '-'}</td>
                          {isSalaryPrivileged && (
                            <td style={{ textAlign: 'right', fontWeight: 700, color: '#4ade80' }}>
                              {p.salario || p.dailyRate ? formatCOP(p.salario || p.dailyRate) : '-'}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

                {/* MAQUINARIA TABLE */}
                {reportType === 'maquinaria' && (
                  <>
                    <thead>
                      <tr>
                        <th>Equipo / Máquina</th>
                        <th>Tipo</th>
                        <th>Marca y Modelo</th>
                        <th>Placa / Serie</th>
                        <th>Predio Asignado</th>
                        <th>Estado</th>
                        <th>Horas Uso</th>
                        <th style={{ textAlign: 'right' }}>Valor Estimado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((m) => (
                        <tr key={m.id}>
                          <td style={{ fontWeight: 600, color: 'var(--color-text)' }}>{m.nombre || m.name}</td>
                          <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{m.tipo || 'EQUIPO'}</td>
                          <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                            {[m.marca, m.modelo].filter(Boolean).join(' ') || '-'}
                          </td>
                          <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{m.placa || '-'}</td>
                          <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                            {m.finca?.nombre || (m.fincaId ? `Finca #${m.fincaId}` : 'Sin asignar')}
                          </td>
                          <td>
                            <span className="badge badge-info" style={{ fontSize: 11 }}>
                              {m.estado || m.status || 'OPERATIVO'}
                            </span>
                          </td>
                          <td style={{ fontSize: 13 }}>{m.horasUso ? `${m.horasUso} hrs` : '-'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>
                            {m.valor ? formatCOP(m.valor) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}
              </table>
            </div>
          )}
        </div>
      )}

      {/* PRINT-ONLY FOOTER */}
      <div
        className="print-only"
        style={{
          display: 'none',
          marginTop: 30,
          textAlign: 'center',
          fontSize: 10,
          color: '#777',
          borderTop: '1px solid #ccc',
          paddingTop: 8,
        }}
      >
        AgroData Cesar · Plataforma de Gestión Agropecuaria Integral · Documento generado automáticamente
      </div>

      {/* CSS Rules for Professional Printing */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media print {
          body {
            background: #fff !important;
            color: #000 !important;
          }
          .no-print, header, aside, .desktop-sidebar, button, nav {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .report-container {
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .card {
            background: #fff !important;
            border: 1px solid #ddd !important;
            box-shadow: none !important;
            color: #000 !important;
          }
          .data-table th {
            background: #f1f5f9 !important;
            color: #111 !important;
            border-bottom: 2px solid #ccc !important;
            font-size: 11px !important;
            padding: 6px 8px !important;
          }
          .data-table td {
            color: #222 !important;
            border-bottom: 1px solid #eee !important;
            font-size: 11px !important;
            padding: 6px 8px !important;
          }
          .kpi-grid {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 10px !important;
            margin-bottom: 16px !important;
          }
          .kpi-grid .card {
            padding: 10px 14px !important;
            border: 1px solid #ccc !important;
          }
          @page {
            size: landscape;
            margin: 1.2cm;
          }
        }
      `}</style>
    </div>
  );
}
