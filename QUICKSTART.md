# 🚀 Quick Start - Deploy Gratuito

## Paso 1: GitHub (2 min)

```bash
cd /Users/rafaric/proyectos/Cauciones
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/TU_USUARIO/cauciones-monitor.git
git push -u origin main
```

## Paso 2: Railway - Backend (3 min)

1. Ve a [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Selecciona `cauciones-monitor`
4. **Configuración (importante):**
   - Ve a Settings → Build
   - Root Directory: deja vacío (usa nixpacks.toml automáticamente)
5. **Variables de entorno:**
   - `PORT=3000`
   - `TELEGRAM_BOT_TOKEN=8543457906:AAGCy0041_ZOxL_WeoGsZQexMeCpyGO6Qx0`
   - `TELEGRAM_CHAT_ID=875428409`
6. Guarda y espera el deploy (~3 min)
7. Copia tu URL: `https://xxx.up.railway.app`

## Paso 3: Vercel - Frontend (2 min)

1. Ve a [vercel.com](https://vercel.com)
2. Add New → Project
3. Importa `cauciones-monitor`
4. Framework: Vite, Root: `frontend`
5. Variable de entorno:
   - `VITE_API_URL=https://xxx.up.railway.app` (tu URL de Railway)
6. Deploy

## Paso 4: Actualizar CORS

En Railway → Variables → Agrega:
- `FRONTEND_URL=https://xxx.vercel.app` (tu URL de Vercel)

## ✅ ¡Listo!

Tu app está en producción. Abre tu URL de Vercel y prueba.

**Comandos Telegram:**
- `/tasa` - Ver cotización
- `/config` - Ver umbrales
- `/setmin 40` - Configurar mínimo
- `/setmax 55` - Configurar máximo

**Documentación completa:** [DEPLOYMENT.md](DEPLOYMENT.md)
