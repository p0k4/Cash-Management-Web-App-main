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
      exportarResumoPDF(id); // ← ajusta se usares outro nome
    } catch (err) {
      console.error("Erro ao emitir resumo:", err);
      alert("Erro ao emitir resumo.");
    }
  };

  // Botão Apagar
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

async function exportarResumoPDF() {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert("jsPDF ou AutoTable não está carregado corretamente.");
    return;
  }

  const token = localStorage.getItem("token");
  if (!token) {
    alert("Sessão expirada. Faça login novamente.");
    return;
  }

  // 1) Buscar os totais atuais ao backend (respeita fecho / reabertura)
  let dinheiro = 0, multibanco = 0, transferencia = 0, total = 0;

  try {
    const resp = await fetch("/api/saldos-hoje", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, "Cache-Control": "no-store" }
    });

    const dados = await resp.json();
    if (!resp.ok) throw new Error(dados.erro || "Erro ao obter saldos");

    // Quando está fechado, o backend devolve os valores do fecho (podem ser 0).
    // Quando há registos depois do fecho, devolve só o período ativo.
    dinheiro = parseFloat(dados.dinheiro || 0);
    multibanco = parseFloat(dados.multibanco || 0);
    transferencia = parseFloat(dados.transferencia || 0);
    total = parseFloat(dados.total || (dinheiro + multibanco + transferencia));
  } catch (e) {
    console.error("Erro ao obter saldos para o PDF:", e);
    alert("Não foi possível gerar o resumo. Verifique a ligação ao servidor.");
    return;
  }

  console.log("exportarResumoPDF - saldosFechadosHoje:", typeof saldosFechadosHoje !== "undefined" ? saldosFechadosHoje : "undefined");
  console.log("exportarResumoPDF - dinheiro:", dinheiro, "multibanco:", multibanco, "transferencia:", transferencia);

  // Bloqueia exportação se saldos do dashboard estiverem a zero ou fechados
  // if (
  //   (typeof saldosFechadosHoje !== "undefined" && saldosFechadosHoje && dinheiro === 0 && multibanco === 0 && transferencia === 0) ||
  //   (Number.isFinite(dinheiro) && Number.isFinite(multibanco) && Number.isFinite(transferencia) &&
  //     dinheiro === 0 && multibanco === 0 && transferencia === 0)
  // ) {
  //   alert("Não existem valores a exportar.");
  //   return;
  // }

  // 2) Gerar PDF com jsPDF
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const dataHora = new Date().toLocaleString("pt-PT");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(13, 74, 99);
  doc.text("Resumo de Caixa", 105, 20, { align: "center" });

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50);
  doc.text(`Exportado em: ${dataHora}`, 105, 28, { align: "center" });

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
  doc.text(`${dinheiro.toFixed(2)} €`, 160, y, { align: "right" });

  y += 8;
  doc.text(`Multibanco`, 30, y);
  doc.text(`${multibanco.toFixed(2)} €`, 160, y, { align: "right" });

  y += 8;
  doc.text(`Transferência Bancária`, 30, y);
  doc.text(`${transferencia.toFixed(2)} €`, 160, y, { align: "right" });

  y += 12;
  doc.setDrawColor(13, 74, 99);
  doc.line(20, y, 190, y);

  y += 10;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 102, 51);
  doc.text(`TOTAL GERAL: ${total.toFixed(2)} €`, 105, y, { align: "center" });

  y += 20;
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(120);
  doc.text("Documento gerado pelo Sistema POS", 105, y, { align: "center" });

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const username = payload.username || "Desconhecido";
    y += 8;
    doc.text(`Emitido por: ${username}`, 105, y, { align: "center" });
  } catch {}

  doc.save(`resumo_caixa_${new Date().toISOString().split("T")[0]}.pdf`);
}
