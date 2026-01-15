import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const API_URL = `${API_BASE_URL}/api/caucion`;
const INTERVALO_CONSULTA = 5 * 60 * 1000; // 5 minutos
const UMBRAL_MIN_DEFAULT = 35; // Tasa mínima por defecto
const UMBRAL_MAX_DEFAULT = 50; // Tasa máxima por defecto

function App() {
  const [tasa, setTasa] = useState(null);
  const [umbralMin, setUmbralMin] = useState(() => {
    const saved = localStorage.getItem('umbralMin');
    return saved ? parseFloat(saved) : UMBRAL_MIN_DEFAULT;
  });
  const [umbralMax, setUmbralMax] = useState(() => {
    const saved = localStorage.getItem('umbralMax');
    return saved ? parseFloat(saved) : UMBRAL_MAX_DEFAULT;
  });
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [esSimulado, setEsSimulado] = useState(false);
  const [historico, setHistorico] = useState(() => {
    const saved = localStorage.getItem('historicoCauciones');
    if (saved) {
      const data = JSON.parse(saved);
      const hoy = new Date().toDateString();
      // Limpiar si es un día diferente
      if (data.fecha === hoy) {
        return data.datos;
      }
    }
    return [];
  });
  const [ultimaAlerta, setUltimaAlerta] = useState(null);
  const [estadoAnterior, setEstadoAnterior] = useState('dentro'); // 'dentro', 'fuera-alta', 'fuera-baja'
  const [permisoNotificaciones, setPermisoNotificaciones] = useState(
    Notification.permission
  );

  // Sincronizar umbrales con el backend al cargar
  useEffect(() => {
    const cargarConfiguracion = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/config`);
        if (response.ok) {
          const config = await response.json();
          setUmbralMin(config.umbralMin);
          setUmbralMax(config.umbralMax);
          console.log(`⚙️ Umbrales cargados desde backend: min=${config.umbralMin}%, max=${config.umbralMax}%`);
        }
      } catch (error) {
        console.log('Usando umbrales locales (backend no disponible)');
      }
    };
    
    cargarConfiguracion();
  }, []);

  // Solicitar permiso para notificaciones
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        setPermisoNotificaciones(permission);
      });
    }
  }, []);

  // Función para enviar notificación
  const enviarNotificacion = async (tasaActual, tipo) => {
    // Evitar enviar la misma alerta múltiples veces (cooldown de 10 minutos)
    const ahora = Date.now();
    if (ultimaAlerta && (ahora - ultimaAlerta) < 10 * 60 * 1000) {
      console.log('Alerta reciente, no se envía duplicado');
      return;
    }
    
    // Establecer el cooldown ANTES de enviar (previene duplicados)
    setUltimaAlerta(ahora);
    
    // Notificación web
    if (permisoNotificaciones === 'granted') {
      const mensajes = {
        alta: `⬆️ La tasa subió a ${tasaActual}% (máximo: ${umbralMax}%)`,
        baja: `⬇️ La tasa bajó a ${tasaActual}% (mínimo: ${umbralMin}%)`,
      };
      
      new Notification('🔔 Alerta de Caución', {
        body: mensajes[tipo] || `La tasa está en ${tasaActual}%`,
        icon: tipo === 'alta' ? '📈' : '📉',
        requireInteraction: true
      });
    }
    
    // Notificación Telegram (via backend)
    try {
      await fetch(`${API_BASE_URL}/api/telegram/alerta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tasa: tasaActual, 
          tipo, 
          umbralMin, 
          umbralMax 
        })
      });
    } catch (error) {
      console.log('Telegram no disponible o no configurado');
    }
  };

  // Función para obtener la cotización
  const obtenerCotizacion = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error('Error al obtener datos del servidor');
      }
      
      const data = await response.json();
      setTasa(data.tasa);
      const fechaActual = new Date(data.fecha);
      setUltimaActualizacion(fechaActual);
      setEsSimulado(data.simulado || false);
      
      // Guardar en histórico si está dentro del horario de mercado (11:00 - 17:30)
      const hora = fechaActual.getHours();
      const minutos = fechaActual.getMinutes();
      const enHorarioMercado = (hora === 11 && minutos >= 0) || 
                               (hora > 11 && hora < 17) || 
                               (hora === 17 && minutos <= 30);
      
      if (enHorarioMercado) {
        const nuevoRegistro = {
          hora: fechaActual.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
          tasa: data.tasa,
          timestamp: fechaActual.getTime()
        };
        
        setHistorico(prev => {
          // Evitar duplicados del mismo minuto
          const sinDuplicados = prev.filter(item => 
            Math.abs(item.timestamp - nuevoRegistro.timestamp) > 60000
          );
          return [...sinDuplicados, nuevoRegistro].sort((a, b) => a.timestamp - b.timestamp);
        });
      }
      
      // Verificar si cruzó un umbral (solo al cruzar, no mientras permanece fuera)
      let estadoActual = 'dentro';
      
      if (data.tasa >= umbralMax) {
        estadoActual = 'fuera-alta';
        // Solo enviar alerta si venía de 'dentro' o 'fuera-baja' (cruzó el umbral superior)
        if (estadoAnterior === 'dentro' || estadoAnterior === 'fuera-baja') {
          enviarNotificacion(data.tasa, 'alta');
        }
      } else if (data.tasa <= umbralMin) {
        estadoActual = 'fuera-baja';
        // Solo enviar alerta si venía de 'dentro' o 'fuera-alta' (cruzó el umbral inferior)
        if (estadoAnterior === 'dentro' || estadoAnterior === 'fuera-alta') {
          enviarNotificacion(data.tasa, 'baja');
        }
      }
      
      // Actualizar el estado anterior
      setEstadoAnterior(estadoActual);
      
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Consultar al montar el componente
  useEffect(() => {
    obtenerCotizacion();
  }, []);

  // Guardar umbrales en localStorage cuando cambien
  useEffect(() => {
    localStorage.setItem('umbralMin', umbralMin.toString());
    localStorage.setItem('umbralMax', umbralMax.toString());
  }, [umbralMin, umbralMax]);

  // Guardar histórico en localStorage
  useEffect(() => {
    if (historico.length > 0) {
      const dataToSave = {
        fecha: new Date().toDateString(),
        datos: historico
      };
      localStorage.setItem('historicoCauciones', JSON.stringify(dataToSave));
    }
  }, [historico]);

  // Configurar consulta periódica (solo en horario de mercado: 11:00 - 17:30)
  useEffect(() => {
    const verificarYActualizar = () => {
      const ahora = new Date();
      const hora = ahora.getHours();
      const minutos = ahora.getMinutes();
      const enHorarioMercado = (hora === 11 && minutos >= 0) || 
                               (hora > 11 && hora < 17) || 
                               (hora === 17 && minutos <= 30);
      
      if (enHorarioMercado) {
        obtenerCotizacion();
      } else {
        console.log('Fuera del horario de mercado (11:00-17:30), actualización omitida');
      }
    };
    
    const intervalo = setInterval(verificarYActualizar, INTERVALO_CONSULTA);
    return () => clearInterval(intervalo);
  }, [umbralMin, umbralMax]); // Reiniciar si cambian los umbrales

  const solicitarPermiso = async () => {
    const permission = await Notification.requestPermission();
    setPermisoNotificaciones(permission);
  };

  return (
    <div className="app">
      <header>
        <h1>📊 Monitor de Cauciones</h1>
        <p className="subtitle">Portfolio Personal - Caución a 1 día</p>
      </header>

      <main>
        {/* Configuración de notificaciones */}
        {permisoNotificaciones !== 'granted' && (
          <div className="alerta alerta-info">
            <p>⚠️ Las notificaciones están deshabilitadas</p>
            <button onClick={solicitarPermiso} className="btn-secundario">
              Habilitar Notificaciones
            </button>
          </div>
        )}

        {/* Configuración de umbrales */}
        <div className="card config-umbral">
          <h3>🎯 Umbrales de Alerta</h3>
          <div className="umbrales-container">
            <label htmlFor="umbral-min">
              📉 Mínimo:
              <input
                id="umbral-min"
                type="number"
                value={umbralMin}
                onChange={(e) => setUmbralMin(parseFloat(e.target.value) || 0)}
                step="0.5"
                min="0"
                max="100"
              />
              <span className="unidad">%</span>
            </label>
            <label htmlFor="umbral-max">
              📈 Máximo:
              <input
                id="umbral-max"
                type="number"
                value={umbralMax}
                onChange={(e) => setUmbralMax(parseFloat(e.target.value) || 0)}
                step="0.5"
                min="0"
                max="100"
              />
              <span className="unidad">%</span>
            </label>
          </div>
        </div>

        {/* Mostrar la tasa actual */}
        <div className="card tasa-principal">
          {loading && !tasa ? (
            <div className="loading">Cargando...</div>
          ) : error ? (
            <div className="error">
              <p>❌ Error: {error}</p>
              <button onClick={obtenerCotizacion} className="btn-secundario">
                Reintentar
              </button>
            </div>
          ) : tasa !== null ? (
            <>
              <div className={`tasa ${
                tasa >= umbralMax ? 'alerta-alta' : 
                tasa <= umbralMin ? 'alerta-baja' : ''
              }`}>
                <span className="valor">{tasa.toFixed(2)}</span>
                <span className="porcentaje">%</span>
              </div>
              <div className="info">
                {esSimulado && (
                  <p className="alerta-simulado">
                    ⚠️ Datos simulados (demo)
                  </p>
                )}
                <p className="plazo">Caución a 1 día</p>
                {ultimaActualizacion && (
                  <p className="timestamp">
                    Última actualización: {ultimaActualizacion.toLocaleTimeString('es-AR')}
                  </p>
                )}
                {tasa >= umbralMax && (
                  <p className="alerta-texto alerta-texto-alta">
                    🔔 ⬆️ La tasa superó el máximo de {umbralMax}%
                  </p>
                )}
                {tasa <= umbralMin && (
                  <p className="alerta-texto alerta-texto-baja">
                    🔔 ⬇️ La tasa está por debajo del mínimo de {umbralMin}%
                  </p>
                )}
              </div>
              <button onClick={obtenerCotizacion} className="btn-actualizar" disabled={loading}>
                {loading ? 'Actualizando...' : '🔄 Actualizar'}
              </button>
            </>
          ) : null}
        </div>

        {/* Información adicional */}
        <div className="card info-adicional">
          <h3>ℹ️ Información</h3>
          <ul>
            <li>La cotización se actualiza automáticamente cada 5 minutos</li>
            <li>Recibirás notificaciones cuando la tasa esté fuera del rango configurado</li>
            <li>Los umbrales se guardan automáticamente</li>
            <li>Los datos se obtienen en tiempo real de Portfolio Personal</li>
          </ul>
        </div>

        {/* Gráfico de evolución diaria */}
        {historico.length > 0 && (
          <div className="card grafico-container">
            <h3>📊 Evolución del Día (11:00 - 17:30)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={historico}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis 
                  dataKey="hora" 
                  stroke="#888"
                  style={{ fontSize: '0.85rem' }}
                />
                <YAxis 
                  stroke="#888"
                  domain={['auto', 'auto']}
                  style={{ fontSize: '0.85rem' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1a1a1a', 
                    border: '1px solid #646cff',
                    borderRadius: '4px'
                  }}
                  labelStyle={{ color: '#fff' }}
                />
                <Legend />
                <ReferenceLine y={umbralMax} stroke="#ff6b6b" strokeDasharray="3 3" label="Máx" />
                <ReferenceLine y={umbralMin} stroke="#ffa500" strokeDasharray="3 3" label="Mín" />
                <Line 
                  type="monotone" 
                  dataKey="tasa" 
                  stroke="#61dafb" 
                  strokeWidth={2}
                  dot={{ fill: '#61dafb', r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Tasa %"
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="grafico-info">
              📈 {historico.length} registro{historico.length !== 1 ? 's' : ''} hoy
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
