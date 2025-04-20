import { createServer } from "node:http";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { hostname } from "node:os";
import wisp from "wisp-server-node";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";

// Obtener la ruta del directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Aquí es donde apuntas a tu propia carpeta 'public' modificada.
const customPublicPath = join(__dirname, "..", "public"); // Cambia esto si la ruta es diferente

const fastify = Fastify({
  serverFactory: (handler) => {
    return createServer()
      .on("request", (req, res) => {
        res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
        res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
        handler(req, res);
      })
      .on("upgrade", (req, socket, head) => {
        if (req.url.endsWith("/wisp/")) wisp.routeRequest(req, socket, head);
        else socket.end();
      });
  },
});

// Aquí registramos la ruta para servir tu carpeta 'public' modificada
fastify.register(fastifyStatic, {
  root: customPublicPath,  // Apuntamos a tu carpeta local de 'public'
  decorateReply: true,
});

// Si estás usando un archivo específico de configuración (como `uv.config.js`), puedes mantenerlo en esta ruta
fastify.get("/uv/uv.config.js", (req, res) => {
  return res.sendFile("uv/uv.config.js", customPublicPath);  // Usa la ruta personalizada para servir el archivo
});

// Si necesitas servir otros recursos de 'ultraviolet' o similares, puedes mantenerlo, pero siempre apunta a la ruta correcta
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";

fastify.register(fastifyStatic, {
  root: uvPath,
  prefix: "/uv/",
  decorateReply: false,
});

fastify.register(fastifyStatic, {
  root: epoxyPath,
  prefix: "/epoxy/",
  decorateReply: false,
});

fastify.register(fastifyStatic, {
  root: baremuxPath,
  prefix: "/baremux/",
  decorateReply: false,
});

// Configuración para que el servidor se escuche en todos los interfaces
fastify.server.on("listening", () => {
  const address = fastify.server.address();
  console.log("Listening on:");
  console.log(`\thttp://localhost:${address.port}`);
  console.log(`\thttp://${hostname()}:${address.port}`);
  console.log(
    `\thttp://${
      address.family === "IPv6" ? `[${address.address}]` : address.address
    }:${address.port}`
  );
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
  console.log("SIGTERM signal received: closing HTTP server");
  fastify.close();
  process.exit(0);
}

// Escoge el puerto, si no está definido, usa el puerto 8080
let port = parseInt(process.env.PORT || "8080");
if (isNaN(port)) port = 8080;

// Configuración del puerto en el servidor
fastify.listen({
  port: port,
  host: "0.0.0.0",
});
