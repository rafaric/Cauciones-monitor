import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'
import "./App.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://cauciones-monitor-production.up.railway.app';
const API_URL = `${API_BASE_URL}/api/caucion`;
const UMBRAL_MIN_DEFAULT = 35; // Tasa mínima por defecto
const UMBRAL_MAX_DEFAULT = 50; // Tasa máxima por defecto

function App() {
  const [info, SetInfo] = useState(false)
  const [tasa, setTasa] = useState(null);
  const [umbralMin, setUmbralMin] = useState(UMBRAL_MIN_DEFAULT);
  const [umbralMax, setUmbralMax] = useState(UMBRAL_MAX_DEFAULT);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [historico, setHistorico] = useState([]);

  // Cargar histórico de backend al montar
  useEffect(() => {
    const fetchHistorico = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/historico?dia=${encodeURIComponent(new Date().toISOString())}`);
        if (response.ok) {
          const data = await response.json();
          setHistorico(data);
        }
      } catch (e) {
        console.error('No se pudo cargar el histórico del backend', e);
      }
    };
    fetchHistorico();
  }, []);

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
        console.log('Usando umbrales por defecto (backend no disponible)');
      }
    };
    cargarConfiguracion();
  }, []);

  // Actualizar tasa manualmente
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

  const handleHidden = () => {
    SetInfo(prevState => !prevState)
  }

  return (
    <div className="max-w-[800px] my-0 mx-auto p-8">
      <header className='text-center mb-8 pb-4 border-b-2 border-blue-500'>
        <h1 className='text-5xl font-bold m-0 text-blue-500'>📊 Monitor de Cauciones</h1>
        <p className="text-gray-400 mt-4"> Caución a 1 día</p>
      </header>

      <main>
        {/* Configuración de umbrales */}
        <div className="bg-blue-800/60 border border-gray-600 rounded-lg p-6 mb-6 shadow-lg text-center">
          <h3>🎯 Umbrales de Alerta</h3>
          <div className="flex gap-8 justify-center flex-wrap mt-5">
            <label htmlFor="umbral-min">
              📉 Mínimo:
              <input
                className='bg-white text-right mx-3 rounded'
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
                className='bg-white text-right mx-3 rounded'
              />
              <span className="unidad">%</span>
            </label>
          </div>
        </div>

        {/* Mostrar la tasa actual */}
        <div className="bg-blue-800/60 rounded border border-blue-500 shadow-md flex flex-col items-center py-4">
          {loading && !tasa ? (
            <div className="text-black font-bold">Cargando...</div>
          ) : error ? (
            <div className="text-center">
              <p>❌ Error: {error}</p>
              <button  onClick={obtenerCotizacion} className="bg-red-400 text-white rounded-lg border border-white py-1 px-3 mt-4 hover:text-red-700 hover:bg-white transition-all duration-300 cursor-pointer">
                Reintentar
              </button>
            </div>
          ) : tasa !== null ? (
            <>
              <div className={`tasa ${
                tasa >= umbralMax ? 'text-red-600' : 
                tasa <= umbralMin ? 'text-green-300' : ''
              }`}>
                <span className="text-5xl text-amber-400">{tasa.toFixed(2)}</span>
                <span className="text-3xl text-amber-400">%</span>
              </div>
              <div className="text-center">
                <p className="text-gray-400 font-medium text-lg">Caución a 1 día</p>
                {ultimaActualizacion && (
                  <p className="text-gray-300 text-sm">
                    Última actualización: {ultimaActualizacion.toLocaleTimeString('es-AR')}
                  </p>
                )}
                {tasa >= umbralMax && (
                  <p className="text-red-700 font-bold bg-amber-300">
                    🔔 ⬆️ La tasa superó el máximo de {umbralMax}%
                  </p>
                )}
                {tasa <= umbralMin && (
                  <p className="text-green-700 bg-gray-500">
                    🔔 ⬇️ La tasa está por debajo del mínimo de {umbralMin}%
                  </p>
                )}
              </div>
              <button onClick={obtenerCotizacion} className="bg-green-600 text-white rounded-lg shadow border border-blue-300 hover:bg-green-200 hover:text-black transition-all duration-300" disabled={loading}>
                {loading ? 'Actualizando...' : '🔄 Actualizar'}
              </button>
            </>
          ) : null}
        </div>

        {/* Información adicional */}
        <div className="bg-blue-800/70 mt-5 rounded-lg shadow-lg px-6 py-4">
          <h3 onClick={handleHidden} className='w-full'>ℹ️ Información </h3>
          <div className={`${info ? "opacity-100 h-[100%]" : "opacity-0 h-0"} transition-all duration-300`} >
          <ul className='flex flex-col gap-4 mt-4'>
            <li>La cotización se actualiza manualmente</li>
            <li>Recibirás notificaciones cuando la tasa esté fuera del rango configurado (vía backend)</li>
            <li>Los umbrales se guardan automáticamente en el backend</li>
            <li>Los datos se obtienen en tiempo real de Portfolio Personal</li>
          </ul>
          </div>
        </div>

        {/* Gráfico de evolución diaria */}
        {historico.length > 0 && (
          <div className="bg-blue-800/60 rounded-lg shadow-lg">
            <h3 className='text-blue-400 font-bold'>📊 Evolución del Día (11:00 - 17:30)</h3>
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
            <p className="text-sm text-gray-400 font-light">
              📈 {historico.length} registro{historico.length !== 1 ? 's' : ''} hoy
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
