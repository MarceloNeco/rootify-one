/* =====================================================================
   RootifyONE — E-MAILS
   ---------------------------------------------------------------------
   Tudo o que a plataforma manda por e-mail passa por aqui:
     1. remetentes  @solverone.com.br (no-reply, suporte, privacidade…)
     2. modelos     PT/EN com campos {nome}, {app}, {link}, {numero}…
     3. caixa de saída: cada e-mail gerado vira um item com situação
        (pronto → enviado | manual | falhou). Sem servidor, o item abre
        no programa de e-mail da pessoa ou é copiado; com o proxy de
        envio configurado (Cloudflare Worker / Firebase Function que
        guarda a chave do provedor), sai sozinho.
     4. envio: contrato do proxy e teste de conexão.
   API para as outras telas:
     RF.Email.enfileirar({ modelo, para, nome, dados, app, origem, remetente, idioma })
     RF.Email.enviar(item) · abrirCliente(item) · aguardando()
   A chave do provedor NUNCA fica aqui: fica no proxy. Aqui só o token
   que autoriza o RootifyONE a falar com o proxy (cifrado no cofre).
   ===================================================================== */
(function (raiz) {
  'use strict';
  var RF = raiz.RF, U = RF.util, T = U.T, el = U.el, ui = RF.ui, C = RF.Cofre, S = RF.Sessao, H = RF.h;
  function N(pt, en) { return { pt: pt, en: en }; }

  function dominio() { return String(RF.cat.DOMINIO.atual).replace(/^https?:\/\//, '').replace(/\/$/, ''); }

  /* ------------------------------------------------------------------
     1. REMETENTES — identidades no domínio da plataforma
     ------------------------------------------------------------------ */
  function remetentesPadrao() {
    var dom = dominio();
    return [
      { id: 'noreply', nome: 'SolverONE', email: 'no-reply@' + dom, respostaPara: 'contato@' + dom, uso: N('Avisos automáticos: conta, senha, termos', 'Automatic notices: account, password, terms') },
      { id: 'suporte', nome: 'Suporte SolverONE', email: 'suporte@' + dom, respostaPara: '', uso: N('Respostas de chamados', 'Ticket replies') },
      { id: 'privacidade', nome: 'Privacidade SolverONE', email: 'privacidade@' + dom, respostaPara: '', uso: N('Pedidos dos titulares (LGPD) e encarregado', 'Data-subject requests (LGPD) and DPO') },
      { id: 'contato', nome: 'SolverONE', email: 'contato@' + dom, respostaPara: '', uso: N('Mensagens gerais e convites da equipe', 'General messages and team invitations') }
    ];
  }

  /* ------------------------------------------------------------------
     2. MODELOS — sistema (vêm prontos, editáveis) e próprios
     campos: {nome} {app} {link} {numero} {assunto} {resposta} {prazo}
             {codigo} {senha} {papel} {equipe} {plataforma} {titulo} {texto}
     ------------------------------------------------------------------ */
  function modelosPadrao() {
    function M(id, remetente, nome, aPt, aEn, tPt, tEn) {
      return { id: id, sistema: true, ativo: true, remetente: remetente, nome: N(nome[0], nome[1]), assunto: N(aPt, aEn), texto: N(tPt, tEn), atualizadoEm: U.agora() };
    }
    return [
      M('boas-vindas', 'noreply', ['Boas-vindas ao app', 'Welcome to the app'],
        'Bem-vindo(a) ao {app}', 'Welcome to {app}',
        'Olá, {nome}!\n\nSua conta no {app} está pronta. Seus dados ficam cifrados no seu aparelho; nós guardamos só o mínimo para o app funcionar.\n\nAbrir o app: {link}\n\nQualquer dúvida, responda esta mensagem.\n\n{plataforma}',
        'Hi {nome}!\n\nYour {app} account is ready. Your data stays encrypted on your device; we keep only the minimum the app needs.\n\nOpen the app: {link}\n\nAny questions, just reply to this message.\n\n{plataforma}'),
      M('verificar-email', 'noreply', ['Confirmar o e-mail', 'Confirm e-mail'],
        'Confirme seu e-mail — {app}', 'Confirm your e-mail — {app}',
        'Olá, {nome}!\n\nPara confirmar que este e-mail é seu, toque no link abaixo (vale por 24 horas):\n{link}\n\nSe não foi você, ignore esta mensagem.\n\n{plataforma}',
        'Hi {nome}!\n\nTo confirm this e-mail is yours, tap the link below (valid for 24 hours):\n{link}\n\nIf this was not you, ignore this message.\n\n{plataforma}'),
      M('redefinir-senha', 'noreply', ['Redefinir a senha', 'Reset password'],
        'Redefinir sua senha — {app}', 'Reset your password — {app}',
        'Olá, {nome}!\n\nRecebemos um pedido para trocar a senha da sua conta no {app}. Toque no link (vale por 1 hora):\n{link}\n\nSe não foi você, nada muda: é só ignorar.\n\n{plataforma}',
        'Hi {nome}!\n\nWe received a request to change the password of your {app} account. Tap the link (valid for 1 hour):\n{link}\n\nIf this was not you, nothing changes: just ignore it.\n\n{plataforma}'),
      M('convite-equipe', 'contato', ['Convite para a equipe', 'Team invitation'],
        'Você foi convidado(a) para o RootifyONE', 'You have been invited to RootifyONE',
        'Olá, {nome}!\n\n{equipe} cadastrou você na equipe da SolverONE com o papel "{papel}".\n\nAcesse: {link}\n{senha}\nNo primeiro acesso, você cria a sua própria senha e recebe um código de recuperação — guarde-o fora do aparelho.\n\n{plataforma}',
        'Hi {nome}!\n\n{equipe} added you to the SolverONE team with the role "{papel}".\n\nAccess: {link}\n{senha}\nAt first access you create your own password and receive a recovery code — keep it off the device.\n\n{plataforma}'),
      M('chamado-recebido', 'suporte', ['Chamado recebido', 'Ticket received'],
        '[#{numero}] Recebemos: {assunto}', '[#{numero}] We got it: {assunto}',
        'Olá, {nome}!\n\nRecebemos seu pedido "{assunto}" e ele ganhou o número #{numero}. Já estamos olhando; respondemos por aqui assim que tivermos novidade.\n\nSuporte {plataforma}',
        'Hi {nome}!\n\nWe received your request "{assunto}" and it got the number #{numero}. We are already looking into it and will reply here as soon as there is news.\n\n{plataforma} Support'),
      M('resposta-chamado', 'suporte', ['Resposta de chamado', 'Ticket reply'],
        '[#{numero}] {assunto}', '[#{numero}] {assunto}',
        'Olá, {nome}!\n\n{resposta}\n\nSe precisar de mais alguma coisa, é só responder esta mensagem.\n\nSuporte {plataforma}',
        'Hi {nome}!\n\n{resposta}\n\nIf you need anything else, just reply to this message.\n\n{plataforma} Support'),
      M('lgpd-recebido', 'privacidade', ['Pedido de privacidade recebido', 'Privacy request received'],
        'Seu pedido {numero} foi registrado', 'Your request {numero} has been logged',
        'Olá, {nome}!\n\nRegistramos seu pedido sobre seus dados pessoais com o número {numero}. A resposta completa sai até {prazo}, como prevê a LGPD (Lei 13.709/2018, art. 19).\n\nEncarregado de dados: {plataforma}',
        'Hi {nome}!\n\nWe logged your request about your personal data under number {numero}. The full answer is due by {prazo}, as the LGPD (Brazilian Law 13,709/2018, art. 19) requires.\n\nData protection officer: {plataforma}'),
      M('lgpd-concluido', 'privacidade', ['Pedido de privacidade respondido', 'Privacy request answered'],
        'Resposta ao seu pedido {numero}', 'Answer to your request {numero}',
        'Olá, {nome}!\n\nSobre o seu pedido {numero}:\n\n{resposta}\n\nSe tiver dúvidas, responda esta mensagem.\n\n{plataforma}',
        'Hi {nome}!\n\nAbout your request {numero}:\n\n{resposta}\n\nIf you have questions, reply to this message.\n\n{plataforma}'),
      M('termos-atualizados', 'noreply', ['Termos atualizados', 'Terms updated'],
        'Atualizamos os termos do {app}', 'We updated the {app} terms',
        'Olá, {nome}!\n\nOs termos e políticas do {app} mudaram. Na próxima vez que abrir o app, vamos pedir um novo aceite. Você pode ler antes aqui: {link}\n\n{plataforma}',
        'Hi {nome}!\n\nThe {app} terms and policies have changed. Next time you open the app we will ask for a new acceptance. You can read them first here: {link}\n\n{plataforma}'),
      M('aviso', 'noreply', ['Aviso livre', 'Free notice'],
        '{titulo}', '{titulo}',
        'Olá, {nome}!\n\n{texto}\n\n{plataforma}',
        'Hi {nome}!\n\n{texto}\n\n{plataforma}')
    ];
  }

  function garantir() {
    if (!C.aberto()) return;
    var cfg = C.obj('config');
    if (!cfg.email) cfg.email = {};
    if (!cfg.email.remetentes || !cfg.email.remetentes.length) cfg.email.remetentes = remetentesPadrao();
    if (!cfg.email.provedor) cfg.email.provedor = { tipo: '', proxy: '', token: '', automatico: true };
    if (!cfg.email.dns) cfg.email.dns = {};
    var lista = C.lista('modelosEmail');
    if (!lista.length) { modelosPadrao().forEach(function (m) { lista.push(m); }); }
    else {   /* modelo de sistema novo em versão nova: entra sem mexer nos existentes */
      modelosPadrao().forEach(function (m) { if (!lista.some(function (x) { return x.id === m.id; })) lista.push(m); });
    }
  }
  function cfgEmail() { garantir(); return C.obj('config').email; }

  var Email = {
    garantir: garantir,
    remetentes: function () { return cfgEmail().remetentes; },
    remetente: function (id) { return Email.remetentes().filter(function (r) { return r.id === id; })[0] || Email.remetentes()[0]; },
    modelos: function () { garantir(); return C.lista('modelosEmail'); },
    modelo: function (id) { return Email.modelos().filter(function (m) { return m.id === id; })[0] || null; },
    provedor: function () { return cfgEmail().provedor; },
    provedorPronto: function () { var p = Email.provedor(); return !!(p && p.proxy && /^https:\/\//.test(p.proxy)); },

    /* troca os {campos} pelo valor; o que não tiver valor vira vazio */
    montar: function (modeloId, dados, idioma) {
      var m = Email.modelo(modeloId);
      if (!m) return null;
      var l = idioma === 'en' ? 'en' : 'pt';
      var base = { plataforma: 'SolverONE · ' + dominio(), equipe: S.pessoa ? S.pessoa.nome : 'SolverONE' };
      var d = Object.assign(base, dados || {});
      function troca(txt) {
        return String(txt || '').replace(/\{([a-zA-Z]+)\}/g, function (_, k) { return d[k] === undefined || d[k] === null ? '' : String(d[k]); })
          .replace(/\n{3,}/g, '\n\n').trim();
      }
      return { assunto: troca(m.assunto[l] || m.assunto.pt), texto: troca(m.texto[l] || m.texto.pt), remetente: m.remetente };
    },

    /* cria o item na caixa de saída (e tenta enviar sozinho se houver proxy) */
    enfileirar: function (o) {
      garantir();
      var corpo = o.modelo ? Email.montar(o.modelo, o.dados, o.idioma) : null;
      var item = {
        id: U.uid('em-'), criadoEm: U.agora(), por: S.pessoa ? S.pessoa.email : 'sistema',
        para: String(o.para || '').trim().toLowerCase(), nome: o.nome || '', app: o.app || '*', idioma: o.idioma === 'en' ? 'en' : 'pt',
        modelo: o.modelo || null, remetente: o.remetente || (corpo && corpo.remetente) || 'noreply',
        assunto: o.assunto || (corpo && corpo.assunto) || '', texto: o.texto || (corpo && corpo.texto) || '',
        origem: o.origem || null, status: 'pronto', historico: [{ quando: U.agora(), o: 'criado', quem: S.pessoa ? S.pessoa.email : 'sistema' }]
      };
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(item.para)) return Promise.reject(new Error('email-invalido'));
      C.lista('emails').push(item);
      return RF.mudar('emails', 'emails', 'criar', item.id, null, { para: item.para, assunto: item.assunto, modelo: item.modelo },
        T('E-mail na caixa de saída: ', 'E-mail in the outbox: ') + item.assunto + ' → ' + item.para).then(function () {
          if (RF.atualizarBolha) RF.atualizarBolha();
          if (Email.provedorPronto() && Email.provedor().automatico !== false && !o.semEnvio) return Email.enviar(item).catch(function () {}).then(function () { return item; });
          return item;
        });
    },
    aguardando: function () { return C.aberto() ? C.lista('emails').filter(function (m) { return m.status === 'pronto' || m.status === 'falhou'; }) : []; },
    item: function (id) { return C.lista('emails').filter(function (m) { return m.id === id; })[0] || null; },

    /* manda pelo proxy: POST JSON, Authorization: Bearer <token do proxy> */
    enviar: function (item) {
      var p = Email.provedor();
      if (!Email.provedorPronto()) return Promise.reject(new Error('sem-provedor'));
      var de = Email.remetente(item.remetente);
      var corpo = { de: { nome: de.nome, email: de.email }, para: [{ nome: item.nome || '', email: item.para }], responderPara: de.respostaPara || de.email,
        assunto: item.assunto, texto: item.texto, app: item.app, origem: item.origem, id: item.id, idioma: item.idioma };
      return fetch(p.proxy, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (p.token || '') }, body: JSON.stringify(corpo) })
        .then(function (r) { return r.text().then(function (t) { return { ok: r.ok, status: r.status, texto: t }; }); })
        .then(function (r) {
          if (!r.ok) throw new Error('proxy-' + r.status + (r.texto ? ': ' + r.texto.slice(0, 160) : ''));
          Email._situar(item, 'enviado', T('Enviado pelo provedor', 'Sent through the provider') + (p.tipo ? ' (' + p.tipo + ')' : ''));
          return item;
        }, function (e) {
          Email._situar(item, 'falhou', String(e && e.message || e));
          throw e;
        });
    },
    abrirCliente: function (item) {
      var de = Email.remetente(item.remetente);
      var url = 'mailto:' + encodeURIComponent(item.para) + '?subject=' + encodeURIComponent(item.assunto) + '&body=' + encodeURIComponent(item.texto + '\n\n— ' + de.nome + ' <' + de.email + '>');
      try { raiz.location.href = url; } catch (e) {}
      if (item.status === 'pronto' || item.status === 'falhou') Email._situar(item, 'manual', T('Aberto no programa de e-mail', 'Opened in the mail program'));
    },
    copiar: function (item) {
      var de = Email.remetente(item.remetente);
      return U.copiar(T('Para: ', 'To: ') + item.para + '\n' + T('De: ', 'From: ') + de.nome + ' <' + de.email + '>\n' + T('Assunto: ', 'Subject: ') + item.assunto + '\n\n' + item.texto);
    },
    marcar: function (item, status, nota) { Email._situar(item, status, nota || ''); },
    _situar: function (item, status, nota) {
      var antes = item.status;
      item.status = status; item.atualizadoEm = U.agora();
      item.historico.push({ quando: U.agora(), o: status, quem: S.pessoa ? S.pessoa.email : 'sistema', nota: nota || '' });
      return RF.mudar('emails', 'emails', status, item.id, antes, status, T('E-mail ', 'E-mail ') + item.assunto + ': ' + antes + ' → ' + status + (nota ? ' · ' + nota : '')).then(function () {
        if (RF.atualizarBolha) RF.atualizarBolha();
      });
    },
    testarProxy: function () {
      var p = Email.provedor();
      if (!Email.provedorPronto()) return Promise.reject(new Error('sem-provedor'));
      return fetch(p.proxy, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (p.token || '') }, body: JSON.stringify({ teste: true, de: 'RootifyONE ' + RF.VERSAO }) })
        .then(function (r) { return r.text().then(function (t) { return { ok: r.ok, status: r.status, texto: t }; }); });
    }
  };
  RF.Email = Email;

  var STATUS = {
    pronto: [N('pronto para enviar', 'ready to send'), 'atencao'], enviado: [N('enviado', 'sent'), 'ok'],
    manual: [N('enviado à mão', 'sent by hand'), 'ok'], falhou: [N('falhou', 'failed'), 'erro'], cancelado: [N('cancelado', 'cancelled'), 'cinza']
  };
  function seloStatus(s) { var x = STATUS[s] || [N(s, s), 'neutro']; return ui.selo(T(x[0]), x[1]); }
  function nomeRemetente(id) { var r = Email.remetente(id); return r ? r.nome + ' <' + r.email + '>' : id; }
  function idiomaDe(u) { return u && u.idioma === 'en' ? 'en' : 'pt'; }

  /* ------------------------------------------------------------------
     NOVO E-MAIL (ação rápida do ☰ e botão da tela)
     ------------------------------------------------------------------ */
  function novoEmail(pre) {
    pre = pre || {};
    garantir();
    var usuarios = C.lista('usuarios').filter(function (u) { return u.status !== 'excluido' && H.usuarioNoEscopo(u); });
    var podePii = RF.pode('usuarios.pii:ver');
    var quem = ui.escolha([['', T('— digitar um e-mail —', '— type an e-mail —')]].concat(usuarios.map(function (u) { return [u.id, u.nome + ' (@' + u.apelido + ')']; })), pre.usuario || '');
    var para = ui.entrada(pre.para || '', { tipo: 'email', attrs: { placeholder: 'nome@exemplo.com', autofocus: !pre.usuario } });
    var nome = ui.entrada(pre.nome || '');
    var idioma = ui.escolha([['pt', 'Português'], ['en', 'English']], pre.idioma || 'pt');
    var modelo = ui.escolha([['', T('— sem modelo (texto livre) —', '— no template (free text) —')]].concat(Email.modelos().filter(function (m) { return m.ativo !== false; }).map(function (m) { return [m.id, T(m.nome)]; })), pre.modelo || '');
    var remetente = ui.escolha(Email.remetentes().map(function (r) { return [r.id, r.nome + ' <' + r.email + '>']; }), pre.remetente || 'noreply');
    var assunto = ui.entrada(pre.assunto || ''), texto = ui.entrada(pre.texto || '', { linhas: 9 });
    var dados = Object.assign({}, pre.dados || {});
    function aplicarModelo() {
      if (!modelo.value) return;
      dados.nome = nome.value.trim() || dados.nome || '';
      var c = Email.montar(modelo.value, dados, idioma.value);
      if (!c) return;
      assunto.value = c.assunto; texto.value = c.texto; remetente.value = c.remetente;
    }
    quem.onchange = function () {
      var u = H.usuario(quem.value);
      if (!u) return;
      para.value = podePii ? u.email : ''; nome.value = u.nome; idioma.value = idiomaDe(u);
      if (!podePii) ui.aviso(T('Seu papel não vê o e-mail completo; o envio fica para quem puder.', 'Your role cannot see the full e-mail; sending is left to someone who can.'), 'info');
      aplicarModelo();
    };
    modelo.onchange = aplicarModelo; idioma.onchange = aplicarModelo;
    nome.addEventListener('change', function () { if (modelo.value) aplicarModelo(); });
    if (pre.modelo) aplicarModelo();
    if (pre.usuario) quem.onchange();
    var m = ui.modal('✉️ ' + T('Novo e-mail', 'New e-mail'), el('div', { class: 'rf-form' }, [
      el('div', { class: 'rf-grade-2' }, [ui.campo(T('Pessoa cadastrada', 'Registered person'), quem), ui.campo(T('Para (e-mail)', 'To (e-mail)'), para)]),
      el('div', { class: 'rf-grade-3' }, [ui.campo(T('Nome', 'Name'), nome), ui.campo(T('Idioma', 'Language'), idioma), ui.campo(T('Modelo', 'Template'), modelo)]),
      ui.campo(T('Remetente', 'Sender'), remetente),
      ui.campo(T('Assunto', 'Subject'), assunto), ui.campo(T('Texto', 'Body'), texto, T('Campos como {nome} e {link} são trocados pelo valor ao aplicar o modelo; revise antes de enviar.', 'Fields like {nome} and {link} are replaced when the template is applied; review before sending.'))
    ]), { largo: true, rodape: [ui.botao(T('Pôr na caixa de saída', 'Put in the outbox'), function () {
      if (!assunto.value.trim() || !texto.value.trim()) return ui.aviso(T('Assunto e texto.', 'Subject and body.'), 'erro');
      Email.enfileirar({ para: para.value, nome: nome.value.trim(), idioma: idioma.value, modelo: modelo.value || null, remetente: remetente.value, assunto: assunto.value.trim(), texto: texto.value.trim(),
        dados: dados, origem: pre.origem || { tipo: 'manual' }, app: pre.app || '*' })
        .then(function (item) { m.fechar(); setTimeout(function () { abrirItem(item); }, 80); })
        .catch(function (e) { ui.aviso(e.message === 'email-invalido' ? T('E-mail inválido.', 'Invalid e-mail.') : String(e.message), 'erro'); });
    }, 'pri')] });
  }
  RF.h.novoEmail = novoEmail;

  /* ------------------------------------------------------------------
     ITEM DA CAIXA DE SAÍDA
     ------------------------------------------------------------------ */
  function abrirItem(item) {
    var de = Email.remetente(item.remetente), podeEd = RF.pode('emails:editar');
    var pronto = Email.provedorPronto();
    var rod = [];
    if (item.status !== 'cancelado') {
      rod.push(ui.botao('📨 ' + T('Abrir no programa de e-mail', 'Open in the mail program'), function () { Email.abrirCliente(item); setTimeout(function () { ui.fecharModal(); RF.renderizar(); }, 300); }, pronto ? '' : 'pri'));
      rod.push(ui.botao('📋 ' + T('Copiar', 'Copy'), function () { Email.copiar(item).then(function () { ui.aviso(T('Copiado: para, assunto e texto.', 'Copied: to, subject and body.')); }); }));
      if (pronto && item.status !== 'enviado') rod.push(ui.botao('🚀 ' + T('Enviar agora', 'Send now'), function () {
        ui.aviso(T('Enviando…', 'Sending…'), 'info');
        Email.enviar(item).then(function () { ui.aviso(T('Enviado.', 'Sent.')); ui.fecharModal(); RF.renderizar(); })
          .catch(function (e) { ui.aviso(T('Não saiu: ', 'Did not go out: ') + e.message, 'erro'); RF.renderizar(); });
      }, 'pri'));
      if (podeEd && (item.status === 'pronto' || item.status === 'falhou')) rod.push(ui.botao('✓ ' + T('Marcar como enviado', 'Mark as sent'), function () { Email.marcar(item, 'manual', T('Marcado à mão', 'Marked by hand')).then(function () { ui.fecharModal(); RF.renderizar(); }); }));
      if (podeEd && item.status !== 'enviado') rod.push(ui.botao(T('Cancelar e-mail', 'Cancel e-mail'), function () { Email.marcar(item, 'cancelado').then(function () { ui.fecharModal(); RF.renderizar(); }); }, 'perigo'));
    } else if (podeEd) rod.push(ui.botao(T('Reabrir', 'Reopen'), function () { Email.marcar(item, 'pronto').then(function () { ui.fecharModal(); RF.renderizar(); }); }));
    ui.modal(item.assunto || '—', el('div', { class: 'rf-form' }, [
      el('p', {}, [seloStatus(item.status), ' ', ui.selo(item.idioma.toUpperCase(), 'neutro'), item.modelo ? [' ', ui.selo(T((Email.modelo(item.modelo) || { nome: N(item.modelo, item.modelo) }).nome), 'info')] : null]),
      el('dl', { class: 'rf-dl' }, [
        el('dt', { texto: T('Para', 'To') }), el('dd', { texto: (item.nome ? item.nome + ' ' : '') + '<' + (RF.pode('usuarios.pii:ver') ? item.para : U.mascararEmail(item.para)) + '>' }),
        el('dt', { texto: T('De', 'From') }), el('dd', { texto: de.nome + ' <' + de.email + '>' + (de.respostaPara ? ' · ' + T('responder para ', 'reply to ') + de.respostaPara : '') }),
        el('dt', { texto: T('Criado', 'Created') }), el('dd', { texto: U.data(item.criadoEm, true) + ' · ' + item.por }),
        item.origem && item.origem.tipo ? el('dt', { texto: T('Origem', 'Origin') }) : null,
        item.origem && item.origem.tipo ? el('dd', {}, [item.origem.ir ? el('a', { href: '#/' + item.origem.ir.join('/'), texto: item.origem.rotulo || item.origem.tipo, onclick: function () { ui.fecharModal(); } }) : (item.origem.rotulo || item.origem.tipo)]) : null
      ]),
      el('pre', { class: 'rf-email-corpo', texto: item.texto }),
      !pronto && item.status === 'pronto' ? el('p', { class: 'rf-dica', texto: T('Sem provedor de envio configurado: abra no seu programa de e-mail (o texto já vai preenchido) ou copie. Para sair sozinho, configure o envio em E-mails → Envio.', 'No delivery provider configured: open in your mail program (the text comes filled in) or copy it. To go out on its own, set up delivery in E-mails → Delivery.') }) : null,
      el('details', { class: 'rf-det' }, [el('summary', { texto: T('Histórico', 'History') }), el('ul', {}, item.historico.map(function (h) { return el('li', { texto: U.data(h.quando, true) + ' · ' + h.o + ' · ' + h.quem + (h.nota ? ' · ' + h.nota : '') }); }))])
    ]), { largo: true, rodape: rod, aoFechar: function () { if (RF.Rota.atual().modulo === 'emails') RF.renderizar(); } });
  }

  /* ------------------------------------------------------------------
     TELA
     ------------------------------------------------------------------ */
  RF.telas.emails = function (area, rota) {
    garantir();
    var aba = rota.sub || 'saida';
    var pronto = Email.provedorPronto();
    RF.pagina(area, 'emails', pronto ? T('Provedor de envio ligado: os e-mails saem sozinhos pela caixa de saída.', 'Delivery provider on: e-mails go out on their own from the outbox.')
      : T('Ainda sem provedor de envio: os e-mails ficam prontos na caixa de saída e abrem no seu programa de e-mail com um toque.', 'No delivery provider yet: e-mails wait ready in the outbox and open in your mail program with one tap.'), [
      ui.botaoSe('emails:criar', null, '+ ' + T('Novo e-mail', 'New e-mail'), function () { novoEmail({}); }, 'pri')
    ]);
    var lista = C.lista('emails');
    area.appendChild(ui.abas([
      { id: 'saida', nome: T('Caixa de saída', 'Outbox'), conta: Email.aguardando().length }, { id: 'modelos', nome: T('Modelos', 'Templates') },
      { id: 'remetentes', nome: T('Remetentes e domínio', 'Senders and domain') }, { id: 'envio', nome: T('Envio (provedor)', 'Delivery (provider)') }
    ], aba, function (a) { RF.Rota.ir('emails', a); }));
    if (aba === 'saida') return abaSaida(area, lista, rota);
    if (aba === 'modelos') return abaModelos(area);
    if (aba === 'remetentes') return abaRemetentes(area);
    if (aba === 'envio') return abaEnvio(area);
  };

  var filtroSaida = { status: 'pendentes', texto: '' };
  function abaSaida(area, lista, rota) {
    if (rota.id) { var it = Email.item(rota.id); if (it) setTimeout(function () { abrirItem(it); }, 30); }
    var fst = ui.escolha([['pendentes', T('Pendentes (pronto + falhou)', 'Pending (ready + failed)')], ['', T('Todos', 'All')]].concat(Object.keys(STATUS).map(function (k) { return [k, T(STATUS[k][0])]; })), filtroSaida.status);
    var busca = ui.entrada(filtroSaida.texto, { tipo: 'search', attrs: { placeholder: T('Assunto ou e-mail', 'Subject or e-mail'), 'aria-label': T('Procurar', 'Search') } });
    var bloco = el('div');
    function filtrar() {
      filtroSaida = { status: fst.value, texto: busca.value };
      var q = U.semAcento(busca.value);
      var l = lista.filter(function (m) {
        if (fst.value === 'pendentes' && m.status !== 'pronto' && m.status !== 'falhou') return false;
        if (fst.value && fst.value !== 'pendentes' && m.status !== fst.value) return false;
        if (q && U.semAcento(m.assunto + ' ' + m.para + ' ' + m.nome).indexOf(q) === -1) return false;
        return true;
      });
      U.limpar(bloco);
      bloco.appendChild(ui.tabela([
        { id: 'q', nome: T('Criado', 'Created'), ordenar: function (m) { return m.criadoEm; }, desenhar: function (m) { return U.data(m.criadoEm, true); } },
        { id: 'p', nome: T('Para', 'To'), valor: function (m) { return (m.nome ? m.nome + ' · ' : '') + (RF.pode('usuarios.pii:ver') ? m.para : U.mascararEmail(m.para)); } },
        { id: 'a', nome: T('Assunto', 'Subject'), valor: function (m) { return m.assunto; }, desenhar: function (m) { return el('span', {}, [el('strong', { texto: m.assunto }), el('br'), el('small', { class: 'rf-dica', texto: nomeRemetente(m.remetente) })]); } },
        { id: 's', nome: T('Situação', 'Status'), valor: function (m) { return m.status; }, desenhar: function (m) { return seloStatus(m.status); } },
        { id: 'o', nome: T('Origem', 'Origin'), valor: function (m) { return m.origem ? (m.origem.rotulo || m.origem.tipo) : '—'; } }
      ], l, { aoClicar: abrirItem, ordem: 'q', dir: -1, rotulo: T('Caixa de saída', 'Outbox'), vazio: T('Nenhum e-mail aqui.', 'No e-mails here.') }));
    }
    fst.onchange = filtrar; busca.addEventListener('input', filtrar);
    area.appendChild(el('div', { class: 'rf-filtros' }, [ui.campo(T('Situação', 'Status'), fst), ui.campo(T('Procurar', 'Search'), busca)]));
    area.appendChild(bloco); filtrar();
    area.appendChild(el('div', { class: 'rf-grade-2' }, [ui.cinza('emails.envio'), ui.cinza('emails.recebimento')]));
  }

  function abaModelos(area) {
    var podeEd = RF.pode('emails:editar');
    area.appendChild(el('p', { class: 'rf-dica', texto: T('Campos disponíveis: {nome} {app} {link} {numero} {assunto} {resposta} {prazo} {codigo} {senha} {papel} {equipe} {plataforma} {titulo} {texto}. Todo modelo nasce em PT e EN.',
      'Available fields: {nome} {app} {link} {numero} {assunto} {resposta} {prazo} {codigo} {senha} {papel} {equipe} {plataforma} {titulo} {texto}. Every template is born in PT and EN.') }));
    area.appendChild(ui.tabela([
      { id: 'n', nome: T('Modelo', 'Template'), valor: function (m) { return T(m.nome); }, desenhar: function (m) { return el('span', {}, [el('strong', { texto: T(m.nome) }), ' ', m.sistema ? ui.selo(T('sistema', 'system'), 'neutro') : null, m.ativo === false ? [' ', ui.selo(T('desligado', 'off'), 'cinza')] : null]); } },
      { id: 'a', nome: T('Assunto', 'Subject'), valor: function (m) { return T(m.assunto); } },
      { id: 'r', nome: T('Remetente', 'Sender'), valor: function (m) { return nomeRemetente(m.remetente); } },
      { id: 'u', nome: T('Usos', 'Uses'), classe: 'rf-centro', valor: function (m) { return C.lista('emails').filter(function (x) { return x.modelo === m.id; }).length; } }
    ], Email.modelos(), { aoClicar: editarModelo, rotulo: T('Modelos', 'Templates') }));
    if (podeEd) area.appendChild(ui.botao('+ ' + T('Novo modelo', 'New template'), function () { editarModelo(null); }, 'pri'));
  }
  function editarModelo(m) {
    var novo = !m, x = m ? U.clonar(m) : { id: '', sistema: false, ativo: true, remetente: 'noreply', nome: {}, assunto: {}, texto: {} };
    var podeEd = RF.pode('emails:editar');
    var id = ui.entrada(x.id, { attrs: { disabled: !novo, placeholder: 'ex.: promo-mes' } });
    var nome = ui.bilingue(T('Nome', 'Name'), x.nome, { attrs: { disabled: !podeEd } });
    var rem = ui.escolha(Email.remetentes().map(function (r) { return [r.id, r.nome + ' <' + r.email + '>']; }), x.remetente, { disabled: !podeEd });
    var ass = ui.bilingue(T('Assunto', 'Subject'), x.assunto, { attrs: { disabled: !podeEd } });
    var txt = ui.bilingue(T('Texto', 'Body'), x.texto, { linhas: 8, attrs: { disabled: !podeEd } });
    var ativo = ui.marca(T('Modelo ligado (aparece na lista)', 'Template on (shows in the list)'), x.ativo !== false);
    var previa = el('pre', { class: 'rf-email-corpo' });
    function verPrevia() {
      var v = txt.valor(), a = ass.valor();
      var d = { nome: 'Ana', app: 'MoneyTRIO', link: RF.cat.DOMINIO.atual + 'investify-me/', numero: '1042', assunto: 'Exemplo', resposta: '(resposta)', prazo: U.data(U.agora()), codigo: 'ABCD-1234', senha: '', papel: 'Suporte', equipe: S.pessoa.nome, plataforma: 'SolverONE · ' + dominio(), titulo: 'Título', texto: '(texto)' };
      function troca(t) { return String(t || '').replace(/\{([a-zA-Z]+)\}/g, function (_, k) { return d[k] === undefined ? '' : d[k]; }); }
      previa.textContent = T('Assunto: ', 'Subject: ') + troca(a[U.idioma()] || a.pt) + '\n\n' + troca(v[U.idioma()] || v.pt);
    }
    [ass, txt].forEach(function (b) { b.addEventListener('input', verPrevia); }); verPrevia();
    var rod = [];
    if (!novo && podeEd && !x.sistema && RF.pode('emails:excluir')) rod.push(ui.botao(T('Excluir', 'Delete'), function () {
      C.db.modelosEmail = Email.modelos().filter(function (y) { return y.id !== x.id; });
      RF.mudar('modelosEmail', 'emails', 'modelo-excluir', x.id, m, null, T('Modelo de e-mail excluído: ', 'E-mail template deleted: ') + x.id).then(function () { ui.fecharModal(); RF.renderizar(); });
    }, 'perigo'));
    if (!novo && podeEd && x.sistema) rod.push(ui.botao('↺ ' + T('Voltar ao texto padrão', 'Back to default text'), function () {
      var p = modelosPadrao().filter(function (y) { return y.id === x.id; })[0]; if (!p) return;
      nome.querySelectorAll('input')[0].value = p.nome.pt; nome.querySelectorAll('input')[1].value = p.nome.en;
      ass.querySelectorAll('input')[0].value = p.assunto.pt; ass.querySelectorAll('input')[1].value = p.assunto.en;
      txt.querySelectorAll('textarea')[0].value = p.texto.pt; txt.querySelectorAll('textarea')[1].value = p.texto.en; verPrevia();
    }));
    if (podeEd) rod.push(ui.botao(T('Salvar', 'Save'), function () {
      var y = Object.assign({}, x, { id: novo ? U.semAcento(id.value.trim()).replace(/[^a-z0-9-]+/g, '-') : x.id, nome: nome.valor(), assunto: ass.valor(), texto: txt.valor(), remetente: rem.value, ativo: ativo.querySelector('input').checked, atualizadoEm: U.agora() });
      if (!y.id) return ui.aviso(T('Dê um identificador.', 'Give it an identifier.'), 'erro');
      if (!y.nome.pt || !y.nome.en || !y.assunto.pt || !y.assunto.en || !y.texto.pt || !y.texto.en) return ui.aviso(T('Nome, assunto e texto em PT e EN.', 'Name, subject and body in PT and EN.'), 'erro');
      if (novo && Email.modelo(y.id)) return ui.aviso(T('Já existe um modelo com esse identificador.', 'A template with that identifier already exists.'), 'erro');
      if (novo) Email.modelos().push(y); else C.db.modelosEmail = Email.modelos().map(function (z) { return z.id === y.id ? y : z; });
      RF.mudar('modelosEmail', 'emails', novo ? 'modelo-criar' : 'modelo-editar', y.id, m, y, T('Modelo de e-mail salvo: ', 'E-mail template saved: ') + y.id).then(function () { ui.fecharModal(); RF.renderizar(); });
    }, 'pri'));
    ui.modal(novo ? T('Novo modelo', 'New template') : T(x.nome), el('div', { class: 'rf-form' }, [
      el('div', { class: 'rf-grade-2' }, [ui.campo(T('Identificador', 'Identifier'), id), ui.campo(T('Remetente', 'Sender'), rem)]), nome, ass, txt, ativo,
      el('h3', { texto: T('Prévia (com valores de exemplo)', 'Preview (with sample values)') }), previa
    ]), { largo: true, rodape: rod });
  }

  function abaRemetentes(area) {
    var podeCfg = RF.pode('emails.config:editar'), cfg = cfgEmail(), dom = dominio();
    area.appendChild(ui.secao(T('Remetentes @', 'Senders @') + dom, [
      el('p', { class: 'rf-dica', texto: T('Cada tipo de mensagem sai de um endereço do domínio da plataforma. Os endereços só funcionam de verdade depois dos registros de DNS abaixo e do provedor de envio.', 'Each kind of message leaves from an address on the platform domain. The addresses only really work after the DNS records below and the delivery provider.') }),
      ui.tabela([
        { id: 'n', nome: T('Nome exibido', 'Display name'), valor: function (r) { return r.nome; } },
        { id: 'e', nome: 'E-mail', valor: function (r) { return r.email; }, classe: 'rf-mono' },
        { id: 'r', nome: T('Responder para', 'Reply to'), valor: function (r) { return r.respostaPara || '—'; }, classe: 'rf-mono' },
        { id: 'u', nome: T('Uso', 'Use'), valor: function (r) { return T(r.uso || {}); } }
      ], cfg.remetentes, { aoClicar: podeCfg ? editarRemetente : null, rotulo: T('Remetentes', 'Senders') }),
      podeCfg ? ui.botao('+ ' + T('Novo remetente', 'New sender'), function () { editarRemetente(null); }) : null
    ]));

    /* DNS para e-mail: o que colar no Registro.br (modo avançado) */
    var dns = cfg.dns || {};
    var regs = [
      { id: 'spf', tipo: 'TXT', nome: '@', valor: 'v=spf1 include:<provedor> ~all', dica: N('SPF: diz quem pode enviar pelo domínio. O "<provedor>" vem do painel do provedor (ex.: Resend, Brevo, Amazon SES).', 'SPF: says who may send for the domain. "<provider>" comes from the provider\'s panel (e.g. Resend, Brevo, Amazon SES).') },
      { id: 'dkim', tipo: 'TXT / CNAME', nome: '<seletor>._domainkey', valor: N('(chave dada pelo provedor)', '(key given by the provider)'), dica: N('DKIM: assinatura que prova que a mensagem não foi alterada. Copie nome e valor exatamente do painel do provedor.', 'DKIM: signature proving the message was not altered. Copy name and value exactly from the provider\'s panel.') },
      { id: 'dmarc', tipo: 'TXT', nome: '_dmarc', valor: 'v=DMARC1; p=quarantine; rua=mailto:dmarc@' + dom, dica: N('DMARC: o que fazer com mensagem que falha no SPF/DKIM e para onde mandar os relatórios. Comece com p=none se preferir só observar.', 'DMARC: what to do with a message failing SPF/DKIM and where to send reports. Start with p=none if you prefer to only observe.') },
      { id: 'mx', tipo: 'MX', nome: '@', valor: N('(só para RECEBER e-mail: servidor do provedor de caixa postal)', '(only to RECEIVE e-mail: mailbox provider\'s server)'), dica: N('Sem MX, o domínio envia mas não recebe. Para suporte@ receber respostas, é preciso uma caixa postal (Google Workspace, Zoho, iCloud+…) ou o inbound do provedor.', 'Without MX the domain sends but does not receive. For suporte@ to get replies you need a mailbox (Google Workspace, Zoho, iCloud+…) or the provider\'s inbound.') }
    ];
    area.appendChild(ui.secao(T('DNS do e-mail (Registro.br → modo avançado)', 'E-mail DNS (Registro.br → advanced mode)'), [
      el('p', { class: 'rf-dica', texto: T('Marque cada registro depois de criar. Os valores exatos de SPF e DKIM vêm do painel do provedor escolhido em Envio.', 'Tick each record after creating it. The exact SPF and DKIM values come from the panel of the provider chosen in Delivery.') }),
      el('ul', { class: 'rf-dns' }, regs.map(function (r) {
        var mk = el('input', { type: 'checkbox', 'aria-label': T('Feito: ', 'Done: ') + r.id.toUpperCase(), disabled: !podeCfg }); mk.checked = !!dns[r.id];
        mk.onchange = function () {
          cfg.dns[r.id] = mk.checked;
          RF.mudar('config', 'emails', 'dns', r.id, !mk.checked, mk.checked, T('DNS de e-mail ', 'E-mail DNS ') + r.id.toUpperCase() + (mk.checked ? T(' marcado como feito', ' marked done') : T(' desmarcado', ' unmarked')));
        };
        var valor = typeof r.valor === 'string' ? r.valor : T(r.valor);
        return el('li', { class: 'rf-dns-item' + (dns[r.id] ? ' rf-feito' : '') }, [
          el('label', { class: 'rf-marca' }, [mk, el('span', {}, [el('strong', { texto: r.id.toUpperCase() + ' · ' + r.tipo }), el('br'), el('span', { class: 'rf-dica', texto: T(r.dica) })])]),
          el('div', { class: 'rf-dns-valor' }, [el('code', { texto: r.nome }), el('code', { texto: valor }),
            typeof r.valor === 'string' ? ui.botao(T('Copiar', 'Copy'), function () { U.copiar(valor).then(function () { ui.aviso(T('Copiado.', 'Copied.')); }); }, 'p') : null])
        ]);
      })),
      ui.cinza('emails.remetentes')
    ]));
  }
  function editarRemetente(r) {
    var cfg = cfgEmail(), novo = !r, x = r ? U.clonar(r) : { id: '', nome: 'SolverONE', email: '', respostaPara: '', uso: {} };
    var id = ui.entrada(x.id, { attrs: { disabled: !novo } }), nome = ui.entrada(x.nome), email = ui.entrada(x.email, { tipo: 'email' }), resp = ui.entrada(x.respostaPara, { tipo: 'email' });
    var uso = ui.bilingue(T('Uso', 'Use'), x.uso);
    var rod = [];
    if (!novo && cfg.remetentes.length > 1 && ['noreply', 'suporte', 'privacidade'].indexOf(x.id) === -1) rod.push(ui.botao(T('Excluir', 'Delete'), function () {
      cfg.remetentes = cfg.remetentes.filter(function (y) { return y.id !== x.id; });
      RF.mudar('config', 'emails', 'remetente-excluir', x.id, r, null, T('Remetente excluído: ', 'Sender deleted: ') + x.email).then(function () { ui.fecharModal(); RF.renderizar(); });
    }, 'perigo'));
    rod.push(ui.botao(T('Salvar', 'Save'), function () {
      var y = Object.assign({}, x, { id: novo ? U.semAcento(id.value.trim()).replace(/[^a-z0-9-]+/g, '-') : x.id, nome: nome.value.trim(), email: email.value.trim().toLowerCase(), respostaPara: resp.value.trim().toLowerCase(), uso: uso.valor() });
      if (!y.id || !y.nome || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(y.email)) return ui.aviso(T('Identificador, nome e e-mail válido.', 'Identifier, name and a valid e-mail.'), 'erro');
      if (y.email.split('@')[1] !== dominio()) ui.aviso(T('Atenção: o remetente não é do domínio ', 'Note: the sender is not on the domain ') + dominio() + T('. Provedores só assinam (DKIM) o domínio verificado.', '. Providers only sign (DKIM) the verified domain.'), 'atencao');
      if (novo) cfg.remetentes.push(y); else cfg.remetentes = cfg.remetentes.map(function (z) { return z.id === y.id ? y : z; });
      RF.mudar('config', 'emails', novo ? 'remetente-criar' : 'remetente-editar', y.id, r, y, T('Remetente salvo: ', 'Sender saved: ') + y.email).then(function () { ui.fecharModal(); RF.renderizar(); });
    }, 'pri'));
    ui.modal(novo ? T('Novo remetente', 'New sender') : x.email, el('div', { class: 'rf-form' }, [
      el('div', { class: 'rf-grade-2' }, [ui.campo(T('Identificador', 'Identifier'), id), ui.campo(T('Nome exibido', 'Display name'), nome)]),
      el('div', { class: 'rf-grade-2' }, [ui.campo('E-mail', email), ui.campo(T('Responder para (opcional)', 'Reply to (optional)'), resp)]), uso
    ]), { rodape: rod });
  }

  function abaEnvio(area) {
    var podeCfg = RF.pode('emails.config:editar'), cfg = cfgEmail(), p = cfg.provedor;
    var tipo = ui.escolha([['', T('— ainda não escolhido —', '— not chosen yet —')], ['resend', 'Resend (3.000 e-mails/mês grátis, 1 domínio)'], ['brevo', 'Brevo (300/dia grátis)'], ['ses', 'Amazon SES (pago por mil, muito barato)'], ['mailgun', 'Mailgun'], ['postmark', 'Postmark'], ['smtp', T('SMTP (Google Workspace, Zoho…)', 'SMTP (Google Workspace, Zoho…)')]], p.tipo, { disabled: !podeCfg });
    var proxy = ui.entrada(p.proxy, { tipo: 'url', attrs: { disabled: !podeCfg, placeholder: 'https://email.solverone.com.br/enviar  ·  https://<nome>.workers.dev' } });
    var token = ui.entrada('', { tipo: 'password', attrs: { disabled: !podeCfg, autocomplete: 'off', placeholder: p.token ? '•••••••• ' + T('(guardado; cole outro para trocar)', '(stored; paste another to replace)') : T('token combinado com o proxy', 'token agreed with the proxy') } });
    var auto = ui.marca(T('Enviar sozinho assim que o e-mail entrar na caixa de saída', 'Send on its own as soon as the e-mail enters the outbox'), p.automatico !== false, { disabled: !podeCfg });
    var teste = el('p', { class: 'rf-dica', 'aria-live': 'polite' });
    area.appendChild(ui.secao(T('Provedor e proxy de envio', 'Provider and delivery proxy'), [
      el('p', {}, [T('Um site estático não pode guardar a chave do provedor (ela ficaria pública). Por isso o envio passa por um ', 'A static site cannot keep the provider key (it would be public). That is why delivery goes through a '),
        el('b', { texto: 'proxy' }), T(' — um script pequeno num Cloudflare Worker (grátis) ou Firebase Function — que guarda a chave e repassa o e-mail. O RootifyONE só conhece o endereço do proxy e um token de acesso.', ' — a small script on a Cloudflare Worker (free) or Firebase Function — that keeps the key and forwards the e-mail. RootifyONE only knows the proxy address and an access token.')]),
      el('div', { class: 'rf-grade-2' }, [ui.campo(T('Provedor', 'Provider'), tipo), ui.campo(T('Endereço do proxy (https)', 'Proxy address (https)'), proxy)]),
      ui.campo(T('Token de acesso ao proxy', 'Proxy access token'), token, T('Fica cifrado no cofre deste aparelho. Não é a chave do provedor.', 'Stays encrypted in this device\'s vault. It is not the provider key.')),
      auto,
      podeCfg ? el('div', { class: 'rf-acoes' }, [ui.botao(T('Salvar', 'Save'), function () {
        var antes = { tipo: p.tipo, proxy: p.proxy, token: p.token ? '(guardado)' : '', automatico: p.automatico };
        var novoProxy = proxy.value.trim();
        if (novoProxy && !/^https:\/\/[^\s]+$/.test(novoProxy)) return ui.aviso(T('O endereço do proxy precisa começar com https://', 'The proxy address must start with https://'), 'erro');
        p.tipo = tipo.value; p.proxy = novoProxy; p.automatico = auto.querySelector('input').checked;
        var t = token.value.replace(/\s+/g, ''); if (t) p.token = t;
        RF.mudar('config', 'emails', 'provedor', p.tipo, antes, { tipo: p.tipo, proxy: p.proxy, token: p.token ? '(guardado)' : '', automatico: p.automatico }, T('Envio de e-mail configurado', 'E-mail delivery configured'))
          .then(function () { ui.aviso(T('Salvo.', 'Saved.')); RF.renderizar(); });
      }, 'pri'), ui.botao(T('Testar conexão', 'Test connection'), function () {
        if (!Email.provedorPronto()) return ui.aviso(T('Salve o endereço do proxy primeiro.', 'Save the proxy address first.'), 'erro');
        teste.textContent = T('Testando…', 'Testing…');
        Email.testarProxy().then(function (r) {
          teste.textContent = r.ok ? '✓ ' + T('O proxy respondeu ', 'The proxy answered ') + r.status + (r.texto ? ' · ' + r.texto.slice(0, 120) : '') : '⛔ ' + T('O proxy recusou (', 'The proxy refused (') + r.status + ')' + (r.status === 401 || r.status === 403 ? T(' — token errado.', ' — wrong token.') : '') + (r.texto ? ' · ' + r.texto.slice(0, 120) : '');
        }).catch(function () { teste.textContent = '⛔ ' + T('Sem resposta: endereço errado, proxy fora do ar ou bloqueado pela política de segurança da página (CSP).', 'No answer: wrong address, proxy down or blocked by the page security policy (CSP).'); });
      }), p.token ? ui.botao(T('Apagar token', 'Delete token'), function () {
        p.token = ''; RF.mudar('config', 'emails', 'token-apagar', '', '(guardado)', '', T('Token do proxy de e-mail apagado', 'E-mail proxy token deleted')).then(RF.renderizar);
      }, 'perigo') : null]) : null, teste
    ]));
    var contrato = '{\n  "de": { "nome": "Suporte SolverONE", "email": "suporte@' + dominio() + '" },\n  "para": [{ "nome": "Ana", "email": "ana@exemplo.com" }],\n  "responderPara": "suporte@' + dominio() + '",\n  "assunto": "[#1042] Assunto",\n  "texto": "Olá, Ana! …",\n  "app": "moneytrio", "idioma": "pt", "id": "em-…", "origem": { "tipo": "chamado" }\n}';
    var worker = "// Cloudflare Worker — proxy de e-mail da SolverONE (exemplo com Resend)\n// Segredos no painel do Worker: RESEND_KEY (chave do provedor) e TOKEN (o mesmo colado no RootifyONE)\nexport default {\n  async fetch(req, env) {\n    const cors = { 'Access-Control-Allow-Origin': '" + RF.cat.DOMINIO.atual.replace(/\/$/, '') + "', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };\n    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });\n    if (req.method !== 'POST') return new Response('POST only', { status: 405, headers: cors });\n    if (req.headers.get('Authorization') !== 'Bearer ' + env.TOKEN) return new Response('token', { status: 401, headers: cors });\n    const m = await req.json();\n    if (m.teste) return new Response('ok', { headers: cors });\n    const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { 'Authorization': 'Bearer ' + env.RESEND_KEY, 'Content-Type': 'application/json' },\n      body: JSON.stringify({ from: m.de.nome + ' <' + m.de.email + '>', to: m.para.map(p => p.email), reply_to: m.responderPara, subject: m.assunto, text: m.texto }) });\n    return new Response(await r.text(), { status: r.status, headers: cors });\n  }\n};";
    area.appendChild(ui.secao(T('O que o proxy recebe (contrato)', 'What the proxy receives (contract)'), [
      el('p', { class: 'rf-dica', texto: T('POST em JSON com o cabeçalho Authorization: Bearer <token>. Resposta 2xx = enviado; qualquer outra = o e-mail fica como "falhou" na caixa de saída, para tentar de novo. Um POST com { "teste": true } só confere o token.', 'JSON POST with the Authorization: Bearer <token> header. A 2xx answer = sent; anything else = the e-mail stays as "failed" in the outbox, to try again. A POST with { "teste": true } only checks the token.') }),
      el('pre', { class: 'rf-codigo-bloco', texto: contrato }),
      el('details', { class: 'rf-det' }, [el('summary', { texto: T('Exemplo pronto de Cloudflare Worker (Resend)', 'Ready Cloudflare Worker example (Resend)') }),
        el('ol', {}, [
          el('li', { texto: T('No Resend: Add domain → ' + dominio() + ' → crie os registros DKIM/SPF que ele mostrar no Registro.br → Verify. Depois API Keys → Create → copie.', 'In Resend: Add domain → ' + dominio() + ' → create the DKIM/SPF records it shows at Registro.br → Verify. Then API Keys → Create → copy.') }),
          el('li', { texto: T('No Cloudflare: Workers & Pages → Create → Worker → cole o código abaixo → Deploy. Em Settings → Variables and Secrets, crie RESEND_KEY (a chave) e TOKEN (uma senha longa que você inventa).', 'In Cloudflare: Workers & Pages → Create → Worker → paste the code below → Deploy. In Settings → Variables and Secrets, create RESEND_KEY (the key) and TOKEN (a long password you make up).') }),
          el('li', { texto: T('Cole aqui o endereço do Worker (…workers.dev) e o mesmo TOKEN → Salvar → Testar conexão.', 'Paste the Worker address (…workers.dev) and the same TOKEN here → Save → Test connection.') })
        ]),
        el('pre', { class: 'rf-codigo-bloco', texto: worker }),
        ui.botao(T('Copiar o código do Worker', 'Copy the Worker code'), function () { U.copiar(worker).then(function () { ui.aviso(T('Copiado.', 'Copied.')); }); }, 'p')]),
      ui.cinza('emails.envio')
    ]));
  }

  RF.telasEmail = { abrirItem: abrirItem, novoEmail: novoEmail, seloStatus: seloStatus };
})(window);
