import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Bot, Sparkles, Scissors, FileText, Megaphone, Film, Play, Send,
  ChevronDown, Clock, HelpCircle, AlertCircle, Loader2, Terminal,
  ExternalLink, Plus, Upload, Globe, Database, Search, Check, Instagram,
  Linkedin, Github, MessageSquare, FileSpreadsheet, Network, X, Trash2,
  History, CheckCircle2, XCircle, RefreshCcw, Image, File, Link2,
  Zap, ArrowRight, Package, PlayCircle, Star, Download, ChevronRight,
  Wifi, WifiOff, ShieldCheck, User, AlertTriangle
} from "lucide-react";
import axios from "axios";

/* ═══════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════ */
const ORCHESTRATORS = [
  { id: "gemini",  name: "Gemini",  icon: "✨", badge: null },
  { id: "claude",  name: "Claude",  icon: "🧠", badge: "+40% kredi" },
  { id: "gpt4o",   name: "GPT-4o",  icon: "⚡", badge: "+40% kredi" }
];

const FEATURE_PILLS = [
  { id: "personal_clipper", label: "Personal Clipper", badge: "New", icon: Scissors, prompt: "Cut my video into engaging social media clips" },
  { id: "build_skills",     label: "Build with skills",              icon: FileText,  prompt: "Build a custom skill workflow for content writing" },
  { id: "create_ugc",       label: "Create UGC",                     icon: Bot,       prompt: "Generate a User Generated Content (UGC) ad script and video storyboard" },
  { id: "run_marketing",    label: "Run marketing",                  icon: Megaphone, prompt: "Generate a full marketing campaign for my product" },
  { id: "shoot_cinema",     label: "Shoot cinema",                   icon: Film,      prompt: "Shoot a cinematic short drama scene with dramatic lighting" },
  { id: "animate",          label: "Animate",                        icon: Play,      prompt: "Animate a static image and add custom motion path curves" }
];

const SUGGESTED_PROMPTS = [
  "Cut my hour-long interview into 5 vertical clips with the most engaging moments",
  "Turn my stream recording into TikTok-ready clips with auto-captions and a hook in the first second",
  "Find the best moments in my podcast and make them into 9:16 Reels"
];

/* ─── Real OAuth Provider Config ─── */
const OAUTH_PROVIDERS = [
  {
    id: "google",
    name: "Google",
    label: "Google Drive + Docs + Sheets",
    category: "Storage & Docs",
    color: "#4285f4",
    icon: Globe,
    description: "Google Drive dosyalarına, Dokümanlarına ve Tablolarına tam erişim.",
    capabilities: ["Dosya okuma/yazma", "Doküman oluşturma", "Spreadsheet güncelleme"],
  },
  {
    id: "github",
    name: "GitHub",
    label: "GitHub Repositories",
    category: "Developer",
    color: "#e6edf3",
    icon: Github,
    description: "Repo okuma, kod yazma ve Actions tetikleme.",
    capabilities: ["Repo erişimi", "Kod commit", "Actions çalıştırma"],
  },
  {
    id: "notion",
    name: "Notion",
    label: "Notion Workspace",
    category: "Notes",
    color: "#ffffff",
    icon: FileText,
    description: "Notion sayfa, veritabanı ve workspace'e tam erişim.",
    capabilities: ["Sayfa okuma/yazma", "Veritabanı güncelleme", "Yeni içerik oluşturma"],
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    label: "LinkedIn Profile",
    category: "Social",
    color: "#0077b5",
    icon: Linkedin,
    description: "Profil bilgisi okuma ve gönderi paylaşma.",
    capabilities: ["Profil okuma", "Gönderi paylaşma", "Bağlantı yönetimi"],
  },
];

/* ─── Default Skills ─── */
const DEFAULT_SKILLS = [
  { id: "ad_creative",        name: "ad-creative",               category: "Marketing & Sales",    installed: true,  rating: 4.9, uses: 12400, desc: "Ad creative üretimi — headline, CTA ve görsel tek akışta.", actions: ["Headline üret", "CTA yaz", "Banner oluştur"] },
  { id: "ugc_ad_production",  name: "ugc-ad-production",         category: "Content Creation",     installed: false, rating: 4.7, uses: 8900,  desc: "Yapay zeka UGC reklam hattı: AI yüz + çok sahneli video.", actions: ["Script yaz", "Sahne planla", "Video üret"] },
  { id: "seedance_prompting", name: "seedance-prompting",        category: "Creative & Marketing",  installed: true,  rating: 4.8, uses: 6700,  desc: "Seedance 2.0 için sinematik film prompt motoru.", actions: ["Prompt oluştur", "Sahne yaz", "Storyboard"] },
  { id: "rockstar_agent",     name: "rockstar-agent",            category: "Creative & Marketing",  installed: false, rating: 4.6, uses: 3200,  desc: "GTA V tarzı video üretimi — konseptten kameralı sahneye.", actions: ["Konsept oluştur", "Sahne yaz", "Render et"] },
  { id: "static_ads",         name: "static-ads",                category: "Marketing & Sales",    installed: false, rating: 4.5, uses: 5100,  desc: "Kazanan reklam formatlarını kendi ürününle yeniden üret.", actions: ["Format seç", "Ürün ekle", "Reklam üret"] },
  { id: "b_roll_planner",     name: "b-roll-shot-planner",       category: "Content Creation",     installed: true,  rating: 4.9, uses: 9800,  desc: "Sinematik B-roll çekim planlayıcı + görsel analiz.", actions: ["Görsel analiz", "Çekim planla", "Shot listesi"] },
  { id: "karpathy_skill",     name: "karpathy-skill",            category: "Frontend Engineer",    installed: false, rating: 4.4, uses: 2100,  desc: "Yapılandırılmış muhakeme ve kod üretim iş akışları.", actions: ["Kod analiz", "Refactor", "Açıkla"] },
  { id: "cod_thumbnail",      name: "cod-ultimate-thumbnail",    category: "Content Creation",     installed: false, rating: 4.7, uses: 4300,  desc: "COD ekran görüntülerini 3D Blender thumbnail'a çevirir.", actions: ["Screenshot al", "Render et", "Export"] }
];

/* ═══════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════ */
interface ConnectorDetail {
  provider: string;
  is_active: boolean;
  profile: { name?: string; email?: string; avatar?: string; login?: string; workspace?: string };
  scopes: string[];
  connected_at?: string;
  expires_at?: string;
}

interface SynapseTask {
  task_id: string;
  status: string;
  objective: string;
  created_at: string;
  completed_at?: string;
  result_url?: string;
  credits_consumed?: number;
  current_step?: string;
}

interface MemoryNode {
  id: string;
  label: string;
  x?: number;
  y?: number;
}

interface UploadedFile {
  file_id: string;
  filename: string;
  public_url: string;
  file_type: string;
}

interface InstallingState {
  id: string;
  progress: number;
  done: boolean;
}

/* ═══════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════ */
const API = "/api/v1";
const getToken = () => localStorage.getItem("auth_token") || "";
const authH = () => ({ Authorization: `Bearer ${getToken()}` });

const loadSkills = () => {
  try {
    const s = localStorage.getItem("synapse_skills_v3");
    if (s) return JSON.parse(s);
  } catch {}
  return DEFAULT_SKILLS;
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/* ═══════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════ */
export default function SynapsePage() {
  /* ── tab ── */
  const [tab, setTab] = useState<"workspace" | "connectors" | "skills" | "memory">("workspace");

  /* ── workspace ── */
  const [prompt, setPrompt] = useState("");
  const [orchestrator, setOrchestrator] = useState(ORCHESTRATORS[0]);
  const [orcOpen, setOrcOpen] = useState(false);
  const [genMode, setGenMode] = useState("Ask before generation");
  const [genModeOpen, setGenModeOpen] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  /* ── tasks ── */
  const [tasks, setTasks] = useState<SynapseTask[]>([]);
  const [activeTask, setActiveTask] = useState<SynapseTask | null>(null);
  const [taskLogs, setTaskLogs] = useState<any[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  /* ── connectors — REAL OAuth ── */
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set());
  const [connectorDetails, setConnectorDetails] = useState<Record<string, ConnectorDetail>>({});
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [connSearch, setConnSearch] = useState("");
  const [connectorError, setConnectorError] = useState("");
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{id: string; ok: boolean; msg: string} | null>(null);
  const oauthPopupRef = useRef<Window | null>(null);

  /* ── skills ── */
  const [skills, setSkills] = useState(loadSkills());
  const [installing, setInstalling] = useState<InstallingState | null>(null);
  const [skillDetail, setSkillDetail] = useState<typeof DEFAULT_SKILLS[0] | null>(null);
  const [skillFilter, setSkillFilter] = useState<"all" | "installed">("all");

  /* ── memory ── */
  const [memNodes, setMemNodes] = useState<MemoryNode[]>([
    { id: "n1", label: "ZexAi Marka Kılavuzu", x: 130, y: 140 },
    { id: "n2", label: "Logo: primary.png",     x: 290, y: 75  },
    { id: "n3", label: "#4F46E5 Ana Renk",       x: 310, y: 215 }
  ]);
  const [memInput, setMemInput] = useState("");
  const [memSaving, setMemSaving] = useState(false);

  /* ── upload ── */
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  /* ════════════════════════════════════════════
     OAUTH POPUP LISTENER
  ════════════════════════════════════════════ */
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "OAUTH_SUCCESS") {
        const { provider, display_name, avatar } = event.data;
        setConnectedIds(prev => new Set([...prev, provider]));
        setConnectorDetails(prev => ({
          ...prev,
          [provider]: {
            provider,
            is_active: true,
            profile: { name: display_name, avatar },
            scopes: [],
            connected_at: new Date().toISOString(),
          }
        }));
        setConnectingId(null);
        setConnectorError("");
        oauthPopupRef.current = null;
        // Refresh full details from backend
        fetchConnectorStatus();
      }
      if (event.data?.type === "OAUTH_ERROR") {
        setConnectingId(null);
        setConnectorError(event.data.message || "OAuth bağlantısı başarısız.");
        oauthPopupRef.current = null;
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  /* ── mount ── */
  useEffect(() => {
    fetchTasks();
    fetchConnectorStatus();
    fetchMemory();
  }, []);

  /* ── persist skills ── */
  useEffect(() => {
    localStorage.setItem("synapse_skills_v3", JSON.stringify(skills));
  }, [skills]);

  /* ── poll active task ── */
  useEffect(() => {
    if (!activeTask) return;
    if (activeTask.status !== "running" && activeTask.status !== "pending") return;
    const id = setInterval(() => pollTask(activeTask.task_id), 4000);
    return () => clearInterval(id);
  }, [activeTask]);

  /* ── poll popup closure ── */
  useEffect(() => {
    if (!connectingId) return;
    const id = setInterval(() => {
      if (oauthPopupRef.current?.closed) {
        setConnectingId(null);
        oauthPopupRef.current = null;
        clearInterval(id);
      }
    }, 800);
    return () => clearInterval(id);
  }, [connectingId]);

  /* ════════════════════════════════════════════
     API FUNCTIONS
  ════════════════════════════════════════════ */
  async function fetchConnectorStatus() {
    try {
      const r = await axios.get(`${API}/connectors/status`, { headers: authH() });
      const ids: string[] = r.data?.connected || [];
      setConnectedIds(new Set(ids));
      const details: Record<string, ConnectorDetail> = {};
      (r.data?.details || []).forEach((d: ConnectorDetail) => { details[d.provider] = d; });
      setConnectorDetails(details);
    } catch {
      // Fallback to old endpoint
      try {
        const r2 = await axios.get(`${API}/connectors`, { headers: authH() });
        if (r2.data?.connected) setConnectedIds(new Set(r2.data.connected));
      } catch {}
    }
  }

  async function fetchTasks() {
    try {
      const r = await axios.get(`${API}/synapse/tasks?limit=20`, { headers: authH() });
      if (r.data?.tasks) setTasks(r.data.tasks);
    } catch {}
  }

  async function fetchMemory() {
    try {
      const r = await axios.get(`${API}/synapse/memory`, { headers: authH() });
      if (r.data?.nodes?.length) {
        setMemNodes(r.data.nodes.map((n: any, i: number) => ({
          ...n, x: 100 + (i % 4) * 130, y: 70 + Math.floor(i / 4) * 110
        })));
      }
    } catch {}
  }

  async function pollTask(taskId: string) {
    try {
      const sr = await axios.get(`${API}/synapse/tasks/${taskId}`, { headers: authH() });
      const u = sr.data;
      setActiveTask(u);
      setTasks(p => p.map(t => t.task_id === taskId ? { ...t, ...u } : t));
      const lr = await axios.get(`${API}/synapse/tasks/${taskId}/logs`, { headers: authH() });
      if (lr.data?.logs) setTaskLogs(lr.data.logs);
      if (u.status === "completed" || u.status === "failed") fetchTasks();
    } catch {}
  }

  async function startTask(obj: string) {
    if (!obj.trim()) return;
    const tok = getToken();
    if (!tok) { setErrorMsg("Lütfen önce giriş yapın."); return; }
    setIsLoading(true); setErrorMsg("");
    try {
      const r = await axios.post(`${API}/synapse/tasks`, {
        objective: obj,
        context: { orchestrator: orchestrator.id, generation_mode: genMode, connectors: [...connectedIds] },
        constraints: ["Format: 9:16 vertical where relevant"],
        max_credits: 50,
        max_duration_minutes: 15
      }, { headers: { ...authH(), "Content-Type": "application/json" } });

      const task: SynapseTask = {
        task_id: r.data.task_id, status: "pending", objective: obj,
        created_at: new Date().toISOString(), current_step: "Ajan başlatılıyor..."
      };
      setActiveTask(task);
      setTasks(p => [task, ...p]);
      setTaskLogs([{ log_message: "ZexAi Supercomputer başlatıldı.", log_type: "info", created_at: new Date().toISOString() }]);
      setShowLogs(true);
      setPrompt("");
    } catch (e: any) {
      setErrorMsg(e.response?.data?.detail || "Görev başlatılamadı.");
    } finally {
      setIsLoading(false);
    }
  }

  /* ════════════════════════════════════════════
     REAL OAUTH CONNECT
  ════════════════════════════════════════════ */
  function connectProvider(providerId: string) {
    const tok = getToken();
    if (!tok) { setConnectorError("Lütfen giriş yapın."); return; }
    if (connectingId) return;

    setConnectorError("");
    setConnectingId(providerId);

    const oauthUrl = `${API}/connectors/oauth/${providerId}/start?token=${encodeURIComponent(tok)}`;

    const popup = window.open(
      oauthUrl,
      "zexai_oauth",
      "width=520,height=640,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no"
    );

    if (!popup) {
      setConnectorError("Popup engellendi. Tarayıcı ayarlarından popup'a izin verin.");
      setConnectingId(null);
      return;
    }
    oauthPopupRef.current = popup;
    popup.focus();
  }

  async function disconnectProvider(providerId: string) {
    try {
      await axios.delete(`${API}/connectors/oauth/${providerId}`, { headers: authH() });
      setConnectedIds(prev => { const n = new Set(prev); n.delete(providerId); return n; });
      setConnectorDetails(prev => { const n = { ...prev }; delete n[providerId]; return n; });
    } catch (e: any) {
      setConnectorError(e.response?.data?.detail || "Bağlantı kesilemedi.");
    }
  }

  async function testConnection(providerId: string) {
    setTestingId(providerId);
    setTestResult(null);
    try {
      const r = await axios.get(`${API}/connectors/oauth/${providerId}/test`, { headers: authH() });
      setTestResult({
        id: providerId,
        ok: r.data.ok,
        msg: r.data.ok ? `✅ Bağlantı aktif` : `⚠️ Token geçersiz (${r.data.status_code})`
      });
    } catch (e: any) {
      setTestResult({ id: providerId, ok: false, msg: "❌ Bağlantı test edilemedi." });
    } finally {
      setTestingId(null);
      setTimeout(() => setTestResult(null), 4000);
    }
  }

  /* ── Skills ── */
  async function installSkill(skillId: string) {
    const skill = skills.find((s: any) => s.id === skillId);
    if (!skill) return;
    if (skill.installed) {
      setSkills((p: any[]) => p.map(s => s.id === skillId ? { ...s, installed: false } : s));
      return;
    }
    setInstalling({ id: skillId, progress: 0, done: false });
    for (let p = 5; p <= 100; p += Math.floor(Math.random() * 15) + 5) {
      await sleep(70 + Math.random() * 90);
      setInstalling(prev => prev ? { ...prev, progress: Math.min(p, 100) } : prev);
    }
    setInstalling(prev => prev ? { ...prev, progress: 100, done: true } : prev);
    await sleep(500);
    setSkills((p: any[]) => p.map(s => s.id === skillId ? { ...s, installed: true } : s));
    setInstalling(null);
    setSkillDetail(null);
  }

  /* ── Memory ── */
  async function addMemory() {
    if (!memInput.trim()) return;
    setMemSaving(true);
    const node: MemoryNode = { id: `n_${Date.now()}`, label: memInput, x: 100 + Math.random() * 320, y: 80 + Math.random() * 220 };
    setMemNodes(p => [...p, node]);
    setMemInput("");
    try {
      const r = await axios.post(`${API}/synapse/memory`, { label: node.label }, { headers: authH() });
      if (r.data?.node?.id) setMemNodes(p => p.map(n => n.id === node.id ? { ...n, id: r.data.node.id } : n));
    } catch {}
    setMemSaving(false);
  }

  async function deleteMemory(id: string) {
    setMemNodes(p => p.filter(n => n.id !== id));
    try { await axios.delete(`${API}/synapse/memory/${id}`, { headers: authH() }); } catch {}
  }

  /* ── Upload ── */
  async function uploadFile(files: FileList | null) {
    if (!files?.length) return;
    setUploadPct(5);
    const fd = new FormData();
    fd.append("file", files[0]);
    try {
      const r = await axios.post(`${API}/files/upload`, fd, {
        headers: { ...authH(), "Content-Type": "multipart/form-data" },
        onUploadProgress: e => e.total && setUploadPct(Math.round((e.loaded / e.total) * 85))
      });
      setUploadPct(100);
      if (r.data?.file_id) {
        const f: UploadedFile = { file_id: r.data.file_id, filename: r.data.filename, public_url: r.data.public_url, file_type: r.data.file_type };
        setUploadedFiles(p => [f, ...p]);
        setPrompt(p => p + (p ? "\n" : "") + `[File: ${f.filename}] ${f.public_url}`);
        setUploadOpen(false);
      }
    } catch (e: any) {
      setErrorMsg(e.response?.data?.detail || "Dosya yüklenemedi.");
    } finally {
      setTimeout(() => setUploadPct(0), 800);
    }
  }

  /* ── Status helpers ── */
  const statusBadge = (s: string) =>
    s === "completed" ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" :
    s === "failed"    ? "text-red-400 border-red-500/30 bg-red-500/10" :
    s === "running"   ? "text-blue-400 border-blue-500/30 bg-blue-500/10" :
                        "text-amber-400 border-amber-500/30 bg-amber-500/10";

  const statusIcon = (s: string) =>
    s === "completed" ? <CheckCircle2 className="w-3 h-3" /> :
    s === "failed"    ? <XCircle className="w-3 h-3" /> :
    s === "running"   ? <Loader2 className="w-3 h-3 animate-spin" /> :
                        <RefreshCcw className="w-3 h-3 animate-spin" />;

  const filteredProviders = OAUTH_PROVIDERS.filter(p =>
    !connSearch || p.name.toLowerCase().includes(connSearch.toLowerCase()) ||
    p.label.toLowerCase().includes(connSearch.toLowerCase())
  );

  const filteredSkills = skills.filter((s: any) => skillFilter === "all" ? true : s.installed);

  /* ══════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════ */
  return (
    <div className="min-h-[calc(100vh-4rem)] w-full bg-[#070809] text-white flex flex-col font-sans overflow-x-hidden relative">

      {/* ── TOP NAV ── */}
      <div className="w-full bg-[#0e0f12] border-b border-white/5 px-5 py-2 flex items-center justify-between text-[11px] text-gray-400 z-30 sticky top-0">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
          <span>Kie.ai Powered Supercomputer</span>
          {connectedIds.size > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold flex items-center gap-1">
              <Wifi className="w-2.5 h-2.5" /> {connectedIds.size} bağlı
            </span>
          )}
        </div>

        <div className="flex items-center bg-white/5 p-0.5 rounded-full border border-white/8 gap-0.5">
          {(["workspace", "connectors", "skills", "memory"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-full text-[11px] font-semibold capitalize transition-all duration-200 ${tab === t ? "bg-indigo-600 text-white shadow" : "text-gray-400 hover:text-white"}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setShowHistory(true)} className="flex items-center gap-1 hover:text-white transition-colors">
            <History className="w-3.5 h-3.5" /> Geçmiş ({tasks.length})
          </button>
          <button className="flex items-center gap-1 hover:text-white transition-colors">
            <HelpCircle className="w-3.5 h-3.5" /> Kısayollar
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 max-w-5xl w-full mx-auto px-4 py-10 flex flex-col items-center z-10">

        {/* ════════════════════════════════
            WORKSPACE TAB
        ════════════════════════════════ */}
        {tab === "workspace" && (
          <div className="w-full flex flex-col items-center gap-10">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 via-blue-500 to-indigo-700 flex items-center justify-center shadow-[0_0_40px_rgba(99,102,241,0.4)] hover:scale-105 transition-transform duration-300">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
                Bugün ne{" "}
                <span className="bg-gradient-to-r from-indigo-300 via-blue-200 to-violet-300 bg-clip-text text-transparent font-light">
                  üretiyoruz?
                </span>
              </h1>
              <p className="text-gray-500 text-sm max-w-md">Bir hedef yaz, ZexAi Supercomputer planı yap ve otomatik çalıştır.</p>
            </div>

            {/* Prompt box */}
            <div className="w-full max-w-3xl">
              <div className={`w-full bg-[#111316] border rounded-3xl p-3 flex flex-col gap-3 shadow-[0_16px_60px_rgba(0,0,0,0.6)] transition-all duration-300 ${errorMsg ? "border-red-500/40" : "border-white/8 focus-within:border-indigo-500/50"}`}>
                {uploadedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 px-3 pt-1">
                    {uploadedFiles.map(f => (
                      <div key={f.file_id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[10px] text-indigo-300">
                        {f.file_type === "image" ? <Image className="w-3 h-3" /> : <File className="w-3 h-3" />}
                        <span className="max-w-[100px] truncate">{f.filename}</span>
                        <button onClick={() => setUploadedFiles(p => p.filter(x => x.file_id !== f.file_id))} className="hover:text-red-400 ml-0.5"><X className="w-2.5 h-2.5" /></button>
                      </div>
                    ))}
                  </div>
                )}

                <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
                  placeholder="Bir hedef yaz veya YouTube URL'si yapıştır..."
                  rows={3}
                  className="w-full bg-transparent resize-none outline-none text-gray-100 placeholder-gray-600 px-3 pt-1 text-sm leading-relaxed"
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); startTask(prompt); } }} />

                <div className="flex items-center justify-between border-t border-white/6 pt-3 px-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* + menu */}
                    <div className="relative">
                      <button onClick={() => setPlusOpen(!plusOpen)} className="w-8 h-8 rounded-full bg-white/6 hover:bg-white/10 border border-white/8 flex items-center justify-center text-gray-400 hover:text-white transition-all">
                        <Plus className="w-4 h-4" />
                      </button>
                      {plusOpen && (
                        <div className="absolute left-0 bottom-11 w-48 bg-[#13151a] border border-white/10 rounded-2xl py-1.5 shadow-2xl z-50 text-xs">
                          {[
                            { label: "Dosya Yükle", icon: <Upload className="w-4 h-4 text-indigo-400" />, action: () => { setUploadOpen(true); setPlusOpen(false); } },
                            { label: "Connector Ekle", icon: <Link2 className="w-4 h-4 text-emerald-400" />, action: () => { setTab("connectors"); setPlusOpen(false); } },
                            { label: "Skill Kullan", icon: <Package className="w-4 h-4 text-amber-400" />, action: () => { setTab("skills"); setPlusOpen(false); } },
                          ].map(item => (
                            <button key={item.label} onClick={item.action} className="w-full text-left px-4 py-2.5 hover:bg-white/5 flex items-center gap-3 text-gray-300 transition-colors">
                              {item.icon}{item.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Orchestrator */}
                    <div className="relative">
                      <button onClick={() => setOrcOpen(!orcOpen)} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/6 hover:bg-white/10 border border-white/8 text-xs text-gray-300 font-semibold transition-all">
                        <span>{orchestrator.icon}</span><span>{orchestrator.name}</span>
                        {orchestrator.badge && <span className="text-amber-400/80 text-[9px]">{orchestrator.badge}</span>}
                        <ChevronDown className="w-3 h-3 text-gray-500" />
                      </button>
                      {orcOpen && (
                        <div className="absolute left-0 bottom-12 w-52 bg-[#13151a] border border-white/10 rounded-2xl py-2 shadow-2xl z-50">
                          {ORCHESTRATORS.map(o => (
                            <button key={o.id} onClick={() => { setOrchestrator(o); setOrcOpen(false); }}
                              className="w-full text-left px-4 py-2.5 hover:bg-white/5 flex items-center gap-3 text-xs text-gray-300 transition-colors">
                              <span className="text-base">{o.icon}</span>
                              <div><div className="font-semibold">{o.name}</div>{o.badge && <div className="text-[9px] text-amber-400/70">{o.badge}</div>}</div>
                              {orchestrator.id === o.id && <Check className="w-3 h-3 text-indigo-400 ml-auto" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Gen mode */}
                    <div className="relative">
                      <button onClick={() => setGenModeOpen(!genModeOpen)} className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-white/8 text-xs text-gray-500 hover:text-gray-300 transition-all">
                        {genMode}<ChevronDown className="w-3 h-3 ml-0.5" />
                      </button>
                      {genModeOpen && (
                        <div className="absolute left-0 bottom-12 w-52 bg-[#13151a] border border-white/10 rounded-xl py-1 shadow-2xl z-50 text-xs">
                          {["Ask before generation", "Autonomous generation", "Draft mode"].map(m => (
                            <button key={m} onClick={() => { setGenMode(m); setGenModeOpen(false); }}
                              className="w-full text-left px-4 py-2.5 hover:bg-white/5 text-gray-400 hover:text-white flex items-center justify-between transition-colors">
                              {m}{genMode === m && <Check className="w-3 h-3 text-indigo-400" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <button onClick={() => startTask(prompt)} disabled={isLoading || !prompt.trim()}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${prompt.trim() ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 hover:scale-105" : "bg-white/5 text-gray-600 cursor-not-allowed"}`}>
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="mt-3 p-3 bg-red-950/40 border border-red-500/30 rounded-xl flex items-center gap-2 text-xs text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0" /><span>{errorMsg}</span>
                  <button onClick={() => setErrorMsg("")} className="ml-auto hover:text-red-300"><X className="w-3.5 h-3.5" /></button>
                </div>
              )}
            </div>

            {/* Feature pills */}
            <div className="flex flex-wrap justify-center gap-2">
              {FEATURE_PILLS.map(p => {
                const Icon = p.icon;
                return (
                  <button key={p.id} onClick={() => setPrompt(p.prompt)}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/4 hover:bg-white/8 border border-white/8 hover:border-white/16 text-xs text-gray-400 hover:text-gray-200 font-semibold transition-all duration-200 group">
                    <Icon className="w-3.5 h-3.5 group-hover:text-indigo-400 transition-colors" />
                    {p.label}
                    {p.badge && <span className="px-1.5 py-0.5 rounded text-[9px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">{p.badge}</span>}
                  </button>
                );
              })}
            </div>

            {/* Suggested prompts */}
            <div className="w-full max-w-2xl space-y-2 border-t border-white/5 pt-6">
              {SUGGESTED_PROMPTS.map((s, i) => (
                <button key={i} onClick={() => setPrompt(s)}
                  className="w-full text-left flex items-start gap-3 p-3 rounded-xl hover:bg-white/4 border border-transparent hover:border-white/8 text-sm text-gray-500 hover:text-gray-300 transition-all duration-200 group">
                  <ArrowRight className="w-4 h-4 shrink-0 mt-0.5 text-indigo-500/60 group-hover:text-indigo-400 transition-colors" />
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ════════════════════════════════
            CONNECTORS TAB — REAL OAUTH
        ════════════════════════════════ */}
        {tab === "connectors" && (
          <div className="w-full space-y-6 animate-in fade-in duration-300">
            <div className="flex items-end justify-between border-b border-white/6 pb-5">
              <div>
                <h2 className="text-2xl font-bold">Gerçek Bağlantılar</h2>
                <p className="text-xs text-gray-500 mt-1">
                  OAuth 2.0 ile güvenli bağlantı — token'lar şifreli saklanır.
                  {connectedIds.size > 0 && <span className="ml-2 text-emerald-400 font-semibold">{connectedIds.size} aktif bağlantı</span>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={fetchConnectorStatus} className="p-2 hover:bg-white/5 rounded-lg text-gray-500 hover:text-white transition-colors">
                  <RefreshCcw className="w-3.5 h-3.5" />
                </button>
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-600 absolute left-3 top-2.5" />
                  <input value={connSearch} onChange={e => setConnSearch(e.target.value)}
                    placeholder="Ara..." className="w-48 bg-white/5 border border-white/8 rounded-full py-2 pl-9 pr-4 text-xs outline-none text-gray-300 focus:border-indigo-500 transition-colors" />
                </div>
              </div>
            </div>

            {/* Global connector error */}
            {connectorError && (
              <div className="p-3 bg-red-950/30 border border-red-500/20 rounded-xl flex items-center gap-2 text-xs text-red-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{connectorError}</span>
                <button onClick={() => setConnectorError("")} className="ml-auto hover:text-red-300"><X className="w-3.5 h-3.5" /></button>
              </div>
            )}

            {/* Providers grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProviders.map(provider => {
                const Icon = provider.icon;
                const isConn = connectedIds.has(provider.id);
                const isConnecting = connectingId === provider.id;
                const detail = connectorDetails[provider.id];
                const isThisTesting = testingId === provider.id;
                const thisTestResult = testResult?.id === provider.id ? testResult : null;

                return (
                  <div key={provider.id}
                    className={`relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 ${
                      isConn ? "bg-emerald-500/5 border-emerald-500/20" :
                      isConnecting ? "bg-indigo-500/5 border-indigo-500/25 animate-pulse" :
                      "bg-white/2 border-white/8 hover:border-white/14"
                    }`}>

                    {/* Connected indicator line */}
                    {isConn && <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-500 to-teal-400" />}
                    {isConnecting && <div className="absolute top-0 left-0 h-0.5 bg-gradient-to-r from-indigo-500 to-blue-400 animate-[pulse_1s_ease-in-out_infinite]" style={{ width: "100%" }} />}

                    {/* Header row */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 transition-all duration-300 ${
                          isConn ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                          isConnecting ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" :
                          "bg-white/5 border-white/10 text-gray-400"
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold text-gray-200">{provider.name}</h3>
                            <span className="px-1.5 py-0.5 rounded text-[8px] bg-white/5 text-gray-500 border border-white/8">{provider.category}</span>
                            {isConn && <span className="flex items-center gap-0.5 text-[9px] text-emerald-400 font-bold"><ShieldCheck className="w-3 h-3" /> Güvenli</span>}
                          </div>

                          {/* Status line */}
                          <div className="mt-1 min-h-[18px]">
                            {isConnecting && (
                              <p className="text-[11px] text-indigo-400 flex items-center gap-1.5 animate-pulse">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                OAuth penceresi açık — onay bekleniyor...
                              </p>
                            )}
                            {isConn && !isConnecting && detail?.profile?.name && (
                              <div className="flex items-center gap-2">
                                {detail.profile.avatar && (
                                  <img src={detail.profile.avatar} alt="" className="w-4 h-4 rounded-full object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
                                )}
                                <p className="text-[11px] text-emerald-400/80 flex items-center gap-1">
                                  <Wifi className="w-3 h-3" />
                                  {detail.profile.name}
                                  {detail.profile.email && <span className="text-gray-500">· {detail.profile.email}</span>}
                                </p>
                              </div>
                            )}
                            {isConn && !isConnecting && !detail?.profile?.name && (
                              <p className="text-[11px] text-emerald-400/70 flex items-center gap-1"><Wifi className="w-3 h-3" /> Bağlı · Aktif</p>
                            )}
                            {!isConnecting && !isConn && (
                              <p className="text-[11px] text-gray-600">Bağlı değil</p>
                            )}
                          </div>

                          {/* Test result */}
                          {thisTestResult && (
                            <p className={`text-[10px] mt-1 font-mono ${thisTestResult.ok ? "text-emerald-400" : "text-red-400"}`}>
                              {thisTestResult.msg}
                            </p>
                          )}

                          {/* Capabilities */}
                          {!isConn && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {provider.capabilities.map(cap => (
                                <span key={cap} className="text-[9px] px-1.5 py-0.5 rounded bg-white/3 text-gray-600 border border-white/5">{cap}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-col gap-2 shrink-0">
                        {isConn ? (
                          <>
                            {/* Test */}
                            <button onClick={() => testConnection(provider.id)} disabled={isThisTesting}
                              className="px-3 py-1.5 rounded-full text-[10px] font-bold border border-white/10 bg-white/4 text-gray-400 hover:text-white hover:bg-white/8 transition-all flex items-center gap-1.5 min-w-[80px] justify-center">
                              {isThisTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                              {isThisTesting ? "Test..." : "Test Et"}
                            </button>
                            {/* Disconnect */}
                            <button onClick={() => disconnectProvider(provider.id)}
                              className="px-3 py-1.5 rounded-full text-[10px] font-bold border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/15 transition-all flex items-center gap-1.5 min-w-[80px] justify-center">
                              <WifiOff className="w-3 h-3" /> Kes
                            </button>
                          </>
                        ) : (
                          <button onClick={() => connectProvider(provider.id)} disabled={isConnecting}
                            className={`px-4 py-2 rounded-full text-[11px] font-bold border transition-all duration-200 min-w-[90px] flex items-center justify-center gap-1.5 ${
                              isConnecting
                                ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 cursor-wait"
                                : "bg-white/6 text-gray-300 border-white/10 hover:bg-indigo-500/10 hover:text-indigo-300 hover:border-indigo-500/20"
                            }`}>
                            {isConnecting ? <><Loader2 className="w-3 h-3 animate-spin" /> Bekleniyor</> : <><Link2 className="w-3 h-3" /> Bağlan</>}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Connected details strip */}
                    {isConn && detail && (
                      <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-4 text-[10px] text-gray-500 font-mono">
                        <span>Bağlandı: {detail.connected_at ? new Date(detail.connected_at).toLocaleDateString("tr-TR") : "—"}</span>
                        {detail.expires_at && <span>· Sona erer: {new Date(detail.expires_at).toLocaleDateString("tr-TR")}</span>}
                        {detail.profile.workspace && <span>· Workspace: {detail.profile.workspace}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Info box */}
            <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/15 text-xs text-blue-300/70 flex items-start gap-3">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-blue-400" />
              <div>
                <p className="font-semibold text-blue-300 mb-1">OAuth 2.0 Güvenlik</p>
                <p>Tüm token'lar Fernet şifrelemesiyle veritabanında saklanır. Şifrenize veya hesabınıza erişilmez — yalnızca seçtiğiniz izinler verilir. İstediğiniz zaman bağlantıyı "Kes" butonu ile kesebilirsiniz.</p>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════
            SKILLS TAB
        ════════════════════════════════ */}
        {tab === "skills" && (
          <div className="w-full space-y-6 animate-in fade-in duration-300">
            <div className="flex items-end justify-between border-b border-white/6 pb-5">
              <div>
                <h2 className="text-2xl font-bold">Skill Marketi</h2>
                <p className="text-xs text-gray-500 mt-1">ZexAi Supercomputer'ı özel ajan yetenekleriyle geliştir.</p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <button onClick={() => setSkillFilter("all")} className={`px-3 py-1.5 rounded-lg font-bold border transition-all ${skillFilter === "all" ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/30" : "bg-white/4 text-gray-500 border-white/8 hover:text-gray-300"}`}>Tümü ({skills.length})</button>
                <button onClick={() => setSkillFilter("installed")} className={`px-3 py-1.5 rounded-lg font-bold border transition-all ${skillFilter === "installed" ? "bg-emerald-600/20 text-emerald-300 border-emerald-500/30" : "bg-white/4 text-gray-500 border-white/8 hover:text-gray-300"}`}>Kurulu ({skills.filter((s: any) => s.installed).length})</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredSkills.map((skill: any) => {
                const isInstalling = installing?.id === skill.id;
                return (
                  <div key={skill.id}
                    className={`relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 cursor-pointer group ${skill.installed ? "bg-white/3 border-indigo-500/15 hover:border-indigo-500/30" : "bg-white/2 border-white/6 hover:border-white/12"}`}
                    onClick={() => !isInstalling && setSkillDetail(skill)}>

                    {isInstalling && (
                      <div className="absolute top-0 left-0 h-0.5 bg-gradient-to-r from-indigo-500 to-violet-400 transition-all duration-200" style={{ width: `${installing.progress}%` }} />
                    )}

                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-all ${skill.installed ? "bg-indigo-500/15 border-indigo-500/25 text-indigo-300" : "bg-white/5 border-white/10 text-gray-500"}`}>
                          <Bot className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold text-gray-200 truncate">{skill.name}</h3>
                            <span className="px-1.5 py-0.5 rounded text-[8px] bg-white/5 text-gray-500 border border-white/8 shrink-0">{skill.category}</span>
                          </div>
                          <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{skill.desc}</p>
                          <div className="flex items-center gap-3 mt-1.5 text-[10px]">
                            <span className="flex items-center gap-1 text-amber-400/80"><Star className="w-2.5 h-2.5 fill-amber-400/80" /> {skill.rating}</span>
                            <span className="text-gray-600">{skill.uses.toLocaleString()} kullanım</span>
                          </div>
                        </div>
                      </div>

                      <div onClick={e => { e.stopPropagation(); installSkill(skill.id); }}>
                        <button disabled={isInstalling}
                          className={`shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-bold border transition-all duration-200 min-w-[90px] flex items-center justify-center gap-1.5 ${
                            isInstalling ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 cursor-wait" :
                            skill.installed ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20" :
                            "bg-white/6 text-gray-300 border-white/10 hover:bg-indigo-500/10 hover:text-indigo-300 hover:border-indigo-500/20"
                          }`}>
                          {isInstalling ? <><Loader2 className="w-3 h-3 animate-spin" />{installing?.progress}%</> :
                           skill.installed ? <><Check className="w-3 h-3" /> Kurulu</> :
                           <><Download className="w-3 h-3" /> Kur</>}
                        </button>
                      </div>
                    </div>

                    {skill.installed && !isInstalling && (
                      <div className="mt-4 flex items-center gap-2 flex-wrap">
                        {skill.actions.map((a: string) => (
                          <button key={a} onClick={e => { e.stopPropagation(); setPrompt(a + " skill'ini kullanarak bir görev yürüt"); setTab("workspace"); }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/8 hover:bg-indigo-500/15 border border-indigo-500/15 text-indigo-300 text-[10px] font-semibold transition-all">
                            <PlayCircle className="w-2.5 h-2.5" />{a}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ════════════════════════════════
            MEMORY TAB
        ════════════════════════════════ */}
        {tab === "memory" && (
          <div className="w-full space-y-6 animate-in fade-in duration-300">
            <div className="text-center py-4 border-b border-white/6">
              <h2 className="text-2xl font-bold">Supercomputer Memory</h2>
              <p className="text-xs text-gray-500 mt-1">Her konuşma ve yüklenen dosyadan öğrenerek hafızan büyür.</p>
            </div>

            <div className="relative w-full h-[320px] bg-[#060708] border border-white/6 rounded-3xl overflow-hidden flex items-center justify-center">
              <div className="absolute w-72 h-72 border border-indigo-500/8 rounded-full animate-ping opacity-20" />
              <div className="absolute w-48 h-48 border border-blue-500/8 rounded-full animate-[pulse_4s_ease-in-out_infinite] opacity-30" />
              <div className="relative z-10 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-[0_0_40px_rgba(99,102,241,0.6)] border border-indigo-400/40 animate-pulse">
                <Network className="w-7 h-7 text-white" />
              </div>
              {memNodes.map(node => (
                <div key={node.id} style={{ transform: `translate(${(node.x ?? 0) - 240}px, ${(node.y ?? 0) - 160}px)` }} className="absolute group">
                  <div className="px-3 py-2 rounded-xl bg-[#12141a]/90 backdrop-blur border border-indigo-500/25 text-[10px] text-gray-300 font-semibold hover:border-indigo-400 hover:scale-105 transition-all duration-200 cursor-default shadow-lg flex items-center gap-2">
                    <span className="max-w-[110px] truncate">{node.label}</span>
                    <button onClick={() => deleteMemory(node.id)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all"><X className="w-2.5 h-2.5" /></button>
                  </div>
                </div>
              ))}
              <div className="absolute bottom-4 right-4 text-[9px] text-gray-700 font-mono">{memNodes.length} NODES · GRAPH SYNCED</div>
            </div>

            <div className="w-full max-w-lg mx-auto flex items-center gap-2 bg-white/4 border border-white/8 rounded-full p-2 focus-within:border-indigo-500/50 transition-colors shadow-xl">
              <span className="text-[11px] text-gray-500 font-bold pl-4 shrink-0">Hatırla ki:</span>
              <input value={memInput} onChange={e => setMemInput(e.target.value)}
                placeholder="örn. Ana renk #4F46E5, logo primary.png..."
                className="flex-1 bg-transparent outline-none text-xs text-gray-200 placeholder-gray-600"
                onKeyDown={e => { if (e.key === "Enter") addMemory(); }} />
              <button onClick={addMemory} disabled={memSaving || !memInput.trim()}
                className="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white flex items-center justify-center transition-all shadow">
                {memSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-4 h-4" />}
              </button>
            </div>

            {memNodes.length > 0 && (
              <div className="w-full max-w-lg mx-auto space-y-1.5 max-h-44 overflow-y-auto">
                <p className="text-[9px] text-gray-600 font-mono uppercase tracking-widest mb-2">Kayıtlı — {memNodes.length} giriş</p>
                {memNodes.map(n => (
                  <div key={n.id} className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/3 border border-white/6 text-xs text-gray-400 hover:border-white/10 transition-colors">
                    <span className="truncate">{n.label}</span>
                    <button onClick={() => deleteMemory(n.id)} className="hover:text-red-400 transition-colors ml-3 shrink-0"><Trash2 className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ════════════════════════════════
          SKILL DETAIL MODAL
      ════════════════════════════════ */}
      {skillDetail && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setSkillDetail(null)}>
          <div className="bg-[#0e1013] border border-white/10 rounded-3xl w-full max-w-md shadow-2xl p-6 flex flex-col gap-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${skillDetail.installed ? "bg-indigo-500/15 border-indigo-500/25 text-indigo-300" : "bg-white/6 border-white/10 text-gray-400"}`}><Bot className="w-6 h-6" /></div>
                <div>
                  <h3 className="font-bold text-gray-100">{skillDetail.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-gray-500 border border-white/8">{skillDetail.category}</span>
                    <span className="text-[10px] text-amber-400/80 flex items-center gap-0.5"><Star className="w-2.5 h-2.5 fill-amber-400/80" /> {skillDetail.rating}</span>
                    <span className="text-[10px] text-gray-600">{skillDetail.uses.toLocaleString()} kullanım</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setSkillDetail(null)} className="text-gray-600 hover:text-gray-300 transition-colors"><X className="w-4 h-4" /></button>
            </div>

            <p className="text-sm text-gray-400 leading-relaxed">{skillDetail.desc}</p>

            <div>
              <p className="text-[10px] text-gray-600 font-mono uppercase tracking-widest mb-2">Hızlı Aksiyonlar</p>
              <div className="flex flex-wrap gap-2">
                {skillDetail.actions.map((a: string) => (
                  <button key={a} onClick={() => { setPrompt(a + " skill'ini kullanarak bir görev yürüt"); setTab("workspace"); setSkillDetail(null); }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-500/8 hover:bg-indigo-500/15 border border-indigo-500/15 text-indigo-300 text-xs font-semibold transition-all">
                    <PlayCircle className="w-3 h-3" />{a}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => installSkill(skillDetail.id)}
              className={`w-full py-3 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                skillDetail.installed ? "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20" : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30"
              }`}>
              {installing?.id === skillDetail.id ? <><Loader2 className="w-4 h-4 animate-spin" /> Kuruluyor {installing.progress}%</> :
               skillDetail.installed ? <><XCircle className="w-4 h-4" /> Kaldır</> :
               <><Download className="w-4 h-4" /> Kur — Ücretsiz</>}
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════
          LOG CONSOLE DRAWER
      ════════════════════════════════ */}
      {showLogs && activeTask && (
        <div className="fixed bottom-0 right-0 w-full md:w-[460px] h-[440px] bg-[#0a0b0d] border-t md:border-l border-white/8 shadow-2xl z-50 flex flex-col rounded-t-3xl md:rounded-tl-3xl md:rounded-t-none animate-in slide-in-from-bottom md:slide-in-from-right duration-300">
          <div className="p-4 border-b border-white/6 flex items-center justify-between bg-[#0e0f12] rounded-t-3xl md:rounded-tl-3xl md:rounded-t-none">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-gray-200">Orchestration Console</span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border flex items-center gap-1 ${statusBadge(activeTask.status)}`}>
                {statusIcon(activeTask.status)} {activeTask.status.toUpperCase()}
              </span>
            </div>
            <button onClick={() => setShowLogs(false)} className="text-gray-600 hover:text-gray-300 transition-colors"><X className="w-4 h-4" /></button>
          </div>
          <div className="px-4 py-2.5 bg-white/2 border-b border-white/6 text-[11px] text-gray-500 italic truncate">» {activeTask.objective}</div>
          <div className="flex-1 p-4 overflow-y-auto font-mono text-[11px] space-y-2.5 bg-[#060708]">
            {taskLogs.map((log, i) => (
              <div key={i} className={`p-2.5 rounded-xl border ${log.log_type === "error" ? "bg-red-950/20 border-red-500/15 text-red-400" : log.log_type === "warning" ? "bg-amber-950/20 border-amber-500/15 text-amber-400" : "bg-white/2 border-white/5 text-gray-300"}`}>
                <div className="flex justify-between text-[9px] text-gray-600 mb-1"><span>{new Date(log.created_at).toLocaleTimeString()}</span><span>{log.log_type?.toUpperCase()}</span></div>
                {log.log_message}
              </div>
            ))}
            {(activeTask.status === "running" || activeTask.status === "pending") && (
              <div className="flex items-center gap-2 text-indigo-400 text-[10px] animate-pulse"><Loader2 className="w-3 h-3 animate-spin" />{activeTask.current_step || "İşleniyor..."}</div>
            )}
            {activeTask.status === "completed" && (
              <div className="p-3 bg-emerald-950/20 border border-emerald-500/15 rounded-xl text-emerald-400">
                <div className="flex items-center gap-1.5 font-bold text-xs mb-1"><CheckCircle2 className="w-4 h-4" /> Tamamlandı!</div>
                {activeTask.credits_consumed && <p className="text-[10px] text-emerald-500/70">{activeTask.credits_consumed} ZEX kredi harcandı.</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════
          HISTORY MODAL
      ════════════════════════════════ */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setShowHistory(false)}>
          <div className="bg-[#0e1013] border border-white/10 rounded-3xl w-full max-w-xl max-h-[75vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-white/6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-400" />
                <span className="font-bold text-gray-200">Görev Geçmişi</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/15">{tasks.length}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={fetchTasks} className="p-1.5 hover:bg-white/5 rounded-lg text-gray-500 hover:text-white transition-colors"><RefreshCcw className="w-3.5 h-3.5" /></button>
                <button onClick={() => setShowHistory(false)} className="p-1.5 hover:bg-white/5 rounded-lg text-gray-500 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {tasks.length === 0 ? (
                <div className="text-center py-12 text-gray-600"><Terminal className="w-8 h-8 mx-auto mb-3 opacity-30" /><p className="text-sm">Henüz görev yok.</p></div>
              ) : tasks.map(task => (
                <div key={task.task_id} onClick={() => { setActiveTask(task); pollTask(task.task_id); setShowLogs(true); setShowHistory(false); }}
                  className="p-4 rounded-2xl bg-white/3 border border-white/6 hover:border-white/12 cursor-pointer transition-all group">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-gray-300 line-clamp-2 group-hover:text-white transition-colors">{task.objective}</p>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold border flex items-center gap-1 ${statusBadge(task.status)}`}>{statusIcon(task.status)} {task.status}</span>
                  </div>
                  <p className="text-[10px] text-gray-600 mt-1">{new Date(task.created_at).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════
          UPLOAD MODAL
      ════════════════════════════════ */}
      {uploadOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setUploadOpen(false)}>
          <div className={`bg-[#0e1013] border rounded-3xl w-full max-w-sm shadow-2xl p-8 flex flex-col items-center gap-6 transition-colors ${dragging ? "border-indigo-500 bg-indigo-500/5" : "border-white/10"}`}
            onClick={e => e.stopPropagation()}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); uploadFile(e.dataTransfer.files); }}>
            <div className="flex items-center justify-between w-full">
              <h3 className="font-bold text-gray-200">Dosya Yükle</h3>
              <button onClick={() => setUploadOpen(false)} className="text-gray-600 hover:text-gray-300"><X className="w-4 h-4" /></button>
            </div>
            <div onClick={() => fileRef.current?.click()}
              className={`w-full h-44 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${dragging ? "border-indigo-500 bg-indigo-500/10" : "border-white/10 hover:border-indigo-500/40 hover:bg-white/3"}`}>
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400"><Upload className="w-6 h-6" /></div>
              <p className="text-sm font-semibold text-gray-400">Sürükle bırak veya tıkla</p>
              <p className="text-[10px] text-gray-600">JPG, PNG, MP4, PDF · Max 50MB</p>
            </div>
            <input ref={fileRef} type="file" className="hidden" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt" onChange={e => uploadFile(e.target.files)} />
            {uploadPct > 0 && (
              <div className="w-full space-y-1.5">
                <div className="flex justify-between text-xs text-gray-400"><span>Yükleniyor...</span><span>{uploadPct}%</span></div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${uploadPct}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating console trigger */}
      {tasks.length > 0 && !showLogs && (
        <button onClick={() => activeTask ? setShowLogs(true) : setShowHistory(true)}
          className="fixed bottom-6 right-6 px-4 py-3 rounded-full bg-[#13151a] border border-white/10 text-gray-300 hover:text-white flex items-center gap-2 hover:bg-white/8 shadow-2xl transition-all duration-200 hover:-translate-y-0.5 group z-40">
          <Clock className="w-4 h-4 text-indigo-400 group-hover:rotate-12 transition-transform" />
          <span className="text-xs font-bold">Konsol & Geçmiş</span>
          {tasks.some((t: SynapseTask) => t.status === "running" || t.status === "pending") && (
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping absolute -top-0.5 -right-0.5" />
          )}
        </button>
      )}

      {/* BG glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[40rem] h-[40rem] bg-indigo-600/4 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/4 right-[5%] w-[25rem] h-[25rem] bg-blue-600/4 rounded-full blur-[100px]" />
      </div>
    </div>
  );
}