// src/App.tsx
import React, { useEffect, useState } from "react";

type PlanType = "daily" | "weekly" | "unit";
type Uploaded = { name: string; size?: number; text?: string };

function cls(...xs: Array<string | false | null | undefined>) { return xs.filter(Boolean).join(" "); }
function escapeHtml(s: string){ return (s||"").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] as string)); }
function nl2br(s: string){ return escapeHtml(s||"").replace(/\n/g, "<br/>"); }
function toDropdown<T extends string>(items: T[]){ return items.map(v=>({label: v[0].toUpperCase()+v.slice(1), value:v})); }

function downloadHTMLAsDoc(filename: string, html: string) {
  const blob = new Blob(
    [
      `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        body{font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,Helvetica,Arial;line-height:1.4}
        table{border-collapse:collapse;width:100%;margin:8px 0}
        th,td{border:1px solid #e5e7eb;padding:6px;vertical-align:top}
        h1,h2,h3{margin:8px 0}
      </style></head><body>${html}</body></html>`,
    ],
    { type: "application/msword" }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".doc") ? filename : filename + ".doc";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

async function copyHtmlToClipboard(html: string){
  try { await navigator.clipboard.writeText(html); alert("HTML copied to clipboard."); }
  catch { alert("Could not copy. Select and copy from the Preview instead."); }
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-sm font-medium text-gray-800 mb-1">{children}</div>;
}
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cls("w-full rounded border px-3 py-2 text-sm", props.className)}/>;
}
function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cls("w-full rounded border px-3 py-2 text-sm min-h-[96px]", props.className)}/>;
}
function Select({ value, onChange, options, placeholder } : {
  value?: string; onChange?: (v: string)=>void; options: {label:string; value:string}[]; placeholder?:string;
}) {
  return (
    <select value={value||""} onChange={e=>onChange?.(e.target.value)} className="w-full rounded border px-3 py-2 text-sm">
      <option value="">{placeholder||"Choose..."}</option>
      {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
function Checkbox({ label, checked, onChange }:{ label:string; checked?:boolean; onChange?:(v:boolean)=>void }) {
  return <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!checked} onChange={e=>onChange?.(e.target.checked)}/>{label}</label>;
}
function MultiTagInput({ value, onChange, placeholder }:{ value:string[]; onChange:(xs:string[])=>void; placeholder?:string }) {
  const [draft,setDraft]=useState(""); function add(){ const v=draft.trim(); if(!v) return; if(!value.includes(v)) onChange([...value,v]); setDraft(""); }
  return (
    <div>
      <div className="flex gap-2">
        <Input value={draft} onChange={e=>setDraft(e.target.value)} placeholder={placeholder||"Type & Enter"} onKeyDown={(e)=>{if(e.key==="Enter"){e.preventDefault();add();}}}/>
        <button onClick={add} className="rounded bg-indigo-600 text-white text-sm px-3 py-2">Add</button>
      </div>
      <div className="flex flex-wrap gap-2 mt-2">
        {value.map(t=><span key={t} className="bg-gray-100 px-2 py-1 rounded text-xs">{t} <button onClick={()=>onChange(value.filter(x=>x!==t))} className="text-gray-500 ml-1">×</button></span>)}
      </div>
    </div>
  );
}

/* -------------------- Forms -------------------- */
type DailyForm = {
  date?: string; topic: string; criteriaForSuccess: string; whatToKnowAndDo: string;
  standards: string[]; whyRelevant: string; objectiveStyle?: string; frameworkTaxonomy?: string;
  gradeLevel?: string; activityDescription: string; checksForUnderstanding: string;
  accommodations: string; differentiationStrategies: string; materialsAndResources: string;
  exemplarAnswerKey: string; interventions:{tier1:boolean;tier2:boolean;tier3:boolean};
  coTeachingSupport: string[]; customInstructions: string; files: Uploaded[]; aiEnabled: boolean;
};
type WeeklyDay = { date?: string; topic: string; keyActivities: string; assessmentExit: string; materials: string; notes: string; files: Uploaded[]; };
type WeeklyForm = {
  gradeLevel?: string; subjectsIntegrated: string[]; warmUp: string; reflection: string;
  differentiation: string; standards: string[]; whyRelevant: string; pacingAgendas: string; other: string;
  days: WeeklyDay[]; customInstructions: string; aiEnabled: boolean;
};
type UnitForm = {
  unitTitle: string; lengthOfTime: string; gradeLevel?: string; standards: string[];
  highLevelResources: string; unitTopics: string[]; files: Uploaded[];
  essentialQuestions: string; overviewDescription: string; outcomes: string; assignmentsAndAssessments: string;
  vocabularyAcademic: string; vocabularyContent: string; ellSupports: string[]; ellOther: string;
  connectPrior: string; introduceNew: string; practiceDeepen: string; application: string; extension: string;
  learningProgression: string; commonMisconceptions: string;
  pacingWeeks: Array<{ title:string; objective:string; commonErrors:string; notes:string }>;
  exemplarAnswerKey: string; customInstructions: string; aiEnabled: boolean;
};

const initialDaily: DailyForm = {
  date:"", topic:"", criteriaForSuccess:"", whatToKnowAndDo:"", standards:[], whyRelevant:"", objectiveStyle:"", frameworkTaxonomy:"", gradeLevel:"", activityDescription:"", checksForUnderstanding:"", accommodations:"", differentiationStrategies:"", materialsAndResources:"", exemplarAnswerKey:"", interventions:{tier1:false,tier2:false,tier3:false}, coTeachingSupport:[], customInstructions:"", files:[], aiEnabled:true
};
const initialWeekly: WeeklyForm = {
  gradeLevel:"", subjectsIntegrated:[], warmUp:"", reflection:"", differentiation:"", standards:[], whyRelevant:"", pacingAgendas:"", other:"", days:Array.from({length:5},()=>({date:"",topic:"",keyActivities:"",assessmentExit:"",materials:"",notes:"",files:[]})), customInstructions:"", aiEnabled:true
};
const initialUnit: UnitForm = {
  unitTitle:"", lengthOfTime:"", gradeLevel:"", standards:[], highLevelResources:"", unitTopics:[], files:[], essentialQuestions:"", overviewDescription:"", outcomes:"", assignmentsAndAssessments:"", vocabularyAcademic:"", vocabularyContent:"", ellSupports:[], ellOther:"", connectPrior:"", introduceNew:"", practiceDeepen:"", application:"", extension:"", learningProgression:"", commonMisconceptions:"", pacingWeeks:Array.from({length:6},()=>({title:"",objective:"",commonErrors:"",notes:""})), exemplarAnswerKey:"", customInstructions:"", aiEnabled:true
};

/* -------------------- Tabs -------------------- */
function DailyTab({ value, onChange }:{ value:DailyForm; onChange:(v:DailyForm)=>void }) {
  const grades = toDropdown(["k","1","2","3","4","5","6","7","8","9","10","11","12"]);
  function set<K extends keyof DailyForm>(k:K, v:DailyForm[K]){ onChange({...value,[k]:v}); }
  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-3 gap-3">
        <div><div className="text-sm font-medium text-gray-800 mb-1">Date</div><input type="date" value={value.date||""} onChange={e=>set("date",e.target.value)} className="w-full rounded border px-3 py-2 text-sm"/></div>
        <div className="md:col-span-2"><div className="text-sm font-medium text-gray-800 mb-1">Topic</div><input value={value.topic} onChange={e=>set("topic",e.target.value)} className="w-full rounded border px-3 py-2 text-sm"/></div>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <div><div className="text-sm font-medium text-gray-800 mb-1">Criteria for Success</div><textarea value={value.criteriaForSuccess} onChange={e=>set("criteriaForSuccess",e.target.value)} className="w-full rounded border px-3 py-2 text-sm min-h-[96px]"/></div>
        <div><div className="text-sm font-medium text-gray-800 mb-1">Know & Do</div><textarea value={value.whatToKnowAndDo} onChange={e=>set("whatToKnowAndDo",e.target.value)} className="w-full rounded border px-3 py-2 text-sm min-h-[96px]"/></div>
      </div>
    </div>
  );
}

function WeeklyTab({ value, onChange }:{ value:WeeklyForm; onChange:(v:WeeklyForm)=>void }) {
  const grades = toDropdown(["k","1","2","3","4","5","6","7","8","9","10","11","12"]);
  function set<K extends keyof WeeklyForm>(k:K, v:WeeklyForm[K]){ onChange({...value,[k]:v}); }
  function setDay(i:number, patch: Partial<WeeklyDay>){
    const copy = value.days.slice(); copy[i] = {...copy[i], ...patch}; set("days", copy);
  }
  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-3 gap-3">
        <div><div className="text-sm font-medium text-gray-800 mb-1">Grade</div>
          <select value={value.gradeLevel||""} onChange={e=>set("gradeLevel",e.target.value)} className="w-full rounded border px-3 py-2 text-sm">
            <option value="">Choose...</option>
            {grades.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <div className="text-sm font-medium text-gray-800 mb-1">Subjects Integrated</div>
          <textarea value={value.subjectsIntegrated.join(", ")} onChange={e=>set("subjectsIntegrated", e.target.value.split(",").map(s=>s.trim()).filter(Boolean))} className="w-full rounded border px-3 py-2 text-sm min-h-[40px]"/>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold">Days (up to 5)</h3>
        {value.days.map((d, i)=>(
          <div key={i} className="border rounded p-3">
            <div className="grid md:grid-cols-6 gap-3">
              <div><div className="text-sm font-medium text-gray-800 mb-1">Date</div><input type="date" value={d.date||""} onChange={e=>setDay(i,{date:e.target.value})} className="w-full rounded border px-3 py-2 text-sm"/></div>
              <div className="md:col-span-2"><div className="text-sm font-medium text-gray-800 mb-1">Topic</div><input value={d.topic} onChange={e=>setDay(i,{topic:e.target.value})} className="w-full rounded border px-3 py-2 text-sm"/></div>
              <div className="md:col-span-3"><div className="text-sm font-medium text-gray-800 mb-1">Key Activities</div><textarea value={d.keyActivities} onChange={e=>setDay(i,{keyActivities:e.target.value})} className="w-full rounded border px-3 py-2 text-sm min-h-[96px]"/></div>
            </div>
            <div className="grid md:grid-cols-3 gap-3 mt-3">
              <div><div className="text-sm font-medium text-gray-800 mb-1">Assessment / Exit</div><textarea value={d.assessmentExit} onChange={e=>setDay(i,{assessmentExit:e.target.value})} className="w-full rounded border px-3 py-2 text-sm min-h-[64px]"/></div>
              <div><div className="text-sm font-medium text-gray-800 mb-1">Materials</div><textarea value={d.materials} onChange={e=>setDay(i,{materials:e.target.value})} className="w-full rounded border px-3 py-2 text-sm min-h-[64px]"/></div>
              <div><div className="text-sm font-medium text-gray-800 mb-1">Notes</div><textarea value={d.notes} onChange={e=>setDay(i,{notes:e.target.value})} className="w-full rounded border px-3 py-2 text-sm min-h-[64px]"/></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------- HTML builder fallback -------------------- */
function weeklyToHTMLLocal(w: WeeklyForm): string {
  const rows = w.days.map((d,i)=>`
    <tr>
      <td>Day ${i+1}</td>
      <td>${escapeHtml(d.date||"")}</td>
      <td>${escapeHtml(d.topic||"")}</td>
      <td>${nl2br(d.keyActivities||"")}</td>
      <td>${nl2br(d.assessmentExit||"")}</td>
      <td>${nl2br(d.materials||"")}</td>
      <td>${nl2br(d.notes||"")}</td>
      <td>${(d.files||[]).map(f=>escapeHtml(f.name)).join(", ")}</td>
    </tr>`).join("");
  return `<h1>Weekly Plan</h1>
    <table>
      <thead><tr><th>Day</th><th>Date</th><th>Topic</th><th>Key Activities</th><th>Assessment/Exit</th><th>Materials</th><th>Notes</th><th>Attachments</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

/* -------------------- App -------------------- */
type GenState = { status: "idle" | "working" | "done" | "error"; html?: string; error?: string };

export default function App(){
  const [tab,setTab]=useState<PlanType>("weekly");
  const [weekly,setWeekly]=useState<WeeklyForm>(initialWeekly);
  const [useAI,setUseAI]=useState(true);
  const [gen,setGen]=useState<GenState>({status:"idle"});

  async function generate(){
    setGen({status:"working"});
    try{
      let html = "";
      if (useAI) {
        const payload:any = { planType: tab, customInstructions: "", form: weekly };
        const res = await fetch("/.netlify/functions/plan", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(payload) });
        if (!res.ok){ throw new Error(await res.text()); }
        const data = await res.json(); html = data.html || "";
      } else {
        html = weeklyToHTMLLocal(weekly);
      }
      setGen({status:"done", html});
    } catch (e:any) {
      setGen({status:"error", error: e?.message || String(e)});
    }
  }

  function downloadWord(){
    const html = gen.html || weeklyToHTMLLocal(weekly);
    const blob = new Blob([`<!DOCTYPE html><html><head><meta charset='utf-8'></head><body>${html}</body></html>`], { type: "application/msword" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href=url; a.download="Weekly_Plan.doc"; a.click(); setTimeout(()=>URL.revokeObjectURL(url), 5000);
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-2">Teacher Fairy ✨</h1>
      <div className="mb-2 text-sm text-gray-600">Weekly plan generator — AI or local fallback</div>

      <div className="flex items-center gap-2 mb-3">
        <input id="ai" type="checkbox" checked={useAI} onChange={e=>setUseAI(e.target.checked)}/>
        <label htmlFor="ai" className="text-sm">Use AI</label>
      </div>

      <div className="border rounded p-4 bg-white">
        <WeeklyTab value={weekly} onChange={setWeekly}/>
      </div>

      <div className="mt-3 flex gap-2">
        <button onClick={generate} className="rounded bg-indigo-600 text-white text-sm px-4 py-2 disabled:opacity-60" disabled={gen.status==="working"}>
          {gen.status==="working" ? "Generating…" : "Generate"}
        </button>
        <button onClick={downloadWord} className="rounded bg-emerald-600 text-white text-sm px-4 py-2">Download (.doc)</button>
      </div>

      <div className="mt-4 border rounded overflow-hidden">
        <div className="px-3 py-2 bg-gray-50 border-b text-sm">Preview</div>
        <div className="p-3 overflow-auto">
          {gen.status==="error" && <div className="text-red-600 text-sm mb-2">Error: {gen.error}</div>}
          <div dangerouslySetInnerHTML={{ __html: gen.html || "<em>Click Generate</em>" }} />
        </div>
      </div>
    </div>
  );
}
