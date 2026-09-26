# AgroData — Guía de Integración con n8n

Esta guía documenta la integración de **n8n como motor de automatizaciones** con la arquitectura de **AgroData** (NestJS + Prisma + Next.js).

---

## 1. Arquitectura del Sistema

```
AgroData Frontend (Next.js)
        │
        ▼ (JWT)
NestJS Backend (API AgroData)
  ├── NotificationsModule (Persistencia de alertas en DB)
  ├── AutomationsModule   (Control y logs de ejecución)
  └── N8nWebhookController (Recepción y emisión segura)
        ▲               │
        │ (HMAC SHA-256)│ (Webhook / Eventos)
        │               ▼
   n8n Automation Engine (http://localhost:5678)
     ├── AgroData - Inventory Low Stock
     ├── AgroData - Weather Monitor
     ├── AgroData - Financial Summary
     ├── AgroData - Production Reminders
     ├── AgroData - AgroIA Insights
     └── AgroData - Subscription Monitor
```

> **Principio de Diseño:** NestJS es el cerebro que valida roles, permisos, multi-tenancy y persistencia. n8n es el motor de orquestación externa. Si n8n está apagado o inaccesible, **las funciones principales de AgroData continúan operando con total normalidad**.

---

## 2. Puesta en Marcha de n8n

### Opción A: Mediante Docker Compose (Recomendado)

En la raíz del proyecto, el archivo `docker-compose.yml` ya incluye el servicio de n8n preconfigurado:

```bash
# Iniciar n8n en segundo plano
docker compose up -d n8n
```

Acceso al panel web de n8n:
- **URL:** [http://localhost:5678](http://localhost:5678)
- **Usuario:** `admin`
- **Contraseña:** `agrodata2024`

### Opción B: Ejecución Local con npx

Si no dispones de Docker:
```bash
npx n8n
```

---

## 3. Variables de Entorno

### Backend (`backend/.env`)

```env
# n8n Automation Engine
N8N_BASE_URL=http://localhost:5678
N8N_API_KEY=                         # Generada en n8n Settings > Public API
N8N_WEBHOOK_SECRET=agrodata_n8n_secret_2024
```

### Contenedor n8n (`docker-compose.yml`)

```env
AGRODATA_BACKEND_URL=http://host.docker.internal:3001
N8N_WEBHOOK_SECRET=agrodata_n8n_secret_2024
DEFAULT_ORG_ID=19918424-c9bb-49d2-bf5e-3878edd08cc9
```

---

## 4. Workflows Disponibles e Importación

Los workflows listos para usar se encuentran en la carpeta `n8n/workflows/`:

| Archivo | Nombre en n8n | Frecuencia / Trigger |
|---|---|---|
| `AgroData_Inventory_Low_Stock.json` | AgroData - Inventory Low Stock | Cada 1 hora / Webhook |
| `AgroData_Weather_Monitor.json` | AgroData - Weather Monitor | Diario 07:00 AM / Webhook |
| `AgroData_Financial_Summary.json` | AgroData - Financial Summary | Cada lunes 08:00 AM / Webhook |
| `AgroData_Production_Reminders.json` | AgroData - Production Reminders | Diario 06:00 AM / Webhook |
| `AgroData_AgroIA_Insights.json` | AgroData - AgroIA Insights | Cada lunes 09:00 AM / Webhook |
| `AgroData_Subscription_Monitor.json` | AgroData - Subscription Monitor | Diario 08:30 AM / Webhook |

### Cómo Importar en n8n:
1. Abre [http://localhost:5678](http://localhost:5678).
2. Haz clic en **Workflows** > **Add Workflow**.
3. En el menú superior derecho (tres puntos `...`), selecciona **Import from File**.
4. Selecciona cualquiera de los archivos `.json` de `n8n/workflows/`.
5. Activa el workflow cambiando el switch superior a **Active**.

---

## 5. Endpoints de Comunicación Segura (NestJS ↔ n8n)

Todos los endpoints exigen la firma de seguridad en el header:
`X-Hub-Signature-256: <hmac_sha256_o_secret>`

### 1. Inyectar Notificación desde n8n
`POST /webhooks/n8n/notify`

**Body:**
```json
{
  "organizationId": "uuid-de-la-organizacion",
  "type": "INVENTORY", // WEATHER | PRODUCTION | FINANCE | AI | SUBSCRIPTION | SYSTEM
  "title": "Stock Bajo: Fertilizante NPK",
  "message": "Quedan 5 kg en la Finca La Esperanza (mínimo: 10 kg).",
  "priority": "HIGH", // LOW | NORMAL | HIGH | CRITICAL
  "metadata": { "itemId": "uuid", "quantity": 5 }
}
```

### 2. Registrar Resultado de Automatización
`POST /webhooks/n8n/automation-result`

**Body:**
```json
{
  "automationId": "uuid-de-automatizacion",
  "organizationId": "uuid-de-organizacion",
  "status": "SUCCESS", // SUCCESS | FAILED
  "result": "Procesados 4 productos con existencias bajas",
  "durationMs": 420,
  "triggeredBy": "N8N"
}
```

### 3. Obtener Datos para Procesamiento en n8n

| Endpoint | Datos devueltos |
|---|---|
| `POST /webhooks/n8n/data/inventory-alerts` | Productos con stock <= mínimo |
| `POST /webhooks/n8n/data/weather-monitor` | Coordenadas reales de las fincas de la org |
| `POST /webhooks/n8n/data/financial-summary` | Ingresos, gastos y balances calculados |
| `POST /webhooks/n8n/data/production-reminders` | Producciones activas y fechas estimadas |
| `POST /webhooks/n8n/data/ai-context` | Contexto global real para síntesis con IA |
| `POST /webhooks/n8n/data/subscription-status` | Plan y estado de suscripción de la org |

---

## 6. Multi-Tenancy y Seguridad

1. **Aislamiento Estricto:** Cada solicitud desde n8n debe incluir `organizationId`. El backend valida en la base de datos que la organización exista y esté activa antes de procesar o retornar datos.
2. **Deduplicación:** El backend cuenta con un filtro inteligente de 60 minutos. Si n8n intenta enviar la misma alerta dentro de la hora, el backend la suprime automáticamente para evitar saturar al productor.
3. **Firmas Criptográficas:** Todos los mensajes validan `X-Hub-Signature-256` utilizando el secreto compartido `N8N_WEBHOOK_SECRET`.

---

## 7. Panel de Control en AgroData

En la aplicación web (`/dashboard/automatizaciones`):
- Los administradores y propietarios pueden ver todas las automatizaciones disponibles.
- Activar o desactivar cualquier automatización mediante un toggle en tiempo real.
- Hacer clic en **"Ejecutar Ahora"** para forzar una comprobación inmediata.
- Consultar el **Historial de Ejecuciones** con tiempos de respuesta y detalles de resultados.
- Ver las notificaciones generadas en tiempo real mediante el **Centro de Notificaciones** en la barra superior.

---

## 8. Solución de Problemas Comunes

| Problema | Causa Probable | Solución |
|---|---|---|
| `Invalid webhook signature` | El header `X-Hub-Signature-256` no coincide | Verifica que `N8N_WEBHOOK_SECRET` sea idéntico en el backend y en las variables de n8n. |
| `ECONNREFUSED host.docker.internal` | n8n no puede comunicarse con el host en Windows | Asegúrate de usar `host.docker.internal:3001` dentro de contenedores Docker en Windows/Mac. En Linux usa la IP del host. |
| Notificación no aparece | Deduplicación activa | El sistema suprime alertas idénticas dentro de una ventana de 60 minutos para evitar spam. |
| `Organization not found` | ID inválido en el payload | n8n debe enviar un UUID válido existente en la tabla `Organization`. |
