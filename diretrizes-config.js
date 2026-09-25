/* =====================================================================
   diretrizes-config.js — RootifyONE
   O único arquivo do módulo comum que muda de app para app.
   O RootifyONE cuida do próprio PT/EN nas telas dele; o módulo comum
   entra com a faixa (PT/EN e IA), rede, notificações e instalação.
   ===================================================================== */
DGO.iniciar({
  app: 'rootify-one',                       /* gaveta de dados: nunca mude */
  nome: { pt: 'RootifyONE', en: 'RootifyONE' },
  versaoApp: '0.1.5',
  cor: '#34d399',
  corFundoBarra: '#0b1220',
  idiomaPadrao: 'pt',
  idiomaCompartilhado: true,

  /* o RootifyONE não mostra anúncio (nem faixa de anúncio, nem pop-up) */
  anuncios: { ativo: false, arquivo: '', popup: { ativo: false } },

  /* a conta da equipe é do próprio RootifyONE (cofre cifrado),
     então o login do módulo comum fica desligado aqui */
  login: { ativo: false, permitirVisitante: false, permitirPagante: false, permitirAnunciante: false },
  niveis: { ativo: false, arquivo: '' },
  ocr: { ativo: false },

  ia: {
    ativo: true,
    botaoNaFaixa: true,
    provedorPadrao: 'openrouter',
    contexto: {
      pt: 'Você ajuda a equipe que administra a plataforma SolverONE no RootifyONE: usuários, chamados de suporte, termos, planos, publicação e LGPD. Responda curto, em português simples. Nunca peça dados pessoais.',
      en: 'You help the team that runs the SolverONE platform in RootifyONE: users, support tickets, terms, plans, publishing and LGPD/GDPR. Answer briefly in plain English. Never ask for personal data.'
    },
    sugestoes: [
      { pt: 'Como escrever uma resposta educada para um cliente irritado?', en: 'How do I write a polite reply to an upset customer?' },
      { pt: 'O que a LGPD pede quando alguém quer apagar a conta?', en: 'What does the LGPD require when someone wants to delete their account?' }
    ]
  },

  rede: { pesado: 'wifi', ia: 'sempre' },

  notificacoes: {
    ativo: true,
    tipos: [
      { id: 'rootify', nome: { pt: 'Avisos da administração', en: 'Admin alerts' },
        descricao: { pt: 'Prazo de chamado em risco, pedido de privacidade, regras automáticas.', en: 'Ticket deadline at risk, privacy request, automatic rules.' }, padrao: true }
    ]
  },

  /* as telas do RootifyONE já são bilíngues: o tradutor do módulo não mexe nelas */
  ignorar: ['#rf-acesso', '#rf-casca', '#rf-avisos', '.rf-modal-fundo'],

  pwa: { ativo: true, manifesto: 'manifest.json', serviceWorker: 'sw.js' }
});
