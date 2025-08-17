// script-fechos.js
// Mapa de Fechos: lista de fechamentos de caixa (admin)

function getToken() {
  return localStorage.getItem("token");
}

let eAdmin = false;

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
    utilizadorAtual = data.username;

    // Atualiza a flag global
    eAdmin = (utilizadorAtual === "admin");
  } catch (e) {
    console.error("Erro ao obter utilizador:", e);
  }
}
async function carregarFechos() {
  try {
    const endpoint = eAdmin ? "/api/fechos" : "/api/fechos-user";
    const resp = await fetchProtegido(endpoint);
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
  const utilizador = document.getElementById("filtroUtilizadorFecho")?.value;

  const params = new URLSearchParams();
  if (inicio) params.append("inicio", inicio);
  if (fim) params.append("fim", fim);
  if (eAdmin && utilizador) params.append("utilizador", utilizador); // apenas admin

  const endpoint = eAdmin
    ? `/api/fechos/intervalo?${params.toString()}`
    : `/api/fechos/intervalo-user?${params.toString()}`;

  try {
    const resposta = await fetchProtegido(endpoint);
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

  const container = document.createElement("div");
  container.classList.add("acoes-utilizador");
  cellOpcoes.appendChild(container);

  // Botão Emitir Resumo
  const btnResumo = document.createElement("button");
  btnResumo.innerHTML = '<i class="fas fa-file-pdf"></i> emitir';
  btnResumo.className = "btn-emitir-linha"; // Usa estilo laranja do botão de exportar
  container.appendChild(btnResumo);

  btnResumo.onclick = async function () {
    try {
      // Chamar a tua função de emitir resumo (podes adaptar)
      exportarResumoPDF(id); 
    } catch (err) {
      console.error("Erro ao emitir resumo:", err);
      alert("Erro ao emitir resumo.");
    }
  };

  // Botão Apagar
  if (eAdmin) {
  const btnApagar = document.createElement("button");
  btnApagar.innerHTML = '<i class="fas fa-trash"></i> Apagar';
  btnApagar.className = "btn-apagar-linha";
  container.appendChild(btnApagar);

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

let utilizadorAtual = null;

document.addEventListener("DOMContentLoaded", async () => {
  await mostrarNomeUtilizador();
  configurarLogout();

  const filtros = document.querySelector(".filtros-fechos");

  if (utilizadorAtual === "admin") {
    eAdmin = true;
    if (filtros) filtros.style.display = "flex"; // Mostrar filtros para admin
    carregarUtilizadoresFecho(); // dropdown visível
  } else {
    eAdmin = false;
    if (filtros) {
      filtros.style.display = "flex"; // Mostrar filtros também para não admin

      // Esconder apenas o dropdown de utilizadores
      const selectUser = document.getElementById("filtroUtilizadorFecho");
      if (selectUser) selectUser.style.display = "none";

      // Esconder o ícone da silhueta
      const iconeUser = document.querySelector(".icone-utilizador-fecho");
      if (iconeUser) iconeUser.style.display = "none";
    }
  }

  const btnPesquisar = document.getElementById("btnPesquisar");
  if (btnPesquisar) {
    btnPesquisar.addEventListener("click", buscarFechosFiltrados);
  }

  carregarFechos();
});
async function exportarResumoPDF(id) {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert("jsPDF ou AutoTable não está carregado corretamente.");
    return;
  }

  const token = localStorage.getItem("token");
  if (!token) {
    alert("Sessão expirada. Faça login novamente.");
    return;
  }

  // 🔁 Buscar dados do fecho específico
  let dados;
  try {
    const resp = await fetch(`/api/fechos/${id}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Cache-Control": "no-store"
      }
    });
    dados = await resp.json();
    if (!resp.ok || !dados || !dados.total) throw new Error("Erro ao obter fecho.");
  } catch (e) {
    console.error("Erro ao buscar fecho para PDF:", e);
    alert("Erro ao gerar PDF. Verifique a ligação.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const dataHora = new Date(dados.created_at).toLocaleString("pt-PT");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(13, 74, 99);
  doc.text("Resumo de Fecho de Caixa", 105, 20, { align: "center" });

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50);
  doc.text(`Data/Hora: ${dataHora}`, 105, 28, { align: "center" });

  doc.setDrawColor(13, 74, 99);
  doc.line(20, 32, 190, 32);

  let y = 45;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(0);
  doc.text("Forma de Pagamento", 30, y);
  doc.text("Valor", 160, y, { align: "right" });

  y += 7;
  doc.setDrawColor(200);
  doc.line(20, y, 190, y);

  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);

  doc.text(`Dinheiro`, 30, y);
  doc.text(`${dados.dinheiro.toFixed(2)} €`, 160, y, { align: "right" });

  y += 8;
  doc.text(`Multibanco`, 30, y);
  doc.text(`${dados.multibanco.toFixed(2)} €`, 160, y, { align: "right" });

  y += 8;
  doc.text(`Transferência Bancária`, 30, y);
  doc.text(`${dados.transferencia.toFixed(2)} €`, 160, y, { align: "right" });

  y += 12;
  doc.setDrawColor(13, 74, 99);
  doc.line(20, y, 190, y);

  y += 10;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 102, 51);
  doc.text(`TOTAL: ${dados.total.toFixed(2)} €`, 105, y, { align: "center" });

  y += 12;
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0);
  doc.text(`Montante do Período: ${dados.montante_periodo.toFixed(2)} €`, 105, y, { align: "center" });

  y += 20;
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(120);
  doc.text("Documento gerado pelo sistema POS", 105, y, { align: "center" });

  y += 8;
  doc.text(`Emitido por: ${dados.utilizador}`, 105, y, { align: "center" });

  doc.save(`fecho_caixa_${dados.utilizador}_${id}.pdf`);
}