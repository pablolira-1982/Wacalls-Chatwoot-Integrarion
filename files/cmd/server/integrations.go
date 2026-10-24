package main

import (
	"encoding/json"
	"net/http"
	"strings"
)

type SessionIntegrations struct {
	Proxy    ProxyConfig    `json:"proxy"`
	Chatwoot ChatwootConfig `json:"chatwoot"`
}
type ProxyConfig struct {
	Enabled  bool   `json:"enabled"`
	Scheme   string `json:"scheme"`
	Host     string `json:"host"`
	Port     string `json:"port"`
	Username string `json:"username"`
	Password string `json:"-"`
}
type ChatwootConfig struct {
	Enabled         bool   `json:"enabled"`
	URL             string `json:"url"`
	AccountID       string `json:"account_id"`
	InboxID         string `json:"inbox_id"`
	InboxIdentifier string `json:"inbox_identifier"`
	WebhookSecret   string `json:"-"`
	AccessToken     string `json:"-"`
}

func (s *server) handleIntegrationsGet(w http.ResponseWriter, r *http.Request) {
	sid := r.PathValue("sid")
	if s.sessionByID(w, sid) == nil {
		return
	}
	row, err := s.store.integration(r.Context(), sid)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "não foi possível carregar a configuração"})
		return
	}
	cfg := SessionIntegrations{Proxy: ProxyConfig{Enabled: row.ProxyEnabled, Scheme: firstValue(row.ProxyScheme, "socks5"), Host: row.ProxyHost, Port: row.ProxyPort, Username: row.ProxyUsername}, Chatwoot: ChatwootConfig{Enabled: row.ChatwootEnabled, URL: row.ChatwootURL, AccountID: row.ChatwootAccountID, InboxID: row.ChatwootInboxID, InboxIdentifier: row.ChatwootInboxIdentifier}}
	writeJSON(w, http.StatusOK, map[string]any{"proxy": cfg.Proxy, "chatwoot": cfg.Chatwoot, "chatwoot_webhook": chatwootWebhookURL(r, sid)})
}

func (s *server) handleIntegrationsPut(w http.ResponseWriter, r *http.Request) {
	sid := r.PathValue("sid")
	if s.sessionByID(w, sid) == nil {
		return
	}
	var cfg SessionIntegrations
	if err := json.NewDecoder(r.Body).Decode(&cfg); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "configuração inválida"})
		return
	}
	if cfg.Proxy.Scheme != "" && cfg.Proxy.Scheme != "http" && cfg.Proxy.Scheme != "https" && cfg.Proxy.Scheme != "socks5" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "proxy deve usar http, https ou socks5"})
		return
	}
	previous, err := s.store.integration(r.Context(), sid)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "não foi possível carregar a configuração"})
		return
	}
	if cfg.Proxy.Password == "" {
		cfg.Proxy.Password = previous.ProxyPassword
	}
	if cfg.Chatwoot.AccessToken == "" {
		cfg.Chatwoot.AccessToken = previous.ChatwootAccessToken
	}
	if cfg.Chatwoot.WebhookSecret == "" {
		cfg.Chatwoot.WebhookSecret = previous.ChatwootWebhookSecret
	}
	row := sessionIntegrationRow{SessionID: sid, ProxyEnabled: cfg.Proxy.Enabled, ProxyScheme: firstValue(cfg.Proxy.Scheme, "socks5"), ProxyHost: cfg.Proxy.Host, ProxyPort: cfg.Proxy.Port, ProxyUsername: cfg.Proxy.Username, ProxyPassword: cfg.Proxy.Password, ChatwootEnabled: cfg.Chatwoot.Enabled, ChatwootURL: cfg.Chatwoot.URL, ChatwootAccountID: cfg.Chatwoot.AccountID, ChatwootInboxID: cfg.Chatwoot.InboxID, ChatwootInboxIdentifier: cfg.Chatwoot.InboxIdentifier, ChatwootAccessToken: cfg.Chatwoot.AccessToken, ChatwootWebhookSecret: cfg.Chatwoot.WebhookSecret}
	if err := s.store.saveIntegration(r.Context(), row); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "não foi possível salvar a configuração"})
		return
	}
	cfg.Proxy.Password = ""
	cfg.Chatwoot.AccessToken = ""
	cfg.Chatwoot.WebhookSecret = ""
	writeJSON(w, http.StatusOK, map[string]any{"proxy": cfg.Proxy, "chatwoot": cfg.Chatwoot, "chatwoot_webhook": chatwootWebhookURL(r, sid)})
}

func (s *server) handleChatwootWebhook(w http.ResponseWriter, r *http.Request) {
	sid := r.PathValue("sid")
	if s.sessionByID(w, sid) == nil {
		return
	}
	writeJSON(w, http.StatusNotImplemented, map[string]string{"error": "Chatwoot webhook recebido, adaptador de mensagens ainda não ativado", "session_id": sid})
}

func chatwootWebhookURL(r *http.Request, sid string) string {
	proto := r.Header.Get("X-Forwarded-Proto")
	if proto == "" {
		proto = "http"
	}
	host := r.Header.Get("X-Forwarded-Host")
	if host == "" {
		host = r.Host
	}
	return strings.TrimRight(proto+"://"+host, "/") + "/api/sessions/" + sid + "/chatwoot/webhook"
}

func firstValue(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}
