document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("loginBtn");
  const loginForm = document.getElementById("loginForm");
  const errorDiv = document.getElementById("error");
  const userList = document.getElementById("user-list");
  const usernameInput = document.getElementById("username");

  async function carregarUtilizadores() {
    const errorDivLoad = document.getElementById("load-error");
    try {
      const response = await fetch("/api/utilizadores");
      if (!response.ok) throw new Error("Erro ao carregar utilizadores");

      const utilizadores = await response.json();
      // Ordena garantindo que o 'admin' aparece sempre primeiro
      utilizadores.sort((a, b) => {
        if (a === "admin") return -1;
        if (b === "admin") return 1;
        return a.localeCompare(b, "pt", { sensitivity: "base" });
      });
      userList.innerHTML = "";

      utilizadores.forEach((user) => {
        const btn = document.createElement("button");
        btn.textContent = user;
        btn.type = "button";
        btn.className = "user-button";
        btn.onclick = () => {
          usernameInput.value = user;
          document.getElementById("user-selection").style.display = "none";
          loginForm.style.display = "block";
        };
        userList.appendChild(btn);
      });

      if (utilizadores.length === 0) {
        errorDivLoad.textContent = "Nenhum utilizador encontrado.";
        errorDivLoad.style.display = "block";
      }
    } catch (err) {
      console.error("Erro ao carregar utilizadores:", err);
      errorDivLoad.style.display = "block";
    }
  }

  carregarUtilizadores();

  const voltarLoginBtn = document.getElementById("voltarLoginBtn");
  voltarLoginBtn?.addEventListener("click", () => {
    loginForm.style.display = "none";
    document.getElementById("user-selection").style.display = "block";
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
        localStorage.setItem("token", data.token);
        window.location.href = "/dashboard";
      })
      .catch((err) => {
        console.error(err);
        errorDiv.textContent = err.message || "Erro ao conectar com o servidor.";
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
});