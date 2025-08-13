import React, { useEffect, useMemo, useRef, useState } from "react";

type PlanType = "daily" | "weekly" | "unit";

type Uploaded = {
  file: File;
  text?: string;    // best-effort extracted text (txt/md/json/csv only in-browser)
  name: string;
  type: string;
  size: number;
};

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

async function readFileBestEffort(file: File): Promise<string | undefined> {
  const name = file.name.toLowerCase();
  const isPlainish =
    name.endsWith(".txt") ||
    name.endsWith(".md") ||
    name.endsWith(".csv") ||
    name.endsWith(".json") ||
    name.endsWith(".html");
  if (!isPlainish) return undefined;
  try {
    return await file.text();
  } catch {
    return undefined;
  }
}

function toDropdown<T extends string>(items: T[]) {
  return items.map(v => ({ label: v[0].toUpperCase() + v.slice(1), value: v }));
}

function downloadHTMLAsDoc(filename: string, html: string) {
  const blob = new Blob(
    [
      `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        body{font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,Helvetica,Arial,Apple Color Emoji,Segoe UI Emoji;line-height:1.4}
        table{border-collapse:collapse;width:100%;margin:8px 0}
        th,td{border:1px solid #e5e7eb;padding:6px;vertical-align:top}
        h1,h2,h3{margin:8px 0}
        .small{font-size:.9rem;color:#374151}
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
  try {
    await navigator.clipboard.writeText(html);
    alert("HTML copied! Paste into Google Docs (Insert → Drawing → New → then paste, or simply paste into the doc).");
  } catch (e) {
    alert("Could not copy to clipboard. Select and copy from the Preview instead.");
  }
}

function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-800 mb-1">{children}</label>;
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={classNames(
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm",
    "focus:outline-none focus:ring-2 focus:ring-indigo-500",
    props.className || ""
  )}/>;
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={classNames(
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm min-h-[96px]",
    "focus:outline-none focus:ring-2 focus:ring-indigo-500",
    props.className || ""
  )}/>;
}

function Select({ value, onChange, options, placeholder } : {
  value?: string;
  onChange?: (v: string) => void;
  options: {label: string; value: string}[];
  placeholder?: string;
}) {
  return (
    <select
      value={value || ""}
      onChange={e => onChange?.(e.target.value)}
      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
    >
      <option value="">{placeholder || "Choose..."}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked?: boolean; onChange?: (v:boolean)=>void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={!!checked} onChange={e=>onChange?.(e.target.checked)} className="h-4 w-4"/>
      <span>{label}</span>
    </label>
  );
}

function MultiTagInput({ value, onChange, placeholder }: {
  value: string[];
  onChange: (xs: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  function add() {
    const v = draft.trim();
    if (!v) return;
    if (!value.includes(v)) onChange([...value, v]);
    setDraft("");
  }
  return (
    <div>
      <div className="flex gap-2">
        <Input value={draft} onChange={e=>setDraft(e.target.value)} placeholder={placeholder||"Type and enter"} onKeyDown={(e)=>{ if(e.key==="Enter"){ e.preventDefault(); add(); }}} />
        <button onClick={add} className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-3 py-2">Add</button>
      </div>
      {value.length>0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {value.map(tag => (
            <span key={tag} className="inline-flex items-center gap-2 bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs">
              {tag}
              <button onClick={()=>onChange(value.filter(x=>x!==tag))} className="text-gray-500 hover:text-gray-700">×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function FilesPicker({ label, files, setFiles, multiple=true }: {
  label: string;
  files: Uploaded[];
  setFiles: (xs: Uploaded[]) => void;
  multiple?: boolean;
}) {
  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || []);
    const enriched: Uploaded[] = [];
    for (const file of selected) {
      const text = await readFileBestEffort(file);
      enriched.push({ file, text, name: file.name, type: file.type, size: file.size });
    }
    setFiles(multiple ? [...files, ...enriched] : enriched);
    e.target.value = "";
  }
  function removeAt(i:number){ setFiles(files.filter((_,idx)=>idx!==i)); }
  return (
    <div>
      <Label>{label}</Label>
      <input
        type="file"
        multiple={multiple}
        onChange={onPick}
        accept=".txt,.md,.csv,.json,.html,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.heic"
        className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
      />
      {files.length>0 && (
        <ul className="mt-2 space-y-1 text-sm">
          {files.map((f, i) => (
            <li key={i} className="flex items-center justify-between border rounded-lg px-2 py-1">
              <span className="truncate">{f.name} <span className="text-gray-400">({Math.ceil(f.size/1024)} KB)</span></span>
              <button onClick={()=>removeAt(i)} className="text-gray-500 hover:text-red-600">Remove</button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-gray-500 mt-1">Accepts Google Docs/Slides exports, Microsoft Word/PowerPoint, PDF, Excel, images, and plain text. We can read .txt/.md/.csv/.json/.html directly in-browser.</p>
    </div>
  );
}

// ---------- Daily ----------

type DailyForm = {
  date?: string;
  topic: string;
  criteriaForSuccess: string;
  whatToKnowAndDo: string;
  standards: string[];
  whyRelevant: string;
  objectiveStyle?: string;
  frameworkTaxonomy?: string; // optional
  gradeLevel?: string;
  activityDescription: string;
  checksForUnderstanding: string;
  accommodations: string;
  differentiationStrategies: string;
  materialsAndResources: string;
  exemplarAnswerKey: string;
  interventions: {
    tier1: boolean; tier2: boolean; tier3: boolean;
  };
  coTeachingSupport: string[];
  customInstructions: string; // pre-AI custom prompt space
  files: Uploaded[];
  aiEnabled: boolean;
};

function DailyTab({ value, onChange }:{ value: DailyForm; onChange: (v:DailyForm)=>void }) {
  const grades = toDropdown(["k","1","2","3","4","5","6","7","8","9","10","11","12"]);
  const coTeachOptions = ["Pre-brief", "Station Teaching", "Parallel Teaching", "Alternative Teaching", "Team Teaching", "Post-brief"];
  function set<K extends keyof DailyForm>(key: K, val: DailyForm[K]){ onChange({ ...value, [key]: val }); }
  function toggleCoTeach(s: string){
    const has = value.coTeachingSupport.includes(s);
    set("coTeachingSupport", has ? value.coTeachingSupport.filter(x=>x!==s) : [...value.coTeachingSupport, s]);
  }
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Date</Label>
          <Input type="date" value={value.date || ""} onChange={e=>set("date", e.target.value)}/>
        </div>
        <div className="md:col-span-2">
          <Label>Topic</Label>
          <Input value={value.topic} onChange={e=>set("topic", e.target.value)} placeholder="e.g., The Silk Road – Trade and Cultural Diffusion"/>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Criteria for Success</Label>
          <Textarea value={value.criteriaForSuccess} onChange={e=>set("criteriaForSuccess", e.target.value)} placeholder="What does success look like for students?"/>
        </div>
        <div>
          <Label>What Students Need to Know & Do</Label>
          <Textarea value={value.whatToKnowAndDo} onChange={e=>set("whatToKnowAndDo", e.target.value)} placeholder="Key knowledge and skills to master"/>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Standards (Colorado / All Subjects)</Label>
          <MultiTagInput value={value.standards} onChange={xs=>set("standards", xs)} placeholder="Add standard code (e.g., SS.H1.1) and press Enter"/>
          <p className="text-xs text-gray-500 mt-1">Use any framework; codes are just tags here.</p>
        </div>
        <div>
          <Label>Why is the lesson relevant?</Label>
          <Textarea value={value.whyRelevant} onChange={e=>set("whyRelevant", e.target.value)} placeholder="Real-world relevance, transfer, why it matters"/>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Objective Style</Label>
          <Input value={value.objectiveStyle || ""} onChange={e=>set("objectiveStyle", e.target.value)} placeholder="e.g., SWBAT / I can…"/>
        </div>
        <div>
          <Label>Framework/Taxonomy (optional)</Label>
          <Input value={value.frameworkTaxonomy || ""} onChange={e=>set("frameworkTaxonomy", e.target.value)} placeholder="e.g., Bloom's, Webb DOK"/>
        </div>
        <div>
          <Label>Grade Level</Label>
          <Select value={value.gradeLevel} onChange={v=>set("gradeLevel", v)} options={grades} placeholder="Select grade"/>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Activity / Procedure</Label>
          <Textarea value={value.activityDescription} onChange={e=>set("activityDescription", e.target.value)} placeholder="Warm-up → Mini-lesson → Guided practice → Independent → Exit ticket"/>
        </div>
        <div>
          <Label>Checks for Understanding / Assessment-Exit</Label>
          <Textarea value={value.checksForUnderstanding} onChange={e=>set("checksForUnderstanding", e.target.value)} placeholder="Exit ticket, CFU questions, quick quizzes"/>
          <Textarea className="mt-2" value={value.differentiationStrategies} onChange={e=>set("differentiationStrategies", e.target.value)} placeholder="Differentiation strategies (tiered tasks, choice, flexible grouping)"/>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Accommodations</Label>
          <Textarea value={value.accommodations} onChange={e=>set("accommodations", e.target.value)} placeholder="Accommodations, supports, scaffolds"/>
        </div>
        <div>
          <Label>Materials & Resources</Label>
          <Textarea value={value.materialsAndResources} onChange={e=>set("materialsAndResources", e.target.value)} placeholder="Texts, slides, manipulatives, links, handouts"/>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Interventions (RTI/MTSS)</Label>
          <div className="flex gap-4 flex-wrap">
            <Checkbox label="Tier 1 – Core" checked={value.interventions.tier1} onChange={v=>set("interventions", { ...value.interventions, tier1: v })}/>
            <Checkbox label="Tier 2 – Strategic" checked={value.interventions.tier2} onChange={v=>set("interventions", { ...value.interventions, tier2: v })}/>
            <Checkbox label="Tier 3 – Intensive" checked={value.interventions.tier3} onChange={v=>set("interventions", { ...value.interventions, tier3: v })}/>
          </div>
        </div>
        <div>
          <Label>Exemplar / Answer Key (optional)</Label>
          <Textarea value={value.exemplarAnswerKey} onChange={e=>set("exemplarAnswerKey", e.target.value)} placeholder="Notes for exemplar work or answer key"/>
        </div>
      </div>

      <FilesPicker label="Attach Files (docs, slides, pdf, images)" files={value.files} setFiles={(xs)=>set("files", xs)} />

      <div>
        <Label>Custom instructions to AI (optional)</Label>
        <Textarea value={value.customInstructions} onChange={e=>set("customInstructions", e.target.value)} placeholder="Give tone/length, or paste rubric. If left blank, default prompt is used."/>
        <div className="mt-2 flex items-center gap-2">
          <input id="aiDaily" type="checkbox" checked={value.aiEnabled} onChange={e=>set("aiEnabled", e.target.checked)} />
          <label htmlFor="aiDaily" className="text-sm">Use AI to help generate this plan</label>
        </div>
      </div>
    </div>
  );
}

function dailyToHTML(d: DailyForm): string {
  const filesList = d.files.map(f=>`<li>${escapeHtml(f.name)}</li>`).join("");
  const coTeach = d.coTeachingSupport.join(", ") || "[select if applicable]";
  const tiers = [d.interventions.tier1?"Tier 1":null, d.interventions.tier2?"Tier 2":null, d.interventions.tier3?"Tier 3":null].filter(Boolean).join(", ") || "[not specified]";
  const standards = d.standards.length ? d.standards.join("; ") : "[mapped]";

  return [
    `<h1>Daily Lesson Plan</h1>`,
    `<p class="small"><b>Date:</b> ${escapeHtml(d.date || "[choose date]")} — <b>Grade:</b> ${escapeHtml(d.gradeLevel || "[grade]")}</p>`,
    table([
      ["Topic", escapeHtml(d.topic || "")],
      ["Criteria for Success", nl2br(d.criteriaForSuccess)],
      ["Know & Do", nl2br(d.whatToKnowAndDo)],
      ["Standards", escapeHtml(standards)],
      ["Why this lesson (Relevance/Transfer)", nl2br(d.whyRelevant)],
      ["Objective Style", escapeHtml(d.objectiveStyle || "")],
      ["Framework/Taxonomy", escapeHtml(d.frameworkTaxonomy || "")],
    ]),
    `<h3>Lesson Components</h3>`,
    table([
      ["Activity / Procedure", nl2br(d.activityDescription)],
      ["Checks for Understanding / Assessment-Exit", nl2br(d.checksForUnderstanding)],
      ["Differentiation", nl2br(d.differentiationStrategies)],
      ["Accommodations", nl2br(d.accommodations)],
      ["Materials & Resources", nl2br(d.materialsAndResources)],
      ["Interventions (RTI/MTSS)", escapeHtml(tiers)],
      ["Co-Teaching Support", escapeHtml(coTeach)],
      ["Exemplar / Answer Key", nl2br(d.exemplarAnswerKey)],
      ["Attachments", filesList ? `<ul>${filesList}</ul>` : "None"],
    ]),
  ].join("");
}

// ---------- Weekly ----------

type WeeklyDay = {
  date?: string;
  topic: string;
  keyActivities: string;
  assessmentExit: string;
  materials: string;
  notes: string;
  files: Uploaded[];
};

type WeeklyForm = {
  gradeLevel?: string;
  subjectsIntegrated: string[];
  warmUp: string;
  reflection: string;
  differentiation: string;
  standards: string[];
  whyRelevant: string;
  pacingAgendas: string; // free text
  other: string;
  days: WeeklyDay[]; // up to 5
  customInstructions: string;
  aiEnabled: boolean;
};

function WeeklyTab({ value, onChange }: { value: WeeklyForm; onChange: (v:WeeklyForm)=>void }) {
  const grades = toDropdown(["k","1","2","3","4","5","6","7","8","9","10","11","12"]);
  function set<K extends keyof WeeklyForm>(key: K, val: WeeklyForm[K]){ onChange({ ...value, [key]: val }); }
  function updateDay(i:number, patch: Partial<WeeklyDay>){
    const arr = value.days.slice();
    arr[i] = { ...arr[i], ...patch };
    set("days", arr);
  }
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Grade Level</Label>
          <Select value={value.gradeLevel} onChange={v=>set("gradeLevel", v)} options={grades} placeholder="Select grade"/>
        </div>
        <div className="md:col-span-2">
          <Label>Subjects Integrated (multi-select)</Label>
          <MultiTagInput value={value.subjectsIntegrated} onChange={xs=>set("subjectsIntegrated", xs)} placeholder="e.g., ELA, Math, Science, Art"/>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Warm-up (applies to week)</Label>
          <Textarea value={value.warmUp} onChange={e=>set("warmUp", e.target.value)} placeholder="Bell-ringer routine"/>
        </div>
        <div>
          <Label>Reflection (applies to week)</Label>
          <Textarea value={value.reflection} onChange={e=>set("reflection", e.target.value)} placeholder="How will students reflect on learning?"/>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Differentiation (applies to week)</Label>
          <Textarea value={value.differentiation} onChange={e=>set("differentiation", e.target.value)} placeholder="Strategies across the week"/>
        </div>
        <div>
          <Label>Standards (Colorado / All Subjects)</Label>
          <MultiTagInput value={value.standards} onChange={xs=>set("standards", xs)} placeholder="Add code and press Enter"/>
          <Textarea className="mt-2" value={value.whyRelevant} onChange={e=>set("whyRelevant", e.target.value)} placeholder="Why this week matters / relevance"/>
        </div>
      </div>

      <div>
        <Label>Pacing / Agendas (free text)</Label>
        <Textarea value={value.pacingAgendas} onChange={e=>set("pacingAgendas", e.target.value)} placeholder="Any extra pacing/agenda details for the week"/>
      </div>

      <div>
        <Label>Other</Label>
        <Textarea value={value.other} onChange={e=>set("other", e.target.value)} placeholder="Anything else to include in the weekly charts"/>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Days (up to 5)</h3>
        {value.days.map((day, i) => (
          <div key={i} className="border rounded-xl p-3">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <div>
                <Label>Date</Label>
                <Input type="date" value={day.date || ""} onChange={e=>updateDay(i, { date: e.target.value })}/>
              </div>
              <div className="md:col-span-2">
                <Label>Topic</Label>
                <Input value={day.topic} onChange={e=>updateDay(i, { topic: e.target.value })} placeholder={`Day ${i+1} topic`}/>
              </div>
              <div className="md:col-span-3">
                <Label>Key Activities</Label>
                <Textarea value={day.keyActivities} onChange={e=>updateDay(i, { keyActivities: e.target.value })}/>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
              <div>
                <Label>Assessment / Exit</Label>
                <Textarea value={day.assessmentExit} onChange={e=>updateDay(i, { assessmentExit: e.target.value })}/>
              </div>
              <div>
                <Label>Materials</Label>
                <Textarea value={day.materials} onChange={e=>updateDay(i, { materials: e.target.value })}/>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={day.notes} onChange={e=>updateDay(i, { notes: e.target.value })}/>
              </div>
            </div>
            <div className="mt-3">
              <FilesPicker label="Attach Files for this day" files={day.files} setFiles={(xs)=>updateDay(i, { files: xs })}/>
            </div>
          </div>
        ))}
      </div>

      <div>
        <Label>Custom instructions to AI (optional)</Label>
        <Textarea value={value.customInstructions} onChange={e=>set("customInstructions", e.target.value)} placeholder="Tone, length, reading level…"/>
        <div className="mt-2 flex items-center gap-2">
          <input id="aiWeekly" type="checkbox" checked={value.aiEnabled} onChange={e=>set("aiEnabled", e.target.checked)} />
          <label htmlFor="aiWeekly" className="text-sm">Use AI to help generate weekly charts</label>
        </div>
      </div>
    </div>
  );
}

function weeklyToHTML(w: WeeklyForm): string {
  const stds = w.standards.length ? w.standards.join("; ") : "[mapped]";
  const header = [
    `<h1>Weekly Plan</h1>`,
    table([
      ["Grade", escapeHtml(w.gradeLevel || "[grade]")],
      ["Subjects Integrated", escapeHtml(w.subjectsIntegrated.join(", ") || "[select]")],
      ["Standards", escapeHtml(stds)],
      ["Why this week / relevance", nl2br(w.whyRelevant)],
      ["Differentiation (applies to week)", nl2br(w.differentiation)],
      ["Warm-up", nl2br(w.warmUp)],
      ["Reflection", nl2br(w.reflection)],
      ["Pacing / Agendas", nl2br(w.pacingAgendas)],
      ["Other", nl2br(w.other)],
    ])
  ].join("");

  const dayCharts = w.days.map((d, idx) => {
    const filesList = d.files.map(f=>`<li>${escapeHtml(f.name)}</li>`).join("");
    const rows: Array<[string, string]> = [
      ["Day", `Day ${idx+1}`],
      ["Date", escapeHtml(d.date || "[date]")],
      ["Topic", escapeHtml(d.topic || "")],
      ["Key Activities", nl2br(d.keyActivities || "")],
      ["Assessment / Exit", nl2br(d.assessmentExit || "")],
      ["Materials", nl2br(d.materials || "")],
      ["Notes", nl2br(d.notes || "")],
      ["Attachments", filesList ? `<ul>${filesList}</ul>` : "None"],
    ];
    return table(rows, true, `Day ${idx+1} — ${escapeHtml(d.topic || "[topic]")}`);
  }).join("");

  return header + dayCharts;
}

// ---------- Unit ----------

type UnitForm = {
  unitTitle: string;
  lengthOfTime: string;
  gradeLevel?: string;
  standards: string[];         // DOK / all subjects / NGSS etc (free tags)
  highLevelResources: string;
  unitTopics: string[];
  files: Uploaded[];

  essentialQuestions: string;
  overviewDescription: string;
  outcomes: string;
  assignmentsAndAssessments: string;
  vocabularyAcademic: string;
  vocabularyContent: string;

  ellSupports: string[];
  ellOther: string;

  // Learning Cycle (structured)
  connectPrior: string;
  introduceNew: string;
  practiceDeepen: string;
  application: string;
  extension: string;

  learningProgression: string;      // additional free text if desired
  commonMisconceptions: string;

  pacingWeeks: Array<{
    title: string; // Topic (name of lesson)
    objective: string;
    commonErrors: string;
    notes: string;
  }>;

  exemplarAnswerKey: string;

  customInstructions: string;
  aiEnabled: boolean;
};

function UnitTab({ value, onChange }: { value: UnitForm; onChange: (v:UnitForm)=>void }) {
  const grades = toDropdown(["k","1","2","3","4","5","6","7","8","9","10","11","12"]);
  function set<K extends keyof UnitForm>(key: K, val: UnitForm[K]){ onChange({ ...value, [key]: val }); }
  function updateWeek(i:number, patch: Partial<UnitForm["pacingWeeks"][number]>) {
    const arr = value.pacingWeeks.slice();
    arr[i] = { ...arr[i], ...patch };
    set("pacingWeeks", arr);
  }

  const ellOptions = ["Sentence Frames", "Cognate Recognition", "Graphic Organizer", "Visuals/Sketch-notes", "Language Objectives"];
  function toggleELL(s: string){
    const has = value.ellSupports.includes(s);
    set("ellSupports", has ? value.ellSupports.filter(x=>x!==s) : [...value.ellSupports, s]);
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <Label>Unit Title</Label>
          <Input value={value.unitTitle} onChange={e=>set("unitTitle", e.target.value)} placeholder="e.g., Ancient Civilizations: Trade & Technology"/>
        </div>
        <div>
          <Label>Length of Time</Label>
          <Input value={value.lengthOfTime} onChange={e=>set("lengthOfTime", e.target.value)} placeholder="e.g., 4–6 weeks"/>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Grade Level</Label>
          <Select value={value.gradeLevel} onChange={v=>set("gradeLevel", v)} options={grades} placeholder="Select grade"/>
        </div>
        <div className="md:col-span-2">
          <Label>Standards (tags)</Label>
          <MultiTagInput value={value.standards} onChange={xs=>set("standards", xs)} placeholder="Add standard code and press Enter"/>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>High-level Resources</Label>
          <Textarea value={value.highLevelResources} onChange={e=>set("highLevelResources", e.target.value)} placeholder="Major texts, anchor resources, core materials"/>
        </div>
        <div>
          <Label>Unit Topics</Label>
          <MultiTagInput value={value.unitTopics} onChange={xs=>set("unitTopics", xs)} placeholder="Add a topic and press Enter"/>
        </div>
      </div>

      <FilesPicker label="Attach Files for Unit (docs, slides, pdf, images)" files={value.files} setFiles={(xs)=>set("files", xs)} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Essential Questions</Label>
          <Textarea value={value.essentialQuestions} onChange={e=>set("essentialQuestions", e.target.value)}/>
        </div>
        <div>
          <Label>Unit Overview / Description</Label>
          <Textarea value={value.overviewDescription} onChange={e=>set("overviewDescription", e.target.value)}/>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Outcomes (Know & Do; cross-subject integration)</Label>
          <Textarea value={value.outcomes} onChange={e=>set("outcomes", e.target.value)}/>
        </div>
        <div>
          <Label>Assignments & Assessments</Label>
          <Textarea value={value.assignmentsAndAssessments} onChange={e=>set("assignmentsAndAssessments", e.target.value)} placeholder="Will incorporate attached files if provided"/>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Vocabulary (Academic / Tier 2)</Label>
          <Textarea value={value.vocabularyAcademic} onChange={e=>set("vocabularyAcademic", e.target.value)}/>
        </div>
        <div>
          <Label>Vocabulary (Content / Tier 3 + Language)</Label>
          <Textarea value={value.vocabularyContent} onChange={e=>set("vocabularyContent", e.target.value)}/>
        </div>
      </div>

      <div>
        <Label>ELL Supports</Label>
        <div className="flex gap-3 flex-wrap">
          {ellOptions.map(opt => (
            <Checkbox key={opt} label={opt} checked={value.ellSupports.includes(opt)} onChange={()=>toggleELL(opt)} />
          ))}
        </div>
        <Textarea className="mt-2" value={value.ellOther} onChange={e=>set("ellOther", e.target.value)} placeholder="Other supports (optional)"/>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Learning Cycle — Connect Prior Learning</Label>
          <Textarea value={value.connectPrior} onChange={e=>set("connectPrior", e.target.value)} placeholder="Activate prior knowledge; connect to previous learning"/>
        </div>
        <div>
          <Label>Learning Cycle — Introduce New Content/Concept</Label>
          <Textarea value={value.introduceNew} onChange={e=>set("introduceNew", e.target.value)} placeholder="Direct instruction / inquiry launch"/>
        </div>
        <div>
          <Label>Learning Cycle — Practice & Deepen</Label>
          <Textarea value={value.practiceDeepen} onChange={e=>set("practiceDeepen", e.target.value)} placeholder="Guided/independent practice; checks for understanding"/>
        </div>
        <div>
          <Label>Learning Cycle — Application</Label>
          <Textarea value={value.application} onChange={e=>set("application", e.target.value)} placeholder="Performance task / real-world transfer"/>
        </div>
        <div className="md:col-span-2">
          <Label>Learning Cycle — Extension</Label>
          <Textarea value={value.extension} onChange={e=>set("extension", e.target.value)} placeholder="Enrichment / cross-curricular"/>
        </div>
      </div>

      <div>
        <Label>Learning Progression & Strategies (sequence)</Label>
        <Textarea value={value.learningProgression} onChange={e=>set("learningProgression", e.target.value)} placeholder="Sequence of activities; instructional strategies"/>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Common Misconceptions</Label>
          <Textarea value={value.commonMisconceptions} onChange={e=>set("commonMisconceptions", e.target.value)}/>
        </div>
        <div>
          <Label>Exemplar / Answer Key (optional)</Label>
          <Textarea value={value.exemplarAnswerKey} onChange={e=>set("exemplarAnswerKey", e.target.value)}/>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Pacing Guide — Week Squares</h3>
        {value.pacingWeeks.map((w, i) => (
          <div key={i} className="border rounded-xl p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Week {i+1} Title / Topic</Label>
              <Input value={w.title} onChange={e=>updateWeek(i, { title: e.target.value })}/>
            </div>
            <div>
              <Label>Objective</Label>
              <Input value={w.objective} onChange={e=>updateWeek(i, { objective: e.target.value })}/>
            </div>
            <div className="md:col-span-2">
              <Label>Common Errors</Label>
              <Textarea value={w.commonErrors} onChange={e=>updateWeek(i, { commonErrors: e.target.value })}/>
            </div>
            <div className="md:col-span-2">
              <Label>Other / Notes</Label>
              <Textarea value={w.notes} onChange={e=>updateWeek(i, { notes: e.target.value })}/>
            </div>
          </div>
        ))}
      </div>

      <div>
        <Label>Custom instructions to AI (optional)</Label>
        <Textarea value={value.customInstructions} onChange={e=>set("customInstructions", e.target.value)} placeholder="E.g., cite sources, use bullet lists, align to DOK 2–3"/>
        <div className="mt-2 flex items-center gap-2">
          <input id="aiUnit" type="checkbox" checked={value.aiEnabled} onChange={e=>set("aiEnabled", e.target.checked)} />
          <label htmlFor="aiUnit" className="text-sm">Use AI to help generate the unit pack</label>
        </div>
      </div>
    </div>
  );
}

function unitToHTML(u: UnitForm): string {
  const stds = u.standards.length ? u.standards.join("; ") : "[mapped]";
  const topics = u.unitTopics.map(t=>`<li>${escapeHtml(t)}</li>`).join("");
  const filesList = u.files.map(f=>`<li>${escapeHtml(f.name)}</li>`).join("");

  const weeks = u.pacingWeeks.map((w, i) => {
    return table([
      ["Topic", escapeHtml(w.title || "")],
      ["Objective", escapeHtml(w.objective || "")],
      ["Common Errors", nl2br(w.commonErrors || "")],
      ["Other / Notes", nl2br(w.notes || "")],
    ], true, `Week ${i+1}`);
  }).join("");

  const ell = u.ellSupports.join(", ") + (u.ellOther ? `; ${escapeHtml(u.ellOther)}` : "") || "[select]";

  return [
    `<h1>Unit Plan</h1>`,
    table([
      ["Unit Title", escapeHtml(u.unitTitle || "")],
      ["Length of Time", escapeHtml(u.lengthOfTime || "")],
      ["Grade", escapeHtml(u.gradeLevel || "[grade]")],
      ["Standards", escapeHtml(stds)],
      ["High-level Resources", nl2br(u.highLevelResources)],
      ["Topics", topics ? `<ul>${topics}</ul>` : "—"],
      ["Attachments", filesList ? `<ul>${filesList}</ul>` : "None"],
    ]),
    `<h3>Core Components</h3>`,
    table([
      ["Essential Questions", nl2br(u.essentialQuestions)],
      ["Overview / Description", nl2br(u.overviewDescription)],
      ["Outcomes (Know & Do; Cross-subject)", nl2br(u.outcomes)],
      ["Assignments & Assessments", nl2br(u.assignmentsAndAssessments)],
      ["Vocabulary — Academic (Tier 2)", nl2br(u.vocabularyAcademic)],
      ["Vocabulary — Content (Tier 3 + Language)", nl2br(u.vocabularyContent)],
      ["ELL Supports", escapeHtml(ell)],
    ]),
    `<h3>Learning Cycle</h3>`,
    table([
      ["Connect Prior Learning", nl2br(u.connectPrior)],
      ["Introduce New Content/Concept", nl2br(u.introduceNew)],
      ["Practice & Deepen", nl2br(u.practiceDeepen)],
      ["Application", nl2br(u.application)],
      ["Extension", nl2br(u.extension)],
    ], true),
    `<h3>Learning Progression & Common Misconceptions</h3>`,
    table([
      ["Learning Progression & Strategies", nl2br(u.learningProgression)],
      ["Common Misconceptions", nl2br(u.commonMisconceptions)],
      ["Exemplar / Answer Key", nl2br(u.exemplarAnswerKey)],
    ]),
    `<h3>Pacing Guide</h3>`,
    weeks,
  ].join("");
}

// ---------- App Shell ----------

type GenState = { status: "idle" | "working" | "done" | "error"; html?: string; error?: string };

const initialDaily: DailyForm = {
  date: "",
  topic: "",
  criteriaForSuccess: "",
  whatToKnowAndDo: "",
  standards: [],
  whyRelevant: "",
  objectiveStyle: "",
  frameworkTaxonomy: "",
  gradeLevel: "",
  activityDescription: "",
  checksForUnderstanding: "",
  accommodations: "",
  differentiationStrategies: "",
  materialsAndResources: "",
  exemplarAnswerKey: "",
  interventions: { tier1: false, tier2: false, tier3: false },
  coTeachingSupport: [],
  customInstructions: "",
  files: [],
  aiEnabled: true,
};

const initialWeekly: WeeklyForm = {
  gradeLevel: "",
  subjectsIntegrated: [],
  warmUp: "",
  reflection: "",
  differentiation: "",
  standards: [],
  whyRelevant: "",
  pacingAgendas: "",
  other: "",
  days: [
    { date: "", topic: "", keyActivities: "", assessmentExit: "", materials: "", notes: "", files: [] },
    { date: "", topic: "", keyActivities: "", assessmentExit: "", materials: "", notes: "", files: [] },
    { date: "", topic: "", keyActivities: "", assessmentExit: "", materials: "", notes: "", files: [] },
    { date: "", topic: "", keyActivities: "", assessmentExit: "", materials: "", notes: "", files: [] },
    { date: "", topic: "", keyActivities: "", assessmentExit: "", materials: "", notes: "", files: [] },
  ],
  customInstructions: "",
  aiEnabled: true,
};

const initialUnit: UnitForm = {
  unitTitle: "",
  lengthOfTime: "",
  gradeLevel: "",
  standards: [],
  highLevelResources: "",
  unitTopics: [],
  files: [],
  essentialQuestions: "",
  overviewDescription: "",
  outcomes: "",
  assignmentsAndAssessments: "",
  vocabularyAcademic: "",
  vocabularyContent: "",
  ellSupports: [],
  ellOther: "",
  connectPrior: "",
  introduceNew: "",
  practiceDeepen: "",
  application: "",
  extension: "",
  learningProgression: "",
  commonMisconceptions: "",
  pacingWeeks: Array.from({length: 6}, ()=>({
    title: "", objective: "", commonErrors: "", notes: ""
  })),
  exemplarAnswerKey: "",
  customInstructions: "",
  aiEnabled: true,
};

const tabs = [
  { id: "daily", label: "Daily Plan" },
  { id: "weekly", label: "Weekly Plan" },
  { id: "unit", label: "Unit Plan" },
] as const;

export default function App() {
  const [tab, setTab] = useState<PlanType>("daily");

  const [daily, setDaily] = useState<DailyForm>(initialDaily);
  const [weekly, setWeekly] = useState<WeeklyForm>(initialWeekly);
  const [unit, setUnit] = useState<UnitForm>(initialUnit);

  const [gen, setGen] = useState<GenState>({ status: "idle" });
  const [useAI, setUseAI] = useState<boolean>(true);

  useEffect(()=>{
    if (tab === "daily") setUseAI(daily.aiEnabled);
    if (tab === "weekly") setUseAI(weekly.aiEnabled);
    if (tab === "unit") setUseAI(unit.aiEnabled);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  function setAIForTab(v:boolean){
    if (tab === "daily") setDaily({ ...daily, aiEnabled: v });
    if (tab === "weekly") setWeekly({ ...weekly, aiEnabled: v });
    if (tab === "unit") setUnit({ ...unit, aiEnabled: v });
    setUseAI(v);
  }

  async function generate() {
    setGen({ status: "working" });
    try {
      let html: string;
      const payload: any = { planType: tab, customInstructions: "" };

      if (tab === "daily") {
        html = dailyToHTML(daily);
        payload.form = daily;
        payload.filesText = extractFilesText(daily.files);
        payload.customInstructions = daily.customInstructions;
      } else if (tab === "weekly") {
        html = weeklyToHTML(weekly);
        payload.form = weekly;
        payload.filesText = weekly.days.flatMap(d => d.files).map(f => ({ name: f.name, text: f.text || "" }));
        payload.customInstructions = weekly.customInstructions;
      } else {
        html = unitToHTML(unit);
        payload.form = unit;
        payload.filesText = extractFilesText(unit.files);
        payload.customInstructions = unit.customInstructions;
      }

      if (useAI) {
        const res = await fetch("/.netlify/functions/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `Request failed (${res.status})`);
        }
        const data = await res.json();
        const aiHtml = (data && data.html) ? String(data.html) : "";
        setGen({ status: "done", html: aiHtml || html });
      } else {
        setGen({ status: "done", html });
      }
    } catch (err:any) {
      setGen({ status: "error", error: err?.message || String(err) });
    }
  }

  function reset() {
    if (tab==="daily") setDaily(initialDaily);
    if (tab==="weekly") setWeekly(initialWeekly);
    if (tab==="unit") setUnit(initialUnit);
    setGen({ status: "idle" });
  }

  function downloadWord() {
    const html = gen.html || (tab==="daily"?dailyToHTML(daily):tab==="weekly"?weeklyToHTML(weekly):unitToHTML(unit));
    const filename =
      tab === "daily" ? "Daily_Lesson_Plan.doc" :
      tab === "weekly" ? "Weekly_Plan.doc" : "Unit_Plan.doc";
    downloadHTMLAsDoc(filename, html);
  }

  async function copyForGoogleDocs() {
    const html = gen.html || (tab==="daily"?dailyToHTML(daily):tab==="weekly"?weeklyToHTML(weekly):unitToHTML(unit));
    await copyHtmlToClipboard(html);
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Teacher Planner — Daily • Weekly • Unit</h1>
        <p className="text-sm text-gray-600">Matches your sketches: horizontal weekly charts, unit week squares, ELL supports, MTSS tiers, answer keys, and per-day attachments.</p>
      </header>

      <div className="flex gap-2 mb-4">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={()=>setTab(t.id)}
            className={classNames(
              "px-3 py-2 rounded-xl text-sm border",
              tab === t.id ? "bg-indigo-600 text-white border-indigo-700" : "bg-white hover:bg-gray-50"
            )}
          >
            {t.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <input id="useAI" type="checkbox" checked={useAI} onChange={e=>setAIForTab(e.target.checked)} />
          <label htmlFor="useAI" className="text-sm">Use AI</label>
        </div>
      </div>

      <div className="rounded-2xl border p-4 md:p-6 bg-white">
        {tab === "daily" && <DailyTab value={daily} onChange={setDaily} />}
        {tab === "weekly" && <WeeklyTab value={weekly} onChange={setWeekly} />}
        {tab === "unit" && <UnitTab value={unit} onChange={setUnit} />}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={generate} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 disabled:opacity-60" disabled={gen.status==="working"}>
          {gen.status==="working" ? "Generating…" : "Generate"}
        </button>
        <button onClick={downloadWord} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2">
          Download (.doc)
        </button>
        <button onClick={copyForGoogleDocs} className="rounded-xl bg-gray-800 hover:bg-gray-900 text-white text-sm px-4 py-2">
          Copy HTML (Google Docs)
        </button>
        <button onClick={reset} className="rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm px-4 py-2">
          Reset
        </button>
      </div>

      <div className="mt-6 rounded-2xl border bg-white overflow-hidden">
        <div className="px-4 py-2 bg-gray-50 border-b text-sm text-gray-700">Preview</div>
        <div className="p-4 overflow-auto">
          {gen.status === "error" && <div className="text-red-600 text-sm">Error: {gen.error}</div>}
          <div dangerouslySetInnerHTML={{ __html:
            gen.html ||
            (tab==="daily"?dailyToHTML(daily):tab==="weekly"?weeklyToHTML(weekly):unitToHTML(unit))
          }} />
        </div>
      </div>

      <footer className="mt-6 text-xs text-gray-500">
        Built from your Aug 13 sketches: keeps components separated by tab (no mixing), supports screenshots everywhere, and generates even when only topics/titles are provided.
      </footer>
    </div>
  );
}

// ---------- Helpers ----------
function escapeHtml(s: string){ return (s||"").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] as string)); }
function nl2br(s: string){ return escapeHtml(s||"").replace(/\n/g, "<br/>"); }
function table(rows: Array<[string, string]>, horizontal?: boolean, title?: string){
  const thead = horizontal
    ? "<tr><th style='width:220px'>Field</th><th>Details</th></tr>"
    : "<tr><th style='width:220px'>Component</th><th>Details</th></tr>";
  const body = rows.map(r=>`<tr><td><b>${escapeHtml(r[0])}</b></td><td>${r[1]||""}</td></tr>`).join("");
  return `<div style="margin:10px 0">${title?`<h3>${escapeHtml(title)}</h3>`:""}<table>${thead}${body}</table></div>`;
}
function extractFilesText(files: Uploaded[]){
  return files.filter(f=>!!f.text).map(f=>({ name: f.name, text: f.text! }));
}
