document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.username === "admin") {
        const menu = document.getElementById("menuLateral");
        if (!menu) return;

        // Criar novo botão de menu
        const li = document.createElement("li");
        li.innerHTML = `
          <a class="btn-menu" href="/private/utilizadores.html">
            <i class="fas fa-users"></i> Utilizadores
          </a>
        `;

        // Inserir antes do botão de logout
        const logoutLi = document.getElementById("btnLogout")?.closest("li");
        if (logoutLi) {
          menu.insertBefore(li, logoutLi);
        } else {
          menu.appendChild(li); // fallback
        }
      }
    } catch (e) {
      console.error("Erro ao verificar token:", e);
    }
  }
});