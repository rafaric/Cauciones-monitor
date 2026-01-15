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
 * Obtiene la cotización de la caución a 1 día desde Portfolio Personal
 * @returns {Promise<{plazo: string, tasa: number}>}
 */
export async function getCaucionA1Dia() {
  let page = null;
  
  try {
    console.log('🔍 Consultando cauciones desde:', URL_CAUCIONES);
    
    const browser = await initBrowser();
    page = await browser.newPage();
    
    // Configurar el user agent
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Ir a la página de cauciones
    await page.goto(URL_CAUCIONES, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Esperar a que cargue la tabla de cauciones
    await page.waitForSelector('table', { timeout: 10000 });
    
    // Extraer los datos de la tabla
    const cauciones = await page.evaluate(() => {
      const filas = Array.from(document.querySelectorAll('table tbody tr'));
      
      for (const fila of filas) {
        const texto = fila.textContent || '';
        const celdas = Array.from(fila.querySelectorAll('td'));
        
        // Buscar la fila que contiene "1 DÍA" o "1 día"
        if (texto.includes('1 DÍA') || texto.includes('1 día') || texto.includes('PESOS - 1 DÍA')) {
          // Extraer los valores numéricos (tasas)
          const valores = celdas.map(celda => {
            const texto = celda.textContent.trim();
            // Buscar patrones de tasa (ej: 42.50%, 42,50%)
            const match = texto.match(/(\d+[.,]\d+)\s*%/);
            return match ? parseFloat(match[1].replace(',', '.')) : null;
          }).filter(v => v !== null);
          
          if (valores.length > 0) {
            // Retornar la primera tasa encontrada (generalmente es la tasa actual)
            return valores[0];
          }
        }
      }
      
      return null;
    });
    
    await page.close();
    
    if (cauciones === null) {
      throw new Error('No se pudo encontrar la tasa de caución a 1 día en la página');
    }
    
    console.log('✅ Tasa encontrada:', cauciones, '%');
    
    return {
      plazo: '1 día',
      tasa: cauciones,
      fecha: new Date().toISOString(),
      simulado: false
    };

  } catch (error) {
    if (page) {
      await page.close();
    }
    console.error('❌ Error al obtener cauciones:', error.message);
    throw new Error(`Error en el scraping: ${error.message}`);
  }
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
