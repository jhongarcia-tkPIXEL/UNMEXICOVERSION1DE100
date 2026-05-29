import React, { useEffect, useState, FormEvent, useMemo, ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Globe, 
  RefreshCw,
  CheckCircle2,
  Download,
  Trash2,
  Lock,
  Pause,
  Play
} from "lucide-react";
import * as XLSX from "xlsx";
import { UI_TEXT, DATES, TIME_SLOTS, GUEST_OPTIONS } from "./constants";
import { Registration, AppStatus } from "./types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const logoImg = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ6TCpwJjIJAjpLLjnNqcAmevF3p9798QasPw&s";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Sub-components

const Label = ({ children }: { children: ReactNode }) => (
  <label className="label-caps block mb-3">{children}</label>
);

interface PillButtonProps {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
}

const PillButton: React.FC<PillButtonProps> = ({ 
  selected, 
  onClick, 
  children,
  disabled 
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "px-4 py-2 text-sm font-display font-semibold uppercase tracking-tight transition-all border rounded-full text-center flex-1",
      selected 
        ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-[1.02]" 
        : "bg-white text-primary border-primary/30 hover:border-primary",
      disabled && "opacity-50 cursor-not-allowed border-gray-200 text-gray-400"
    )}
  >
    {children}
  </button>
);

interface SquareButtonProps {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}

const SquareButton: React.FC<SquareButtonProps> = ({ 
  selected, 
  onClick, 
  children 
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "w-12 h-12 flex items-center justify-center text-sm font-display font-bold uppercase transition-all border rounded-md",
      selected 
        ? "bg-primary text-white border-primary shadow-md shadow-primary/20" 
        : "bg-white text-primary border-primary/30 hover:border-primary"
    )}
  >
    {children}
  </button>
);

const DatabaseModeSelector = ({ 
  mode, 
  onChange,
  backendUrl,
  onUpdateBackendUrl
}: { 
  mode: "central" | "local"; 
  onChange: (mode: "central" | "local") => void;
  backendUrl: string;
  onUpdateBackendUrl: (url: string) => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempUrl, setTempUrl] = useState(backendUrl);

  const handleSave = () => {
    let formattedUrl = tempUrl.trim();
    if (formattedUrl && !formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = "https://" + formattedUrl;
    }
    if (formattedUrl.endsWith("/")) {
      formattedUrl = formattedUrl.slice(0, -1);
    }
    onUpdateBackendUrl(formattedUrl);
    setIsEditing(false);
  };

  return (
    <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl space-y-3 mb-6 w-full text-left">
      <div className="flex justify-between items-center">
        <span className="label-caps !mb-0 text-[10px] text-primary/60">⚙️ Base de Datos</span>
        <span className={cn(
          "px-2 py-0.5 rounded text-[9px] font-sans font-bold uppercase tracking-wider",
          mode === "central" ? "bg-green-100 text-green-700 font-semibold" : "bg-orange-100 text-orange-700 font-semibold animate-pulse"
        )}>
          {mode === "central" ? "Nube (Sincronizado)" : "Local (Dispositivo)"}
        </span>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange("central")}
          className={cn(
            "flex-1 py-3 rounded-lg text-[10px] font-display font-bold uppercase tracking-wider transition-all",
            mode === "central" 
              ? "bg-primary text-white shadow-md shadow-primary/15" 
              : "bg-white text-primary/60 border border-gray-200 hover:text-primary hover:border-primary/50"
          )}
        >
          Central (Nube)
        </button>
        <button
          type="button"
          onClick={() => onChange("local")}
          className={cn(
            "flex-1 py-3 rounded-lg text-[10px] font-display font-bold uppercase tracking-wider transition-all",
            mode === "local" 
              ? "bg-orange-600 text-white shadow-md shadow-orange-600/15" 
              : "bg-white text-primary/60 border border-gray-200 hover:text-primary hover:border-orange-500/50"
          )}
        >
          Local (Offline)
        </button>
      </div>
      {mode === "local" ? (
        <p className="text-[10px] text-orange-950 leading-relaxed font-sans">
          ⚠️ Guardando reservas provisorias únicamente en el navegador. Las reservas centrales sincronizadas de todos los clientes requieren la <strong>Base Central</strong>.
        </p>
      ) : (
        <div className="space-y-2">
          <p className="text-[10px] text-green-800 leading-relaxed font-sans">
            ✓ Conectado a la Base de Datos Compartida en tiempo real con todos los clientes.
          </p>
          <div className="pt-2 border-t border-gray-200/50 space-y-1.5">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-gray-500 font-medium truncate max-w-[220px]">
                Dirección: <code className="bg-gray-150 px-1 py-0.5 rounded text-gray-700 break-all">{backendUrl}</code>
              </span>
              <button 
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="text-primary hover:underline font-bold text-[9px] uppercase tracking-wider bg-primary/5 px-2 py-1 rounded cursor-pointer"
              >
                {isEditing ? "Cancelar" : "Editar URL"}
              </button>
            </div>
            {isEditing && (
              <div className="flex gap-1.5 pt-1">
                <input
                  type="text"
                  placeholder="https://su-server-railway.up.railway.app"
                  value={tempUrl}
                  onChange={(e) => setTempUrl(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 border border-gray-300 rounded text-[11px] font-mono outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={handleSave}
                  className="bg-primary text-white font-bold uppercase text-[9px] tracking-wider px-3 rounded hover:bg-primary/80 transition cursor-pointer"
                >
                  Guardar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Local storage keys and helpers for static hosting fallback
const STORAGE_KEYS = {
  REGISTRATIONS: "universal_registrations",
  IS_PAUSED: "universal_is_paused",
};

const getLocalRegistrations = (): Registration[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.REGISTRATIONS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveLocalRegistrations = (regs: Registration[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(regs));
  } catch (err) {
    console.error("Error saving local registrations:", err);
  }
};

const getLocalIsPaused = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEYS.IS_PAUSED) === "true";
  } catch {
    return false;
  }
};

const saveLocalIsPaused = (paused: boolean) => {
  try {
    localStorage.setItem(STORAGE_KEYS.IS_PAUSED, String(paused));
  } catch (err) {
    console.error("Error saving local pause state:", err);
  }
};

const DEFAULT_CAPACITY_LIMITS: Record<string, Record<string, number>> = {
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

const CLOUD_RUN_BACKEND_URL = "https://unmexicoversion1de100-production.up.railway.app";

const getApiUrl = (path: string): string => {
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return path;
  }
  if (window.location.hostname.includes("run.app")) {
    return path;
  }
  const stored = localStorage.getItem("custom_backend_url");
  if (stored && stored !== CLOUD_RUN_BACKEND_URL) {
    localStorage.setItem("custom_backend_url", CLOUD_RUN_BACKEND_URL);
    return `${CLOUD_RUN_BACKEND_URL}${path}`;
  }
  const customUrl = stored || CLOUD_RUN_BACKEND_URL;
  return `${customUrl}${path}`;
};

export default function App() {
  const [view, setView] = useState<"public" | "admin" | "success">("public");
  const [adminPassword, setAdminPassword] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [status, setStatus] = useState<AppStatus>({ 
    isPaused: false, 
    counts: {}, 
    limits: DEFAULT_CAPACITY_LIMITS 
  });
  const [loading, setLoading] = useState(true);
  const [databaseMode, setDatabaseMode] = useState<"central" | "local">("central");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [customError, setCustomError] = useState<string | null>(null);
  const [backendUrl, setBackendUrl] = useState(() => {
    const stored = localStorage.getItem("custom_backend_url");
    if (stored && stored !== CLOUD_RUN_BACKEND_URL) {
      localStorage.setItem("custom_backend_url", CLOUD_RUN_BACKEND_URL);
      return CLOUD_RUN_BACKEND_URL;
    }
    return stored || CLOUD_RUN_BACKEND_URL;
  });

  const handleUpdateBackendUrl = (url: string) => {
    localStorage.setItem("custom_backend_url", url);
    setBackendUrl(url);
  };

  // Form states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [guests, setGuests] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastReg, setLastReg] = useState<Registration | null>(null);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => fetchStatus(), 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [databaseMode]);

  useEffect(() => {
    if (isAuthorized) {
      fetchRegistrations();
    }
  }, [isAuthorized, databaseMode]);

  const changeDatabaseMode = async (mode: "central" | "local") => {
    setLoginError(null);
    if (mode === "local") {
      setDatabaseMode("local");
      const localRegs = getLocalRegistrations();
      const counts: Record<string, Record<string, number>> = {};
      localRegs.forEach(r => {
        if (!counts[r.date]) counts[r.date] = {};
        counts[r.date][r.timeSlot] = (counts[r.date][r.timeSlot] || 0) + r.guests;
      });
      setStatus({
        isPaused: getLocalIsPaused(),
        counts,
        limits: DEFAULT_CAPACITY_LIMITS
      });
    } else {
      setLoading(true);
      try {
        const res = await fetch(getApiUrl(`/api/status?t=${Date.now()}`));
        if (!res.ok) throw new Error("Servidor no respondió de manera exitosa.");
        const text = await res.text();
        const data = JSON.parse(text);
        setStatus(prev => ({
          ...prev,
          ...data,
          limits: data.limits || prev.limits || DEFAULT_CAPACITY_LIMITS,
          counts: data.counts || prev.counts || {}
        }));
        setDatabaseMode("central");
        setCustomError(null);
      } catch (err) {
        console.warn("Could not switch to central db:", err);
        const errMsg = err instanceof Error ? err.message : "Error de red";
        alert(`No se pudo conectar a la base de datos central: ${errMsg}. El servidor de Cloud Run podría estar iniciando (Cold Start). Por favor espera unos segundos e intenta nuevamente.`);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleToggleDatabaseMode = async (mode: "central" | "local") => {
    await changeDatabaseMode(mode);
    const password = adminPassword.trim().toUpperCase();
    if (password) {
      if (mode === "local") {
        setRegistrations(getLocalRegistrations());
      } else {
        try {
          const res = await fetch(getApiUrl("/api/admin/registrations"), {
            headers: { 
              "x-admin-password": password,
              "Authorization": `Bearer ${password}`
            }
          });
          if (res.ok) {
            const data = await res.json();
            setRegistrations(data);
          }
        } catch (e) {
          console.error("Could not load central registrations on toggle:", e);
        }
      }
    }
  };

  const fetchStatus = async () => {
    if (databaseMode === "local") {
      const localRegs = getLocalRegistrations();
      const counts: Record<string, Record<string, number>> = {};
      localRegs.forEach(r => {
        if (!counts[r.date]) counts[r.date] = {};
        counts[r.date][r.timeSlot] = (counts[r.date][r.timeSlot] || 0) + r.guests;
      });
      setStatus({
        isPaused: getLocalIsPaused(),
        counts,
        limits: DEFAULT_CAPACITY_LIMITS
      });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(getApiUrl(`/api/status?t=${Date.now()}`));
      if (!res.ok) throw new Error("Status API failure");
      
      const text = await res.text();
      const data = JSON.parse(text);

      setStatus(prev => ({
        ...prev,
        ...data,
        limits: data.limits || prev.limits || DEFAULT_CAPACITY_LIMITS,
        counts: data.counts || prev.counts || {}
      }));
      setCustomError(null);
    } catch (err) {
      console.warn("API status request failed, falling back to local simulation mode:", err);
      setDatabaseMode("local");
      const localRegs = getLocalRegistrations();
      const counts: Record<string, Record<string, number>> = {};
      localRegs.forEach(r => {
        if (!counts[r.date]) counts[r.date] = {};
        counts[r.date][r.timeSlot] = (counts[r.date][r.timeSlot] || 0) + r.guests;
      });
      setStatus({
        isPaused: getLocalIsPaused(),
        counts,
        limits: DEFAULT_CAPACITY_LIMITS
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRegistrations = async (passToUse?: string) => {
    const password = (passToUse || adminPassword || "").trim().toUpperCase();
    if (!password) return;

    if (databaseMode === "local") {
      if (password === "UFFFRICO") {
        setRegistrations(getLocalRegistrations());
        setIsAuthorized(true);
        setLoginError(null);
      } else {
        setIsAuthorized(false);
        setAdminPassword("");
        setLoginError("Contraseña incorrecta (Local)");
      }
      return;
    }

    try {
      const res = await fetch(getApiUrl("/api/admin/registrations"), {
        headers: { 
          "x-admin-password": password,
          "Authorization": `Bearer ${password}`
        }
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          let diagMsg = "Contraseña incorrecta";
          try {
            const body = await res.json();
            if (body && body.diagnostics) {
              const d = body.diagnostics;
              diagMsg = `Contraseña incorrecta. (Recibida: L=${d.receivedPasswordLength} [${d.receivedPasswordMasked}], Servidor: L=${d.serverPasswordLength} [${d.serverPasswordMasked}])`;
            }
          } catch (e) {
            // ignore
          }
          throw new Error(diagMsg);
        } else {
          throw new Error(`Error de servidor (${res.status})`);
        }
      }
      
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Respuesta inválida del servidor");
      }
      setRegistrations(data);
      setIsAuthorized(true);
      setLoginError(null);
    } catch (err) {
      console.error("fetchRegistrations failed:", err);
      const errMsg = err instanceof Error ? err.message : "Error del servidor";
      if (errMsg.startsWith("Contraseña incorrecta")) {
        setIsAuthorized(false);
        setAdminPassword("");
        setLoginError(errMsg);
      } else {
        setLoginError(`Error al conectar con la base de datos central: ${errMsg}`);
      }
    }
  };

  const missingFields = useMemo(() => {
    const missing = [];
    if (!selectedDate) missing.push("FECHA");
    if (!name) missing.push("NOMBRE");
    if (!phone || phone.length < 7) missing.push("TELÉFONO");
    if (!selectedSlot) missing.push("TURNO");
    if (guests === null) missing.push("ACOMPAÑANTES");
    return missing;
  }, [name, phone, selectedDate, selectedSlot, guests]);

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    if (missingFields.length > 0) return;

    if (databaseMode === "local") {
      try {
        setIsSubmitting(true);
        // Perform local capacity check
        const localRegs = getLocalRegistrations();
        const limit = DEFAULT_CAPACITY_LIMITS[selectedDate]?.[selectedSlot] || 0;
        const currentCount = localRegs
          .filter(r => r.date === selectedDate && r.timeSlot === selectedSlot)
          .reduce((sum, r) => sum + r.guests, 0);

        const requestedAmount = Number(guests);
        if (currentCount + requestedAmount > limit) {
          throw new Error(`Lo sentimos, este turno no tiene suficientes cupos disponibles (Disponibles: ${limit - currentCount})`);
        }

        // Phone validation (numeric, min 7 digits)
        if (!/^\d{7,}$/.test(phone)) {
          throw new Error("Número de teléfono inválido (mínimo 7 dígitos)");
        }

        const newRegistration: Registration = {
          id: Math.random().toString(36).substring(7),
          name: name.toUpperCase(),
          phone,
          date: selectedDate,
          timeSlot: selectedSlot,
          guests: Number(guests),
          timestamp: new Date().toISOString(),
        };

        const updatedRegs = [...localRegs, newRegistration];
        saveLocalRegistrations(updatedRegs);
        
        setLastReg(newRegistration);
        setView("success");
        // Reset form
        setName("");
        setPhone("");
        setSelectedDate("");
        setSelectedSlot("");
        setGuests(null);
        
        // Update local limits/counts status immediately
        const counts: Record<string, Record<string, number>> = {};
        updatedRegs.forEach(r => {
          if (!counts[r.date]) counts[r.date] = {};
          counts[r.date][r.timeSlot] = (counts[r.date][r.timeSlot] || 0) + r.guests;
        });
        setStatus({
          isPaused: getLocalIsPaused(),
          counts,
          limits: DEFAULT_CAPACITY_LIMITS
        });
      } catch (err) {
        alert(err instanceof Error ? err.message : "Fallo en el registro");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(getApiUrl("/api/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, date: selectedDate, timeSlot: selectedSlot, guests })
      });

      const text = await res.text();
      let responseData;
      try {
        responseData = JSON.parse(text);
      } catch {
        throw new Error("El servidor no pudo procesar la solicitud o respondió con formato inválido.");
      }

      if (!res.ok) {
        throw new Error(responseData.error || "Error al registrar");
      }

      setLastReg(responseData);
      setView("success");
      // Reset form
      setName("");
      setPhone("");
      setSelectedDate("");
      setSelectedSlot("");
      setGuests(null);
      fetchStatus();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Fallo en el registro");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePause = async () => {
    if (databaseMode === "local") {
      const currentPaused = getLocalIsPaused();
      saveLocalIsPaused(!currentPaused);
      setStatus(prev => ({
        ...prev,
        isPaused: !currentPaused
      }));
      return;
    }

    try {
      const res = await fetch(getApiUrl("/api/admin/toggle-pause"), {
        method: "POST",
        headers: { 
          "x-admin-password": adminPassword,
          "Authorization": `Bearer ${adminPassword}`
        }
      });
      if (!res.ok) throw new Error("Request failed");
      const text = await res.text();
      const data = JSON.parse(text);
      fetchStatus();
    } catch (err) {
      alert("Error al cambiar estado");
    }
  };

  const handleClearData = async () => {
    if (!confirm("¿Está seguro de que desea eliminar todos los registros?")) return;

    if (databaseMode === "local") {
      saveLocalRegistrations([]);
      setRegistrations([]);
      setStatus(prev => ({
        ...prev,
        counts: {}
      }));
      return;
    }

    try {
      const res = await fetch(getApiUrl("/api/admin/clear"), {
        method: "POST",
        headers: { 
          "x-admin-password": adminPassword,
          "Authorization": `Bearer ${adminPassword}`
        }
      });
      if (!res.ok) throw new Error("Request failed");
      fetchRegistrations();
      fetchStatus();
    } catch (err) {
      alert("Error al limpiar datos");
    }
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(registrations.map(r => ({
      ID: r.id,
      Nombre: r.name,
      Telefono: r.phone,
      Fecha: r.date,
      Turno: r.timeSlot,
      Personas_Total: r.guests,
      Registro: new Date(r.timestamp).toLocaleString()
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Registrations");
    XLSX.writeFile(wb, `Universal_118_Registros_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (view === "admin") {
    if (!isAuthorized) {
      return (
        <div className="min-h-screen bg-white flex flex-col items-center pt-10 px-6 max-w-[400px] mx-auto">
          <DatabaseModeSelector mode={databaseMode} onChange={changeDatabaseMode} backendUrl={backendUrl} onUpdateBackendUrl={handleUpdateBackendUrl} />
          <Lock className="w-12 h-12 text-primary mb-6" />
          <h1 className="heading-bold text-2xl text-primary mb-8">{UI_TEXT.ADMIN_TITLE}</h1>
          <form className="w-full space-y-4" onSubmit={async (e) => {
            e.preventDefault();
            const pass = adminPassword.trim().toUpperCase();
            if (!pass) {
              setLoginError("Por favor ingresa la contraseña");
              return;
            }
            setLoginError(null);
            setIsLoggingIn(true);
            try {
              setAdminPassword(pass);
              await fetchRegistrations(pass);
            } catch (err) {
              setLoginError(err instanceof Error ? err.message : "Error al iniciar sesión");
            } finally {
              setIsLoggingIn(false);
            }
          }}>
            <input
              type="password"
              placeholder={UI_TEXT.ADMIN_PASSWORD_PROMPT}
              className="w-full p-4 border border-primary/30 rounded-lg text-center outline-none focus:border-primary font-display uppercase font-bold text-lg"
              value={adminPassword}
              onChange={(e) => {
                setAdminPassword(e.target.value.toUpperCase());
                setLoginError(null);
              }}
              autoFocus
              disabled={isLoggingIn}
            />
            
            {loginError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs text-center font-sans font-semibold leading-relaxed">
                {loginError}
              </div>
            )}

            <button 
              disabled={isLoggingIn}
              className="w-full bg-primary text-white py-4 heading-bold tracking-[0.2em] rounded-lg shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  CONECTANDO...
                </>
              ) : (
                "ENTRAR"
              )}
            </button>
            <button 
              type="button" 
              onClick={() => setView("public")}
              className="w-full text-primary/60 text-xs font-display font-bold uppercase tracking-widest pt-4"
            >
              ← VOLVER AL REGISTRO
            </button>
          </form>
        </div>
      );
    }

    const stats = {
      total: registrations.length,
      byDay: DATES.reduce((acc, d) => ({ ...acc, [d.label]: registrations.filter(r => r.date === d.label).length }), {} as any),
      bySlot: TIME_SLOTS.reduce((acc, s) => ({ ...acc, [s]: registrations.filter(r => r.timeSlot === s).length }), {} as any)
    };

    return (
      <div className="min-h-screen bg-white pb-10">
        <header className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-20">
          <h1 className="heading-bold text-lg text-primary">{UI_TEXT.ADMIN_TITLE}</h1>
          <button onClick={() => { setView("public"); setIsAuthorized(false); setAdminPassword(""); }} className="text-xs font-display font-bold uppercase text-primary/60">Cerrar</button>
        </header>

        <main className="p-6 space-y-8">
          <DatabaseModeSelector mode={databaseMode} onChange={handleToggleDatabaseMode} backendUrl={backendUrl} onUpdateBackendUrl={handleUpdateBackendUrl} />

          {/* Stats */}
          <div className="grid grid-cols-1 gap-4">
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
              <span className="label-caps">{UI_TEXT.STATS_TOTAL}</span>
              <p className="text-3xl font-display font-bold text-primary">{registrations.reduce((sum, r) => sum + r.guests, 0)} Personas</p>
              <p className="text-xs text-primary/60 font-medium">({stats.total} Registros grupales)</p>
            </div>
            
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {DATES.map(d => (
                <div key={d.label} className="min-w-[140px] p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="label-caps text-[8px]">{d.label}</span>
                  <p className="text-xl font-display font-bold text-primary">{stats.byDay[d.label] || 0}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Admin Controls */}
          <div className="flex flex-col gap-3">
            <button 
              onClick={handleTogglePause}
              className={cn(
                "flex items-center justify-center gap-2 p-4 rounded-xl heading-bold text-sm tracking-widest transition-all",
                status.isPaused ? "bg-green-500 text-white" : "bg-orange-500 text-white"
              )}
            >
              {status.isPaused ? <Play size={18} /> : <Pause size={18} />}
              {status.isPaused ? UI_TEXT.RESUME_BUTTON : UI_TEXT.PAUSE_BUTTON}
            </button>
            
            <div className="flex gap-3">
              <button 
                onClick={exportToExcel}
                className="flex-1 flex items-center justify-center gap-2 bg-gray-200 text-gray-800 p-4 rounded-xl heading-bold text-[10px] tracking-widest"
              >
                <Download size={14} />
                {UI_TEXT.EXPORT_BUTTON}
              </button>
              <button 
                onClick={handleClearData}
                className="flex-1 flex items-center justify-center gap-2 bg-red-100 text-red-600 p-4 rounded-xl heading-bold text-[10px] tracking-widest"
              >
                <Trash2 size={14} />
                {UI_TEXT.CLEAR_BUTTON}
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-gray-100 rounded-xl">
            <table className="w-full text-left font-sans text-xs">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="p-3 heading-bold text-[9px] text-primary">Nombre</th>
                  <th className="p-3 heading-bold text-[9px] text-primary">Fecha/Turno</th>
                  <th className="p-3 heading-bold text-[9px] text-primary">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 uppercase font-medium">
                {registrations.map(r => (
                  <tr key={r.id}>
                    <td className="p-3">
                      <div className="font-bold text-primary">{r.name}</div>
                      <div className="text-[10px] text-gray-400">{r.phone}</div>
                    </td>
                    <td className="p-3">
                      <div className="text-gray-600">{r.date}</div>
                      <div className="text-[10px] text-primary font-bold">{r.timeSlot}</div>
                    </td>
                    <td className="p-3 text-center font-display text-lg text-primary">{r.guests}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    );
  }

  if (view === "success" && lastReg) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 max-w-[400px] mx-auto text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-primary/5 p-8 rounded-full mb-8"
        >
          <CheckCircle2 className="w-16 h-16 text-primary" />
        </motion.div>
        
        <h1 className="heading-bold text-4xl text-primary mb-4 leading-none">{UI_TEXT.SUCCESS_MESSAGE}</h1>
        <div className="space-y-2 mb-10 w-full uppercase font-display">
          <p className="text-2xl font-bold text-primary">{lastReg.name}</p>
          <div className="p-4 border-y border-primary/10">
            <p className="text-lg">{lastReg.date}</p>
            <p className="text-lg font-bold text-primary">{lastReg.timeSlot}</p>
          </div>
          <p className="text-sm font-bold opacity-60">PERSONAS: {lastReg.guests}</p>
        </div>

        <button 
          onClick={() => setView("public")}
          className="w-full bg-primary text-white py-5 heading-bold text-lg tracking-[0.2em] rounded-xl"
        >
          NUEVO REGISTRO
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-12 font-sans overflow-x-hidden">
      <div className="max-w-[400px] mx-auto px-6 relative">
        {/* Admin Link */}
        <div className="absolute top-4 right-4 z-50">
          <button 
            onClick={() => setView("admin")}
            className="p-2 heading-bold text-[10px] tracking-widest text-primary/30 hover:text-primary transition-colors cursor-pointer bg-white/10 rounded-lg"
          >
            {UI_TEXT.ADMIN_LINK}
          </button>
        </div>

        {/* Header */}
        <div className="pt-12 pb-10 text-center">
          <div className="flex justify-center mb-6">
            <div className="max-w-[220px] w-full">
              <img 
                src={logoImg} 
                alt="Ensambladora Universal de Hamburguesas Logo" 
                className="w-full h-auto object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
          <p className="heading-bold text-sm tracking-[0.3em] text-primary/60 mb-2">{UI_TEXT.INSCRIPTION}</p>
          <h1 className="heading-bold text-5xl text-primary leading-none mb-1">{UI_TEXT.MAIN_TITLE}</h1>
          <h2 className="heading-bold text-3xl text-primary leading-none mb-6">{UI_TEXT.SUBTITLE}</h2>
          {UI_TEXT.ADDRESS && (
            <p className="font-display font-medium text-sm tracking-[0.2em] text-primary/50">{UI_TEXT.ADDRESS}</p>
          )}
        </div>

        {status.isPaused ? (
          <div className="py-20 text-center space-y-4">
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-full heading-bold text-[10px]"
            >
              <Pause size={14} />
              {UI_TEXT.PAUSED_MESSAGE}
            </motion.div>
          </div>
        ) : (
          <form className="space-y-10" onSubmit={handleRegister}>
            {/* Step 1 Date */}
            <section>
              <Label>{UI_TEXT.STEP_1}</Label>
              <div className="flex flex-col gap-2">
                {DATES.map(d => (
                  <PillButton 
                    key={d.value} 
                    selected={selectedDate === d.value}
                    onClick={() => { setSelectedDate(d.value); setSelectedSlot(""); }}
                  >
                    {d.label}
                  </PillButton>
                ))}
              </div>
            </section>

            {/* Step 2 Name */}
            <section>
              <Label>{UI_TEXT.STEP_2}</Label>
              <input
                type="text"
                placeholder="—"
                className="w-full bg-transparent border-b border-primary/20 p-2 text-primary heading-bold text-xl outline-none focus:border-primary placeholder:opacity-30 uppercase"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </section>

            {/* Step 3 Phone */}
            <section>
              <Label>{UI_TEXT.STEP_3}</Label>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="Ej: 55 1234 5678"
                className="w-full bg-transparent border-b border-primary/20 p-2 text-primary font-display font-bold text-xl outline-none focus:border-primary placeholder:opacity-30"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              />
            </section>

            {/* Step 4 Slots */}
            <section>
              <Label>{UI_TEXT.STEP_4}</Label>
              {!selectedDate ? (
                <p className="text-[10px] text-gray-400 italic mt-1">{UI_TEXT.SELECT_DATE_FIRST}</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {Object.keys(status.limits[selectedDate] || {}).map(s => {
                    const limit = status.limits[selectedDate]?.[s] || 0;
                    const count = status.counts[selectedDate]?.[s] || 0;
                    const remaining = limit - count;
                    const isFull = remaining <= 0;
                    
                    return (
                      <PillButton 
                        key={s} 
                        selected={selectedSlot === s}
                        disabled={isFull && selectedSlot !== s}
                        onClick={() => setSelectedSlot(s)}
                      >
                        <div className="flex justify-between items-center w-full px-2">
                          <span>{s}</span>
                          <span className={cn("text-[10px] opacity-60 font-bold", isFull ? "text-red-500 opacity-100" : "")}>
                            {isFull ? "COMPLETO" : `${remaining} CUPOS`}
                          </span>
                        </div>
                      </PillButton>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Step 5 Guests */}
            <section>
              <Label>{UI_TEXT.STEP_5}</Label>
              <div className="flex justify-between items-center bg-primary/5 p-2 rounded-lg">
                {GUEST_OPTIONS.map(num => (
                  <SquareButton 
                    key={num} 
                    selected={guests === num}
                    onClick={() => setGuests(num)}
                  >
                    {num}
                  </SquareButton>
                ))}
              </div>
            </section>

            {/* Validation Bar */}
            <AnimatePresence>
              {missingFields.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-primary/5 border border-primary/10 p-4 rounded-xl text-center overflow-hidden"
                >
                  <p className="label-caps mb-1 opacity-60">{UI_TEXT.VALIDATION_PREFIX}</p>
                  <p className="heading-bold text-[10px] text-primary flex flex-wrap justify-center gap-1">
                    {missingFields.join(", ")}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <button
              disabled={isSubmitting || missingFields.length > 0}
              className={cn(
                "w-full py-5 heading-bold text-lg tracking-[0.2em] rounded-xl transition-all shadow-xl",
                missingFields.length > 0 
                  ? "bg-gray-100 text-gray-400 shadow-none cursor-not-allowed" 
                  : "bg-primary text-white shadow-primary/30 active:scale-95"
              )}
            >
              {isSubmitting ? <RefreshCw className="animate-spin mx-auto" /> : UI_TEXT.CONFIRM_BUTTON}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
