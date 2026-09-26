/* =====================================================================
   RootifyONE — TELAS (1/2): painel, produto e clientes
   painel · apps · planos · serviços · usuários (CRM) · suporte · ajuda
   ===================================================================== */
(function (raiz) {
  'use strict';
  var RF = raiz.RF, U = RF.util, T = U.T, el = U.el, ui = RF.ui, C = RF.Cofre, S = RF.Sessao, D = RF.dados;
  var HORA = 3600000, DIA = 24 * HORA;

  /* ------------------------------------------------------------------
     AJUDANTES COMPARTILHADOS (também usados pela parte 2)
     ------------------------------------------------------------------ */
  var H = RF.h;
  H.app = function (id) { return C.lista('apps').filter(function (a) { return a.id === id; })[0] || null; };
  H.nomeApp = function (id) {
    if (!id || id === '*') return T('Todos os apps', 'All apps');
    var a = H.app(id); return a ? a.glifo + ' ' + T(a.nome) : id;
  };
  H.opcoesApps = function (incluirTodos, soEscopo) {
    var o = incluirTodos ? [['*', T('Todos os apps', 'All apps')]] : [];
    C.lista('apps').forEach(function (a) { if (!soEscopo || RF.noEscopo(a.id)) o.push([a.id, a.glifo + ' ' + T(a.nome)]); });
    return o;
  };
  H.plano = function (id) { return C.lista('planos').filter(function (p) { return p.id === id; })[0] || null; };
  H.nomePlano = function (id) { var p = H.plano(id); return p ? T(p.nome) : (id || '—'); };
  H.opcoesPlanos = function () { return C.lista('planos').map(function (p) { return [p.id, T(p.nome)]; }); };
  H.pessoaEquipe = function (id) { return C.equipe().filter(function (p) { return p.id === id; })[0] || null; };
  H.nomeEquipe = function (id) { var p = H.pessoaEquipe(id); return p ? p.nome : (id ? id : '—'); };
  H.opcoesEquipe = function (vazio) {
    var o = vazio ? [['', vazio]] : [];
    C.equipe().filter(function (p) { return p.ativo; }).forEach(function (p) { o.push([p.id, p.nome + ' (' + p.apelido + ')']); });
    return o;
  };
  H.usuario = function (id) { return C.lista('usuarios').filter(function (u) { return u.id === id; })[0] || null; };
  H.email = function (email) { return RF.pode('usuarios.pii:ver') ? (email || '—') : U.mascararEmail(email); };
  H.nomeCliente = function (ch) {
    var u = ch.usuario && H.usuario(ch.usuario);
    if (u) return u.nome;
    return ch.contato ? (ch.contato.nome || H.email(ch.contato.email)) : '—';
  };
  H.seloPrioridade = function (p) {
    var tipo = { urgente: 'erro', alta: 'atencao', normal: 'neutro', baixa: 'cinza' }[p] || 'neutro';
    return ui.selo(T(RF.cat.PRIORIDADES[p] || { pt: p, en: p }), tipo);
  };
  H.seloStatus = function (s) {
    var tipo = { novo: 'info', aberto: 'info', 'aguardando-cliente': 'atencao', 'aguardando-interno': 'atencao', resolvido: 'ok', fechado: 'cinza' }[s] || 'neutro';
    return ui.selo(T(RF.cat.STATUS_CHAMADO[s] || { pt: s, en: s }), tipo);
  };
  H.seloPrazo = function (ch) {
    var sit = D.Chamados.situacao(ch);
    var M = { ok: ['ok', '⏱ '], risco: ['atencao', '⚠ '], estourado: ['erro', '⛔ '], cumprido: ['ok', '✓ '] };
    var txt = sit === 'cumprido' ? T('no prazo', 'on time') : (sit === 'estourado' && (ch.status === 'resolvido' || ch.status === 'fechado')) ? T('fora do prazo', 'late') : D.Chamados.faltaTexto(ch);
    return ui.selo(M[sit][1] + txt, M[sit][0]);
  };
  H.idade = function (nasc) {
    if (!nasc) return '';
    var n = new Date(nasc), h = new Date(), i = h.getFullYear() - n.getFullYear();
    if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) i--;
    return isNaN(i) ? '' : i + T(' anos', ' years');
  };
  /* barras horizontais simples, uma série, rótulo e valor em texto */
  H.barras = function (titulo, pares) {
    var max = Math.max.apply(null, pares.map(function (p) { return p[1]; }).concat([1]));
    return el('figure', { class: 'rf-barras' }, [el('figcaption', { texto: titulo })].concat(pares.map(function (p) {
      return el('div', { class: 'rf-barra-lin', title: p[0] + ': ' + p[1] }, [
        el('span', { class: 'rf-barra-rot', texto: p[0] }),
        el('span', { class: 'rf-barra-trilho' }, [el('span', { class: 'rf-barra', style: { width: (p[1] / max * 100) + '%' } })]),
        el('span', { class: 'rf-barra-val', texto: String(p[1]) })
      ]);
    })));
  };
  H.contarPor = function (lista, fn) {
    var o = {}; lista.forEach(function (x) { var k = fn(x); o[k] = (o[k] || 0) + 1; });
    return Object.keys(o).map(function (k) { return [k, o[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
  };
  H.lerArquivo = function (aceita) {
    return new Promise(function (ok) {
      var i = el('input', { type: 'file', accept: aceita || '*/*', style: { display: 'none' } });
      i.onchange = function () {
        var f = i.files[0]; if (!f) return ok(null);
        var r = new FileReader(); r.onload = function () { ok({ nome: f.name, texto: r.result }); }; r.readAsText(f);
        i.remove();
      };
      document.body.appendChild(i); i.click();
    });
  };
  H.usuarioNoEscopo = function (u) {
    return !u.apps || !u.apps.length || u.apps.some(function (a) { return RF.noEscopo(a.app); });
  };

  /* ------------------------------------------------------------------
     PAINEL
     ------------------------------------------------------------------ */
  RF.telas.painel = function (area) {
    var p = S.pessoa, cfg = C.obj('config');
    var hora = new Date().getHours();
    var saud = hora < 12 ? T('Bom dia', 'Good morning') : hora < 18 ? T('Boa tarde', 'Good afternoon') : T('Boa noite', 'Good evening');
    RF.pagina(area, 'painel', saud + ', ' + p.nome.split(' ')[0] + ' · ' + U.data(U.agora()));

    if (cfg.exemplo) {
      area.appendChild(el('div', { class: 'rf-faixa-aviso' }, [
        el('span', { texto: '🧪 ' + T('Dados de exemplo carregados: nomes e e-mails são fictícios.', 'Sample data loaded: names and e-mails are fictitious.') }),
        RF.pode('configuracoes:editar') ? ui.botao(T('Remover dados de exemplo', 'Remove sample data'), function () {
          D.removerExemplo(); C.salvarTudo().then(function () { return RF.Log.registrar('configuracoes', 'exemplo-remover', '', null, null, T('Dados de exemplo removidos', 'Sample data removed')); }).then(RF.renderizar);
        }, 'p') : null]));
    } else if (!C.lista('usuarios').length && RF.pode('configuracoes:editar')) {
      area.appendChild(el('div', { class: 'rf-faixa-aviso rf-faixa-info' }, [
        el('span', { texto: T('Ainda não há usuários nem chamados. Quer ver tudo funcionando com dados fictícios?', 'No users or tickets yet. Want to see everything working with fictitious data?') }),
        ui.botao(T('Carregar dados de exemplo', 'Load sample data'), function () {
          D.exemplo(); C.salvarTudo().then(function () { return RF.Log.registrar('configuracoes', 'exemplo-carregar', '', null, null, T('Dados de exemplo carregados', 'Sample data loaded')); }).then(RF.renderizar);
        }, 'pri')]));
    }
    if (!p.cred.pin && !p.cred.webauthn) {
      area.appendChild(el('div', { class: 'rf-faixa-aviso rf-faixa-info' }, [
        el('span', { texto: '👆 ' + T('Deixe a entrada mais rápida: registre a digital ou um PIN.', 'Make sign-in faster: register your fingerprint or a PIN.') }),
        ui.botao(T('Configurar', 'Set up'), function () { RF.Rota.ir('configuracoes', 'seguranca'); }, 'p')]));
    }

    var cartoes = el('div', { class: 'rf-cartoes' });
    if (RF.pode('usuarios:ver')) {
      var us = C.lista('usuarios').filter(function (u) { return u.status !== 'excluido' && H.usuarioNoEscopo(u); });
      var ativos30 = us.filter(function (u) { return (u.apps || []).some(function (a) { return a.ultimoAcesso && Date.now() - new Date(a.ultimoAcesso) < 30 * DIA; }); }).length;
      cartoes.appendChild(ui.cartao(T('Usuários', 'Users'), us.length, ativos30 + T(' com acesso em 30 dias (registrado)', ' with access in 30 days (recorded)'), function () { RF.Rota.ir('usuarios'); }));
    }
    if (RF.pode('suporte:ver')) {
      var ab = D.Chamados.abertos().filter(function (c) { return RF.noEscopo(c.app); });
      var est = ab.filter(function (c) { return D.Chamados.situacao(c) === 'estourado'; }).length;
      cartoes.appendChild(ui.cartao(T('Chamados abertos', 'Open tickets'), ab.length, est ? est + T(' fora do prazo', ' past deadline') : T('todos no prazo', 'all on time'),
        function () { RF.Rota.ir('suporte'); }, est ? 'erro' : null));
    }
    if (RF.pode('privacidade:ver')) {
      var pe = D.Privacidade.abertos();
      var menor = pe.map(D.Privacidade.diasRestantes).sort(function (a, b) { return a - b; })[0];
      cartoes.appendChild(ui.cartao(T('Pedidos de privacidade', 'Privacy requests'), pe.length,
        pe.length ? T('prazo mais curto: ', 'shortest deadline: ') + menor + T(' dia(s)', ' day(s)') : T('nenhum aberto', 'none open'),
        function () { RF.Rota.ir('privacidade'); }, menor !== undefined && menor <= 3 ? 'erro' : null));
    }
    if (RF.pode('termos:ver')) {
      var rev = D.Termos.pendentesAprovacao().length;
      cartoes.appendChild(ui.cartao(T('Termos aguardando aprovação', 'Terms awaiting approval'), rev, T('aprovação por outra pessoa', 'approval by someone else'), function () { RF.Rota.ir('termos'); }, rev ? 'atencao' : null));
    }
    if (RF.pode('publicar:ver')) {
      var dif = D.diferencas(D.gerarArquivos()).filter(function (x) { return x.situacao !== 'igual'; }).length;
      cartoes.appendChild(ui.cartao(T('Arquivos para publicar', 'Files to publish'), dif, dif ? T('mudanças ainda não publicadas', 'changes not yet published') : T('tudo publicado', 'all published'), function () { RF.Rota.ir('publicar'); }, dif ? 'atencao' : null));
    }
    var falta = RF.cat.FUNCOES.filter(function (f) { return f.estado === 'especificar'; }).length;
    cartoes.appendChild(ui.cartao(T('Itens a especificar', 'Items needing a spec'), falta, T('decisões que destravam funções em cinza', 'decisions that unlock grey features'), function () { RF.Rota.ir('mapa'); }));
    area.appendChild(cartoes);

    var futuros = el('div', { class: 'rf-grade-2' }, [ui.cinza('painel.receita'), ui.cinza('painel.ativos')]);

    /* precisa de você */
    var lista = el('ul', { class: 'rf-pendencias' });
    if (RF.pode('suporte:ver')) D.Chamados.abertos().filter(function (c) { return RF.noEscopo(c.app) && D.Chamados.situacao(c) !== 'ok'; })
      .sort(function (a, b) { return new Date(a.prazoResposta) - new Date(b.prazoResposta); }).slice(0, 6).forEach(function (c) {
        lista.appendChild(el('li', {}, [H.seloPrazo(c), ' ', el('a', { href: '#/suporte/chamado/' + c.id, texto: '#' + c.numero + ' ' + c.assunto }), ' · ', H.nomeApp(c.app)]));
      });
    if (RF.pode('privacidade:ver')) D.Privacidade.abertos().filter(function (x) { return D.Privacidade.diasRestantes(x) <= 5; }).forEach(function (x) {
      lista.appendChild(el('li', {}, [ui.selo('⚖ ' + D.Privacidade.diasRestantes(x) + T(' dia(s)', ' day(s)'), 'atencao'), ' ',
        el('a', { href: '#/privacidade', texto: x.numero + ' · ' + T(RF.cat.TIPOS_PEDIDO_LGPD[x.tipo]) })]));
    });
    if (RF.pode('termos:aprovar')) D.Termos.pendentesAprovacao().forEach(function (t) {
      lista.appendChild(el('li', {}, [ui.selo(T('aprovar', 'approve'), 'info'), ' ', el('a', { href: '#/termos/termo/' + t.id, texto: T(D.Termos.ultima(t).titulo) })]));
    });
    if (!lista.children.length) lista.appendChild(el('li', { class: 'rf-dica', texto: T('Nada urgente agora. 🎉', 'Nothing urgent right now. 🎉') }));
    var colunas = el('div', { class: 'rf-grade-2' }, [ui.secao(T('Precisa de você', 'Needs you'), [lista])]);

    if (RF.pode('auditoria:ver')) {
      var ult = C.lista('log').slice(-8).reverse();
      colunas.appendChild(ui.secao(T('Atividade recente', 'Recent activity'), [el('ul', { class: 'rf-atividade' }, ult.map(function (e) {
        return el('li', {}, [el('small', { class: 'rf-dica', texto: U.data(e.quando, true) + ' · ' + e.quem }), el('br'), e.resumo || (e.modulo + ' · ' + e.acao)]);
      }))], [ui.botao(T('Ver log', 'View log'), function () { RF.Rota.ir('auditoria'); }, 'p')]));
    }
    area.appendChild(colunas);
    area.appendChild(futuros);
  };

  /* ------------------------------------------------------------------
     APPS
     ------------------------------------------------------------------ */
  var ESTADOS_APP = { backlog: N('Backlog', 'Backlog'), alpha: N('Alpha', 'Alpha'), beta: N('Beta', 'Beta'), producao: N('Produção', 'Production'), pausado: N('Pausado', 'Paused') };
  function N(pt, en) { return { pt: pt, en: en }; }
  var saudeApps = {};

  RF.telas.apps = function (area, rota) {
    RF.pagina(area, 'apps', T('Tudo o que está aqui vai para o apps.json quando você publicar.', 'Everything here goes to apps.json when you publish.'), [
      ui.botao(T('Verificar se estão no ar', 'Check if they are online'), function () { verificarTodos(); }),
      ui.botaoSe('apps:criar', null, '+ ' + T('Novo app', 'New app'), function () { editarApp(null); }, 'pri')
    ]);
    var lista = C.lista('apps').filter(function (a) { return RF.noEscopo(a.id); });
    /* domínio novo (solverone.com.br): endereços antigos ainda no catálogo ou nos anúncios */
    var antigo = RF.cat.DOMINIO.antigo, novoDom = RF.cat.DOMINIO.atual;
    var desatualizados = C.lista('apps').filter(function (a) { return a.url && a.url.indexOf(antigo) === 0; }).length +
      C.lista('anuncios').filter(function (a) { return a.link && a.link.indexOf(antigo) === 0; }).length;
    if (desatualizados && RF.pode('apps:editar')) {
      area.appendChild(el('div', { class: 'rf-faixa-aviso rf-faixa-info' }, [
        el('span', { texto: '🌐 ' + desatualizados + T(' endereço(s) ainda apontam para ', ' address(es) still point to ') + antigo.replace('https://', '') + T('. A plataforma agora mora em ', '. The platform now lives at ') + novoDom.replace('https://', '') + '.' }),
        ui.botao(T('Trocar para o domínio novo', 'Switch to the new domain'), function () {
          var mudados = [];
          C.lista('apps').forEach(function (a) { if (a.url && a.url.indexOf(antigo) === 0) { a.url = novoDom + a.url.slice(antigo.length); mudados.push(a.id); } });
          C.lista('anuncios').forEach(function (a) { if (a.link && a.link.indexOf(antigo) === 0) { a.link = novoDom + a.link.slice(antigo.length); mudados.push('anuncio:' + a.id); } });
          C.salvar('anuncios').then(function () {
            return RF.mudar('apps', 'apps', 'dominio', '', antigo, novoDom, T('Endereços trocados para ', 'Addresses switched to ') + novoDom + ': ' + mudados.join(', '));
          }).then(function () { ui.aviso(T('Pronto. Publique para os apps lerem o catálogo novo.', 'Done. Publish so the apps read the new catalog.')); RF.renderizar(); });
        }, 'pri')]));
    }
    var tab = ui.tabela([
      { id: 'nome', nome: 'App', valor: function (a) { return T(a.nome); }, desenhar: function (a) {
        return el('span', { class: 'rf-app-nome' }, [el('span', { class: 'rf-glifo', style: { background: a.cor }, 'aria-hidden': 'true', texto: a.glifo }), el('span', {}, [el('strong', { texto: T(a.nome) }), el('br'), el('small', { class: 'rf-dica', texto: T(a.descricao) })])]);
      } },
      { id: 'estado', nome: T('Estado', 'Stage'), valor: function (a) { return a.estado; }, desenhar: function (a) {
        return ui.selo(T(ESTADOS_APP[a.estado] || N(a.estado, a.estado)), a.estado === 'producao' ? 'ok' : a.estado === 'backlog' || a.estado === 'pausado' ? 'cinza' : 'info');
      } },
      { id: 'url', nome: T('Endereço', 'Address'), desenhar: function (a) {
        return a.url ? el('a', { href: a.url, target: '_blank', rel: 'noopener', texto: a.url.replace('https://', '') + ' ↗' }) : el('span', { class: 'rf-dica', texto: '—' });
      } },
      { id: 'no-ar', nome: T('No ar?', 'Online?'), desenhar: function (a) {
        var s = saudeApps[a.id];
        if (!s) return el('span', { class: 'rf-dica', texto: T('não verificado', 'not checked') });
        return ui.selo(s.ok ? '● ' + T('no ar', 'online') : s.cors ? T('não deu para verificar daqui', 'could not check from here') : '● ' + T('fora do ar', 'offline') + ' (' + s.status + ')', s.ok ? 'ok' : s.cors ? 'cinza' : 'erro');
      } },
      { id: 'versao', nome: T('Versão mínima', 'Minimum version'), valor: function (a) { return a.versaoMinima || '—'; } },
      { id: 'resp', nome: T('Responsável', 'Owner'), valor: function (a) { return H.nomeEquipe(a.responsavel); } }
    ], lista, { aoClicar: function (a) { editarApp(a); }, rotulo: 'Apps' });
    area.appendChild(tab);
    area.appendChild(el('div', { class: 'rf-grade-2' }, [ui.cinza('apps.versao-real')]));
    if (rota.sub === 'app' && rota.id) { var a0 = H.app(rota.id); if (a0) setTimeout(function () { editarApp(a0); }, 30); }
  };
  function verificarTodos() {
    var lista = C.lista('apps').filter(function (a) { return a.url && RF.noEscopo(a.id); });
    ui.aviso(T('Verificando ', 'Checking ') + lista.length + ' apps…', 'info');
    Promise.all(lista.map(function (a) {
      return fetch(a.url, { method: 'HEAD', cache: 'no-store' }).then(function (r) {
        saudeApps[a.id] = { ok: r.ok, status: r.status };
      }).catch(function () { saudeApps[a.id] = { ok: false, cors: true }; });
    })).then(function () {
      RF.Log.registrar('apps', 'verificar', '', null, saudeApps, T('Verificação de apps no ar', 'Online check of apps'));
      RF.renderizar();
    });
  }
  function editarApp(a) {
    var novo = !a, x = a ? U.clonar(a) : { id: '', nome: {}, descricao: {}, repo: '', url: RF.cat.DOMINIO.atual, estado: 'backlog', cor: '#60a5fa', glifo: '✨', versaoMinima: '', responsavel: '' };
    var podeEditar = RF.pode(novo ? 'apps:criar' : 'apps:editar', x.id || null);
    var id = ui.entrada(x.id, { attrs: { disabled: !novo, pattern: '[a-z0-9-]+' } });
    var nome = ui.bilingue(T('Nome', 'Name'), x.nome), desc = ui.bilingue(T('Descrição curta', 'Short description'), x.descricao);
    var repo = ui.entrada(x.repo), url = ui.entrada(x.url, { tipo: 'url' });
    var estado = ui.escolha(Object.keys(ESTADOS_APP).map(function (k) { return [k, T(ESTADOS_APP[k])]; }), x.estado);
    var vmin = ui.entrada(x.versaoMinima, { attrs: { placeholder: '1.0.0', inputmode: 'decimal' } });
    var cor = ui.entrada(x.cor, { tipo: 'color' }), glifo = ui.entrada(x.glifo, { attrs: { maxlength: 4 } });
    var resp = ui.escolha(H.opcoesEquipe(T('— ninguém —', '— nobody —')), x.responsavel);
    var interno = ui.marca(T('Uso interno (não aparece para clientes nem nos anúncios)', 'Internal (not shown to customers or in ads)'), x.interno);
    var corpo = el('div', { class: 'rf-form' }, [
      ui.campo(T('Identificador (minúsculas e hífen; não muda depois)', 'Identifier (lowercase and hyphen; cannot change later)'), id),
      nome, desc,
      el('div', { class: 'rf-grade-2' }, [ui.campo(T('Repositório no GitHub', 'GitHub repository'), repo), ui.campo(T('Endereço público', 'Public address'), url)]),
      el('div', { class: 'rf-grade-3' }, [ui.campo(T('Estado', 'Stage'), estado), ui.campo(T('Versão mínima aceita', 'Minimum accepted version'), vmin, T('Quem estiver abaixo verá "atualize"', 'Anyone below sees "please update"')),
        ui.campo(T('Responsável', 'Owner'), resp)]),
      el('div', { class: 'rf-grade-2' }, [ui.campo(T('Cor', 'Colour'), cor), ui.campo(T('Símbolo', 'Symbol'), glifo)]), interno
    ]);
    if (!podeEditar) Array.prototype.forEach.call(corpo.querySelectorAll('input,select,textarea'), function (i) { i.disabled = true; });
    var rod = [];
    if (!novo && RF.pode('apps:excluir', x.id)) rod.push(ui.botao(T('Excluir', 'Delete'), function () {
      ui.confirmar(T('Excluir app', 'Delete app'), T('O app sai do catálogo e dos arquivos publicados. Os serviços dele continuam guardados.', 'The app leaves the catalog and published files. Its services remain stored.'),
        { perigo: true, digitar: x.id, digitarRotulo: T('Digite o identificador para confirmar: ', 'Type the identifier to confirm: ') + x.id }).then(function (ok) {
        if (!ok) return;
        C.db.apps = C.lista('apps').filter(function (y) { return y.id !== x.id; });
        RF.mudar('apps', 'apps', 'excluir', x.id, a, null, T('App excluído: ', 'App deleted: ') + x.id).then(function () { ui.fecharEIr('apps'); });
      });
    }, 'perigo'));
    if (podeEditar) rod.push(ui.botao(T('Salvar', 'Save'), function () {
      var y = Object.assign({}, x, { id: novo ? id.value.trim().toLowerCase() : x.id, nome: nome.valor(), descricao: desc.valor(), repo: repo.value.trim(), url: url.value.trim(),
        estado: estado.value, versaoMinima: vmin.value.trim(), cor: cor.value, glifo: glifo.value.trim() || '✨', responsavel: resp.value, interno: interno.querySelector('input').checked });
      if (!/^[a-z0-9-]{2,}$/.test(y.id)) return ui.aviso(T('Identificador: só minúsculas, números e hífen.', 'Identifier: lowercase, digits and hyphen only.'), 'erro');
      if (novo && H.app(y.id)) return ui.aviso(T('Já existe um app com esse identificador.', 'An app with that identifier already exists.'), 'erro');
      if (!y.nome.pt || !y.nome.en) return ui.aviso(T('Nome em PT e EN.', 'Name in PT and EN.'), 'erro');
      if (novo) C.lista('apps').push(y); else C.db.apps = C.lista('apps').map(function (z) { return z.id === y.id ? y : z; });
      RF.mudar('apps', 'apps', novo ? 'criar' : 'editar', y.id, a, y, (novo ? T('App criado: ', 'App created: ') : T('App editado: ', 'App edited: ')) + y.id)
        .then(function () { ui.aviso(T('Salvo.', 'Saved.')); ui.fecharEIr('apps'); });
    }, 'pri'));
    ui.modal(novo ? T('Novo app', 'New app') : T(x.nome), corpo, { largo: true, rodape: rod });
  }

  /* ------------------------------------------------------------------
     PLANOS
     ------------------------------------------------------------------ */
  RF.telas.planos = function (area) {
    RF.pagina(area, 'planos', T('Os planos vão para o planos.json. Preço e cobrança ficam em cinza até existir meio de pagamento.', 'Plans go to planos.json. Price and billing stay grey until there is a payment provider.'),
      [ui.botaoSe('planos:criar', null, '+ ' + T('Novo plano', 'New plan'), function () { editarPlano(null); }, 'pri')]);
    var grade = el('div', { class: 'rf-cartoes rf-cartoes-planos' });
    C.lista('planos').slice().sort(function (a, b) { return a.ordem - b.ordem; }).forEach(function (p) {
      var f = p.especificar ? RF.cat.funcao(p.especificar) : null;
      var c = el('div', { class: 'rf-plano' + (p.ativo ? '' : ' rf-plano-inativo') }, [
        el('div', { class: 'rf-plano-cab' }, [el('h3', { texto: T(p.nome) }), p.ativo ? ui.selo(T('ativo', 'active'), 'ok') : ui.selo(f ? T('a especificar', 'needs spec') : T('inativo', 'inactive'), 'cinza')]),
        el('p', { texto: T(p.descricao) }),
        el('ul', { class: 'rf-plano-lista' }, [
          el('li', { texto: (p.semAnuncios ? '✓ ' : '✗ ') + T('Sem anúncios', 'Ad-free') }),
          el('li', { texto: (p.exigeConta ? '✓ ' : '✗ ') + T('Exige conta', 'Requires account') }),
          el('li', { texto: '🗄 ' + (p.cotaMB ? p.cotaMB + ' MB' : T('sem espaço guardado', 'no stored space')) }),
          el('li', { texto: '👥 ' + T('até ', 'up to ') + (p.membrosMax || 1) + T(' pessoa(s)', ' person(s)') }),
          el('li', { class: 'rf-dica', texto: '💲 ' + T('Preço: a especificar', 'Price: needs spec') })
        ]),
        f ? el('p', { class: 'rf-dica', texto: T('Falta: ', 'Missing: ') + T(f.falta) }) : null,
        ui.botaoSe('planos:editar', null, T('Editar', 'Edit'), function () { editarPlano(p); }, 'p')
      ]);
      grade.appendChild(c);
    });
    area.appendChild(grade);
    area.appendChild(el('div', { class: 'rf-grade-2' }, [ui.cinza('planos.precos'), ui.cinza('planos.cupons'), ui.cinza('planos.familia'), ui.cinza('planos.profissional')]));
    area.appendChild(el('p', { class: 'rf-dica' }, [T('Quem usa cada plano nos apps está em ', 'Who uses each plan in the apps is in '), el('a', { href: '#/papeis/clientes', texto: T('Papéis → Perfis dos clientes', 'Roles → Customer profiles') }), '.']));
  };
  function editarPlano(p) {
    var novo = !p, x = p ? U.clonar(p) : { id: '', nome: {}, descricao: {}, ordem: C.lista('planos').length + 1, ativo: false, semAnuncios: false, exigeConta: true, cotaMB: 50, membrosMax: 1 };
    var id = ui.entrada(x.id, { attrs: { disabled: !novo } });
    var nome = ui.bilingue(T('Nome', 'Name'), x.nome), desc = ui.bilingue(T('Descrição', 'Description'), x.descricao);
    var ordem = ui.entrada(x.ordem, { tipo: 'number', attrs: { min: 1 } });
    var cota = ui.entrada(x.cotaMB, { tipo: 'number', attrs: { min: 0 } }), membros = ui.entrada(x.membrosMax, { tipo: 'number', attrs: { min: 1 } });
    var ativo = ui.marca(T('Ativo (aparece para os clientes)', 'Active (visible to customers)'), x.ativo);
    var semAn = ui.marca(T('Sem anúncios', 'Ad-free'), x.semAnuncios), conta = ui.marca(T('Exige conta', 'Requires account'), x.exigeConta);
    var corpo = el('div', { class: 'rf-form' }, [ui.campo(T('Identificador', 'Identifier'), id), nome, desc,
      el('div', { class: 'rf-grade-3' }, [ui.campo(T('Ordem (1 = mais simples)', 'Order (1 = simplest)'), ordem), ui.campo(T('Espaço (MB)', 'Space (MB)'), cota), ui.campo(T('Pessoas no plano', 'People in plan'), membros)]),
      ativo, semAn, conta, ui.cinza('planos.precos', el('div', { class: 'rf-grade-3' }, [ui.campo(T('Preço mensal', 'Monthly price'), ui.entrada('', { attrs: { disabled: true } })),
        ui.campo(T('Preço anual', 'Yearly price'), ui.entrada('', { attrs: { disabled: true } })), ui.campo(T('Teste grátis (dias)', 'Free trial (days)'), ui.entrada('', { attrs: { disabled: true } }))]))]);
    ui.modal(novo ? T('Novo plano', 'New plan') : T(x.nome), corpo, { largo: true, rodape: [ui.botao(T('Salvar', 'Save'), function () {
      var y = Object.assign({}, x, { id: novo ? id.value.trim().toLowerCase() : x.id, nome: nome.valor(), descricao: desc.valor(), ordem: +ordem.value || 1,
        cotaMB: +cota.value || 0, membrosMax: +membros.value || 1, ativo: ativo.querySelector('input').checked, semAnuncios: semAn.querySelector('input').checked, exigeConta: conta.querySelector('input').checked });
      if (!/^[a-z0-9-]{2,}$/.test(y.id)) return ui.aviso(T('Identificador inválido.', 'Invalid identifier.'), 'erro');
      if (!y.nome.pt || !y.nome.en) return ui.aviso(T('Nome em PT e EN.', 'Name in PT and EN.'), 'erro');
      if (novo && H.plano(y.id)) return ui.aviso(T('Já existe.', 'Already exists.'), 'erro');
      if (novo) C.lista('planos').push(y); else C.db.planos = C.lista('planos').map(function (z) { return z.id === y.id ? y : z; });
      RF.mudar('planos', 'planos', novo ? 'criar' : 'editar', y.id, p, y, T('Plano salvo: ', 'Plan saved: ') + y.id).then(function () { ui.fecharEIr('planos'); });
    }, 'pri')] });
  }

  /* ------------------------------------------------------------------
     SERVIÇOS POR PLANO (matriz)
     ------------------------------------------------------------------ */
  var filtroServ = '*todos';
  RF.telas.servicos = function (area) {
    var podeEd = RF.pode('servicos:editar');
    RF.pagina(area, 'servicos', T('Marque quais planos podem usar cada função. Função nova entra liberada para todos os planos até você decidir.', 'Tick which plans may use each feature. A new feature is open to every plan until you decide.'), [
      ui.botaoSe('servicos:editar', null, T('Importar servicos.json', 'Import servicos.json'), importarServicos),
      ui.botaoSe('servicos:editar', null, '+ ' + T('Novo serviço', 'New service'), function () { novoServico(); }, 'pri')
    ]);
    var sel = ui.escolha([['*todos', T('Todos', 'All')], ['*', T('Comuns a todos os apps', 'Shared by every app')]].concat(H.opcoesApps(false, true)), filtroServ, { 'aria-label': T('Filtrar por app', 'Filter by app') });
    sel.onchange = function () { filtroServ = sel.value; RF.renderizar(); };
    area.appendChild(el('div', { class: 'rf-filtros' }, [ui.campo(T('App', 'App'), sel)]));
    var planos = C.lista('planos').slice().sort(function (a, b) { return a.ordem - b.ordem; });
    var lista = C.lista('servicos').filter(function (s) {
      return (filtroServ === '*todos' || s.app === filtroServ) && RF.noEscopo(s.app);
    });
    var sujo = false;
    var colunas = [{ id: 'serv', nome: T('Serviço', 'Service'), valor: function (s) { return T(s.nome); }, desenhar: function (s) {
      return el('span', {}, [el('strong', { texto: T(s.nome) }), el('br'), el('small', { class: 'rf-dica', texto: H.nomeApp(s.app) + ' · ' + s.id })]);
    } }].concat(planos.map(function (p) {
      return { id: 'p-' + p.id, nome: T(p.nome), classe: 'rf-centro', desenhar: function (s) {
        var c = el('input', { type: 'checkbox', 'aria-label': T(s.nome) + ' — ' + T(p.nome), disabled: !podeEd || !RF.pode('servicos:editar', s.app) });
        c.checked = s.planos.indexOf('*') !== -1 || s.planos.indexOf(p.id) !== -1;
        c.onchange = function () {
          var marcados = s.planos.indexOf('*') !== -1 ? planos.map(function (q) { return q.id; }) : s.planos.slice();
          if (c.checked && marcados.indexOf(p.id) === -1) marcados.push(p.id);
          if (!c.checked) marcados = marcados.filter(function (q) { return q !== p.id; });
          s.planos = marcados.length === planos.length ? ['*'] : marcados;
          sujo = true; salvarBt.disabled = false;
        };
        return c;
      } };
    })).concat([{ id: 'nivel', nome: T('Nível no módulo atual', 'Level in current module'), desenhar: function (s) { return ui.selo(D.nivelDeDGO(s.planos), 'neutro'); } }]);
    area.appendChild(ui.tabela(colunas, lista, { porPagina: 50, rotulo: T('Serviços por plano', 'Services by plan') }));
    var salvarBt = ui.botao(T('Salvar mudanças', 'Save changes'), function () {
      RF.mudar('servicos', 'servicos', 'editar', filtroServ, null, lista.map(function (s) { return { chave: s.chave, planos: s.planos }; }), T('Matriz de serviços por plano atualizada', 'Services-by-plan matrix updated'))
        .then(function () { sujo = false; ui.aviso(T('Salvo.', 'Saved.')); RF.renderizar(); });
    }, 'pri', { disabled: true });
    if (podeEd) area.appendChild(el('div', { class: 'rf-acoes rf-acoes-fim' }, [salvarBt]));
    area.appendChild(el('p', { class: 'rf-dica', texto: T('"Nível no módulo atual" é como o diretrizes.js de hoje entende a regra (visitante, pagante, premium); os planos novos passam a valer quando os apps lerem o servicos/<app>.json central.',
      '"Level in current module" is how today\'s diretrizes.js reads the rule (visitor, paying, premium); the new plans apply once the apps read the central servicos/<app>.json.') }));
    area.appendChild(el('div', { class: 'rf-grade-2' }, [ui.cinza('servicos.limites')]));
  };
  function novoServico() {
    var app = ui.escolha([['*', T('Comum a todos os apps', 'Shared by every app')]].concat(H.opcoesApps(false, true)), filtroServ.charAt(0) === '*' ? '*' : filtroServ);
    var id = ui.entrada(''), nome = ui.bilingue(T('Nome', 'Name')), desc = ui.bilingue(T('Descrição (opcional)', 'Description (optional)'));
    ui.modal(T('Novo serviço', 'New service'), el('div', { class: 'rf-form' }, [ui.campo('App', app), ui.campo(T('Identificador', 'Identifier'), id), nome, desc,
      el('p', { class: 'rf-dica', texto: T('Regra da plataforma: a função nova começa liberada para todos os planos. Mude na matriz se ela for de um plano só.', 'Platform rule: a new feature starts open to every plan. Change it in the matrix if it belongs to one plan only.') })]),
      { rodape: [ui.botao(T('Criar', 'Create'), function () {
        var s = { app: app.value, id: id.value.trim().toLowerCase(), nome: nome.valor(), descricao: desc.valor(), planos: ['*'] };
        s.chave = s.app + '/' + s.id;
        if (!/^[a-z0-9-]{2,}$/.test(s.id)) return ui.aviso(T('Identificador inválido.', 'Invalid identifier.'), 'erro');
        if (!s.nome.pt || !s.nome.en) return ui.aviso(T('Nome em PT e EN.', 'Name in PT and EN.'), 'erro');
        if (C.lista('servicos').some(function (x) { return x.chave === s.chave; })) return ui.aviso(T('Já existe.', 'Already exists.'), 'erro');
        C.lista('servicos').push(s);
        RF.mudar('servicos', 'servicos', 'criar', s.chave, null, s, T('Serviço criado: ', 'Service created: ') + s.chave).then(function () { ui.fecharEIr('servicos'); });
      }, 'pri')] });
  }
  function importarServicos() {
    var app = ui.escolha(H.opcoesApps(false, true), '');
    var m = ui.modal(T('Importar servicos.json de um app', 'Import an app\'s servicos.json'), el('div', { class: 'rf-form' }, [
      el('p', { class: 'rf-dica', texto: T('Aceita o formato do diretrizes.js (lista com id, nome e nível). Serviços já existentes são atualizados.', 'Accepts the diretrizes.js format (list with id, name and level). Existing services are updated.') }),
      ui.campo('App', app)]), { rodape: [ui.botao(T('Escolher arquivo…', 'Choose file…'), function () {
      H.lerArquivo('.json,application/json').then(function (arq) {
        if (!arq) return;
        var dados; try { dados = JSON.parse(arq.texto); } catch (e) { return ui.aviso(T('Arquivo não é JSON válido.', 'File is not valid JSON.'), 'erro'); }
        var lista = Array.isArray(dados) ? dados : (dados.servicos || []);
        var ordem = C.lista('planos').slice().sort(function (a, b) { return a.ordem - b.ordem; }).map(function (p) { return p.id; });
        var n = 0;
        lista.forEach(function (x) {
          if (!x || !x.id) return;
          var planos = x.planos || (x.nivel === 'premium' ? ordem.filter(function (p) { return ['visitante', 'membro'].indexOf(p) === -1; })
            : x.nivel === 'pagante' || x.nivel === 'membro' ? ordem.filter(function (p) { return p !== 'visitante'; }) : ['*']);
          var chave = app.value + '/' + x.id;
          var nome = typeof x.nome === 'string' ? { pt: x.nome, en: x.nome } : (x.nome || { pt: x.id, en: x.id });
          var existe = C.lista('servicos').filter(function (s) { return s.chave === chave; })[0];
          if (existe) { existe.nome = nome; existe.planos = planos; existe.descricao = x.descricao || existe.descricao; }
          else C.lista('servicos').push({ app: app.value, id: x.id, chave: chave, nome: nome, descricao: x.descricao || null, planos: planos });
          n++;
        });
        RF.mudar('servicos', 'servicos', 'importar', app.value, null, { arquivo: arq.nome, total: n }, n + T(' serviços importados de ', ' services imported from ') + arq.nome)
          .then(function () { m.fechar(); ui.aviso(n + T(' serviços importados.', ' services imported.')); RF.renderizar(); });
      });
    }, 'pri')] });
  }

  /* ------------------------------------------------------------------
     USUÁRIOS (CRM)
     ------------------------------------------------------------------ */
  var filtroU = { texto: '', app: '', plano: '', status: '', etiqueta: '' };
  RF.telas.usuarios = function (area, rota) {
    if (rota.sub === 'ficha' && rota.id) return fichaUsuario(area, rota.id);
    var aba = rota.sub || 'lista';
    RF.pagina(area, 'usuarios', T('CRM da SolverONE. Sem servidor, os usuários entram por cadastro ou importação; com o Firebase, chegam sozinhos.', 'SolverONE CRM. Without a server, users come in by entry or import; with Firebase they arrive on their own.'), [
      ui.botaoSe('usuarios:criar', null, '+ ' + T('Novo usuário', 'New user'), function () { editarUsuario(null); }, 'pri')
    ]);
    area.appendChild(ui.abas([
      { id: 'lista', nome: T('Lista', 'List') }, { id: 'segmentos', nome: T('Segmentos', 'Segments'), conta: C.lista('segmentos').length },
      { id: 'importar', nome: T('Importar e exportar', 'Import and export') }, { id: 'duplicados', nome: T('Duplicados', 'Duplicates') }
    ], aba, function (id) { RF.Rota.ir('usuarios', id === 'lista' ? null : id); }));
    if (aba === 'segmentos') return abaSegmentos(area);
    if (aba === 'importar') return abaImportar(area);
    if (aba === 'duplicados') return abaDuplicados(area);

    var etiquetas = (C.obj('config').etiquetas || []);
    var busca = ui.entrada(filtroU.texto, { tipo: 'search', attrs: { placeholder: T('Nome, apelido ou e-mail', 'Name, nickname or e-mail'), 'aria-label': T('Procurar', 'Search') } });
    var fApp = ui.escolha([['', T('Todos', 'All')]].concat(H.opcoesApps(false, true)), filtroU.app);
    var fPlano = ui.escolha([['', T('Todos', 'All')]].concat(H.opcoesPlanos()), filtroU.plano);
    var fStatus = ui.escolha([['', T('Todos', 'All')], ['ativo', T('Ativo', 'Active')], ['bloqueado', T('Bloqueado', 'Blocked')], ['excluido', T('Excluído (anonimizado)', 'Deleted (anonymised)')]], filtroU.status);
    var fEt = ui.escolha([['', T('Todas', 'All')]].concat(etiquetas.map(function (e) { return [e, e]; })), filtroU.etiqueta);
    var tabelaBloco = el('div');
    function filtrar() {
      filtroU = { texto: busca.value, app: fApp.value, plano: fPlano.value, status: fStatus.value, etiqueta: fEt.value };
      var lista = filtrarUsuarios(filtroU);
      U.limpar(tabelaBloco);
      tabelaBloco.appendChild(tabelaUsuarios(lista));
    }
    [busca].forEach(function (x) { x.addEventListener('input', filtrar); });
    [fApp, fPlano, fStatus, fEt].forEach(function (x) { x.addEventListener('change', filtrar); });
    area.appendChild(el('div', { class: 'rf-filtros' }, [ui.campo(T('Procurar', 'Search'), busca), ui.campo('App', fApp), ui.campo(T('Plano', 'Plan'), fPlano),
      ui.campo(T('Situação', 'Status'), fStatus), ui.campo(T('Etiqueta', 'Tag'), fEt),
      ui.botaoSe('usuarios:editar', null, T('Salvar como segmento', 'Save as segment'), function () { salvarSegmento(); }, 'p')]));
    area.appendChild(tabelaBloco);
    filtrar();
    area.appendChild(el('div', { class: 'rf-grade-2' }, [ui.cinza('usuarios.sync'), ui.cinza('usuarios.anunciantes')]));
  };
  function filtrarUsuarios(f) {
    var q = U.semAcento(f.texto || '');
    return C.lista('usuarios').filter(function (u) {
      if (!H.usuarioNoEscopo(u)) return false;
      if (f.status ? u.status !== f.status : u.status === 'excluido') return false;
      if (f.app && !(u.apps || []).some(function (a) { return a.app === f.app; })) return false;
      if (f.plano && u.plano !== f.plano) return false;
      if (f.etiqueta && (u.etiquetas || []).indexOf(f.etiqueta) === -1) return false;
      if (q) {
        var alvo = U.semAcento(u.nome + ' ' + u.apelido + ' ' + (RF.pode('usuarios.pii:ver') ? u.email : ''));
        if (alvo.indexOf(q) === -1) return false;
      }
      return true;
    });
  }
  function tabelaUsuarios(lista) {
    var abertosPor = {};
    D.Chamados.abertos().forEach(function (c) { if (c.usuario) abertosPor[c.usuario] = (abertosPor[c.usuario] || 0) + 1; });
    function ultimo(u) { return (u.apps || []).map(function (a) { return a.ultimoAcesso || ''; }).sort().pop() || ''; }
    return ui.tabela([
      { id: 'nome', nome: T('Nome', 'Name'), valor: function (u) { return u.nome; }, desenhar: function (u) {
        return el('span', { class: 'rf-pessoa' }, [el('span', { class: 'rf-avatar', 'aria-hidden': 'true', texto: (u.nome || '?').charAt(0) }),
          el('span', {}, [el('strong', { texto: u.nome }), el('br'), el('small', { class: 'rf-dica', texto: '@' + u.apelido })])]);
      } },
      { id: 'email', nome: 'E-mail', valor: function (u) { return H.email(u.email); } },
      { id: 'plano', nome: T('Plano', 'Plan'), valor: function (u) { return H.nomePlano(u.plano); } },
      { id: 'apps', nome: 'Apps', desenhar: function (u) { return el('span', { title: (u.apps || []).map(function (a) { return H.nomeApp(a.app); }).join(', ') }, (u.apps || []).map(function (a) { var x = H.app(a.app); return x ? x.glifo : '·'; }).join(' ')); } },
      { id: 'status', nome: T('Situação', 'Status'), valor: function (u) { return u.status; }, desenhar: function (u) {
        return ui.selo(u.status === 'ativo' ? T('ativo', 'active') : u.status === 'bloqueado' ? T('bloqueado', 'blocked') : T('excluído', 'deleted'), u.status === 'ativo' ? 'ok' : u.status === 'bloqueado' ? 'erro' : 'cinza');
      } },
      { id: 'etq', nome: T('Etiquetas', 'Tags'), valor: function (u) { return (u.etiquetas || []).join(', '); } },
      { id: 'ch', nome: T('Chamados abertos', 'Open tickets'), classe: 'rf-centro', valor: function (u) { return abertosPor[u.id] || 0; } },
      { id: 'ult', nome: T('Último acesso', 'Last access'), valor: ultimo, desenhar: function (u) { return U.data(ultimo(u)); }, ordenar: ultimo },
      { id: 'criado', nome: T('Desde', 'Since'), ordenar: function (u) { return u.criadoEm; }, desenhar: function (u) { return U.data(u.criadoEm); } }
    ], lista, { aoClicar: function (u) { RF.Rota.ir('usuarios', 'ficha', u.id); }, ordem: 'nome', rotulo: T('Usuários', 'Users'),
      vazio: T('Nenhum usuário com esses filtros.', 'No users match these filters.') });
  }
  function salvarSegmento() {
    var nome = ui.entrada('', { attrs: { autofocus: true } });
    var m = ui.modal(T('Salvar segmento', 'Save segment'), el('div', { class: 'rf-form' }, [ui.campo(T('Nome do segmento', 'Segment name'), nome),
      el('p', { class: 'rf-dica', texto: T('Guarda os filtros atuais para abrir de novo com um toque.', 'Stores the current filters to reopen in one tap.') })]),
      { rodape: [ui.botao(T('Salvar', 'Save'), function () {
        if (!nome.value.trim()) return;
        var s = { id: U.uid('seg-'), nome: nome.value.trim(), filtros: U.clonar(filtroU), criadoEm: U.agora(), autor: S.pessoa.email };
        C.lista('segmentos').push(s);
        RF.mudar('segmentos', 'usuarios', 'segmento-criar', s.id, null, s, T('Segmento criado: ', 'Segment created: ') + s.nome).then(function () { m.fechar(); ui.aviso(T('Segmento salvo.', 'Segment saved.')); });
      }, 'pri')] });
  }
  function abaSegmentos(area) {
    var lista = C.lista('segmentos');
    area.appendChild(ui.tabela([
      { id: 'nome', nome: T('Segmento', 'Segment'), valor: function (s) { return s.nome; } },
      { id: 'filtros', nome: T('Filtros', 'Filters'), valor: function (s) {
        var f = s.filtros; return [f.texto && '"' + f.texto + '"', f.app && H.nomeApp(f.app), f.plano && H.nomePlano(f.plano), f.status, f.etiqueta && '#' + f.etiqueta].filter(Boolean).join(' · ') || T('todos', 'all');
      } },
      { id: 'qtd', nome: T('Pessoas agora', 'People now'), classe: 'rf-centro', valor: function (s) { return filtrarUsuarios(s.filtros).length; } },
      { id: 'acoes', nome: '', desenhar: function (s) {
        return el('span', { class: 'rf-acoes' }, [ui.botao(T('Abrir', 'Open'), function () { filtroU = U.clonar(s.filtros); RF.Rota.ir('usuarios'); }, 'p'),
          RF.pode('usuarios:editar') ? ui.botao(T('Apagar', 'Delete'), function () {
            C.db.segmentos = lista.filter(function (x) { return x.id !== s.id; });
            RF.mudar('segmentos', 'usuarios', 'segmento-apagar', s.id, s, null, T('Segmento apagado: ', 'Segment deleted: ') + s.nome).then(RF.renderizar);
          }, 'p') : null]);
      } }
    ], lista, { vazio: T('Nenhum segmento. Use "Salvar como segmento" na lista.', 'No segments. Use "Save as segment" on the list.') }));
  }
  function abaImportar(area) {
    area.appendChild(ui.secao(T('Importar usuários (CSV)', 'Import users (CSV)'), [
      el('p', { texto: T('Colunas aceitas (qualquer ordem, com ; ou ,): nome, apelido, email, telefone, nascimento, plano, app, etiquetas. Mesmo e-mail = atualiza em vez de duplicar.',
        'Accepted columns (any order, with ; or ,): nome, apelido, email, telefone, nascimento, plano, app, etiquetas. Same e-mail = update instead of duplicate.') }),
      el('div', { class: 'rf-acoes' }, [
        ui.botaoSe('usuarios:criar', null, T('Escolher arquivo CSV…', 'Choose CSV file…'), importarCsvUsuarios, 'pri'),
        ui.botao(T('Baixar modelo', 'Download template'), function () {
          U.baixar('modelo-usuarios.csv', U.csv([['nome', 'nome'], ['apelido', 'apelido'], ['email', 'email'], ['telefone', 'telefone'], ['nascimento', 'nascimento'], ['plano', 'plano'], ['app', 'app'], ['etiquetas', 'etiquetas']],
            [{ nome: 'Pessoa Exemplo', apelido: 'pessoa1', email: 'pessoa@example.com', telefone: '', nascimento: '1990-05-20', plano: 'membro', app: 'moneytrio', etiquetas: 'beta-tester' }]), 'text/csv');
        })
      ])
    ]));
    area.appendChild(ui.secao(T('Exportar', 'Export'), [
      el('p', { texto: RF.pode('usuarios.pii:ver') ? T('Exporta os usuários da lista atual. O arquivo tem dados pessoais: guarde com cuidado.', 'Exports the users of the current list. The file has personal data: keep it safe.')
        : T('Seu papel exporta com e-mails mascarados.', 'Your role exports with masked e-mails.') }),
      ui.botaoSe('usuarios:exportar', null, T('Exportar CSV', 'Export CSV'), function () {
        var lista = filtrarUsuarios(filtroU);
        U.baixar('usuarios-' + U.agora().slice(0, 10) + '.csv', U.csv([['nome', 'nome'], ['apelido', 'apelido'], [function (u) { return H.email(u.email); }, 'email'], ['plano', 'plano'],
          [function (u) { return (u.apps || []).map(function (a) { return a.app; }).join(' '); }, 'apps'], ['status', 'status'], [function (u) { return (u.etiquetas || []).join(' '); }, 'etiquetas'], ['criadoEm', 'criado']], lista), 'text/csv');
        RF.Log.registrar('usuarios', 'exportar', '', null, { total: lista.length, pii: RF.pode('usuarios.pii:ver') }, lista.length + T(' usuários exportados em CSV', ' users exported as CSV'));
      })
    ]));
    area.appendChild(ui.cinza('usuarios.sync'));
  }
  function importarCsvUsuarios() {
    H.lerArquivo('.csv,text/csv').then(function (arq) {
      if (!arq) return;
      var linhas = U.lerCsv(arq.texto);
      if (!linhas.length) return ui.aviso(T('Arquivo vazio.', 'Empty file.'), 'erro');
      var novos = 0, atual = 0, ignorados = 0;
      linhas.forEach(function (l) {
        var email = String(l.email || l['e-mail'] || '').trim().toLowerCase();
        var nome = l.nome || l.name || '';
        if (!email && !nome) { ignorados++; return; }
        var existe = email && C.lista('usuarios').filter(function (u) { return u.email === email; })[0];
        var apps = String(l.app || l.apps || '').split(/[\s,]+/).filter(Boolean);
        if (existe) {
          if (nome) existe.nome = nome; if (l.telefone) existe.telefone = l.telefone; if (l.plano) existe.plano = l.plano;
          apps.forEach(function (a) { if (!existe.apps.some(function (x) { return x.app === a; })) existe.apps.push({ app: a, desde: U.agora() }); });
          existe.atualizadoEm = U.agora(); atual++;
        } else {
          C.lista('usuarios').push(novoRegistro({ nome: nome || email.split('@')[0], apelido: l.apelido || (email.split('@')[0] || U.semAcento(nome).replace(/\s+/g, '')), email: email,
            telefone: l.telefone || '', nascimento: l.nascimento || '', plano: l.plano || 'membro', apps: apps, etiquetas: String(l.etiquetas || '').split(/[\s,]+/).filter(Boolean), origem: 'importado' }));
          novos++;
        }
      });
      RF.mudar('usuarios', 'usuarios', 'importar', arq.nome, null, { novos: novos, atualizados: atual, ignorados: ignorados },
        T('Importação: ', 'Import: ') + novos + T(' novos, ', ' new, ') + atual + T(' atualizados', ' updated')).then(function () {
        ui.aviso(novos + T(' novos, ', ' new, ') + atual + T(' atualizados, ', ' updated, ') + ignorados + T(' linhas ignoradas.', ' lines ignored.'));
        RF.Rota.ir('usuarios');
      });
    });
  }
  function novoRegistro(x) {
    var agora = U.agora();
    var u = { id: U.uid('u-'), nome: x.nome, apelido: x.apelido, email: x.email || '', telefone: x.telefone || '', nascimento: x.nascimento || '', idioma: x.idioma || 'pt',
      plano: x.plano || 'membro', status: 'ativo', motivoBloqueio: '', apps: (x.apps || []).map(function (a) { return { app: a, desde: agora, ultimoAcesso: null }; }),
      etiquetas: x.etiquetas || [], notas: [], termosAceitos: [], consentimentos: [], historicoPlano: [{ plano: x.plano || 'membro', de: agora, quem: S.pessoa.email }],
      origem: x.origem || 'manual', criadoEm: agora, atualizadoEm: agora };
    D.Automacoes.rodar('usuario-criado', u, 'usuarios');
    return u;
  }
  RF.h.novoUsuario = novoRegistro;
  function abaDuplicados(area) {
    var grupos = {};
    C.lista('usuarios').filter(function (u) { return u.status !== 'excluido' && H.usuarioNoEscopo(u); }).forEach(function (u) {
      if (u.email) (grupos['e:' + u.email] = grupos['e:' + u.email] || []).push(u);
      (grupos['n:' + U.semAcento(u.nome).replace(/\s+/g, ' ')] = grupos['n:' + U.semAcento(u.nome).replace(/\s+/g, ' ')] || []).push(u);
    });
    var dup = Object.keys(grupos).filter(function (k) { return grupos[k].length > 1; });
    if (!dup.length) { area.appendChild(el('div', { class: 'rf-vazio' }, [el('p', { texto: '✓ ' + T('Nenhum cadastro duplicado (mesmo e-mail ou mesmo nome).', 'No duplicate records (same e-mail or name).') })])); return; }
    dup.forEach(function (k) {
      var g = grupos[k];
      area.appendChild(ui.secao((k.charAt(0) === 'e' ? T('Mesmo e-mail: ', 'Same e-mail: ') + H.email(k.slice(2)) : T('Mesmo nome: ', 'Same name: ') + g[0].nome), [
        el('ul', {}, g.map(function (u) { return el('li', {}, [el('a', { href: '#/usuarios/ficha/' + u.id, texto: u.nome + ' (@' + u.apelido + ')' }), ' · ', H.nomePlano(u.plano), ' · ', U.data(u.criadoEm)]); }))
      ], [ui.botaoSe('usuarios:editar', null, T('Juntar no mais antigo', 'Merge into the oldest'), function () { juntar(g); }, 'p')]));
    });
  }
  function juntar(grupo) {
    var ord = grupo.slice().sort(function (a, b) { return new Date(a.criadoEm) - new Date(b.criadoEm); });
    var fica = ord[0], saem = ord.slice(1);
    ui.confirmar(T('Juntar cadastros', 'Merge records'), T('Os dados, apps, notas, etiquetas e chamados vão para "', 'Data, apps, notes, tags and tickets go to "') + fica.nome + T('" (o mais antigo). Os outros saem da lista.', '" (the oldest). The others leave the list.')).then(function (ok) {
      if (!ok) return;
      var antes = U.clonar(grupo);
      saem.forEach(function (u) {
        (u.apps || []).forEach(function (a) { if (!fica.apps.some(function (x) { return x.app === a.app; })) fica.apps.push(a); });
        fica.notas = (fica.notas || []).concat(u.notas || []);
        (u.etiquetas || []).forEach(function (e) { if (fica.etiquetas.indexOf(e) === -1) fica.etiquetas.push(e); });
        C.lista('chamados').forEach(function (c) { if (c.usuario === u.id) c.usuario = fica.id; });
      });
      C.db.usuarios = C.lista('usuarios').filter(function (u) { return saem.indexOf(u) === -1; });
      C.salvar('chamados');
      RF.mudar('usuarios', 'usuarios', 'juntar', fica.id, antes, fica, T('Cadastros juntados em ', 'Records merged into ') + fica.nome).then(RF.renderizar);
    });
  }

  function editarUsuario(u, depois) {
    var novo = !u, x = u ? U.clonar(u) : { nome: '', apelido: '', email: '', telefone: '', nascimento: '', idioma: 'pt', plano: 'membro' };
    var pii = RF.pode('usuarios.pii:ver') || novo;
    var nome = ui.entrada(x.nome, { attrs: { autofocus: true } }), apelido = ui.entrada(x.apelido);
    var email = ui.entrada(pii ? x.email : U.mascararEmail(x.email), { tipo: 'email', attrs: { disabled: !pii } });
    var tel = ui.entrada(pii ? x.telefone : (x.telefone ? '•••' : ''), { tipo: 'tel', attrs: { disabled: !pii } });
    var nasc = ui.entrada(pii ? x.nascimento : '', { tipo: 'date', attrs: { disabled: !pii } });
    var idi = ui.escolha([['pt', 'Português'], ['en', 'English']], x.idioma);
    var plano = ui.escolha(H.opcoesPlanos(), x.plano, { disabled: !novo });
    var apps = el('div', { class: 'rf-marcas' });
    if (novo) C.lista('apps').filter(function (a) { return !a.interno && RF.noEscopo(a.id); }).forEach(function (a) { apps.appendChild(ui.marca(a.glifo + ' ' + T(a.nome), false, { value: a.id })); });
    var corpo = el('div', { class: 'rf-form' }, [
      el('div', { class: 'rf-grade-2' }, [ui.campo(T('Nome', 'Name'), nome), ui.campo(T('Apelido', 'Nickname'), apelido)]),
      el('div', { class: 'rf-grade-2' }, [ui.campo('E-mail', email), ui.campo(T('Telefone', 'Phone'), tel)]),
      el('div', { class: 'rf-grade-3' }, [ui.campo(T('Nascimento', 'Birth date'), nasc, x.nascimento && pii ? H.idade(x.nascimento) : null), ui.campo(T('Idioma', 'Language'), idi),
        ui.campo(T('Plano', 'Plan'), plano, novo ? null : T('Troca de plano fica em "Ações".', 'Plan change is under "Actions".'))]),
      novo ? el('fieldset', { class: 'rf-bilingue' }, [el('legend', { texto: 'Apps' }), apps]) : null,
      !pii ? el('p', { class: 'rf-dica', texto: T('Seu papel não vê dado pessoal completo; esses campos ficam travados.', 'Your role cannot see full personal data; those fields are locked.') }) : null
    ]);
    ui.modal(novo ? T('Novo usuário', 'New user') : T('Editar dados', 'Edit data'), corpo, { largo: true, rodape: [ui.botao(T('Salvar', 'Save'), function () {
      if (!nome.value.trim()) return ui.aviso(T('Nome obrigatório.', 'Name required.'), 'erro');
      var em = email.value.trim().toLowerCase();
      if (pii && em && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return ui.aviso(T('E-mail inválido.', 'Invalid e-mail.'), 'erro');
      if (pii && em && C.lista('usuarios').some(function (y) { return y.email === em && (!u || y.id !== u.id); })) {
        return ui.aviso(T('Já existe um usuário com esse e-mail. Veja a aba Duplicados.', 'A user with that e-mail already exists. See the Duplicates tab.'), 'erro');
      }
      if (novo) {
        var sel = Array.prototype.filter.call(apps.querySelectorAll('input'), function (i) { return i.checked; }).map(function (i) { return i.value; });
        var n = novoRegistro({ nome: nome.value.trim(), apelido: apelido.value.trim() || em.split('@')[0], email: em, telefone: tel.value.trim(), nascimento: nasc.value,
          idioma: idi.value, plano: plano.value, apps: sel });
        C.lista('usuarios').push(n);
        RF.mudar('usuarios', 'usuarios', 'criar', n.id, null, { nome: n.nome, plano: n.plano }, T('Usuário cadastrado: ', 'User added: ') + n.nome).then(function () { ui.fecharEIr('usuarios', 'ficha', n.id); });
      } else {
        var antes = { nome: u.nome, apelido: u.apelido, email: u.email, telefone: u.telefone, nascimento: u.nascimento, idioma: u.idioma };
        u.nome = nome.value.trim(); u.apelido = apelido.value.trim(); u.idioma = idi.value;
        if (pii) { u.email = em; u.telefone = tel.value.trim(); u.nascimento = nasc.value; }
        u.atualizadoEm = U.agora();
        var depoisD = { nome: u.nome, apelido: u.apelido, email: u.email, telefone: u.telefone, nascimento: u.nascimento, idioma: u.idioma };
        RF.mudar('usuarios', 'usuarios', 'editar', u.id, antes, depoisD, T('Dados alterados: ', 'Data changed: ') + u.nome).then(function () { ui.fecharModal(); RF.renderizar(); });
      }
    }, 'pri')] });
  }

  var abaFicha = 'resumo';
  function fichaUsuario(area, id) {
    var u = H.usuario(id);
    if (!u || !H.usuarioNoEscopo(u)) { area.appendChild(el('div', { class: 'rf-vazio' }, [el('p', { texto: T('Usuário não encontrado.', 'User not found.') }), ui.botao(T('Voltar à lista', 'Back to list'), function () { RF.Rota.ir('usuarios'); })])); return; }
    var excl = u.status === 'excluido';
    var chs = C.lista('chamados').filter(function (c) { return c.usuario === u.id; });
    area.appendChild(el('div', { class: 'rf-pag-cab' }, [
      el('div', { class: 'rf-pessoa rf-pessoa-grande' }, [el('span', { class: 'rf-avatar', 'aria-hidden': 'true', texto: u.nome.charAt(0) }),
        el('div', {}, [el('h1', { class: 'rf-pag-tit', texto: u.nome }),
          el('p', {}, ['@' + u.apelido + ' · ' + H.email(u.email) + ' · ', ui.selo(H.nomePlano(u.plano), 'info'), ' ',
            ui.selo(u.status === 'ativo' ? T('ativo', 'active') : u.status === 'bloqueado' ? T('bloqueado', 'blocked') : T('excluído', 'deleted'), u.status === 'ativo' ? 'ok' : u.status === 'bloqueado' ? 'erro' : 'cinza'),
            u.exemplo ? ' ' : null, u.exemplo ? ui.selo(T('exemplo', 'sample'), 'cinza') : null])])]),
      el('div', { class: 'rf-acoes' }, [ui.botao('‹ ' + T('Lista', 'List'), function () { RF.Rota.ir('usuarios'); }, 'p'),
        !excl ? ui.botaoSe('usuarios:editar', null, T('Editar dados', 'Edit data'), function () { editarUsuario(u); }) : null,
        !excl ? ui.botao(T('Ações ▾', 'Actions ▾'), function () { acoesUsuario(u); }, 'pri') : null])
    ]));
    if (u.status === 'bloqueado') area.appendChild(el('div', { class: 'rf-faixa-aviso rf-faixa-erro' }, [T('Bloqueado: ', 'Blocked: ') + (u.motivoBloqueio || '—')]));
    area.appendChild(ui.abas([
      { id: 'resumo', nome: T('Resumo', 'Summary') }, { id: 'plano', nome: T('Plano', 'Plan') }, { id: 'apps', nome: 'Apps', conta: (u.apps || []).length },
      { id: 'termos', nome: T('Termos e consentimentos', 'Terms and consents') }, { id: 'chamados', nome: T('Chamados', 'Tickets'), conta: chs.length },
      { id: 'notas', nome: T('Notas', 'Notes'), conta: (u.notas || []).length }, { id: 'familia', nome: T('Família', 'Family') }, { id: 'historico', nome: T('Histórico', 'History') }
    ], abaFicha, function (a) { abaFicha = a; RF.renderizar(); }));
    var box = el('div', { class: 'rf-aba-corpo' }); area.appendChild(box);

    if (abaFicha === 'resumo') {
      var ult = (u.apps || []).map(function (a) { return a.ultimoAcesso || ''; }).sort().pop();
      box.appendChild(el('div', { class: 'rf-cartoes' }, [
        ui.cartao(T('Plano', 'Plan'), H.nomePlano(u.plano), T('desde ', 'since ') + U.data((u.historicoPlano || []).slice(-1)[0] ? u.historicoPlano.slice(-1)[0].de : u.criadoEm)),
        ui.cartao('Apps', (u.apps || []).length, (u.apps || []).map(function (a) { return H.nomeApp(a.app); }).join(', ') || '—'),
        ui.cartao(T('Chamados abertos', 'Open tickets'), chs.filter(function (c) { return c.status !== 'resolvido' && c.status !== 'fechado'; }).length, chs.length + T(' no total', ' in total')),
        ui.cartao(T('Último acesso registrado', 'Last recorded access'), ult ? U.data(ult) : '—', T('cadastro: ', 'since: ') + U.data(u.criadoEm)),
        ui.cartao(T('Idade', 'Age'), RF.pode('usuarios.pii:ver') ? (H.idade(u.nascimento) || '—') : '•••', T('idioma: ', 'language: ') + (u.idioma || 'pt'))
      ]));
      box.appendChild(ui.secao(T('Etiquetas', 'Tags'), [editorEtiquetas(u)]));
      box.appendChild(el('div', { class: 'rf-grade-2' }, [ui.cinza('usuarios.saude'), ui.cinza('usuarios.ver-como'), ui.cinza('usuarios.recado')]));
    }
    if (abaFicha === 'plano') {
      box.appendChild(ui.tabela([
        { id: 'p', nome: T('Plano', 'Plan'), valor: function (h) { return H.nomePlano(h.plano); } },
        { id: 'de', nome: T('Desde', 'From'), desenhar: function (h) { return U.data(h.de, true); } },
        { id: 'ate', nome: T('Até', 'Until'), desenhar: function (h) { return h.ate ? U.data(h.ate, true) : T('atual', 'current'); } },
        { id: 'q', nome: T('Por', 'By'), valor: function (h) { return h.quem; } },
        { id: 'm', nome: T('Motivo', 'Reason'), valor: function (h) { return h.motivo || ''; } }
      ], (u.historicoPlano || []).slice().reverse()));
      box.appendChild(el('div', { class: 'rf-acoes' }, [!excl ? ui.botaoSe('usuarios.conta:editar', null, T('Trocar plano', 'Change plan'), function () { trocarPlano(u); }, 'pri') : null]));
      box.appendChild(ui.cinza('planos.precos'));
    }
    if (abaFicha === 'apps') {
      box.appendChild(ui.tabela([
        { id: 'app', nome: 'App', valor: function (a) { return H.nomeApp(a.app); } },
        { id: 'desde', nome: T('Desde', 'Since'), desenhar: function (a) { return U.data(a.desde); } },
        { id: 'ult', nome: T('Último acesso', 'Last access'), desenhar: function (a) { return a.ultimoAcesso ? U.data(a.ultimoAcesso, true) : T('não registrado', 'not recorded'); } }
      ], u.apps || []));
      if (!excl && RF.pode('usuarios:editar')) {
        var novoApp = ui.escolha(H.opcoesApps(false, true).filter(function (o) { return !(u.apps || []).some(function (a) { return a.app === o[0]; }); }), '');
        box.appendChild(el('div', { class: 'rf-linha' }, [ui.campo(T('Acrescentar app', 'Add app'), novoApp), ui.botao(T('Acrescentar', 'Add'), function () {
          if (!novoApp.value) return;
          u.apps.push({ app: novoApp.value, desde: U.agora(), ultimoAcesso: null });
          RF.mudar('usuarios', 'usuarios', 'app-incluir', u.id, null, novoApp.value, T('App acrescentado: ', 'App added: ') + novoApp.value).then(RF.renderizar);
        })]));
      }
      box.appendChild(el('p', { class: 'rf-dica', texto: T('O último acesso só chega sozinho com o servidor (fase 2).', 'Last access only arrives automatically with the server (phase 2).') }));
    }
    if (abaFicha === 'termos') {
      var pubs = C.lista('termos').map(function (t) { return { t: t, v: D.Termos.publicada(t) }; }).filter(function (x) { return x.v && (x.t.app === '*' || (u.apps || []).some(function (a) { return a.app === x.t.app; })); });
      box.appendChild(ui.secao(T('Termos publicados que valem para esta pessoa', 'Published terms that apply to this person'), [ui.tabela([
        { id: 't', nome: T('Termo', 'Term'), valor: function (x) { return T(x.v.titulo) + ' v' + x.v.versao; } },
        { id: 'o', nome: T('Obrigatório', 'Mandatory'), valor: function (x) { return x.t.obrigatorio ? T('sim', 'yes') : T('não', 'no'); } },
        { id: 'a', nome: T('Aceite', 'Acceptance'), desenhar: function (x) {
          var ac = (u.termosAceitos || []).filter(function (a) { return a.termo === x.t.id; }).sort(function (a, b) { return b.versao - a.versao; })[0];
          if (!ac) return ui.selo(T('pendente', 'pending'), x.t.obrigatorio ? 'atencao' : 'cinza');
          return ui.selo((ac.versao >= x.v.versao ? '✓ v' : '⚠ v') + ac.versao + ' · ' + U.data(ac.quando), ac.versao >= x.v.versao ? 'ok' : 'atencao');
        } },
        { id: 'r', nome: '', desenhar: function (x) {
          return RF.pode('usuarios:editar') && !excl ? ui.botao(T('Registrar aceite', 'Record acceptance'), function () {
            u.termosAceitos = u.termosAceitos || []; u.termosAceitos.push({ termo: x.t.id, versao: x.v.versao, quando: U.agora(), via: 'registro manual' });
            RF.mudar('usuarios', 'usuarios', 'termo-aceite', u.id, null, { termo: x.t.id, versao: x.v.versao }, T('Aceite registrado manualmente', 'Acceptance recorded manually')).then(RF.renderizar);
          }, 'p') : null;
        } }
      ], pubs, { vazio: T('Nenhum termo publicado ainda.', 'No terms published yet.') })]));
      box.appendChild(ui.secao(T('Consentimentos (LGPD)', 'Consents (LGPD)'), [ui.tabela([
        { id: 'c', nome: T('Consentimento', 'Consent'), valor: function (c) { return T(c.nome); } },
        { id: 'app', nome: 'App', valor: function (c) { return H.nomeApp(c.app); } },
        { id: 'e', nome: T('Situação', 'Status'), desenhar: function (c) {
          var r = (u.consentimentos || []).filter(function (x) { return x.tipo === c.id; }).slice(-1)[0];
          return r ? ui.selo((r.dado ? T('dado', 'given') : T('negado/revogado', 'refused/withdrawn')) + ' · ' + U.data(r.quando), r.dado ? 'ok' : 'cinza') : ui.selo(T('não perguntado', 'not asked'), 'cinza');
        } },
        { id: 'x', nome: '', desenhar: function (c) {
          if (!RF.pode('usuarios:editar') || excl) return null;
          return ui.botao(T('Registrar mudança', 'Record change'), function () {
            var r = (u.consentimentos || []).filter(function (x) { return x.tipo === c.id; }).slice(-1)[0];
            var novoV = !(r && r.dado);
            ui.confirmar(T('Registrar consentimento', 'Record consent'), (novoV ? T('Registrar que a pessoa DEU o consentimento "', 'Record that the person GAVE consent "') : T('Registrar que a pessoa REVOGOU "', 'Record that the person WITHDREW "')) + T(c.nome) + '"?', { motivo: true }).then(function (ok) {
              if (!ok) return;
              u.consentimentos = u.consentimentos || []; u.consentimentos.push({ tipo: c.id, dado: novoV, quando: U.agora(), motivo: ok.motivo, quem: S.pessoa.email });
              RF.mudar('usuarios', 'usuarios', 'consentimento', u.id, r || null, { tipo: c.id, dado: novoV, motivo: ok.motivo }, T('Consentimento registrado: ', 'Consent recorded: ') + c.id).then(RF.renderizar);
            });
          }, 'p');
        } }
      ], C.lista('consentimentos'))]));
    }
    if (abaFicha === 'chamados') {
      box.appendChild(el('div', { class: 'rf-acoes' }, [!excl ? ui.botaoSe('suporte:criar', null, '+ ' + T('Abrir chamado para esta pessoa', 'Open ticket for this person'), function () { RF.h.novoChamado({ usuario: u.id, app: (u.apps[0] || {}).app }); }, 'pri') : null]));
      box.appendChild(RF.h.tabelaChamados(chs));
    }
    if (abaFicha === 'notas') {
      var texto = ui.entrada('', { linhas: 3, attrs: { 'aria-label': T('Nova nota interna', 'New internal note') } });
      if (RF.pode('usuarios:editar') && !excl) box.appendChild(el('div', { class: 'rf-form' }, [ui.campo(T('Nova nota interna (a pessoa não vê)', 'New internal note (the person does not see it)'), texto),
        ui.botao(T('Salvar nota', 'Save note'), function () {
          if (!texto.value.trim()) return;
          var n = { id: U.uid('n-'), quando: U.agora(), quem: S.pessoa.email, texto: texto.value.trim() };
          u.notas = u.notas || []; u.notas.push(n);
          RF.mudar('usuarios', 'usuarios', 'nota', u.id, null, n, T('Nota acrescentada', 'Note added')).then(RF.renderizar);
        }, 'pri')]));
      box.appendChild(el('ol', { class: 'rf-linha-tempo' }, (u.notas || []).slice().reverse().map(function (n) {
        return el('li', {}, [el('small', { class: 'rf-dica', texto: U.data(n.quando, true) + ' · ' + n.quem }), el('p', { texto: n.texto })]);
      })));
    }
    if (abaFicha === 'familia') {
      var fam = u.familia || null;
      var membros = fam ? C.lista('usuarios').filter(function (x) { return x.familia && x.familia.grupo === fam.grupo; }) : [u];
      box.appendChild(ui.cinza('usuarios.familia', el('div', {}, [
        el('p', { texto: fam ? T('Grupo familiar com ', 'Family group with ') + membros.length + T(' pessoa(s).', ' person(s).') : T('Sem grupo familiar.', 'No family group.') }),
        fam ? el('ul', {}, membros.map(function (m) { return el('li', {}, [el('a', { href: '#/usuarios/ficha/' + m.id, texto: m.nome }), ' · ', T(m.familia.papel === 'responsavel' ? { pt: 'responsável', en: 'owner' } : { pt: 'membro', en: 'member' })]); })) : null,
        RF.pode('usuarios:editar') && !excl ? ui.botao(T('Vincular a outra pessoa', 'Link to another person'), function () { vincularFamilia(u); }, 'p') : null
      ])));
    }
    if (abaFicha === 'historico') {
      var logs = C.lista('log').filter(function (e) { return e.alvo === u.id; }).slice().reverse();
      box.appendChild(el('ol', { class: 'rf-linha-tempo' }, logs.map(function (e) {
        return el('li', {}, [el('small', { class: 'rf-dica', texto: U.data(e.quando, true) + ' · ' + e.quem }), el('p', { texto: e.resumo || e.acao })]);
      })));
      if (!logs.length) box.appendChild(el('p', { class: 'rf-dica', texto: T('Sem registros.', 'No entries.') }));
    }
  }
  function editorEtiquetas(u) {
    var todas = C.obj('config').etiquetas || [];
    var caixa = el('div', { class: 'rf-chips' });
    (u.etiquetas || []).forEach(function (e) {
      caixa.appendChild(el('span', { class: 'rf-chip' }, ['#' + e, RF.pode('usuarios:editar') ? el('button', { type: 'button', class: 'rf-chip-x', 'aria-label': T('Tirar ', 'Remove ') + e, texto: '✕', onclick: function () {
        u.etiquetas = u.etiquetas.filter(function (x) { return x !== e; });
        RF.mudar('usuarios', 'usuarios', 'etiqueta-tirar', u.id, e, null, T('Etiqueta tirada: ', 'Tag removed: ') + e).then(RF.renderizar);
      } }) : null]));
    });
    if (RF.pode('usuarios:editar')) {
      var nova = ui.entrada('', { attrs: { list: 'rf-etq', placeholder: T('nova etiqueta', 'new tag'), 'aria-label': T('Nova etiqueta', 'New tag'), style: 'max-width:12rem' } });
      var dl = el('datalist', { id: 'rf-etq' }, todas.map(function (e) { return el('option', { value: e }); }));
      caixa.appendChild(nova); caixa.appendChild(dl);
      caixa.appendChild(ui.botao('+', function () {
        var e = U.semAcento(nova.value.trim()).replace(/\s+/g, '-'); if (!e) return;
        u.etiquetas = u.etiquetas || []; if (u.etiquetas.indexOf(e) === -1) u.etiquetas.push(e);
        var cfg = C.obj('config'); cfg.etiquetas = cfg.etiquetas || []; if (cfg.etiquetas.indexOf(e) === -1) { cfg.etiquetas.push(e); C.salvar('config'); }
        RF.mudar('usuarios', 'usuarios', 'etiqueta', u.id, null, e, T('Etiqueta: ', 'Tag: ') + e).then(RF.renderizar);
      }, 'p', { 'aria-label': T('Acrescentar etiqueta', 'Add tag') }));
    }
    return caixa;
  }
  function acoesUsuario(u) {
    var lista = el('div', { class: 'rf-lista-acoes' }, [
      u.status === 'bloqueado' ? ui.botaoSe('usuarios.conta:editar', null, '✅ ' + T('Desbloquear', 'Unblock'), function () { bloquear(u, false); })
        : ui.botaoSe('usuarios.conta:editar', null, '⛔ ' + T('Bloquear', 'Block'), function () { bloquear(u, true); }),
      ui.botaoSe('usuarios.conta:editar', null, '💎 ' + T('Trocar plano', 'Change plan'), function () { ui.fecharModal(); setTimeout(function () { trocarPlano(u); }, 60); }),
      ui.botaoSe('suporte:criar', null, '🎧 ' + T('Abrir chamado', 'Open ticket'), function () { ui.fecharModal(); setTimeout(function () { RF.h.novoChamado({ usuario: u.id, app: (u.apps[0] || {}).app }); }, 60); }),
      ui.botaoSe('privacidade:criar', null, '⚖ ' + T('Registrar pedido de privacidade', 'Log a privacy request'), function () { ui.fecharModal(); setTimeout(function () { RF.h.novoPedido({ usuario: u.id }); }, 60); }),
      ui.botaoSe('usuarios:exportar', null, '⬇ ' + T('Exportar dados desta pessoa (LGPD)', 'Export this person\'s data (LGPD)'), function () { exportarTitular(u); }),
      ui.botaoCinza('✉ ' + T('Mandar recado só para esta pessoa', 'Send a notice to this person only'), 'usuarios.recado'),
      ui.botaoCinza('👁 ' + T('Ver o app como esta pessoa', 'See the app as this person'), 'usuarios.ver-como'),
      ui.botaoSe('usuarios:excluir', null, '🗑 ' + T('Excluir e anonimizar', 'Delete and anonymise'), function () { ui.fecharModal(); setTimeout(function () { excluirTitular(u); }, 60); }, 'perigo')
    ]);
    ui.modal(T('Ações — ', 'Actions — ') + u.nome, lista);
  }
  function bloquear(u, sim) {
    ui.fecharModal();
    setTimeout(function () {
      ui.confirmar(sim ? T('Bloquear usuário', 'Block user') : T('Desbloquear usuário', 'Unblock user'),
        sim ? T('Com o servidor, a pessoa não entra mais nos apps até ser desbloqueada. Hoje, fica registrado aqui e no log.', 'With the server, the person cannot sign in until unblocked. Today it is recorded here and in the log.')
            : T('A pessoa volta a ter acesso.', 'The person regains access.'), { motivo: true, perigo: sim }).then(function (ok) {
        if (!ok) return;
        var antes = { status: u.status, motivo: u.motivoBloqueio };
        u.status = sim ? 'bloqueado' : 'ativo'; u.motivoBloqueio = sim ? ok.motivo : '';
        RF.mudar('usuarios', 'usuarios', sim ? 'bloquear' : 'desbloquear', u.id, antes, { status: u.status, motivo: ok.motivo },
          (sim ? T('Bloqueado: ', 'Blocked: ') : T('Desbloqueado: ', 'Unblocked: ')) + u.nome + ' — ' + ok.motivo).then(RF.renderizar);
      });
    }, 60);
  }
  function trocarPlano(u) {
    var plano = ui.escolha(H.opcoesPlanos(), u.plano);
    var motivo = ui.entrada('', { linhas: 2 });
    ui.modal(T('Trocar plano — ', 'Change plan — ') + u.nome, el('div', { class: 'rf-form' }, [ui.campo(T('Novo plano', 'New plan'), plano), ui.campo(T('Motivo (fica no histórico e no log)', 'Reason (kept in history and log)'), motivo),
      el('p', { class: 'rf-dica', texto: T('Enquanto não houver cobrança, é assim que o Premium é dado.', 'Until billing exists, this is how Premium is granted.') })]),
      { rodape: [ui.botao(T('Trocar', 'Change'), function () {
        if (plano.value === u.plano) return ui.fecharModal();
        if (!motivo.value.trim()) return ui.aviso(T('Escreva o motivo.', 'Write the reason.'), 'erro');
        var antes = u.plano, agora = U.agora();
        (u.historicoPlano || []).forEach(function (h) { if (!h.ate) h.ate = agora; });
        u.historicoPlano = (u.historicoPlano || []).concat([{ plano: plano.value, de: agora, quem: S.pessoa.email, motivo: motivo.value.trim() }]);
        u.plano = plano.value;
        RF.mudar('usuarios', 'usuarios', 'plano', u.id, antes, u.plano, T('Plano: ', 'Plan: ') + antes + ' → ' + u.plano + ' (' + motivo.value.trim() + ')').then(function () { ui.fecharModal(); RF.renderizar(); });
      }, 'pri')] });
  }
  function exportarTitular(u) {
    var pacote = { geradoEm: U.agora(), geradoPor: 'RootifyONE', titular: u,
      chamados: C.lista('chamados').filter(function (c) { return c.usuario === u.id; }),
      pedidosPrivacidade: C.lista('pedidos').filter(function (p) { return p.usuario === u.id; }),
      observacao: 'Dados que a SolverONE registra sobre esta pessoa no RootifyONE. Dados guardados no aparelho da própria pessoa não passam por aqui.' };
    U.baixar('dados-' + u.apelido + '-' + U.agora().slice(0, 10) + '.json', JSON.stringify(pacote, null, 2), 'application/json');
    RF.Log.registrar('usuarios', 'exportar-titular', u.id, null, null, T('Dados do titular exportados: ', 'Data subject export: ') + u.nome);
  }
  function excluirTitular(u) {
    ui.confirmar(T('Excluir e anonimizar', 'Delete and anonymise'),
      T('Nome, e-mail, telefone, nascimento e notas são apagados; sobra só um registro anônimo para o histórico e o log. Não dá para desfazer.', 'Name, e-mail, phone, birth date and notes are erased; only an anonymous record remains for history and log. Cannot be undone.'),
      { perigo: true, motivo: true, digitar: u.email || u.apelido, digitarRotulo: T('Digite ', 'Type ') + (u.email ? T('o e-mail da pessoa', 'the person\'s e-mail') : T('o apelido', 'the nickname')) + T(' para confirmar', ' to confirm') }).then(function (ok) {
      if (!ok) return;
      var ref = u.apelido;
      U.sha256(u.email || u.id).then(function (h) {
        u.nome = T('Titular excluído', 'Deleted subject'); u.apelido = 'excluido-' + h.slice(0, 8); u.email = ''; u.telefone = ''; u.nascimento = '';
        u.notas = []; u.etiquetas = []; u.status = 'excluido'; u.excluidoEm = U.agora(); u.motivoExclusao = ok.motivo; u.hashEmail = h;
        C.lista('chamados').forEach(function (c) { if (c.usuario === u.id) { c.contato = null; c.mensagens.forEach(function (m) { if (m.autor === 'cliente') m.texto = '[' + T('apagado a pedido do titular', 'erased at the subject\'s request') + ']'; }); } });
        C.salvar('chamados');
        RF.mudar('usuarios', 'usuarios', 'excluir', u.id, { apelido: ref }, { hashEmail: h }, T('Titular excluído e anonimizado — ', 'Subject deleted and anonymised — ') + ok.motivo).then(function () { RF.Rota.ir('usuarios'); });
      });
    });
  }
  function vincularFamilia(u) {
    var outros = C.lista('usuarios').filter(function (x) { return x.id !== u.id && x.status !== 'excluido' && H.usuarioNoEscopo(x); });
    var sel = ui.escolha(outros.map(function (x) { return [x.id, x.nome + ' (@' + x.apelido + ')']; }), '');
    var papel = ui.escolha([['responsavel', T('Esta pessoa é a responsável', 'This person is the owner')], ['membro', T('Esta pessoa é membro', 'This person is a member')]], 'responsavel');
    ui.modal(T('Vincular família', 'Link family'), el('div', { class: 'rf-form' }, [ui.campo(T('Outra pessoa', 'Other person'), sel), ui.campo(T('Papel de ', 'Role of ') + u.nome, papel),
      el('p', { class: 'rf-dica', texto: T(RF.cat.funcao('usuarios.familia').falta) })]),
      { rodape: [ui.botao(T('Vincular', 'Link'), function () {
        var o = H.usuario(sel.value); if (!o) return;
        var grupo = (o.familia && o.familia.grupo) || (u.familia && u.familia.grupo) || U.uid('fam-');
        u.familia = { grupo: grupo, papel: papel.value };
        if (!o.familia) o.familia = { grupo: grupo, papel: papel.value === 'responsavel' ? 'membro' : 'responsavel' };
        RF.mudar('usuarios', 'usuarios', 'familia', u.id, null, { grupo: grupo, com: o.id }, T('Vínculo de família: ', 'Family link: ') + u.nome + ' + ' + o.nome).then(function () { ui.fecharModal(); RF.renderizar(); });
      }, 'pri')] });
  }

  /* ------------------------------------------------------------------
     SUPORTE (CS)
     ------------------------------------------------------------------ */
  var filtroCh = { app: '', prioridade: '', categoria: '', texto: '' };
  RF.telas.suporte = function (area, rota) {
    if (rota.sub === 'chamado' && rota.id) return telaChamado(area, rota.id);
    var aba = rota.sub || 'minha';
    RF.pagina(area, 'suporte', T('Fila de atendimento com prazo por prioridade. Respostas ficam registradas; a entrega automática ao cliente chega com o servidor.', 'Service queue with deadline per priority. Replies are recorded; automatic delivery to the customer arrives with the server.'), [
      ui.botaoSe('suporte:criar', null, T('Importar do formulário (CSV)', 'Import from form (CSV)'), importarFormspree),
      ui.botaoSe('suporte:criar', null, '+ ' + T('Novo chamado', 'New ticket'), function () { novoChamado({}); }, 'pri')
    ]);
    var todos = C.lista('chamados').filter(function (c) { return RF.noEscopo(c.app) && !c.mescladoEm; });
    var abertos = todos.filter(function (c) { return c.status !== 'resolvido' && c.status !== 'fechado'; });
    var visoes = {
      minha: abertos.filter(function (c) { return c.responsavel === S.pessoa.id; }),
      sem: abertos.filter(function (c) { return !c.responsavel; }),
      abertos: abertos,
      risco: abertos.filter(function (c) { var s = D.Chamados.situacao(c); return s === 'risco' || s === 'estourado'; }),
      todos: todos
    };
    area.appendChild(ui.abas([
      { id: 'minha', nome: T('Minha fila', 'My queue'), conta: visoes.minha.length }, { id: 'sem', nome: T('Sem responsável', 'Unassigned'), conta: visoes.sem.length },
      { id: 'abertos', nome: T('Abertos', 'Open'), conta: visoes.abertos.length }, { id: 'risco', nome: T('Prazo em risco', 'Deadline at risk'), conta: visoes.risco.length },
      { id: 'todos', nome: T('Todos', 'All') }, { id: 'relatorios', nome: T('Relatórios', 'Reports') },
      { id: 'config', nome: T('Prazos e respostas', 'Deadlines and replies') }
    ], aba, function (a) { RF.Rota.ir('suporte', a); }));
    if (aba === 'relatorios') return relatoriosSuporte(area, todos);
    if (aba === 'config') return configSuporte(area);
    var lista = visoes[aba] || abertos;
    var busca = ui.entrada(filtroCh.texto, { tipo: 'search', attrs: { placeholder: T('Assunto, #número ou cliente', 'Subject, #number or customer'), 'aria-label': T('Procurar', 'Search') } });
    var fApp = ui.escolha([['', T('Todos', 'All')]].concat(H.opcoesApps(false, true)), filtroCh.app);
    var fPri = ui.escolha([['', T('Todas', 'All')]].concat(Object.keys(RF.cat.PRIORIDADES).map(function (k) { return [k, T(RF.cat.PRIORIDADES[k])]; })), filtroCh.prioridade);
    var fCat = ui.escolha([['', T('Todas', 'All')]].concat(RF.cat.CATEGORIAS_CHAMADO.map(function (c) { return [c.id, T(c.nome)]; })), filtroCh.categoria);
    var bloco = el('div');
    function filtrar() {
      filtroCh = { texto: busca.value, app: fApp.value, prioridade: fPri.value, categoria: fCat.value };
      var q = U.semAcento(filtroCh.texto.replace('#', ''));
      var l = lista.filter(function (c) {
        if (filtroCh.app && c.app !== filtroCh.app) return false;
        if (filtroCh.prioridade && c.prioridade !== filtroCh.prioridade) return false;
        if (filtroCh.categoria && c.categoria !== filtroCh.categoria) return false;
        if (q && U.semAcento(c.numero + ' ' + c.assunto + ' ' + H.nomeCliente(c)).indexOf(q) === -1) return false;
        return true;
      });
      U.limpar(bloco); bloco.appendChild(tabelaChamados(l));
    }
    busca.addEventListener('input', filtrar);
    [fApp, fPri, fCat].forEach(function (s) { s.addEventListener('change', filtrar); });
    area.appendChild(el('div', { class: 'rf-filtros' }, [ui.campo(T('Procurar', 'Search'), busca), ui.campo('App', fApp), ui.campo(T('Prioridade', 'Priority'), fPri), ui.campo(T('Categoria', 'Category'), fCat)]));
    area.appendChild(bloco); filtrar();
    area.appendChild(el('div', { class: 'rf-grade-2' }, [ui.cinza('suporte.email'), ui.cinza('suporte.whatsapp'), ui.cinza('suporte.formspree'), ui.cinza('suporte.csat')]));
  };
  function tabelaChamados(lista) {
    var ordemPri = { urgente: 0, alta: 1, normal: 2, baixa: 3 };
    return ui.tabela([
      { id: 'num', nome: '#', valor: function (c) { return c.numero; }, ordenar: function (c) { return c.numero; } },
      { id: 'assunto', nome: T('Assunto', 'Subject'), valor: function (c) { return c.assunto; }, desenhar: function (c) {
        return el('span', {}, [el('strong', { texto: c.assunto }), el('br'), el('small', { class: 'rf-dica', texto: H.nomeApp(c.app) + ' · ' + T((RF.cat.CATEGORIAS_CHAMADO.filter(function (x) { return x.id === c.categoria; })[0] || { nome: { pt: c.categoria, en: c.categoria } }).nome) })]);
      } },
      { id: 'pri', nome: T('Prioridade', 'Priority'), ordenar: function (c) { return ordemPri[c.prioridade]; }, desenhar: function (c) { return H.seloPrioridade(c.prioridade); } },
      { id: 'status', nome: T('Situação', 'Status'), valor: function (c) { return c.status; }, desenhar: function (c) { return H.seloStatus(c.status); } },
      { id: 'prazo', nome: T('Prazo', 'Deadline'), ordenar: function (c) { return c.primeiraResposta ? c.prazoResolucao : c.prazoResposta; }, desenhar: H.seloPrazo },
      { id: 'resp', nome: T('Responsável', 'Assignee'), valor: function (c) { return c.responsavel ? H.nomeEquipe(c.responsavel) : '—'; } },
      { id: 'cliente', nome: T('Cliente', 'Customer'), valor: H.nomeCliente },
      { id: 'criado', nome: T('Aberto em', 'Opened'), ordenar: function (c) { return c.criadoEm; }, desenhar: function (c) { return U.data(c.criadoEm, true); } }
    ], lista, { aoClicar: function (c) { RF.Rota.ir('suporte', 'chamado', c.id); }, ordem: 'prazo', rotulo: T('Chamados', 'Tickets'),
      vazio: T('Nenhum chamado aqui. 🎉', 'No tickets here. 🎉'), classeLinha: function (c) { return D.Chamados.situacao(c) === 'estourado' && c.status !== 'resolvido' && c.status !== 'fechado' ? 'rf-lin-alerta' : null; } });
  }
  RF.h.tabelaChamados = tabelaChamados;

  function novoChamado(pre) {
    pre = pre || {};
    var assunto = ui.entrada('', { attrs: { autofocus: true } });
    var app = ui.escolha(H.opcoesApps(true, true), pre.app || '*');
    var cat = ui.escolha(RF.cat.CATEGORIAS_CHAMADO.map(function (c) { return [c.id, T(c.nome)]; }), pre.categoria || 'duvida');
    var pri = ui.escolha(Object.keys(RF.cat.PRIORIDADES).map(function (k) { return [k, T(RF.cat.PRIORIDADES[k])]; }), 'normal');
    var canal = ui.escolha(Object.keys(RF.cat.CANAIS).map(function (k) { return [k, T(RF.cat.CANAIS[k])]; }), 'interno');
    var usuarios = C.lista('usuarios').filter(function (u) { return u.status !== 'excluido' && H.usuarioNoEscopo(u); });
    var cliente = ui.escolha([['', T('— não cadastrado (preencher abaixo) —', '— not registered (fill in below) —')]].concat(usuarios.map(function (u) { return [u.id, u.nome + ' (@' + u.apelido + ')']; })), pre.usuario || '');
    var cNome = ui.entrada(''), cEmail = ui.entrada('', { tipo: 'email' });
    var texto = ui.entrada('', { linhas: 4 });
    var resp = ui.escolha(H.opcoesEquipe(T('— sem responsável —', '— unassigned —')), RF.pode('suporte.atribuir:editar') ? '' : S.pessoa.id, { disabled: !RF.pode('suporte.atribuir:editar') });
    var contato = el('div', { class: 'rf-grade-2' }, [ui.campo(T('Nome do contato', 'Contact name'), cNome), ui.campo(T('E-mail do contato', 'Contact e-mail'), cEmail)]);
    cliente.onchange = function () { contato.hidden = !!cliente.value; };
    contato.hidden = !!cliente.value;
    ui.modal(T('Novo chamado', 'New ticket'), el('div', { class: 'rf-form' }, [ui.campo(T('Assunto', 'Subject'), assunto),
      el('div', { class: 'rf-grade-3' }, [ui.campo('App', app), ui.campo(T('Categoria', 'Category'), cat), ui.campo(T('Prioridade', 'Priority'), pri)]),
      el('div', { class: 'rf-grade-2' }, [ui.campo(T('Canal', 'Channel'), canal), ui.campo(T('Responsável', 'Assignee'), resp)]),
      ui.campo(T('Cliente', 'Customer'), cliente), contato, ui.campo(T('O que a pessoa relatou', 'What the person reported'), texto)]),
      { largo: true, rodape: [ui.botao(T('Abrir chamado', 'Open ticket'), function () {
        if (!assunto.value.trim()) return ui.aviso(T('Escreva o assunto.', 'Write the subject.'), 'erro');
        var ch = D.Chamados.criar({ assunto: assunto.value.trim(), app: app.value, categoria: cat.value, prioridade: pri.value, canal: canal.value,
          usuario: cliente.value || null, contato: cliente.value ? null : { nome: cNome.value.trim(), email: cEmail.value.trim() }, texto: texto.value.trim(), responsavel: resp.value || null });
        D.Automacoes.rodar('chamado-criado', ch, null);
        RF.mudar('chamados', 'suporte', 'criar', ch.id, null, { numero: ch.numero, assunto: ch.assunto, prioridade: ch.prioridade }, T('Chamado aberto #', 'Ticket opened #') + ch.numero)
          .then(function () { ui.fecharEIr('suporte', 'chamado', ch.id); });
      }, 'pri')] });
  }
  RF.h.novoChamado = novoChamado;

  function telaChamado(area, id) {
    var ch = C.lista('chamados').filter(function (c) { return c.id === id; })[0];
    if (!ch || !RF.noEscopo(ch.app)) { area.appendChild(el('div', { class: 'rf-vazio' }, [el('p', { texto: T('Chamado não encontrado.', 'Ticket not found.') })])); return; }
    var podeEd = RF.pode('suporte:editar', ch.app), podeAtr = RF.pode('suporte.atribuir:editar', ch.app);
    var u = ch.usuario && H.usuario(ch.usuario);
    area.appendChild(el('div', { class: 'rf-pag-cab' }, [
      el('div', {}, [el('h1', { class: 'rf-pag-tit', texto: '#' + ch.numero + ' · ' + ch.assunto }),
        el('p', {}, [H.seloStatus(ch.status), ' ', H.seloPrioridade(ch.prioridade), ' ', H.seloPrazo(ch), ' ', ch.nivel === 2 ? ui.selo(T('nível 2', 'tier 2'), 'atencao') : null,
          ch.mescladoEm ? ui.selo(T('juntado a outro', 'merged'), 'cinza') : null, ch.exemplo ? ui.selo(T('exemplo', 'sample'), 'cinza') : null])]),
      el('div', { class: 'rf-acoes' }, [ui.botao('‹ ' + T('Fila', 'Queue'), function () { RF.Rota.ir('suporte'); }, 'p')])
    ]));
    var grade = el('div', { class: 'rf-chamado' });
    /* conversa */
    var conversa = el('div', { class: 'rf-conversa' });
    ch.mensagens.forEach(function (m) {
      var autor = m.autor === 'cliente' ? H.nomeCliente(ch) : m.autor === 'sistema' ? T('Sistema', 'System') : (H.pessoaEquipe(m.autor) || C.pessoa(m.autor) || { nome: m.autor }).nome;
      conversa.appendChild(el('div', { class: 'rf-msg rf-msg-' + (m.tipo === 'interna' ? 'interna' : m.autor === 'cliente' ? 'cliente' : 'equipe') }, [
        el('div', { class: 'rf-msg-cab' }, [el('strong', { texto: autor }), ' · ', U.data(m.quando, true), m.tipo === 'interna' ? ' · 🔒 ' + T('nota interna', 'internal note') : '']),
        el('p', { texto: m.texto })
      ]));
    });
    if (!ch.mensagens.length) conversa.appendChild(el('p', { class: 'rf-dica', texto: T('Sem mensagens.', 'No messages.') }));
    var fechado = ch.status === 'fechado' || ch.mescladoEm;
    if (podeEd && !fechado) {
      var caixa = ui.entrada('', { linhas: 5, attrs: { 'aria-label': T('Sua resposta', 'Your reply') } });
      var prontas = ui.escolha([['', T('Respostas prontas…', 'Canned replies…')]].concat(C.lista('respostas').map(function (r) { return [r.id, T(r.titulo)]; })), '');
      prontas.onchange = function () {
        var r = C.lista('respostas').filter(function (x) { return x.id === prontas.value; })[0]; if (!r) return;
        var a = H.app(ch.app);
        caixa.value = (caixa.value ? caixa.value + '\n\n' : '') + T(r.texto).replace(/\{nome\}/g, (u ? u.nome : (ch.contato && ch.contato.nome) || '').split(' ')[0]).replace(/\{app\}/g, a ? T(a.nome) : 'app');
        prontas.value = '';
        caixa.focus();
      };
      var btIA = ui.botao('✨ ' + T('Sugerir resposta (IA)', 'Suggest reply (AI)'), function () { sugerirIA(ch, caixa); }, 'p');
      function enviar(tipo, status) {
        if (!caixa.value.trim()) return ui.aviso(T('Escreva a mensagem.', 'Write the message.'), 'erro');
        var antes = ch.status;
        var m = D.Chamados.responder(ch, caixa.value.trim(), tipo, S.pessoa.email);
        if (status) { ch.status = status; if (status === 'resolvido') ch.resolvidoEm = U.agora(); }
        RF.mudar('chamados', 'suporte', tipo === 'interna' ? 'nota' : 'responder', ch.id, antes, ch.status, (tipo === 'interna' ? T('Nota interna em #', 'Internal note on #') : T('Resposta em #', 'Reply on #')) + ch.numero)
          .then(function () {
            if (tipo === 'publica') entregar(ch, m.texto, u);
            RF.renderizar();
          });
      }
      conversa.appendChild(el('div', { class: 'rf-responder' }, [
        el('div', { class: 'rf-linha' }, [prontas, btIA]), caixa,
        el('div', { class: 'rf-acoes' }, [
          ui.botao('🔒 ' + T('Nota interna', 'Internal note'), function () { enviar('interna'); }),
          ui.botao(T('Responder e aguardar cliente', 'Reply and wait on customer'), function () { enviar('publica', 'aguardando-cliente'); }),
          ui.botao(T('Responder e resolver', 'Reply and solve'), function () { enviar('publica', 'resolvido'); }),
          ui.botao(T('Responder', 'Reply'), function () { enviar('publica', ch.status === 'novo' ? 'aberto' : null); }, 'pri')
        ]),
        el('p', { class: 'rf-dica', texto: T('A resposta fica registrada aqui. Para chegar à pessoa hoje, use "Enviar por e-mail" ou copie; a entrega automática vem com o servidor.',
          'The reply is recorded here. To reach the person today, use "Send by e-mail" or copy it; automatic delivery comes with the server.') })
      ]));
    }
    grade.appendChild(conversa);

    /* painel lateral */
    var lado = el('aside', { class: 'rf-chamado-lado' });
    function campoLado(rotulo, controle) { lado.appendChild(ui.campo(rotulo, controle)); }
    var sStatus = ui.escolha(Object.keys(RF.cat.STATUS_CHAMADO).map(function (k) { return [k, T(RF.cat.STATUS_CHAMADO[k])]; }), ch.status, { disabled: !podeEd || !!ch.mescladoEm });
    var sPri = ui.escolha(Object.keys(RF.cat.PRIORIDADES).map(function (k) { return [k, T(RF.cat.PRIORIDADES[k])]; }), ch.prioridade, { disabled: !podeEd });
    var sCat = ui.escolha(RF.cat.CATEGORIAS_CHAMADO.map(function (c) { return [c.id, T(c.nome)]; }), ch.categoria, { disabled: !podeEd });
    var sApp = ui.escolha(H.opcoesApps(true, true), ch.app, { disabled: !podeEd });
    var sResp = ui.escolha(H.opcoesEquipe(T('— sem responsável —', '— unassigned —')), ch.responsavel || '', { disabled: !podeAtr });
    function mudarCampo(campo, valor, rot) {
      var antes = ch[campo]; if (antes === valor) return;
      ch[campo] = valor;
      if (campo === 'prioridade') { var p = D.Chamados.prazos(valor, ch.criadoEm); ch.prazoResposta = p.resposta; ch.prazoResolucao = p.resolucao; }
      if (campo === 'status' && valor === 'resolvido') ch.resolvidoEm = U.agora();
      if (campo === 'status' && valor === 'fechado') ch.fechadoEm = U.agora();
      RF.mudar('chamados', 'suporte', 'editar-' + campo, ch.id, antes, valor, '#' + ch.numero + ' · ' + rot + ': ' + antes + ' → ' + valor).then(RF.renderizar);
    }
    sStatus.onchange = function () { mudarCampo('status', sStatus.value, T('situação', 'status')); };
    sPri.onchange = function () { mudarCampo('prioridade', sPri.value, T('prioridade', 'priority')); };
    sCat.onchange = function () { mudarCampo('categoria', sCat.value, T('categoria', 'category')); };
    sApp.onchange = function () { mudarCampo('app', sApp.value, 'app'); };
    sResp.onchange = function () { mudarCampo('responsavel', sResp.value || null, T('responsável', 'assignee')); };
    campoLado(T('Situação', 'Status'), sStatus); campoLado(T('Prioridade', 'Priority'), sPri); campoLado(T('Categoria', 'Category'), sCat);
    campoLado('App', sApp); campoLado(T('Responsável', 'Assignee'), sResp);
    lado.appendChild(el('dl', { class: 'rf-dl' }, [
      el('dt', { texto: T('Cliente', 'Customer') }), el('dd', {}, [u ? el('a', { href: '#/usuarios/ficha/' + u.id, texto: u.nome }) : H.nomeCliente(ch)]),
      el('dt', { texto: T('Canal', 'Channel') }), el('dd', { texto: T(RF.cat.CANAIS[ch.canal] || { pt: ch.canal, en: ch.canal }) }),
      el('dt', { texto: T('Aberto em', 'Opened') }), el('dd', { texto: U.data(ch.criadoEm, true) }),
      el('dt', { texto: T('1ª resposta até', '1st reply by') }), el('dd', { texto: U.data(ch.prazoResposta, true) + (ch.primeiraResposta ? ' · ✓ ' + U.data(ch.primeiraResposta, true) : '') }),
      el('dt', { texto: T('Resolver até', 'Solve by') }), el('dd', { texto: U.data(ch.prazoResolucao, true) }),
      el('dt', { texto: T('Etiquetas', 'Tags') }), el('dd', { texto: (ch.etiquetas || []).map(function (e) { return '#' + e; }).join(' ') || '—' })
    ]));
    var acoes = el('div', { class: 'rf-lista-acoes' });
    if (podeAtr && ch.nivel !== 2 && !fechado) acoes.appendChild(ui.botao('⬆ ' + T('Escalar para o nível 2', 'Escalate to tier 2'), function () {
      ui.confirmar(T('Escalar', 'Escalate'), T('O chamado vai para o nível 2 e perde o responsável atual.', 'The ticket goes to tier 2 and loses its current assignee.'), { motivo: true }).then(function (ok) {
        if (!ok) return;
        ch.nivel = 2; ch.responsavel = null;
        D.Chamados.responder(ch, T('Escalado para o nível 2: ', 'Escalated to tier 2: ') + ok.motivo, 'interna', S.pessoa.email);
        RF.mudar('chamados', 'suporte', 'escalar', ch.id, 1, 2, '#' + ch.numero + T(' escalado: ', ' escalated: ') + ok.motivo).then(RF.renderizar);
      });
    }));
    if (podeEd && !fechado) acoes.appendChild(ui.botao('🔗 ' + T('Juntar a outro chamado', 'Merge into another ticket'), function () { juntarChamado(ch); }));
    if (podeEd && !fechado && !ch.responsavel) acoes.appendChild(ui.botao('🙋 ' + T('Assumir este chamado', 'Take this ticket'), function () { mudarCampo('responsavel', S.pessoa.id, T('responsável', 'assignee')); }));
    if (u && (u.email) && RF.pode('usuarios.pii:ver')) acoes.appendChild(ui.botao('✉ ' + T('Enviar a última resposta por e-mail', 'Send the last reply by e-mail'), function () {
      var ult = ch.mensagens.filter(function (m) { return m.tipo === 'publica' && m.autor !== 'cliente'; }).slice(-1)[0];
      if (!ult) return ui.aviso(T('Ainda não há resposta.', 'No reply yet.'), 'info');
      entregar(ch, ult.texto, u, true);
    }));
    if (RF.pode('suporte:excluir', ch.app)) acoes.appendChild(ui.botao('🗑 ' + T('Excluir chamado', 'Delete ticket'), function () {
      ui.confirmar(T('Excluir chamado', 'Delete ticket'), T('Some da fila. O log guarda que existiu.', 'It leaves the queue. The log keeps a record that it existed.'), { perigo: true, motivo: true }).then(function (ok) {
        if (!ok) return;
        C.db.chamados = C.lista('chamados').filter(function (c) { return c.id !== ch.id; });
        RF.mudar('chamados', 'suporte', 'excluir', ch.id, { numero: ch.numero, assunto: ch.assunto }, null, T('Chamado excluído #', 'Ticket deleted #') + ch.numero + ' — ' + ok.motivo).then(function () { RF.Rota.ir('suporte'); });
      });
    }, 'perigo'));
    lado.appendChild(acoes);
    lado.appendChild(ui.cinza('suporte.csat'));
    grade.appendChild(lado);
    area.appendChild(grade);
  }
  /* resposta para o cliente: vira um e-mail na caixa de saída (modelo "Resposta de
     chamado", remetente suporte@). Sem provedor, abre no programa de e-mail. */
  function entregar(ch, texto, u, forcar) {
    var email = u ? u.email : ch.contato && ch.contato.email;
    if (!forcar) { ui.aviso(T('Resposta registrada.', 'Reply recorded.')); return; }
    if (!email) return ui.aviso(T('Sem e-mail do cliente.', 'No customer e-mail.'), 'erro');
    if (!RF.Email) {
      raiz.location.href = 'mailto:' + encodeURIComponent(email) + '?subject=' + encodeURIComponent('[#' + ch.numero + '] ' + ch.assunto) + '&body=' + encodeURIComponent(texto);
      return;
    }
    RF.Email.enfileirar({ modelo: 'resposta-chamado', para: email, nome: (u ? u.nome : ch.contato && ch.contato.nome) || '', idioma: idiomaCliente(ch), app: ch.app,
      dados: { numero: ch.numero, assunto: ch.assunto, resposta: texto, app: H.app(ch.app) ? T(H.app(ch.app).nome) : 'SolverONE' },
      origem: { tipo: 'chamado', rotulo: T('Chamado #', 'Ticket #') + ch.numero, ir: ['suporte', 'chamado', ch.id] }, semEnvio: false })
      .then(function (item) {
        if (item.status === 'enviado') return ui.aviso(T('Resposta enviada por e-mail.', 'Reply sent by e-mail.'));
        RF.telasEmail.abrirItem(item);
      }).catch(function (e) { ui.aviso(String(e.message), 'erro'); });
  }
  function sugerirIA(ch, caixa) {
    if (!raiz.DGO || !raiz.DGO.ia) return ui.aviso(T('Módulo de IA não carregado.', 'AI module not loaded.'), 'erro');
    if (!raiz.DGO.ia.temChave()) {
      ui.aviso(T('Cole uma chave de IA grátis primeiro (abrindo o cofre).', 'Paste a free AI key first (opening the vault).'), 'info');
      return raiz.DGO.ia.chaves();
    }
    var historico = ch.mensagens.filter(function (m) { return m.tipo === 'publica'; }).map(function (m) { return (m.autor === 'cliente' ? 'Cliente: ' : 'Suporte: ') + U.mascararTexto(m.texto); }).join('\n');
    var pergunta = 'Chamado de suporte do app ' + (H.app(ch.app) ? T(H.app(ch.app).nome) : 'SolverONE') + ', assunto: "' + U.mascararTexto(ch.assunto) + '".\n' + historico +
      '\n\nEscreva uma resposta curta, cordial e clara em ' + (idiomaCliente(ch) === 'en' ? 'English' : 'português do Brasil') + ', para uma pessoa leiga. Não invente funções que não existem; se faltar informação, peça.';
    ui.confirmar(T('Mandar para a IA?', 'Send to the AI?'), T('Vai para o provedor de IA escolhido: o assunto e as mensagens do chamado, com e-mails, telefones e CPF trocados por marcadores. Nome da pessoa não vai.',
      'Goes to the chosen AI provider: the subject and ticket messages, with e-mails, phones and IDs replaced by placeholders. The person\'s name is not sent.')).then(function (ok) {
      if (!ok) return;
      ui.aviso(T('Pedindo sugestão…', 'Asking for a suggestion…'), 'info');
      raiz.DGO.ia.perguntar(pergunta).then(function (r) {
        var txt = typeof r === 'string' ? r : (r && (r.texto || r.resposta)) || '';
        caixa.value = (caixa.value ? caixa.value + '\n\n' : '') + txt.trim();
        RF.Log.registrar('suporte', 'ia-sugestao', ch.id, null, null, T('Sugestão de IA pedida para #', 'AI suggestion requested for #') + ch.numero);
        caixa.focus();
      }).catch(function (e) { ui.aviso(raiz.DGO.ia.explicarErro ? raiz.DGO.ia.explicarErro(e) : T('A IA não respondeu: ', 'The AI did not answer: ') + (e && e.message), 'erro'); });
    });
  }
  function idiomaCliente(ch) { var u = ch.usuario && H.usuario(ch.usuario); return u ? u.idioma : 'pt'; }
  function juntarChamado(ch) {
    var outros = D.Chamados.abertos().filter(function (c) { return c.id !== ch.id && RF.noEscopo(c.app); });
    var sel = ui.escolha(outros.map(function (c) { return [c.id, '#' + c.numero + ' · ' + c.assunto]; }), '');
    ui.modal(T('Juntar chamados', 'Merge tickets'), el('div', { class: 'rf-form' }, [ui.campo(T('Juntar #', 'Merge #') + ch.numero + T(' dentro de', ' into'), sel),
      el('p', { class: 'rf-dica', texto: T('As mensagens deste vão para o outro, e este é fechado.', 'This ticket\'s messages move to the other one, and this one is closed.') })]),
      { rodape: [ui.botao(T('Juntar', 'Merge'), function () {
        var alvo = outros.filter(function (c) { return c.id === sel.value; })[0]; if (!alvo) return;
        ch.mensagens.forEach(function (m) { var x = U.clonar(m); x.texto = '[#' + ch.numero + '] ' + x.texto; alvo.mensagens.push(x); });
        alvo.mensagens.sort(function (a, b) { return new Date(a.quando) - new Date(b.quando); });
        ch.mescladoEm = alvo.id; ch.status = 'fechado'; ch.fechadoEm = U.agora();
        RF.mudar('chamados', 'suporte', 'juntar', ch.id, null, alvo.id, '#' + ch.numero + T(' juntado em #', ' merged into #') + alvo.numero).then(function () { ui.fecharEIr('suporte', 'chamado', alvo.id); });
      }, 'pri')] });
  }
  function relatoriosSuporte(area, todos) {
    var cat = function (id) { return T((RF.cat.CATEGORIAS_CHAMADO.filter(function (x) { return x.id === id; })[0] || { nome: { pt: id, en: id } }).nome); };
    var respondidos = todos.filter(function (c) { return c.primeiraResposta; });
    var media = respondidos.length ? respondidos.reduce(function (s, c) { return s + (new Date(c.primeiraResposta) - new Date(c.criadoEm)); }, 0) / respondidos.length / HORA : 0;
    var fechados = todos.filter(function (c) { return c.status === 'resolvido' || c.status === 'fechado'; });
    var noPrazo = fechados.filter(function (c) { return D.Chamados.situacao(c) === 'cumprido'; }).length;
    area.appendChild(el('div', { class: 'rf-cartoes' }, [
      ui.cartao(T('Chamados no total', 'Tickets in total'), todos.length),
      ui.cartao(T('Tempo médio até a 1ª resposta', 'Average time to 1st reply'), respondidos.length ? media.toFixed(1) + ' h' : '—', respondidos.length + T(' respondidos', ' answered')),
      ui.cartao(T('Resolvidos no prazo', 'Solved on time'), fechados.length ? Math.round(noPrazo / fechados.length * 100) + '%' : '—', noPrazo + T(' de ', ' of ') + fechados.length)
    ]));
    area.appendChild(el('div', { class: 'rf-grade-3' }, [
      H.barras(T('Por situação', 'By status'), H.contarPor(todos, function (c) { return T(RF.cat.STATUS_CHAMADO[c.status]); })),
      H.barras(T('Por categoria', 'By category'), H.contarPor(todos, function (c) { return cat(c.categoria); })),
      H.barras(T('Por app', 'By app'), H.contarPor(todos, function (c) { return H.nomeApp(c.app); }))
    ]));
    area.appendChild(ui.botaoSe('suporte:exportar', null, T('Exportar chamados (CSV)', 'Export tickets (CSV)'), function () {
      U.baixar('chamados-' + U.agora().slice(0, 10) + '.csv', U.csv([['numero', '#'], ['assunto', T('assunto', 'subject')], ['app', 'app'], ['categoria', T('categoria', 'category')], ['prioridade', T('prioridade', 'priority')],
        ['status', T('situação', 'status')], [function (c) { return H.nomeEquipe(c.responsavel); }, T('responsável', 'assignee')], ['criadoEm', T('aberto', 'opened')], ['primeiraResposta', T('1ª resposta', '1st reply')], ['resolvidoEm', T('resolvido', 'solved')],
        [function (c) { return D.Chamados.situacao(c); }, T('prazo', 'deadline')]], todos), 'text/csv');
      RF.Log.registrar('suporte', 'exportar', '', null, { total: todos.length }, todos.length + T(' chamados exportados', ' tickets exported'));
    }));
  }
  function configSuporte(area) {
    var podeCfg = RF.pode('suporte.config:editar');
    var cfg = C.obj('config'); cfg.sla = cfg.sla || U.clonar(RF.cat.SLA_PADRAO);
    var campos = {};
    var linhas = Object.keys(RF.cat.PRIORIDADES).map(function (k) {
      campos[k] = { r: ui.entrada(cfg.sla[k].resposta, { tipo: 'number', attrs: { min: 1, disabled: !podeCfg, 'aria-label': T(RF.cat.PRIORIDADES[k]) + ' — ' + T('1ª resposta', '1st reply') } }),
                    s: ui.entrada(cfg.sla[k].resolucao, { tipo: 'number', attrs: { min: 1, disabled: !podeCfg, 'aria-label': T(RF.cat.PRIORIDADES[k]) + ' — ' + T('resolução', 'resolution') } }) };
      return { k: k };
    });
    area.appendChild(ui.secao(T('Prazos (SLA) em horas corridas', 'Deadlines (SLA) in calendar hours'), [
      ui.tabela([{ id: 'p', nome: T('Prioridade', 'Priority'), desenhar: function (l) { return H.seloPrioridade(l.k); } },
        { id: 'r', nome: T('1ª resposta (h)', '1st reply (h)'), desenhar: function (l) { return campos[l.k].r; } },
        { id: 's', nome: T('Resolução (h)', 'Resolution (h)'), desenhar: function (l) { return campos[l.k].s; } }], linhas),
      podeCfg ? ui.botao(T('Salvar prazos', 'Save deadlines'), function () {
        var antes = U.clonar(cfg.sla);
        Object.keys(campos).forEach(function (k) { cfg.sla[k] = { resposta: Math.max(1, +campos[k].r.value || 1), resolucao: Math.max(1, +campos[k].s.value || 1) }; });
        RF.mudar('config', 'suporte', 'sla', '', antes, cfg.sla, T('Prazos de atendimento alterados (valem para chamados novos)', 'Service deadlines changed (apply to new tickets)')).then(function () { ui.aviso(T('Salvo.', 'Saved.')); });
      }, 'pri') : null,
      ui.cinza('suporte.horario')
    ]));
    area.appendChild(ui.secao(T('Respostas prontas', 'Canned replies'), [
      el('p', { class: 'rf-dica', texto: T('Use {nome} e {app} para preencher sozinho.', 'Use {nome} and {app} to fill in automatically.') }),
      ui.tabela([{ id: 't', nome: T('Título', 'Title'), valor: function (r) { return T(r.titulo); } },
        { id: 'x', nome: T('Texto', 'Text'), valor: function (r) { return T(r.texto).slice(0, 90) + (T(r.texto).length > 90 ? '…' : ''); } }],
        C.lista('respostas'), { aoClicar: podeCfg ? function (r) { editarResposta(r); } : null })
    ], podeCfg ? [ui.botao('+ ' + T('Nova resposta', 'New reply'), function () { editarResposta(null); }, 'pri')] : null));
  }
  function editarResposta(r) {
    var novo = !r, x = r || { id: U.uid('resp-'), titulo: {}, texto: {} };
    var tit = ui.bilingue(T('Título', 'Title'), x.titulo), txt = ui.bilingue(T('Texto', 'Text'), x.texto, { linhas: 4 });
    var rod = [];
    if (!novo) rod.push(ui.botao(T('Apagar', 'Delete'), function () {
      C.db.respostas = C.lista('respostas').filter(function (y) { return y.id !== x.id; });
      RF.mudar('respostas', 'suporte', 'resposta-apagar', x.id, x, null, T('Resposta pronta apagada', 'Canned reply deleted')).then(function () { ui.fecharModal(); RF.renderizar(); });
    }, 'perigo'));
    rod.push(ui.botao(T('Salvar', 'Save'), function () {
      var y = { id: x.id, titulo: tit.valor(), texto: txt.valor() };
      if (!y.titulo.pt || !y.titulo.en || !y.texto.pt || !y.texto.en) return ui.aviso(T('Preencha PT e EN.', 'Fill in PT and EN.'), 'erro');
      if (novo) C.lista('respostas').push(y); else C.db.respostas = C.lista('respostas').map(function (z) { return z.id === y.id ? y : z; });
      RF.mudar('respostas', 'suporte', novo ? 'resposta-criar' : 'resposta-editar', y.id, r, y, T('Resposta pronta salva', 'Canned reply saved')).then(function () { ui.fecharModal(); RF.renderizar(); });
    }, 'pri'));
    ui.modal(novo ? T('Nova resposta pronta', 'New canned reply') : T(x.titulo), el('div', { class: 'rf-form' }, [tit, txt]), { largo: true, rodape: rod });
  }
  function importarFormspree() {
    ui.modal(T('Importar chamados do formulário', 'Import tickets from the form'), el('div', { class: 'rf-form' }, [
      el('p', { texto: T('No painel do Formspree, exporte as mensagens em CSV e escolha o arquivo aqui. Colunas reconhecidas: email, nome/name, assunto/subject, mensagem/message, app.',
        'In the Formspree dashboard, export submissions as CSV and pick the file here. Recognised columns: email, nome/name, assunto/subject, mensagem/message, app.') }),
      el('p', { class: 'rf-dica', texto: T('Mensagens já importadas (mesmo e-mail e mesmo texto) não se repetem.', 'Already imported messages (same e-mail and text) are not repeated.') })
    ]), { rodape: [ui.botao(T('Escolher arquivo…', 'Choose file…'), function () {
      H.lerArquivo('.csv,text/csv').then(function (arq) {
        if (!arq) return;
        var linhas = U.lerCsv(arq.texto), n = 0;
        linhas.forEach(function (l) {
          var email = String(l.email || l._replyto || '').toLowerCase(), texto = l.mensagem || l.message || l.texto || '';
          if (!texto) return;
          var repetido = C.lista('chamados').some(function (c) { return c.contato && c.contato.email === email && c.mensagens[0] && c.mensagens[0].texto === texto; });
          if (repetido) return;
          var u = C.lista('usuarios').filter(function (x) { return x.email && x.email === email; })[0];
          var ch = D.Chamados.criar({ assunto: l.assunto || l.subject || texto.slice(0, 60), app: l.app && H.app(l.app) ? l.app : '*', categoria: 'duvida', prioridade: 'normal',
            canal: 'formulario', usuario: u ? u.id : null, contato: u ? null : { nome: l.nome || l.name || '', email: email }, texto: texto });
          D.Automacoes.rodar('chamado-criado', ch, null);
          n++;
        });
        RF.mudar('chamados', 'suporte', 'importar', arq.nome, null, { total: n }, n + T(' chamados importados do formulário', ' tickets imported from the form')).then(function () {
          ui.fecharModal(); ui.aviso(n + T(' chamados importados.', ' tickets imported.')); RF.renderizar();
        });
      });
    }, 'pri')] });
  }

  /* ------------------------------------------------------------------
     BASE DE CONHECIMENTO
     ------------------------------------------------------------------ */
  RF.telas.kb = function (area, rota) {
    RF.pagina(area, 'kb', T('Artigos publicados vão para o ajuda.json e alimentam o Assist ONE e a busca por termo nos apps.', 'Published articles go to ajuda.json and feed Assist ONE and term search in the apps.'),
      [ui.botaoSe('kb:criar', null, '+ ' + T('Novo artigo', 'New article'), function () { editarArtigo(null); }, 'pri')]);
    var lista = C.lista('kb').filter(function (k) { return RF.noEscopo(k.app); });
    area.appendChild(ui.tabela([
      { id: 't', nome: T('Título', 'Title'), valor: function (k) { return T(k.titulo); } },
      { id: 'app', nome: 'App', valor: function (k) { return H.nomeApp(k.app); } },
      { id: 'e', nome: T('Estado', 'State'), valor: function (k) { return k.estado; }, desenhar: function (k) { return ui.selo(k.estado === 'publicado' ? T('publicado', 'published') : T('rascunho', 'draft'), k.estado === 'publicado' ? 'ok' : 'cinza'); } },
      { id: 'lng', nome: 'PT/EN', desenhar: function (k) { var ok = k.titulo.pt && k.titulo.en && k.texto.pt && k.texto.en; return ui.selo(ok ? '✓' : T('falta EN/PT', 'missing EN/PT'), ok ? 'ok' : 'atencao'); } },
      { id: 'at', nome: T('Atualizado', 'Updated'), ordenar: function (k) { return k.atualizadoEm; }, desenhar: function (k) { return U.data(k.atualizadoEm); } }
    ], lista, { aoClicar: function (k) { editarArtigo(k); }, vazio: T('Nenhum artigo ainda.', 'No articles yet.') }));
    area.appendChild(ui.cinza('kb.assist'));
    if (rota.sub === 'artigo' && rota.id) { var k0 = lista.filter(function (k) { return k.id === rota.id; })[0]; if (k0) setTimeout(function () { editarArtigo(k0); }, 30); }
  };
  function editarArtigo(k) {
    var novo = !k, x = k ? U.clonar(k) : { id: U.uid('kb-'), titulo: {}, texto: {}, app: '*', categoria: 'duvida', palavras: [], estado: 'rascunho' };
    var podeEd = RF.pode(novo ? 'kb:criar' : 'kb:editar', x.app);
    var tit = ui.bilingue(T('Título', 'Title'), x.titulo), txt = ui.bilingue(T('Texto', 'Text'), x.texto, { linhas: 7 });
    var app = ui.escolha(H.opcoesApps(true, true), x.app), cat = ui.escolha(RF.cat.CATEGORIAS_CHAMADO.map(function (c) { return [c.id, T(c.nome)]; }), x.categoria);
    var pal = ui.entrada((x.palavras || []).join(', '), { attrs: { placeholder: T('ex.: senha, digital, entrar', 'e.g. password, fingerprint, sign in') } });
    var corpo = el('div', { class: 'rf-form' }, [tit, txt, el('div', { class: 'rf-grade-3' }, [ui.campo('App', app), ui.campo(T('Categoria', 'Category'), cat), ui.campo(T('Palavras para a busca', 'Search words'), pal)])]);
    if (!podeEd) Array.prototype.forEach.call(corpo.querySelectorAll('input,select,textarea'), function (i) { i.disabled = true; });
    function salvar(estado) {
      var y = Object.assign({}, x, { titulo: tit.valor(), texto: txt.valor(), app: app.value, categoria: cat.value, estado: estado,
        palavras: pal.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean), atualizadoEm: U.agora(), autor: S.pessoa.email });
      if (!y.titulo.pt) return ui.aviso(T('Título em PT.', 'Title in PT.'), 'erro');
      if (estado === 'publicado' && (!y.titulo.en || !y.texto.pt || !y.texto.en)) return ui.aviso(T('Para publicar, título e texto em PT e EN.', 'To publish, title and text in PT and EN.'), 'erro');
      if (novo) C.lista('kb').push(y); else C.db.kb = C.lista('kb').map(function (z) { return z.id === y.id ? y : z; });
      RF.mudar('kb', 'kb', estado === 'publicado' ? 'publicar' : 'salvar', y.id, k, { estado: estado }, T('Artigo ', 'Article ') + (estado === 'publicado' ? T('marcado para publicar: ', 'marked for publishing: ') : T('salvo: ', 'saved: ')) + y.titulo.pt)
        .then(function () { ui.fecharEIr('kb'); });
    }
    var rod = [];
    if (!novo && RF.pode('kb:excluir', x.app)) rod.push(ui.botao(T('Excluir', 'Delete'), function () {
      C.db.kb = C.lista('kb').filter(function (z) { return z.id !== x.id; });
      RF.mudar('kb', 'kb', 'excluir', x.id, k, null, T('Artigo excluído', 'Article deleted')).then(function () { ui.fecharEIr('kb'); });
    }, 'perigo'));
    if (podeEd) rod.push(ui.botao(T('Salvar rascunho', 'Save draft'), function () { salvar('rascunho'); }));
    if (RF.pode('kb:publicar', x.app)) rod.push(ui.botao(T('Marcar como publicado', 'Mark as published'), function () { salvar('publicado'); }, 'pri'));
    ui.modal(novo ? T('Novo artigo', 'New article') : T(x.titulo), corpo, { largo: true, rodape: rod });
  }
})(window);
