/* =====================================================================
   RootifyONE — CASCA DO APP
   ---------------------------------------------------------------------
   Telas de acesso (instalação, entrar, bloqueio, código de recuperação),
   cabeçalho (☰ · marca · PT|EN · 🔍 📥 ⚙️ 🏠 👤), menu ☰ (ações rápidas,
   grupos e acordeão), barra de atalhos, busca compartilhada (lupa e
   AssistONE), caixa de entrada 📥, aparência, simulador de papel e o
   "roteador" que chama a tela certa de RF.telas.
   ===================================================================== */
(function (raiz) {
  'use strict';
  var RF = raiz.RF, U = RF.util, T = U.T, el = U.el, ui = RF.ui, C = RF.Cofre, S = RF.Sessao;
  var d = document;
  RF.telas = RF.telas || {};
  var LARGO = 1100;                                  /* a partir daqui o menu fica fixo ao lado */

  var acesso, casca, main, menu, topoTitulo, barraBaixo, faixaSim;

  /* ------------------------------------------------------------------
     APARÊNCIA (tema, tamanho do texto, movimento) — por aparelho, vale
     antes mesmo de entrar. Guardada fora do cofre, de propósito.
     ------------------------------------------------------------------ */
  var Aparencia = {
    ler: function () { return U.lerLocal('aparencia', { tema: 'auto', texto: 100, movimento: 'auto' }); },
    gravar: function (a) { U.gravarLocal('aparencia', a); Aparencia.aplicar(); },
    aplicar: function () {
      var a = Aparencia.ler(), h = d.documentElement;
      if (a.tema === 'claro' || a.tema === 'escuro') h.setAttribute('data-theme', a.tema === 'claro' ? 'light' : 'dark');
      else h.removeAttribute('data-theme');
      h.style.fontSize = (a.texto && a.texto !== 100) ? (a.texto / 100 * 100) + '%' : '';
      h.classList.toggle('rf-sem-movimento', a.movimento === 'menos');
      var meta = d.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', getComputedStyle(d.body).getPropertyValue('--sup').trim() || '#0b1220');
      atualizarBotoesTema();
    },
    /* tema que está valendo agora: o escolhido, ou o do aparelho quando 'auto' */
    efetivo: function () {
      var a = Aparencia.ler();
      if (a.tema === 'claro' || a.tema === 'escuro') return a.tema;
      return raiz.matchMedia && raiz.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
    },
    alternar: function () {
      var a = Aparencia.ler(); a.tema = Aparencia.efetivo() === 'escuro' ? 'claro' : 'escuro'; Aparencia.gravar(a);
    }
  };
  RF.Aparencia = Aparencia;
  /* botão ☀️/🌙: no cabeçalho (computador), no topo do ☰ (celular) e na tela de entrada.
     Um toque alterna claro ↔ escuro; "como o aparelho" continua em ⚙️ → Aparência. */
  function botaoTema() {
    var b = el('button', { type: 'button', class: 'rf-bt-tema' });
    b.onclick = function () { Aparencia.alternar(); };
    rotularTema(b);
    return b;
  }
  function rotularTema(b) {
    var escuro = Aparencia.efetivo() === 'escuro';
    b.textContent = escuro ? '☀️' : '🌙';
    b.setAttribute('aria-label', escuro ? T('Mudar para o tema claro', 'Switch to light theme') : T('Mudar para o tema escuro', 'Switch to dark theme'));
    b.setAttribute('title', b.getAttribute('aria-label'));
  }
  function atualizarBotoesTema() { Array.prototype.forEach.call(d.querySelectorAll('.rf-bt-tema'), rotularTema); }
  if (raiz.matchMedia) { try { raiz.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', atualizarBotoesTema); } catch (e) {} }
  RF.botaoTema = botaoTema;

  /* ------------------------------------------------------------------
     ACESSO
     ------------------------------------------------------------------ */
  function telaAcesso(conteudo) {
    casca.hidden = true;
    acesso.hidden = false;
    U.limpar(acesso);
    acesso.appendChild(el('div', { class: 'rf-acesso-caixa' }, [
      el('div', { class: 'rf-acesso-topo' }, [
        el('div', { class: 'rf-marca-grande' }, [el('span', { class: 'rf-logo', 'aria-hidden': 'true', texto: '🌳' }),
          el('div', {}, [el('h1', { texto: 'RootifyONE' }), el('p', { texto: T('Administração central da SolverONE', 'SolverONE central administration') })])]),
        el('div', { class: 'rf-acoes' }, [seletorIdioma('rf-seg-acesso'), botaoTema()])
      ]),
      conteudo
    ]));
    RF.emitir('acesso', true);
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
      corpo.appendChild(el('p', { class: 'rf-quem' }, [el('span', { class: 'rf-avatar', 'aria-hidden': 'true', texto: pessoa.nome.charAt(0) }),
        el('span', {}, [T('Entrando como ', 'Signing in as '), el('strong', { texto: pessoa.nome + ' (' + pessoa.apelido + ')' })])]));
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
     IDIOMA — PT|EN no cabeçalho (computador), no topo do ☰ (celular) e
     na tela de entrada. Um componente só.
     ------------------------------------------------------------------ */
  function seletorIdioma(classe) {
    var atual = U.idioma();
    var g = el('div', { class: 'rf-seg ' + (classe || ''), role: 'group', 'aria-label': T('Idioma', 'Language') });
    [['pt', 'PT'], ['en', 'EN']].forEach(function (o) {
      var b = el('button', { type: 'button', class: atual === o[0] ? 'rf-on' : '', 'aria-pressed': atual === o[0] ? 'true' : 'false', texto: o[1],
        title: o[0] === 'pt' ? 'Português' : 'English' });
      b.onclick = function () { trocarIdioma(o[0]); };
      g.appendChild(b);
    });
    return g;
  }
  function trocarIdioma(l) {
    if (raiz.DGO && raiz.DGO.trocarIdioma) raiz.DGO.trocarIdioma(l);
    else { U.gravarLocal('idioma', l); d.dispatchEvent(new CustomEvent('dgo:idioma', { detail: l })); }
  }
  RF.seletorIdioma = seletorIdioma;
  RF.trocarIdioma = trocarIdioma;

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
    RF.emitir('acesso', false);
    RF.emitir('entrou', S.pessoa);
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
    return RF.cat.MODULOS.filter(function (m) { return !m.oculto && RF.pode(m.recurso + ':ver'); });
  }
  function contagem(id) {
    if (!C.aberto()) return 0;
    if (id === 'suporte') return RF.dados.Chamados.abertos().filter(function (c) { return RF.noEscopo(c.app); }).length;
    if (id === 'privacidade') return RF.dados.Privacidade.abertos().length;
    if (id === 'termos') return RF.dados.Termos.pendentesAprovacao().length;
    if (id === 'emails' && RF.Email) return RF.Email.aguardando().length;
    return 0;
  }

  /* Ações rápidas do ☰: até 4, filtradas pela permissão e pelo que existe */
  function acoesRapidas() {
    return RF.cat.ACOES_RAPIDAS.filter(function (a) {
      if (!RF.pode(a.perm)) return false;
      return a.rota ? true : typeof RF.h[a.faz] === 'function';
    }).slice(0, 4);
  }
  function executarRapida(a) {
    if (a.rota) return RF.Rota.ir(a.rota);
    RF.h[a.faz]({});
  }

  var abertosNoMenu = {};   /* grupos (acordeão) que a pessoa abriu à mão */
  function montarMenu() {
    U.limpar(menu);
    var rota = RF.Rota.atual();
    var lista = el('div', { class: 'rf-menu-rola' });

    /* celular: idioma no topo da gaveta (no computador ele fica no cabeçalho) */
    lista.appendChild(el('div', { class: 'rf-menu-idioma' }, [botaoTema(), seletorIdioma()]));

    var rapidas = acoesRapidas();
    if (rapidas.length) {
      lista.appendChild(el('div', { class: 'rf-menu-rapidas', role: 'group', 'aria-label': T('Ações rápidas', 'Quick actions') }, rapidas.map(function (a) {
        var b = el('button', { type: 'button', class: 'rf-rapida' }, [el('span', { class: 'rf-rapida-ic', 'aria-hidden': 'true', texto: a.icone }), el('span', { texto: T(a.nome) })]);
        b.onclick = function () { fecharMenuE(function () { executarRapida(a); }); };
        return b;
      })));
    }

    RF.cat.GRUPOS.forEach(function (g) {
      var itens = modulosVisiveis().filter(function (m) { return m.grupo === g.id; });
      if (!itens.length) return;
      lista.appendChild(el('p', { class: 'rf-menu-grupo', texto: T(g.nome) }));
      itens.forEach(function (m) {
        var n = contagem(m.id);
        var atual = rota.modulo === m.id;
        var partes = (m.partes || []).slice();
        var temPartes = partes.length > 0;
        var abertoAgora = temPartes && (atual || abertosNoMenu[m.id]);
        var a = el('a', { href: '#/' + m.id, class: 'rf-menu-item' + (atual ? ' rf-ativo' : ''), 'aria-current': atual ? 'page' : null, 'data-modulo': m.id }, [
          el('span', { class: 'rf-ic', 'aria-hidden': 'true', texto: m.icone }), el('span', { class: 'rf-menu-nome', texto: T(m.nome) }),
          el('span', { class: 'rf-conta', 'data-conta': m.id, texto: String(n), hidden: !n, 'aria-label': n + T(' pendentes', ' pending') }),
          m.estado !== 'ativo' ? el('span', { class: 'rf-ponto rf-ponto-' + m.estado, title: m.estado === 'futuro' ? T('futuro', 'future') : T('parcial', 'partial') }) : null
        ]);
        a.onclick = function (e) {
          if (raiz.innerWidth >= LARGO) return;            /* menu fixo ao lado: o link segue normal */
          e.preventDefault();
          fecharMenuEIr(m.id);
        };
        if (!temPartes) { lista.appendChild(a); return; }
        /* acordeão de um nível: o nome abre a tela; o ▸ mostra as partes */
        var sub = el('div', { class: 'rf-menu-sub', id: 'rf-sub-' + m.id, hidden: !abertoAgora }, partes.map(function (p) {
          var ativo = atual && (rota.sub || partes[0].sub) === p.sub;
          var l = el('a', { href: '#/' + m.id + '/' + p.sub, class: 'rf-menu-subitem' + (ativo ? ' rf-ativo' : ''), 'aria-current': ativo ? 'page' : null, texto: T(p.nome) });
          l.onclick = function (e) {
            if (raiz.innerWidth >= LARGO) return;
            e.preventDefault();
            fecharMenuE(function () { RF.Rota.ir(m.id, p.sub); });
          };
          return l;
        }));
        var seta = el('button', { type: 'button', class: 'rf-menu-seta', 'aria-expanded': abertoAgora ? 'true' : 'false', 'aria-controls': 'rf-sub-' + m.id,
          'aria-label': T('Mostrar partes de ', 'Show parts of ') + T(m.nome), texto: '▸' });
        seta.onclick = function () {
          var ab = sub.hidden; sub.hidden = !ab; abertosNoMenu[m.id] = ab;
          seta.setAttribute('aria-expanded', ab ? 'true' : 'false');
        };
        lista.appendChild(el('div', { class: 'rf-menu-com-partes' + (abertoAgora ? ' rf-aberto' : '') }, [el('div', { class: 'rf-menu-linha' }, [a, seta]), sub]));
      });
    });
    menu.appendChild(lista);
    menu.appendChild(el('div', { class: 'rf-menu-pe' }, [
      el('a', { href: U.siteBase(), target: '_blank', rel: 'noopener', class: 'rf-menu-item' },
        [el('span', { class: 'rf-ic', 'aria-hidden': 'true', texto: '🧭' }), el('span', { class: 'rf-menu-nome', texto: T('Portal SolverONE ↗', 'SolverONE Portal ↗') })]),
      el('p', { class: 'rf-dica rf-menu-versao', texto: 'RootifyONE ' + RF.VERSAO })
    ]));
    /* menu mais comprido que a tela: dica de que há mais para baixo */
    setTimeout(function () { lista.classList.toggle('rf-tem-mais', lista.scrollHeight > lista.clientHeight + 4); }, 0);
    lista.addEventListener('scroll', function () {
      lista.classList.toggle('rf-tem-mais', lista.scrollTop + lista.clientHeight < lista.scrollHeight - 4);
    });
  }
  /* só o que muda entre telas: item ativo, acordeão da tela atual e contadores */
  function atualizarMenu() {
    var rota = RF.Rota.atual();
    Array.prototype.forEach.call(menu.querySelectorAll('.rf-menu-item[data-modulo]'), function (a) {
      var atual = a.getAttribute('data-modulo') === rota.modulo;
      a.classList.toggle('rf-ativo', atual);
      if (atual) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
      var caixa = a.closest('.rf-menu-com-partes');
      if (caixa) {
        var sub = caixa.querySelector('.rf-menu-sub'), seta = caixa.querySelector('.rf-menu-seta');
        var abrir = atual || !!abertosNoMenu[a.getAttribute('data-modulo')];
        sub.hidden = !abrir; seta.setAttribute('aria-expanded', abrir ? 'true' : 'false'); caixa.classList.toggle('rf-aberto', abrir);
        Array.prototype.forEach.call(sub.querySelectorAll('a'), function (l) {
          var ativo = atual && l.getAttribute('href') === '#/' + rota.modulo + '/' + (rota.sub || (RF.cat.modulo(rota.modulo).partes[0] || {}).sub);
          l.classList.toggle('rf-ativo', ativo);
          if (ativo) l.setAttribute('aria-current', 'page'); else l.removeAttribute('aria-current');
        });
      }
    });
    Array.prototype.forEach.call(menu.querySelectorAll('[data-conta]'), function (c) {
      var n = contagem(c.getAttribute('data-conta'));
      c.textContent = String(n); c.hidden = !n;
    });
  }
  function abrirMenu() {
    d.body.classList.add('rf-menu-aberto');
    d.getElementById('rf-bt-menu').setAttribute('aria-expanded', 'true');
    if (raiz.innerWidth < LARGO) {
      try { raiz.history.pushState({ rfMenu: 1 }, ''); } catch (e) {}
      var primeiro = menu.querySelector('button, a'); if (primeiro) primeiro.focus();
    }
    RF.emitir('menu', true);
  }
  function fecharMenu(peloVoltar) {
    if (!d.body.classList.contains('rf-menu-aberto')) return;
    d.body.classList.remove('rf-menu-aberto');
    d.getElementById('rf-bt-menu').setAttribute('aria-expanded', 'false');
    if (!peloVoltar && raiz.innerWidth < LARGO && raiz.history.state && raiz.history.state.rfMenu) { ui._ignorarPop = true; raiz.history.back(); }
    if (raiz.innerWidth < LARGO) { try { d.getElementById('rf-bt-menu').focus({ preventScroll: true }); } catch (e) {} }
    RF.emitir('menu', false);
  }
  raiz.addEventListener('popstate', function () {
    if (d.body.classList.contains('rf-menu-aberto') && raiz.innerWidth < LARGO) fecharMenu(true);
  });
  /* Fechar a gaveta e só então fazer algo. Antes, o "voltar" que tira a
     gaveta do histórico chegava depois da troca e desfazia a tela nova
     (acontecia com a janela estreita, ex.: painel lateral do Chrome aberto). */
  function fecharMenuE(depois) {
    if (raiz.innerWidth >= LARGO) return depois();
    var tinhaEntrada = raiz.history.state && raiz.history.state.rfMenu;
    fecharMenu(true);
    if (tinhaEntrada) ui.voltarEDepois(1, depois);
    else depois();
  }
  function fecharMenuEIr(modulo) { fecharMenuE(function () { RF.Rota.ir(modulo); }); }

  /* ---- barra de atalhos (celular): só os favoritos ---- */
  var FAVORITOS_PADRAO = ['painel', 'suporte', 'usuarios', 'emails', 'publicar'];
  function favoritos() {
    var cfg = C.aberto() ? C.obj('config') : {};
    var f = (cfg.favoritos && cfg.favoritos.length) ? cfg.favoritos : FAVORITOS_PADRAO;
    return f.filter(function (id) { var m = RF.cat.modulo(id); return m && !m.oculto && RF.pode(m.recurso + ':ver'); }).slice(0, 5);
  }
  RF.favoritos = favoritos;
  RF.FAVORITOS_PADRAO = FAVORITOS_PADRAO;
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
      el('div', { class: 'rf-pessoa rf-pessoa-grande' }, [el('span', { class: 'rf-avatar', 'aria-hidden': 'true', texto: p.nome.charAt(0) }),
        el('span', {}, [el('strong', { texto: p.nome }), el('br'), el('span', { class: 'rf-dica', texto: p.email }), el('br'), ui.selo(papel ? T(papel.nome) : p.papel, 'neutro')])]),
      ui.botao('🔒 ' + T('Bloquear agora', 'Lock now'), function () { ui.fecharModal(); setTimeout(S.bloquear, 50); }),
      ui.botao('🛡 ' + T('Minha segurança (PIN, digital, senha)', 'My security (PIN, fingerprint, password)'), function () { ui.fecharEIr('configuracoes', 'seguranca'); }),
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
     BUSCA — um índice só, usado pela lupa 🔍 e pelo AssistONE
     ------------------------------------------------------------------ */
  var Busca = {
    indice: function () {
      var itens = [];
      modulosVisiveis().forEach(function (m) {
        itens.push({ tipo: T('Tela', 'Screen'), titulo: T(m.nome), texto: T(m.ajuda), ir: [m.id], icone: m.icone, termos: [m.nome.pt, m.nome.en] });
        (m.partes || []).forEach(function (p) {
          itens.push({ tipo: T('Tela', 'Screen'), titulo: T(m.nome) + ' › ' + T(p.nome), texto: '', ir: [m.id, p.sub], icone: m.icone, termos: [p.nome.pt, p.nome.en] });
        });
      });
      RF.cat.FUNCOES.forEach(function (f) {
        var m = RF.cat.modulo(f.modulo);
        if (!m || !RF.pode(m.recurso + ':ver')) return;
        itens.push({ tipo: T('Função', 'Feature'), titulo: T(f.nome), texto: T(m.nome) + (f.estado !== 'ativo' ? ' · ' + (f.estado === 'especificar' ? T('a especificar', 'needs spec') : f.estado) : ''),
          ir: [f.modulo], icone: '·', termos: [f.nome.pt, f.nome.en] });
      });
      itens.push({ tipo: T('Ajuda', 'Help'), titulo: 'AssistONE', texto: T('assistente, ajuda, tour e passo a passo', 'assistant, help, tour and walkthrough'), abrir: function () { if (RF.Assist) RF.Assist.abrir(); },
        icone: '✨', termos: ['assistone', 'assist one', 'ajuda', 'help', 'clipe', 'ajudante', 'tutorial', 'wizard', 'tour', 'passo a passo'] });
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
      if (RF.pode('emails:ver')) C.lista('emails').slice(-200).forEach(function (m) {
        itens.push({ tipo: 'E-mail', titulo: m.assunto || '—', texto: (m.para || '') + ' · ' + (m.status || ''), ir: ['emails', 'saida', m.id], icone: '✉️', termos: [m.assunto, m.para] });
      });
      return itens;
    },
    /* devolve { achados, sugestoes } — sem acento, sem maiúsculas, PT e EN */
    procurar: function (q, indice) {
      indice = indice || Busca.indice();
      q = U.semAcento(String(q || '').trim());
      if (q.length < 2) return { achados: [], sugestoes: [], curto: true };
      var achados = indice.filter(function (it) {
        return it.termos.concat([it.titulo]).some(function (t) { return U.semAcento(t).indexOf(q) !== -1; });
      }).slice(0, 40);
      var sugestoes = [];
      if (!achados.length) {
        var palavras = [];
        indice.forEach(function (it) { it.termos.forEach(function (t) { String(t || '').split(/\s+/).forEach(function (w) { if (w.length > 3) palavras.push(w); }); }); });
        sugestoes = palavras.map(function (w) { return { w: w, dist: U.distancia(w.slice(0, Math.max(q.length, 4)), q) }; })
          .filter(function (x) { return x.dist <= 2; }).sort(function (a, b) { return a.dist - b.dist; })
          .map(function (x) { return x.w.toLowerCase(); }).filter(function (w, i, a) { return a.indexOf(w) === i; }).slice(0, 6);
      }
      return { achados: achados, sugestoes: sugestoes };
    },
    abrirItem: function (it) {
      if (it.abrir) { ui.fecharEIr(RF.Rota.atual().modulo, RF.Rota.atual().sub, RF.Rota.atual().id); setTimeout(it.abrir, 120); return; }
      ui.fecharEIr(it.ir[0], it.ir[1], it.ir[2]);
    },
    /* lista de resultados (usada pela lupa e pelo balão do AssistONE) */
    desenhar: function (res, termo, aoEscolher, campo) {
      var caixa = el('div', { class: 'rf-busca-res', 'aria-live': 'polite' });
      if (res.curto) { caixa.appendChild(el('p', { class: 'rf-dica', texto: T('Digite pelo menos 2 letras.', 'Type at least 2 letters.') })); return caixa; }
      if (!res.achados.length) {
        caixa.appendChild(el('p', { texto: T('Nada encontrado para "', 'Nothing found for "') + termo + '".' }));
        if (res.sugestoes.length) {
          caixa.appendChild(el('p', { class: 'rf-dica', texto: T('Você quis dizer:', 'Did you mean:') }));
          caixa.appendChild(el('div', { class: 'rf-chips' }, res.sugestoes.map(function (s) {
            return ui.botao(s, function () { if (campo) { campo.value = s; campo.dispatchEvent(new Event('input')); } }, 'chip');
          })));
        }
        return caixa;
      }
      res.achados.forEach(function (it) {
        var b = el('button', { type: 'button', class: 'rf-busca-item' }, [el('span', { class: 'rf-ic', 'aria-hidden': 'true', texto: it.icone }),
          el('span', {}, [el('strong', { texto: it.titulo }), el('small', { texto: it.tipo + (it.texto ? ' · ' + it.texto : '') })])]);
        b.onclick = function () { (aoEscolher || Busca.abrirItem)(it); };
        caixa.appendChild(b);
      });
      return caixa;
    }
  };
  RF.busca = Busca;
  function abrirBusca() {
    var campo = ui.entrada('', { tipo: 'search', attrs: { autofocus: true, 'aria-label': T('O que você procura?', 'What are you looking for?'), placeholder: T('Tela, função, pessoa, chamado #, e-mail…', 'Screen, feature, person, ticket #, e-mail…') } });
    var zona = el('div');
    var indice = Busca.indice();
    function buscar() {
      U.limpar(zona);
      zona.appendChild(Busca.desenhar(Busca.procurar(campo.value, indice), campo.value, null, campo));
    }
    campo.addEventListener('input', buscar);
    campo.addEventListener('keydown', function (e) { if (e.key === 'Enter') { var p = zona.querySelector('.rf-busca-item'); if (p) p.click(); } });
    ui.modal('🔍 ' + T('Buscar', 'Search'), el('div', {}, [campo, zona]), { largo: true });
    buscar();
  }
  RF.abrirBusca = abrirBusca;

  /* ------------------------------------------------------------------
     CAIXA DE ENTRADA 📥 — tudo o que pede a sua atenção, num lugar só.
     Itens vêm dos dados (prazos, aprovações, publicação, e-mails) e da
     coleção 'avisos' (automações e sistema). Lido/não lido fica na
     config deste cofre; a bolha do cabeçalho leva a cor da prioridade
     mais alta (🔴 urgente, 🟠 importante, 🔵 para saber).
     ------------------------------------------------------------------ */
  var PRIO = { urgente: 0, importante: 1, info: 2 };
  var Inbox = {
    _cachePub: { em: 0, n: 0 },
    itens: function () {
      if (!C.aberto()) return [];
      var D = RF.dados, lista = [];
      if (RF.pode('suporte:ver')) D.Chamados.abertos().filter(function (c) { return RF.noEscopo(c.app); }).forEach(function (c) {
        var s = D.Chamados.situacao(c);
        if (s === 'estourado') lista.push({ id: 'ch-est:' + c.id, prio: 'urgente', icone: '⛔', quando: c.prazoResposta, titulo: '#' + c.numero + ' ' + c.assunto, texto: T('Prazo estourado · ', 'Deadline missed · ') + D.Chamados.faltaTexto(c), ir: ['suporte', 'chamado', c.id] });
        else if (s === 'risco') lista.push({ id: 'ch-risco:' + c.id, prio: 'importante', icone: '⚠', quando: c.criadoEm, titulo: '#' + c.numero + ' ' + c.assunto, texto: T('Prazo em risco · ', 'Deadline at risk · ') + D.Chamados.faltaTexto(c), ir: ['suporte', 'chamado', c.id] });
        else if (c.status === 'novo' && !c.responsavel) lista.push({ id: 'ch-novo:' + c.id, prio: 'info', icone: '🎧', quando: c.criadoEm, titulo: '#' + c.numero + ' ' + c.assunto, texto: T('Chamado novo sem responsável', 'New ticket without an assignee'), ir: ['suporte', 'chamado', c.id] });
      });
      if (RF.pode('privacidade:ver')) D.Privacidade.abertos().forEach(function (p) {
        var dias = D.Privacidade.diasRestantes(p);
        lista.push({ id: 'lgpd:' + p.id + ':' + (dias <= 3 ? 'u' : dias <= 7 ? 'i' : 'n'), prio: dias <= 3 ? 'urgente' : dias <= 7 ? 'importante' : 'info', icone: '⚖', quando: p.recebidoEm,
          titulo: p.numero + ' · ' + T(RF.cat.TIPOS_PEDIDO_LGPD[p.tipo] || {}), texto: dias < 0 ? T('Atrasado ', 'Late by ') + (-dias) + T(' dia(s)', ' day(s)') : dias + T(' dia(s) para responder (LGPD)', ' day(s) to answer (LGPD)'), ir: ['privacidade'] });
      });
      if (RF.pode('termos:aprovar')) D.Termos.pendentesAprovacao().forEach(function (t) {
        var v = D.Termos.ultima(t);
        lista.push({ id: 'termo:' + t.id + ':' + v.versao, prio: 'importante', icone: '📜', quando: v.enviadoEm || v.criadoEm, titulo: T(v.titulo), texto: T('Termo aguardando a sua aprovação', 'Term awaiting your approval'), ir: ['termos', 'termo', t.id] });
      });
      if (RF.pode('publicar:ver')) {
        var agora = Date.now();
        if (agora - Inbox._cachePub.em > 60000) {   /* gerar os arquivos custa; uma vez por minuto basta */
          Inbox._cachePub = { em: agora, n: D.diferencas(D.gerarArquivos()).filter(function (x) { return x.situacao !== 'igual'; }).length };
        }
        if (Inbox._cachePub.n) lista.push({ id: 'publicar:' + Inbox._cachePub.n, prio: 'info', icone: '🚀', quando: U.agora(), titulo: T('Arquivos para publicar', 'Files to publish'), texto: Inbox._cachePub.n + T(' arquivo(s) com mudança ainda não publicada', ' file(s) with changes not yet published'), ir: ['publicar'] });
      }
      if (RF.pode('emails:ver') && RF.Email) RF.Email.aguardando().forEach(function (m) {
        lista.push({ id: 'email:' + m.id, prio: 'info', icone: '✉️', quando: m.criadoEm, titulo: m.assunto, texto: T('E-mail pronto na caixa de saída para ', 'E-mail ready in the outbox for ') + m.para, ir: ['emails', 'saida', m.id] });
      });
      C.lista('avisos').slice(-100).forEach(function (a) {
        lista.push({ id: 'aviso:' + a.id, prio: a.prio || 'info', icone: a.icone || '⚙️', quando: a.quando, titulo: a.titulo, texto: a.texto || '', ir: a.ir || null, arquivavel: true });
      });
      var lidos = C.obj('config').inboxLidos || {};
      lista.forEach(function (i) { i.lido = !!lidos[i.id]; });
      lista.sort(function (a, b) { return (PRIO[a.prio] - PRIO[b.prio]) || String(b.quando).localeCompare(String(a.quando)); });
      return lista;
    },
    naoLidos: function () { return Inbox.itens().filter(function (i) { return !i.lido; }); },
    /* aviso gerado pelo sistema/automação: fica guardado para quem não viu na hora */
    avisar: function (titulo, texto, prio, ir, icone) {
      if (!C.aberto()) return;
      var a = { id: U.uid('av-'), quando: U.agora(), titulo: titulo, texto: texto || '', prio: prio || 'info', ir: ir || null, icone: icone || '⚙️' };
      var lista = C.lista('avisos'); lista.push(a);
      if (lista.length > 300) lista.splice(0, lista.length - 300);
      C.salvar('avisos').then(atualizarBolha);
      return a;
    },
    marcar: function (id, lido) {
      var cfg = C.obj('config'); cfg.inboxLidos = cfg.inboxLidos || {};
      if (lido === false) delete cfg.inboxLidos[id]; else cfg.inboxLidos[id] = U.agora();
      /* limpa marcações de itens que já não existem (não deixa crescer) */
      var vivos = {}; Inbox.itens().forEach(function (i) { vivos[i.id] = true; });
      Object.keys(cfg.inboxLidos).forEach(function (k) { if (!vivos[k]) delete cfg.inboxLidos[k]; });
      return C.salvar('config').then(atualizarBolha);
    },
    marcarTodos: function () {
      var cfg = C.obj('config'); cfg.inboxLidos = cfg.inboxLidos || {};
      Inbox.itens().forEach(function (i) { cfg.inboxLidos[i.id] = U.agora(); });
      return C.salvar('config').then(atualizarBolha);
    },
    arquivar: function (id) {
      C.db.avisos = C.lista('avisos').filter(function (a) { return 'aviso:' + a.id !== id; });
      return C.salvar('avisos').then(atualizarBolha);
    }
  };
  RF.Inbox = Inbox;
  function atualizarBolha() {
    var bt = d.getElementById('rf-bt-inbox'), bolha = d.getElementById('rf-inbox-bolha');
    if (!bt || !bolha) return;
    var nl = C.aberto() && S.pessoa ? Inbox.naoLidos() : [];
    var urg = nl.filter(function (i) { return i.prio === 'urgente'; }).length, imp = nl.filter(function (i) { return i.prio === 'importante'; }).length;
    bolha.hidden = !nl.length;
    bolha.textContent = nl.length > 99 ? '99+' : String(nl.length);
    bolha.className = 'rf-bolha ' + (urg ? 'rf-bolha-urgente' : imp ? 'rf-bolha-importante' : 'rf-bolha-info');
    bt.setAttribute('aria-label', T('Caixa de entrada', 'Inbox') + (nl.length ? ': ' + nl.length + T(' não lido(s)', ' unread') + (urg ? T(', com urgente', ', with urgent') : '') : ''));
    try { if (navigator.setAppBadge) { if (nl.length) navigator.setAppBadge(nl.length); else navigator.clearAppBadge(); } } catch (e) {}
  }
  RF.atualizarBolha = atualizarBolha;

  RF.telas.inbox = function (area) {
    var itens = Inbox.itens(), nl = itens.filter(function (i) { return !i.lido; });
    RF.pagina(area, 'inbox', nl.length ? nl.length + T(' não lido(s)', ' unread') : T('Tudo lido.', 'All read.'), [
      nl.length ? ui.botao(T('Marcar tudo como lido', 'Mark all as read'), function () { Inbox.marcarTodos().then(renderizar); }, 'p') : null
    ]);
    if (!itens.length) { area.appendChild(el('div', { class: 'rf-vazio' }, [el('p', { texto: T('Nada pede a sua atenção agora. 🎉', 'Nothing needs your attention right now. 🎉') })])); return; }
    var titulos = { urgente: ['🔴', T('Urgente', 'Urgent')], importante: ['🟠', T('Importante', 'Important')], info: ['🔵', T('Para saber', 'For your information')] };
    ['urgente', 'importante', 'info'].forEach(function (p) {
      var grupo = itens.filter(function (i) { return i.prio === p; });
      if (!grupo.length) return;
      area.appendChild(el('h2', { class: 'rf-inbox-faixa', texto: titulos[p][0] + ' ' + titulos[p][1] + ' · ' + grupo.length }));
      area.appendChild(el('ul', { class: 'rf-inbox' }, grupo.map(function (i) {
        var abrir = el('button', { type: 'button', class: 'rf-inbox-item' + (i.lido ? ' rf-lido' : '') }, [
          el('span', { class: 'rf-ic', 'aria-hidden': 'true', texto: i.icone }),
          el('span', { class: 'rf-inbox-texto' }, [el('strong', { texto: i.titulo }), el('span', { texto: i.texto }), el('small', { class: 'rf-dica', texto: U.data(i.quando, true) })])
        ]);
        abrir.onclick = function () {
          Inbox.marcar(i.id).then(function () { if (i.ir) RF.Rota.ir(i.ir[0], i.ir[1], i.ir[2]); else renderizar(); });
        };
        var acoes = el('span', { class: 'rf-inbox-acoes' }, [
          ui.botao(i.lido ? T('Não lido', 'Unread') : T('Lido', 'Read'), function () { Inbox.marcar(i.id, !i.lido).then(renderizar); }, 'p', { 'aria-label': (i.lido ? T('Marcar como não lido: ', 'Mark as unread: ') : T('Marcar como lido: ', 'Mark as read: ')) + i.titulo }),
          i.arquivavel ? ui.botao(T('Arquivar', 'Archive'), function () { Inbox.arquivar(i.id).then(renderizar); }, 'p') : null
        ]);
        return el('li', {}, [abrir, acoes]);
      })));
    });
  };

  /* ------------------------------------------------------------------
     ROTEADOR
     ------------------------------------------------------------------ */
  function renderizar() {
    if (!S.pessoa || !C.aberto()) return;
    var rota = RF.Rota.atual();
    var mod = RF.cat.modulo(rota.modulo) || RF.cat.modulo('painel');
    atualizarMenu(); montarBarraBaixo(); atualizarBolha();
    topoTitulo.textContent = T(mod.nome);
    d.title = T(mod.nome) + ' · RootifyONE';
    var btInicio = d.getElementById('rf-bt-inicio');
    if (mod.id === 'painel') btInicio.setAttribute('aria-current', 'page'); else btInicio.removeAttribute('aria-current');
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
    RF.emitir('tela', { modulo: mod.id, sub: rota.sub, id: rota.id });
  }
  RF.renderizar = renderizar;

  /* cabeçalho de página padrão, com ajuda do que está na tela */
  RF.pagina = function (area, modId, subtitulo, acoes) {
    var m = RF.cat.modulo(modId);
    var ajuda = el('button', { type: 'button', class: 'rf-ajuda-bt', 'aria-label': T('Ajuda desta tela', 'Help for this screen'), title: T('Ajuda desta tela (AssistONE)', 'Help for this screen (AssistONE)') },
      [el('img', { src: 'ajuda-botao.png', alt: '', width: 28, height: 28 })]);
    ajuda.onclick = function () { if (RF.Assist) RF.Assist.ajudaDaTela(m); else ajudaDaTela(m); };
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
  RF.ajudaDaTela = ajudaDaTela;

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
      if (raiz.innerWidth >= LARGO) U.gravarLocal('menuFechado', aberto);
    };
    d.getElementById('rf-menu-fundo').onclick = function () { fecharMenu(); };
    d.getElementById('rf-bt-busca').onclick = abrirBusca;
    d.getElementById('rf-bt-inbox').onclick = function () { RF.Rota.ir('inbox'); };
    d.getElementById('rf-bt-config').onclick = function () { RF.Rota.ir('configuracoes'); };
    d.getElementById('rf-bt-inicio').onclick = function () { RF.Rota.ir('painel'); };
    d.getElementById('rf-bt-pessoa').onclick = menuPessoa;
    d.getElementById('rf-marca').onclick = function () { RF.Rota.ir('painel'); };
    d.getElementById('rf-marca').onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); RF.Rota.ir('painel'); } };
    var idi = d.getElementById('rf-idioma'); if (idi) { U.limpar(idi); idi.appendChild(seletorIdioma()); }
    var tm = d.getElementById('rf-tema'); if (tm) { U.limpar(tm); tm.appendChild(botaoTema()); }
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && d.body.classList.contains('rf-menu-aberto') && !ui.modaisAbertos()) fecharMenu();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && S.pessoa) { e.preventDefault(); abrirBusca(); }
    });
    if (raiz.innerWidth >= LARGO && U.lerLocal('menuFechado', false) !== true) d.body.classList.add('rf-menu-aberto');
    /* ao alargar/estreitar a janela, a gaveta não pode ficar "presa" aberta no celular */
    var larguraAntes = raiz.innerWidth;
    raiz.addEventListener('resize', function () {
      var agoraLargo = raiz.innerWidth >= LARGO, antesLargo = larguraAntes >= LARGO;
      larguraAntes = raiz.innerWidth;
      if (agoraLargo === antesLargo) return;
      if (agoraLargo) { d.body.classList.toggle('rf-menu-aberto', U.lerLocal('menuFechado', false) !== true); }
      else d.body.classList.remove('rf-menu-aberto');
      d.getElementById('rf-bt-menu').setAttribute('aria-expanded', d.body.classList.contains('rf-menu-aberto') ? 'true' : 'false');
    });
  }

  function iniciar() {
    Aparencia.aplicar();
    montarEsqueleto();
    if (!raiz.crypto || !raiz.crypto.subtle) {
      telaAcesso(el('div', { class: 'rf-form' }, [el('h2', { texto: T('Navegador sem criptografia', 'Browser without cryptography') }),
        el('p', { texto: T('O RootifyONE precisa ser aberto por https:// (ou http://localhost) num navegador atual.', 'RootifyONE must be opened over https:// (or http://localhost) in a current browser.') })]));
      return;
    }
    RF.on('rota', renderizar);
    RF.on('log', function () { if (S.pessoa) atualizarBolha(); });
    RF.on('bloqueado', function () { U.limpar(main); telaEntrar(T('Tela bloqueada por inatividade ou a pedido. Entre de novo.', 'Screen locked for inactivity or on request. Sign in again.')); });
    RF.on('saiu', function () { U.limpar(main); telaEntrar(); });
    function rotular() {
      d.getElementById('rf-bt-busca').setAttribute('aria-label', T('Buscar (Ctrl+K)', 'Search (Ctrl+K)'));
      d.getElementById('rf-bt-busca').setAttribute('title', T('Buscar · Ctrl+K', 'Search · Ctrl+K'));
      d.getElementById('rf-bt-busca-rotulo').textContent = T('Buscar…', 'Search…');
      d.getElementById('rf-bt-config').setAttribute('aria-label', T('Configurações', 'Settings'));
      d.getElementById('rf-bt-inicio').setAttribute('aria-label', T('Início', 'Home'));
      d.getElementById('rf-bt-pessoa').setAttribute('aria-label', T('Sua conta', 'Your account'));
      d.getElementById('rf-bt-menu').setAttribute('aria-label', T('Menu com todas as funções', 'Menu with every feature'));
      d.querySelector('.rf-pular').textContent = T('Pular para o conteúdo', 'Skip to content');
      d.documentElement.setAttribute('lang', U.idioma() === 'en' ? 'en' : 'pt-BR');
      var idi = d.getElementById('rf-idioma'); if (idi) { U.limpar(idi); idi.appendChild(seletorIdioma()); }
      atualizarBotoesTema();
    }
    rotular();
    d.addEventListener('dgo:idioma', function () {
      rotular();
      if (S.pessoa && C.aberto()) { desenharFaixaSim(); montarMenu(); renderizar(); }
      else if (!C.equipe().length) telaInstalar(); else telaEntrar();
    });
    if (!C.equipe().length) { telaInstalar(); return; }
    /* recarregou a página (F5) com a sessão ainda valendo: continua sem pedir de novo */
    RF.Continuidade.retomar().then(function (p) { if (p) abrirCasca(); else telaEntrar(); });
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})(window);
