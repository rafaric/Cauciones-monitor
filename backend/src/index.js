import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { getCaucionA1Dia } from './scraper.js';
import { initTelegram, enviarAlerta, enviarMensajePrueba, getConfig } from './telegram.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware CORS - Permitir tanto desarrollo local como producción
const corsOptions = {
  origin: process.env.FRONTEND_URL || ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());

// Inicializar Telegram
const telegramActivo = initTelegram();

// Cache simple para evitar consultas excesivas
let cache = {
  data: null,
  timestamp: null
};

const CACHE_DURATION = 2 * 60 * 1000; // 2 minutos

/**
 * Endpoint principal para obtener la cotización de cauciones
 */
app.get('/api/caucion', async (req, res) => {
  try {
    // Verificar si hay datos en cache válidos
    const ahora = Date.now();
    if (cache.data && cache.timestamp && (ahora - cache.timestamp) < CACHE_DURATION) {
      console.log('Devolviendo datos desde cache');
      return res.json({
        ...cache.data,
        fromCache: true
      });
    }

    // Obtener datos frescos
    console.log('Obteniendo datos frescos...');
    const datos = await getCaucionA1Dia();
    
    // Actualizar cache
    cache = {
      data: datos,
      timestamp: ahora
    };

    res.json({
      ...datos,
      fromCache: false
    });

  } catch (error) {
    console.error('Error en /api/caucion:', error);
    res.status(500).json({
      error: 'Error al obtener la cotización',
      mensaje: error.message
    });
  }
});

/**
 * Endpoint de health check
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    cacheActive: cache.data !== null
  });
});

/**
 * Endpoint para limpiar cache manualmente
 */
app.post('/api/cache/clear', (req, res) => {
  cache = { data: null, timestamp: null };
  res.json({ mensaje: 'Cache limpiado correctamente' });
});

/**
 * Endpoint para probar notificaciones de Telegram
 */
app.post('/api/telegram/test', async (req, res) => {
  if (!telegramActivo) {
    return res.status(400).json({ 
      error: 'Telegram no configurado',
      mensaje: 'Configura TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID en el archivo .env'
    });
  }
  
  const exito = await enviarMensajePrueba();
  
  if (exito) {
    res.json({ mensaje: 'Mensaje de prueba enviado correctamente' });
  } else {
    res.status(500).json({ error: 'Error al enviar mensaje de prueba' });
  }
});

/**
 * Endpoint para enviar alerta manual
 */
app.post('/api/telegram/alerta', async (req, res) => {
  if (!telegramActivo) {
    return res.status(400).json({ 
      error: 'Telegram no configurado'
    });
  }
  
  const { tasa, tipo, umbralMin, umbralMax } = req.body;
  
  if (!tasa || !tipo) {
    return res.status(400).json({ error: 'Faltan parámetros: tasa y tipo son requeridos' });
  }
  
  await enviarAlerta(tasa, tipo, umbralMin || 35, umbralMax || 50);
  res.json({ mensaje: 'Alerta enviada' });
});

/**
 * Endpoint para obtener la configuración de umbrales
 */
app.get('/api/config', (req, res) => {
  try {
    const config = getConfig();
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend escuchando en http://localhost:${PORT}`);
  console.log(`📊 Endpoint de cauciones: http://localhost:${PORT}/api/caucion`);
  if (telegramActivo) {
    console.log(`📱 Notificaciones de Telegram: ACTIVAS`);
  }
});
