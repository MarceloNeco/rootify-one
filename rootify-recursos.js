/* =====================================================================
   RootifyONE — RECURSOS E CONTEÚDO POR APP
   ---------------------------------------------------------------------
   A parte "app-oriented" do RootifyONE. Para cada app (e para o Global,
   que vale em todos):
     1. Recursos (feature flags): ligar/desligar funções sem commit.
     2. Comportamentos (feature settings): valores que o app lê ao abrir
        (número, texto, sim/não, lista, cor, JSON).
     3. Conteúdo: coleções com campos declarados (texto PT/EN, fotos,
        vídeos do YouTube, links…) e itens editáveis — ex.: os aparelhos
        do RiseONE. Fotos sobem direto para o solverone-dados pelo token
        do GitHub; nada de commit à mão.
   Tudo vira arquivo master: recursos/<app>.json e conteudo/<app>.json
   (mais recursos/global.json e conteudo/global.json). Os apps leem ao
   abrir (DGO.central no módulo comum, ou um adaptador próprio) e têm
   sempre a cópia local como reserva.
   App novo = linha em Apps: esta tela passa a oferecê-lo sozinha.
   Permissão: recursos:ver/editar · conteudo:ver/criar/editar/excluir.
   ===================================================================== */
(function (raiz) {
  'use strict';
  var RF = raiz.RF, U = RF.util, T = U.T, el = U.el, ui = RF.ui, C = RF.Cofre, S = RF.Sessao, H = RF.h;
  function N(pt, en) { return { pt: pt, en: en }; }

  var TIPOS_VALOR = {
    'sim-nao': N('Sim / não', 'Yes / no'), numero: N('Número', 'Number'), texto: N('Texto', 'Text'),
    lista: N('Escolha numa lista', 'Pick from a list'), cor: N('Cor', 'Colour'), json: N('JSON (avançado)', 'JSON (advanced)')
  };
  var TIPOS_CAMPO = {
    texto: N('Texto curto', 'Short text'), 'texto-longo': N('Texto longo', 'Long text'),
    bilingue: N('Texto curto PT/EN', 'Short text PT/EN'), 'bilingue-longo': N('Texto longo PT/EN', 'Long text PT/EN'),
    numero: N('Número', 'Number'), 'sim-nao': N('Sim / não', 'Yes / no'),
    imagens: N('Fotos', 'Photos'), videos: N('Vídeos do YouTube', 'YouTube videos'), links: N('Links', 'Links'), lista: N('Lista de palavras', 'Word list')
  };

  /* ------------------------------------------------------------------
     DADOS: garantir sementes, ler por app
     ------------------------------------------------------------------ */
  function garantir() {
    if (!C.aberto()) return;
    var cat = RF.cat, cfg = C.obj('config');
    if (!cfg.recursosSemeados) {
      var rec = C.lista('recursos'), comp = C.lista('comportamentos'), con = C.lista('conteudo');
      (cat.RECURSOS_INICIAIS || []).forEach(function (r) { if (!rec.some(function (x) { return x.app === r.app && x.id === r.id; })) rec.push(Object.assign({ atualizadoEm: U.agora() }, U.clonar(r))); });
      (cat.COMPORTAMENTOS_INICIAIS || []).forEach(function (r) { if (!comp.some(function (x) { return x.app === r.app && x.id === r.id; })) comp.push(Object.assign({ atualizadoEm: U.agora() }, U.clonar(r))); });
      (cat.CONTEUDO_INICIAL || []).forEach(function (c) {
        if (con.some(function (x) { return x.app === c.app && x.id === c.id; })) return;
        var y = U.clonar(c); y.itens = (y.itens || []).map(function (it, i) { return { id: it.id, valores: it.valores || {}, ativo: true, ordem: i, atualizadoEm: U.agora() }; });
        con.push(y);
      });
      cfg.recursosSemeados = true;
      C.salvar('recursos'); C.salvar('comportamentos'); C.salvar('conteudo'); C.salvar('config');
    }
  }
  function appsDisponiveis() {
    var lista = [{ id: '*', nome: N('Global (todos os apps)', 'Global (every app)'), glifo: '🌐', cor: '#64748b' }];
    C.lista('apps').filter(function (a) { return !a.interno && a.estado !== 'backlog' && RF.noEscopo(a.id); }).forEach(function (a) { lista.push(a); });
    return lista;
  }
  function recursosDe(app) { return C.lista('recursos').filter(function (r) { return r.app === app; }); }
  function comportamentosDe(app) { return C.lista('comportamentos').filter(function (r) { return r.app === app; }); }
  function colecoesDe(app) { return C.lista('conteudo').filter(function (r) { return r.app === app; }); }
  function colecao(app, id) { return colecoesDe(app).filter(function (c) { return c.id === id; })[0] || null; }
  function slug(s) { return U.semAcento(String(s || '')).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
  function youtubeId(s) {
    s = String(s || '').trim();
    var m = /(?:youtu\.be\/|v=|\/shorts\/|\/embed\/|\/live\/)([A-Za-z0-9_-]{11})/.exec(s) || /^([A-Za-z0-9_-]{11})$/.exec(s);
    return m ? m[1] : '';
  }
  function tituloItem(col, it) {
    var c = col.campos[0]; if (!c) return it.id;
    var v = it.valores[c.id];
    if (v && typeof v === 'object' && (v.pt || v.en)) return T(v);
    return v ? String(v) : it.id;
  }

  /* ------------------------------------------------------------------
     ARQUIVOS MASTER (chamado por rootify-dados.gerarArquivos)
     ------------------------------------------------------------------ */
  function arquivosMaster(cab, j) {
    var saida = [], apps = ['*'].concat(C.lista('apps').filter(function (a) { return !a.interno && a.estado !== 'backlog'; }).map(function (a) { return a.id; }));
    apps.forEach(function (app) {
      var nome = app === '*' ? 'global' : app;
      var rec = {}, comp = {};
      recursosDe(app).forEach(function (r) { rec[r.id] = { ligado: !!r.ligado, desde: r.desde || '', nome: r.nome }; });
      comportamentosDe(app).forEach(function (r) { comp[r.id] = r.valor === undefined ? r.padrao : r.valor; });
      var cols = colecoesDe(app);
      if (Object.keys(rec).length || Object.keys(comp).length) saida.push({ nome: 'recursos/' + nome + '.json', texto: j(cab({ app: app, recursos: rec, comportamentos: comp })) });
      if (cols.length) {
        var colecoes = {};
        cols.forEach(function (c) {
          colecoes[c.id] = { nome: c.nome, campos: c.campos.map(function (f) { return { id: f.id, nome: f.nome, tipo: f.tipo }; }),
            itens: c.itens.filter(function (it) { return it.ativo !== false; }).sort(function (a, b) { return (a.ordem || 0) - (b.ordem || 0); })
              .map(function (it) { return Object.assign({ id: it.id }, it.valores, { atualizadoEm: it.atualizadoEm }); }) };
        });
        saida.push({ nome: 'conteudo/' + nome + '.json', texto: j(cab({ app: app, colecoes: colecoes })) });
      }
    });
    return saida;
  }

  /* ------------------------------------------------------------------
     FOTOS: reduzir no navegador e subir pelo GitHub (sem commit à mão)
     ------------------------------------------------------------------ */
  function reduzirImagem(arquivo, max) {
    return new Promise(function (ok, erro) {
      var img = new Image(), url = URL.createObjectURL(arquivo);
      img.onload = function () {
        var w = img.width, h = img.height, k = Math.min(1, (max || 1280) / Math.max(w, h));
        var cv = document.createElement('canvas'); cv.width = Math.round(w * k); cv.height = Math.round(h * k);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        ok(cv.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = function () { URL.revokeObjectURL(url); erro(new Error('imagem')); };
      img.src = url;
    });
  }
  function subirFoto(app, colecaoId, itemId, arquivo) {
    var cfg = C.obj('config'), gh = cfg.github || {};
    if (!gh.token) return Promise.reject(new Error('sem-token'));
    return reduzirImagem(arquivo, 1280).then(function (dataUrl) {
      var b64 = dataUrl.split(',')[1];
      var caminho = 'conteudo/' + (app === '*' ? 'global' : app) + '/' + slug(colecaoId) + '-' + slug(itemId) + '-' + Date.now().toString(36) + '.jpg';
      return RF.GitHub.enviarArquivo(gh, caminho, b64, 'RootifyONE: foto ' + caminho).then(function () {
        return RF.cat.DOMINIO.atual + gh.repo + '/' + caminho;
      });
    });
  }

  /* ------------------------------------------------------------------
     TELA
     ------------------------------------------------------------------ */
  var estado = { app: '*', aba: 'recursos' };
  RF.telas.recursos = function (area, rota) {
    garantir();
    var apps = appsDisponiveis();
    if (rota.sub && apps.some(function (a) { return a.id === rota.sub; })) estado.app = rota.sub;
    if (rota.id) estado.aba = rota.id;
    if (!apps.some(function (a) { return a.id === estado.app; })) estado.app = '*';
    var app = estado.app, aba = estado.aba;
    var podeRec = RF.pode('recursos:editar', app), podeCon = RF.pode('conteudo:editar', app);
    RF.pagina(area, 'recursos', T('Feature flags, remote config e conteúdo (CMS) de cada app, sem mexer em código. Mudou? Publique para os apps lerem.',
      'Feature flags, remote config and content (CMS) for each app, without touching code. Changed something? Publish so the apps read it.'), [
      ui.botaoSe('publicar:ver', null, '🚀 ' + T('Publicar', 'Publish'), function () { RF.Rota.ir('publicar'); })
    ]);
    /* seletor de app: chips */
    area.appendChild(el('div', { class: 'rf-apps-chips', role: 'tablist', 'aria-label': 'Apps' }, apps.map(function (a) {
      var b = el('button', { type: 'button', role: 'tab', class: 'rf-app-chip' + (a.id === app ? ' rf-on' : ''), 'aria-selected': a.id === app ? 'true' : 'false' }, [
        el('span', { class: 'rf-glifo', style: { background: a.cor || '#64748b' }, 'aria-hidden': 'true', texto: a.glifo || '✨' }), el('span', { texto: T(a.nome) })]);
      b.onclick = function () { RF.Rota.ir('recursos', a.id, estado.aba); };
      return b;
    }).concat([RF.pode('apps:criar') ? ui.botao('+ ' + T('App novo', 'New app'), function () { RF.Rota.ir('apps'); }, 'chip') : null])));

    area.appendChild(ui.abas([
      { id: 'recursos', nome: '🎚 ' + T('Recursos', 'Features'), conta: recursosDe(app).length },
      { id: 'comportamentos', nome: '⚙️ ' + T('Comportamentos', 'Behaviours'), conta: comportamentosDe(app).length },
      { id: 'conteudo', nome: '🗂 ' + T('Conteúdo', 'Content'), conta: colecoesDe(app).reduce(function (s, c) { return s + c.itens.length; }, 0) }
    ], aba, function (a) { RF.Rota.ir('recursos', app, a); }));
    if (aba === 'recursos') return abaRecursos(area, app, podeRec);
    if (aba === 'comportamentos') return abaComportamentos(area, app, podeRec);
    if (aba === 'conteudo') return abaConteudo(area, app, podeCon);
  };

  /* ---- 1. recursos (feature flags) ---- */
  function abaRecursos(area, app, podeEd) {
    var lista = recursosDe(app);
    area.appendChild(el('p', { class: 'rf-dica', texto: app === '*' ? T('Recursos globais valem em todos os apps; um app pode ter o mesmo id e a regra dele vence.', 'Global features apply to every app; an app may have the same id and its rule wins.')
      : T('O app lê recursos/' + app + '.json ao abrir. Recurso que o app não conhece é ignorado; o padrão fica no código do app.', 'The app reads recursos/' + app + '.json when it opens. Features the app does not know are ignored; the default stays in the app code.') }));
    area.appendChild(ui.tabela([
      { id: 'n', nome: T('Recurso', 'Feature'), valor: function (r) { return T(r.nome); }, desenhar: function (r) { return el('span', {}, [el('strong', { texto: T(r.nome) }), el('br'), el('small', { class: 'rf-dica rf-mono', texto: r.id })]); } },
      { id: 'd', nome: T('O que faz', 'What it does'), valor: function (r) { return T(r.descricao || {}); } },
      { id: 'v', nome: T('Desde a versão', 'Since version'), valor: function (r) { return r.desde || '—'; } },
      { id: 'l', nome: T('Ligado', 'On'), desenhar: function (r) {
        var c = el('input', { type: 'checkbox', 'aria-label': T('Ligado: ', 'On: ') + T(r.nome), disabled: !podeEd }); c.checked = !!r.ligado;
        c.onchange = function () { var antes = r.ligado; r.ligado = c.checked; r.atualizadoEm = U.agora();
          RF.mudar('recursos', 'recursos', r.ligado ? 'ligar' : 'desligar', app + '/' + r.id, antes, r.ligado, T('Recurso ', 'Feature ') + (r.ligado ? T('ligado: ', 'on: ') : T('desligado: ', 'off: ')) + T(r.nome) + ' (' + H.nomeApp(app) + ')').then(function () { ui.aviso(T('Salvo. Publique para valer nos apps.', 'Saved. Publish so it applies in the apps.')); }); };
        return c;
      } }
    ], lista, { aoClicar: podeEd ? function (r) { editarRecurso(app, r); } : null, rotulo: T('Recursos', 'Features'), vazio: T('Nenhum recurso declarado para este app ainda.', 'No feature declared for this app yet.') }));
    if (podeEd) area.appendChild(ui.botao('+ ' + T('Novo recurso', 'New feature'), function () { editarRecurso(app, null); }, 'pri'));
  }
  function editarRecurso(app, r) {
    var novo = !r, x = r ? U.clonar(r) : { app: app, id: '', nome: {}, descricao: {}, ligado: true, desde: '', nota: '' };
    var id = ui.entrada(x.id, { attrs: { disabled: !novo, placeholder: 'ex.: videos-youtube' } }), nome = ui.bilingue(T('Nome', 'Name'), x.nome), desc = ui.bilingue(T('O que faz', 'What it does'), x.descricao, { linhas: 2 });
    var desde = ui.entrada(x.desde, { attrs: { placeholder: '3.9.0' } }), ligado = ui.marca(T('Ligado', 'On'), x.ligado), nota = ui.entrada(x.nota, { linhas: 2 });
    var rod = [];
    if (!novo) rod.push(ui.botao(T('Excluir', 'Delete'), function () {
      C.db.recursos = C.lista('recursos').filter(function (y) { return !(y.app === app && y.id === x.id); });
      RF.mudar('recursos', 'recursos', 'excluir', app + '/' + x.id, r, null, T('Recurso excluído: ', 'Feature deleted: ') + x.id).then(function () { ui.fecharModal(); RF.renderizar(); });
    }, 'perigo'));
    rod.push(ui.botao(T('Salvar', 'Save'), function () {
      var y = Object.assign({}, x, { id: novo ? slug(id.value) : x.id, nome: nome.valor(), descricao: desc.valor(), desde: desde.value.trim(), ligado: ligado.querySelector('input').checked, nota: nota.value.trim(), atualizadoEm: U.agora() });
      if (!y.id || !y.nome.pt || !y.nome.en) return ui.aviso(T('Identificador e nome PT/EN.', 'Identifier and name PT/EN.'), 'erro');
      if (novo && recursosDe(app).some(function (z) { return z.id === y.id; })) return ui.aviso(T('Já existe esse identificador neste app.', 'That identifier already exists in this app.'), 'erro');
      if (novo) C.lista('recursos').push(y); else C.db.recursos = C.lista('recursos').map(function (z) { return z.app === app && z.id === y.id ? y : z; });
      RF.mudar('recursos', 'recursos', novo ? 'criar' : 'editar', app + '/' + y.id, r, y, T('Recurso salvo: ', 'Feature saved: ') + y.id + ' (' + H.nomeApp(app) + ')').then(function () { ui.fecharModal(); RF.renderizar(); });
    }, 'pri'));
    ui.modal((novo ? T('Novo recurso', 'New feature') : T(x.nome)) + ' · ' + H.nomeApp(app), el('div', { class: 'rf-form' }, [
      ui.campo(T('Identificador (o app lê por ele)', 'Identifier (the app reads by it)'), id), nome, desc,
      el('div', { class: 'rf-grade-2' }, [ui.campo(T('Desde a versão (opcional)', 'Since version (optional)'), desde), ligado]),
      ui.campo(T('Nota interna', 'Internal note'), nota)]), { largo: true, rodape: rod });
  }

  /* ---- 2. comportamentos (feature settings) ---- */
  function abaComportamentos(area, app, podeEd) {
    var lista = comportamentosDe(app);
    area.appendChild(el('p', { class: 'rf-dica', texto: T('Valores que o app lê ao abrir (recursos/' + (app === '*' ? 'global' : app) + '.json → comportamentos). Mude aqui, publique, e o app passa a usar sem commit.',
      'Values the app reads when it opens (recursos/' + (app === '*' ? 'global' : app) + '.json → comportamentos). Change here, publish, and the app uses it without a commit.') }));
    area.appendChild(ui.tabela([
      { id: 'n', nome: T('Comportamento', 'Behaviour'), valor: function (r) { return T(r.nome); }, desenhar: function (r) { return el('span', {}, [el('strong', { texto: T(r.nome) }), el('br'), el('small', { class: 'rf-dica rf-mono', texto: r.id })]); } },
      { id: 'd', nome: T('Para quê', 'What for'), valor: function (r) { return T(r.descricao || {}); } },
      { id: 't', nome: T('Tipo', 'Type'), valor: function (r) { return T(TIPOS_VALOR[r.tipo] || { pt: r.tipo, en: r.tipo }); } },
      { id: 'v', nome: T('Valor', 'Value'), desenhar: function (r) { return editorValor(r, podeEd, function (novo) {
        var antes = r.valor; r.valor = novo; r.atualizadoEm = U.agora();
        RF.mudar('comportamentos', 'recursos', 'valor', app + '/' + r.id, antes, novo, T('Comportamento ', 'Behaviour ') + r.id + ' = ' + JSON.stringify(novo) + ' (' + H.nomeApp(app) + ')').then(function () { ui.aviso(T('Salvo. Publique para valer nos apps.', 'Saved. Publish so it applies in the apps.')); });
      }); } },
      { id: 'p', nome: T('Padrão', 'Default'), valor: function (r) { return r.padrao === undefined || r.padrao === null ? '—' : String(typeof r.padrao === 'object' ? JSON.stringify(r.padrao) : r.padrao); } }
    ], lista, { aoClicar: podeEd ? function (r) { editarComportamento(app, r); } : null, rotulo: T('Comportamentos', 'Behaviours'), vazio: T('Nenhum comportamento declarado para este app ainda.', 'No behaviour declared for this app yet.') }));
    if (podeEd) area.appendChild(ui.botao('+ ' + T('Novo comportamento', 'New behaviour'), function () { editarComportamento(app, null); }, 'pri'));
  }
  function editorValor(r, podeEd, aoMudar) {
    var v = r.valor === undefined ? r.padrao : r.valor;
    if (r.tipo === 'sim-nao') { var c = el('input', { type: 'checkbox', 'aria-label': T(r.nome), disabled: !podeEd }); c.checked = !!v; c.onchange = function () { aoMudar(c.checked); }; return c; }
    if (r.tipo === 'lista') { var s = ui.escolha((r.opcoes || []).map(function (o) { return [o, o]; }), v, { disabled: !podeEd, 'aria-label': T(r.nome) }); s.onchange = function () { aoMudar(s.value); }; s.classList.add('rf-in-p'); return s; }
    var i = ui.entrada(r.tipo === 'json' ? JSON.stringify(v === undefined ? null : v) : (v === undefined || v === null ? '' : v), { tipo: r.tipo === 'numero' ? 'number' : r.tipo === 'cor' ? 'color' : 'text', attrs: { disabled: !podeEd, 'aria-label': T(r.nome) } });
    i.classList.add('rf-in-p');
    i.onchange = function () {
      var novo = i.value;
      if (r.tipo === 'numero') { novo = parseFloat(i.value); if (isNaN(novo)) return ui.aviso(T('Número inválido.', 'Invalid number.'), 'erro'); }
      if (r.tipo === 'json') { try { novo = JSON.parse(i.value); } catch (e) { return ui.aviso(T('JSON inválido.', 'Invalid JSON.'), 'erro'); } }
      aoMudar(novo);
    };
    return i;
  }
  function editarComportamento(app, r) {
    var novo = !r, x = r ? U.clonar(r) : { app: app, id: '', nome: {}, descricao: {}, tipo: 'sim-nao', opcoes: [], valor: true, padrao: true };
    var id = ui.entrada(x.id, { attrs: { disabled: !novo, placeholder: 'ex.: descanso.padraoSeg' } }), nome = ui.bilingue(T('Nome', 'Name'), x.nome), desc = ui.bilingue(T('Para quê', 'What for'), x.descricao, { linhas: 2 });
    var tipo = ui.escolha(Object.keys(TIPOS_VALOR).map(function (k) { return [k, T(TIPOS_VALOR[k])]; }), x.tipo), opcoes = ui.entrada((x.opcoes || []).join(', '), { attrs: { placeholder: 'BRL, USD, EUR' } });
    var padrao = ui.entrada(typeof x.padrao === 'object' ? JSON.stringify(x.padrao) : (x.padrao === undefined ? '' : String(x.padrao)));
    var campoOp = ui.campo(T('Opções (separadas por vírgula)', 'Options (comma separated)'), opcoes);
    function mostrar() { campoOp.hidden = tipo.value !== 'lista'; } tipo.onchange = mostrar; mostrar();
    function converter(txt, t) {
      if (t === 'sim-nao') return /^(true|1|sim|yes)$/i.test(txt.trim());
      if (t === 'numero') { var n = parseFloat(txt); return isNaN(n) ? 0 : n; }
      if (t === 'json') { try { return JSON.parse(txt); } catch (e) { return null; } }
      return txt.trim();
    }
    var rod = [];
    if (!novo) rod.push(ui.botao(T('Excluir', 'Delete'), function () {
      C.db.comportamentos = C.lista('comportamentos').filter(function (y) { return !(y.app === app && y.id === x.id); });
      RF.mudar('comportamentos', 'recursos', 'excluir', app + '/' + x.id, r, null, T('Comportamento excluído: ', 'Behaviour deleted: ') + x.id).then(function () { ui.fecharModal(); RF.renderizar(); });
    }, 'perigo'));
    rod.push(ui.botao(T('Salvar', 'Save'), function () {
      var t = tipo.value, p = converter(padrao.value, t);
      var y = Object.assign({}, x, { id: novo ? id.value.trim().replace(/[^A-Za-z0-9._-]+/g, '-') : x.id, nome: nome.valor(), descricao: desc.valor(), tipo: t, opcoes: t === 'lista' ? opcoes.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean) : [], padrao: p, atualizadoEm: U.agora() });
      if (novo || x.tipo !== t) y.valor = p;
      if (!y.id || !y.nome.pt || !y.nome.en) return ui.aviso(T('Identificador e nome PT/EN.', 'Identifier and name PT/EN.'), 'erro');
      if (novo && comportamentosDe(app).some(function (z) { return z.id === y.id; })) return ui.aviso(T('Já existe esse identificador neste app.', 'That identifier already exists in this app.'), 'erro');
      if (novo) C.lista('comportamentos').push(y); else C.db.comportamentos = C.lista('comportamentos').map(function (z) { return z.app === app && z.id === y.id ? y : z; });
      RF.mudar('comportamentos', 'recursos', novo ? 'criar' : 'editar', app + '/' + y.id, r, y, T('Comportamento salvo: ', 'Behaviour saved: ') + y.id + ' (' + H.nomeApp(app) + ')').then(function () { ui.fecharModal(); RF.renderizar(); });
    }, 'pri'));
    ui.modal((novo ? T('Novo comportamento', 'New behaviour') : T(x.nome)) + ' · ' + H.nomeApp(app), el('div', { class: 'rf-form' }, [
      ui.campo(T('Identificador (o app lê por ele)', 'Identifier (the app reads by it)'), id), nome, desc,
      el('div', { class: 'rf-grade-2' }, [ui.campo(T('Tipo', 'Type'), tipo), ui.campo(T('Valor padrão', 'Default value'), padrao)]), campoOp]), { largo: true, rodape: rod });
  }

  /* ---- 3. conteúdo (coleções e itens) ---- */
  var colecaoAberta = null;
  function abaConteudo(area, app, podeEd) {
    var cols = colecoesDe(app);
    var aberta = colecaoAberta && colecao(app, colecaoAberta);
    if (aberta) return telaColecao(area, app, aberta, podeEd);
    area.appendChild(el('p', { class: 'rf-dica', texto: T('Cada coleção tem campos declarados (texto PT/EN, fotos, vídeos do YouTube, links…) e itens. Vira conteudo/' + (app === '*' ? 'global' : app) + '.json; o app lê ao abrir e mostra sem commit.',
      'Each collection has declared fields (PT/EN text, photos, YouTube videos, links…) and items. Becomes conteudo/' + (app === '*' ? 'global' : app) + '.json; the app reads it when it opens and shows it without a commit.') }));
    if (!cols.length) area.appendChild(el('div', { class: 'rf-vazio' }, [el('p', { texto: T('Nenhuma coleção de conteúdo neste app ainda.', 'No content collection in this app yet.') })]));
    else area.appendChild(el('div', { class: 'rf-cartoes' }, cols.map(function (c) {
      return ui.cartao(T(c.nome), c.itens.filter(function (i) { return i.ativo !== false; }).length, c.campos.map(function (f) { return T(f.nome); }).slice(0, 4).join(' · ') + (c.campos.length > 4 ? ' …' : ''), function () { colecaoAberta = c.id; RF.renderizar(); });
    })));
    if (podeEd) area.appendChild(ui.botao('+ ' + T('Nova coleção', 'New collection'), function () { editarColecao(app, null); }, 'pri'));
  }
  function telaColecao(area, app, col, podeEd) {
    var podeCriar = RF.pode('conteudo:criar', app), podeExcluir = RF.pode('conteudo:excluir', app);
    area.appendChild(el('div', { class: 'rf-pag-cab' }, [
      el('div', {}, [el('h2', {}, [ui.botao('‹ ' + T('Coleções', 'Collections'), function () { colecaoAberta = null; RF.renderizar(); }, 'link'), ' ', T(col.nome)]), el('p', { class: 'rf-dica', texto: T(col.descricao || {}) })]),
      el('div', { class: 'rf-acoes' }, [podeEd ? ui.botao('🧩 ' + T('Campos', 'Fields'), function () { editarColecao(app, col); }) : null, podeCriar ? ui.botao('+ ' + T('Novo item', 'New item'), function () { editarItem(app, col, null); }, 'pri') : null])
    ]));
    var itens = col.itens.slice().sort(function (a, b) { return (a.ordem || 0) - (b.ordem || 0); });
    var busca = ui.entrada('', { tipo: 'search', attrs: { placeholder: T('Procurar item', 'Search item'), 'aria-label': T('Procurar', 'Search') } });
    var bloco = el('div');
    var campoFoto = col.campos.filter(function (f) { return f.tipo === 'imagens'; })[0], campoVideo = col.campos.filter(function (f) { return f.tipo === 'videos'; })[0];
    function desenhar() {
      var q = U.semAcento(busca.value);
      var l = itens.filter(function (it) { return !q || U.semAcento(it.id + ' ' + JSON.stringify(it.valores)).indexOf(q) !== -1; });
      U.limpar(bloco);
      bloco.appendChild(ui.tabela([
        { id: 'f', nome: '', desenhar: function (it) {
          var fotos = campoFoto && it.valores[campoFoto.id] || [];
          return fotos.length ? el('img', { src: fotos[0], alt: '', class: 'rf-mini-foto', loading: 'lazy' }) : el('span', { class: 'rf-mini-foto rf-mini-vazio', 'aria-hidden': 'true', texto: '🖼' });
        } },
        { id: 'n', nome: T('Item', 'Item'), valor: function (it) { return tituloItem(col, it); }, desenhar: function (it) { return el('span', {}, [el('strong', { texto: tituloItem(col, it) }), el('br'), el('small', { class: 'rf-dica rf-mono', texto: it.id })]); } },
        { id: 'c', nome: T('Conteúdo', 'Content'), desenhar: function (it) {
          var partes = [];
          col.campos.forEach(function (f) {
            var v = it.valores[f.id]; if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) return;
            if (f.tipo === 'imagens') partes.push('🖼 ' + v.length); else if (f.tipo === 'videos') partes.push('▶ ' + v.length); else if (f.tipo === 'links') partes.push('🔗 ' + v.length);
            else if (f.tipo === 'bilingue' || f.tipo === 'bilingue-longo') { if (v.pt && v.en) partes.push('PT/EN'); else partes.push(ui.selo(v.pt ? T('falta EN', 'EN missing') : T('falta PT', 'PT missing'), 'atencao')); }
          });
          return el('span', { class: 'rf-chips' }, partes.map(function (p) { return typeof p === 'string' ? ui.selo(p, 'neutro') : p; }));
        } },
        { id: 'a', nome: T('Atualizado', 'Updated'), ordenar: function (it) { return it.atualizadoEm; }, desenhar: function (it) { return U.data(it.atualizadoEm); } },
        { id: 's', nome: T('Situação', 'Status'), desenhar: function (it) { return ui.selo(it.ativo === false ? T('oculto', 'hidden') : T('publicável', 'publishable'), it.ativo === false ? 'cinza' : 'ok'); } }
      ], l, { aoClicar: function (it) { editarItem(app, col, it); }, porPagina: 60, rotulo: T(col.nome), vazio: T('Nenhum item ainda.', 'No items yet.') }));
    }
    busca.addEventListener('input', desenhar);
    area.appendChild(el('div', { class: 'rf-filtros' }, [ui.campo(T('Procurar', 'Search'), busca)]));
    area.appendChild(bloco); desenhar();
    if (campoVideo) area.appendChild(el('p', { class: 'rf-dica', texto: T('Vídeos: cole o link do YouTube (youtu.be/…, watch?v=…, shorts/…). O app mostra o player ao abrir o item.', 'Videos: paste the YouTube link (youtu.be/…, watch?v=…, shorts/…). The app shows the player when the item opens.') }));
  }
  function editarColecao(app, col) {
    var novo = !col, x = col ? U.clonar(col) : { app: app, id: '', nome: {}, descricao: {}, campos: [{ id: 'nome', nome: N('Nome', 'Name'), tipo: 'bilingue' }], itens: [] };
    var id = ui.entrada(x.id, { attrs: { disabled: !novo, placeholder: 'ex.: equipamentos' } }), nome = ui.bilingue(T('Nome da coleção', 'Collection name'), x.nome), desc = ui.bilingue(T('Descrição', 'Description'), x.descricao);
    var caixa = el('div', { class: 'rf-form' });
    function desenhar() {
      U.limpar(caixa);
      x.campos.forEach(function (f, i) {
        var fid = ui.entrada(f.id, { attrs: { placeholder: 'id', disabled: !!f._fixo } }), fpt = ui.entrada(f.nome.pt, { attrs: { placeholder: 'PT' } }), fen = ui.entrada(f.nome.en, { attrs: { placeholder: 'EN' } });
        var ft = ui.escolha(Object.keys(TIPOS_CAMPO).map(function (k) { return [k, T(TIPOS_CAMPO[k])]; }), f.tipo);
        fid.onchange = function () { f.id = slug(fid.value); }; fpt.onchange = function () { f.nome.pt = fpt.value.trim(); }; fen.onchange = function () { f.nome.en = fen.value.trim(); }; ft.onchange = function () { f.tipo = ft.value; };
        caixa.appendChild(el('div', { class: 'rf-linha' }, [fid, fpt, fen, ft,
          ui.botao('↑', function () { if (i > 0) { x.campos.splice(i - 1, 0, x.campos.splice(i, 1)[0]); desenhar(); } }, 'p', { 'aria-label': T('Subir', 'Move up') }),
          ui.botao('✕', function () { x.campos.splice(i, 1); desenhar(); }, 'p', { 'aria-label': T('Tirar campo', 'Remove field') })]));
      });
      caixa.appendChild(ui.botao('+ ' + T('campo', 'field'), function () { x.campos.push({ id: '', nome: { pt: '', en: '' }, tipo: 'texto' }); desenhar(); }, 'p'));
    }
    desenhar();
    var rod = [];
    if (!novo && RF.pode('conteudo:excluir', app)) rod.push(ui.botao(T('Excluir coleção', 'Delete collection'), function () {
      ui.confirmar(T('Excluir coleção', 'Delete collection'), T('Apaga a coleção e os ', 'Deletes the collection and its ') + x.itens.length + T(' itens dela. O log guarda o que existia.', ' items. The log keeps what existed.'), { perigo: true, digitar: x.id, digitarRotulo: T('Digite o identificador: ', 'Type the identifier: ') + x.id }).then(function (ok) {
        if (!ok) return;
        C.db.conteudo = C.lista('conteudo').filter(function (y) { return !(y.app === app && y.id === x.id); });
        RF.mudar('conteudo', 'recursos', 'colecao-excluir', app + '/' + x.id, { id: x.id, itens: x.itens.length }, null, T('Coleção excluída: ', 'Collection deleted: ') + x.id).then(function () { colecaoAberta = null; ui.fecharModal(); RF.renderizar(); });
      });
    }, 'perigo'));
    rod.push(ui.botao(T('Salvar', 'Save'), function () {
      var y = Object.assign({}, x, { id: novo ? slug(id.value) : x.id, nome: nome.valor(), descricao: desc.valor(), campos: x.campos.filter(function (f) { return f.id; }) });
      if (!y.id || !y.nome.pt || !y.nome.en) return ui.aviso(T('Identificador e nome PT/EN.', 'Identifier and name PT/EN.'), 'erro');
      if (!y.campos.length) return ui.aviso(T('Pelo menos um campo.', 'At least one field.'), 'erro');
      if (y.campos.some(function (f) { return !f.nome.pt || !f.nome.en; })) return ui.aviso(T('Cada campo precisa de nome PT e EN.', 'Each field needs a PT and EN name.'), 'erro');
      if (novo && colecao(app, y.id)) return ui.aviso(T('Já existe uma coleção com esse identificador.', 'A collection with that identifier already exists.'), 'erro');
      if (novo) C.lista('conteudo').push(y); else C.db.conteudo = C.lista('conteudo').map(function (z) { return z.app === app && z.id === y.id ? y : z; });
      RF.mudar('conteudo', 'recursos', novo ? 'colecao-criar' : 'colecao-editar', app + '/' + y.id, col ? { campos: col.campos } : null, { campos: y.campos }, T('Coleção salva: ', 'Collection saved: ') + y.id + ' (' + H.nomeApp(app) + ')').then(function () { colecaoAberta = y.id; ui.fecharModal(); RF.renderizar(); });
    }, 'pri'));
    ui.modal((novo ? T('Nova coleção', 'New collection') : T('Campos de ', 'Fields of ') + T(x.nome)) + ' · ' + H.nomeApp(app), el('div', { class: 'rf-form' }, [
      ui.campo(T('Identificador', 'Identifier'), id), nome, desc,
      el('fieldset', { class: 'rf-bilingue' }, [el('legend', { texto: T('Campos (id · nome PT · nome EN · tipo). O primeiro campo é o título do item.', 'Fields (id · PT name · EN name · type). The first field is the item title.') }), caixa])
    ]), { largo: true, rodape: rod });
  }

  /* editor de item: formulário gerado pelos campos da coleção */
  function editarItem(app, col, it) {
    var novo = !it, x = it ? U.clonar(it) : { id: '', valores: {}, ativo: true, ordem: col.itens.length };
    var podeEd = novo ? RF.pode('conteudo:criar', app) : RF.pode('conteudo:editar', app);
    var idIn = ui.entrada(x.id, { attrs: { disabled: !novo, placeholder: 'ex.: leg-press' } });
    var leitores = [], form = el('div', { class: 'rf-form' }, [ui.campo(T('Identificador (o app liga por ele; não muda depois)', 'Identifier (the app links by it; cannot change later)'), idIn)]);
    col.campos.forEach(function (f) {
      var v = x.valores[f.id], le;
      if (f.tipo === 'bilingue' || f.tipo === 'bilingue-longo') { var b = ui.bilingue(T(f.nome), v || {}, f.tipo === 'bilingue-longo' ? { linhas: 4 } : {}); form.appendChild(b); le = function () { return b.valor(); }; }
      else if (f.tipo === 'texto' || f.tipo === 'texto-longo') { var i1 = ui.entrada(v || '', f.tipo === 'texto-longo' ? { linhas: 4 } : {}); form.appendChild(ui.campo(T(f.nome), i1)); le = function () { return i1.value.trim(); }; }
      else if (f.tipo === 'numero') { var i2 = ui.entrada(v === undefined ? '' : v, { tipo: 'number' }); form.appendChild(ui.campo(T(f.nome), i2)); le = function () { return i2.value === '' ? null : parseFloat(i2.value); }; }
      else if (f.tipo === 'sim-nao') { var m = ui.marca(T(f.nome), !!v); form.appendChild(m); le = function () { return m.querySelector('input').checked; }; }
      else if (f.tipo === 'lista') { var i3 = ui.entrada((v || []).join(', ')); form.appendChild(ui.campo(T(f.nome) + ' ' + T('(separadas por vírgula)', '(comma separated)'), i3)); le = function () { return i3.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean); }; }
      else if (f.tipo === 'links') { var i4 = ui.entrada((v || []).join('\n'), { linhas: 3, attrs: { placeholder: 'https://…' } }); form.appendChild(ui.campo(T(f.nome) + ' ' + T('(um por linha)', '(one per line)'), i4)); le = function () { return i4.value.split('\n').map(function (s) { return s.trim(); }).filter(function (s) { return /^https?:\/\//.test(s); }); }; }
      else if (f.tipo === 'videos') { var cv = campoVideos(f, v || []); form.appendChild(cv.no); le = cv.ler; }
      else if (f.tipo === 'imagens') { var ci = campoImagens(app, col, x, f, v || []); form.appendChild(ci.no); le = ci.ler; }
      else { var i5 = ui.entrada(v || ''); form.appendChild(ui.campo(T(f.nome), i5)); le = function () { return i5.value; }; }
      leitores.push({ id: f.id, ler: le });
    });
    var ativo = ui.marca(T('Publicável (desmarcado = fica guardado mas não vai para o app)', 'Publishable (unticked = kept here but not sent to the app)'), x.ativo !== false);
    form.appendChild(ativo);
    if (!podeEd) Array.prototype.forEach.call(form.querySelectorAll('input,select,textarea,button'), function (n) { n.disabled = true; });
    var rod = [];
    if (!novo && RF.pode('conteudo:excluir', app)) rod.push(ui.botao(T('Excluir', 'Delete'), function () {
      ui.confirmar(T('Excluir item', 'Delete item'), tituloItem(col, x), { perigo: true }).then(function (ok) {
        if (!ok) return;
        col.itens = col.itens.filter(function (y) { return y.id !== x.id; });
        RF.mudar('conteudo', 'recursos', 'item-excluir', app + '/' + col.id + '/' + x.id, it, null, T('Item excluído: ', 'Item deleted: ') + col.id + '/' + x.id).then(function () { ui.fecharModal(); RF.renderizar(); });
      });
    }, 'perigo'));
    if (podeEd) rod.push(ui.botao(T('Salvar', 'Save'), function () {
      var y = Object.assign({}, x, { id: novo ? slug(idIn.value) : x.id, ativo: ativo.querySelector('input').checked, atualizadoEm: U.agora(), valores: {} });
      leitores.forEach(function (l) { y.valores[l.id] = l.ler(); });
      if (!y.id) return ui.aviso(T('Dê um identificador.', 'Give it an identifier.'), 'erro');
      if (novo && col.itens.some(function (z) { return z.id === y.id; })) return ui.aviso(T('Já existe um item com esse identificador.', 'An item with that identifier already exists.'), 'erro');
      if (novo) col.itens.push(y); else col.itens = col.itens.map(function (z) { return z.id === y.id ? y : z; });
      RF.mudar('conteudo', 'recursos', novo ? 'item-criar' : 'item-editar', app + '/' + col.id + '/' + y.id, it, y, T('Item salvo: ', 'Item saved: ') + col.id + '/' + y.id + ' (' + H.nomeApp(app) + ')').then(function () { ui.fecharModal(); RF.renderizar(); ui.aviso(T('Salvo. Publique para o app mostrar.', 'Saved. Publish so the app shows it.')); });
    }, 'pri'));
    ui.modal((novo ? T('Novo item', 'New item') : tituloItem(col, x)) + ' · ' + T(col.nome), form, { largo: true, rodape: rod });
  }
  function campoVideos(f, lista) {
    var itens = lista.slice(), caixa = el('div', { class: 'rf-videos' });
    var entrada = ui.entrada('', { tipo: 'url', attrs: { placeholder: 'https://youtu.be/…' } });
    function desenhar() {
      U.limpar(caixa);
      itens.forEach(function (id, i) {
        caixa.appendChild(el('div', { class: 'rf-video' }, [
          el('img', { src: 'https://img.youtube.com/vi/' + id + '/mqdefault.jpg', alt: '', loading: 'lazy' }),
          el('a', { href: 'https://youtu.be/' + id, target: '_blank', rel: 'noopener', class: 'rf-mono', texto: id }),
          ui.botao('✕', function () { itens.splice(i, 1); desenhar(); }, 'p', { 'aria-label': T('Tirar vídeo', 'Remove video') })]));
      });
    }
    desenhar();
    var add = ui.botao('+ ' + T('Adicionar', 'Add'), function () {
      var id = youtubeId(entrada.value);
      if (!id) return ui.aviso(T('Não parece um link do YouTube.', 'Does not look like a YouTube link.'), 'erro');
      if (itens.indexOf(id) === -1) itens.push(id); entrada.value = ''; desenhar();
    }, 'p');
    entrada.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); add.click(); } });
    return { no: el('fieldset', { class: 'rf-bilingue' }, [el('legend', { texto: '▶ ' + T(f.nome) }), caixa, el('div', { class: 'rf-linha' }, [entrada, add])]), ler: function () { return itens.slice(); } };
  }
  function campoImagens(app, col, item, f, lista) {
    var itens = lista.slice(), caixa = el('div', { class: 'rf-fotos' }), temToken = !!(C.obj('config').github && C.obj('config').github.token);
    function desenhar() {
      U.limpar(caixa);
      itens.forEach(function (url, i) {
        caixa.appendChild(el('div', { class: 'rf-foto' }, [el('img', { src: url, alt: '', loading: 'lazy' }),
          el('div', { class: 'rf-acoes' }, [i > 0 ? ui.botao('◀', function () { itens.splice(i - 1, 0, itens.splice(i, 1)[0]); desenhar(); }, 'p', { 'aria-label': T('Mover para a esquerda', 'Move left') }) : null,
            ui.botao('✕', function () { itens.splice(i, 1); desenhar(); }, 'p', { 'aria-label': T('Tirar foto', 'Remove photo') })])]));
      });
    }
    desenhar();
    var arquivo = el('input', { type: 'file', accept: 'image/*', multiple: true, style: { display: 'none' } });
    var btSubir = ui.botao('📷 ' + T('Enviar fotos', 'Upload photos'), function () {
      if (!temToken) return ui.aviso(T('Para subir fotos, salve o token do GitHub em Integrações. Enquanto isso, cole o endereço de uma imagem já publicada.', 'To upload photos, save the GitHub token in Integrations. Meanwhile, paste the address of an already published image.'), 'info');
      arquivo.click();
    }, 'p');
    arquivo.onchange = function () {
      var fs = Array.prototype.slice.call(arquivo.files || []); if (!fs.length) return;
      var itemId = item.id || slug(document.querySelector('.rf-modal input') && document.querySelector('.rf-modal input').value) || 'item';
      ui.aviso(T('Enviando ', 'Uploading ') + fs.length + T(' foto(s)…', ' photo(s)…'), 'info');
      fs.reduce(function (p, fx) { return p.then(function () { return subirFoto(app, col.id, itemId, fx).then(function (url) { itens.push(url); desenhar(); }); }); }, Promise.resolve())
        .then(function () { ui.aviso(T('Fotos publicadas no solverone-dados.', 'Photos published to solverone-dados.')); RF.Log.registrar('recursos', 'foto', app + '/' + col.id + '/' + itemId, null, { quantas: fs.length }, T('Fotos enviadas: ', 'Photos uploaded: ') + fs.length); })
        .catch(function (e) { ui.aviso(e.message === 'sem-token' ? T('Sem token do GitHub.', 'No GitHub token.') : e.message === 'token' ? T('O GitHub recusou o token.', 'GitHub rejected the token.') : T('Não deu para enviar: ', 'Could not upload: ') + e.message, 'erro'); });
      arquivo.value = '';
    };
    var url = ui.entrada('', { tipo: 'url', attrs: { placeholder: T('ou cole o endereço https:// de uma imagem', 'or paste an https:// image address') } });
    var btUrl = ui.botao('+', function () { if (!/^https:\/\//.test(url.value.trim())) return ui.aviso(T('Endereço precisa começar com https://', 'Address must start with https://'), 'erro'); itens.push(url.value.trim()); url.value = ''; desenhar(); }, 'p', { 'aria-label': T('Adicionar endereço', 'Add address') });
    return { no: el('fieldset', { class: 'rf-bilingue' }, [el('legend', { texto: '🖼 ' + T(f.nome) }), caixa, el('div', { class: 'rf-linha' }, [btSubir, url, btUrl]), arquivo,
      el('small', { class: 'rf-dica', texto: T('As fotos são reduzidas a 1280 px e enviadas para solverone-dados/conteudo/… pelo seu token; o item guarda só o endereço.', 'Photos are shrunk to 1280 px and sent to solverone-dados/conteudo/… with your token; the item keeps only the address.') })]), ler: function () { return itens.slice(); } };
  }

  RF.Recursos = { garantir: garantir, arquivosMaster: arquivosMaster, recursosDe: recursosDe, comportamentosDe: comportamentosDe, colecoesDe: colecoesDe, youtubeId: youtubeId, tituloItem: tituloItem,
    abrirColecao: function (app, id) { estado.app = app; estado.aba = 'conteudo'; colecaoAberta = id; RF.Rota.ir('recursos', app, 'conteudo'); } };
})(window);
