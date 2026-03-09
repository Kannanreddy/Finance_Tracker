
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from '@google/genai';
import { 
  LayoutDashboard, 
  ReceiptText, 
  PieChart, 
  Settings, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  TrendingUp,
  BrainCircuit,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Database,
  Search,
  Zap,
  Crown,
  Filter,
  ArrowRightLeft,
  Bell,
  Fingerprint,
  Download,
  Moon,
  Sun,
  Palette,
  FileText,
  Share2,
  Activity,
  BarChart3,
  LineChart
} from 'lucide-react';

// --- Types ---
interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  note: string;
}

interface Budget {
  category: string;
  limit: number;
}

interface FinancialData {
  transactions: Transaction[];
  budgets: Budget[];
}

type ThemeColor = 'indigo' | 'emerald' | 'rose' | 'amber' | 'cyan' | 'purple';

// --- Constants ---
const DEFAULT_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbyO_4GyyXTnbqncHcs7InfBC-asGbfX4_Mo4iHT7nZXo5dbLscUmd8QeZSJKq8T2rJn/exec';
const CATEGORIES = [
  'Food & Dining', 'Transport', 'Shopping', 'Entertainment', 
  'Health', 'Housing', 'Utilities', 'Salary', 'Investment', 'Other'
];

const THEME_CONFIGS: Record<ThemeColor, string> = {
  indigo: '#6366f1',
  emerald: '#10b981',
  rose: '#f43f5e',
  amber: '#f59e0b',
  cyan: '#06b6d4',
  purple: '#a855f7'
};

// --- Custom Components: Advanced Charts ---

// 1. Spending Velocity (Area Chart)
const AreaChart = ({ data, color }: { data: number[], color: string }) => {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const points = data.map((v, i) => `${(i / (data.length - 1)) * 100},${100 - (v / max) * 100}`).join(' ');
  const fillPoints = `0,100 ${points} 100,100`;

  return (
    <svg viewBox="0 0 100 100" className="w-full h-32 overflow-visible" preserveAspectRatio="none">
      <defs>
        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={fillPoints} fill="url(#areaGradient)" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// 2. Allocation Map (Donut Chart)
const DonutChart = ({ segments }: { segments: { label: string, value: number, color: string }[] }) => {
  const total = segments.reduce((acc, s) => acc + s.value, 0);
  let cumulativePercent = 0;

  return (
    <div className="relative w-40 h-40 mx-auto">
      <svg viewBox="0 0 100 100" className="transform -rotate-90">
        {segments.map((s, i) => {
          const startPercent = cumulativePercent;
          cumulativePercent += (s.value / total);
          const x1 = Math.cos(2 * Math.PI * startPercent);
          const y1 = Math.sin(2 * Math.PI * startPercent);
          const x2 = Math.cos(2 * Math.PI * cumulativePercent);
          const y2 = Math.sin(2 * Math.PI * cumulativePercent);
          const largeArcFlag = (s.value / total) > 0.5 ? 1 : 0;
          const pathData = [
            `M ${50 + 40 * x1} ${50 + 40 * y1}`,
            `A 40 40 0 ${largeArcFlag} 1 ${50 + 40 * x2} ${50 + 40 * y2}`,
          ].join(' ');
          return <path key={i} d={pathData} fill="none" stroke={s.color} strokeWidth="12" strokeLinecap="round" />;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-tighter">Total</span>
        <span className="text-sm font-black">₹{total.toLocaleString('en-IN')}</span>
      </div>
    </div>
  );
};

// 3. Category Burn (Bar Chart)
const BarChart = ({ data, color }: { data: { label: string, value: number }[], color: string }) => {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end justify-between h-32 gap-2 px-2">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2">
          <div className="w-full bg-zinc-900 rounded-t-lg relative overflow-hidden group" style={{ height: `${(d.value / max) * 100}%` }}>
             <div className="absolute inset-0 opacity-40 group-hover:opacity-80 transition-all" style={{ backgroundColor: color }}></div>
          </div>
          <span className="text-[7px] text-zinc-600 font-bold uppercase truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
};

// 4. Budget Progress Ring (Single)
const ProgressRing = ({ percent, color, size = 120 }: { percent: number, color: string, size?: number }) => {
  const radius = size * 0.4;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" className="text-zinc-900" />
        <circle 
          cx={size/2} cy={size/2} r={radius} stroke={color} strokeWidth="8" fill="transparent" 
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000"
        />
      </svg>
      <span className="absolute text-xs font-black">{percent.toFixed(0)}%</span>
    </div>
  );
};

// 5. Balance Evolution (Line Chart)
const BalanceLineChart = ({ data, color }: { data: number[], color: string }) => {
  if (!data.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data, 1);
  const range = max - min || 1;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * 100},${100 - ((v - min) / range) * 100}`).join(' ');

  return (
    <svg viewBox="0 0 100 100" className="w-full h-32 overflow-visible" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((v, i) => (
        <circle key={i} cx={(i / (data.length - 1)) * 100} cy={100 - ((v - min) / range) * 100} r="1.5" fill={color} />
      ))}
    </svg>
  );
};

// 6. Comparative Bar Chart (Inflow vs Outflow)
const ComparisonChart = ({ income, expense, color }: { income: number, expense: number, color: string }) => {
  const max = Math.max(income, expense, 1);
  return (
    <div className="flex justify-around items-end h-32 gap-8 px-6">
      <div className="flex-1 flex flex-col items-center gap-2">
        <div className="w-full bg-emerald-500/20 rounded-t-2xl relative overflow-hidden" style={{ height: `${(income / max) * 100}%` }}>
          <div className="absolute inset-0 bg-emerald-500 opacity-60"></div>
        </div>
        <span className="text-[9px] font-black text-emerald-500 uppercase">In</span>
      </div>
      <div className="flex-1 flex flex-col items-center gap-2">
        <div className="w-full bg-rose-500/20 rounded-t-2xl relative overflow-hidden" style={{ height: `${(expense / max) * 100}%` }}>
          <div className="absolute inset-0 bg-rose-500 opacity-60"></div>
        </div>
        <span className="text-[9px] font-black text-rose-500 uppercase">Out</span>
      </div>
    </div>
  );
};

// --- Main Application ---

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'ledger' | 'budget' | 'insights' | 'settings'>('dashboard');
  const [webAppUrl, setWebAppUrl] = useState<string>(localStorage.getItem('aura_finance_url') || DEFAULT_WEBAPP_URL);
  const [data, setData] = useState<FinancialData>({ transactions: [], budgets: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [aiInsight, setAiInsight] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [theme, setTheme] = useState<ThemeColor>((localStorage.getItem('aura_theme_color') as ThemeColor) || 'indigo');
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('aura_dark_mode') !== 'false');

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

  // Form State
  const [newTx, setNewTx] = useState<Partial<Transaction>>({
    type: 'expense',
    category: CATEGORIES[0],
    amount: 0,
    note: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Effects
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('aura_dark_mode', String(isDarkMode));
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('aura_theme_color', theme);
  }, [theme]);

  const fetchData = async () => {
    if (!webAppUrl) return;
    setIsLoading(true);
    try {
      const response = await fetch(webAppUrl);
      const json = await response.json();
      const normalizedData = {
        transactions: Array.isArray(json.transactions) ? json.transactions : [],
        budgets: Array.isArray(json.budgets) ? json.budgets : []
      };
      setData(normalizedData);
      localStorage.setItem('aura_finance_cache', JSON.stringify(normalizedData));
    } catch (error) {
      console.error("Fetch failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const cached = localStorage.getItem('aura_finance_cache');
    if (cached) setData(JSON.parse(cached));
    fetchData();
  }, [webAppUrl]);

  // Actions
  const handleAddTransaction = async () => {
    if (!webAppUrl || !newTx.amount) return;
    setIsSyncing(true);
    const tx: Transaction = {
      id: crypto.randomUUID(),
      date: newTx.date || new Date().toISOString().split('T')[0],
      amount: Number(newTx.amount),
      type: newTx.type as 'income' | 'expense',
      category: newTx.category || 'Other',
      note: newTx.note || ''
    };

    try {
      const updatedData = { ...data, transactions: [tx, ...data.transactions] };
      setData(updatedData);
      await fetch(webAppUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tx)
      });
      localStorage.setItem('aura_finance_cache', JSON.stringify(updatedData));
      setShowAddModal(false);
      setNewTx({ type: 'expense', category: CATEGORIES[0], amount: 0, note: '', date: new Date().toISOString().split('T')[0] });
    } catch (error) {
      console.error("Add failed:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const exportCSV = () => {
    const headers = ['ID', 'Date', 'Amount', 'Type', 'Category', 'Note'];
    const rows = data.transactions.map(t => [t.id, t.date, t.amount, t.type, t.category, t.note]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers, ...rows].map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `aura_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculations
  const totals = useMemo(() => {
    return data.transactions.reduce((acc, curr) => {
      const amt = Number(curr.amount) || 0;
      if (curr.type === 'income') acc.income += amt;
      else acc.expense += amt;
      return acc;
    }, { income: 0, expense: 0 });
  }, [data.transactions]);

  const balance = totals.income - totals.expense;
  
  const weeklyTrends = useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });
    return last7Days.map(day => {
      return data.transactions
        .filter(t => t.date === day && t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);
    });
  }, [data.transactions]);

  const balanceEvolution = useMemo(() => {
    const sorted = [...data.transactions].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let current = 0;
    return sorted.map(t => {
      if (t.type === 'income') current += Number(t.amount);
      else current -= Number(t.amount);
      return current;
    }).slice(-10); // Last 10 points
  }, [data.transactions]);

  const categorySegments = useMemo(() => {
    const map: Record<string, number> = {};
    data.transactions.filter(t => t.type === 'expense').forEach(t => {
      map[t.category] = (map[t.category] || 0) + Number(t.amount);
    });
    const colors = [THEME_CONFIGS[theme], '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6'];
    return Object.entries(map).map(([label, value], i) => ({
      label, value, color: colors[i % colors.length]
    })).sort((a,b) => b.value - a.value).slice(0, 5);
  }, [data.transactions, theme]);

  const burnRateData = useMemo(() => {
    return CATEGORIES.slice(0, 7).map(cat => ({
      label: cat,
      value: data.transactions.filter(t => t.category === cat && t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
    }));
  }, [data.transactions]);

  const renderDashboard = () => (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
      {/* 1. Main Capital Shield */}
      <div className="relative p-10 rounded-[3.5rem] overflow-hidden bg-zinc-950 border border-white/5 shadow-2xl group transition-all">
        <div className="absolute -top-32 -right-32 w-80 h-80 blur-[100px] rounded-full opacity-30 group-hover:opacity-50 transition-all duration-1000" style={{ backgroundColor: THEME_CONFIGS[theme] }}></div>
        <div className="relative z-10 flex flex-col items-center text-center space-y-6">
          <div className="w-16 h-16 rounded-full glass border border-white/10 flex items-center justify-center mb-2">
            <Crown size={32} style={{ color: THEME_CONFIGS[theme] }} />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Global Asset Balance</p>
            <h2 className="text-6xl font-black text-white tracking-tighter tabular-nums">
              ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h2>
          </div>
          <div className="flex gap-4 w-full pt-4">
             <div className="flex-1 p-5 rounded-3xl glass border border-white/5 bg-white/[0.02]">
                <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Inflow</p>
                <p className="text-lg font-black text-emerald-400">₹{totals.income.toLocaleString('en-IN')}</p>
             </div>
             <div className="flex-1 p-5 rounded-3xl glass border border-white/5 bg-white/[0.02]">
                <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Outflow</p>
                <p className="text-lg font-black text-rose-400">₹{totals.expense.toLocaleString('en-IN')}</p>
             </div>
          </div>
        </div>
      </div>

      {/* 2. Advanced Analytics Suite (6 Charts) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Chart A: Spending Velocity */}
        <div className="glass p-7 rounded-[3rem] border border-zinc-900/50 space-y-5">
           <div className="flex justify-between items-center">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Spending Velocity</h3>
              <Activity size={16} className="text-zinc-700" />
           </div>
           <AreaChart data={weeklyTrends} color={THEME_CONFIGS[theme]} />
           <p className="text-[8px] text-zinc-600 font-bold uppercase text-center tracking-tighter">7-Day Momentum Analysis</p>
        </div>

        {/* Chart B: Allocation Matrix */}
        <div className="glass p-7 rounded-[3rem] border border-zinc-900/50 space-y-5">
           <div className="flex justify-between items-center">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Allocation Map</h3>
              <PieChart size={16} className="text-zinc-700" />
           </div>
           <DonutChart segments={categorySegments} />
        </div>

        {/* Chart C: Category Burn Rate */}
        <div className="glass p-7 rounded-[3rem] border border-zinc-900/50 space-y-5">
           <div className="flex justify-between items-center">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Sector Burn</h3>
              <BarChart3 size={16} className="text-zinc-700" />
           </div>
           <BarChart data={burnRateData} color={THEME_CONFIGS[theme]} />
        </div>

        {/* Chart D: Balance Evolution */}
        <div className="glass p-7 rounded-[3rem] border border-zinc-900/50 space-y-5">
           <div className="flex justify-between items-center">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Asset Evolution</h3>
              <LineChart size={16} className="text-zinc-700" />
           </div>
           <BalanceLineChart data={balanceEvolution} color={THEME_CONFIGS[theme]} />
           <p className="text-[8px] text-zinc-600 font-bold uppercase text-center tracking-tighter">Real-time Balance Projection</p>
        </div>

        {/* Chart E: Flow Comparison */}
        <div className="glass p-7 rounded-[3rem] border border-zinc-900/50 space-y-5">
           <div className="flex justify-between items-center">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Flow Dynamics</h3>
              <ArrowRightLeft size={16} className="text-zinc-700" />
           </div>
           <ComparisonChart income={totals.income} expense={totals.expense} color={THEME_CONFIGS[theme]} />
        </div>

        {/* Chart F: Budget Wellness Ring */}
        <div className="glass p-7 rounded-[3rem] border border-zinc-900/50 space-y-5 flex flex-col items-center">
           <div className="flex justify-between items-center w-full">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Overall Wellness</h3>
              <CheckCircle2 size={16} className="text-zinc-700" />
           </div>
           <ProgressRing 
             percent={totals.income > 0 ? (Math.max(0, balance) / totals.income) * 100 : 0} 
             color={THEME_CONFIGS[theme]} 
           />
           <p className="text-[8px] text-zinc-600 font-bold uppercase text-center tracking-tighter">Capital Retention Index</p>
        </div>
      </div>

      {/* 3. Export & Sync Actions */}
      <div className="grid grid-cols-2 gap-4">
         <button onClick={exportCSV} className="py-5 glass rounded-[2rem] border border-zinc-900/50 text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-zinc-900/40 transition-all active:scale-95">
            <FileText size={18} /> Export Global CSV
         </button>
         <button onClick={() => window.print()} className="py-5 glass rounded-[2rem] border border-zinc-900/50 text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-zinc-900/40 transition-all active:scale-95">
            <Download size={18} /> Executive PDF
         </button>
      </div>
    </div>
  );

  return (
    <div className={`flex flex-col h-screen max-h-screen safe-area-top safe-area-bottom overflow-hidden transition-colors duration-700 ${isDarkMode ? 'bg-[#050505] text-white' : 'bg-zinc-50 text-zinc-900'}`}>
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay z-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

      {/* Header */}
      <header className={`flex items-center justify-between px-8 py-7 border-b transition-all relative z-10 ${isDarkMode ? 'glass border-white/5' : 'bg-white border-zinc-200 shadow-sm'}`}>
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 blur-xl opacity-30 animate-pulse" style={{ backgroundColor: THEME_CONFIGS[theme] }}></div>
            <div className="relative w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl border border-white/10" style={{ backgroundColor: THEME_CONFIGS[theme] }}>
              <Zap size={22} className="text-white fill-current" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter leading-none flex items-center gap-2">
              AURA <span style={{ color: THEME_CONFIGS[theme] }} className="font-light">SUITE</span>
            </h1>
            <p className="text-[8px] font-black uppercase tracking-[0.4em] mt-1.5 opacity-30">Elite Asset Management</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-3 rounded-2xl border border-zinc-800/10 hover:bg-zinc-500/5 transition-all">
            {isDarkMode ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-indigo-600" />}
          </button>
          <button onClick={fetchData} className={`p-3 rounded-2xl border border-zinc-800/10 text-zinc-500 ${isLoading ? 'animate-spin' : ''}`}>
            <Database size={20} />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-6 py-10 relative z-10 no-scrollbar">
        {activeTab === 'dashboard' && renderDashboard()}
        
        {activeTab === 'ledger' && (
          <div className="space-y-8 pb-32 animate-in fade-in zoom-in-95 duration-500">
             <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black tracking-tighter">Global Ledger</h2>
                <div className="flex gap-2">
                   <button onClick={exportCSV} className="p-3 glass rounded-2xl border border-white/5"><Share2 size={18} /></button>
                </div>
             </div>
             <div className="relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input 
                  type="text" 
                  placeholder="Query entry details..." 
                  className={`w-full border rounded-[1.5rem] pl-14 pr-6 py-5 text-sm outline-none transition-all ${isDarkMode ? 'bg-zinc-900/30 border-white/5 focus:ring-2 focus:ring-indigo-500/20' : 'bg-white border-zinc-200 focus:ring-2 focus:ring-zinc-400/10'}`} 
                />
             </div>
             <div className="space-y-4">
                {data.transactions.map((tx) => (
                  <div key={tx.id} className={`p-6 rounded-[2.5rem] border flex justify-between items-center transition-all active:scale-[0.97] ${isDarkMode ? 'glass border-white/5 bg-white/[0.01]' : 'bg-white border-zinc-100 shadow-sm'}`}>
                     <div className="flex gap-5 items-center">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg ${tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-400'}`}>
                          {tx.type === 'income' ? <ArrowDownLeft size={24} /> : <ReceiptText size={24} />}
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1">{tx.date}</p>
                          <p className="text-sm font-black uppercase text-zinc-200 dark:text-white">{tx.category}</p>
                          <p className="text-xs opacity-50 mt-1 font-medium">{tx.note || 'Institutional Record'}</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className={`text-xl font-black tabular-nums ${tx.type === 'income' ? 'text-emerald-500' : 'text-zinc-200 dark:text-zinc-100'}`}>
                          {tx.type === 'income' ? '+' : '-'}₹{Number(tx.amount).toLocaleString('en-IN')}
                        </p>
                        <span className="text-[8px] font-black uppercase tracking-tighter opacity-30">Ledger Confirmed</span>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'budget' && (
           <div className="space-y-10 animate-in slide-in-from-right-10 duration-500 pb-32">
              <h2 className="text-3xl font-black tracking-tighter">Strategic Limits</h2>
              <div className="grid gap-6">
                {data.budgets.map((b, i) => {
                  const spent = data.transactions.filter(t => t.category === b.category && t.type === 'expense').reduce((s,t) => s + Number(t.amount), 0);
                  const percent = Math.min((spent / b.limit) * 100, 100);
                  const isCritical = percent > 90;
                  return (
                    <div key={i} className={`p-10 rounded-[3.5rem] border space-y-6 transition-all ${isDarkMode ? 'glass border-white/5 bg-white/[0.01]' : 'bg-white border-zinc-100 shadow-sm'}`}>
                       <div className="flex justify-between items-start">
                          <div className="flex items-center gap-5">
                             <div className={`w-14 h-14 rounded-3xl flex items-center justify-center ${isCritical ? 'bg-rose-500/10 text-rose-500' : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-400'}`}>
                                <BarChart3 size={28} />
                             </div>
                             <div>
                                <p className="text-sm font-black uppercase tracking-[0.2em]">{b.category}</p>
                                <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest mt-1">Cap: ₹{b.limit.toLocaleString('en-IN')}</p>
                             </div>
                          </div>
                          <div className="text-right">
                             <p className={`text-2xl font-black ${isCritical ? 'text-rose-500' : 'text-zinc-200 dark:text-white'}`}>₹{spent.toLocaleString('en-IN')}</p>
                             <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-20">Utilized</p>
                          </div>
                       </div>
                       <div className="relative h-4 w-full bg-zinc-200 dark:bg-zinc-900 rounded-full overflow-hidden p-0.5">
                          <div 
                            className={`h-full transition-all duration-1000 rounded-full ${isCritical ? 'bg-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.4)]' : ''}`} 
                            style={{ width: `${percent}%`, backgroundColor: !isCritical ? THEME_CONFIGS[theme] : '' }}
                          />
                       </div>
                       <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                          <span className={isCritical ? 'text-rose-500' : 'text-zinc-500'}>{isCritical ? 'CRITICAL SPIKE' : 'STABLE OPERATION'}</span>
                          <span className="opacity-40">{percent.toFixed(1)}% Saturation</span>
                       </div>
                    </div>
                  );
                })}
              </div>
           </div>
        )}

        {activeTab === 'insights' && (
           <div className="space-y-12 animate-in slide-in-from-left-10 duration-700 pb-32">
              <div className="relative p-14 rounded-[4rem] text-center overflow-hidden bg-zinc-950 border border-white/5 shadow-inner">
                 <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: THEME_CONFIGS[theme] }}></div>
                 <div className="relative z-10 space-y-8">
                    <div className="w-28 h-28 rounded-full flex items-center justify-center mx-auto shadow-inner relative group">
                       <div className="absolute inset-0 rounded-full opacity-20 blur-3xl group-hover:opacity-40 transition-all" style={{ backgroundColor: THEME_CONFIGS[theme] }}></div>
                       <BrainCircuit size={56} style={{ color: THEME_CONFIGS[theme] }} />
                    </div>
                    <div className="space-y-3">
                       <h2 className="text-4xl font-black tracking-tighter">AURA CORE AI</h2>
                       <p className="text-zinc-500 text-sm font-medium max-w-[280px] mx-auto leading-relaxed uppercase tracking-[0.3em]">Neural Protocol for Wealth Optimization</p>
                    </div>
                    <button 
                      onClick={async () => {
                        setIsLoading(true);
                        try {
                          const response = await ai.models.generateContent({
                            model: 'gemini-3-pro-preview',
                            contents: `Provide a masterclass financial analysis for these transactions. Be ultra-professional, use economic terms, and give 3 key directives. Ensure figures are treated in INR.
                            Data: ${data.transactions.slice(0, 30).map(t => `${t.date}: ${t.type} ${t.amount} ${t.category}`).join('|')}`,
                            config: { thinkingConfig: { thinkingBudget: 4000 } }
                          });
                          setAiInsight(response.text || "Insight system failure.");
                        } catch (e) {
                          setAiInsight("AI Uplink Error. Connect to network.");
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                      disabled={isLoading}
                      className="w-full py-6 text-black rounded-[2.5rem] font-black uppercase tracking-[0.4em] shadow-2xl transition-all active:scale-95 disabled:opacity-50"
                      style={{ backgroundColor: THEME_CONFIGS[theme] }}
                    >
                      {isLoading ? "CALCULATING..." : "INITIATE ANALYSIS"}
                    </button>
                 </div>
              </div>

              {aiInsight && (
                <div className={`p-12 rounded-[4rem] border space-y-8 animate-in slide-in-from-bottom-8 duration-700 ${isDarkMode ? 'glass border-white/5' : 'bg-white border-zinc-200'}`}>
                   <div className="flex items-center gap-3">
                      <Zap size={20} style={{ color: THEME_CONFIGS[theme] }} />
                      <span className="text-[11px] font-black uppercase tracking-[0.5em]" style={{ color: THEME_CONFIGS[theme] }}>Quant Report</span>
                   </div>
                   <div className="text-base font-medium leading-[1.8] italic opacity-90 text-zinc-200 dark:text-zinc-100">
                      {aiInsight.split('\n').map((line, i) => <p key={i} className="mb-4 last:mb-0">{line}</p>)}
                   </div>
                </div>
              )}
           </div>
        )}

        {activeTab === 'settings' && (
           <div className="space-y-14 animate-in fade-in duration-500 pb-32">
              <h2 className="text-3xl font-black tracking-tighter">System Configuration</h2>
              
              <div className="space-y-10">
                 <div className="space-y-5">
                    <div className="flex items-center gap-3 text-zinc-500 uppercase text-[10px] font-black tracking-[0.3em]">
                       <Palette size={16} /> Identity Signature
                    </div>
                    <div className="flex gap-5 flex-wrap">
                       {(Object.keys(THEME_CONFIGS) as ThemeColor[]).map((c) => (
                          <button 
                            key={c}
                            onClick={() => setTheme(c)}
                            className={`w-14 h-14 rounded-3xl border-4 transition-all ${theme === c ? 'scale-110 shadow-[0_0_30px_rgba(0,0,0,0.4)]' : 'opacity-30 grayscale-[0.8]'}`}
                            style={{ backgroundColor: THEME_CONFIGS[c], borderColor: theme === c ? 'rgba(255,255,255,0.4)' : 'transparent' }}
                          />
                       ))}
                    </div>
                 </div>

                 <div className="space-y-5">
                    <div className="flex items-center gap-3 text-zinc-500 uppercase text-[10px] font-black tracking-[0.3em]">
                       <Database size={16} /> Web App Integration
                    </div>
                    <input 
                      type="password" 
                      value={webAppUrl}
                      onChange={(e) => setWebAppUrl(e.target.value)}
                      placeholder="HTTPS DEPLOYMENT URL"
                      className={`w-full border rounded-[1.5rem] px-8 py-6 text-xs font-mono transition-all outline-none ${isDarkMode ? 'bg-zinc-900/50 border-white/5 focus:ring-4 focus:ring-indigo-500/10' : 'bg-white border-zinc-200 focus:ring-4 focus:ring-zinc-400/5'}`}
                    />
                    <button 
                      onClick={() => {
                        localStorage.setItem('aura_finance_url', webAppUrl);
                        fetchData();
                      }}
                      className="w-full py-6 text-white rounded-[2.5rem] font-black uppercase tracking-[0.3em] shadow-xl transition-all"
                      style={{ backgroundColor: THEME_CONFIGS[theme] }}
                    >
                      COMMIT REPOSITORY
                    </button>
                 </div>
              </div>

              <div className={`p-10 rounded-[3rem] border text-xs leading-loose space-y-4 font-bold uppercase tracking-widest ${isDarkMode ? 'glass border-white/5 text-zinc-600' : 'bg-zinc-100 border-zinc-200 text-zinc-400'}`}>
                 <p>Signature: AURA-ELITE-V5.0.0-PRO</p>
                 <p>Last Sync: {new Date().toLocaleString('en-IN')}</p>
                 <p>Node Status: Operational / encrypted</p>
              </div>
           </div>
        )}
      </main>

      {/* Floating Add Trigger */}
      {webAppUrl && activeTab !== 'settings' && (
        <button 
          onClick={() => setShowAddModal(true)}
          className="fixed right-10 bottom-36 w-20 h-20 rounded-[2rem] shadow-[0_30px_60px_rgba(0,0,0,0.5)] flex items-center justify-center text-white active:scale-90 transition-all z-40 group"
          style={{ backgroundColor: THEME_CONFIGS[theme] }}
        >
          <Plus size={40} className="group-hover:rotate-90 transition-transform" />
        </button>
      )}

      {/* Modal: Entry Protocol */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-10 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/98 backdrop-blur-2xl" onClick={() => !isSyncing && setShowAddModal(false)} />
          <div className="relative w-full max-w-2xl bg-zinc-950 rounded-t-[4rem] sm:rounded-[4rem] border-t sm:border border-white/5 p-12 space-y-12 animate-in slide-in-from-bottom-60 duration-700">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-4xl font-black text-white tracking-tighter uppercase">Vault Injection</h3>
                <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.5em] mt-3">Elite Ledger Protocol</p>
              </div>
              <div className="flex bg-white/5 p-2 rounded-[1.5rem] border border-white/5">
                <button 
                  onClick={() => setNewTx({ ...newTx, type: 'expense' })}
                  className={`px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all ${newTx.type === 'expense' ? 'bg-rose-600 text-white shadow-2xl shadow-rose-600/30' : 'text-zinc-500'}`}
                >
                  Expense
                </button>
                <button 
                  onClick={() => setNewTx({ ...newTx, type: 'income' })}
                  className={`px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all ${newTx.type === 'income' ? 'bg-emerald-600 text-white shadow-2xl shadow-emerald-600/30' : 'text-zinc-500'}`}
                >
                  Income
                </button>
              </div>
            </div>

            <div className="space-y-10">
              <div className="space-y-5">
                <div className="relative">
                  <span className="absolute left-8 top-1/2 -translate-y-1/2 text-5xl font-black text-zinc-800">₹</span>
                  <input 
                    type="number" 
                    value={newTx.amount || ''}
                    onChange={(e) => setNewTx({ ...newTx, amount: Number(e.target.value) })}
                    className="w-full bg-transparent border-b-4 border-zinc-900 pl-20 pr-8 py-12 text-7xl font-black text-white focus:border-white outline-none tabular-nums placeholder:text-zinc-900 transition-colors"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                   <label className="text-[9px] font-black uppercase text-zinc-600 tracking-[0.3em] ml-2">Sector</label>
                   <select 
                    value={newTx.category}
                    onChange={(e) => setNewTx({ ...newTx, category: e.target.value })}
                    className="w-full bg-zinc-900/50 border border-white/5 rounded-[1.5rem] px-8 py-6 text-xs font-black uppercase tracking-widest text-white appearance-none outline-none"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                  </select>
                </div>
                <div className="space-y-3">
                   <label className="text-[9px] font-black uppercase text-zinc-600 tracking-[0.3em] ml-2">Timeline</label>
                   <input 
                    type="date" 
                    value={newTx.date}
                    onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
                    className="w-full bg-zinc-900/50 border border-white/5 rounded-[1.5rem] px-8 py-6 text-xs font-black text-white outline-none"
                  />
                </div>
              </div>

              <div className="space-y-3">
                 <label className="text-[9px] font-black uppercase text-zinc-600 tracking-[0.3em] ml-2">Contextual Memo</label>
                 <input 
                  type="text" 
                  value={newTx.note}
                  onChange={(e) => setNewTx({ ...newTx, note: e.target.value })}
                  placeholder="SPECIFY TRANSACTION CONTEXT"
                  className="w-full bg-zinc-900/50 border border-white/5 rounded-[1.5rem] px-8 py-6 text-[11px] font-bold text-white placeholder:text-zinc-800 outline-none uppercase tracking-[0.2em]"
                />
              </div>

              <button 
                onClick={handleAddTransaction}
                disabled={isSyncing || !newTx.amount}
                className="w-full py-8 text-white rounded-[3rem] font-black text-2xl uppercase tracking-[0.4em] shadow-[0_30px_80px_rgba(0,0,0,0.5)] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-6"
                style={{ backgroundColor: THEME_CONFIGS[theme] }}
              >
                {isSyncing ? "SYNCING VAULT..." : "EXECUTE INJECTION"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className={`flex items-center justify-around py-8 px-10 border-t shrink-0 relative z-10 transition-all ${isDarkMode ? 'bg-[#050505]/95 border-white/5 backdrop-blur-3xl' : 'bg-white border-zinc-100 shadow-[0_-20px_60px_rgba(0,0,0,0.03)]'}`}>
        <NavButton active={activeTab === 'dashboard'} icon={<LayoutDashboard size={28} />} label="CORE" onClick={() => setActiveTab('dashboard')} color={THEME_CONFIGS[theme]} />
        <NavButton active={activeTab === 'ledger'} icon={<ArrowRightLeft size={28} />} label="FLOW" onClick={() => setActiveTab('ledger')} color={THEME_CONFIGS[theme]} />
        <NavButton active={activeTab === 'budget'} icon={<BarChart3 size={28} />} label="LIMIT" onClick={() => setActiveTab('budget')} color={THEME_CONFIGS[theme]} />
        <NavButton active={activeTab === 'insights'} icon={<BrainCircuit size={28} />} label="AGENT" onClick={() => setActiveTab('insights')} color={THEME_CONFIGS[theme]} />
        <NavButton active={activeTab === 'settings'} icon={<Settings size={28} />} label="LINK" onClick={() => setActiveTab('settings')} color={THEME_CONFIGS[theme]} />
      </nav>
    </div>
  );
};

const NavButton: React.FC<{ active: boolean, icon: React.ReactNode, label: string, onClick: () => void, color: string }> = ({ active, icon, label, onClick, color }) => (
  <button 
    onClick={onClick}
    className="flex flex-col items-center gap-2.5 transition-all relative group"
    style={{ color: active ? color : 'rgb(82 82 91)' }}
  >
    <div className={`transition-all duration-500 ${active ? 'scale-125 -translate-y-3' : 'group-hover:scale-110'}`}>
      {icon}
    </div>
    <span className={`text-[9px] font-black uppercase tracking-[0.3em] transition-opacity ${active ? 'opacity-100' : 'opacity-20'}`}>{label}</span>
    {active && (
      <div className="absolute -top-2 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 15px ${color}` }}></div>
    )}
  </button>
);

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
