// Proxy HTTPS local (MELHORIAS_ROADMAP §1): termina TLS e repassa para o
// Life OS em http://localhost:3000. Necessário para o PWA completo
// (instalação + notificações push) fora de localhost — navegadores só
// liberam service worker em origens seguras.
//
// Certificados:
//   - Tailscale (recomendado): `tailscale cert <maquina>.<tailnet>.ts.net`
//     gera <nome>.crt/<nome>.key — acesso https de qualquer lugar via tailnet.
//   - mkcert (rede local):     `mkcert <ip-do-pc>` gera <ip>.pem/<ip>-key.pem
//     (instale a CA do mkcert também no celular).
//
// Uso:
//   node scripts/https-proxy.mjs --cert caminho.crt --key caminho.key [--port 3443] [--target 3000]
// Sem dependências externas (https/http nativos; suporta SSE e uploads).
import fs from "fs";
import http from "http";
import https from "https";

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const certPath = arg("cert");
const keyPath = arg("key");
const port = Number(arg("port", "3443"));
const target = Number(arg("target", "3000"));

if (!certPath || !keyPath) {
  console.error("Uso: node scripts/https-proxy.mjs --cert arquivo.crt --key arquivo.key [--port 3443] [--target 3000]");
  console.error("Gere o certificado com `tailscale cert` (qualquer lugar) ou `mkcert` (rede local).");
  process.exit(1);
}
if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
  console.error(`Certificado ou chave nao encontrados: ${certPath} / ${keyPath}`);
  process.exit(1);
}

const server = https.createServer(
  { cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) },
  (req, res) => {
    const proxied = http.request(
      {
        host: "127.0.0.1",
        port: target,
        path: req.url,
        method: req.method,
        headers: {
          ...req.headers,
          // O app enxerga o host/proto originais (links absolutos, cookies).
          "x-forwarded-proto": "https",
          "x-forwarded-host": req.headers.host ?? "",
        },
      },
      (upstream) => {
        res.writeHead(upstream.statusCode ?? 502, upstream.headers);
        upstream.pipe(res); // streaming (SSE do chat funciona)
      }
    );
    proxied.on("error", () => {
      res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
      res.end(`Life OS nao respondeu em http://localhost:${target}. Ele esta aberto?`);
    });
    req.pipe(proxied);
  }
);

// WebSocket passthrough (HMR em dev; inofensivo em producao).
server.on("upgrade", (req, socket) => {
  const proxied = http.request({
    host: "127.0.0.1",
    port: target,
    path: req.url,
    method: req.method,
    headers: req.headers,
  });
  proxied.on("upgrade", (upstream, upstreamSocket, head) => {
    socket.write(
      `HTTP/1.1 101 Switching Protocols\r\n` +
        Object.entries(upstream.headers)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
          .join("\r\n") +
        "\r\n\r\n"
    );
    if (head?.length) socket.write(head);
    upstreamSocket.pipe(socket);
    socket.pipe(upstreamSocket);
  });
  proxied.on("error", () => socket.destroy());
  proxied.end();
});

server.listen(port, "0.0.0.0", () => {
  console.log(`HTTPS local ativo: https://localhost:${port} -> http://localhost:${target}`);
  console.log("Acesse pelo nome do certificado (ex.: https://meu-pc.tailnet.ts.net:" + port + ")");
});
