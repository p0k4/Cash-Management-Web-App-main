const token = localStorage.getItem("token");
let username = "Desconhecido";

if (!token) {
  window.location.href = "/login.html";
} else {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    username = payload.username || "Desconhecido";
    const spanNome = document.querySelector(".nome-utilizador");
    if (spanNome) spanNome.textContent = username;
  } catch (e) {
    console.warn("Token inválido ou expirado.", e);
    window.location.href = "/login.html";
  }
}

async function fetchProtegido(url, options = {}) {
  options.headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
  };
  return fetch(url, options);
}

let chartEvolucao = null;

async function carregarAnalise() {
  const inicio = document.getElementById("dataInicio").value;
  const fim = document.getElementById("dataFim").value;
  const utilizador = document.getElementById("filtroUtilizador").value;
  const pagamento = document.getElementById("filtroPagamento").value;

  if (!inicio || !fim) {
    alert("Por favor, selecione as datas.");
    return;
  }

  const params = new URLSearchParams({
    inicio,
    fim,
    utilizador,
    pagamento,
  });

  try {
    const res = await fetchProtegido(`/api/analise?${params.toString()}`);
    if (res.status === 401) {
      alert("Sessão expirada. Faça login novamente.");
      window.location.href = "/login.html";
      return;
    }

    const dados = await res.json();
    console.log("📦 API /analise agrupadoPorData:", dados.agrupadoPorData);
    if (
      !dados ||
      typeof dados.agrupadoPorData !== "object" ||
      !Array.isArray(dados.resumoPorUtilizador)
    ) {
      console.warn("Resposta inesperada:", dados);
      alert("Erro ao carregar dados de análise.");
      return;
    }

    desenharGrafico(dados.agrupadoPorData);
    preencherTabela(dados.resumoPorUtilizador);
  } catch (err) {
    console.error("Erro ao carregar análise:", err);
    alert("Erro ao carregar análise.");
  }
}

function desenharGrafico(agrupado) {
  const ctx = document.getElementById("graficoEvolucao").getContext("2d");
  if (chartEvolucao) chartEvolucao.destroy();

  const inicio = new Date(document.getElementById("dataInicio").value);
  const fim = new Date(document.getElementById("dataFim").value);

  const labels = [];
  const valores = [];

  for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
    const dataStr = d.toISOString().slice(0, 10);
    labels.push(dataStr);
    valores.push(agrupado[dataStr]?.total || 0); // ou null se quiseres buracos no gráfico
  }

  chartEvolucao = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Total € por dia",
          data: valores,
          backgroundColor: "rgba(0, 123, 255, 0.3)",
          borderColor: "#007bff",
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 4,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 1500,
        easing: "easeOutQuart",
      },
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: {
          type: "time",
          time: {
            unit: "day",
            tooltipFormat: "yyyy-MM-dd",
            displayFormats: {
              day: "yyyy-MM-dd",
            },
          },
          ticks: {
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 10,
          },
        },
        y: {
          beginAtZero: true,
          min: 0,
          max: Math.max(20, Math.max(...valores) * 1.1),
          ticks: {
            callback: (valor) => `${valor.toFixed(2)} €`,
          },
          grace: "5%",
        },
      },
    },
  });
}

function preencherTabela(dados) {
  const tbody = document.getElementById("tabelaResumoBody");
  tbody.innerHTML = "";

  let totalLinha = {
    vendas_com_iva: 0,
    numero_vendas: 0,
    dinheiro: 0,
    multibanco: 0,
    transferencia: 0,
  };

  dados.forEach((u) => {
    const linha = document.createElement("tr");
    linha.innerHTML = `
      <td>${u.utilizador || ""}</td>
      <td>${(u.dinheiro || 0).toFixed(2)} €</td>
      <td>${(u.multibanco || 0).toFixed(2)} €</td>
      <td>${(u.transferencia || 0).toFixed(2)} €</td>
      <td>${u.numero_vendas || 0}</td>
      <td>${(u.vendas_com_iva || 0).toFixed(2)} €</td>
    `;
    tbody.appendChild(linha);

    totalLinha.vendas_com_iva += u.vendas_com_iva || 0;
    totalLinha.numero_vendas += u.numero_vendas || 0;
    totalLinha.dinheiro += u.dinheiro || 0;
    totalLinha.multibanco += u.multibanco || 0;
    totalLinha.transferencia += u.transferencia || 0;
  });

  // Linha TOTAL
  const linhaTotal = document.createElement("tr");
  linhaTotal.style.fontWeight = "bold";
  linhaTotal.innerHTML = `
    <td>TOTAL</td>
    <td>${totalLinha.dinheiro.toFixed(2)} €</td>
    <td>${totalLinha.multibanco.toFixed(2)} €</td>
    <td>${totalLinha.transferencia.toFixed(2)} €</td>
    <td>${totalLinha.numero_vendas}</td>
    <td>${totalLinha.vendas_com_iva.toFixed(2)} €</td>
  `;
  tbody.appendChild(linhaTotal);
}

document.addEventListener("DOMContentLoaded", () => {
  const hoje = new Date();
  const seteDiasAtras = new Date();
  seteDiasAtras.setDate(hoje.getDate() - 6);

  document.getElementById("dataFim").value = hoje.toISOString().slice(0, 10);
  document.getElementById("dataInicio").value = seteDiasAtras
    .toISOString()
    .slice(0, 10);

  carregarAnalise();

  document
    .getElementById("btnPesquisar")
    .addEventListener("click", carregarAnalise);

  // Adicionar listener para botão exportar PDF
  const btnExportarPDF = document.querySelector(".btn-exportar-pdf");
  if (btnExportarPDF) {
    btnExportarPDF.addEventListener("click", exportarPDFResumo);
  }
});

async function exportarPDFResumo() {
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
  let totalLinhaNumeroVendas = 0;
  let totalLinhaDinheiro = 0;
  let totalLinhaMultibanco = 0;
  let totalLinhaTransferencia = 0;

  const linhas = document.querySelectorAll("#tabelaResumoBody tr");

  linhas.forEach((linha) => {
    const tds = linha.querySelectorAll("td");
    const utilizadorCell = tds[0].textContent.trim();
    const dinheiroCell = tds[1].textContent.trim();
    const multibancoCell = tds[2].textContent.trim();
    const transferenciaCell = tds[3].textContent.trim();
    const numeroVendasCell = tds[4].textContent.trim();
    const totalVendasCell = tds[5].textContent.trim();

    const dinheiroNum = parseFloat(
      dinheiroCell.replace(" €", "").replace(",", ".")
    );
    const multibancoNum = parseFloat(
      multibancoCell.replace(" €", "").replace(",", ".")
    );
    const transferenciaNum = parseFloat(
      transferenciaCell.replace(" €", "").replace(",", ".")
    );
    const totalVendasNum = parseFloat(
      totalVendasCell.replace(" €", "").replace(",", ".")
    );
    const numeroVendasNum = parseInt(numeroVendasCell) || 0;

    total += totalVendasNum;
    totalLinhaNumeroVendas += numeroVendasNum;
    totalLinhaDinheiro += dinheiroNum;
    totalLinhaMultibanco += multibancoNum;
    totalLinhaTransferencia += transferenciaNum;

    data.push([
      utilizadorCell,
      dinheiroCell,
      multibancoCell,
      transferenciaCell,
      numeroVendasCell,
      totalVendasCell,
    ]);
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Totais por Utilizador", 105, 15, { align: "center" });

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
    head: [
      [
        "Utilizador",
        "Dinheiro",
        "Multibanco",
        "Transferência",
        "Nº Vendas",
        "Total Vendas",
      ],
    ],
    body: data,
    startY: 35,
    styles: { halign: "center", fontSize: 10 },
    headStyles: { fillColor: [13, 74, 99], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [240, 240, 240] },
    columnStyles: {
      0: { fontStyle: "bold" },
    },
  });

  doc.save(`totais_utilizador_${new Date().toISOString().split("T")[0]}.pdf`);
}
