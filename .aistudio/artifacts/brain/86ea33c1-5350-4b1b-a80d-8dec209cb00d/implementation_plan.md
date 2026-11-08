# ARIA Desktop — Versão Definitiva de Produção Real

Plano de simplificação, limpeza e consolidação da versão final do sistema de pré-lavratura e Quality Gate notarial de óbito, eliminando elementos decorativos, simulações de licença e ferramentas fictícias para entregar um ambiente 100% funcional, limpo e focado no uso real em cartório.

---

## Revisão do Usuário & Decisões Confirmadas

> [!IMPORTANT]
> Decisões confirmadas com o usuário na etapa de alinhamento:
> - **Licença e Testes Fictícios**: Remoção completa do sistema simulado de licenças (`PRO_AI`, `ENTERPRISE_MTLS`) e dos botões de cenários de teste mockados. O sistema iniciará sempre e exclusivamente no modo oficial de produção real.
> - **Barra Superior e Rodapé**: Eliminação de botões redundantes (como atalho genérico de webcam na barra de títulos e badge de licença) e simplificação do rodapé para exibir apenas o status do operador e a integridade da trilha SHA-256.
> - **Modais Auxiliares Desnecessários**: Remoção do modal de empacotador de instalador desktop e da simulação de mTLS, mantendo apenas as ferramentas indispensáveis de fé pública (OCR multimodal, Quality Gate CNJ nº 149/2023, Laudo Técnico Certificado e Coleta Biométrica).

---

## 1. Visão Geral & Escopo da Versão Definitiva

O **ARIA Desktop** é a estação de trabalho de pré-lavratura de registro civil de óbito utilizada por escreventes e oficiais registradores. O objetivo desta versão definitiva é transformar a aplicação em uma ferramenta de software notarial real, eliminando qualquer aspecto de demonstração ou funcionalidade "placebo":

```
┌────────────────────────────────────────────────────────────────────────┐
│                          ARIA Desktop (Produção)                       │
├────────────────────────────────────────────────────────────────────────┤
│  Top Bar: Identidade do Cartório + Operador Autenticado (ICP-Brasil)   │
├───────────────────────────────────┬────────────────────────────────────┤
│   Painel Comparativo Multifonte   │        Quality Gate Notarial       │
│   ┌───────────────────────────┐   │   ┌────────────────────────────┐   │
│   │ 1. Declaração do Declarante│  │   │ 14 Regras Determinísticas   │   │
│   │ 2. OCR da D.O. Física     │   │   │ - Cronologia temporal      │   │
│   │ 3. Base Federada Central  │   │   │ - Filiação e estado civil  │   │
│   └───────────────────────────┘   │   │ - Conformidade médica/CRM  │   │
│                                   │   │ - Alertas e Impedimentos   │   │
│   Biometria & Assinatura          │   └────────────────────────────┘   │
│   - Pad Touch / Câmera / AFIS     │   Lavratura Oficial                │
│   - Hash SHA-256 permanente       │   - Emissão de Laudo CNJ (PDF) │   │
│   - Acervo de coletas salvas      │   - Gravação na Trilha Auditoria│  │
├───────────────────────────────────┴────────────────────────────────────┤
│  Footer: Sessão Autenticada · Trilha Criptográfica Ativa · LGPD Ok     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Elementos a Serem Removidos e Limpos

1. **Sistema Simulado de Licenças**:
   - Remover botão/badge de licença no `DesktopTitleBar` (`License PRO_AI`).
   - Remover `LicenseModal.tsx` e suas dependências no `App.tsx`.
   - Limpar tipos e referências a tiers de licenciamento fictícios (`types.ts`, `licenseEngine.ts`).

2. **Modais Fictícios e Utilitários de Demonstração**:
   - Remover `ElectronPackagerModal.tsx` (gerador simulado de `.exe`/`.deb`).
   - Remover `MtlsDiagnosticModal.tsx` (diagnóstico estático de handshake).
   - Remover atalhos e botões no cabeçalho ou menu que abriam essas telas.

3. **Cenários de Teste Mockados**:
   - Remover o seletor de cenários de teste pré-fabricados.
   - O aplicativo passa a operar 100% no fluxo limpo de produção real: o escrevente insere os dados, anexa o PDF/imagem da D.O. real (processada via Google Gemini Vision), busca na Base Federada do Firestore e realiza a lavratura com fé pública.

4. **Barra de Títulos e Barra de Rodapé**:
   - Remover o link `Nova Aba (Webcam)` da barra de títulos (a seleção e permissão de webcam já estão consolidadas dentro do próprio modal de biometria).
   - Limpar os marcadores redundantes do rodapé (Selector 3 e 4), preservando apenas o status da trilha criptográfica SHA-256 e conformidade com a LGPD.

---

## 3. Funcionalidades Preservadas e Reforçadas para Uso Real

1. **Autenticação Notarial Segura**:
   - Login por **Certificado Digital ICP-Brasil / e-Notariado** para escreventes habilitados e login administrativo por matrícula.
2. **Confronto Comparativo Triplo (3 Colunas)**:
   - Coluna 1: Dados declarados pelo declarante.
   - Coluna 2: Extração de OCR da Declaração de Óbito física (via Google Gemini Vision com Bounding Boxes e confiança percentual).
   - Coluna 3: Consulta online na Base Centralizada Federada (Firestore).
3. **Quality Gate Determinístico Oficial (Lei 6.015/73 e Prov. CNJ 149/2023)**:
   - 14 regras determinísticas (datas de nascimento x óbito, filiação, estado civil, CRM médico, cemitério/cremação).
   - Bloqueio real de lavratura em caso de impedimentos legais sem saneamento.
   - Justificativa jurídica para alertas anotados no livro de assentos.
4. **Coleta Biométrica & Acervo de Assinaturas**:
   - Assinatura manuscrita em Pad Touch, câmera física (sem restrições indevidas de desktop) ou leitor biométrico.
   - Acervo permanente de coletas que não se perdem ao alternar abas, permitindo vincular ao ato oficial.
5. **Emissão de Laudo Técnico & Certidão de Óbito**:
   - Geração de documento PDF oficial com selo criptográfico SHA-256 e gravação na trilha imutável de auditoria.

---

## 4. Plano de Execução Técnica

1. **Limpeza de Componentes**:
   - Excluir arquivos de modais não utilizados (`LicenseModal.tsx`, `ElectronPackagerModal.tsx`, `MtlsDiagnosticModal.tsx`).
   - Remover referências nos arquivos de tipos (`types.ts`) e no `App.tsx`.
2. **Refatoração do `DesktopTitleBar.tsx`**:
   - Retirar o badge de licença e o link de nova aba.
   - Manter identidade visual limpa com Logo ARIA, Indicador de Produção, Cartório Atual, Operador Logado e Relógio.
3. **Refatoração do Rodapé (`footer`)**:
   - Manter apenas informações operacionais reais: integridade da trilha de auditoria e status de conformidade LGPD.
4. **Validação & Compilação**:
   - Executar `compile_applet` e `lint_applet` para assegurar integridade zero de erros.
