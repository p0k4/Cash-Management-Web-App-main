async function carregarUtilizadores() {
  try {
    const response = await fetch("/api/todos-utilizadores", {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    });
    const utilizadores = await response.json();

    const tbody = document.getElementById("tabelaUtilizadores");
    tbody.innerHTML = "";

    utilizadores.forEach(u => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${u.username}</td>
        <td>${u.username === "admin" ? "Administrador" : "Utilizador"}</td>
        <td>
          <button class="btn-editar" data-user="${u.username}">Editar</button>
          <button class="btn-apagar" data-user="${u.username}">Apagar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    document.querySelectorAll(".btn-apagar").forEach(btn => {
      btn.addEventListener("click", async () => {
        const username = btn.dataset.user;
        if (confirm(`Deseja apagar o utilizador "${username}"?`)) {
          const res = await fetch(`/api/utilizadores/${username}`, {
            method: "DELETE",
            headers: {
              Authorization: "Bearer " + localStorage.getItem("token")
            }
          });
          const data = await res.json();
          if (data.success) {
            alert("Utilizador apagado com sucesso!");
            carregarUtilizadores();
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

document.addEventListener("DOMContentLoaded", carregarUtilizadores);

document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("btn-editar")) {
    const username = e.target.dataset.user;
    const novaSenha = prompt(`Nova senha para "${username}":`);
    if (novaSenha) {
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

document.getElementById("btnCriarUtilizador").addEventListener("click", async () => {
  const username = document.getElementById("novoUsername").value.trim();
  const senha = document.getElementById("novaSenha").value;

  if (!username || !senha) {
    alert("Preenche todos os campos.");
    return;
  }

  const confirmar = confirm(`Criar utilizador "${username}"?`);
  if (!confirmar) return;

  try {
    const res = await fetch("/api/novo-utilizador", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token")
      },
      body: JSON.stringify({ username, senha })
    });

    const data = await res.json();
    if (data.success) {
      alert("Utilizador criado com sucesso!");
      document.getElementById("novoUsername").value = "";
      document.getElementById("novaSenha").value = "";
      document.getElementById("modalNovoUtilizador").style.display = "none";
      carregarUtilizadores();
    } else {
      alert(data.error || "Erro ao criar utilizador.");
    }
  } catch (err) {
    console.error("Erro ao criar utilizador:", err);
    alert("Erro inesperado.");
  }
});

// Abrir e fechar modal
document.getElementById("btnNovo").addEventListener("click", () => {
  document.getElementById("modalNovoUtilizador").style.display = "block";
});

document.getElementById("fecharModal").addEventListener("click", () => {
  document.getElementById("modalNovoUtilizador").style.display = "none";
});

window.addEventListener("click", (event) => {
  if (event.target.id === "modalNovoUtilizador") {
    document.getElementById("modalNovoUtilizador").style.display = "none";
  }
});

document.getElementById("btnLogout")?.addEventListener("click", () => {
  localStorage.removeItem("token");
  window.location.href = "/login.html";
});
