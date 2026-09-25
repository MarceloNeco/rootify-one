/* =====================================================================
   RootifyONE — TELAS (2/2): conteúdo, governança, operação, plataforma
   termos · recados · anúncios · versões · publicar · papéis · equipe ·
   privacidade · auditoria · integrações · automações · financeiro ·
   telemetria · armazenamento · o que falta especificar · configurações
   ===================================================================== */
(function (raiz) {
  'use strict';
  var RF = raiz.RF, U = RF.util, T = U.T, el = U.el, ui = RF.ui, C = RF.Cofre, S = RF.Sessao, D = RF.dados, H = RF.h;
  var DIA = 86400000;

  var TIPOS_TERMO = {
    uso: { pt: 'Termos de uso', en: 'Terms of use' }, privacidade: { pt: 'Política de privacidade', en: 'Privacy policy' },
    'aviso-legal': { pt: 'Aviso legal', en: 'Legal notice' }, terceiros: { pt: 'Conteúdo de terceiros', en: 'Third-party content' },
    outro: { pt: 'Outro', en: 'Other' }
  };
  var ESTADOS_TERMO = {
    rascunho: [{ pt: 'rascunho', en: 'draft' }, 'cinza'], revisao: [{ pt: 'em revisão', en: 'in review' }, 'atencao'],
    aprovado: [{ pt: 'aprovado', en: 'approved' }, 'info'], publicado: [{ pt: 'publicado', en: 'published' }, 'ok'],
    substituido: [{ pt: 'substituído', en: 'superseded' }, 'cinza']
  };
  function seloTermo(e) { var x = ESTADOS_TERMO[e] || [{ pt: e, en: e }, 'neutro']; return ui.selo(T(x[0]), x[1]); }
  function pessoasComPermissao(perm) {
    return C.equipe().filter(function (p) {
      if (!p.ativo) return false;
      var papel = RF.Papeis.achar(p.papel);
      return papel && (papel.permissoes.indexOf('*') !== -1 || papel.permissoes.indexOf(perm) !== -1);
    });
  }

  /* ------------------------------------------------------------------
     TERMOS E POLÍTICAS
     ------------------------------------------------------------------ */
  RF.telas.termos = function (area, rota) {
    if (rota.sub === 'termo' && rota.id) return telaTermo(area, rota.id);
    RF.pagina(area, 'termos', T('Fluxo: rascunho → revisão → aprovado (por outra pessoa) → publicado. Só versões publicadas vão para o termos.json.', 'Flow: draft → review → approved (by someone else) → published. Only published versions go to termos.json.'),
      [ui.botaoSe('termos:criar', null, '+ ' + T('Novo termo', 'New term'), novoTermo, 'pri')]);
    var lista = C.lista('termos').filter(function (t) { return RF.noEscopo(t.app); });
    area.appendChild(ui.tabela([
      { id: 't', nome: T('Documento', 'Document'), valor: function (t) { return T(D.Termos.ultima(t).titulo); } },
      { id: 'tipo', nome: T('Tipo', 'Type'), valor: function (t) { return T(TIPOS_TERMO[t.tipo] || TIPOS_TERMO.outro); } },
      { id: 'app', nome: 'App', valor: function (t) { return H.nomeApp(t.app); } },
      { id: 'ob', nome: T('Aceite obrigatório', 'Mandatory acceptance'), valor: function (t) { return t.obrigatorio ? T('sim', 'yes') : T('não', 'no'); } },
      { id: 'pub', nome: T('No ar', 'Live'), desenhar: function (t) { var v = D.Termos.publicada(t); return v ? ui.selo('v' + v.versao + ' · ' + U.data(v.publicadoEm), 'ok') : ui.selo(T('nenhuma', 'none'), 'cinza'); } },
      { id: 'ult', nome: T('Versão em trabalho', 'Working version'), desenhar: function (t) { var v = D.Termos.ultima(t); return el('span', {}, ['v' + v.versao + ' ', seloTermo(v.estado)]); } }
    ], lista, { aoClicar: function (t) { RF.Rota.ir('termos', 'termo', t.id); } }));
    area.appendChild(el('div', { class: 'rf-grade-2' }, [ui.cinza('termos.bloqueio'), ui.cinza('termos.juridico')]));
  };
  function novoTermo() {
    var tipo = ui.escolha(Object.keys(TIPOS_TERMO).map(function (k) { return [k, T(TIPOS_TERMO[k])]; }), 'uso');
    var app = ui.escolha(H.opcoesApps(true, true), '*');
    var obrig = ui.marca(T('Aceite obrigatório (o app bloqueia até aceitar)', 'Mandatory acceptance (app blocks until accepted)'), true);
    var tit = ui.bilingue(T('Título', 'Title'));
    ui.modal(T('Novo termo', 'New term'), el('div', { class: 'rf-form' }, [el('div', { class: 'rf-grade-2' }, [ui.campo(T('Tipo', 'Type'), tipo), ui.campo('App', app)]), obrig, tit]),
      { rodape: [ui.botao(T('Criar rascunho', 'Create draft'), function () {
        var tt = tit.valor(); if (!tt.pt) return ui.aviso(T('Título em PT.', 'Title in PT.'), 'erro');
        var t = { id: U.uid('t-'), tipo: tipo.value, app: app.value, obrigatorio: obrig.querySelector('input').checked,
          versoes: [{ versao: 1, estado: 'rascunho', criadoEm: U.agora(), autor: S.pessoa.email, titulo: tt, texto: { pt: '', en: '' }, nota: null }] };
        C.lista('termos').push(t);
        RF.mudar('termos', 'termos', 'criar', t.id, null, { tipo: t.tipo, app: t.app }, T('Termo criado: ', 'Term created: ') + tt.pt).then(function () { ui.fecharEIr('termos', 'termo', t.id); });
      }, 'pri')] });
  }
  function telaTermo(area, id) {
    var t = C.lista('termos').filter(function (x) { return x.id === id; })[0];
    if (!t) { area.appendChild(el('p', { texto: T('Termo não encontrado.', 'Term not found.') })); return; }
    var v = D.Termos.ultima(t), pub = D.Termos.publicada(t);
    area.appendChild(el('div', { class: 'rf-pag-cab' }, [
      el('div', {}, [el('h1', { class: 'rf-pag-tit', texto: T(v.titulo) }),
        el('p', {}, [ui.selo(T(TIPOS_TERMO[t.tipo] || TIPOS_TERMO.outro), 'neutro'), ' ', H.nomeApp(t.app), ' · ', t.obrigatorio ? T('aceite obrigatório', 'mandatory acceptance') : T('só informativo', 'informational only'),
          ' · ', T('em trabalho: ', 'working: '), 'v' + v.versao, ' ', seloTermo(v.estado), pub ? ' · ' + T('no ar: v', 'live: v') + pub.versao : ''])]),
      el('div', { class: 'rf-acoes' }, [ui.botao('‹ ' + T('Termos', 'Terms'), function () { RF.Rota.ir('termos'); }, 'p')])
    ]));
    if (v.nota) area.appendChild(el('div', { class: 'rf-faixa-aviso rf-faixa-info' }, [T(v.nota)]));
    var podeEd = RF.pode('termos:editar', t.app) && v.estado === 'rascunho';
    var tit = ui.bilingue(T('Título', 'Title'), v.titulo), txt = ui.bilingue(T('Texto', 'Text'), v.texto, { linhas: 12 });
    if (!podeEd) Array.prototype.forEach.call([tit, txt], function (b) { Array.prototype.forEach.call(b.querySelectorAll('input,textarea'), function (i) { i.readOnly = true; }); });
    var acoes = [];
    function transicao(novo, rot, extra) {
      var antes = v.estado;
      if (extra) extra();
      v.estado = novo;
      RF.mudar('termos', 'termos', 'estado-' + novo, t.id, antes, novo, T('Termo ', 'Term ') + '"' + v.titulo.pt + '" v' + v.versao + ': ' + rot).then(function () {
        if (novo === 'aprovado') D.Automacoes.rodar('termo-aprovado', t, null);
        RF.renderizar();
      });
    }
    function salvarTexto() {
      v.titulo = tit.valor(); v.texto = txt.valor();
      return RF.mudar('termos', 'termos', 'editar', t.id, null, { versao: v.versao }, T('Texto do termo salvo (v', 'Term text saved (v') + v.versao + ')');
    }
    if (podeEd) {
      acoes.push(ui.botao(T('Salvar rascunho', 'Save draft'), function () { salvarTexto().then(function () { ui.aviso(T('Salvo.', 'Saved.')); }); }));
      acoes.push(ui.botao(T('Enviar para aprovação', 'Send for approval'), function () {
        var tv = tit.valor(), xv = txt.valor();
        if (!tv.pt || !tv.en || !xv.pt || !xv.en) return ui.aviso(T('Título e texto em PT e EN antes de enviar.', 'Title and text in PT and EN before sending.'), 'erro');
        salvarTexto().then(function () { transicao('revisao', T('enviado para aprovação', 'sent for approval')); });
      }, 'pri'));
    }
    if (v.estado === 'revisao' && RF.pode('termos:aprovar', t.app)) {
      var outros = pessoasComPermissao('termos:aprovar').filter(function (p) { return p.email !== v.autor; });
      var souAutor = v.autor === S.pessoa.email;
      if (souAutor && outros.length) {
        acoes.push(el('p', { class: 'rf-dica', texto: T('Você escreveu esta versão; a aprovação precisa ser de outra pessoa (', 'You wrote this version; approval must come from someone else (') + outros.map(function (p) { return p.nome; }).join(', ') + ').' }));
      } else {
        acoes.push(ui.botao('✓ ' + T('Aprovar', 'Approve'), function () {
          ui.confirmar(T('Aprovar versão', 'Approve version'), souAutor ? T('Não há outra pessoa com permissão de aprovar. A aprovação vai para o log como "sem segunda pessoa".', 'No one else can approve. The approval goes to the log as "without a second person".') : T('Confirma que leu PT e EN?', 'Confirm you read PT and EN?')).then(function (ok) {
            if (!ok) return;
            transicao('aprovado', souAutor ? T('aprovado SEM segunda pessoa', 'approved WITHOUT a second person') : T('aprovado', 'approved'), function () { v.aprovador = S.pessoa.email; v.aprovadoEm = U.agora(); });
          });
        }, 'pri'));
      }
      acoes.push(ui.botao(T('Devolver para rascunho', 'Return to draft'), function () {
        ui.confirmar(T('Devolver', 'Return'), T('Explique o que precisa mudar.', 'Explain what needs to change.'), { motivo: true }).then(function (ok) {
          if (!ok) return; transicao('rascunho', T('devolvido: ', 'returned: ') + ok.motivo, function () { v.nota = { pt: 'Devolvido: ' + ok.motivo, en: 'Returned: ' + ok.motivo }; });
        });
      }));
    }
    if (v.estado === 'aprovado' && RF.pode('termos:publicar', t.app)) acoes.push(ui.botao('🚀 ' + T('Marcar para publicar', 'Mark for publishing'), function () {
      transicao('publicado', T('marcado como publicado (vai no próximo Publicar)', 'marked as published (goes in the next Publish)'), function () {
        t.versoes.forEach(function (x) { if (x !== v && x.estado === 'publicado') x.estado = 'substituido'; });
        v.publicadoEm = U.agora();
      });
    }, 'pri'));
    if (v.estado === 'publicado' && RF.pode('termos:criar', t.app)) acoes.push(ui.botao('+ ' + T('Criar nova versão', 'Create new version'), function () {
      D.Termos.novaVersao(t, S.pessoa.email);
      RF.mudar('termos', 'termos', 'nova-versao', t.id, null, { versao: v.versao + 1 }, T('Nova versão do termo: v', 'New term version: v') + (v.versao + 1)).then(RF.renderizar);
    }, 'pri'));
    var ajustes = null;
    if (RF.pode('termos:editar', t.app)) {
      var obrig = ui.marca(T('Aceite obrigatório', 'Mandatory acceptance'), t.obrigatorio);
      obrig.querySelector('input').onchange = function () {
        var antes = t.obrigatorio; t.obrigatorio = obrig.querySelector('input').checked;
        RF.mudar('termos', 'termos', 'obrigatorio', t.id, antes, t.obrigatorio, T('Aceite obrigatório: ', 'Mandatory acceptance: ') + t.obrigatorio);
      };
      ajustes = obrig;
    }
    area.appendChild(el('div', { class: 'rf-form' }, [tit, txt, ajustes, el('div', { class: 'rf-acoes' }, acoes)]));
    area.appendChild(ui.secao(T('Versões', 'Versions'), [ui.tabela([
      { id: 'v', nome: T('Versão', 'Version'), valor: function (x) { return 'v' + x.versao; } },
      { id: 'e', nome: T('Estado', 'State'), desenhar: function (x) { return seloTermo(x.estado); } },
      { id: 'a', nome: T('Autor', 'Author'), valor: function (x) { return x.autor; } },
      { id: 'c', nome: T('Criada', 'Created'), desenhar: function (x) { return U.data(x.criadoEm); } },
      { id: 'ap', nome: T('Aprovada por', 'Approved by'), valor: function (x) { return x.aprovador ? x.aprovador + ' · ' + U.data(x.aprovadoEm) : '—'; } },
      { id: 'p', nome: T('Publicada', 'Published'), desenhar: function (x) { return x.publicadoEm ? U.data(x.publicadoEm) : '—'; } }
    ], t.versoes.slice().reverse())]));
  }

  /* ------------------------------------------------------------------
     RECADOS
     ------------------------------------------------------------------ */
  var PRI_RECADO = { urgente: { pt: 'Urgente', en: 'Urgent' }, importante: { pt: 'Importante', en: 'Important' }, info: { pt: 'Só para saber', en: 'FYI' } };
  RF.telas.recados = function (area) {
    RF.pagina(area, 'recados', T('Avisos da plataforma. Os ativos vão para o recados.json.', 'Platform notices. Active ones go to recados.json.'),
      [ui.botaoSe('recados:criar', null, '+ ' + T('Novo recado', 'New notice'), function () { editarRecado(null); }, 'pri')]);
    var hoje = U.agora().slice(0, 10);
    area.appendChild(ui.tabela([
      { id: 't', nome: T('Recado', 'Notice'), valor: function (r) { return T(r.titulo); } },
      { id: 'app', nome: 'App', valor: function (r) { return H.nomeApp(r.app); } },
      { id: 'pub', nome: T('Público', 'Audience'), valor: function (r) { return r.publico === 'todos' ? T('todos', 'everyone') : H.nomePlano(r.publico); } },
      { id: 'pri', nome: T('Prioridade', 'Priority'), valor: function (r) { return T(PRI_RECADO[r.prioridade] || PRI_RECADO.info); } },
      { id: 'per', nome: T('Período', 'Period'), valor: function (r) { return U.data(r.inicio) + ' → ' + (r.fim ? U.data(r.fim) : '…'); } },
      { id: 'e', nome: T('Situação', 'Status'), desenhar: function (r) {
        if (!r.ativo) return ui.selo(T('desligado', 'off'), 'cinza');
        if (r.fim && r.fim < hoje) return ui.selo(T('terminou', 'ended'), 'cinza');
        if (r.inicio > hoje) return ui.selo(T('agendado', 'scheduled'), 'info');
        return ui.selo(T('no ar', 'live'), 'ok');
      } }
    ], C.lista('recados').filter(function (r) { return RF.noEscopo(r.app); }), { aoClicar: function (r) { editarRecado(r); } }));
    area.appendChild(ui.cinza('recados.entrega'));
  };
  function editarRecado(r) {
    var novo = !r, x = r ? U.clonar(r) : { id: U.uid('r-'), titulo: {}, texto: {}, app: '*', publico: 'todos', prioridade: 'info', inicio: U.agora().slice(0, 10), fim: '', ativo: true };
    var podeEd = RF.pode(novo ? 'recados:criar' : 'recados:editar', x.app);
    var tit = ui.bilingue(T('Título', 'Title'), x.titulo), txt = ui.bilingue(T('Texto', 'Text'), x.texto, { linhas: 3 });
    var app = ui.escolha(H.opcoesApps(true, true), x.app);
    var pub = ui.escolha([['todos', T('Todos', 'Everyone')]].concat(H.opcoesPlanos()), x.publico);
    var pri = ui.escolha(Object.keys(PRI_RECADO).map(function (k) { return [k, T(PRI_RECADO[k])]; }), x.prioridade);
    var ini = ui.entrada(x.inicio, { tipo: 'date' }), fim = ui.entrada(x.fim, { tipo: 'date' });
    var ativo = ui.marca(T('Ativo', 'Active'), x.ativo);
    var corpo = el('div', { class: 'rf-form' }, [tit, txt, el('div', { class: 'rf-grade-3' }, [ui.campo('App', app), ui.campo(T('Público', 'Audience'), pub), ui.campo(T('Prioridade', 'Priority'), pri)]),
      el('div', { class: 'rf-grade-2' }, [ui.campo(T('Começa', 'Starts'), ini), ui.campo(T('Termina', 'Ends'), fim)]), ativo]);
    if (!podeEd) Array.prototype.forEach.call(corpo.querySelectorAll('input,select,textarea'), function (i) { i.disabled = true; });
    var rod = [];
    if (!novo && RF.pode('recados:excluir', x.app)) rod.push(ui.botao(T('Excluir', 'Delete'), function () {
      C.db.recados = C.lista('recados').filter(function (y) { return y.id !== x.id; });
      RF.mudar('recados', 'recados', 'excluir', x.id, r, null, T('Recado excluído', 'Notice deleted')).then(function () { ui.fecharModal(); RF.renderizar(); });
    }, 'perigo'));
    if (podeEd) rod.push(ui.botao(T('Salvar', 'Save'), function () {
      var y = Object.assign({}, x, { titulo: tit.valor(), texto: txt.valor(), app: app.value, publico: pub.value, prioridade: pri.value, inicio: ini.value, fim: fim.value, ativo: ativo.querySelector('input').checked });
      if (!y.titulo.pt || !y.titulo.en || !y.texto.pt || !y.texto.en) return ui.aviso(T('Título e texto em PT e EN.', 'Title and text in PT and EN.'), 'erro');
      if (y.fim && y.fim < y.inicio) return ui.aviso(T('Termina antes de começar.', 'Ends before it starts.'), 'erro');
      if (novo) C.lista('recados').push(y); else C.db.recados = C.lista('recados').map(function (z) { return z.id === y.id ? y : z; });
      RF.mudar('recados', 'recados', novo ? 'criar' : 'editar', y.id, r, y, T('Recado salvo: ', 'Notice saved: ') + y.titulo.pt).then(function () { ui.fecharModal(); RF.renderizar(); });
    }, 'pri'));
    ui.modal(novo ? T('Novo recado', 'New notice') : T(x.titulo), corpo, { largo: true, rodape: rod });
  }

  /* ------------------------------------------------------------------
     ANÚNCIOS
     ------------------------------------------------------------------ */
  RF.telas.anuncios = function (area) {
    RF.pagina(area, 'anuncios', T('Os cartões que aparecem na faixa e no pop-up dos apps. Cada app nunca mostra o próprio anúncio.', 'The cards shown in the apps\' strip and pop-up. An app never shows its own ad.'),
      [ui.botaoSe('anuncios:criar', null, '+ ' + T('Novo anúncio', 'New ad'), function () { editarAnuncio(null); }, 'pri')]);
    var grade = el('div', { class: 'rf-cartoes' });
    C.lista('anuncios').forEach(function (a) {
      var c = el('button', { type: 'button', class: 'rf-anuncio' + (a.ativo === false ? ' rf-plano-inativo' : '') }, [
        el('span', { class: 'rf-glifo rf-glifo-g', style: { background: a.cor }, 'aria-hidden': 'true', texto: a.glifo }),
        el('span', {}, [el('strong', { texto: a.nome }), el('br'), el('span', { texto: T(a.frase) }), el('br'),
          ui.selo(a.ativo === false ? T('desligado', 'off') : T('ativo', 'active'), a.ativo === false ? 'cinza' : 'ok')])
      ]);
      c.onclick = function () { editarAnuncio(a); };
      grade.appendChild(c);
    });
    area.appendChild(grade);
    area.appendChild(el('div', { class: 'rf-grade-2' }, [ui.cinza('anuncios.metricas'), ui.cinza('anuncios.externos')]));
  };
  function editarAnuncio(a) {
    var novo = !a, x = a ? U.clonar(a) : { id: '', nome: '', cor: '#60a5fa', glifo: '✨', link: 'https://marceloneco.github.io/', frase: {}, ativo: true };
    var podeEd = RF.pode(novo ? 'anuncios:criar' : 'anuncios:editar');
    var id = ui.entrada(x.id, { attrs: { disabled: !novo } }), nome = ui.entrada(x.nome), cor = ui.entrada(x.cor, { tipo: 'color' }), glifo = ui.entrada(x.glifo);
    var link = ui.entrada(x.link, { tipo: 'url' }), img = ui.entrada(x.imagem || '', { tipo: 'url', attrs: { placeholder: T('opcional', 'optional') } });
    var frase = ui.bilingue(T('Frase (provocação curta)', 'Phrase (short hook)'), x.frase, { linhas: 2 });
    var ativo = ui.marca(T('Ativo', 'Active'), x.ativo !== false);
    var corpo = el('div', { class: 'rf-form' }, [el('div', { class: 'rf-grade-2' }, [ui.campo(T('Identificador (igual ao id do app anunciado)', 'Identifier (same as the advertised app id)'), id), ui.campo(T('Nome', 'Name'), nome)]),
      frase, el('div', { class: 'rf-grade-3' }, [ui.campo('Link', link), ui.campo(T('Cor', 'Colour'), cor), ui.campo(T('Símbolo', 'Symbol'), glifo)]), ui.campo(T('Imagem (endereço)', 'Image (address)'), img), ativo]);
    if (!podeEd) Array.prototype.forEach.call(corpo.querySelectorAll('input,select,textarea'), function (i) { i.disabled = true; });
    var rod = [];
    if (!novo && RF.pode('anuncios:excluir')) rod.push(ui.botao(T('Excluir', 'Delete'), function () {
      C.db.anuncios = C.lista('anuncios').filter(function (y) { return y.id !== x.id; });
      RF.mudar('anuncios', 'anuncios', 'excluir', x.id, a, null, T('Anúncio excluído: ', 'Ad deleted: ') + x.nome).then(function () { ui.fecharModal(); RF.renderizar(); });
    }, 'perigo'));
    if (podeEd) rod.push(ui.botao(T('Salvar', 'Save'), function () {
      var y = Object.assign({}, x, { id: novo ? id.value.trim() : x.id, nome: nome.value.trim(), cor: cor.value, glifo: glifo.value.trim(), link: link.value.trim(), imagem: img.value.trim() || undefined,
        frase: frase.valor(), ativo: ativo.querySelector('input').checked });
      if (!y.id || !y.nome) return ui.aviso(T('Identificador e nome.', 'Identifier and name.'), 'erro');
      if (!/^https:\/\//.test(y.link)) return ui.aviso(T('Link começando com https://', 'Link starting with https://'), 'erro');
      if (!y.frase.pt || !y.frase.en) return ui.aviso(T('Frase em PT e EN.', 'Phrase in PT and EN.'), 'erro');
      if (novo && C.lista('anuncios').some(function (z) { return z.id === y.id; })) return ui.aviso(T('Já existe.', 'Already exists.'), 'erro');
      if (novo) C.lista('anuncios').push(y); else C.db.anuncios = C.lista('anuncios').map(function (z) { return z.id === y.id ? y : z; });
      RF.mudar('anuncios', 'anuncios', novo ? 'criar' : 'editar', y.id, a, y, T('Anúncio salvo: ', 'Ad saved: ') + y.nome).then(function () { ui.fecharModal(); RF.renderizar(); });
    }, 'pri'));
    ui.modal(novo ? T('Novo anúncio', 'New ad') : x.nome, corpo, { largo: true, rodape: rod });
  }

  /* ------------------------------------------------------------------
     VERSÕES E NOVIDADES
     ------------------------------------------------------------------ */
  var appVersoes = '';
  RF.telas.versoes = function (area) {
    RF.pagina(area, 'versoes', T('O que cada versão trouxe, em PT e EN. Vai para versoes/<app>.json e aparece nas Configurações de cada app.', 'What each version brought, in PT and EN. Goes to versoes/<app>.json and shows in each app\'s Settings.'),
      [ui.botaoSe('versoes:criar', null, '+ ' + T('Nova versão', 'New version'), function () { editarVersao(null); }, 'pri')]);
    var sel = ui.escolha([['', T('Todos', 'All')]].concat(H.opcoesApps(false, true)), appVersoes);
    sel.onchange = function () { appVersoes = sel.value; RF.renderizar(); };
    area.appendChild(el('div', { class: 'rf-filtros' }, [ui.campo('App', sel),
      appVersoes ? ui.botao(T('Baixar o versoes.json deste app', 'Download this app\'s versoes.json'), function () {
        var arq = D.gerarArquivos().filter(function (a) { return a.nome === 'versoes/' + appVersoes + '.json'; })[0];
        if (!arq) return ui.aviso(T('Nenhuma versão deste app.', 'No versions for this app.'), 'info');
        U.baixar('versoes.json', arq.texto, 'application/json');
      }, 'p') : null]));
    var lista = C.lista('versoes').filter(function (v) { return (!appVersoes || v.app === appVersoes) && RF.noEscopo(v.app); })
      .sort(function (a, b) { return String(b.data).localeCompare(String(a.data)); });
    area.appendChild(ui.tabela([
      { id: 'app', nome: 'App', valor: function (v) { return H.nomeApp(v.app); } },
      { id: 'v', nome: T('Versão', 'Version'), valor: function (v) { return v.versao; } },
      { id: 'd', nome: T('Data', 'Date'), ordenar: function (v) { return v.data; }, desenhar: function (v) { return U.data(v.data); } },
      { id: 'i', nome: T('Novidades', 'What\'s new'), valor: function (v) { return (T(v.itens) || []).join(' · '); } }
    ], lista, { aoClicar: function (v) { editarVersao(v); } }));
  };
  function editarVersao(v) {
    var novo = !v, x = v ? U.clonar(v) : { id: U.uid('v-'), app: appVersoes || 'rootify-one', versao: '', data: U.agora().slice(0, 10), itens: { pt: [], en: [] } };
    var app = ui.escolha(H.opcoesApps(false, true), x.app), ver = ui.entrada(x.versao, { attrs: { placeholder: '1.2.0' } }), data = ui.entrada(x.data, { tipo: 'date' });
    var itens = ui.bilingue(T('Novidades (uma por linha)', 'What\'s new (one per line)'), { pt: (x.itens.pt || []).join('\n'), en: (x.itens.en || []).join('\n') }, { linhas: 5 });
    var rod = [ui.botao(T('Salvar', 'Save'), function () {
      var iv = itens.valor();
      var y = Object.assign({}, x, { app: app.value, versao: ver.value.trim(), data: data.value, itens: { pt: iv.pt.split('\n').map(function (s) { return s.trim(); }).filter(Boolean), en: iv.en.split('\n').map(function (s) { return s.trim(); }).filter(Boolean) } });
      if (!/^\d+(\.\d+){0,2}$/.test(y.versao)) return ui.aviso(T('Versão no formato 1.2.3', 'Version in 1.2.3 format'), 'erro');
      if (!y.itens.pt.length || y.itens.pt.length !== y.itens.en.length) return ui.aviso(T('Mesma quantidade de linhas em PT e EN.', 'Same number of lines in PT and EN.'), 'erro');
      if (novo) C.lista('versoes').push(y); else C.db.versoes = C.lista('versoes').map(function (z) { return z.id === y.id ? y : z; });
      RF.mudar('versoes', 'versoes', novo ? 'criar' : 'editar', y.id, v, y, T('Versão ', 'Version ') + y.app + ' ' + y.versao).then(function () { ui.fecharModal(); RF.renderizar(); });
    }, 'pri')];
    ui.modal(novo ? T('Nova versão', 'New version') : x.app + ' ' + x.versao, el('div', { class: 'rf-form' }, [el('div', { class: 'rf-grade-3' }, [ui.campo('App', app), ui.campo(T('Versão', 'Version'), ver), ui.campo(T('Data', 'Date'), data)]), itens]), { largo: true, rodape: RF.pode('versoes:editar', x.app) ? rod : [] });
  }

  /* ------------------------------------------------------------------
     PUBLICAR
     ------------------------------------------------------------------ */
  RF.telas.publicar = function (area) {
    RF.pagina(area, 'publicar', T('Tudo o que você muda no RootifyONE só chega aos apps depois de publicado aqui.', 'Everything you change in RootifyONE only reaches the apps after it is published here.'));
    var arquivos = D.gerarArquivos();
    arquivos.push({ nome: 'LEIA-ME.md', texto: D.leiaMeDados() });
    var conf = D.conferir(), dif = D.diferencas(arquivos);
    var mudados = dif.filter(function (x) { return x.situacao === 'novo' || x.situacao === 'mudou'; });

    var passo1 = el('div', {});
    if (conf.erros.length) passo1.appendChild(el('div', { class: 'rf-faixa-aviso rf-faixa-erro' }, [el('strong', { texto: T('Corrija antes de publicar:', 'Fix before publishing:') }),
      el('ul', {}, conf.erros.map(function (e) { return el('li', { texto: e }); }))]));
    if (conf.avisos.length) passo1.appendChild(el('div', { class: 'rf-faixa-aviso' }, [el('strong', { texto: T('Atenção (não impede):', 'Heads-up (does not block):') }),
      el('ul', {}, conf.avisos.map(function (e) { return el('li', { texto: e }); }))]));
    if (!conf.erros.length && !conf.avisos.length) passo1.appendChild(el('p', { texto: '✓ ' + T('Tudo conferido: PT e EN completos, endereços e datas certos.', 'All checked: PT and EN complete, addresses and dates right.') }));
    area.appendChild(ui.secao('1. ' + T('Conferência', 'Check'), [passo1]));

    area.appendChild(ui.secao('2. ' + T('Arquivos', 'Files') + ' (' + mudados.length + T(' com mudança', ' changed') + ')', [ui.tabela([
      { id: 'n', nome: T('Arquivo', 'File'), valor: function (x) { return x.nome; } },
      { id: 's', nome: T('Situação', 'Status'), desenhar: function (x) {
        var M = { novo: [T('novo', 'new'), 'info'], mudou: [T('mudou', 'changed'), 'atencao'], igual: [T('igual ao publicado', 'same as published'), 'cinza'], removido: [T('sai na próxima', 'removed next'), 'erro'] };
        return ui.selo(M[x.situacao][0], M[x.situacao][1]);
      } },
      { id: 'v', nome: '', desenhar: function (x) {
        var a = arquivos.filter(function (y) { return y.nome === x.nome; })[0];
        return a ? ui.botao(T('Ver', 'View'), function () { ui.modal(a.nome, el('pre', { class: 'rf-codigo-bloco', texto: a.texto }), { largo: true }); }, 'p') : null;
      } }
    ], dif, { porPagina: 50 })]));

    var cfg = C.obj('config'), gh = cfg.github || {};
    var bloqueado = conf.erros.length > 0 || !RF.pode('publicar:publicar');
    var progresso = el('p', { class: 'rf-dica', 'aria-live': 'polite' });
    var btGh = ui.botao('🚀 ' + T('Publicar no GitHub agora', 'Publish to GitHub now'), function () {
      if (!gh.token) return ui.aviso(T('Cadastre o token em Integrações primeiro.', 'Set up the token in Integrations first.'), 'erro');
      var enviar = arquivos.filter(function (a) { return mudados.some(function (m) { return m.nome === a.nome; }); });
      if (!enviar.length) return ui.aviso(T('Nada mudou desde a última publicação.', 'Nothing changed since the last publication.'), 'info');
      ui.confirmar(T('Publicar', 'Publish'), enviar.length + T(' arquivo(s) vão para ', ' file(s) go to ') + gh.dono + '/' + gh.repo + ' (' + (gh.ramo || 'main') + '). ' + T('Os apps passam a ver na próxima abertura.', 'Apps see it on their next opening.')).then(function (ok) {
        if (!ok) return;
        btGh.disabled = true;
        RF.GitHub.publicar(gh, enviar, 'RootifyONE: publicação por ' + S.pessoa.apelido, function (i, n, nome) { progresso.textContent = i + '/' + n + ' · ' + nome; })
          .then(function (feitos) { return registrarPublicacao('github', arquivos, feitos); })
          .then(function () { ui.aviso(T('Publicado no GitHub.', 'Published to GitHub.')); RF.renderizar(); })
          .catch(function (e) {
            btGh.disabled = false;
            var m = String(e.message);
            ui.aviso(m === 'token' ? T('O GitHub recusou o token (vencido ou sem permissão de escrita no repositório).', 'GitHub refused the token (expired or no write permission on the repository).')
              : m === 'repo' ? T('Repositório não encontrado. Confira dono e nome em Integrações.', 'Repository not found. Check owner and name in Integrations.')
              : T('Falhou: ', 'Failed: ') + m + T(' (sem internet, ou aberto fora do https).', ' (no internet, or opened outside https).'), 'erro');
            RF.Log.registrar('publicar', 'falha', gh.repo, null, null, T('Publicação falhou: ', 'Publication failed: ') + m);
          });
      });
    }, 'pri', { disabled: bloqueado });
    var btZip = ui.botao('⬇ ' + T('Baixar pacote (zip) para subir à mão', 'Download package (zip) to upload by hand'), function () {
      U.baixar('SOLVERONE-DADOS v' + RF.VERSAO + ' ' + dataArquivo() + '.zip', U.criarZip(arquivos));
      RF.Log.registrar('publicar', 'pacote', '', null, { arquivos: arquivos.length }, T('Pacote de arquivos master baixado', 'Master file package downloaded'));
      setTimeout(function () {
        ui.confirmar(T('Subiu no GitHub?', 'Uploaded to GitHub?'), T('Depois de subir os arquivos no repositório solverone-dados, confirme aqui para o RootifyONE marcar como publicado.', 'After uploading the files to the solverone-dados repository, confirm here so RootifyONE marks it as published.'), { sim: T('Já subi', 'Uploaded') })
          .then(function (ok) { if (ok) registrarPublicacao('pacote', arquivos, []).then(RF.renderizar); });
      }, 800);
    }, '', { disabled: bloqueado });
    area.appendChild(ui.secao('3. ' + T('Publicar', 'Publish'), [
      el('p', { texto: gh.token ? T('Destino: ', 'Destination: ') + gh.dono + '/' + gh.repo + ' · ' + (gh.ramo || 'main') : T('Sem token do GitHub: use o pacote, ou cadastre o token em Integrações.', 'No GitHub token: use the package, or set up the token in Integrations.') }),
      el('div', { class: 'rf-acoes' }, [btGh, btZip]), progresso,
      !RF.pode('publicar:publicar') ? el('p', { class: 'rf-dica', texto: T('Seu papel vê, mas não publica.', 'Your role can view but not publish.') }) : null,
      ui.cinza('publicar.agendada')
    ]));

    var hist = C.lista('publicacoes').slice().reverse();
    area.appendChild(ui.secao(T('Histórico de publicações', 'Publication history'), [ui.tabela([
      { id: 'q', nome: T('Quando', 'When'), desenhar: function (p) { return U.data(p.quando, true); } },
      { id: 'p', nome: T('Por', 'By'), valor: function (p) { return p.quem; } },
      { id: 'v', nome: T('Como', 'How'), valor: function (p) { return p.via === 'github' ? 'GitHub' : T('pacote', 'package'); } },
      { id: 'n', nome: T('Arquivos', 'Files'), valor: function (p) { return Object.keys(p.snapshot || {}).length; } },
      { id: 'a', nome: '', desenhar: function (p) {
        return el('span', { class: 'rf-acoes' }, [
          ui.botao(T('Baixar esta versão', 'Download this version'), function () {
            U.baixar('SOLVERONE-DADOS ' + dataArquivo(p.quando) + ' (restaurar).zip', U.criarZip(Object.keys(p.snapshot).map(function (n) { return { nome: n, texto: p.snapshot[n] }; })));
          }, 'p'),
          gh.token && RF.pode('publicar:publicar') && p !== hist[0] ? ui.botao(T('Republicar esta versão', 'Republish this version'), function () {
            ui.confirmar(T('Voltar para esta publicação', 'Roll back to this publication'), T('Os arquivos desta publicação voltam ao GitHub. O que está em edição no RootifyONE não muda.', 'This publication\'s files go back to GitHub. What is being edited in RootifyONE does not change.')).then(function (ok) {
              if (!ok) return;
              var arqs = Object.keys(p.snapshot).map(function (n) { return { nome: n, texto: p.snapshot[n] }; });
              RF.GitHub.publicar(gh, arqs, 'RootifyONE: volta para ' + p.quando).then(function (f) { return registrarPublicacao('github', arqs, f, p.quando); })
                .then(function () { ui.aviso(T('Publicação anterior restaurada.', 'Previous publication restored.')); RF.renderizar(); })
                .catch(function (e) { ui.aviso(T('Falhou: ', 'Failed: ') + e.message, 'erro'); });
            });
          }, 'p') : null
        ]);
      } }
    ], hist, { vazio: T('Nada publicado ainda.', 'Nothing published yet.') })]));
  };
  function dataArquivo(q) {
    var d = q ? new Date(q) : new Date();
    var M = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return ('0' + d.getDate()).slice(-2) + '-' + M[d.getMonth()] + '-' + d.getFullYear();
  }
  function registrarPublicacao(via, arquivos, commits, restaurouDe) {
    var snap = {}; arquivos.forEach(function (a) { snap[a.nome] = a.texto; });
    var p = { id: U.uid('pub-'), quando: U.agora(), quem: S.pessoa.email, via: via, commits: commits || [], snapshot: snap, restaurouDe: restaurouDe || null };
    C.lista('publicacoes').push(p);
    if (C.db.publicacoes.length > 20) C.db.publicacoes = C.db.publicacoes.slice(-20);
    return RF.mudar('publicacoes', 'publicar', via, '', null, { arquivos: Object.keys(snap).length, commits: (commits || []).length, restaurouDe: restaurouDe || null },
      (restaurouDe ? T('Republicação da versão de ', 'Republish of version from ') + U.data(restaurouDe, true) : T('Publicado por ', 'Published via ') + via) + ' · ' + Object.keys(snap).length + T(' arquivos', ' files'));
  }

  /* ------------------------------------------------------------------
     PAPÉIS E PERMISSÕES
     ------------------------------------------------------------------ */
  RF.telas.papeis = function (area, rota) {
    if (rota.sub === 'papel' && rota.id) return telaPapel(area, rota.id);
    var aba = rota.sub || 'equipe';
    RF.pagina(area, 'papeis', T('Papéis da equipe decidem o que cada pessoa vê e faz aqui. Perfis dos clientes são quem usa os apps.', 'Staff roles decide what each person sees and does here. Customer profiles are who uses the apps.'),
      [RF.ehDono() ? ui.botao('🎭 ' + T('Testar como outro papel', 'Test as another role'), function () { RF.abrirSimulador(); }) : null]);
    area.appendChild(ui.abas([{ id: 'equipe', nome: T('Papéis da equipe', 'Staff roles') }, { id: 'clientes', nome: T('Perfis dos clientes', 'Customer profiles') },
      { id: 'separacao', nome: T('Separação de funções', 'Separation of duties') }, { id: 'matriz', nome: T('Visão geral', 'Overview') }], aba, function (a) { RF.Rota.ir('papeis', a); }));
    if (aba === 'clientes') {
      area.appendChild(ui.tabela([
        { id: 'n', nome: T('Perfil', 'Profile'), valor: function (p) { return T(p.nome); } },
        { id: 'd', nome: T('O que é', 'What it is'), valor: function (p) { return T(p.descricao); } },
        { id: 'p', nome: T('Plano ligado', 'Linked plan'), valor: function (p) { return p.plano ? H.nomePlano(p.plano) : '—'; } },
        { id: 'e', nome: T('Situação', 'Status'), desenhar: function (p) { return ui.seloEstado(p.estado); } }
      ], RF.cat.PERFIS, { classeLinha: function (p) { return p.estado === 'especificar' ? 'rf-lin-cinza' : null; } }));
      area.appendChild(ui.cinza('papeis.clientes'));
      return;
    }
    if (aba === 'separacao') {
      RF.cat.SEPARACAO.forEach(function (r) {
        area.appendChild(el('div', { class: 'rf-cinza' + (r.estado === 'ativo' ? ' rf-regra-ok' : '') }, [el('div', { class: 'rf-cinza-cab' }, [el('strong', { texto: T(r.nome) }), ui.seloEstado(r.estado)]), el('p', { texto: T(r.descricao) })]));
      });
      return;
    }
    if (aba === 'matriz') {
      var papeis = RF.Papeis.todos();
      var ab = { ver: 'V', criar: 'C', editar: 'E', excluir: 'X', exportar: '⇩', aprovar: 'A', publicar: 'P' };
      area.appendChild(el('p', { class: 'rf-dica', texto: 'V = ' + T('ver', 'view') + ' · C = ' + T('criar', 'create') + ' · E = ' + T('editar', 'edit') + ' · X = ' + T('excluir', 'delete') + ' · ⇩ = ' + T('exportar', 'export') + ' · A = ' + T('aprovar', 'approve') + ' · P = ' + T('publicar', 'publish') }));
      area.appendChild(ui.tabela([{ id: 'r', nome: T('Recurso', 'Resource'), valor: function (r) { return T(r.nome); } }].concat(papeis.map(function (p) {
        return { id: p.id, nome: T(p.nome).split(' (')[0], classe: 'rf-centro rf-mono', valor: function (r) {
          if (p.permissoes.indexOf('*') !== -1) return '★';
          return r.acoes.filter(function (a) { return p.permissoes.indexOf(r.id + ':' + a) !== -1; }).map(function (a) { return ab[a]; }).join('') || '·';
        } };
      })), RF.cat.RECURSOS, { porPagina: 60, rotulo: T('Permissões por papel', 'Permissions by role') }));
      return;
    }
    var pessoas = C.equipe();
    var grade = el('div', { class: 'rf-cartoes' });
    RF.Papeis.todos().forEach(function (p) {
      var n = pessoas.filter(function (x) { return x.papel === p.id; }).length;
      var b = el('button', { type: 'button', class: 'rf-cartao rf-clicavel rf-papel', style: { borderTopColor: p.cor || '#94a3b8' } }, [
        el('strong', { texto: T(p.nome) }), el('span', { class: 'rf-cartao-det', texto: T(p.descricao) }),
        el('span', {}, [ui.selo(n + T(' pessoa(s)', ' person(s)'), 'neutro'), ' ', p.escopoPorApp ? ui.selo(T('por app', 'per app'), 'info') : null, ' ',
          p.sistema ? ui.selo(T('fixo', 'fixed'), 'cinza') : null, p.proprio ? ui.selo(T('criado por você', 'custom'), 'info') : null, p.ajustado ? ui.selo(T('ajustado', 'adjusted'), 'atencao') : null])
      ]);
      b.onclick = function () { RF.Rota.ir('papeis', 'papel', p.id); };
      grade.appendChild(b);
    });
    area.appendChild(grade);
  };
  function telaPapel(area, id) {
    var p = RF.Papeis.achar(id);
    if (!p) { area.appendChild(el('p', { texto: T('Papel não encontrado.', 'Role not found.') })); return; }
    var podeEd = RF.pode('papeis:editar') && !p.sistema;
    var todasPerm = p.permissoes.indexOf('*') !== -1;
    area.appendChild(el('div', { class: 'rf-pag-cab' }, [el('div', {}, [el('h1', { class: 'rf-pag-tit', texto: T(p.nome) }), el('p', { texto: T(p.descricao) })]),
      el('div', { class: 'rf-acoes' }, [ui.botao('‹ ' + T('Papéis', 'Roles'), function () { RF.Rota.ir('papeis'); }, 'p'),
        RF.pode('papeis:criar') ? ui.botao(T('Criar papel a partir deste', 'Create role from this one'), function () { clonarPapel(p); }) : null,
        p.proprio && RF.pode('papeis:excluir') ? ui.botao(T('Excluir papel', 'Delete role'), function () {
          if (C.equipe().some(function (x) { return x.papel === p.id; })) return ui.aviso(T('Há pessoas com este papel. Troque o papel delas antes.', 'People have this role. Change their role first.'), 'erro');
          C.db.papeis = C.lista('papeis').filter(function (x) { return x.id !== p.id; });
          RF.mudar('papeis', 'papeis', 'excluir', p.id, p, null, T('Papel excluído: ', 'Role deleted: ') + T(p.nome)).then(function () { RF.Rota.ir('papeis'); });
        }, 'perigo') : null,
        p.ajustado && podeEd ? ui.botao(T('Voltar ao padrão', 'Reset to default'), function () {
          C.db.papeis = C.lista('papeis').filter(function (x) { return x.id !== p.id; });
          RF.mudar('papeis', 'papeis', 'padrao', p.id, p.permissoes, null, T('Papel voltou ao padrão: ', 'Role reset to default: ') + p.id).then(RF.renderizar);
        }) : null])]));
    if (p.sistema) area.appendChild(el('div', { class: 'rf-faixa-aviso rf-faixa-info' }, [T('Papel fixo: tem todas as permissões e não pode ser alterado.', 'Fixed role: has every permission and cannot be changed.')]));
    var marcadas = todasPerm ? null : p.permissoes.slice();
    var acoes = Object.keys(RF.cat.ACOES);
    var colunas = [{ id: 'r', nome: T('Recurso', 'Resource'), valor: function (r) { return T(r.nome); } }].concat(acoes.map(function (a) {
      return { id: a, nome: T(RF.cat.ACOES[a]), classe: 'rf-centro', desenhar: function (r) {
        if (r.acoes.indexOf(a) === -1) return el('span', { class: 'rf-dica', 'aria-hidden': 'true', texto: '·' });
        var perm = r.id + ':' + a;
        var c = el('input', { type: 'checkbox', 'aria-label': T(r.nome) + ' — ' + T(RF.cat.ACOES[a]), disabled: !podeEd || RF.cat.BASICAS.indexOf(perm) !== -1 });
        c.checked = todasPerm || marcadas.indexOf(perm) !== -1;
        c.onchange = function () {
          if (c.checked) { if (marcadas.indexOf(perm) === -1) marcadas.push(perm); } else marcadas = marcadas.filter(function (x) { return x !== perm; });
          salvar.disabled = false;
        };
        return c;
      } };
    }));
    area.appendChild(ui.tabela(colunas, RF.cat.RECURSOS, { porPagina: 60, rotulo: T('Permissões', 'Permissions') }));
    var salvar = ui.botao(T('Salvar permissões', 'Save permissions'), function () {
      var antes = p.permissoes;
      var lista = C.lista('papeis'), existe = lista.filter(function (x) { return x.id === p.id; })[0];
      if (existe) existe.permissoes = marcadas; else lista.push({ id: p.id, permissoes: marcadas });
      RF.mudar('papeis', 'papeis', 'editar', p.id, antes, marcadas, T('Permissões alteradas: ', 'Permissions changed: ') + T(p.nome)).then(function () { ui.aviso(T('Salvo.', 'Saved.')); RF.renderizar(); });
    }, 'pri', { disabled: true });
    if (podeEd) area.appendChild(el('div', { class: 'rf-acoes rf-acoes-fim' }, [salvar]));
    var quem = C.equipe().filter(function (x) { return x.papel === p.id; });
    area.appendChild(ui.secao(T('Pessoas com este papel', 'People with this role'), [el('ul', {}, quem.map(function (x) { return el('li', { texto: x.nome + ' (' + x.apelido + ')' + (p.escopoPorApp ? ' · ' + (x.apps || []).map(H.nomeApp).join(', ') : '') }); }))]));
  }
  function clonarPapel(base) {
    var nome = ui.bilingue(T('Nome do papel', 'Role name'), { pt: T(base.nome, base.nome) + ' (cópia)', en: base.nome.en + ' (copy)' });
    var desc = ui.bilingue(T('Descrição', 'Description'), base.descricao, { linhas: 2 });
    var escopo = ui.marca(T('Só nos apps que a pessoa receber', 'Only in the apps assigned to the person'), !!base.escopoPorApp);
    ui.modal(T('Novo papel', 'New role'), el('div', { class: 'rf-form' }, [nome, desc, escopo]), { largo: true, rodape: [ui.botao(T('Criar', 'Create'), function () {
      var n = nome.valor(); if (!n.pt || !n.en) return ui.aviso(T('Nome em PT e EN.', 'Name in PT and EN.'), 'erro');
      var novo = { id: 'p-' + U.semAcento(n.pt).replace(/[^a-z0-9]+/g, '-').slice(0, 24) + '-' + U.uid().slice(0, 4), proprio: true, nome: n, descricao: desc.valor(),
        escopoPorApp: escopo.querySelector('input').checked, cor: '#38bdf8',
        permissoes: base.permissoes.indexOf('*') !== -1 ? RF.cat.RECURSOS.reduce(function (acc, r) { return acc.concat(r.acoes.map(function (a) { return r.id + ':' + a; })); }, []).filter(function (x) { return x.indexOf('papeis:') !== 0 && x.indexOf('equipe:') !== 0; }) : base.permissoes.slice() };
      C.lista('papeis').push(novo);
      RF.mudar('papeis', 'papeis', 'criar', novo.id, null, novo, T('Papel criado: ', 'Role created: ') + n.pt).then(function () { ui.fecharEIr('papeis', 'papel', novo.id); });
    }, 'pri')] });
  }

  /* ------------------------------------------------------------------
     EQUIPE
     ------------------------------------------------------------------ */
  RF.telas.equipe = function (area) {
    RF.pagina(area, 'equipe', T('Na fase 1, cada pessoa da equipe entra neste mesmo aparelho. Com o Firebase, de qualquer lugar.', 'In phase 1 each team member signs in on this same device. With Firebase, from anywhere.'),
      [ui.botaoSe('equipe:criar', null, '+ ' + T('Nova pessoa', 'New person'), function () { editarPessoa(null); }, 'pri')]);
    area.appendChild(ui.tabela([
      { id: 'n', nome: T('Nome', 'Name'), valor: function (p) { return p.nome; }, desenhar: function (p) {
        return el('span', { class: 'rf-pessoa' }, [el('span', { class: 'rf-avatar', 'aria-hidden': 'true', texto: p.nome.charAt(0) }), el('span', {}, [el('strong', { texto: p.nome }), el('br'), el('small', { class: 'rf-dica', texto: p.email })])]);
      } },
      { id: 'papel', nome: T('Papel', 'Role'), valor: function (p) { var x = RF.Papeis.achar(p.papel); return x ? T(x.nome) : p.papel; } },
      { id: 'apps', nome: 'Apps', valor: function (p) { return (p.apps || ['*']).indexOf('*') !== -1 ? T('todos', 'all') : p.apps.map(H.nomeApp).join(', '); } },
      { id: 'como', nome: T('Entra com', 'Signs in with'), valor: function (p) { return [T('senha', 'password'), p.cred.pin ? 'PIN' : null, p.cred.webauthn ? T('digital', 'fingerprint') : null].filter(Boolean).join(' · '); } },
      { id: 'ult', nome: T('Último acesso', 'Last access'), ordenar: function (p) { return p.ultimoAcesso || ''; }, desenhar: function (p) { return p.ultimoAcesso ? U.data(p.ultimoAcesso, true) : '—'; } },
      { id: 'at', nome: T('Situação', 'Status'), desenhar: function (p) { return ui.selo(p.ativo ? (p.trocarSenha ? T('1º acesso pendente', 'first access pending') : T('ativa', 'active')) : T('desativada', 'disabled'), p.ativo ? (p.trocarSenha ? 'atencao' : 'ok') : 'cinza'); } }
    ], C.equipe(), { aoClicar: RF.pode('equipe:editar') ? function (p) { editarPessoa(p); } : null }));
    area.appendChild(el('div', { class: 'rf-grade-2' }, [ui.cinza('equipe.remota'), ui.cinza('equipe.convite')]));
  };
  function donosAtivos() { return C.equipe().filter(function (p) { return p.ativo && p.papel === 'super-admin'; }); }
  function editarPessoa(p) {
    var novo = !p, x = p || { nome: '', apelido: '', email: '', papel: 'suporte-n1', apps: ['*'], ativo: true };
    var nome = ui.entrada(x.nome), apelido = ui.entrada(x.apelido), email = ui.entrada(x.email, { tipo: 'email', attrs: { disabled: !novo } });
    var papeis = RF.Papeis.todos().filter(function (r) { return r.id !== 'super-admin' || RF.ehDono(); });
    var papel = ui.escolha(papeis.map(function (r) { return [r.id, T(r.nome)]; }), x.papel);
    var apps = el('div', { class: 'rf-marcas' });
    C.lista('apps').forEach(function (a) { apps.appendChild(ui.marca(a.glifo + ' ' + T(a.nome), (x.apps || []).indexOf(a.id) !== -1, { value: a.id })); });
    var blocoApps = el('fieldset', { class: 'rf-bilingue' }, [el('legend', { texto: T('Apps sob responsabilidade (para papéis por app)', 'Apps in charge (for per-app roles)') }), apps]);
    function mostrarApps() { var r = RF.Papeis.achar(papel.value); blocoApps.hidden = !(r && r.escopoPorApp); }
    papel.onchange = mostrarApps; mostrarApps();
    var ativo = ui.marca(T('Conta ativa', 'Active account'), x.ativo);
    var ehUltimoDono = !novo && p.papel === 'super-admin' && donosAtivos().length <= 1;
    if (ehUltimoDono) { papel.disabled = true; ativo.querySelector('input').disabled = true; }
    var corpo = el('div', { class: 'rf-form' }, [el('div', { class: 'rf-grade-3' }, [ui.campo(T('Nome', 'Name'), nome), ui.campo(T('Apelido', 'Nickname'), apelido), ui.campo('E-mail', email)]),
      ui.campo(T('Papel', 'Role'), papel), blocoApps, novo ? null : ativo,
      ehUltimoDono ? el('p', { class: 'rf-dica', texto: T('Último dono: não pode trocar de papel nem ser desativado.', 'Last owner: cannot change role or be disabled.') }) : null]);
    var rod = [];
    if (!novo && RF.pode('equipe:editar')) {
      rod.push(ui.botao(T('Nova senha provisória', 'New temporary password'), function () {
        var temp = RF.cripto.gerarCodigo().slice(0, 9).replace('-', '');
        RF.cripto.embrulhar(C.dekBruta, temp).then(function (pac) {
          C.atualizarPessoa(p.id, function (y) { y.cred.senha = pac; y.trocarSenha = true; y.falhasPin = 0; });
          RF.Log.registrar('equipe', 'senha-provisoria', p.email, null, null, T('Senha provisória gerada para ', 'Temporary password generated for ') + p.nome);
          ui.fecharModal(); setTimeout(function () { mostrarProvisoria(p, temp); }, 60);
        });
      }));
      if (p.cred.pin || p.cred.webauthn) rod.push(ui.botao(T('Tirar PIN e digital', 'Remove PIN and fingerprint'), function () {
        C.atualizarPessoa(p.id, function (y) { delete y.cred.pin; delete y.cred.aparelho; delete y.cred.webauthn; });
        RF.Log.registrar('equipe', 'acesso-rapido-remover', p.email, null, null, T('PIN e digital removidos de ', 'PIN and fingerprint removed from ') + p.nome).then(function () { ui.fecharModal(); RF.renderizar(); });
      }));
    }
    rod.push(ui.botao(novo ? T('Criar conta', 'Create account') : T('Salvar', 'Save'), function () {
      var sel = Array.prototype.filter.call(apps.querySelectorAll('input'), function (i) { return i.checked; }).map(function (i) { return i.value; });
      var r = RF.Papeis.achar(papel.value);
      var appsFinal = r && r.escopoPorApp ? (sel.length ? sel : null) : ['*'];
      if (!appsFinal) return ui.aviso(T('Escolha pelo menos um app para este papel.', 'Pick at least one app for this role.'), 'erro');
      if (!nome.value.trim() || apelido.value.trim().length < 3) return ui.aviso(T('Nome e apelido (3+ letras).', 'Name and nickname (3+ letters).'), 'erro');
      if (novo) {
        var em = email.value.trim().toLowerCase();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return ui.aviso(T('E-mail inválido.', 'Invalid e-mail.'), 'erro');
        if (C.pessoa(em) || C.pessoa(apelido.value.trim())) return ui.aviso(T('Já existe alguém com esse e-mail ou apelido.', 'Someone already has that e-mail or nickname.'), 'erro');
        var temp = RF.cripto.gerarCodigo().slice(0, 9).replace('-', '');
        C.criarCredenciais(temp).then(function (cr) {
          var nova = { id: U.uid('p-'), nome: nome.value.trim(), apelido: apelido.value.trim(), email: em, papel: papel.value, apps: appsFinal, ativo: true,
            criadaEm: U.agora(), trocarSenha: true, cred: cr.cred, falhasPin: 0 };
          var lista = C.equipe(); lista.push(nova); C.gravarEquipe(lista);
          return RF.Log.registrar('equipe', 'criar', nova.email, null, { papel: nova.papel, apps: nova.apps }, T('Pessoa da equipe criada: ', 'Team member created: ') + nova.nome + ' · ' + nova.papel)
            .then(function () { ui.fecharModal(); setTimeout(function () { mostrarProvisoria(nova, temp); }, 60); });
        });
      } else {
        var antes = { papel: p.papel, apps: p.apps, ativo: p.ativo, nome: p.nome };
        if (papel.value === 'super-admin' && !RF.ehDono()) return ui.aviso(T('Só um dono dá o papel de dono.', 'Only an owner grants the owner role.'), 'erro');
        var dep = C.atualizarPessoa(p.id, function (y) { y.nome = nome.value.trim(); y.apelido = apelido.value.trim(); if (!ehUltimoDono) { y.papel = papel.value; y.ativo = ativo.querySelector('input').checked; } y.apps = appsFinal; });
        RF.Log.registrar('equipe', 'editar', p.email, antes, { papel: dep.papel, apps: dep.apps, ativo: dep.ativo, nome: dep.nome }, T('Pessoa da equipe alterada: ', 'Team member changed: ') + dep.nome)
          .then(function () { ui.fecharModal(); RF.renderizar(); });
      }
    }, 'pri'));
    ui.modal(novo ? T('Nova pessoa na equipe', 'New team member') : x.nome, corpo, { largo: true, rodape: rod });
  }
  function mostrarProvisoria(p, temp) {
    ui.modal(T('Senha provisória', 'Temporary password'), el('div', { class: 'rf-form' }, [
      el('p', { texto: T('Entregue pessoalmente a ', 'Hand it in person to ') + p.nome + T('. No primeiro acesso, neste aparelho, ela troca pela própria senha e recebe o código de recuperação dela.', '. At first access, on this device, they swap it for their own password and get their own recovery code.') }),
      el('div', { class: 'rf-codigo', texto: temp }),
      ui.botao(T('Copiar', 'Copy'), function () { U.copiar(temp).then(function () { ui.aviso(T('Copiado.', 'Copied.')); }); }),
      el('p', { class: 'rf-dica', texto: T('Esta senha não aparece de novo.', 'This password is not shown again.') })
    ]), { aoFechar: RF.renderizar });
  }

  /* ------------------------------------------------------------------
     PRIVACIDADE (LGPD)
     ------------------------------------------------------------------ */
  var STATUS_PEDIDO = { aberto: [{ pt: 'aberto', en: 'open' }, 'info'], 'em-andamento': [{ pt: 'em andamento', en: 'in progress' }, 'atencao'],
    respondido: [{ pt: 'respondido', en: 'answered' }, 'ok'], negado: [{ pt: 'negado (com motivo)', en: 'refused (with reason)' }, 'cinza'] };
  RF.telas.privacidade = function (area, rota) {
    var aba = rota.sub || 'pedidos';
    RF.pagina(area, 'privacidade', T('A LGPD dá ao titular o direito de pedir; a resposta completa sai em até 15 dias (art. 19, II). Isto organiza — não substitui um advogado.', 'The LGPD gives data subjects the right to ask; the full answer is due within 15 days (art. 19, II). This organises — it does not replace a lawyer.'),
      aba === 'pedidos' ? [ui.botaoSe('privacidade:criar', null, '+ ' + T('Registrar pedido', 'Log request'), function () { novoPedido({}); }, 'pri')] : null);
    area.appendChild(ui.abas([{ id: 'pedidos', nome: T('Pedidos dos titulares', 'Data-subject requests'), conta: D.Privacidade.abertos().length },
      { id: 'ropa', nome: T('Registro de tratamento', 'Record of processing') }, { id: 'consentimentos', nome: T('Consentimentos', 'Consents') },
      { id: 'incidentes', nome: T('Incidentes', 'Incidents'), conta: C.lista('incidentes').filter(function (i) { return i.status !== 'encerrado'; }).length },
      { id: 'encarregado', nome: T('Encarregado', 'DPO') }], aba, function (a) { RF.Rota.ir('privacidade', a); }));
    if (aba === 'pedidos') {
      area.appendChild(ui.tabela([
        { id: 'n', nome: T('Pedido', 'Request'), valor: function (p) { return p.numero; } },
        { id: 't', nome: T('Tipo', 'Type'), valor: function (p) { return T(RF.cat.TIPOS_PEDIDO_LGPD[p.tipo]); } },
        { id: 'tit', nome: T('Titular', 'Subject'), desenhar: function (p) { var u = p.usuario && H.usuario(p.usuario); return u ? el('a', { href: '#/usuarios/ficha/' + u.id, texto: u.nome }) : (p.contato ? (p.contato.nome || H.email(p.contato.email)) : '—'); } },
        { id: 'app', nome: 'App', valor: function (p) { return H.nomeApp(p.app); } },
        { id: 'r', nome: T('Recebido', 'Received'), ordenar: function (p) { return p.recebidoEm; }, desenhar: function (p) { return U.data(p.recebidoEm); } },
        { id: 'prazo', nome: T('Prazo', 'Deadline'), ordenar: function (p) { return p.prazo; }, desenhar: function (p) {
          if (p.status === 'respondido' || p.status === 'negado') return ui.selo(T('encerrado', 'closed'), 'cinza');
          var d = D.Privacidade.diasRestantes(p);
          return ui.selo(d < 0 ? T('atrasado ', 'late ') + (-d) + T(' dia(s)', ' day(s)') : d + T(' dia(s)', ' day(s)'), d < 0 ? 'erro' : d <= 3 ? 'atencao' : 'ok');
        } },
        { id: 's', nome: T('Situação', 'Status'), desenhar: function (p) { var x = STATUS_PEDIDO[p.status]; return ui.selo(T(x[0]), x[1]); } }
      ], C.lista('pedidos'), { aoClicar: abrirPedido, ordem: 'prazo' }));
      area.appendChild(ui.cinza('privacidade.execucao'));
    }
    if (aba === 'ropa') {
      area.appendChild(el('div', { class: 'rf-acoes' }, [RF.pode('privacidade:editar') ? ui.botao('+ ' + T('Nova operação', 'New operation'), function () { editarRopa(null); }, 'pri') : null,
        RF.pode('privacidade:exportar') ? ui.botao(T('Exportar CSV', 'Export CSV'), function () {
          U.baixar('registro-tratamento.csv', U.csv([['app', 'app'], [function (r) { return T(r.dados); }, T('dados', 'data')], [function (r) { return T(r.finalidade); }, T('finalidade', 'purpose')],
            [function (r) { return T(RF.cat.BASES_LEGAIS[r.base] || { pt: r.base, en: r.base }); }, T('base legal', 'legal basis')], [function (r) { return T(r.onde); }, T('onde', 'where')],
            [function (r) { return T(r.retencao); }, T('retenção', 'retention')], ['operadores', T('operadores', 'processors')], [function (r) { return r.validado ? 'sim' : 'não'; }, T('validado', 'reviewed')]], C.lista('ropa')), 'text/csv');
        }) : null]));
      area.appendChild(ui.tabela([
        { id: 'app', nome: 'App', valor: function (r) { return H.nomeApp(r.app); } },
        { id: 'd', nome: T('Dados', 'Data'), valor: function (r) { return T(r.dados); } },
        { id: 'f', nome: T('Finalidade', 'Purpose'), valor: function (r) { return T(r.finalidade); } },
        { id: 'b', nome: T('Base legal', 'Legal basis'), valor: function (r) { return T(RF.cat.BASES_LEGAIS[r.base] || { pt: r.base, en: r.base }); } },
        { id: 'v', nome: T('Validado', 'Reviewed'), desenhar: function (r) { return ui.selo(r.validado ? T('sim', 'yes') + (r.validadoEm ? ' · ' + U.data(r.validadoEm) : '') : T('falta advogado', 'lawyer pending'), r.validado ? 'ok' : 'atencao'); } }
      ], C.lista('ropa'), { aoClicar: RF.pode('privacidade:editar') ? editarRopa : null }));
      area.appendChild(ui.cinza('privacidade.ropa'));
    }
    if (aba === 'consentimentos') {
      area.appendChild(el('p', { class: 'rf-dica', texto: T('Catálogo dos consentimentos que os apps pedem. O registro de cada pessoa fica na ficha dela.', 'Catalog of consents the apps ask for. Each person\'s record is on their file.') }));
      area.appendChild(ui.tabela([
        { id: 'n', nome: T('Consentimento', 'Consent'), valor: function (c) { return T(c.nome); } },
        { id: 'f', nome: T('Para quê', 'What for'), valor: function (c) { return T(c.finalidade); } },
        { id: 'a', nome: 'App', valor: function (c) { return H.nomeApp(c.app); } },
        { id: 'q', nome: T('Pessoas que deram', 'People who gave it'), classe: 'rf-centro', valor: function (c) {
          return C.lista('usuarios').filter(function (u) { var r = (u.consentimentos || []).filter(function (x) { return x.tipo === c.id; }).slice(-1)[0]; return r && r.dado; }).length;
        } }
      ], C.lista('consentimentos'), { aoClicar: RF.pode('privacidade:editar') ? editarConsentimento : null }));
      if (RF.pode('privacidade:editar')) area.appendChild(ui.botao('+ ' + T('Novo consentimento', 'New consent'), function () { editarConsentimento(null); }, 'pri'));
    }
    if (aba === 'incidentes') {
      area.appendChild(el('div', { class: 'rf-faixa-aviso rf-faixa-info' }, [T('Incidente com risco aos titulares deve ser comunicado à ANPD e às pessoas afetadas. Prazo de referência: 3 dias úteis (Resolução CD/ANPD nº 15/2024) — confirmar com advogado.',
        'An incident posing risk to data subjects must be reported to the ANPD and to the people affected. Reference deadline: 3 business days (ANPD Resolution 15/2024) — confirm with a lawyer.')]));
      if (RF.pode('privacidade:criar')) area.appendChild(ui.botao('+ ' + T('Registrar incidente', 'Log incident'), function () { editarIncidente(null); }, 'pri'));
      area.appendChild(ui.tabela([
        { id: 't', nome: T('Incidente', 'Incident'), valor: function (i) { return i.titulo; } },
        { id: 'd', nome: T('Detectado', 'Detected'), desenhar: function (i) { return U.data(i.detectadoEm, true); } },
        { id: 'r', nome: T('Risco', 'Risk'), desenhar: function (i) { return ui.selo(i.risco, i.risco === 'alto' ? 'erro' : i.risco === 'medio' ? 'atencao' : 'ok'); } },
        { id: 'a', nome: 'ANPD', valor: function (i) { return i.comunicadoANPD ? U.data(i.comunicadoANPD) : '—'; } },
        { id: 's', nome: T('Situação', 'Status'), valor: function (i) { return i.status; } }
      ], C.lista('incidentes'), { aoClicar: RF.pode('privacidade:editar') ? editarIncidente : null, vazio: T('Nenhum incidente registrado.', 'No incidents logged.') }));
    }
    if (aba === 'encarregado') area.appendChild(ui.cinza('privacidade.encarregado'));
  };
  function novoPedido(pre) {
    var tipo = ui.escolha(Object.keys(RF.cat.TIPOS_PEDIDO_LGPD).map(function (k) { return [k, T(RF.cat.TIPOS_PEDIDO_LGPD[k])]; }), pre.tipo || 'acesso');
    var us = C.lista('usuarios').filter(function (u) { return u.status !== 'excluido'; });
    var tit = ui.escolha([['', T('— não cadastrado —', '— not registered —')]].concat(us.map(function (u) { return [u.id, u.nome + ' (@' + u.apelido + ')']; })), pre.usuario || '');
    var cNome = ui.entrada(''), cEmail = ui.entrada('', { tipo: 'email' });
    var app = ui.escolha(H.opcoesApps(true), '*'), rec = ui.entrada(U.agora().slice(0, 10), { tipo: 'date' }), det = ui.entrada('', { linhas: 3 });
    var contato = el('div', { class: 'rf-grade-2' }, [ui.campo(T('Nome', 'Name'), cNome), ui.campo('E-mail', cEmail)]);
    tit.onchange = function () { contato.hidden = !!tit.value; }; contato.hidden = !!tit.value;
    ui.modal(T('Registrar pedido do titular', 'Log data-subject request'), el('div', { class: 'rf-form' }, [el('div', { class: 'rf-grade-3' }, [ui.campo(T('Tipo', 'Type'), tipo), ui.campo('App', app), ui.campo(T('Recebido em', 'Received on'), rec)]),
      ui.campo(T('Titular', 'Subject'), tit), contato, ui.campo(T('O que foi pedido', 'What was asked'), det)]), { largo: true, rodape: [ui.botao(T('Registrar', 'Log'), function () {
        var p = D.Privacidade.criarPedido({ tipo: tipo.value, usuario: tit.value || null, contato: tit.value ? null : { nome: cNome.value.trim(), email: cEmail.value.trim() }, app: app.value,
          detalhe: det.value.trim(), recebidoEm: new Date(rec.value + 'T12:00:00').toISOString() });
        D.Automacoes.rodar('pedido-lgpd-criado', p, null);
        RF.mudar('pedidos', 'privacidade', 'criar', p.id, null, { numero: p.numero, tipo: p.tipo }, T('Pedido de privacidade registrado: ', 'Privacy request logged: ') + p.numero).then(function () { ui.fecharEIr('privacidade'); });
      }, 'pri')] });
  }
  RF.h.novoPedido = novoPedido;
  function abrirPedido(p) {
    var u = p.usuario && H.usuario(p.usuario);
    var st = ui.escolha(Object.keys(STATUS_PEDIDO).map(function (k) { return [k, T(STATUS_PEDIDO[k][0])]; }), p.status, { disabled: !RF.pode('privacidade:editar') });
    var resp = ui.entrada(p.resposta, { linhas: 4, attrs: { disabled: !RF.pode('privacidade:editar') } });
    var atalhos = el('div', { class: 'rf-acoes' }, [u ? ui.botao(T('Abrir ficha do titular (exportar / excluir)', 'Open subject file (export / delete)'), function () { ui.fecharEIr('usuarios', 'ficha', u.id); }) : null]);
    ui.modal(p.numero + ' · ' + T(RF.cat.TIPOS_PEDIDO_LGPD[p.tipo]), el('div', { class: 'rf-form' }, [
      el('p', {}, [T('Recebido em ', 'Received on ') + U.data(p.recebidoEm) + ' · ' + T('prazo: ', 'deadline: ') + U.data(p.prazo)]),
      el('p', { texto: p.detalhe || '—' }), atalhos,
      ui.campo(T('Situação', 'Status'), st), ui.campo(T('Resposta dada ao titular (obrigatória para encerrar)', 'Answer given to the subject (required to close)'), resp),
      el('ol', { class: 'rf-linha-tempo' }, (p.historico || []).slice().reverse().map(function (h) { return el('li', {}, [el('small', { class: 'rf-dica', texto: U.data(h.quando, true) + ' · ' + h.quem }), el('p', { texto: h.texto })]); }))
    ]), { largo: true, rodape: RF.pode('privacidade:editar') ? [ui.botao(T('Salvar', 'Save'), function () {
      if ((st.value === 'respondido' || st.value === 'negado') && !resp.value.trim()) return ui.aviso(T('Escreva a resposta dada.', 'Write the answer given.'), 'erro');
      var antes = p.status;
      p.status = st.value; p.resposta = resp.value.trim();
      p.historico = (p.historico || []).concat([{ quando: U.agora(), quem: S.pessoa.email, texto: antes + ' → ' + p.status }]);
      if (p.status === 'respondido' || p.status === 'negado') p.encerradoEm = U.agora();
      RF.mudar('pedidos', 'privacidade', 'editar', p.id, antes, p.status, p.numero + ': ' + antes + ' → ' + p.status).then(function () { ui.fecharModal(); RF.renderizar(); });
    }, 'pri')] : [] });
  }
  function editarRopa(r) {
    var novo = !r, x = r || { id: U.uid('ropa-'), app: '*', dados: {}, finalidade: {}, base: 'consentimento', onde: {}, retencao: {}, operadores: '', validado: false };
    var app = ui.escolha(H.opcoesApps(true), x.app), dados = ui.bilingue(T('Dados tratados', 'Data processed'), x.dados, { linhas: 2 }), fin = ui.bilingue(T('Finalidade', 'Purpose'), x.finalidade, { linhas: 2 });
    var base = ui.escolha(Object.keys(RF.cat.BASES_LEGAIS).map(function (k) { return [k, T(RF.cat.BASES_LEGAIS[k])]; }), x.base);
    var onde = ui.bilingue(T('Onde fica', 'Where it is kept'), x.onde), ret = ui.bilingue(T('Por quanto tempo', 'For how long'), x.retencao);
    var ops = ui.entrada(x.operadores), val = ui.marca(T('Validado por advogado', 'Reviewed by a lawyer'), x.validado);
    ui.modal(novo ? T('Nova operação de tratamento', 'New processing operation') : H.nomeApp(x.app), el('div', { class: 'rf-form' }, [ui.campo('App', app), dados, fin, ui.campo(T('Base legal', 'Legal basis'), base), onde, ret,
      ui.campo(T('Operadores (quem processa por nós)', 'Processors (who processes for us)'), ops), val]), { largo: true, rodape: [ui.botao(T('Salvar', 'Save'), function () {
        var y = Object.assign({}, x, { app: app.value, dados: dados.valor(), finalidade: fin.valor(), base: base.value, onde: onde.valor(), retencao: ret.valor(), operadores: ops.value.trim(),
          validado: val.querySelector('input').checked });
        if (y.validado && !x.validado) { y.validadoEm = U.agora(); y.validadoPor = S.pessoa.email; }
        if (novo) C.lista('ropa').push(y); else C.db.ropa = C.lista('ropa').map(function (z) { return z.id === y.id ? y : z; });
        RF.mudar('ropa', 'privacidade', 'ropa', y.id, r, y, T('Registro de tratamento salvo: ', 'Processing record saved: ') + y.app).then(function () { ui.fecharModal(); RF.renderizar(); });
      }, 'pri')] });
  }
  function editarConsentimento(c) {
    var novo = !c, x = c || { id: '', app: '*', nome: {}, finalidade: {}, obrigatorio: false };
    var id = ui.entrada(x.id, { attrs: { disabled: !novo } }), app = ui.escolha(H.opcoesApps(true), x.app), nome = ui.bilingue(T('Nome', 'Name'), x.nome), fin = ui.bilingue(T('Para quê', 'What for'), x.finalidade, { linhas: 2 });
    ui.modal(novo ? T('Novo consentimento', 'New consent') : T(x.nome), el('div', { class: 'rf-form' }, [el('div', { class: 'rf-grade-2' }, [ui.campo(T('Identificador', 'Identifier'), id), ui.campo('App', app)]), nome, fin]),
      { largo: true, rodape: [ui.botao(T('Salvar', 'Save'), function () {
        var y = Object.assign({}, x, { id: novo ? id.value.trim() : x.id, app: app.value, nome: nome.valor(), finalidade: fin.valor() });
        if (!y.id || !y.nome.pt || !y.nome.en) return ui.aviso(T('Identificador e nome PT/EN.', 'Identifier and name PT/EN.'), 'erro');
        if (novo) C.lista('consentimentos').push(y); else C.db.consentimentos = C.lista('consentimentos').map(function (z) { return z.id === y.id ? y : z; });
        RF.mudar('consentimentos', 'privacidade', 'consentimento', y.id, c, y, T('Consentimento salvo: ', 'Consent saved: ') + y.id).then(function () { ui.fecharModal(); RF.renderizar(); });
      }, 'pri')] });
  }
  function editarIncidente(i) {
    var novo = !i, x = i || { id: U.uid('inc-'), titulo: '', descricao: '', detectadoEm: U.agora().slice(0, 16), dados: '', titulares: '', risco: 'medio', comunicadoANPD: '', comunicadoTitulares: '', medidas: '', status: 'aberto' };
    var tit = ui.entrada(x.titulo), desc = ui.entrada(x.descricao, { linhas: 3 }), det = ui.entrada(String(x.detectadoEm).slice(0, 16), { tipo: 'datetime-local' });
    var dados = ui.entrada(x.dados), titn = ui.entrada(x.titulares), risco = ui.escolha([['baixo', T('baixo', 'low')], ['medio', T('médio', 'medium')], ['alto', T('alto', 'high')]], x.risco);
    var anpd = ui.entrada(x.comunicadoANPD, { tipo: 'date' }), ctit = ui.entrada(x.comunicadoTitulares, { tipo: 'date' }), med = ui.entrada(x.medidas, { linhas: 3 });
    var st = ui.escolha([['aberto', T('aberto', 'open')], ['contido', T('contido', 'contained')], ['encerrado', T('encerrado', 'closed')]], x.status);
    ui.modal(novo ? T('Registrar incidente', 'Log incident') : x.titulo, el('div', { class: 'rf-form' }, [ui.campo(T('O que houve (curto)', 'What happened (short)'), tit), ui.campo(T('Descrição', 'Description'), desc),
      el('div', { class: 'rf-grade-3' }, [ui.campo(T('Detectado em', 'Detected on'), det), ui.campo(T('Risco aos titulares', 'Risk to subjects'), risco), ui.campo(T('Situação', 'Status'), st)]),
      el('div', { class: 'rf-grade-2' }, [ui.campo(T('Dados afetados', 'Data affected'), dados), ui.campo(T('Quantas pessoas', 'How many people'), titn)]),
      el('div', { class: 'rf-grade-2' }, [ui.campo(T('Comunicado à ANPD em', 'Reported to ANPD on'), anpd), ui.campo(T('Comunicado aos titulares em', 'Reported to subjects on'), ctit)]),
      ui.campo(T('Medidas tomadas', 'Measures taken'), med)]), { largo: true, rodape: [ui.botao(T('Salvar', 'Save'), function () {
        var y = Object.assign({}, x, { titulo: tit.value.trim(), descricao: desc.value.trim(), detectadoEm: det.value, dados: dados.value.trim(), titulares: titn.value.trim(), risco: risco.value,
          comunicadoANPD: anpd.value, comunicadoTitulares: ctit.value, medidas: med.value.trim(), status: st.value });
        if (!y.titulo) return ui.aviso(T('Descreva o incidente.', 'Describe the incident.'), 'erro');
        if (novo) C.lista('incidentes').push(y); else C.db.incidentes = C.lista('incidentes').map(function (z) { return z.id === y.id ? y : z; });
        RF.mudar('incidentes', 'privacidade', 'incidente', y.id, i, y, T('Incidente salvo: ', 'Incident saved: ') + y.titulo).then(function () { ui.fecharModal(); RF.renderizar(); });
      }, 'pri')] });
  }

  /* ------------------------------------------------------------------
     AUDITORIA
     ------------------------------------------------------------------ */
  var filtroLog = { texto: '', modulo: '', quem: '', de: '', ate: '' };
  RF.telas.auditoria = function (area) {
    var situacao = el('span', { class: 'rf-dica', texto: T('conferindo…', 'checking…') });
    RF.pagina(area, 'auditoria', T('Cada registro carimba o anterior: se alguém apagar ou mudar um, a corrente acusa.', 'Each entry stamps the previous one: if anyone deletes or changes one, the chain shows it.'), [
      ui.botaoSe('auditoria:exportar', null, T('Exportar CSV', 'Export CSV'), function () { exportarLog('csv'); }),
      ui.botaoSe('auditoria:exportar', null, T('Exportar JSON', 'Export JSON'), function () { exportarLog('json'); })
    ]);
    area.appendChild(el('p', {}, [T('Integridade: ', 'Integrity: '), situacao]));
    RF.Log.verificar().then(function (r) {
      U.limpar(situacao);
      situacao.appendChild(r.ok ? ui.selo('✓ ' + T('corrente íntegra · ', 'chain intact · ') + r.total + T(' registros', ' entries'), 'ok')
        : ui.selo('⛔ ' + T('corrente quebrada no registro ', 'chain broken at entry ') + (r.posicao + 1), 'erro'));
    });
    var modulos = {}; C.lista('log').forEach(function (e) { modulos[e.modulo] = 1; });
    var texto = ui.entrada(filtroLog.texto, { tipo: 'search', attrs: { 'aria-label': T('Procurar', 'Search') } });
    var mod = ui.escolha([['', T('Todos', 'All')]].concat(Object.keys(modulos).sort().map(function (m) { return [m, m]; })), filtroLog.modulo);
    var quem = ui.escolha([['', T('Todos', 'All')]].concat(C.equipe().map(function (p) { return [p.email, p.nome]; })), filtroLog.quem);
    var de = ui.entrada(filtroLog.de, { tipo: 'date' }), ate = ui.entrada(filtroLog.ate, { tipo: 'date' });
    var bloco = el('div');
    function filtrar() {
      filtroLog = { texto: texto.value, modulo: mod.value, quem: quem.value, de: de.value, ate: ate.value };
      var q = U.semAcento(filtroLog.texto);
      var l = C.lista('log').filter(function (e) {
        if (filtroLog.modulo && e.modulo !== filtroLog.modulo) return false;
        if (filtroLog.quem && e.quem !== filtroLog.quem) return false;
        if (filtroLog.de && e.quando.slice(0, 10) < filtroLog.de) return false;
        if (filtroLog.ate && e.quando.slice(0, 10) > filtroLog.ate) return false;
        if (q && U.semAcento(e.resumo + ' ' + e.acao + ' ' + e.alvo).indexOf(q) === -1) return false;
        return true;
      }).slice().reverse();
      U.limpar(bloco);
      bloco.appendChild(ui.tabela([
        { id: 'q', nome: T('Quando', 'When'), ordenar: function (e) { return e.quando; }, desenhar: function (e) { return U.data(e.quando, true); } },
        { id: 'p', nome: T('Quem', 'Who'), valor: function (e) { return e.quem + (e.simulando ? ' 🎭' : ''); } },
        { id: 'm', nome: T('Módulo', 'Module'), valor: function (e) { return e.modulo; } },
        { id: 'a', nome: T('Ação', 'Action'), valor: function (e) { return e.acao; } },
        { id: 'r', nome: T('Resumo', 'Summary'), valor: function (e) { return e.resumo; } }
      ], l, { aoClicar: detalheLog, porPagina: 50 }));
    }
    texto.addEventListener('input', filtrar);
    [mod, quem, de, ate].forEach(function (s) { s.addEventListener('change', filtrar); });
    area.appendChild(el('div', { class: 'rf-filtros' }, [ui.campo(T('Procurar', 'Search'), texto), ui.campo(T('Módulo', 'Module'), mod), ui.campo(T('Quem', 'Who'), quem), ui.campo(T('De', 'From'), de), ui.campo(T('Até', 'To'), ate)]));
    area.appendChild(bloco); filtrar();
  };
  function detalheLog(e) {
    var pii = RF.pode('usuarios.pii:ver');
    function mostra(v) { var s = JSON.stringify(v, null, 2) || 'null'; return pii ? s : s.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, function (m) { return U.mascararEmail(m); }); }
    ui.modal(T('Registro do log', 'Log entry'), el('div', {}, [
      el('dl', { class: 'rf-dl' }, [el('dt', { texto: T('Quando', 'When') }), el('dd', { texto: U.data(e.quando, true) }), el('dt', { texto: T('Quem', 'Who') }), el('dd', { texto: e.quem + ' · ' + e.papel + (e.simulando ? ' · ' + T('em modo de teste', 'in test mode') : '') }),
        el('dt', { texto: T('Ação', 'Action') }), el('dd', { texto: e.modulo + ' · ' + e.acao }), el('dt', { texto: T('Alvo', 'Target') }), el('dd', { texto: e.alvo || '—' }),
        el('dt', { texto: T('Resumo', 'Summary') }), el('dd', { texto: e.resumo })]),
      el('div', { class: 'rf-grade-2' }, [el('div', {}, [el('h3', { texto: T('Antes', 'Before') }), el('pre', { class: 'rf-codigo-bloco', texto: mostra(e.antes) })]),
        el('div', {}, [el('h3', { texto: T('Depois', 'After') }), el('pre', { class: 'rf-codigo-bloco', texto: mostra(e.depois) })])]),
      el('p', { class: 'rf-dica rf-mono', texto: 'hash ' + e.hash.slice(0, 16) + '… ← ' + String(e.anterior).slice(0, 16) + '…' })
    ]), { largo: true });
  }
  function exportarLog(formato) {
    var l = C.lista('log');
    if (formato === 'json') U.baixar('log-rootify-' + U.agora().slice(0, 10) + '.json', JSON.stringify({ base: C.obj('config').logBase || 'inicio', registros: l }, null, 2), 'application/json');
    else U.baixar('log-rootify-' + U.agora().slice(0, 10) + '.csv', U.csv([['quando', 'quando'], ['quem', 'quem'], ['papel', 'papel'], ['modulo', 'modulo'], ['acao', 'acao'], ['alvo', 'alvo'], ['resumo', 'resumo'], ['hash', 'hash'], ['anterior', 'anterior']], l), 'text/csv');
    RF.Log.registrar('auditoria', 'exportar', '', null, { formato: formato, total: l.length }, T('Log exportado em ', 'Log exported as ') + formato);
  }

  /* ------------------------------------------------------------------
     INTEGRAÇÕES E CHAVES
     ------------------------------------------------------------------ */
  RF.telas.integracoes = function (area) {
    var podeEd = RF.pode('integracoes:editar');
    var cfg = C.obj('config'); cfg.github = cfg.github || {};
    RF.pagina(area, 'integracoes', T('Chaves e tokens ficam cifrados dentro do cofre deste aparelho. Nunca vão para o código nem para os arquivos publicados.', 'Keys and tokens stay encrypted inside this device\'s vault. They never go into the code or the published files.'));
    var dono = ui.entrada(cfg.github.dono, { attrs: { disabled: !podeEd } }), repo = ui.entrada(cfg.github.repo, { attrs: { disabled: !podeEd } }), ramo = ui.entrada(cfg.github.ramo || 'main', { attrs: { disabled: !podeEd } });
    var token = ui.entrada('', { tipo: 'password', attrs: { disabled: !podeEd, autocomplete: 'off', placeholder: cfg.github.token ? '•••••••• ' + T('(guardado; cole outro para trocar)', '(stored; paste another to replace)') : 'github_pat_…' } });
    var teste = el('p', { class: 'rf-dica', 'aria-live': 'polite' });
    area.appendChild(ui.secao('GitHub — ' + T('publicação dos arquivos master', 'master file publishing'), [
      el('details', { class: 'rf-det' }, [el('summary', { texto: T('Como criar o token (passo a passo)', 'How to create the token (step by step)') }), el('ol', {}, [
        el('li', { texto: T('Crie no GitHub o repositório público "solverone-dados" (vazio mesmo).', 'Create the public repository "solverone-dados" on GitHub (empty is fine).') }),
        el('li', { texto: T('Foto do perfil → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token.', 'Profile photo → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token.') }),
        el('li', { texto: T('Nome: RootifyONE. Validade: 90 dias. Repository access: Only select repositories → solverone-dados.', 'Name: RootifyONE. Expiration: 90 days. Repository access: Only select repositories → solverone-dados.') }),
        el('li', { texto: T('Permissions → Repository permissions → Contents: Read and write. Nada mais.', 'Permissions → Repository permissions → Contents: Read and write. Nothing else.') }),
        el('li', { texto: T('Generate token, copie e cole aqui. Ele só serve para esse repositório e vence sozinho.', 'Generate token, copy it and paste here. It only works for that repository and expires on its own.') }),
        el('li', { texto: T('Em Settings → Pages do repositório, ative o GitHub Pages (Deploy from a branch → main).', 'In the repository\'s Settings → Pages, turn on GitHub Pages (Deploy from a branch → main).') })
      ])]),
      el('div', { class: 'rf-grade-3' }, [ui.campo(T('Dono (usuário do GitHub)', 'Owner (GitHub user)'), dono), ui.campo(T('Repositório', 'Repository'), repo), ui.campo(T('Ramo', 'Branch'), ramo)]),
      ui.campo('Token (fine-grained)', token),
      podeEd ? el('div', { class: 'rf-acoes' }, [ui.botao(T('Salvar', 'Save'), function () {
        var antes = { dono: cfg.github.dono, repo: cfg.github.repo, ramo: cfg.github.ramo, token: cfg.github.token ? '(guardado)' : '' };
        cfg.github.dono = dono.value.trim(); cfg.github.repo = repo.value.trim(); cfg.github.ramo = ramo.value.trim() || 'main';
        /* tira espaços e quebras de linha que vêm junto ao copiar, e confere o formato */
        var novo = token.value.replace(/\s+/g, '');
        if (novo) {
          if (!/^(github_pat_|ghp_)[A-Za-z0-9_]{30,}$/.test(novo)) {
            return ui.aviso(T('Isso não parece um token do GitHub: ele começa com github_pat_ e é bem comprido. Copie de novo pelo ícone de copiar ao lado do token.', 'This does not look like a GitHub token: it starts with github_pat_ and is quite long. Copy it again with the copy icon next to the token.'), 'erro');
          }
          cfg.github.token = novo;
        }
        RF.mudar('config', 'integracoes', 'github', cfg.github.repo, antes, { dono: cfg.github.dono, repo: cfg.github.repo, ramo: cfg.github.ramo, token: cfg.github.token ? '(guardado)' : '' }, T('Configuração do GitHub salva (token cifrado)', 'GitHub settings saved (token encrypted)'))
          .then(function () { ui.aviso(T('Salvo.', 'Saved.')); RF.renderizar(); });
      }, 'pri'), ui.botao(T('Testar conexão', 'Test connection'), function () {
        if (!cfg.github.token) return ui.aviso(T('Salve um token primeiro.', 'Save a token first.'), 'erro');
        teste.textContent = T('Testando…', 'Testing…');
        fetch('https://api.github.com/repos/' + encodeURIComponent(cfg.github.dono) + '/' + encodeURIComponent(cfg.github.repo), { headers: { Authorization: 'Bearer ' + cfg.github.token, Accept: 'application/vnd.github+json' } })
          .then(function (r) { return r.json().then(function (j) { return { r: r, j: j }; }); })
          .then(function (x) {
            if (!x.r.ok) { teste.textContent = '⛔ ' + (x.r.status === 404 ? T('Repositório não encontrado ou token sem acesso a ele. Confira o nome do repositório e, no token, "Only select repositories" com solverone-dados.', 'Repository not found or token without access. Check the repository name and, in the token, "Only select repositories" with solverone-dados.')
              : x.r.status === 401 ? T('O GitHub não reconheceu o token (401). Ele foi copiado incompleto, foi apagado ou venceu. Gere um token novo, toque em Apagar token, cole o novo e Salvar.', 'GitHub did not recognise the token (401). It was copied incomplete, deleted or expired. Generate a new token, tap Delete token, paste the new one and Save.')
              : 'GitHub ' + x.r.status + ': ' + (x.j.message || '')); return; }
            var p = x.j.permissions || {};
            teste.textContent = (p.push ? '✓ ' + T('Conectado com permissão de escrita em ', 'Connected with write permission on ') : '⚠ ' + T('Conectado, mas SEM permissão de escrita em ', 'Connected, but WITHOUT write permission on ')) + x.j.full_name;
          }).catch(function () { teste.textContent = '⛔ ' + T('Sem conexão com o GitHub (internet ou página aberta fora do https).', 'No connection to GitHub (internet, or page opened outside https).'); });
      }), cfg.github.token ? ui.botao(T('Apagar token', 'Delete token'), function () {
        cfg.github.token = '';
        RF.mudar('config', 'integracoes', 'github-token-apagar', '', '(guardado)', '', T('Token do GitHub apagado', 'GitHub token deleted')).then(RF.renderizar);
      }, 'perigo') : null]) : null, teste
    ]));

    var fs = ui.entrada(cfg.formspree || '', { tipo: 'url', attrs: { disabled: !podeEd, placeholder: 'https://formspree.io/f/…' } });
    area.appendChild(ui.secao('Formspree — ' + T('formulário de suporte dos apps', 'apps\' support form'), [
      el('p', { class: 'rf-dica', texto: T('Endereço que os apps usam para "Fale com a gente". As mensagens chegam no seu e-mail; importe o CSV em Suporte.', 'Address the apps use for "Contact us". Messages reach your e-mail; import the CSV in Support.') }),
      ui.campo(T('Endereço do formulário', 'Form address'), fs),
      podeEd ? ui.botao(T('Salvar', 'Save'), function () {
        var antes = cfg.formspree; cfg.formspree = fs.value.trim();
        RF.mudar('config', 'integracoes', 'formspree', '', antes, cfg.formspree, T('Formspree salvo', 'Formspree saved')).then(function () { ui.aviso(T('Salvo.', 'Saved.')); });
      }, 'pri') : null
    ]));

    var pol = ui.escolha([['compartilhada', T('Uma chave vale para todos os apps (padrão)', 'One key works for every app (default)')], ['por-app', T('Uma chave por app', 'One key per app')]], cfg.iaPolitica, { disabled: !podeEd });
    pol.onchange = function () { var a = cfg.iaPolitica; cfg.iaPolitica = pol.value; RF.mudar('config', 'integracoes', 'ia-politica', '', a, pol.value, T('Política de chaves de IA: ', 'AI key policy: ') + pol.value); };
    area.appendChild(ui.secao(T('Chaves de IA', 'AI keys'), [
      el('p', { class: 'rf-dica', texto: T('A chave é da pessoa e fica cifrada no aparelho dela. O RootifyONE define só a política; nunca lê chave de cliente. Chave paga pela plataforma só no proxy do servidor (futuro).',
        'The key belongs to the person and stays encrypted on their device. RootifyONE sets only the policy; it never reads a customer key. A platform-paid key only in the server proxy (future).') }),
      ui.campo(T('Política', 'Policy'), pol),
      raiz.DGO && raiz.DGO.ia ? ui.botao(T('Abrir o cofre de chaves deste aparelho (para a IA do RootifyONE)', 'Open this device\'s key vault (for RootifyONE\'s AI)'), function () { raiz.DGO.ia.chaves(); }) : null
    ]));

    area.appendChild(el('div', { class: 'rf-grade-2' }, [
      ui.cinza('integracoes.firebase', el('div', { class: 'rf-grade-2' }, [ui.campo('projectId', ui.entrada('', { attrs: { disabled: true } })), ui.campo('apiKey (web)', ui.entrada('', { attrs: { disabled: true } }))])),
      ui.cinza('integracoes.email'), ui.cinza('integracoes.pagamento'), ui.cinza('integracoes.mensageria'), ui.cinza('integracoes.analytics')
    ]));
  };

  /* ------------------------------------------------------------------
     AUTOMAÇÕES
     ------------------------------------------------------------------ */
  RF.telas.automacoes = function (area) {
    RF.pagina(area, 'automacoes', T('Regras "quando acontecer X, faça Y" que rodam aqui dentro, na hora do evento.', 'Rules "when X happens, do Y" that run in here, at the moment of the event.'),
      [ui.botaoSe('automacoes:criar', null, '+ ' + T('Nova regra', 'New rule'), function () { editarRegra(null); }, 'pri')]);
    area.appendChild(ui.tabela([
      { id: 'n', nome: T('Regra', 'Rule'), valor: function (r) { return T(r.nome); } },
      { id: 'g', nome: T('Quando', 'When'), valor: function (r) { return T(RF.cat.GATILHOS[r.gatilho]); } },
      { id: 'c', nome: T('Se', 'If'), valor: function (r) { return (r.condicoes || []).filter(function (c) { return c.valor; }).map(function (c) { return T(RF.cat.CAMPOS_CONDICAO[c.campo]) + ' = ' + c.valor; }).join(' e ') || T('sempre', 'always'); } },
      { id: 'a', nome: T('Então', 'Then'), valor: function (r) { return (r.acoes || []).map(function (a) { return T(RF.cat.ACOES_AUTOMACAO[a.tipo]) + (a.valor ? ' ' + (a.tipo === 'atribuir' ? H.nomeEquipe(a.valor) : a.valor) : ''); }).join(' · '); } },
      { id: 'x', nome: T('Rodou', 'Ran'), classe: 'rf-centro', valor: function (r) { return (r.execucoes || 0) + (r.ultimaEm ? ' · ' + U.data(r.ultimaEm) : ''); } },
      { id: 'at', nome: T('Ligada', 'On'), desenhar: function (r) {
        var c = el('input', { type: 'checkbox', 'aria-label': T('Ligada', 'On'), disabled: !RF.pode('automacoes:editar') }); c.checked = r.ativo;
        c.onchange = function () { r.ativo = c.checked; RF.mudar('automacoes', 'automacoes', r.ativo ? 'ligar' : 'desligar', r.id, !r.ativo, r.ativo, T('Regra ', 'Rule ') + (r.ativo ? T('ligada: ', 'on: ') : T('desligada: ', 'off: ')) + T(r.nome)); };
        return c;
      } }
    ], C.lista('automacoes'), { aoClicar: RF.pode('automacoes:editar') ? editarRegra : null, vazio: T('Nenhuma regra ainda.', 'No rules yet.') }));
    area.appendChild(el('div', { class: 'rf-grade-2' }, [ui.cinza('automacoes.agendadas'), ui.cinza('automacoes.email')]));
  };
  function editarRegra(r) {
    var novo = !r, x = r ? U.clonar(r) : { id: U.uid('a-'), nome: {}, ativo: true, gatilho: 'chamado-criado', condicoes: [{ campo: 'categoria', valor: '' }], acoes: [{ tipo: 'etiqueta', valor: '' }], execucoes: 0 };
    var nome = ui.bilingue(T('Nome da regra', 'Rule name'), x.nome);
    var gat = ui.escolha(Object.keys(RF.cat.GATILHOS).map(function (k) { return [k, T(RF.cat.GATILHOS[k])]; }), x.gatilho);
    var condBox = el('div', { class: 'rf-form' }), acaoBox = el('div', { class: 'rf-form' });
    function valorCondicao(c) {
      if (c.campo === 'app') return ui.escolha([['', '—']].concat(H.opcoesApps(true)), c.valor);
      if (c.campo === 'categoria') return ui.escolha([['', '—']].concat(RF.cat.CATEGORIAS_CHAMADO.map(function (k) { return [k.id, T(k.nome)]; })), c.valor);
      if (c.campo === 'prioridade') return ui.escolha([['', '—']].concat(Object.keys(RF.cat.PRIORIDADES).map(function (k) { return [k, T(RF.cat.PRIORIDADES[k])]; })), c.valor);
      if (c.campo === 'plano') return ui.escolha([['', '—']].concat(H.opcoesPlanos()), c.valor);
      return ui.entrada(c.valor);
    }
    function valorAcao(a) {
      if (a.tipo === 'prioridade') return ui.escolha(Object.keys(RF.cat.PRIORIDADES).map(function (k) { return [k, T(RF.cat.PRIORIDADES[k])]; }), a.valor);
      if (a.tipo === 'atribuir') return ui.escolha(H.opcoesEquipe(), a.valor);
      if (a.tipo === 'email-futuro') return ui.entrada('', { attrs: { disabled: true, placeholder: T('futuro', 'future') } });
      return ui.entrada(a.valor, { attrs: { placeholder: a.tipo === 'avisar' ? T('texto do aviso', 'alert text') : '' } });
    }
    function desenhar() {
      U.limpar(condBox); U.limpar(acaoBox);
      x.condicoes.forEach(function (c, i) {
        var campo = ui.escolha(Object.keys(RF.cat.CAMPOS_CONDICAO).map(function (k) { return [k, T(RF.cat.CAMPOS_CONDICAO[k])]; }), c.campo);
        var val = valorCondicao(c);
        campo.onchange = function () { c.campo = campo.value; c.valor = ''; desenhar(); };
        val.onchange = val.oninput = function () { c.valor = val.value; };
        condBox.appendChild(el('div', { class: 'rf-linha' }, [campo, val, ui.botao('✕', function () { x.condicoes.splice(i, 1); desenhar(); }, 'p', { 'aria-label': T('Tirar condição', 'Remove condition') })]));
      });
      condBox.appendChild(ui.botao('+ ' + T('condição', 'condition'), function () { x.condicoes.push({ campo: 'app', valor: '' }); desenhar(); }, 'p'));
      x.acoes.forEach(function (a, i) {
        var tipo = ui.escolha(Object.keys(RF.cat.ACOES_AUTOMACAO).map(function (k) { return [k, T(RF.cat.ACOES_AUTOMACAO[k])]; }), a.tipo);
        var val = valorAcao(a);
        tipo.onchange = function () { a.tipo = tipo.value; a.valor = ''; desenhar(); };
        val.onchange = val.oninput = function () { a.valor = val.value; };
        if (a.tipo === 'prioridade' && !a.valor) a.valor = val.value;
        if (a.tipo === 'atribuir' && !a.valor) a.valor = val.value;
        acaoBox.appendChild(el('div', { class: 'rf-linha' }, [tipo, val, ui.botao('✕', function () { x.acoes.splice(i, 1); desenhar(); }, 'p', { 'aria-label': T('Tirar ação', 'Remove action') })]));
      });
      acaoBox.appendChild(ui.botao('+ ' + T('ação', 'action'), function () { x.acoes.push({ tipo: 'etiqueta', valor: '' }); desenhar(); }, 'p'));
    }
    desenhar();
    var rod = [];
    if (!novo && RF.pode('automacoes:excluir')) rod.push(ui.botao(T('Excluir', 'Delete'), function () {
      C.db.automacoes = C.lista('automacoes').filter(function (y) { return y.id !== x.id; });
      RF.mudar('automacoes', 'automacoes', 'excluir', x.id, r, null, T('Regra excluída', 'Rule deleted')).then(function () { ui.fecharModal(); RF.renderizar(); });
    }, 'perigo'));
    rod.push(ui.botao(T('Salvar', 'Save'), function () {
      x.nome = nome.valor(); x.gatilho = gat.value;
      if (!x.nome.pt || !x.nome.en) return ui.aviso(T('Nome em PT e EN.', 'Name in PT and EN.'), 'erro');
      if (x.acoes.some(function (a) { return a.tipo === 'email-futuro'; })) return ui.aviso(T('"Enviar e-mail" ainda não existe; tire essa ação.', '"Send e-mail" does not exist yet; remove that action.'), 'erro');
      if (!x.acoes.length) return ui.aviso(T('Pelo menos uma ação.', 'At least one action.'), 'erro');
      if (novo) C.lista('automacoes').push(x); else C.db.automacoes = C.lista('automacoes').map(function (y) { return y.id === x.id ? x : y; });
      RF.mudar('automacoes', 'automacoes', novo ? 'criar' : 'editar', x.id, r, x, T('Regra salva: ', 'Rule saved: ') + x.nome.pt).then(function () { ui.fecharModal(); RF.renderizar(); });
    }, 'pri'));
    ui.modal(novo ? T('Nova regra', 'New rule') : T(x.nome), el('div', { class: 'rf-form' }, [nome, ui.campo(T('Quando', 'When'), gat),
      el('fieldset', { class: 'rf-bilingue' }, [el('legend', { texto: T('Se (todas precisam valer)', 'If (all must match)') }), condBox]),
      el('fieldset', { class: 'rf-bilingue' }, [el('legend', { texto: T('Então', 'Then') }), acaoBox])]), { largo: true, rodape: rod });
  }

  /* ------------------------------------------------------------------
     FINANCEIRO
     ------------------------------------------------------------------ */
  RF.telas.financeiro = function (area, rota) {
    var aba = rota.sub || 'custos';
    RF.pagina(area, 'financeiro', T('Custos já dá para controlar. Receita, assinaturas e notas esperam o meio de pagamento.', 'Costs can already be tracked. Revenue, subscriptions and invoices wait for the payment provider.'),
      aba === 'custos' ? [ui.botaoSe('financeiro:criar', null, '+ ' + T('Novo custo', 'New cost'), function () { editarCusto(null); }, 'pri')] : null);
    area.appendChild(ui.abas([{ id: 'custos', nome: T('Custos', 'Costs') }, { id: 'receita', nome: T('Receita', 'Revenue') }, { id: 'meios', nome: T('Meios de pagamento', 'Payment methods') }, { id: 'notas', nome: T('Notas fiscais', 'Invoices') }],
      aba, function (a) { RF.Rota.ir('financeiro', a); }));
    if (aba === 'receita') { area.appendChild(ui.cinza('financeiro.receita', el('div', { class: 'rf-cartoes' }, [ui.cartao('MRR', '—'), ui.cartao(T('Assinantes', 'Subscribers'), '—'), ui.cartao(T('Cancelamentos', 'Churn'), '—')]))); return; }
    if (aba === 'meios') { area.appendChild(ui.cinza('financeiro.meios')); area.appendChild(ui.cinza('integracoes.pagamento')); return; }
    if (aba === 'notas') { area.appendChild(ui.cinza('financeiro.notas')); return; }
    var lista = C.lista('custos');
    var porMoeda = {};
    lista.forEach(function (c) {
      var m = c.moeda || 'BRL'; porMoeda[m] = porMoeda[m] || { mensal: 0, unico: 0 };
      if (c.recorrencia === 'mensal') porMoeda[m].mensal += +c.valor || 0;
      else if (c.recorrencia === 'anual') porMoeda[m].mensal += (+c.valor || 0) / 12;
      else porMoeda[m].unico += +c.valor || 0;
    });
    area.appendChild(el('div', { class: 'rf-cartoes' }, Object.keys(porMoeda).map(function (m) {
      return ui.cartao(T('Custo mensal estimado (', 'Estimated monthly cost (') + m + ')', porMoeda[m].mensal.toFixed(2), T('+ gastos únicos: ', '+ one-off: ') + porMoeda[m].unico.toFixed(2));
    })));
    area.appendChild(ui.tabela([
      { id: 'd', nome: T('Descrição', 'Description'), valor: function (c) { return c.descricao; } },
      { id: 'cat', nome: T('Categoria', 'Category'), valor: function (c) { return c.categoria; } },
      { id: 'v', nome: T('Valor', 'Amount'), ordenar: function (c) { return +c.valor; }, valor: function (c) { return (c.moeda || 'BRL') + ' ' + (+c.valor).toFixed(2); } },
      { id: 'r', nome: T('Recorrência', 'Recurrence'), valor: function (c) { return { mensal: T('mensal', 'monthly'), anual: T('anual', 'yearly'), unico: T('único', 'one-off') }[c.recorrencia]; } },
      { id: 'app', nome: 'App', valor: function (c) { return H.nomeApp(c.app); } },
      { id: 'desde', nome: T('Desde', 'Since'), desenhar: function (c) { return U.data(c.desde); } }
    ], lista, { aoClicar: RF.pode('financeiro:editar') ? editarCusto : null, vazio: T('Nenhum custo registrado.', 'No costs recorded.') }));
    if (RF.pode('financeiro:exportar')) area.appendChild(ui.botao(T('Exportar CSV', 'Export CSV'), function () {
      U.baixar('custos.csv', U.csv([['descricao', 'descricao'], ['categoria', 'categoria'], ['valor', 'valor'], ['moeda', 'moeda'], ['recorrencia', 'recorrencia'], ['app', 'app'], ['desde', 'desde']], lista), 'text/csv');
    }));
  };
  function editarCusto(c) {
    var novo = !c, x = c || { id: U.uid('c-'), descricao: '', categoria: 'infraestrutura', valor: '', moeda: 'BRL', recorrencia: 'mensal', desde: U.agora().slice(0, 10), app: '*' };
    var desc = ui.entrada(x.descricao), cat = ui.escolha([['infraestrutura', T('Infraestrutura', 'Infrastructure')], ['ia', 'IA / AI'], ['servicos', T('Serviços', 'Services')], ['juridico', T('Jurídico', 'Legal')], ['marketing', 'Marketing'], ['outros', T('Outros', 'Other')]], x.categoria);
    var val = ui.entrada(x.valor, { tipo: 'number', attrs: { step: '0.01', min: 0 } }), moeda = ui.escolha([['BRL', 'BRL'], ['USD', 'USD'], ['EUR', 'EUR']], x.moeda);
    var rec = ui.escolha([['mensal', T('mensal', 'monthly')], ['anual', T('anual', 'yearly')], ['unico', T('único', 'one-off')]], x.recorrencia);
    var desde = ui.entrada(x.desde, { tipo: 'date' }), app = ui.escolha(H.opcoesApps(true), x.app);
    var rod = [];
    if (!novo) rod.push(ui.botao(T('Excluir', 'Delete'), function () {
      C.db.custos = C.lista('custos').filter(function (y) { return y.id !== x.id; });
      RF.mudar('custos', 'financeiro', 'excluir', x.id, c, null, T('Custo excluído: ', 'Cost deleted: ') + x.descricao).then(function () { ui.fecharModal(); RF.renderizar(); });
    }, 'perigo'));
    rod.push(ui.botao(T('Salvar', 'Save'), function () {
      var y = Object.assign({}, x, { descricao: desc.value.trim(), categoria: cat.value, valor: +val.value, moeda: moeda.value, recorrencia: rec.value, desde: desde.value, app: app.value });
      if (!y.descricao || !(y.valor >= 0)) return ui.aviso(T('Descrição e valor.', 'Description and amount.'), 'erro');
      if (novo) C.lista('custos').push(y); else C.db.custos = C.lista('custos').map(function (z) { return z.id === y.id ? y : z; });
      RF.mudar('custos', 'financeiro', novo ? 'criar' : 'editar', y.id, c, y, T('Custo salvo: ', 'Cost saved: ') + y.descricao).then(function () { ui.fecharModal(); RF.renderizar(); });
    }, 'pri'));
    ui.modal(novo ? T('Novo custo', 'New cost') : x.descricao, el('div', { class: 'rf-form' }, [ui.campo(T('Descrição', 'Description'), desc),
      el('div', { class: 'rf-grade-3' }, [ui.campo(T('Categoria', 'Category'), cat), ui.campo(T('Valor', 'Amount'), val), ui.campo(T('Moeda', 'Currency'), moeda)]),
      el('div', { class: 'rf-grade-3' }, [ui.campo(T('Recorrência', 'Recurrence'), rec), ui.campo(T('Desde', 'Since'), desde), ui.campo('App', app)])]), { largo: true, rodape: rod });
  }

  /* ------------------------------------------------------------------
     TELEMETRIA (em cinza: o desenho está pronto)
     ------------------------------------------------------------------ */
  RF.telas.telemetria = function (area) {
    RF.pagina(area, 'telemetria', T('Desenho pronto para quando existir a ferramenta e o servidor. Nada é coletado hoje.', 'Design ready for when the tool and server exist. Nothing is collected today.'));
    area.appendChild(el('div', { class: 'rf-grade-3' }, [ui.cinza('telemetria.uso', el('div', { class: 'rf-cartoes' }, [ui.cartao(T('Aberturas por app', 'Opens per app'), '—'), ui.cartao(T('Funções mais usadas', 'Most used features'), '—')])),
      ui.cinza('telemetria.erros', ui.cartao(T('Erros nas últimas 24 h', 'Errors in the last 24 h'), '—')), ui.cinza('telemetria.desempenho', ui.cartao(T('Tempo médio de abertura', 'Average load time'), '—'))]));
    area.appendChild(ui.secao(T('Regras que já valem', 'Rules that already apply'), [el('ul', {}, [
      el('li', { texto: T('Só com consentimento (tipo "telemetria" no catálogo de consentimentos).', 'Only with consent ("telemetria" type in the consent catalog).') }),
      el('li', { texto: T('Nenhum dado pessoal: sem nome, e-mail, texto digitado nem localização.', 'No personal data: no name, e-mail, typed text or location.') }),
      el('li', { texto: T('O que medir: app, versão, função usada, erro de JavaScript, tempo de carregamento, tipo de aparelho.', 'What to measure: app, version, feature used, JavaScript error, load time, device type.') })
    ])]));
    area.appendChild(ui.cinza('integracoes.analytics'));
  };

  /* ------------------------------------------------------------------
     ARMAZENAMENTO
     ------------------------------------------------------------------ */
  RF.telas.armazenamento = function (area) {
    RF.pagina(area, 'armazenamento', T('Cotas por plano (vão no planos.json) e o espaço que o RootifyONE usa neste aparelho.', 'Quotas per plan (go into planos.json) and the space RootifyONE uses on this device.'));
    var podeEd = RF.pode('armazenamento:editar') && RF.pode('planos:editar');
    var campos = {};
    area.appendChild(ui.secao(T('Cota por plano (MB)', 'Quota per plan (MB)'), [ui.tabela([
      { id: 'p', nome: T('Plano', 'Plan'), valor: function (p) { return T(p.nome); } },
      { id: 'c', nome: 'MB', desenhar: function (p) { campos[p.id] = ui.entrada(p.cotaMB, { tipo: 'number', attrs: { min: 0, disabled: !podeEd, 'aria-label': T(p.nome) + ' MB' } }); return campos[p.id]; } }
    ], C.lista('planos')), podeEd ? ui.botao(T('Salvar cotas', 'Save quotas'), function () {
      var antes = {}, dep = {};
      C.lista('planos').forEach(function (p) { antes[p.id] = p.cotaMB; p.cotaMB = Math.max(0, +campos[p.id].value || 0); dep[p.id] = p.cotaMB; });
      RF.mudar('planos', 'armazenamento', 'cotas', '', antes, dep, T('Cotas de armazenamento alteradas', 'Storage quotas changed')).then(function () { ui.aviso(T('Salvo.', 'Saved.')); });
    }, 'pri') : null]));
    var uso = el('div', {}, [el('p', { class: 'rf-dica', texto: T('Medindo…', 'Measuring…') })]);
    area.appendChild(ui.secao(T('Este aparelho', 'This device'), [uso]));
    var bytes = 0, porCol = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(U.PREFIXO) === 0) { var t = (localStorage.getItem(k) || '').length * 2; bytes += t; if (k.indexOf(U.PREFIXO + 'c:') === 0) porCol.push([k.slice((U.PREFIXO + 'c:').length), t]); }
      }
    } catch (e) {}
    porCol.sort(function (a, b) { return b[1] - a[1]; });
    function mb(b) { return (b / 1048576).toFixed(2) + ' MB'; }
    var promessa = navigator.storage && navigator.storage.estimate ? navigator.storage.estimate() : Promise.resolve(null);
    promessa.then(function (est) {
      U.limpar(uso);
      var pct = est && est.quota ? Math.min(100, est.usage / est.quota * 100) : null;
      uso.appendChild(el('div', { class: 'rf-cartoes' }, [
        ui.cartao(T('RootifyONE (cofre cifrado)', 'RootifyONE (encrypted vault)'), mb(bytes), T('o armazenamento local do navegador costuma ter ~5 MB', 'browser local storage is usually ~5 MB')),
        est ? ui.cartao(T('Todo o site neste navegador', 'Whole site in this browser'), mb(est.usage), pct !== null ? pct.toFixed(1) + T('% da cota de ', '% of the quota of ') + mb(est.quota) : '') : null
      ]));
      if (pct !== null) uso.appendChild(el('div', { class: 'rf-medidor', role: 'meter', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(pct), 'aria-label': T('Uso do espaço', 'Space used') },
        [el('span', { style: { width: Math.max(pct, 1) + '%' } })]));
      uso.appendChild(H.barras(T('Maiores coleções (KB)', 'Largest collections (KB)'), porCol.slice(0, 8).map(function (p) { return [p[0], Math.round(p[1] / 1024)]; })));
      if (navigator.storage && navigator.storage.persist) uso.appendChild(ui.botao(T('Pedir ao navegador para não apagar estes dados', 'Ask the browser not to clear this data'), function () {
        navigator.storage.persist().then(function (ok) { ui.aviso(ok ? T('Pronto: o navegador vai preservar.', 'Done: the browser will preserve it.') : T('O navegador recusou (normal fora de app instalado). Faça cópias de segurança.', 'The browser refused (normal outside an installed app). Make backups.'), ok ? 'ok' : 'info'); });
      }));
    });
    area.appendChild(ui.cinza('armazenamento.central'));
  };

  /* ------------------------------------------------------------------
     O QUE FALTA ESPECIFICAR (mapa das funções em cinza)
     ------------------------------------------------------------------ */
  var filtroMapa = { estado: '', fase: '' };
  RF.telas.mapa = function (area) {
    var fs = RF.cat.FUNCOES;
    RF.pagina(area, 'mapa', T('Cada item em cinza mostra a pergunta que falta responder. Respondeu? A função pode sair do cinza.', 'Each grey item shows the question still to answer. Answered? The feature can leave the grey.'), [
      ui.botaoSe('mapa:exportar', null, T('Exportar para a planilha (CSV)', 'Export to the spreadsheet (CSV)'), function () {
        U.baixar('RootifyONE-mapa-de-funcoes.csv', U.csv([[function (f) { return T(RF.cat.modulo(f.modulo).nome); }, T('Módulo', 'Module')], [function (f) { return T(f.nome); }, T('Função', 'Feature')],
          ['estado', T('Estado', 'State')], ['fase', T('Fase', 'Phase')], [function (f) { return f.falta ? T(f.falta) : ''; }, T('O que falta', 'What is missing')]], fs), 'text/csv');
      })
    ]);
    var cont = { ativo: 0, parcial: 0, futuro: 0, especificar: 0 };
    fs.forEach(function (f) { cont[f.estado]++; });
    area.appendChild(el('div', { class: 'rf-cartoes' }, [ui.cartao(T('Prontas', 'Live'), cont.ativo, null, null, 'ok'), ui.cartao(T('Parciais', 'Partial'), cont.parcial, null, null, 'atencao'),
      ui.cartao(T('Esperam servidor/serviço', 'Waiting for server/service'), cont.futuro), ui.cartao(T('Esperam sua decisão', 'Waiting for your decision'), cont.especificar, null, null, 'info')]));
    var est = ui.escolha([['', T('Todos menos prontas', 'All but live')], ['especificar', T('A especificar', 'Needs spec')], ['futuro', T('Futuro', 'Future')], ['parcial', T('Parcial', 'Partial')], ['ativo', T('Prontas', 'Live')], ['*', T('Tudo', 'Everything')]], filtroMapa.estado);
    var fase = ui.escolha([['', T('Todas', 'All')], ['1', T('Fase 1 · sem servidor', 'Phase 1 · no server')], ['2', T('Fase 2 · Firebase', 'Phase 2 · Firebase')], ['3', T('Fase 3 · cobrança', 'Phase 3 · billing')]], filtroMapa.fase);
    est.onchange = fase.onchange = function () { filtroMapa = { estado: est.value, fase: fase.value }; RF.renderizar(); };
    area.appendChild(el('div', { class: 'rf-filtros' }, [ui.campo(T('Estado', 'State'), est), ui.campo(T('Fase', 'Phase'), fase)]));
    var lista = fs.filter(function (f) {
      if (filtroMapa.estado === '*') return !filtroMapa.fase || String(f.fase) === filtroMapa.fase;
      if (filtroMapa.estado ? f.estado !== filtroMapa.estado : f.estado === 'ativo') return false;
      return !filtroMapa.fase || String(f.fase) === filtroMapa.fase;
    });
    RF.cat.MODULOS.forEach(function (m) {
      var doMod = lista.filter(function (f) { return f.modulo === m.id; });
      if (!doMod.length) return;
      area.appendChild(ui.secao(m.icone + ' ' + T(m.nome), doMod.map(function (f) {
        return el('div', { class: 'rf-mapa-item rf-mapa-' + f.estado }, [el('div', { class: 'rf-cinza-cab' }, [el('strong', { texto: T(f.nome) }), ui.seloEstado(f.estado), ui.selo(T('fase ', 'phase ') + f.fase, 'neutro')]),
          f.falta ? el('p', { texto: T(f.falta) }) : null]);
      }), [ui.botao(T('Abrir a tela', 'Open screen'), function () { RF.Rota.ir(m.id); }, 'p')]));
    });
    var outros = RF.cat.SEPARACAO.filter(function (s) { return s.estado === 'especificar'; }).map(function (s) { return T(s.nome) + ' — ' + T(s.descricao); })
      .concat(RF.cat.PERFIS.filter(function (p) { return p.estado === 'especificar'; }).map(function (p) { return T('Perfil de cliente: ', 'Customer profile: ') + T(p.nome) + ' — ' + T(p.descricao); }));
    if (!filtroMapa.estado || filtroMapa.estado === 'especificar') area.appendChild(ui.secao('🛡️ ' + T('Papéis e perfis a especificar', 'Roles and profiles needing a spec'), [el('ul', {}, outros.map(function (t) { return el('li', { texto: t }); }))]));
  };

  /* ------------------------------------------------------------------
     CONFIGURAÇÕES
     ------------------------------------------------------------------ */
  RF.telas.configuracoes = function (area, rota) {
    var aba = rota.sub || 'geral';
    RF.pagina(area, 'configuracoes', null);
    area.appendChild(ui.abas([{ id: 'geral', nome: T('Geral', 'General') }, { id: 'seguranca', nome: T('Minha segurança', 'My security') }, { id: 'barra', nome: T('Barra de baixo', 'Bottom bar') },
      { id: 'backup', nome: T('Cópia de segurança', 'Backup') }, { id: 'exemplo', nome: T('Dados de exemplo', 'Sample data') }, { id: 'sobre', nome: T('Sobre', 'About') }], aba, function (a) { RF.Rota.ir('configuracoes', a); }));
    var cfg = C.obj('config'), podeEd = RF.pode('configuracoes:editar');
    if (aba === 'geral') {
      var idi = el('div', { class: 'rf-acoes' }, [['pt', 'Português'], ['en', 'English']].map(function (o) {
        return ui.botao(o[1], function () { if (raiz.DGO) raiz.DGO.trocarIdioma(o[0]); else { U.gravarLocal('idioma', o[0]); RF.renderizar(); } }, U.idioma() === o[0] ? 'pri' : '', { 'aria-pressed': U.idioma() === o[0] ? 'true' : 'false' });
      }));
      var bloq = ui.escolha([[5, '5 min'], [10, '10 min'], [15, '15 min'], [30, '30 min'], [60, '60 min']], cfg.bloqueioMin || 15, { disabled: !podeEd });
      bloq.onchange = function () { var a = cfg.bloqueioMin; cfg.bloqueioMin = +bloq.value; RF.mudar('config', 'configuracoes', 'bloqueio', '', a, cfg.bloqueioMin, T('Bloqueio automático: ', 'Auto-lock: ') + cfg.bloqueioMin + ' min').then(function () { S.vigiar(); ui.aviso(T('Salvo.', 'Saved.')); }); };
      area.appendChild(ui.secao(T('Idioma', 'Language'), [idi, el('p', { class: 'rf-dica', texto: T('Datas: PT 17/Set/2026 · EN Sep/17/2026.', 'Dates: PT 17/Set/2026 · EN Sep/17/2026.') })]));
      area.appendChild(ui.secao(T('Bloqueio automático', 'Auto-lock'), [ui.campo(T('Bloquear a tela depois de parado por', 'Lock the screen after being idle for'), bloq),
        el('p', { class: 'rf-dica', texto: T('Ao bloquear, a chave some da memória; os dados só abrem de novo com digital, PIN ou senha.', 'On lock, the key leaves memory; data only opens again with fingerprint, PIN or password.') })]));
      if (raiz.DGO) area.appendChild(ui.secao(T('Módulo comum da SolverONE', 'SolverONE shared module'), [
        el('p', { class: 'rf-dica', texto: T('Rede (Wi-Fi ou dados), IA, notificações e instalação como app ficam nas configurações do módulo comum.', 'Network (Wi-Fi or data), AI, notifications and installing as an app live in the shared module\'s settings.') }),
        ui.botao(T('Abrir configurações do módulo', 'Open module settings'), function () { raiz.DGO.abrirConfiguracoes(); })]));
    }
    if (aba === 'seguranca') {
      var p = C.pessoa(S.pessoa.id);
      var dig = el('div', { class: 'rf-acoes' });
      RF.Digital.disponivel().then(function (ok) {
        if (p.cred.webauthn) dig.appendChild(ui.botao(T('Tirar a digital deste aparelho', 'Remove fingerprint from this device'), function () {
          RF.Digital.remover(p); RF.Log.registrar('seguranca', 'digital-remover', p.email, null, null, T('Digital removida', 'Fingerprint removed')).then(RF.renderizar);
        }));
        else if (ok) dig.appendChild(ui.botao('👆 ' + T('Usar a digital (ou rosto) neste aparelho', 'Use fingerprint (or face) on this device'), function () {
          RF.Digital.registrar(p).then(function () { return RF.Log.registrar('seguranca', 'digital', p.email, null, null, T('Digital registrada neste aparelho', 'Fingerprint registered on this device')); })
            .then(function () { ui.aviso(T('Digital registrada.', 'Fingerprint registered.')); RF.renderizar(); }).catch(function (e) { ui.aviso(String(e && e.message), 'erro'); });
        }, 'pri'));
        else dig.appendChild(el('p', { class: 'rf-dica', texto: T('Este aparelho ou navegador não oferece digital.', 'This device or browser offers no fingerprint.') }));
      });
      area.appendChild(ui.secao(T('Digital', 'Fingerprint'), [el('p', { texto: p.cred.webauthn ? '✓ ' + T('Registrada neste aparelho.', 'Registered on this device.') : T('Não registrada.', 'Not registered.') }), dig]));
      var pin = ui.entrada('', { tipo: 'password', attrs: { inputmode: 'numeric', maxlength: 8, autocomplete: 'off' } });
      area.appendChild(ui.secao('PIN', [el('p', { texto: p.cred.pin ? '✓ ' + T('Definido.', 'Set.') : T('Não definido.', 'Not set.') }), el('div', { class: 'rf-linha' }, [ui.campo(T('Novo PIN (4 a 8 números)', 'New PIN (4 to 8 digits)'), pin),
        ui.botao(T('Salvar PIN', 'Save PIN'), function () {
          if (!/^\d{4,8}$/.test(pin.value)) return ui.aviso(T('De 4 a 8 números.', '4 to 8 digits.'), 'erro');
          RF.definirPin(p, pin.value).then(function () { return RF.Log.registrar('seguranca', 'pin', p.email, null, null, T('PIN alterado', 'PIN changed')); }).then(function () { ui.aviso(T('PIN salvo.', 'PIN saved.')); RF.renderizar(); });
        }, 'pri'),
        p.cred.pin ? ui.botao(T('Tirar PIN', 'Remove PIN'), function () {
          C.atualizarPessoa(p.id, function (y) { delete y.cred.pin; }); RF.Log.registrar('seguranca', 'pin-remover', p.email, null, null, T('PIN removido', 'PIN removed')).then(RF.renderizar);
        }) : null])]));
      var atual = ui.entrada('', { tipo: 'password', attrs: { autocomplete: 'current-password' } }), nova = ui.entrada('', { tipo: 'password', attrs: { autocomplete: 'new-password' } });
      area.appendChild(ui.secao(T('Senha', 'Password'), [el('div', { class: 'rf-grade-2' }, [ui.campo(T('Senha atual', 'Current password'), atual), ui.campo(T('Nova senha (8+)', 'New password (8+)'), nova)]),
        ui.botao(T('Trocar senha', 'Change password'), function () {
          if (nova.value.length < 8) return ui.aviso(T('Nova senha com 8 caracteres ou mais.', 'New password with 8+ characters.'), 'erro');
          RF.cripto.desembrulhar(p.cred.senha, atual.value).then(function () {
            return RF.trocarSenha(p, nova.value).then(function () { return RF.Log.registrar('seguranca', 'senha', p.email, null, null, T('Senha trocada', 'Password changed')); })
              .then(function () { atual.value = ''; nova.value = ''; ui.aviso(T('Senha trocada.', 'Password changed.')); });
          }, function () { ui.aviso(T('A senha atual não confere.', 'Current password does not match.'), 'erro'); });
        }, 'pri')]));
      area.appendChild(ui.secao(T('Código de recuperação', 'Recovery code'), [el('p', { texto: T('Gerar um novo invalida o anterior. Guarde fora deste aparelho.', 'Generating a new one invalidates the previous one. Keep it off this device.') }),
        ui.botao(T('Gerar novo código', 'Generate new code'), function () {
          RF.novoCodigo(p).then(function (cod) {
            RF.Log.registrar('seguranca', 'codigo', p.email, null, null, T('Novo código de recuperação gerado', 'New recovery code generated'));
            ui.modal(T('Novo código de recuperação', 'New recovery code'), el('div', {}, [el('div', { class: 'rf-codigo', texto: cod }), ui.botao(T('Copiar', 'Copy'), function () { U.copiar(cod); }),
              ui.botao(T('Baixar', 'Download'), function () { U.baixar('RootifyONE-codigo-de-recuperacao.txt', cod + '\n', 'text/plain'); })]));
          });
        })]));
      var tent = C.lista('log').filter(function (e) { return e.modulo === 'seguranca' && (e.alvo === p.email || e.quem === p.email); }).slice(-10).reverse();
      area.appendChild(ui.secao(T('Acessos recentes', 'Recent access'), [el('ul', {}, tent.map(function (e) { return el('li', { texto: U.data(e.quando, true) + ' · ' + e.resumo }); }))]));
    }
    if (aba === 'barra') {
      var fav = (cfg.favoritos && cfg.favoritos.length) ? cfg.favoritos.slice() : ['painel', 'usuarios', 'suporte', 'publicar'];
      var caixa = el('div', { class: 'rf-marcas' });
      RF.cat.MODULOS.filter(function (m) { return RF.pode(m.recurso + ':ver'); }).forEach(function (m) {
        var mk = ui.marca(m.icone + ' ' + T(m.nome), fav.indexOf(m.id) !== -1, { value: m.id });
        mk.querySelector('input').onchange = function (e) {
          var sel = Array.prototype.filter.call(caixa.querySelectorAll('input'), function (i) { return i.checked; }).map(function (i) { return i.value; });
          if (sel.length > 5) { e.target.checked = false; return ui.aviso(T('No máximo 5.', 'At most 5.'), 'erro'); }
          cfg.favoritos = sel; C.salvar('config').then(function () { RF.renderizar(); });
        };
        caixa.appendChild(mk);
      });
      area.appendChild(ui.secao(T('Atalhos da barra de baixo (celular) — até 5', 'Bottom bar shortcuts (phone) — up to 5'), [caixa, el('p', { class: 'rf-dica', texto: T('O resto fica no ☰ do topo.', 'Everything else is in the ☰ at the top.') })]));
    }
    if (aba === 'backup') {
      area.appendChild(ui.secao(T('Fazer cópia de segurança', 'Make a backup'), [
        el('p', { texto: T('O arquivo sai cifrado: só abre com a senha ou o código de recuperação de alguém da equipe. A digital não vai junto (é presa a este aparelho).', 'The file is encrypted: it only opens with a team member\'s password or recovery code. The fingerprint does not go along (it is tied to this device).') }),
        ui.botaoSe('configuracoes:editar', null, '⬇ ' + T('Baixar cópia cifrada', 'Download encrypted backup'), function () {
          var dump = {};
          for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf(U.PREFIXO) === 0 && !/(tentativas|ultima|pulouSeguranca)/.test(k)) dump[k] = localStorage.getItem(k); }
          U.baixar('ROOTIFY-ONE copia ' + U.agora().slice(0, 10) + '.rootify.json', JSON.stringify({ formato: 'rootify-copia-1', versao: RF.VERSAO, em: U.agora(), dados: dump }), 'application/json');
          RF.Log.registrar('configuracoes', 'backup', '', null, { chaves: Object.keys(dump).length }, T('Cópia de segurança baixada', 'Backup downloaded'));
        }, 'pri')]));
      area.appendChild(ui.secao(T('Restaurar', 'Restore'), [
        el('p', { texto: T('Substitui TUDO deste aparelho pelo conteúdo da cópia. Depois é preciso entrar de novo.', 'Replaces EVERYTHING on this device with the backup content. You will need to sign in again.') }),
        ui.botaoSe('configuracoes:editar', null, T('Escolher cópia…', 'Choose backup…'), function () {
          H.lerArquivo('.json').then(function (arq) {
            if (!arq) return;
            var o; try { o = JSON.parse(arq.texto); } catch (e) { return ui.aviso(T('Arquivo inválido.', 'Invalid file.'), 'erro'); }
            if (!o || o.formato !== 'rootify-copia-1') return ui.aviso(T('Não é uma cópia do RootifyONE.', 'Not a RootifyONE backup.'), 'erro');
            ui.confirmar(T('Restaurar cópia', 'Restore backup'), T('Tudo o que está neste aparelho será substituído pela cópia de ', 'Everything on this device will be replaced by the backup from ') + U.data(o.em, true) + '.', { perigo: true, digitar: 'RESTAURAR', digitarRotulo: T('Digite RESTAURAR', 'Type RESTAURAR') }).then(function (ok) {
              if (!ok) return;
              RF.Log.registrar('configuracoes', 'restaurar', '', null, { de: o.em }, T('Cópia restaurada de ', 'Backup restored from ') + o.em).then(function () {
                var apagar = []; for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf(U.PREFIXO) === 0) apagar.push(k); }
                apagar.forEach(function (k) { localStorage.removeItem(k); });
                Object.keys(o.dados).forEach(function (k) { localStorage.setItem(k, o.dados[k]); });
                raiz.location.hash = ''; raiz.location.reload();
              });
            });
          });
        }, 'perigo')]));
      if (RF.ehDono()) area.appendChild(ui.secao(T('Zona de perigo', 'Danger zone'), [
        el('p', { texto: T('Apaga o RootifyONE deste aparelho (cofre, equipe, log). Faça uma cópia antes.', 'Erases RootifyONE from this device (vault, team, log). Make a backup first.') }),
        ui.botao(T('Apagar tudo deste aparelho', 'Erase everything from this device'), function () {
          ui.confirmar(T('Apagar tudo', 'Erase everything'), T('Não dá para desfazer sem uma cópia de segurança.', 'Cannot be undone without a backup.'), { perigo: true, digitar: 'APAGAR', digitarRotulo: T('Digite APAGAR', 'Type APAGAR') }).then(function (ok) {
            if (!ok) return;
            var ks = []; for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf(U.PREFIXO) === 0) ks.push(k); }
            ks.forEach(function (k) { localStorage.removeItem(k); });
            try { indexedDB.deleteDatabase('rootify-one'); } catch (e) {}
            raiz.location.hash = ''; raiz.location.reload();
          });
        }, 'perigo')]));
    }
    if (aba === 'exemplo') {
      area.appendChild(ui.secao(T('Dados de exemplo', 'Sample data'), [
        el('p', { texto: T('24 usuários, 12 chamados, 2 pedidos de privacidade, artigos, uma automação e custos — tudo fictício (e-mails @example.com) e marcado como exemplo.',
          '24 users, 12 tickets, 2 privacy requests, articles, one automation and costs — all fictitious (@example.com e-mails) and marked as sample.') }),
        cfg.exemplo ? ui.botaoSe('configuracoes:editar', null, T('Remover dados de exemplo', 'Remove sample data'), function () {
          D.removerExemplo(); C.salvarTudo().then(function () { return RF.Log.registrar('configuracoes', 'exemplo-remover', '', null, null, T('Dados de exemplo removidos', 'Sample data removed')); }).then(RF.renderizar);
        }, 'perigo') : ui.botaoSe('configuracoes:editar', null, T('Carregar dados de exemplo', 'Load sample data'), function () {
          D.exemplo(); C.salvarTudo().then(function () { return RF.Log.registrar('configuracoes', 'exemplo-carregar', '', null, null, T('Dados de exemplo carregados', 'Sample data loaded')); }).then(RF.renderizar);
        }, 'pri')]));
    }
    if (aba === 'sobre') {
      var cont = ['usuarios', 'chamados', 'kb', 'termos', 'recados', 'anuncios', 'pedidos', 'log', 'publicacoes'].map(function (n) { return [n, C.lista(n).length]; });
      area.appendChild(ui.secao('RootifyONE ' + RF.VERSAO, [
        el('p', { texto: T('Administração central da SolverONE. JavaScript, HTML e CSS puros; dados cifrados neste aparelho (AES-GCM, chave derivada por PBKDF2).', 'SolverONE central administration. Plain JavaScript, HTML and CSS; data encrypted on this device (AES-GCM, key derived with PBKDF2).') }),
        el('p', {}, [T('Módulo comum: ', 'Shared module: '), raiz.DGO ? 'diretrizes.js ' + raiz.DGO.versao : T('não carregado', 'not loaded')]),
        H.barras(T('Registros guardados', 'Stored records'), cont),
        el('p', {}, [el('a', { href: 'https://marceloneco.github.io/', target: '_blank', rel: 'noopener', texto: T('Portal de Projetos ↗', 'Projects Portal ↗') })])
      ]));
    }
  };
})(window);
