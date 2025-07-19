document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("loginBtn");
  const loginForm = document.getElementById("loginForm");
  const errorDiv = document.getElementById("error");
  const userList = document.getElementById("user-list");
  const usernameInput = document.getElementById("username");

  const cadastroForm = document.getElementById("cadastroForm");
  const mostrarCadastro = document.getElementById("mostrarCadastro");

  async function carregarUtilizadores() {
    const errorDivLoad = document.getElementById("load-error");
    try {
      const response = await fetch("/api/utilizadores");
      if (!response.ok) throw new Error("Erro ao carregar utilizadores");

      const utilizadores = await response.json();
      userList.innerHTML = ""; // 🧼 limpa antes de adicionar

      utilizadores.forEach((user) => {
        const btn = document.createElement("button");
        btn.textContent = user;
        btn.type = "button";
        btn.className = "user-button";
        btn.onclick = () => {
          usernameInput.value = user;
          document.getElementById("user-selection").style.display = "none";
          loginForm.style.display = "block";
          document.getElementById("criarContaLink").style.display = "none"; // 👈 esconder o link
        };
        userList.appendChild(btn);
      });

      if (utilizadores.length === 0) {
        errorDivLoad.textContent = "Nenhum utilizador encontrado.";
        errorDivLoad.style.display = "block";
        const criarContaLink = document.getElementById("criarContaLink");
      }
    } catch (err) {
      console.error("Erro ao carregar utilizadores:", err);
      errorDivLoad.style.display = "block";
    }
  }

  carregarUtilizadores();

// Voltar do formulário de login
const voltarLoginBtn = document.getElementById('voltarLoginBtn');
voltarLoginBtn.addEventListener('click', () => {
  loginForm.style.display = "none";
  document.getElementById("user-selection").style.display = "block";
  document.getElementById("criarContaLink").style.display = "block";
});

// Voltar do formulário de cadastro
const voltarCadastroBtn = document.getElementById('voltarCadastroBtn');
voltarCadastroBtn.addEventListener('click', () => {
  cadastroForm.style.display = "none";
  document.getElementById("user-selection").style.display = "block";
  document.getElementById("criarContaLink").style.display = "block";
});

  function handleLogin() {
    const username = usernameInput.value.trim();
    const password = document.getElementById("password").value.trim();
    errorDiv.textContent = "";

    if (!username || !password) {
      errorDiv.textContent = "Preencha todos os campos.";
      return;
    }

    fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Credenciais inválidas!");
        return res.json();
      })
      .then((data) => {
        localStorage.removeItem("token");
        localStorage.setItem("token", data.token);
        window.location.href = "/dashboard";
      })
      .catch((err) => {
        console.error(err);
        errorDiv.textContent =
          err.message || "Erro ao conectar com o servidor.";
      });
  }

  loginBtn.addEventListener("click", handleLogin);
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    handleLogin();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      loginBtn.click();
    }
  });

 mostrarCadastro.onclick = () => {
  loginForm.style.display = "none";
  cadastroForm.style.display = "block";
  document.getElementById("criarContaLink").style.display = "none"; 
  document.getElementById("user-selection").style.display = "none"; 
};

  document.getElementById("cadastrarBtn").onclick = async () => {
    const username = document.getElementById("novoUsername").value.trim();
    const senha = document.getElementById("novaSenha").value;
    const confirmar = document.getElementById("confirmarSenha").value;
    const erro = document.getElementById("cadastroErro");

    if (!username || !senha || senha !== confirmar) {
      erro.textContent = "Verifique os dados!";
      return;
    }

    try {
      const res = await fetch("/api/registar-utilizador", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, senha }),
      });

      const data = await res.json();

      if (res.ok) {
        alert("Conta criada com sucesso!");
        location.reload();
      } else {
        erro.textContent = data.error || "Erro ao cadastrar.";
      }
    } catch (e) {
      erro.textContent = "Erro no servidor.";
      console.error(e);
    }
  };
});
