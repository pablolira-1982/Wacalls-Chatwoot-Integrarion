import { useEffect, useState } from "react";
import { Check, Copy, Globe, MessageSquare, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getIntegrations, saveIntegrations, type SessionIntegrations as Config } from "@/services/integrations";

const empty: Config = { proxy: { enabled: false, scheme: "socks5", host: "", port: "", username: "" }, chatwoot: { enabled: false, url: "", account_id: "", inbox_id: "", inbox_identifier: "" } };

export const SessionIntegrations = ({ sid }: { sid: string }) => {
  const [cfg, setCfg] = useState<Config>(empty);
  const [proxyPassword, setProxyPassword] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [open, setOpen] = useState<"proxy" | "chatwoot" | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCfg(empty);
    void getIntegrations(sid).then(setCfg).catch((e) => toast.error((e as Error).message));
  }, [sid]);

  const save = async () => {
    setSaving(true);
    try {
      const saved = await saveIntegrations(sid, { ...cfg, proxy: { ...cfg.proxy, password: proxyPassword }, chatwoot: { ...cfg.chatwoot, access_token: accessToken } });
      setCfg(saved);
      setProxyPassword("");
      setAccessToken("");
      toast.success("Configuração salva nesta instância");
      setOpen(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const copyWebhook = async () => {
    if (!cfg.chatwoot_webhook) return;
    await navigator.clipboard.writeText(cfg.chatwoot_webhook).catch(() => undefined);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  const disconnectChatwoot = async () => {
    const next = { ...cfg, chatwoot: { ...cfg.chatwoot, enabled: false } };
    setCfg(next);
    try {
      setCfg(await saveIntegrations(sid, next));
      toast.success("Chatwoot desconectado");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return <>
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen("proxy")}><Globe className="mr-1 h-4 w-4" />Proxy</Button>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen("chatwoot")}><MessageSquare className="mr-1 h-4 w-4" />Chatwoot</Button>
    </div>

    <Dialog open={open === "proxy"} onOpenChange={(v) => !v && setOpen(null)}>
      <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Proxy da conexão</DialogTitle><DialogDescription>A conexão do WhatsApp desta instância passa por este proxy.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cfg.proxy.enabled} onChange={(e) => setCfg({ ...cfg, proxy: { ...cfg.proxy, enabled: e.target.checked } })} />Ativar proxy</label>
          <div className="grid grid-cols-[120px_1fr_96px] gap-2"><div><Label>Tipo</Label><select className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm" value={cfg.proxy.scheme} onChange={(e) => setCfg({ ...cfg, proxy: { ...cfg.proxy, scheme: e.target.value } })}><option value="socks5">SOCKS5</option><option value="http">HTTP</option><option value="https">HTTPS</option></select></div><div><Label>Host</Label><Input className="mt-1" placeholder="proxy.exemplo.com" value={cfg.proxy.host} onChange={(e) => setCfg({ ...cfg, proxy: { ...cfg.proxy, host: e.target.value } })} /></div><div><Label>Porta</Label><Input className="mt-1" placeholder="1080" value={cfg.proxy.port} onChange={(e) => setCfg({ ...cfg, proxy: { ...cfg.proxy, port: e.target.value } })} /></div></div>
          <div className="grid grid-cols-2 gap-2"><div><Label>Usuário (opcional)</Label><Input className="mt-1" placeholder="usuário" value={cfg.proxy.username} onChange={(e) => setCfg({ ...cfg, proxy: { ...cfg.proxy, username: e.target.value } })} /></div><div><Label>Senha (opcional)</Label><Input className="mt-1" type="password" placeholder="senha" value={proxyPassword} onChange={(e) => setProxyPassword(e.target.value)} /></div></div>
          <div className="flex justify-end"><Button onClick={() => void save()} disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? "Salvando…" : "Salvar"}</Button></div>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog open={open === "chatwoot"} onOpenChange={(v) => !v && setOpen(null)}>
      <DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>Integração com Chatwoot</DialogTitle><DialogDescription>Conecte esta sessão a uma caixa de entrada API do Chatwoot.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div><Label>URL do Chatwoot</Label><Input className="mt-1" placeholder="https://url_seu_chatwoot" value={cfg.chatwoot.url} onChange={(e) => setCfg({ ...cfg, chatwoot: { ...cfg.chatwoot, url: e.target.value } })} /></div>
          <div className="grid grid-cols-2 gap-2"><div><Label>Account ID</Label><Input className="mt-1" value={cfg.chatwoot.account_id} onChange={(e) => setCfg({ ...cfg, chatwoot: { ...cfg.chatwoot, account_id: e.target.value } })} /></div><div><Label>Inbox ID</Label><Input className="mt-1" value={cfg.chatwoot.inbox_id} onChange={(e) => setCfg({ ...cfg, chatwoot: { ...cfg.chatwoot, inbox_id: e.target.value } })} /></div></div>
          <div><Label>Access Token</Label><Input className="mt-1" type="password" placeholder="deixe vazio para manter o atual" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} /></div>
          <div><Label>Inbox Identifier</Label><Input className="mt-1" required value={cfg.chatwoot.inbox_identifier} onChange={(e) => setCfg({ ...cfg, chatwoot: { ...cfg.chatwoot, inbox_identifier: e.target.value } })} /></div>
          <div><Label>Webhook (cole na inbox do Chatwoot)</Label><div className="mt-1 flex gap-2"><Input readOnly required value={cfg.chatwoot_webhook ?? ""} aria-label="Webhook obrigatório do Chatwoot" /><Button type="button" variant="outline" size="icon" onClick={() => void copyWebhook()} aria-label="Copiar webhook">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</Button></div></div>
          <div className="flex justify-between pt-2"><Button type="button" variant="destructive" onClick={() => void disconnectChatwoot()} disabled={saving}>Desconectar</Button><Button onClick={() => void save()} disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? "Salvando…" : "Salvar"}</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  </>;
};
