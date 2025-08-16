document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.username === "admin") {
        const menu = document.getElementById("menuLateral");
        if (!menu) return;

        const logoutLi = document.getElementById("btnLogout")?.closest("li");

        // Botão de utilizadores
        const liUsers = document.createElement("li");
        liUsers.innerHTML = `
          <a class="btn-menu" href="/private/utilizadores.html">
            <i class="fas fa-users"></i> Utilizadores
          </a>
        `;
        if (logoutLi) {
          menu.insertBefore(liUsers, logoutLi);
        } else {
          menu.appendChild(liUsers);
        }

        // Botão de fechos
        const liFechos = document.createElement("li");
        liFechos.innerHTML = `
          <a class="btn-menu" href="/dashboard/fechos">
            <i class="fas fa-clock"></i> Fechos
          </a>
        `;
        if (logoutLi) {
          menu.insertBefore(liFechos, logoutLi);
        } else {
          menu.appendChild(liFechos);
        }
      }
    } catch (e) {
      console.error("Erro ao verificar token:", e);
    }
  }
});
