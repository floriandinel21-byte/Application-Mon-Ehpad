/*
  EHPAD Staff — Démo web locale (app-like)
  v3 : données enrichies + améliorations UX
  - 3 agents nommés + direction
  - ~26 horaires sur le mois en cours
  - Profils santé pré-remplis
  - Demandes d'échange / congés / heures supp existantes
  - Messagerie direction fonctionnelle
  - Chevrons ‹ › pour le calendrier
  - Badge rouge "Valider" si demandes en attente
  - L'approbation d'un échange swap vraiment les horaires
  - Confirmation avant réinitialisation
*/

const LS_KEY = "ehpad_demo_state_v3"; // bump → repart sur les nouvelles données

const icons = {
  calendar: `<svg viewBox="0 0 24 24"><path d="M7 2v3M17 2v3M3 8h18M5 5h14a2 2 0 012 2v13a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  swap:     `<svg viewBox="0 0 24 24"><path d="M7 7h14l-3-3M17 17H3l3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  msg:      `<svg viewBox="0 0 24 24"><path d="M21 15a4 4 0 01-4 4H8l-5 3V7a4 4 0 014-4h10a4 4 0 014 4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`,
  heart:    `<svg viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 22l7.8-8.6 1-1a5.5 5.5 0 000-7.8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`,
  check:    `<svg viewBox="0 0 24 24"><path d="M9 12l2 2 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 12a8 8 0 11-16 0 8 8 0 0116 0z" fill="none" stroke="currentColor" stroke-width="2"/></svg>`,
  account:  `<svg viewBox="0 0 24 24"><path d="M20 21a8 8 0 10-16 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 13a4 4 0 100-8 4 4 0 000 8z" fill="none" stroke="currentColor" stroke-width="2"/></svg>`,
  chevLeft: `<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  chevRight:`<svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  send:     `<svg viewBox="0 0 24 24"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
};

// ── Helpers de base ───────────────────────────────────────────────────────────
function nowTime(){
  return new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
}
function iso(d){ return d.toISOString().slice(0,10); }
function daysFromNow(n){
  const d = new Date(); d.setDate(d.getDate()+n); return iso(d);
}
function fmtDate(isoDate){
  const d = new Date(isoDate+"T00:00:00");
  return d.toLocaleDateString("fr-FR",{weekday:"short", day:"2-digit", month:"short"});
}
function pendingCount(){
  return state.swapRequests.filter(r=>r.status==="pending").length
       + state.leaveRequests.filter(r=>r.status==="pending").length
       + state.overtime.filter(r=>r.status==="pending").length;
}

// ── Données de démo enrichies ─────────────────────────────────────────────────
function loadState(){
  const raw = localStorage.getItem(LS_KEY);
  if(raw){ try { return JSON.parse(raw); } catch {} }

  const users = [
    {id:"u1", name:"Marie Dupont",    unit:"Unité A", role:"agent",     email:"marie.dupont@ehpad.fr"},
    {id:"u2", name:"Thomas Bernard",  unit:"Unité A", role:"agent",     email:"thomas.bernard@ehpad.fr"},
    {id:"u3", name:"Isabelle Martin", unit:"Unité B", role:"agent",     email:"isabelle.martin@ehpad.fr"},
    {id:"d1", name:"Mme Robert",      unit:"Direction", role:"direction", email:"direction@ehpad.fr"}
  ];

  // ~26 horaires répartis sur les 3 semaines autour d'aujourd'hui
  const shifts = [
    // Marie (u1) — Unité A
    {id:"s1",  userId:"u1", unit:"Unité A", date:daysFromNow(-5), start:"07:00", end:"14:00", label:"Matin"},
    {id:"s2",  userId:"u1", unit:"Unité A", date:daysFromNow(-4), start:"14:00", end:"21:30", label:"Soir"},
    {id:"s3",  userId:"u1", unit:"Unité A", date:daysFromNow(-2), start:"14:00", end:"21:30", label:"Soir"},
    {id:"s4",  userId:"u1", unit:"Unité A", date:daysFromNow(-1), start:"21:30", end:"07:00", label:"Nuit"},
    {id:"s5",  userId:"u1", unit:"Unité A", date:daysFromNow(0),  start:"07:00", end:"14:00", label:"Matin"},
    {id:"s6",  userId:"u1", unit:"Unité A", date:daysFromNow(2),  start:"07:00", end:"14:00", label:"Matin"},
    {id:"s7",  userId:"u1", unit:"Unité A", date:daysFromNow(3),  start:"14:00", end:"21:30", label:"Soir"},
    {id:"s8",  userId:"u1", unit:"Unité A", date:daysFromNow(5),  start:"07:00", end:"14:00", label:"Matin"},
    {id:"s9",  userId:"u1", unit:"Unité A", date:daysFromNow(6),  start:"07:00", end:"14:00", label:"Matin"},
    // Thomas (u2) — Unité A
    {id:"s10", userId:"u2", unit:"Unité A", date:daysFromNow(-5), start:"14:00", end:"21:30", label:"Soir"},
    {id:"s11", userId:"u2", unit:"Unité A", date:daysFromNow(-3), start:"07:00", end:"14:00", label:"Matin"},
    {id:"s12", userId:"u2", unit:"Unité A", date:daysFromNow(-1), start:"07:00", end:"14:00", label:"Matin"},
    {id:"s13", userId:"u2", unit:"Unité A", date:daysFromNow(0),  start:"14:00", end:"21:30", label:"Soir"},
    {id:"s14", userId:"u2", unit:"Unité A", date:daysFromNow(1),  start:"07:00", end:"14:00", label:"Matin"},
    {id:"s15", userId:"u2", unit:"Unité A", date:daysFromNow(3),  start:"07:00", end:"14:00", label:"Matin"},
    {id:"s16", userId:"u2", unit:"Unité A", date:daysFromNow(4),  start:"21:30", end:"07:00", label:"Nuit"},
    {id:"s17", userId:"u2", unit:"Unité A", date:daysFromNow(7),  start:"14:00", end:"21:30", label:"Soir"},
    {id:"s18", userId:"u2", unit:"Unité A", date:daysFromNow(8),  start:"07:00", end:"14:00", label:"Matin"},
    // Isabelle (u3) — Unité B
    {id:"s19", userId:"u3", unit:"Unité B", date:daysFromNow(-5), start:"07:00", end:"14:00", label:"Matin"},
    {id:"s20", userId:"u3", unit:"Unité B", date:daysFromNow(-3), start:"21:30", end:"07:00", label:"Nuit"},
    {id:"s21", userId:"u3", unit:"Unité B", date:daysFromNow(-1), start:"07:00", end:"14:00", label:"Matin"},
    {id:"s22", userId:"u3", unit:"Unité B", date:daysFromNow(1),  start:"14:00", end:"21:30", label:"Soir"},
    {id:"s23", userId:"u3", unit:"Unité B", date:daysFromNow(2),  start:"07:00", end:"14:00", label:"Matin"},
    {id:"s24", userId:"u3", unit:"Unité B", date:daysFromNow(4),  start:"07:00", end:"14:00", label:"Matin"},
    {id:"s25", userId:"u3", unit:"Unité B", date:daysFromNow(6),  start:"14:00", end:"21:30", label:"Soir"},
    {id:"s26", userId:"u3", unit:"Unité B", date:daysFromNow(8),  start:"07:00", end:"14:00", label:"Matin"},
  ];

  const swapRequests = [
    {
      id:"sw1", requesterId:"u1", targetId:"u2",
      requesterShiftId:"s6", targetShiftId:"s14",
      status:"pending",
      createdAt: new Date(Date.now()-3600000*2).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"})
    },
    {
      id:"sw2", requesterId:"u2", targetId:"u1",
      requesterShiftId:"s10", targetShiftId:"s1",
      status:"approved",
      createdAt: new Date(Date.now()-86400000*4).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"})
    },
    {
      id:"sw3", requesterId:"u1", targetId:"u2",
      requesterShiftId:"s8", targetShiftId:"s17",
      status:"refused",
      createdAt: new Date(Date.now()-86400000*6).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"})
    }
  ];

  const leaveRequests = [
    {
      id:"lv1", userId:"u1", type:"Congés payés",
      from:daysFromNow(15), to:daysFromNow(19),
      note:"Congés de printemps planifiés",
      status:"pending",
      createdAt: new Date(Date.now()-86400000*2).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"})
    },
    {
      id:"lv2", userId:"u2", type:"Arrêt maladie",
      from:daysFromNow(-7), to:daysFromNow(-6),
      note:"Grippe — certificat fourni",
      status:"approved",
      createdAt: new Date(Date.now()-86400000*8).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"})
    },
    {
      id:"lv3", userId:"u3", type:"Congé sans solde",
      from:daysFromNow(10), to:daysFromNow(10),
      note:"Démarches administratives",
      status:"pending",
      createdAt: new Date(Date.now()-86400000*1).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"})
    }
  ];

  const overtime = [
    {
      id:"ot1", userId:"u1", minutes:30,
      date:daysFromNow(-4),
      note:"Fin de poste retardée — transmission longue",
      status:"pending",
      createdAt: new Date(Date.now()-86400000*4).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"})
    },
    {
      id:"ot2", userId:"u2", minutes:15,
      date:daysFromNow(-3),
      note:"Remplacement collègue absent 15 min",
      status:"approved",
      createdAt: new Date(Date.now()-86400000*3).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"})
    }
  ];

  const profiles = {
    u1: {
      userId:"u1", birthDate:"1985-04-12", heightCm:"165", weightKg:"58",
      allergies:"Aucune connue",
      treatments:"Aucun traitement en cours",
      bloodType:"A+",
      notes:"Asthme léger — inhalateur disponible en salle de pause.",
      emergencyName:"Jean Dupont", emergencyPhone:"06 12 34 56 78",
      updatedAt: new Date(Date.now()-86400000*10).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"})
    },
    u2: {
      userId:"u2", birthDate:"1990-11-03", heightCm:"178", weightKg:"76",
      allergies:"Pénicilline (réaction cutanée)",
      treatments:"Aucun traitement en cours",
      bloodType:"O+",
      notes:"",
      emergencyName:"Sophie Bernard", emergencyPhone:"06 98 76 54 32",
      updatedAt: new Date(Date.now()-86400000*15).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"})
    },
    u3: {
      userId:"u3", birthDate:"1988-07-22", heightCm:"162", weightKg:"62",
      allergies:"Latex",
      treatments:"Lévothyrox 50 µg — 1 cp/j le matin à jeun",
      bloodType:"B+",
      notes:"Hypothyroïdie — bilan sanguin annuel à prévoir.",
      emergencyName:"Pierre Martin", emergencyPhone:"06 55 44 33 22",
      updatedAt: new Date(Date.now()-86400000*20).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"})
    }
  };

  const messages = {
    u1_u2: [
      {from:"u2", text:"Salut Marie ! Tu peux prendre mon soir du "+fmtDate(daysFromNow(3))+" ?", time:"08:45"},
      {from:"u1", text:"Je regarde… je suis déjà du matin ce jour-là.", time:"09:02"},
      {from:"u2", text:"Ah ok, alors je vais faire une demande d'échange via l'app 👍", time:"09:05"},
      {from:"u1", text:"Parfait, j'accepte si la direction valide !", time:"09:08"},
    ],
    d1_u1: [
      {from:"d1", text:"Bonjour Marie, votre demande de congés a bien été reçue.", time:"10:15"},
      {from:"u1", text:"Merci Mme Robert, je reste disponible si besoin.", time:"10:32"},
    ],
    d1_u2: [
      {from:"u2", text:"Bonjour, l'arrêt maladie a bien été enregistré dans le système ?", time:"14:00"},
      {from:"d1", text:"Oui Thomas, tout est en ordre. Bon rétablissement !", time:"14:12"},
    ]
  };

  return {
    session: {role:"agent", userId:"u1"},
    users, shifts, swapRequests, leaveRequests, overtime, profiles, messages,
    ui: {}
  };
}

function saveState(){ localStorage.setItem(LS_KEY, JSON.stringify(state)); }

// ── App state ─────────────────────────────────────────────────────────────────
let state = loadState();

const root     = document.getElementById("root");
const tplLogin = document.getElementById("tpl-login");
const tplShell = document.getElementById("tpl-shell");

let navStack        = [];
let currentTab      = "planning";
let activeChatPeer  = "u2";       // agent side
let activeChatPeerDir = "u1";     // direction side

const tabsAgent = [
  {id:"planning", label:"Planning", icon:"calendar"},
  {id:"echanges", label:"Échanges", icon:"swap"},
  {id:"messages", label:"Messages", icon:"msg"},
  {id:"profil",   label:"Profil",   icon:"heart"},
  {id:"compte",   label:"Compte",   icon:"account"},
];
const tabsDirection = [
  {id:"planning_dir",  label:"Planning", icon:"calendar"},
  {id:"validations",   label:"Valider",  icon:"check"},
  {id:"messages_dir",  label:"Messages", icon:"msg"},
  {id:"profil_dir",    label:"Profils",  icon:"heart"},
  {id:"compte",        label:"Compte",   icon:"account"},
];

// ── Rendu principal ───────────────────────────────────────────────────────────
function render(){
  root.innerHTML = "";
  if(!state.session?.userId){
    root.appendChild(tplLogin.content.cloneNode(true));
    setupLogin();
    return;
  }
  root.appendChild(tplShell.content.cloneNode(true));
  setupShell();
  renderTab(currentTab);
}

function setupLogin(){
  const roleSel  = document.getElementById("loginRole");
  const userSel  = document.getElementById("loginUser");
  roleSel.value  = state.session?.role || "agent";

  function fillUsers(){
    const users = state.users.filter(u => u.role === roleSel.value);
    userSel.innerHTML = users.map(u => `<option value="${u.id}">${u.name} — ${u.unit}</option>`).join("");
    userSel.value = users[0]?.id || "";
  }
  roleSel.addEventListener("change", fillUsers);
  fillUsers();

  document.getElementById("btnLogin").addEventListener("click", () => {
    state.session.role   = roleSel.value;
    state.session.userId = userSel.value;
    saveState();
    currentTab = (state.session.role === "direction") ? "planning_dir" : "planning";
    render();
    toast("Connecté ✅");
  });
}

function setupShell(){
  const tabs  = (state.session.role === "direction") ? tabsDirection : tabsAgent;
  const count = pendingCount();
  const tabbar = document.getElementById("tabbar");

  tabbar.innerHTML = tabs.map(t => {
    // Badge rouge sur l'onglet Validations si demandes en attente
    const badge = (t.id === "validations" && count > 0)
      ? `<span style="position:absolute;top:4px;right:6px;background:var(--danger);color:#fff;font-size:10px;font-weight:900;border-radius:999px;padding:1px 5px;min-width:16px;text-align:center;line-height:1.4">${count}</span>`
      : "";
    return `<div class="tab ${t.id===currentTab?'active':''}" data-tab="${t.id}" style="position:relative">
      ${icons[t.icon]}${badge}
      <span>${t.label}</span>
    </div>`;
  }).join("");

  tabbar.querySelectorAll(".tab").forEach(el => {
    el.addEventListener("click", () => navigate(el.getAttribute("data-tab")));
  });

  document.getElementById("btnBack").addEventListener("click", () => {
    if(navStack.length){ currentTab = navStack.pop(); render(); }
    else toast("Vous êtes déjà à la racine 🙂");
  });
  document.getElementById("btnAccount").addEventListener("click", () => navigate("compte"));
  updateHeader();
}

function navigate(tabId){
  if(tabId === currentTab) return;
  navStack.push(currentTab);
  currentTab = tabId;
  render();
}

function updateHeader(){
  const title    = document.getElementById("appTitle");
  const subtitle = document.getElementById("appSubtitle");
  const me2      = state.users.find(u => u.id === state.session.userId);
  subtitle.textContent = `${me2?.name||""} • ${state.session.role==="direction"?"Direction":"Agent"}`;
  const map = {
    planning:"Planning", echanges:"Échanges", messages:"Messagerie",
    profil:"Profil & santé", compte:"Compte",
    planning_dir:"Planning", validations:"Validations",
    messages_dir:"Messagerie", profil_dir:"Profils & santé"
  };
  title.textContent = map[currentTab] || "EHPAD";
}

function renderTab(tabId){
  updateHeader();
  const main = document.getElementById("main");
  const role = state.session.role;
  if(role === "agent"){
    if(tabId==="planning")  main.innerHTML = viewPlanningAgent();
    else if(tabId==="echanges")  main.innerHTML = viewSwapsAgent();
    else if(tabId==="messages")  main.innerHTML = viewMessagesAgent();
    else if(tabId==="profil")    main.innerHTML = viewProfileAgent();
    else if(tabId==="compte")    main.innerHTML = viewAccount();
  } else {
    if(tabId==="planning_dir")  main.innerHTML = viewPlanningDirection();
    else if(tabId==="validations")   main.innerHTML = viewValidations();
    else if(tabId==="messages_dir")  main.innerHTML = viewMessagesDirection();
    else if(tabId==="profil_dir")    main.innerHTML = viewProfilesDirection();
    else if(tabId==="compte")        main.innerHTML = viewAccount();
  }
  attachHandlers(tabId);
}

function me(){ return state.users.find(u => u.id === state.session.userId); }
function isDirection(){ return state.session.role === "direction"; }

// ── Planning ──────────────────────────────────────────────────────────────────
function viewPlanningAgent(){
  const u = me();
  return `
    <div class="carditem">
      <h3>Planning</h3>
      <div class="muted">Planning personnel + planning d'unité (${u.unit})</div>
      <div class="hr"></div>
      ${renderIOSCalendar({mode:"agent", unit:u.unit, meId:u.id})}
    </div>

    <div class="carditem">
      <h3>Disponibilités</h3>
      <div class="muted">Déclare une indisponibilité ou un arrêt.</div>
      <div class="hr"></div>
      <div class="grid2">
        <div class="field">
          <label>Statut</label>
          <select id="availStatus">
            <option value="available">Disponible</option>
            <option value="unavailable">Indisponible</option>
            <option value="sick">Arrêt maladie</option>
          </select>
        </div>
        <div class="field">
          <label>Date</label>
          <input id="availDate" type="date" value="${iso(new Date())}"/>
        </div>
      </div>
      <div class="field" style="margin-top:10px">
        <label>Note (optionnel)</label>
        <input id="availNote" placeholder="Ex : RDV médical, garde d'enfant…"/>
      </div>
      <button class="btn primary" id="btnSaveAvail">Enregistrer</button>
      <div class="hint" id="availResult"></div>
    </div>`;
}

function viewPlanningDirection(){
  const unit = "Unité A";
  return `
    <div class="carditem">
      <h3>Planning global</h3>
      <div class="muted">Vue direction • ${unit}</div>
      <div class="hr"></div>
      ${renderIOSCalendar({mode:"direction", unit, meId:state.session.userId})}
      <div class="hr"></div>
      <div class="muted">💡 En version production, le glisser-déposer permettrait de modifier les plannings directement.</div>
    </div>`;
}

// ── Échanges ──────────────────────────────────────────────────────────────────
function viewSwapsAgent(){
  const u = me();
  const myShifts   = state.shifts.filter(s => s.userId===u.id).sort((a,b)=>a.date.localeCompare(b.date));
  const colleagues = state.users.filter(x => x.role==="agent" && x.unit===u.unit && x.id!==u.id);
  const pending    = state.swapRequests.filter(r => r.requesterId===u.id || r.targetId===u.id).slice().reverse();

  return `
    <div class="carditem">
      <h3>Proposer un échange</h3>
      <div class="muted">Sélectionne ton horaire + celui du collègue. La direction valide.</div>
      <div class="hr"></div>
      <div class="field">
        <label>1) Mon horaire</label>
        <select id="swapMyShift">
          <option value="">— Choisir —</option>
          ${myShifts.map(s => `<option value="${s.id}">${fmtDate(s.date)} • ${s.start}–${s.end} (${s.label})</option>`).join("")}
        </select>
      </div>
      <div class="field" style="margin-top:10px">
        <label>2) Collègue</label>
        <select id="swapColleague">
          <option value="">— Choisir —</option>
          ${colleagues.map(c => `<option value="${c.id}">${c.name}</option>`).join("")}
        </select>
      </div>
      <div class="field" style="margin-top:10px">
        <label>3) Son horaire</label>
        <select id="swapColShift" disabled>
          <option value="">— Choisir le collègue d'abord —</option>
        </select>
      </div>
      <button class="btn primary" id="btnSendSwap">Envoyer à la direction</button>
      <div class="hint" id="swapHint"></div>
    </div>

    <div class="carditem">
      <h3>Historique</h3>
      <div class="muted">Toutes mes demandes d'échange</div>
      <div class="hr"></div>
      <div class="cardlist">
        ${pending.length ? pending.map(r => swapCard(r)).join("") : `<div class="muted">Aucune demande pour l'instant.</div>`}
      </div>
    </div>`;
}

function swapCard(r){
  const my = state.shifts.find(s => s.id===r.requesterShiftId);
  const co = state.shifts.find(s => s.id===r.targetShiftId);
  const badge = r.status==="approved" ? `<span class="badge ok">Validé ✓</span>` :
                r.status==="refused"  ? `<span class="badge no">Refusé ✗</span>` :
                `<span class="badge warn">En attente…</span>`;
  return `
    <div class="carditem">
      <div class="row" style="justify-content:space-between;align-items:center;gap:10px">
        <div>
          <div style="font-weight:800">Échange • ${userName(r.requesterId)} ↔ ${userName(r.targetId)}</div>
          <div class="muted">${r.createdAt} • ${badge}</div>
        </div>
      </div>
      <div class="hr"></div>
      <div class="split">
        <div class="carditem" style="padding:12px">
          <div class="muted">Horaire demandeur</div>
          <div style="font-weight:800;margin-top:4px">${fmtDate(my?.date)} • ${my?.start}–${my?.end}</div>
          <div class="muted">${my?.label||""}</div>
        </div>
        <div class="carditem" style="padding:12px">
          <div class="muted">Horaire visé</div>
          <div style="font-weight:800;margin-top:4px">${fmtDate(co?.date)} • ${co?.start}–${co?.end}</div>
          <div class="muted">${co?.label||""}</div>
        </div>
      </div>
    </div>`;
}

// ── Messages ──────────────────────────────────────────────────────────────────
function viewMessagesAgent(){
  const u = me();
  // L'agent peut écrire aux collègues ET à la direction
  const peers = [
    ...state.users.filter(x => x.role==="agent" && x.unit===u.unit && x.id!==u.id),
    ...state.users.filter(x => x.role==="direction")
  ];
  const peer = peers.find(p => p.id===activeChatPeer) || peers[0];
  if(peer) activeChatPeer = peer.id;
  const convoKey = convo(u.id, peer.id);
  const msgs = state.messages[convoKey] || [];

  return `
    <div class="carditem">
      <h3>Conversations</h3>
      <div class="muted">Messagerie interne + proposition d'échange</div>
      <div class="hr"></div>
      <div class="field">
        <label>Avec</label>
        <select id="chatPeer">
          ${peers.map(p => `<option value="${p.id}" ${p.id===activeChatPeer?'selected':''}>${p.name}${p.role==="direction"?' (Direction)':''}</option>`).join("")}
        </select>
      </div>
      <div class="hr"></div>
      <div class="chat" id="chat">
        ${msgs.map(m => bubble(m, m.from===u.id)).join("")}
      </div>
    </div>
    <div class="chatbar">
      <button class="iconbtn primary" id="btnSwapInChat" title="Proposer un échange">${icons.swap}</button>
      <input id="chatInput" placeholder="Nouveau message…"/>
      <button class="iconbtn primary" id="btnSendMsg" title="Envoyer">${icons.send}</button>
    </div>`;
}

function viewMessagesDirection(){
  const u = me();
  const agents = state.users.filter(x => x.role==="agent");
  const peer   = agents.find(a => a.id===activeChatPeerDir) || agents[0];
  if(peer) activeChatPeerDir = peer.id;
  const convoKey = convo(u.id, peer.id);
  const msgs = state.messages[convoKey] || [];

  return `
    <div class="carditem">
      <h3>Messagerie</h3>
      <div class="muted">Échangez directement avec les agents.</div>
      <div class="hr"></div>
      <div class="field">
        <label>Agent</label>
        <select id="chatPeerDir">
          ${agents.map(a => `<option value="${a.id}" ${a.id===activeChatPeerDir?'selected':''}>${a.name} — ${a.unit}</option>`).join("")}
        </select>
      </div>
      <div class="hr"></div>
      <div class="chat" id="chat">
        ${msgs.map(m => bubble(m, m.from===u.id)).join("")}
      </div>
    </div>
    <div class="chatbar">
      <input id="chatInputDir" placeholder="Message à l'agent…"/>
      <button class="iconbtn primary" id="btnSendMsgDir" title="Envoyer">${icons.send}</button>
    </div>`;
}

function bubble(m, isMe){
  if(m.type === "swap"){
    return `<div class="bubble ${isMe?'me':''}">
      <div style="font-weight:850">📅 Proposition d'échange</div>
      <div style="margin-top:6px;font-size:13px">${m.summary}</div>
      <div class="time">${m.time}</div>
    </div>`;
  }
  return `<div class="bubble ${isMe?'me':''}">
    <div>${escapeHtml(m.text)}</div>
    <div class="time">${m.time}</div>
  </div>`;
}

// ── Profil & santé ────────────────────────────────────────────────────────────
function viewProfileAgent(){
  const u = me();
  const p = state.profiles[u.id] || {userId:u.id};
  return `
    <div class="carditem">
      <h3>Profil & santé</h3>
      <div class="muted">Informations personnelles et médicales • visibles par la direction.</div>
      <div class="hr"></div>

      <div class="section-title">Informations personnelles</div>
      <div class="grid2">
        <div class="field">
          <label>Date de naissance</label>
          <input id="p_birth" type="date" value="${p.birthDate||""}"/>
        </div>
        <div class="field">
          <label>Taille (cm)</label>
          <input id="p_height" type="number" value="${p.heightCm||""}" placeholder="165"/>
        </div>
      </div>
      <div class="field" style="margin-top:10px">
        <label>Poids (kg)</label>
        <input id="p_weight" type="number" value="${p.weightKg||""}" placeholder="65"/>
      </div>

      <div class="hr"></div>
      <div class="section-title">Santé</div>
      <div class="field">
        <label>Allergies connues</label>
        <textarea id="p_allergies" placeholder="Ex: Pénicilline, arachides…">${p.allergies||""}</textarea>
      </div>
      <div class="field" style="margin-top:10px">
        <label>Traitements en cours</label>
        <textarea id="p_treatments" placeholder="Ex: Doliprane 1g, Lévothyrox 50µg…">${p.treatments||""}</textarea>
      </div>
      <div class="field" style="margin-top:10px">
        <label>Groupe sanguin</label>
        <input id="p_blood" value="${p.bloodType||""}" placeholder="Ex: O+"/>
      </div>
      <div class="field" style="margin-top:10px">
        <label>Notes complémentaires</label>
        <textarea id="p_notes" placeholder="Ex: asthme léger, suivi cardio…">${p.notes||""}</textarea>
      </div>

      <div class="hr"></div>
      <div class="section-title">Contact d'urgence</div>
      <div class="grid2">
        <div class="field">
          <label>Nom</label>
          <input id="p_em_name" value="${p.emergencyName||""}" placeholder="Ex: Maman"/>
        </div>
        <div class="field">
          <label>Téléphone</label>
          <input id="p_em_phone" value="${p.emergencyPhone||""}" placeholder="06 …"/>
        </div>
      </div>
      <button class="btn primary" id="btnSaveProfile">Enregistrer</button>
      <div class="muted" id="profileSaved">${p.updatedAt?"Dernière mise à jour : "+p.updatedAt:""}</div>
    </div>

    <div class="carditem">
      <h3>Absences / congés</h3>
      <div class="muted">Crée une demande — la direction sera notifiée.</div>
      <div class="hr"></div>
      <div class="field">
        <label>Type</label>
        <select id="leaveType">
          <option value="Congés payés">Congés payés</option>
          <option value="Congé sans solde">Congé sans solde</option>
          <option value="Arrêt maladie">Arrêt maladie</option>
          <option value="Autre">Autre</option>
        </select>
      </div>
      <div class="grid2" style="margin-top:10px">
        <div class="field">
          <label>Du</label>
          <input type="date" id="leaveFrom" value="${iso(new Date())}"/>
        </div>
        <div class="field">
          <label>Au</label>
          <input type="date" id="leaveTo" value="${iso(new Date())}"/>
        </div>
      </div>
      <div class="field" style="margin-top:10px">
        <label>Note</label>
        <input id="leaveNote" placeholder="Optionnel"/>
      </div>
      <button class="btn primary" id="btnSendLeave">Envoyer à la direction</button>
      <div class="hr"></div>
      <div class="section-title">Mes demandes</div>
      <div class="cardlist">
        ${state.leaveRequests.filter(r=>r.userId===u.id).slice().reverse().map(leaveCard).join("") || `<div class="muted">Aucune demande.</div>`}
      </div>
    </div>

    <div class="carditem">
      <h3>Heures supplémentaires</h3>
      <div class="muted">Déclare tes heures supp — la direction valide.</div>
      <div class="hr"></div>
      <div class="grid2">
        <div class="field">
          <label>Durée</label>
          <select id="otMinutes">
            <option value="15">15 min</option>
            <option value="30">30 min</option>
            <option value="45">45 min</option>
            <option value="60">1 h</option>
            <option value="90">1 h 30</option>
          </select>
        </div>
        <div class="field">
          <label>Date</label>
          <input type="date" id="otDate" value="${iso(new Date())}"/>
        </div>
      </div>
      <div class="field" style="margin-top:10px">
        <label>Motif</label>
        <input id="otNote" placeholder="Ex : transmission longue, absence collègue…"/>
      </div>
      <button class="btn primary" id="btnSendOT">Déclarer</button>
      <div class="hr"></div>
      <div class="section-title">Mes heures supp</div>
      <div class="cardlist">
        ${state.overtime.filter(o=>o.userId===u.id).slice().reverse().map(otCard).join("") || `<div class="muted">Aucune déclaration.</div>`}
      </div>
    </div>`;
}

function viewProfilesDirection(){
  const agents = state.users.filter(u => u.role==="agent");
  return `
    <div class="carditem">
      <h3>Profils & santé</h3>
      <div class="muted">Lecture seule • accès réservé à la direction</div>
      <div class="hr"></div>
      <div class="cardlist">
        ${agents.map(a => {
          const p = state.profiles[a.id]||{};
          const filled = p.birthDate||p.bloodType||p.allergies;
          return `<div class="carditem">
            <div class="row" style="justify-content:space-between;align-items:center;gap:10px">
              <div>
                <div style="font-weight:850">${a.name}</div>
                <div class="muted">${a.unit} • ${filled?'Fiche remplie ✓':'Fiche incomplète'}</div>
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
  const swapsPending  = state.swapRequests.filter(r=>r.status==="pending").slice().reverse();
  const leavesPending = state.leaveRequests.filter(r=>r.status==="pending").slice().reverse();
  const otPending     = state.overtime.filter(r=>r.status==="pending").slice().reverse();
  const total = swapsPending.length+leavesPending.length+otPending.length;

  return `
    <div class="carditem">
      <h3>Validations</h3>
      <div class="muted">${total>0?`${total} demande(s) en attente de décision`:"Aucune demande en attente 🎉"}</div>
      <div class="hr"></div>

      <div class="section-title">Échanges d'horaires (${swapsPending.length})</div>
      <div class="cardlist">
        ${swapsPending.length ? swapsPending.map(validationSwapCard).join("") : `<div class="muted">Aucune demande en attente.</div>`}
      </div>

      <div class="hr"></div>
      <div class="section-title">Absences & congés (${leavesPending.length})</div>
      <div class="cardlist">
        ${leavesPending.length ? leavesPending.map(validationLeaveCard).join("") : `<div class="muted">Aucune demande en attente.</div>`}
      </div>

      <div class="hr"></div>
      <div class="section-title">Heures supplémentaires (${otPending.length})</div>
      <div class="cardlist">
        ${otPending.length ? otPending.map(validationOTCard).join("") : `<div class="muted">Aucune déclaration en attente.</div>`}
      </div>
    </div>`;
}

function validationSwapCard(r){
  return `
    <div class="carditem">
      <div style="font-weight:850">Échange • ${userName(r.requesterId)} ↔ ${userName(r.targetId)}</div>
      <div class="muted">${r.createdAt}</div>
      <div class="hr"></div>
      ${swapCard(r)}
      <div class="row gap" style="margin-top:10px">
        <button class="btn small primary" data-swap-approve="${r.id}">✓ Accepter</button>
        <button class="btn small danger"  data-swap-refuse="${r.id}">✗ Refuser</button>
      </div>
    </div>`;
}

function leaveCard(r){
  const badge = r.status==="approved" ? `<span class="badge ok">Approuvé</span>` :
                r.status==="refused"  ? `<span class="badge no">Refusé</span>` :
                `<span class="badge warn">En attente</span>`;
  return `<div class="carditem">
    <div style="font-weight:850">${r.type} ${badge}</div>
    <div class="muted">${fmtDate(r.from)} → ${fmtDate(r.to)}${r.note?' • '+r.note:''}</div>
  </div>`;
}

function validationLeaveCard(r){
  return `<div class="carditem">
    <div style="font-weight:850">${userName(r.userId)} • ${r.type}</div>
    <div class="muted">${fmtDate(r.from)} → ${fmtDate(r.to)}${r.note?' • '+r.note:''}</div>
    <div class="row gap" style="margin-top:10px">
      <button class="btn small primary" data-leave-approve="${r.id}">✓ Accepter</button>
      <button class="btn small danger"  data-leave-refuse="${r.id}">✗ Refuser</button>
    </div>
  </div>`;
}

function otCard(r){
  const badge = r.status==="approved" ? `<span class="badge ok">Validé</span>` :
                r.status==="refused"  ? `<span class="badge no">Refusé</span>` :
                `<span class="badge warn">En attente</span>`;
  return `<div class="carditem">
    <div style="font-weight:850">${r.minutes} min ${badge}</div>
    <div class="muted">${fmtDate(r.date)}${r.note?' • '+r.note:''}</div>
  </div>`;
}

function validationOTCard(r){
  return `<div class="carditem">
    <div style="font-weight:850">${userName(r.userId)} • ${r.minutes} min</div>
    <div class="muted">${fmtDate(r.date)}${r.note?' • '+r.note:''}</div>
    <div class="row gap" style="margin-top:10px">
      <button class="btn small primary" data-ot-approve="${r.id}">✓ Valider</button>
      <button class="btn small danger"  data-ot-refuse="${r.id}">✗ Refuser</button>
    </div>
  </div>`;
}

// ── Compte ────────────────────────────────────────────────────────────────────
function viewAccount(){
  const u = me();
  const roleLabel = isDirection() ? "Direction" : "Agent";
  const users = state.users.filter(x => x.role === state.session.role);
  return `
    <div class="carditem">
      <h3>Compte</h3>
      <div class="muted">Démo locale • changer de profil</div>
      <div class="hr"></div>
      <div class="carditem" style="padding:12px">
        <div class="row" style="justify-content:space-between;gap:10px">
          <div>
            <div style="font-weight:850">${u.name}</div>
            <div class="muted">${roleLabel} • ${u.unit}</div>
          </div>
          <button class="btn small danger" id="btnLogout">Déconnexion</button>
        </div>
      </div>
      <div class="hr"></div>
      <div class="section-title">Changer d'utilisateur</div>
      <div class="field">
        <label>Utilisateur</label>
        <select id="switchUser">
          ${users.map(x=>`<option value="${x.id}" ${x.id===u.id?'selected':''}>${x.name}</option>`).join("")}
        </select>
      </div>
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
      <h3>Données locales</h3>
      <div class="muted">Réinitialise toutes les données de démo.</div>
      <div class="hr"></div>
      <button class="btn danger" id="btnReset">Réinitialiser la démo</button>
    </div>`;
}

// ── Handlers ──────────────────────────────────────────────────────────────────
function attachHandlers(tabId){

  if(tabId === "planning"){
    document.getElementById("btnSaveAvail")?.addEventListener("click", () => {
      const st   = document.getElementById("availStatus").value;
      const d    = document.getElementById("availDate").value;
      const note = document.getElementById("availNote").value.trim();
      const label = st==="available"?"Disponible":st==="unavailable"?"Indisponible":"Arrêt maladie";
      toast("Disponibilité enregistrée ✅");
      const hint = document.getElementById("availResult");
      hint.innerHTML = `<span class="badge ok">${label}</span><span class="badge">${fmtDate(d)}</span>${note?`<span class="badge">${escapeHtml(note)}</span>`:""}`;
    });
  }

  if(tabId === "echanges"){
    const mySel       = document.getElementById("swapMyShift");
    const colSel      = document.getElementById("swapColleague");
    const colShiftSel = document.getElementById("swapColShift");
    const btnSend     = document.getElementById("btnSendSwap");
    const hint        = document.getElementById("swapHint");

    function fillColShifts(){
      const colId  = colSel.value;
      const shifts = state.shifts.filter(s=>s.userId===colId).sort((a,b)=>a.date.localeCompare(b.date));
      colShiftSel.innerHTML = `<option value="">— Choisir —</option>`+
        shifts.map(s=>`<option value="${s.id}">${fmtDate(s.date)} • ${s.start}–${s.end} (${s.label})</option>`).join("");
      colShiftSel.disabled = !colId;
    }
    colSel?.addEventListener("change", fillColShifts);
    fillColShifts();

    btnSend?.addEventListener("click", () => {
      const myId       = mySel.value;
      const colId      = colSel.value;
      const colShiftId = colShiftSel.value;
      if(!myId||!colId||!colShiftId){
        hint.innerHTML = `<span class="badge no">Complète les 3 champs</span>`;
        return;
      }
      state.swapRequests.push({
        id:"sw_"+Math.random().toString(16).slice(2),
        requesterId:state.session.userId, targetId:colId,
        requesterShiftId:myId, targetShiftId:colShiftId,
        status:"pending",
        createdAt:new Date().toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"})
      });
      saveState();
      hint.innerHTML = `<span class="badge ok">Envoyé</span><span class="badge warn">En attente de validation</span>`;
      toast("Demande envoyée ✅");
      renderTab("echanges");
    });
  }

  if(tabId === "messages"){
    document.getElementById("chatPeer")?.addEventListener("change", e => {
      activeChatPeer = e.target.value;
      renderTab("messages");
      setTimeout(scrollChatBottom, 50);
    });
    document.getElementById("btnSendMsg")?.addEventListener("click", sendChatMessage);
    document.getElementById("chatInput")?.addEventListener("keydown", e => { if(e.key==="Enter") sendChatMessage(); });
    document.getElementById("btnSwapInChat")?.addEventListener("click", openSwapModalFromChat);
    setTimeout(scrollChatBottom, 50);
  }

  if(tabId === "messages_dir"){
    document.getElementById("chatPeerDir")?.addEventListener("change", e => {
      activeChatPeerDir = e.target.value;
      renderTab("messages_dir");
      setTimeout(scrollChatBottom, 50);
    });

    function sendDirMessage(){
      const u      = me();
      const peerId = document.getElementById("chatPeerDir")?.value;
      const input  = document.getElementById("chatInputDir");
      const text   = (input?.value||"").trim();
      if(!text||!peerId) return;
      const key = convo(u.id, peerId);
      state.messages[key] = state.messages[key]||[];
      state.messages[key].push({from:u.id, text, time:nowTime()});
      saveState();
      input.value = "";
      renderTab("messages_dir");
      setTimeout(scrollChatBottom, 50);
    }
    document.getElementById("btnSendMsgDir")?.addEventListener("click", sendDirMessage);
    document.getElementById("chatInputDir")?.addEventListener("keydown", e => { if(e.key==="Enter") sendDirMessage(); });
    setTimeout(scrollChatBottom, 50);
  }

  if(tabId === "profil"){
    document.getElementById("btnSaveProfile")?.addEventListener("click", () => {
      const u = me();
      const p = state.profiles[u.id]||{userId:u.id};
      p.birthDate      = document.getElementById("p_birth").value;
      p.heightCm       = document.getElementById("p_height").value;
      p.weightKg       = document.getElementById("p_weight").value;
      p.allergies      = document.getElementById("p_allergies").value.trim();
      p.treatments     = document.getElementById("p_treatments").value.trim();
      p.bloodType      = document.getElementById("p_blood").value.trim();
      p.notes          = document.getElementById("p_notes").value.trim();
      p.emergencyName  = document.getElementById("p_em_name").value.trim();
      p.emergencyPhone = document.getElementById("p_em_phone").value.trim();
      p.updatedAt      = new Date().toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"});
      state.profiles[u.id] = p;
      saveState();
      document.getElementById("profileSaved").textContent = "Dernière mise à jour : "+p.updatedAt;
      toast("Profil enregistré ✅");
    });

    document.getElementById("btnSendLeave")?.addEventListener("click", () => {
      const u = me();
      state.leaveRequests.push({
        id:"lv_"+Math.random().toString(16).slice(2),
        userId:u.id,
        type:document.getElementById("leaveType").value,
        from:document.getElementById("leaveFrom").value,
        to:  document.getElementById("leaveTo").value,
        note:document.getElementById("leaveNote").value.trim(),
        status:"pending",
        createdAt:nowTime()
      });
      saveState();
      toast("Demande envoyée ✅");
      renderTab("profil");
    });

    document.getElementById("btnSendOT")?.addEventListener("click", () => {
      const u = me();
      state.overtime.push({
        id:"ot_"+Math.random().toString(16).slice(2),
        userId:u.id,
        minutes:parseInt(document.getElementById("otMinutes").value,10),
        date:document.getElementById("otDate").value,
        note:document.getElementById("otNote").value.trim(),
        status:"pending",
        createdAt:nowTime()
      });
      saveState();
      toast("Heures supp déclarées ✅");
      renderTab("profil");
    });
  }

  if(tabId === "profil_dir"){
    document.querySelectorAll("[data-open-profile]").forEach(btn => {
      btn.addEventListener("click", () => openProfileModal(btn.getAttribute("data-open-profile")));
    });
  }

  if(tabId === "validations"){
    document.querySelectorAll("[data-swap-approve]").forEach(b =>
      b.addEventListener("click", () => setSwapStatus(b.getAttribute("data-swap-approve"), "approved")));
    document.querySelectorAll("[data-swap-refuse]").forEach(b =>
      b.addEventListener("click", () => setSwapStatus(b.getAttribute("data-swap-refuse"), "refused")));
    document.querySelectorAll("[data-leave-approve]").forEach(b =>
      b.addEventListener("click", () => setLeaveStatus(b.getAttribute("data-leave-approve"), "approved")));
    document.querySelectorAll("[data-leave-refuse]").forEach(b =>
      b.addEventListener("click", () => setLeaveStatus(b.getAttribute("data-leave-refuse"), "refused")));
    document.querySelectorAll("[data-ot-approve]").forEach(b =>
      b.addEventListener("click", () => setOTStatus(b.getAttribute("data-ot-approve"), "approved")));
    document.querySelectorAll("[data-ot-refuse]").forEach(b =>
      b.addEventListener("click", () => setOTStatus(b.getAttribute("data-ot-refuse"), "refused")));
  }

  if(tabId === "compte"){
    document.getElementById("btnLogout")?.addEventListener("click", () => {
      state.session = {role:"agent", userId:""};
      saveState(); navStack = []; currentTab = "planning"; render();
    });

    document.getElementById("btnSwitchUser")?.addEventListener("click", () => {
      const uid = document.getElementById("switchUser").value;
      if(uid){
        state.session.userId = uid; saveState(); navStack = [];
        currentTab = isDirection() ? "planning_dir" : "planning";
        toast("Utilisateur changé ✅"); render();
      }
    });

    document.getElementById("btnRoleDir")?.addEventListener("click",   () => switchRole("direction"));
    document.getElementById("btnRoleAgent")?.addEventListener("click", () => switchRole("agent"));

    document.getElementById("btnReset")?.addEventListener("click", () => {
      if(!confirm("Réinitialiser toutes les données de démo ?\nCette action est irréversible.")) return;
      localStorage.removeItem(LS_KEY);
      state = loadState(); saveState(); navStack = []; currentTab = "planning";
      toast("Réinitialisé ✅"); render();
    });
  }

  bindIOSCalendar();

  // Sync active tab style
  document.querySelectorAll(".tabbar .tab").forEach(t =>
    t.classList.toggle("active", t.getAttribute("data-tab") === currentTab));
}

// ── Utilitaires ───────────────────────────────────────────────────────────────
function switchRole(role){
  state.session.role   = role;
  state.session.userId = state.users.find(u=>u.role===role)?.id||"";
  saveState(); navStack = [];
  currentTab = (role==="direction") ? "planning_dir" : "planning";
  toast("Rôle changé ✅"); render();
}

function sendChatMessage(){
  const u      = me();
  const peerId = document.getElementById("chatPeer").value;
  const input  = document.getElementById("chatInput");
  const text   = (input.value||"").trim();
  if(!text) return;
  const key = convo(u.id, peerId);
  state.messages[key] = state.messages[key]||[];
  state.messages[key].push({from:u.id, text, time:nowTime()});
  saveState(); input.value = "";
  renderTab("messages");
  setTimeout(scrollChatBottom, 50);
}

function openSwapModalFromChat(){
  const u          = me();
  const peerId     = document.getElementById("chatPeer").value;
  const myShifts   = state.shifts.filter(s=>s.userId===u.id).sort((a,b)=>a.date.localeCompare(b.date));
  const peerShifts = state.shifts.filter(s=>s.userId===peerId).sort((a,b)=>a.date.localeCompare(b.date));

  openModal("Proposer un échange", `
    <div class="muted">Choisis ton horaire + celui du collègue.</div>
    <div class="hr"></div>
    <div class="field">
      <label>Mon horaire</label>
      <select id="m_my">
        <option value="">—</option>
        ${myShifts.map(s=>`<option value="${s.id}">${fmtDate(s.date)} • ${s.start}–${s.end}</option>`).join("")}
      </select>
    </div>
    <div class="field" style="margin-top:10px">
      <label>Horaire du collègue</label>
      <select id="m_peer">
        <option value="">—</option>
        ${peerShifts.map(s=>`<option value="${s.id}">${fmtDate(s.date)} • ${s.start}–${s.end}</option>`).join("")}
      </select>
    </div>
    <div class="field" style="margin-top:10px">
      <label>Commentaire (optionnel)</label>
      <input id="m_note" placeholder="Ex : échange exceptionnel…">
    </div>`,
  `<button class="btn ghost" id="m_cancel">Annuler</button>
   <button class="btn primary" id="m_send">Envoyer</button>`);

  document.getElementById("m_cancel").onclick = closeModal;
  document.getElementById("m_send").onclick = () => {
    const myId        = document.getElementById("m_my").value;
    const peerShiftId = document.getElementById("m_peer").value;
    const note        = document.getElementById("m_note").value.trim();
    if(!myId||!peerShiftId){ toast("Choisis les deux horaires"); return; }
    const req = {
      id:"sw_"+Math.random().toString(16).slice(2),
      requesterId:u.id, targetId:peerId,
      requesterShiftId:myId, targetShiftId:peerShiftId,
      status:"pending",
      createdAt:new Date().toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"})
    };
    state.swapRequests.push(req);
    const key = convo(u.id, peerId);
    state.messages[key] = state.messages[key]||[];
    const my = state.shifts.find(s=>s.id===myId);
    const pe = state.shifts.find(s=>s.id===peerShiftId);
    state.messages[key].push({
      from:u.id, type:"swap",
      summary:`${fmtDate(my.date)} ${my.start}–${my.end} ↔ ${fmtDate(pe.date)} ${pe.start}–${pe.end}${note?" • "+note:""}`,
      time:nowTime()
    });
    saveState(); closeModal(); toast("Échange envoyé ✅");
    renderTab("messages"); setTimeout(scrollChatBottom, 50);
  };
}

function setSwapStatus(id, status){
  const r = state.swapRequests.find(x=>x.id===id);
  if(!r) return;
  r.status = status;
  // Si approuvé : on échange vraiment les userId dans les shifts
  if(status==="approved"){
    const s1 = state.shifts.find(s=>s.id===r.requesterShiftId);
    const s2 = state.shifts.find(s=>s.id===r.targetShiftId);
    if(s1&&s2){ const tmp=s1.userId; s1.userId=s2.userId; s2.userId=tmp; }
  }
  saveState();
  toast(status==="approved" ? "Échange validé ✅ — planning mis à jour" : "Échange refusé ❌");
  renderTab("validations");
}

function setLeaveStatus(id, status){
  const r = state.leaveRequests.find(x=>x.id===id);
  if(!r) return;
  r.status = status; saveState();
  toast(status==="approved" ? "Congé approuvé ✅" : "Congé refusé ❌");
  renderTab("validations");
}

function setOTStatus(id, status){
  const r = state.overtime.find(x=>x.id===id);
  if(!r) return;
  r.status = status; saveState();
  toast(status==="approved" ? "Heures supp validées ✅" : "Heures supp refusées ❌");
  renderTab("validations");
}

function openProfileModal(uid){
  const u = state.users.find(x=>x.id===uid);
  const p = state.profiles[uid]||{};
  openModal("Profil & santé", `
    <div class="carditem" style="padding:12px">
      <div style="font-weight:850">${u.name}</div>
      <div class="muted">${u.unit}</div>
    </div>
    <div class="hr"></div>
    <div class="section-title">Informations</div>
    <div class="carditem" style="padding:12px">
      <div class="muted">Naissance</div><div style="font-weight:850">${p.birthDate||"—"}</div>
      <div class="hr"></div>
      <div class="muted">Taille / Poids</div><div style="font-weight:850">${p.heightCm||"—"} cm • ${p.weightKg||"—"} kg</div>
      <div class="hr"></div>
      <div class="muted">Groupe sanguin</div><div style="font-weight:850">${escapeHtml(p.bloodType||"—")}</div>
    </div>
    <div class="hr"></div>
    <div class="section-title">Santé</div>
    <div class="carditem" style="padding:12px">
      <div class="muted">Allergies</div><div style="white-space:pre-wrap;margin-top:4px">${escapeHtml(p.allergies||"—")}</div>
      <div class="hr"></div>
      <div class="muted">Traitements</div><div style="white-space:pre-wrap;margin-top:4px">${escapeHtml(p.treatments||"—")}</div>
      <div class="hr"></div>
      <div class="muted">Notes</div><div style="white-space:pre-wrap;margin-top:4px">${escapeHtml(p.notes||"—")}</div>
    </div>
    <div class="hr"></div>
    <div class="section-title">Contact d'urgence</div>
    <div class="carditem" style="padding:12px">
      <div class="muted">Nom</div><div style="font-weight:850">${escapeHtml(p.emergencyName||"—")}</div>
      <div class="muted" style="margin-top:8px">Téléphone</div><div style="font-weight:850">${escapeHtml(p.emergencyPhone||"—")}</div>
    </div>
    <div class="muted" style="margin-top:10px">${p.updatedAt?"Dernière mise à jour : "+p.updatedAt:""}</div>
  `, `<button class="btn primary" id="btnCloseP">Fermer</button>`);
  document.getElementById("btnCloseP").onclick = closeModal;
}

function openModal(title, bodyHtml, footHtml){
  const bd = document.getElementById("modalBackdrop");
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("modalBody").innerHTML    = bodyHtml;
  document.getElementById("modalFoot").innerHTML    = footHtml||"";
  bd.classList.remove("hidden");
  document.getElementById("btnModalClose").onclick  = closeModal;
  bd.addEventListener("click", e => { if(e.target===bd) closeModal(); }, {once:true});
}
function closeModal(){
  document.getElementById("modalBackdrop").classList.add("hidden");
  document.getElementById("modalBody").innerHTML = "";
  document.getElementById("modalFoot").innerHTML = "";
}

function toast(msg){
  const el = document.getElementById("toast");
  if(!el) return;
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => el.classList.add("hidden"), 2400);
}

function nextDays(n){
  const out=[], d=new Date();
  for(let i=0;i<n;i++){ const x=new Date(d); x.setDate(d.getDate()+i); out.push(x); }
  return out;
}
function userName(id){ return state.users.find(u=>u.id===id)?.name||id; }
function convo(a,b){ return [a,b].sort().join("_"); }
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function scrollChatBottom(){
  const chat = document.getElementById("chat");
  if(chat) chat.scrollIntoView({block:"end"});
}

// ── Calendrier iOS ────────────────────────────────────────────────────────────
function bindIOSCalendar(){
  const wrap = document.querySelector("[data-ioscal='1']");
  if(!wrap) return;

  wrap.querySelector("[data-cal-prev]")?.addEventListener("click", () => {
    state.ui = state.ui||{};
    const ym = state.ui.calendarYM||{y:new Date().getFullYear(), m:new Date().getMonth()};
    let {y,m} = ym; m--; if(m<0){m=11;y--;}
    state.ui.calendarYM = {y,m}; saveState(); renderTab(currentTab);
  });

  wrap.querySelector("[data-cal-next]")?.addEventListener("click", () => {
    state.ui = state.ui||{};
    const ym = state.ui.calendarYM||{y:new Date().getFullYear(), m:new Date().getMonth()};
    let {y,m} = ym; m++; if(m>11){m=0;y++;}
    state.ui.calendarYM = {y,m}; saveState(); renderTab(currentTab);
  });

  wrap.querySelectorAll("[data-cal-date]").forEach(cell => {
    if(cell.classList.contains("off")) return;
    const di = cell.getAttribute("data-cal-date");
    cell.addEventListener("click", () => {
      state.ui = state.ui||{};
      state.ui.calendarSelectedIso = di; saveState();
      wrap.querySelectorAll(".ioscal-cell").forEach(c =>
        c.classList.toggle("sel", c.getAttribute("data-cal-date")===di));
      const u    = me();
      const mode = isDirection() ? "direction" : "agent";
      const unit = mode==="direction" ? "Unité A" : (u?.unit||"Unité A");
      const meId = mode==="direction" ? state.session.userId : u.id;
      document.getElementById("iosCalDetail").innerHTML = renderDayDetail(di, {mode, unit, meId});
    });
  });
}

function monthLabel(y,m){ return new Date(y,m,1).toLocaleDateString("fr-FR",{month:"long",year:"numeric"}); }
function startOfMonth(y,m){ return new Date(y,m,1); }
function endOfMonth(y,m){ return new Date(y,m+1,0); }
function sameDay(a,b){ return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate(); }

function renderIOSCalendar({mode, unit, meId}){
  state.ui = state.ui||{};
  const today = new Date();
  const ym    = state.ui.calendarYM||{y:today.getFullYear(), m:today.getMonth()};
  const {y,m} = ym;
  const first = startOfMonth(y,m);
  const dow   = (first.getDay()+6)%7;
  const daysInMonth = endOfMonth(y,m).getDate();

  const cells = [];
  for(let i=0;i<42;i++){
    const dayNum = i-dow+1;
    cells.push({date:new Date(y,m,dayNum), off:dayNum<1||dayNum>daysInMonth});
  }
  const selIso = state.ui.calendarSelectedIso||iso(today);

  return `
    <div class="ioscal-wrap" data-ioscal="1">
      <div class="ioscal-head">
        <div>
          <div class="ioscal-title">${capitalize(monthLabel(y,m))}</div>
          <div class="muted">Appuyez sur un jour pour voir le détail</div>
        </div>
        <div class="ioscal-nav">
          <button class="iconbtn" data-cal-prev aria-label="Mois précédent">${icons.chevLeft}</button>
          <button class="iconbtn" data-cal-next aria-label="Mois suivant">${icons.chevRight}</button>
        </div>
      </div>

      <div class="ioscal-dow">
        <div>L</div><div>M</div><div>M</div><div>J</div><div>V</div>
        <div style="color:rgba(255,200,100,.85)">S</div>
        <div style="color:rgba(255,110,110,.85)">D</div>
      </div>

      <div class="ioscal-grid">
        ${cells.map(c => {
          const di       = iso(c.date);
          const isToday  = sameDay(c.date, today);
          const isSel    = di===selIso;
          const myShifts = state.shifts.filter(s=>s.userId===meId && s.date===di);
          const unitSh   = state.shifts.filter(s=>s.unit===unit && s.date===di);
          const dow2     = c.date.getDay();
          const numStyle = (dow2===0||dow2===6)&&!c.off ? 'color:rgba(255,150,150,.9)' : '';
          const dots     = [];
          if(myShifts.length) dots.push(`<span class="dot me"></span>`);
          if(unitSh.length)   dots.push(`<span class="dot unit"></span>`);
          return `<div class="ioscal-cell ${c.off?'off':''} ${isToday?'today':''} ${isSel?'sel':''}" data-cal-date="${di}">
            <div class="num" style="${numStyle}">${c.date.getDate()}</div>
            ${dots.length?`<div class="dots">${dots.join("")}</div>`:''}
          </div>`;
        }).join("")}
      </div>

      <div class="ioscal-detail" id="iosCalDetail">
        ${renderDayDetail(selIso, {mode, unit, meId})}
      </div>
    </div>`;
}

function renderDayDetail(dayIso, {mode, unit, meId}){
  const d      = new Date(dayIso+"T00:00:00");
  const title  = d.toLocaleDateString("fr-FR",{weekday:"long", day:"2-digit", month:"long"});
  const my     = state.shifts.filter(s=>s.userId===meId && s.date===dayIso);
  const unitSh = state.shifts.filter(s=>s.unit===unit && s.date===dayIso);
  const lines  = [];

  if(mode==="agent"){
    if(my.length){
      my.forEach(s => lines.push(detailLine(`${s.start}–${s.end}`, s.label, "Moi", "me")));
    } else {
      lines.push(`<div class="muted">Aucun horaire personnel ce jour.</div>`);
    }
    if(unitSh.length){
      lines.push(`<div class="muted" style="margin:10px 0 6px">Équipe — ${unit}</div>`);
      unitSh.forEach(s => {
        const tag = s.userId===meId ? "Moi" : userName(s.userId);
        lines.push(detailLine(`${s.start}–${s.end}`, s.label, tag, s.userId===meId?"me":"unit"));
      });
    }
  } else {
    if(unitSh.length){
      unitSh.forEach(s => lines.push(detailLine(`${s.start}–${s.end}`, s.label, userName(s.userId), "unit")));
    } else {
      lines.push(`<div class="muted">Aucun horaire dans l'unité ce jour.</div>`);
    }
  }

  return `<h4>${capitalize(title)}</h4>${lines.join("")}`;
}

function detailLine(time, label, tagText, tagClass){
  return `<div class="detail-line">
    <div class="left">
      <div style="font-weight:900">${time}</div>
      <div class="muted">${escapeHtml(label)}</div>
    </div>
    <span class="tag ${tagClass}">${escapeHtml(tagText)}</span>
  </div>`;
}

function capitalize(s){ return s ? s.charAt(0).toUpperCase()+s.slice(1) : s; }

// ── Boot ──────────────────────────────────────────────────────────────────────
render();
saveState();
