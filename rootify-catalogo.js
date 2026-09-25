/* =====================================================================
   RootifyONE — CATÁLOGO
   ---------------------------------------------------------------------
   Tudo o que é "declaração" mora aqui, separado do código que desenha:
     1. módulos do menu
     2. recursos e ações (a base das permissões)
     3. papéis da equipe (quem trabalha no RootifyONE)
     4. perfis dos clientes (quem usa os apps)
     5. registro de funções: o que está pronto e o que está em cinza,
        com o que FALTA ESPECIFICAR para cada item sair do cinza
     6. dados iniciais (apps, planos, serviços, termos, SLA, respostas)
   Para a plataforma crescer: acrescentar linhas aqui. As telas leem
   estas listas; na maioria dos casos não é preciso mexer em mais nada.
   ===================================================================== */
(function (raiz) {
  'use strict';
  var RF = raiz.RF = raiz.RF || {};

  function N(pt, en) { return { pt: pt, en: en }; }

  /* ------------------------------------------------------------------
     1. MÓDULOS DO MENU (☰)
     estado: 'ativo' | 'parcial' | 'futuro'  (o menu mostra um selo)
     ------------------------------------------------------------------ */
  var GRUPOS = [
    { id: 'visao', nome: N('Visão geral', 'Overview') },
    { id: 'produto', nome: N('Produto', 'Product') },
    { id: 'clientes', nome: N('Clientes', 'Customers') },
    { id: 'conteudo', nome: N('Conteúdo', 'Content') },
    { id: 'governanca', nome: N('Governança', 'Governance') },
    { id: 'operacao', nome: N('Operação', 'Operations') },
    { id: 'plataforma', nome: N('Plataforma', 'Platform') }
  ];

  var MODULOS = [
    { id: 'painel', grupo: 'visao', icone: '🏠', recurso: 'painel', estado: 'ativo',
      nome: N('Painel', 'Dashboard'),
      ajuda: N('Resumo do que pede atenção agora: chamados, pedidos de privacidade, aprovações e publicação pendente.',
               'Summary of what needs attention now: tickets, privacy requests, approvals and pending publication.') },

    { id: 'apps', grupo: 'produto', icone: '📱', recurso: 'apps', estado: 'ativo',
      nome: N('Apps', 'Apps'),
      ajuda: N('Catálogo de todos os apps da SolverONE: endereço, estado, versão mínima e responsável. Vira o arquivo apps.json.',
               'Catalog of every SolverONE app: address, stage, minimum version and owner. Becomes the apps.json file.') },
    { id: 'planos', grupo: 'produto', icone: '💎', recurso: 'planos', estado: 'parcial',
      nome: N('Planos', 'Plans'),
      ajuda: N('Planos de usuário e o que cada um inclui. Preço e cobrança ficam em cinza até existir o meio de pagamento.',
               'User plans and what each includes. Price and billing stay grey until a payment method exists.') },
    { id: 'servicos', grupo: 'produto', icone: '🧩', recurso: 'servicos', estado: 'ativo',
      nome: N('Serviços por plano', 'Services by plan'),
      ajuda: N('Cada função de cada app e quais planos podem usar. Padrão: todos os planos.',
               'Each feature of each app and which plans may use it. Default: every plan.') },

    { id: 'usuarios', grupo: 'clientes', icone: '👥', recurso: 'usuarios', estado: 'parcial',
      nome: N('Usuários (CRM)', 'Users (CRM)'),
      ajuda: N('Ficha completa de cada pessoa: dados, plano, apps, termos aceitos, chamados, notas, etiquetas e segmentos. Sem servidor, os usuários entram por importação ou cadastro manual.',
               'Full record of each person: data, plan, apps, accepted terms, tickets, notes, tags and segments. Without a server, users come in by import or manual entry.') },
    { id: 'suporte', grupo: 'clientes', icone: '🎧', recurso: 'suporte', estado: 'parcial',
      nome: N('Suporte (CS)', 'Support (CS)'),
      ajuda: N('Fila de chamados com prioridade, prazo (SLA), responsável, respostas prontas e notas internas.',
               'Ticket queue with priority, deadline (SLA), assignee, canned replies and internal notes.') },
    { id: 'kb', grupo: 'clientes', icone: '📚', recurso: 'kb', estado: 'parcial',
      nome: N('Base de conhecimento', 'Knowledge base'),
      ajuda: N('Artigos de ajuda em PT e EN. Publicados, viram o arquivo ajuda.json que alimenta o Assist ONE dos apps.',
               'Help articles in PT and EN. Once published they become ajuda.json, which feeds Assist ONE in the apps.') },

    { id: 'termos', grupo: 'conteudo', icone: '📜', recurso: 'termos', estado: 'parcial',
      nome: N('Termos e políticas', 'Terms and policies'),
      ajuda: N('Termos de uso, privacidade e avisos legais, com versão, aprovação por outra pessoa e aceite obrigatório.',
               'Terms of use, privacy and legal notices, with version, approval by someone else and mandatory acceptance.') },
    { id: 'recados', grupo: 'conteudo', icone: '📣', recurso: 'recados', estado: 'parcial',
      nome: N('Recados', 'Notices'),
      ajuda: N('Avisos da plataforma para a caixa de recados dos apps, com período e público.',
               'Platform notices for the apps\' inbox, with period and audience.') },
    { id: 'anuncios', grupo: 'conteudo', icone: '🪧', recurso: 'anuncios', estado: 'ativo',
      nome: N('Anúncios', 'Ads'),
      ajuda: N('Os cartões da faixa e do pop-up. Vira o arquivo anuncios.json.',
               'The cards in the top strip and the pop-up. Becomes the anuncios.json file.') },
    { id: 'versoes', grupo: 'conteudo', icone: '🏷️', recurso: 'versoes', estado: 'ativo',
      nome: N('Versões e novidades', 'Versions and what\'s new'),
      ajuda: N('O que cada versão de cada app trouxe, em PT e EN. Gera o versoes.json de cada app.',
               'What each version of each app brought, in PT and EN. Generates each app\'s versoes.json.') },
    { id: 'publicar', grupo: 'conteudo', icone: '🚀', recurso: 'publicar', estado: 'ativo',
      nome: N('Publicar', 'Publish'),
      ajuda: N('Confere e publica os arquivos master no repositório solverone-dados: pelo GitHub direto ou baixando o pacote.',
               'Checks and publishes the master files to the solverone-dados repository: straight to GitHub or by downloading the package.') },

    { id: 'papeis', grupo: 'governanca', icone: '🛡️', recurso: 'papeis', estado: 'ativo',
      nome: N('Papéis e permissões', 'Roles and permissions'),
      ajuda: N('Quem pode ver e fazer o quê. Papéis da equipe, perfis dos clientes e regras de separação de funções.',
               'Who can see and do what. Staff roles, customer profiles and separation-of-duties rules.') },
    { id: 'equipe', grupo: 'governanca', icone: '🧑‍💼', recurso: 'equipe', estado: 'parcial',
      nome: N('Equipe', 'Team'),
      ajuda: N('Pessoas que trabalham no RootifyONE, com papel e apps sob responsabilidade.',
               'People who work in RootifyONE, with role and the apps they are responsible for.') },
    { id: 'privacidade', grupo: 'governanca', icone: '🔏', recurso: 'privacidade', estado: 'parcial',
      nome: N('Privacidade (LGPD)', 'Privacy (LGPD/GDPR)'),
      ajuda: N('Pedidos dos titulares com prazo, registro das operações de tratamento, consentimentos e incidentes.',
               'Data-subject requests with deadlines, record of processing, consents and incidents.') },
    { id: 'auditoria', grupo: 'governanca', icone: '🧾', recurso: 'auditoria', estado: 'ativo',
      nome: N('Auditoria (log)', 'Audit log'),
      ajuda: N('Tudo o que foi feito, por quem, quando, com antes e depois. Encadeado: dá para provar que ninguém apagou nada.',
               'Everything that was done, by whom, when, with before and after. Chained: it proves nothing was deleted.') },

    { id: 'integracoes', grupo: 'operacao', icone: '🔌', recurso: 'integracoes', estado: 'parcial',
      nome: N('Integrações e chaves', 'Integrations and keys'),
      ajuda: N('GitHub, Formspree, política de chaves de IA e os serviços que ainda vão entrar (Firebase, e-mail, pagamento).',
               'GitHub, Formspree, AI key policy and the services still to come (Firebase, e-mail, payments).') },
    { id: 'automacoes', grupo: 'operacao', icone: '⚙️', recurso: 'automacoes', estado: 'parcial',
      nome: N('Automações', 'Automations'),
      ajuda: N('Regras "quando acontecer X, faça Y". As que rodam aqui dentro já funcionam; as agendadas esperam servidor.',
               'Rules "when X happens, do Y". Those that run inside here already work; scheduled ones wait for a server.') },
    { id: 'financeiro', grupo: 'operacao', icone: '💰', recurso: 'financeiro', estado: 'parcial',
      nome: N('Financeiro', 'Finance'),
      ajuda: N('Custos da plataforma já dá para registrar. Receita, assinaturas e pagamentos ficam em cinza até existir cobrança.',
               'Platform costs can already be recorded. Revenue, subscriptions and payments stay grey until billing exists.') },
    { id: 'telemetria', grupo: 'operacao', icone: '📈', recurso: 'telemetria', estado: 'futuro',
      nome: N('Telemetria', 'Telemetry'),
      ajuda: N('Uso, desempenho e erros de cada app, com consentimento. Espera a escolha da ferramenta e o servidor.',
               'Usage, performance and errors of each app, with consent. Waits for the tool choice and a server.') },
    { id: 'armazenamento', grupo: 'operacao', icone: '🗄️', recurso: 'armazenamento', estado: 'parcial',
      nome: N('Armazenamento', 'Storage'),
      ajuda: N('Cotas por plano e quanto espaço este aparelho está usando.',
               'Quotas per plan and how much space this device is using.') },

    { id: 'mapa', grupo: 'plataforma', icone: '🗺️', recurso: 'mapa', estado: 'ativo',
      nome: N('O que falta especificar', 'What still needs a spec'),
      ajuda: N('Tudo o que está em cinza, com a pergunta que falta responder. Dá para exportar para a planilha de diretrizes.',
               'Everything that is grey, with the question still to answer. It can be exported to the guidelines spreadsheet.') },
    { id: 'configuracoes', grupo: 'plataforma', icone: '⚙', recurso: 'configuracoes', estado: 'ativo',
      nome: N('Configurações', 'Settings'),
      ajuda: N('Idioma, segurança de acesso (PIN e digital), bloqueio automático, cópia de segurança e dados de exemplo.',
               'Language, access security (PIN and fingerprint), auto-lock, backup and sample data.') }
  ];

  /* ------------------------------------------------------------------
     2. RECURSOS E AÇÕES
     Permissão = 'recurso:acao'. '*' = tudo.
     ------------------------------------------------------------------ */
  var ACOES = {
    ver: N('Ver', 'View'), criar: N('Criar', 'Create'), editar: N('Editar', 'Edit'),
    excluir: N('Excluir', 'Delete'), exportar: N('Exportar', 'Export'),
    aprovar: N('Aprovar', 'Approve'), publicar: N('Publicar', 'Publish')
  };

  var RECURSOS = [
    { id: 'painel', nome: N('Painel', 'Dashboard'), acoes: ['ver'] },
    { id: 'apps', nome: N('Apps', 'Apps'), acoes: ['ver', 'criar', 'editar', 'excluir'] },
    { id: 'planos', nome: N('Planos', 'Plans'), acoes: ['ver', 'criar', 'editar', 'excluir'] },
    { id: 'servicos', nome: N('Serviços por plano', 'Services by plan'), acoes: ['ver', 'editar'] },
    { id: 'usuarios', nome: N('Usuários (CRM)', 'Users (CRM)'), acoes: ['ver', 'criar', 'editar', 'excluir', 'exportar'] },
    { id: 'usuarios.pii', nome: N('Dados pessoais completos (sem máscara)', 'Full personal data (unmasked)'), acoes: ['ver'] },
    { id: 'usuarios.conta', nome: N('Ações na conta (bloquear, trocar plano)', 'Account actions (block, change plan)'), acoes: ['editar'] },
    { id: 'suporte', nome: N('Chamados', 'Tickets'), acoes: ['ver', 'criar', 'editar', 'excluir', 'exportar'] },
    { id: 'suporte.atribuir', nome: N('Atribuir e escalar chamados', 'Assign and escalate tickets'), acoes: ['editar'] },
    { id: 'suporte.config', nome: N('Prazos (SLA), categorias e respostas prontas', 'SLA, categories and canned replies'), acoes: ['editar'] },
    { id: 'kb', nome: N('Base de conhecimento', 'Knowledge base'), acoes: ['ver', 'criar', 'editar', 'excluir', 'publicar'] },
    { id: 'termos', nome: N('Termos e políticas', 'Terms and policies'), acoes: ['ver', 'criar', 'editar', 'aprovar', 'publicar'] },
    { id: 'recados', nome: N('Recados', 'Notices'), acoes: ['ver', 'criar', 'editar', 'excluir'] },
    { id: 'anuncios', nome: N('Anúncios', 'Ads'), acoes: ['ver', 'criar', 'editar', 'excluir'] },
    { id: 'versoes', nome: N('Versões e novidades', 'Versions'), acoes: ['ver', 'criar', 'editar'] },
    { id: 'publicar', nome: N('Publicar arquivos master', 'Publish master files'), acoes: ['ver', 'publicar'] },
    { id: 'papeis', nome: N('Papéis e permissões', 'Roles and permissions'), acoes: ['ver', 'criar', 'editar', 'excluir'] },
    { id: 'equipe', nome: N('Equipe', 'Team'), acoes: ['ver', 'criar', 'editar', 'excluir'] },
    { id: 'integracoes', nome: N('Integrações e chaves', 'Integrations and keys'), acoes: ['ver', 'editar'] },
    { id: 'financeiro', nome: N('Financeiro', 'Finance'), acoes: ['ver', 'criar', 'editar', 'exportar'] },
    { id: 'privacidade', nome: N('Privacidade (LGPD)', 'Privacy'), acoes: ['ver', 'criar', 'editar', 'exportar'] },
    { id: 'auditoria', nome: N('Auditoria', 'Audit'), acoes: ['ver', 'exportar'] },
    { id: 'automacoes', nome: N('Automações', 'Automations'), acoes: ['ver', 'criar', 'editar', 'excluir'] },
    { id: 'telemetria', nome: N('Telemetria', 'Telemetry'), acoes: ['ver'] },
    { id: 'armazenamento', nome: N('Armazenamento', 'Storage'), acoes: ['ver', 'editar'] },
    { id: 'mapa', nome: N('O que falta especificar', 'What needs a spec'), acoes: ['ver', 'exportar'] },
    { id: 'configuracoes', nome: N('Configurações do RootifyONE', 'RootifyONE settings'), acoes: ['ver', 'editar'] }
  ];

  /* todo papel ganha estes, para ninguém ficar numa tela vazia */
  var BASICAS = ['painel:ver', 'mapa:ver', 'configuracoes:ver'];

  function todas(recurso) {
    var r = RECURSOS.filter(function (x) { return x.id === recurso; })[0];
    return r ? r.acoes.map(function (a) { return recurso + ':' + a; }) : [];
  }
  function varias(lista) {
    var out = [];
    lista.forEach(function (it) {
      if (it.indexOf(':') === -1) out = out.concat(todas(it)); else out.push(it);
    });
    return out;
  }
  function soVer() {
    return RECURSOS.filter(function (r) { return r.id !== 'usuarios.pii'; })
      .map(function (r) { return r.acoes.indexOf('ver') !== -1 ? r.id + ':ver' : null; })
      .filter(Boolean);
  }

  /* ------------------------------------------------------------------
     3. PAPÉIS DA EQUIPE
     escopoPorApp: true = a pessoa só enxerga os apps que receber.
     sistema: true = não pode ser apagado nem ter permissões mudadas.
     ------------------------------------------------------------------ */
  var PAPEIS = [
    { id: 'super-admin', sistema: true, cor: '#ef4444',
      nome: N('Dono (super admin)', 'Owner (super admin)'),
      descricao: N('Tudo, inclusive papéis, equipe e chaves. Deve haver pelo menos um, e poucos.',
                   'Everything, including roles, team and keys. There must be at least one, and few.'),
      permissoes: ['*'] },
    { id: 'admin-plataforma', cor: '#f97316',
      nome: N('Administrador da plataforma', 'Platform administrator'),
      descricao: N('Opera todos os apps e publica. Não mexe em papéis nem no financeiro.',
                   'Runs every app and publishes. Does not touch roles or finance.'),
      permissoes: varias(['apps', 'planos', 'servicos', 'usuarios', 'usuarios.pii:ver', 'usuarios.conta:editar',
        'suporte', 'suporte.atribuir:editar', 'suporte.config:editar', 'kb', 'termos:ver', 'termos:criar', 'termos:editar',
        'termos:publicar', 'recados', 'anuncios', 'versoes', 'publicar', 'papeis:ver', 'equipe:ver', 'equipe:criar',
        'equipe:editar', 'integracoes', 'privacidade:ver', 'auditoria', 'automacoes', 'telemetria', 'armazenamento',
        'mapa', 'configuracoes', 'financeiro:ver']) },
    { id: 'admin-app', cor: '#eab308', escopoPorApp: true,
      nome: N('Administrador de app', 'App administrator'),
      descricao: N('Cuida só dos apps que receber: serviços, usuários, chamados e conteúdo desses apps.',
                   'Looks after the apps assigned only: services, users, tickets and content of those apps.'),
      permissoes: varias(['apps:ver', 'apps:editar', 'servicos', 'planos:ver', 'usuarios:ver', 'usuarios:editar',
        'usuarios.conta:editar', 'suporte', 'suporte.atribuir:editar', 'kb', 'termos:ver', 'termos:criar',
        'termos:editar', 'recados', 'versoes', 'publicar:ver', 'automacoes:ver', 'armazenamento:ver']) },
    { id: 'suporte-n1', cor: '#22c55e', escopoPorApp: true,
      nome: N('Suporte nível 1', 'Support tier 1'),
      descricao: N('Atende chamados e consulta usuários com dados mascarados. Escala para o nível 2.',
                   'Handles tickets and looks up users with masked data. Escalates to tier 2.'),
      permissoes: ['apps:ver', 'usuarios:ver', 'suporte:ver', 'suporte:criar', 'suporte:editar', 'kb:ver'] },
    { id: 'suporte-n2', cor: '#16a34a', escopoPorApp: true,
      nome: N('Suporte nível 2', 'Support tier 2'),
      descricao: N('Tudo do nível 1, mais dado pessoal completo, ações na conta, atribuição e artigos de ajuda.',
                   'Everything in tier 1, plus full personal data, account actions, assignment and help articles.'),
      permissoes: varias(['apps:ver', 'usuarios:ver', 'usuarios:editar', 'usuarios.pii:ver', 'usuarios.conta:editar',
        'suporte:ver', 'suporte:criar', 'suporte:editar', 'suporte.atribuir:editar', 'kb:ver', 'kb:criar', 'kb:editar',
        'privacidade:ver', 'privacidade:criar']) },
    { id: 'sucesso-cliente', cor: '#06b6d4',
      nome: N('Sucesso do cliente (CRM)', 'Customer success (CRM)'),
      descricao: N('Cuida da relação: notas, etiquetas, segmentos, recados e artigos. Não mexe em conta nem em publicação.',
                   'Owns the relationship: notes, tags, segments, notices and articles. No account actions or publishing.'),
      permissoes: varias(['apps:ver', 'planos:ver', 'usuarios:ver', 'usuarios:editar', 'usuarios:exportar',
        'usuarios.pii:ver', 'suporte:ver', 'kb:ver', 'kb:criar', 'kb:editar', 'recados', 'automacoes:ver']) },
    { id: 'conteudo', cor: '#a855f7',
      nome: N('Conteúdo e marketing', 'Content and marketing'),
      descricao: N('Escreve termos (sem aprovar), recados, anúncios, novidades e ajuda.',
                   'Writes terms (cannot approve), notices, ads, release notes and help.'),
      permissoes: varias(['apps:ver', 'termos:ver', 'termos:criar', 'termos:editar', 'recados', 'anuncios', 'versoes',
        'kb', 'publicar:ver']) },
    { id: 'financeiro', cor: '#0ea5e9',
      nome: N('Financeiro', 'Finance'),
      descricao: N('Custos, receita, preços dos planos. Vê usuários sem dado pessoal completo.',
                   'Costs, revenue, plan prices. Sees users without full personal data.'),
      permissoes: varias(['financeiro', 'planos:ver', 'planos:editar', 'usuarios:ver', 'apps:ver', 'auditoria:ver']) },
    { id: 'dpo', cor: '#8b5cf6',
      nome: N('Encarregado de dados (DPO)', 'Data protection officer (DPO)'),
      descricao: N('Pedidos dos titulares, consentimentos, incidentes; aprova e publica termos; exporta e exclui dados a pedido do titular.',
                   'Data-subject requests, consents, incidents; approves and publishes terms; exports and deletes data on request.'),
      permissoes: varias(['privacidade', 'termos:ver', 'termos:aprovar', 'termos:publicar', 'usuarios:ver',
        'usuarios:exportar', 'usuarios:excluir', 'usuarios.pii:ver', 'suporte:ver', 'auditoria', 'apps:ver', 'publicar']) },
    { id: 'auditor', cor: '#64748b',
      nome: N('Auditor (só leitura)', 'Auditor (read only)'),
      descricao: N('Vê tudo, sem dado pessoal completo, e exporta o log. Não altera nada.',
                   'Sees everything, without full personal data, and exports the log. Changes nothing.'),
      permissoes: soVer().concat(['auditoria:exportar']) },
    { id: 'desenvolvedor', cor: '#14b8a6',
      nome: N('Desenvolvimento', 'Development'),
      descricao: N('Apps, serviços, versões, integrações, automações e publicação técnica. Sem dado pessoal.',
                   'Apps, services, versions, integrations, automations and technical publishing. No personal data.'),
      permissoes: varias(['apps', 'servicos', 'versoes', 'integracoes', 'telemetria', 'publicar', 'automacoes',
        'mapa', 'armazenamento', 'planos:ver']) },
    { id: 'analista', cor: '#94a3b8',
      nome: N('Analista (relatórios)', 'Analyst (reports)'),
      descricao: N('Painel, telemetria e listas sem dado pessoal. Não altera nada.',
                   'Dashboard, telemetry and lists without personal data. Changes nothing.'),
      permissoes: ['apps:ver', 'planos:ver', 'usuarios:ver', 'suporte:ver', 'telemetria:ver', 'mapa:exportar'] }
  ];
  PAPEIS.forEach(function (p) {
    if (p.permissoes[0] !== '*') {
      BASICAS.forEach(function (b) { if (p.permissoes.indexOf(b) === -1) p.permissoes.push(b); });
    }
  });

  /* Regras de separação de funções (quem faz não é quem confere) */
  var SEPARACAO = [
    { id: 'termo-autor-aprovador', estado: 'ativo',
      nome: N('Quem escreve um termo não pode aprová-lo', 'Whoever writes a term cannot approve it'),
      descricao: N('A aprovação exige outra pessoa com permissão de aprovar. Exceção: se só houver um dono na equipe, ele aprova e o log registra "aprovação sem segunda pessoa".',
                   'Approval requires another person with approve permission. Exception: with a single owner on the team, they approve and the log records "approval without a second person".') },
    { id: 'exclusao-titular', estado: 'ativo',
      nome: N('Excluir dados de titular pede motivo e confirmação digitada', 'Deleting a data subject requires a reason and typed confirmation'),
      descricao: N('Ninguém exclui um cadastro sem escrever o motivo e digitar o e-mail da pessoa.',
                   'No one deletes a record without writing a reason and typing the person\'s e-mail.') },
    { id: 'ultimo-dono', estado: 'ativo',
      nome: N('Sempre sobra pelo menos um dono', 'There is always at least one owner'),
      descricao: N('O último dono não pode ser desativado nem trocar de papel.',
                   'The last owner cannot be disabled or change role.') },
    { id: 'publicar-duplo', estado: 'especificar',
      nome: N('Publicação com segunda aprovação', 'Publishing with a second approval'),
      descricao: N('Falta decidir se toda publicação precisa de uma segunda pessoa, ou só a de termos.',
                   'To decide: does every publication need a second person, or only terms?') }
  ];

  /* ------------------------------------------------------------------
     4. PERFIS DOS CLIENTES (quem usa os apps)
     ------------------------------------------------------------------ */
  var PERFIS = [
    { id: 'visitante', estado: 'ativo', plano: 'visitante',
      nome: N('Visitante', 'Visitor'),
      descricao: N('Usa sem conta. Não guarda dado pessoal. Vê anúncios.', 'Uses without an account. No personal data kept. Sees ads.') },
    { id: 'membro', estado: 'ativo', plano: 'membro',
      nome: N('Membro', 'Member'),
      descricao: N('Tem conta (apelido, e-mail, senha). Vê anúncios.', 'Has an account (nickname, e-mail, password). Sees ads.') },
    { id: 'premium', estado: 'ativo', plano: 'premium',
      nome: N('Premium', 'Premium'),
      descricao: N('Conta sem anúncios e com os serviços marcados como Premium.', 'Ad-free account with the services marked Premium.') },
    { id: 'anunciante', estado: 'parcial', plano: null,
      nome: N('Anunciante', 'Advertiser'),
      descricao: N('Vê as métricas dos próprios anúncios. Contrato e cobrança ainda a especificar.',
                   'Sees the metrics of their own ads. Contract and billing still to be specified.') },
    { id: 'responsavel-familia', estado: 'especificar', plano: 'familia',
      nome: N('Responsável da família', 'Family owner'),
      descricao: N('Titular do Plano Família: convida e remove membros, responde pelos menores.',
                   'Family Plan holder: invites and removes members, answers for minors.') },
    { id: 'membro-familia', estado: 'especificar', plano: 'familia',
      nome: N('Membro da família', 'Family member'),
      descricao: N('Entra pelo convite do responsável e divide recados, tarefas e listas.',
                   'Joins through the owner\'s invite and shares notices, tasks and lists.') },
    { id: 'dependente', estado: 'especificar', plano: 'familia',
      nome: N('Dependente (menor de idade)', 'Dependant (minor)'),
      descricao: N('Perfil de criança ou adolescente sob o responsável. Regras da LGPD art. 14.',
                   'Child or teenager profile under the owner. LGPD art. 14 rules.') },
    { id: 'profissional', estado: 'especificar', plano: 'profissional',
      nome: N('Profissional', 'Professional'),
      descricao: N('Personal, nutricionista, médico (RiseONE): acompanha clientes que autorizarem.',
                   'Trainer, nutritionist, doctor (RiseONE): follows clients who authorise it.') },
    { id: 'cliente-profissional', estado: 'especificar', plano: 'membro',
      nome: N('Cliente de profissional', 'Professional\'s client'),
      descricao: N('Autoriza um profissional a ver parte dos seus dados, e pode revogar.',
                   'Authorises a professional to see part of their data, and can revoke it.') }
  ];

  /* ------------------------------------------------------------------
     5. REGISTRO DE FUNÇÕES
     estado:
       'ativo'       funciona hoje
       'parcial'     funciona em parte (a nota diz o que falta)
       'futuro'      desenho pronto, depende de servidor/serviço (fase 2 ou 3)
       'especificar' falta decisão do dono antes de construir
     fase: 1 = sem servidor · 2 = Firebase · 3 = cobrança/pagamento
     falta: a pergunta que precisa de resposta para sair do cinza
     ------------------------------------------------------------------ */
  function F(id, modulo, estado, fase, nome, falta) {
    return { id: id, modulo: modulo, estado: estado, fase: fase, nome: nome, falta: falta || null };
  }
  var FUNCOES = [
    F('painel.receita', 'painel', 'futuro', 3, N('Receita do mês', 'Monthly revenue'),
      N('Escolher o meio de pagamento e definir os preços dos planos.', 'Choose the payment provider and set plan prices.')),
    F('painel.ativos', 'painel', 'futuro', 2, N('Pessoas ativas de verdade (todos os aparelhos)', 'Real active people (all devices)'),
      N('Ligar o Firebase e decidir o que conta como "ativo" (abriu o app? fez uma ação?).', 'Connect Firebase and decide what counts as "active" (opened the app? did an action?).')),

    F('apps.saude', 'apps', 'ativo', 1, N('Verificar se cada app está no ar', 'Check whether each app is online')),
    F('apps.versao-real', 'apps', 'futuro', 2, N('Versão instalada nos aparelhos', 'Version installed on devices'),
      N('Depende da telemetria: cada app avisar a versão ao abrir.', 'Depends on telemetry: each app reports its version when it opens.')),

    F('planos.precos', 'planos', 'especificar', 3, N('Preço e cobrança', 'Price and billing'),
      N('Valores, moeda, mensal/anual, período de teste grátis e qual meio de pagamento.', 'Amounts, currency, monthly/yearly, free trial and which payment provider.')),
    F('planos.cupons', 'planos', 'especificar', 2, N('Cupons e códigos de presente', 'Coupons and gift codes'),
      N('Premium só por decisão do admin ou também por código? Com validade? Uso único?', 'Premium only by admin decision or also by code? With expiry? Single use?')),
    F('planos.familia', 'planos', 'especificar', 2, N('Plano Família', 'Family Plan'),
      N('Quantas pessoas, quem paga, o que é dividido, regras para menores de idade.', 'How many people, who pays, what is shared, rules for minors.')),
    F('planos.profissional', 'planos', 'especificar', 2, N('Plano Profissional–Cliente', 'Professional–Client plan'),
      N('Quem paga (profissional ou cliente), quantos clientes, o que o profissional pode ver.', 'Who pays (professional or client), how many clients, what the professional may see.')),

    F('servicos.limites', 'servicos', 'especificar', 2, N('Limites por plano (ex.: 10 leituras de OCR por dia)', 'Limits per plan (e.g. 10 OCR reads a day)'),
      N('Quais serviços têm limite e de quanto, por plano.', 'Which services have a limit and how much, per plan.')),
    F('servicos.importar', 'servicos', 'ativo', 1, N('Importar o servicos.json de um app', 'Import an app\'s servicos.json')),

    F('usuarios.import', 'usuarios', 'ativo', 1, N('Importar e exportar usuários (CSV/JSON)', 'Import and export users (CSV/JSON)')),
    F('usuarios.sync', 'usuarios', 'futuro', 2, N('Usuários reais de todos os aparelhos', 'Real users from every device'),
      N('Firebase Authentication: projeto único para todos os apps ou um por app?', 'Firebase Authentication: one project for every app or one per app?')),
    F('usuarios.recado', 'usuarios', 'futuro', 2, N('Recado para uma pessoa só', 'Notice to a single person'),
      N('Depende do servidor para entregar na caixa de recados de uma pessoa.', 'Needs the server to deliver to one person\'s inbox.')),
    F('usuarios.saude', 'usuarios', 'especificar', 2, N('Termômetro de engajamento e risco de cancelar', 'Engagement and churn-risk score'),
      N('Quais sinais contam (frequência, chamados, plano) e o que fazer quando o risco sobe.', 'Which signals count (frequency, tickets, plan) and what to do when risk rises.')),
    F('usuarios.ver-como', 'usuarios', 'especificar', 2, N('Ver o app como o usuário (para suporte)', 'See the app as the user (for support)'),
      N('Com consentimento da pessoa? Só leitura? Quanto tempo? Sempre registrado no log.', 'With the person\'s consent? Read only? For how long? Always logged.')),
    F('usuarios.familia', 'usuarios', 'parcial', 2, N('Vínculos de família', 'Family links'),
      N('Hoje o vínculo fica só no RootifyONE; nos apps depende do Plano Família e do servidor.', 'Today the link lives only in RootifyONE; in the apps it depends on the Family Plan and a server.')),
    F('usuarios.anunciantes', 'usuarios', 'especificar', 3, N('CRM de anunciantes (funil de vendas)', 'Advertiser CRM (sales funnel)'),
      N('Etapas do funil, contrato, preço do anúncio, relatório para o anunciante.', 'Funnel stages, contract, ad price, report for the advertiser.')),
    F('usuarios.duplicados', 'usuarios', 'ativo', 1, N('Aviso de cadastro duplicado (mesmo e-mail)', 'Duplicate record warning (same e-mail)')),

    F('suporte.manual', 'suporte', 'ativo', 1, N('Chamados registrados pela equipe', 'Tickets logged by the team')),
    F('suporte.formspree', 'suporte', 'parcial', 1, N('Chamados do formulário dos apps (Formspree)', 'Tickets from the apps\' form (Formspree)'),
      N('Hoje: exportar o CSV no Formspree e importar aqui. Automático exige servidor.', 'Today: export the CSV from Formspree and import it here. Automatic needs a server.')),
    F('suporte.email', 'suporte', 'futuro', 2, N('Chamados chegando por e-mail', 'Tickets arriving by e-mail'),
      N('Escolher o provedor de e-mail e o endereço de suporte.', 'Choose the e-mail provider and the support address.')),
    F('suporte.whatsapp', 'suporte', 'futuro', 2, N('Chamados por WhatsApp e Telegram', 'Tickets via WhatsApp and Telegram'),
      N('WhatsApp Business é pago por mensagem; bot do Telegram é grátis mas precisa de servidor.', 'WhatsApp Business is paid per message; a Telegram bot is free but needs a server.')),
    F('suporte.csat', 'suporte', 'especificar', 2, N('Pesquisa de satisfação ao fechar', 'Satisfaction survey on close'),
      N('Escala (1 a 5? carinhas?), quando enviar, por qual canal.', 'Scale (1 to 5? faces?), when to send, through which channel.')),
    F('suporte.horario', 'suporte', 'especificar', 1, N('Horário de atendimento e feriados no prazo', 'Business hours and holidays in the deadline'),
      N('Qual o horário de atendimento e se o prazo corre à noite e no fim de semana.', 'What the support hours are and whether the deadline runs at night and on weekends.')),
    F('suporte.ia', 'suporte', 'ativo', 1, N('Sugestão de resposta com IA (dados mascarados)', 'AI reply suggestion (masked data)')),
    F('suporte.mesclar', 'suporte', 'ativo', 1, N('Juntar chamados repetidos', 'Merge duplicate tickets')),

    F('kb.assist', 'kb', 'parcial', 1, N('Ajuda publicada no Assist ONE dos apps', 'Help published to Assist ONE in the apps'),
      N('O arquivo ajuda.json é publicado; a central do Assist ONE nos apps ainda vai ler dele.', 'ajuda.json is published; the Assist ONE centre in the apps still has to read it.')),

    F('termos.fluxo', 'termos', 'ativo', 1, N('Rascunho → revisão → aprovado → publicado', 'Draft → review → approved → published')),
    F('termos.ia', 'termos', 'ativo', 1, N('Escrever, melhorar, conferir e traduzir termos com IA (grátis ou paga)', 'Write, improve, check and translate terms with AI (free or paid)')),
    F('termos.agente', 'termos', 'ativo', 1, N('Agente de políticas: confere o que falta em cada app e escreve os rascunhos', 'Policy agent: checks what each app is missing and writes the drafts')),
    F('termos.bloqueio', 'termos', 'parcial', 1, N('Apps bloqueiam até a pessoa aceitar', 'Apps block until the person accepts'),
      N('O termos.json é publicado; a tela de aceite ainda entra no módulo comum dos apps.', 'termos.json is published; the acceptance screen still has to enter the apps\' shared module.')),
    F('termos.juridico', 'termos', 'especificar', 1, N('Validação jurídica dos textos', 'Legal review of the texts'),
      N('Quem valida (advogado) e se a SolverONE é controladora ou operadora em cada app.', 'Who reviews (lawyer) and whether SolverONE is controller or processor in each app.')),

    F('recados.entrega', 'recados', 'parcial', 1, N('Recado aparecendo na caixa de recados dos apps', 'Notice showing in the apps\' inbox'),
      N('O recados.json é publicado; a caixa de recados do módulo comum ainda vai ser construída.', 'recados.json is published; the shared module\'s inbox is still to be built.')),

    F('anuncios.externos', 'anuncios', 'especificar', 3, N('Anúncios de terceiros pagantes', 'Paid third-party ads'),
      N('Aceitar anunciantes de fora? Preço por exibição ou por mês? Regras do que pode ser anunciado.', 'Accept outside advertisers? Price per view or per month? Rules on what can be advertised.')),
    F('anuncios.metricas', 'anuncios', 'futuro', 2, N('Métricas somadas de todos os aparelhos', 'Metrics summed across all devices'),
      N('Hoje cada aparelho conta sozinho; somar exige servidor.', 'Today each device counts on its own; adding up needs a server.')),

    F('publicar.pacote', 'publicar', 'ativo', 1, N('Baixar o pacote de arquivos (zip)', 'Download the file package (zip)')),
    F('publicar.github', 'publicar', 'ativo', 1, N('Publicar direto no GitHub com o seu token', 'Publish straight to GitHub with your token')),
    F('publicar.historico', 'publicar', 'ativo', 1, N('Histórico e voltar para uma publicação anterior', 'History and roll back to a previous publication')),
    F('publicar.agendada', 'publicar', 'futuro', 2, N('Publicação agendada (ex.: termos valendo dia 1º)', 'Scheduled publication (e.g. terms effective on the 1st)'),
      N('Precisa de algo rodando sozinho no horário: servidor ou GitHub Actions.', 'Needs something running on its own at that time: a server or GitHub Actions.')),

    F('papeis.custom', 'papeis', 'ativo', 1, N('Criar papéis próprios a partir de um modelo', 'Create custom roles from a template')),
    F('papeis.clientes', 'papeis', 'parcial', 2, N('Perfis dos clientes valendo nos apps', 'Customer profiles enforced in the apps'),
      N('Visitante, Membro e Premium já valem; Família e Profissional esperam a especificação.', 'Visitor, Member and Premium already apply; Family and Professional await a spec.')),

    F('equipe.local', 'equipe', 'ativo', 1, N('Contas da equipe neste aparelho', 'Team accounts on this device')),
    F('equipe.remota', 'equipe', 'futuro', 2, N('Equipe entrando de qualquer aparelho', 'Team signing in from any device'),
      N('Firebase Authentication + regra que confere o papel no servidor.', 'Firebase Authentication + a rule that checks the role on the server.')),
    F('equipe.convite', 'equipe', 'futuro', 2, N('Convite por e-mail', 'E-mail invitation'),
      N('Depende do provedor de e-mail.', 'Depends on the e-mail provider.')),

    F('privacidade.pedidos', 'privacidade', 'ativo', 1, N('Pedidos dos titulares com prazo de 15 dias', 'Data-subject requests with a 15-day deadline')),
    F('privacidade.ropa', 'privacidade', 'parcial', 1, N('Registro das operações de tratamento', 'Record of processing activities'),
      N('Rascunho pronto por app; precisa ser validado por advogado.', 'Draft ready per app; must be reviewed by a lawyer.')),
    F('privacidade.incidentes', 'privacidade', 'ativo', 1, N('Registro de incidentes de segurança', 'Security incident register')),
    F('privacidade.execucao', 'privacidade', 'futuro', 2, N('Excluir e exportar dados direto nos apps', 'Delete and export data straight in the apps'),
      N('Hoje os dados moram no aparelho da pessoa; executar à distância exige servidor.', 'Today the data lives on the person\'s device; acting remotely needs a server.')),
    F('privacidade.encarregado', 'privacidade', 'especificar', 1, N('Encarregado nomeado e canal público', 'Named DPO and public channel'),
      N('Quem é o encarregado e qual e-mail público recebe os pedidos.', 'Who the DPO is and which public e-mail receives requests.')),

    F('integracoes.github', 'integracoes', 'ativo', 1, N('GitHub (publicação)', 'GitHub (publishing)')),
    F('integracoes.formspree', 'integracoes', 'ativo', 1, N('Formspree (formulários)', 'Formspree (forms)')),
    F('integracoes.ia', 'integracoes', 'ativo', 1, N('Política das chaves de IA', 'AI key policy')),
    F('integracoes.firebase', 'integracoes', 'especificar', 2, N('Firebase', 'Firebase'),
      N('Projeto único para todos os apps (uma conta vale em todos) ou um por app?', 'One project for every app (one account works everywhere) or one per app?')),
    F('integracoes.email', 'integracoes', 'especificar', 2, N('Envio de e-mail', 'E-mail sending'),
      N('Qual provedor e qual endereço remetente.', 'Which provider and which sender address.')),
    F('integracoes.pagamento', 'integracoes', 'especificar', 3, N('Meio de pagamento', 'Payment provider'),
      N('Qual gateway (e se aceita PIX), e quem emite nota.', 'Which gateway (and whether it takes PIX), and who issues invoices.')),
    F('integracoes.mensageria', 'integracoes', 'futuro', 2, N('WhatsApp e Telegram', 'WhatsApp and Telegram'),
      N('Depende de servidor; WhatsApp é pago por mensagem.', 'Needs a server; WhatsApp is paid per message.')),
    F('integracoes.analytics', 'integracoes', 'especificar', 2, N('Ferramenta de telemetria', 'Telemetry tool'),
      N('Qual ferramenta, custo e como fica o consentimento (LGPD).', 'Which tool, cost and how consent works (LGPD).')),

    F('automacoes.locais', 'automacoes', 'ativo', 1, N('Regras que rodam aqui dentro', 'Rules that run in here')),
    F('automacoes.agendadas', 'automacoes', 'futuro', 2, N('Regras agendadas (todo dia, toda semana)', 'Scheduled rules (daily, weekly)'),
      N('Precisam de algo rodando mesmo com o RootifyONE fechado.', 'They need something running even with RootifyONE closed.')),
    F('automacoes.email', 'automacoes', 'futuro', 2, N('Ação "enviar e-mail"', '"Send e-mail" action'),
      N('Depende do provedor de e-mail.', 'Depends on the e-mail provider.')),

    F('financeiro.custos', 'financeiro', 'ativo', 1, N('Custos da plataforma', 'Platform costs')),
    F('financeiro.receita', 'financeiro', 'futuro', 3, N('Receita e assinaturas', 'Revenue and subscriptions'),
      N('Depende do meio de pagamento.', 'Depends on the payment provider.')),
    F('financeiro.meios', 'financeiro', 'especificar', 3, N('Meios de pagamento aceitos', 'Accepted payment methods'),
      N('Cartão, PIX, boleto? Assinatura recorrente?', 'Card, PIX, boleto? Recurring subscription?')),
    F('financeiro.notas', 'financeiro', 'especificar', 3, N('Notas fiscais', 'Invoices'),
      N('Emissão de nota: por qual empresa (CNPJ) e qual sistema.', 'Invoicing: under which company and which system.')),

    F('telemetria.uso', 'telemetria', 'futuro', 2, N('Uso por app e por função', 'Usage per app and feature'),
      N('Escolher a ferramenta e o texto do consentimento.', 'Choose the tool and the consent text.')),
    F('telemetria.erros', 'telemetria', 'futuro', 2, N('Erros dos apps', 'App errors'),
      N('Cada app enviar os erros (sem dado pessoal) para um lugar central.', 'Each app sending errors (no personal data) to a central place.')),
    F('telemetria.desempenho', 'telemetria', 'futuro', 2, N('Tempo de carregamento', 'Load time'),
      N('Mesma ferramenta da telemetria de uso.', 'Same tool as usage telemetry.')),

    F('armazenamento.cotas', 'armazenamento', 'ativo', 1, N('Cota de espaço por plano', 'Space quota per plan')),
    F('armazenamento.local', 'armazenamento', 'ativo', 1, N('Espaço usado neste aparelho', 'Space used on this device')),
    F('armazenamento.central', 'armazenamento', 'especificar', 2, N('Armazenamento da SolverONE', 'SolverONE storage'),
      N('Onde guardar arquivos dos usuários (Firebase Storage pode exigir plano pago — conferir) e o tamanho das cotas.', 'Where to keep users\' files (Firebase Storage may require a paid plan — check) and the quota sizes.')),

    F('config.pin', 'configuracoes', 'ativo', 1, N('Entrar com PIN', 'Sign in with PIN')),
    F('config.digital', 'configuracoes', 'ativo', 1, N('Entrar com a digital (ou rosto)', 'Sign in with fingerprint (or face)')),
    F('config.backup', 'configuracoes', 'ativo', 1, N('Cópia de segurança cifrada', 'Encrypted backup'))
  ];

  /* ------------------------------------------------------------------
     6. DADOS INICIAIS
     ------------------------------------------------------------------ */
  var APPS = [
    { id: 'portal', nome: N('Portal de Projetos', 'Projects Portal'), repo: 'marceloneco.github.io',
      url: 'https://marceloneco.github.io/', estado: 'beta', cor: '#60a5fa', glifo: '🧭',
      descricao: N('Página central com os links dos apps', 'Central page linking every app') },
    { id: 'rootify-one', nome: N('RootifyONE', 'RootifyONE'), repo: 'rootify-one',
      url: 'https://marceloneco.github.io/rootify-one/', estado: 'alpha', cor: '#f87171', glifo: '🌳',
      descricao: N('Administração central da SolverONE', 'SolverONE central administration'), interno: true },
    { id: 'feature-tester', nome: N('Feature Tester', 'Feature Tester'), repo: 'FeatureTesting',
      url: 'https://marceloneco.github.io/FeatureTesting/', estado: 'beta', cor: '#fbbf24', glifo: '🧪',
      descricao: N('Testador de funcionalidades', 'Feature testing bench'), interno: true },
    { id: 'omnilife-one', nome: N('OmniLifeONE', 'OmniLifeONE'), repo: 'omnilife-one',
      url: 'https://marceloneco.github.io/omnilife-one/', estado: 'beta', cor: '#e4a460', glifo: '🧩',
      descricao: N('Assistente da família e da casa', 'Family and home assistant') },
    { id: 'moneytrio', nome: N('MoneyTRIO', 'MoneyTRIO'), repo: 'investify-me',
      url: 'https://marceloneco.github.io/investify-me/', estado: 'beta', cor: '#d6a076', glifo: '💰',
      descricao: N('BudgetONE, InvestifyONE e TaxONE', 'BudgetONE, InvestifyONE and TaxONE') },
    { id: 'rise-one', nome: N('RiseONE', 'RiseONE'), repo: 'rise-one',
      url: 'https://marceloneco.github.io/rise-one/', estado: 'beta', cor: '#beb0ec', glifo: '🏃',
      descricao: N('Exercício, dieta e saúde', 'Exercise, diet and health') },
    { id: 'eleicoes-2026', nome: N('Eleições 2026', '2026 Elections'), repo: 'planos-candidatos-2026',
      url: 'https://marceloneco.github.io/planos-candidatos-2026/', estado: 'beta', cor: '#a4c4a6', glifo: '🗳️',
      descricao: N('Infográficos dos planos de governo', 'Government plan infographics') },
    { id: 'contador-de-historias', nome: N('Contador de Histórias', 'Storyteller'), repo: 'contador-de-historias',
      url: 'https://marceloneco.github.io/contador-de-historias/', estado: 'beta', cor: '#96c0e8', glifo: '📖',
      descricao: N('Acervo, leitura e criação de histórias', 'Story library, reading and creation') },
    { id: 'cifras-violao', nome: N('CifrasONE', 'CifrasONE'), repo: 'cifras-violao',
      url: 'https://marceloneco.github.io/cifras-violao/', estado: 'beta', cor: '#eaa4b8', glifo: '🎸',
      descricao: N('Cifras, acordes e afinador', 'Chords, chord charts and tuner') },
    { id: 'petlover', nome: N('PetLover', 'PetLover'), repo: '',
      url: '', estado: 'backlog', cor: '#86efac', glifo: '🐾',
      descricao: N('A definir', 'To be defined') }
  ];

  var PLANOS = [
    { id: 'visitante', nome: N('Visitante', 'Visitor'), ordem: 1, ativo: true, semAnuncios: false, exigeConta: false,
      cotaMB: 0, membrosMax: 1, preco: null,
      descricao: N('Sem conta, sem dado guardado, com anúncios.', 'No account, no data kept, with ads.') },
    { id: 'membro', nome: N('Membro', 'Member'), ordem: 2, ativo: true, semAnuncios: false, exigeConta: true,
      cotaMB: 50, membrosMax: 1, preco: null,
      descricao: N('Conta gratuita, com anúncios.', 'Free account, with ads.') },
    { id: 'premium', nome: N('Premium', 'Premium'), ordem: 3, ativo: true, semAnuncios: true, exigeConta: true,
      cotaMB: 500, membrosMax: 1, preco: null,
      descricao: N('Sem anúncios e com os serviços Premium.', 'Ad-free with Premium services.') },
    { id: 'familia', nome: N('Família', 'Family'), ordem: 4, ativo: false, semAnuncios: true, exigeConta: true,
      cotaMB: 2000, membrosMax: 6, preco: null, especificar: 'planos.familia',
      descricao: N('Uma assinatura para a casa toda.', 'One subscription for the whole household.') },
    { id: 'profissional', nome: N('Profissional', 'Professional'), ordem: 5, ativo: false, semAnuncios: true, exigeConta: true,
      cotaMB: 2000, membrosMax: 1, preco: null, especificar: 'planos.profissional',
      descricao: N('Para quem acompanha clientes (RiseONE).', 'For those who follow clients (RiseONE).') }
  ];

  /* serviços conhecidos de cada app — o resto entra por importação */
  function S(app, id, pt, en) { return { app: app, id: id, nome: N(pt, en), planos: ['*'] }; }
  var SERVICOS = [
    S('*', 'ia', 'Perguntar à IA', 'Ask the AI'),
    S('*', 'ocr', 'Ler texto de foto (OCR)', 'Read text from photo (OCR)'),
    S('*', 'nuvem', 'Cópia no Google Drive / OneDrive', 'Copy to Google Drive / OneDrive'),
    S('*', 'voz', 'Leitura em voz alta', 'Read aloud'),
    S('*', 'notificacoes', 'Avisos e lembretes', 'Alerts and reminders'),
    S('moneytrio', 'budget', 'BudgetONE — orçamento', 'BudgetONE — budget'),
    S('moneytrio', 'invest', 'InvestifyONE — investimentos', 'InvestifyONE — investments'),
    S('moneytrio', 'tax', 'TaxONE — impostos', 'TaxONE — taxes'),
    S('omnilife-one', 'compras', 'Lista de compras e despensa', 'Shopping list and pantry'),
    S('omnilife-one', 'recados-familia', 'Recados da família', 'Family notices'),
    S('omnilife-one', 'vigilante', 'Modo Vigilante (câmera)', 'Watch mode (camera)'),
    S('rise-one', 'treino', 'Treinos e exercícios', 'Workouts and exercises'),
    S('rise-one', 'rotulos', 'Leitura de rótulos', 'Label reading'),
    S('rise-one', 'exames', 'Exames de laboratório', 'Lab results'),
    S('contador-de-historias', 'criar-historia', 'Criar história com IA', 'Create a story with AI'),
    S('cifras-violao', 'afinador', 'Afinador', 'Tuner'),
    S('cifras-violao', 'importar-cifra', 'Importar cifra', 'Import chord chart')
  ];

  var SLA_PADRAO = {   /* horas: primeira resposta / resolução */
    urgente: { resposta: 2, resolucao: 8 },
    alta: { resposta: 8, resolucao: 24 },
    normal: { resposta: 24, resolucao: 72 },
    baixa: { resposta: 48, resolucao: 168 }
  };

  var PRIORIDADES = {
    urgente: N('Urgente', 'Urgent'), alta: N('Alta', 'High'), normal: N('Normal', 'Normal'), baixa: N('Baixa', 'Low')
  };
  var STATUS_CHAMADO = {
    novo: N('Novo', 'New'), aberto: N('Em atendimento', 'Open'),
    'aguardando-cliente': N('Aguardando cliente', 'Waiting on customer'),
    'aguardando-interno': N('Aguardando equipe', 'Waiting on team'),
    resolvido: N('Resolvido', 'Solved'), fechado: N('Fechado', 'Closed')
  };
  var CATEGORIAS_CHAMADO = [
    { id: 'duvida', nome: N('Dúvida', 'Question') },
    { id: 'problema', nome: N('Problema / erro', 'Problem / bug') },
    { id: 'pedido', nome: N('Pedido de função', 'Feature request') },
    { id: 'conta', nome: N('Conta e acesso', 'Account and access') },
    { id: 'cobranca', nome: N('Cobrança', 'Billing') },
    { id: 'privacidade', nome: N('Privacidade (LGPD)', 'Privacy (LGPD)') },
    { id: 'sugestao', nome: N('Sugestão / elogio', 'Suggestion / praise') }
  ];
  var CANAIS = {
    interno: N('Registrado pela equipe', 'Logged by the team'), formulario: N('Formulário do app', 'App form'),
    email: N('E-mail', 'E-mail'), whatsapp: N('WhatsApp', 'WhatsApp'), telefone: N('Telefone', 'Phone')
  };

  var RESPOSTAS_PRONTAS = [
    { id: 'saudacao', titulo: N('Recebemos seu pedido', 'We got your request'),
      texto: N('Olá, {nome}! Recebemos seu pedido e já estamos olhando. Respondemos por aqui assim que tivermos novidade.',
               'Hi {nome}! We got your request and are already looking into it. We\'ll reply here as soon as we have news.') },
    { id: 'mais-info', titulo: N('Pedir mais detalhes', 'Ask for more details'),
      texto: N('Olá, {nome}! Para ajudar melhor, pode dizer em qual aparelho (celular ou computador) e navegador isso aconteceu, e se possível mandar uma foto da tela?',
               'Hi {nome}! To help better, could you tell us which device (phone or computer) and browser this happened on, and if possible send a screenshot?') },
    { id: 'atualizar', titulo: N('Atualizar o app', 'Update the app'),
      texto: N('Olá, {nome}! Saiu uma versão nova do {app}. Feche todas as abas dele e abra de novo; no celular, se estiver instalado, feche e abra o app.',
               'Hi {nome}! A new version of {app} is out. Close all its tabs and open it again; on a phone, if installed, close and reopen the app.') },
    { id: 'resolvido', titulo: N('Resolvido', 'Solved'),
      texto: N('Olá, {nome}! Isso já está resolvido. Se voltar a acontecer, é só responder esta mensagem.',
               'Hi {nome}! This is solved. If it happens again, just reply to this message.') },
    { id: 'lgpd', titulo: N('Pedido de privacidade recebido', 'Privacy request received'),
      texto: N('Olá, {nome}! Registramos seu pedido sobre seus dados pessoais. A resposta completa sai em até 15 dias, como prevê a LGPD.',
               'Hi {nome}! We have logged your request about your personal data. The full answer comes within 15 days, as the LGPD requires.') }
  ];

  var TIPOS_PEDIDO_LGPD = {
    confirmacao: N('Confirmar se tratamos dados', 'Confirm whether we process data'),
    acesso: N('Acesso aos dados', 'Access to data'),
    correcao: N('Correção', 'Correction'),
    exclusao: N('Exclusão', 'Deletion'),
    portabilidade: N('Portabilidade', 'Portability'),
    revogacao: N('Revogar consentimento', 'Withdraw consent'),
    informacao: N('Com quem compartilhamos', 'Who we share with'),
    oposicao: N('Oposição a um tratamento', 'Objection to processing')
  };

  /* Registro de operações de tratamento: rascunho por app (validar com advogado) */
  var ROPA_INICIAL = [
    { app: 'moneytrio', dados: N('Lançamentos financeiros, fotos de recibos, contas e cartões (finais)', 'Financial entries, receipt photos, accounts and cards (last digits)'),
      finalidade: N('Controle financeiro pessoal', 'Personal financial control'), base: 'execucao',
      onde: N('No aparelho da pessoa; cópia opcional no drive dela', 'On the person\'s device; optional copy in their drive'),
      retencao: N('Enquanto a pessoa mantiver', 'While the person keeps it'), operadores: 'Google Drive / Microsoft OneDrive (opcional), provedor de IA escolhido pela pessoa' },
    { app: 'rise-one', dados: N('Treinos, medidas, exames e carteirinha do plano (dado de saúde = sensível)', 'Workouts, measurements, lab results and health card (health data = sensitive)'),
      finalidade: N('Acompanhar saúde e treino', 'Track health and training'), base: 'consentimento',
      onde: N('No aparelho da pessoa, cifrado', 'On the person\'s device, encrypted'),
      retencao: N('Enquanto a pessoa mantiver', 'While the person keeps it'), operadores: 'Provedor de IA escolhido pela pessoa (só com aviso)' },
    { app: 'omnilife-one', dados: N('Membros da família, recados, tarefas, listas, contatos', 'Family members, notices, tasks, lists, contacts'),
      finalidade: N('Organizar a casa e a família', 'Organise home and family'), base: 'execucao',
      onde: N('No aparelho; futuro: servidor para dividir entre a família', 'On the device; future: server to share within the family'),
      retencao: N('Enquanto a pessoa mantiver', 'While the person keeps it'), operadores: 'Futuro: Google Firebase' },
    { app: 'contador-de-historias', dados: N('Nomes e gostos de crianças usados nas histórias', 'Children\'s names and tastes used in stories'),
      finalidade: N('Personalizar histórias', 'Personalise stories'), base: 'consentimento-responsavel',
      onde: N('No aparelho; nomes trocados por códigos antes de ir para a IA', 'On the device; names swapped for codes before going to the AI'),
      retencao: N('Enquanto a pessoa mantiver', 'While the person keeps it'), operadores: 'Provedor de IA e de voz (texto sem nomes)' }
  ];
  var BASES_LEGAIS = {
    consentimento: N('Consentimento (art. 7º, I)', 'Consent (art. 7, I)'),
    execucao: N('Execução de contrato / pedido do titular (art. 7º, V)', 'Contract / data subject request (art. 7, V)'),
    'legitimo-interesse': N('Legítimo interesse (art. 7º, IX)', 'Legitimate interest (art. 7, IX)'),
    'obrigacao-legal': N('Obrigação legal (art. 7º, II)', 'Legal obligation (art. 7, II)'),
    'consentimento-responsavel': N('Consentimento de um dos pais ou responsável (art. 14)', 'Parent or guardian consent (art. 14)'),
    'tutela-saude': N('Tutela da saúde (art. 11, II, f)', 'Health protection (art. 11, II, f)')
  };

  /* Gatilhos e ações das automações que rodam aqui dentro */
  var GATILHOS = {
    'chamado-criado': N('Quando um chamado é criado', 'When a ticket is created'),
    'chamado-sla-risco': N('Quando o prazo de um chamado está para estourar', 'When a ticket deadline is about to break'),
    'usuario-criado': N('Quando um usuário é cadastrado', 'When a user is added'),
    'pedido-lgpd-criado': N('Quando um pedido de privacidade é criado', 'When a privacy request is created'),
    'termo-aprovado': N('Quando um termo é aprovado', 'When a term is approved')
  };
  var CAMPOS_CONDICAO = {
    app: N('App', 'App'), categoria: N('Categoria', 'Category'), prioridade: N('Prioridade', 'Priority'),
    plano: N('Plano', 'Plan'), texto: N('Texto contém', 'Text contains')
  };
  var ACOES_AUTOMACAO = {
    prioridade: N('Mudar a prioridade para', 'Set priority to'),
    atribuir: N('Atribuir a', 'Assign to'),
    etiqueta: N('Pôr a etiqueta', 'Add the tag'),
    avisar: N('Avisar a equipe (notificação neste aparelho)', 'Alert the team (notification on this device)'),
    'email-futuro': N('Enviar e-mail (futuro)', 'Send e-mail (future)')
  };

  RF.cat = {
    GRUPOS: GRUPOS, MODULOS: MODULOS, ACOES: ACOES, RECURSOS: RECURSOS, BASICAS: BASICAS,
    PAPEIS: PAPEIS, SEPARACAO: SEPARACAO, PERFIS: PERFIS, FUNCOES: FUNCOES,
    APPS: APPS, PLANOS: PLANOS, SERVICOS: SERVICOS, SLA_PADRAO: SLA_PADRAO,
    PRIORIDADES: PRIORIDADES, STATUS_CHAMADO: STATUS_CHAMADO, CATEGORIAS_CHAMADO: CATEGORIAS_CHAMADO,
    CANAIS: CANAIS, RESPOSTAS_PRONTAS: RESPOSTAS_PRONTAS, TIPOS_PEDIDO_LGPD: TIPOS_PEDIDO_LGPD,
    ROPA_INICIAL: ROPA_INICIAL, BASES_LEGAIS: BASES_LEGAIS,
    GATILHOS: GATILHOS, CAMPOS_CONDICAO: CAMPOS_CONDICAO, ACOES_AUTOMACAO: ACOES_AUTOMACAO,
    funcao: function (id) { return FUNCOES.filter(function (f) { return f.id === id; })[0] || null; },
    modulo: function (id) { return MODULOS.filter(function (m) { return m.id === id; })[0] || null; }
  };
})(window);
