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

  const labels = Object.keys(agrupado);
  const valores = labels.map(data => agrupado[data].total);

  // 👇 Se só existir um ponto, duplica-o com um dia antes só para formar linha
  if (labels.length === 1) {
    const unicaData = labels[0];
    const valorUnico = valores[0];

    const dataAnterior = new Date(unicaData);
    dataAnterior.setDate(dataAnterior.getDate() - 1);
    const dataFake = dataAnterior.toISOString().slice(0, 10);

    labels.unshift(dataFake);
    valores.unshift(0); // ou repetir o mesmo valor, mas melhor 0
  }

  chartEvolucao = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Total € por dia",
        data: valores,
        backgroundColor: "rgba(0, 123, 255, 0.3)",
        borderColor: "#007bff",
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 1500,
        easing: 'easeOutQuart'
      },
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'day',
            tooltipFormat: 'yyyy-MM-dd',
            displayFormats: {
              day: 'yyyy-MM-dd'
            },
            round: 'day'
          },
          ticks: {
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 10
          }
        },
        y: {
          beginAtZero: true,
          min: 0,
          max: Math.max(20, Math.max(...valores) * 1.1),
          ticks: {
            callback: valor => `${valor.toFixed(2)} €`
          },
          grace: '5%',
        }
      }
    }
  });
}

function preencherTabela(dados) {
  const tbody = document.getElementById("tabelaResumoBody");
  tbody.innerHTML = "";

  let totalLinha = {
    vendas_com_iva: 0,
    vendas: 0,
    custos: 0,
    resultado: 0,
    numero_vendas: 0,
    retificacoes: 0,
  };

  dados.forEach((u) => {
    const linha = document.createElement("tr");
    linha.innerHTML = `
      <td>${u.utilizador}</td>
      <td>${u.vendas_com_iva.toFixed(2)} €</td>
      <td>${u.vendas.toFixed(2)} €</td>
      <td>${u.custos.toFixed(2)} €</td>
      <td>${u.resultado.toFixed(2)} €</td>
      <td>${u.numero_vendas}</td>
    `;
    tbody.appendChild(linha);

    totalLinha.vendas_com_iva += u.vendas_com_iva;
    totalLinha.vendas += u.vendas;
    totalLinha.custos += u.custos;
    totalLinha.resultado += u.resultado;
    totalLinha.numero_vendas += u.numero_vendas;
  });

  // Linha TOTAL
  const linhaTotal = document.createElement("tr");
  linhaTotal.style.fontWeight = "bold";
  linhaTotal.innerHTML = `
    <td>TOTAL</td>
    <td>${totalLinha.vendas_com_iva.toFixed(2)} €</td>
    <td>${totalLinha.vendas.toFixed(2)} €</td>
    <td>${totalLinha.custos.toFixed(2)} €</td>
    <td>${totalLinha.resultado.toFixed(2)} €</td>
    <td>${totalLinha.numero_vendas}</td>
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
});
