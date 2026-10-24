package main

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
)

type sessionRow struct {
	ID   string
	Name string
	JID  string
}

type sessionStore struct{ db *sql.DB }

func newSessionStore(ctx context.Context, db *sql.DB) (*sessionStore, error) {
	_, err := db.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS sessions (
		id   TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		jid  TEXT
	)`)
	if err != nil {
		return nil, err
	}
	_, err = db.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS session_integrations (
		session_id TEXT PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
		proxy_enabled INTEGER NOT NULL DEFAULT 0,
		proxy_scheme TEXT NOT NULL DEFAULT 'socks5',
		proxy_host TEXT NOT NULL DEFAULT '', proxy_port TEXT NOT NULL DEFAULT '',
		proxy_username TEXT NOT NULL DEFAULT '', proxy_password TEXT NOT NULL DEFAULT '',
		chatwoot_enabled INTEGER NOT NULL DEFAULT 0,
		chatwoot_url TEXT NOT NULL DEFAULT '', chatwoot_account_id TEXT NOT NULL DEFAULT '',
		chatwoot_inbox_id TEXT NOT NULL DEFAULT '', chatwoot_inbox_identifier TEXT NOT NULL DEFAULT '',
		chatwoot_access_token TEXT NOT NULL DEFAULT '', chatwoot_webhook_secret TEXT NOT NULL DEFAULT '',
		created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
	)`)
	if err != nil {
		return nil, err
	}
	return &sessionStore{db: db}, nil
}

type sessionIntegrationRow struct {
	SessionID, ProxyScheme, ProxyHost, ProxyPort, ProxyUsername, ProxyPassword                                           string
	ProxyEnabled, ChatwootEnabled                                                                                        bool
	ChatwootURL, ChatwootAccountID, ChatwootInboxID, ChatwootInboxIdentifier, ChatwootAccessToken, ChatwootWebhookSecret string
}

func (s *sessionStore) integration(ctx context.Context, sessionID string) (sessionIntegrationRow, error) {
	r := sessionIntegrationRow{SessionID: sessionID, ProxyScheme: "socks5"}
	err := s.db.QueryRowContext(ctx, `SELECT proxy_enabled,proxy_scheme,proxy_host,proxy_port,proxy_username,proxy_password,chatwoot_enabled,chatwoot_url,chatwoot_account_id,chatwoot_inbox_id,chatwoot_inbox_identifier,chatwoot_access_token,chatwoot_webhook_secret FROM session_integrations WHERE session_id = ?`, sessionID).Scan(&r.ProxyEnabled, &r.ProxyScheme, &r.ProxyHost, &r.ProxyPort, &r.ProxyUsername, &r.ProxyPassword, &r.ChatwootEnabled, &r.ChatwootURL, &r.ChatwootAccountID, &r.ChatwootInboxID, &r.ChatwootInboxIdentifier, &r.ChatwootAccessToken, &r.ChatwootWebhookSecret)
	if err == sql.ErrNoRows {
		return r, nil
	}
	return r, err
}

func (s *sessionStore) saveIntegration(ctx context.Context, r sessionIntegrationRow) error {
	_, err := s.db.ExecContext(ctx, `INSERT INTO session_integrations (session_id,proxy_enabled,proxy_scheme,proxy_host,proxy_port,proxy_username,proxy_password,chatwoot_enabled,chatwoot_url,chatwoot_account_id,chatwoot_inbox_id,chatwoot_inbox_identifier,chatwoot_access_token,chatwoot_webhook_secret) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(session_id) DO UPDATE SET proxy_enabled=excluded.proxy_enabled,proxy_scheme=excluded.proxy_scheme,proxy_host=excluded.proxy_host,proxy_port=excluded.proxy_port,proxy_username=excluded.proxy_username,proxy_password=excluded.proxy_password,chatwoot_enabled=excluded.chatwoot_enabled,chatwoot_url=excluded.chatwoot_url,chatwoot_account_id=excluded.chatwoot_account_id,chatwoot_inbox_id=excluded.chatwoot_inbox_id,chatwoot_inbox_identifier=excluded.chatwoot_inbox_identifier,chatwoot_access_token=excluded.chatwoot_access_token,chatwoot_webhook_secret=excluded.chatwoot_webhook_secret,updated_at=CURRENT_TIMESTAMP`, r.SessionID, r.ProxyEnabled, r.ProxyScheme, r.ProxyHost, r.ProxyPort, r.ProxyUsername, r.ProxyPassword, r.ChatwootEnabled, r.ChatwootURL, r.ChatwootAccountID, r.ChatwootInboxID, r.ChatwootInboxIdentifier, r.ChatwootAccessToken, r.ChatwootWebhookSecret)
	return err
}

func newSessionID() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func (s *sessionStore) list(ctx context.Context) ([]sessionRow, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id, name, COALESCE(jid, '') FROM sessions ORDER BY rowid`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []sessionRow
	for rows.Next() {
		var r sessionRow
		if err := rows.Scan(&r.ID, &r.Name, &r.JID); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func (s *sessionStore) insert(ctx context.Context, id, name string) error {
	_, err := s.db.ExecContext(ctx, `INSERT INTO sessions (id, name, jid) VALUES (?, ?, NULL)`, id, name)
	return err
}

func (s *sessionStore) setJID(ctx context.Context, id, jid string) error {
	_, err := s.db.ExecContext(ctx, `UPDATE sessions SET jid = ? WHERE id = ?`, jid, id)
	return err
}

func (s *sessionStore) delete(ctx context.Context, id string) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM sessions WHERE id = ?`, id)
	return err
}
