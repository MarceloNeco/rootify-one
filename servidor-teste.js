/* Servidorzinho para testar no computador.
   Serve esta pasta em http://localhost:8099 — e no endereco http:// o
   navegador libera camera, notificacoes, senha protegida e instalar como app,
   coisas que ele desliga quando o arquivo e aberto por dois cliques.
   Rode com:  node servidor-teste.js     (ou use os atalhos testar-*)   */
const http = require('http'), fs = require('fs'), path = require('path');
const PASTA = __dirname, PORTA = process.env.PORTA || 8098;
const TIPOS = {
  '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.mjs':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8', '.png':'image/png', '.jpg':'image/jpeg',
  '.jpeg':'image/jpeg', '.svg':'image/svg+xml', '.webp':'image/webp', '.ico':'image/x-icon',
  '.txt':'text/plain; charset=utf-8', '.md':'text/plain; charset=utf-8',
  '.gz':'application/gzip', '.wasm':'application/wasm', '.pdf':'application/pdf',
  '.mp3':'audio/mpeg', '.woff2':'font/woff2'
};
http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/') rel = '/index.html';
  const alvo = path.join(PASTA, path.normalize(rel).replace(/^(\.\.[\/\\])+/, ''));
  if (!alvo.startsWith(PASTA)) { res.writeHead(403); res.end('nao'); return; }
  fs.readFile(alvo, (erro, dados) => {
    if (erro) { res.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'});
                res.end('Nao achei: ' + rel); return; }
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(alvo).toLowerCase()] || 'application/octet-stream',
                         'Cache-Control': 'no-cache' });
    res.end(dados);
  });
}).listen(PORTA, () => {
  console.log('\n  Teste aberto em:  http://localhost:' + PORTA + '/\n');
  console.log('  Para parar, feche esta janela ou aperte Ctrl + C.\n');
});
