import TelegramBot from 'node-telegram-bot-api';
import twilio from 'twilio';
import { getCaucionA1Dia } from './scraper.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_PATH = path.join(__dirname, '..', 'config.json');

let bot = null;
let chatId = null;
let twilioClient = null;
let twilioConfig = {
  from: null,
  to: []
};

/**
 * Inicializa Twilio para WhatsApp
 */
function initTwilio() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM;
  const whatsappTo = process.env.TWILIO_WHATSAPP_TO;

  if (!accountSid || !authToken || !whatsappFrom || !whatsappTo) {
    console.log('⚠️  Twilio/WhatsApp no configurado (variables TWILIO_* no encontradas)');
    return false;
  }

  try {
    twilioClient = twilio(accountSid, authToken);
    twilioConfig.from = whatsappFrom;
    twilioConfig.to = whatsappTo.split(',').map(num => num.trim());
    console.log('✅ Twilio/WhatsApp inicializado');
    return true;
  } catch (error) {
    console.error('❌ Error al inicializar Twilio:', error.message);
    return false;
  }
}

/**
 * Inicializa el bot de Telegram con comandos interactivos
 */
export function initTelegram() {
  console.log('🔍 DEBUG - Verificando variables de entorno:');
  console.log('- TELEGRAM_BOT_TOKEN existe:', !!process.env.TELEGRAM_BOT_TOKEN);
  console.log('- TELEGRAM_CHAT_ID existe:', !!process.env.TELEGRAM_CHAT_ID);
  console.log('- TOKEN length:', process.env.TELEGRAM_BOT_TOKEN?.length || 0);
  console.log('- CHAT_ID value:', process.env.TELEGRAM_CHAT_ID);
  
  const token = process.env.TELEGRAM_BOT_TOKEN;
  chatId = process.env.TELEGRAM_CHAT_ID;
  
  let telegramActivo = false;
  let whatsappActivo = false;
  
  if (!token || !chatId) {
    console.log('⚠️  Telegram no configurado (variables TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID no encontradas)');
  } else {
    try {
      bot = new TelegramBot(token, { polling: true });
      console.log('✅ Bot de Telegram inicializado con polling');
      
      // Configurar comandos
      configurarComandos();
      
      telegramActivo = true;
    } catch (error) {
      console.error('❌ Error al inicializar Telegram:', error.message);
    }
  }
  
  // Inicializar Twilio/WhatsApp
  whatsappActivo = initTwilio();
  
  return telegramActivo || whatsappActivo;
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
                    `/config - Ver umbral configurado\n` +
                    `/setmin <valor> - Configurar umbral mínimo\n` +
                    `/status - Estado del sistema\n` +
                    `/help - Mostrar ayuda`;
    
    bot.sendMessage(msg.chat.id, mensaje, { parse_mode: 'Markdown' });
  });
  
  // Comando /tasa - Consultar cotización actual
  bot.onText(/\/tasa/, async (msg) => {
    try {
      bot.sendMessage(msg.chat.id, '⏳ Consultando cotización...');
      
      const data = await getCaucionA1Dia();
        const fecha = new Date(data.fecha);
        const hora = fecha.toLocaleTimeString('es-AR', { 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: 'America/Argentina/Buenos_Aires'
        });
      
      const mensaje = `📊 *Caución a ${data.plazo}*\n\n` +
              `📈 Tasa: *${data.tasa}%*\n` +
              `🕐 Actualizado: ${hora}\n` +
              (data.simulado ? `⚠️ _Dato simulado (fuera de horario)_` : `✅ origen=IOL`);
      
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
                      `📉 Umbral mínimo: *${config.umbralMin}%*\n\n` +
                      `ℹ️ Se enviará alerta cuando la tasa supere este valor.\n\n` +
                      `Para cambiar usa:\n` +
                      `/setmin <valor>`;
      
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
      config.umbralMin = valor;
      guardarConfig(config);
      
      bot.sendMessage(msg.chat.id, `✅ Umbral mínimo actualizado a *${valor}%*`, { parse_mode: 'Markdown' });
      console.log(`⚙️ Umbral mínimo actualizado a ${valor}% vía Telegram`);
      
    } catch (error) {
      bot.sendMessage(msg.chat.id, '❌ Error al guardar la configuración.');
      console.error('Error en comando /setmin:', error.message);
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
                    `/tasa - Consulta la cotización actual\n` +
                    `/config - Ver umbral configurado\n` +
                    `/setmin <valor> - Configurar umbral mínimo (ej: /setmin 32)\n` +
                    `/status - Verifica el estado del sistema\n` +
                    `/help - Muestra esta ayuda\n\n` +
                    `*Alertas automáticas:*\n` +
                    `Recibirás notificaciones cuando la tasa supere el umbral configurado.`;
    
    bot.sendMessage(msg.chat.id, mensaje, { parse_mode: 'Markdown' });
  });
  
  console.log('✅ Comandos del bot configurados: /start, /tasa, /config, /setmin, /status, /help');
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
    return { umbralMin: 32 };
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
 * Envía una alerta de caución a Telegram y WhatsApp
 * @param {number} tasa - Tasa actual
 * @param {number} umbralMin - Umbral mínimo
 */
export async function enviarAlerta(tasa, umbralMin) {
  const hora = new Date().toLocaleTimeString('es-AR', { 
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires'
  });
  
  const mensaje = `🔴 *ALERTA: Caución supera el umbral*\n\n` +
                  `📈 Tasa actual: *${tasa}%*\n` +
                  `🎯 Umbral mínimo: ${umbralMin}%\n` +
                  `🕐 Hora: ${hora}`;
  
  // Enviar a Telegram
  if (bot && chatId) {
    try {
      await bot.sendMessage(chatId, mensaje, { parse_mode: 'Markdown' });
      console.log(`📱 Alerta enviada a Telegram`);
    } catch (error) {
      console.error('❌ Error al enviar mensaje a Telegram:', error.message);
    }
  }
  
  // Enviar a WhatsApp
  if (twilioClient && twilioConfig.from && twilioConfig.to.length > 0) {
    try {
      for (const to of twilioConfig.to) {
        await twilioClient.messages.create({
          from: twilioConfig.from,
          to: to,
          body: `⚡ ALERTA: La tasa de caución superó ${umbralMin}% (actual: ${tasa}%)\n🕐 Hora: ${hora}`
        });
        console.log(`📱 Alerta enviada a WhatsApp: ${to}`);
      }
    } catch (error) {
      console.error('❌ Error al enviar mensaje a WhatsApp:', error.message);
    }
  }
  
  if (!bot && !twilioClient) {
    console.log('⚠️  Alerta no enviada: ni Telegram ni WhatsApp están configurados');
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
