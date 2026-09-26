/* =====================================================================
   RootifyONE — AssistONE
   ---------------------------------------------------------------------
   O assistente de todos os apps da SolverONE (diretriz "AssistONE"):
     · personagem redondo no canto de baixo à direita, mesmo lugar em
       todas as telas (WCAG 3.2.6); some com janela, ☰ ou tela de entrada;
     · o balão começa por "📍 Você está em <tela>" com 1 a 3 atalhos que
       já executam a ação; depois as opções gerais;
     · primeira visita: Começar (passo a passo), Tour rápido, Procurar
       algo (mesmo índice da lupa), Ajuda desta tela, Agora não, Desligar;
     · dica curta por tela, uma vez só; passo a passo com progresso,
       Fazer agora / Pular / Continuar depois e retomada;
     · liga/desliga em ⚙️ → Geral, num cartão "ASSIST ONE ATIVADO".
   O balão NÃO entra no histórico (o Voltar do celular segue nas telas).
   Quando o módulo comum (diretrizes.js) trouxer o AssistONE, este arquivo
   passa a delegar para ele; o mapa por tela (MAPA) continua aqui.
   ===================================================================== */
(function (raiz) {
  'use strict';
  var RF = raiz.RF, U = RF.util, T = U.T, el = U.el, ui = RF.ui, C = RF.Cofre, S = RF.Sessao;
  var d = document;
  function N(pt, en) { return { pt: pt, en: en }; }
  function ir(m, s, i) { return function () { RF.Rota.ir(m, s, i); }; }
  function h(nome) { return function () { if (typeof RF.h[nome] === 'function') RF.h[nome]({}); }; }

  /* ------------------------------------------------------------------
     MAPA POR TELA: frase do que dá para fazer ali + atalhos que executam
     ------------------------------------------------------------------ */
  var MAPA = {
    painel: { frase: N('Resumo do que pede atenção. Os cartões são clicáveis e levam à tela certa.', 'Summary of what needs attention. The cards are clickable and lead to the right screen.'),
      atalhos: [{ r: N('📥 Ver a caixa de entrada', '📥 See the inbox'), f: ir('inbox') }, { r: N('🎧 Abrir chamado', '🎧 Open ticket'), f: h('novoChamado'), perm: 'suporte:criar' }, { r: N('🚀 Publicar', '🚀 Publish'), f: ir('publicar'), perm: 'publicar:ver' }],
      dica: N('Os cartões do painel são clicáveis: toque num número para ir direto à lista.', 'Dashboard cards are clickable: tap a number to go straight to the list.') },
    inbox: { frase: N('Tudo o que pede a sua atenção, em ordem de prioridade. Tocar num item marca como lido e leva ao lugar.', 'Everything that needs your attention, by priority. Tapping an item marks it read and takes you there.'),
      atalhos: [{ r: N('✓ Marcar tudo como lido', '✓ Mark all as read'), f: function () { RF.Inbox.marcarTodos().then(RF.renderizar); } }] },
    apps: { frase: N('Catálogo dos apps: endereço, estado, versão mínima. Vira o apps.json publicado.', 'App catalog: address, stage, minimum version. Becomes the published apps.json.'),
      atalhos: [{ r: N('🌐 Domínio e DNS', '🌐 Domain and DNS'), f: ir('integracoes', 'dominio'), perm: 'integracoes:ver' }, { r: N('🚀 Publicar', '🚀 Publish'), f: ir('publicar'), perm: 'publicar:ver' }],
      dica: N('Toque num app para editar; "Verificar" confere se ele está no ar.', 'Tap an app to edit it; "Check" tests whether it is online.') },
    planos: { frase: N('Planos de usuário e o que cada um inclui. Preço fica em cinza até existir cobrança.', 'User plans and what each includes. Price stays grey until billing exists.'),
      atalhos: [{ r: N('🧩 Serviços por plano', '🧩 Services by plan'), f: ir('servicos'), perm: 'servicos:ver' }] },
    recursos: { frase: N('Controle de cada app: ligue ou desligue funções (feature flags), ajuste comportamentos (remote config) e edite conteúdo (textos, fotos, vídeos). Depois, Publicar.', 'Control of each app: turn features on or off (feature flags), adjust behaviours (remote config) and edit content (texts, photos, videos). Then Publish.'),
      atalhos: [{ r: N('🏃 Equipamentos do RiseONE', '🏃 RiseONE equipment'), f: function () { RF.Recursos.abrirColecao('rise-one', 'equipamentos'); }, perm: 'conteudo:ver' }, { r: N('🌐 Recursos globais', '🌐 Global features'), f: ir('recursos', '*', 'recursos') }, { r: N('🚀 Publicar', '🚀 Publish'), f: ir('publicar'), perm: 'publicar:ver' }],
      dica: N('Mudou algo aqui? Só vale nos apps depois de Publicar (os apps leem recursos/ e conteudo/ ao abrir).', 'Changed something here? It only applies in the apps after Publish (apps read recursos/ and conteudo/ when they open).') },
    servicos: { frase: N('Cada função de cada app e quais planos podem usar. Padrão: todos os planos.', 'Each feature of each app and which plans may use it. Default: every plan.'),
      atalhos: [{ r: N('💎 Planos', '💎 Plans'), f: ir('planos'), perm: 'planos:ver' }] },
    usuarios: { frase: N('CRM: ficha 360° de cada pessoa, segmentos, importar/exportar e duplicados.', 'CRM: 360° record of each person, segments, import/export and duplicates.'),
      atalhos: [{ r: N('👤 Novo usuário', '👤 New user'), f: h('novoUsuario'), perm: 'usuarios:criar' }, { r: N('⬆ Importar CSV', '⬆ Import CSV'), f: ir('usuarios', 'importar'), perm: 'usuarios:criar' }, { r: N('✉️ Escrever e-mail', '✉️ Write e-mail'), f: h('novoEmail'), perm: 'emails:criar' }],
      dica: N('Toque numa linha para abrir a ficha completa da pessoa.', 'Tap a row to open the person\'s full record.') },
    suporte: { frase: N('Fila de chamados com prazo por prioridade. Comece pela sua fila e pelo que está em risco.', 'Ticket queue with a deadline per priority. Start with your queue and what is at risk.'),
      atalhos: [{ r: N('🎧 Novo chamado', '🎧 New ticket'), f: h('novoChamado'), perm: 'suporte:criar' }, { r: N('⚠ Prazo em risco', '⚠ Deadline at risk'), f: ir('suporte', 'risco') }, { r: N('📊 Relatórios', '📊 Reports'), f: ir('suporte', 'relatorios') }],
      dica: N('Dentro de um chamado, "Sugerir com IA" escreve um rascunho com os dados pessoais mascarados.', 'Inside a ticket, "Suggest with AI" drafts a reply with personal data masked.') },
    kb: { frase: N('Artigos de ajuda em PT e EN. Publicados, alimentam a ajuda dos apps.', 'Help articles in PT and EN. Once published they feed the apps\' help.'), atalhos: [] },
    termos: { frase: N('Termos e políticas com versão, revisão por outra pessoa e publicação. O Agente escreve os rascunhos.', 'Terms and policies with versions, review by someone else and publishing. The Agent writes the drafts.'),
      atalhos: [{ r: N('🤖 Agente de políticas', '🤖 Policy agent'), f: ir('termos', 'agente'), perm: 'termos:criar' }, { r: N('🚀 Publicar', '🚀 Publish'), f: ir('publicar'), perm: 'publicar:ver' }],
      dica: N('Quem escreve um termo não pode aprová-lo: a aprovação é de outra pessoa da equipe.', 'Whoever writes a term cannot approve it: approval comes from someone else on the team.') },
    recados: { frase: N('Avisos da plataforma para a caixa de recados dos apps, com período e público.', 'Platform notices for the apps\' inbox, with period and audience.'), atalhos: [] },
    anuncios: { frase: N('Cartões da faixa e do pop-up dos apps. Vira o anuncios.json.', 'Cards for the apps\' strip and pop-up. Becomes anuncios.json.'), atalhos: [] },
    versoes: { frase: N('O que cada versão de cada app trouxe, em PT e EN.', 'What each version of each app brought, in PT and EN.'), atalhos: [] },
    publicar: { frase: N('Confere e publica os arquivos master no solverone-dados: pelo GitHub (token) ou baixando o pacote.', 'Checks and publishes the master files to solverone-dados: through GitHub (token) or by downloading the package.'),
      atalhos: [{ r: N('🔌 Token do GitHub', '🔌 GitHub token'), f: ir('integracoes'), perm: 'integracoes:ver' }],
      dica: N('Erros em vermelho bloqueiam a publicação; avisos em amarelo não.', 'Red errors block publishing; yellow warnings do not.') },
    papeis: { frase: N('Quem pode ver e fazer o quê. Teste qualquer papel com "ver como".', 'Who can see and do what. Test any role with "view as".'),
      atalhos: [{ r: N('🎭 Ver como outro papel', '🎭 View as another role'), f: function () { RF.abrirSimulador(); }, dono: true }, { r: N('🧑‍💼 Equipe', '🧑‍💼 Team'), f: ir('equipe'), perm: 'equipe:ver' }] },
    equipe: { frase: N('Pessoas que trabalham no RootifyONE, com papel e apps. O convite sai pela caixa de saída de e-mails.', 'People who work in RootifyONE, with role and apps. The invitation leaves through the e-mail outbox.'),
      atalhos: [{ r: N('🛡 Papéis e permissões', '🛡 Roles and permissions'), f: ir('papeis'), perm: 'papeis:ver' }] },
    privacidade: { frase: N('Pedidos dos titulares (15 dias), registro de tratamento, consentimentos e incidentes.', 'Data-subject requests (15 days), record of processing, consents and incidents.'),
      atalhos: [{ r: N('⚖ Registrar pedido', '⚖ Log request'), f: h('novoPedido'), perm: 'privacidade:criar' }, { r: N('🚨 Incidentes', '🚨 Incidents'), f: ir('privacidade', 'incidentes') }],
      dica: N('Ao registrar um pedido com e-mail, a confirmação de recebimento já vai para a caixa de saída.', 'When you log a request with an e-mail, the acknowledgement goes straight to the outbox.') },
    auditoria: { frase: N('Tudo o que foi feito, por quem e quando, com antes e depois. Encadeado: dá para provar que nada sumiu.', 'Everything done, by whom and when, with before and after. Chained: it proves nothing vanished.'), atalhos: [] },
    emails: { frase: N('Caixa de saída, modelos PT/EN, remetentes @solverone.com.br e o provedor de envio. Sem provedor, cada e-mail abre no seu programa com um toque.', 'Outbox, PT/EN templates, @solverone.com.br senders and the delivery provider. Without a provider, each e-mail opens in your mail program with one tap.'),
      atalhos: [{ r: N('✉️ Novo e-mail', '✉️ New e-mail'), f: h('novoEmail'), perm: 'emails:criar' }, { r: N('🌐 DNS do e-mail', '🌐 E-mail DNS'), f: ir('emails', 'remetentes') }, { r: N('🚀 Configurar envio', '🚀 Set up delivery'), f: ir('emails', 'envio'), perm: 'emails.config:editar' }],
      dica: N('A caixa de saída guarda tudo o que a plataforma quer mandar. "Enviar sozinho" só liga com o proxy configurado.', 'The outbox keeps everything the platform wants to send. "Send on its own" only works with the proxy configured.') },
    integracoes: { frase: N('GitHub, domínio e DNS, Formspree e as chaves de IA (cofre comum a todos os apps).', 'GitHub, domain and DNS, Formspree and the AI keys (vault shared by every app).'),
      atalhos: [{ r: N('🌐 Domínio e DNS', '🌐 Domain and DNS'), f: ir('integracoes', 'dominio') }, { r: N('🔑 Cofre de chaves de IA', '🔑 AI key vault'), f: function () { if (raiz.DGO && raiz.DGO.ia) raiz.DGO.ia.guia(); } }] },
    automacoes: { frase: N('Regras "quando X, faça Y". Rodam aqui dentro na hora do evento; agendadas esperam servidor.', 'Rules "when X, do Y". They run in here at the moment of the event; scheduled ones wait for a server.'), atalhos: [] },
    financeiro: { frase: N('Custos da plataforma já dá para registrar. Receita e pagamentos esperam o meio de pagamento.', 'Platform costs can already be recorded. Revenue and payments wait for the payment provider.'), atalhos: [] },
    telemetria: { frase: N('Uso, desempenho e erros dos apps — espera a escolha da ferramenta e o servidor.', 'App usage, performance and errors — waits for the tool choice and the server.'), atalhos: [] },
    armazenamento: { frase: N('Cotas por plano e quanto espaço este aparelho usa.', 'Quotas per plan and how much space this device uses.'), atalhos: [] },
    mapa: { frase: N('Tudo o que está em cinza, com a pergunta que falta responder. Exporte para a planilha de diretrizes.', 'Everything grey, with the question still to answer. Export to the guidelines spreadsheet.'), atalhos: [] },
    configuracoes: { frase: N('Idioma, aparência, AssistONE, segurança de acesso, barra de atalhos, cópia de segurança e novidades.', 'Language, appearance, AssistONE, access security, shortcut bar, backup and what\'s new.'),
      atalhos: [{ r: N('✨ IA: chaves e chat', '✨ AI: keys and chat'), f: ir('configuracoes', 'ia') }, { r: N('🛡 Minha segurança', '🛡 My security'), f: ir('configuracoes', 'seguranca') }, { r: N('⭐ Barra de atalhos', '⭐ Shortcut bar'), f: ir('configuracoes', 'barra') }] }
  };

  /* ------------------------------------------------------------------
     PASSO A PASSO (onboarding): o motor é genérico; os passos são estes.
     feito() decide sozinho o que já está pronto.
     ------------------------------------------------------------------ */
  function PASSOS() {
    var p = S.pessoa && C.pessoa(S.pessoa.id), cfg = C.aberto() ? C.obj('config') : {};
    return [
      { id: 'seguranca', titulo: N('Entrar mais rápido', 'Faster sign-in'), texto: N('Registre a digital ou um PIN. A senha continua valendo sempre.', 'Register your fingerprint or a PIN. The password always works.'),
        feito: function () { return !!(p && (p.cred.pin || p.cred.webauthn)); }, ir: ['configuracoes', 'seguranca'] },
      { id: 'exemplo', titulo: N('Ver tudo funcionando', 'See everything working'), texto: N('Carregue os dados de exemplo (fictícios) para conhecer as telas; depois é só remover.', 'Load the sample (fictitious) data to get to know the screens; then just remove it.'),
        feito: function () { return !!cfg.exemplo || C.lista('usuarios').length > 0; }, ir: ['configuracoes', 'exemplo'], perm: 'configuracoes:editar' },
      { id: 'barra', titulo: N('Montar a barra de atalhos', 'Build the shortcut bar'), texto: N('Escolha até 5 telas para a barra do celular (arrastando ou tocando).', 'Choose up to 5 screens for the phone bar (dragging or tapping).'),
        feito: function () { return !!(cfg.favoritos && cfg.favoritos.length); }, ir: ['configuracoes', 'barra'] },
      { id: 'dominio', titulo: N('Conferir o domínio', 'Check the domain'), texto: N('solverone.com.br: registros de DNS, HTTPS e os endereços dos apps no catálogo.', 'solverone.com.br: DNS records, HTTPS and the app addresses in the catalog.'),
        feito: function () { return C.lista('apps').every(function (a) { return !a.url || a.url.indexOf(RF.cat.DOMINIO.antigo) !== 0; }); }, ir: ['integracoes', 'dominio'], perm: 'integracoes:ver' },
      { id: 'github', titulo: N('Ligar a publicação', 'Turn on publishing'), texto: N('Cole o token fine-grained do GitHub para publicar os arquivos master no solverone-dados.', 'Paste the fine-grained GitHub token to publish the master files to solverone-dados.'),
        feito: function () { return !!(cfg.github && cfg.github.token); }, ir: ['integracoes'], perm: 'integracoes:editar' },
      { id: 'emails', titulo: N('Deixar os e-mails prontos', 'Get e-mails ready'), texto: N('Revise os remetentes @solverone.com.br e os modelos. O provedor de envio pode vir depois.', 'Review the @solverone.com.br senders and the templates. The delivery provider can come later.'),
        feito: function () { return !!(cfg.email && cfg.email.dns && (cfg.email.dns.spf || cfg.email.dns.dkim)) || !!(cfg.email && cfg.email.provedor && cfg.email.provedor.proxy); }, ir: ['emails', 'remetentes'], perm: 'emails:ver' },
      { id: 'termos', titulo: N('Termos e políticas', 'Terms and policies'), texto: N('Revise os rascunhos (ou peça ao Agente de políticas), envie para aprovação e publique.', 'Review the drafts (or ask the Policy agent), send for approval and publish.'),
        feito: function () { return C.lista('termos').some(function (t) { return RF.dados.Termos.publicada(t); }); }, ir: ['termos'], perm: 'termos:ver' },
      { id: 'equipe', titulo: N('Cadastrar a equipe', 'Add the team'), texto: N('Crie as contas com o papel certo (suporte, conteúdo, DPO…).', 'Create the accounts with the right role (support, content, DPO…).'),
        feito: function () { return C.equipe().length > 1; }, ir: ['equipe'], perm: 'equipe:criar' }
    ].filter(function (x) { return !x.perm || RF.pode(x.perm); });
  }

  /* ------------------------------------------------------------------
     ESTADO (por aparelho, fora do cofre: vale antes de entrar também)
     ------------------------------------------------------------------ */
  var Pref = {
    ler: function () { return U.lerLocal('assist', { ligado: true, boasVindas: false, dicas: {}, wizard: { pulados: [], concluido: false, guardado: false }, tour: false }); },
    gravar: function (p) { U.gravarLocal('assist', p); }
  };

  var botao, balao, dica, telaAtual = { modulo: 'painel' }, abertoAgora = false, escondido = { modal: false, menu: false, acesso: true };

  /* ------------------------------------------------------------------
     PERSONAGEM E BALÃO
     ------------------------------------------------------------------ */
  function montar() {
    if (botao) return;
    botao = el('button', { id: 'rf-assist', type: 'button', 'aria-label': 'AssistONE — ' + T('ajuda e assistente', 'help and assistant'), 'aria-expanded': 'false', 'aria-controls': 'rf-assist-balao', hidden: true }, [
      el('img', { src: 'ajuda-icone.png', alt: '', width: 58, height: 58, loading: 'lazy' }),
      el('span', { class: 'rf-assist-retomar', hidden: true })
    ]);
    botao.onclick = function () { if (abertoAgora) fechar(); else abrir(); };
    balao = el('div', { id: 'rf-assist-balao', class: 'rf-assist-balao', role: 'dialog', 'aria-label': 'AssistONE', hidden: true });
    d.body.appendChild(botao); d.body.appendChild(balao);
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && abertoAgora) { fechar(); botao.focus(); } });
    d.addEventListener('pointerdown', function (e) { if (abertoAgora && !balao.contains(e.target) && !botao.contains(e.target)) fechar(); });
    atualizarVisibilidade();
  }
  function ligado() { return Pref.ler().ligado !== false; }
  function atualizarVisibilidade() {
    if (!botao) return;
    var mostrar = ligado() && !escondido.acesso && !escondido.modal && !escondido.menu && !!S.pessoa;
    botao.hidden = !mostrar;
    d.body.classList.toggle('rf-com-assist', mostrar);
    if (!mostrar && abertoAgora) fechar();
    var pr = Pref.ler(), w = pr.wizard || {};
    var ret = botao.querySelector('.rf-assist-retomar');
    if (w.guardado && !w.concluido && mostrar) {
      var ps = PASSOS(), feitos = ps.filter(function (x) { return x.feito() || w.pulados.indexOf(x.id) !== -1; }).length;
      ret.textContent = '▸ ' + T('Continuar o início', 'Continue the start') + ' (' + feitos + '/' + ps.length + ')'; ret.hidden = false;
    } else ret.hidden = true;
  }
  function abrir(modo) {
    montar();
    if (!ligado() && modo !== 'forcar') { Pref.gravar(Object.assign(Pref.ler(), { ligado: true })); atualizarVisibilidade(); }
    abertoAgora = true;
    botao.hidden = false; botao.classList.add('rf-aberto'); botao.setAttribute('aria-expanded', 'true');
    balao.hidden = false; d.body.classList.add('rf-assist-aberto');
    esconderDica();
    desenhar(modo);
    setTimeout(function () { var f = balao.querySelector('input, button'); if (f) f.focus(); }, 40);
  }
  function fechar() {
    if (!abertoAgora) return;
    abertoAgora = false;
    botao.classList.remove('rf-aberto'); botao.setAttribute('aria-expanded', 'false');
    balao.hidden = true; U.limpar(balao); d.body.classList.remove('rf-assist-aberto');
  }
  function cabecalho(titulo) {
    var x = el('button', { type: 'button', class: 'rf-x', 'aria-label': T('Fechar', 'Close'), texto: '✕' });
    x.onclick = function () { fechar(); botao.focus(); };
    return el('div', { class: 'rf-assist-cab' }, [el('strong', { texto: titulo }), x]);
  }
  function linha(rotulo, fn, tipo) {
    var b = ui.botao(rotulo, function () { fechar(); fn(); }, tipo || '');
    b.classList.add('rf-assist-op');
    return b;
  }

  function desenhar(modo) {
    U.limpar(balao);
    var pr = Pref.ler();
    if (modo === 'busca') return desenharBusca();
    if (modo === 'wizard') return desenharWizard();
    var m = RF.cat.modulo(telaAtual.modulo) || RF.cat.modulo('painel');
    var mapa = MAPA[m.id] || { frase: m.ajuda, atalhos: [] };
    var primeira = !pr.boasVindas;
    balao.appendChild(cabecalho(primeira ? T('Olá! Eu sou o AssistONE 👋', 'Hi! I am AssistONE 👋') : 'AssistONE'));
    if (primeira) balao.appendChild(el('p', { class: 'rf-assist-intro', texto: T('Estou aqui em todas as telas: explico onde você está, encontro qualquer coisa e mostro o caminho. Por onde começamos?', 'I am here on every screen: I explain where you are, find anything and show the way. Where do we start?') }));

    /* 1) ajuda da tela atual */
    var atalhos = (mapa.atalhos || []).filter(function (a) { return (!a.perm || RF.pode(a.perm)) && (!a.dono || RF.ehDono()); }).slice(0, 3);
    balao.appendChild(el('div', { class: 'rf-assist-tela' }, [
      el('p', { class: 'rf-assist-onde' }, ['📍 ', T('Você está em ', 'You are in '), el('b', { texto: T(m.nome) })]),
      el('p', { class: 'rf-dica', texto: T(mapa.frase || m.ajuda) }),
      atalhos.length ? el('div', { class: 'rf-assist-atalhos' }, atalhos.map(function (a) { return linha(T(a.r), a.f, 'p'); })) : null
    ]));

    /* 2) opções gerais */
    var ops = el('div', { class: 'rf-assist-ops' });
    var w = pr.wizard || {}, ps = PASSOS(), faltam = ps.filter(function (x) { return !x.feito() && (w.pulados || []).indexOf(x.id) === -1; });
    if (!w.concluido && faltam.length) ops.appendChild(linhaSem(primeira ? '🚀 ' + T('Começar (passo a passo)', 'Start (walkthrough)') : '▸ ' + T('Continuar o início', 'Continue the start') + ' (' + (ps.length - faltam.length) + '/' + ps.length + ')', function () { abrir('wizard'); }));
    ops.appendChild(linhaSem('🧭 ' + T('Tour rápido', 'Quick tour'), function () { fechar(); tour(); }));
    ops.appendChild(linhaSem('🔍 ' + T('Procurar algo', 'Find something'), function () { abrir('busca'); }));
    ops.appendChild(linhaSem('📖 ' + T('Ajuda desta tela', 'Help for this screen'), function () { fechar(); RF.ajudaDaTela(m); }));
    if (raiz.DGO && raiz.DGO.ia && raiz.DGO.ia.abrir) ops.appendChild(linhaSem('✨ ' + T('Perguntar à IA (chat)', 'Ask the AI (chat)'), function () { fechar(); raiz.DGO.ia.abrir(); }));
    balao.appendChild(ops);
    var pe = el('div', { class: 'rf-assist-pe' }, [
      ui.botao(T('Agora não', 'Not now'), function () { fechar(); botao.focus(); }, 'link'),
      ui.botao(T('Desligar o AssistONE', 'Turn AssistONE off'), function () { desligar(); }, 'link')
    ]);
    balao.appendChild(pe);
    if (primeira) { pr.boasVindas = true; Pref.gravar(pr); }
  }
  function linhaSem(rotulo, fn) { var b = ui.botao(rotulo, fn); b.classList.add('rf-assist-op'); return b; }
  function desligar() {
    var pr = Pref.ler(); pr.ligado = false; Pref.gravar(pr);
    fechar(); atualizarVisibilidade();
    ui.aviso(T('AssistONE desligado. Para religar: ⚙️ Configurações → Geral.', 'AssistONE off. To turn it back on: ⚙️ Settings → General.'), 'info');
  }

  function desenharBusca() {
    balao.appendChild(cabecalho('🔍 ' + T('Procurar algo', 'Find something')));
    var campo = ui.entrada('', { tipo: 'search', attrs: { placeholder: T('Tela, função, pessoa, chamado…', 'Screen, feature, person, ticket…'), 'aria-label': T('Procurar', 'Search'), autofocus: true } });
    var zona = el('div', { class: 'rf-assist-res' });
    var indice = RF.busca.indice();
    function buscar() {
      U.limpar(zona);
      var res = RF.busca.procurar(campo.value, indice);
      if (!res.curto && res.achados.length > 8) { var tudo = res.achados.length; res.achados = res.achados.slice(0, 8); }
      zona.appendChild(RF.busca.desenhar(res, campo.value, function (it) { fechar(); RF.busca.abrirItem(it); }, campo));
      if (tudo) zona.appendChild(ui.botao(T('Ver todos', 'See all') + ' (' + tudo + ')', function () { fechar(); RF.abrirBusca(); setTimeout(function () { var i = d.querySelector('.rf-modal input[type=search]'); if (i) { i.value = campo.value; i.dispatchEvent(new Event('input')); } }, 80); }, 'link'));
      if (!res.curto && !res.achados.length) zona.appendChild(ui.botao('📖 ' + T('Ver a ajuda desta tela', 'See help for this screen'), function () { fechar(); RF.ajudaDaTela(RF.cat.modulo(telaAtual.modulo)); }, 'link'));
    }
    campo.addEventListener('input', buscar);
    campo.addEventListener('keydown', function (e) { if (e.key === 'Enter') { var p = zona.querySelector('.rf-busca-item'); if (p) p.click(); } });
    balao.appendChild(campo); balao.appendChild(zona); buscar();
    balao.appendChild(el('div', { class: 'rf-assist-pe' }, [ui.botao('‹ ' + T('Voltar', 'Back'), function () { desenhar(); }, 'link')]));
  }

  /* ------------------------------------------------------------------
     PASSO A PASSO
     ------------------------------------------------------------------ */
  function desenharWizard() {
    var pr = Pref.ler(), w = pr.wizard = pr.wizard || { pulados: [], concluido: false, guardado: false };
    var ps = PASSOS();
    var feitos = ps.filter(function (x) { return x.feito(); });
    var proximos = ps.filter(function (x) { return !x.feito() && w.pulados.indexOf(x.id) === -1; });
    balao.appendChild(cabecalho('🚀 ' + T('Passo a passo', 'Walkthrough')));
    if (!proximos.length) {
      w.concluido = true; w.guardado = false; Pref.gravar(pr); atualizarVisibilidade();
      balao.appendChild(el('p', { texto: '🎉 ' + T('Tudo pronto! ', 'All set! ') + feitos.length + '/' + ps.length + T(' passos feitos.', ' steps done.') + (w.pulados.length ? ' ' + T('Os pulados continuam no cartão do painel.', 'Skipped ones remain on the dashboard card.') : '') }));
      balao.appendChild(el('div', { class: 'rf-assist-pe' }, [ui.botao(T('Fechar', 'Close'), function () { fechar(); }, 'pri')]));
      return;
    }
    var passo = proximos[0], idx = ps.indexOf(passo);
    balao.appendChild(el('p', { class: 'rf-assist-progresso', texto: T('Passo ', 'Step ') + (idx + 1) + T(' de ', ' of ') + ps.length + ' · ' + feitos.length + T(' feito(s)', ' done') }));
    balao.appendChild(el('div', { class: 'rf-medidor', 'aria-hidden': 'true' }, [el('span', { style: { width: Math.round(feitos.length / ps.length * 100) + '%' } })]));
    balao.appendChild(el('h3', { texto: T(passo.titulo) }));
    balao.appendChild(el('p', { texto: T(passo.texto) }));
    balao.appendChild(el('div', { class: 'rf-assist-ops' }, [
      linhaSem('▶ ' + T('Fazer agora', 'Do it now'), function () { w.guardado = true; Pref.gravar(pr); fechar(); RF.Rota.ir(passo.ir[0], passo.ir[1]); atualizarVisibilidade(); }),
      linhaSem('↷ ' + T('Pular este', 'Skip this one'), function () { w.pulados.push(passo.id); Pref.gravar(pr); desenharWizard(); })
    ]));
    balao.appendChild(el('div', { class: 'rf-assist-pe' }, [ui.botao(T('Continuar depois', 'Continue later'), function () { w.guardado = true; Pref.gravar(pr); fechar(); atualizarVisibilidade(); }, 'link')]));
  }
  function reiniciar() {
    var pr = Pref.ler(); pr.wizard = { pulados: [], concluido: false, guardado: false }; pr.dicas = {}; pr.boasVindas = false; pr.tour = false; pr.ligado = true;
    Pref.gravar(pr); atualizarVisibilidade();
  }

  /* ------------------------------------------------------------------
     TOUR: destaca ☰ 🔍 📥 ⚙️ 🏠, ações rápidas, barra de baixo e ele mesmo
     ------------------------------------------------------------------ */
  function tour() {
    var passos = [
      { sel: '#rf-bt-menu', t: N('☰ Menu: todas as funções, em grupos, com ações rápidas no topo.', '☰ Menu: every feature, in groups, with quick actions at the top.') },
      { sel: '#rf-bt-busca', t: N('🔍 Busca (Ctrl+K): tela, função, pessoa, chamado, e-mail.', '🔍 Search (Ctrl+K): screen, feature, person, ticket, e-mail.') },
      { sel: '#rf-bt-inbox', t: N('📥 Caixa de entrada: tudo o que pede atenção, com a cor da prioridade mais alta.', '📥 Inbox: everything that needs attention, with the colour of the highest priority.') },
      { sel: '#rf-bt-config', t: N('⚙️ Configurações: idioma, aparência, segurança, barra e cópia de segurança.', '⚙️ Settings: language, appearance, security, bar and backup.') },
      { sel: '#rf-bt-inicio', t: N('🏠 Início: sempre no mesmo lugar, em todas as telas.', '🏠 Home: always in the same place, on every screen.') },
      { sel: '#rf-bt-pessoa', t: N('👤 Sua conta: bloquear, sair, sua segurança e "ver como".', '👤 Your account: lock, sign out, your security and "view as".') },
      { sel: '#rf-barra-baixo', t: N('⭐ Barra de atalhos: até 5 telas que você escolhe nas Configurações.', '⭐ Shortcut bar: up to 5 screens you choose in Settings.') },
      { sel: '#rf-assist', t: N('✨ E eu fico aqui, em todas as telas. Toque para ajuda da tela, busca e passo a passo.', '✨ And I stay here, on every screen. Tap for screen help, search and the walkthrough.') }
    ].filter(function (p) { var n = d.querySelector(p.sel); return n && !n.hidden && n.offsetParent !== null; });
    var i = 0, marca = el('div', { class: 'rf-tour-marca', 'aria-hidden': 'true' }), caixa = el('div', { class: 'rf-tour', role: 'dialog', 'aria-label': T('Tour rápido', 'Quick tour') });
    d.body.appendChild(marca); d.body.appendChild(caixa);
    function sair() { marca.remove(); caixa.remove(); var pr = Pref.ler(); pr.tour = true; Pref.gravar(pr); raiz.removeEventListener('resize', pos); }
    function pos() {
      var n = d.querySelector(passos[i].sel); if (!n) return;
      var r = n.getBoundingClientRect();
      marca.style.cssText = 'left:' + (r.left - 6) + 'px;top:' + (r.top - 6) + 'px;width:' + (r.width + 12) + 'px;height:' + (r.height + 12) + 'px';
      var alto = r.top > raiz.innerHeight / 2;
      caixa.style.top = alto ? '' : (r.bottom + 12) + 'px'; caixa.style.bottom = alto ? (raiz.innerHeight - r.top + 12) + 'px' : '';
    }
    function mostrar() {
      U.limpar(caixa);
      caixa.appendChild(el('p', { texto: T(passos[i].t) }));
      caixa.appendChild(el('div', { class: 'rf-acoes' }, [
        el('span', { class: 'rf-dica', texto: (i + 1) + '/' + passos.length }),
        ui.botao(T('Sair', 'Exit'), sair, 'link'),
        ui.botao(i < passos.length - 1 ? T('Próximo', 'Next') + ' ›' : T('Terminar', 'Finish'), function () { if (i < passos.length - 1) { i++; mostrar(); } else sair(); }, 'pri')
      ]));
      pos();
      var b = caixa.querySelector('.rf-b-pri'); if (b) b.focus();
    }
    raiz.addEventListener('resize', pos);
    caixa.addEventListener('keydown', function (e) { if (e.key === 'Escape') sair(); });
    mostrar();
  }

  /* ------------------------------------------------------------------
     DICAS POR TELA (uma vez só, alguns segundos depois de entrar)
     ------------------------------------------------------------------ */
  var dicaTimer;
  function agendarDica(modulo) {
    clearTimeout(dicaTimer); esconderDica();
    var pr = Pref.ler(), m = MAPA[modulo];
    if (!ligado() || !m || !m.dica || pr.dicas[modulo] || !pr.boasVindas || (pr.wizard && pr.wizard.guardado && !pr.wizard.concluido && false)) return;
    dicaTimer = setTimeout(function () {
      if (!S.pessoa || escondido.acesso || abertoAgora || ui.modaisAbertos() || escondido.menu || telaAtual.modulo !== modulo) return;
      dica = el('div', { class: 'rf-assist-dica', role: 'status' }, [
        el('span', { texto: '💡 ' + T(m.dica) }),
        el('div', { class: 'rf-acoes' }, [ui.botao(T('Entendi', 'Got it'), function () { esconderDica(); }, 'p'), ui.botao(T('Mais ajuda', 'More help'), function () { esconderDica(); abrir(); }, 'link')])
      ]);
      d.body.appendChild(dica);
      pr = Pref.ler(); pr.dicas[modulo] = true; Pref.gravar(pr);
      setTimeout(esconderDica, 12000);
    }, 2500);
  }
  function esconderDica() { clearTimeout(dicaTimer); if (dica) { dica.remove(); dica = null; } }

  /* ------------------------------------------------------------------
     CARTÃO DAS CONFIGURAÇÕES (⚙️ → Geral)
     ------------------------------------------------------------------ */
  function cartaoConfig() {
    var pr = Pref.ler();
    var chave = el('button', { type: 'button', class: 'rf-assist-chave' + (pr.ligado !== false ? ' rf-on' : ''), role: 'switch', 'aria-checked': pr.ligado !== false ? 'true' : 'false' }, [
      el('span', { class: 'rf-assist-chave-txt', texto: pr.ligado !== false ? T('ASSIST ONE ATIVADO', 'ASSIST ONE ON') : T('ASSIST ONE DESATIVADO', 'ASSIST ONE OFF') }),
      el('span', { class: 'rf-assist-chave-bola', 'aria-hidden': 'true' })
    ]);
    chave.onclick = function () {
      var p = Pref.ler(); p.ligado = !(p.ligado !== false); Pref.gravar(p); atualizarVisibilidade();
      RF.Log.registrar('configuracoes', 'assistone', '', !p.ligado, p.ligado, 'AssistONE ' + (p.ligado ? T('ligado', 'on') : T('desligado', 'off')));
      RF.renderizar();
    };
    return el('section', { class: 'rf-secao rf-assist-cartao' }, [
      el('div', { class: 'rf-assist-cartao-cab' }, [el('img', { src: 'ajuda-icone.png', alt: '', width: 64, height: 64 }),
        el('div', {}, [el('h2', { texto: 'AssistONE' }), el('p', { class: 'rf-dica', texto: T('Ajuda da tela, busca, tour e passo a passo. Fica no canto de baixo, em todas as telas, sem cobrir nada.', 'Screen help, search, tour and walkthrough. Sits in the bottom corner on every screen without covering anything.') })])]),
      chave,
      el('div', { class: 'rf-acoes' }, [
        ui.botao('✨ ' + T('Abrir o AssistONE', 'Open AssistONE'), function () { abrir('forcar'); }),
        ui.botao('↺ ' + T('Recomeçar o passo a passo e as dicas', 'Restart the walkthrough and tips'), function () { reiniciar(); ui.aviso(T('Pronto: o passo a passo e as dicas vão aparecer de novo.', 'Done: the walkthrough and tips will show again.')); RF.renderizar(); })
      ])
    ]);
  }

  /* ------------------------------------------------------------------
     LIGAÇÃO COM A CASCA
     ------------------------------------------------------------------ */
  RF.on('entrou', function () { montar(); escondido.acesso = false; atualizarVisibilidade(); });
  RF.on('acesso', function (naTelaDeAcesso) { escondido.acesso = !!naTelaDeAcesso; atualizarVisibilidade(); });
  RF.on('bloqueado', function () { escondido.acesso = true; esconderDica(); atualizarVisibilidade(); });
  RF.on('saiu', function () { escondido.acesso = true; esconderDica(); atualizarVisibilidade(); });
  RF.on('modal', function (n) { escondido.modal = n > 0; atualizarVisibilidade(); });
  RF.on('menu', function (aberto) { escondido.menu = !!aberto && raiz.innerWidth < 1100; atualizarVisibilidade(); });
  RF.on('tela', function (t) {
    telaAtual = t; if (abertoAgora) fechar();
    atualizarVisibilidade();
    agendarDica(t.modulo);
  });

  RF.Assist = {
    abrir: function (modo) { abrir(modo || 'forcar'); },
    fechar: fechar,
    ligado: ligado,
    reiniciar: reiniciar,
    tour: tour,
    cartaoConfig: cartaoConfig,
    ajudaDaTela: function (m) { RF.ajudaDaTela(m); },
    MAPA: MAPA,
    passos: PASSOS
  };
})(window);
