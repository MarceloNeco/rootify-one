/* =====================================================================
   RootifyONE — IA NOS TERMOS E POLÍTICAS
   ---------------------------------------------------------------------
   Duas peças:
     1. Assistente no editor do termo (botão "✨ Escrever com IA"):
        escrever do zero, melhorar, conferir o que falta, traduzir.
     2. Agente de políticas (#/termos/agente): confere todos os apps,
        diz o que falta e escreve os rascunhos, um por um.

   Regras que não mudam:
   - Usa a IA do módulo comum (DGO.ia): o mesmo cofre de chaves e o
     mesmo provedor escolhido (grátis ou pago). Trocar de IA = trocar a
     chave, nada aqui muda.
   - Para a IA vai só a descrição dos apps, o registro de tratamento
     (LGPD) e o texto do termo. Nenhum dado de usuário.
   - A IA NUNCA publica. Tudo vira RASCUNHO, com autor = quem pediu;
     por isso a aprovação continua sendo de outra pessoa.
   - O texto anterior fica guardado para desfazer (versao.antesIA).
   - Onde faltar informação, a IA escreve [A DEFINIR: …] e o envio para
     aprovação fica bloqueado até alguém preencher.
   ===================================================================== */
(function (raiz) {
  'use strict';
  var RF = raiz.RF, U = RF.util, T = U.T, el = U.el, ui = RF.ui, C = RF.Cofre, S = RF.Sessao, D = RF.dados, H = RF.h;
  var IAT = RF.iaTermos = {};

  /* ------------------------------------------------------------------
     O QUE CADA TIPO DE DOCUMENTO PRECISA COBRIR (lista de conferência)
     ------------------------------------------------------------------ */
  var COBRIR = {
    privacidade: [
      'quem é o responsável pelos dados (controlador) e como falar com ele',
      'encarregado (DPO) e o canal para pedidos de privacidade',
      'quais dados são tratados, em linguagem simples',
      'para que cada dado é usado (finalidade)',
      'base legal de cada tratamento (LGPD art. 7º; art. 11 se houver dado sensível; art. 14 se houver dado de criança)',
      'onde os dados ficam guardados e por quanto tempo',
      'com quem os dados são compartilhados (operadores) e se saem do Brasil',
      'direitos do titular (LGPD art. 18) e como pedir, com prazo de resposta',
      'segurança (cifra, dados no aparelho) e o que acontece se a pessoa perder a senha',
      'armazenamento no navegador (localStorage/IndexedDB) e cookies',
      'como a política muda e como a pessoa fica sabendo',
      'data de vigência e lei de referência (Lei 13.709/2018)'
    ],
    uso: [
      'quem oferece o serviço e como falar com ele',
      'o que o app faz e o que não faz',
      'aceite dos termos e idade mínima / uso por crianças com responsável',
      'conta, senha, código de recuperação e responsabilidade da pessoa',
      'planos, anúncios e o que é gratuito',
      'o que é proibido fazer',
      'conteúdo criado pela pessoa: é dela; que licença a plataforma precisa',
      'propriedade intelectual da plataforma e de terceiros',
      'uso de IA de terceiros com chave da própria pessoa: respostas podem errar',
      'disponibilidade, mudanças e encerramento do serviço',
      'limites de responsabilidade, respeitando o Código de Defesa do Consumidor (Lei 8.078/1990)',
      'como os termos mudam e novo aceite',
      'lei aplicável e foro; Marco Civil da Internet (Lei 12.965/2014)',
      'data de vigência'
    ],
    'aviso-legal': [
      'deixar claro que o conteúdo é informativo',
      'que não substitui o profissional adequado (qual profissional)',
      'riscos e quando procurar ajuda profissional',
      'fonte das informações e data de referência',
      'responsabilidade de quem usa'
    ],
    terceiros: [
      'que marcas, músicas, letras, cifras, dados de mercado e outros conteúdos pertencem aos seus donos',
      'que aparecem para uso pessoal / informativo',
      'como pedir a remoção de um conteúdo',
      'onde ver créditos e licenças (CREDITOS.md)'
    ],
    outro: ['objetivo do documento', 'a quem se aplica', 'regras principais', 'contato', 'data de vigência']
  };

  /* fatos conhecidos de cada app — vêm das diretrizes gerais */
  var FATOS_APP = {
    'rise-one': 'Treino, dieta e saúde. Exames, medidas e carteirinha do plano de saúde são DADO SENSÍVEL (LGPD art. 11), guardados cifrados no aparelho. OCR de exames e rótulos roda no aparelho. Exercícios são informativos e não substituem profissional de saúde ou de educação física.',
    'moneytrio': 'Finanças pessoais (BudgetONE, InvestifyONE, TaxONE): lançamentos, fotos de recibos, contas e finais de cartão. Conteúdo sobre investimentos e impostos é informativo: não é recomendação de investimento nem assessoria contábil ou jurídica. Dados de mercado vêm de fontes de terceiros.',
    'contador-de-historias': 'Histórias para crianças. Nomes e gostos de crianças ficam no aparelho e são trocados por códigos antes de ir para a IA (LGPD art. 14: consentimento de um responsável). Voz de internet recebe o texto a ser lido, sem nomes.',
    'omnilife-one': 'Organização da casa e da família: membros, recados, tarefas, listas, contatos (inclui dados de terceiros que a pessoa cadastra). Futuro: dividir dados entre membros da família por servidor (Google Firebase).',
    'eleicoes-2026': 'Infográficos dos planos de governo registrados pelos candidatos. Conteúdo informativo, sem posição partidária; a fonte são os documentos oficiais registrados. Não coleta dados pessoais.',
    'cifras-violao': 'Cifras, acordes e afinador. Letras e cifras de obras protegidas aparecem para uso pessoal, com canal de remoção. O afinador usa o microfone só no aparelho.',
    'portal': 'Página central com links para os apps da SolverONE. Não coleta dados pessoais.'
  };

  /* fatos da plataforma (valem para todos os apps) */
  function fatosPlataforma() {
    var f = C.obj('config').fatosTermos || {};
    return [
      'Plataforma SolverONE: conjunto de apps web gratuitos, publicados como sites estáticos (GitHub Pages), hoje sem servidor próprio.',
      'Os dados de cada pessoa ficam no aparelho dela (navegador). Cópia de segurança só se ela ligar, no Google Drive ou Microsoft OneDrive DELA.',
      'Visitante (sem conta) não guarda dados.',
      'Recursos de IA usam a chave de IA da própria pessoa, guardada cifrada no navegador; a pergunta vai ao provedor de IA que ela escolheu, só quando ela pergunta.',
      'Formulários de contato e suporte são enviados pelo serviço Formspree.',
      'Anúncios mostrados são só de outros apps da própria SolverONE; o plano Premium não tem anúncios. Ainda não há cobrança.',
      'Pedidos de privacidade (acesso, correção, exclusão, portabilidade, revogação) são respondidos em até 15 dias.',
      'Responsável pelos dados (controlador): ' + (f.controlador || '[A DEFINIR: nome ou empresa e CNPJ]') + '.',
      'E-mail de contato e privacidade: ' + (f.email || '[A DEFINIR: e-mail]') + '.',
      'Encarregado (DPO): ' + (f.encarregado || '[A DEFINIR: nome do encarregado]') + '.',
      'Foro: ' + (f.foro || '[A DEFINIR: cidade/UF do foro]') + '.',
      'Data de vigência: ' + U.data(U.agora()) + '.'
    ];
  }

  function fatosDoApp(app) {
    var linhas = [];
    if (!app || app === '*') {
      linhas.push('O documento vale para TODOS os apps:');
      C.lista('apps').filter(function (a) { return !a.interno && a.estado !== 'backlog'; }).forEach(function (a) {
        linhas.push('- ' + a.nome.pt + ': ' + a.descricao.pt + (FATOS_APP[a.id] ? ' ' + FATOS_APP[a.id] : ''));
      });
    } else {
      var a = H.app(app);
      linhas.push('O documento vale só para o app ' + (a ? a.nome.pt + ' (' + a.url + '): ' + a.descricao.pt : app) + '.');
      if (FATOS_APP[app]) linhas.push(FATOS_APP[app]);
    }
    var ropa = C.lista('ropa').filter(function (r) { return !app || app === '*' || r.app === app; });
    if (ropa.length) {
      linhas.push('Registro de tratamento (LGPD):');
      ropa.forEach(function (r) {
        var base = RF.cat.BASES_LEGAIS[r.base];
        linhas.push('- ' + (H.app(r.app) ? H.app(r.app).nome.pt : r.app) + ': dados = ' + r.dados.pt + '; finalidade = ' + r.finalidade.pt +
          '; base legal = ' + (base ? base.pt : r.base) + '; onde = ' + r.onde.pt + '; retenção = ' + r.retencao.pt + '; operadores = ' + r.operadores + '.');
      });
    }
    var planos = C.lista('planos').filter(function (p) { return p.ativo; }).map(function (p) { return p.nome.pt + ' (' + p.descricao.pt + ')'; });
    if (planos.length) linhas.push('Planos ativos: ' + planos.join('; '));
    return linhas;
  }

  var SISTEMA = 'Você é um redator de termos de uso e políticas de privacidade para apps brasileiros. ' +
    'Escreva em português do Brasil simples, para leigos: frases curtas, itens numerados (1., 2., 3.), sem juridiquês. ' +
    'Use SOMENTE os fatos fornecidos. Nunca invente empresa, CNPJ, endereço, e-mail, preço, coleta de dados, serviço ou lei. ' +
    'Quando faltar uma informação necessária, escreva o marcador [A DEFINIR: o que falta]. ' +
    'Cite leis com número e ano (ex.: Lei 13.709/2018 - LGPD). Não use markdown: nada de #, ** ou tabelas. ' +
    'Você escreve rascunhos que serão revisados por um advogado antes de publicar.';

  function nomeTipo(tipo) { var m = { uso: 'Termos de uso', privacidade: 'Política de privacidade', 'aviso-legal': 'Aviso legal', terceiros: 'Direitos reservados e conteúdo de terceiros' }; return m[tipo] || 'Documento'; }
  function listaCobrir(tipo) { return (COBRIR[tipo] || COBRIR.outro).map(function (x) { return '- ' + x; }).join('\n'); }

  /* ------------------------------------------------------------------
     CONVERSA COM A IA
     ------------------------------------------------------------------ */
  function dgo() { return raiz.DGO && raiz.DGO.ia; }
  IAT.pronta = function () {
    if (!dgo()) { ui.aviso(T('Módulo de IA não carregado.', 'AI module not loaded.'), 'erro'); return false; }
    if (!dgo().temChave()) {
      ui.aviso(T('Cole uma chave de IA primeiro (há opções grátis). Abrindo o cofre…', 'Paste an AI key first (there are free options). Opening the vault…'), 'info');
      dgo().chaves();
      return false;
    }
    return true;
  };
  function provInfo() {
    var id = dgo().provedor();
    var p = dgo().provedores().filter(function (x) { return x.id === id; })[0] || { nome: id, gratis: null };
    return { id: id, nome: p.nome, modelo: dgo().modelo(id), gratis: p.gratis };
  }
  IAT.rotuloIA = function () {
    var p = provInfo();
    return p.nome + ' · ' + (p.modelo || '—') + (p.gratis ? T(' · grátis', ' · free') : p.gratis === false ? T(' · paga', ' · paid') : '');
  };

  var consentiu = false;           /* aviso do que vai para a IA: uma vez por sessão */
  function confirmarEnvio() {
    if (consentiu) return Promise.resolve(true);
    return ui.confirmar(T('Mandar para a IA?', 'Send to the AI?'),
      T('Vai para ', 'Goes to ') + IAT.rotuloIA() + T(': a descrição dos apps, o registro de tratamento (LGPD) e o texto do termo. Nenhum dado de usuário vai. Este aviso vale até sair do RootifyONE.',
        ': the apps\' description, the processing record (LGPD) and the term text. No user data is sent. This notice holds until you leave RootifyONE.'))
      .then(function (ok) { if (ok) consentiu = true; return ok; });
  }

  function esperar(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function explicarErro(e) {
    var m = (e && e.message) || String(e);
    if (m === 'sem-chave') return T('Falta a chave da IA.', 'The AI key is missing.');
    if (m === 'sem-internet') return T('Sem internet.', 'No internet.');
    if (m === 'so-wifi') return T('A IA está marcada para usar só no Wi-Fi (Configurações → Rede).', 'AI is set to Wi-Fi only (Settings → Network).');
    if (e && e.status === 401) return T('A chave foi recusada pelo provedor. Confira no cofre.', 'The provider rejected the key. Check the vault.');
    if (e && e.status === 429) return T('Limite de pedidos da IA atingido. Tente mais tarde ou use outra IA.', 'AI request limit reached. Try later or use another AI.');
    return m;
  }
  /* pergunta com insistência: 429/5xx → espera 6, 15 e 30 s */
  function perguntar(pergunta, limite, avisar) {
    var esperas = [6, 15, 30];
    function tentar(n) {
      return dgo().perguntar(pergunta, { contexto: SISTEMA, limite: limite || 3000 }).then(function (r) {
        var txt = typeof r === 'string' ? r : (r && (r.texto || r.resposta)) || '';
        if (!txt.trim()) { var e = new Error(T('a IA respondeu vazio', 'the AI answered empty')); e.status = 503; throw e; }
        return txt;
      }).catch(function (e) {
        var s = e && e.status;
        if ((s === 429 || s >= 500 || (e && /vazio|empty/.test(e.message))) && n < esperas.length) {
          if (avisar) avisar(T('A IA pediu uma pausa; tentando de novo em ', 'The AI asked for a pause; retrying in ') + esperas[n] + ' s…');
          return esperar(esperas[n] * 1000).then(function () { return tentar(n + 1); });
        }
        throw e;
      });
    }
    return tentar(0);
  }

  /* limpa o que modelos pequenos costumam mandar junto */
  function limpar(s) {
    return String(s || '').replace(/```[a-z]*\n?/gi, '').replace(/\*\*/g, '').replace(/^#+\s*/gm, '').replace(/\r/g, '').trim();
  }
  function separar(resp) {
    var s = limpar(resp);
    var mt = s.match(/(?:^|\n)\s*(?:T[IÍ]TULO|TITLE)\s*:\s*(.+)/i);
    var mx = s.search(/(?:^|\n)\s*(?:TEXTO|TEXT)\s*:\s*/i);
    var texto = mx >= 0 ? s.slice(mx).replace(/^\s*(?:TEXTO|TEXT)\s*:\s*/i, '') : s.replace(/(?:^|\n)\s*(?:T[IÍ]TULO|TITLE)\s*:.*\n?/i, '');
    return { titulo: mt ? mt[1].trim() : '', texto: texto.trim() };
  }

  /* ---- as ações ---- */
  function pedidoEscrever(t, extra) {
    return 'Escreva o documento "' + nomeTipo(t.tipo) + '" ' + (t.app === '*' ? 'da plataforma SolverONE (vale para todos os apps)' : 'do app ' + H.nomeApp(t.app).replace(/^\S+\s/, '')) +
      '. Aceite ' + (t.obrigatorio ? 'obrigatório antes de usar o app' : 'não obrigatório (só informativo)') + '.\n\nFATOS DA PLATAFORMA:\n- ' + fatosPlataforma().join('\n- ') +
      '\n\nFATOS DO APP:\n' + fatosDoApp(t.app).join('\n') +
      '\n\nO documento precisa cobrir:\n' + listaCobrir(t.tipo) +
      (extra ? '\n\nPEDIDO DA EQUIPE: ' + extra : '') +
      '\n\nResponda EXATAMENTE neste formato, sem mais nada:\nTITULO: <título curto>\nTEXTO:\n<texto do documento>';
  }
  function pedidoMelhorar(t, atual, extra) {
    return 'Reescreva o documento abaixo ("' + nomeTipo(t.tipo) + '", ' + H.nomeApp(t.app).replace(/^\S+\s/, '') + ') deixando mais claro e completo, SEM mudar o que ele decide. ' +
      'Complete o que faltar da lista, usando só os fatos.\n\nFATOS DA PLATAFORMA:\n- ' + fatosPlataforma().join('\n- ') +
      '\n\nFATOS DO APP:\n' + fatosDoApp(t.app).join('\n') + '\n\nO documento precisa cobrir:\n' + listaCobrir(t.tipo) +
      (extra ? '\n\nPEDIDO DA EQUIPE (prioridade): ' + extra : '') +
      '\n\nDOCUMENTO ATUAL:\nTITULO: ' + (atual.titulo || '') + '\nTEXTO:\n' + (atual.texto || '') +
      '\n\nResponda EXATAMENTE neste formato, sem mais nada:\nTITULO: <título curto>\nTEXTO:\n<texto do documento>';
  }
  function pedidoConferir(t, atual) {
    return 'Confira o documento abaixo ("' + nomeTipo(t.tipo) + '") contra a lista e os fatos. Aponte só o que FALTA, está ERRADO em relação aos fatos, ou é ARRISCADO para o usuário ou para a plataforma.\n\n' +
      'LISTA:\n' + listaCobrir(t.tipo) + '\n\nFATOS DA PLATAFORMA:\n- ' + fatosPlataforma().join('\n- ') + '\n\nFATOS DO APP:\n' + fatosDoApp(t.app).join('\n') +
      '\n\nDOCUMENTO:\nTITULO: ' + (atual.titulo || '') + '\nTEXTO:\n' + (atual.texto || '') +
      '\n\nResponda com um item por linha começando com "- ". Marcadores [A DEFINIR] não contam como falha. Se estiver tudo coberto, responda só: OK';
  }
  function pedidoTraduzir(doc, para) {
    return para === 'en'
      ? 'Translate this Brazilian Portuguese legal document into clear, plain English. Keep the numbering, the meaning and the law references (e.g. "Brazilian Law 13,709/2018 (LGPD)"). Turn every [A DEFINIR: …] into [TO BE DEFINED: …]. No markdown.\n\nTITULO: ' + doc.titulo + '\nTEXTO:\n' + doc.texto +
        '\n\nAnswer EXACTLY in this format, nothing else:\nTITLE: <title>\nTEXT:\n<text>'
      : 'Traduza este documento em inglês para português do Brasil simples, mantendo numeração, sentido e leis citadas. Troque [TO BE DEFINED: …] por [A DEFINIR: …]. Sem markdown.\n\nTITLE: ' + doc.titulo + '\nTEXT:\n' + doc.texto +
        '\n\nResponda EXATAMENTE neste formato, sem mais nada:\nTITULO: <título>\nTEXTO:\n<texto>';
  }
  function lerFaltas(resp) {
    var s = limpar(resp);
    if (/^ok\.?$/i.test(s)) return [];
    return s.split('\n').map(function (l) { return l.replace(/^\s*(?:[-•*]|\d+[.)])\s*/, '').trim(); }).filter(function (l) { return l && !/^ok\.?$/i.test(l); });
  }

  /* o motor: escreve/melhora em PT, confere e corrige uma vez, traduz para EN */
  IAT.executar = function (t, acao, atual, opcoes) {
    opcoes = opcoes || {};
    var passo = opcoes.passo || function () {};
    var pt = { titulo: atual.titulo.pt || '', texto: atual.texto.pt || '' };
    var en = { titulo: atual.titulo.en || '', texto: atual.texto.en || '' };
    var faltas = null, chamadas = 0;
    function p(q, lim) { chamadas++; return perguntar(q, lim, passo); }

    if (acao === 'conferir') {
      passo(T('🔎 Conferindo o texto em PT…', '🔎 Checking the PT text…'));
      return p(pedidoConferir(t, pt), 800).then(function (r) { return { faltas: lerFaltas(r), chamadas: chamadas }; });
    }
    if (acao === 'traduzir-en') {
      passo(T('🌐 Traduzindo PT → EN…', '🌐 Translating PT → EN…'));
      return p(pedidoTraduzir(pt, 'en')).then(function (r) { return { titulo: { pt: pt.titulo, en: separar(r).titulo }, texto: { pt: pt.texto, en: separar(r).texto }, chamadas: chamadas }; });
    }
    if (acao === 'traduzir-pt') {
      passo(T('🌐 Traduzindo EN → PT…', '🌐 Translating EN → PT…'));
      return p(pedidoTraduzir(en, 'pt')).then(function (r) { return { titulo: { pt: separar(r).titulo, en: en.titulo }, texto: { pt: separar(r).texto, en: en.texto }, chamadas: chamadas }; });
    }
    var primeiro = (acao === 'escrever' || !pt.texto)
      ? (passo(T('📝 Escrevendo em PT…', '📝 Writing in PT…')), p(pedidoEscrever(t, opcoes.extra)))
      : (passo(T('📝 Melhorando o texto em PT…', '📝 Improving the PT text…')), p(pedidoMelhorar(t, pt, opcoes.extra)));
    return primeiro.then(function (r) {
      var s = separar(r); if (!s.texto) throw new Error(T('a IA não mandou o texto no formato combinado', 'the AI did not send the text in the agreed format'));
      pt = { titulo: s.titulo || pt.titulo || nomeTipo(t.tipo), texto: s.texto };
      if (!opcoes.revisar) return;
      passo(T('🔎 Conferindo o que escreveu…', '🔎 Checking what it wrote…'));
      return p(pedidoConferir(t, pt), 800).then(function (r2) {
        faltas = lerFaltas(r2);
        if (!faltas.length) return;
        passo(T('🛠 Corrigindo ', '🛠 Fixing ') + faltas.length + T(' ponto(s)…', ' point(s)…'));
        return p(pedidoMelhorar(t, pt, 'Corrija estes pontos: ' + faltas.join('; '))).then(function (r3) {
          var s3 = separar(r3); if (s3.texto) pt = { titulo: s3.titulo || pt.titulo, texto: s3.texto };
        });
      });
    }).then(function () {
      passo(T('🌐 Traduzindo para EN…', '🌐 Translating to EN…'));
      return p(pedidoTraduzir(pt, 'en'));
    }).then(function (r) {
      var s = separar(r);
      return { titulo: { pt: pt.titulo, en: s.titulo || en.titulo }, texto: { pt: pt.texto, en: s.texto }, faltas: faltas, chamadas: chamadas };
    });
  };

  /* grava o resultado como rascunho, guardando o texto anterior */
  IAT.gravar = function (t, res, acao) {
    var v = D.Termos.ultima(t), criou = false;
    if (v.estado !== 'rascunho') { v = D.Termos.novaVersao(t, S.pessoa.email); criou = true; }
    var antes = { titulo: U.clonar(v.titulo), texto: U.clonar(v.texto) };
    var p = provInfo();
    v.antesIA = { titulo: antes.titulo, texto: antes.texto, autor: v.autor, nota: U.clonar(v.nota), quando: U.agora() };
    v.titulo = res.titulo; v.texto = res.texto; v.autor = S.pessoa.email;
    v.ia = { provedor: p.nome, modelo: p.modelo, quando: U.agora(), acao: acao };
    v.nota = { pt: 'Escrito com IA (' + p.nome + ' · ' + p.modelo + ') em ' + U.data(U.agora()) + '. Confira os fatos, preencha os [A DEFINIR] e valide com advogado antes de publicar.',
               en: 'Written with AI (' + p.nome + ' · ' + p.modelo + ') on ' + U.data(U.agora()) + '. Check the facts, fill in the [TO BE DEFINED] and have a lawyer review it before publishing.' };
    return RF.mudar('termos', 'termos', 'ia-' + acao, t.id, antes, { versao: v.versao, provedor: p.nome, modelo: p.modelo },
      T('Rascunho escrito com IA: ', 'Draft written with AI: ') + '"' + res.titulo.pt + '" v' + v.versao + (criou ? T(' (nova versão)', ' (new version)') : ''));
  };
  IAT.desfazer = function (t, v) {
    if (!v.antesIA) return Promise.resolve();
    var antes = { titulo: v.titulo, texto: v.texto };
    v.titulo = v.antesIA.titulo; v.texto = v.antesIA.texto; v.autor = v.antesIA.autor || v.autor; v.nota = v.antesIA.nota || null;
    delete v.antesIA; delete v.ia;
    return RF.mudar('termos', 'termos', 'ia-desfazer', t.id, antes, { versao: v.versao }, T('Texto da IA desfeito (v', 'AI text undone (v') + v.versao + ')');
  };
  IAT.contarADefinir = function (texto) {
    var s = (texto && (texto.pt + '\n' + texto.en)) || '';
    return (s.match(/\[(A DEFINIR|TO BE DEFINED)/gi) || []).length;
  };

  /* ------------------------------------------------------------------
     1. ASSISTENTE NO EDITOR DO TERMO
     ------------------------------------------------------------------ */
  IAT.abrirEditor = function (t, v, lerAtual) {
    if (!IAT.pronta()) return;
    var ACOES = [
      ['melhorar', T('Melhorar e completar o texto atual', 'Improve and complete the current text')],
      ['escrever', T('Escrever do zero (substitui o texto)', 'Write from scratch (replaces the text)')],
      ['conferir', T('Só conferir: o que falta ou está arriscado', 'Just check: what is missing or risky')],
      ['traduzir-en', T('Traduzir PT → EN', 'Translate PT → EN')],
      ['traduzir-pt', T('Traduzir EN → PT', 'Translate EN → PT')]
    ];
    var atual = lerAtual();
    var acao = ui.escolha(ACOES, atual.texto.pt ? 'melhorar' : 'escrever');
    var extra = ui.entrada('', { linhas: 3, attrs: { placeholder: T('Opcional. Ex.: incluir que o app usa a câmera para ler exames.', 'Optional. E.g.: mention the app uses the camera to read lab results.') } });
    var revisar = ui.marca(T('Conferir e corrigir sozinho depois de escrever (+2 pedidos à IA)', 'Check and fix on its own after writing (+2 AI requests)'), true);
    var estado = el('p', { class: 'rf-dica', 'aria-live': 'polite' });
    var resultado = el('div');
    var gerar = ui.botao('✨ ' + T('Gerar', 'Generate'), null, 'pri');
    function ajustar() {
      var a = acao.value;
      revisar.style.display = (a === 'escrever' || a === 'melhorar') ? '' : 'none';
      extra.parentNode.style.display = (a === 'escrever' || a === 'melhorar') ? '' : 'none';
    }
    var corpo = el('div', { class: 'rf-form' }, [
      el('p', { class: 'rf-dica' }, [T('IA em uso: ', 'AI in use: '), el('b', { texto: IAT.rotuloIA() }), ' · ',
        el('a', { href: '#', texto: T('trocar IA ou chave', 'change AI or key'), onclick: function (e) { e.preventDefault(); dgo().chaves(); } })]),
      ui.campo(T('O que fazer', 'What to do'), acao),
      ui.campo(T('Pedido extra', 'Extra request'), extra),
      revisar,
      el('div', { class: 'rf-acoes' }, [gerar]),
      estado, resultado
    ]);
    var m = ui.modal('✨ ' + T('Escrever com IA', 'Write with AI'), corpo, { largo: true });
    acao.onchange = ajustar; ajustar();

    gerar.onclick = function () {
      var a = acao.value; atual = lerAtual();
      if ((a === 'melhorar' || a === 'conferir' || a === 'traduzir-en') && !atual.texto.pt) return ui.aviso(T('O texto em PT está vazio. Use "Escrever do zero".', 'The PT text is empty. Use "Write from scratch".'), 'erro');
      if (a === 'traduzir-pt' && !atual.texto.en) return ui.aviso(T('O texto em EN está vazio.', 'The EN text is empty.'), 'erro');
      confirmarEnvio().then(function (ok) {
        if (!ok) return;
        gerar.disabled = true; U.limpar(resultado);
        IAT.executar(t, a, atual, { extra: extra.value.trim(), revisar: revisar.querySelector('input').checked, passo: function (s) { estado.textContent = s; } })
          .then(function (res) {
            gerar.disabled = false;
            estado.textContent = T('Pronto · ', 'Done · ') + res.chamadas + T(' pedido(s) à IA.', ' AI request(s).');
            RF.Log.registrar('termos', 'ia-pedido', t.id, null, { acao: a, chamadas: res.chamadas }, T('IA consultada no termo (', 'AI consulted on term (') + a + ')');
            if (a === 'conferir') return mostrarFaltas(res.faltas);
            mostrarProposta(res, a);
          })
          .catch(function (e) { gerar.disabled = false; estado.textContent = ''; ui.aviso(T('A IA não respondeu: ', 'The AI did not answer: ') + explicarErro(e), 'erro'); });
      });
    };
    function mostrarFaltas(faltas) {
      U.limpar(resultado);
      if (!faltas.length) { resultado.appendChild(el('div', { class: 'rf-faixa-aviso rf-faixa-info', texto: T('A IA não achou nada faltando. Mesmo assim, valide com advogado.', 'The AI found nothing missing. Still, have a lawyer review it.') })); return; }
      resultado.appendChild(ui.secao(T('O que a IA apontou', 'What the AI pointed out'), [el('ul', {}, faltas.map(function (f) { return el('li', { texto: f }); }))],
        [ui.botao('🛠 ' + T('Corrigir com a IA', 'Fix with the AI'), function () {
          acao.value = 'melhorar'; ajustar(); extra.value = 'Corrija estes pontos: ' + faltas.join('; '); gerar.click();
        }, 'pri')]));
    }
    function mostrarProposta(res, a) {
      U.limpar(resultado);
      var tit = ui.bilingue(T('Título proposto', 'Proposed title'), res.titulo), txt = ui.bilingue(T('Texto proposto', 'Proposed text'), res.texto, { linhas: 14 });
      var nDef = IAT.contarADefinir(res.texto);
      resultado.appendChild(el('div', {}, [
        res.faltas && res.faltas.length ? el('p', { class: 'rf-dica', texto: T('A IA conferiu e corrigiu: ', 'The AI checked and fixed: ') + res.faltas.join('; ') }) : null,
        nDef ? el('div', { class: 'rf-faixa-aviso rf-faixa-info', texto: nDef + T(' marcador(es) [A DEFINIR] para você preencher (nome, e-mail, foro…). Dica: preencha uma vez em Termos → 🤖 Agente → "Dados que a IA usa".', ' [TO BE DEFINED] marker(s) for you to fill in (name, e-mail, venue…). Tip: fill them once in Terms → 🤖 Agent → "Facts the AI uses".') }) : null,
        el('p', { class: 'rf-dica', texto: T('Pode editar aqui antes de usar. Nada foi salvo ainda.', 'You can edit here before using it. Nothing has been saved yet.') }),
        tit, txt,
        el('div', { class: 'rf-acoes' }, [
          ui.botao(T('Descartar', 'Discard'), function () { U.limpar(resultado); estado.textContent = ''; }),
          ui.botao('✓ ' + T('Usar este texto (salva como rascunho)', 'Use this text (saves as draft)'), function () {
            var r = { titulo: tit.valor(), texto: txt.valor() };
            IAT.gravar(t, r, a).then(function () { ui.aviso(T('Rascunho salvo. Dá para desfazer.', 'Draft saved. You can undo.')); m.fechar(); RF.renderizar(); });
          }, 'pri')
        ])
      ]));
      tit.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  /* ------------------------------------------------------------------
     2. AGENTE DE POLÍTICAS
     Diagnóstico local (sem IA, grátis): o que cada app precisa ter.
     Depois a IA escreve só o que foi marcado.
     ------------------------------------------------------------------ */
  function requisitos() {
    var r = [
      { tipo: 'uso', app: '*', obrigatorio: true, porque: N('Todo app precisa de termos de uso.', 'Every app needs terms of use.') },
      { tipo: 'privacidade', app: '*', obrigatorio: true, porque: N('LGPD art. 9º: informar como os dados são tratados.', 'LGPD art. 9: explain how data is processed.') },
      { tipo: 'terceiros', app: '*', obrigatorio: false, porque: N('Músicas, marcas e dados de mercado de terceiros aparecem nos apps.', 'Third-party songs, trademarks and market data appear in the apps.') }
    ];
    var vistos = {};
    C.lista('ropa').forEach(function (x) {
      if (vistos[x.app] || !H.app(x.app)) return; vistos[x.app] = 1;
      var sens = /sens|sa[uú]de|crian/i.test(x.dados.pt) || /respons/.test(x.base);
      r.push({ tipo: 'privacidade', app: x.app, obrigatorio: true,
        porque: N('Trata ' + x.dados.pt.toLowerCase() + (sens ? ' — exige cuidado extra (dado sensível ou de criança).' : '.'), 'Processes ' + x.dados.en.toLowerCase() + (sens ? ' — needs extra care (sensitive or child data).' : '.')) });
    });
    if (H.app('rise-one')) r.push({ tipo: 'aviso-legal', app: 'rise-one', obrigatorio: true, porque: N('Exercício e saúde: não substitui profissional.', 'Exercise and health: does not replace a professional.') });
    if (H.app('moneytrio')) r.push({ tipo: 'aviso-legal', app: 'moneytrio', obrigatorio: true, porque: N('Investimentos e impostos: conteúdo informativo, não é recomendação.', 'Investments and taxes: informational, not advice.') });
    if (H.app('eleicoes-2026')) r.push({ tipo: 'aviso-legal', app: 'eleicoes-2026', obrigatorio: false, porque: N('Conteúdo eleitoral: informativo e sem posição partidária.', 'Election content: informational and non-partisan.') });
    return r;
  }
  function N(pt, en) { return { pt: pt, en: en }; }

  function situacao(req) {
    var t = C.lista('termos').filter(function (x) { return x.tipo === req.tipo && x.app === req.app; })[0];
    if (!t) return { t: null, cod: 'falta', rot: T('não existe', 'missing'), tipo: 'erro', marcar: true };
    var v = D.Termos.ultima(t), pub = D.Termos.publicada(t);
    var modelo = v.autor === 'sistema' || (v.nota && /Modelo inicial/.test(v.nota.pt || ''));
    if (!v.texto.pt) return { t: t, cod: 'vazio', rot: T('sem texto', 'no text'), tipo: 'erro', marcar: true };
    if (modelo && v.estado === 'rascunho') return { t: t, cod: 'modelo', rot: T('só o modelo inicial', 'starter template only'), tipo: 'atencao', marcar: true };
    var nDef = IAT.contarADefinir(v.texto);
    if (nDef) return { t: t, cod: 'definir', rot: nDef + T(' [A DEFINIR]', ' [TO BE DEFINED]'), tipo: 'atencao', marcar: false };
    if (pub && v === pub) return { t: t, cod: 'publicado', rot: T('publicado v', 'published v') + pub.versao, tipo: 'ok', marcar: false };
    return { t: t, cod: 'andamento', rot: T('em ', 'in ') + v.estado, tipo: 'info', marcar: false };
  }

  var agente = { rodando: false, parar: false, linhas: [], feitos: [] };
  var caixaLog = null;
  function logAgente(txt, tipo) {
    agente.linhas.push({ quando: U.agora(), txt: txt, tipo: tipo || '' });
    if (caixaLog && caixaLog.isConnected) desenharLog();
  }
  function desenharLog() {
    U.limpar(caixaLog);
    agente.linhas.slice(-80).forEach(function (l) {
      caixaLog.appendChild(el('li', { class: l.tipo ? 'rf-ag-' + l.tipo : '' }, [el('span', { class: 'rf-dica', texto: U.data(l.quando, true).split(' ').pop() + ' ' }), l.txt]));
    });
    caixaLog.scrollTop = caixaLog.scrollHeight;
  }

  function formFatos() {
    var cfg = C.obj('config'); var f = cfg.fatosTermos || {};
    var c1 = ui.entrada(f.controlador), c2 = ui.entrada(f.email, { tipo: 'email' }), c3 = ui.entrada(f.encarregado), c4 = ui.entrada(f.foro);
    return ui.secao(T('Dados que a IA usa (opcional)', 'Facts the AI uses (optional)'), [
      el('p', { class: 'rf-dica', texto: T('O que ficar em branco vira [A DEFINIR] no texto. Nada disso é segredo: vai escrito nos termos públicos.', 'Anything blank becomes [TO BE DEFINED] in the text. None of this is secret: it goes into the public terms.') }),
      el('div', { class: 'rf-grade-2' }, [
        ui.campo(T('Responsável pelos dados (nome ou empresa + CNPJ)', 'Data controller (name or company + tax ID)'), c1),
        ui.campo(T('E-mail de contato e privacidade', 'Contact and privacy e-mail'), c2),
        ui.campo(T('Encarregado (DPO)', 'DPO'), c3),
        ui.campo(T('Foro (cidade/UF)', 'Venue (city/state)'), c4)
      ])
    ], [ui.botaoSe('termos:editar', null, T('Salvar dados', 'Save facts'), function () {
      var antes = U.clonar(cfg.fatosTermos || {});
      cfg.fatosTermos = { controlador: c1.value.trim(), email: c2.value.trim(), encarregado: c3.value.trim(), foro: c4.value.trim() };
      RF.mudar('config', 'termos', 'fatos', '', antes, cfg.fatosTermos, T('Dados usados pela IA nos termos alterados', 'Facts used by the AI in terms changed')).then(function () { ui.aviso(T('Salvo.', 'Saved.')); });
    })]);
  }

  IAT.telaAgente = function (area) {
    RF.pagina(area, 'termos', T('O agente confere o que cada app precisa, escreve os rascunhos em PT e EN e os deixa para você revisar. Ele nunca publica.', 'The agent checks what each app needs, writes drafts in PT and EN and leaves them for you to review. It never publishes.'),
      [ui.botao('‹ ' + T('Termos', 'Terms'), function () { RF.Rota.ir('termos'); })]);
    area.querySelector('.rf-pag-tit').appendChild(el('span', { texto: ' · 🤖 ' + T('Agente de políticas', 'Policy agent') }));
    var pode = RF.pode('termos:criar') && RF.pode('termos:editar');
    var reqs = requisitos().filter(function (r) { return RF.noEscopo(r.app); });
    var marcas = {};
    var linhas = reqs.map(function (r, i) { var s = situacao(r); return { i: i, r: r, s: s }; });

    area.appendChild(el('div', { class: 'rf-faixa-aviso rf-faixa-info' }, [el('div', {}, [
      el('p', { style: { margin: '0 0 .4rem' } }, [T('IA em uso: ', 'AI in use: '), el('b', { texto: dgo() && dgo().temChave() ? IAT.rotuloIA() : T('nenhuma chave ainda', 'no key yet') }), ' · ',
        el('a', { href: '#', texto: T('escolher IA / colar chave', 'choose AI / paste key'), onclick: function (e) { e.preventDefault(); if (dgo()) dgo().chaves(); } })]),
      el('p', { style: { margin: 0 } }, [T('Grátis: Google Gemini, Groq e modelos ":free" do OpenRouter (este dá ~50 pedidos/dia). Pagas: OpenAI, Anthropic. Os textos saem como rascunho com você de autor, então a aprovação continua sendo de outra pessoa.',
        'Free: Google Gemini, Groq and OpenRouter ":free" models (that one gives ~50 requests/day). Paid: OpenAI, Anthropic. Texts come out as drafts with you as author, so approval still comes from someone else.')])
    ])]));

    var tabela = ui.tabela([
      { id: 'm', nome: '✓', desenhar: function (x) {
        var c = el('input', { type: 'checkbox', 'aria-label': T('Escrever este', 'Write this one') });
        c.checked = marcas[x.i] = marcas[x.i] === undefined ? x.s.marcar : marcas[x.i];
        c.disabled = !pode || agente.rodando;
        c.onchange = function () { marcas[x.i] = c.checked; atualizarConta(); };
        return c;
      } },
      { id: 'doc', nome: T('Documento', 'Document'), valor: function (x) { return T(RF.telasTermos.TIPOS[x.r.tipo] || { pt: x.r.tipo, en: x.r.tipo }); } },
      { id: 'app', nome: 'App', valor: function (x) { return H.nomeApp(x.r.app); } },
      { id: 's', nome: T('Situação', 'Status'), desenhar: function (x) { return x.s.t ? el('a', { href: '#/termos/termo/' + x.s.t.id }, [ui.selo(x.s.rot, x.s.tipo)]) : ui.selo(x.s.rot, x.s.tipo); } },
      { id: 'p', nome: T('Por quê', 'Why'), valor: function (x) { return T(x.r.porque); } }
    ], linhas);

    var revisar = ui.marca(T('Conferir e corrigir cada texto depois de escrever (mais qualidade, +2 pedidos por documento)', 'Check and fix each text after writing (better quality, +2 requests per document)'), true);
    var conta = el('p', { class: 'rf-dica' });
    function atualizarConta() {
      var n = linhas.filter(function (x) { return marcas[x.i]; }).length;
      var porDoc = revisar.querySelector('input').checked ? 4 : 2;
      conta.textContent = n + T(' documento(s) marcado(s) · cerca de ', ' document(s) selected · about ') + (n * porDoc) + T(' pedidos à IA · leva uns ', ' AI requests · takes about ') + Math.max(1, Math.round(n * porDoc * 20 / 60)) + ' min.';
    }
    revisar.querySelector('input').onchange = atualizarConta;
    var rodar = ui.botao('▶ ' + T('Rodar agente', 'Run agent'), function () { iniciar(); }, 'pri');
    var parar = ui.botao('■ ' + T('Parar depois deste', 'Stop after this one'), function () { agente.parar = true; parar.disabled = true; logAgente(T('Vai parar depois do documento atual.', 'Will stop after the current document.')); });
    rodar.disabled = !pode || agente.rodando; parar.disabled = !agente.rodando;
    if (!pode) rodar.title = T('Seu papel não permite criar e editar termos.', 'Your role cannot create and edit terms.');

    area.appendChild(ui.secao(T('O que cada app precisa', 'What each app needs'), [tabela, revisar, conta, el('div', { class: 'rf-acoes' }, [rodar, parar])]));
    caixaLog = el('ol', { class: 'rf-ag-log', 'aria-live': 'polite' });
    area.appendChild(ui.secao(T('Andamento', 'Progress'), [caixaLog]));
    var feitos = el('div');
    area.appendChild(ui.secao(T('Rascunhos escritos nesta sessão', 'Drafts written this session'), [feitos]));
    function desenharFeitos() {
      U.limpar(feitos);
      if (!agente.feitos.length) { feitos.appendChild(el('p', { class: 'rf-dica', texto: T('Nenhum ainda.', 'None yet.') })); return; }
      feitos.appendChild(el('ul', {}, agente.feitos.map(function (f) {
        return el('li', {}, [el('a', { href: '#/termos/termo/' + f.id, texto: f.titulo }), ' · ', H.nomeApp(f.app), f.nDef ? ' · ' + f.nDef + ' [A DEFINIR]' : '']);
      })));
    }
    area.appendChild(formFatos());
    desenharLog(); desenharFeitos(); atualizarConta();

    function iniciar() {
      if (!IAT.pronta()) return;
      var fila = linhas.filter(function (x) { return marcas[x.i]; });
      if (!fila.length) return ui.aviso(T('Marque pelo menos um documento.', 'Select at least one document.'), 'erro');
      confirmarEnvio().then(function (ok) {
        if (!ok) return;
        agente.rodando = true; agente.parar = false; rodar.disabled = true; parar.disabled = false;
        var rev = revisar.querySelector('input').checked, total = 0;
        logAgente(T('Começando: ', 'Starting: ') + fila.length + T(' documento(s) com ', ' document(s) with ') + IAT.rotuloIA() + '.', 'inicio');
        RF.Log.registrar('termos', 'agente-inicio', '', null, { documentos: fila.length, ia: IAT.rotuloIA() }, T('Agente de políticas iniciado', 'Policy agent started'));
        var i = 0;
        function proximo() {
          if (agente.parar || i >= fila.length) return Promise.resolve();
          var x = fila[i++], r = x.r;
          var t = situacao(r).t, novo = !t;
          if (novo) {   /* só entra na lista se a IA der certo */
            t = { id: U.uid('t-'), tipo: r.tipo, app: r.app, obrigatorio: r.obrigatorio,
              versoes: [{ versao: 1, estado: 'rascunho', criadoEm: U.agora(), autor: S.pessoa.email, titulo: { pt: nomeTipo(r.tipo), en: '' }, texto: { pt: '', en: '' }, nota: null }] };
          }
          var v = D.Termos.ultima(t);
          var nome = T(RF.telasTermos.TIPOS[r.tipo] || {}) + ' — ' + H.nomeApp(r.app);
          logAgente('📄 ' + nome, 'doc');
          var acao = (!v.texto.pt || v.autor === 'sistema' || situacao(r).cod === 'modelo') ? 'escrever' : 'melhorar';
          return IAT.executar(t, acao, { titulo: v.titulo, texto: v.texto }, { revisar: rev, passo: function (s) { logAgente('   ' + s); } })
            .then(function (res) {
              total += res.chamadas;
              if (novo) C.lista('termos').push(t);
              return IAT.gravar(t, res, 'agente').then(function () {
                var nDef = IAT.contarADefinir(res.texto);
                agente.feitos.push({ id: t.id, titulo: res.titulo.pt, app: t.app, nDef: nDef });
                logAgente('   ✅ ' + T('Rascunho salvo', 'Draft saved') + (nDef ? ' · ' + nDef + T(' [A DEFINIR] para preencher', ' [TO BE DEFINED] to fill in') : ''), 'ok');
                if (feitos.isConnected) desenharFeitos();
              });
            })
            .catch(function (e) {
              logAgente('   ⚠ ' + T('Não deu: ', 'Failed: ') + explicarErro(e), 'erro');
              if (e && (e.status === 401 || e.status === 429 || /sem-chave|so-wifi|sem-internet/.test(e.message))) { agente.parar = true; logAgente(T('Parando: o problema vale para os próximos também.', 'Stopping: the problem applies to the next ones too.'), 'erro'); }
            })
            .then(function () { return agente.parar ? null : esperar(3000); })   /* respeita o limite por minuto dos planos grátis */
            .then(proximo);
        }
        proximo().then(function () {
          agente.rodando = false;
          logAgente(T('Fim. ', 'Done. ') + agente.feitos.length + T(' rascunho(s) no total · ', ' draft(s) in total · ') + total + T(' pedido(s) à IA nesta rodada. Abra cada um, confira, preencha os [A DEFINIR] e envie para aprovação.', ' AI request(s) this run. Open each one, check it, fill in the [TO BE DEFINED] and send it for approval.'), 'fim');
          RF.Log.registrar('termos', 'agente-fim', '', null, { rascunhos: agente.feitos.length, pedidos: total }, T('Agente de políticas terminou', 'Policy agent finished'));
          if (caixaLog && caixaLog.isConnected) RF.renderizar();
        });
      });
    }
  };
})(window);
