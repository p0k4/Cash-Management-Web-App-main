// script-historico.js

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
  return fetch(url, options);
}

async function buscarPorIntervalo() {
  const inicio = document.getElementById("dataInicio").value;
  const fim = document.getElementById("dataFim").value;

  if (!inicio || !fim) {
    alert("Seleciona datas válidas!");
    return;
  }

  try {
    const resposta = await fetchProtegido(`/api/registos/intervalo?inicio=${inicio}&fim=${fim}`);
    if (!resposta.ok) throw new Error("Erro ao buscar registos");

    const registos = await resposta.json();
    preencherTabela(registos);
    atualizarSaldos(registos);
  } catch (err) {
    console.error("Erro ao buscar registos:", err);
    alert("Erro ao buscar registos.");
  }
}

function preencherTabela(registos) {
  const tbody = document.querySelector("#tabelaHistorico tbody");
  tbody.innerHTML = "";

  registos.forEach((reg) => {
    const tr = document.createElement("tr");

    const data = new Date(reg.data).toLocaleDateString("pt-PT");
    const pagamento = reg.pagamento + (reg.pagamento === "Multibanco" && reg.op_tpa ? ` (OP TPA: ${reg.op_tpa})` : "");
    const valor = parseFloat(reg.valor).toFixed(2) + " €";
    const numDoc = reg.numdoc || ""; // Garante que mostra vazio se não existir

    tr.innerHTML = `
      <td>${data}</td>
      <td>${numDoc}</td> <!-- ALTERADO -->
      <td>${pagamento}</td>
      <td>${valor}</td>
    `;

    tbody.appendChild(tr);
  });
}

function atualizarSaldos(registos) {
  let dinheiro = 0, mb = 0, transf = 0, total = 0;

  registos.forEach((reg) => {
    const valor = parseFloat(reg.valor);
    if (isNaN(valor)) return;
    total += valor;

    if (reg.pagamento === "Dinheiro") dinheiro += valor;
    else if (reg.pagamento === "Multibanco") mb += valor;
    else if (reg.pagamento === "Transferência Bancária") transf += valor;
  });

  document.getElementById("saldoDinheiro").textContent = dinheiro.toFixed(2) + " €";
  document.getElementById("saldoMultibanco").textContent = mb.toFixed(2) + " €";
  document.getElementById("saldoTransferencia").textContent = transf.toFixed(2) + " €";
  document.getElementById("saldoTotal").textContent = total.toFixed(2) + " €";
}

window.addEventListener("DOMContentLoaded", () => {
  // Opcionalmente carregar dados de hoje por defeito
});

function exportarPDFHistorico() {
  if (
    !window.jspdf ||
    !window.jspdf.jsPDF ||
    typeof window.jspdf.jsPDF !== "function"
  ) {
    alert("jsPDF ou AutoTable não está carregado corretamente.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const data = [];
  let total = 0;

  const linhas = document.querySelectorAll("#tabelaHistorico tbody tr");

  linhas.forEach((linha) => {
    const tds = linha.querySelectorAll("td");
    const dataCell = tds[0].textContent.trim();
    const numDocCell = tds[1].textContent.trim();
    const pagamentoCell = tds[2].textContent.trim();
    let valorTexto = tds[3].textContent.trim().replace(" €", "");

    const valorNum = parseFloat(valorTexto.replace(",", "."));
    if (!isNaN(valorNum)) total += valorNum;

    data.push([
      dataCell,
      numDocCell,
      pagamentoCell,
      valorNum.toFixed(2) + " €",
    ]);
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Histórico de Movimentos", 105, 15, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const dataHora = new Date().toLocaleString("pt-PT");
  doc.text(`Exportado em: ${dataHora}`, 105, 22, { align: "center" });

  const token = localStorage.getItem("token");
  let username = "Desconhecido";
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      username = payload.username || "Desconhecido";
    } catch (e) {
      console.warn("Erro ao ler token para PDF:", e);
    }
  }

  doc.text(`Emitido por: ${username}`, 105, 28, { align: "center" });

  doc.autoTable({
    head: [["Data", "Nº Documento", "Pagamento", "Valor"]],
    body: data,
    startY: 35,
    styles: {
      halign: "center",
      fontSize: 10,
    },
    headStyles: {
      fillColor: [13, 74, 99],
      textColor: 255,
      fontStyle: "bold",
    },
  });

  doc.setFont("helvetica", "bold");
  doc.text(`Total: ${total.toFixed(2)} €`, 200, doc.lastAutoTable.finalY + 10, {
    align: "right",
  });

  doc.save(`historico_movimentos_${new Date().toISOString().split("T")[0]}.pdf`);
}
function exportarCSVHistorico() {
  let csvContent = "Data,Nº Doc,Pagamento,Valor\n";

  document.querySelectorAll("#tabelaHistorico tbody tr").forEach((tr) => {
    const linha = Array.from(tr.children)
      .map(td => `"${td.textContent.trim()}"`)
      .join(",");
    csvContent += linha + "\n";
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");

  const dataInicio = document.getElementById("dataInicio").value;
  const dataFim = document.getElementById("dataFim").value;

  const nomeFicheiro = `historico_${dataInicio}_a_${dataFim}.csv`;

  link.setAttribute("href", URL.createObjectURL(blob));
  link.setAttribute("download", nomeFicheiro);
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function exportarCSVHistorico() {
  const tabela = document.getElementById("tabelaHistorico");
  let csv = "";
  let total = 0;
  const linhas = tabela.querySelectorAll("tr");

  linhas.forEach((linha, idx) => {
    const celulas = linha.querySelectorAll("th, td");
    let linhaCSV = [];

    celulas.forEach((celula, index) => {
      let texto = celula.textContent.replace(/\n/g, "").trim();
      texto = texto.replace(/;/g, ","); // evita problemas com separador
      linhaCSV.push(`"${texto}"`);

      // Soma valor da coluna Valor (última)
      if (idx > 0 && index === 3) {
        let valor = parseFloat(texto.replace("€", "").replace(",", "."));
        if (!isNaN(valor)) total += valor;
      }
    });

    csv += linhaCSV.join(";") + "\n";
  });

  csv += `\n;;;"Total: ${total.toFixed(2)} €"`;

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `historico_movimentos_${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
}

function fazerLogout() {
  localStorage.removeItem("token");
  window.location.href = "/login.html";
}

document.addEventListener("DOMContentLoaded", () => {
  const btnLogout = document.getElementById("btnLogout");
  if (btnLogout) {
    btnLogout.addEventListener("click", fazerLogout);
  }
});



async function mostrarNomeUtilizador() {
  try {
    const response = await fetchProtegido("/api/utilizador");
    const dados = await response.json();

    const span = document.querySelector(".nome-utilizador");
    if (span) {
      span.textContent = dados.username;
    }
  } catch (err) {
    console.error("Erro ao obter utilizador:", err);
  }
}

document.addEventListener("DOMContentLoaded", mostrarNomeUtilizador);