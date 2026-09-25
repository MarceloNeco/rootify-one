/* =====================================================================
   RootifyONE — NÚCLEO
   ---------------------------------------------------------------------
   1. utilidades e idioma (PT/EN)
   2. criptografia (tudo que é dado fica cifrado neste aparelho)
   3. cofre: contas da equipe + coleções cifradas
   4. sessão, bloqueio por inatividade e permissões (papéis)
   5. log de auditoria encadeado (dá para provar que nada foi apagado)
   6. eventos (usados pelas automações)
   7. componentes de tela (modal, aviso, tabela, abas, itens em cinza)
   8. navegação com o botão Voltar
   9. zip, CSV e GitHub
   Nenhuma senha, token ou chave é gravada em texto aberto.
   ===================================================================== */
(function (raiz) {
  'use strict';
  var RF = raiz.RF = raiz.RF || {};
  var d = document;
  var PREFIXO = 'rootify:v1:';
  var VERSAO = '0.1.3';
  RF.VERSAO = VERSAO;
  RF.telas = RF.telas || {};
  RF.h = RF.h || {};

  /* ------------------------------------------------------------------
     1. UTILIDADES E IDIOMA
     ------------------------------------------------------------------ */
  function idioma() {
    try { if (raiz.DGO && raiz.DGO.idioma) return raiz.DGO.idioma(); } catch (e) {}
    try { return raiz.localStorage.getItem(PREFIXO + 'idioma') || 'pt'; } catch (e2) { return 'pt'; }
  }
  /* T({pt,en}) ou T('pt','en') */
  function T(a, b) {
    if (a && typeof a === 'object') return a[idioma()] || a.pt || '';
    return idioma() === 'en' ? (b !== undefined ? b : a) : a;
  }
  function el(tag, props, filhos) {
    var n = d.createElement(tag);
    if (props) Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'texto') n.textContent = v;
      else if (k === 'class') n.className = v;
      else if (k === 'style' && typeof v === 'object') Object.keys(v).forEach(function (s) { n.style[s] = v[s]; });
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else if (k === 'valor') n.value = v;
      else if (v === true) n.setAttribute(k, '');
      else n.setAttribute(k, v);
    });
    if (filhos !== undefined && filhos !== null && !Array.isArray(filhos)) filhos = [filhos];
    (filhos || []).forEach(function (f) {
      if (f === null || f === undefined || f === false) return;
      n.appendChild(typeof f === 'string' || typeof f === 'number' ? d.createTextNode(String(f)) : f);
    });
    return n;
  }
  function limpar(n) { while (n && n.firstChild) n.removeChild(n.firstChild); return n; }
  function uid(p) {
    var a = new Uint8Array(8); raiz.crypto.getRandomValues(a);
    return (p || '') + Array.prototype.map.call(a, function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
  }
  function agora() { return new Date().toISOString(); }
  function dataFmt(v, comHora) {
    if (!v) return '—';
    try { if (raiz.DGO && raiz.DGO.formatarData) return raiz.DGO.formatarData(v, idioma(), comHora); } catch (e) {}
    var dt = new Date(v); if (isNaN(dt)) return String(v);
    var M = idioma() === 'en' ? ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
                              : ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    var dd = ('0' + dt.getDate()).slice(-2), s = idioma() === 'en' ? M[dt.getMonth()] + '/' + dd + '/' + dt.getFullYear()
                                                                     : dd + '/' + M[dt.getMonth()] + '/' + dt.getFullYear();
    if (comHora) s += ' ' + ('0' + dt.getHours()).slice(-2) + ':' + ('0' + dt.getMinutes()).slice(-2);
    return s;
  }
  function semAcento(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
  function distancia(a, b) {             /* Levenshtein curto, para sugerir termos */
    a = semAcento(a); b = semAcento(b);
    var m = [], i, j;
    for (i = 0; i <= b.length; i++) m[i] = [i];
    for (j = 0; j <= a.length; j++) m[0][j] = j;
    for (i = 1; i <= b.length; i++) for (j = 1; j <= a.length; j++) {
      m[i][j] = b.charAt(i - 1) === a.charAt(j - 1) ? m[i - 1][j - 1]
        : Math.min(m[i - 1][j - 1] + 1, m[i][j - 1] + 1, m[i - 1][j] + 1);
    }
    return m[b.length][a.length];
  }
  function mascararEmail(e) {
    e = String(e || ''); var p = e.split('@');
    if (p.length !== 2) return e ? '•••' : '';
    return p[0].slice(0, 2) + '•••@' + p[1];
  }
  function mascararTexto(s) {           /* antes de mandar para a IA */
    return String(s || '')
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[e-mail]')
      .replace(/\+?\d[\d\s().-]{7,}\d/g, '[número]')
      .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[CPF]');
  }
  function copiar(txt) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(txt);
    var t = el('textarea', { valor: txt }); d.body.appendChild(t); t.select();
    try { d.execCommand('copy'); } catch (e) {}
    d.body.removeChild(t); return Promise.resolve();
  }
  function baixar(nome, conteudo, tipo) {
    var blob = conteudo instanceof Blob ? conteudo : new Blob([conteudo], { type: tipo || 'application/octet-stream' });
    var a = el('a', { href: URL.createObjectURL(blob), download: nome });
    d.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  function clonar(o) { return o === undefined ? undefined : JSON.parse(JSON.stringify(o)); }
  function lerLocal(k, pad) {
    try { var v = raiz.localStorage.getItem(PREFIXO + k); return v === null ? pad : JSON.parse(v); } catch (e) { return pad; }
  }
  function gravarLocal(k, v) {
    try { raiz.localStorage.setItem(PREFIXO + k, JSON.stringify(v)); return true; } catch (e) { return false; }
  }
  function apagarLocal(k) { try { raiz.localStorage.removeItem(PREFIXO + k); } catch (e) {} }

  /* ------------------------------------------------------------------
     2. CRIPTOGRAFIA (WebCrypto)
     Uma chave de dados (DEK) aleatória cifra tudo. Ela fica guardada
     "embrulhada" várias vezes: pela senha, pelo PIN, pelo código de
     recuperação e por uma chave presa a este aparelho (usada com a
     digital). Errar a senha = a embrulhada não abre = acesso negado.
     ------------------------------------------------------------------ */
  var sub = raiz.crypto && raiz.crypto.subtle;
  var ITER = 310000;
  function b64(buf) {
    var s = '', a = new Uint8Array(buf), i;
    for (i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function deB64(s) {
    var bin = atob(s), a = new Uint8Array(bin.length), i;
    for (i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return a;
  }
  function aleatorio(n) { var a = new Uint8Array(n); raiz.crypto.getRandomValues(a); return a; }
  function derivar(segredo, saltB64) {
    var salt = saltB64 ? deB64(saltB64) : aleatorio(16);
    return sub.importKey('raw', new TextEncoder().encode(String(segredo)), 'PBKDF2', false, ['deriveKey'])
      .then(function (base) {
        return sub.deriveKey({ name: 'PBKDF2', salt: salt, iterations: ITER, hash: 'SHA-256' },
          base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
      }).then(function (k) { return { chave: k, salt: b64(salt) }; });
  }
  function cifrarBytes(chave, bytes) {
    var iv = aleatorio(12);
    return sub.encrypt({ name: 'AES-GCM', iv: iv }, chave, bytes)
      .then(function (ct) { return { iv: b64(iv), ct: b64(ct) }; });
  }
  function decifrarBytes(chave, pac) {
    return sub.decrypt({ name: 'AES-GCM', iv: deB64(pac.iv) }, chave, deB64(pac.ct))
      .then(function (pt) { return new Uint8Array(pt); });
  }
  /* embrulhar a DEK com um segredo (senha, PIN, código) */
  function embrulhar(dekBruta, segredo) {
    return derivar(segredo).then(function (r) {
      return cifrarBytes(r.chave, dekBruta).then(function (p) { p.salt = r.salt; return p; });
    });
  }
  function desembrulhar(pac, segredo) {
    return derivar(segredo, pac.salt).then(function (r) { return decifrarBytes(r.chave, pac); });
  }
  function importarDEK(bruta) {
    return sub.importKey('raw', bruta, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  }
  function sha256(txt) {
    return sub.digest('SHA-256', new TextEncoder().encode(txt)).then(function (h) {
      return Array.prototype.map.call(new Uint8Array(h), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
    });
  }
  function gerarCodigo() {       /* código de recuperação: 4 blocos de 4, sem letras confusas */
    var A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', a = aleatorio(16), s = '';
    for (var i = 0; i < 16; i++) { s += A.charAt(a[i] % A.length); if (i % 4 === 3 && i < 15) s += '-'; }
    return s;
  }

  /* chave presa ao aparelho (não exportável), guardada no IndexedDB */
  var Aparelho = {
    abrir: function () {
      return new Promise(function (ok, erro) {
        var r = raiz.indexedDB.open('rootify-one', 1);
        r.onupgradeneeded = function () { r.result.createObjectStore('chaves'); };
        r.onsuccess = function () { ok(r.result); };
        r.onerror = function () { erro(r.error); };
      });
    },
    chave: function (criar) {
      return Aparelho.abrir().then(function (db) {
        return new Promise(function (ok, erro) {
          var tx = db.transaction('chaves', 'readonly').objectStore('chaves').get('aparelho');
          tx.onsuccess = function () {
            if (tx.result || !criar) return ok(tx.result || null);
            sub.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']).then(function (k) {
              var w = db.transaction('chaves', 'readwrite').objectStore('chaves').put(k, 'aparelho');
              w.onsuccess = function () { ok(k); };
              w.onerror = function () { erro(w.error); };
            }, erro);
          };
          tx.onerror = function () { erro(tx.error); };
        });
      });
    }
  };

  /* Continuar a sessão ao recarregar a página (F5).
     A chave de dados é embrulhada por uma chave de sessão NÃO exportável,
     guardada no IndexedDB; o pacote embrulhado fica no sessionStorage,
     que é desta aba só e some quando a aba é fechada. Vale até o prazo do
     bloqueio automático; bloquear ou sair apaga as duas partes. */
  var Continuidade = {
    NOME: 'rootify:v1:sessao',
    _chave: function (criar) {
      return Aparelho.abrir().then(function (db) {
        return new Promise(function (ok, erro) {
          if (criar) {
            sub.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']).then(function (k) {
              var w = db.transaction('chaves', 'readwrite').objectStore('chaves').put(k, 'sessao');
              w.onsuccess = function () { ok(k); }; w.onerror = function () { erro(w.error); };
            }, erro);
          } else {
            var r = db.transaction('chaves', 'readonly').objectStore('chaves').get('sessao');
            r.onsuccess = function () { ok(r.result || null); }; r.onerror = function () { erro(r.error); };
          }
        });
      });
    },
    ler: function () { try { return JSON.parse(raiz.sessionStorage.getItem(Continuidade.NOME) || 'null'); } catch (e) { return null; } },
    gravar: function (o) { try { raiz.sessionStorage.setItem(Continuidade.NOME, JSON.stringify(o)); } catch (e) {} },
    prazo: function () {
      var min = Sessao.minutosBloqueio();
      return agoraMs() + (min > 0 ? min : 12 * 60) * 60000;     /* "nunca bloquear": no máximo 12 h */
    },
    guardar: function (pessoa, metodo) {
      if (!Cofre.dekBruta || !raiz.sessionStorage) return Promise.resolve();
      return Continuidade._chave(true).then(function (k) { return cifrarBytes(k, Cofre.dekBruta); }).then(function (pac) {
        Continuidade.gravar({ pessoa: pessoa.id, metodo: metodo, pac: pac, ate: Continuidade.prazo() });
      }).catch(function () {});
    },
    renovar: function () {
      var o = Continuidade.ler();
      if (!o || agoraMs() - (Continuidade._ult || 0) < 20000) return;
      Continuidade._ult = agoraMs(); o.ate = Continuidade.prazo(); Continuidade.gravar(o);
    },
    apagar: function () {
      try { raiz.sessionStorage.removeItem(Continuidade.NOME); } catch (e) {}
      return Aparelho.abrir().then(function (db) {
        return new Promise(function (ok) {
          var t = db.transaction('chaves', 'readwrite').objectStore('chaves').delete('sessao');
          t.onsuccess = t.onerror = function () { ok(); };
        });
      }).catch(function () {});
    },
    /* devolve a pessoa se deu para continuar; senão, null */
    retomar: function () {
      var o = Continuidade.ler();
      if (!o) return Promise.resolve(null);
      if (!o.ate || o.ate < agoraMs()) { return Continuidade.apagar().then(function () { return null; }); }
      var pessoa = Cofre.pessoa(o.pessoa);
      if (!pessoa || !pessoa.ativo || pessoa.trocarSenha) { return Continuidade.apagar().then(function () { return null; }); }
      return Continuidade._chave(false).then(function (k) {
        if (!k) throw new Error('sem-chave');
        return decifrarBytes(k, o.pac);
      }).then(function (bruta) {
        return Cofre.abrirCom(bruta).then(function () {
          Sessao.iniciar(Cofre.pessoa(pessoa.id), o.metodo || 'sessao', true);
          return Cofre.pessoa(pessoa.id);
        });
      }).catch(function () { return Continuidade.apagar().then(function () { return null; }); });
    }
  };
  function agoraMs() { return Date.now(); }

  /* ------------------------------------------------------------------
     3. COFRE
     Equipe (fora do cofre, porque é lida antes de entrar): só dados de
     acesso — nome, papel e as DEKs embrulhadas. Nenhuma senha.
     Coleções (dentro do cofre, cifradas): todo o resto.
     ------------------------------------------------------------------ */
  var COLECOES = ['apps', 'planos', 'servicos', 'usuarios', 'segmentos', 'chamados', 'kb', 'termos', 'recados',
    'anuncios', 'versoes', 'papeis', 'automacoes', 'custos', 'pedidos', 'ropa', 'incidentes', 'consentimentos',
    'log', 'config', 'publicacoes', 'respostas'];

  var Cofre = {
    dek: null,          /* CryptoKey — só em memória, some ao bloquear */
    dekBruta: null,     /* bytes — para embrulhar de novo (novo PIN, nova pessoa) */
    db: {},
    equipe: function () { return lerLocal('equipe', []); },
    gravarEquipe: function (lista) { gravarLocal('equipe', lista); },
    pessoa: function (idOuEmail) {
      var x = String(idOuEmail || '').toLowerCase();
      return Cofre.equipe().filter(function (p) {
        return p.id === idOuEmail || p.email === x || String(p.apelido || '').toLowerCase() === x;
      })[0] || null;
    },
    atualizarPessoa: function (id, fn) {
      var lista = Cofre.equipe();
      lista.forEach(function (p) { if (p.id === id) fn(p); });
      Cofre.gravarEquipe(lista);
      var nova = lista.filter(function (p) { return p.id === id; })[0];
      /* a sessão guarda uma cópia da pessoa: mantém em dia */
      if (Sessao.pessoa && Sessao.pessoa.id === id) Sessao.pessoa = nova;
      return nova;
    },
    aberto: function () { return !!Cofre.dek; },

    abrirCom: function (bruta) {
      return importarDEK(bruta).then(function (k) {
        Cofre.dek = k; Cofre.dekBruta = bruta;
        return Cofre.carregarTudo();
      });
    },
    carregarTudo: function () {
      var promessas = COLECOES.map(function (nome) {
        var pac = lerLocal('c:' + nome, null);
        if (!pac) { Cofre.db[nome] = null; return Promise.resolve(); }
        return decifrarBytes(Cofre.dek, pac).then(function (b) {
          Cofre.db[nome] = JSON.parse(new TextDecoder().decode(b));
        });
      });
      return Promise.all(promessas);
    },
    fechar: function () { Cofre.dek = null; Cofre.dekBruta = null; Cofre.db = {}; },

    /* leitura e escrita das coleções */
    lista: function (nome) { if (!Cofre.db[nome]) Cofre.db[nome] = []; return Cofre.db[nome]; },
    obj: function (nome) { if (!Cofre.db[nome] || Array.isArray(Cofre.db[nome])) Cofre.db[nome] = Cofre.db[nome] || {}; return Cofre.db[nome]; },
    _filas: {},
    salvar: function (nome) {
      if (!Cofre.dek) return Promise.reject(new Error('cofre-fechado'));
      var anterior = Cofre._filas[nome] || Promise.resolve();
      var dados = new TextEncoder().encode(JSON.stringify(Cofre.db[nome]));
      var p = anterior.then(function () { return cifrarBytes(Cofre.dek, dados); }).then(function (pac) {
        if (!gravarLocal('c:' + nome, pac)) {
          RF.ui.aviso(T('O armazenamento deste navegador está cheio. Faça uma cópia de segurança e limpe dados de exemplo.',
                        'This browser\'s storage is full. Make a backup and clear sample data.'), 'erro');
          throw new Error('cheio');
        }
      });
      Cofre._filas[nome] = p.catch(function () {});
      return p;
    },
    salvarTudo: function () { return Promise.all(COLECOES.map(function (n) { return Cofre.db[n] ? Cofre.salvar(n) : null; })); },

    /* credenciais de uma pessoa da equipe */
    criarCredenciais: function (senha) {
      var codigo = gerarCodigo();
      return Promise.all([embrulhar(Cofre.dekBruta, senha), embrulhar(Cofre.dekBruta, codigo.replace(/-/g, ''))])
        .then(function (r) { return { cred: { senha: r[0], recuperacao: r[1] }, codigo: codigo }; });
    }
  };

  /* primeira instalação: cria a DEK e a conta do dono */
  function instalar(dados) {
    var bruta = aleatorio(32);
    Cofre.dekBruta = bruta;
    return Cofre.criarCredenciais(dados.senha).then(function (r) {
      var dono = {
        id: uid('p-'), nome: dados.nome, apelido: dados.apelido, email: String(dados.email).toLowerCase(),
        papel: 'super-admin', apps: ['*'], ativo: true, criadaEm: agora(), trocarSenha: false,
        cred: r.cred, falhasPin: 0
      };
      Cofre.gravarEquipe([dono]);
      return Cofre.abrirCom(bruta).then(function () {
        RF.dados.semear();
        return Cofre.salvarTudo();
      }).then(function () {
        Sessao.iniciar(dono, 'senha');
        return Log.registrar('seguranca', 'instalar', dono.email, null, null,
          T('RootifyONE instalado neste aparelho; conta do dono criada.', 'RootifyONE installed on this device; owner account created.'))
          .then(function () { return { pessoa: dono, codigo: r.codigo }; });
      });
    });
  }

  /* entrar: por senha, PIN, código ou aparelho (digital) */
  function registrarTentativa(email, metodo, ok) {
    var p = lerLocal('tentativas', []);
    p.push({ quando: agora(), email: email, metodo: metodo, ok: ok });
    if (p.length > 200) p = p.slice(-200);
    gravarLocal('tentativas', p);
  }
  function entrar(identificador, segredo, metodo) {
    var pessoa = Cofre.pessoa(identificador);
    if (!pessoa) { registrarTentativa(identificador, metodo, false); return Promise.reject(new Error('sem-conta')); }
    if (!pessoa.ativo) return Promise.reject(new Error('desativada'));
    var pac = metodo === 'pin' ? pessoa.cred.pin : metodo === 'codigo' ? pessoa.cred.recuperacao : pessoa.cred.senha;
    if (!pac) return Promise.reject(new Error('sem-metodo'));
    if (metodo === 'pin' && (pessoa.falhasPin || 0) >= 5) return Promise.reject(new Error('pin-travado'));
    var seg = metodo === 'codigo' ? String(segredo).toUpperCase().replace(/[^A-Z0-9]/g, '') : segredo;
    return desembrulhar(pac, seg).then(function (bruta) {
      Cofre.atualizarPessoa(pessoa.id, function (p) { p.falhasPin = 0; p.ultimoAcesso = agora(); });
      registrarTentativa(pessoa.email, metodo, true);
      return Cofre.abrirCom(bruta).then(function () {
        Sessao.iniciar(Cofre.pessoa(pessoa.id), metodo);
        return absorverTentativas().then(function () {
          return Log.registrar('seguranca', 'entrar', pessoa.email, null, null, T('Entrou por ', 'Signed in with ') + metodo);
        }).then(function () { return Cofre.pessoa(pessoa.id); });
      });
    }, function () {
      if (metodo === 'pin') Cofre.atualizarPessoa(pessoa.id, function (p) { p.falhasPin = (p.falhasPin || 0) + 1; });
      registrarTentativa(pessoa.email, metodo, false);
      throw new Error('errado');
    });
  }
  function absorverTentativas() {
    var p = lerLocal('tentativas', []), falhas = p.filter(function (x) { return !x.ok; });
    apagarLocal('tentativas');
    if (!falhas.length) return Promise.resolve();
    return Log.registrar('seguranca', 'tentativas-falhas', '', null, falhas,
      falhas.length + T(' tentativa(s) de acesso errada(s) desde o último acesso.', ' failed sign-in attempt(s) since the last access.'));
  }

  /* digital / rosto: WebAuthn como porteiro + chave do aparelho */
  var Digital = {
    disponivel: function () {
      if (!raiz.PublicKeyCredential || !raiz.isSecureContext) return Promise.resolve(false);
      return raiz.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().catch(function () { return false; });
    },
    registrar: function (pessoa) {
      return navigator.credentials.create({ publicKey: {
        challenge: aleatorio(32), rp: { name: 'RootifyONE' },
        user: { id: aleatorio(16), name: pessoa.email, displayName: pessoa.nome || pessoa.email },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
        timeout: 60000, attestation: 'none'
      } }).then(function (cred) {
        return Aparelho.chave(true).then(function (k) { return cifrarBytes(k, Cofre.dekBruta); }).then(function (pac) {
          Cofre.atualizarPessoa(pessoa.id, function (p) { p.cred.aparelho = pac; p.cred.webauthn = b64(cred.rawId); });
          return true;
        });
      });
    },
    entrar: function (pessoa) {
      if (!pessoa.cred.aparelho || !pessoa.cred.webauthn) return Promise.reject(new Error('sem-digital'));
      return navigator.credentials.get({ publicKey: {
        challenge: aleatorio(32), userVerification: 'required', timeout: 60000,
        allowCredentials: [{ type: 'public-key', id: deB64(pessoa.cred.webauthn) }]
      } }).then(function () {
        return Aparelho.chave(false);
      }).then(function (k) {
        if (!k) throw new Error('sem-chave-aparelho');
        return decifrarBytes(k, pessoa.cred.aparelho);
      }).then(function (bruta) {
        Cofre.atualizarPessoa(pessoa.id, function (p) { p.ultimoAcesso = agora(); p.falhasPin = 0; });
        return Cofre.abrirCom(bruta).then(function () {
          Sessao.iniciar(Cofre.pessoa(pessoa.id), 'digital');
          return absorverTentativas().then(function () {
            return Log.registrar('seguranca', 'entrar', pessoa.email, null, null, T('Entrou com a digital', 'Signed in with fingerprint'));
          });
        });
      });
    },
    remover: function (pessoa) {
      Cofre.atualizarPessoa(pessoa.id, function (p) { delete p.cred.aparelho; delete p.cred.webauthn; });
    }
  };

  function definirPin(pessoa, pin) {
    return embrulhar(Cofre.dekBruta, pin).then(function (pac) {
      Cofre.atualizarPessoa(pessoa.id, function (p) { p.cred.pin = pac; p.falhasPin = 0; });
    });
  }
  function trocarSenha(pessoa, nova) {
    return Promise.all([embrulhar(Cofre.dekBruta, nova)]).then(function (r) {
      Cofre.atualizarPessoa(pessoa.id, function (p) { p.cred.senha = r[0]; p.trocarSenha = false; });
    });
  }
  function novoCodigo(pessoa) {
    var codigo = gerarCodigo();
    return embrulhar(Cofre.dekBruta, codigo.replace(/-/g, '')).then(function (pac) {
      Cofre.atualizarPessoa(pessoa.id, function (p) { p.cred.recuperacao = pac; });
      return codigo;
    });
  }

  /* ------------------------------------------------------------------
     4. SESSÃO E PERMISSÕES
     ------------------------------------------------------------------ */
  var Sessao = {
    pessoa: null, metodo: null, simular: null, _timer: null,
    iniciar: function (pessoa, metodo, retomada) {
      Sessao.pessoa = pessoa; Sessao.metodo = metodo; Sessao.simular = null;
      gravarLocal('ultima', pessoa.email);
      Sessao.vigiar();
      if (!retomada) Continuidade.guardar(pessoa, metodo);
    },
    minutosBloqueio: function () {
      var c = Cofre.db.config || {}; return c.bloqueioMin === 0 ? 0 : (c.bloqueioMin || 15);
    },
    vigiar: function () {
      var reiniciar = function () {
        if (!Sessao.pessoa) return;
        clearTimeout(Sessao._timer);
        var min = Sessao.minutosBloqueio();
        if (min > 0) Sessao._timer = setTimeout(function () { Sessao.bloquear(); }, min * 60000);
        Continuidade.renovar();
      };
      if (!Sessao._ouvindo) {
        ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(function (ev) {
          d.addEventListener(ev, reiniciar, { passive: true });
        });
        Sessao._ouvindo = true;
      }
      reiniciar();
    },
    bloquear: function () {
      if (!Sessao.pessoa) return;
      var quem = Sessao.pessoa;
      Log.registrar('seguranca', 'bloquear', quem.email, null, null, T('Tela bloqueada', 'Screen locked')).then(function () {
        clearTimeout(Sessao._timer);
        Continuidade.apagar();
        Cofre.fechar(); Sessao.pessoa = null; Sessao.simular = null;
        RF.emitir('bloqueado', { pessoa: quem });
      });
    },
    sair: function () {
      if (!Sessao.pessoa) return;
      var quem = Sessao.pessoa;
      Log.registrar('seguranca', 'sair', quem.email, null, null, T('Saiu', 'Signed out')).then(function () {
        clearTimeout(Sessao._timer);
        Continuidade.apagar();
        Cofre.fechar(); Sessao.pessoa = null; Sessao.simular = null;
        RF.emitir('saiu', { pessoa: quem });
      });
    },
    /* papel efetivo: o do simulador (só o dono usa) ou o da pessoa */
    papelId: function () {
      if (!Sessao.pessoa) return null;
      return (Sessao.simular && Sessao.simular.papel) || Sessao.pessoa.papel;
    },
    apps: function () {
      if (!Sessao.pessoa) return [];
      return (Sessao.simular && Sessao.simular.apps) || Sessao.pessoa.apps || ['*'];
    }
  };

  var Papeis = {
    todos: function () {
      var custom = (Cofre.db.papeis || []);
      var base = RF.cat.PAPEIS.map(function (p) {
        var ajuste = custom.filter(function (c) { return c.id === p.id; })[0];
        var x = clonar(p);
        if (ajuste && !p.sistema) { x.permissoes = ajuste.permissoes; x.ajustado = true; }
        return x;
      });
      custom.filter(function (c) { return c.proprio; }).forEach(function (c) { base.push(clonar(c)); });
      return base;
    },
    achar: function (id) { return Papeis.todos().filter(function (p) { return p.id === id; })[0] || null; }
  };

  /* pode('usuarios:editar', 'moneytrio') */
  function pode(perm, app) {
    if (!Sessao.pessoa) return false;
    var papel = Papeis.achar(Sessao.papelId());
    if (!papel) return false;
    var tem = papel.permissoes.indexOf('*') !== -1 || papel.permissoes.indexOf(perm) !== -1;
    if (!tem) return false;
    if (app && app !== '*' && papel.escopoPorApp) {
      var apps = Sessao.apps();
      if (apps.indexOf('*') === -1 && apps.indexOf(app) === -1) return false;
    }
    return true;
  }
  /* o app está no escopo desta pessoa? (para filtrar listas) */
  function noEscopo(app) {
    var papel = Papeis.achar(Sessao.papelId());
    if (!papel || !papel.escopoPorApp) return true;
    var apps = Sessao.apps();
    return apps.indexOf('*') !== -1 || !app || app === '*' || apps.indexOf(app) !== -1;
  }
  function ehDono() { return !!Sessao.pessoa && Sessao.pessoa.papel === 'super-admin'; }

  /* ------------------------------------------------------------------
     5. LOG DE AUDITORIA ENCADEADO
     Cada registro guarda o "carimbo" (hash) do anterior. Se alguém
     apagar ou mudar um registro, a corrente quebra e a tela mostra.
     ------------------------------------------------------------------ */
  var Log = {
    _fila: Promise.resolve(),
    registrar: function (modulo, acao, alvo, antes, depois, resumo) {
      var job = Log._fila.then(function () {
        if (!Cofre.aberto()) return null;
        var lista = Cofre.lista('log');
        var ultimo = lista[lista.length - 1];
        var e = {
          id: uid('L'), quando: agora(),
          quem: Sessao.pessoa ? Sessao.pessoa.email : '—',
          papel: Sessao.pessoa ? Sessao.papelId() : '—',
          simulando: !!(Sessao.simular && Sessao.simular.papel),
          modulo: modulo, acao: acao, alvo: alvo || '', resumo: resumo || '',
          antes: antes === undefined ? null : clonar(antes), depois: depois === undefined ? null : clonar(depois),
          anterior: ultimo ? ultimo.hash : (Cofre.obj('config').logBase || 'inicio')
        };
        return sha256(JSON.stringify(e)).then(function (h) {
          e.hash = h; lista.push(e);
          /* limite: guarda os 5.000 mais novos e anota o carimbo de onde cortou */
          if (lista.length > 5000) {
            var cortados = lista.splice(0, lista.length - 5000);
            Cofre.obj('config').logBase = cortados[cortados.length - 1].hash;
            Cofre.salvar('config');
          }
          return Cofre.salvar('log').then(function () { RF.emitir('log', e); return e; });
        });
      });
      Log._fila = job.catch(function () {});
      return job;
    },
    verificar: function () {
      var lista = Cofre.lista('log'), base = Cofre.obj('config').logBase || 'inicio';
      var i = 0, anterior = base;
      function prox() {
        if (i >= lista.length) return Promise.resolve({ ok: true, total: lista.length });
        var e = lista[i];
        if (e.anterior !== anterior) return Promise.resolve({ ok: false, posicao: i, registro: e });
        var copia = clonar(e); delete copia.hash;
        return sha256(JSON.stringify(copia)).then(function (h) {
          if (h !== e.hash) return { ok: false, posicao: i, registro: e };
          anterior = e.hash; i++; return prox();
        });
      }
      return prox();
    }
  };

  /* atalho usado pelas telas: grava a coleção + log numa tacada */
  function mudar(colecao, modulo, acao, alvo, antes, depois, resumo) {
    return Cofre.salvar(colecao).then(function () {
      return Log.registrar(modulo, acao, alvo, antes, depois, resumo);
    });
  }

  /* ------------------------------------------------------------------
     6. EVENTOS
     ------------------------------------------------------------------ */
  var ouvintes = {};
  RF.on = function (ev, fn) { (ouvintes[ev] = ouvintes[ev] || []).push(fn); };
  RF.emitir = function (ev, dados) {
    (ouvintes[ev] || []).forEach(function (fn) { try { fn(dados); } catch (e) { if (raiz.console) console.error(e); } });
  };

  /* ------------------------------------------------------------------
     7. COMPONENTES DE TELA
     ------------------------------------------------------------------ */
  var ui = {};

  ui.aviso = function (texto, tipo) {
    var zona = d.getElementById('rf-avisos');
    if (!zona) { zona = el('div', { id: 'rf-avisos', 'aria-live': 'polite' }); d.body.appendChild(zona); }
    var n = el('div', { class: 'rf-aviso rf-aviso-' + (tipo || 'ok'), role: tipo === 'erro' ? 'alert' : 'status' }, [texto]);
    zona.appendChild(n);
    setTimeout(function () { n.classList.add('rf-sai'); setTimeout(function () { n.remove(); }, 400); }, tipo === 'erro' ? 6000 : 3500);
  };

  /* modal acessível; entra no histórico para o Voltar do celular fechar */
  var pilha = [];
  ui.modal = function (titulo, corpo, opcoes) {
    opcoes = opcoes || {};
    var fundo = el('div', { class: 'rf-modal-fundo' });
    var caixa = el('div', { class: 'rf-modal' + (opcoes.largo ? ' rf-modal-largo' : ''), role: 'dialog', 'aria-modal': 'true',
      'aria-labelledby': 'rf-mt-' + pilha.length });
    var fechar = el('button', { class: 'rf-x', type: 'button', 'aria-label': T('Fechar', 'Close'), texto: '✕' });
    var cab = el('div', { class: 'rf-modal-cab' }, [el('h2', { id: 'rf-mt-' + pilha.length, texto: titulo }), fechar]);
    var miolo = el('div', { class: 'rf-modal-miolo' }, [corpo]);
    caixa.appendChild(cab); caixa.appendChild(miolo);
    if (opcoes.rodape) caixa.appendChild(el('div', { class: 'rf-modal-rodape' }, opcoes.rodape));
    fundo.appendChild(caixa); d.body.appendChild(fundo);
    var anterior = d.activeElement;
    var reg = { fundo: fundo, anterior: anterior, aoFechar: opcoes.aoFechar };
    pilha.push(reg);
    try { raiz.history.pushState({ rfModal: pilha.length }, ''); } catch (e) {}
    function tentarFechar() {
      if (opcoes.antesDeFechar && opcoes.antesDeFechar() === false) return;
      ui.fecharModal();
    }
    fechar.onclick = tentarFechar;
    fundo.addEventListener('mousedown', function (e) { if (e.target === fundo) tentarFechar(); });
    fundo.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.stopPropagation(); tentarFechar(); }
      if (e.key === 'Tab') {            /* o foco não foge do modal */
        var f = caixa.querySelectorAll('button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        if (e.shiftKey && d.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && d.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });
    setTimeout(function () {
      var alvo = caixa.querySelector('[autofocus]') || caixa.querySelector('input,select,textarea') || fechar;
      alvo.focus();
    }, 30);
    reg.tentarFechar = tentarFechar;
    return { caixa: caixa, miolo: miolo, fechar: function () { ui.fecharModal(); } };
  };
  ui.fecharModal = function (peloVoltar) {
    var reg = pilha.pop();
    if (!reg) return;
    reg.fundo.remove();
    if (reg.anterior && reg.anterior.focus) try { reg.anterior.focus(); } catch (e) {}
    if (!peloVoltar) { ui._ignorarPop = true; try { raiz.history.back(); } catch (e2) {} }
    if (reg.aoFechar) reg.aoFechar();
  };
  ui.modaisAbertos = function () { return pilha.length; };
  raiz.addEventListener('popstate', function () {
    if (ui._ignorarPop) { ui._ignorarPop = false; return; }
    /* sem modal aberto, quem cuida da troca de tela é o hashchange */
    if (pilha.length) ui.fecharModal(true);
  });
  /* fechar o modal e só então trocar de tela (o Voltar continua certo) */
  /* Voltar n passos no histórico e SÓ DEPOIS fazer algo. O history.go é
     assíncrono: trocar de tela antes de ele terminar faz o navegador
     "desfazer" a troca (a tela nova pisca e some). Por isso espera o
     popstate, com um prazo de reserva caso ele não chegue. */
  ui.voltarEDepois = function (n, depois) {
    var feito = false;
    function seguir() {
      if (feito) return; feito = true;
      raiz.removeEventListener('popstate', seguir);
      setTimeout(depois, 0);
    }
    raiz.addEventListener('popstate', seguir);
    ui._ignorarPop = true;
    try { raiz.history.go(-n); } catch (e) { ui._ignorarPop = false; seguir(); return; }
    setTimeout(function () { if (!feito) { ui._ignorarPop = false; seguir(); } }, 500);
  };
  ui.fecharEIr = function (modulo, sub, id) {
    var n = pilha.length;
    if (!n) { RF.Rota.ir(modulo, sub, id); return; }
    while (pilha.length) { pilha.pop().fundo.remove(); }
    ui.voltarEDepois(n, function () { RF.Rota.ir(modulo, sub, id); });
  };

  ui.confirmar = function (titulo, texto, opcoes) {
    opcoes = opcoes || {};
    return new Promise(function (ok) {
      var decidido = false;
      var campo = opcoes.digitar ? el('input', { class: 'rf-in', type: 'text', autocomplete: 'off', 'aria-label': opcoes.digitarRotulo || '' }) : null;
      var motivo = opcoes.motivo ? el('textarea', { class: 'rf-in', rows: 2, 'aria-label': T('Motivo', 'Reason') }) : null;
      var corpo = el('div', {}, [
        el('p', { texto: texto }),
        opcoes.motivo ? el('label', { class: 'rf-campo' }, [el('span', { texto: T('Motivo (fica no log)', 'Reason (goes to the log)') }), motivo]) : null,
        campo ? el('label', { class: 'rf-campo' }, [el('span', { texto: opcoes.digitarRotulo }), campo]) : null
      ]);
      var sim = el('button', { class: 'rf-b ' + (opcoes.perigo ? 'rf-b-perigo' : 'rf-b-pri'), type: 'button', texto: opcoes.sim || T('Confirmar', 'Confirm') });
      var nao = el('button', { class: 'rf-b', type: 'button', texto: T('Cancelar', 'Cancel') });
      var m = ui.modal(titulo, corpo, { rodape: [nao, sim], aoFechar: function () { if (!decidido) ok(false); } });
      nao.onclick = function () { m.fechar(); };
      sim.onclick = function () {
        if (campo && semAcento(campo.value.trim()) !== semAcento(opcoes.digitar)) {
          ui.aviso(T('O texto digitado não confere.', 'The typed text does not match.'), 'erro'); campo.focus(); return;
        }
        if (motivo && !motivo.value.trim()) { ui.aviso(T('Escreva o motivo.', 'Write the reason.'), 'erro'); motivo.focus(); return; }
        decidido = true; m.fechar(); ok(motivo ? { motivo: motivo.value.trim() } : true);
      };
    });
  };

  /* campos de formulário */
  ui.campo = function (rotulo, input, dica) {
    return el('label', { class: 'rf-campo' }, [el('span', { texto: rotulo }), input, dica ? el('small', { class: 'rf-dica', texto: dica }) : null]);
  };
  ui.entrada = function (valor, props) {
    var p = props || {};
    var n = el(p.linhas ? 'textarea' : 'input', Object.assign({ class: 'rf-in' }, p.linhas ? { rows: p.linhas } : { type: p.tipo || 'text' },
      p.attrs || {}));
    n.value = valor === undefined || valor === null ? '' : valor;
    return n;
  };
  ui.escolha = function (opcoes, valor, props) {
    var s = el('select', Object.assign({ class: 'rf-in' }, props || {}));
    opcoes.forEach(function (o) {
      var op = el('option', { value: o[0], texto: o[1] });
      if (String(o[0]) === String(valor)) op.selected = true;
      s.appendChild(op);
    });
    return s;
  };
  ui.marca = function (rotulo, marcado, props) {
    var c = el('input', Object.assign({ type: 'checkbox' }, props || {}));
    c.checked = !!marcado;
    return el('label', { class: 'rf-marca' }, [c, el('span', { texto: rotulo })]);
  };
  /* par de campos PT e EN — todo texto nasce nas duas línguas */
  ui.bilingue = function (rotulo, valor, props) {
    valor = valor || {};
    var pt = ui.entrada(valor.pt, props), en = ui.entrada(valor.en, props);
    var bloco = el('fieldset', { class: 'rf-bilingue' }, [
      el('legend', { texto: rotulo }),
      el('label', { class: 'rf-campo' }, [el('span', { class: 'rf-lng', texto: 'PT' }), pt]),
      el('label', { class: 'rf-campo' }, [el('span', { class: 'rf-lng', texto: 'EN' }), en])
    ]);
    bloco.valor = function () { return { pt: pt.value.trim(), en: en.value.trim() }; };
    return bloco;
  };

  ui.selo = function (texto, tipo) { return el('span', { class: 'rf-selo rf-selo-' + (tipo || 'neutro'), texto: texto }); };
  ui.seloEstado = function (estado) {
    var M = {
      ativo: [T('ativo', 'live'), 'ok'], parcial: [T('parcial', 'partial'), 'atencao'],
      futuro: [T('futuro', 'future'), 'cinza'], especificar: [T('a especificar', 'needs spec'), 'cinza']
    };
    var m = M[estado] || [estado, 'neutro'];
    return ui.selo(m[0], m[1]);
  };

  /* bloco em cinza: função desenhada que ainda não pode ser usada */
  ui.cinza = function (funcaoId, conteudo) {
    var f = RF.cat.funcao(funcaoId);
    if (!f) return conteudo || null;
    if (f.estado === 'ativo') return conteudo || null;
    var fase = { 1: T('fase 1 · sem servidor', 'phase 1 · no server'), 2: T('fase 2 · Firebase', 'phase 2 · Firebase'),
                 3: T('fase 3 · cobrança', 'phase 3 · billing') }[f.fase] || '';
    var caixa = el('div', { class: 'rf-cinza' + (f.estado === 'parcial' ? ' rf-cinza-parcial' : ''), 'aria-disabled': f.estado === 'parcial' ? null : 'true' }, [
      el('div', { class: 'rf-cinza-cab' }, [el('strong', { texto: T(f.nome) }), ui.seloEstado(f.estado), fase ? ui.selo(fase, 'neutro') : null]),
      f.falta ? el('p', { class: 'rf-cinza-falta' }, [el('b', { texto: f.estado === 'especificar' ? T('Falta especificar: ', 'Needs a spec: ') : T('Depende de: ', 'Depends on: ') }), T(f.falta)]) : null,
      conteudo ? el('div', { class: 'rf-cinza-miolo', inert: f.estado === 'parcial' ? null : true }, [conteudo]) : null
    ]);
    return caixa;
  };
  /* botão em cinza com explicação ao tocar */
  ui.botaoCinza = function (rotulo, funcaoId) {
    var f = RF.cat.funcao(funcaoId);
    var b = el('button', { class: 'rf-b rf-b-cinza', type: 'button', 'aria-disabled': 'true',
      title: f && f.falta ? T(f.falta) : T('Ainda não disponível', 'Not available yet') }, [rotulo, ' ', el('span', { class: 'rf-cadeado', 'aria-hidden': 'true', texto: '◌' })]);
    b.onclick = function () {
      ui.aviso((f ? T(f.nome) + ' — ' : '') + (f && f.falta ? T(f.falta) : T('Ainda não disponível.', 'Not available yet.')), 'info');
    };
    return b;
  };

  /* abas */
  ui.abas = function (itens, ativa, aoTrocar) {
    var barra = el('div', { class: 'rf-abas', role: 'tablist' });
    itens.forEach(function (it) {
      var b = el('button', { class: 'rf-aba' + (it.id === ativa ? ' rf-ativa' : ''), role: 'tab', type: 'button',
        'aria-selected': it.id === ativa ? 'true' : 'false' }, [it.nome, it.conta !== undefined ? el('span', { class: 'rf-conta', texto: String(it.conta) }) : null]);
      b.onclick = function () { aoTrocar(it.id); };
      barra.appendChild(b);
    });
    return barra;
  };

  /* tabela com cabeçalho fixo, ordenação e páginas */
  ui.tabela = function (colunas, linhas, opcoes) {
    opcoes = opcoes || {};
    var estado = { ordem: opcoes.ordem || null, dir: opcoes.dir || 1, pagina: 0, porPagina: opcoes.porPagina || 25 };
    var raizT = el('div', { class: 'rf-tabela-bloco' });
    function desenhar() {
      limpar(raizT);
      if (!linhas.length) {
        raizT.appendChild(el('div', { class: 'rf-vazio' }, [el('p', { texto: opcoes.vazio || T('Nada por aqui ainda.', 'Nothing here yet.') }), opcoes.acaoVazia || null]));
        return;
      }
      var ordenadas = linhas.slice();
      if (estado.ordem) {
        var col = colunas.filter(function (c) { return c.id === estado.ordem; })[0];
        var chave = col && (col.ordenar || col.valor);
        if (chave) ordenadas.sort(function (a, b) {
          var x = chave(a), y = chave(b);
          x = x === null || x === undefined ? '' : x; y = y === null || y === undefined ? '' : y;
          return (typeof x === 'number' && typeof y === 'number' ? x - y : semAcento(x).localeCompare(semAcento(y))) * estado.dir;
        });
      }
      var total = ordenadas.length, paginas = Math.ceil(total / estado.porPagina);
      if (estado.pagina >= paginas) estado.pagina = Math.max(0, paginas - 1);
      var fatia = ordenadas.slice(estado.pagina * estado.porPagina, (estado.pagina + 1) * estado.porPagina);

      var envolve = el('div', { class: 'rf-tabela-rola', tabindex: '0', role: 'region', 'aria-label': opcoes.rotulo || T('Tabela', 'Table') });
      var tab = el('table', { class: 'rf-tabela' });
      var trh = el('tr');
      colunas.forEach(function (c) {
        var th = el('th', { scope: 'col', class: c.classe || null });
        if (c.valor || c.ordenar) {
          var b = el('button', { type: 'button', class: 'rf-th-bt' }, [c.nome, estado.ordem === c.id ? (estado.dir > 0 ? ' ▲' : ' ▼') : '']);
          b.onclick = function () {
            if (estado.ordem === c.id) estado.dir = -estado.dir; else { estado.ordem = c.id; estado.dir = 1; }
            desenhar();
          };
          th.appendChild(b);
          th.setAttribute('aria-sort', estado.ordem === c.id ? (estado.dir > 0 ? 'ascending' : 'descending') : 'none');
        } else th.textContent = c.nome;
        trh.appendChild(th);
      });
      tab.appendChild(el('thead', {}, [trh]));
      var tb = el('tbody');
      fatia.forEach(function (lin) {
        var tr = el('tr', { class: opcoes.classeLinha ? opcoes.classeLinha(lin) : null });
        colunas.forEach(function (c) {
          var v = c.desenhar ? c.desenhar(lin) : (c.valor ? c.valor(lin) : '');
          var td = el('td', { class: c.classe || null, 'data-rotulo': c.nome });
          if (v instanceof Node) td.appendChild(v); else td.textContent = v === null || v === undefined ? '' : String(v);
          tr.appendChild(td);
        });
        if (opcoes.aoClicar) {
          tr.classList.add('rf-clicavel'); tr.tabIndex = 0;
          tr.onclick = function (e) { if (e.target.closest('button,a,input,select,label')) return; opcoes.aoClicar(lin); };
          tr.onkeydown = function (e) { if (e.key === 'Enter') opcoes.aoClicar(lin); };
        }
        tb.appendChild(tr);
      });
      tab.appendChild(tb); envolve.appendChild(tab);

      /* avisos acima da tabela, na ordem da diretriz */
      var avisos = el('div', { class: 'rf-tabela-avisos' });
      raizT.appendChild(avisos);
      raizT.appendChild(envolve);
      setTimeout(function () {
        if (envolve.scrollWidth > envolve.clientWidth + 4) {
          avisos.appendChild(el('p', { class: 'rf-dica', texto: T('Melhor em tela grande ou com o celular deitado.', 'Best on a large screen or with the phone sideways.') }));
          avisos.appendChild(el('p', { class: 'rf-dica', texto: T('O quadro é mais largo que a tela: role para o lado para ver o restante.', 'The table is wider than the screen: scroll sideways to see the rest.') }));
        }
      }, 0);

      if (paginas > 1) {
        var ant = el('button', { class: 'rf-b rf-b-p', type: 'button', texto: '‹ ' + T('Anterior', 'Previous') });
        var prox = el('button', { class: 'rf-b rf-b-p', type: 'button', texto: T('Próxima', 'Next') + ' ›' });
        ant.disabled = estado.pagina === 0; prox.disabled = estado.pagina >= paginas - 1;
        ant.onclick = function () { estado.pagina--; desenhar(); };
        prox.onclick = function () { estado.pagina++; desenhar(); };
        raizT.appendChild(el('div', { class: 'rf-paginas' }, [ant,
          el('span', { texto: T('Página ', 'Page ') + (estado.pagina + 1) + T(' de ', ' of ') + paginas + ' · ' + total + T(' itens', ' items') }), prox]));
      } else {
        raizT.appendChild(el('p', { class: 'rf-dica rf-total', texto: total + (total === 1 ? T(' item', ' item') : T(' itens', ' items')) }));
      }
    }
    desenhar();
    raizT.atualizar = function (novas) { linhas = novas; estado.pagina = 0; desenhar(); };
    return raizT;
  };

  ui.cartao = function (titulo, valor, detalhe, aoClicar, tipo) {
    var c = el(aoClicar ? 'button' : 'div', { class: 'rf-cartao' + (tipo ? ' rf-cartao-' + tipo : '') + (aoClicar ? ' rf-clicavel' : ''), type: aoClicar ? 'button' : null }, [
      el('span', { class: 'rf-cartao-tit', texto: titulo }),
      el('strong', { class: 'rf-cartao-valor', texto: String(valor) }),
      detalhe ? el('span', { class: 'rf-cartao-det', texto: detalhe }) : null
    ]);
    if (aoClicar) c.onclick = aoClicar;
    return c;
  };

  ui.secao = function (titulo, filhos, acoes) {
    return el('section', { class: 'rf-secao' }, [
      el('div', { class: 'rf-secao-cab' }, [el('h2', { texto: titulo }), acoes ? el('div', { class: 'rf-acoes' }, acoes) : null])
    ].concat(filhos));
  };

  ui.botao = function (rotulo, fn, tipo, props) {
    var b = el('button', Object.assign({ class: 'rf-b' + (tipo ? ' rf-b-' + tipo : ''), type: 'button' }, props || {}), [rotulo]);
    if (fn) b.onclick = fn;
    return b;
  };
  /* botão que respeita permissão: sem permissão, fica em cinza com o motivo */
  ui.botaoSe = function (perm, app, rotulo, fn, tipo) {
    if (pode(perm, app)) return ui.botao(rotulo, fn, tipo);
    var b = el('button', { class: 'rf-b rf-b-cinza', type: 'button', 'aria-disabled': 'true',
      title: T('Seu papel não permite', 'Your role does not allow it') }, [rotulo, ' 🔒']);
    b.onclick = function () { ui.aviso(T('Seu papel não permite esta ação: ', 'Your role does not allow this action: ') + perm, 'info'); };
    return b;
  };

  /* ------------------------------------------------------------------
     8. NAVEGAÇÃO (#/modulo/sub/id) — o Voltar do celular volta de tela
     ------------------------------------------------------------------ */
  var Rota = {
    atual: function () {
      var h = (raiz.location.hash || '').replace(/^#\/?/, '');
      var partes = h.split('?')[0].split('/').filter(Boolean).map(decodeURIComponent);
      return { modulo: partes[0] || 'painel', sub: partes[1] || null, id: partes[2] || null };
    },
    ir: function (modulo, sub, id) {
      var h = '#/' + [modulo, sub, id].filter(Boolean).map(encodeURIComponent).join('/');
      if (raiz.location.hash === h) RF.emitir('rota', null);
      else raiz.location.hash = h;
    }
  };
  raiz.addEventListener('hashchange', function () { if (!pilha.length) RF.emitir('rota', null); });

  /* ------------------------------------------------------------------
     9. ZIP (sem compressão), CSV e GITHUB
     ------------------------------------------------------------------ */
  var TAB_CRC = (function () {
    var t = [], c, n, k;
    for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
  })();
  function crc32(bytes) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) c = TAB_CRC[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function criarZip(arquivos) {          /* [{ nome, texto }] -> Blob */
    var enc = new TextEncoder(), partes = [], central = [], desloc = 0;
    var dt = new Date(), hora = (dt.getHours() << 11) | (dt.getMinutes() << 5) | (dt.getSeconds() >> 1);
    var dia = ((dt.getFullYear() - 1980) << 9) | ((dt.getMonth() + 1) << 5) | dt.getDate();
    arquivos.forEach(function (a) {
      var nome = enc.encode(a.nome), dados = typeof a.texto === 'string' ? enc.encode(a.texto) : a.texto;
      var crc = crc32(dados);
      var loc = new DataView(new ArrayBuffer(30));
      loc.setUint32(0, 0x04034b50, true); loc.setUint16(4, 20, true); loc.setUint16(6, 0x0800, true);
      loc.setUint16(8, 0, true); loc.setUint16(10, hora, true); loc.setUint16(12, dia, true);
      loc.setUint32(14, crc, true); loc.setUint32(18, dados.length, true); loc.setUint32(22, dados.length, true);
      loc.setUint16(26, nome.length, true); loc.setUint16(28, 0, true);
      partes.push(new Uint8Array(loc.buffer), nome, dados);
      var cen = new DataView(new ArrayBuffer(46));
      cen.setUint32(0, 0x02014b50, true); cen.setUint16(4, 20, true); cen.setUint16(6, 20, true); cen.setUint16(8, 0x0800, true);
      cen.setUint16(10, 0, true); cen.setUint16(12, hora, true); cen.setUint16(14, dia, true); cen.setUint32(16, crc, true);
      cen.setUint32(20, dados.length, true); cen.setUint32(24, dados.length, true); cen.setUint16(28, nome.length, true);
      cen.setUint32(42, desloc, true);
      central.push(new Uint8Array(cen.buffer), nome);
      desloc += 30 + nome.length + dados.length;
    });
    var tamCentral = central.reduce(function (s, p) { return s + p.length; }, 0);
    var fim = new DataView(new ArrayBuffer(22));
    fim.setUint32(0, 0x06054b50, true); fim.setUint16(8, arquivos.length, true); fim.setUint16(10, arquivos.length, true);
    fim.setUint32(12, tamCentral, true); fim.setUint32(16, desloc, true);
    return new Blob(partes.concat(central, [new Uint8Array(fim.buffer)]), { type: 'application/zip' });
  }

  function csv(colunas, linhas) {        /* ; e BOM: abre certo no Excel em português */
    function q(v) { v = v === null || v === undefined ? '' : String(v); return /[";\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
    return '﻿' + [colunas.map(function (c) { return q(c[1]); }).join(';')]
      .concat(linhas.map(function (l) { return colunas.map(function (c) { return q(typeof c[0] === 'function' ? c[0](l) : l[c[0]]); }).join(';'); }))
      .join('\r\n');
  }
  function lerCsv(texto) {
    texto = String(texto || '').replace(/^﻿/, '');
    var sep = (texto.split('\n')[0].match(/;/g) || []).length >= (texto.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
    var linhas = [], campo = '', linha = [], dentro = false, i, c;
    for (i = 0; i < texto.length; i++) {
      c = texto.charAt(i);
      if (dentro) {
        if (c === '"' && texto.charAt(i + 1) === '"') { campo += '"'; i++; }
        else if (c === '"') dentro = false;
        else campo += c;
      } else if (c === '"') dentro = true;
      else if (c === sep) { linha.push(campo); campo = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && texto.charAt(i + 1) === '\n') i++;
        linha.push(campo); campo = '';
        if (linha.some(function (x) { return x !== ''; })) linhas.push(linha);
        linha = [];
      } else campo += c;
    }
    linha.push(campo); if (linha.some(function (x) { return x !== ''; })) linhas.push(linha);
    if (!linhas.length) return [];
    var cab = linhas.shift().map(function (h) { return semAcento(h).trim(); });
    return linhas.map(function (l) { var o = {}; cab.forEach(function (h, j) { o[h] = (l[j] || '').trim(); }); return o; });
  }

  var GitHub = {
    b64utf8: function (s) { return b64(new TextEncoder().encode(s)); },
    publicar: function (cfg, arquivos, mensagem, aoProgresso) {
      var base = 'https://api.github.com/repos/' + encodeURIComponent(cfg.dono) + '/' + encodeURIComponent(cfg.repo) + '/contents/';
      var cab = { 'Authorization': 'Bearer ' + cfg.token, 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
      var feitos = [], i = 0;
      function prox() {
        if (i >= arquivos.length) return Promise.resolve(feitos);
        var a = arquivos[i++];
        var url = base + a.nome.split('/').map(encodeURIComponent).join('/');
        if (aoProgresso) aoProgresso(i, arquivos.length, a.nome);
        return fetch(url + '?ref=' + encodeURIComponent(cfg.ramo || 'main'), { headers: cab }).then(function (r) {
          if (r.status === 404) return null;
          if (r.status === 401 || r.status === 403) throw new Error('token');
          if (!r.ok) throw new Error('github-' + r.status);
          return r.json();
        }).then(function (atual) {
          var corpo = { message: mensagem + ' — ' + a.nome, content: GitHub.b64utf8(a.texto), branch: cfg.ramo || 'main' };
          if (atual && atual.sha) corpo.sha = atual.sha;
          return fetch(url, { method: 'PUT', headers: Object.assign({ 'Content-Type': 'application/json' }, cab), body: JSON.stringify(corpo) });
        }).then(function (r) {
          if (r.status === 401 || r.status === 403) throw new Error('token');
          if (r.status === 404) throw new Error('repo');
          if (!r.ok) throw new Error('github-' + r.status);
          return r.json();
        }).then(function (res) {
          feitos.push({ nome: a.nome, commit: res.commit && res.commit.sha });
          return prox();
        });
      }
      return prox();
    }
  };

  /* exporta tudo */
  RF.util = { T: T, el: el, limpar: limpar, uid: uid, agora: agora, data: dataFmt, semAcento: semAcento, distancia: distancia,
    mascararEmail: mascararEmail, mascararTexto: mascararTexto, copiar: copiar, baixar: baixar, clonar: clonar,
    idioma: idioma, lerLocal: lerLocal, gravarLocal: gravarLocal, apagarLocal: apagarLocal, sha256: sha256,
    criarZip: criarZip, csv: csv, lerCsv: lerCsv, PREFIXO: PREFIXO };
  RF.Cofre = Cofre; RF.Sessao = Sessao; RF.Continuidade = Continuidade; RF.Papeis = Papeis; RF.Log = Log; RF.Digital = Digital; RF.Rota = Rota;
  RF.GitHub = GitHub; RF.ui = ui;
  RF.instalar = instalar; RF.entrar = entrar; RF.definirPin = definirPin; RF.trocarSenha = trocarSenha;
  RF.novoCodigo = novoCodigo; RF.pode = pode; RF.noEscopo = noEscopo; RF.ehDono = ehDono; RF.mudar = mudar;
  RF.cripto = { embrulhar: embrulhar, desembrulhar: desembrulhar, cifrarBytes: cifrarBytes, decifrarBytes: decifrarBytes,
    derivar: derivar, gerarCodigo: gerarCodigo, b64: b64, deB64: deB64, aleatorio: aleatorio };
})(window);
