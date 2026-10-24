#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const arg = process.argv.indexOf("--target");
const target = path.resolve(arg >= 0 ? (process.argv[arg + 1] || ".") : ".");
const packageRoot = path.dirname(new URL(import.meta.url).pathname);

const copy = (relative) => {
  const from = path.join(packageRoot, "files", relative);
  const to = path.join(target, relative);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
};

const edit = (relative, transform) => {
  const file = path.join(target, relative);
  const before = fs.readFileSync(file, "utf8");
  const after = transform(before);
  if (after !== before) fs.writeFileSync(file, after);
};

for (const file of [
  "cmd/server/integrations.go",
  "cmd/server/server.go",
  "cmd/server/sessionstore.go",
  "client/src/components/domain/session/SessionIntegrations.tsx",
  "client/src/services/integrations.ts",
]) copy(file);

edit("cmd/server/httpapi.go", (source) => {
  if (source.includes("s.handleIntegrationsGet")) return source;
  const marker = 'mux.HandleFunc("POST /api/sessions/{sid}/pair", s.handleSessionPair)';
  const addition = `${marker}\n\tmux.HandleFunc("GET /api/sessions/{sid}/integrations", s.handleIntegrationsGet)\n\tmux.HandleFunc("PUT /api/sessions/{sid}/integrations", s.handleIntegrationsPut)\n\tmux.HandleFunc("POST /api/sessions/{sid}/chatwoot/webhook", s.handleChatwootWebhook)`;
  if (!source.includes(marker)) throw new Error("Não encontrei a rota de pairing em cmd/server/httpapi.go");
  return source.replace(marker, addition);
});

edit("client/src/components/domain/session/SessionHeader.tsx", (source) => {
  let next = source;
  if (!next.includes('SessionIntegrations"')) next = next.replace('import { Button } from "@/components/ui/button";', 'import { Button } from "@/components/ui/button";\nimport { SessionIntegrations } from "@/components/domain/session/SessionIntegrations";');
  if (!next.includes("<SessionIntegrations sid={session.id} />")) {
    const marker = "{session.paired ? (";
    const offset = next.indexOf(marker);
    if (offset < 0) throw new Error("Não encontrei o bloco de ações em SessionHeader.tsx");
    const lineStart = next.lastIndexOf("\n", offset) + 1;
    const indent = next.slice(lineStart, offset);
    next = next.slice(0, lineStart) + `${indent}<SessionIntegrations sid={session.id} />\n` + next.slice(lineStart);
  }
  if (!next.includes("wacalls:record-toggle")) {
    next = next.replace('import { Loader2, Power, QrCode } from "lucide-react";', 'import { Loader2, Mic, Power, QrCode } from "lucide-react";');
    next = next.replace('  const [busy, setBusy] = useState(false);', '  const [busy, setBusy] = useState(false);\n  const [recording, setRecording] = useState(false);');
    const marker = "<SessionIntegrations sid={session.id} />";
    const offset = next.indexOf(marker);
    if (offset < 0) throw new Error("Não encontrei o ponto de ações de SessionHeader.tsx");
    const lineStart = next.lastIndexOf("\n", offset) + 1;
    const indent = next.slice(lineStart, offset);
    const recordButton = `${indent}<Button type="button" variant={recording ? "default" : "outline"} size="sm" aria-pressed={recording} onClick={() => { const next = !recording; setRecording(next); window.dispatchEvent(new CustomEvent("wacalls:record-toggle", { detail: next })); }}>\n${indent}  <Mic className="mr-1 h-4 w-4" /> Gravar\n${indent}</Button>\n`;
    next = next.slice(0, lineStart) + recordButton + next.slice(lineStart);
  }
  return next;
});

edit("client/src/components/domain/call/Dialer.tsx", (source) => {
  if (source.includes("wacalls:record-toggle")) return source;
  const marker = "  const audio = () => {";
  const block = `  useEffect(() => {\n    const onRecordToggle = (event: Event) => setRecord(Boolean((event as CustomEvent<boolean>).detail));\n    window.addEventListener("wacalls:record-toggle", onRecordToggle);\n    return () => window.removeEventListener("wacalls:record-toggle", onRecordToggle);\n  }, []);\n\n${marker}`;
  // Older WaCalls versions already expose their own recording control in the
  // dialer and do not have the shared browser-audio block.
  if (!source.includes(marker)) return source;
  return source.replace(marker, block);
});

console.log(`Integração instalada em ${target}`);
console.log("Próximos passos: execute schema.sql, revise git diff, go test ./cmd/server e npm run build.");
