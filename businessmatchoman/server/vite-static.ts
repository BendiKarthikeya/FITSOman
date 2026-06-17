import express, { Express } from "express";
import path from "path";
import fs from "fs";

export function log(msg: string) {
  console.log(`[express] ${msg}`);
}

// Production static file serving without importing Vite
export function serveStatic(app: Express) {
  // Dist public assets produced by Vite build live under dist/public
  const distPublic = path.resolve("./dist/public");

  if (!fs.existsSync(distPublic)) {
    log(`dist/public not found at ${distPublic}`);
    return;
  }

  // Cache static assets aggressively; index.html should be no-cache
  app.use(
    "/",
    express.static(distPublic, {
      setHeaders: (res, resourcePath) => {
        if (resourcePath.endsWith("index.html")) {
          res.setHeader("Cache-Control", "no-cache");
        } else {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      },
    }),
  );

  // Fallback to index.html for SPA routes
  app.use((_, res) => {
    res.sendFile(path.join(distPublic, "index.html"));
  });
}

