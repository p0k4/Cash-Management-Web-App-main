// script-analise.js (corrigido: filtros, destruição de gráficos, robustez)

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

let chartDonut = null;
let chartBar = null;

async function carregarTotaisPorPagamento() {
  const inicio = document.getElementById("dataInicio").value;
  const fim = document.getElementById("dataFim").value;

  if (!inicio || !fim) {
    alert("Por favor, selecione o intervalo de datas.");
    return;
  }

  const params = new URLSearchParams();
  params.append("inicio", inicio);
  params.append("fim", fim);

  try {
    const res = await fetchProtegido(`/api/registos/intervalo?${params.toString()}`);

    if (res.status === 401) {
      alert("Sessão expirada. Faça login novamente.");
      window.location.href = "/login.html";
      return;
    }

    if (!res.ok) {
      alert("Erro ao carregar totais. Código: " + res.status);
      return;
    }

    const registos = await res.json();

    if (!Array.isArray(registos)) {
      alert("Resposta inesperada do servidor.");
      console.error("Resposta inesperada:", registos);
      return;
    }

    // Totais para donut
    const totais = {
      Dinheiro: 0,
      Multibanco: 0,
      "Transferência Bancária": 0,
    };

    // Totais diários para barras
    const totaisPorDia = {};

    registos.forEach((r) => {
      let metodoRaw = (r.pagamento || "").trim().toLowerCase();
      const valor = parseFloat(r.valor || 0);
      const data = r.data;

      console.log("Método pagamento recebido:", r.pagamento);

      if (!isNaN(valor)) {
        // Normalizar método para as chaves do objeto totais
        let metodo = null;
        if (metodoRaw.includes("dinheiro")) {
          metodo = "Dinheiro";
        } else if (metodoRaw.includes("multibanco")) {
          metodo = "Multibanco";
        } else if (metodoRaw.includes("transferência")) {
          metodo = "Transferência Bancária";
        } else {
          console.warn("Método de pagamento não reconhecido:", r.pagamento);
        }

        if (metodo) {
          // Donut
          if (totais.hasOwnProperty(metodo)) {
            totais[metodo] += valor;
          }

          // Barras
          if (!totaisPorDia[data]) {
            totaisPorDia[data] = {
              Dinheiro: 0,
              Multibanco: 0,
              "Transferência Bancária": 0,
            };
          }
          if (totaisPorDia[data][metodo] !== undefined) {
            totaisPorDia[data][metodo] += valor;
          }
        }
      }
    });

    desenharGraficoDonut(totais);
    desenharGraficoBarras(totaisPorDia);
  } catch (err) {
    console.error("Erro ao carregar totais:", err);
    alert("Erro ao carregar totais.");
  }
}

function desenharGraficoDonut(totais) {
  const canvas = document.getElementById("graficoPagamentos");
  if (!canvas) {
    console.error("Canvas do gráfico não encontrado!");
    return;
  }
  const ctx = canvas.getContext("2d");

  if (chartDonut) {
    chartDonut.destroy();
  }

  chartDonut = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: Object.keys(totais),
      datasets: [
        {
          label: "Totais por pagamento",
          data: Object.values(totais),
          backgroundColor: [
            "#4caf50", // Dinheiro
            "#2196f3", // Multibanco
            "#ff9800", // Transferência
          ],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom",
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const valor = context.raw.toFixed(2);
              return `${context.label}: ${valor} €`;
            },
          },
        },
      },
    },
  });
}

function desenharGraficoBarras(totaisPorDia) {
  const canvas = document.getElementById("graficoTotaisDiarios");
  if (!canvas) {
    console.error("Canvas do gráfico de barras não encontrado!");
    return;
  }
  const ctx = canvas.getContext("2d");

  if (chartBar) {
    chartBar.destroy();
  }

  const labels = Object.keys(totaisPorDia).sort();
  const dadosDinheiro = labels.map((d) => totaisPorDia[d].Dinheiro);
  const dadosMB = labels.map((d) => totaisPorDia[d].Multibanco);
  const dadosTransf = labels.map((d) => totaisPorDia[d]["Transferência Bancária"]);

  chartBar = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Dinheiro",
          data: dadosDinheiro,
          backgroundColor: "#4caf50",
        },
        {
          label: "Multibanco",
          data: dadosMB,
          backgroundColor: "#2196f3",
        },
        {
          label: "Transferência Bancária",
          data: dadosTransf,
          backgroundColor: "#ff9800",
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "top",
        },
      },
      scales: {
        x: {
          stacked: true,
        },
        y: {
          stacked: true,
          beginAtZero: true,
        },
      },
    },
  });
}

document.addEventListener("DOMContentLoaded", () => {
  // Preencher datas padrão (últimos 7 dias)
  const hoje = new Date();
  const seteDiasAtras = new Date();
  seteDiasAtras.setDate(hoje.getDate() - 6);

  document.getElementById("dataFim").value = hoje.toISOString().slice(0, 10);
  document.getElementById("dataInicio").value = seteDiasAtras.toISOString().slice(0, 10);

  carregarTotaisPorPagamento();

  document.getElementById("btnPesquisar").addEventListener("click", () => {
    carregarTotaisPorPagamento();
  });
});
