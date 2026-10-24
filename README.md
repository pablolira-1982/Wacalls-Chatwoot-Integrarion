# WaCalls: complemento Proxy e Chatwoot

Pacote local, sem Supabase, sem `.env` e sem credenciais. Ele adiciona por instância:

- botão Gravar no cabeçalho;
- popup Proxy com SOCKS5, HTTP e HTTPS;
- popup Chatwoot com URL, Account ID, Inbox ID, Access Token, Inbox Identifier e webhook obrigatório copiável;
- persistência no SQLite usado pelo WaCalls-dev.

## Banco necessário

É necessária uma tabela SQLite chamada `session_integrations`, ligada a `sessions(id)`.
O arquivo `schema.sql` cria somente essa tabela com os campos:

`session_id`, `proxy_enabled`, `proxy_scheme`, `proxy_host`, `proxy_port`,
`proxy_username`, `proxy_password`, `chatwoot_enabled`, `chatwoot_url`,
`chatwoot_account_id`, `chatwoot_inbox_id`, `chatwoot_inbox_identifier`,
`chatwoot_access_token`, `chatwoot_webhook_secret`, `created_at` e `updated_at`.

O código do dev também cria essa tabela automaticamente ao abrir o banco SQLite.

## Instalação depois do WaCalls oficial

Este pacote não substitui o projeto oficial nem precisa ser incorporado ao repositório
principal. A pessoa instala primeiro o WaCalls oficial:

```bash
git clone https://github.com/JotaDev66/WaCalls.git
cd WaCalls
```

Depois copie somente esta pasta de complemento para dentro do checkout instalado e
execute o instalador apontando para a raiz do projeto oficial:

```bash
node Wacalls-chatwoot-integration/install-integration.mjs --target .
```

O instalador trabalha somente com arquivos do projeto oficial. Ele não lê, cria ou
publica `.env`, credenciais, tokens ou senhas.

## SQLite

O WaCalls usa SQLite no arquivo informado pelo parâmetro `-db`. Para aplicar a
migration manualmente:

```bash
mkdir -p runtime
sqlite3 runtime/wacalls.db < Wacalls-chatwoot-integration/schema.sql
```

O servidor também cria a tabela automaticamente ao abrir o banco, portanto a
migration manual é opcional. Não use `CREATE DATABASE`, usuário SQL ou credenciais
externas.

## Compilar e iniciar

```bash
cd client
npm ci
npm run build
cd ..
go test ./cmd/server
go build -o wacalls-server ./cmd/server
./wacalls-server -addr :8094 -db runtime/wacalls.db -static client/dist
```

O webhook é montado pelo host da requisição. Assim cada instalação mostra o próprio
domínio, sem fixar o domínio WaCaller no código. O endpoint de transporte Chatwoot
continua explícito como `501` até o adaptador de mensagens ser implementado.
