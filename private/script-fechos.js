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

async function carregarUtilizadoresFecho() {
  try {
    const resposta = await fetch("/api/utilizadores");
    const utilizadores = await resposta.json();
    const select = document.getElementById("filtroUtilizadorFecho");
    if (!select) return;

    select.innerHTML = '<option value="">Todos</option>';
    utilizadores.forEach((u) => {
      const opt = document.createElement("option");
      opt.value = u;
      opt.textContent = u;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error("Erro ao carregar utilizadores:", err);
  }
}

// Buscar fechos filtrados por data/utilizador
async function buscarFechosFiltrados() {
  const inicio = document.getElementById("filtroDataInicio").value;
  const fim = document.getElementById("filtroDataFim").value;
  const utilizador = document.getElementById("filtroUtilizadorFecho").value;

  const params = new URLSearchParams();
  if (inicio) params.append("inicio", inicio);
  if (fim) params.append("fim", fim);
  if (utilizador) params.append("utilizador", utilizador);

  try {
    const resposta = await fetchProtegido(`/api/fechos/intervalo?${params.toString()}`);
    if (!resposta.ok) throw new Error("Erro ao buscar fechos");
    const fechos = await resposta.json();
    preencherTabelaFechos(fechos);
  } catch (err) {
    console.error("Erro ao buscar fechos:", err);
    alert("Erro ao buscar fechos.");
  }
}

// Preenche tabela de fechamentos
function preencherTabelaFechos(items) {
  const tbody = document.querySelector("#tabelaFechos tbody");
  tbody.innerHTML = "";
  items.forEach((f) => {
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
  carregarUtilizadoresFecho();

  const btnPesquisar = document.getElementById("btnPesquisar");
  if (btnPesquisar) {
    btnPesquisar.addEventListener("click", buscarFechosFiltrados);
  }
});
