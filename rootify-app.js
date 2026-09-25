/* =====================================================================
   RootifyONE — CASCA DO APP
   ---------------------------------------------------------------------
   Telas de acesso (instalação, entrar, bloqueio, código de recuperação),
   topo, menu ☰, barra de baixo, busca, simulador de papel e o
   "roteador" que chama a tela certa de RF.telas.
   ===================================================================== */
(function (raiz) {
  'use strict';
  var RF = raiz.RF, U = RF.util, T = U.T, el = U.el, ui = RF.ui, C = RF.Cofre, S = RF.Sessao;
  var d = document;
  RF.telas = RF.telas || {};

  var acesso, casca, main, menu, topoTitulo, barraBaixo, faixaSim;

  /* ------------------------------------------------------------------
     ACESSO
     ------------------------------------------------------------------ */
  function telaAcesso(conteudo) {
    casca.hidden = true;
    acesso.hidden = false;
    U.limpar(acesso);
    acesso.appendChild(el('div', { class: 'rf-acesso-caixa' }, [
      el('div', { class: 'rf-marca-grande' }, [el('span', { class: 'rf-logo', 'aria-hidden': 'true', texto: '🌳' }),
        el('div', {}, [el('h1', { texto: 'RootifyONE' }), el('p', { texto: T('Administração central da SolverONE', 'SolverONE central administration') })])]),
      conteudo
    ]));
    var f = acesso.querySelector('[autofocus]') || acesso.querySelector('input');
    if (f) setTimeout(function () { f.focus(); }, 50);
  }
  function erroTexto(e) {
    var m = String(e && e.message || e);
    var M = {
      'sem-conta': T('Não achei essa conta neste aparelho.', 'Account not found on this device.'),
      'errado': T('Não confere. Tente de novo.', 'That does not match. Try again.'),
      'desativada': T('Esta conta foi desativada pelo dono.', 'This account was disabled by the owner.'),
      'pin-travado': T('PIN travado depois de 5 erros. Entre com a senha.', 'PIN locked after 5 errors. Sign in with the password.'),
      'sem-metodo': T('Este jeito de entrar não está configurado.', 'This sign-in method is not set up.'),
      'sem-chave-aparelho': T('A digital foi registrada em outro navegador. Entre com senha ou PIN.', 'The fingerprint was registered in another browser. Use password or PIN.'),
      'NotAllowedError': T('A digital foi cancelada ou demorou demais.', 'Fingerprint was cancelled or took too long.')
    };
    return M[m] || M[e && e.name] || T('Algo deu errado: ', 'Something went wrong: ') + m;
  }

  function telaInstalar() {
    var nome = ui.entrada('', { attrs: { autocomplete: 'name', autofocus: true } });
    var apelido = ui.entrada('', { attrs: { autocomplete: 'username' } });
    var email = ui.entrada('', { tipo: 'email', attrs: { autocomplete: 'email' } });
    var senha = ui.entrada('', { tipo: 'password', attrs: { autocomplete: 'new-password' } });
    var senha2 = ui.entrada('', { tipo: 'password', attrs: { autocomplete: 'new-password' } });
    var ciente = ui.marca(T('Entendi: os dados ficam cifrados neste aparelho. Sem a senha e sem o código de recuperação, ninguém abre — nem eu.',
      'I understand: data is encrypted on this device. Without the password and the recovery code, nobody can open it — not even me.'), false);
    var bt = ui.botao(T('Criar a conta do dono e entrar', 'Create the owner account and sign in'), null, 'pri');
    var form = el('form', { class: 'rf-form', novalidate: true }, [
      el('h2', { texto: T('Primeira vez neste aparelho', 'First time on this device') }),
      el('p', { class: 'rf-dica', texto: T('Você será o dono (super admin). Depois dá para cadastrar a equipe com outros papéis.',
        'You will be the owner (super admin). You can add the team with other roles later.') }),
      ui.campo(T('Seu nome', 'Your name'), nome), ui.campo(T('Apelido (para entrar)', 'Nickname (to sign in)'), apelido),
      ui.campo(T('E-mail', 'E-mail'), email),
      ui.campo(T('Senha (mínimo 8 caracteres)', 'Password (at least 8 characters)'), senha),
      ui.campo(T('Repita a senha', 'Repeat the password'), senha2), ciente, bt
    ]);
    form.onsubmit = function (e) { e.preventDefault(); bt.click(); };
    bt.type = 'submit';
    bt.onclick = function (e) {
      e.preventDefault();
      if (!nome.value.trim() || apelido.value.trim().length < 3) return ui.aviso(T('Preencha nome e um apelido de 3 letras ou mais.', 'Fill in name and a nickname of 3+ letters.'), 'erro');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value.trim())) return ui.aviso(T('E-mail inválido.', 'Invalid e-mail.'), 'erro');
      if (senha.value.length < 8) return ui.aviso(T('A senha precisa de 8 caracteres ou mais.', 'The password needs 8+ characters.'), 'erro');
      if (senha.value !== senha2.value) return ui.aviso(T('As senhas não são iguais.', 'Passwords do not match.'), 'erro');
      if (!ciente.querySelector('input').checked) return ui.aviso(T('Marque que entendeu como a proteção funciona.', 'Tick that you understand how protection works.'), 'erro');
      bt.disabled = true; bt.textContent = T('Criando o cofre…', 'Creating the vault…');
      RF.instalar({ nome: nome.value.trim(), apelido: apelido.value.trim(), email: email.value.trim(), senha: senha.value })
        .then(function (r) { telaCodigo(r.codigo, function () { telaSeguranca(r.pessoa); }); })
        .catch(function (e2) { bt.disabled = false; bt.textContent = T('Tentar de novo', 'Try again'); ui.aviso(erroTexto(e2), 'erro'); });
    };
    telaAcesso(form);
  }

  function telaCodigo(codigo, depois) {
    var guardei = ui.marca(T('Guardei o código num lugar seguro (fora deste aparelho).', 'I saved the code somewhere safe (off this device).'), false);
    var seguir = ui.botao(T('Continuar', 'Continue'), function () {
      if (!guardei.querySelector('input').checked) return ui.aviso(T('Guarde o código antes de continuar.', 'Save the code before continuing.'), 'erro');
      depois();
    }, 'pri');
    telaAcesso(el('div', { class: 'rf-form' }, [
      el('h2', { texto: T('Seu código de recuperação', 'Your recovery code') }),
      el('p', { texto: T('Ele abre o cofre se você esquecer a senha. Aparece só agora.', 'It opens the vault if you forget the password. It is shown only now.') }),
      el('div', { class: 'rf-codigo', texto: codigo, 'aria-label': T('Código de recuperação', 'Recovery code') }),
      el('div', { class: 'rf-acoes' }, [
        ui.botao(T('Copiar', 'Copy'), function () { U.copiar(codigo).then(function () { ui.aviso(T('Copiado.', 'Copied.')); }); }),
        ui.botao(T('Baixar em arquivo', 'Download as file'), function () {
          U.baixar('RootifyONE-codigo-de-recuperacao.txt', 'RootifyONE — ' + T('código de recuperação', 'recovery code') + '\n' + codigo + '\n' + U.data(U.agora(), true) + '\n', 'text/plain');
        })
      ]),
      guardei, seguir
    ]));
  }

  /* depois de entrar pela primeira vez: PIN e digital */
  function telaSeguranca(pessoa) {
    var pin = ui.entrada('', { tipo: 'password', attrs: { inputmode: 'numeric', autocomplete: 'off', maxlength: 8, pattern: '[0-9]*' } });
    var btPin = ui.botao(T('Salvar PIN', 'Save PIN'), function () {
      if (!/^\d{4,8}$/.test(pin.value)) return ui.aviso(T('O PIN tem de 4 a 8 números.', 'The PIN has 4 to 8 digits.'), 'erro');
      btPin.disabled = true;
      RF.definirPin(pessoa, pin.value).then(function () {
        RF.Log.registrar('seguranca', 'pin', pessoa.email, null, null, T('PIN definido', 'PIN set'));
        ui.aviso(T('PIN salvo.', 'PIN saved.')); pin.value = ''; btPin.textContent = T('PIN salvo ✓', 'PIN saved ✓');
      });
    });
    var btDig = ui.botao(T('Usar a digital (ou rosto)', 'Use fingerprint (or face)'), null, 'pri');
    var aviso = el('p', { class: 'rf-dica' });
    RF.Digital.disponivel().then(function (ok) {
      if (!ok) { btDig.disabled = true; aviso.textContent = T('Este aparelho ou navegador não oferece digital. Use o PIN.', 'This device or browser offers no fingerprint. Use the PIN.'); }
    });
    btDig.onclick = function () {
      RF.Digital.registrar(C.pessoa(pessoa.id)).then(function () {
        RF.Log.registrar('seguranca', 'digital', pessoa.email, null, null, T('Digital registrada neste aparelho', 'Fingerprint registered on this device'));
        btDig.textContent = T('Digital registrada ✓', 'Fingerprint registered ✓'); btDig.disabled = true;
      }).catch(function (e) { ui.aviso(erroTexto(e), 'erro'); });
    };
    telaAcesso(el('div', { class: 'rf-form' }, [
      el('h2', { texto: T('Entrar mais rápido', 'Faster sign-in') }),
      el('p', { texto: T('Com a digital, você entra sem digitar nada. O PIN serve quando a digital não estiver disponível. A senha continua valendo sempre.',
        'With your fingerprint you sign in without typing. The PIN is for when the fingerprint is unavailable. The password always works.') }),
      btDig, aviso,
      ui.campo(T('PIN (4 a 8 números)', 'PIN (4 to 8 digits)'), pin), btPin,
      ui.botao(T('Continuar para o RootifyONE', 'Continue to RootifyONE'), function () { abrirCasca(); }, 'pri')
    ]));
  }

  function telaEntrar(mensagem) {
    var ultima = U.lerLocal('ultima', '');
    var equipe = C.equipe().filter(function (p) { return p.ativo; });
    var pessoa = C.pessoa(ultima) || (equipe.length === 1 ? equipe[0] : null);
    var ident = ui.entrada(pessoa ? pessoa.email : '', { tipo: 'text', attrs: { autocomplete: 'username', autofocus: !pessoa } });
    var senha = ui.entrada('', { tipo: 'password', attrs: { autocomplete: 'current-password' } });
    var pin = ui.entrada('', { tipo: 'password', attrs: { inputmode: 'numeric', autocomplete: 'off', maxlength: 8, autofocus: !!(pessoa && pessoa.cred.pin && !pessoa.cred.webauthn) } });
    var corpo = el('div', { class: 'rf-form' });
    if (mensagem) corpo.appendChild(el('p', { class: 'rf-aviso-fixo', role: 'status', texto: mensagem }));

    function feito(p) {
      var atual = C.pessoa(p.id || p.email);
      if (atual && atual.trocarSenha) return telaTrocarObrigatoria(atual);
      if (atual && !atual.cred.pin && !atual.cred.webauthn && !U.lerLocal('pulouSeguranca:' + atual.id, false)) {
        U.gravarLocal('pulouSeguranca:' + atual.id, true);
        return telaSeguranca(atual);
      }
      abrirCasca();
    }
    function tentar(metodo, valor, bt) {
      var quem = pessoa ? pessoa.email : ident.value.trim();
      if (!quem) return ui.aviso(T('Informe e-mail ou apelido.', 'Enter e-mail or nickname.'), 'erro');
      if (bt) { bt.disabled = true; }
      RF.entrar(quem, valor, metodo).then(feito).catch(function (e) {
        if (bt) bt.disabled = false;
        ui.aviso(erroTexto(e), 'erro');
        if (metodo === 'pin') { pin.value = ''; pin.focus(); }
      });
    }

    if (pessoa) {
      corpo.appendChild(el('p', { class: 'rf-quem' }, [T('Entrando como ', 'Signing in as '), el('strong', { texto: pessoa.nome + ' (' + pessoa.apelido + ')' })]));
      if (pessoa.cred.webauthn) {
        var btD = ui.botao('👆 ' + T('Entrar com a digital', 'Sign in with fingerprint'), function () {
          btD.disabled = true;
          RF.Digital.entrar(pessoa).then(function () { feito(pessoa); }).catch(function (e) { btD.disabled = false; ui.aviso(erroTexto(e), 'erro'); });
        }, 'pri', { autofocus: true });
        corpo.appendChild(btD);
      }
      if (pessoa.cred.pin) {
        var btP = ui.botao(T('Entrar com PIN', 'Sign in with PIN'), function () { tentar('pin', pin.value, btP); }, pessoa.cred.webauthn ? '' : 'pri');
        pin.addEventListener('keydown', function (e) { if (e.key === 'Enter') btP.click(); });
        corpo.appendChild(el('div', { class: 'rf-linha' }, [ui.campo('PIN', pin), btP]));
      }
    } else {
      corpo.appendChild(ui.campo(T('E-mail ou apelido', 'E-mail or nickname'), ident));
    }
    var blocoSenha = el('div', { class: 'rf-linha' }, [ui.campo(T('Senha', 'Password'), senha)]);
    var btS = ui.botao(T('Entrar com senha', 'Sign in with password'), function () { tentar('senha', senha.value, btS); },
      pessoa && (pessoa.cred.webauthn || pessoa.cred.pin) ? '' : 'pri');
    blocoSenha.appendChild(btS);
    senha.addEventListener('keydown', function (e) { if (e.key === 'Enter') btS.click(); });
    if (pessoa && (pessoa.cred.webauthn || pessoa.cred.pin)) {
      var det = el('details', { class: 'rf-det' }, [el('summary', { texto: T('Entrar com a senha', 'Use the password') }), blocoSenha]);
      corpo.appendChild(det);
    } else corpo.appendChild(blocoSenha);

    var rodape = el('div', { class: 'rf-acoes rf-acoes-fim' }, [
      ui.botao(T('Esqueci a senha', 'I forgot my password'), function () { telaRecuperar(pessoa ? pessoa.email : ident.value.trim()); }, 'link'),
      (equipe.length > 1 || !pessoa) && pessoa ? ui.botao(T('Trocar de conta', 'Switch account'), function () { U.apagarLocal('ultima'); telaEntrar(); }, 'link') : null
    ]);
    corpo.appendChild(rodape);
    telaAcesso(corpo);
  }

  function telaRecuperar(email) {
    var ident = ui.entrada(email || '', { attrs: { autocomplete: 'username', autofocus: !email } });
    var codigo = ui.entrada('', { attrs: { autocomplete: 'off', autofocus: !!email, placeholder: 'XXXX-XXXX-XXXX-XXXX' } });
    var nova = ui.entrada('', { tipo: 'password', attrs: { autocomplete: 'new-password' } });
    var bt = ui.botao(T('Trocar a senha', 'Change password'), function () {
      if (nova.value.length < 8) return ui.aviso(T('A nova senha precisa de 8 caracteres ou mais.', 'The new password needs 8+ characters.'), 'erro');
      bt.disabled = true;
      RF.entrar(ident.value.trim(), codigo.value, 'codigo').then(function (p) {
        return RF.trocarSenha(p, nova.value).then(function () { return RF.novoCodigo(p); }).then(function (novo) {
          RF.Log.registrar('seguranca', 'recuperar', p.email, null, null, T('Senha trocada pelo código de recuperação; código novo gerado', 'Password changed via recovery code; new code generated'));
          telaCodigo(novo, abrirCasca);
        });
      }).catch(function (e) { bt.disabled = false; ui.aviso(erroTexto(e), 'erro'); });
    }, 'pri');
    telaAcesso(el('div', { class: 'rf-form' }, [
      el('h2', { texto: T('Recuperar o acesso', 'Recover access') }),
      el('p', { class: 'rf-dica', texto: T('Use o código de recuperação que você guardou. Ele vai ser trocado por um novo.', 'Use the recovery code you saved. It will be replaced by a new one.') }),
      ui.campo(T('E-mail ou apelido', 'E-mail or nickname'), ident), ui.campo(T('Código de recuperação', 'Recovery code'), codigo),
      ui.campo(T('Nova senha', 'New password'), nova), bt,
      ui.botao(T('Voltar', 'Back'), function () { telaEntrar(); }, 'link')
    ]));
  }

  function telaTrocarObrigatoria(pessoa) {
    var nova = ui.entrada('', { tipo: 'password', attrs: { autocomplete: 'new-password', autofocus: true } });
    var nova2 = ui.entrada('', { tipo: 'password', attrs: { autocomplete: 'new-password' } });
    var bt = ui.botao(T('Salvar e entrar', 'Save and sign in'), function () {
      if (nova.value.length < 8 || nova.value !== nova2.value) return ui.aviso(T('Senhas iguais, com 8 caracteres ou mais.', 'Matching passwords, 8+ characters.'), 'erro');
      RF.trocarSenha(pessoa, nova.value).then(function () { return RF.novoCodigo(pessoa); }).then(function (cod) {
        RF.Log.registrar('seguranca', 'senha', pessoa.email, null, null, T('Senha provisória trocada no primeiro acesso', 'Temporary password changed at first access'));
        telaCodigo(cod, function () { telaSeguranca(C.pessoa(pessoa.id)); });
      });
    }, 'pri');
    telaAcesso(el('div', { class: 'rf-form' }, [
      el('h2', { texto: T('Crie a sua senha', 'Create your password') }),
      el('p', { texto: T('Você entrou com uma senha provisória. Escolha a sua agora.', 'You signed in with a temporary password. Choose your own now.') }),
      ui.campo(T('Nova senha', 'New password'), nova), ui.campo(T('Repita', 'Repeat'), nova2), bt
    ]));
  }

  /* ------------------------------------------------------------------
     CASCA: topo, menu, barra de baixo
     ------------------------------------------------------------------ */
  function abrirCasca() {
    acesso.hidden = true; U.limpar(acesso);
    casca.hidden = false;
    RF.dados.Automacoes.vigiar();
    montarMenu(); montarBarraBaixo(); desenharFaixaSim();
    /* sem rota no endereço: troca no lugar (sem criar entrada extra no histórico) */
    if (!raiz.location.hash) { try { raiz.history.replaceState(raiz.history.state, '', '#/painel'); } catch (e) { raiz.location.hash = '#/painel'; } }
    renderizar();
    prepararGuardaVoltar();
  }

  /* Voltar do celular na primeira tela: em vez de sair do RootifyONE sem aviso,
     avisa "toque de novo para sair". A entrada extra no histórico só é criada
     depois de um toque da pessoa (o Chrome ignora entradas criadas sem toque). */
  var guarda = { pronta: false, armada: false };
  function prepararGuardaVoltar() {
    if (guarda.pronta) return;
    guarda.pronta = true;
    try { raiz.history.replaceState({ rfInicio: 1 }, ''); } catch (e) {}
    d.addEventListener('pointerdown', armarGuarda, true);
    d.addEventListener('keydown', armarGuarda, true);
    raiz.addEventListener('popstate', function (e) {
      if (!e.state || !e.state.rfInicio || !S.pessoa) return;
      if (ui.modaisAbertos() || d.body.classList.contains('rf-menu-aberto')) return;
      guarda.armada = false;           /* o próximo Voltar sai de verdade */
      ui.aviso(T('Toque em Voltar de novo para sair do RootifyONE.', 'Press Back again to leave RootifyONE.'), 'info');
    });
  }
  function armarGuarda() {
    if (guarda.armada || !S.pessoa) return;
    var st = raiz.history.state;
    if (!st || !st.rfInicio) { guarda.armada = true; return; }   /* já há telas para voltar */
    guarda.armada = true;
    try { raiz.history.pushState({ rfGuarda: 1 }, ''); } catch (e) {}
  }

  function modulosVisiveis() {
    return RF.cat.MODULOS.filter(function (m) { return RF.pode(m.recurso + ':ver'); });
  }
  function contagem(id) {
    if (!C.aberto()) return 0;
    if (id === 'suporte') return RF.dados.Chamados.abertos().filter(function (c) { return RF.noEscopo(c.app); }).length;
    if (id === 'privacidade') return RF.dados.Privacidade.abertos().length;
    if (id === 'termos') return RF.dados.Termos.pendentesAprovacao().length;
    return 0;
  }
  function montarMenu() {
    U.limpar(menu);
    var rota = RF.Rota.atual();
    var lista = el('div', { class: 'rf-menu-rola' });
    RF.cat.GRUPOS.forEach(function (g) {
      var itens = modulosVisiveis().filter(function (m) { return m.grupo === g.id; });
      if (!itens.length) return;
      lista.appendChild(el('p', { class: 'rf-menu-grupo', texto: T(g.nome) }));
      itens.forEach(function (m) {
        var n = contagem(m.id);
        var a = el('a', { href: '#/' + m.id, class: 'rf-menu-item' + (rota.modulo === m.id ? ' rf-ativo' : ''),
          'aria-current': rota.modulo === m.id ? 'page' : null }, [
          el('span', { class: 'rf-ic', 'aria-hidden': 'true', texto: m.icone }), el('span', { class: 'rf-menu-nome', texto: T(m.nome) }),
          n ? el('span', { class: 'rf-conta', texto: String(n), 'aria-label': n + T(' pendentes', ' pending') }) : null,
          m.estado !== 'ativo' ? el('span', { class: 'rf-ponto rf-ponto-' + m.estado, title: m.estado === 'futuro' ? T('futuro', 'future') : T('parcial', 'partial') }) : null
        ]);
        a.onclick = function (e) {
          if (raiz.innerWidth >= 1100) return;            /* menu fixo ao lado: o link segue normal */
          e.preventDefault();
          fecharMenuEIr(m.id);
        };
        lista.appendChild(a);
      });
    });
    menu.appendChild(lista);
    menu.appendChild(el('div', { class: 'rf-menu-pe' }, [
      el('a', { href: 'https://marceloneco.github.io/', target: '_blank', rel: 'noopener', class: 'rf-menu-item' },
        [el('span', { class: 'rf-ic', 'aria-hidden': 'true', texto: '🧭' }), el('span', { texto: T('Portal de Projetos ↗', 'Projects Portal ↗') })]),
      el('p', { class: 'rf-dica', texto: 'RootifyONE ' + RF.VERSAO })
    ]));
    /* menu mais comprido que a tela: dica de que há mais para baixo */
    setTimeout(function () { lista.classList.toggle('rf-tem-mais', lista.scrollHeight > lista.clientHeight + 4); }, 0);
    lista.addEventListener('scroll', function () {
      lista.classList.toggle('rf-tem-mais', lista.scrollTop + lista.clientHeight < lista.scrollHeight - 4);
    });
  }
  function abrirMenu() {
    d.body.classList.add('rf-menu-aberto');
    d.getElementById('rf-bt-menu').setAttribute('aria-expanded', 'true');
    if (raiz.innerWidth < 1100) {
      try { raiz.history.pushState({ rfMenu: 1 }, ''); } catch (e) {}
      var primeiro = menu.querySelector('a'); if (primeiro) primeiro.focus();
    }
  }
  function fecharMenu(peloVoltar) {
    if (!d.body.classList.contains('rf-menu-aberto')) return;
    d.body.classList.remove('rf-menu-aberto');
    d.getElementById('rf-bt-menu').setAttribute('aria-expanded', 'false');
    if (!peloVoltar && raiz.innerWidth < 1100 && raiz.history.state && raiz.history.state.rfMenu) { ui._ignorarPop = true; raiz.history.back(); }
  }
  raiz.addEventListener('popstate', function () {
    if (d.body.classList.contains('rf-menu-aberto') && raiz.innerWidth < 1100) fecharMenu(true);
  });
  /* Fechar a gaveta e só então trocar de tela. Antes, o "voltar" que tira
     a gaveta do histórico chegava depois da troca e desfazia a tela nova
     (acontecia com a janela estreita, ex.: painel lateral do Chrome aberto). */
  function fecharMenuEIr(modulo) {
    var tinhaEntrada = raiz.history.state && raiz.history.state.rfMenu;
    fecharMenu(true);
    if (tinhaEntrada) ui.voltarEDepois(1, function () { RF.Rota.ir(modulo); });
    else RF.Rota.ir(modulo);
  }

  function favoritos() {
    var cfg = C.aberto() ? C.obj('config') : {};
    var f = (cfg.favoritos && cfg.favoritos.length) ? cfg.favoritos : ['painel', 'usuarios', 'suporte', 'publicar'];
    return f.filter(function (id) { var m = RF.cat.modulo(id); return m && RF.pode(m.recurso + ':ver'); }).slice(0, 5);
  }
  function montarBarraBaixo() {
    U.limpar(barraBaixo);
    var rota = RF.Rota.atual();
    favoritos().forEach(function (id) {
      var m = RF.cat.modulo(id), n = contagem(id);
      barraBaixo.appendChild(el('a', { href: '#/' + id, class: 'rf-bb-item' + (rota.modulo === id ? ' rf-ativo' : ''), 'aria-current': rota.modulo === id ? 'page' : null }, [
        el('span', { class: 'rf-ic', 'aria-hidden': 'true', texto: m.icone }), el('span', { class: 'rf-bb-nome', texto: T(m.nome).split(' (')[0] }),
        n ? el('span', { class: 'rf-conta', texto: String(n) }) : null
      ]));
    });
  }

  function desenharFaixaSim() {
    U.limpar(faixaSim);
    faixaSim.hidden = !(S.simular && S.simular.papel);
    if (faixaSim.hidden) return;
    var p = RF.Papeis.achar(S.simular.papel);
    faixaSim.appendChild(el('span', {}, ['🎭 ', T('Modo de teste — vendo como ', 'Test mode — viewing as '), el('strong', { texto: p ? T(p.nome) : S.simular.papel }),
      S.simular.apps && S.simular.apps[0] !== '*' ? ' · ' + S.simular.apps.join(', ') : '']));
    faixaSim.appendChild(ui.botao(T('Voltar ao meu papel', 'Back to my role'), function () { simularPapel(null); }, 'p'));
  }
  function simularPapel(papel, apps) {
    var antes = S.simular;
    S.simular = papel ? { papel: papel, apps: apps && apps.length ? apps : ['*'] } : null;
    RF.Log.registrar('papeis', 'simular', papel || '', antes, S.simular, papel ? T('Passou a ver como ', 'Started viewing as ') + papel : T('Voltou ao próprio papel', 'Back to own role'));
    desenharFaixaSim(); montarMenu(); montarBarraBaixo();
    if (!RF.pode((RF.cat.modulo(RF.Rota.atual().modulo) || { recurso: 'painel' }).recurso + ':ver')) RF.Rota.ir('painel');
    else renderizar();
  }
  RF.simularPapel = simularPapel;
  RF.abrirSimulador = function () { abrirSimulador(); };

  /* menu da pessoa (canto direito) */
  function menuPessoa() {
    var p = S.pessoa, papel = RF.Papeis.achar(p.papel);
    var corpo = el('div', { class: 'rf-lista-acoes' }, [
      el('p', {}, [el('strong', { texto: p.nome }), el('br'), el('span', { class: 'rf-dica', texto: p.email })]),
      el('p', {}, [T('Papel: ', 'Role: '), ui.selo(papel ? T(papel.nome) : p.papel, 'neutro')]),
      ui.botao('🔒 ' + T('Bloquear agora', 'Lock now'), function () { ui.fecharModal(); setTimeout(S.bloquear, 50); }),
      ui.botao('⚙ ' + T('Minha segurança (PIN, digital, senha)', 'My security (PIN, fingerprint, password)'), function () { ui.fecharEIr('configuracoes', 'seguranca'); }),
      RF.ehDono() ? ui.botao('🎭 ' + T('Ver como outro papel (teste)', 'View as another role (test)'), function () { ui.fecharModal(); setTimeout(abrirSimulador, 50); }) : null,
      ui.botao('↩ ' + T('Sair', 'Sign out'), function () { ui.fecharModal(); setTimeout(S.sair, 50); }, 'perigo')
    ]);
    ui.modal(T('Sua conta', 'Your account'), corpo);
  }
  function abrirSimulador() {
    var papel = ui.escolha(RF.Papeis.todos().filter(function (p) { return p.id !== 'super-admin'; }).map(function (p) { return [p.id, T(p.nome)]; }), 'suporte-n1');
    var apps = el('div', { class: 'rf-marcas' });
    C.lista('apps').forEach(function (a) { apps.appendChild(ui.marca(T(a.nome), false, { value: a.id })); });
    var m = ui.modal(T('Ver o RootifyONE como outro papel', 'View RootifyONE as another role'), el('div', {}, [
      el('p', { class: 'rf-dica', texto: T('Serve para testar o que cada papel enxerga. Nada muda nas permissões reais; tudo fica no log.',
        'Used to test what each role sees. Real permissions do not change; everything is logged.') }),
      ui.campo(T('Papel', 'Role'), papel),
      el('fieldset', { class: 'rf-bilingue' }, [el('legend', { texto: T('Apps (para papéis por app; nenhum = todos)', 'Apps (for per-app roles; none = all)') }), apps])
    ]), { rodape: [ui.botao(T('Começar o teste', 'Start test'), function () {
      var sel = Array.prototype.filter.call(apps.querySelectorAll('input'), function (i) { return i.checked; }).map(function (i) { return i.value; });
      m.fechar(); setTimeout(function () { simularPapel(papel.value, sel); }, 60);
    }, 'pri')] });
  }

  /* ------------------------------------------------------------------
     BUSCA (lupa)
     ------------------------------------------------------------------ */
  function indiceBusca() {
    var itens = [];
    modulosVisiveis().forEach(function (m) {
      itens.push({ tipo: T('Tela', 'Screen'), titulo: T(m.nome), texto: T(m.ajuda), ir: [m.id], icone: m.icone, termos: [m.nome.pt, m.nome.en] });
    });
    RF.cat.FUNCOES.forEach(function (f) {
      var m = RF.cat.modulo(f.modulo);
      if (!m || !RF.pode(m.recurso + ':ver')) return;
      itens.push({ tipo: T('Função', 'Feature'), titulo: T(f.nome), texto: T(m.nome) + (f.estado !== 'ativo' ? ' · ' + (f.estado === 'especificar' ? T('a especificar', 'needs spec') : f.estado) : ''),
        ir: [f.modulo], icone: '·', termos: [f.nome.pt, f.nome.en] });
    });
    if (RF.pode('usuarios:ver')) C.lista('usuarios').forEach(function (u) {
      if (u.status === 'excluido') return;
      if (!u.apps.some(function (a) { return RF.noEscopo(a.app); }) && u.apps.length) return;
      var mostra = RF.pode('usuarios.pii:ver') ? u.email : U.mascararEmail(u.email);
      itens.push({ tipo: T('Usuário', 'User'), titulo: u.nome, texto: u.apelido + ' · ' + mostra, ir: ['usuarios', 'ficha', u.id], icone: '👤',
        termos: [u.nome, u.apelido].concat(RF.pode('usuarios.pii:ver') ? [u.email] : []) });
    });
    if (RF.pode('suporte:ver')) C.lista('chamados').forEach(function (c) {
      if (!RF.noEscopo(c.app)) return;
      itens.push({ tipo: T('Chamado', 'Ticket'), titulo: '#' + c.numero + ' ' + c.assunto, texto: T(RF.cat.STATUS_CHAMADO[c.status] || {}), ir: ['suporte', 'chamado', c.id], icone: '🎧',
        termos: ['#' + c.numero, String(c.numero), c.assunto] });
    });
    if (RF.pode('kb:ver')) C.lista('kb').forEach(function (k) {
      itens.push({ tipo: T('Artigo', 'Article'), titulo: T(k.titulo), texto: k.estado, ir: ['kb', 'artigo', k.id], icone: '📚', termos: [k.titulo.pt, k.titulo.en].concat(k.palavras || []) });
    });
    if (RF.pode('apps:ver')) C.lista('apps').forEach(function (a) {
      itens.push({ tipo: 'App', titulo: T(a.nome), texto: a.url || '', ir: ['apps', 'app', a.id], icone: a.glifo, termos: [a.nome.pt, a.id, a.repo] });
    });
    return itens;
  }
  function abrirBusca() {
    var campo = ui.entrada('', { tipo: 'search', attrs: { autofocus: true, 'aria-label': T('O que você procura?', 'What are you looking for?'), placeholder: T('Tela, função, pessoa, chamado #…', 'Screen, feature, person, ticket #…') } });
    var res = el('div', { class: 'rf-busca-res', 'aria-live': 'polite' });
    var indice = indiceBusca();
    function buscar() {
      U.limpar(res);
      var q = U.semAcento(campo.value.trim());
      if (q.length < 2) { res.appendChild(el('p', { class: 'rf-dica', texto: T('Digite pelo menos 2 letras.', 'Type at least 2 letters.') })); return; }
      var achados = indice.filter(function (it) {
        return it.termos.concat([it.titulo]).some(function (t) { return U.semAcento(t).indexOf(q) !== -1; });
      }).slice(0, 40);
      if (!achados.length) {
        var palavras = [];
        indice.forEach(function (it) { it.termos.forEach(function (t) { String(t || '').split(/\s+/).forEach(function (w) { if (w.length > 3) palavras.push(w); }); }); });
        var sug = palavras.map(function (w) { return { w: w, dist: U.distancia(w.slice(0, Math.max(q.length, 4)), q) }; })
          .filter(function (x) { return x.dist <= 2; }).sort(function (a, b) { return a.dist - b.dist; })
          .map(function (x) { return x.w.toLowerCase(); }).filter(function (w, i, a) { return a.indexOf(w) === i; }).slice(0, 6);
        res.appendChild(el('p', { texto: T('Nada encontrado para "', 'Nothing found for "') + campo.value + '".' }));
        if (sug.length) {
          res.appendChild(el('p', { class: 'rf-dica', texto: T('Você quis dizer:', 'Did you mean:') }));
          res.appendChild(el('div', { class: 'rf-chips' }, sug.map(function (s) {
            return ui.botao(s, function () { campo.value = s; buscar(); }, 'chip');
          })));
        }
        return;
      }
      achados.forEach(function (it) {
        var b = el('button', { type: 'button', class: 'rf-busca-item' }, [el('span', { class: 'rf-ic', 'aria-hidden': 'true', texto: it.icone }),
          el('span', {}, [el('strong', { texto: it.titulo }), el('small', { texto: it.tipo + (it.texto ? ' · ' + it.texto : '') })])]);
        b.onclick = function () { ui.fecharEIr(it.ir[0], it.ir[1], it.ir[2]); };
        res.appendChild(b);
      });
    }
    campo.addEventListener('input', buscar);
    ui.modal('🔍 ' + T('Buscar', 'Search'), el('div', {}, [campo, res]), { largo: true });
    buscar();
  }
  RF.abrirBusca = abrirBusca;

  /* ------------------------------------------------------------------
     ROTEADOR
     ------------------------------------------------------------------ */
  function renderizar() {
    if (!S.pessoa || !C.aberto()) return;
    var rota = RF.Rota.atual();
    var mod = RF.cat.modulo(rota.modulo) || RF.cat.modulo('painel');
    montarMenu(); montarBarraBaixo();
    topoTitulo.textContent = T(mod.nome);
    d.title = T(mod.nome) + ' · RootifyONE';
    U.limpar(main);
    if (!RF.pode(mod.recurso + ':ver')) {
      main.appendChild(el('div', { class: 'rf-vazio' }, [el('h1', { texto: '🔒 ' + T('Sem acesso', 'No access') }),
        el('p', { texto: T('Seu papel não permite ver esta tela.', 'Your role does not allow this screen.') }),
        ui.botao(T('Ir para o painel', 'Go to dashboard'), function () { RF.Rota.ir('painel'); }, 'pri')]));
      return;
    }
    var tela = RF.telas[mod.id];
    try {
      if (tela) tela(main, rota);
      else main.appendChild(ui.cinza('mapa', el('p', { texto: T('Tela ainda não construída.', 'Screen not built yet.') })));
    } catch (e) {
      if (raiz.console) console.error(e);
      main.appendChild(el('div', { class: 'rf-vazio' }, [el('p', { texto: T('Esta tela teve um erro. Nada foi perdido.', 'This screen hit an error. Nothing was lost.') }),
        el('pre', { class: 'rf-dica', texto: String(e && e.message) })]));
    }
    main.focus({ preventScroll: true });
    raiz.scrollTo(0, 0);
  }
  RF.renderizar = renderizar;

  /* cabeçalho de página padrão, com ajuda do que está na tela */
  RF.pagina = function (area, modId, subtitulo, acoes) {
    var m = RF.cat.modulo(modId);
    var ajuda = el('button', { type: 'button', class: 'rf-ajuda-bt', 'aria-label': T('Ajuda desta tela', 'Help for this screen'), title: T('Ajuda desta tela', 'Help for this screen') },
      [el('img', { src: 'ajuda-botao.png', alt: '', width: 28, height: 28 })]);
    ajuda.onclick = function () { ajudaDaTela(m); };
    area.appendChild(el('div', { class: 'rf-pag-cab' }, [
      el('div', {}, [el('h1', { class: 'rf-pag-tit' }, [el('span', { 'aria-hidden': 'true', texto: m.icone + ' ' }), T(m.nome), ' ',
        m.estado !== 'ativo' ? ui.seloEstado(m.estado) : null]),
        subtitulo ? el('p', { class: 'rf-dica', texto: subtitulo }) : null]),
      el('div', { class: 'rf-acoes' }, (acoes || []).concat([ajuda]))
    ]));
  };
  function ajudaDaTela(m) {
    var fs = RF.cat.FUNCOES.filter(function (f) { return f.modulo === m.id; });
    ui.modal(T('Ajuda: ', 'Help: ') + T(m.nome), el('div', {}, [
      el('p', { texto: T(m.ajuda) }),
      fs.length ? el('h3', { texto: T('Funções desta tela', 'Features on this screen') }) : null,
      fs.length ? el('ul', { class: 'rf-lista-funcoes' }, fs.map(function (f) {
        return el('li', {}, [ui.seloEstado(f.estado), ' ', T(f.nome), f.falta ? el('small', { class: 'rf-dica', texto: ' — ' + T(f.falta) }) : null]);
      })) : null,
      el('p', { class: 'rf-dica', texto: T('Dica: a lupa 🔍 no topo encontra qualquer tela, função, pessoa ou chamado.', 'Tip: the 🔍 at the top finds any screen, feature, person or ticket.') })
    ]));
  }

  /* ------------------------------------------------------------------
     ARRANQUE
     ------------------------------------------------------------------ */
  function montarEsqueleto() {
    acesso = d.getElementById('rf-acesso');
    casca = d.getElementById('rf-casca');
    main = d.getElementById('rf-main');
    menu = d.getElementById('rf-menu');
    topoTitulo = d.getElementById('rf-topo-tit');
    barraBaixo = d.getElementById('rf-barra-baixo');
    faixaSim = d.getElementById('rf-faixa-sim');
    d.getElementById('rf-bt-menu').onclick = function () {
      var aberto = d.body.classList.contains('rf-menu-aberto');
      if (aberto) fecharMenu(); else abrirMenu();
      if (raiz.innerWidth >= 1100) U.gravarLocal('menuFechado', aberto);
    };
    d.getElementById('rf-menu-fundo').onclick = function () { fecharMenu(); };
    d.getElementById('rf-bt-busca').onclick = abrirBusca;
    d.getElementById('rf-bt-config').onclick = function () { RF.Rota.ir('configuracoes'); };
    d.getElementById('rf-bt-inicio').onclick = function () { RF.Rota.ir('painel'); };
    d.getElementById('rf-bt-pessoa').onclick = menuPessoa;
    d.getElementById('rf-marca').onclick = function () { RF.Rota.ir('painel'); };
    d.getElementById('rf-marca').onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); RF.Rota.ir('painel'); } };
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && d.body.classList.contains('rf-menu-aberto') && !ui.modaisAbertos()) fecharMenu();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && S.pessoa) { e.preventDefault(); abrirBusca(); }
    });
    if (raiz.innerWidth >= 1100 && U.lerLocal('menuFechado', false) !== true) d.body.classList.add('rf-menu-aberto');
  }

  function iniciar() {
    montarEsqueleto();
    if (!raiz.crypto || !raiz.crypto.subtle) {
      telaAcesso(el('div', { class: 'rf-form' }, [el('h2', { texto: T('Navegador sem criptografia', 'Browser without cryptography') }),
        el('p', { texto: T('O RootifyONE precisa ser aberto por https:// (ou http://localhost) num navegador atual.', 'RootifyONE must be opened over https:// (or http://localhost) in a current browser.') })]));
      return;
    }
    RF.on('rota', renderizar);
    RF.on('bloqueado', function () { U.limpar(main); telaEntrar(T('Tela bloqueada por inatividade ou a pedido. Entre de novo.', 'Screen locked for inactivity or on request. Sign in again.')); });
    RF.on('saiu', function () { U.limpar(main); telaEntrar(); });
    function rotular() {
      d.getElementById('rf-bt-busca').setAttribute('aria-label', T('Buscar', 'Search'));
      d.getElementById('rf-bt-config').setAttribute('aria-label', T('Configurações', 'Settings'));
      d.getElementById('rf-bt-inicio').setAttribute('aria-label', T('Início', 'Home'));
      d.getElementById('rf-bt-pessoa').setAttribute('aria-label', T('Sua conta', 'Your account'));
      d.getElementById('rf-bt-menu').setAttribute('aria-label', T('Menu com todas as funções', 'Menu with every feature'));
      d.querySelector('.rf-pular').textContent = T('Pular para o conteúdo', 'Skip to content');
      d.documentElement.setAttribute('lang', U.idioma() === 'en' ? 'en' : 'pt-BR');
    }
    rotular();
    d.addEventListener('dgo:idioma', function () {
      rotular();
      if (S.pessoa && C.aberto()) { desenharFaixaSim(); renderizar(); }
      else if (!C.equipe().length) telaInstalar(); else telaEntrar();
    });
    if (!C.equipe().length) { telaInstalar(); return; }
    /* recarregou a página (F5) com a sessão ainda valendo: continua sem pedir de novo */
    RF.Continuidade.retomar().then(function (p) { if (p) abrirCasca(); else telaEntrar(); });
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})(window);
