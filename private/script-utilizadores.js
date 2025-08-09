// ====================================
// carregarUtilizadores()
// Obtém a lista de todos os utilizadores via API e preenche a tabela.
// ====================================
async function carregarUtilizadores() {
  try {
    // Faz pedido GET à rota protegida /api/todos-utilizadores
    const response = await fetch("/api/todos-utilizadores", {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token") // Token JWT do login
      }
    });

    // Converte resposta em JSON (array de utilizadores)
    const utilizadores = await response.json();

    // Limpa tabela antes de preencher
    const tbody = document.getElementById("tabelaUtilizadores");
    tbody.innerHTML = "";

    // Percorre cada utilizador recebido e adiciona uma linha à tabela
    utilizadores.forEach(u => {
      const tr = document.createElement("tr");

      // Define função (Administrador ou Utilizador comum)
      const role = u.username === "admin" ? "Administrador" : "Utilizador";
      const roleBadge = u.username === "admin" 
        ? `<span class="badge badge-admin">${role}</span>` 
        : `<span class="badge badge-user">${role}</span>`;

      // Linha HTML com botões de ação
      tr.innerHTML = `
        <td>${u.username}</td>
        <td>${roleBadge}</td>
        <td>
          <button class="btn-editar" data-user="${u.username}">
            <i class="fa-solid fa-key"></i> Alterar senha
          </button>
          <button class="btn-apagar" data-user="${u.username}">
            <i class="fa-solid fa-user-xmark"></i> Apagar
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // ====================================
    // Eventos para apagar utilizador
    // ====================================
    document.querySelectorAll(".btn-apagar").forEach(btn => {
      btn.addEventListener("click", async () => {
        const username = btn.dataset.user;
        if (confirm(`Deseja apagar o utilizador "${username}"?`)) {
          // Pedido DELETE à API
          const res = await fetch(`/api/utilizadores/${username}`, {
            method: "DELETE",
            headers: {
              Authorization: "Bearer " + localStorage.getItem("token")
            }
          });

          const data = await res.json();
          if (data.success) {
            alert("Utilizador apagado com sucesso!");
            carregarUtilizadores(); // Recarrega lista
          } else {
            alert(data.error || "Erro ao apagar utilizador.");
          }
        }
      });
    });

  } catch (err) {
    console.error("Erro ao carregar utilizadores:", err);
  }
}

// ====================================
// Carregar lista de utilizadores ao abrir a página
// ====================================
document.addEventListener("DOMContentLoaded", carregarUtilizadores);

// ====================================
// Editar senha de um utilizador
// ====================================
document.addEventListener("click", async (e) => {
  const editBtn = e.target.closest(".btn-editar");
  if (editBtn) {
    const username = editBtn.dataset.user;
    const novaSenha = prompt(`Nova senha para "${username}":`);
    if (novaSenha) {
      // Pedido PUT à API para atualizar senha
      const res = await fetch(`/api/utilizadores/${username}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + localStorage.getItem("token")
        },
        body: JSON.stringify({ novaSenha })
      });

      const data = await res.json();
      if (data.success) {
        alert("Senha atualizada com sucesso!");
      } else {
        alert(data.error || "Erro ao atualizar senha.");
      }
    }
  }
});

// ====================================
// Botão "Novo Utilizador" → redireciona para página de registo
// ====================================
document.getElementById("btnNovo").addEventListener("click", () => {
  window.location.href = "/register.html";
});

// ====================================
// Botão Logout → remove token e volta ao login
// ====================================
document.getElementById("btnLogout")?.addEventListener("click", () => {
  localStorage.removeItem("token");
  window.location.href = "/login.html";
});