# 📱 Configuración de Notificaciones Telegram

## Paso 1: Crear tu Bot de Telegram

1. **Abre Telegram** en tu celular o computadora
2. Busca el bot oficial: **@BotFather**
3. Inicia una conversación y envía: `/newbot`
4. Sigue las instrucciones:
   - **Nombre del bot**: `Monitor Cauciones` (o el que quieras)
   - **Username del bot**: `cauciones_monitor_bot` (debe terminar en `_bot`)
5. **Copia el TOKEN** que te da BotFather
   - Se ve así: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`

## Paso 2: Obtener tu Chat ID

1. Busca en Telegram: **@userinfobot**
2. Envía cualquier mensaje
3. El bot te responderá con tu información
4. **Copia tu ID** (es un número, ejemplo: `987654321`)

## Paso 3: Configurar el Backend

1. En la carpeta `backend/`, crea un archivo `.env`:

```bash
cd backend
cp .env.example .env
```

2. Edita el archivo `.env` y agrega tus credenciales **SIN COMILLAS**:

```env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=987654321
```

3. Guarda el archivo

⚠️ **IMPORTANTE**: Las credenciales deben estar sin comillas

## Paso 4: Iniciar conversación con tu Bot

**ANTES de probar**, debes:

1. **Busca tu bot en Telegram** usando el username que elegiste (ej: `@cauciones_monitor_bot`)
2. **Presiona "START"** o envía `/start` al bot
3. Esto activa el chat y permite que el bot te envíe mensajes

## Paso 5: Probar la Conexión

1. Inicia el servidor:
```bash
cd /Users/rafaric/proyectos/Cauciones
bun run dev
```

2. Envía un mensaje de prueba:
```bash
curl -X POST http://localhost:3000/api/telegram/test
```

3. Deberías recibir un mensaje en Telegram confirmando que está conectado ✅

## 🎯 Cómo Funciona

Una vez configurado, podrás:

### Comandos Disponibles

- `/tasa` - Consulta la cotización actual en tiempo real
- `/config` - Ver umbrales configurados (mínimo y máximo)
- `/setmin <valor>` - Configurar umbral mínimo (ej: `/setmin 35`)
- `/setmax <valor>` - Configurar umbral máximo (ej: `/setmax 50`)
- `/status` - Ver el estado del sistema
- `/help` - Mostrar ayuda completa

### Alertas Automáticas

Recibirás notificaciones automáticas en Telegram cuando:

- 🔴 **Alerta Alta**: La tasa supera el umbral máximo configurado
- 🟠 **Alerta Baja**: La tasa cae bajo el umbral mínimo configurado

Las alertas solo se envían al **cruzar** los umbrales, no mientras permanece fuera del rango.

### Ejemplo de Uso:

**Consultar tasa actual:**
```
Tú: /tasa
Bot: 📊 Caución a 1 día
     📈 Tasa: 42.8%
     🕐 Actualizado: 14:25
     ✅ Dato real
```

**Ver configuración:**
```
Tú: /config
Bot: ⚙️ Configuración Actual
     📉 Umbral mínimo: 35%
     📈 Umbral máximo: 50%
```

**Cambiar umbrales:**
```
Tú: /setmin 40
Bot: ✅ Umbral mínimo actualizado a 40%

Tú: /setmax 55
Bot: ✅ Umbral máximo actualizado a 55%
```

## 🔧 Solución de Problemas

### "Telegram no configurado"
- Verifica que el archivo `.env` exista en `backend/`
- Verifica que las variables estén sin espacios
- Reinicia el servidor

### "Error al enviar mensaje"
- ⚠️ **Verifica que hayas enviado `/start` a tu bot primero**
- Verifica que el TOKEN sea correcto
- Verifica que el CHAT_ID sea un número (sin comillas)
- Verifica que el CHAT_ID sea correcto (usa @userinfobot para confirmarlo)

### No recibo notificaciones
- Verifica que Telegram esté abierto
- Envía `/start` a tu bot
- Prueba el endpoint de test

## 🔐 Seguridad

- ⚠️ **Nunca subas el archivo `.env` a git**
- El archivo `.gitignore` ya lo excluye automáticamente
- No compartas tu TOKEN con nadie
- Puedes regenerar el TOKEN en @BotFather con `/revoke`

## ✨ Características

- ✅ Notificaciones instantáneas en iOS y Android
- ✅ Consulta la tasa en cualquier momento con `/tasa`
- ✅ Configura umbrales min/max desde Telegram
- ✅ Sincronización automática entre Telegram y web
- ✅ Sin necesidad de tener el navegador abierto
- ✅ Alertas solo al cruzar umbrales (no repetitivas)
- ✅ Formato con emojis y markdown

## 🚀 Próximos Pasos (Opcional)

Si quieres extender funcionalidad:
- ~~Agregar comandos: `/status`, `/config`~~ ✅ Hecho
- ~~Permitir configurar umbrales desde Telegram~~ ✅ Hecho
- Enviar gráficos del día como imagen
- Reportes programados diarios
- Comando `/historico` para ver datos del día
