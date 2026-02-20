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
let tasaAnterior = null; // Tasa de la consulta anterior
let ultimaAlerta = null;

function enHorarioMercado() {
  const ahora = new Date();
  const diaSemana = ahora.getDay(); // 0=domingo, 1=lunes, ..., 5=viernes, 6=sábado
  const hora = ahora.getHours();
  const minutos = ahora.getMinutes();
  // Mercado abierto de lunes a viernes, 10:30 a 17:00
  const esDiaHabil = diaSemana >= 1 && diaSemana <= 5;
  const enHorario = (hora > 10 && hora < 17) || (hora === 10 && minutos >= 30) || (hora === 17 && minutos === 0);
  return esDiaHabil && enHorario;
}

async function monitorearTasa() {
  if (!enHorarioMercado()) {
    // Resetear estado si salimos del horario de mercado
    tasaAnterior = null;
    return;
  }
  try {
    // La función getCaucionA1Dia ya maneja la lógica de viernes=3 días
    const datos = await getCaucionA1Dia();
    const { tasa } = datos;
    const { umbralMin } = getConfig();

    // Guardar en histórico cada vez que se monitorea
    agregarRegistroHistorico(tasa, Date.now());

    // Solo alertar si:
    // 1. Hay una tasa anterior registrada
    // 2. La tasa anterior estaba por debajo del umbral
    // 3. La tasa actual supera el umbral
    if (tasaAnterior !== null && tasaAnterior < umbralMin && tasa >= umbralMin) {
      await enviarAlerta(tasa, umbralMin);
      ultimaAlerta = Date.now();
      console.log(`🚨 Alerta enviada: tasa pasó de ${tasaAnterior}% a ${tasa}% (umbral: ${umbralMin}%)`);
    }
    
    // Actualizar tasa anterior para la próxima iteración
    tasaAnterior = tasa;
  } catch (err) {
    console.error('Error en monitoreo automático:', err.message);
  }
}

// Ejecutar monitoreo cada 10 minutos
setInterval(monitorearTasa, 10 * 60 * 1000);
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
// Permitir múltiples orígenes desde FRONTEND_URL (separados por coma) y localhost
let allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000'
];
if (process.env.FRONTEND_URL) {
  allowedOrigins = allowedOrigins.concat(
    process.env.FRONTEND_URL.split(',').map(o => o.trim())
  );
}
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir solicitudes sin origen (como Postman) o si el origen está en la lista
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());

// Inicializar Telegram solo en producción o Railway
let telegramActivo = false;
const isProduction = process.env.NODE_ENV === 'production' || process.env.RAILWAY_STATIC_URL;
if (isProduction) {
  telegramActivo = initTelegram();
  console.log('Telegram iniciado:', telegramActivo);
} else {
  console.log('Telegram NO se inicia en entorno local.');
}

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
      console.log('Devolviendo datos desde cache:', cache.data);
      return res.json({
        ...cache.data,
        fromCache: true
      });
    }

    // Obtener datos frescos
    console.log('Obteniendo datos frescos...');
    // Log de lo que obtiene el backend al consultar la API fuente
    const datosFuente = await getCaucionA1Dia();
    console.log('Respuesta cruda del scraper/API:', datosFuente);
    // Actualizar cache
    cache = {
      data: datosFuente,
      timestamp: ahora
    };

    res.json({
      ...datosFuente,
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
    console.log('Histórico filtrado por día', dia, ':', filtrado);
    return res.json(filtrado);
  }
  console.log('Histórico completo:', historicoTasas);
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
      error: 'Notificaciones no configuradas'
    });
  }
  
  const { tasa, umbralMin } = req.body;
  
  if (!tasa) {
    return res.status(400).json({ error: 'Falta parámetro: tasa es requerido' });
  }
  
  await enviarAlerta(tasa, umbralMin || 32);
  res.json({ mensaje: 'Alerta enviada' });
});

/**
 * Endpoint para obtener la configuración de umbrales
 */
app.get('/api/config', (req, res) => {
  try {
    const config = getConfig();
    console.log('Configuración enviada:', config);
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
