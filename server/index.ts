import "./config/mongoDb";
import express, { type Request, Response, NextFunction } from "express";
import { setupVite, serveStatic, log } from "./vite";
import router from "./routes/mongoRoutes";
import { createServer } from "http";
import cors from "cors";
import { initializePinecone } from "./config/pinecone.js";


const app = express();

// Enable CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] // Add your production domain
    : ['http://localhost:5173', 'http://localhost:3000'], // Vite dev server
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize Pinecone
  try {
    await initializePinecone();
  } catch (error) {
    console.warn('⚠️ Pinecone initialization failed:', error);
  }

  // Use mongoRoutes for all API endpoints (with JWT authentication)
  app.use("/api", router);
  
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Create HTTP server manually
  const server = createServer(app);

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  // Use IPv4 localhost for local development, 0.0.0.0 for Replit
  const host = process.env.REPLIT_DOMAINS || process.env.REPL_ID ? "0.0.0.0" : "127.0.0.1";
  
  server.listen(port, host, () => {
    log(`serving on ${host}:${port}`);
  });
})();
