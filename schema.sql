-- Migration SQLite para a integração por instância do WaCalls-dev.
-- Não cria banco, usuário, senha, .env ou credenciais.

CREATE TABLE IF NOT EXISTS session_integrations (
  session_id TEXT PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
  proxy_enabled INTEGER NOT NULL DEFAULT 0,
  proxy_scheme TEXT NOT NULL DEFAULT 'socks5',
  proxy_host TEXT NOT NULL DEFAULT '',
  proxy_port TEXT NOT NULL DEFAULT '',
  proxy_username TEXT NOT NULL DEFAULT '',
  proxy_password TEXT NOT NULL DEFAULT '',
  chatwoot_enabled INTEGER NOT NULL DEFAULT 0,
  chatwoot_url TEXT NOT NULL DEFAULT '',
  chatwoot_account_id TEXT NOT NULL DEFAULT '',
  chatwoot_inbox_id TEXT NOT NULL DEFAULT '',
  chatwoot_inbox_identifier TEXT NOT NULL DEFAULT '',
  chatwoot_access_token TEXT NOT NULL DEFAULT '',
  chatwoot_webhook_secret TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (proxy_scheme IN ('socks5', 'http', 'https'))
);
