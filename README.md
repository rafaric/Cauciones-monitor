# 📊 Monitor de Cauciones - Web App

Aplicación web full-stack para monitorear cotizaciones de cauciones en tiempo real desde Portfolio Personal, con notificaciones automáticas cuando la tasa supera un umbral configurado.

## 🚀 Deploy Rápido

**Gratis en 5 minutos:** [Ver guía completa de deployment](DEPLOYMENT.md)

- Backend: Railway (free tier)
- Frontend: Vercel (free tier)
- 100% automático desde GitHub

## 🎯 Características

- ✅ Scraping real de cotizaciones desde Portfolio Personal con Puppeteer
- ✅ API REST con Express y cache inteligente
- ✅ Frontend moderno con React + Vite
- ✅ **Notificaciones con umbrales mínimo y máximo configurables**
- ✅ **Notificaciones por Telegram** 📱 (iOS + Android, sin navegador abierto)
- ✅ **Persistencia de configuración entre sesiones (localStorage)**
- ✅ **Gráfico de evolución diaria (11:00 - 17:30)**
- ✅ Actualización automática cada 5 minutos
- ✅ Interfaz responsive y fácil de usar

## 🛠️ Tecnologías

### Backend
- **Node.js** v18+
- **Express** - Framework web
- **Puppeteer** - Scraping con JavaScript rendering
- **CORS** - Middleware para cross-origin requests

### Frontend
- **React** 18
- **Vite** - Build tool y dev server
- **Recharts** - Gráficos interactivos
- **Web Notifications API** - Notificaciones del navegador

## 📦 Instalación

### Prerequisitos
- Bun v1.0 o superior (https://bun.sh)

### Backend

```bash
cd backend
bun install
```

### Frontend

```bash
cd frontend
bun install
```

## 🚀 Uso

### Opción 1: Ejecutar ambos servidores simultáneamente (Recomendado)

Desde el directorio raíz del proyecto:

```bash
bun run dev
```

Esto iniciará automáticamente:
- **Backend** en http://localhost:3000
- **Frontend** en http://localhost:5173

### Configurar Telegram (Opcional pero Recomendado) 📱

Para recibir notificaciones en tu celular:

1. Sigue la guía completa en: **[TELEGRAM.md](TELEGRAM.md)**
2. Resumen rápido:
   - Crea un bot con @BotFather en Telegram
   - Obtén tu Chat ID con @userinfobot
   - Copia `backend/.env.example` a `backend/.env`
   - Agrega tu `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID`
   - Reinicia el servidor

### Opción 2: Ejecutar servidores por separado

**Terminal 1 - Backend:**
```bash
cd backend
bun run start
```

**Terminal 2 - Frontend:**
```bash
cd frontend
bun run dev
```

### 3. Configurar notificaciones

1. Abre la aplicación en tu navegador
2. Cuando se solicite, haz clic en "Habilitar Notificaciones"
3. Acepta los permisos en tu navegador
4. Configura el **umbral mínimo** (ejemplo: 35%) - Te alertará cuando la tasa baje de este valor
5. Configura el **umbral máximo** (ejemplo: 50%) - Te alertará cuando la tasa supere este valor
6. Los umbrales se guardan automáticamente y persisten entre sesiones

## 📡 API Endpoints

### `GET /api/caucion`
Obtiene la cotización actual de la caución a 1 día.

**Respuesta:**
```json
{
  "plazo": "1 día",
  "tasa": 65.89,
  "fecha": "2026-01-14T10:30:00.000Z",
  "simulado": false,
  "fromCache": false
}
```

### `GET /api/health`
Health check del servidor.

**Respuesta:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-14T10:30:00.000Z",
  "

### `POST /api/telegram/test`
Envía un mensaje de prueba a Telegram.

**Respuesta:**
```json
{
  "mensaje": "Mensaje de prueba enviado correctamente"
}
```

### `POST /api/telegram/alerta`
Envía una alerta manual a Telegram.

**Body:**
```json
{
  "tasa": 52.5,
  "tipo": "alta",
  "umbralMin": 35,
  "umbralMax": 50
}
```cacheActive": true
}
```

### `POST /api/cache/clear`
Limpia el cache manualmente.

**Respuesta:**
```json
{
  "mensaje": "Cache limpiado correctamente"
}
```

## ⚙️ Configuración

### Backend
- **Puerto:** Configurable vía variable de entorno `PORT` (default: 3000)
- **Cache:** 2 minutos de duración (configurable en `src/index.js`)

### Frontend
- **URL delmínimo por defecto:** 35% (configurable en `UMBRAL_MIN_DEFAULT`)
- **Umbral máximo por defecto:** 50% (configurable en `UMBRAL_MAX_DEFAULT`)
- **Persistencia:** Los umbrales se guardan en localStorage del navegadorURL`)
- **Intervalo de consulta:** 5 minutos (configurable en `INTERVALO_CONSULTA`)
- **Umbral por defecto:** 40% (configurable en `UMBRAL_DEFAULT`)

## 🎨 Personalización

### Cambiar el intervalo de actualización

En `frontend/src/App.jsx`, modifica:
```javascript
const INTERVALO_CONSULTA = 5 * 60 * 1000; // 5 minutos
```

### Cambiar el umbral por defecto

En `frontend/src/App.jsx`, modifica:
```javascript
const UMBRAL_DEFAULT = 40; // Tasa por defecto
```

### Ajustar el scraper

Si la estructura de la página de Portfolio Personal cambia, edita el selector en `backend/src/scraper.js`.

## 📝 Estructura del Proyecto

```
Cauciones/
├── backend/
│   ├── src/
│   │   ├── index.js       # Servidor Express
│   │   └── scraper.js     # Lógica de scraping
│   ├── package.json
│   └── .gitignore
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # Componente principal
│   │   ├── App.css        # Estilos
│   │   └── main.jsx       # Entry point
│   ├── package.json
│   └── .gitignore
└── README.md
```

## 🐛 Troubleshooting

### Las notificaciones no funcionan
1. Verifica que hayas dado permisos en tu navegador
2. Asegúrate de estar usando HTTPS en producción (o localhost en desarrollo)
3. Revisa la consola del navegador para errores

### Error de CORS
1. Verifica que el backend esté corriendo en `http://localhost:3000`
2. Asegúrate de que CORS esté habilitado en `backend/src/index.js`

### El scraping falla
1. Verifica que la URL de Portfolio Personal sea correcta
2. La estructura de la página puede haber cambiado - revisa `backend/src/scraper.js`
3. Puede haber bloqueos por User-Agent - el scraper ya incluye uno

## 🔮 Mejoras Futuras

- [ ] Service Workers para notificaciones con la app cerrada
- [ ] Base de datos para almacenar histórico de varios días
- [ ] Múltiples plazos de caución (no solo 1 día)
- [ ] Configuración de múltiples umbrales
- [ ] Exportar datos históricos a CSV/Excel
- [ ] Dark/Light mode toggle
- [ ] PWA (Progressive Web App)
- [ ] Comparación de tasas entre diferentes días
- [ ] Alertas por email o Telegram

## 📄 Licencia

MIT

## 👨‍💻 Autor

Rafael Rico

---

**¡Importante!** Esta herramienta es solo para fines educativos. Verifica siempre la información en fuentes oficiales antes de tomar decisiones de inversión.
