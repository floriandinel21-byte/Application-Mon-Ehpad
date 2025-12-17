// Mon Ehpad WebApp (Personnel + Direction) - local only
const K={s:"monehpad_session_v1",p:"monehpad_profile_v1",m:"monehpad_messages_v1",e:"monehpad_exchanges_v1",o:"monehpad_overtime_v1"};
const ACC=[
 {role:"personnel",email:"personnel@mon-ehpad.fr",password:"MonEhpad2025",displayName:"Florian (Personnel)"},
 {role:"direction",email:"direction@mon-ehpad.fr",password:"MonEhpad2025",displayName:"Direction"}
];
const DEF_PROFILE={name:"Florian",role:"Agent de soins",email:"personnel@mon-ehpad.fr",phone:"06 00 00 00 00"};
const now=()=>Date.now();
const load=(k,f)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):f}catch{return f}};
const save=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const fmtDate=(t)=>new Date(t).toLocaleDateString("fr-FR");
const monthKey=(d)=>{const x=new Date(d);return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")};
const esc=(s)=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
function seed(){
 if(!localStorage.getItem(K.p)) save(K.p,DEF_PROFILE);
 if(!localStorage.getItem(K.m)) save(K.m,[{id:crypto.randomUUID(),from:"Direction",text:"Bienvenue sur Mon Ehpad (mode privé).",ts:now()-7200000}]);
 if(!localStorage.getItem(K.e)) save(K.e,[]);
 if(!localStorage.getItem(K.o)) save(K.o,[]);
 purgeMsg(30);
}
function purgeMsg(days){
 const cut=now()-days*86400000;
 const msgs=load(K.m,[]).filter(x=>(x.ts||0)>=cut);
 save(K.m,msgs);
}
seed();
const icon=(p)=>`<svg viewBox="0 0 24 24"><path d="${p}"/></svg>`;
const I={home:icon("M12 3 3 10v11h6v-7h6v7h6V10L12 3z"),
cal:icon("M7 2h2v2h6V2h2v2h3v18H2V4h5V2zm13 6H4v12h16V8z"),
swap:icon("M7 7h11l-3-3 1.4-1.4L22.8 9l-6.4 6.4L15 14l3-3H7V7zm10 10H6l3 3-1.4 1.4L1.2 15l6.4-6.4L9 10l-3 3h11v4z"),
chat:icon("M4 4h16v11H7l-3 3V4zm2 2v7.2L6.8 13H18V6H6z"),
user:icon("M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-5 0-9 2.5-9 5.5V22h18v-2.5C21 16.5 17 14 12 14z"),
grid:icon("M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z"),
clock:icon("M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 11h5v-2h-4V6h-2v7z")};

function session(){return load(K.s,null)}
function setSession(v){save(K.s,v)}
function clearSession(){localStorage.removeItem(K.s)}
function role(){return session()?.role||null}

function toast(msg){
 const el=document.createElement("div");
 el.style.position="fixed";el.style.left="50%";el.style.bottom="90px";el.style.transform="translateX(-50%)";
 el.style.padding="10px 12px";el.style.background="rgba(15,23,42,.92)";el.style.color="white";
 el.style.borderRadius="12px";el.style.zIndex="9999";el.style.maxWidth="92vw";el.style.fontSize="13px";
 el.textContent=msg;document.body.appendChild(el);
 setTimeout(()=>{el.style.opacity="0";el.style.transition="opacity .3s"},1700);
 setTimeout(()=>el.remove(),2100);
}

function layout(title,sub,body,tabs){
 const s=session(); const r=s?.role||"—"; const u=s?.displayName||"Non connecté";
 return `<div class="container">
  <div class="header">
    <div class="brand">
      <div class="logo" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3 3 10v11h6v-7h6v7h6V10L12 3z"/></svg></div>
      <div class="titleblock"><h1>${title}</h1><p>${sub||""}</p></div>
    </div>
    <div class="pill"><small>${r==="direction"?"Direction":r==="personnel"?"Personnel":"Invité"}</small><span>•</span><small>${esc(u)}</small></div>
  </div>
  ${body}
 </div>${tabs||""}`;
}

function nav(active){
 const r=role();
 const tabs = (r==="direction") ? [
  {id:"dir_dashboard",lab:"Tableau",ic:I.grid},
  {id:"dir_exchanges",lab:"Échanges",ic:I.swap},
  {id:"dir_overtime",lab:"Heures sup",ic:I.clock},
  {id:"messages",lab:"Messages",ic:I.chat},
  {id:"profile",lab:"Profil",ic:I.user},
 ] : [
  {id:"home",lab:"Accueil",ic:I.home},
  {id:"calendar",lab:"Calendrier",ic:I.cal},
  {id:"exchange",lab:"Échange",ic:I.swap},
  {id:"messages",lab:"Messages",ic:I.chat},
  {id:"profile",lab:"Profil",ic:I.user},
 ];
 return `<div class="navbar"><div class="tabs">${
  tabs.map(t=>`<button class="tab ${active===t.id?"active":""}" onclick="go('${t.id}')">${t.ic}<span>${t.lab}</span></button>`).join("")
 }</div></div>`;
}

function render(html){document.getElementById("app").innerHTML=html}

function loginView(){
 render(layout("Mon Ehpad","Connexion",`
  <div class="grid">
   <div class="card">
    <h2>Connexion</h2><p>Accès privé. Personnel + Direction (local).</p><hr class="sep"/>
    <div class="field"><label>Adresse e-mail</label><input id="email" type="email" placeholder="personnel@mon-ehpad.fr"/></div>
    <div class="field"><label>Mot de passe</label><input id="pass" type="password" placeholder="MonEhpad2025"/></div>
    <button class="btn primary" onclick="doLogin()">Se connecter</button>
    <p style="margin-top:10px;color:var(--muted);font-size:12px">Démo :<br/>Personnel : personnel@mon-ehpad.fr / MonEhpad2025<br/>Direction : direction@mon-ehpad.fr / MonEhpad2025</p>
   </div>
   <div class="card">
    <h2>Mode privé</h2>
    <p>Données stockées uniquement sur ton appareil. Messages supprimés après 30 jours.</p>
   </div>
  </div>
 `));
}
function doLogin(){
 const email=document.getElementById("email").value.trim().toLowerCase();
 const pass=document.getElementById("pass").value;
 const a=ACC.find(x=>x.email===email && x.password===pass);
 if(!a) return toast("Identifiants invalides.");
 setSession({role:a.role,email:a.email,displayName:a.displayName,ts:now()});
 toast("Connexion réussie.");
 go(a.role==="direction"?"dir_dashboard":"home");
}
function logout(){clearSession();toast("Déconnecté.");go("login")}

function homeView(){
 const p=load(K.p,DEF_PROFILE);
 render(layout("Mon Ehpad","Accueil",`
  <div class="grid">
   <div class="card">
    <h2>Accueil</h2>
    <p>Bienvenue, <strong>${esc(p.name)}</strong>.</p>
    <hr class="sep"/>
    <div class="row">
      <a class="btn primary" href="mailto:adjointdirection.ehpad@parigne.org">Envoyer un mail</a>
      <a class="btn" href="tel:0299973216">Appeler l'établissement</a>
    </div>
   </div>
   <div class="card">
    <h2>Raccourcis</h2>
    <div class="row">
      <button class="btn" onclick="go('exchange')">Demande d'échange</button>
      <button class="btn" onclick="go('calendar')">Calendrier</button>
    </div>
   </div>
  </div>
 `, nav("home")));
}

function calendarView(){
 render(layout("Mon Ehpad","Calendrier",`
  <div class="card">
    <h2>Calendrier</h2>
    <p>(Démo) Navigation vers Heures sup + Échanges.</p>
    <hr class="sep"/>
    <div class="row">
      <button class="btn primary" onclick="go('overtime')">Heures supplémentaires</button>
      <button class="btn" onclick="go('exchange')">Échanges</button>
    </div>
  </div>
 `, nav("calendar")));
}

function exchangeView(){
 const ex=load(K.e,[]);
 render(layout("Mon Ehpad","Échange de poste",`
  <div class="grid">
    <div class="card">
      <h2>Nouvelle demande</h2>
      <div class="field"><label>Sélectionnez la personne</label><input id="ex_person" placeholder="Nom / Prénom"/></div>
      <div class="row">
        <div class="field"><label>Sélectionnez la date</label><input id="ex_date" type="date"/></div>
        <div class="field"><label>Message (optionnel)</label><input id="ex_msg" placeholder="Ex : peux-tu échanger ?"/></div>
      </div>
      <div class="field">
        <label>Sélectionnez l'horaire</label>
        <div class="row">
          <button class="btn" id="slot_07001415" onclick="pickSlot('07:00 - 14:15','slot_07001415')">07:00 - 14:15</button>
          <button class="btn" id="slot_07001430" onclick="pickSlot('07:00 - 14:30','slot_07001430')">07:00 - 14:30</button>
        </div>
        <div class="row" style="margin-top:8px">
          <button class="btn" id="slot_14002100" onclick="pickSlot('14:00 - 21:00','slot_14002100')">14:00 - 21:00</button>
          <button class="btn" id="slot_14002130" onclick="pickSlot('14:00 - 21:30','slot_14002130')">14:00 - 21:30</button>
        </div>
        <input id="ex_slot" type="hidden"/>
      </div>
      <button class="btn primary" onclick="createExchange()">Envoyer la demande</button>
      <p style="margin-top:10px;color:var(--muted);font-size:12px">Statut : en attente → validation direction.</p>
    </div>

    <div class="card">
      <h2>Mes demandes</h2>
      <div class="list">
        ${ex.length?ex.map(renderExItem).join(""):`<p>Aucune demande.</p>`}
      </div>
    </div>
  </div>
 `, nav("exchange")));
}
function pickSlot(label,id){
 document.getElementById("ex_slot").value=label;
 ["slot_07001415","slot_07001430","slot_14002100","slot_14002130"].forEach(x=>document.getElementById(x)?.classList.remove("primary"));
 document.getElementById(id)?.classList.add("primary");
}
function createExchange(){
 const person=(document.getElementById("ex_person").value||"").trim();
 const date=document.getElementById("ex_date").value;
 const slot=document.getElementById("ex_slot").value;
 const msg=(document.getElementById("ex_msg").value||"").trim();
 if(!person||!date||!slot) return toast("Merci de renseigner la personne, la date et l'horaire.");
 const ex=load(K.e,[]); const s=session();
 ex.unshift({id:crypto.randomUUID(),requester:s?.displayName||"Personnel",target:person,date,slot,message:msg,status:"pending",createdAt:now()});
 save(K.e,ex); toast("Demande envoyée."); go("exchange");
}
function renderExItem(e){
 const b=e.status==="approved"?`<span class="badge ok">Accepté</span>`:e.status==="rejected"?`<span class="badge no">Refusé</span>`:`<span class="badge wait">En attente</span>`;
 return `<div class="item"><div class="top"><div><strong>${esc(e.target)}</strong><div class="meta">${esc(e.date)} • ${esc(e.slot)}${e.message?` • “${esc(e.message)}”`:``}</div></div>${b}</div></div>`;
}

function messagesView(){
 purgeMsg(30);
 const msgs=load(K.m,[]);
 render(layout("Mon Ehpad","Messagerie",`
  <div class="card">
    <div class="banner">
      <svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 11h5v-2h-4V6h-2v7z"/></svg>
      <div><p><strong>Information</strong><br/>Les messages sont automatiquement supprimés après 30 jours pour économiser de l'espace.</p></div>
    </div>
    <div class="list">
      ${msgs.length?msgs.map(m=>`<div class="item"><div class="top"><div><strong>${esc(m.from)}</strong><div class="meta">${fmtDate(m.ts)}</div></div></div><div style="margin-top:8px">${esc(m.text)}</div></div>`).join(""):`<p>Aucun message.</p>`}
    </div>
    <hr class="sep"/>
    <div class="row">
      <div class="field" style="flex:2"><label>Nouveau message</label><input id="msg_text" placeholder="Écrire un message..."/></div>
      <div class="field" style="flex:1"><label>&nbsp;</label><button class="btn primary" onclick="sendMsg()">Envoyer</button></div>
    </div>
  </div>
 `, nav("messages")));
}
function sendMsg(){
 const t=(document.getElementById("msg_text").value||"").trim(); if(!t) return;
 const msgs=load(K.m,[]); const s=session();
 msgs.unshift({id:crypto.randomUUID(),from:s?.displayName||"Moi",text:t,ts:now()});
 save(K.m,msgs); document.getElementById("msg_text").value=""; toast("Message envoyé."); messagesView();
}

function overtimeView(){
 const all=load(K.o,[]);
 const mk=monthKey(new Date());
 const items=all.filter(x=>x.monthKey===mk);
 const total=items.reduce((a,x)=>a+(x.hours||0),0);
 render(layout("Mon Ehpad","Heures supplémentaires",`
  <div class="grid">
    <div class="card">
      <h2>Ajouter une heure sup</h2>
      <div class="row">
        <div class="field"><label>Date</label><input id="ot_date" type="date"/></div>
        <div class="field"><label>Commentaire (optionnel)</label><input id="ot_note" placeholder="Ex : renfort, urgence..."/></div>
      </div>
      <div class="field">
        <label>Sélectionnez l'horaire</label>
        <div class="row">
          <button class="btn" id="ot_07001415" onclick="pickOt('07:00 - 14:15',7.25,'ot_07001415')">07:00 - 14:15</button>
          <button class="btn" id="ot_07001430" onclick="pickOt('07:00 - 14:30',7.5,'ot_07001430')">07:00 - 14:30</button>
        </div>
        <div class="row" style="margin-top:8px">
          <button class="btn" id="ot_14002100" onclick="pickOt('14:00 - 21:00',7.0,'ot_14002100')">14:00 - 21:00</button>
          <button class="btn" id="ot_14002130" onclick="pickOt('14:00 - 21:30',7.5,'ot_14002130')">14:00 - 21:30</button>
        </div>
        <input id="ot_slot" type="hidden"/><input id="ot_hours" type="hidden"/>
      </div>
      <button class="btn primary" onclick="addOt()">Enregistrer</button>
    </div>

    <div class="card">
      <h2>Récap du mois</h2>
      <div class="row">
        <div class="item" style="flex:1"><div class="top"><div><strong>${mk}</strong><div class="meta">Période</div></div><span class="badge">${items.length} entrées</span></div></div>
        <div class="item" style="flex:1"><div class="top"><div><strong>${total.toFixed(2)} h</strong><div class="meta">Total</div></div><span class="badge">mensuel</span></div></div>
      </div>
      <div class="actions">
        <button class="btn primary" onclick="exportCsv('${mk}')">Exporter CSV (mois)</button>
      </div>
      <hr class="sep"/>
      <div class="list">${items.length?items.map(renderOt).join(""):`<p>Aucune heure sup pour ce mois.</p>`}</div>
    </div>
  </div>
 `, nav(role()==="direction"?"dir_overtime":"calendar")));
}
function pickOt(label,h,id){
 document.getElementById("ot_slot").value=label; document.getElementById("ot_hours").value=String(h);
 ["ot_07001415","ot_07001430","ot_14002100","ot_14002130"].forEach(x=>document.getElementById(x)?.classList.remove("primary"));
 document.getElementById(id)?.classList.add("primary");
}
function addOt(){
 const date=document.getElementById("ot_date").value;
 const slot=document.getElementById("ot_slot").value;
 const hours=Number(document.getElementById("ot_hours").value||"0");
 const note=(document.getElementById("ot_note").value||"").trim();
 if(!date||!slot||!hours) return toast("Merci de renseigner la date et l'horaire.");
 const all=load(K.o,[]); const s=session();
 all.unshift({id:crypto.randomUUID(),who:s?.displayName||"Moi",date,monthKey:date.slice(0,7),slot,hours,note,status:"pending",createdAt:now()});
 save(K.o,all); toast("Heure sup enregistrée."); overtimeView();
}
function renderOt(o){
 const b=o.status==="approved"?`<span class="badge ok">Validé</span>`:o.status==="rejected"?`<span class="badge no">Refusé</span>`:`<span class="badge wait">En attente</span>`;
 return `<div class="item"><div class="top"><div><strong>${esc(o.date)}</strong><div class="meta">${esc(o.slot)} • ${o.hours.toFixed(2)} h${o.note?` • ${esc(o.note)}`:``}</div></div>${b}</div></div>`;
}
function exportCsv(mk){
 const all=load(K.o,[]).filter(x=>x.monthKey===mk);
 if(!all.length) return toast("Aucune donnée à exporter.");
 const head=["Date","Horaire","Heures","Statut","Commentaire","Agent"].join(";");
 const lines=all.map(o=>[o.date,o.slot,o.hours.toFixed(2),o.status,o.note||"",o.who||""].map(csvEsc).join(";"));
 const csv=[head,...lines].join("\n");
 const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});
 const url=URL.createObjectURL(blob);
 const a=document.createElement("a");a.href=url;a.download=`Heures_supplementaires_${mk}.csv`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
 toast("CSV généré.");
}
function csvEsc(v){const s=String(v??"");return /[;"\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;}

function profileView(){
 const p=load(K.p,DEF_PROFILE);
 render(layout("Mon Ehpad","Profil",`
  <div class="grid">
    <div class="card">
      <h2>Informations</h2>
      <div class="row">
        <div class="field"><label>Nom</label><input id="p_name" value="${esc(p.name)}"/></div>
        <div class="field"><label>Rôle</label><input id="p_role" value="${esc(p.role)}"/></div>
      </div>
      <div class="row">
        <div class="field"><label>E-mail</label><input id="p_email" value="${esc(p.email)}"/></div>
        <div class="field"><label>Téléphone</label><input id="p_phone" value="${esc(p.phone)}"/></div>
      </div>
      <button class="btn primary" onclick="saveProfile()">Enregistrer</button>
    </div>
    <div class="card">
      <h2>Compte</h2>
      <p>Tu peux tester l'espace Direction avec le compte direction.</p>
      <div class="actions" style="margin-top:10px">
        <button class="btn" onclick="logout()">Se déconnecter</button>
        <button class="btn danger" onclick="resetAll()">Réinitialiser les données</button>
      </div>
    </div>
  </div>
 `, nav("profile")));
}
function saveProfile(){
 save(K.p,{name:document.getElementById("p_name").value.trim(),role:document.getElementById("p_role").value.trim(),
           email:document.getElementById("p_email").value.trim(),phone:document.getElementById("p_phone").value.trim()});
 toast("Profil mis à jour.");
}
function resetAll(){
 if(!confirm("Réinitialiser toutes les données locales ?")) return;
 [K.s,K.p,K.m,K.e,K.o].forEach(k=>localStorage.removeItem(k));
 seed(); toast("Données réinitialisées."); go("login");
}

// Direction screens
function dirDashboard(){
 const ex=load(K.e,[]); const ot=load(K.o,[]);
 const pendEx=ex.filter(x=>x.status==="pending").length;
 const pendOt=ot.filter(x=>x.status==="pending").length;
 render(layout("Mon Ehpad","Direction",`
  <div class="grid">
    <div class="card">
      <h2>Tableau de bord</h2><p>Supervision (mode direction).</p><hr class="sep"/>
      <div class="row">
        <div class="item"><div class="top"><div><strong>${pendEx}</strong><div class="meta">échanges en attente</div></div><span class="badge wait">à traiter</span></div></div>
        <div class="item"><div class="top"><div><strong>${pendOt}</strong><div class="meta">heures sup en attente</div></div><span class="badge wait">à traiter</span></div></div>
      </div>
      <div class="actions">
        <button class="btn primary" onclick="go('dir_exchanges')">Valider échanges</button>
        <button class="btn primary" onclick="go('dir_overtime')">Valider heures sup</button>
      </div>
    </div>
    <div class="card">
      <h2>Notes</h2><p>Mode privé (toi seul). Workflow prêt pour un déploiement établissement plus tard.</p>
    </div>
  </div>
 `, nav("dir_dashboard")));
}
function dirExchanges(){
 const ex=load(K.e,[]);
 render(layout("Mon Ehpad","Validation échanges",`
  <div class="card">
    <h2>Validation des échanges</h2><p>Accepter/refuser met à jour le statut.</p><hr class="sep"/>
    <div class="list">${ex.length?ex.map(renderDirEx).join(""):`<p>Aucune demande.</p>`}</div>
  </div>
 `, nav("dir_exchanges")));
}
function renderDirEx(e){
 const b=e.status==="approved"?`<span class="badge ok">Accepté</span>`:e.status==="rejected"?`<span class="badge no">Refusé</span>`:`<span class="badge wait">En attente</span>`;
 const act=e.status==="pending"?`<div class="actions"><button class="btn danger" onclick="setEx('${e.id}','rejected')">Refuser</button><button class="btn primary" onclick="setEx('${e.id}','approved')">Accepter</button></div>`:"";
 return `<div class="item"><div class="top"><div><strong>${esc(e.requester)} → ${esc(e.target)}</strong><div class="meta">${esc(e.date)} • ${esc(e.slot)}${e.message?` • “${esc(e.message)}”`:``}</div></div>${b}</div>${act}</div>`;
}
function setEx(id,status){
 const ex=load(K.e,[]); const i=ex.findIndex(x=>x.id===id); if(i<0) return;
 ex[i].status=status; ex[i].reviewedAt=now(); save(K.e,ex); toast("Statut mis à jour."); dirExchanges();
}
function dirOvertime(){
 const ot=load(K.o,[]);
 render(layout("Mon Ehpad","Validation heures sup",`
  <div class="card">
    <h2>Validation des heures supplémentaires</h2><p>Valider/refuser. Export mensuel disponible via l'écran Heures sup.</p><hr class="sep"/>
    <div class="list">${ot.length?ot.map(renderDirOt).join(""):`<p>Aucune heure sup.</p>`}</div>
    <hr class="sep"/>
    <div class="actions"><button class="btn" onclick="go('overtime')">Ouvrir module Heures sup</button></div>
  </div>
 `, nav("dir_overtime")));
}
function renderDirOt(o){
 const b=o.status==="approved"?`<span class="badge ok">Validé</span>`:o.status==="rejected"?`<span class="badge no">Refusé</span>`:`<span class="badge wait">En attente</span>`;
 const act=o.status==="pending"?`<div class="actions"><button class="btn danger" onclick="setOt('${o.id}','rejected')">Refuser</button><button class="btn primary" onclick="setOt('${o.id}','approved')">Valider</button></div>`:"";
 return `<div class="item"><div class="top"><div><strong>${esc(o.who||"")}</strong><div class="meta">${esc(o.date)} • ${esc(o.slot)} • ${o.hours.toFixed(2)} h${o.note?` • ${esc(o.note)}`:``}</div></div>${b}</div>${act}</div>`;
}
function setOt(id,status){
 const ot=load(K.o,[]); const i=ot.findIndex(x=>x.id===id); if(i<0) return;
 ot[i].status=status; ot[i].reviewedAt=now(); save(K.o,ot); toast("Statut mis à jour."); dirOvertime();
}

// Router
function go(r){location.hash=r; route(r)}
function route(r){
 const s=session();
 r = (r||"").replace(/^#/,"");
 if(!r) r = (s?.role==="direction")?"dir_dashboard":"home";
 if(r==="login") return loginView();
 if(!s) return loginView();
 if(s.role==="direction"){
  if(["home","calendar","exchange"].includes(r)) r="dir_dashboard";
  if(r==="dir_dashboard") return dirDashboard();
  if(r==="dir_exchanges") return dirExchanges();
  if(r==="dir_overtime") return dirOvertime();
  if(r==="messages") return messagesView();
  if(r==="profile") return profileView();
  if(r==="overtime") return overtimeView();
  return dirDashboard();
 } else {
  if(r.startsWith("dir_")) r="home";
  if(r==="home") return homeView();
  if(r==="calendar") return calendarView();
  if(r==="exchange") return exchangeView();
  if(r==="messages") return messagesView();
  if(r==="profile") return profileView();
  if(r==="overtime") return overtimeView();
  return homeView();
 }
}
window.addEventListener("hashchange",()=>route(location.hash));
route(location.hash);
