import { createReadStream, existsSync, watch } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const port = Number(process.env.PORT || 4173);
const webRoot = resolve(fileURLToPath(new URL(".", import.meta.url)));
const clients = new Set();

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

const server = createServer(async (request, response) => {
  if (request.url === "/__events") {
    response.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
    });
    response.write("event: ready\ndata: connected\n\n");
    clients.add(response);
    request.on("close", () => clients.delete(response));
    return;
  }

  const filePath = resolveFilePath(request.url || "/");
  if (!filePath) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) throw new Error("Not a file");
    response.writeHead(200, {
      "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

server.listen(port, () => {
  console.log(`L Health local preview: http://localhost:${port}/`);
});

watch(webRoot, { recursive: true }, (_eventType, fileName) => {
  if (!fileName || fileName.includes(`${sep}test${sep}`) || fileName.endsWith(".test.js")) return;
  sendReload();
});

function resolveFilePath(rawURL) {
  const url = new URL(rawURL, `http://localhost:${port}`);
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const safePath = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "");
  const filePath = resolve(join(webRoot, safePath));
  const pathIsInsideRoot = filePath === webRoot || relative(webRoot, filePath).startsWith("..") === false;
  return pathIsInsideRoot && existsSync(filePath) ? filePath : null;
}

function sendReload() {
  for (const client of clients) {
    client.write("event: reload\ndata: changed\n\n");
  }
}
