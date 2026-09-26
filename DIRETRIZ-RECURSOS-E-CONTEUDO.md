# Diretriz — Controle dos apps: recursos, comportamentos e conteúdo por app (RootifyONE)

Texto para entrar nas Diretrizes gerais da SolverONE (seção "RootifyONE — admin central") e na
planilha (aba DIRETRIZ GERAL, categoria RootifyONE). Adotado em 26/Set/2026 (RootifyONE 0.3.0).

## Nome e o que o mercado chama

A tela chama-se **Controle dos apps** (EN: *App control*). Ela junta três coisas que o mercado vende
separadas: **feature flags** (LaunchDarkly, Unleash: ligar/desligar função sem release), **remote
config** (Firebase Remote Config: valores que o app lê ao abrir) e **CMS headless** (Contentful,
Strapi: conteúdo editado por quem não é desenvolvedor e lido pelo app por arquivo). "Back office" é
o nome genérico de todo o RootifyONE; "Controle dos apps" é só esta parte.

## Regra

**Conteúdo, funções ligadas e comportamentos de cada app são administrados no RootifyONE, não no
código do app.** Ninguém faz commit para trocar um texto, uma foto ou um vídeo, nem para ligar ou
desligar uma função. O RootifyONE tem uma parte **por app** (☰ → Produto → Recursos e conteúdo por
app): escolhe-se o app (ou Global, que vale em todos) e ali estão três abas:

1. **Recursos (feature flags)** — cada função tem um `id`, nome PT/EN, "o que faz", ligado/desligado
   e "desde a versão". O app lê o arquivo ao abrir e obedece; o que o app não conhece é ignorado e o
   padrão continua no código. Recurso global pode ser sobrescrito pelo do app (o app vence).
2. **Comportamentos (feature settings)** — valores que o app lê ao abrir: número, texto, sim/não,
   escolha numa lista, cor ou JSON. Cada um tem `id`, nome PT/EN, "para quê", valor e padrão.
3. **Conteúdo** — coleções com **campos declarados** (texto curto/longo, PT/EN, número, sim/não,
   fotos, vídeos do YouTube, links, lista) e itens. O primeiro campo é o título do item. Fotos são
   reduzidas a 1280 px no navegador e sobem para `solverone-dados/conteudo/<app>/` pelo token do
   GitHub do administrador; o item guarda só o endereço. Vídeo é o link do YouTube (qualquer
   formato: youtu.be, watch?v=, shorts) e o app mostra o player.

**Quem edita:** a equipe do RootifyONE com o papel certo (Conteúdo e marketing edita conteúdo;
Administrador de app edita recursos, comportamentos e conteúdo do seu app; Desenvolvimento cuida de
recursos e comportamentos). Nunca o personal trainer ou o cliente dentro do app: o "ver como" e o
painel de admin dentro dos apps continuam sendo só simulação.

**Como chega ao app:** Publicar gera `recursos/<app>.json`, `conteudo/<app>.json`,
`recursos/global.json` e `conteudo/global.json` no `solverone-dados` (mesma origem). O módulo comum
(`diretrizes.js` ≥ 1.2.0) lê com rede primeiro (no-cache, 4 s), guarda cópia local como reserva e
avisa por `dgo:central` quando algo novo chegou:

```
DGO.recursos.ligado('videos-youtube', true)      // flag, com padrão
DGO.recursos.valor('descanso.padraoSeg', 60)     // comportamento, com padrão
DGO.conteudo.colecao('equipamentos')             // { nome, campos, itens } ou null
DGO.conteudo.item('equipamentos', 'leg-press')   // { id, nome:{pt,en}, fotos:[…], videos:[…], … }
DGO.conteudo.texto(item.descricao)               // PT/EN no idioma atual
```

App sem o módulo comum (RiseONE, um `index.html` só) usa um adaptador próprio com as mesmas regras
(`conteudo-central.js`), até migrar para o módulo.

**App novo:** cadastrar em Apps já faz o app aparecer na tela por app, sem código. Toda função nova
declarada num app deve nascer com um recurso aqui (`id` igual no código), para poder ser desligada
sem release.

**O que não é por app:** planos e serviços por plano (quem pode usar, por plano) continuam na tela
Serviços por plano; anúncios, recados, termos e versões continuam nas telas deles. Recurso = existe
ou não; serviço = para quem.

## Caso RiseONE (origem do pedido, 26/Set/2026)

Coleção `equipamentos` já semeada com os 52 aparelhos do app (`id` = o mesmo do `EQUIP` no
código), campos: nome PT/EN, descrição PT/EN, fotos, vídeos do YouTube, dicas PT/EN, links. Recursos
próprios: `videos-youtube`, `fotos-centrais`, `espelho`, `modo-tv`. Comportamentos:
`descanso.padraoSeg`, `videos.maxPorAparelho`. O adaptador `conteudo-central.js` do RiseONE lê o
arquivo, sobrescreve nome/descrição do aparelho quando houver, e acrescenta fotos, vídeos (player do
YouTube) e links na ficha do aparelho.

## A especificar

- Liberação gradual de um recurso: por plano, por porcentagem de pessoas, só para app instalado.
- Agendar mudança (recurso ligar no dia X) — depende de publicação agendada.
