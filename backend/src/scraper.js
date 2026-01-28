export async function getCaucionA3Dias() {
  try {
    const token = await getIOLToken();
    const params = {
      'cotizacionInstrumentoModel.instrumento': 'cauciones',
      'cotizacionInstrumentoModel.pais': 'argentina'
    };
    const { data } = await axios.get(
      'https://api.invertironline.com/api/v2/Cotizaciones/cauciones/argentina/Todos',
      {
        headers: { Authorization: `Bearer ${token}` },
        params
      }
    );
    console.log('[IOL] Respuesta cruda caución 3 días:', JSON.stringify(data));
    // Buscar el plazo T3 (3 días)
    const caucion = data.titulos.find(t => t.plazo === 'T3');
    if (!caucion) throw new Error('No se encontró caución a 3 días (T3)');
    return {
      plazo: '3 días',
      tasa: caucion.variacionPorcentual,
      fecha: caucion.fecha,
      simulado: false
    };
  } catch (error) {
    throw new Error('Error al obtener caución a 3 días desde IOL: ' + error.message);
  }
}
import axios from 'axios';
// --- API InvertirOnline ---
const IOL_API_URL = 'https://api.invertironline.com/api/v2/Cotizaciones/caucion/argentina/Todos';
const IOL_TOKEN_URL = 'https://api.invertironline.com/token';
const IOL_USERNAME = process.env.IOL_USERNAME;
const IOL_PASSWORD = process.env.IOL_PASSWORD;

async function getIOLToken() {
  const params = new URLSearchParams();
  params.append('username', IOL_USERNAME);
  params.append('password', IOL_PASSWORD);
  params.append('grant_type', 'password');
  const { data } = await axios.post(IOL_TOKEN_URL, params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  return data.access_token;
}

export async function getCaucionA1Dia() {
  try {
    const token = await getIOLToken();
    const params = {
      'cotizacionInstrumentoModel.instrumento': 'cauciones',
      'cotizacionInstrumentoModel.pais': 'argentina'
    };
    const { data } = await axios.get(
      'https://api.invertironline.com/api/v2/Cotizaciones/cauciones/argentina/Todos',
      {
        headers: { Authorization: `Bearer ${token}` },
        params
      }
    );
    console.log('[IOL] Respuesta cruda caución 1 día:', JSON.stringify(data));
    // Buscar el plazo T0 (1 día)
    const caucion = data.titulos.find(t => t.plazo === 'T0');
    if (!caucion) throw new Error('No se encontró caución a 1 día (T0)');
    return {
      plazo: '1 día',
      tasa: caucion.variacionPorcentual,
      fecha: caucion.fecha,
      simulado: false
    };
  } catch (error) {
    throw new Error('Error al obtener caución a 1 día desde IOL: ' + error.message);
  }
}
import puppeteer from 'puppeteer';

const URL_CAUCIONES = 'https://www.portfoliopersonal.com/Cotizaciones/Cauciones';

let browser = null;

/**
 * Inicializa el navegador de Puppeteer
 */
async function initBrowser() {
  if (!browser || !browser.connected) {
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        // Ignorar errores al cerrar
      }
    }
    
    const launchOptions = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    };
    
    // Usar Chromium del sistema si está disponible (Railway/Docker)
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    }
    
    browser = await puppeteer.launch(launchOptions);
  }
  return browser;
}


/**
 * Cierra el navegador al terminar el proceso
 */
export async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

// Cerrar el navegador cuando el proceso termine
process.on('SIGINT', async () => {
  await closeBrowser();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeBrowser();
  process.exit(0);
});
