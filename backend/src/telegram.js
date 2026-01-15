import TelegramBot from 'node-telegram-bot-api';
import { getCaucionA1Dia } from './scraper.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_PATH = path.join(__dirname, '..', 'config.json');

let bot = null;
let chatId = null;

/**
 * Inicializa el bot de Telegram con comandos interactivos
 */
export function initTelegram() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  chatId = process.env.TELEGRAM_CHAT_ID;
  
  if (!token || !chatId) {
    console.log('⚠️  Telegram no configurado (variables TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID no encontradas)');
    return false;
  }
  
  try {
    bot = new TelegramBot(token, { polling: true });
    console.log('✅ Bot de Telegram inicializado con polling');
    
    // Configurar comandos
    configurarComandos();
    
    return true;
  } catch (error) {
    console.error('❌ Error al inicializar Telegram:', error.message);
    return false;
  }
}

/**
 * Configura los comandos del bot
 */
function configurarComandos() {
  // Comando /start
  bot.onText(/\/start/, (msg) => {
    const mensaje = `👋 *Bienvenido al Monitor de Cauciones*\n\n` +
                    `Comandos disponibles:\n` +
                    `/tasa - Consultar la tasa actual\n` +
                    `/config - Ver umbrales configurados\n` +
                    `/setmin <valor> - Configurar umbral mínimo\n` +
                    `/setmax <valor> - Configurar umbral máximo\n` +
                    `/status - Estado del sistema\n` +
                    `/help - Mostrar ayuda`;
    
    bot.sendMessage(msg.chat.id, mensaje, { parse_mode: 'Markdown' });
  });
  
  // Comando /tasa - Consultar cotización actual
  bot.onText(/\/tasa/, async (msg) => {
    try {
      bot.sendMessage(msg.chat.id, '⏳ Consultando cotización...');
      
      const data = await getCaucionA1Dia();
      const hora = new Date(data.fecha).toLocaleTimeString('es-AR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      const mensaje = `📊 *Caución a 1 día*\n\n` +
                      `📈 Tasa: *${data.tasa}%*\n` +
                      `🕐 Actualizado: ${hora}\n` +
                      (data.simulado ? `⚠️ _Dato simulado (fuera de horario)_` : `✅ Dato real`);
      
      bot.sendMessage(msg.chat.id, mensaje, { parse_mode: 'Markdown' });
      console.log('📱 Consulta /tasa respondida');
      
    } catch (error) {
      bot.sendMessage(msg.chat.id, '❌ Error al obtener la cotización. Intenta más tarde.');
      console.error('Error en comando /tasa:', error.message);
    }
  });
  
  // Comando /config - Ver configuración actual
  bot.onText(/\/config/, (msg) => {
    try {
      const config = leerConfig();
      const mensaje = `⚙️ *Configuración Actual*\n\n` +
                      `📉 Umbral mínimo: *${config.umbralMin}%*\n` +
                      `📈 Umbral máximo: *${config.umbralMax}%*\n\n` +
                      `Para cambiar usa:\n` +
                      `/setmin <valor>\n` +
                      `/setmax <valor>`;
      
      bot.sendMessage(msg.chat.id, mensaje, { parse_mode: 'Markdown' });
    } catch (error) {
      bot.sendMessage(msg.chat.id, '❌ Error al leer la configuración.');
      console.error('Error en comando /config:', error.message);
    }
  });
  
  // Comando /setmin - Configurar umbral mínimo
  bot.onText(/\/setmin (.+)/, (msg, match) => {
    try {
      const valor = parseFloat(match[1]);
      
      if (isNaN(valor) || valor < 0 || valor > 100) {
        bot.sendMessage(msg.chat.id, '❌ Valor inválido. Debe ser un número entre 0 y 100.');
        return;
      }
      
      const config = leerConfig();
      
      if (valor >= config.umbralMax) {
        bot.sendMessage(msg.chat.id, `❌ El umbral mínimo (${valor}%) debe ser menor al máximo (${config.umbralMax}%)`);
        return;
      }
      
      config.umbralMin = valor;
      guardarConfig(config);
      
      bot.sendMessage(msg.chat.id, `✅ Umbral mínimo actualizado a *${valor}%*`, { parse_mode: 'Markdown' });
      console.log(`⚙️ Umbral mínimo actualizado a ${valor}% vía Telegram`);
      
    } catch (error) {
      bot.sendMessage(msg.chat.id, '❌ Error al guardar la configuración.');
      console.error('Error en comando /setmin:', error.message);
    }
  });
  
  // Comando /setmax - Configurar umbral máximo
  bot.onText(/\/setmax (.+)/, (msg, match) => {
    try {
      const valor = parseFloat(match[1]);
      
      if (isNaN(valor) || valor < 0 || valor > 100) {
        bot.sendMessage(msg.chat.id, '❌ Valor inválido. Debe ser un número entre 0 y 100.');
        return;
      }
      
      const config = leerConfig();
      
      if (valor <= config.umbralMin) {
        bot.sendMessage(msg.chat.id, `❌ El umbral máximo (${valor}%) debe ser mayor al mínimo (${config.umbralMin}%)`);
        return;
      }
      
      config.umbralMax = valor;
      guardarConfig(config);
      
      bot.sendMessage(msg.chat.id, `✅ Umbral máximo actualizado a *${valor}%*`, { parse_mode: 'Markdown' });
      console.log(`⚙️ Umbral máximo actualizado a ${valor}% vía Telegram`);
      
    } catch (error) {
      bot.sendMessage(msg.chat.id, '❌ Error al guardar la configuración.');
      console.error('Error en comando /setmax:', error.message);
    }
  });
  
  // Comando /status
  bot.onText(/\/status/, (msg) => {
    const mensaje = `✅ *Sistema Operativo*\n\n` +
                    `🤖 Bot: Activo\n` +
                    `🕐 Hora: ${new Date().toLocaleString('es-AR')}\n` +
                    `📡 Estado: Monitoreando`;
    
    bot.sendMessage(msg.chat.id, mensaje, { parse_mode: 'Markdown' });
  });
  
  // Comando /help
  bot.onText(/\/help/, (msg) => {
    const mensaje = `📖 *Ayuda - Monitor de Cauciones*\n\n` +
                    `*Comandos disponibles:*\n` +
                    `/tasa - Consulta la cotización actual de caución a 1 día\n` +
                    `/config - Ver umbrales configurados\n` +
                    `/setmin <valor> - Configurar umbral mínimo (ej: /setmin 35)\n` +
                    `/setmax <valor> - Configurar umbral máximo (ej: /setmax 50)\n` +
                    `/status - Verifica el estado del sistema\n` +
                    `/help - Muestra esta ayuda\n\n` +
                    `*Alertas automáticas:*\n` +
                    `Recibirás notificaciones cuando la tasa cruce los umbrales configurados.`;
    
    bot.sendMessage(msg.chat.id, mensaje, { parse_mode: 'Markdown' });
  });
  
  console.log('✅ Comandos del bot configurados: /start, /tasa, /config, /setmin, /setmax, /status, /help');
}

/**
 * Lee la configuración desde el archivo JSON
 */
function leerConfig() {
  try {
    const data = fs.readFileSync(CONFIG_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error al leer config.json, usando valores por defecto');
    return { umbralMin: 35, umbralMax: 50 };
  }
}

/**
 * Guarda la configuración en el archivo JSON
 */
function guardarConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
}

/**
 * Obtiene la configuración actual
 */
export function getConfig() {
  return leerConfig();
}

/**
 * Envía una alerta de caución a Telegram
 * @param {number} tasa - Tasa actual
 * @param {string} tipo - 'alta' o 'baja'
 * @param {number} umbralMin - Umbral mínimo
 * @param {number} umbralMax - Umbral máximo
 */
export async function enviarAlerta(tasa, tipo, umbralMin, umbralMax) {
  if (!bot || !chatId) {
    console.log('⚠️  Alerta no enviada: Telegram no configurado');
    return;
  }
  
  try {
    const hora = new Date().toLocaleTimeString('es-AR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    let mensaje = '';
    
    if (tipo === 'alta') {
      mensaje = `🔴 *ALERTA: Caución Alta*\n\n` +
                `📈 Tasa: *${tasa}%*\n` +
                `🎯 Umbral máximo: ${umbralMax}%\n` +
                `🕐 Hora: ${hora}`;
    } else if (tipo === 'baja') {
      mensaje = `🟠 *ALERTA: Caución Baja*\n\n` +
                `📉 Tasa: *${tasa}%*\n` +
                `🎯 Umbral mínimo: ${umbralMin}%\n` +
                `🕐 Hora: ${hora}`;
    }
    
    await bot.sendMessage(chatId, mensaje, { parse_mode: 'Markdown' });
    console.log(`📱 Alerta enviada a Telegram (${tipo})`);
    
  } catch (error) {
    console.error('❌ Error al enviar mensaje a Telegram:', error.message);
  }
}

/**
 * Envía un mensaje de prueba
 */
export async function enviarMensajePrueba() {
  if (!bot || !chatId) {
    console.log('⚠️  Telegram no configurado');
    return false;
  }
  
  try {
    const mensaje = `✅ *Monitor de Cauciones - Conectado*\n\n` +
                    `El sistema está funcionando correctamente.\n` +
                    `Recibirás alertas cuando la tasa esté fuera del rango configurado.\n\n` +
                    `🕐 ${new Date().toLocaleString('es-AR')}`;
    
    await bot.sendMessage(chatId, mensaje, { parse_mode: 'Markdown' });
    console.log('✅ Mensaje de prueba enviado a Telegram');
    return true;
  } catch (error) {
    console.error('❌ Error al enviar mensaje de prueba:', error.message);
    return false;
  }
}
