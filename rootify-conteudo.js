/* =====================================================================
   RootifyONE — CONTEÚDO DOS APPS
   Texto, foto e vídeos de itens que cada app mostra (hoje: os aparelhos de
   academia do RiseONE). Quem gerencia é a equipe do RootifyONE (admin da
   plataforma ou admin do app), não o usuário nem o personal.

   Por que existe: trocar o texto de um aparelho, subir uma foto nova ou
   acrescentar um vídeo do YouTube não pode exigir commit no repositório do
   app. Aqui a pessoa edita, confere e publica; o app lê o arquivo master
   (solverone-dados/conteudo/<app>/<tipo>.json) na próxima abertura, com a
   cópia local do próprio app como reserva.

   Formato do arquivo master (o mesmo que virará coleção no Firestore):
   { formato:1, geradoEm, app, aparelhos:[ { id, nome:{pt,en}, descricao:{pt,en},
     termos, grupos:[...], foto, videos:[{titulo,url}], ativo } ] }
   foto: "conteudo/<app>/fotos/<id>.jpg" (publicada junto), "app:<caminho>"
   (arquivo do próprio app) ou "https://…".
   ===================================================================== */
(function (raiz) {
  'use strict';
  var RF = raiz.RF, U = RF.util, T = U.T, el = U.el, ui = RF.ui, C = RF.Cofre, H = RF.h;

  /* tipos de conteúdo por app: declarar aqui o que cada app expõe para edição */
  var TIPOS = {
    'rise-one': [{
      id: 'aparelho', lista: 'aparelhos', arquivo: 'conteudo/rise-one/aparelhos.json', importar: 'conteudo-aparelhos.json',
      nome: T('Aparelhos de academia', 'Gym equipment'),
      grupos: [['pernas', T('Pernas', 'Legs')], ['bracos', T('Braços', 'Arms')], ['peito', T('Peito', 'Chest')], ['costas', T('Costas', 'Back')],
        ['ombros', T('Ombros', 'Shoulders')], ['abdomen', T('Abdômen', 'Core')], ['cadeiras', T('Cadeiras e bancos', 'Seats and benches')],
        ['polias', T('Polias e cabos', 'Pulleys and cables')], ['cardio', T('Cardio', 'Cardio')], ['livre', T('Sem aparelho', 'No machine')]]
    }]
  };
  function tiposDe(app) { return TIPOS[app] || []; }
  function appsComConteudo() { return C.lista('apps').filter(function (a) { return tiposDe(a.id).length && RF.noEscopo(a.id); }); }
  function itens(app, tipo) { return C.lista('conteudo').filter(function (x) { return x.app === app && x.tipo === tipo; }); }
  function chaveLivre(app, tipo, base) {
    var k = U.semAcento(base || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item', n = 1, kk = k;
    while (itens(app, tipo).some(function (x) { return x.chave === kk; })) kk = k + '-' + (++n);
    return kk;
  }
  function ytId(url) { var m = String(url || '').match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([A-Za-z0-9_-]{6,})/); return m ? m[1] : ''; }

  /* foto: reduz no navegador (≤ 900 px, JPEG) antes de guardar no cofre — celular simples e repositório leve */
  function lerFoto() {
    return new Promise(function (ok) {
      var i = el('input', { type: 'file', accept: 'image/*', style: { display: 'none' } });
      i.onchange = function () {
        var f = i.files[0]; i.remove(); if (!f) return ok(null);
        var r = new FileReader();
        r.onload = function () {
          var im = new Image();
          im.onload = function () {
            var k = Math.min(1, 900 / Math.max(im.width, im.height)), c = document.createElement('canvas');
            c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
            var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
            ok({ dados: c.toDataURL('image/jpeg', 0.82), nome: f.name });
          };
          im.onerror = function () { ok(null); };
          im.src = r.result;
        };
        r.readAsDataURL(f);
      };
      document.body.appendChild(i); i.click();
    });
  }
  function fotoSrc(x) {
    if (!x.foto) return '';
    if (x.foto.dados) return x.foto.dados;
    if (x.foto.url) {
      if (/^app:/.test(x.foto.url)) { var a = H.app(x.app); return (a && a.url ? a.url : '') + x.foto.url.slice(4); }
      return x.foto.url;
    }
    return '';
  }
  function miniatura(x) {
    var src = fotoSrc(x);
    return src ? el('img', { src: src, alt: '', class: 'rf-cont-mini', loading: 'lazy' }) : el('span', { class: 'rf-cont-mini rf-cont-sem', texto: '—' });
  }

  /* importa do próprio app a lista de reserva (ids, nomes, textos, grupos e fotos já publicadas no app) */
  function importarDoApp(app, tipo) {
    var a = H.app(app); if (!a || !a.url) return Promise.reject(new Error('app'));
    return fetch(a.url.replace(/\/?$/, '/') + tipo.importar, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('http-' + r.status); return r.json(); })
      .then(function (j) {
        var lista = j && j[tipo.lista]; if (!Array.isArray(lista)) throw new Error('formato');
        var jaTem = {}; itens(app, tipo.id).forEach(function (x) { jaTem[x.chave] = x; });
        var novos = 0, agora = U.agora();
        lista.forEach(function (it) {
          if (!it || !it.id || jaTem[it.id]) return;
          C.lista('conteudo').push({ id: U.uid('ct-'), app: app, tipo: tipo.id, chave: it.id, nome: it.nome || {}, descricao: it.descricao || {},
            termos: it.termos || '', grupos: it.grupos || [], foto: it.foto ? { url: it.foto } : null, videos: it.videos || [], ativo: it.ativo !== false, atualizadoEm: agora, origem: 'app' });
          novos++;
        });
        return RF.mudar('conteudo', 'conteudo-apps', 'importar', app + '/' + tipo.id, null, { novos: novos }, T('Importados do app: ', 'Imported from the app: ') + novos + ' (' + app + ')').then(function () { return novos; });
      });
  }

  /* ---- tela ---- */
  var estado = { app: '', tipo: '', q: '', grupo: '' };
  RF.telas['conteudo-apps'] = function (area, rota) {
    var apps = appsComConteudo();
    if (rota && rota.sub && apps.some(function (a) { return a.id === rota.sub; })) estado.app = rota.sub;
    if (!estado.app || !apps.some(function (a) { return a.id === estado.app; })) estado.app = apps.length ? apps[0].id : '';
    var tipos = tiposDe(estado.app), tipo = tipos.filter(function (t) { return t.id === estado.tipo; })[0] || tipos[0];
    estado.tipo = tipo ? tipo.id : '';
    var acoes = [];
    if (tipo) {
      acoes.push(ui.botaoSe('conteudo:criar', estado.app, '+ ' + T('Novo item', 'New item'), function () { editar(null, estado.app, tipo); }, 'pri'));
      acoes.push(ui.botaoSe('conteudo:criar', estado.app, '⬇ ' + T('Importar do app', 'Import from the app'), function () {
        importarDoApp(estado.app, tipo).then(function (n) { ui.aviso(n ? n + T(' itens importados.', ' items imported.') : T('Nada novo: tudo já estava aqui.', 'Nothing new: everything was already here.')); RF.renderizar(); })
          .catch(function (e) { ui.aviso(T('Não consegui ler o app (', 'Could not read the app (') + e.message + T('). Confira o endereço do app e a internet.', '). Check the app address and the connection.'), 'erro'); });
      }, ''));
    }
    RF.pagina(area, 'conteudo-apps', T('Texto, foto e vídeos do que cada app mostra. Edite aqui, confira e publique: o app lê na próxima abertura, sem commit.',
      'Text, photo and videos of what each app shows. Edit here, check and publish: the app reads it on its next opening, no commit.'), acoes);
    if (!apps.length) { area.appendChild(el('div', { class: 'rf-vazio' }, [el('p', { texto: T('Nenhum app com conteúdo editável no seu escopo.', 'No app with editable content in your scope.') })])); return; }

    /* app › tipo (abas), como manda o padrão: uma tela, partes por app */
    area.appendChild(ui.abas(apps.map(function (a) { return { id: a.id, nome: a.glifo + ' ' + T(a.nome), conta: tiposDe(a.id).reduce(function (n, t) { return n + itens(a.id, t.id).length; }, 0) }; }),
      estado.app, function (id) { estado.app = id; estado.tipo = ''; estado.grupo = ''; RF.Rota.ir('conteudo-apps', id); }));
    if (tipos.length > 1) area.appendChild(ui.abas(tipos.map(function (t) { return { id: t.id, nome: t.nome, conta: itens(estado.app, t.id).length }; }), estado.tipo, function (id) { estado.tipo = id; RF.renderizar(); }));
    if (!tipo) return;

    var lista = itens(estado.app, tipo.id);
    if (!lista.length) {
      area.appendChild(el('div', { class: 'rf-vazio' }, [el('p', { texto: T('Comece importando o que o app já tem: ids, nomes, textos e fotos. Depois é só editar.', 'Start by importing what the app already has: ids, names, texts and photos. Then just edit.') })]));
    }
    var busca = ui.entrada(estado.q, { tipo: 'search', attrs: { placeholder: T('Buscar por nome, id ou termo', 'Search by name, id or term'), 'aria-label': T('Buscar', 'Search') } });
    busca.oninput = function () { estado.q = busca.value; desenharLista(); };
    var grupoSel = ui.escolha([['', T('Todos os grupos', 'All groups')]].concat(tipo.grupos), estado.grupo);
    grupoSel.onchange = function () { estado.grupo = grupoSel.value; desenharLista(); };
    area.appendChild(el('div', { class: 'rf-grade-2' }, [ui.campo(T('Buscar', 'Search'), busca), ui.campo(T('Grupo', 'Group'), grupoSel)]));
    var alvo = el('div', {}); area.appendChild(alvo);
    function desenharLista() {
      U.limpar(alvo);
      var q = U.semAcento(estado.q).toLowerCase();
      var vis = lista.filter(function (x) {
        if (estado.grupo && (x.grupos || []).indexOf(estado.grupo) === -1) return false;
        if (!q) return true;
        var hay = U.semAcento([x.chave, T(x.nome), x.nome && x.nome.en, x.termos, T(x.descricao)].join(' ')).toLowerCase();
        return hay.indexOf(q) !== -1;
      });
      alvo.appendChild(ui.tabela([
        { id: 'f', nome: T('Foto', 'Photo'), desenhar: miniatura },
        { id: 'n', nome: T('Nome', 'Name'), valor: function (x) { return T(x.nome) || x.chave; } },
        { id: 'k', nome: 'id', valor: function (x) { return x.chave; } },
        { id: 'g', nome: T('Grupos', 'Groups'), valor: function (x) { return (x.grupos || []).map(function (g) { var o = tipo.grupos.filter(function (p) { return p[0] === g; })[0]; return o ? o[1] : g; }).join(', '); } },
        { id: 'v', nome: T('Vídeos', 'Videos'), valor: function (x) { return String((x.videos || []).length); } },
        { id: 'e', nome: T('Situação', 'Status'), desenhar: function (x) {
          if (x.ativo === false) return ui.selo(T('desligado', 'off'), 'cinza');
          if (!x.descricao || !x.descricao.pt || !x.descricao.en) return ui.selo(T('falta texto', 'text missing'), 'atencao');
          return ui.selo(T('pronto', 'ready'), 'ok');
        } }
      ], vis, { porPagina: 30, aoClicar: function (x) { editar(x, estado.app, tipo); }, vazio: T('Nenhum item com esse filtro.', 'No item matches that filter.') }));
    }
    desenharLista();
    area.appendChild(el('p', { class: 'rf-dica', texto: T('Depois de editar, vá em Publicar: o arquivo conteudo/' + estado.app + '/' + tipo.lista + '.json e as fotos novas sobem para o solverone-dados.',
      'After editing, go to Publish: the file conteudo/' + estado.app + '/' + tipo.lista + '.json and new photos go to solverone-dados.') }));
  };

  function editar(x, app, tipo) {
    var novo = !x, orig = x ? U.clonar(x) : null;
    x = x ? U.clonar(x) : { id: U.uid('ct-'), app: app, tipo: tipo.id, chave: '', nome: {}, descricao: {}, termos: '', grupos: [], foto: null, videos: [], ativo: true };
    var podeEd = RF.pode(novo ? 'conteudo:criar' : 'conteudo:editar', app);
    var nome = ui.bilingue(T('Nome', 'Name'), x.nome);
    var desc = ui.bilingue(T('O que é, em uma frase simples', 'What it is, in one plain sentence'), x.descricao, { linhas: 2 });
    var chave = ui.entrada(x.chave, { attrs: { placeholder: 'ex.: esteira', disabled: !novo } });
    var termos = ui.entrada(x.termos, { attrs: { placeholder: T('palavras que o povo usa: escada de madeira, peso de mão…', 'everyday words people use') } });
    var grupos = el('div', { class: 'rf-cont-grupos' }, tipo.grupos.map(function (g) { return ui.marca(g[1], (x.grupos || []).indexOf(g[0]) !== -1, { value: g[0] }); }));
    var ativo = ui.marca(T('Aparece no app', 'Shown in the app'), x.ativo !== false);

    /* foto */
    var fotoBox = el('div', { class: 'rf-cont-foto' });
    function pintarFoto() {
      U.limpar(fotoBox);
      var src = fotoSrc(x);
      fotoBox.appendChild(src ? el('img', { src: src, alt: '', class: 'rf-cont-preview' }) : el('p', { class: 'rf-dica', texto: T('Sem foto: o app mostra o desenho em linha.', 'No photo: the app shows the line drawing.') }));
      if (x.foto && x.foto.url && /^app:/.test(x.foto.url)) fotoBox.appendChild(el('p', { class: 'rf-dica', texto: T('Foto que já está no app (', 'Photo already in the app (') + x.foto.url.slice(4) + ')' }));
      if (podeEd) fotoBox.appendChild(el('div', { class: 'rf-acoes' }, [
        ui.botao('📷 ' + T('Enviar foto', 'Upload photo'), function () { lerFoto().then(function (f) { if (!f) return; x.foto = { dados: f.dados, nome: f.nome }; pintarFoto(); }); }, ''),
        ui.botao('🔗 ' + T('Usar endereço', 'Use a link'), function () {
          var u = prompt(T('Endereço https da foto (ou app:aparelhos/x.png para um arquivo do app):', 'https address of the photo (or app:aparelhos/x.png for a file in the app):'), (x.foto && x.foto.url) || '');
          if (u === null) return; u = u.trim(); x.foto = u ? { url: u } : null; pintarFoto();
        }, ''),
        x.foto ? ui.botao(T('Tirar foto', 'Remove photo'), function () { x.foto = null; pintarFoto(); }, 'p') : null
      ]));
    }
    pintarFoto();

    /* vídeos do YouTube */
    var vidBox = el('div', { class: 'rf-cont-videos' });
    function pintarVideos() {
      U.limpar(vidBox);
      (x.videos || []).forEach(function (v, i) {
        var y = ytId(v.url);
        vidBox.appendChild(el('div', { class: 'rf-cont-video' }, [
          y ? el('img', { src: 'https://img.youtube.com/vi/' + y + '/default.jpg', alt: '', loading: 'lazy' }) : el('span', { class: 'rf-selo rf-selo-erro', texto: T('link inválido', 'invalid link') }),
          el('div', { class: 'rf-cont-video-t' }, [el('strong', { texto: v.titulo || '—' }), el('small', { texto: v.url })]),
          podeEd ? ui.botao('✕', function () { x.videos.splice(i, 1); pintarVideos(); }, 'p', { 'aria-label': T('Tirar vídeo', 'Remove video') }) : null
        ]));
      });
      if (podeEd) {
        var tit = ui.entrada('', { attrs: { placeholder: T('Título do vídeo', 'Video title') } }), url = ui.entrada('', { attrs: { placeholder: 'https://www.youtube.com/watch?v=…', inputmode: 'url' } });
        vidBox.appendChild(el('div', { class: 'rf-cont-video-add' }, [tit, url, ui.botao('+ ' + T('Adicionar', 'Add'), function () {
          if (!ytId(url.value)) return ui.aviso(T('Cole um link do YouTube (watch?v=, youtu.be ou shorts).', 'Paste a YouTube link (watch?v=, youtu.be or shorts).'), 'erro');
          x.videos = x.videos || []; x.videos.push({ titulo: tit.value.trim(), url: url.value.trim() }); pintarVideos();
        }, '')]));
      }
    }
    pintarVideos();

    var corpo = el('div', { class: 'rf-form' }, [
      el('div', { class: 'rf-grade-2' }, [ui.campo('id ' + T('(sem acento, sem espaço; não muda depois)', '(no accents or spaces; cannot change later)'), chave), ui.campo(T('Termos de busca', 'Search terms'), termos)]),
      nome, desc,
      ui.campo(T('Grupos', 'Groups'), grupos),
      ui.secao(T('Foto', 'Photo'), [fotoBox]),
      ui.secao(T('Vídeos do YouTube', 'YouTube videos'), [vidBox, el('p', { class: 'rf-dica', texto: T('No app, o vídeo só carrega quando a pessoa toca (youtube-nocookie). Confira os direitos do vídeo antes de publicar.', 'In the app the video loads only when tapped (youtube-nocookie). Check the video rights before publishing.') })]),
      ativo
    ]);
    if (!podeEd) Array.prototype.forEach.call(corpo.querySelectorAll('input,select,textarea'), function (i) { i.disabled = true; });
    var rod = [];
    if (!novo && RF.pode('conteudo:excluir', app)) rod.push(ui.botao(T('Excluir', 'Delete'), function () {
      ui.confirmar(T('Excluir item', 'Delete item'), T('Some do RootifyONE e, na próxima publicação, do app. O app volta ao texto de reserva dele, se tiver.', 'Removed from RootifyONE and, on the next publication, from the app. The app falls back to its own reserve text, if any.'))
        .then(function (ok) { if (!ok) return; C.db.conteudo = C.lista('conteudo').filter(function (y) { return y.id !== x.id; });
          RF.mudar('conteudo', 'conteudo-apps', 'excluir', x.chave, orig, null, T('Item excluído: ', 'Item deleted: ') + x.chave).then(function () { ui.fecharModal(); RF.renderizar(); }); });
    }, 'perigo'));
    if (podeEd) rod.push(ui.botao(T('Salvar', 'Save'), function () {
      var y = Object.assign({}, x, { nome: nome.valor(), descricao: desc.valor(), termos: termos.value.trim(), ativo: ativo.querySelector('input').checked,
        grupos: Array.prototype.map.call(grupos.querySelectorAll('input:checked'), function (i) { return i.value; }), atualizadoEm: U.agora() });
      if (novo) { y.chave = chaveLivre(app, tipo.id, chave.value.trim() || y.nome.pt); }
      if (!y.nome.pt || !y.nome.en) return ui.aviso(T('Nome em PT e EN.', 'Name in PT and EN.'), 'erro');
      if (!y.descricao.pt || !y.descricao.en) return ui.aviso(T('Texto em PT e EN: é o que a pessoa lê para reconhecer o aparelho.', 'Text in PT and EN: it is what people read to recognise the machine.'), 'erro');
      if ((y.videos || []).some(function (v) { return !ytId(v.url); })) return ui.aviso(T('Há vídeo com link inválido.', 'A video has an invalid link.'), 'erro');
      if (novo) C.lista('conteudo').push(y); else C.db.conteudo = C.lista('conteudo').map(function (z) { return z.id === y.id ? y : z; });
      RF.mudar('conteudo', 'conteudo-apps', novo ? 'criar' : 'editar', y.chave, orig, resumo(y), T('Conteúdo salvo: ', 'Content saved: ') + y.chave).then(function () { ui.fecharModal(); RF.renderizar(); });
    }, 'pri'));
    ui.modal(novo ? T('Novo item', 'New item') : (T(x.nome) || x.chave), corpo, { largo: true, rodape: rod });
  }
  /* o log não guarda a foto inteira (base64): só que existe e o tamanho */
  function resumo(y) { var r = U.clonar(y); if (r.foto && r.foto.dados) r.foto = { enviada: true, bytes: r.foto.dados.length }; return r; }

  /* ---- arquivos master (chamado pelo gerador de Publicar) ---- */
  function arquivos() {
    var saida = [], hoje = U.agora();
    Object.keys(TIPOS).forEach(function (app) {
      TIPOS[app].forEach(function (tipo) {
        var lista = itens(app, tipo.id);
        if (!lista.length) return;
        var fotos = [];
        var objs = lista.map(function (x) {
          var foto = '';
          if (x.foto && x.foto.dados) {
            var ext = /^data:image\/png/.test(x.foto.dados) ? 'png' : 'jpg';
            var nome = 'conteudo/' + app + '/fotos/' + x.chave + '.' + ext, b64 = x.foto.dados.split(',')[1] || '';
            fotos.push({ nome: nome, base64: b64, texto: '[foto ' + ext + ' ' + b64.length + ' bytes base64]' });
            foto = nome;
          } else if (x.foto && x.foto.url) foto = x.foto.url;
          return { id: x.chave, nome: x.nome, descricao: x.descricao, termos: x.termos || '', grupos: x.grupos || [], foto: foto, videos: (x.videos || []).map(function (v) { return { titulo: v.titulo || '', url: v.url }; }), ativo: x.ativo !== false, atualizadoEm: x.atualizadoEm || null };
        });
        var o = { formato: 1, geradoEm: hoje, geradoPor: 'RootifyONE ' + RF.VERSAO, app: app, tipo: tipo.id };
        o[tipo.lista] = objs;
        saida.push({ nome: tipo.arquivo, texto: JSON.stringify(o, null, 2) + '\n' });
        saida = saida.concat(fotos);
      });
    });
    return saida;
  }
  function conferir(erros, avisos) {
    C.lista('conteudo').forEach(function (x) {
      if (x.ativo === false) return;
      var onde = T('Conteúdo ', 'Content ') + x.app + '/' + x.chave;
      if (!x.nome || !x.nome.pt || !x.nome.en) erros.push(onde + T(': nome em PT e EN', ': name in PT and EN'));
      if (!x.descricao || !x.descricao.pt || !x.descricao.en) erros.push(onde + T(': texto em PT e EN', ': text in PT and EN'));
      (x.videos || []).forEach(function (v) { if (!ytId(v.url)) erros.push(onde + T(': vídeo com link que não é do YouTube', ': video link is not YouTube')); });
      if (x.foto && x.foto.url && !/^(https:\/\/|app:)/.test(x.foto.url)) erros.push(onde + T(': foto precisa ser https:// ou app:', ': photo must be https:// or app:'));
    });
  }

  RF.Conteudo = { TIPOS: TIPOS, tiposDe: tiposDe, arquivos: arquivos, conferir: conferir, importar: importarDoApp, ytId: ytId };
})(window);
