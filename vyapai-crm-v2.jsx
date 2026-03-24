import { useState, useEffect, useRef } from "react";

// ═══════════════════════════════════════════════════════════════
// VYAPAI CRM v2 — Hindi-first MSME Dashboard
// Features: 3 Infographic styles, Entry Forms, Voice Insights,
//           AI Action Points, OpenAI Backend, Supabase-ready
// ═══════════════════════════════════════════════════════════════

// ── Google Font import via style tag ──────────────────────────
const FONT_LINK = `@import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;600;700;800;900&family=Noto+Sans+Devanagari:wght@400;600;700&display=swap');`;

const API_BASE = typeof window !== "undefined" && window.VYAPAI_API_BASE
  ? window.VYAPAI_API_BASE
  : "http://localhost:8788/api";
const DEMO_ORG_ID = "00000000-0000-0000-0000-000000000001";

// ── Mock Data ──────────────────────────────────────────────────
const MOCK = {
  org: { name: "Sudarshan Traders", city: "Lucknow", plan: "Pro", gstin: "09AABCS1429B1ZB" },
  user: { name: "Sheevum", role: "Owner" },
  kpi: { totalDue: 142500, todayCollection: 18750, activeCustomers: 47, todayFollowups: 6, thisMonthSales: 385000, thisMonthExpenses: 162500 },
  leads: {
    "New":          [{ id:1, name:"Rajesh Kirana Store", value:25000, source:"Walk-in" }, { id:2, name:"Priya Saree House", value:18000, source:"WhatsApp" }],
    "Follow-up":    [{ id:3, name:"Mohan Distributors", value:55000, source:"Referral" }, { id:4, name:"Sunita Medical", value:32000, source:"Ads" }],
    "Negotiation":  [{ id:5, name:"Gupta General Store", value:78000, source:"Referral" }],
    "Won":          [{ id:6, name:"Sharma Electronics", value:120000, source:"Walk-in" }],
  },
  tasks: [
    { id:1, title:"Gupta Store ko payment reminder call karo", due:"11:00 AM", status:"Pending", customer:"Gupta General Store", priority:"High" },
    { id:2, title:"Mohan ji ko demo schedule karo", due:"2:30 PM", status:"Pending", customer:"Mohan Distributors", priority:"Medium" },
    { id:3, title:"Invoice #INV-047 WhatsApp pe bhejo", due:"4:00 PM", status:"Pending", customer:"Priya Saree House", priority:"High" },
    { id:4, title:"New stock update email", due:"5:00 PM", status:"Done", customer:"", priority:"Low" },
    { id:5, title:"Rajesh ji ki inquiry follow-up", due:"6:30 PM", status:"Pending", customer:"Rajesh Kirana Store", priority:"Medium" },
  ],
  invoices: [
    { id:"INV-047", customer:"Priya Saree House", amount:18000, due:"25 Mar", status:"Sent" },
    { id:"INV-046", customer:"Mohan Distributors", amount:55000, due:"20 Mar", status:"Overdue" },
    { id:"INV-045", customer:"Sunita Medical", amount:32000, due:"18 Mar", status:"Overdue" },
    { id:"INV-044", customer:"Rajesh Kirana Store", amount:12500, due:"30 Mar", status:"Draft" },
    { id:"INV-043", customer:"Sharma Electronics", amount:25000, due:"15 Mar", status:"Paid" },
  ],
  expenses: [
    { category:"Kiraya", hindi:"किराया", amount:35000, color:"#FF6B6B", icon:"🏪" },
    { category:"Tankhwa", hindi:"तनख्वाह", amount:85000, color:"#4ECDC4", icon:"👷" },
    { category:"Marketing", hindi:"मार्केटिंग", amount:22000, color:"#FFD93D", icon:"📣" },
    { category:"Bijli-Pani", hindi:"बिजली-पानी", amount:8500, color:"#6BCB77", icon:"💡" },
    { category:"Other", hindi:"अन्य", amount:12000, color:"#C7B8EA", icon:"📦" },
  ],
  monthlySales: [
    { month:"Oct", hindi:"अक्टू", sales:210000 },
    { month:"Nov", hindi:"नवं", sales:285000 },
    { month:"Dec", hindi:"दिसं", sales:320000 },
    { month:"Jan", hindi:"जन", sales:198000 },
    { month:"Feb", hindi:"फर", sales:342000 },
    { month:"Mar", hindi:"मार्च", sales:385000 },
  ],
  customers: [
    { id:1, name:"Gupta General Store", owner:"Ramesh Gupta", phone:"9876543210", city:"Lucknow", category:"Kirana", balance:7500 },
    { id:2, name:"Sharma Electronics", owner:"Vivek Sharma", phone:"9876543211", city:"Lucknow", category:"Retail", balance:0 },
    { id:3, name:"Mohan Distributors", owner:"Mohan Lal", phone:"9876543212", city:"Kanpur", category:"Distributor", balance:55000 },
    { id:4, name:"Sunita Medical", owner:"Sunita Devi", phone:"9876543213", city:"Lucknow", category:"Service", balance:32000 },
    { id:5, name:"Priya Saree House", owner:"Priya Singh", phone:"9876543214", city:"Lucknow", category:"Retail", balance:18000 },
    { id:6, name:"Rajesh Kirana Store", owner:"Rajesh Kumar", phone:"9876543215", city:"Lucknow", category:"Kirana", balance:12500 },
  ],
};

const STAGE_C = {
  "New":         { bg:"#EEF5FF", border:"#3B82F6", text:"#1D4ED8", dot:"#3B82F6" },
  "Follow-up":   { bg:"#FFF7ED", border:"#F97316", text:"#C2410C", dot:"#F97316" },
  "Negotiation": { bg:"#FAF5FF", border:"#A855F7", text:"#7E22CE", dot:"#A855F7" },
  "Won":         { bg:"#F0FDF4", border:"#22C55E", text:"#15803D", dot:"#22C55E" },
};

const STATUS_C = {
  Draft:          { bg:"#F5F5F5", text:"#757575" },
  Sent:           { bg:"#DBEAFE", text:"#1D4ED8" },
  "Partially Paid":{ bg:"#FEF9C3", text:"#854D0E" },
  Paid:           { bg:"#DCFCE7", text:"#15803D" },
  Overdue:        { bg:"#FEE2E2", text:"#991B1B" },
};

const INR = n => "₹" + Number(n).toLocaleString("en-IN");
const fs = (px) => `calc(${px}px * var(--fs, 1))`;

// ── Count-up hook ──────────────────────────────────────────────
function useCountUp(target, dur = 1400) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let cur = 0;
    const step = target / (dur / 16);
    const t = setInterval(() => {
      cur += step;
      if (cur >= target) { setV(target); clearInterval(t); }
      else setV(Math.floor(cur));
    }, 16);
    return () => clearInterval(t);
  }, [target, dur]);
  return v;
}

// ── AI Hook (uses Anthropic API directly in artifact) ──────────
function useVyapaiAI() {
  const [chatMsgs, setChatMsgs] = useState([
    { role:"assistant", text:"Namaste Sheevum ji! 🙏\nMain Vyapai AI hoon — aapka Hindi business assistant.\nKuch bhi poochein ya batayein!" }
  ]);
  const [insights, setInsights] = useState(null);
  const [actionPoints, setActionPoints] = useState(null);
  const [loadingChat, setLoadingChat] = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const sendChat = async (userText) => {
    const newMsgs = [...chatMsgs, { role:"user", text:userText }];
    setChatMsgs(newMsgs);
    setLoadingChat(true);
    try {
      const r = await fetch(`${API_BASE}/chat-crm`, {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ message: userText, history: chatMsgs, org_id: DEMO_ORG_ID }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      const reply = d.reply || "Network error ji.";
      setChatMsgs([...newMsgs, { role:"assistant", text:reply }]);
    } catch {
      setChatMsgs([...newMsgs, { role:"assistant", text:"Network error. Dobara try karein ji." }]);
    }
    setLoadingChat(false);
  };

  const fetchInsights = async () => {
    setLoadingInsights(true);
    try {
      const r = await fetch(`${API_BASE}/insights`, {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ org_id: DEMO_ORG_ID }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      setInsights(d.voice_insights || []);
      setActionPoints(d.action_points || []);
    } catch(e) {
      setInsights([
        { hindi:"आज ₹1,42,500 बकाया है — तुरंत कलेक्शन शुरू करें!", english:"₹1,42,500 pending — start collections now!", icon:"🚨", type:"warning" },
        { hindi:"इस महीने ₹3,85,000 बिक्री — पिछले महीने से 12% ज़्यादा!", english:"₹3,85,000 sales this month — 12% growth!", icon:"📈", type:"success" },
        { hindi:"5 काम आज बाकी हैं — पहले Gupta Store call करें!", english:"5 tasks pending today — call Gupta Store first!", icon:"✅", type:"info" },
      ]);
      setActionPoints([
        { hindi:"Mohan Distributors को आज WhatsApp reminder भेजो — ₹55,000 overdue!", english:"Send WhatsApp to Mohan Distributors — ₹55,000 overdue!", priority:"high", category:"collections", icon:"💬" },
        { hindi:"Gupta Store का ₹7,500 आज शाम तक collect करो", english:"Collect ₹7,500 from Gupta Store today", priority:"high", category:"collections", icon:"💰" },
        { hindi:"Priya Saree House का invoice WhatsApp पर share करो", english:"Share invoice with Priya Saree House on WhatsApp", priority:"medium", category:"followup", icon:"📱" },
        { hindi:"अगले हफ्ते के लिए 3 new leads identify करो", english:"Identify 3 new leads for next week", priority:"medium", category:"growth", icon:"🎯" },
        { hindi:"Marketing खर्च ₹22,000 — ROI check करो", english:"Marketing spend ₹22,000 — check your ROI", priority:"low", category:"expense", icon:"📊" },
      ]);
    }
    setLoadingInsights(false);
  };

  return { chatMsgs, loadingChat, sendChat, insights, actionPoints, loadingInsights, fetchInsights };
}

// ════════════════════════════════════════════════════════
// INFOGRAPHIC 1 — Radial Progress KPI Cards
// ════════════════════════════════════════════════════════
function RadialKPI({ label, hindiLabel, value, max, icon, color, isAmount, unit }) {
  const animated = useCountUp(value);
  const pct = Math.min((value / max) * 100, 100);
  const r = 28, cx = 34, cy = 34, circ = 2 * Math.PI * r;
  const stroke = circ - (pct / 100) * circ;
  return (
    <div style={{ background:"#fff", borderRadius:18, padding:"18px 16px", boxShadow:"0 2px 16px rgba(0,0,0,0.07)", display:"flex", flexDirection:"column", alignItems:"center", gap:6, transition:"transform 0.2s, box-shadow 0.2s", cursor:"default" }}
      onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-4px)"; e.currentTarget.style.boxShadow="0 12px 32px rgba(0,0,0,0.13)"; }}
      onMouseLeave={e=>{ e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 2px 16px rgba(0,0,0,0.07)"; }}>
      <div style={{ position:"relative", width:68, height:68 }}>
        <svg width={68} height={68} style={{ transform:"rotate(-90deg)" }}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f0f0f0" strokeWidth={6} />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={6}
            strokeDasharray={circ} strokeDashoffset={stroke} strokeLinecap="round"
            style={{ transition:"stroke-dashoffset 1.2s ease" }} />
        </svg>
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize: fs(22) }}>{icon}</div>
      </div>
      <div style={{ fontSize: fs(20), fontWeight:900, color:"#1a1a2e", letterSpacing:-0.5, lineHeight:1 }}>
        {isAmount ? INR(animated) : animated}{unit || ""}
      </div>
      <div style={{ fontSize: fs(12), fontWeight:700, color:"#333", textAlign:"center", lineHeight:1.3 }}>{label}</div>
      <div style={{ fontSize: fs(11), color:color, fontFamily:"'Noto Sans Devanagari', sans-serif", fontWeight:600 }}>{hindiLabel}</div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// INFOGRAPHIC 2 — Horizontal Bar Chart (Monthly Sales)
// ════════════════════════════════════════════════════════
function MonthlyBarChart({ data }) {
  const maxVal = Math.max(...data.map(d => d.sales));
  return (
    <div style={{ background:"#fff", borderRadius:18, padding:"20px 22px", boxShadow:"0 2px 16px rgba(0,0,0,0.07)" }}>
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize: fs(15), fontWeight:800, color:"#1a1a2e" }}>📊 Mahine ki Bikri</div>
        <div style={{ fontSize: fs(12), color:"#888", fontFamily:"'Noto Sans Devanagari', sans-serif" }}>मासिक बिक्री रिपोर्ट</div>
      </div>
      {data.map((d, i) => {
        const pct = (d.sales / maxVal) * 100;
        const isLast = i === data.length - 1;
        const barColor = isLast ? "#FFD93D" : `hsl(${210 + i * 8}, 70%, ${55 - i * 3}%)`;
        return (
          <div key={d.month} style={{ marginBottom:10 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
              <span style={{ fontSize: fs(12), fontWeight:700, color: isLast ? "#e65c00" : "#555" }}>
                {d.month} <span style={{ fontFamily:"'Noto Sans Devanagari',sans-serif", fontSize: fs(10), color:"#aaa" }}>{d.hindi}</span>
              </span>
              <span style={{ fontSize: fs(12), fontWeight:800, color:"#1a1a2e" }}>{INR(d.sales)}</span>
            </div>
            <div style={{ height:10, background:"#f5f5f5", borderRadius:5, overflow:"hidden" }}>
              <div style={{ height:"100%", width:pct+"%", background: isLast ? "linear-gradient(90deg,#FFD93D,#FF6B35)" : barColor, borderRadius:5, transition:"width 1.2s ease", boxShadow: isLast ? "0 0 8px rgba(255,217,61,0.6)" : "none" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// INFOGRAPHIC 3 — Stacked Expense Heatmap Tiles
// ════════════════════════════════════════════════════════
function ExpenseHeatmap({ expenses }) {
  const total = expenses.reduce((s,e) => s+e.amount, 0);
  return (
    <div style={{ background:"#fff", borderRadius:18, padding:"20px 22px", boxShadow:"0 2px 16px rgba(0,0,0,0.07)" }}>
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize: fs(15), fontWeight:800, color:"#1a1a2e" }}>💸 Kharch Breakdown</div>
        <div style={{ fontSize: fs(12), color:"#888", fontFamily:"'Noto Sans Devanagari', sans-serif" }}>खर्च का विवरण</div>
      </div>
      {/* Treemap-style tiles */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:14 }}>
        {expenses.map((e, i) => {
          const pct = (e.amount / total) * 100;
          const w = Math.max(pct, 15);
          return (
            <div key={e.category} style={{
              background:e.color+"22", border:`2px solid ${e.color}`, borderRadius:10,
              padding:"8px 12px", flex:`${pct} 0 0`, minWidth:60,
              transition:"transform 0.2s", cursor:"default"
            }}
              onMouseEnter={e2=>e2.currentTarget.style.transform="scale(1.05)"}
              onMouseLeave={e2=>e2.currentTarget.style.transform="scale(1)"}>
              <div style={{ fontSize: fs(18) }}>{e.icon}</div>
              <div style={{ fontSize: fs(10), fontWeight:700, color:"#333", marginTop:2 }}>{e.category}</div>
              <div style={{ fontSize: fs(9), color:"#666", fontFamily:"'Noto Sans Devanagari',sans-serif" }}>{e.hindi}</div>
              <div style={{ fontSize: fs(12), fontWeight:800, color:e.color, marginTop:4 }}>{INR(e.amount)}</div>
              <div style={{ fontSize: fs(10), color:"#999" }}>{pct.toFixed(0)}%</div>
            </div>
          );
        })}
      </div>
      {/* Progress bar segmented */}
      <div style={{ height:10, borderRadius:5, overflow:"hidden", display:"flex" }}>
        {expenses.map(e => (
          <div key={e.category} style={{ flex:e.amount, background:e.color, transition:"flex 1s ease" }} title={e.category} />
        ))}
      </div>
      <div style={{ textAlign:"right", fontSize: fs(12), fontWeight:800, color:"#1a1a2e", marginTop:6 }}>
        Kul Kharch: {INR(total)}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// INFOGRAPHIC 4 — Profit Gauge (bonus visual)
// ════════════════════════════════════════════════════════
function ProfitGauge({ sales, expenses }) {
  const profit = sales - expenses;
  const margin = ((profit / sales) * 100).toFixed(1);
  const pct = Math.min(Number(margin), 100);
  const r = 60, cx = 80, cy = 80;
  const arc = (pct / 100) * Math.PI;
  const x = cx + r * Math.cos(Math.PI - arc);
  const y = cy - r * Math.sin(Math.PI - arc);
  const color = pct > 50 ? "#22C55E" : pct > 30 ? "#FFD93D" : "#FF6B6B";

  return (
    <div style={{ background:"linear-gradient(135deg,#1a1a2e,#16213e)", borderRadius:18, padding:"20px 22px", boxShadow:"0 2px 16px rgba(0,0,0,0.15)" }}>
      <div style={{ fontSize: fs(15), fontWeight:800, color:"#FFD93D", marginBottom:4 }}>📈 Munafa Gauge</div>
      <div style={{ fontSize: fs(11), color:"#aaa", fontFamily:"'Noto Sans Devanagari',sans-serif", marginBottom:12 }}>मुनाफा मीटर</div>
      <div style={{ display:"flex", alignItems:"center", gap:20 }}>
        <svg width={160} height={90} viewBox="0 0 160 90">
          <path d="M 20 80 A 60 60 0 0 1 140 80" fill="none" stroke="#ffffff20" strokeWidth={14} strokeLinecap="round" />
          <path d={`M 20 80 A 60 60 0 0 1 ${x} ${y}`} fill="none" stroke={color} strokeWidth={14} strokeLinecap="round"
            style={{ transition:"all 1.5s ease" }} />
          <text x={80} y={72} textAnchor="middle" style={{ fontSize: fs(22), fontWeight:900, fill:color }}>{margin}%</text>
          <text x={80} y={86} textAnchor="middle" style={{ fontSize: fs(9), fill:"#aaa" }}>Profit Margin</text>
          <text x={22} y={88} style={{ fontSize: fs(8), fill:"#666" }}>0%</text>
          <text x={128} y={88} style={{ fontSize: fs(8), fill:"#666" }}>100%</text>
        </svg>
        <div>
          <div style={{ marginBottom:8 }}>
            <div style={{ fontSize: fs(10), color:"#aaa" }}>Bikri / Sales</div>
            <div style={{ fontSize: fs(14), fontWeight:800, color:"#fff" }}>{INR(sales)}</div>
          </div>
          <div style={{ marginBottom:8 }}>
            <div style={{ fontSize: fs(10), color:"#aaa" }}>Kharch / Expenses</div>
            <div style={{ fontSize: fs(14), fontWeight:800, color:"#FF6B6B" }}>{INR(expenses)}</div>
          </div>
          <div>
            <div style={{ fontSize: fs(10), color:"#aaa" }}>Munafa / Profit</div>
            <div style={{ fontSize: fs(16), fontWeight:900, color:"#22C55E" }}>{INR(profit)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// VOICE INSIGHTS PANEL
// ════════════════════════════════════════════════════════
function VoiceInsightsPanel({ insights, actionPoints, loading, onFetch }) {
  const [speaking, setSpeaking] = useState(false);
  const [activeTab, setActiveTab] = useState("insights");

  const speak = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = "hi-IN";
    utt.rate = 0.9;
    setSpeaking(true);
    utt.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(utt);
  };

  const speakAll = () => {
    if (!insights?.length) return;
    const fullText = insights.map(i => i.hindi).join(". ");
    speak(fullText);
  };

  const PRIORITY_C = { high:"#FF6B6B", medium:"#FFD93D", low:"#4ECDC4" };
  const CATEGORY_L = { collections:"💰 Collection", sales:"📈 Bikri", expense:"💸 Kharch", followup:"🔔 Follow-up", growth:"🌱 Growth" };

  return (
    <div style={{ background:"#fff", borderRadius:18, padding:"20px 22px", boxShadow:"0 2px 16px rgba(0,0,0,0.07)" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
        <div>
          <div style={{ fontSize: fs(15), fontWeight:800, color:"#1a1a2e" }}>🤖 AI Business Intelligence</div>
          <div style={{ fontSize: fs(11), color:"#888", fontFamily:"'Noto Sans Devanagari',sans-serif" }}>व्यापार सहायक — AI Insights & Actions</div>
        </div>
        <button onClick={onFetch} disabled={loading} style={{
          background:"linear-gradient(135deg,#FFD93D,#FF6B35)", color:"#1a1a2e",
          border:"none", borderRadius:12, padding:"8px 14px", fontWeight:800, cursor:"pointer",
          fontSize: fs(12), opacity:loading?0.6:1, display:"flex", alignItems:"center", gap:6
        }}>
          {loading ? "⏳ Loading..." : "✨ AI Insights Lo"}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:14 }}>
        {[["insights","🎙️ Voice Insights"],["actions","⚡ Action Points"]].map(([k,l]) => (
          <button key={k} onClick={() => setActiveTab(k)} style={{
            padding:"6px 14px", borderRadius:20, border:"none", cursor:"pointer",
            background: activeTab===k ? "#1a1a2e" : "#f0f0f0",
            color: activeTab===k ? "#fff" : "#555",
            fontSize: fs(12), fontWeight:700
          }}>{l}</button>
        ))}
      </div>

      {/* Voice Insights Tab */}
      {activeTab === "insights" && (
        <div>
          {!insights && !loading && (
            <div style={{ textAlign:"center", padding:"24px 0", color:"#bbb" }}>
              <div style={{ fontSize: fs(36), marginBottom:8 }}>🎙️</div>
              <div style={{ fontSize: fs(13), color:"#999" }}>AI insights lo — business ki pulse samjho!</div>
            </div>
          )}
          {loading && <div style={{ textAlign:"center", padding:"20px", color:"#aaa", fontSize: fs(13) }}>⏳ AI analysis kar raha hai...</div>}
          {insights && insights.map((ins, i) => (
            <div key={i} style={{
              display:"flex", gap:12, padding:"12px 14px", borderRadius:12, marginBottom:8,
              background: ins.type==="warning" ? "#FFF5F5" : ins.type==="success" ? "#F0FFF4" : "#F0F7FF",
              border: `1px solid ${ins.type==="warning"?"#FECACA":ins.type==="success"?"#BBF7D0":"#BFDBFE"}`,
              alignItems:"flex-start"
            }}>
              <span style={{ fontSize: fs(24), flexShrink:0 }}>{ins.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize: fs(13), fontWeight:700, color:"#1a1a2e", fontFamily:"'Noto Sans Devanagari',sans-serif", lineHeight:1.5 }}>{ins.hindi}</div>
                <div style={{ fontSize: fs(11), color:"#888", marginTop:3 }}>{ins.english}</div>
              </div>
              <button onClick={() => speak(ins.hindi)} style={{
                background: speaking?"#FFD93D":"#f0f0f0", border:"none", borderRadius:8,
                padding:"6px 10px", cursor:"pointer", fontSize: fs(14), flexShrink:0
              }}>🔊</button>
            </div>
          ))}
          {insights && (
            <button onClick={speakAll} style={{
              width:"100%", marginTop:8, background:"linear-gradient(135deg,#1a1a2e,#16213e)",
              color:"#FFD93D", border:"none", borderRadius:12, padding:"10px",
              fontWeight:800, fontSize: fs(13), cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8
            }}>
              {speaking ? "⏹️ Stop" : "▶️ Sabhi Insights Suno (Hindi Voice)"}
            </button>
          )}
        </div>
      )}

      {/* Action Points Tab */}
      {activeTab === "actions" && (
        <div>
          {!actionPoints && !loading && (
            <div style={{ textAlign:"center", padding:"24px 0", color:"#bbb" }}>
              <div style={{ fontSize: fs(36), marginBottom:8 }}>⚡</div>
              <div style={{ fontSize: fs(13), color:"#999" }}>AI se action points lo!</div>
            </div>
          )}
          {loading && <div style={{ textAlign:"center", padding:"20px", color:"#aaa", fontSize: fs(13) }}>⏳ AI action points bana raha hai...</div>}
          {actionPoints && actionPoints.map((ap, i) => (
            <div key={i} style={{
              display:"flex", gap:10, padding:"12px 14px", borderRadius:12, marginBottom:8,
              background:"#FAFAFA", border:"1px solid #f0f0f0", alignItems:"flex-start"
            }}>
              <div style={{
                width:28, height:28, borderRadius:"50%", background:PRIORITY_C[ap.priority]+"22",
                border:`2px solid ${PRIORITY_C[ap.priority]}`,
                display:"flex", alignItems:"center", justifyContent:"center", fontSize: fs(14), flexShrink:0
              }}>{i+1}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize: fs(13), fontWeight:700, color:"#1a1a2e", fontFamily:"'Noto Sans Devanagari',sans-serif", lineHeight:1.4 }}>{ap.hindi}</div>
                <div style={{ fontSize: fs(11), color:"#888", marginTop:2 }}>{ap.english}</div>
                <div style={{ display:"flex", gap:6, marginTop:6 }}>
                  <span style={{ background:PRIORITY_C[ap.priority]+"22", color:PRIORITY_C[ap.priority], borderRadius:20, padding:"2px 8px", fontSize: fs(10), fontWeight:700 }}>
                    {ap.priority.toUpperCase()}
                  </span>
                  <span style={{ background:"#f0f0f0", color:"#666", borderRadius:20, padding:"2px 8px", fontSize: fs(10), fontWeight:600 }}>
                    {CATEGORY_L[ap.category] || ap.category}
                  </span>
                </div>
              </div>
              <span style={{ fontSize: fs(20) }}>{ap.icon}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// FORM MODAL — Generic reusable entry form
// ════════════════════════════════════════════════════════
function FormModal({ title, hindiTitle, fields, onSave, onClose }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handle = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 900));
    onSave(form);
    setSaving(false);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1200);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="crm-modal" style={{ background:"#fff", borderRadius:20, padding:"28px 28px 24px", width:"100%", maxWidth:480, boxShadow:"0 24px 60px rgba(0,0,0,0.2)", maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize: fs(20), fontWeight:900, color:"#1a1a2e" }}>{title}</div>
          <div style={{ fontSize: fs(13), color:"#888", fontFamily:"'Noto Sans Devanagari',sans-serif", marginTop:2 }}>{hindiTitle}</div>
        </div>

        {fields.map(f => (
          <div key={f.key} style={{ marginBottom:14 }}>
            <label style={{ display:"block", fontSize: fs(12), fontWeight:700, color:"#444", marginBottom:5 }}>
              {f.label} {f.hindi && <span style={{ fontFamily:"'Noto Sans Devanagari',sans-serif", color:"#aaa", fontSize: fs(11) }}>({f.hindi})</span>}
              {f.required && <span style={{ color:"#FF6B6B" }}> *</span>}
            </label>
            {f.type === "select" ? (
              <select value={form[f.key]||""} onChange={e=>handle(f.key,e.target.value)} style={inputStyle}>
                <option value="">-- Chunein --</option>
                {f.options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : f.type === "textarea" ? (
              <textarea value={form[f.key]||""} onChange={e=>handle(f.key,e.target.value)} placeholder={f.placeholder} rows={3} style={{ ...inputStyle, resize:"vertical" }} />
            ) : (
              <input type={f.type||"text"} value={form[f.key]||""} onChange={e=>handle(f.key,e.target.value)} placeholder={f.placeholder} style={inputStyle} />
            )}
          </div>
        ))}

        <div style={{ display:"flex", gap:10, marginTop:20 }}>
          <button onClick={onClose} style={{ flex:1, padding:"11px", borderRadius:12, border:"1.5px solid #e0e0e0", background:"#fff", color:"#555", fontWeight:700, cursor:"pointer", fontSize: fs(14) }}>
            Ruko / Cancel
          </button>
          <button onClick={submit} disabled={saving||saved} style={{
            flex:2, padding:"11px", borderRadius:12, border:"none",
            background: saved ? "#22C55E" : "linear-gradient(135deg,#1a1a2e,#16213e)",
            color: saved ? "#fff" : "#FFD93D", fontWeight:800, cursor:"pointer", fontSize: fs(14),
            transition:"all 0.3s", display:"flex", alignItems:"center", justifyContent:"center", gap:8
          }}>
            {saved ? "✅ Saved!" : saving ? "⏳ Saving..." : "💾 Save Karo"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width:"100%", border:"1.5px solid #e8e8e8", borderRadius:10, padding:"10px 14px",
  fontSize: fs(13), outline:"none", fontFamily:"inherit", boxSizing:"border-box",
  transition:"border-color 0.2s", background:"#FAFAFA"
};

// ════════════════════════════════════════════════════════
// LEAD KANBAN
// ════════════════════════════════════════════════════════
function LeadKanban({ leads }) {
  return (
    <div style={{ background:"#fff", borderRadius:18, padding:"20px", boxShadow:"0 2px 16px rgba(0,0,0,0.07)", height:"100%" }}>
      <div style={{ fontSize: fs(15), fontWeight:800, color:"#1a1a2e", marginBottom:4 }}>🎯 Leads Pipeline</div>
      <div style={{ fontSize: fs(11), color:"#888", fontFamily:"'Noto Sans Devanagari',sans-serif", marginBottom:14 }}>लीड पाइपलाइन — चरणवार</div>
      <div style={{ display:"flex", gap:10, overflowX:"auto", paddingBottom:4 }}>
        {Object.entries(leads).map(([stage, items]) => {
          const c = STAGE_C[stage];
          return (
            <div key={stage} style={{ minWidth:155, flexShrink:0 }}>
              <div style={{ fontSize: fs(11), fontWeight:700, color:c.text, background:c.bg, border:`1.5px solid ${c.border}50`, borderRadius:8, padding:"5px 10px", marginBottom:8, textAlign:"center", letterSpacing:0.3 }}>
                {stage} <span style={{ background:c.border+"30", borderRadius:10, padding:"1px 7px" }}>{items.length}</span>
              </div>
              {items.map(lead => (
                <div key={lead.id} style={{ background:c.bg, border:`1px solid ${c.border}25`, borderRadius:10, padding:"10px 12px", marginBottom:6, cursor:"pointer", transition:"all 0.18s" }}
                  onMouseEnter={e=>{ e.currentTarget.style.borderColor=c.border; e.currentTarget.style.transform="scale(1.02)"; }}
                  onMouseLeave={e=>{ e.currentTarget.style.borderColor=c.border+"25"; e.currentTarget.style.transform="scale(1)"; }}>
                  <div style={{ fontSize: fs(12), fontWeight:700, color:"#222" }}>{lead.name}</div>
                  <div style={{ fontSize: fs(11), color:"#888", marginTop:3 }}>{INR(lead.value)}</div>
                  <div style={{ fontSize: fs(10), color:c.text, marginTop:3 }}>📌 {lead.source}</div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// TASKS PANEL
// ════════════════════════════════════════════════════════
function TasksPanel({ tasks, setTasks }) {
  const PRIO_C = { High:"#FF6B6B", Medium:"#FFD93D", Low:"#4ECDC4" };
  return (
    <div style={{ background:"#fff", borderRadius:18, padding:"20px", boxShadow:"0 2px 16px rgba(0,0,0,0.07)", height:"100%" }}>
      <div style={{ fontSize: fs(15), fontWeight:800, color:"#1a1a2e", marginBottom:4 }}>✅ Aaj ke Kaam</div>
      <div style={{ fontSize: fs(11), color:"#888", fontFamily:"'Noto Sans Devanagari',sans-serif", marginBottom:14 }}>आज के काम — Today's Tasks</div>
      {tasks.map(t => (
        <div key={t.id} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"10px 0", borderBottom:"1px solid #f5f5f5", opacity:t.status==="Done"?0.45:1, transition:"opacity 0.3s" }}>
          <div onClick={()=>setTasks(p=>p.map(x=>x.id===t.id?{...x,status:x.status==="Done"?"Pending":"Done"}:x))}
            style={{ width:20, height:20, borderRadius:6, border:t.status==="Done"?"none":"2px solid #ddd", background:t.status==="Done"?"#22C55E":"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>
            {t.status==="Done" && <span style={{ color:"#fff", fontSize: fs(11) }}>✓</span>}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize: fs(12), fontWeight:600, color:"#222", lineHeight:1.4, textDecoration:t.status==="Done"?"line-through":"none" }}>{t.title}</div>
            {t.customer && <div style={{ fontSize: fs(11), color:"#888", marginTop:2 }}>👤 {t.customer}</div>}
          </div>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:3, flexShrink:0 }}>
            <div style={{ fontSize: fs(10), color:"#888" }}>🕐 {t.due}</div>
            {t.priority && <span style={{ fontSize: fs(9), background:PRIO_C[t.priority]+"22", color:PRIO_C[t.priority], borderRadius:8, padding:"1px 6px", fontWeight:700 }}>{t.priority}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// INVOICES TABLE
// ════════════════════════════════════════════════════════
function InvoicesPanel({ invoices }) {
  const [tab, setTab] = useState("Pending");
  const filtered = tab==="Pending" ? invoices.filter(i=>["Sent","Draft"].includes(i.status))
    : tab==="Overdue" ? invoices.filter(i=>i.status==="Overdue")
    : invoices.filter(i=>i.status==="Paid");
  const tabs = [["Pending","Baki"],["Overdue","Zyada Din"],["Paid","Paid"]];
  return (
    <div style={{ background:"#fff", borderRadius:18, padding:"20px 22px", boxShadow:"0 2px 16px rgba(0,0,0,0.07)" }}>
      <div style={{ fontSize: fs(15), fontWeight:800, color:"#1a1a2e", marginBottom:4 }}>🧾 Bills & Invoices</div>
      <div style={{ fontSize: fs(11), color:"#888", fontFamily:"'Noto Sans Devanagari',sans-serif", marginBottom:14 }}>बिल और भुगतान</div>
      <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
        {tabs.map(([k,h]) => (
          <button key={k} onClick={()=>setTab(k)} style={{ padding:"6px 14px", borderRadius:20, border:"none", cursor:"pointer", background:tab===k?"#1a1a2e":"#f0f0f0", color:tab===k?"#fff":"#555", fontSize: fs(12), fontWeight:700 }}>
            {k} <span style={{ fontFamily:"'Noto Sans Devanagari',sans-serif", fontSize: fs(10), opacity:0.7 }}>({h})</span>
          </button>
        ))}
      </div>
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize: fs(13) }}>
          <thead>
            <tr style={{ color:"#aaa", fontSize: fs(11), textTransform:"uppercase" }}>
              {["Invoice","Customer / Grahak","Amount / Rashi","Status","Action"].map(h => (
                <th key={h} style={{ textAlign:h==="Amount / Rashi"?"right":"left", padding:"6px 8px", fontWeight:700 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(inv => {
              const sc = STATUS_C[inv.status] || STATUS_C.Draft;
              return (
                <tr key={inv.id} style={{ borderTop:"1px solid #f8f8f8" }}
                  onMouseEnter={e=>e.currentTarget.style.background="#FAFAFA"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{ padding:"10px 8px", fontWeight:700, color:"#333" }}>{inv.id}</td>
                  <td style={{ padding:"10px 8px", color:"#555" }}>{inv.customer}</td>
                  <td style={{ padding:"10px 8px", textAlign:"right", fontWeight:800, color:"#1a1a2e" }}>{INR(inv.amount)}</td>
                  <td style={{ padding:"10px 8px" }}>
                    <span style={{ background:sc.bg, color:sc.text, borderRadius:20, padding:"3px 10px", fontSize: fs(11), fontWeight:700 }}>{inv.status}</span>
                  </td>
                  <td style={{ padding:"10px 8px" }}>
                    <button style={{ background:"#25D366", color:"#fff", border:"none", borderRadius:8, padding:"5px 10px", fontSize: fs(11), cursor:"pointer", fontWeight:700 }}>📱 WA</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// CUSTOMERS VIEW
// ════════════════════════════════════════════════════════
function CustomersView({ customers, onAdd }) {
  const [search, setSearch] = useState("");
  const filtered = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.owner.toLowerCase().includes(search.toLowerCase()));
  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div>
          <h2 style={{ margin:0, fontSize: fs(22), fontWeight:900, color:"#1a1a2e" }}>👥 Grahak</h2>
          <div style={{ fontSize: fs(12), color:"#888", fontFamily:"'Noto Sans Devanagari',sans-serif" }}>ग्राहक सूची — {customers.length} sakriya</div>
        </div>
        <button onClick={onAdd} style={{ background:"linear-gradient(135deg,#1a1a2e,#16213e)", color:"#FFD93D", border:"none", borderRadius:12, padding:"10px 18px", fontWeight:800, cursor:"pointer", fontSize: fs(13) }}>
          + Naya Grahak Jodo
        </button>
      </div>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Naam ya phone se dhundho..."
        style={{ ...inputStyle, marginBottom:16, fontSize: fs(14) }} />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(270px,1fr))", gap:14 }}>
        {filtered.map(c => (
          <div key={c.id} style={{ background:"#fff", borderRadius:16, padding:18, boxShadow:"0 2px 10px rgba(0,0,0,0.07)", borderLeft:`4px solid ${c.balance>0?"#FF6B6B":"#22C55E"}`, transition:"transform 0.2s", cursor:"pointer" }}
            onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
            onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div>
                <div style={{ fontWeight:800, fontSize: fs(14), color:"#1a1a2e" }}>{c.name}</div>
                <div style={{ fontSize: fs(12), color:"#666", marginTop:3 }}>👤 {c.owner}</div>
                <div style={{ fontSize: fs(12), color:"#666", marginTop:2 }}>📞 {c.phone}</div>
                <div style={{ fontSize: fs(12), color:"#666", marginTop:2 }}>📍 {c.city}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <span style={{ background:"#f5f5f5", borderRadius:8, padding:"3px 8px", fontSize: fs(11), color:"#666" }}>{c.category}</span>
                <div style={{ marginTop:10, fontWeight:900, fontSize: fs(15), color:c.balance>0?"#991B1B":"#15803D" }}>
                  {c.balance>0 ? `${INR(c.balance)} baki` : "✓ Clear"}
                </div>
              </div>
            </div>
            <div style={{ display:"flex", gap:8, marginTop:12 }}>
              <button style={{ flex:1, background:"#EEF5FF", color:"#1D4ED8", border:"none", borderRadius:8, padding:"7px", fontSize: fs(12), cursor:"pointer", fontWeight:700 }}>📄 Bill</button>
              <button style={{ flex:1, background:"#E8F5E9", color:"#15803D", border:"none", borderRadius:8, padding:"7px", fontSize: fs(12), cursor:"pointer", fontWeight:700 }}>📱 WhatsApp</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// AI CHAT PANEL
// ════════════════════════════════════════════════════════
function AIChatPanel({ chatMsgs, loading, onSend, onClose }) {
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [chatMsgs, loading]);

  const quickQ = ["Gupta Store ka balance?", "Aaj ke overdue invoices?", "Kul kitna baki hai?", "Is mahine ki bikri?"];

  return (
    <div className="crm-chat" style={{ position:"fixed", bottom:24, right:24, width:370, height:540, background:"#fff", borderRadius:22, boxShadow:"0 24px 64px rgba(0,0,0,0.22)", display:"flex", flexDirection:"column", zIndex:100, overflow:"hidden", border:"1px solid #f0f0f0" }}>
      <div style={{ background:"linear-gradient(135deg,#1a1a2e,#16213e)", padding:"16px 18px", display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:38, height:38, borderRadius:12, background:"#FFD93D", display:"flex", alignItems:"center", justifyContent:"center", fontSize: fs(20) }}>🤖</div>
        <div>
          <div style={{ color:"#fff", fontWeight:800, fontSize: fs(14) }}>Vyapai AI</div>
          <div style={{ color:"#FFD93D80", fontSize: fs(11), fontFamily:"'Noto Sans Devanagari',sans-serif" }}>व्यापाई सहायक</div>
        </div>
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:6 }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:"#22C55E" }} />
          <span style={{ color:"#aaa", fontSize: fs(11) }}>Live</span>
          <button onClick={onClose} style={{ marginLeft:8, background:"none", border:"none", color:"#aaa", cursor:"pointer", fontSize: fs(18) }}>✕</button>
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"14px 14px 6px", display:"flex", flexDirection:"column", gap:10 }}>
        {chatMsgs.map((m,i) => (
          <div key={i} style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start" }}>
            <div style={{ maxWidth:"84%", padding:"10px 14px", borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px", background:m.role==="user"?"linear-gradient(135deg,#1a1a2e,#16213e)":"#f5f7fa", color:m.role==="user"?"#FFD93D":"#333", fontSize: fs(13), lineHeight:1.55, fontWeight:500, whiteSpace:"pre-wrap" }}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display:"flex", gap:5, padding:"10px 14px", background:"#f5f7fa", borderRadius:"16px 16px 16px 4px", width:"fit-content" }}>
            {[0,1,2].map(i => <div key={i} style={{ width:8, height:8, borderRadius:"50%", background:"#bbb", animation:`bounce 1.2s ${i*0.2}s infinite ease-in-out` }} />)}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {chatMsgs.length <= 1 && (
        <div style={{ padding:"0 14px 8px", display:"flex", flexWrap:"wrap", gap:6 }}>
          {quickQ.map((q,i) => (
            <button key={i} onClick={()=>onSend(q)} style={{ background:"#f0f4ff", color:"#1a1a2e", border:"1px solid #dde4ff", borderRadius:20, padding:"5px 10px", fontSize: fs(11), cursor:"pointer", fontWeight:600 }}>{q}</button>
          ))}
        </div>
      )}

      <div style={{ padding:"8px 14px 14px", borderTop:"1px solid #f0f0f0", display:"flex", gap:8 }}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&input.trim()&&(onSend(input.trim()),setInput(""))}
          placeholder="Hindi ya Hinglish mein poochein..." style={{ ...inputStyle, flex:1 }}
          onFocus={e=>e.target.style.borderColor="#1a1a2e"} onBlur={e=>e.target.style.borderColor="#e8e8e8"} />
        <button onClick={()=>{ if(input.trim()){ onSend(input.trim()); setInput(""); }}} disabled={loading||!input.trim()}
          style={{ width:42, height:42, borderRadius:12, background:"#1a1a2e", border:"none", color:"#FFD93D", cursor:"pointer", fontSize: fs(16), display:"flex", alignItems:"center", justifyContent:"center", opacity:loading||!input.trim()?0.4:1 }}>➤</button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// FORM CONFIGS
// ════════════════════════════════════════════════════════
const CUSTOMER_FIELDS = [
  { key:"business_name", label:"Business Name", hindi:"दुकान/व्यापार का नाम", required:true, placeholder:"e.g. Gupta General Store" },
  { key:"owner_name", label:"Owner Name", hindi:"मालिक का नाम", placeholder:"e.g. Ramesh Gupta" },
  { key:"phone", label:"Phone / WhatsApp", hindi:"फोन नंबर", type:"tel", placeholder:"9876543210" },
  { key:"city", label:"City", hindi:"शहर", placeholder:"e.g. Lucknow" },
  { key:"category", label:"Category", hindi:"श्रेणी", type:"select", options:["Kirana","Retail","Distributor","Service","Manufacturer","Other"] },
  { key:"gstin", label:"GSTIN (optional)", hindi:"जीएसटीएन", placeholder:"09AABCS1429B1ZB" },
];

const INVOICE_FIELDS = [
  { key:"customer_name", label:"Customer Name", hindi:"ग्राहक का नाम", required:true, placeholder:"Customer dhundho..." },
  { key:"amount", label:"Amount (₹)", hindi:"रकम", type:"number", required:true, placeholder:"25000" },
  { key:"due_date", label:"Due Date", hindi:"देय तिथि", type:"date" },
  { key:"gst_rate", label:"GST Rate", hindi:"जीएसटी दर", type:"select", options:["0%","5%","12%","18%","28%"] },
  { key:"notes", label:"Notes", hindi:"टिप्पणी", type:"textarea", placeholder:"Invoice notes..." },
];

const EXPENSE_FIELDS = [
  { key:"amount", label:"Amount (₹)", hindi:"रकम", type:"number", required:true, placeholder:"5000" },
  { key:"category", label:"Category", hindi:"श्रेणी", type:"select", options:["Kiraya","Tankhwa","Marketing","Bijli-Pani","Transport","Kharida","Other"] },
  { key:"vendor", label:"Vendor / Dukan", hindi:"दुकान/विक्रेता", placeholder:"e.g. Bijli Vibhag" },
  { key:"date", label:"Date", hindi:"तारीख", type:"date" },
  { key:"notes", label:"Notes", hindi:"टिप्पणी", type:"textarea", placeholder:"Kharch ki details..." },
];

const TASK_FIELDS = [
  { key:"title", label:"Task / Kaam", hindi:"काम का विवरण", required:true, placeholder:"e.g. Gupta ji ko call karo" },
  { key:"customer", label:"Customer", hindi:"ग्राहक", placeholder:"Customer ka naam..." },
  { key:"due_time", label:"Due Time", hindi:"समय सीमा", placeholder:"e.g. 3:00 PM" },
  { key:"priority", label:"Priority", hindi:"प्राथमिकता", type:"select", options:["High","Medium","Low"] },
];

// ════════════════════════════════════════════════════════
// DASHBOARD VIEW
// ════════════════════════════════════════════════════════
function DashboardView({ kpi, leads, tasks, setTasks, invoices, expenses, ai }) {
  return (
    <div>
      {/* ─ Infographic 1: Radial KPI Cards ─ */}
      <div style={{ fontSize: fs(12), color:"#aaa", fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:10 }}>
        📊 Infographic 1 — Radial KPI Cards &nbsp;<span style={{ fontFamily:"'Noto Sans Devanagari',sans-serif", textTransform:"none", letterSpacing:0 }}>प्रमुख संकेतक</span>
      </div>
      <div className="crm-grid crm-grid-kpi" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:12, marginBottom:22 }}>
        <RadialKPI label="Total Due" hindiLabel="कुल बकाया" value={kpi.totalDue} max={300000} icon="💰" color="#FF6B6B" isAmount />
        <RadialKPI label="Today's Collection" hindiLabel="आज का संग्रह" value={kpi.todayCollection} max={50000} icon="📈" color="#22C55E" isAmount />
        <RadialKPI label="Active Customers" hindiLabel="सक्रिय ग्राहक" value={kpi.activeCustomers} max={100} icon="👥" color="#FFD93D" />
        <RadialKPI label="Today's Follow-ups" hindiLabel="आज के फॉलो-अप" value={kpi.todayFollowups} max={20} icon="🔔" color="#A855F7" />
        <RadialKPI label="Monthly Sales" hindiLabel="मासिक बिक्री" value={kpi.thisMonthSales} max={500000} icon="🛒" color="#3B82F6" isAmount />
        <RadialKPI label="Profit Margin" hindiLabel="मुनाफा मार्जिन" value={58} max={100} icon="🏆" color="#F97316" unit="%" />
      </div>

      {/* ─ Infographic 2 & 3: Bar Chart + Expense Heatmap ─ */}
      <div style={{ fontSize: fs(12), color:"#aaa", fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:10 }}>
        📊 Infographic 2 & 3 — Sales Bar Chart + Expense Heatmap
      </div>
      <div className="crm-grid crm-grid-2" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:22 }}>
        <MonthlyBarChart data={MOCK.monthlySales} />
        <ExpenseHeatmap expenses={expenses} />
      </div>

      {/* ─ Profit Gauge + AI Insights ─ */}
      <div className="crm-grid crm-grid-1-2" style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:14, marginBottom:22 }}>
        <ProfitGauge sales={kpi.thisMonthSales} expenses={kpi.thisMonthExpenses} />
        <VoiceInsightsPanel
          insights={ai.insights}
          actionPoints={ai.actionPoints}
          loading={ai.loadingInsights}
          onFetch={ai.fetchInsights}
        />
      </div>

      {/* ─ Kanban + Tasks ─ */}
      <div className="crm-grid crm-grid-1-3" style={{ display:"grid", gridTemplateColumns:"1.3fr 1fr", gap:14, marginBottom:22 }}>
        <LeadKanban leads={leads} />
        <TasksPanel tasks={tasks} setTasks={setTasks} />
      </div>

      <InvoicesPanel invoices={invoices} />
    </div>
  );
}

// ════════════════════════════════════════════════════════
// NAV
// ════════════════════════════════════════════════════════
const NAV = [
  { key:"dashboard", label:"Dashboard", hindi:"डैशबोर्ड", icon:"🏠" },
  { key:"customers", label:"Grahak", hindi:"ग्राहक", icon:"👥" },
  { key:"leads", label:"Leads", hindi:"लीड", icon:"🎯" },
  { key:"invoices", label:"Bill", hindi:"बिल", icon:"🧾" },
  { key:"expenses", label:"Kharch", hindi:"खर्च", icon:"💸" },
];

// ════════════════════════════════════════════════════════
// MODAL REGISTRY
// ════════════════════════════════════════════════════════
const MODALS = {
  customer: { title:"Naya Grahak Jodo", hindiTitle:"नया ग्राहक जोड़ें", fields:CUSTOMER_FIELDS },
  invoice:  { title:"Naya Bill Banao", hindiTitle:"नया बिल/इनवॉइस", fields:INVOICE_FIELDS },
  expense:  { title:"Kharch Darj Karo", hindiTitle:"खर्च दर्ज करें", fields:EXPENSE_FIELDS },
  task:     { title:"Naya Kaam Jodo", hindiTitle:"नया काम / रिमाइंडर", fields:TASK_FIELDS },
};

// ════════════════════════════════════════════════════════
// APP ROOT
// ════════════════════════════════════════════════════════
export default function App() {
  const [view, setView] = useState("dashboard");
  const [tasks, setTasks] = useState(MOCK.tasks);
  const [customers, setCustomers] = useState(MOCK.customers);
  const [chatOpen, setChatOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [modal, setModal] = useState(null); // "customer"|"invoice"|"expense"|"task"
  const [toast, setToast] = useState(null);

  const ai = useVyapaiAI();

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(null), 3000); };

  const handleSave = (type, form) => {
    if (type === "customer") {
      setCustomers(p => [...p, { id:Date.now(), name:form.business_name||"New Customer", owner:form.owner_name||"", phone:form.phone||"", city:form.city||"", category:form.category||"Kirana", balance:0 }]);
    }
    showToast(`✅ ${MODALS[type]?.title} — Save ho gaya!`);
    setModal(null);
  };

  const today = new Date().toLocaleDateString("hi-IN", { weekday:"long", day:"numeric", month:"long" });

  return (
    <div className="crm-root" style={{ minHeight:"100vh", background: darkMode ? "#0d0d1a" : "#F0F4FA", fontFamily:"'Baloo 2', system-ui, sans-serif", color:"#1a1a2e" }}>
      <style>{`
        ${FONT_LINK}
        @keyframes bounce { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        ::-webkit-scrollbar{width:5px;height:5px} ::-webkit-scrollbar-thumb{background:#ddd;border-radius:3px}
        *{box-sizing:border-box}
        input:focus, select:focus, textarea:focus { border-color:#1a1a2e !important; outline:none; background:#fff !important; }
        .crm-root{ --fs: 1.1; }
        @media (max-width: 1024px){
          .crm-root{ --fs: 1.14; }
          .crm-sidebar{ position:relative !important; width:100% !important; height:auto !important; }
          .crm-main{ margin-left:0 !important; padding: 0 16px 24px !important; }
          .crm-nav-list{ display:flex; gap:8px; overflow-x:auto; padding-bottom:8px; }
          .crm-nav-list button{ width:auto !important; white-space:nowrap; }
          .crm-header-actions{ width:100%; flex-wrap:wrap; }
        }
        @media (max-width: 720px){
          .crm-root{ --fs: 1.18; }
          .crm-grid-2, .crm-grid-1-2, .crm-grid-1-3{ grid-template-columns: 1fr !important; }
          .crm-chat{ left:12px !important; right:12px !important; bottom:12px !important; width:auto !important; height:70vh !important; }
          .crm-modal{ max-width: 100% !important; border-radius: 16px !important; padding: 20px 18px 18px !important; }
        }
      `}</style>

      {/* Sidebar */}
      <div className="crm-sidebar" style={{ position:"fixed", left:0, top:0, bottom:0, width:228, background: darkMode ? "#12122a" : "#1a1a2e", display:"flex", flexDirection:"column", zIndex:50 }}>
        {/* Logo */}
        <div style={{ padding:"22px 18px 16px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:42, height:42, borderRadius:14, background:"linear-gradient(135deg,#FFD93D,#FF6B35)", display:"flex", alignItems:"center", justifyContent:"center", fontSize: fs(22), fontWeight:900, boxShadow:"0 4px 14px rgba(255,217,61,0.4)" }}>V</div>
            <div>
              <div style={{ color:"#FFD93D", fontWeight:900, fontSize: fs(18), letterSpacing:0.5 }}>Vyapai</div>
              <div style={{ color:"#888", fontSize: fs(10), fontFamily:"'Noto Sans Devanagari',sans-serif" }}>व्यापाई CRM</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <div style={{ padding:"6px 10px", flex:1 }}>
          <div className="crm-nav-list">
            {NAV.map(n => (
              <button key={n.key} onClick={()=>setView(n.key)} style={{
              width:"100%", display:"flex", alignItems:"center", gap:10, padding:"11px 14px",
              borderRadius:12, border:"none", cursor:"pointer",
              background: view===n.key ? "linear-gradient(135deg,#FFD93D,#FF9500)" : "transparent",
              color: view===n.key ? "#1a1a2e" : "#aaa",
              fontWeight: view===n.key ? 900 : 500, fontSize: fs(14),
              marginBottom:4, transition:"all 0.2s", textAlign:"left",
              fontFamily:"'Baloo 2', sans-serif"
            }}
              onMouseEnter={e=>{ if(view!==n.key) e.currentTarget.style.background="#ffffff12"; }}
              onMouseLeave={e=>{ if(view!==n.key) e.currentTarget.style.background="transparent"; }}>
              <span style={{ fontSize: fs(17) }}>{n.icon}</span>
              <div>
                <div>{n.label}</div>
                <div style={{ fontSize: fs(9), opacity:0.6, fontFamily:"'Noto Sans Devanagari',sans-serif" }}>{n.hindi}</div>
              </div>
            </button>
            ))}
          </div>

          {/* Quick Add Buttons */}
          <div style={{ marginTop:20, paddingTop:16, borderTop:"1px solid #ffffff15" }}>
            <div style={{ fontSize: fs(10), color:"#666", fontWeight:700, textTransform:"uppercase", letterSpacing:0.5, marginBottom:8, padding:"0 4px" }}>Quick Add / जल्दी जोड़ें</div>
            {[["customer","👤 Grahak"],["invoice","🧾 Bill"],["expense","💸 Kharch"],["task","✅ Kaam"]].map(([k,l]) => (
              <button key={k} onClick={()=>setModal(k)} style={{
                width:"100%", display:"flex", alignItems:"center", gap:8, padding:"8px 14px",
                borderRadius:10, border:"1px solid #ffffff18", background:"transparent",
                color:"#ccc", fontSize: fs(12), cursor:"pointer", marginBottom:4,
                transition:"all 0.18s", textAlign:"left", fontFamily:"'Baloo 2',sans-serif"
              }}
                onMouseEnter={e=>{ e.currentTarget.style.background="#FFD93D20"; e.currentTarget.style.color="#FFD93D"; }}
                onMouseLeave={e=>{ e.currentTarget.style.background="transparent"; e.currentTarget.style.color="#ccc"; }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* User footer */}
        <div style={{ padding:"14px 18px", borderTop:"1px solid #ffffff12" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:34, height:34, borderRadius:10, background:"#FFD93D30", display:"flex", alignItems:"center", justifyContent:"center", fontSize: fs(16), fontWeight:800, color:"#FFD93D" }}>S</div>
            <div>
              <div style={{ color:"#fff", fontSize: fs(13), fontWeight:800 }}>{MOCK.user.name} ji</div>
              <div style={{ color:"#666", fontSize: fs(10) }}>{MOCK.user.role} • {MOCK.org.plan}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="crm-main" style={{ marginLeft:228, padding:"0 26px 32px" }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 0 18px", borderBottom:`1px solid ${darkMode?"#ffffff12":"#e4e4e4"}`, marginBottom:24, flexWrap:"wrap", gap:12 }}>
          <div>
            <div style={{ fontSize: fs(22), fontWeight:900, color: darkMode?"#fff":"#1a1a2e" }}>
              Namaste, {MOCK.user.name} ji! 🙏
            </div>
            <div style={{ fontSize: fs(12), color:"#888", marginTop:3, fontFamily:"'Noto Sans Devanagari',sans-serif" }}>
              {today} • {MOCK.org.name}, {MOCK.org.city} • GST: {MOCK.org.gstin}
            </div>
          </div>
          <div className="crm-header-actions" style={{ display:"flex", alignItems:"center", gap:10 }}>
            <button onClick={()=>setModal("customer")} style={{ background:"#fff", border:"1.5px solid #e0e0e0", color:"#1a1a2e", borderRadius:12, padding:"9px 14px", fontWeight:700, cursor:"pointer", fontSize: fs(13) }}>+ Grahak</button>
            <button onClick={()=>setModal("invoice")} style={{ background:"#fff", border:"1.5px solid #e0e0e0", color:"#1a1a2e", borderRadius:12, padding:"9px 14px", fontWeight:700, cursor:"pointer", fontSize: fs(13) }}>+ Bill</button>
            <button onClick={()=>setDarkMode(!darkMode)} style={{ background: darkMode?"#ffffff15":"#f0f0f0", border:"none", borderRadius:10, padding:"9px 12px", cursor:"pointer", fontSize: fs(16) }}>
              {darkMode?"☀️":"🌙"}
            </button>
            <button onClick={()=>setChatOpen(true)} style={{
              background:"linear-gradient(135deg,#FFD93D,#FF6B35)", color:"#1a1a2e",
              border:"none", borderRadius:12, padding:"10px 16px", fontWeight:900, cursor:"pointer", fontSize: fs(13),
              boxShadow:"0 4px 18px rgba(255,217,61,0.45)", display:"flex", alignItems:"center", gap:6
            }}>🤖 AI Agent</button>
          </div>
        </div>

        {/* Views */}
        <div style={{ animation:"fadeIn 0.35s ease" }}>
          {view==="dashboard" && <DashboardView kpi={MOCK.kpi} leads={MOCK.leads} tasks={tasks} setTasks={setTasks} invoices={MOCK.invoices} expenses={MOCK.expenses} ai={ai} />}
          {view==="customers" && <CustomersView customers={customers} onAdd={()=>setModal("customer")} />}
          {view==="leads" && <div><h2 style={{ margin:"0 0 20px", fontWeight:900 }}>🎯 Lead Pipeline</h2><LeadKanban leads={MOCK.leads} /></div>}
          {view==="invoices" && <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <div>
                <h2 style={{ margin:0, fontWeight:900 }}>🧾 Bills & Invoices</h2>
                <div style={{ fontSize: fs(12), color:"#888", fontFamily:"'Noto Sans Devanagari',sans-serif" }}>बिल और भुगतान प्रबंधन</div>
              </div>
              <button onClick={()=>setModal("invoice")} style={{ background:"linear-gradient(135deg,#1a1a2e,#16213e)", color:"#FFD93D", border:"none", borderRadius:12, padding:"10px 18px", fontWeight:800, cursor:"pointer" }}>+ Naya Bill</button>
            </div>
            <InvoicesPanel invoices={MOCK.invoices} />
          </div>}
          {view==="expenses" && <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <div>
                <h2 style={{ margin:0, fontWeight:900 }}>💸 Kharch</h2>
                <div style={{ fontSize: fs(12), color:"#888", fontFamily:"'Noto Sans Devanagari',sans-serif" }}>खर्च का विवरण और प्रबंधन</div>
              </div>
              <button onClick={()=>setModal("expense")} style={{ background:"linear-gradient(135deg,#1a1a2e,#16213e)", color:"#FFD93D", border:"none", borderRadius:12, padding:"10px 18px", fontWeight:800, cursor:"pointer" }}>+ Naya Kharch</button>
            </div>
            <ExpenseHeatmap expenses={MOCK.expenses} />
            <div style={{ marginTop:16 }}><MonthlyBarChart data={MOCK.monthlySales} /></div>
          </div>}
        </div>
      </div>

      {/* Modals */}
      {modal && MODALS[modal] && (
        <FormModal
          title={MODALS[modal].title}
          hindiTitle={MODALS[modal].hindiTitle}
          fields={MODALS[modal].fields}
          onSave={(form)=>handleSave(modal, form)}
          onClose={()=>setModal(null)}
        />
      )}

      {/* AI Chat */}
      {chatOpen && <AIChatPanel chatMsgs={ai.chatMsgs} loading={ai.loadingChat} onSend={ai.sendChat} onClose={()=>setChatOpen(false)} />}
      {!chatOpen && (
        <button onClick={()=>setChatOpen(true)} style={{ position:"fixed", bottom:24, right:24, width:58, height:58, borderRadius:"50%", background:"linear-gradient(135deg,#FFD93D,#FF6B35)", border:"none", cursor:"pointer", fontSize: fs(24), boxShadow:"0 8px 28px rgba(255,165,0,0.55)", zIndex:99, display:"flex", alignItems:"center", justifyContent:"center", transition:"transform 0.2s" }}
          onMouseEnter={e=>e.currentTarget.style.transform="scale(1.12)"}
          onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>🤖</button>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", bottom:90, right:24, background:"#1a1a2e", color:"#FFD93D", borderRadius:14, padding:"12px 20px", fontSize: fs(13), fontWeight:700, boxShadow:"0 8px 28px rgba(0,0,0,0.3)", zIndex:300, animation:"fadeIn 0.3s ease" }}>
          {toast}
        </div>
      )}
    </div>
  );
}
