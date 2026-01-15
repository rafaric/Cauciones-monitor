// --- Histórico de tasas monitoreadas (persistencia simple en memoria y archivo) ---
import fs from 'fs';
import path from 'path';
const HISTORICO_PATH = path.join(process.cwd(), 'backend', 'historico.json');
let historicoTasas = [];

// Cargar histórico desde archivo al iniciar
try {
  if (fs.existsSync(HISTORICO_PATH)) {
    historicoTasas = JSON.parse(fs.readFileSync(HISTORICO_PATH, 'utf8'));
  }
} catch (e) {
  historicoTasas = [];
}

function guardarHistorico() {
  try {
    fs.writeFileSync(HISTORICO_PATH, JSON.stringify(historicoTasas, null, 2), 'utf8');
  } catch (e) {
    console.error('No se pudo guardar el histórico:', e.message);
  }
}

function agregarRegistroHistorico(tasa, fecha) {
  const registro = {
    hora: new Date(fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
    tasa,
    timestamp: fecha
  };
  historicoTasas.push(registro);
  guardarHistorico();
}
// --- Monitoreo autónomo de tasa y alertas ---
let estadoAnterior = 'dentro'; // 'dentro', 'fuera-alta', 'fuera-baja'
let ultimaAlerta = null;

function enHorarioMercado() {
  const ahora = new Date();
  const hora = ahora.getHours();
  const minutos = ahora.getMinutes();
  return (
    (hora === 11 && minutos >= 0) ||
    (hora > 11 && hora < 17) ||
    (hora === 17 && minutos <= 30)
  );
}

async function monitorearTasa() {
  if (!enHorarioMercado()) {
    // Resetear estado si salimos del horario de mercado
    estadoAnterior = 'dentro';
    return;
  }
  try {
    const datos = await getCaucionA1Dia();
    const { tasa } = datos;
    const { umbralMin, umbralMax } = getConfig();
    let estadoActual = 'dentro';

    // Guardar en histórico cada vez que se monitorea
    agregarRegistroHistorico(tasa, Date.now());


    if (tasa >= umbralMax) {
      estadoActual = 'fuera-alta';
      if (estadoAnterior === 'dentro' || estadoAnterior === 'fuera-baja') {
        await enviarAlerta(tasa, 'alta', umbralMin, umbralMax);
        ultimaAlerta = Date.now();
      }
    } else if (tasa <= umbralMin) {
      estadoActual = 'fuera-baja';
      if (estadoAnterior === 'dentro' || estadoAnterior === 'fuera-alta') {
        await enviarAlerta(tasa, 'baja', umbralMin, umbralMax);
        ultimaAlerta = Date.now();
      }
    }
    estadoAnterior = estadoActual;
  } catch (err) {
    console.error('Error en monitoreo automático:', err.message);
  }
}

// Ejecutar monitoreo cada 5 minutos
setInterval(monitorearTasa, 5 * 60 * 1000);
// Ejecutar al iniciar
monitorearTasa();
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
 * Endpoint para obtener el histórico de tasas monitoreadas
 */
app.get('/api/historico', (req, res) => {
  // Opcional: filtrar por día
  const { dia } = req.query;
  if (dia) {
    const fechaFiltro = new Date(dia).toDateString();
    const filtrado = historicoTasas.filter(r => new Date(r.timestamp).toDateString() === fechaFiltro);
    return res.json(filtrado);
  }
  res.json(historicoTasas);
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
