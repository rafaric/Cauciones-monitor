import { getCaucionA1Dia } from './src/scraper.js';

console.log('🧪 Probando scraper...\n');

try {
  const resultado = await getCaucionA1Dia();
  console.log('\n✅ Resultado:', resultado);
  process.exit(0);
} catch (error) {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
}
