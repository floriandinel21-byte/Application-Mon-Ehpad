function login() {
  document.querySelector('.login').classList.add('hidden');
  document.getElementById('content').classList.remove('hidden');
}

function logout() {
  location.reload();
}

function showTab(id) {
  document.querySelectorAll('.tab').forEach(t => t.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}
