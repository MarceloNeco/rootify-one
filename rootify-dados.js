/* =====================================================================
   RootifyONE — DADOS E REGRAS
   ---------------------------------------------------------------------
   Regras de negócio, sem desenho de tela:
     semear      dados iniciais na primeira instalação
     chamados    número, prazo (SLA), situação do prazo
     privacidade prazo de 15 dias dos pedidos dos titulares
     arquivos    gera os arquivos master do solverone-dados + conferência
     automações  roda as regras "quando X, faça Y"
     exemplo     carrega e remove dados fictícios para testar
   ===================================================================== */
(function (raiz) {
  'use strict';
  var RF = raiz.RF;
  var U = RF.util, T = U.T, C = RF.Cofre;
  var HORA = 3600000, DIA = 24 * HORA;

  var ANUNCIOS_INICIAIS = [{"id": "moneytrio", "nome": "MoneyTrio", "cor": "#d6a076", "glifo": "💰", "link": "https://solverone.com.br/investify-me/", "frase": {"pt": "Você sabe quanto gastou este mês? A resposta costuma surpreender.", "en": "Do you know what you spent this month? The answer usually surprises."}}, {"id": "rise-one", "nome": "RiseONE", "cor": "#beb0ec", "glifo": "🏃", "link": "https://solverone.com.br/rise-one/", "frase": {"pt": "O treino que você não registra é o treino que você esquece.", "en": "The workout you don't log is the workout you forget."}}, {"id": "omnilife-one", "nome": "OmniLifeONE", "cor": "#e4a460", "glifo": "🧩", "link": "https://solverone.com.br/omnilife-one/", "selo": {"pt": "EM BREVE", "en": "SOON"}, "frase": {"pt": "A casa, a agenda e os documentos da família num lugar só.", "en": "Home, calendar and family papers in one place."}}, {"id": "planos-candidatos-2026", "nome": "Eleições 2026", "cor": "#a4c4a6", "glifo": "🗳️", "link": "https://solverone.com.br/planos-candidatos-2026/", "frase": {"pt": "Antes de decidir o seu voto, leia o que eles escreveram.", "en": "Before deciding your vote, read what they actually wrote."}}, {"id": "contador-de-historias", "nome": "Contador de Histórias", "cor": "#96c0e8", "glifo": "📖", "link": "https://solverone.com.br/contador-de-historias/", "frase": {"pt": "Hoje a história pode ser nova — e contada com a sua voz.", "en": "Tonight's story can be a new one — told in your own voice."}}, {"id": "cifras-violao", "nome": "Cifras e Acordes", "cor": "#eaa4b8", "glifo": "🎸", "link": "https://solverone.com.br/cifras-violao/", "frase": {"pt": "Aquela música que você sempre quis tocar está a um tom de distância.", "en": "That song you always wanted to play is one key away."}}];

  /* ------------------------------------------------------------------
     SEMEAR (primeira instalação)
     ------------------------------------------------------------------ */
  function semear() {
    var cat = RF.cat;
    if (!C.db.apps) C.db.apps = U.clonar(cat.APPS).map(function (a) { a.versaoMinima = ''; a.responsavel = ''; return a; });
    if (!C.db.planos) C.db.planos = U.clonar(cat.PLANOS);
    if (!C.db.servicos) C.db.servicos = U.clonar(cat.SERVICOS).map(function (s) { s.chave = s.app + '/' + s.id; return s; });
    if (!C.db.respostas) C.db.respostas = U.clonar(cat.RESPOSTAS_PRONTAS);
    if (!C.db.anuncios) C.db.anuncios = U.clonar(ANUNCIOS_INICIAIS).map(function (a) { a.ativo = true; return a; });
    if (!C.db.ropa) C.db.ropa = U.clonar(cat.ROPA_INICIAL).map(function (r) { r.id = U.uid('ropa-'); r.validado = false; return r; });
    if (!C.db.consentimentos) C.db.consentimentos = [
      { id: 'notificacoes', app: '*', obrigatorio: false, nome: { pt: 'Receber avisos (notificações)', en: 'Receive alerts (notifications)' },
        finalidade: { pt: 'Lembretes e avisos escolhidos pela pessoa.', en: 'Reminders and alerts chosen by the person.' } },
      { id: 'nuvem', app: '*', obrigatorio: false, nome: { pt: 'Cópia no drive pessoal', en: 'Copy to personal drive' },
        finalidade: { pt: 'Guardar uma cópia dos dados no Google Drive ou OneDrive da própria pessoa.', en: 'Keep a copy of the data in the person\'s own Google Drive or OneDrive.' } },
      { id: 'ia', app: '*', obrigatorio: false, nome: { pt: 'Enviar texto à IA', en: 'Send text to the AI' },
        finalidade: { pt: 'Mandar a pergunta e o contexto ao provedor de IA escolhido.', en: 'Send the question and context to the chosen AI provider.' } },
      { id: 'saude', app: 'rise-one', obrigatorio: false, nome: { pt: 'Dados de saúde', en: 'Health data' },
        finalidade: { pt: 'Guardar exames, medidas e carteirinha para acompanhar a saúde.', en: 'Keep lab results, measurements and health card to track health.' } },
      { id: 'telemetria', app: '*', obrigatorio: false, nome: { pt: 'Estatísticas de uso (sem dado pessoal)', en: 'Usage statistics (no personal data)' },
        finalidade: { pt: 'Saber quais funções são usadas e onde há erro.', en: 'Know which features are used and where errors happen.' } }
    ];
    if (!C.db.termos) C.db.termos = termosIniciais();
    if (!C.db.versoes) C.db.versoes = [{
      id: U.uid('v-'), app: 'rootify-one', versao: RF.VERSAO, data: U.agora().slice(0, 10),
      itens: { pt: ['Primeira versão do RootifyONE: CRM, suporte, papéis, termos, publicação e log.'],
               en: ['First RootifyONE release: CRM, support, roles, terms, publishing and log.'] }
    }];
    ['usuarios', 'segmentos', 'chamados', 'kb', 'recados', 'papeis', 'automacoes', 'custos', 'pedidos', 'incidentes',
      'log', 'publicacoes'].forEach(function (n) { if (!C.db[n]) C.db[n] = []; });
    if (!C.db.config) C.db.config = {};
    var cfg = C.db.config;
    if (cfg.bloqueioMin === undefined) cfg.bloqueioMin = 15;
    if (!cfg.sla) cfg.sla = U.clonar(cat.SLA_PADRAO);
    if (!cfg.github) cfg.github = { dono: 'MarceloNeco', repo: 'solverone-dados', ramo: 'main', token: '' };
    if (!cfg.iaPolitica) cfg.iaPolitica = 'compartilhada';
    if (!cfg.numeroChamado) cfg.numeroChamado = 1000;
    if (!cfg.numeroPedido) cfg.numeroPedido = 1;
    if (!cfg.etiquetas) cfg.etiquetas = ['vip', 'beta-tester', 'familia', 'reclamou', 'elogiou'];
  }

  function termosIniciais() {
    function doc(tipo, app, obrig, tpt, ten, xpt, xen) {
      return { id: U.uid('t-'), tipo: tipo, app: app, obrigatorio: obrig, versoes: [{
        versao: 1, estado: 'rascunho', criadoEm: U.agora(), autor: 'sistema',
        titulo: { pt: tpt, en: ten }, texto: { pt: xpt, en: xen },
        nota: { pt: 'Modelo inicial gerado pelo RootifyONE — validar com advogado antes de publicar.',
                en: 'Starter template generated by RootifyONE — have a lawyer review it before publishing.' } }] };
    }
    return [
      doc('uso', '*', true, 'Termos de uso da SolverONE', 'SolverONE terms of use',
        '1. Estes termos valem para todos os apps da SolverONE.\n2. Os apps são oferecidos como estão, para uso pessoal.\n3. O conteúdo que você cria é seu.\n4. Podemos atualizar estes termos; quando a mudança for importante, pediremos um novo aceite.\n5. Dúvidas: fale com o suporte dentro do app.',
        '1. These terms apply to every SolverONE app.\n2. The apps are offered as is, for personal use.\n3. The content you create is yours.\n4. We may update these terms; when the change is significant, we will ask for a new acceptance.\n5. Questions: contact support inside the app.'),
      doc('privacidade', '*', true, 'Política de privacidade', 'Privacy policy',
        'O que coletamos: o mínimo para o app funcionar.\nOnde fica: no seu aparelho; cópia no seu drive só se você ligar.\nCom quem compartilhamos: com o provedor de IA escolhido por você, só quando você pergunta.\nSeus direitos (LGPD): confirmar, acessar, corrigir, excluir, levar seus dados e revogar consentimentos. Resposta em até 15 dias.\nReferência: Lei 13.709/2018 (LGPD).',
        'What we collect: the minimum the app needs.\nWhere it is kept: on your device; a copy in your drive only if you turn it on.\nWho we share with: the AI provider you choose, only when you ask.\nYour rights (LGPD/GDPR): confirm, access, correct, delete, port your data and withdraw consent. Answer within 15 days.\nReference: Brazilian Law 13,709/2018 (LGPD).'),
      doc('aviso-legal', 'rise-one', true, 'Aviso: exercícios e saúde', 'Notice: exercise and health',
        'Os exercícios, séries e alongamentos do RiseONE são informativos, para ajudar na posição e no registro da evolução. Nunca substituem a orientação de um profissional de saúde ou de educação física.',
        'RiseONE exercises, sets and stretches are informational, to help with position and progress tracking. They never replace guidance from a health or physical education professional.'),
      doc('terceiros', '*', false, 'Direitos reservados e conteúdo de terceiros', 'Reserved rights and third-party content',
        'Marcas, músicas, letras, cifras e dados de mercado citados nos apps pertencem aos seus donos e aparecem para uso pessoal. Para pedir remoção, fale com o suporte.',
        'Trademarks, songs, lyrics, chord charts and market data mentioned in the apps belong to their owners and appear for personal use. To request removal, contact support.')
    ];
  }

  /* ------------------------------------------------------------------
     CHAMADOS
     ------------------------------------------------------------------ */
  var Chamados = {
    prazos: function (prioridade, criadoEm) {
      var sla = (C.obj('config').sla || RF.cat.SLA_PADRAO)[prioridade] || RF.cat.SLA_PADRAO.normal;
      var t = new Date(criadoEm).getTime();
      return { resposta: new Date(t + sla.resposta * HORA).toISOString(), resolucao: new Date(t + sla.resolucao * HORA).toISOString() };
    },
    criar: function (dados) {
      var cfg = C.obj('config');
      cfg.numeroChamado = (cfg.numeroChamado || 1000) + 1;
      var agora = dados.criadoEm || U.agora();
      var p = Chamados.prazos(dados.prioridade || 'normal', agora);
      var ch = {
        id: U.uid('ch-'), numero: cfg.numeroChamado, assunto: dados.assunto, app: dados.app || '*',
        categoria: dados.categoria || 'duvida', prioridade: dados.prioridade || 'normal', status: 'novo',
        canal: dados.canal || 'interno', usuario: dados.usuario || null, contato: dados.contato || null,
        responsavel: dados.responsavel || null, nivel: 1, etiquetas: dados.etiquetas || [],
        mensagens: dados.texto ? [{ id: U.uid('m-'), quando: agora, autor: 'cliente', tipo: 'publica', texto: dados.texto }] : [],
        criadoEm: agora, prazoResposta: p.resposta, prazoResolucao: p.resolucao,
        primeiraResposta: null, resolvidoEm: null, fechadoEm: null, exemplo: !!dados.exemplo
      };
      C.lista('chamados').push(ch);
      return ch;
    },
    /* situação do prazo: 'ok' | 'risco' (menos de 25% do tempo) | 'estourado' | 'cumprido' */
    situacao: function (ch) {
      var agora = Date.now();
      if (ch.status === 'resolvido' || ch.status === 'fechado') {
        return (ch.resolvidoEm && new Date(ch.resolvidoEm) > new Date(ch.prazoResolucao)) ? 'estourado' : 'cumprido';
      }
      var alvo = ch.primeiraResposta ? ch.prazoResolucao : ch.prazoResposta;
      var ini = new Date(ch.criadoEm).getTime(), fim = new Date(alvo).getTime();
      if (agora > fim) return 'estourado';
      if ((fim - agora) < (fim - ini) * 0.25) return 'risco';
      return 'ok';
    },
    faltaTexto: function (ch) {
      var alvo = ch.primeiraResposta ? ch.prazoResolucao : ch.prazoResposta;
      var ms = new Date(alvo).getTime() - Date.now(), neg = ms < 0; ms = Math.abs(ms);
      var h = Math.floor(ms / HORA), m = Math.floor((ms % HORA) / 60000);
      var txt = (h >= 48 ? Math.floor(h / 24) + T(' dias', ' days') : h + 'h ' + m + 'min');
      return neg ? T('atrasado ', 'late by ') + txt : T('faltam ', '') + txt + T('', ' left');
    },
    responder: function (ch, texto, tipo, autor) {
      var m = { id: U.uid('m-'), quando: U.agora(), autor: autor, tipo: tipo, texto: texto };
      ch.mensagens.push(m);
      if (tipo === 'publica' && !ch.primeiraResposta) ch.primeiraResposta = m.quando;
      if (tipo === 'publica' && ch.status === 'novo') ch.status = 'aberto';
      return m;
    },
    abertos: function () {
      return C.lista('chamados').filter(function (c) { return c.status !== 'resolvido' && c.status !== 'fechado' && !c.mescladoEm; });
    }
  };

  /* ------------------------------------------------------------------
     PRIVACIDADE — LGPD art. 19, II: resposta completa em até 15 dias
     ------------------------------------------------------------------ */
  var Privacidade = {
    criarPedido: function (dados) {
      var cfg = C.obj('config');
      var n = cfg.numeroPedido || 1; cfg.numeroPedido = n + 1;
      var recebido = dados.recebidoEm || U.agora();
      var p = {
        id: U.uid('lgpd-'), numero: 'LGPD-' + ('000' + n).slice(-4), tipo: dados.tipo, app: dados.app || '*',
        usuario: dados.usuario || null, contato: dados.contato || null, detalhe: dados.detalhe || '',
        recebidoEm: recebido, prazo: new Date(new Date(recebido).getTime() + 15 * DIA).toISOString(),
        status: 'aberto', resposta: '', historico: [], exemplo: !!dados.exemplo
      };
      C.lista('pedidos').push(p);
      return p;
    },
    diasRestantes: function (p) { return Math.ceil((new Date(p.prazo).getTime() - Date.now()) / DIA); },
    abertos: function () { return C.lista('pedidos').filter(function (p) { return p.status === 'aberto' || p.status === 'em-andamento'; }); }
  };

  /* ------------------------------------------------------------------
     TERMOS: versão atual, publicada e rascunho
     ------------------------------------------------------------------ */
  var Termos = {
    publicada: function (t) {
      for (var i = t.versoes.length - 1; i >= 0; i--) if (t.versoes[i].estado === 'publicado') return t.versoes[i];
      return null;
    },
    ultima: function (t) { return t.versoes[t.versoes.length - 1]; },
    novaVersao: function (t, autor) {
      var ult = Termos.ultima(t);
      var v = { versao: ult.versao + 1, estado: 'rascunho', criadoEm: U.agora(), autor: autor,
        titulo: U.clonar(ult.titulo), texto: U.clonar(ult.texto), nota: null };
      t.versoes.push(v);
      return v;
    },
    pendentesAprovacao: function () {
      return C.lista('termos').filter(function (t) { return Termos.ultima(t).estado === 'revisao'; });
    }
  };

  /* ------------------------------------------------------------------
     ARQUIVOS MASTER (repositório solverone-dados)
     ------------------------------------------------------------------ */
  function nivelDeDGO(planosPermitidos) {
    /* compatível com o servicos.json que o módulo DGO já lê hoje */
    if (!planosPermitidos || planosPermitidos.indexOf('*') !== -1 || planosPermitidos.indexOf('visitante') !== -1) return 'visitante';
    if (planosPermitidos.indexOf('membro') !== -1) return 'pagante';
    return 'premium';
  }
  function j(o) { return JSON.stringify(o, null, 2) + '\n'; }

  function gerarArquivos() {
    var hoje = U.agora();
    var cab = function (extra) { return Object.assign({ formato: 1, geradoEm: hoje, geradoPor: 'RootifyONE ' + RF.VERSAO }, extra); };
    var apps = C.lista('apps'), arquivos = [];

    arquivos.push({ nome: 'apps.json', texto: j(cab({ apps: apps.map(function (a) {
      return { id: a.id, nome: a.nome, url: a.url, estado: a.estado, versaoMinima: a.versaoMinima || '', cor: a.cor,
        glifo: a.glifo, descricao: a.descricao, interno: !!a.interno };
    }) })) });

    arquivos.push({ nome: 'planos.json', texto: j(cab({ planos: C.lista('planos').map(function (p) {
      return { id: p.id, nome: p.nome, descricao: p.descricao, ordem: p.ordem, ativo: p.ativo, semAnuncios: p.semAnuncios,
        exigeConta: p.exigeConta, cotaMB: p.cotaMB, membrosMax: p.membrosMax };
    }) })) });

    var globais = C.lista('servicos').filter(function (s) { return s.app === '*'; });
    apps.filter(function (a) { return a.estado !== 'backlog' && !a.interno; }).forEach(function (a) {
      var lista = globais.concat(C.lista('servicos').filter(function (s) { return s.app === a.id; }));
      arquivos.push({ nome: 'servicos/' + a.id + '.json', texto: j(cab({ app: a.id, servicos: lista.map(function (s) {
        return { id: s.id, nome: s.nome, descricao: s.descricao || null, planos: s.planos, nivel: nivelDeDGO(s.planos) };
      }) })) });
    });

    arquivos.push({ nome: 'termos.json', texto: j(cab({ termos: C.lista('termos').map(function (t) {
      var v = Termos.publicada(t);
      return v ? { id: t.id, tipo: t.tipo, app: t.app, obrigatorio: !!t.obrigatorio, versao: v.versao,
        titulo: v.titulo, texto: v.texto, publicadoEm: v.publicadoEm } : null;
    }).filter(Boolean) })) });

    arquivos.push({ nome: 'recados.json', texto: j(cab({ recados: C.lista('recados').filter(function (r) { return r.ativo; }).map(function (r) {
      return { id: r.id, app: r.app, publico: r.publico, prioridade: r.prioridade, inicio: r.inicio, fim: r.fim, titulo: r.titulo, texto: r.texto };
    }) })) });

    arquivos.push({ nome: 'anuncios.json', texto: j({ anuncios: C.lista('anuncios').filter(function (a) { return a.ativo !== false; }).map(function (a) {
      return { id: a.id, nome: a.nome, cor: a.cor, glifo: a.glifo, link: a.link, frase: a.frase, imagem: a.imagem || undefined };
    }) }) });

    arquivos.push({ nome: 'ajuda.json', texto: j(cab({ artigos: C.lista('kb').filter(function (k) { return k.estado === 'publicado'; }).map(function (k) {
      return { id: k.id, app: k.app, categoria: k.categoria || '', titulo: k.titulo, texto: k.texto, palavras: k.palavras || [], atualizadoEm: k.atualizadoEm };
    }) })) });

    var porApp = {};
    C.lista('versoes').forEach(function (v) { (porApp[v.app] = porApp[v.app] || []).push(v); });
    Object.keys(porApp).forEach(function (app) {
      var lista = porApp[app].slice().sort(function (a, b) { return String(b.data).localeCompare(String(a.data)); });
      arquivos.push({ nome: 'versoes/' + app + '.json', texto: j({ app: app, versoes: lista.map(function (v) {
        return { versao: v.versao, data: v.data, itens: v.itens };
      }) }) });
    });
    return arquivos;
  }

  /* conferência antes de publicar: erros bloqueiam, avisos não */
  function conferir() {
    var erros = [], avisos = [];
    function bil(o, onde) {
      if (!o || !o.pt) erros.push(onde + T(': falta o texto em português', ': Portuguese text missing'));
      else if (!o.en) erros.push(onde + T(': falta o texto em inglês', ': English text missing'));
    }
    C.lista('apps').forEach(function (a) {
      bil(a.nome, 'App ' + a.id);
      if (a.estado !== 'backlog' && !/^https:\/\//.test(a.url || '')) erros.push('App ' + a.id + T(': endereço precisa começar com https://', ': address must start with https://'));
      if (a.versaoMinima && !/^\d+(\.\d+){0,2}$/.test(a.versaoMinima)) erros.push('App ' + a.id + T(': versão mínima no formato 1.2.3', ': minimum version in 1.2.3 format'));
    });
    C.lista('planos').forEach(function (p) { bil(p.nome, T('Plano ', 'Plan ') + p.id); });
    C.lista('servicos').forEach(function (s) {
      bil(s.nome, T('Serviço ', 'Service ') + s.chave);
      if (!s.planos || !s.planos.length) erros.push(T('Serviço ', 'Service ') + s.chave + T(': nenhum plano marcado', ': no plan selected'));
    });
    C.lista('recados').filter(function (r) { return r.ativo; }).forEach(function (r) {
      bil(r.titulo, T('Recado ', 'Notice ') + (r.titulo && r.titulo.pt || r.id));
      if (r.fim && r.inicio && r.fim < r.inicio) erros.push(T('Recado ', 'Notice ') + (r.titulo && r.titulo.pt) + T(': termina antes de começar', ': ends before it starts'));
      if (r.fim && new Date(r.fim) < new Date()) avisos.push(T('Recado ', 'Notice ') + (r.titulo && r.titulo.pt) + T(': já terminou (não vai aparecer)', ': already ended (will not show)'));
    });
    C.lista('anuncios').filter(function (a) { return a.ativo !== false; }).forEach(function (a) {
      bil(a.frase, T('Anúncio ', 'Ad ') + a.nome);
      if (!/^https:\/\//.test(a.link || '')) erros.push(T('Anúncio ', 'Ad ') + a.nome + T(': link precisa começar com https://', ': link must start with https://'));
    });
    C.lista('kb').filter(function (k) { return k.estado === 'publicado'; }).forEach(function (k) { bil(k.titulo, T('Artigo ', 'Article ') + (k.titulo && k.titulo.pt)); bil(k.texto, T('Artigo ', 'Article ') + (k.titulo && k.titulo.pt)); });
    C.lista('termos').forEach(function (t) {
      var v = Termos.publicada(t);
      if (t.obrigatorio && !v) avisos.push(T('Termo obrigatório ainda sem versão publicada: ', 'Mandatory term with no published version yet: ') + Termos.ultima(t).titulo.pt);
      if (v) { bil(v.titulo, T('Termo ', 'Term ') + v.titulo.pt); bil(v.texto, T('Termo ', 'Term ') + v.titulo.pt); }
      if (Termos.ultima(t).estado === 'aprovado') avisos.push(T('Termo aprovado aguardando publicação: ', 'Approved term awaiting publication: ') + Termos.ultima(t).titulo.pt);
    });
    return { erros: erros, avisos: avisos };
  }

  function diferencas(arquivos) {
    var ultima = C.lista('publicacoes')[C.lista('publicacoes').length - 1];
    var antes = (ultima && ultima.snapshot) || {};
    function semData(t) { return String(t || '').replace(/"geradoEm": "[^"]*",?\n/g, ''); }
    var saida = arquivos.map(function (a) {
      var s = antes[a.nome] === undefined ? 'novo' : semData(antes[a.nome]) === semData(a.texto) ? 'igual' : 'mudou';
      return { nome: a.nome, situacao: s };
    });
    Object.keys(antes).forEach(function (n) {
      if (!arquivos.some(function (a) { return a.nome === n; })) saida.push({ nome: n, situacao: 'removido' });
    });
    return saida;
  }

  function leiaMeDados() {
    return '# solverone-dados\n\nArquivos master da plataforma SolverONE, publicados pelo RootifyONE.\n' +
      'Não edite à mão: mude no RootifyONE e publique de novo.\n\n' +
      '| Arquivo | O que é |\n|---|---|\n' +
      '| apps.json | catálogo dos apps e versão mínima de cada um |\n' +
      '| planos.json | planos de usuário |\n' +
      '| servicos/<app>.json | serviços de cada app e os planos que podem usar |\n' +
      '| termos.json | termos e políticas publicados (PT/EN) |\n' +
      '| recados.json | avisos para a caixa de recados dos apps |\n' +
      '| anuncios.json | anúncios da faixa e do pop-up |\n' +
      '| ajuda.json | artigos de ajuda do Assist ONE |\n' +
      '| versoes/<app>.json | o que cada versão de cada app trouxe |\n\n' +
      'Nenhum dado pessoal mora aqui: este repositório é público.\n';
  }

  /* ------------------------------------------------------------------
     AUTOMAÇÕES (as que rodam aqui dentro)
     ------------------------------------------------------------------ */
  var Automacoes = {
    confere: function (regra, alvo) {
      return (regra.condicoes || []).every(function (c) {
        if (!c.valor) return true;
        if (c.campo === 'texto') {
          var txt = U.semAcento((alvo.assunto || '') + ' ' + ((alvo.mensagens || []).map(function (m) { return m.texto; }).join(' ')) + ' ' + (alvo.detalhe || ''));
          return txt.indexOf(U.semAcento(c.valor)) !== -1;
        }
        return String(alvo[c.campo] || '') === String(c.valor);
      });
    },
    rodar: function (gatilho, alvo, colecao) {
      var regras = C.lista('automacoes').filter(function (r) { return r.ativo && r.gatilho === gatilho; });
      var aplicou = [];
      regras.forEach(function (r) {
        if (!Automacoes.confere(r, alvo)) return;
        (r.acoes || []).forEach(function (a) {
          if (a.tipo === 'prioridade' && alvo.prioridade !== undefined) {
            alvo.prioridade = a.valor;
            if (alvo.criadoEm && alvo.numero) { var p = Chamados.prazos(a.valor, alvo.criadoEm); alvo.prazoResposta = p.resposta; alvo.prazoResolucao = p.resolucao; }
          }
          if (a.tipo === 'atribuir' && alvo.responsavel !== undefined) alvo.responsavel = a.valor;
          if (a.tipo === 'etiqueta') { alvo.etiquetas = alvo.etiquetas || []; if (alvo.etiquetas.indexOf(a.valor) === -1) alvo.etiquetas.push(a.valor); }
          if (a.tipo === 'avisar') {
            var msg = (a.valor || T(r.nome)) + (alvo.numero ? ' · #' + alvo.numero : '');
            RF.ui.aviso('⚙️ ' + msg, 'info');
            /* fica também na caixa de entrada 📥, para quem não viu na hora */
            var ir = alvo.numero && alvo.assunto ? ['suporte', 'chamado', alvo.id] : alvo.tipo && alvo.prazo ? ['privacidade'] : null;
            if (RF.Inbox) RF.Inbox.avisar('⚙️ ' + T(r.nome), msg, 'info', ir);
            try { if (raiz.DGO && raiz.DGO.notificacoes && raiz.DGO.notificacoes.estado() === 'permitido') raiz.DGO.notificacoes.mostrar('rootify', { titulo: 'RootifyONE', texto: msg }); } catch (e) {}
          }
          /* "enviar e-mail": monta pelo modelo e põe na caixa de saída (sai sozinho se houver provedor) */
          if (a.tipo === 'email' && RF.Email && a.valor) {
            var u = alvo.usuario && RF.h.usuario ? RF.h.usuario(alvo.usuario) : null;
            var email = u ? u.email : (alvo.contato && alvo.contato.email) || alvo.email;
            if (email) RF.Email.enfileirar({ modelo: a.valor, para: email, nome: (u ? u.nome : (alvo.contato && alvo.contato.nome) || alvo.nome) || '', idioma: u && u.idioma === 'en' ? 'en' : 'pt', app: alvo.app || '*',
              dados: { numero: alvo.numero, assunto: alvo.assunto, prazo: alvo.prazo ? U.data(alvo.prazo) : '', app: alvo.app && RF.h.app && RF.h.app(alvo.app) ? T(RF.h.app(alvo.app).nome) : 'SolverONE' },
              origem: { tipo: 'automacao', rotulo: T('Regra: ', 'Rule: ') + T(r.nome), ir: alvo.numero && alvo.assunto ? ['suporte', 'chamado', alvo.id] : ['automacoes'] } }).catch(function () {});
          }
        });
        r.execucoes = (r.execucoes || 0) + 1; r.ultimaEm = U.agora();
        aplicou.push(r.nome);
      });
      if (aplicou.length) {
        C.salvar('automacoes');
        if (colecao) C.salvar(colecao);
        RF.Log.registrar('automacoes', 'executar', alvo.id, null, null, T('Regras aplicadas: ', 'Rules applied: ') + aplicou.join(', '));
      }
      return aplicou;
    },
    /* vigia de prazos: a cada minuto, enquanto o RootifyONE está aberto */
    _avisados: {},
    vigiar: function () {
      clearInterval(Automacoes._timer);
      Automacoes._timer = setInterval(function () {
        if (!C.aberto()) return;
        Chamados.abertos().forEach(function (ch) {
          if (Chamados.situacao(ch) === 'risco' && !Automacoes._avisados[ch.id]) {
            Automacoes._avisados[ch.id] = true;
            Automacoes.rodar('chamado-sla-risco', ch, 'chamados');
          }
        });
      }, 60000);
    }
  };

  /* ------------------------------------------------------------------
     DADOS DE EXEMPLO (fictícios, marcados, removíveis)
     ------------------------------------------------------------------ */
  var NOMES = ['Ana Exemplo', 'Bruno Teste', 'Carla Fictícia', 'Diego Modelo', 'Elisa Demonstração', 'Fábio Amostra',
    'Gabriela Protótipo', 'Heitor Simulado', 'Isabela Ensaio', 'João Rascunho', 'Karina Piloto', 'Lucas Treino',
    'Marina Prova', 'Nicolas Esboço', 'Olívia Maquete', 'Paulo Sandbox', 'Quésia Beta', 'Rafael Alpha',
    'Sofia Mock', 'Tiago Dummy', 'Úrsula Caso', 'Vitor Cenário', 'Wanda Fixture', 'Yuri Stub'];
  function exemplo() {
    var apps = ['moneytrio', 'rise-one', 'omnilife-one', 'contador-de-historias', 'cifras-violao', 'eleicoes-2026'];
    var planos = ['membro', 'membro', 'membro', 'premium', 'visitante'];
    var agora = Date.now();
    NOMES.forEach(function (n, i) {
      var ape = U.semAcento(n.split(' ')[0]) + (i + 1);
      var criado = new Date(agora - (60 - i * 2) * DIA).toISOString();
      var meus = [apps[i % apps.length]]; if (i % 3 === 0) meus.push(apps[(i + 2) % apps.length]);
      C.lista('usuarios').push({
        id: U.uid('u-'), nome: n, apelido: ape, email: ape + '@example.com', telefone: '',
        nascimento: (1970 + (i * 3) % 40) + '-0' + (1 + i % 9) + '-1' + (i % 9), idioma: i % 5 === 0 ? 'en' : 'pt',
        plano: planos[i % planos.length], status: i === 7 ? 'bloqueado' : 'ativo', motivoBloqueio: i === 7 ? 'Exemplo de bloqueio' : '',
        apps: meus.map(function (a) { return { app: a, desde: criado, ultimoAcesso: new Date(agora - (i % 12) * DIA).toISOString() }; }),
        etiquetas: i % 6 === 0 ? ['beta-tester'] : i % 7 === 0 ? ['vip'] : [],
        notas: i % 4 === 0 ? [{ id: U.uid('n-'), quando: criado, quem: 'sistema', texto: 'Nota de exemplo: pediu uma função nova.' }] : [],
        termosAceitos: [], consentimentos: [{ tipo: 'notificacoes', dado: i % 2 === 0, quando: criado }],
        historicoPlano: [{ plano: planos[i % planos.length], de: criado, quem: 'sistema' }],
        origem: 'exemplo', criadoEm: criado, atualizadoEm: criado, exemplo: true
      });
    });
    var us = C.lista('usuarios').filter(function (u) { return u.exemplo; });
    var casos = [
      ['Não consigo entrar com a digital', 'rise-one', 'conta', 'alta', 'A digital não aparece no celular novo.'],
      ['OCR não lê o recibo do mercado', 'moneytrio', 'problema', 'normal', 'A foto sai borrada e não reconhece o valor.'],
      ['Quero exportar meus dados', 'omnilife-one', 'privacidade', 'alta', 'Gostaria de receber tudo o que vocês têm sobre mim.'],
      ['Sugestão: modo escuro no contador', 'contador-de-historias', 'sugestao', 'baixa', 'Seria ótimo ler à noite com tela escura.'],
      ['Cifra fica cortada ao aumentar a letra', 'cifras-violao', 'problema', 'normal', 'Quando aumento a fonte, o texto sai da tela.'],
      ['Cobrança em dobro?', 'moneytrio', 'cobranca', 'urgente', 'Apareceram duas cobranças no cartão.'],
      ['Como compartilho a lista de compras?', 'omnilife-one', 'duvida', 'normal', 'Quero que minha esposa veja a lista.'],
      ['Voz some depois de 15 segundos', 'contador-de-historias', 'problema', 'alta', 'No Android a leitura para sozinha.'],
      ['Gráfico de salário mínimo', 'eleicoes-2026', 'pedido', 'baixa', 'Poderiam incluir a série desde 1992?'],
      ['App não abre offline', 'rise-one', 'problema', 'normal', 'Sem internet aparece tela branca.'],
      ['Esqueci o código de recuperação', 'moneytrio', 'conta', 'alta', 'Troquei de celular e perdi o código.'],
      ['Elogio ao wizard', 'moneytrio', 'sugestao', 'baixa', 'Muito fácil de configurar, parabéns.']
    ];
    casos.forEach(function (c, i) {
      var u = us[i % us.length];
      var criado = new Date(agora - (i * 7 + 2) * HORA).toISOString();
      var ch = Chamados.criar({ assunto: c[0], app: c[1], categoria: c[2], prioridade: c[3], texto: c[4],
        usuario: u.id, canal: i % 3 === 0 ? 'formulario' : i % 3 === 1 ? 'email' : 'interno', criadoEm: criado, exemplo: true });
      if (i % 3 === 1) Chamados.responder(ch, 'Olá! Estamos verificando.', 'publica', 'sistema');
      if (i % 5 === 4) { ch.status = 'resolvido'; ch.resolvidoEm = U.agora(); }
      if (i % 4 === 2) ch.status = 'aguardando-cliente';
    });
    Privacidade.criarPedido({ tipo: 'portabilidade', usuario: us[2].id, app: 'omnilife-one', detalhe: 'Pediu cópia de todos os dados.',
      recebidoEm: new Date(agora - 11 * DIA).toISOString(), exemplo: true });
    Privacidade.criarPedido({ tipo: 'exclusao', usuario: us[5].id, app: 'moneytrio', detalhe: 'Quer apagar a conta.',
      recebidoEm: new Date(agora - 2 * DIA).toISOString(), exemplo: true });
    C.lista('kb').push(
      { id: U.uid('kb-'), app: '*', categoria: 'conta', estado: 'publicado', atualizadoEm: U.agora(), autor: 'sistema', exemplo: true,
        titulo: { pt: 'Como entrar com a digital', en: 'How to sign in with your fingerprint' },
        texto: { pt: 'Abra Configurações ⚙️, toque em Conta e depois em "Usar a digital". O aparelho vai pedir a digital uma vez para registrar.',
                 en: 'Open Settings ⚙️, tap Account and then "Use fingerprint". The device will ask for your fingerprint once to register it.' },
        palavras: ['digital', 'biometria', 'fingerprint'] },
      { id: U.uid('kb-'), app: '*', categoria: 'duvida', estado: 'publicado', atualizadoEm: U.agora(), autor: 'sistema', exemplo: true,
        titulo: { pt: 'O app funciona sem internet?', en: 'Does the app work offline?' },
        texto: { pt: 'Sim. Depois da primeira visita, o app abre sem internet. O que você registrar fica guardado e sincroniza quando voltar a conexão.',
                 en: 'Yes. After the first visit the app opens offline. What you record is kept and syncs when the connection returns.' },
        palavras: ['offline', 'sem internet'] },
      { id: U.uid('kb-'), app: 'contador-de-historias', categoria: 'problema', estado: 'rascunho', atualizadoEm: U.agora(), autor: 'sistema', exemplo: true,
        titulo: { pt: 'Instalei uma voz e ela não aparece', en: 'I installed a voice and it does not show up' },
        texto: { pt: 'No Android, force a parada do navegador (Configurações → Aplicativos → Chrome → Forçar parada) e abra de novo.',
                 en: 'On Android, force-stop the browser (Settings → Apps → Chrome → Force stop) and open it again.' },
        palavras: ['voz', 'tts'] }
    );
    C.lista('automacoes').push({ id: U.uid('a-'), nome: { pt: 'Cobrança é sempre urgente', en: 'Billing is always urgent' }, ativo: true,
      gatilho: 'chamado-criado', condicoes: [{ campo: 'categoria', valor: 'cobranca' }],
      acoes: [{ tipo: 'prioridade', valor: 'urgente' }, { tipo: 'etiqueta', valor: 'financeiro' }, { tipo: 'avisar', valor: 'Chamado de cobrança aberto' }],
      execucoes: 0, exemplo: true });
    C.lista('custos').push(
      { id: U.uid('c-'), descricao: 'Domínio (exemplo)', categoria: 'infraestrutura', valor: 60, moeda: 'BRL', recorrencia: 'anual', desde: U.agora().slice(0, 10), app: '*', exemplo: true },
      { id: U.uid('c-'), descricao: 'Créditos OpenRouter (exemplo)', categoria: 'ia', valor: 10, moeda: 'USD', recorrencia: 'unico', desde: U.agora().slice(0, 10), app: '*', exemplo: true });
    C.lista('recados').push({ id: U.uid('r-'), app: '*', publico: 'todos', prioridade: 'info', ativo: false, exemplo: true,
      inicio: U.agora().slice(0, 10), fim: new Date(agora + 14 * DIA).toISOString().slice(0, 10),
      titulo: { pt: 'Novidade: ajuda em todos os apps', en: 'New: help in every app' },
      texto: { pt: 'O botão Assist ONE agora abre a central de ajuda.', en: 'The Assist ONE button now opens the help centre.' } });
    C.obj('config').exemplo = true;
  }
  function removerExemplo() {
    ['usuarios', 'chamados', 'pedidos', 'kb', 'automacoes', 'custos', 'recados'].forEach(function (n) {
      C.db[n] = C.lista(n).filter(function (x) { return !x.exemplo; });
    });
    C.obj('config').exemplo = false;
  }

  RF.dados = {
    semear: semear, Chamados: Chamados, Privacidade: Privacidade, Termos: Termos, Automacoes: Automacoes,
    gerarArquivos: gerarArquivos, conferir: conferir, diferencas: diferencas, leiaMeDados: leiaMeDados,
    exemplo: exemplo, removerExemplo: removerExemplo, nivelDeDGO: nivelDeDGO
  };
})(window);
