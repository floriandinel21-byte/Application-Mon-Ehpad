function save(){
  const status = document.getElementById("status").value;
  const date = document.getElementById("date").value;
  const note = document.getElementById("note").value;

  document.getElementById("result").innerText =
    status + " le " + date + (note ? " ("+note+")" : "");
}

const cal = document.getElementById("calendar");
cal.className = "calendar";

const now = new Date();
const year = now.getFullYear();
const month = now.getMonth();
const days = new Date(year, month + 1, 0).getDate();

for(let d=1; d<=days; d++){
  const el = document.createElement("div");
  el.className = "day";
  if(d === now.getDate()) el.classList.add("today");
  el.innerText = d;
  cal.appendChild(el);
}
