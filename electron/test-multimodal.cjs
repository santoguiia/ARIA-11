/**
 * Teste unitário e de diagnóstico para o motor multimodal LocalLLMEngine
 */
const { LocalLLMEngine } = require('./llmEngine.cjs');

async function runTest() {
  console.log('[TEST] Inicializando LocalLLMEngine...');
  const engine = new LocalLLMEngine(null);

  const statusBefore = engine.getStatus();
  console.log('[TEST] Status inicial:', statusBefore);

  console.log('[TEST] Verificando e iniciando servidor multimodal...');
  const loaded = await engine.ensureServerRunning();
  if (!loaded) {
    console.error('[TEST] Falha: Servidor não pôde ser iniciado.');
    process.exit(1);
  }

  console.log('[TEST] Servidor ativo! Testando geração de justificativa registral...');
  const justResult = await engine.generateJustification({
    ruleId: 'DIVERGENCIA_CASAMENTO',
    ruleTitle: 'Divergência no Estado Civil',
    legalReference: 'Art. 80 da Lei 6.015/73',
    diffSummary: 'D.O. indica solteiro, mas declarante apresentou certidão de casamento',
    declaracao: { nomeFalecido: 'TESTE FALECIDO', cpf: '111.222.333-44', estadoCivil: 'CASADO', nomeDeclarante: 'MARIA DA SILVA' },
    ocr: { nomeFalecido: 'TESTE FALECIDO', numeroDO: '12345678-9' },
    federada: {}
  });

  console.log('[TEST] Justificativa gerada com sucesso:');
  console.log(justResult.justification.slice(0, 200) + '...');

  console.log('[TEST] Testando minuta registral...');
  const minutaResult = await engine.draftMinuta({
    declaracao: {
      nomeFalecido: 'TESTE FALECIDO',
      cpf: '111.222.333-44',
      dataObito: '20/09/2026',
      horaObito: '14:30',
      localObito: 'Hospital Santa Isabel',
      municipioObito: 'Florianópolis',
      ufObito: 'SC',
      sexo: 'M',
      corRaca: 'BRANCA',
      estadoCivil: 'CASADO',
      nomeMae: 'MÃE FALECIDO',
      nomePai: 'PAI FALECIDO',
      causaMortis: 'Choque cardiogênico',
      cid10: 'I50.9',
      nomeMedico: 'DR. CARLOS ALBERTO',
      crmMedico: '12345',
      ufCrm: 'SC',
      cemiterio: 'Cemitério da Paz',
      nomeDeclarante: 'MARIA DA SILVA',
      qualificacaoDeclarante: 'Cônjuge sobrevivente'
    }
  });

  console.log('[TEST] Minuta gerada com sucesso:');
  console.log(minutaResult.minuta.slice(0, 200) + '...');

  console.log('[TEST] Teste concluído com sucesso!');
  await engine.shutdown();
  process.exit(0);
}

runTest().catch((err) => {
  console.error('[TEST] Erro no teste:', err);
  process.exit(1);
});
