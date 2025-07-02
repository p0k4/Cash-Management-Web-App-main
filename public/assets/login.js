document.addEventListener('DOMContentLoaded', () => {
  const loginBtn = document.getElementById('loginBtn');
  const loginForm = document.getElementById('loginForm');
  const errorDiv = document.getElementById('error');

  // Handler para o clique ou submit
  function handleLogin() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    errorDiv.textContent = '';

    if (!username || !password) {
      errorDiv.textContent = 'Preencha todos os campos.';
      return;
    }

    fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
    .then(res => {
      if (!res.ok) {
        throw new Error('Credenciais inválidas!');
      }
      return res.json();
    })
    .then(data => {
      localStorage.setItem('token', data.token);
      window.location.href = '/private/index.html';
    })
    .catch(err => {
      console.error(err);
      errorDiv.textContent = err.message || 'Erro ao conectar com o servidor.';
    });
  }

  // Click no botão
  loginBtn.addEventListener('click', handleLogin);
  // Ou Enter no formulário
  loginForm.addEventListener('submit', e => {
    e.preventDefault();
    handleLogin();
  });
});