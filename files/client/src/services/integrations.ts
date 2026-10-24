import { apiGet, apiPut } from "@/lib/api";

export type SessionIntegrations = {
  proxy: { enabled: boolean; scheme: string; host: string; port: string; username: string };
  chatwoot: { enabled: boolean; url: string; account_id: string; inbox_id: string; inbox_identifier: string };
  chatwoot_webhook?: string;
};

export const getIntegrations = (sid: string) => apiGet<SessionIntegrations>(`/api/sessions/${encodeURIComponent(sid)}/integrations`);
export const saveIntegrations = (sid: string, body: unknown) => apiPut<SessionIntegrations>(`/api/sessions/${encodeURIComponent(sid)}/integrations`, body);
