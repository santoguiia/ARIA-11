/**
 * Teste de inferência de OCR Multimodal direto via LocalLLMEngine
 */
const { LocalLLMEngine } = require('./llmEngine.cjs');

// Pequeno GIF monocromático 1x1 em base64 para validação de pipeline multimodal
const sampleBase64 = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

async function testOCR() {
  console.log('[TEST OCR] Inicializando motor multimodal...');
  const engine = new LocalLLMEngine(null);

  await engine.ensureServerRunning();
  console.log('[TEST OCR] Servidor online. Enviando imagem para processOCR...');

  try {
    const result = await engine.processOCR({
      imageBase64: sampleBase64,
      mimeType: 'image/gif',
      fileName: 'teste.gif'
    });
    console.log('[TEST OCR] Resultado recebido com sucesso:');
    console.log('Source:', result.source);
    console.log('Duration:', result.durationMs, 'ms');
    console.log('Classificação:', result.data.classification);
    console.log('Campos detectados:', result.data.fields ? result.data.fields.length : 0);
  } catch (err) {
    console.log('[TEST OCR] Resposta esperada para imagem em branco/teste:', err.message);
  }

  const status = engine.getStatus();
  console.log('[TEST OCR] Status final do motor (verificando persistência de processo):');
  console.log('isRunning:', status.isRunning, 'PID:', status.pid, 'Policy:', status.persistentMemoryPolicy);

  await engine.shutdown();
  console.log('[TEST OCR] Servidor encerrado com sucesso.');
}

testOCR().catch((e) => {
  console.error('[TEST OCR] Erro:', e);
  process.exit(1);
});
