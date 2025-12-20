function save(){
  const status = document.getElementById('status').value;
  const from = document.getElementById('from').value;
  const to = document.getElementById('to').value;
  const note = document.getElementById('note').value;

  document.getElementById('result').innerText =
    status + " du " + from + " au " + to + (note ? " ("+note+")" : "");
}
