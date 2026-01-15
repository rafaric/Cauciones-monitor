# 🚀 Guía de Deployment Gratuito

Esta guía te ayudará a deployar tu aplicación de monitoreo de cauciones completamente gratis.

## 📋 Requisitos Previos

- Cuenta de [GitHub](https://github.com)
- Cuenta de [Railway](https://railway.app) (login con GitHub)
- Cuenta de [Vercel](https://vercel.com) (login con GitHub)

## 🔧 Paso 1: Preparar el Repositorio

1. **Inicializa Git (si no lo hiciste):**

```bash
cd /Users/rafaric/proyectos/Cauciones
git init
git add .
git commit -m "Initial commit"
```

2. **Crea un repositorio en GitHub:**
   - Ve a [github.com/new](https://github.com/new)
   - Nombre: `cauciones-monitor`
   - Privado o Público (tu elección)
   - NO inicialices con README

3. **Sube el código:**

```bash
git remote add origin https://github.com/TU_USUARIO/cauciones-monitor.git
git branch -M main
git push -u origin main
```

## 🚂 Paso 2: Deploy del Backend en Railway

### 2.1 Crear Proyecto

1. Ve a [railway.app](https://railway.app)
2. Click en **"New Project"**
3. Selecciona **"Deploy from GitHub repo"**
4. Elige tu repositorio `cauciones-monitor`
5. Railway detectará automáticamente que es Node.js

### 2.2 Configurar Variables de Entorno

En el dashboard de Railway:

1. Ve a tu proyecto → **Variables**
2. Agrega estas variables:

```
PORT=3000
TELEGRAM_BOT_TOKEN=8543457906:AAGCy0041_ZOxL_WeoGsZQexMeCpyGO6Qx0
TELEGRAM_CHAT_ID=875428409
```

### 2.3 Configurar Build

1. Ve a **Settings** → **Build**
2. Root Directory: `backend`
3. Build Command: `npm install`
4. Start Command: `node src/index.js`

### 2.4 Obtener la URL del Backend

Después del deploy:
1. Railway te dará una URL como: `https://tu-proyecto.up.railway.app`
2. **Copia esta URL** (la necesitarás para el frontend)

## ⚡ Paso 3: Deploy del Frontend en Vercel

### 3.1 Crear Proyecto

1. Ve a [vercel.com](https://vercel.com)
2. Click en **"Add New..."** → **"Project"**
3. Importa tu repositorio `cauciones-monitor`
4. Configuración:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

### 3.2 Agregar Variable de Entorno

En el dashboard de Vercel:

1. Ve a **Settings** → **Environment Variables**
2. Agrega:

```
VITE_API_URL=https://tu-proyecto.up.railway.app
```

⚠️ **Reemplaza `tu-proyecto.up.railway.app` con tu URL real de Railway**

### 3.3 Deploy

1. Click en **"Deploy"**
2. Espera ~2 minutos
3. Vercel te dará una URL como: `https://cauciones-monitor.vercel.app`

## 🔄 Paso 4: Actualizar CORS en Backend

Después de obtener tu URL de Vercel, actualiza Railway:

1. Ve a tu proyecto en Railway
2. Variables → Agrega:

```
FRONTEND_URL=https://tu-frontend.vercel.app
```

## ✅ Paso 5: Verificar

1. **Abre tu frontend:** `https://tu-frontend.vercel.app`
2. **Verifica la conexión:** La app debe cargar la cotización
3. **Prueba Telegram:** Envía `/tasa` a tu bot

## 🎯 Comandos Útiles

### Actualizar Backend (Railway)
```bash
git add .
git commit -m "Update backend"
git push
```
Railway redeploya automáticamente.

### Actualizar Frontend (Vercel)
```bash
git add .
git commit -m "Update frontend"
git push
```
Vercel redeploya automáticamente.

## 💡 Limitaciones Free Tier

**Railway:**
- $5 USD de crédito gratis/mes (~500 horas)
- Si se acaba, el servicio se pausa hasta el próximo mes
- Monitoreo: ~$2-3/mes de uso típico

**Vercel:**
- 100% gratis para sitios estáticos
- 100GB bandwidth/mes
- Unlimited deployments

## 🐛 Troubleshooting

### Backend no responde
- Verifica que Railway esté corriendo (no pausado)
- Revisa los logs en Railway Dashboard
- Verifica las variables de entorno

### Frontend no se conecta al backend
- Verifica que `VITE_API_URL` esté correcta en Vercel
- Revisa la consola del navegador (F12)
- Verifica CORS en backend

### Telegram no funciona
- Verifica que las variables estén sin comillas
- Revisa los logs del backend en Railway
- Confirma que enviaste `/start` al bot

## 📊 Monitorear Uso

**Railway:**
- Dashboard → Usage
- Muestra cuánto crédito has usado

**Vercel:**
- Dashboard → Analytics
- Muestra visitas y bandwidth

## 🔐 Seguridad

- ✅ Las variables de entorno están encriptadas
- ✅ Telegram token no está en el código
- ✅ Repositorio puede ser privado
- ⚠️ No expongas el `.env` local

## 🎉 ¡Listo!

Tu aplicación está en producción 24/7 de forma gratuita. El bot responderá a comandos de Telegram aunque cierres la computadora.

**URLs finales:**
- Frontend: `https://tu-frontend.vercel.app`
- Backend: `https://tu-backend.up.railway.app`
- API: `https://tu-backend.up.railway.app/api/caucion`
