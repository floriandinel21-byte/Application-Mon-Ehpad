/*
  EHPAD Staff — Démo web locale (app-like)
  - 100% local (localStorage)
  - Rôles : Agent / Direction
  - Onglets : Planning / Échanges / Messages / Profil & santé / (Direction) Validations
*/

const LS_KEY = "ehpad_demo_state_v2";

const icons = {
  calendar: `<svg viewBox="0 0 24 24"><path d="M7 2v3M17 2v3M3 8h18M5 5h14a2 2 0 012 2v13a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  swap: `<svg viewBox="0 0 24 24"><path d="M7 7h14l-3-3M17 17H3l3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  msg: `<svg viewBox="0 0 24 24"><path d="M21 15a4 4 0 01-4 4H8l-5 3V7a4 4 0 014-4h10a4 4 0 014 4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`,
  heart: `<svg viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 22l7.8-8.6 1-1a5.5 5.5 0 000-7.8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`,
  check: `<svg viewBox="0 0 24 24"><path d="M9 12l2 2 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 12a8 8 0 11-16 0 8 8 0 0116 0z" fill="none" stroke="currentColor" stroke-width="2"/></svg>`,
  account: `<svg viewBox="0 0 24 24"><path d="M20 21a8 8 0 10-16 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 13a4 4 0 100-8 4 4 0 000 8z" fill="none" stroke="currentColor" stroke-width="2"/></svg>`
};

function nowTime(){
  const d = new Date();
  return d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
}

function loadState(){
  const raw = localStorage.getItem(LS_KEY);
  if(raw){
    try { return JSON.parse(raw); } catch {}
  }
  // Seed demo data close to your use-case
  const today = new Date();
  const day0 = new Date(today); day0.setDate(today.getDate());
  const day1 = new Date(today); day1.setDate(today.getDate()+1);
  const day2 = new Date(today); day2.setDate(today.getDate()+2);
  const users = [
    {id:"u1", name:"Agent (toi)", unit:"Unité A", role:"agent", email:"agent@ehpad.fr"},
    {id:"u2", name:"Collègue", unit:"Unité A", role:"agent", email:"collegue@ehpad.fr"},
    {id:"d1", name:"Direction", unit:"Direction", role:"direction", email:"direction@ehpad.fr"}
  ];
  const shifts = [
    {id:"s1", userId:"u1", unit:"Unité A", date: iso(day0), start:"14:00", end:"21:30", label:"Soir"},
    {id:"s2", userId:"u2", unit:"Unité A", date: iso(day0), start:"07:00", end:"14:00", label:"Matin"},
    {id:"s3", userId:"u1", unit:"Unité A", date: iso(day1), start:"07:00", end:"14:00", label:"Matin"},
    {id:"s4", userId:"u2", unit:"Unité A", date: iso(day1), start:"14:00", end:"21:30", label:"Soir"},
    {id:"s5", userId:"u1", unit:"Unité A", date: iso(day2), start:"14:00", end:"21:30", label:"Soir"},
  ];

  const swapRequests = []; // {id, requesterId, targetId, requesterShiftId, targetShiftId, status: pending|approved|refused, createdAt}
  const leaveRequests = []; // {id, userId, type, from, to, note, status}
  const overtime = []; // {id, userId, minutes, date, note, status}
  const profiles = {
    u1: {userId:"u1", birthDate:"", heightCm:"", weightKg:"", allergies:"", treatments:"", bloodType:"", notes:"", emergencyName:"", emergencyPhone:"", updatedAt:""},
    u2: {userId:"u2", birthDate:"", heightCm:"", weightKg:"", allergies:"", treatments:"", bloodType:"", notes:"", emergencyName:"", emergencyPhone:"", updatedAt:""},
  };
  const messages = {
    // conversation key "u1_u2"
    u1_u2: [
      {from:"u2", text:"Salut, possible d’échanger ton poste ?", time:"09:10"},
      {from:"u1", text:"Oui, je te propose via l’app 👍", time:"09:12"}
    ]
  };

  return {
    session: { role:"agent", userId:"u1" },
    users, shifts, swapRequests, leaveRequests, overtime, profiles, messages
  };
}
function saveState(){
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}
function iso(d){ return d.toISOString().slice(0,10); }
function fmtDate(isoDate){
  const d = new Date(isoDate+"T00:00:00");
  return d.toLocaleDateString("fr-FR",{weekday:"short", day:"2-digit", month:"short"});
}

let state = loadState();

const root = document.getElementById("root");
const tplLogin = document.getElementById("tpl-login");
const tplShell = document.getElementById("tpl-shell");

let navStack = []; // for back
let currentTab = "planning";
let activeChatPeer = "u2";

const tabsAgent = [
  {id:"planning", label:"Planning", icon:"calendar"},
  {id:"echanges", label:"Échanges", icon:"swap"},
  {id:"messages", label:"Messages", icon:"msg"},
  {id:"profil", label:"Profil", icon:"heart"},
  {id:"compte", label:"Compte", icon:"account"},
];
const tabsDirection = [
  {id:"planning_dir", label:"Planning", icon:"calendar"},
  {id:"validations", label:"Valider", icon:"check"},
  {id:"messages_dir", label:"Messages", icon:"msg"},
  {id:"profil_dir", label:"Profils", icon:"heart"},
  {id:"compte", label:"Compte", icon:"account"},
];

function render(){
  root.innerHTML = "";
  const isLoggedIn = !!state.session?.userId;
  if(!isLoggedIn){
    root.appendChild(tplLogin.content.cloneNode(true));
    setupLogin();
    return;
  }
  root.appendChild(tplShell.content.cloneNode(true));
  setupShell();
  renderTab(currentTab);
}

function setupLogin(){
  const roleSel = document.getElementById("loginRole");
  const userSel = document.getElementById("loginUser");
  roleSel.value = state.session?.role || "agent";

  function fillUsers(){
    const role = roleSel.value;
    const users = state.users.filter(u => u.role === role);
    userSel.innerHTML = users.map(u => `<option value="${u.id}">${u.name} — ${u.unit}</option>`).join("");
    userSel.value = users[0]?.id || "";
  }
  roleSel.addEventListener("change", fillUsers);
  fillUsers();

  document.getElementById("btnLogin").addEventListener("click", () => {
    state.session.role = roleSel.value;
    state.session.userId = userSel.value;
    saveState();
    currentTab = (state.session.role === "direction") ? "planning_dir" : "planning";
    render();
    toast("Connecté ✅");
  });
}

function setupShell(){
  const tabs = (state.session.role === "direction") ? tabsDirection : tabsAgent;
  const tabbar = document.getElementById("tabbar");
  tabbar.innerHTML = tabs.map(t => `
    <div class="tab ${t.id===currentTab?'active':''}" data-tab="${t.id}">
      ${icons[t.icon]}
      <span>${t.label}</span>
    </div>
  `).join("");

  tabbar.querySelectorAll(".tab").forEach(el => {
    el.addEventListener("click", () => {
      const id = el.getAttribute("data-tab");
      navigate(id);
    });
  });

  document.getElementById("btnBack").addEventListener("click", () => {
    if(navStack.length){
      const prev = navStack.pop();
      currentTab = prev;
      render();
    } else {
      toast("Rien à faire ici 🙂");
    }
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
  const title = document.getElementById("appTitle");
  const subtitle = document.getElementById("appSubtitle");

  const me = state.users.find(u => u.id === state.session.userId);
  const roleLabel = state.session.role === "direction" ? "Direction" : "Agent";
  subtitle.textContent = `${me?.name || ""} • ${roleLabel}`;

  const map = {
    planning: "Planning",
    echanges: "Échanges",
    messages: "Messagerie",
    profil: "Profil & santé",
    compte: "Compte",
    planning_dir: "Planning",
    validations: "Validations",
    messages_dir: "Messagerie",
    profil_dir: "Profils & santé"
  };
  title.textContent = map[currentTab] || "EHPAD";
}

function renderTab(tabId){
  updateHeader();
  const main = document.getElementById("main");
  const role = state.session.role;

  if(role === "agent"){
    if(tabId === "planning") main.innerHTML = viewPlanningAgent();
    else if(tabId === "echanges") main.innerHTML = viewSwapsAgent();
    else if(tabId === "messages") main.innerHTML = viewMessagesAgent();
    else if(tabId === "profil") main.innerHTML = viewProfileAgent();
    else if(tabId === "compte") main.innerHTML = viewAccount();
  } else {
    if(tabId === "planning_dir") main.innerHTML = viewPlanningDirection();
    else if(tabId === "validations") main.innerHTML = viewValidations();
    else if(tabId === "messages_dir") main.innerHTML = viewMessagesDirection();
    else if(tabId === "profil_dir") main.innerHTML = viewProfilesDirection();
    else if(tabId === "compte") main.innerHTML = viewAccount();
  }

  // Attach handlers
  attachHandlers(tabId);
}

function me(){ return state.users.find(u => u.id === state.session.userId); }
function isDirection(){ return state.session.role === "direction"; }

function viewPlanningAgent(){
  const u = me();
  const unit = u.unit;
  // iOS-like month calendar
  return `
    <div class="carditem">
      <h3>Planning</h3>
      <div class="muted">Planning personnel + planning d’unité (${unit})</div>
      <div class="hr"></div>
      ${renderIOSCalendar({
        mode: "agent",
        unit,
        meId: u.id
      })}
    </div>

    <div class="carditem">
      <h3>Disponibilités</h3>
      <div class="muted">Déclare une indisponibilité ou un arrêt (démo).</div>
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
        <input id="availNote" placeholder="Ex : RDV médical, grippe…"/>
      </div>
      <button class="btn primary" id="btnSaveAvail">Enregistrer</button>
      <div class="hint" id="availResult"></div>
    </div>
  `;
}


function viewPlanningDirection(){
  const unit = "Unité A";
  return `
    <div class="carditem">
      <h3>Planning global</h3>
      <div class="muted">Vue direction • ${unit}</div>
      <div class="hr"></div>
      ${renderIOSCalendar({
        mode: "direction",
        unit,
        meId: state.session.userId
      })}
      <div class="hr"></div>
      <div class="muted">Astuce : la mise à jour par glisser-déposer se ferait dans la vraie version (Firebase / serveur).</div>
    </div>
  `;
}


function viewSwapsAgent(){
  const u = me();
  const myShifts = state.shifts.filter(s => s.userId === u.id).sort((a,b)=>a.date.localeCompare(b.date));
  const colleagues = state.users.filter(x => x.role==="agent" && x.unit===u.unit && x.id!==u.id);

  const pending = state.swapRequests.filter(r => r.requesterId === u.id || r.targetId === u.id).slice().reverse();

  return `
    <div class="carditem">
      <h3>Proposer un échange</h3>
      <div class="muted">Sélectionne ton horaire + l’horaire du collègue. La direction valide.</div>
      <div class="hr"></div>

      <div class="field">
        <label>1) Mon horaire</label>
        <select id="swapMyShift">
          <option value="">—</option>
          ${myShifts.map(s => `<option value="${s.id}">${fmtDate(s.date)} • ${s.start}-${s.end} (${s.label})</option>`).join("")}
        </select>
      </div>

      <div class="field" style="margin-top:10px">
        <label>2) Collègue</label>
        <select id="swapColleague">
          <option value="">—</option>
          ${colleagues.map(c => `<option value="${c.id}">${c.name}</option>`).join("")}
        </select>
      </div>

      <div class="field" style="margin-top:10px">
        <label>3) Son horaire</label>
        <select id="swapColShift" disabled>
          <option value="">—</option>
        </select>
      </div>

      <button class="btn primary" id="btnSendSwap">Envoyer à la direction</button>
      <div class="hint" id="swapHint"></div>
    </div>

    <div class="carditem">
      <h3>Historique</h3>
      <div class="muted">Demandes et statuts</div>
      <div class="hr"></div>
      <div class="cardlist">
        ${pending.length ? pending.map(r => swapCard(r)).join("") : `<div class="muted">Aucune demande pour l’instant.</div>`}
      </div>
    </div>
  `;
}

function swapCard(r){
  const my = state.shifts.find(s => s.id === r.requesterShiftId);
  const co = state.shifts.find(s => s.id === r.targetShiftId);
  const status = r.status;
  const badge = status === "approved" ? `<span class="badge ok">Validé</span>` :
                status === "refused" ? `<span class="badge no">Refusé</span>` :
                `<span class="badge warn">En attente</span>`;
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
          <div class="muted">Horaire agent</div>
          <div style="font-weight:800;margin-top:4px">${fmtDate(my?.date)} • ${my?.start}-${my?.end}</div>
          <div class="muted">${my?.label || ""}</div>
        </div>
        <div class="carditem" style="padding:12px">
          <div class="muted">Horaire collègue</div>
          <div style="font-weight:800;margin-top:4px">${fmtDate(co?.date)} • ${co?.start}-${co?.end}</div>
          <div class="muted">${co?.label || ""}</div>
        </div>
      </div>
    </div>
  `;
}

function viewMessagesAgent(){
  const u = me();
  const peer = state.users.find(x => x.id === activeChatPeer) || state.users.find(x => x.role==="agent" && x.id!==u.id);
  if(peer) activeChatPeer = peer.id;

  const convoKey = convo(u.id, peer.id);
  const msgs = state.messages[convoKey] || [];
  const peers = state.users.filter(x => x.role==="agent" && x.unit===u.unit && x.id!==u.id);

  return `
    <div class="carditem">
      <h3>Conversations</h3>
      <div class="muted">Messagerie interne + proposition d’échange</div>
      <div class="hr"></div>
      <div class="field">
        <label>Avec</label>
        <select id="chatPeer">
          ${peers.map(p => `<option value="${p.id}" ${p.id===activeChatPeer?'selected':''}>${p.name}</option>`).join("")}
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
      <button class="iconbtn primary" id="btnSendMsg" title="Envoyer">${icons.msg}</button>
    </div>
  `;
}

function viewMessagesDirection(){
  return `
    <div class="carditem">
      <h3>Messagerie (direction)</h3>
      <div class="muted">Démo : consultation simple.</div>
      <div class="hr"></div>
      <div class="muted">Dans la version finale, la direction peut envoyer des messages aux agents et recevoir les demandes.</div>
    </div>
  `;
}

function bubble(m, isMe){
  if(m.type === "swap"){
    return `
      <div class="bubble ${isMe?'me':''}">
        <div style="font-weight:850">Proposition d’échange</div>
        <div class="muted" style="margin-top:6px">${m.summary}</div>
        <div class="time">${m.time}</div>
      </div>
    `;
  }
  return `
    <div class="bubble ${isMe?'me':''}">
      <div>${escapeHtml(m.text)}</div>
      <div class="time">${m.time}</div>
    </div>
  `;
}

function viewProfileAgent(){
  const u = me();
  const p = state.profiles[u.id] || {userId:u.id};
  return `
    <div class="carditem">
      <h3>Profil & santé</h3>
      <div class="muted">Modifiable par toi • Consultable par la direction (lecture seule)</div>
      <div class="hr"></div>

      <div class="carditem" style="padding:12px">
        <div style="font-weight:850">Identité</div>
        <div class="muted" style="margin-top:6px">${u.name} • ${u.unit}</div>
      </div>

      <div class="hr"></div>

      <div class="field">
        <label>Date de naissance</label>
        <input type="date" id="p_birth" value="${p.birthDate||""}">
      </div>

      <div class="grid2" style="margin-top:10px">
        <div class="field">
          <label>Taille (cm)</label>
          <input type="number" id="p_height" value="${p.heightCm||""}" placeholder="Ex: 175">
        </div>
        <div class="field">
          <label>Poids (kg)</label>
          <input type="number" step="0.1" id="p_weight" value="${p.weightKg||""}" placeholder="Ex: 70.5">
        </div>
      </div>

      <div class="hr"></div>

      <div class="field">
        <label>Allergies</label>
        <textarea id="p_allergies" placeholder="Ex: pénicilline…">${p.allergies||""}</textarea>
      </div>
      <div class="field" style="margin-top:10px">
        <label>Traitements / médicaments</label>
        <textarea id="p_treatments" placeholder="Ex: traitement X…">${p.treatments||""}</textarea>
      </div>
      <div class="field" style="margin-top:10px">
        <label>Groupe sanguin (optionnel)</label>
        <input id="p_blood" value="${p.bloodType||""}" placeholder="Ex: O+">
      </div>
      <div class="field" style="margin-top:10px">
        <label>Notes</label>
        <textarea id="p_notes" placeholder="Ex: asthme, diabète…">${p.notes||""}</textarea>
      </div>

      <div class="hr"></div>

      <div class="section-title">Contact d’urgence</div>
      <div class="grid2">
        <div class="field">
          <label>Nom</label>
          <input id="p_em_name" value="${p.emergencyName||""}" placeholder="Ex: Maman">
        </div>
        <div class="field">
          <label>Téléphone</label>
          <input id="p_em_phone" value="${p.emergencyPhone||""}" placeholder="06...">
        </div>
      </div>

      <button class="btn primary" id="btnSaveProfile">Enregistrer</button>
      <div class="muted" id="profileSaved">${p.updatedAt ? "Dernière mise à jour : "+p.updatedAt : ""}</div>
    </div>

    <div class="carditem">
      <h3>Absences / congés</h3>
      <div class="muted">Crée une demande (démo).</div>
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
          <input type="date" id="leaveFrom" value="${iso(new Date())}">
        </div>
        <div class="field">
          <label>Au</label>
          <input type="date" id="leaveTo" value="${iso(new Date())}">
        </div>
      </div>
      <div class="field" style="margin-top:10px">
        <label>Note</label>
        <input id="leaveNote" placeholder="Optionnel">
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
      <div class="muted">Déclare 15/30/45/60 min (démo).</div>
      <div class="hr"></div>
      <div class="grid2">
        <div class="field">
          <label>Durée</label>
          <select id="otMinutes">
            <option value="15">15 min</option>
            <option value="30">30 min</option>
            <option value="45">45 min</option>
            <option value="60">60 min</option>
          </select>
        </div>
        <div class="field">
          <label>Date</label>
          <input type="date" id="otDate" value="${iso(new Date())}">
        </div>
      </div>
      <div class="field" style="margin-top:10px">
        <label>Note</label>
        <input id="otNote" placeholder="Ex : fin à 14h15">
      </div>
      <button class="btn primary" id="btnSendOT">Envoyer à la direction</button>
      <div class="hr"></div>
      <div class="section-title">Mes heures supp</div>
      <div class="cardlist">
        ${state.overtime.filter(o=>o.userId===u.id).slice().reverse().map(otCard).join("") || `<div class="muted">Aucune déclaration.</div>`}
      </div>
    </div>
  `;
}

function viewProfilesDirection(){
  const agents = state.users.filter(u => u.role==="agent");
  return `
    <div class="carditem">
      <h3>Profils & santé (consultation)</h3>
      <div class="muted">Lecture seule • accès réservé à la direction</div>
      <div class="hr"></div>
      <div class="cardlist">
        ${agents.map(a => `
          <div class="carditem">
            <div class="row" style="justify-content:space-between;align-items:center;gap:10px">
              <div>
                <div style="font-weight:850">${a.name}</div>
                <div class="muted">${a.unit}</div>
              </div>
              <button class="btn small ghost" data-open-profile="${a.id}">Ouvrir</button>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function viewValidations(){
  const swapsPending = state.swapRequests.filter(r => r.status==="pending").slice().reverse();
  const leavesPending = state.leaveRequests.filter(r => r.status==="pending").slice().reverse();
  const otPending = state.overtime.filter(r => r.status==="pending").slice().reverse();

  return `
    <div class="carditem">
      <h3>Validations</h3>
      <div class="muted">Accepter / refuser les demandes (démo)</div>
      <div class="hr"></div>

      <div class="section-title">Échanges</div>
      <div class="cardlist">
        ${swapsPending.length ? swapsPending.map(r => validationSwapCard(r)).join("") : `<div class="muted">Aucune demande en attente.</div>`}
      </div>

      <div class="hr"></div>
      <div class="section-title">Absences / congés</div>
      <div class="cardlist">
        ${leavesPending.length ? leavesPending.map(r => validationLeaveCard(r)).join("") : `<div class="muted">Aucune demande en attente.</div>`}
      </div>

      <div class="hr"></div>
      <div class="section-title">Heures supplémentaires</div>
      <div class="cardlist">
        ${otPending.length ? otPending.map(r => validationOTCard(r)).join("") : `<div class="muted">Aucune demande en attente.</div>`}
      </div>
    </div>
  `;
}

function validationSwapCard(r){
  return `
    <div class="carditem">
      <div style="font-weight:850">Échange • ${userName(r.requesterId)} ↔ ${userName(r.targetId)}</div>
      <div class="muted">${r.createdAt}</div>
      <div class="hr"></div>
      ${swapCard(r)}
      <div class="row gap" style="margin-top:10px">
        <button class="btn small primary" data-swap-approve="${r.id}">Accepter</button>
        <button class="btn small danger" data-swap-refuse="${r.id}">Refuser</button>
      </div>
    </div>
  `;
}

function leaveCard(r){
  const badge = r.status==="approved" ? `<span class="badge ok">Approuvé</span>` :
                r.status==="refused" ? `<span class="badge no">Refusé</span>` :
                `<span class="badge warn">En attente</span>`;
  return `
    <div class="carditem">
      <div style="font-weight:850">${r.type} ${badge}</div>
      <div class="muted">${fmtDate(r.from)} → ${fmtDate(r.to)} • ${r.note || "—"}</div>
    </div>
  `;
}
function validationLeaveCard(r){
  return `
    <div class="carditem">
      <div style="font-weight:850">${userName(r.userId)} • ${r.type}</div>
      <div class="muted">${fmtDate(r.from)} → ${fmtDate(r.to)} • ${r.note || "—"}</div>
      <div class="row gap" style="margin-top:10px">
        <button class="btn small primary" data-leave-approve="${r.id}">Accepter</button>
        <button class="btn small danger" data-leave-refuse="${r.id}">Refuser</button>
      </div>
    </div>
  `;
}
function otCard(r){
  const badge = r.status==="approved" ? `<span class="badge ok">Validé</span>` :
                r.status==="refused" ? `<span class="badge no">Refusé</span>` :
                `<span class="badge warn">En attente</span>`;
  return `
    <div class="carditem">
      <div style="font-weight:850">${r.minutes} min ${badge}</div>
      <div class="muted">${fmtDate(r.date)} • ${r.note || "—"}</div>
    </div>
  `;
}
function validationOTCard(r){
  return `
    <div class="carditem">
      <div style="font-weight:850">${userName(r.userId)} • ${r.minutes} min</div>
      <div class="muted">${fmtDate(r.date)} • ${r.note || "—"}</div>
      <div class="row gap" style="margin-top:10px">
        <button class="btn small primary" data-ot-approve="${r.id}">Valider</button>
        <button class="btn small danger" data-ot-refuse="${r.id}">Refuser</button>
      </div>
    </div>
  `;
}

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

      <div class="section-title">Changer d’utilisateur</div>
      <div class="field">
        <label>Utilisateur</label>
        <select id="switchUser">
          ${users.map(x => `<option value="${x.id}" ${x.id===u.id?'selected':''}>${x.name}</option>`).join("")}
        </select>
      </div>
      <button class="btn primary" id="btnSwitchUser">Changer</button>

      <div class="hr"></div>
      <div class="section-title">Rôle</div>
      <div class="grid2">
        <button class="btn ${isDirection()?'primary':'ghost'}" id="btnRoleDir">Direction</button>
        <button class="btn ${!isDirection()?'primary':'ghost'}" id="btnRoleAgent">Agent</button>
      </div>
      <div class="muted" style="margin-top:10px">
        En production, cette partie devient une vraie connexion par e-mail (Firebase Auth).
      </div>
    </div>

    <div class="carditem">
      <h3>Données locales</h3>
      <div class="muted">Si tu veux repartir à zéro (démo)</div>
      <div class="hr"></div>
      <button class="btn danger" id="btnReset">Réinitialiser la démo</button>
    </div>
  `;
}

function attachHandlers(tabId){
  if(tabId === "planning"){
    const btn = document.getElementById("btnSaveAvail");
    if(btn) btn.addEventListener("click", () => {
      const st = document.getElementById("availStatus").value;
      const d = document.getElementById("availDate").value;
      const note = document.getElementById("availNote").value.trim();
      const label = st==="available" ? "Disponible" : st==="unavailable" ? "Indisponible" : "Arrêt maladie";
      toast("Enregistré ✅");
      const hint = document.getElementById("availResult");
      hint.innerHTML = `<span class="badge ok">${label}</span><span class="badge">${fmtDate(d)}</span>${note?`<span class="badge">${escapeHtml(note)}</span>`:""}`;
    });
  }

  if(tabId === "echanges"){
    const mySel = document.getElementById("swapMyShift");
    const colSel = document.getElementById("swapColleague");
    const colShiftSel = document.getElementById("swapColShift");
    const btnSend = document.getElementById("btnSendSwap");
    const hint = document.getElementById("swapHint");

    function fillColShifts(){
      const colId = colSel.value;
      const shifts = state.shifts.filter(s => s.userId === colId).sort((a,b)=>a.date.localeCompare(b.date));
      colShiftSel.innerHTML = `<option value="">—</option>` + shifts.map(s => `<option value="${s.id}">${fmtDate(s.date)} • ${s.start}-${s.end} (${s.label})</option>`).join("");
      colShiftSel.disabled = !colId;
    }
    if(colSel) colSel.addEventListener("change", fillColShifts);
    fillColShifts();

    if(btnSend) btnSend.addEventListener("click", () => {
      const myId = mySel.value;
      const colId = colSel.value;
      const colShiftId = colShiftSel.value;
      if(!myId || !colId || !colShiftId){
        hint.innerHTML = `<span class="badge no">Choisis les 3 champs</span>`;
        toast("Champs manquants");
        return;
      }
      const req = {
        id: "sw_" + Math.random().toString(16).slice(2),
        requesterId: state.session.userId,
        targetId: colId,
        requesterShiftId: myId,
        targetShiftId: colShiftId,
        status: "pending",
        createdAt: new Date().toLocaleString("fr-FR",{dateStyle:"short", timeStyle:"short"})
      };
      state.swapRequests.push(req);
      saveState();
      hint.innerHTML = `<span class="badge ok">Envoyé</span><span class="badge warn">En attente de validation</span>`;
      toast("Demande envoyée ✅");
      renderTab("echanges");
    });
  }

  if(tabId === "messages"){
    const peerSel = document.getElementById("chatPeer");
    if(peerSel) peerSel.addEventListener("change", () => {
      activeChatPeer = peerSel.value;
      renderTab("messages");
    });

    const sendBtn = document.getElementById("btnSendMsg");
    const input = document.getElementById("chatInput");
    if(sendBtn) sendBtn.addEventListener("click", () => sendChatMessage());
    if(input) input.addEventListener("keydown", (e) => {
      if(e.key === "Enter") sendChatMessage();
    });

    const btnSwap = document.getElementById("btnSwapInChat");
    if(btnSwap) btnSwap.addEventListener("click", () => openSwapModalFromChat());
  }

  if(tabId === "profil"){
    const saveBtn = document.getElementById("btnSaveProfile");
    if(saveBtn) saveBtn.addEventListener("click", () => {
      const u = me();
      const p = state.profiles[u.id] || {userId:u.id};
      p.birthDate = document.getElementById("p_birth").value;
      p.heightCm = document.getElementById("p_height").value;
      p.weightKg = document.getElementById("p_weight").value;
      p.allergies = document.getElementById("p_allergies").value.trim();
      p.treatments = document.getElementById("p_treatments").value.trim();
      p.bloodType = document.getElementById("p_blood").value.trim();
      p.notes = document.getElementById("p_notes").value.trim();
      p.emergencyName = document.getElementById("p_em_name").value.trim();
      p.emergencyPhone = document.getElementById("p_em_phone").value.trim();
      p.updatedAt = new Date().toLocaleString("fr-FR",{dateStyle:"short", timeStyle:"short"});
      state.profiles[u.id] = p;
      saveState();
      document.getElementById("profileSaved").textContent = "Dernière mise à jour : " + p.updatedAt;
      toast("Profil enregistré ✅");
    });

    const btnLeave = document.getElementById("btnSendLeave");
    if(btnLeave) btnLeave.addEventListener("click", () => {
      const u = me();
      const req = {
        id: "lv_" + Math.random().toString(16).slice(2),
        userId: u.id,
        type: document.getElementById("leaveType").value,
        from: document.getElementById("leaveFrom").value,
        to: document.getElementById("leaveTo").value,
        note: document.getElementById("leaveNote").value.trim(),
        status: "pending",
        createdAt: nowTime()
      };
      state.leaveRequests.push(req);
      saveState();
      toast("Demande envoyée ✅");
      renderTab("profil");
    });

    const btnOT = document.getElementById("btnSendOT");
    if(btnOT) btnOT.addEventListener("click", () => {
      const u = me();
      const entry = {
        id: "ot_" + Math.random().toString(16).slice(2),
        userId: u.id,
        minutes: parseInt(document.getElementById("otMinutes").value, 10),
        date: document.getElementById("otDate").value,
        note: document.getElementById("otNote").value.trim(),
        status: "pending",
        createdAt: nowTime()
      };
      state.overtime.push(entry);
      saveState();
      toast("Heures supp envoyées ✅");
      renderTab("profil");
    });
  }

  if(tabId === "profil_dir"){
    document.querySelectorAll("[data-open-profile]").forEach(btn => {
      btn.addEventListener("click", () => {
        const uid = btn.getAttribute("data-open-profile");
        openProfileModal(uid);
      });
    });
  }

  if(tabId === "validations"){
    document.querySelectorAll("[data-swap-approve]").forEach(b => b.addEventListener("click", () => {
      const id = b.getAttribute("data-swap-approve");
      setSwapStatus(id, "approved");
    }));
    document.querySelectorAll("[data-swap-refuse]").forEach(b => b.addEventListener("click", () => {
      const id = b.getAttribute("data-swap-refuse");
      setSwapStatus(id, "refused");
    }));
    document.querySelectorAll("[data-leave-approve]").forEach(b => b.addEventListener("click", () => {
      const id = b.getAttribute("data-leave-approve");
      setLeaveStatus(id, "approved");
    }));
    document.querySelectorAll("[data-leave-refuse]").forEach(b => b.addEventListener("click", () => {
      const id = b.getAttribute("data-leave-refuse");
      setLeaveStatus(id, "refused");
    }));
    document.querySelectorAll("[data-ot-approve]").forEach(b => b.addEventListener("click", () => {
      const id = b.getAttribute("data-ot-approve");
      setOTStatus(id, "approved");
    }));
    document.querySelectorAll("[data-ot-refuse]").forEach(b => b.addEventListener("click", () => {
      const id = b.getAttribute("data-ot-refuse");
      setOTStatus(id, "refused");
    }));
  }

  if(tabId === "compte"){
    const btnLogout = document.getElementById("btnLogout");
    if(btnLogout) btnLogout.addEventListener("click", () => {
      state.session.userId = "";
      saveState();
      navStack = [];
      render();
    });

    const btnSwitch = document.getElementById("btnSwitchUser");
    if(btnSwitch) btnSwitch.addEventListener("click", () => {
      const sel = document.getElementById("switchUser").value;
      state.session.userId = sel;
      saveState();
      toast("Compte changé ✅");
      render();
    });

    const btnDir = document.getElementById("btnRoleDir");
    const btnAgent = document.getElementById("btnRoleAgent");
    if(btnDir) btnDir.addEventListener("click", () => switchRole("direction"));
    if(btnAgent) btnAgent.addEventListener("click", () => switchRole("agent"));

    const btnReset = document.getElementById("btnReset");
    if(btnReset) btnReset.addEventListener("click", () => {
      localStorage.removeItem(LS_KEY);
      state = loadState();
      saveState();
      navStack = [];
      currentTab = "planning";
      toast("Réinitialisé ✅");
      render();
    });
  }

  bindIOSCalendar();

  // Update active tab style
  const tabs = document.querySelectorAll(".tabbar .tab");
  tabs.forEach(t => t.classList.toggle("active", t.getAttribute("data-tab") === currentTab));
}

function switchRole(role){
  state.session.role = role;
  const candidates = state.users.filter(u => u.role === role);
  state.session.userId = candidates[0]?.id || "";
  saveState();
  navStack = [];
  currentTab = (role === "direction") ? "planning_dir" : "planning";
  toast("Rôle changé ✅");
  render();
}

function sendChatMessage(){
  const u = me();
  const peerId = document.getElementById("chatPeer").value;
  const input = document.getElementById("chatInput");
  const text = (input.value || "").trim();
  if(!text) return;

  const key = convo(u.id, peerId);
  state.messages[key] = state.messages[key] || [];
  state.messages[key].push({from:u.id, text, time: nowTime()});
  saveState();
  input.value = "";
  renderTab("messages");
  scrollChatBottom();
}

function openSwapModalFromChat(){
  const u = me();
  const peerId = document.getElementById("chatPeer").value;

  const myShifts = state.shifts.filter(s => s.userId === u.id).sort((a,b)=>a.date.localeCompare(b.date));
  const peerShifts = state.shifts.filter(s => s.userId === peerId).sort((a,b)=>a.date.localeCompare(b.date));

  openModal("Proposer un échange", `
    <div class="muted">Choisis ton horaire + l’horaire du collègue.</div>
    <div class="hr"></div>
    <div class="field">
      <label>Mon horaire</label>
      <select id="m_my">
        <option value="">—</option>
        ${myShifts.map(s => `<option value="${s.id}">${fmtDate(s.date)} • ${s.start}-${s.end}</option>`).join("")}
      </select>
    </div>
    <div class="field" style="margin-top:10px">
      <label>Horaire du collègue</label>
      <select id="m_peer">
        <option value="">—</option>
        ${peerShifts.map(s => `<option value="${s.id}">${fmtDate(s.date)} • ${s.start}-${s.end}</option>`).join("")}
      </select>
    </div>
    <div class="field" style="margin-top:10px">
      <label>Commentaire (optionnel)</label>
      <input id="m_note" placeholder="Ex : échange exceptionnel…">
    </div>
  `, `
    <button class="btn ghost" id="m_cancel">Annuler</button>
    <button class="btn primary" id="m_send">Envoyer</button>
  `);

  document.getElementById("m_cancel").onclick = closeModal;
  document.getElementById("m_send").onclick = () => {
    const myId = document.getElementById("m_my").value;
    const peerShiftId = document.getElementById("m_peer").value;
    const note = document.getElementById("m_note").value.trim();
    if(!myId || !peerShiftId){
      toast("Choisis les deux horaires");
      return;
    }
    const req = {
      id: "sw_" + Math.random().toString(16).slice(2),
      requesterId: u.id,
      targetId: peerId,
      requesterShiftId: myId,
      targetShiftId: peerShiftId,
      status: "pending",
      createdAt: new Date().toLocaleString("fr-FR",{dateStyle:"short", timeStyle:"short"})
    };
    state.swapRequests.push(req);

    const key = convo(u.id, peerId);
    state.messages[key] = state.messages[key] || [];
    const my = state.shifts.find(s => s.id === myId);
    const pe = state.shifts.find(s => s.id === peerShiftId);
    const summary = `${fmtDate(my.date)} ${my.start}-${my.end} ↔ ${fmtDate(pe.date)} ${pe.start}-${pe.end}${note?(" • "+note):""}`;
    state.messages[key].push({from:u.id, type:"swap", summary, time: nowTime()});

    saveState();
    closeModal();
    toast("Échange envoyé ✅");
    renderTab("messages");
    scrollChatBottom();
  };
}

function setSwapStatus(id, status){
  const r = state.swapRequests.find(x => x.id === id);
  if(!r) return;
  r.status = status;
  saveState();
  toast(status==="approved" ? "Échange validé ✅" : "Échange refusé ❌");
  renderTab("validations");
}
function setLeaveStatus(id, status){
  const r = state.leaveRequests.find(x => x.id === id);
  if(!r) return;
  r.status = status;
  saveState();
  toast(status==="approved" ? "Demande approuvée ✅" : "Demande refusée ❌");
  renderTab("validations");
}
function setOTStatus(id, status){
  const r = state.overtime.find(x => x.id === id);
  if(!r) return;
  r.status = status;
  saveState();
  toast(status==="approved" ? "Heures supp validées ✅" : "Heures supp refusées ❌");
  renderTab("validations");
}

function openProfileModal(uid){
  const u = state.users.find(x=>x.id===uid);
  const p = state.profiles[uid] || {};
  openModal(`Profil & santé`, `
    <div class="carditem" style="padding:12px">
      <div style="font-weight:850">${u.name}</div>
      <div class="muted">${u.unit}</div>
    </div>
    <div class="hr"></div>
    <div class="section-title">Infos</div>
    <div class="carditem" style="padding:12px">
      <div class="muted">Naissance</div><div style="font-weight:850">${p.birthDate || "—"}</div>
      <div class="hr"></div>
      <div class="muted">Taille / Poids</div><div style="font-weight:850">${p.heightCm || "—"} cm • ${p.weightKg || "—"} kg</div>
    </div>
    <div class="hr"></div>
    <div class="section-title">Santé</div>
    <div class="carditem" style="padding:12px">
      <div class="muted">Allergies</div><div style="white-space:pre-wrap">${escapeHtml(p.allergies || "—")}</div>
      <div class="hr"></div>
      <div class="muted">Traitements</div><div style="white-space:pre-wrap">${escapeHtml(p.treatments || "—")}</div>
      <div class="hr"></div>
      <div class="muted">Groupe sanguin</div><div style="font-weight:850">${escapeHtml(p.bloodType || "—")}</div>
      <div class="hr"></div>
      <div class="muted">Notes</div><div style="white-space:pre-wrap">${escapeHtml(p.notes || "—")}</div>
    </div>
    <div class="hr"></div>
    <div class="section-title">Contact d’urgence</div>
    <div class="carditem" style="padding:12px">
      <div class="muted">Nom</div><div style="font-weight:850">${escapeHtml(p.emergencyName || "—")}</div>
      <div class="muted" style="margin-top:8px">Téléphone</div><div style="font-weight:850">${escapeHtml(p.emergencyPhone || "—")}</div>
    </div>
    <div class="muted" style="margin-top:10px">${p.updatedAt ? "Dernière mise à jour : "+p.updatedAt : ""}</div>
  `, `<button class="btn primary" id="btnCloseP">Fermer</button>`);
  document.getElementById("btnCloseP").onclick = closeModal;
}

function openModal(title, bodyHtml, footHtml){
  const bd = document.getElementById("modalBackdrop");
  const t = document.getElementById("modalTitle");
  const b = document.getElementById("modalBody");
  const f = document.getElementById("modalFoot");
  t.textContent = title;
  b.innerHTML = bodyHtml;
  f.innerHTML = footHtml || "";
  bd.classList.remove("hidden");
  document.getElementById("btnModalClose").onclick = closeModal;
  bd.addEventListener("click", (e)=>{ if(e.target===bd) closeModal(); }, {once:true});
}
function closeModal(){
  const bd = document.getElementById("modalBackdrop");
  bd.classList.add("hidden");
  document.getElementById("modalBody").innerHTML = "";
  document.getElementById("modalFoot").innerHTML = "";
}

function toast(msg){
  const el = document.getElementById("toast");
  if(!el) return;
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(()=> el.classList.add("hidden"), 2200);
}

function nextDays(n){
  const out = [];
  const d = new Date();
  for(let i=0;i<n;i++){
    const x = new Date(d);
    x.setDate(d.getDate()+i);
    out.push(x);
  }
  return out;
}
function userName(id){
  return state.users.find(u=>u.id===id)?.name || id;
}
function convo(a,b){
  return [a,b].sort().join("_");
}
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function scrollChatBottom(){
  const chat = document.getElementById("chat");
  if(chat) chat.scrollIntoView({block:"end"});
}


function bindIOSCalendar(){
  const wrap = document.querySelector("[data-ioscal='1']");
  if(!wrap) return;

  const prev = wrap.querySelector("[data-cal-prev]");
  const next = wrap.querySelector("[data-cal-next]");
  if(prev) prev.addEventListener("click", () => {
    state.ui = state.ui || {};
    const ym = state.ui.calendarYM || {y:new Date().getFullYear(), m:new Date().getMonth()};
    let y = ym.y, m = ym.m - 1;
    if(m < 0){ m = 11; y -= 1; }
    state.ui.calendarYM = {y,m};
    saveState();
    renderTab(currentTab);
  });

  if(next) next.addEventListener("click", () => {
    state.ui = state.ui || {};
    const ym = state.ui.calendarYM || {y:new Date().getFullYear(), m:new Date().getMonth()};
    let y = ym.y, m = ym.m + 1;
    if(m > 11){ m = 0; y += 1; }
    state.ui.calendarYM = {y,m};
    saveState();
    renderTab(currentTab);
  });

  wrap.querySelectorAll("[data-cal-date]").forEach(cell => {
    const di = cell.getAttribute("data-cal-date");
    if(cell.classList.contains("off")) return;
    cell.addEventListener("click", () => {
      state.ui = state.ui || {};
      state.ui.calendarSelectedIso = di;
      saveState();
      // update selection UI without full rerender
      wrap.querySelectorAll(".ioscal-cell").forEach(c => c.classList.toggle("sel", c.getAttribute("data-cal-date")===di));
      const detail = document.getElementById("iosCalDetail");
      const u = me();
      const mode = (state.session.role === "direction") ? "direction" : "agent";
      const unit = (mode==="direction") ? "Unité A" : (u?.unit || "Unité A");
      const meId = (mode==="direction") ? state.session.userId : u.id;
      detail.innerHTML = renderDayDetail(di, {mode, unit, meId});
    });
  });
}

// Boot
render();
saveState(); // ensure seed persists
function monthLabel(year, monthIndex){
  const d = new Date(year, monthIndex, 1);
  return d.toLocaleDateString("fr-FR",{month:"long", year:"numeric"});
}
function startOfMonth(year, monthIndex){ return new Date(year, monthIndex, 1); }
function endOfMonth(year, monthIndex){ return new Date(year, monthIndex+1, 0); }
function sameDay(a,b){
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}
function renderIOSCalendar({mode, unit, meId}){
  // Persist month selection in state (localStorage) for nicer UX
  state.ui = state.ui || {};
  const today = new Date();
  const ym = state.ui.calendarYM || {y: today.getFullYear(), m: today.getMonth()};
  const y = ym.y, m = ym.m;

  const first = startOfMonth(y,m);
  const last = endOfMonth(y,m);
  // Convert Monday-first index: (Sun=0..Sat=6) => (Mon=0..Sun=6)
  const dow = (first.getDay()+6)%7;
  const daysInMonth = last.getDate();

  // Build 6 weeks grid (42 cells)
  const cells = [];
  for(let i=0;i<42;i++){
    const dayNum = i - dow + 1;
    const d = new Date(y,m, dayNum);
    const off = dayNum<1 || dayNum>daysInMonth;
    cells.push({date:d, off});
  }

  const selIso = state.ui.calendarSelectedIso || iso(today);

  return `
    <div class="ioscal-wrap" data-ioscal="1">
      <div class="ioscal-head">
        <div>
          <div class="ioscal-title">${capitalize(monthLabel(y,m))}</div>
          <div class="muted">Style iPhone • cliquez un jour pour voir les détails</div>
        </div>
        <div class="ioscal-nav">
          <button class="iconbtn" data-cal-prev aria-label="Mois précédent">${icons.calendar}</button>
          <button class="iconbtn" data-cal-next aria-label="Mois suivant">${icons.calendar}</button>
        </div>
      </div>

      <div class="ioscal-dow">
        <div>L</div><div>M</div><div>M</div><div>J</div><div>V</div><div>S</div><div>D</div>
      </div>

      <div class="ioscal-grid">
        ${cells.map(c=>{
          const di = iso(c.date);
          const isToday = sameDay(c.date, today);
          const isSel = (di === selIso);
          const myShifts = state.shifts.filter(s => s.userId===meId && s.date===di);
          const unitShifts = state.shifts.filter(s => s.unit===unit && s.date===di);
          const dots = [];
          if(myShifts.length) dots.push(`<span class="dot me"></span>`);
          if(unitShifts.length) dots.push(`<span class="dot unit"></span>`);
          return `
            <div class="ioscal-cell ${c.off?'off':''} ${isToday?'today':''} ${isSel?'sel':''}" data-cal-date="${di}">
              <div class="num">${c.date.getDate()}</div>
              ${dots.length ? `<div class="dots">${dots.join("")}</div>` : ``}
            </div>
          `;
        }).join("")}
      </div>

      <div class="ioscal-detail" id="iosCalDetail">
        ${renderDayDetail(selIso, {mode, unit, meId})}
      </div>
    </div>
  `;
}

function renderDayDetail(dayIso, {mode, unit, meId}){
  const d = new Date(dayIso+"T00:00:00");
  const title = d.toLocaleDateString("fr-FR",{weekday:"long", day:"2-digit", month:"long"});
  const my = state.shifts.filter(s => s.userId===meId && s.date===dayIso);
  const unitShifts = state.shifts.filter(s => s.unit===unit && s.date===dayIso);

  const lines = [];

  if(mode === "agent"){
    if(my.length){
      my.forEach(s => lines.push(detailLine(`${s.start}–${s.end}`, `${s.label}`, "Moi", "me")));
    } else {
      lines.push(`<div class="muted">Aucun horaire personnel ce jour.</div>`);
    }
    if(unitShifts.length){
      lines.push(`<div class="muted" style="margin:10px 0 6px">Équipe (${unit})</div>`);
      unitShifts.forEach(s => {
        const who = userName(s.userId);
        const tag = (s.userId===meId) ? "Moi" : who;
        const cls = (s.userId===meId) ? "me" : "unit";
        lines.push(detailLine(`${s.start}–${s.end}`, `${s.label}`, tag, cls));
      });
    }
  } else {
    if(unitShifts.length){
      unitShifts.forEach(s => {
        lines.push(detailLine(`${s.start}–${s.end}`, `${s.label}`, userName(s.userId), "unit"));
      });
    } else {
      lines.push(`<div class="muted">Aucun horaire dans l’unité ce jour.</div>`);
    }
  }

  return `
    <h4>${capitalize(title)}</h4>
    ${lines.join("")}
  `;
}

function detailLine(time, label, tagText, tagClass){
  return `
    <div class="detail-line">
      <div class="left">
        <div style="font-weight:900">${time}</div>
        <div class="muted">${escapeHtml(label)}</div>
      </div>
      <span class="tag ${tagClass}">${escapeHtml(tagText)}</span>
    </div>
  `;
}
function capitalize(s){ return s ? (s.charAt(0).toUpperCase() + s.slice(1)) : s; }


