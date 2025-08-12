// ---- Globals to keep TypeScript happy ----
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Cloud, CloudDownload, CloudUpload, FileText, RefreshCw, Save, Trash2, Upload, Wand2, Settings2, CheckSquare } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { Textarea } from './components/ui/textarea'
import { Label } from './components/ui/label'
import { Checkbox } from './components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select'
import { Badge } from './components/ui/badge'
import { Separator } from './components/ui/separator'

type Slot = { id:string; date:string; topic:string; files:File[]; images:File[]; notes:string; other:string; }
type IncludeDaily = { date:boolean; topic:boolean; standards:boolean; objective:boolean; warmup:boolean; learningExperience:boolean; reflection:boolean; accommodations:boolean; otherIdeas:boolean; extensions:boolean; crossContent:boolean; misconceptions:boolean; materials:boolean; other:boolean; }
type DailySections = Partial<Record<keyof IncludeDaily, string>>
type UnitSections = { subject?:string; framework?:string; gradeBand?:string; standards?:string; essentialQuestions?:string[]; vocabulary?:string[]; mustKnow?:string[]; mustDo?:string[]; evidence?:string; assessments?:string; strategiesActivities?:string; crossContent?:string; misconceptions?:string; length?:string; progression?:string[]; diverseLearners?:string[]; materials?:string[]; other?:string; }

const defaultIncludeDaily: IncludeDaily = { date:true, topic:true, standards:true, objective:true, warmup:true, learningExperience:true, reflection:true, accommodations:true, otherIdeas:false, extensions:false, crossContent:true, misconceptions:true, materials:true, other:true }
const FRAMEWORKS = ["Savvas: Connect / Investigate / Synthesize / Demonstrate","Bloom's Taxonomy","Fink's Taxonomy of Significant Learning","SOLO Taxonomy","Marzano's New Taxonomy","UbD (Backwards Design)","Gradual Release (I Do / We Do / You Do)","Inquiry Arc (NCSS)"]
const SUBJECTS = ["Social Studies","Spanish","English Language Arts","Mathematics","Science","World Languages","Computer Science / Tech","Health & PE","Arts","CTE"]
const OBJECTIVE_STYLES = ["I can…", "SWBAT…", "Students will…", "By the end, learners will…"]
const MATERIALS = ["Curriculum","DBQ","Primary Sources","Textbook","Novel/Trade Book","Video","Lab/Activity Kit","Slide Deck","Worksheet","Project Brief","Rubric","Anchor Chart"]
const STATES = ["Colorado"]
const GRADE_BANDS = ["K-2","3-5","6-8","9-12"]

const SAMPLE_STANDARDS: Record<string,{code:string;text:string;tags:string[] }[]> = {
  "Colorado|Social Studies|6-8": [
    { code:"CO.SS.MS.1.1", text:"Analyze continuity and change over time in societies and regions.", tags:["continuity","change","historical","timeline"] },
    { code:"CO.SS.MS.2.2", text:"Explain economic choices and trade-offs using real-world scenarios.", tags:["economics","trade","scarcity","choice"] },
    { code:"CO.SS.MS.3.3", text:"Use geographic tools to gather data and make inferences about places.", tags:["geography","map","gis","place"] },
    { code:"CO.SS.MS.4.1", text:"Describe civic responsibilities and processes for participation.", tags:["civics","rights","responsibility","participation"] },
    { code:"CO.SS.MS.1.3", text:"Evaluate causes and effects of significant historical events.", tags:["cause","effect","revolution","war"] },
  ],
  "Colorado|World Languages|9-12": [
    { code:"CO.WL.HS.1", text:"Interpretive communication in target language across authentic texts.", tags:["interpretive","reading","listening","authentic"] },
    { code:"CO.WL.HS.2", text:"Interpersonal communication to exchange information and opinions.", tags:["interpersonal","speaking","conversation"] },
    { code:"CO.WL.HS.3", text:"Presentational communication for audiences on familiar/unfamiliar topics.", tags:["presentational","speaking","writing"] },
    { code:"CO.WL.HS.4", text:"Cultural competence: practices, products, perspectives.", tags:["culture","practices","products","perspectives"] },
  ],
}

function slug(...parts:string[]){ return parts.join('|') }
function toHTMLList(items: string[], title?: string) { if (!items.length) return ""; const head = title ? `<h4>${title}</h4>` : ""; return `${head}<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`; }
function downloadAsDoc(filename: string, htmlBody: string) { const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${htmlBody}</body></html>`; const blob = new Blob([html], { type: "application/msword" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename.endsWith(".doc") ? filename : `${filename}.doc`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }
function stripTags(html: string) { return html.replace(/<[^>]+>/g, ""); }
function keywordsFromText(text:string){ return (text.toLowerCase().match(/[a-z]{4,}/g)||[]).slice(0,50) }
function uniqWords(arr: string[]) { const words = arr.join(" ").toLowerCase().match(/[a-z]{4,}/g) || []; return Array.from(new Set(words)); }

export default function App() {
  const [state, setState] = useState("Colorado")
  const [subject, setSubject] = useState("Social Studies")
  const [gradeBand, setGradeBand] = useState("6-8")
  const [framework, setFramework] = useState(FRAMEWORKS[0])
  const [customTaxonomy, setCustomTaxonomy] = useState("")
  const [objectiveStyle, setObjectiveStyle] = useState(OBJECTIVE_STYLES[0])
  const [materials, setMaterials] = useState<string[]>(["Curriculum","DBQ"])
  const [topicsOnly, setTopicsOnly] = useState(true)

  const [slots, setSlots] = useState<Slot[]>([...Array(5)].map((_,i)=>({id:`slot-${i+1}`, date:"", topic:"", files:[], images:[], notes:"", other:""})))

  // Standards
  const [standardsSuggested, setStandardsSuggested] = useState<string[]>([])
  const [standardsSelected, setStandardsSelected] = useState<string[]>([])
  const [customStandard, setCustomStandard] = useState("")
  const [standardsSearch, setStandardsSearch] = useState("")
  const [standardsDB, setStandardsDB] = useState<Record<string,{ code: string; text: string; tags?: string[] }[]>>(()=>{
    try { return JSON.parse(localStorage.getItem("tf.standardsDB")||"{}") } catch { return {} }
  })
  const [standardsCount, setStandardsCount] = useState<number>(()=>Object.values(standardsDB).reduce((a,b)=>a+(b?.length||0),0))
  const importRef = useRef<HTMLInputElement>(null)

  useEffect(()=>{ localStorage.setItem("tf.standardsDB", JSON.stringify(standardsDB)); setStandardsCount(Object.values(standardsDB).reduce((a,b)=>a+(b?.length||0),0)) }, [standardsDB])

  // Locks
  const [lockDaily, setLockDaily] = useState<Record<keyof IncludeDaily, boolean>>({ date:false, topic:false, standards:false, objective:false, warmup:false, learningExperience:false, reflection:false, accommodations:false, otherIdeas:false, extensions:false, crossContent:false, misconceptions:false, materials:false, other:false })
  const [dailySections, setDailySections] = useState<DailySections>({})
  const [lockUnit, setLockUnit] = useState<Record<string, boolean>>({})
  const [unitSections, setUnitSections] = useState<UnitSections>({})

  const [prefilledObjective, setPrefilledObjective] = useState("")
  const [otherRequests, setOtherRequests] = useState("")

  const [dailyPreview, setDailyPreview] = useState("")
  const [weeklyPreview, setWeeklyPreview] = useState("")
  const [unitPreview, setUnitPreview] = useState("")

  // local persistence
  useEffect(()=>{
    const saved = localStorage.getItem("teacher-fairy-project"); if(saved){ try{ const data = JSON.parse(saved); setState(data.state||"Colorado"); setSubject(data.subject||"Social Studies"); setGradeBand(data.gradeBand||"6-8"); setFramework(data.framework||FRAMEWORKS[0]); setCustomTaxonomy(data.customTaxonomy||""); setObjectiveStyle(data.objectiveStyle||OBJECTIVE_STYLES[0]); setMaterials(data.materials||[]); setTopicsOnly(!!data.topicsOnly); setSlots(data.slots||[]); setStandardsSelected(data.standardsSelected||[]); setPrefilledObjective(data.prefilledObjective||""); setOtherRequests(data.otherRequests||""); }catch{} }
  },[])
  useEffect(()=>{
    const data = { state, subject, gradeBand, framework, customTaxonomy, objectiveStyle, materials, topicsOnly, slots, standardsSelected, prefilledObjective, otherRequests }
    localStorage.setItem("teacher-fairy-project", JSON.stringify(data))
  }, [state, subject, gradeBand, framework, customTaxonomy, objectiveStyle, materials, topicsOnly, slots, standardsSelected, prefilledObjective, otherRequests])

  function setSlotField(id:string, field:keyof Slot, value:any){
    setSlots(prev=>prev.map(s=>s.id===id?{...s,[field]:value}:s))
  }
  function handleFiles(id:string, fileList: FileList|null){
    if(!fileList) return
    const docs: File[] = []; const images: File[] = []
    Array.from(fileList).forEach(f=>{ if(f.type.startsWith("image/")) images.push(f); else docs.push(f) })
    setSlots(prev=>prev.map(s=>s.id===id?{...s, files:[...s.files, ...docs], images:[...s.images, ...images]}:s))
  }
  function removeFile(id:string, idx:number, isImage=false){
    setSlots(prev=>prev.map(s=>{
      if(s.id!==id) return s
      if(isImage){ const images=s.images.slice(); images.splice(idx,1); return {...s, images} }
      const files=s.files.slice(); files.splice(idx,1); return {...s, files}
    }))
  }
  function toggleMaterial(tag:string){ setMaterials(prev=>prev.includes(tag)?prev.filter(t=>t!==tag):[...prev, tag]) }

  function suggestStandards(){
    const key = slug(state, subject==="Spanish"?"World Languages":subject, gradeBand)
    const pool = standardsDB[key] || SAMPLE_STANDARDS[key] || []
    const topicText = slots.map(s=>`${s.topic}\n${s.notes}`).join("\n\n")
    const keys = new Set([...keywordsFromText(topicText), ...keywordsFromText(standardsSearch)])
    const hits:string[] = []
    pool.forEach(st=>{
      if(!standardsSearch.trim() || st.text.toLowerCase().includes(standardsSearch.toLowerCase()) || (st.tags||[]).some(t=>keys.has(t))){
        hits.push(`${st.code} — ${st.text}`)
      }
    })
    setStandardsSuggested(hits.length?hits:pool.slice(0,12).map(s=>`${s.code} — ${s.text}`))
  }
  function addStandard(std:string){ setStandardsSelected(prev=>prev.includes(std)?prev:[...prev,std]) }
  function removeStandard(std:string){ setStandardsSelected(prev=>prev.filter(s=>s!==std)) }
  function addCustomStandard(){ if(!customStandard.trim()) return; addStandard(customStandard.trim()); setCustomStandard("") }
  function handleImport(e: React.ChangeEvent<HTMLInputElement>){
    const file = e.target.files?.[0]; if(!file) return
    const reader = new FileReader(); reader.onload = () => {
      try{
        const data = JSON.parse(String(reader.result)||"{}")
        let db: Record<string,{code:string;text:string;tags?:string[]}[]> = {}
        if(Array.isArray(data)){ data.forEach((row:any)=>{ const key = `${row.state||"Colorado"}|${row.subject}|${row.gradeBand}`; (db[key]||(db[key]=[])).push({code:row.code, text:row.text, tags:row.tags||[]}) }) }
        else db = data
        setStandardsDB(db)
      }catch{ alert("Could not read standards JSON.") }
    }
    reader.readAsText(file)
  }
  function exportStandards(){
    try{ const data = JSON.stringify(standardsDB||{}, null, 2); const blob = new Blob([data], {type:"application/json"}); const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download="colorado_standards.json"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url) }catch{ alert("Nothing to export.") }
  }

  function assembleDailyFrom(slot: Slot){
    const selectedTaxonomy = customTaxonomy.trim()?customTaxonomy:framework
    const parts:string[] = []
    if(defaultIncludeDaily.date) parts.push(`Date: ${slot.date || "TBD"}`)
    if(defaultIncludeDaily.topic) parts.push(`Topic: ${slot.topic || "TBD"}`)
    if(defaultIncludeDaily.standards) parts.push(`Standards: ${standardsSelected.join("; ") || "[auto]"}`)
    if(defaultIncludeDaily.objective) parts.push(`Objective (${objectiveStyle}): ${prefilledObjective || "Students will be able to describe and explain the topic."}`)
    if(defaultIncludeDaily.warmup) parts.push(`Warm-up: Quick write / prior knowledge activation.`)
    if(defaultIncludeDaily.learningExperience) parts.push(`Learning Experience (${selectedTaxonomy}): Mini-lesson → guided practice → collaborative task.`)
    if(defaultIncludeDaily.reflection) parts.push(`Exit Ticket: 2-3 sentence summary or problem.`)
    if(defaultIncludeDaily.accommodations) parts.push(`Accommodations: Sentence frames, visuals, extended time.`)
    if(defaultIncludeDaily.crossContent) parts.push(`Cross-Content Link: Writing / quantitative reasoning.`)
    if(defaultIncludeDaily.misconceptions) parts.push(`Common Misconceptions: Overgeneralization of causes/effects.`)
    if(defaultIncludeDaily.materials) parts.push(`Materials: ${materials.join(", ")}`)
    if(defaultIncludeDaily.other) parts.push(`Other: ${slot.other}`)
    return `<h3>Daily Plan</h3>${parts.map(p=>`<p>${p}</p>`).join("")}`
  }

  function generateDaily(){ const base = slots.find(s=>s.topic||s.date) || slots[0]; setDailyPreview(stripTags(assembleDailyFrom(base))) }
  function generateWeekly(){
    const days = slots.filter(s=>s.topic||s.date)
    const topics = days.map((d,i)=>`${d.date || `Day ${i+1}`}: ${d.topic || "TBD"}`)
    const checks = days.map((_,i)=>`Day ${i+1}: exit ticket or CFU`)
    const html = [`<h3>Weekly Plan</h3>`,`<p><b>Standards:</b> ${standardsSelected.join("; ") || "[mapped]"}</p>`,toHTMLList(topics,"Topics by Day"), toHTMLList(checks,"Checks for Understanding"), `<p><b>Materials:</b> ${materials.join(", ")}</p>`].join("")
    setWeeklyPreview(stripTags(html))
  }
  function generateUnit(){
    const selectedTaxonomy = customTaxonomy.trim()?customTaxonomy:framework
    const allTopics = slots.map(s=>s.topic).filter(Boolean)
    const html = [`<h3>Unit Plan</h3>`,`<p><b>Subject:</b> ${subject} | <b>Framework:</b> ${selectedTaxonomy} | <b>Grade Band:</b> ${gradeBand}</p>`,`<p><b>Standards:</b> ${standardsSelected.join("; ") || "[select or auto]"}</p>`, toHTMLList(["How does evidence support claims?","Why do systems change?","What do responsible citizens do?"],"Essential Questions"), toHTMLList(uniqWords(allTopics).slice(0,12), "Vocabulary"), toHTMLList(["Key concepts and facts for mastery"], "Must Know"), toHTMLList(["Skills: analyze, compare, argue from evidence"], "Must Do"), `<p><b>Evidence of Learning:</b> diagnostic check, weekly CFUs, performance task, rubric</p>`, `<p><b>Assessments:</b> diagnostic / formative / summative</p>`, `<p><b>Strategies & Activities:</b> ${selectedTaxonomy}; stations, inquiry, projects; activities sourced from uploads/topics</p>`, `<p><b>Cross-Content Links:</b> ELA writing, quantitative reasoning, media literacy</p>`, `<p><b>Common Misconceptions:</b> definition drift, timeline confusion, overgeneralization</p>`, `<p><b>Length of Time:</b> ${Math.max(5, allTopics.length)}–${Math.max(7, allTopics.length + 2)} class periods</p>`, toHTMLList(["Connect prior knowledge","Introduce new concept/content","Practice & deepen","Apply","Extend"], "Learning Progression"), toHTMLList(["UDL choices","Graphic organizers","Language scaffolds","Small-group instruction","Flexible deadlines"], "Strategies for Diverse Learners"), `<p><b>Materials/Resources:</b> ${materials.join(", ")}</p>`, otherRequests ? `<p><b>Other:</b> ${otherRequests}</p>` : ""].join("")
    setUnitPreview(stripTags(html))
  }

  function downloadDoc(label:string, content:string){ downloadAsDoc(label, `<pre>${content}</pre>`) }

  const selectedTaxonomy = useMemo(()=> (customTaxonomy.trim()?customTaxonomy:framework), [framework, customTaxonomy])

  // Google Drive scaffolding
  const GOOGLE_DRIVE_CONFIG = {
    API_KEY: "YOUR_GOOGLE_API_KEY_HERE",
    CLIENT_ID: "YOUR_OAUTH_CLIENT_ID.apps.googleusercontent.com",
    SCOPES: ["https://www.googleapis.com/auth/drive.file"],
    DISCOVERY_DOCS: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
    BACKUP_FILENAME: "teacher_fairy_backup_all.json",
  }
  const [gapiReady, setGapiReady] = useState(false)
  const [googleSignedIn, setGoogleSignedIn] = useState(false)
  const [driveStatus, setDriveStatus] = useState<string>("")
  const [driveFolderId, setDriveFolderId] = useState<string>(()=>localStorage.getItem("tf.drive.folderId")||"")
  const [driveFolderName, setDriveFolderName] = useState<string>(()=>localStorage.getItem("tf.drive.folderName")||"")
  const [autoDriveBackup, setAutoDriveBackup] = useState<boolean>(()=>{
    try { return JSON.parse(localStorage.getItem("tf.autoDrive.enabled")||"false") } catch { return false }
  })
  const [autoDriveMinutes, setAutoDriveMinutes] = useState<number>(()=>{
    const v = parseInt(localStorage.getItem("tf.autoDrive.minutes")||"3",10); return isNaN(v)?3:Math.min(Math.max(v,2),120)
  })
  const [isDriveBacking, setIsDriveBacking] = useState(false)
  const [lastDriveBackupTs, setLastDriveBackupTs] = useState<number>(()=>{
    const v = parseInt(localStorage.getItem("tf.autoDrive.lastTs")||"0",10); return isNaN(v)?0:v
  })
  const [nextBackupMs, setNextBackupMs] = useState<number>(0)
  const [driveFlash, setDriveFlash] = useState<""|"success"|"error">("")

  async function loadGapi(){ if((window as any).gapi) return true; await new Promise<void>((resolve,reject)=>{ const s=document.createElement('script'); s.src='https://apis.google.com/js/api.js'; s.onload=()=>resolve(); s.onerror=()=>reject(new Error('Failed to load Google API')); document.body.appendChild(s) }); return true }
  async function initGapi(){ setDriveStatus("Loading Google client…"); await loadGapi(); const gapi=(window as any).gapi; await new Promise<void>((r)=>gapi.load("client:auth2", r)); await gapi.client.init({ apiKey: GOOGLE_DRIVE_CONFIG.API_KEY, clientId: GOOGLE_DRIVE_CONFIG.CLIENT_ID, discoveryDocs: GOOGLE_DRIVE_CONFIG.DISCOVERY_DOCS, scope: GOOGLE_DRIVE_CONFIG.SCOPES.join(" ") }); const auth=gapi.auth2.getAuthInstance(); setGoogleSignedIn(auth.isSignedIn.get()); auth.isSignedIn.listen((v:boolean)=>setGoogleSignedIn(v)); setGapiReady(true); setDriveStatus("") }
  async function googleSignIn(){ try{ if(!gapiReady) await initGapi(); const gapi=(window as any).gapi; await gapi.auth2.getAuthInstance().signIn(); setDriveStatus("Connected to Google Drive") } catch(e:any){ setDriveStatus(`Sign-in failed: ${e?.message||e}`) } }
  async function chooseDriveFolder(){ try{ setDriveStatus("Opening folder chooser…"); if(!gapiReady || !googleSignedIn) await googleSignIn(); const gapi=(window as any).gapi; const desired = prompt("Type a Drive folder name to use (or leave as 'Teacher Fairy Backups'):", driveFolderName || "Teacher Fairy Backups"); const name = (desired || "Teacher Fairy Backups").trim(); const list = await gapi.client.drive.files.list({ q: `mimeType='application/vnd.google-apps.folder' and name='${name.replace(/'/g, "\\'")}' and trashed=false`, fields: "files(id, name, modifiedTime)", orderBy: "modifiedTime desc", pageSize: 5 }); let folder = list.result.files?.[0]; if(!folder){ const createRes = await gapi.client.drive.files.create({ resource: { name, mimeType: 'application/vnd.google-apps.folder' }, }); folder = createRes.result; } if(folder?.id){ setDriveFolderId(folder.id); setDriveFolderName(folder.name); localStorage.setItem("tf.drive.folderId", folder.id); localStorage.setItem("tf.drive.folderName", folder.name||name); setDriveStatus(`Drive folder set: ${folder.name}`) } else { setDriveStatus("Could not set Drive folder") } } catch(e:any){ setDriveStatus(`Choose folder error: ${e?.message||e}`) } }
  async function backupToDrive() {
  try {
    if (isDriveBacking) return; // avoid overlapping backups
    setIsDriveBacking(true);
    setDriveStatus("Backing up to Drive…");

    if (!gapiReady || !googleSignedIn) await googleSignIn();
    const gapi = (window as any).gapi;

    const project = JSON.parse(localStorage.getItem("teacher-fairy-project") || "{}");
    const standards = JSON.parse(localStorage.getItem("tf.standardsDB") || "{}");
    const payload = JSON.stringify(
      { project, standardsDB: standards, ts: Date.now() },
      null,
      2
    );

    const metadata: any = {
      name: GOOGLE_DRIVE_CONFIG.BACKUP_FILENAME,
      mimeType: "application/json",
      ...(driveFolderId ? { parents: [driveFolderId] } : {}),
    };

    const boundary = "-------314159265358979323846";
    const delimiter = "\r\n--" + boundary + "\r\n";
    const closeDelim = "\r\n--" + boundary + "--";
    const multipartRequestBody =
      delimiter +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      JSON.stringify(metadata) +
      "\r\n" +
      delimiter +
      "Content-Type: application/json\r\n\r\n" +
      payload +
      closeDelim;

    const res = await gapi.client.request({
      path: "/upload/drive/v3/files",
      method: "POST",
      params: { uploadType: "multipart" },
      headers: { "Content-Type": "multipart/related; boundary=" + boundary },
      body: multipartRequestBody,
    });

    if (res.status === 200 || res.status === 201) {
      setDriveStatus("Backup saved to Drive ✔");
      const now = Date.now();
      setLastDriveBackupTs(now);
      localStorage.setItem("tf.autoDrive.lastTs", String(now));
      // if you track a countdown, you can reset it here
    } else {
      setDriveStatus("Drive backup completed (check Drive)");
    }
   } catch (e: any) {
    setDriveStatus(`Drive backup error: ${e?.message || e}`);
  } finally {
    setIsDriveBacking(false);
  }
} // ← end of backupToDrive()

// Restore the most recent backup file from Google Drive
async function restoreLatestFromDrive() {
  try {
    setDriveStatus("Looking for backups in Drive…");

    // Ensure Drive client is loaded and user is signed in
    if (!gapiReady || !googleSignedIn) await googleSignIn();
    const gapi = (window as any).gapi;

    // Query newest backup file (optionally within chosen folder)
    const fname = GOOGLE_DRIVE_CONFIG.BACKUP_FILENAME.replace(/'/g, "\\'");
    let q = `name='${fname}' and trashed=false`;
    if (driveFolderId) q += ` and '${driveFolderId}' in parents`;

    const listRes = await gapi.client.drive.files.list({
      q,
      fields: "files(id,name,modifiedTime)",
      orderBy: "modifiedTime desc",
      pageSize: 1,
    });

    const file = listRes.result?.files?.[0];
    if (!file) {
      setDriveStatus("No backup file found in Drive.");
      return;
    }

    // Download JSON content
    const getRes = await gapi.client.drive.files.get({
      fileId: file.id,
      alt: "media",
    });

    const data: any = (getRes as any).result || {};
    const project = data.project || {};
    const standards = data.standardsDB || {};

    // Persist locally
    localStorage.setItem("teacher-fairy-project", JSON.stringify(project));
    localStorage.setItem("tf.standardsDB", JSON.stringify(standards));

    // Update UI state
    setState(project.state || "Colorado");
    setSubject(project.subject || "Social Studies");
    setGradeBand(project.gradeBand || "6-8");
    setFramework(project.framework || FRAMEWORKS[0]);
    setCustomTaxonomy(project.customTaxonomy || "");
    setObjectiveStyle(project.objectiveStyle || OBJECTIVE_STYLES[0]);
    setMaterials(project.materials || []);
    setTopicsOnly(!!project.topicsOnly);
    setSlots(project.slots || []);
    setStandardsSelected(project.standardsSelected || []);
    setPrefilledObjective(project.prefilledObjective || "");
    setOtherRequests(project.otherRequests || "");
    setStandardsDB(standards);

    setDriveStatus(`Restored from Drive (${file.name}) ✔`);
  } catch (e: any) {
    setDriveStatus(`Restore error: ${e?.message || e}`);
  }
}

return (
  <div style={{ fontFamily: 'Inter, system-ui, Arial, sans-serif', background:'#f6f7fb', minHeight:'100vh' }}>
    <div style={{ maxWidth: 1200, margin: '20px auto', padding: '0 16px' }}>
      {/* HEADER */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <div>
          <h1 style={{ margin:0 }}>Teacher Fairy ✨</h1>
          <div style={{ color:'#6b7280', fontSize:12 }}>Plan generator with Drive backup & standards</div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          <button onClick={googleSignIn}>Connect Drive</button>
          <button onClick={chooseDriveFolder}>Choose Drive Folder</button>
          <button onClick={backupToDrive} disabled={isDriveBacking}>{isDriveBacking ? 'Backing up…' : 'Backup to Drive'}</button>
          <button onClick={restoreLatestFromDrive}>Restore from Drive</button>
          {driveFolderName && <span style={{fontSize:12, color:'#6b7280'}}>Folder: {driveFolderName}</span>}
        </div>
      </div>
{/* STATUS STRIP */}
{driveStatus ? (
  <div style={{
    fontSize:12,
    border:'1px solid #c7e5ff',
    background:'#ebf5ff',
    color:'#0b64b1',
    padding:'6px 10px',
    borderRadius:8,
    marginBottom:12
  }}>{driveStatus}</div>
) : null}

{/* DRIVE BUTTONS */}
<div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', marginBottom:12 }}>
  <button onClick={googleSignIn}>Connect Drive</button>
  <button onClick={chooseDriveFolder}>Choose Drive Folder</button>
  <button onClick={backupToDrive} disabled={isDriveBacking}>
    {isDriveBacking ? 'Backing up…' : 'Backup to Drive'}
  </button>
  <button onClick={restoreLatestFromDrive}>Restore from Drive</button>
  {driveFolderName && (
    <span style={{fontSize:12, color:'#6b7280'}}>Folder: {driveFolderName}</span>
  )}
</div>
{/* AUTO DRIVE BACKUP CONTROLS */}
<div style={{
  background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:12, marginBottom:12,
  display:'flex', alignItems:'center', gap:10, flexWrap:'wrap'
}}>
  <label style={{ display:'flex', alignItems:'center', gap:6 }}>
    <input
      type="checkbox"
      checked={autoDriveBackup}
      onChange={() => setAutoDriveBackup(!autoDriveBackup)}
    />
    Auto-backup to Drive every
  </label>
  <input
    type="number"
    value={autoDriveMinutes}
    onChange={(e)=>setAutoDriveMinutes(Math.min(Math.max(parseInt(e.target.value||'3',10)||3,2),120))}
    style={{ width:60 }}
  />
  <span>min</span>
  <button onClick={backupToDrive} disabled={isDriveBacking}>Backup Now</button>
  <span style={{ marginLeft:8, fontSize:12 }}>Last backup: {lastDriveBackupTs ? new Date(lastDriveBackupTs).toLocaleTimeString() : '—'}</span>
  <span
    style={{
      marginLeft:8,
      fontSize:12,
      color: (nextBackupMs>0 && nextBackupMs<=10000) ? '#dc2626' : 'inherit',
      fontWeight: (nextBackupMs>0 && nextBackupMs<=10000) ? 600 : 400
    }}
  >
    Next backup in: {nextBackupMs>0
      ? `${String(Math.floor(nextBackupMs/60000)).padStart(2,'0')}:${String(Math.floor((nextBackupMs%60000)/1000)).padStart(2,'0')}`
      : '—'}
  </span>
</div>
{/* SETTINGS BAR */}
<div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:12, marginBottom:12 }}>
  <div style={{ display:'grid', gridTemplateColumns:'repeat(12,1fr)', gap:12 }}>
    <div style={{ gridColumn:'span 3' }}>
      <label style={{fontWeight:600, fontSize:12, color:'#4b5563'}}>State</label>
      <select value={state} onChange={e=>setState(e.target.value)} style={{ width:'100%' }}>
        {STATES.map(s=><option key={s} value={s}>{s}</option>)}
      </select>
    </div>
    <div style={{ gridColumn:'span 3' }}>
      <label style={{fontWeight:600, fontSize:12, color:'#4b5563'}}>Subject</label>
      <select value={subject} onChange={e=>setSubject(e.target.value)} style={{ width:'100%' }}>
        {SUBJECTS.map(s=><option key={s} value={s}>{s}</option>)}
      </select>
    </div>
    <div style={{ gridColumn:'span 3' }}>
      <label style={{fontWeight:600, fontSize:12, color:'#4b5563'}}>Grade Band</label>
      <select value={gradeBand} onChange={e=>setGradeBand(e.target.value)} style={{ width:'100%' }}>
        {GRADE_BANDS.map(g=><option key={g} value={g}>{g}</option>)}
      </select>
    </div>
    <div style={{ gridColumn:'span 3' }}>
      <label style={{fontWeight:600, fontSize:12, color:'#4b5563'}}>Objective Style</label>
      <select value={objectiveStyle} onChange={e=>setObjectiveStyle(e.target.value)} style={{ width:'100%' }}>
        {OBJECTIVE_STYLES.map(o=><option key={o} value={o}>{o}</option>)}
      </select>
    </div>
    <div style={{ gridColumn:'span 6' }}>
      <label style={{fontWeight:600, fontSize:12, color:'#4b5563'}}>Framework / Taxonomy</label>
      <div style={{ display:'flex', gap:8 }}>
        <select value={framework} onChange={e=>setFramework(e.target.value)} style={{ width:'50%' }}>
          {FRAMEWORKS.map(f=><option key={f} value={f}>{f}</option>)}
        </select>
        <input
          placeholder="Custom taxonomy (optional)"
          value={customTaxonomy}
          onChange={e=>setCustomTaxonomy(e.target.value)}
          style={{ flex:1 }}
        />
      </div>
    </div>
    <div style={{ gridColumn:'span 6' }}>
      <label style={{fontWeight:600, fontSize:12, color:'#4b5563'}}>Materials & Resources</label>
      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
        {MATERIALS.map(m=>(
          <button key={m} onClick={()=>toggleMaterial(m)} style={{
            border:'1px solid #d6dbe3', borderRadius:999, padding:'6px 10px', background: materials.includes(m) ? '#eef2ff' : '#fff'
          }}>
            {materials.includes(m) ? '✓ ' : ''}{m}
          </button>
        ))}
      </div>
    </div>
    <div style={{ gridColumn:'span 12', display:'flex', alignItems:'center', gap:8 }}>
      <input id="topicsOnly" type="checkbox" checked={topicsOnly} onChange={()=>setTopicsOnly(!topicsOnly)} />
      <label htmlFor="topicsOnly">Generate from topics only (files optional)</label>
    </div>
  </div>
</div>

{/* UPLOAD SLOTS */}
<div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:12, marginBottom:12 }}>
  <h3 style={{ marginTop:0 }}>Upload Slots</h3>
  <div style={{ display:'grid', gap:12 }}>
    {slots.map((slot, idx)=>(
      <div key={slot.id} style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:12 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(12,1fr)', gap:12 }}>
          <div style={{ gridColumn:'span 3' }}>
            <label style={{fontWeight:600, fontSize:12, color:'#4b5563'}}>Date</label>
            <input type="date" value={slot.date} onChange={e=>setSlotField(slot.id,'date', e.target.value)} />
          </div>
          <div style={{ gridColumn:'span 5' }}>
            <label style={{fontWeight:600, fontSize:12, color:'#4b5563'}}>Topic</label>
            <input placeholder="e.g., Causes of the American Revolution" value={slot.topic} onChange={e=>setSlotField(slot.id,'topic', e.target.value)} />
          </div>
          <div style={{ gridColumn:'span 4' }}>
            <label style={{fontWeight:600, fontSize:12, color:'#4b5563'}}>Attach Files / Pictures</label>
            <input type="file" multiple onChange={e=>handleFiles(slot.id, e.target.files)} />
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:6 }}>
              {slot.files.map((f,i)=>(
                <span key={i} style={{ border:'1px solid #d6dbe3', borderRadius:999, padding:'4px 8px', fontSize:12 }}>
                  {f.name} <button onClick={()=>removeFile(slot.id,i,false)} style={{ marginLeft:6 }}>✕</button>
                </span>
              ))}
              {slot.images.map((f,i)=>(
                <span key={'img'+i} style={{ border:'1px solid #d6dbe3', borderRadius:999, padding:'4px 8px', fontSize:12 }}>
                  {f.name} <button onClick={()=>removeFile(slot.id,i,true)} style={{ marginLeft:6 }}>✕</button>
                </span>
              ))}
            </div>
          </div>
          <div style={{ gridColumn:'span 12' }}>
            <label style={{fontWeight:600, fontSize:12, color:'#4b5563'}}>Pasted text snippet (optional)</label>
            <textarea value={slot.notes} onChange={e=>setSlotField(slot.id,'notes', e.target.value)} style={{ width:'100%', minHeight:90 }} />
          </div>
        </div>
      </div>
    ))}
  </div>
  <div style={{ display:'flex', gap:8, marginTop:8 }}>
    <button onClick={()=>setSlots(prev=>[...prev,{id:`slot-${prev.length+1}`, date:'', topic:'', files:[], images:[], notes:'', other:''}])}>+ Add Slot</button>
    <button onClick={()=>setSlots([{id:'slot-1', date:'', topic:'', files:[], images:[], notes:'', other:''}])}>Clear Slots</button>
  </div>
</div>

{/* STANDARDS & OPTIONS */}
<div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:12, marginBottom:12 }}>
  <h3 style={{ marginTop:0 }}>Standards & Options</h3>
  <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
    <input
      placeholder="Search standards (keyword/code)"
      value={standardsSearch}
      onChange={e=>setStandardsSearch(e.target.value)}
      style={{ flex:1, minWidth:240 }}
    />
    <button onClick={suggestStandards}>Suggest from topics/search</button>
    <button onClick={()=>setStandardsSelected([])}>Clear selected</button>
    <button onClick={()=>importRef.current?.click()}>Import CO Standards (.json)</button>
    <button onClick={exportStandards}>Export Standards (.json)</button>
    <input ref={importRef} type="file" accept="application/json" style={{ display:'none' }} onChange={handleImport} />
    <span style={{ marginLeft:'auto', color:'#6b7280', fontSize:12 }}>
      {standardsCount ? `${standardsCount} standards loaded` : 'using sample set'}
    </span>
  </div>
  <div style={{ height:1, background:'#e5e7eb', margin:'10px 0' }} />
  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
    <div>
      <label style={{fontWeight:600, fontSize:12, color:'#4b5563'}}>Suggestions</label>
      <div>
        {standardsSuggested.map(s=>(
          <div key={s} style={{ margin:'6px 0' }}>
            <button onClick={()=>addStandard(s)} style={{ marginRight:6 }}>Add</button>
            <span style={{ color:'#6b7280' }}>{s}</span>
          </div>
        ))}
      </div>
    </div>
    <div>
      <label style={{fontWeight:600, fontSize:12, color:'#4b5563'}}>Selected</label>
      <div>
        {standardsSelected.map(s=>(
          <div key={s} style={{ margin:'6px 0' }}>
            <button onClick={()=>removeStandard(s)} style={{ marginRight:6 }}>Remove</button>
            <span>{s}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
</div>

{/* GENERATE PLANS */}
<div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:12, marginBottom:24 }}>
  <h3 style={{ marginTop:0 }}>Generate Plans</h3>
  <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', marginBottom:10 }}>
    <button onClick={generateDaily}>Generate Daily</button>
    <button onClick={generateWeekly}>Generate Weekly</button>
    <button onClick={generateUnit}>Generate Unit</button>
    <span style={{ color:'#6b7280', fontSize:12 }}>— then export Word docs</span>
  </div>

  <div style={{ display:'grid', gridTemplateColumns:'repeat(12,1fr)', gap:12 }}>
    <div style={{ gridColumn:'span 4' }}>
      <label style={{fontWeight:600, fontSize:12, color:'#4b5563'}}>Daily Preview</label>
      <pre style={{ whiteSpace:'pre-wrap' }}>{dailyPreview}</pre>
      <button onClick={()=>downloadDoc(`Daily_Plan_${(slots.find(s=>s.topic||s.date)||slots[0]).date||'TBD'}`, `<pre>${dailyPreview}</pre>`)}>Download Daily (DOCX)</button>
    </div>
    <div style={{ gridColumn:'span 4' }}>
      <label style={{fontWeight:600, fontSize:12, color:'#4b5563'}}>Weekly Preview</label>
      <pre style={{ whiteSpace:'pre-wrap' }}>{weeklyPreview}</pre>
      <button onClick={()=>downloadDoc('Weekly_Plan', `<pre>${weeklyPreview}</pre>`)}>Download Weekly (DOCX)</button>
    </div>
    <div style={{ gridColumn:'span 4' }}>
      <label style={{fontWeight:600, fontSize:12, color:'#4b5563'}}>Unit Preview</label>
      <pre style={{ whiteSpace:'pre-wrap' }}>{unitPreview}</pre>
      <button onClick={()=>downloadDoc('Unit_Plan', `<pre>${unitPreview}</pre>`)}>Download Unit (DOCX)</button>
    </div>
  </div>
</div>

      {/* STATUS STRIP */}
      {driveStatus ? (
        <div style={{
          fontSize:12,
          border:'1px solid #c7e5ff',
          background:'#ebf5ff',
          color:'#0b64b1',
          padding:'6px 10px',
          borderRadius:8,
          marginBottom:12
        }}>{driveStatus}</div>
      ) : null}

      {/* AUTO DRIVE BACKUP CONTROLS */}
      <div style={{
        background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:12, marginBottom:12,
        display:'flex', alignItems:'center', gap:10, flexWrap:'wrap'
      }}>
        <label style={{ display:'flex', alignItems:'center', gap:6 }}>
          <input
            type="checkbox"
            checked={autoDriveBackup}
            onChange={() => setAutoDriveBackup(!autoDriveBackup)}
          />
          Auto-backup to Drive every
        </label>
        <input
          type="number"
          value={autoDriveMinutes}
          onChange={(e)=>setAutoDriveMinutes(Math.min(Math.max(parseInt(e.target.value||'3',10)||3,2),120))}
          style={{ width:60 }}
        />
        <span>min</span>
        <button onClick={backupToDrive} disabled={isDriveBacking}>Backup Now</button>
        <span style={{ marginLeft:8, fontSize:12 }}>Last backup: {lastDriveBackupTs ? new Date(lastDriveBackupTs).toLocaleTimeString() : '—'}</span>
        <span
          style={{
            marginLeft:8,
            fontSize:12,
            color: (nextBackupMs>0 && nextBackupMs<=10000) ? '#dc2626' : 'inherit',
            fontWeight: (nextBackupMs>0 && nextBackupMs<=10000) ? 600 : 400
          }}
        >
          Next backup in: {nextBackupMs>0
            ? `${String(Math.floor(nextBackupMs/60000)).padStart(2,'0')}:${String(Math.floor((nextBackupMs%60000)/1000)).padStart(2,'0')}`
            : '—'}
        </span>
      </div> 

      {/* SETTINGS BAR */}
      <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:12, marginBottom:12 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(12,1fr)', gap:12 }}>
          <div style={{ gridColumn:'span 3' }}>
            <label style={{fontWeight:600, fontSize:12, color:'#4b5563'}}>State</label>
            <select value={state} onChange={e=>setState(e.target.value)} style={{ width:'100%' }}>
              {STATES.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ gridColumn:'span 3' }}>
            <label style={{fontWeight:600, fontSize:12, color:'#4b5563'}}>Subject</label>
            <select value={subject} onChange={e=>setSubject(e.target.value)} style={{ width:'100%' }}>
              {SUBJECTS.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ gridColumn:'span 3' }}>
            <label style={{fontWeight:600, fontSize:12, color:'#4b5563'}}>Grade Band</label>
            <select value={gradeBand} onChange={e=>setGradeBand(e.target.value)} style={{ width:'100%' }}>
              {GRADE_BANDS.map(g=><option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div style={{ gridColumn:'span 3' }}>
            <label style={{fontWeight:600, fontSize:12, color:'#4b5563'}}>Objective Style</label>
            <select value={objectiveStyle} onChange={e=>setObjectiveStyle(e.target.value)} style={{ width:'100%' }}>
              {OBJECTIVE_STYLES.map(o=><option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div style={{ gridColumn:'span 6' }}>
            <label style={{fontWeight:600, fontSize:12, color:'#4b5563'}}>Framework / Taxonomy</label>
            <div style={{ display:'flex', gap:8 }}>
              <select value={framework} onChange={e=>setFramework(e.target.value)} style={{ width:'50%' }}>
                {FRAMEWORKS.map(f=><option key={f} value={f}>{f}</option>)}
              </select>
              <input
                placeholder="Custom taxonomy (optional)"
                value={customTaxonomy}
                onChange={e=>setCustomTaxonomy(e.target.value)}
                style={{ flex:1 }}
              />
            </div>
          </div>
          <div style={{ gridColumn:'span 6' }}>
            <label style={{fontWeight:600, fontSize:12, color:'#4b5563'}}>Materials & Resources</label>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {MATERIALS.map(m=>(
                <button key={m} onClick={()=>toggleMaterial(m)} style={{
                  border:'1px solid #d6dbe3', borderRadius:999, padding:'6px 10px', background: materials.includes(m) ? '#eef2ff' : '#fff'
                }}>
                  {materials.includes(m) ? '✓ ' : ''}{m}
                </button>
              ))}
            </div>
          </div>
          <div style={{ gridColumn:'span 12', display:'flex', alignItems:'center', gap:8 }}>
            <input id="topicsOnly" type="checkbox" checked={topicsOnly} onChange={()=>setTopicsOnly(!topicsOnly)} />
            <label htmlFor="topicsOnly">Generate from topics only (files optional)</label>
          </div>
        </div>
      </div>

      {/* UPLOAD SLOTS */}
      <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:12, marginBottom:12 }}>
        <h3 style={{ marginTop:0 }}>Upload Slots</h3>
        <div style={{ display:'grid', gap:12 }}>
          {slots.map((slot, idx)=>(
            <div key={slot.id} style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:12 }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(12,1fr)', gap:12 }}>
                <div style={{ gridColumn:'span 3' }}>
                  <label style={{fontWeight:600, fontSize:12, color:'#4b5563'}}>Date</label>
                  <input type="date" value={slot.date} onChange={e=>setSlotField(slot.id,'date', e.target.value)} />
                </div>
                <div style={{ gridColumn:'span 5' }}>
                  <label style={{fontWeight:600, fontSize:12, color:'#4b5563'}}>Topic</label>
                  <input placeholder="e.g., Causes of the American Revolution" value={slot.topic} onChange={e=>setSlotField(slot.id,'topic', e.target.value)} />
                </div>
                <div style={{ gridColumn:'span 4' }}>
                  <label style={{fontWeight:600, fontSize:12, color:'#4b5563'}}>Attach Files / Pictures</label>
                  <input type="file" multiple onChange={e=>handleFiles(slot.id, e.target.files)} />
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:6 }}>
                    {slot.files.map((f,i)=>(
                      <span key={i} style={{ border:'1px solid #d6dbe3', borderRadius:999, padding:'4px 8px', fontSize:12 }}>
                        {f.name} <button onClick={()=>removeFile(slot.id,i,false)} style={{ marginLeft:6 }}>✕</button>
                      </span>
                    ))}
                    {slot.images.map((f,i)=>(
                      <span key={'img'+i} style={{ border:'1px solid #d6dbe3', borderRadius:999, padding:'4px 8px', fontSize:12 }}>
                        {f.name} <button onClick={()=>removeFile(slot.id,i,true)} style={{ marginLeft:6 }}>✕</button>
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ gridColumn:'span 12' }}>
                  <label style={{fontWeight:600, fontSize:12, color:'#4b5563'}}>Pasted text snippet (optional)</label>
                  <textarea value={slot.notes} onChange={e=>setSlotField(slot.id,'notes', e.target.value)} style={{ width:'100%', minHeight:90 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display:'flex', gap:8, marginTop:8 }}>
          <button onClick={()=>setSlots(prev=>[...prev,{id:`slot-${prev.length+1}`, date:'', topic:'', files:[], images:[], notes:'', other:''}])}>+ Add Slot</button>
          <button onClick={()=>setSlots([{id:'slot-1', date:'', topic:'', files:[], images:[], notes:'', other:''}])}>Clear Slots</button>
        </div>
      </div>

      {/* STANDARDS & OPTIONS */}
      <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:12, marginBottom:12 }}>
        <h3 style={{ marginTop:0 }}>Standards & Options</h3>
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          <input
            placeholder="Search standards (keyword/code)"
            value={standardsSearch}
            onChange={e=>setStandardsSearch(e.target.value)}
            style={{ flex:1, minWidth:240 }}
          />
          <button onClick={suggestStandards}>Suggest from topics/search</button>
          <button onClick={()=>setStandardsSelected([])}>Clear selected</button>
          <button onClick={()=>importRef.current?.click()}>Import CO Standards (.json)</button>
          <button onClick={exportStandards}>Export Standards (.json)</button>
          <input ref={importRef} type="file" accept="application/json" style={{ display:'none' }} onChange={handleImport} />
          <span style={{ marginLeft:'auto', color:'#6b7280', fontSize:12 }}>
            {standardsCount ? `${standardsCount} standards loaded` : 'using sample set'}
          </span>
        </div>
        <div style={{ height:1, background:'#e5e7eb', margin:'10px 0' }} />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div>
            <label style={{fontWeight:600, fontSize:12, color:'#4b5563'}}>Suggestions</label>
            <div>
              {standardsSuggested.map(s=>(
                <div key={s} style={{ margin:'6px 0' }}>
                  <button onClick={()=>addStandard(s)} style={{ marginRight:6 }}>Add</button>
                  <span style={{ color:'#6b7280' }}>{s}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <label style={{fontWeight:600, fontSize:12, color:'#4b5563'}}>Selected</label>
            <div>
              {standardsSelected.map(s=>(
                <div key={s} style={{ margin:'6px 0' }}>
                  <button onClick={()=>removeStandard(s)} style={{ marginRight:6 }}>Remove</button>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* GENERATE PLANS */}
      <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:12, marginBottom:24 }}>
        <h3 style={{ marginTop:0 }}>Generate Plans</h3>
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', marginBottom:10 }}>
          <button onClick={generateDaily}>Generate Daily</button>
          <button onClick={generateWeekly}>Generate Weekly</button>
          <button onClick={generateUnit}>Generate Unit</button>
          <span style={{ color:'#6b7280', fontSize:12 }}>— then export Word docs</span>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(12,1fr)', gap:12 }}>
          <div style={{ gridColumn:'span 4' }}>
            <label style={{fontWeight:600, fontSize:12, color:'#4b5563'}}>Daily Preview</label>
            <pre style={{ whiteSpace:'pre-wrap' }}>{dailyPreview}</pre>
            <button onClick={()=>downloadDoc(`Daily_Plan_${(slots.find(s=>s.topic||s.date)||slots[0]).date||'TBD'}`, `<pre>${dailyPreview}</pre>`)}>Download Daily (DOCX)</button>
          </div>
          <div style={{ gridColumn:'span 4' }}>
            <label style={{fontWeight:600, fontSize:12, color:'#4b5563'}}>Weekly Preview</label>
            <pre style={{ whiteSpace:'pre-wrap' }}>{weeklyPreview}</pre>
            <button onClick={()=>downloadDoc('Weekly_Plan', `<pre>${weeklyPreview}</pre>`)}>Download Weekly (DOCX)</button>
          </div>
          <div style={{ gridColumn:'span 4' }}>
            <label style={{fontWeight:600, fontSize:12, color:'#4b5563'}}>Unit Preview</label>
            <pre style={{ whiteSpace:'pre-wrap' }}>{unitPreview}</pre>
            <button onClick={()=>downloadDoc('Unit_Plan', `<pre>${unitPreview}</pre>`)}>Download Unit (DOCX)</button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

}