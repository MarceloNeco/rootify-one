# RootifyONE — arquitetura

Leia antes de mexer. Serve para qualquer pessoa ou IA que for alterar este repositório.

## O que é

A administração central da plataforma SolverONE (`solverone.com.br/rootify-one/`): apps,
planos, serviços por plano, usuários (CRM), suporte, base de conhecimento, termos, recados,
anúncios, versões, publicação, papéis e permissões, equipe, privacidade (LGPD), auditoria,
e-mails, integrações (com domínio e DNS), automações, financeiro, telemetria, armazenamento
e o mapa do que ainda falta especificar. Mais a caixa de entrada 📥 e o AssistONE.

HTML, CSS e JavaScript puros. Sem framework, sem passo de build. Abra e edite.

## Arquivos

| Arquivo | O que faz | Mexer? |
|---|---|---|
| `index.html` | casca da página: topo, menu, área de conteúdo e a ordem dos scripts | pouco |
| `rootify.css` | aparência (claro/escuro, celular, impressão) | sim |
| `rootify-catalogo.js` | **declarações**: módulos do menu, recursos e ações, papéis, perfis de clientes, funções em cinza (com o que falta especificar), dados iniciais | **é aqui que a plataforma cresce** |
| `rootify-base.js` | núcleo: idioma, criptografia, cofre, sessão, permissões, log encadeado, componentes de tela, navegação, zip/CSV/GitHub | com cuidado |
| `rootify-dados.js` | regras: prazos (SLA), LGPD 15 dias, termos, geração e conferência dos arquivos master, automações, dados de exemplo | sim |
| `rootify-telas-1.js` | telas: painel, apps, planos, serviços, usuários, suporte, base de conhecimento | sim |
| `rootify-telas-2.js` | telas: termos, recados, anúncios, versões, publicar, papéis, equipe, privacidade, auditoria, integrações, automações, financeiro, telemetria, armazenamento, mapa, configurações | sim |
| `rootify-ia-termos.js` | IA nos termos: botão ✨ do editor e o 🤖 Agente de políticas (usa `DGO.ia`; nunca publica, só escreve rascunhos) | sim |
| `rootify-recursos.js` | **Recursos e conteúdo por app**: feature flags, comportamentos e coleções de conteúdo (textos PT/EN, fotos, vídeos do YouTube, links) por app; fotos sobem pelo GitHub; gera `recursos/<app>.json` e `conteudo/<app>.json` | sim (sementes em `RECURSOS_INICIAIS`, `COMPORTAMENTOS_INICIAIS`, `CONTEUDO_INICIAL` no catálogo) |
| `rootify-email.js` | **E-mails**: remetentes @solverone.com.br, modelos PT/EN, caixa de saída, envio pelo proxy; API `RF.Email.enfileirar/enviar/abrirCliente`; tela `emails` | sim |
| `rootify-assist.js` | **AssistONE**: personagem, balão "Você está em…" com atalhos (mapa `MAPA` por tela), tour, busca no balão, passo a passo (`PASSOS`), dicas, cartão das Configurações | sim (o mapa por tela cresce aqui) |
| `rootify-app.js` | telas de acesso (instalar, entrar, bloqueio), cabeçalho, menu ☰ (ações rápidas, acordeão), barra de atalhos, busca compartilhada (`RF.busca`), caixa de entrada (`RF.Inbox`), aparência, simulador de papel, roteador | com cuidado |
| `diretrizes.js` | módulo comum da SolverONE (igual em todos os apps) | **não** — troque pela versão nova quando sair |
| `diretrizes-config.js` | ajustes do módulo comum para este app (sem anúncios, login do módulo desligado) | pouco |
| `sw.js`, `manifest.json`, `icone-*.png` | instalar como app e funcionar sem internet | não |
| `versoes.json` | o que cada versão trouxe | a cada versão |

## Padrão da SolverONE que o RootifyONE segue

- **Cabeçalho**: ☰ e marca à esquerda; à direita PT|EN (só no computador), 🔍, 📥, ⚙, 🏠, 👤.
  No celular o PT|EN fica no topo do ☰. Sem faixa do módulo comum (o RootifyONE não tem anúncio).
- **☰**: até 4 ações rápidas (`ACOES_RAPIDAS` no catálogo, cada uma chama uma função de `RF.h`),
  grupos com título, partes em acordeão (`partes` de cada módulo) e o link do Portal no rodapé.
- **📥 Caixa de entrada** (`RF.Inbox`): itens calculados dos dados (prazos, LGPD, aprovações,
  publicação, e-mails aguardando) + coleção `avisos` (automações). Lido/não lido em
  `config.inboxLidos`. A bolha leva a cor da prioridade mais alta.
- **AssistONE** ligado por padrão; preferência por aparelho em `localStorage` (`rootify:v1:assist`).
- **Aparência** (tema, tamanho do texto, movimento) por aparelho, aplicada antes de entrar.
- **Endereço nunca fixo no código**: `RF.util.siteBase()` devolve a origem atual (ou o domínio
  oficial em teste local). Os endereços dos apps no catálogo são dados (`RF.cat.DOMINIO`).
- Eventos internos (`RF.on`): `tela`, `modal`, `menu`, `acesso`, `entrou`, `bloqueado`, `saiu`, `log`.

## Regras que não se quebram

1. **Nenhum segredo no código.** Token do GitHub, chaves e dados pessoais ficam no cofre
   cifrado do navegador (AES-GCM; chave de dados embrulhada por senha, PIN, código de
   recuperação e, para a digital, por uma chave presa ao aparelho).
2. **Toda permissão passa por `RF.pode('recurso:acao', app)`.** Nunca esconda um botão
   sem perguntar ao `pode`. Para um botão que respeita permissão: `RF.ui.botaoSe(...)`.
3. **Toda alteração de dado passa por `RF.mudar(colecao, modulo, acao, alvo, antes, depois, resumo)`**
   — grava a coleção e o log encadeado de uma vez.
4. **Todo texto nasce em PT e EN**: `T('texto', 'text')` ou `T({pt, en})`.
5. **Função nova sem especificação completa entra em cinza**: acrescente em `FUNCOES`
   (catálogo) com `estado: 'especificar'` e a pergunta em `falta`; na tela use
   `RF.ui.cinza('id')` ou `RF.ui.botaoCinza(rotulo, 'id')`.
6. **Arquivos master** (`apps.json`, `planos.json`, `servicos/<app>.json`, `termos.json`,
   `recados.json`, `anuncios.json`, `ajuda.json`, `versoes/<app>.json`, `recursos/<app>.json`,
   `conteudo/<app>.json`) têm o mesmo formato que terão as coleções no Firestore. Mudar o formato
   = mudar os apps que os leem.
   - `recursos/<app>.json`: `{ app, recursos: { id: { ligado, desde, nome } }, comportamentos: { id: valor } }`;
     `recursos/global.json` vale para todos e o app vence.
   - `conteudo/<app>.json`: `{ app, colecoes: { <id>: { nome, campos: [{ id, nome, tipo }], itens: [{ id, …valores }] } } }`.
     Tipos de campo: texto, texto-longo, bilingue, bilingue-longo, numero, sim-nao, imagens (URLs),
     videos (ids do YouTube), links, lista.
   - O app lê pelo módulo comum: `DGO.recursos.ligado(id, padrao)`, `DGO.recursos.valor(id, padrao)`,
     `DGO.conteudo.colecao(id)`, `DGO.conteudo.item(colecao, id)`; sem módulo, um adaptador próprio
     (RiseONE: `conteudo-central.js`). O que o app não conhece é ignorado; o padrão fica no código.
7. **Todo e-mail sai pela caixa de saída** (`RF.Email.enfileirar`), nunca por `mailto:` solto:
   assim fica registrado, com modelo, remetente certo e envio automático quando houver proxy.
   A chave do provedor de e-mail nunca fica aqui — só no proxy.

## Como acrescentar

- **Um módulo novo**: linha em `MODULOS` + recurso em `RECURSOS` + `RF.telas.<id> = function (area, rota) {…}`.
- **Uma permissão nova**: ação no recurso em `RECURSOS` e marque nos papéis que devem ter.
- **Um papel novo da equipe**: pela tela Papéis (criar a partir de um modelo) ou em `PAPEIS`.
- **Um perfil de cliente**: `PERFIS`.
- **Uma automação nova (gatilho)**: `GATILHOS` + `RF.dados.Automacoes.rodar('gatilho', alvo)` no ponto do evento.
- **Um e-mail novo do sistema**: modelo em `modelosPadrao()` (`rootify-email.js`) e a chamada
  `RF.Email.enfileirar({ modelo, para, nome, dados, origem })` no ponto do evento.
- **Ajuda do AssistONE para uma tela nova**: entrada em `MAPA` (`rootify-assist.js`) com frase,
  até 3 atalhos e uma dica; passo do onboarding em `PASSOS` se for configuração inicial.
- **Uma ação rápida no ☰**: linha em `ACOES_RAPIDAS` (máximo 4 aparecem).
- **Um recurso, comportamento ou coleção de conteúdo de um app**: pela própria tela Recursos e
  conteúdo por app (fica no cofre e vai para os arquivos master); sementes para instalações novas
  em `RECURSOS_INICIAIS`, `COMPORTAMENTOS_INICIAIS` e `CONTEUDO_INICIAL` no catálogo.

## Fases

- **Fase 1 (hoje, sem servidor):** tudo neste navegador; publicação no repositório
  `solverone-dados` pelo GitHub (token) ou por pacote zip; equipe entra neste aparelho.
- **Fase 2 (Firebase):** coleções no Firestore com o mesmo formato; administradores em
  `admins/{uid}`; log central só de inclusão; usuários reais chegando sozinhos.
- **Fase 3 (cobrança):** gateway de pagamento e Functions; receita e assinaturas saem do cinza.

A tela **O que falta especificar** lista, a qualquer momento, tudo o que está em cinza.
