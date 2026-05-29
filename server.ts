import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Safe __filename and __dirname resolution for both ESM and CJS contexts
const getFileAndDir = () => {
  try {
    if (typeof import.meta !== "undefined" && import.meta.url) {
      const f = fileURLToPath(import.meta.url);
      return { filename: f, dirname: path.dirname(f) };
    }
  } catch (e) {
    // ignore
  }
  return { filename: "", dirname: "" };
};

const { filename: __filename, dirname: __dirname } = getFileAndDir();

interface Registration {
  id: string;
  name: string;
  phone: string;
  date: string;
  timeSlot: string;
  guests: number;
  timestamp: string;
}

// Persisted file store setup
const DATA_FILE = path.join(process.cwd(), "registrations-db.json");
let registrations: Registration[] = [];
let isPaused = false;

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      registrations = parsed.registrations || [];
      isPaused = !!parsed.isPaused;
      console.log(`Loaded ${registrations.length} registrations from persistent store.`);
    } else {
      registrations = [];
      isPaused = false;
      saveData();
    }
  } catch (err) {
    console.error("Error loading JSON database file, initializing empty:", err);
    registrations = [];
    isPaused = false;
  }
}

function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ registrations, isPaused }, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing JSON database file:", err);
  }
}

// Initial load on start
loadData();

const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || process.env.ADMIN_KEY || "UFFFRICO")
  .trim()
  .replace(/^["']|["']$/g, "")
  .toUpperCase();

const CAPACITY_LIMITS: Record<string, Record<string, number>> = {
  "Jueves 4": {
    "1:00 PM a 2:00 PM": 40,
    "3:00 PM a 4:00 PM": 0,
    "5:00 PM a 6:00 PM": 0,
    "7:00 PM a 8:00 PM": 40,
    "8:00 PM a 9:00 PM": 0
  },
  "Viernes 5": {
    "1:00 PM a 3:00 PM": 60,
    "3:00 PM a 5:00 PM": 0,
    "6:00 PM a 8:00 PM": 60,
    "8:00 PM a 10:00 PM": 0
  }
};

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

  // Custom CORS middleware to handle cross-origin requests (e.g. from Vercel)
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-password, X-Admin-Password, Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json());

  // --- API Routes ---

  // Get status and remaining spots
  app.get("/api/status", (req, res) => {
    // Calculate current counts for all slots
    const counts: Record<string, Record<string, number>> = {};
    
    registrations.forEach(r => {
      if (!counts[r.date]) counts[r.date] = {};
      counts[r.date][r.timeSlot] = (counts[r.date][r.timeSlot] || 0) + r.guests;
    });

    res.json({ isPaused, counts, limits: CAPACITY_LIMITS });
  });

  // Public Registration
  app.post("/api/register", (req, res) => {
    if (isPaused) {
      return res.status(503).json({ error: "Registro temporalmente pausado" });
    }

    const { name, phone, date, timeSlot, guests } = req.body;

    if (!name || !phone || !date || !timeSlot || guests === undefined) {
      return res.status(400).json({ error: "Faltan datos obligatorios" });
    }

    // Capacity Check
    const limit = CAPACITY_LIMITS[date]?.[timeSlot] || 0;
    const currentCount = registrations
      .filter(r => r.date === date && r.timeSlot === timeSlot)
      .reduce((sum, r) => sum + r.guests, 0);
    
    const requestedAmount = Number(guests);

    if (currentCount + requestedAmount > limit) {
      return res.status(400).json({ error: `Lo sentimos, este turno no tiene suficientes cupos disponibles (Disponibles: ${limit - currentCount})` });
    }

    // Phone validation (numeric, min 7 digits)
    if (!/^\d{7,}$/.test(phone)) {
      return res.status(400).json({ error: "Número de teléfono inválido" });
    }

    const newRegistration: Registration = {
      id: Math.random().toString(36).substring(7),
      name: name.toUpperCase(),
      phone,
      date,
      timeSlot,
      guests: Number(guests),
      timestamp: new Date().toISOString(),
    };

    registrations.push(newRegistration);
    saveData();
    res.status(201).json(newRegistration);
  });

  // Admin Routes Middleware
  const adminAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const rawPassword = req.headers["x-admin-password"] || req.headers["x-admin-key"];
    let password = (Array.isArray(rawPassword) ? rawPassword[0] : rawPassword || "").trim();

    // If headers got concatenated with a comma by proxies or browsers
    if (password.includes(",")) {
      password = password.split(",")[0].trim();
    }

    password = password.replace(/^["']|["']$/g, "").toUpperCase();

    // Fallback 1: Reading standard Authorization Bearer header (req.headers keys are lowercased by express)
    if (!password) {
      const authHeader = req.headers["authorization"];
      const rawAuth = Array.isArray(authHeader) ? authHeader[0] : authHeader;
      if (rawAuth) {
        let authToParse = rawAuth.trim();
        if (authToParse.includes(",")) {
          authToParse = authToParse.split(",")[0].trim();
        }
        const parts = authToParse.split(" ");
        password = (parts.length === 2 && parts[0].toLowerCase() === "bearer" ? parts[1] : authToParse)
          .trim()
          .replace(/^["']|["']$/g, "")
          .toUpperCase();
      }
    }

    // Fallback 2: Reading from query parameters (as final backup)
    if (!password && req.query.password) {
      password = String(req.query.password).trim().replace(/^["']|["']$/g, "").toUpperCase();
    }
    if (!password && req.query.admin_password) {
      password = String(req.query.admin_password).trim().replace(/^["']|["']$/g, "").toUpperCase();
    }

    const cleanServerPassword = ADMIN_PASSWORD.replace(/^["']|["']$/g, "").toUpperCase();

    if (password !== cleanServerPassword) {
      return res.status(401).json({ 
        error: "No autorizado",
        diagnostics: {
          receivedPasswordLength: password.length,
          receivedPasswordMasked: password ? (password.substring(0, 2) + "*".repeat(Math.max(0, password.length - 2))) : "VACIO",
          serverPasswordLength: cleanServerPassword.length,
          serverPasswordMasked: cleanServerPassword ? (cleanServerPassword.substring(0, 2) + "*".repeat(Math.max(0, cleanServerPassword.length - 2))) : "VACIO",
          headersReceived: Object.keys(req.headers),
          queryKeysReceived: Object.keys(req.query),
          passwordSource: rawPassword ? "x-admin-password header" : (req.headers["authorization"] ? "bearer token" : (req.query.password || req.query.admin_password ? "query parameter" : "none"))
        }
      });
    }
    next();
  };

  // Get all registrations
  app.get("/api/admin/registrations", adminAuth, (req, res) => {
    res.json(registrations);
  });

  // Toggle Pause
  app.post("/api/admin/toggle-pause", adminAuth, (req, res) => {
    isPaused = !isPaused;
    saveData();
    res.json({ isPaused });
  });

  // Clear all data
  app.post("/api/admin/clear", adminAuth, (req, res) => {
    registrations = [];
    saveData();
    res.json({ success: true });
  });

  // --- Vite / Static Files ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
