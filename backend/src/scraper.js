import axios from 'axios';

// --- API InvertirOnline ---
const IOL_PUNTAS_URL = 'https://iol.invertironline.com/Mercado/GetCaucionPuntas';

/**
 * Obtiene los datos de caución utilizando la API de puntas de IOL
 * @param {number} plazoDias - Plazo en días (1 o 3)
 * @returns {Promise<{plazo: string, tasa: number, fecha: Date}>}
 */
async function getCaucionPorPlazo(plazoDias = 1) {
  try {
    const response = await axios.post(IOL_PUNTAS_URL, 
      `moneda=PESOS&plazo=${plazoDias}&idTipoTransaccion=14`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest'
        }
      }
    );

    const data = response.data;
    
    if (!data.success) {
      throw new Error('La API de IOL retornó success=false');
    }

    // Buscar la tasa colocadora más alta
    const tasas = data.listaPuntas.map(p => parseFloat(p.tasaCompra));
    const tasaMax = Math.max(...tasas);

    return {
      plazo: `${plazoDias} día${plazoDias > 1 ? 's' : ''}`,
      tasa: tasaMax,
      fecha: new Date(),
      simulado: false
    };
  } catch (error) {
    throw new Error(`Error al obtener caución a ${plazoDias} día(s): ${error.message}`);
  }
}

/**
 * Obtiene la caución según el día de la semana
 * - Viernes: 3 días
 * - Resto: 1 día
 */
export async function getCaucionA1Dia() {
  const ahora = new Date();
  const diaSemana = ahora.getDay(); // 0=domingo, 5=viernes
  
  // Si es viernes, consultar a 3 días, si no a 1 día
  const plazoDias = (diaSemana === 5) ? 3 : 1;
  
  return await getCaucionPorPlazo(plazoDias);
}
