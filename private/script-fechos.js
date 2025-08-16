// script-fechos.js
// Mapa de Fechos: lista de fechamentos de caixa (admin)

function getToken() {
  return localStorage.getItem("token");
}

async function fetchProtegido(url, options = {}) {
  const token = getToken();
  if (!token) {
    alert("Sessão expirada. Faça login novamente.");
    window.location.href = "/login.html";
    return;
  }
  options.headers = options.headers || {};
  options.headers["Authorization"] = `Bearer ${token}`;
  options.cache = "no-store";
  return fetch(url, options);
}

async function mostrarNomeUtilizador() {
  try {
    const resp = await fetchProtegido("/api/utilizador");
    const data = await resp.json();
    const span = document.querySelector(".nome-utilizador");
    if (span) span.textContent = data.username;
  } catch (e) {
    console.error("Erro ao obter utilizador:", e);
  }
}

async function carregarFechos() {
  try {
    const resp = await fetchProtegido("/api/fechos");
    if (!resp.ok) throw new Error("Erro ao carregar fechos");
    const fechamentos = await resp.json();
    preencherTabelaFechos(fechamentos);
  } catch (e) {
    console.error(e);
    alert("Não foi possível carregar o mapa de fechos.");
  }
}

// Preenche tabela de fechamentos mostrando apenas o valor do período entre fechamentos
function preencherTabelaFechos(items) {
  const tbody = document.querySelector("#tabelaFechos tbody");
  tbody.innerHTML = "";
  items.forEach((f, i) => {
    const periodValue = f.montante_periodo ?? f.total;
    const dt = new Date(f.created_at).toLocaleString("pt-PT");
    const tr = document.createElement("tr");
    tr.dataset.id = f.id;
    tr.innerHTML = `
      <td>${dt}</td>
      <td>${f.utilizador}</td>
      <td>${periodValue.toFixed(2)} €</td>
    `;
    criarBotoesOpcoes(tr);
    tbody.appendChild(tr);
  });
}

function criarBotoesOpcoes(linha) {
  const cellOpcoes = linha.insertCell();
  cellOpcoes.classList.add("col-opcoes");

  const id = linha.dataset.id;

  // Botão APAGAR
  const btnApagar = document.createElement("button");
  btnApagar.innerHTML = '<i class="fas fa-trash"></i> Apagar';
  btnApagar.className = "btn-apagar-linha";
  cellOpcoes.appendChild(btnApagar);

  btnApagar.onclick = async function () {
    const confirmar = confirm("Tem certeza que deseja apagar este fecho?");
    if (!confirmar) return;

    try {
      const response = await fetchProtegido(`/api/fechos/${id}`, {
        method: "DELETE",
      });
      const resultado = await response.json();
      if (response.ok && resultado.success) {
        linha.remove();
      } else {
        alert("Erro ao apagar: " + (resultado.error || "desconhecido"));
      }
    } catch (err) {
      console.error("Erro ao apagar fecho:", err);
      alert("Erro ao comunicar com o servidor.");
    }
  };
}

function configurarLogout() {
  const btn = document.getElementById("btnLogout");
  if (btn) {
    btn.addEventListener("click", () => {
      if (confirm("Deseja Sair ?")) {
        localStorage.removeItem("token");
        window.location.href = "/login.html";
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  mostrarNomeUtilizador();
  carregarFechos();
  configurarLogout();
});
