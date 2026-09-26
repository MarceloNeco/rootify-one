# RootifyONE — passo a passo

São **dois repositórios** novos no GitHub:

| Repositório | O que guarda | Pacote |
|---|---|---|
| `rootify-one` | o app RootifyONE (as telas) | `ROOTIFY-ONE v0.1.0 25-Set-2026.zip` |
| `solverone-dados` | os arquivos master que os apps leem (termos, planos, anúncios…) | `SOLVERONE-DADOS v0.1.0 25-Set-2026.zip` |

Nenhum dado pessoal vai para o GitHub. Usuários, chamados, equipe e o log ficam
**cifrados no navegador** de quem usa o RootifyONE.

---

## 1. Testar no computador antes de subir (opcional, 2 minutos)

1. Descompacte o `ROOTIFY-ONE …zip` numa pasta.
2. Windows: dois cliques em `testar-no-windows.bat`. Mac/Linux: `testar-no-mac-ou-linux.command`.
3. O navegador abre em `http://localhost:8098`. Crie a conta do dono e toque em
   **Carregar dados de exemplo** no painel para ver tudo funcionando.
4. Para apagar o teste: Configurações ⚙ → Cópia de segurança → Zona de perigo → Apagar tudo.

> Precisa ser pelo atalho (endereço `http://localhost`). Aberto com dois cliques no
> `index.html`, o navegador desliga a criptografia e o RootifyONE avisa que não pode abrir.

---

## 2. Criar o repositório `rootify-one` no GitHub

1. Entre em **github.com** com a sua conta (MarceloNeco).
2. No canto de cima, à direita, toque no **+** → **New repository**.
3. Preencha:
   - **Repository name:** `rootify-one`
   - **Description:** `RootifyONE — administração central da SolverONE`
   - **Public** (o GitHub Pages gratuito exige repositório público; os dados não ficam aqui).
   - Marque **Add a README file** (assim o repositório já nasce com a página inicial).
   - Deixe **.gitignore** e **license** em *None* (a licença já vem no pacote).
4. Toque em **Create repository**.

## 3. Subir os arquivos do RootifyONE

1. Dentro do repositório `rootify-one`, toque em **Add file** → **Upload files**.
2. Descompacte o `ROOTIFY-ONE …zip` no computador.
3. Selecione **todos os arquivos de dentro da pasta** (não a pasta) e arraste para a
   área "Drag files here".
4. Embaixo, em *Commit changes*, escreva `RootifyONE 0.1.0` e toque em **Commit changes**.
5. Espere a lista de arquivos aparecer (uns 20 arquivos, todos soltos na raiz).

## 4. Ligar o GitHub Pages do `rootify-one`

1. No repositório, toque em **Settings** (engrenagem, na barra de cima do repositório).
2. No menu da esquerda, **Pages**.
3. Em **Build and deployment → Source**, escolha **Deploy from a branch**.
4. Em **Branch**, escolha **main** e a pasta **/ (root)**. Toque em **Save**.
5. Espere 1 a 2 minutos e recarregue a página: aparece o endereço
   `https://solverone.com.br/rootify-one/` (o domínio é configurado uma vez, no repositório
   do Portal `marceloneco.github.io`; os outros herdam — ver "Domínio" abaixo). Enquanto o
   domínio não estiver ligado, o endereço é `https://marceloneco.github.io/rootify-one/`.
6. Abra esse endereço, crie a **conta do dono** e **guarde o código de recuperação**
   fora do aparelho (anotado em papel ou no gerenciador de senhas).

> Cada navegador tem o seu próprio cofre. Se você criar a conta no computador, ela
> não aparece no celular — na fase 1 é assim. Para levar tudo para outro aparelho:
> Configurações ⚙ → Cópia de segurança → Baixar cópia cifrada, e no outro aparelho
> → Restaurar.

## 5. Criar o repositório `solverone-dados`

Repita o passo 2 com:

- **Repository name:** `solverone-dados`
- **Description:** `Arquivos master da SolverONE, publicados pelo RootifyONE`
- **Public**, com **Add a README file** marcado.

Depois, **ou** suba o pacote inicial à mão (passo 3 com o `SOLVERONE-DADOS …zip`),
**ou** deixe o RootifyONE publicar sozinho (passo 7). Ligue o Pages igual ao passo 4 —
o endereço fica `https://solverone.com.br/solverone-dados/`.

## 6. Criar o token que deixa o RootifyONE publicar

O token é uma "chave" que só abre o repositório `solverone-dados`, só para escrever
arquivos, e vence sozinha.

1. No GitHub, toque na sua **foto** (canto de cima, à direita) → **Settings**.
2. No fim do menu da esquerda: **Developer settings**.
3. **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
4. Preencha:
   - **Token name:** `RootifyONE`
   - **Expiration:** 90 days
   - **Repository access:** *Only select repositories* → escolha **solverone-dados**
   - **Permissions → Repository permissions → Contents:** *Read and write*
     (deixe todo o resto como está).
5. Toque em **Generate token** e **copie** o código que começa com `github_pat_`
   (ele só aparece uma vez).
6. No RootifyONE: menu ☰ → **Integrações e chaves** → GitHub → cole no campo **Token**
   → **Salvar** → **Testar conexão**. Deve aparecer "Conectado com permissão de escrita".

> Nunca cole esse token em arquivo, e-mail ou conversa. Ele fica cifrado dentro do
> RootifyONE. Quando vencer, gere outro igual e cole de novo.

## 7. Publicar pela primeira vez

1. No RootifyONE: menu ☰ → **Publicar**.
2. Veja a **Conferência** (o que falta em PT/EN aparece em vermelho e bloqueia).
3. Toque em **Publicar no GitHub agora** → Confirmar.
4. No GitHub, o repositório `solverone-dados` passa a ter `apps.json`, `planos.json`,
   `termos.json`, etc.

Sem token? Use **Baixar pacote (zip)** e suba os arquivos à mão (passo 3), depois
toque em **Já subi** para o RootifyONE registrar.

## 8. Domínio solverone.com.br (uma vez só)

1. No Registro.br, entre no domínio → **DNS** → modo avançado, e crie os registros que o
   RootifyONE lista em ☰ → **Integrações e chaves → Domínio e DNS** (4 registros A, 4 AAAA,
   o CNAME `www` e o TXT que o GitHub pede). Há um botão **Copiar** em cada um.
2. No GitHub, repositório `marceloneco.github.io` → Settings → Pages → **Custom domain**:
   `solverone.com.br` → Save. Espere o ✓ de DNS e marque **Enforce HTTPS**.
3. Todos os repositórios passam a responder em `solverone.com.br/<repositório>/`.
4. No RootifyONE, ☰ → **Apps**: se aparecer o aviso de endereços antigos, toque em
   **Trocar para o domínio novo** e depois **Publicar**.
5. Se usar Firebase: Authentication → Settings → Domínios autorizados → acrescente
   `solverone.com.br` e `www.solverone.com.br`.

> Mudar de endereço é mudar de "origem" para o navegador: o cofre do RootifyONE, a digital e
> o app instalado no endereço antigo não passam sozinhos. No endereço antigo, ⚙ → Cópia de
> segurança → **Baixar cópia cifrada**; no novo, **Restaurar** e registrar a digital de novo.

## 9. E-mails (já fica pronto, o envio automático vem depois)

1. ☰ → **E-mails → Remetentes e domínio**: confira os remetentes (`no-reply@`, `suporte@`,
   `privacidade@`, `contato@` de solverone.com.br) e a lista de DNS do e-mail (SPF, DKIM,
   DMARC, MX). Marque cada registro feito.
2. **Modelos**: revise os 10 textos PT/EN (boas-vindas, senha, convite, chamado, LGPD, termos…).
3. Hoje, cada e-mail que a plataforma quer mandar entra na **Caixa de saída**: toque em
   **Abrir no programa de e-mail** (o texto vai pronto) ou **Copiar**. Também aparece na 📥.
4. Para sair sozinho: escolha um provedor (Resend é grátis até 3.000/mês), publique o proxy
   (há um Cloudflare Worker pronto para copiar em **Envio (provedor)**) e cole o endereço e o
   token → **Salvar** → **Testar conexão**.

## 10. Primeiros ajustes sugeridos

1. **Termos e políticas**: os 4 modelos vêm como rascunho. Revise, **peça validação de
   um advogado**, envie para aprovação, aprove e marque para publicar.
2. **Equipe**: cadastre quem vai ajudar, com o papel certo (suporte, conteúdo, DPO…).
   A senha provisória aparece uma vez; a pessoa troca no primeiro acesso.
3. **Minha segurança**: registre a digital e um PIN.
4. **O que falta especificar**: exporte o CSV e cole na sua planilha de diretrizes.
5. **AssistONE** (o personagem no canto de baixo): toque em **Começar** e siga o passo a passo —
   ele confere sozinho o que já está feito. Liga/desliga em ⚙ → Geral.

---

## O que funciona hoje e o que espera servidor

| Hoje (fase 1) | Com Firebase (fase 2) | Com cobrança (fase 3) |
|---|---|---|
| CRM com cadastro, importação CSV, etiquetas, segmentos, notas, planos, termos aceitos, consentimentos, exportar e excluir titular | usuários reais chegando sozinhos de todos os apps | receita, assinaturas, cupons |
| Suporte com fila, prazos, respostas prontas, IA (dados mascarados), escalar, juntar, relatórios, importar do Formspree | chamados chegando por e-mail e pelos apps; entrega automática da resposta | — |
| Papéis e permissões, simulador "ver como", equipe neste aparelho | equipe entrando de qualquer lugar | — |
| Publicar arquivos master no GitHub; histórico e voltar publicação | os apps lendo termos, recados e versão mínima do central | — |
| Log encadeado, LGPD (pedidos com prazo, registro de tratamento, incidentes), automações locais, custos | log central de todos os apps; automações agendadas | notas fiscais |
