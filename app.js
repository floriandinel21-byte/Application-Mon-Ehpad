/*
  EHPAD Staff — Démo web locale
  v4 — toutes les améliorations :
  • Tableau de bord direction avec KPIs + planning du jour + validations rapides
  • Sélecteur d'unité dans le calendrier direction (Unité A / B)
  • Horaires de nuit colorés en violet (dot + tag + detail)
  • Messagerie direction cross-unité (tous les agents)
  • Noms stockés dans la demande d'échange (stable après approbation)
  • Résumé mensuel des heures supp par agent
  • Ajout d'un horaire depuis la direction (modal)
  • Avatars avec initiales colorées sur l'écran de connexion
  • Écran vide dans la messagerie (état sans messages)
  • Fix clavier mobile : chatbar reste au-dessus du clavier (visualViewport)
*/

const LS_KEY = "ehpad_demo_state_v4";
const AVATAR_COLORS = ["#4f8cff","#32d583","#ff9f43","#ff4f6d","#a855f7"];

const icons = {
  calendar:  `<svg viewBox="0 0 24 24"><path d="M7 2v3M17 2v3M3 8h18M5 5h14a2 2 0 012 2v13a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  swap:      `<svg viewBox="0 0 24 24"><path d="M7 7h14l-3-3M17 17H3l3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  msg:       `<svg viewBox="0 0 24 24"><path d="M21 15a4 4 0 01-4 4H8l-5 3V7a4 4 0 014-4h10a4 4 0 014 4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`,
  heart:     `<svg viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 22l7.8-8.6 1-1a5.5 5.5 0 000-7.8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`,
  check:     `<svg viewBox="0 0 24 24"><path d="M9 12l2 2 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 12a8 8 0 11-16 0 8 8 0 0116 0z" fill="none" stroke="currentColor" stroke-width="2"/></svg>`,
  account:   `<svg viewBox="0 0 24 24"><path d="M20 21a8 8 0 10-16 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 13a4 4 0 100-8 4 4 0 000 8z" fill="none" stroke="currentColor" stroke-width="2"/></svg>`,
  chevLeft:  `<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  chevRight: `<svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  send:      `<svg viewBox="0 0 24 24"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  home:      `<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 22V12h6v10" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`,
  plus:      `<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  clock:     `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function nowTime(){ return new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}); }
function iso(d){ return d.toISOString().slice(0,10); }
function daysFromNow(n){ const d=new Date(); d.setDate(d.getDate()+n); return iso(d); }
function fmtDate(isoDate){ const d=new Date(isoDate+"T00:00:00"); return d.toLocaleDateString("fr-FR",{weekday:"short",day:"2-digit",month:"short"}); }
function pendingCount(){
  return state.swapRequests.filter(r=>r.status==="pending").length
       + state.leaveRequests.filter(r=>r.status==="pending").length
       + state.overtime.filter(r=>r.status==="pending").length;
}
function avatarColor(id){ const idx=["u1","u2","u3","d1"].indexOf(id); return AVATAR_COLORS[idx>=0?idx:0]; }
function avatarInitials(name){ return name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase(); }
function shiftCls(label){ return label==="Nuit"?"night":label==="Soir"?"soir":"matin"; }

// ── Données de démo ───────────────────────────────────────────────────────────
function loadState(){
  const raw=localStorage.getItem(LS_KEY);
  if(raw){ try{ return JSON.parse(raw); }catch{} }

  const users=[
    {id:"u1",name:"Marie Dupont",    unit:"Unité A",role:"agent",    email:"marie@ehpad.fr"},
    {id:"u2",name:"Thomas Bernard",  unit:"Unité A",role:"agent",    email:"thomas@ehpad.fr"},
    {id:"u3",name:"Isabelle Martin", unit:"Unité B",role:"agent",    email:"isabelle@ehpad.fr"},
    {id:"d1",name:"Mme Robert",      unit:"Direction",role:"direction",email:"direction@ehpad.fr"},
  ];

  const shifts=[
    {id:"s1", userId:"u1",unit:"Unité A",date:daysFromNow(-5),start:"07:00",end:"14:00",label:"Matin"},
    {id:"s2", userId:"u1",unit:"Unité A",date:daysFromNow(-4),start:"14:00",end:"21:30",label:"Soir"},
    {id:"s3", userId:"u1",unit:"Unité A",date:daysFromNow(-2),start:"14:00",end:"21:30",label:"Soir"},
    {id:"s4", userId:"u1",unit:"Unité A",date:daysFromNow(-1),start:"21:30",end:"07:00",label:"Nuit"},
    {id:"s5", userId:"u1",unit:"Unité A",date:daysFromNow(0), start:"07:00",end:"14:00",label:"Matin"},
    {id:"s6", userId:"u1",unit:"Unité A",date:daysFromNow(2), start:"07:00",end:"14:00",label:"Matin"},
    {id:"s7", userId:"u1",unit:"Unité A",date:daysFromNow(3), start:"14:00",end:"21:30",label:"Soir"},
    {id:"s8", userId:"u1",unit:"Unité A",date:daysFromNow(5), start:"07:00",end:"14:00",label:"Matin"},
    {id:"s9", userId:"u1",unit:"Unité A",date:daysFromNow(6), start:"21:30",end:"07:00",label:"Nuit"},
    {id:"s10",userId:"u2",unit:"Unité A",date:daysFromNow(-5),start:"14:00",end:"21:30",label:"Soir"},
    {id:"s11",userId:"u2",unit:"Unité A",date:daysFromNow(-3),start:"07:00",end:"14:00",label:"Matin"},
    {id:"s12",userId:"u2",unit:"Unité A",date:daysFromNow(-1),start:"07:00",end:"14:00",label:"Matin"},
    {id:"s13",userId:"u2",unit:"Unité A",date:daysFromNow(0), start:"14:00",end:"21:30",label:"Soir"},
    {id:"s14",userId:"u2",unit:"Unité A",date:daysFromNow(1), start:"07:00",end:"14:00",label:"Matin"},
    {id:"s15",userId:"u2",unit:"Unité A",date:daysFromNow(3), start:"07:00",end:"14:00",label:"Matin"},
    {id:"s16",userId:"u2",unit:"Unité A",date:daysFromNow(4), start:"21:30",end:"07:00",label:"Nuit"},
    {id:"s17",userId:"u2",unit:"Unité A",date:daysFromNow(7), start:"14:00",end:"21:30",label:"Soir"},
    {id:"s18",userId:"u2",unit:"Unité A",date:daysFromNow(8), start:"07:00",end:"14:00",label:"Matin"},
    {id:"s19",userId:"u3",unit:"Unité B",date:daysFromNow(-5),start:"07:00",end:"14:00",label:"Matin"},
    {id:"s20",userId:"u3",unit:"Unité B",date:daysFromNow(-3),start:"21:30",end:"07:00",label:"Nuit"},
    {id:"s21",userId:"u3",unit:"Unité B",date:daysFromNow(-1),start:"07:00",end:"14:00",label:"Matin"},
    {id:"s22",userId:"u3",unit:"Unité B",date:daysFromNow(0), start:"14:00",end:"21:30",label:"Soir"},
    {id:"s23",userId:"u3",unit:"Unité B",date:daysFromNow(2), start:"07:00",end:"14:00",label:"Matin"},
    {id:"s24",userId:"u3",unit:"Unité B",date:daysFromNow(4), start:"21:30",end:"07:00",label:"Nuit"},
    {id:"s25",userId:"u3",unit:"Unité B",date:daysFromNow(6), start:"14:00",end:"21:30",label:"Soir"},
    {id:"s26",userId:"u3",unit:"Unité B",date:daysFromNow(8), start:"07:00",end:"14:00",label:"Matin"},
  ];

  // Noms stockés à la création — stables même après approbation du swap
  const swapRequests=[
    {id:"sw1",requesterId:"u1",targetId:"u2",requesterName:"Marie Dupont",targetName:"Thomas Bernard",
     requesterShiftId:"s6",targetShiftId:"s14",status:"pending",
     createdAt:new Date(Date.now()-3600000*2).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"})},
    {id:"sw2",requesterId:"u2",targetId:"u1",requesterName:"Thomas Bernard",targetName:"Marie Dupont",
     requesterShiftId:"s10",targetShiftId:"s1",status:"approved",
     createdAt:new Date(Date.now()-86400000*4).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"})},
    {id:"sw3",requesterId:"u1",targetId:"u2",requesterName:"Marie Dupont",targetName:"Thomas Bernard",
     requesterShiftId:"s8",targetShiftId:"s17",status:"refused",
     createdAt:new Date(Date.now()-86400000*6).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"})},
  ];

  const leaveRequests=[
    {id:"lv1",userId:"u1",type:"Congés payés",  from:daysFromNow(15),to:daysFromNow(19),note:"Congés de printemps",          status:"pending", createdAt:new Date(Date.now()-86400000*2).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"})},
    {id:"lv2",userId:"u2",type:"Arrêt maladie", from:daysFromNow(-7),to:daysFromNow(-6),note:"Grippe — certificat fourni",    status:"approved",createdAt:new Date(Date.now()-86400000*8).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"})},
    {id:"lv3",userId:"u3",type:"Congé sans solde",from:daysFromNow(10),to:daysFromNow(10),note:"Démarches administratives",   status:"pending", createdAt:new Date(Date.now()-86400000*1).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"})},
  ];

  const overtime=[
    {id:"ot1",userId:"u1",minutes:30,date:daysFromNow(-4),note:"Transmission longue en fin de poste",       status:"pending", createdAt:new Date(Date.now()-86400000*4).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"})},
    {id:"ot2",userId:"u2",minutes:15,date:daysFromNow(-3),note:"Remplacement collègue absent 15 min",       status:"approved",createdAt:new Date(Date.now()-86400000*3).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"})},
    {id:"ot3",userId:"u3",minutes:45,date:daysFromNow(-6),note:"Résidente agitée — surveillance prolongée", status:"approved",createdAt:new Date(Date.now()-86400000*6).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"})},
    {id:"ot4",userId:"u1",minutes:60,date:daysFromNow(-8),note:"Réunion d'équipe exceptionnelle",           status:"approved",createdAt:new Date(Date.now()-86400000*8).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"})},
  ];

  const profiles={
    u1:{userId:"u1",birthDate:"1985-04-12",heightCm:"165",weightKg:"58",allergies:"Aucune connue",treatments:"Aucun traitement en cours",bloodType:"A+",notes:"Asthme léger — inhalateur disponible en salle de pause.",emergencyName:"Jean Dupont",emergencyPhone:"06 12 34 56 78",updatedAt:new Date(Date.now()-86400000*10).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"})},
    u2:{userId:"u2",birthDate:"1990-11-03",heightCm:"178",weightKg:"76",allergies:"Pénicilline (réaction cutanée)",treatments:"Aucun traitement en cours",bloodType:"O+",notes:"",emergencyName:"Sophie Bernard",emergencyPhone:"06 98 76 54 32",updatedAt:new Date(Date.now()-86400000*15).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"})},
    u3:{userId:"u3",birthDate:"1988-07-22",heightCm:"162",weightKg:"62",allergies:"Latex",treatments:"Lévothyrox 50 µg — 1 cp/j le matin à jeun",bloodType:"B+",notes:"Hypothyroïdie — bilan sanguin annuel à prévoir.",emergencyName:"Pierre Martin",emergencyPhone:"06 55 44 33 22",updatedAt:new Date(Date.now()-86400000*20).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"})},
  };

  const messages={
    u1_u2:[
      {from:"u2",text:"Salut Marie ! Tu peux prendre mon soir du "+fmtDate(daysFromNow(3))+" ?",time:"08:45"},
      {from:"u1",text:"Je regarde… je suis déjà du matin ce jour-là.",time:"09:02"},
      {from:"u2",text:"Ah ok, alors je vais faire une demande d'échange via l'app 👍",time:"09:05"},
      {from:"u1",text:"Parfait, j'accepte si la direction valide !",time:"09:08"},
    ],
    d1_u1:[
      {from:"d1",text:"Bonjour Marie, votre demande de congés a bien été reçue.",time:"10:15"},
      {from:"u1",text:"Merci Mme Robert, je reste disponible si besoin.",time:"10:32"},
    ],
    d1_u2:[
      {from:"u2",text:"Bonjour, l'arrêt maladie a bien été enregistré dans le système ?",time:"14:00"},
      {from:"d1",text:"Oui Thomas, tout est en ordre. Bon rétablissement !",time:"14:12"},
    ],
  };

  return {session:{role:"agent",userId:"u1"},users,shifts,swapRequests,leaveRequests,overtime,profiles,messages,ui:{}};
}

function saveState(){ localStorage.setItem(LS_KEY,JSON.stringify(state)); }

// ── État ──────────────────────────────────────────────────────────────────────
let state=loadState();
const root=document.getElementById("root");
const tplLogin=document.getElementById("tpl-login");
const tplShell=document.getElementById("tpl-shell");
let navStack=[], currentTab="planning", activeChatPeer="u2", activeChatPeerDir="u1";

const tabsAgent=[
  {id:"planning",label:"Planning",icon:"calendar"},
  {id:"echanges",label:"Échanges",icon:"swap"},
  {id:"messages",label:"Messages",icon:"msg"},
  {id:"profil",  label:"Profil",  icon:"heart"},
  {id:"compte",  label:"Compte",  icon:"account"},
];
const tabsDirection=[
  {id:"dashboard_dir",label:"Accueil", icon:"home"},
  {id:"validations",  label:"Valider", icon:"check"},
  {id:"messages_dir", label:"Messages",icon:"msg"},
  {id:"profil_dir",   label:"Profils", icon:"heart"},
  {id:"compte",       label:"Compte",  icon:"account"},
];

// ── Rendu ─────────────────────────────────────────────────────────────────────
function render(){
  root.innerHTML="";
  if(!state.session?.userId){ root.appendChild(tplLogin.content.cloneNode(true)); setupLogin(); return; }
  root.appendChild(tplShell.content.cloneNode(true));
  setupShell(); renderTab(currentTab); bindKeyboardFix();
}

function setupLogin(){
  const roleSel=document.getElementById("loginRole");
  const userSel=document.getElementById("loginUser");
  roleSel.value=state.session?.role||"agent";

  function fillUsers(){
    const users=state.users.filter(u=>u.role===roleSel.value);
    userSel.innerHTML=users.map(u=>`<option value="${u.id}">${u.name} — ${u.unit}</option>`).join("");
    userSel.value=users[0]?.id||"";
    renderAvatars(users);
  }
  function renderAvatars(users){
    let wrap=document.getElementById("loginAvatars");
    if(!wrap){
      wrap=document.createElement("div"); wrap.id="loginAvatars"; wrap.className="avatar-row";
      document.getElementById("btnLogin").before(wrap);
    }
    wrap.innerHTML=users.map(u=>`
      <div class="avatar-chip ${u.id===userSel.value?'active':''}" data-uid="${u.id}">
        <div class="avatar-circle" style="background:${avatarColor(u.id)}">${avatarInitials(u.name)}</div>
        <span>${u.name.split(" ")[0]}</span>
      </div>`).join("");
    wrap.querySelectorAll(".avatar-chip").forEach(chip=>{
      chip.addEventListener("click",()=>{
        userSel.value=chip.getAttribute("data-uid");
        wrap.querySelectorAll(".avatar-chip").forEach(c=>c.classList.toggle("active",c===chip));
      });
    });
  }
  roleSel.addEventListener("change",fillUsers);
  fillUsers();
  document.getElementById("btnLogin").addEventListener("click",()=>{
    state.session.role=roleSel.value; state.session.userId=userSel.value; saveState();
    currentTab=state.session.role==="direction"?"dashboard_dir":"planning";
    render(); toast("Connecté ✅");
  });
}

function setupShell(){
  const tabs=state.session.role==="direction"?tabsDirection:tabsAgent;
  const count=pendingCount();
  const tabbar=document.getElementById("tabbar");
  tabbar.innerHTML=tabs.map(t=>`
    <div class="tab ${t.id===currentTab?'active':''}" data-tab="${t.id}" style="position:relative">
      ${icons[t.icon]}
      ${t.id==="validations"&&count>0?`<span style="position:absolute;top:4px;right:6px;background:var(--danger);color:#fff;font-size:10px;font-weight:900;border-radius:999px;padding:1px 5px;min-width:16px;text-align:center;line-height:1.4">${count}</span>`:""}
      <span>${t.label}</span>
    </div>`).join("");
  tabbar.querySelectorAll(".tab").forEach(el=>el.addEventListener("click",()=>navigate(el.getAttribute("data-tab"))));
  document.getElementById("btnBack").addEventListener("click",()=>{ if(navStack.length){currentTab=navStack.pop();render();}else toast("Vous êtes déjà à la racine 🙂"); });
  document.getElementById("btnAccount").addEventListener("click",()=>navigate("compte"));
  updateHeader();
}

function navigate(tabId){ if(tabId===currentTab) return; navStack.push(currentTab); currentTab=tabId; render(); }
function updateHeader(){
  const u2=state.users.find(u=>u.id===state.session.userId);
  document.getElementById("appSubtitle").textContent=`${u2?.name||""} • ${state.session.role==="direction"?"Direction":"Agent"}`;
  const map={planning:"Planning",echanges:"Échanges",messages:"Messagerie",profil:"Profil & santé",compte:"Compte",dashboard_dir:"Accueil",validations:"Validations",messages_dir:"Messagerie",profil_dir:"Profils & santé"};
  document.getElementById("appTitle").textContent=map[currentTab]||"EHPAD";
}
function renderTab(tabId){
  updateHeader();
  const main=document.getElementById("main");
  const role=state.session.role;
  if(role==="agent"){
    if(tabId==="planning")  main.innerHTML=viewPlanningAgent();
    else if(tabId==="echanges") main.innerHTML=viewSwapsAgent();
    else if(tabId==="messages") main.innerHTML=viewMessagesAgent();
    else if(tabId==="profil")   main.innerHTML=viewProfileAgent();
    else if(tabId==="compte")   main.innerHTML=viewAccount();
  } else {
    if(tabId==="dashboard_dir") main.innerHTML=viewDashboard();
    else if(tabId==="validations")  main.innerHTML=viewValidations();
    else if(tabId==="messages_dir") main.innerHTML=viewMessagesDirection();
    else if(tabId==="profil_dir")   main.innerHTML=viewProfilesDirection();
    else if(tabId==="compte")       main.innerHTML=viewAccount();
  }
  attachHandlers(tabId);
}
function me(){ return state.users.find(u=>u.id===state.session.userId); }
function isDirection(){ return state.session.role==="direction"; }

// ── Dashboard direction ───────────────────────────────────────────────────────
function viewDashboard(){
  const today=iso(new Date());
  const todayShifts=state.shifts.filter(s=>s.date===today);
  const agentsToday=[...new Set(todayShifts.map(s=>s.userId))].length;
  const pending=pendingCount();
  const now=new Date();
  const ym=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  const otMins=state.overtime.filter(o=>o.status==="approved"&&o.date.startsWith(ym)).reduce((a,o)=>a+o.minutes,0);
  const otDisplay=otMins>=60?`${Math.floor(otMins/60)}h${otMins%60?String(otMins%60).padStart(2,"0"):""}`:otMins?`${otMins} min`:"0";
  const units=[...new Set(state.shifts.map(s=>s.unit))].sort();
  const quickItems=[
    ...state.swapRequests.filter(r=>r.status==="pending"),
    ...state.leaveRequests.filter(r=>r.status==="pending"),
    ...state.overtime.filter(r=>r.status==="pending"),
  ].slice(0,3);
  const otByAgent=state.users.filter(u=>u.role==="agent").map(u=>{
    const mins=state.overtime.filter(o=>o.userId===u.id&&o.status==="approved"&&o.date.startsWith(ym)).reduce((a,o)=>a+o.minutes,0);
    return {id:u.id,name:u.name,unit:u.unit,mins};
  }).filter(x=>x.mins>0);

  return `
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-icon" style="background:rgba(79,140,255,.18);color:#4f8cff">${icons.calendar}</div>
        <div class="kpi-val">${agentsToday}</div>
        <div class="kpi-label">Agents aujourd'hui</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:rgba(${pending>0?"255,79,109":"50,213,131"},.18);color:${pending>0?"#ff4f6d":"#32d583"}">${icons.check}</div>
        <div class="kpi-val">${pending}</div>
        <div class="kpi-label">En attente</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:rgba(168,85,247,.18);color:#a855f7">${icons.clock}</div>
        <div class="kpi-val">${otDisplay}</div>
        <div class="kpi-label">Heures supp (mois)</div>
      </div>
    </div>

    <div class="carditem">
      <div class="row" style="justify-content:space-between;align-items:center;margin-bottom:10px">
        <h3 style="margin:0">Planning du jour — ${fmtDate(today)}</h3>
        <button class="btn small ghost" id="btnAddShift" style="display:flex;align-items:center;gap:4px">${icons.plus} Ajouter</button>
      </div>
      ${units.map(unit=>{
        const sh=todayShifts.filter(s=>s.unit===unit);
        return `<div class="muted" style="font-weight:750;margin:8px 0 4px">${unit}</div>`+
          (sh.length?sh.map(s=>`
            <div class="detail-line">
              <div class="left"><div style="font-weight:900">${s.start}–${s.end}</div><div class="muted">${s.label}</div></div>
              <div style="display:flex;align-items:center;gap:8px">
                <span class="tag ${shiftCls(s.label)}">${s.label}</span>
                <span style="font-size:12px;font-weight:750">${userName(s.userId)}</span>
              </div>
            </div>`).join(""):`<div class="muted" style="margin-bottom:8px">Aucun horaire.</div>`);
      }).join("")}
    </div>

    ${quickItems.length?`
    <div class="carditem">
      <div class="row" style="justify-content:space-between;align-items:center;margin-bottom:10px">
        <h3 style="margin:0">Demandes en attente</h3>
        <button class="btn small ghost" id="btnGoValidations">Tout voir →</button>
      </div>
      <div class="cardlist">${quickItems.map(r=>r.requesterShiftId!==undefined?quickSwapCard(r):r.type!==undefined?quickLeaveCard(r):quickOTCard(r)).join("")}</div>
    </div>`:""}

    ${otByAgent.length?`
    <div class="carditem">
      <h3>Heures supp — ${now.toLocaleDateString("fr-FR",{month:"long",year:"numeric"})}</h3>
      <div class="muted" style="margin-bottom:12px">Total validé par agent ce mois</div>
      ${otByAgent.map(x=>{
        const h=Math.floor(x.mins/60),m=x.mins%60;
        const disp=h>0?`${h}h${m?String(m).padStart(2,"0"):""}`:`${m} min`;
        const pct=Math.min(100,Math.round(x.mins/120*100));
        return `<div style="margin-bottom:12px">
          <div class="row" style="justify-content:space-between;margin-bottom:5px">
            <div style="display:flex;align-items:center;gap:8px">
              <div style="width:28px;height:28px;border-radius:9px;background:${avatarColor(x.id)};display:grid;place-items:center;font-weight:900;font-size:11px;flex-shrink:0">${avatarInitials(x.name)}</div>
              <span style="font-weight:800;font-size:13px">${x.name}</span>
            </div>
            <span style="font-size:12px;color:var(--muted)">${x.unit} • <strong style="color:var(--text)">${disp}</strong></span>
          </div>
          <div style="height:6px;border-radius:999px;background:rgba(255,255,255,.08)">
            <div style="height:100%;border-radius:999px;width:${pct}%;background:linear-gradient(90deg,var(--primary),#a855f7)"></div>
          </div>
        </div>`;
      }).join("")}
    </div>`:""}`;
}

function quickSwapCard(r){
  const my=state.shifts.find(s=>s.id===r.requesterShiftId), co=state.shifts.find(s=>s.id===r.targetShiftId);
  return `<div class="carditem">
    <div style="font-weight:850;font-size:13px">Échange • ${r.requesterName||userName(r.requesterId)} ↔ ${r.targetName||userName(r.targetId)}</div>
    <div class="muted">${my?fmtDate(my.date)+" "+my.start+"–"+my.end:""} ↔ ${co?fmtDate(co.date)+" "+co.start+"–"+co.end:""}</div>
    <div class="row gap" style="margin-top:8px">
      <button class="btn small primary" data-swap-approve="${r.id}">✓ Accepter</button>
      <button class="btn small danger"  data-swap-refuse="${r.id}">✗ Refuser</button>
    </div></div>`;
}
function quickLeaveCard(r){ return `<div class="carditem">
  <div style="font-weight:850;font-size:13px">${userName(r.userId)} • ${r.type}</div>
  <div class="muted">${fmtDate(r.from)} → ${fmtDate(r.to)}${r.note?" • "+r.note:""}</div>
  <div class="row gap" style="margin-top:8px">
    <button class="btn small primary" data-leave-approve="${r.id}">✓ Accepter</button>
    <button class="btn small danger"  data-leave-refuse="${r.id}">✗ Refuser</button>
  </div></div>`; }
function quickOTCard(r){ return `<div class="carditem">
  <div style="font-weight:850;font-size:13px">${userName(r.userId)} • ${r.minutes} min supp</div>
  <div class="muted">${fmtDate(r.date)}${r.note?" • "+r.note:""}</div>
  <div class="row gap" style="margin-top:8px">
    <button class="btn small primary" data-ot-approve="${r.id}">✓ Valider</button>
    <button class="btn small danger"  data-ot-refuse="${r.id}">✗ Refuser</button>
  </div></div>`; }

// ── Planning agent ────────────────────────────────────────────────────────────
function viewPlanningAgent(){
  const u=me();
  return `
    <div class="carditem">
      <h3>Planning</h3>
      <div class="muted">Personnel + équipe (${u.unit})</div>
      <div class="hr"></div>
      ${renderIOSCalendar({mode:"agent",unit:u.unit,meId:u.id})}
    </div>
    <div class="carditem">
      <h3>Disponibilités</h3>
      <div class="muted">Déclare une indisponibilité ou un arrêt.</div>
      <div class="hr"></div>
      <div class="grid2">
        <div class="field"><label>Statut</label><select id="availStatus"><option value="available">Disponible</option><option value="unavailable">Indisponible</option><option value="sick">Arrêt maladie</option></select></div>
        <div class="field"><label>Date</label><input id="availDate" type="date" value="${iso(new Date())}"/></div>
      </div>
      <div class="field" style="margin-top:10px"><label>Note (optionnel)</label><input id="availNote" placeholder="Ex : RDV médical…"/></div>
      <button class="btn primary" id="btnSaveAvail">Enregistrer</button>
      <div class="hint" id="availResult"></div>
    </div>`;
}

// ── Échanges ──────────────────────────────────────────────────────────────────
function viewSwapsAgent(){
  const u=me();
  const myShifts=state.shifts.filter(s=>s.userId===u.id).sort((a,b)=>a.date.localeCompare(b.date));
  const colleagues=state.users.filter(x=>x.role==="agent"&&x.unit===u.unit&&x.id!==u.id);
  const history=state.swapRequests.filter(r=>r.requesterId===u.id||r.targetId===u.id).slice().reverse();
  return `
    <div class="carditem">
      <h3>Proposer un échange</h3>
      <div class="muted">Sélectionne ton horaire + celui du collègue. La direction valide.</div>
      <div class="hr"></div>
      <div class="field"><label>1) Mon horaire</label><select id="swapMyShift"><option value="">— Choisir —</option>${myShifts.map(s=>`<option value="${s.id}">${fmtDate(s.date)} • ${s.start}–${s.end} (${s.label})</option>`).join("")}</select></div>
      <div class="field" style="margin-top:10px"><label>2) Collègue</label><select id="swapColleague"><option value="">— Choisir —</option>${colleagues.map(c=>`<option value="${c.id}">${c.name}</option>`).join("")}</select></div>
      <div class="field" style="margin-top:10px"><label>3) Son horaire</label><select id="swapColShift" disabled><option value="">— Choisir le collègue d'abord —</option></select></div>
      <button class="btn primary" id="btnSendSwap">Envoyer à la direction</button>
      <div class="hint" id="swapHint"></div>
    </div>
    <div class="carditem">
      <h3>Historique</h3><div class="muted">Toutes mes demandes</div><div class="hr"></div>
      <div class="cardlist">${history.length?history.map(r=>swapCard(r)).join(""):`<div class="muted">Aucune demande pour l'instant.</div>`}</div>
    </div>`;
}

function swapCard(r){
  const my=state.shifts.find(s=>s.id===r.requesterShiftId), co=state.shifts.find(s=>s.id===r.targetShiftId);
  const rN=r.requesterName||userName(r.requesterId), tN=r.targetName||userName(r.targetId);
  const badge=r.status==="approved"?`<span class="badge ok">Validé ✓</span>`:r.status==="refused"?`<span class="badge no">Refusé ✗</span>`:`<span class="badge warn">En attente…</span>`;
  return `<div class="carditem">
    <div class="row" style="justify-content:space-between;align-items:center;gap:10px">
      <div><div style="font-weight:800">Échange • ${rN} ↔ ${tN}</div><div class="muted">${r.createdAt} • ${badge}</div></div>
    </div>
    <div class="hr"></div>
    <div class="split">
      <div class="carditem" style="padding:12px"><div class="muted">Demandeur</div><div style="font-weight:800;margin-top:4px">${my?fmtDate(my.date)+" • "+my.start+"–"+my.end:"—"}</div><div class="muted">${my?.label||""}</div></div>
      <div class="carditem" style="padding:12px"><div class="muted">Horaire visé</div><div style="font-weight:800;margin-top:4px">${co?fmtDate(co.date)+" • "+co.start+"–"+co.end:"—"}</div><div class="muted">${co?.label||""}</div></div>
    </div>
  </div>`;
}

// ── Messagerie ────────────────────────────────────────────────────────────────
function viewMessagesAgent(){
  const u=me();
  const peers=[...state.users.filter(x=>x.role==="agent"&&x.unit===u.unit&&x.id!==u.id),...state.users.filter(x=>x.role==="direction")];
  const peer=peers.find(p=>p.id===activeChatPeer)||peers[0];
  if(peer) activeChatPeer=peer.id;
  const msgs=state.messages[convo(u.id,peer?.id)]||[];
  return `
    <div class="carditem">
      <h3>Conversations</h3><div class="muted">Collègues + direction</div><div class="hr"></div>
      <div class="field"><label>Avec</label><select id="chatPeer">${peers.map(p=>`<option value="${p.id}" ${p.id===activeChatPeer?'selected':''}>${p.name}${p.role==="direction"?" (Direction)":""}</option>`).join("")}</select></div>
      <div class="hr"></div>
      <div class="chat" id="chat">
        ${msgs.length?msgs.map(m=>bubble(m,m.from===u.id)).join(""):`<div class="chat-empty">${icons.msg}<div>Démarrez la conversation avec ${peer?.name||""}…</div></div>`}
      </div>
    </div>
    <div class="chatbar">
      <button class="iconbtn primary" id="btnSwapInChat">${icons.swap}</button>
      <input id="chatInput" placeholder="Message…"/>
      <button class="iconbtn primary" id="btnSendMsg">${icons.send}</button>
    </div>`;
}

function viewMessagesDirection(){
  const u=me();
  const agents=state.users.filter(x=>x.role==="agent"); // tous les agents, toutes unités
  const peer=agents.find(a=>a.id===activeChatPeerDir)||agents[0];
  if(peer) activeChatPeerDir=peer.id;
  const msgs=state.messages[convo(u.id,peer?.id)]||[];
  return `
    <div class="carditem">
      <h3>Messagerie</h3><div class="muted">Tous les agents</div><div class="hr"></div>
      <div class="field"><label>Agent</label><select id="chatPeerDir">${agents.map(a=>`<option value="${a.id}" ${a.id===activeChatPeerDir?'selected':''}>${a.name} — ${a.unit}</option>`).join("")}</select></div>
      <div class="hr"></div>
      <div class="chat" id="chat">
        ${msgs.length?msgs.map(m=>bubble(m,m.from===u.id)).join(""):`<div class="chat-empty">${icons.msg}<div>Démarrez la conversation avec ${peer?.name||""}…</div></div>`}
      </div>
    </div>
    <div class="chatbar">
      <input id="chatInputDir" placeholder="Message à l'agent…"/>
      <button class="iconbtn primary" id="btnSendMsgDir">${icons.send}</button>
    </div>`;
}

function bubble(m,isMe){
  if(m.type==="swap") return `<div class="bubble ${isMe?'me':''}"><div style="font-weight:850">📅 Proposition d'échange</div><div style="margin-top:6px;font-size:13px">${m.summary}</div><div class="time">${m.time}</div></div>`;
  return `<div class="bubble ${isMe?'me':''}"><div>${escapeHtml(m.text)}</div><div class="time">${m.time}</div></div>`;
}

// ── Profil agent ──────────────────────────────────────────────────────────────
function viewProfileAgent(){
  const u=me(), p=state.profiles[u.id]||{userId:u.id};
  return `
    <div class="carditem">
      <h3>Profil & santé</h3><div class="muted">Visible par la direction.</div><div class="hr"></div>
      <div class="section-title">Informations personnelles</div>
      <div class="grid2">
        <div class="field"><label>Date de naissance</label><input id="p_birth" type="date" value="${p.birthDate||""}"/></div>
        <div class="field"><label>Taille (cm)</label><input id="p_height" type="number" value="${p.heightCm||""}" placeholder="165"/></div>
      </div>
      <div class="field" style="margin-top:10px"><label>Poids (kg)</label><input id="p_weight" type="number" value="${p.weightKg||""}" placeholder="65"/></div>
      <div class="hr"></div>
      <div class="section-title">Santé</div>
      <div class="field">
        <label>Allergies connues</label>
        ${tagPicker("p_allergies", p.allergies||"", [
          "Aucune connue","Pénicilline","Amoxicilline","Aspirine","AINS","Codeïne",
          "Sulfamides","Iode","Latex","Arachides","Fruits à coque","Gluten","Lactose",
          "Œufs","Soja","Poissons","Crustacés","Moisissures","Pollen","Acariens"
        ])}
      </div>
      <div class="field" style="margin-top:10px">
        <label>Traitements en cours</label>
        ${tagPicker("p_treatments", p.treatments||"", [
          "Aucun traitement","Doliprane 1g","Ibuprofène","Aspirine 100mg",
          "Lévothyrox 50µg","Lévothyrox 75µg","Lévothyrox 100µg",
          "Metformine 500mg","Metformine 850mg","Insuline",
          "Amlodipine 5mg","Bisoprolol 5mg","Ramipril 5mg","Atorvastatine 20mg",
          "Oméprazole 20mg","Pantoprazole 40mg",
          "Sertraline 50mg","Escitalopram 10mg","Lorazépam 1mg",
          "Ventoline (inhalateur)","Symbicort","Cortancyl 5mg"
        ])}
      </div>
      <div class="field" style="margin-top:10px"><label>Groupe sanguin</label><input id="p_blood" value="${p.bloodType||""}" placeholder="Ex: O+"/></div>
      <div class="field" style="margin-top:10px"><label>Notes</label><textarea id="p_notes" placeholder="Ex: asthme léger…">${p.notes||""}</textarea></div>
      <div class="hr"></div>
      <div class="section-title">Contact d'urgence</div>
      <div class="grid2">
        <div class="field"><label>Nom</label><input id="p_em_name" value="${p.emergencyName||""}" placeholder="Ex: Maman"/></div>
        <div class="field"><label>Téléphone</label><input id="p_em_phone" value="${p.emergencyPhone||""}" placeholder="06 …"/></div>
      </div>
      <button class="btn primary" id="btnSaveProfile">Enregistrer</button>
      <div class="muted" id="profileSaved">${p.updatedAt?"Dernière mise à jour : "+p.updatedAt:""}</div>
    </div>
    <div class="carditem">
      <h3>Absences / congés</h3><div class="muted">La direction sera notifiée.</div><div class="hr"></div>
      <div class="field"><label>Type</label><select id="leaveType"><option>Congés payés</option><option>Congé sans solde</option><option>Arrêt maladie</option><option>Autre</option></select></div>
      <div class="grid2" style="margin-top:10px">
        <div class="field"><label>Du</label><input type="date" id="leaveFrom" value="${iso(new Date())}"/></div>
        <div class="field"><label>Au</label><input type="date" id="leaveTo" value="${iso(new Date())}"/></div>
      </div>
      <div class="field" style="margin-top:10px"><label>Note</label><input id="leaveNote" placeholder="Optionnel"/></div>
      <button class="btn primary" id="btnSendLeave">Envoyer à la direction</button>
      <div class="hr"></div>
      <div class="section-title">Mes demandes</div>
      <div class="cardlist">${state.leaveRequests.filter(r=>r.userId===u.id).slice().reverse().map(leaveCard).join("")||`<div class="muted">Aucune demande.</div>`}</div>
    </div>
    <div class="carditem">
      <h3>Heures supplémentaires</h3><div class="muted">La direction valide.</div><div class="hr"></div>
      <div class="grid2">
        <div class="field"><label>Durée</label><select id="otMinutes"><option value="15">15 min</option><option value="30">30 min</option><option value="45">45 min</option><option value="60">1 h</option><option value="90">1 h 30</option></select></div>
        <div class="field"><label>Date</label><input type="date" id="otDate" value="${iso(new Date())}"/></div>
      </div>
      <div class="field" style="margin-top:10px"><label>Motif</label><input id="otNote" placeholder="Ex : transmission longue…"/></div>
      <button class="btn primary" id="btnSendOT">Déclarer</button>
      <div class="hr"></div>
      <div class="section-title">Mes déclarations</div>
      <div class="cardlist">${state.overtime.filter(o=>o.userId===u.id).slice().reverse().map(otCard).join("")||`<div class="muted">Aucune déclaration.</div>`}</div>
    </div>`;
}

function viewProfilesDirection(){
  const agents=state.users.filter(u=>u.role==="agent");
  return `
    <div class="carditem">
      <h3>Profils & santé</h3><div class="muted">Lecture seule • accès réservé à la direction</div><div class="hr"></div>
      <div class="cardlist">
        ${agents.map(a=>{
          const p=state.profiles[a.id]||{};
          const filled=p.birthDate||p.bloodType||p.allergies;
          return `<div class="carditem">
            <div class="row" style="justify-content:space-between;align-items:center;gap:10px">
              <div style="display:flex;align-items:center;gap:10px">
                <div style="width:36px;height:36px;border-radius:12px;background:${avatarColor(a.id)};display:grid;place-items:center;font-weight:900;font-size:13px;flex-shrink:0">${avatarInitials(a.name)}</div>
                <div><div style="font-weight:850">${a.name}</div><div class="muted">${a.unit} • ${filled?"Fiche remplie ✓":"Fiche incomplète"}</div></div>
              </div>
              <button class="btn small ghost" data-open-profile="${a.id}">Voir fiche</button>
            </div>
          </div>`;
        }).join("")}
      </div>
    </div>`;
}

// ── Validations ───────────────────────────────────────────────────────────────
function viewValidations(){
  const sp=state.swapRequests.filter(r=>r.status==="pending").slice().reverse();
  const lp=state.leaveRequests.filter(r=>r.status==="pending").slice().reverse();
  const op=state.overtime.filter(r=>r.status==="pending").slice().reverse();
  const total=sp.length+lp.length+op.length;
  return `
    <div class="carditem">
      <h3>Validations</h3><div class="muted">${total>0?`${total} demande(s) en attente`:"Aucune demande en attente 🎉"}</div><div class="hr"></div>
      <div class="section-title">Échanges (${sp.length})</div>
      <div class="cardlist">${sp.length?sp.map(r=>validationSwapCard(r)).join(""):`<div class="muted">Aucune demande.</div>`}</div>
      <div class="hr"></div>
      <div class="section-title">Absences & congés (${lp.length})</div>
      <div class="cardlist">${lp.length?lp.map(r=>validationLeaveCard(r)).join(""):`<div class="muted">Aucune demande.</div>`}</div>
      <div class="hr"></div>
      <div class="section-title">Heures supplémentaires (${op.length})</div>
      <div class="cardlist">${op.length?op.map(r=>validationOTCard(r)).join(""):`<div class="muted">Aucune déclaration.</div>`}</div>
    </div>`;
}

function validationSwapCard(r){ return `<div class="carditem">
  <div style="font-weight:850">${r.requesterName||userName(r.requesterId)} ↔ ${r.targetName||userName(r.targetId)}</div>
  <div class="muted">${r.createdAt}</div><div class="hr"></div>${swapCard(r)}
  <div class="row gap" style="margin-top:10px">
    <button class="btn small primary" data-swap-approve="${r.id}">✓ Accepter</button>
    <button class="btn small danger"  data-swap-refuse="${r.id}">✗ Refuser</button>
  </div></div>`; }
function leaveCard(r){
  const badge=r.status==="approved"?`<span class="badge ok">Approuvé</span>`:r.status==="refused"?`<span class="badge no">Refusé</span>`:`<span class="badge warn">En attente</span>`;
  return `<div class="carditem"><div style="font-weight:850">${r.type} ${badge}</div><div class="muted">${fmtDate(r.from)} → ${fmtDate(r.to)}${r.note?" • "+r.note:""}</div></div>`; }
function validationLeaveCard(r){ return `<div class="carditem">
  <div style="font-weight:850">${userName(r.userId)} • ${r.type}</div>
  <div class="muted">${fmtDate(r.from)} → ${fmtDate(r.to)}${r.note?" • "+r.note:""}</div>
  <div class="row gap" style="margin-top:10px">
    <button class="btn small primary" data-leave-approve="${r.id}">✓ Accepter</button>
    <button class="btn small danger"  data-leave-refuse="${r.id}">✗ Refuser</button>
  </div></div>`; }
function otCard(r){
  const badge=r.status==="approved"?`<span class="badge ok">Validé</span>`:r.status==="refused"?`<span class="badge no">Refusé</span>`:`<span class="badge warn">En attente</span>`;
  return `<div class="carditem"><div style="font-weight:850">${r.minutes} min ${badge}</div><div class="muted">${fmtDate(r.date)}${r.note?" • "+r.note:""}</div></div>`; }
function validationOTCard(r){ return `<div class="carditem">
  <div style="font-weight:850">${userName(r.userId)} • ${r.minutes} min</div>
  <div class="muted">${fmtDate(r.date)}${r.note?" • "+r.note:""}</div>
  <div class="row gap" style="margin-top:10px">
    <button class="btn small primary" data-ot-approve="${r.id}">✓ Valider</button>
    <button class="btn small danger"  data-ot-refuse="${r.id}">✗ Refuser</button>
  </div></div>`; }

// ── Compte ────────────────────────────────────────────────────────────────────
function viewAccount(){
  const u=me(), users=state.users.filter(x=>x.role===state.session.role);
  return `
    <div class="carditem">
      <h3>Compte</h3><div class="muted">Démo locale • changer de profil</div><div class="hr"></div>
      <div class="carditem" style="padding:12px">
        <div class="row" style="justify-content:space-between;gap:10px;align-items:center">
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:40px;height:40px;border-radius:14px;background:${avatarColor(u.id)};display:grid;place-items:center;font-weight:900;font-size:14px">${avatarInitials(u.name)}</div>
            <div><div style="font-weight:850">${u.name}</div><div class="muted">${isDirection()?"Direction":"Agent"} • ${u.unit}</div></div>
          </div>
          <button class="btn small danger" id="btnLogout">Déconnexion</button>
        </div>
      </div>
      <div class="hr"></div>
      <div class="section-title">Changer d'utilisateur</div>
      <div class="field"><label>Utilisateur</label><select id="switchUser">${users.map(x=>`<option value="${x.id}" ${x.id===u.id?'selected':''}>${x.name}</option>`).join("")}</select></div>
      <button class="btn primary" id="btnSwitchUser">Changer</button>
      <div class="hr"></div>
      <div class="section-title">Rôle</div>
      <div class="grid2">
        <button class="btn ${isDirection()?'primary':'ghost'}" id="btnRoleDir">Direction</button>
        <button class="btn ${!isDirection()?'primary':'ghost'}" id="btnRoleAgent">Agent</button>
      </div>
      <div class="muted" style="margin-top:10px">En production : connexion sécurisée par e-mail (Firebase Auth).</div>
    </div>
    <div class="carditem">
      <h3>Données locales</h3><div class="muted">Réinitialise toutes les données de démo.</div><div class="hr"></div>
      <button class="btn danger" id="btnReset">Réinitialiser la démo</button>
    </div>`;
}


// ── Tag picker (allergies / traitements) ──────────────────────────────────────
function tagPicker(id, currentValue, options){
  const selected = currentValue ? currentValue.split(",").map(s=>s.trim()).filter(Boolean) : [];
  return `
    <div class="tag-picker" id="${id}_picker">
      <div class="tag-picker-chips">
        ${options.map(opt => {
          const isSel = selected.includes(opt);
          return `<button type="button" class="tag-chip ${isSel?'sel':''}" data-picker="${id}" data-val="${escapeHtml(opt)}">${escapeHtml(opt)}</button>`;
        }).join("")}
      </div>
      <div class="tag-picker-custom">
        <input id="${id}_custom" placeholder="Autre… (Entrée pour ajouter)" style="flex:1"/>
        <button type="button" class="iconbtn" id="${id}_add">${icons.plus}</button>
      </div>
      <div class="tag-picker-selected" id="${id}_selected">
        ${selected.filter(s=>!options.includes(s)).map(s=>`<span class="tag-custom-chip" data-picker="${id}" data-val="${escapeHtml(s)}">${escapeHtml(s)} ✕</span>`).join("")}
      </div>
    </div>`;
}

function readTagPicker(id){
  const picker = document.getElementById(id+"_picker"); if(!picker) return "";
  const chips = [...picker.querySelectorAll(".tag-chip.sel")].map(c=>c.getAttribute("data-val"));
  const custom = [...picker.querySelectorAll(".tag-custom-chip")].map(c=>c.getAttribute("data-val"));
  return [...chips,...custom].join(", ");
}

function bindTagPickers(){
  document.querySelectorAll(".tag-chip").forEach(chip=>{
    chip.addEventListener("click",()=>{
      chip.classList.toggle("sel");
    });
  });
  document.querySelectorAll("[id$='_add']").forEach(btn=>{
    const pickerId = btn.id.replace("_add","");
    const input = document.getElementById(pickerId+"_custom");
    const selectedDiv = document.getElementById(pickerId+"_selected");
    function addCustom(){
      const val = (input.value||"").trim(); if(!val) return;
      const span = document.createElement("span");
      span.className = "tag-custom-chip";
      span.setAttribute("data-picker", pickerId);
      span.setAttribute("data-val", val);
      span.textContent = val+" ✕";
      span.addEventListener("click",()=>span.remove());
      selectedDiv.appendChild(span);
      input.value = "";
    }
    btn.addEventListener("click", addCustom);
    input?.addEventListener("keydown", e=>{ if(e.key==="Enter"){ e.preventDefault(); addCustom(); } });
  });
}

// ── Handlers ──────────────────────────────────────────────────────────────────
function attachHandlers(tabId){
  if(tabId==="planning"){
    document.getElementById("btnSaveAvail")?.addEventListener("click",()=>{
      const st=document.getElementById("availStatus").value, d=document.getElementById("availDate").value, note=document.getElementById("availNote").value.trim();
      const label=st==="available"?"Disponible":st==="unavailable"?"Indisponible":"Arrêt maladie";
      toast("Disponibilité enregistrée ✅");
      document.getElementById("availResult").innerHTML=`<span class="badge ok">${label}</span><span class="badge">${fmtDate(d)}</span>${note?`<span class="badge">${escapeHtml(note)}</span>`:""}`;
    });
  }

  if(tabId==="dashboard_dir"){
    document.getElementById("btnAddShift")?.addEventListener("click",openAddShiftModal);
    document.getElementById("btnGoValidations")?.addEventListener("click",()=>navigate("validations"));
    attachValidationBtns();
  }

  if(tabId==="echanges"){
    const mySel=document.getElementById("swapMyShift"), colSel=document.getElementById("swapColleague"), colShiftSel=document.getElementById("swapColShift");
    function fillColShifts(){
      const sh=state.shifts.filter(s=>s.userId===colSel.value).sort((a,b)=>a.date.localeCompare(b.date));
      colShiftSel.innerHTML=`<option value="">— Choisir —</option>`+sh.map(s=>`<option value="${s.id}">${fmtDate(s.date)} • ${s.start}–${s.end} (${s.label})</option>`).join("");
      colShiftSel.disabled=!colSel.value;
    }
    colSel?.addEventListener("change",fillColShifts); fillColShifts();
    document.getElementById("btnSendSwap")?.addEventListener("click",()=>{
      const myId=mySel.value, colId=colSel.value, colShiftId=colShiftSel.value;
      if(!myId||!colId||!colShiftId){ document.getElementById("swapHint").innerHTML=`<span class="badge no">Complète les 3 champs</span>`; return; }
      const col=state.users.find(u=>u.id===colId);
      state.swapRequests.push({id:"sw_"+Math.random().toString(16).slice(2),requesterId:state.session.userId,targetId:colId,requesterName:me().name,targetName:col?.name||colId,requesterShiftId:myId,targetShiftId:colShiftId,status:"pending",createdAt:new Date().toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"})});
      saveState(); document.getElementById("swapHint").innerHTML=`<span class="badge ok">Envoyé</span><span class="badge warn">En attente de validation</span>`;
      toast("Demande envoyée ✅"); renderTab("echanges");
    });
  }

  if(tabId==="messages"){
    document.getElementById("chatPeer")?.addEventListener("change",e=>{ activeChatPeer=e.target.value; renderTab("messages"); setTimeout(scrollChatBottom,50); });
    document.getElementById("btnSendMsg")?.addEventListener("click",sendChatMessage);
    document.getElementById("chatInput")?.addEventListener("keydown",e=>{ if(e.key==="Enter") sendChatMessage(); });
    document.getElementById("btnSwapInChat")?.addEventListener("click",openSwapModalFromChat);
    setTimeout(scrollChatBottom,50);
  }

  if(tabId==="messages_dir"){
    document.getElementById("chatPeerDir")?.addEventListener("change",e=>{ activeChatPeerDir=e.target.value; renderTab("messages_dir"); setTimeout(scrollChatBottom,50); });
    function sendDirMsg(){
      const u=me(), peerId=document.getElementById("chatPeerDir")?.value, input=document.getElementById("chatInputDir");
      const text=(input?.value||"").trim(); if(!text||!peerId) return;
      const key=convo(u.id,peerId); state.messages[key]=state.messages[key]||[];
      state.messages[key].push({from:u.id,text,time:nowTime()}); saveState(); input.value=""; renderTab("messages_dir"); setTimeout(scrollChatBottom,50);
    }
    document.getElementById("btnSendMsgDir")?.addEventListener("click",sendDirMsg);
    document.getElementById("chatInputDir")?.addEventListener("keydown",e=>{ if(e.key==="Enter") sendDirMsg(); });
    setTimeout(scrollChatBottom,50);
  }

  if(tabId==="profil"){
    bindTagPickers();
    document.getElementById("btnSaveProfile")?.addEventListener("click",()=>{
      const u=me(), p=state.profiles[u.id]||{userId:u.id};
      ["p_birth","p_height","p_weight"].forEach(id=>p[{p_birth:"birthDate",p_height:"heightCm",p_weight:"weightKg"}[id]]=document.getElementById(id).value);
      p.allergies = readTagPicker("p_allergies");
      p.treatments = readTagPicker("p_treatments");
      ["p_blood","p_notes","p_em_name","p_em_phone"].forEach(id=>p[{p_blood:"bloodType",p_notes:"notes",p_em_name:"emergencyName",p_em_phone:"emergencyPhone"}[id]]=document.getElementById(id).value.trim());
      p.updatedAt=new Date().toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"}); state.profiles[u.id]=p; saveState();
      document.getElementById("profileSaved").textContent="Dernière mise à jour : "+p.updatedAt; toast("Profil enregistré ✅");
    });
    document.getElementById("btnSendLeave")?.addEventListener("click",()=>{
      state.leaveRequests.push({id:"lv_"+Math.random().toString(16).slice(2),userId:me().id,type:document.getElementById("leaveType").value,from:document.getElementById("leaveFrom").value,to:document.getElementById("leaveTo").value,note:document.getElementById("leaveNote").value.trim(),status:"pending",createdAt:nowTime()});
      saveState(); toast("Demande envoyée ✅"); renderTab("profil");
    });
    document.getElementById("btnSendOT")?.addEventListener("click",()=>{
      state.overtime.push({id:"ot_"+Math.random().toString(16).slice(2),userId:me().id,minutes:parseInt(document.getElementById("otMinutes").value,10),date:document.getElementById("otDate").value,note:document.getElementById("otNote").value.trim(),status:"pending",createdAt:nowTime()});
      saveState(); toast("Heures supp déclarées ✅"); renderTab("profil");
    });
  }

  if(tabId==="profil_dir"){
    document.querySelectorAll("[data-open-profile]").forEach(btn=>btn.addEventListener("click",()=>openProfileModal(btn.getAttribute("data-open-profile"))));
  }

  if(tabId==="validations") attachValidationBtns();

  if(tabId==="compte"){
    document.getElementById("btnLogout")?.addEventListener("click",()=>{ state.session={role:"agent",userId:""}; saveState(); navStack=[]; currentTab="planning"; render(); });
    document.getElementById("btnSwitchUser")?.addEventListener("click",()=>{
      const uid=document.getElementById("switchUser").value;
      if(uid){ state.session.userId=uid; saveState(); navStack=[]; currentTab=isDirection()?"dashboard_dir":"planning"; toast("Utilisateur changé ✅"); render(); }
    });
    document.getElementById("btnRoleDir")?.addEventListener("click",()=>switchRole("direction"));
    document.getElementById("btnRoleAgent")?.addEventListener("click",()=>switchRole("agent"));
    document.getElementById("btnReset")?.addEventListener("click",()=>{
      if(!confirm("Réinitialiser toutes les données de démo ?\nCette action est irréversible.")) return;
      localStorage.removeItem(LS_KEY); state=loadState(); saveState(); navStack=[]; currentTab="planning"; toast("Réinitialisé ✅"); render();
    });
  }

  bindIOSCalendar();
  document.querySelectorAll(".tabbar .tab").forEach(t=>t.classList.toggle("active",t.getAttribute("data-tab")===currentTab));
}

function attachValidationBtns(){
  document.querySelectorAll("[data-swap-approve]").forEach(b=>b.addEventListener("click",()=>setSwapStatus(b.getAttribute("data-swap-approve"),"approved")));
  document.querySelectorAll("[data-swap-refuse]").forEach(b=>b.addEventListener("click",()=>setSwapStatus(b.getAttribute("data-swap-refuse"),"refused")));
  document.querySelectorAll("[data-leave-approve]").forEach(b=>b.addEventListener("click",()=>setLeaveStatus(b.getAttribute("data-leave-approve"),"approved")));
  document.querySelectorAll("[data-leave-refuse]").forEach(b=>b.addEventListener("click",()=>setLeaveStatus(b.getAttribute("data-leave-refuse"),"refused")));
  document.querySelectorAll("[data-ot-approve]").forEach(b=>b.addEventListener("click",()=>setOTStatus(b.getAttribute("data-ot-approve"),"approved")));
  document.querySelectorAll("[data-ot-refuse]").forEach(b=>b.addEventListener("click",()=>setOTStatus(b.getAttribute("data-ot-refuse"),"refused")));
}

// ── Actions ───────────────────────────────────────────────────────────────────
function switchRole(role){
  state.session.role=role; state.session.userId=state.users.find(u=>u.role===role)?.id||""; saveState(); navStack=[];
  currentTab=role==="direction"?"dashboard_dir":"planning"; toast("Rôle changé ✅"); render();
}
function sendChatMessage(){
  const u=me(), peerId=document.getElementById("chatPeer").value, input=document.getElementById("chatInput"), text=(input.value||"").trim();
  if(!text) return;
  const key=convo(u.id,peerId); state.messages[key]=state.messages[key]||[];
  state.messages[key].push({from:u.id,text,time:nowTime()}); saveState(); input.value=""; renderTab("messages"); setTimeout(scrollChatBottom,50);
}
function openSwapModalFromChat(){
  const u=me(), peerId=document.getElementById("chatPeer").value;
  const myShifts=state.shifts.filter(s=>s.userId===u.id).sort((a,b)=>a.date.localeCompare(b.date));
  const peerShifts=state.shifts.filter(s=>s.userId===peerId).sort((a,b)=>a.date.localeCompare(b.date));
  openModal("Proposer un échange",`
    <div class="muted">Choisis ton horaire + celui du collègue.</div><div class="hr"></div>
    <div class="field"><label>Mon horaire</label><select id="m_my"><option value="">—</option>${myShifts.map(s=>`<option value="${s.id}">${fmtDate(s.date)} • ${s.start}–${s.end}</option>`).join("")}</select></div>
    <div class="field" style="margin-top:10px"><label>Horaire du collègue</label><select id="m_peer"><option value="">—</option>${peerShifts.map(s=>`<option value="${s.id}">${fmtDate(s.date)} • ${s.start}–${s.end}</option>`).join("")}</select></div>
    <div class="field" style="margin-top:10px"><label>Commentaire</label><input id="m_note" placeholder="Optionnel…"></div>`,
  `<button class="btn ghost" id="m_cancel">Annuler</button><button class="btn primary" id="m_send">Envoyer</button>`);
  document.getElementById("m_cancel").onclick=closeModal;
  document.getElementById("m_send").onclick=()=>{
    const myId=document.getElementById("m_my").value, peerShiftId=document.getElementById("m_peer").value, note=document.getElementById("m_note").value.trim();
    if(!myId||!peerShiftId){ toast("Choisis les deux horaires"); return; }
    const peer=state.users.find(u=>u.id===peerId);
    const req={id:"sw_"+Math.random().toString(16).slice(2),requesterId:u.id,targetId:peerId,requesterName:me().name,targetName:peer?.name||peerId,requesterShiftId:myId,targetShiftId:peerShiftId,status:"pending",createdAt:new Date().toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"})};
    state.swapRequests.push(req);
    const key=convo(u.id,peerId); state.messages[key]=state.messages[key]||[];
    const my=state.shifts.find(s=>s.id===myId), pe=state.shifts.find(s=>s.id===peerShiftId);
    state.messages[key].push({from:u.id,type:"swap",summary:`${fmtDate(my.date)} ${my.start}–${my.end} ↔ ${fmtDate(pe.date)} ${pe.start}–${pe.end}${note?" • "+note:""}`,time:nowTime()});
    saveState(); closeModal(); toast("Échange envoyé ✅"); renderTab("messages"); setTimeout(scrollChatBottom,50);
  };
}

function openAddShiftModal(){
  const agents=state.users.filter(u=>u.role==="agent");
  openModal("Ajouter un horaire",`
    <div class="field"><label>Agent</label><select id="as_agent">${agents.map(a=>`<option value="${a.id}">${a.name} — ${a.unit}</option>`).join("")}</select></div>
    <div class="grid2" style="margin-top:10px">
      <div class="field"><label>Date</label><input type="date" id="as_date" value="${iso(new Date())}"/></div>
      <div class="field"><label>Poste</label><select id="as_label"><option value="Matin">Matin (07:00–14:00)</option><option value="Soir">Soir (14:00–21:30)</option><option value="Nuit">Nuit (21:30–07:00)</option></select></div>
    </div>
    <div class="grid2" style="margin-top:10px">
      <div class="field"><label>Début</label><input type="time" id="as_start" value="07:00"/></div>
      <div class="field"><label>Fin</label><input type="time" id="as_end" value="14:00"/></div>
    </div>`,
  `<button class="btn ghost" id="as_cancel">Annuler</button><button class="btn primary" id="as_save">Enregistrer</button>`);
  document.getElementById("as_label")?.addEventListener("change",e=>{
    const m={Matin:["07:00","14:00"],Soir:["14:00","21:30"],Nuit:["21:30","07:00"]}[e.target.value]||["07:00","14:00"];
    document.getElementById("as_start").value=m[0]; document.getElementById("as_end").value=m[1];
  });
  document.getElementById("as_cancel").onclick=closeModal;
  document.getElementById("as_save").onclick=()=>{
    const agentId=document.getElementById("as_agent").value, agent=state.users.find(u=>u.id===agentId);
    const date=document.getElementById("as_date").value, label=document.getElementById("as_label").value;
    const start=document.getElementById("as_start").value, end=document.getElementById("as_end").value;
    if(!date||!start||!end){ toast("Complète tous les champs"); return; }
    state.shifts.push({id:"s_"+Math.random().toString(16).slice(2),userId:agentId,unit:agent?.unit||"Unité A",date,start,end,label});
    saveState(); closeModal(); toast("Horaire ajouté ✅"); renderTab("dashboard_dir");
  };
}

function setSwapStatus(id,status){
  const r=state.swapRequests.find(x=>x.id===id); if(!r) return; r.status=status;
  if(status==="approved"){ const s1=state.shifts.find(s=>s.id===r.requesterShiftId), s2=state.shifts.find(s=>s.id===r.targetShiftId); if(s1&&s2){const tmp=s1.userId;s1.userId=s2.userId;s2.userId=tmp;} }
  saveState(); toast(status==="approved"?"Échange validé ✅ — planning mis à jour":"Échange refusé ❌"); renderTab(currentTab);
}
function setLeaveStatus(id,status){ const r=state.leaveRequests.find(x=>x.id===id); if(!r) return; r.status=status; saveState(); toast(status==="approved"?"Congé approuvé ✅":"Congé refusé ❌"); renderTab(currentTab); }
function setOTStatus(id,status){ const r=state.overtime.find(x=>x.id===id); if(!r) return; r.status=status; saveState(); toast(status==="approved"?"Heures supp validées ✅":"Heures supp refusées ❌"); renderTab(currentTab); }

function openProfileModal(uid){
  const u=state.users.find(x=>x.id===uid), p=state.profiles[uid]||{};
  openModal("Profil & santé",`
    <div class="carditem" style="padding:12px;display:flex;align-items:center;gap:12px">
      <div style="width:44px;height:44px;border-radius:14px;background:${avatarColor(uid)};display:grid;place-items:center;font-weight:900;font-size:16px;flex-shrink:0">${avatarInitials(u.name)}</div>
      <div><div style="font-weight:850">${u.name}</div><div class="muted">${u.unit}</div></div>
    </div><div class="hr"></div>
    <div class="section-title">Informations</div>
    <div class="carditem" style="padding:12px">
      <div class="muted">Naissance</div><div style="font-weight:850">${p.birthDate||"—"}</div><div class="hr"></div>
      <div class="muted">Taille / Poids</div><div style="font-weight:850">${p.heightCm||"—"} cm • ${p.weightKg||"—"} kg</div><div class="hr"></div>
      <div class="muted">Groupe sanguin</div><div style="font-weight:850">${escapeHtml(p.bloodType||"—")}</div>
    </div><div class="hr"></div>
    <div class="section-title">Santé</div>
    <div class="carditem" style="padding:12px">
      <div class="muted">Allergies</div><div style="white-space:pre-wrap;margin-top:4px">${escapeHtml(p.allergies||"—")}</div><div class="hr"></div>
      <div class="muted">Traitements</div><div style="white-space:pre-wrap;margin-top:4px">${escapeHtml(p.treatments||"—")}</div><div class="hr"></div>
      <div class="muted">Notes</div><div style="white-space:pre-wrap;margin-top:4px">${escapeHtml(p.notes||"—")}</div>
    </div><div class="hr"></div>
    <div class="section-title">Contact d'urgence</div>
    <div class="carditem" style="padding:12px">
      <div class="muted">Nom</div><div style="font-weight:850">${escapeHtml(p.emergencyName||"—")}</div>
      <div class="muted" style="margin-top:8px">Téléphone</div><div style="font-weight:850">${escapeHtml(p.emergencyPhone||"—")}</div>
    </div>
    <div class="muted" style="margin-top:10px">${p.updatedAt?"Mise à jour : "+p.updatedAt:""}</div>`,
  `<button class="btn primary" id="btnCloseP">Fermer</button>`);
  document.getElementById("btnCloseP").onclick=closeModal;
}

function openModal(title,bodyHtml,footHtml){
  document.getElementById("modalTitle").textContent=title;
  document.getElementById("modalBody").innerHTML=bodyHtml;
  document.getElementById("modalFoot").innerHTML=footHtml||"";
  const bd=document.getElementById("modalBackdrop"); bd.classList.remove("hidden");
  document.getElementById("btnModalClose").onclick=closeModal;
  bd.addEventListener("click",e=>{if(e.target===bd)closeModal();},{once:true});
}
function closeModal(){
  document.getElementById("modalBackdrop").classList.add("hidden");
  document.getElementById("modalBody").innerHTML=""; document.getElementById("modalFoot").innerHTML="";
}
function toast(msg){ const el=document.getElementById("toast"); if(!el) return; el.textContent=msg; el.classList.remove("hidden"); clearTimeout(window.__toastTimer); window.__toastTimer=setTimeout(()=>el.classList.add("hidden"),2400); }
function userName(id){ return state.users.find(u=>u.id===id)?.name||id; }
function convo(a,b){ return [a,b].sort().join("_"); }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function scrollChatBottom(){ const c=document.getElementById("chat"); if(c) c.scrollIntoView({block:"end"}); }

// ── Fix clavier mobile ────────────────────────────────────────────────────────
function bindKeyboardFix(){
  if(!window.visualViewport) return;
  const update=()=>{
    const bar=document.querySelector(".chatbar"); if(!bar) return;
    const offset=window.innerHeight-window.visualViewport.height-window.visualViewport.offsetTop;
    bar.style.transform=`translateX(-50%) translateY(${-Math.max(0,offset)}px)`;
  };
  window.visualViewport.addEventListener("resize",update);
  window.visualViewport.addEventListener("scroll",update);
}

// ── Calendrier iOS ────────────────────────────────────────────────────────────
function bindIOSCalendar(){
  const wrap=document.querySelector("[data-ioscal='1']"); if(!wrap) return;
  wrap.querySelector("[data-cal-prev]")?.addEventListener("click",()=>{
    state.ui=state.ui||{}; const ym=state.ui.calendarYM||{y:new Date().getFullYear(),m:new Date().getMonth()};
    let {y,m}=ym; m--; if(m<0){m=11;y--;} state.ui.calendarYM={y,m}; saveState(); renderTab(currentTab);
  });
  wrap.querySelector("[data-cal-next]")?.addEventListener("click",()=>{
    state.ui=state.ui||{}; const ym=state.ui.calendarYM||{y:new Date().getFullYear(),m:new Date().getMonth()};
    let {y,m}=ym; m++; if(m>11){m=0;y++;} state.ui.calendarYM={y,m}; saveState(); renderTab(currentTab);
  });
  wrap.querySelectorAll("[data-cal-unit]").forEach(btn=>btn.addEventListener("click",()=>{
    state.ui=state.ui||{}; state.ui.calendarUnit=btn.getAttribute("data-cal-unit"); saveState(); renderTab(currentTab);
  }));
  wrap.querySelectorAll("[data-cal-date]").forEach(cell=>{
    if(cell.classList.contains("off")) return;
    const di=cell.getAttribute("data-cal-date");
    cell.addEventListener("click",()=>{
      state.ui=state.ui||{}; state.ui.calendarSelectedIso=di; saveState();
      wrap.querySelectorAll(".ioscal-cell").forEach(c=>c.classList.toggle("sel",c.getAttribute("data-cal-date")===di));
      const u=me(), mode=isDirection()?"direction":"agent", calUnit=getCalUnit(mode,u);
      document.getElementById("iosCalDetail").innerHTML=renderDayDetail(di,{mode,unit:calUnit,meId:isDirection()?state.session.userId:u.id});
    });
  });
}

function getCalUnit(mode,u){ if(mode==="direction"){ state.ui=state.ui||{}; return state.ui.calendarUnit||"Unité A"; } return u?.unit||"Unité A"; }
function sameDay(a,b){ return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate(); }

function renderIOSCalendar({mode,unit,meId}){
  state.ui=state.ui||{}; const today=new Date();
  const ym=state.ui.calendarYM||{y:today.getFullYear(),m:today.getMonth()}, {y,m}=ym;
  const first=new Date(y,m,1), daysInMonth=new Date(y,m+1,0).getDate(), dow=(first.getDay()+6)%7;
  const cells=[]; for(let i=0;i<42;i++){ const dn=i-dow+1; cells.push({date:new Date(y,m,dn),off:dn<1||dn>daysInMonth}); }
  const selIso=state.ui.calendarSelectedIso||iso(today);
  const calUnit=getCalUnit(mode,me());
  const units=[...new Set(state.shifts.map(s=>s.unit))].sort();
  const mLabel=new Date(y,m,1).toLocaleDateString("fr-FR",{month:"long",year:"numeric"});

  return `<div class="ioscal-wrap" data-ioscal="1">
    <div class="ioscal-head">
      <div><div class="ioscal-title">${capitalize(mLabel)}</div><div class="muted">Appuyez sur un jour pour voir le détail</div></div>
      <div class="ioscal-nav">
        <button class="iconbtn" data-cal-prev>${icons.chevLeft}</button>
        <button class="iconbtn" data-cal-next>${icons.chevRight}</button>
      </div>
    </div>
    ${mode==="direction"?`<div style="display:flex;gap:8px;padding:10px 12px 0;flex-wrap:wrap">${units.map(u2=>`<button class="pill" data-cal-unit="${u2}" style="${calUnit===u2?"background:rgba(79,140,255,.18);border-color:rgba(79,140,255,.45);color:#cfe0ff":""}">${u2}</button>`).join("")}</div>`:""}
    <div class="ioscal-dow"><div>L</div><div>M</div><div>M</div><div>J</div><div>V</div><div style="color:rgba(255,200,100,.85)">S</div><div style="color:rgba(255,110,110,.85)">D</div></div>
    <div class="ioscal-grid">
      ${cells.map(c=>{
        const di=iso(c.date), isToday=sameDay(c.date,today), isSel=di===selIso;
        const myShifts=state.shifts.filter(s=>s.userId===meId&&s.date===di);
        const unitSh=state.shifts.filter(s=>s.unit===calUnit&&s.date===di);
        const dw=c.date.getDay(), numStyle=(dw===0||dw===6)&&!c.off?"color:rgba(255,150,150,.9)":"";
        const dots=[];
        if(myShifts.length) dots.push(`<span class="dot me"></span>`);
        if(unitSh.some(s=>s.label!=="Nuit")) dots.push(`<span class="dot unit"></span>`);
        if(unitSh.some(s=>s.label==="Nuit")) dots.push(`<span class="dot night"></span>`);
        return `<div class="ioscal-cell ${c.off?"off":""} ${isToday?"today":""} ${isSel?"sel":""}" data-cal-date="${di}">
          <div class="num" style="${numStyle}">${c.date.getDate()}</div>
          ${dots.length?`<div class="dots">${dots.join("")}</div>`:""}
        </div>`;
      }).join("")}
    </div>
    <div class="ioscal-detail" id="iosCalDetail">${renderDayDetail(selIso,{mode,unit:calUnit,meId})}</div>
  </div>`;
}

function renderDayDetail(dayIso,{mode,unit,meId}){
  const d=new Date(dayIso+"T00:00:00"), title=d.toLocaleDateString("fr-FR",{weekday:"long",day:"2-digit",month:"long"});
  const my=state.shifts.filter(s=>s.userId===meId&&s.date===dayIso);
  const unitSh=state.shifts.filter(s=>s.unit===unit&&s.date===dayIso);
  const lines=[];
  if(mode==="agent"){
    if(my.length) my.forEach(s=>lines.push(detailLine(`${s.start}–${s.end}`,s.label,"Moi",shiftCls(s.label))));
    else lines.push(`<div class="muted">Aucun horaire personnel ce jour.</div>`);
    if(unitSh.length){ lines.push(`<div class="muted" style="margin:10px 0 6px">Équipe — ${unit}</div>`); unitSh.forEach(s=>lines.push(detailLine(`${s.start}–${s.end}`,s.label,s.userId===meId?"Moi":userName(s.userId),shiftCls(s.label)))); }
  } else {
    if(unitSh.length) unitSh.forEach(s=>lines.push(detailLine(`${s.start}–${s.end}`,s.label,userName(s.userId),shiftCls(s.label))));
    else lines.push(`<div class="muted">Aucun horaire dans l'unité ce jour.</div>`);
  }
  return `<h4>${capitalize(title)}</h4>${lines.join("")}`;
}

function detailLine(time,label,tagText,tagClass){ return `<div class="detail-line"><div class="left"><div style="font-weight:900">${time}</div><div class="muted">${escapeHtml(label)}</div></div><span class="tag ${tagClass}">${escapeHtml(tagText)}</span></div>`; }
function capitalize(s){ return s?s.charAt(0).toUpperCase()+s.slice(1):s; }

// ── Boot ──────────────────────────────────────────────────────────────────────
render();
saveState();
