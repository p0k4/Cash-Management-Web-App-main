// script-analise.js

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

let grafico; // referência ao gráfico atual

async function carregarTotaisPorPagamento() {
  const inicio = document.getElementById("dataInicio").value;
  const fim = document.getElementById("dataFim").value;

  if (!inicio || !fim) {
    alert("Por favor, selecione o intervalo de datas.");
    return;
  }

  try {
    const url = `/api/registos/intervalo?inicio=${inicio}&fim=${fim}`;
    const res = await fetchProtegido(url);
    const registos = await res.json();

    const totais = {
      Dinheiro: 0,
      Multibanco: 0,
      "Transferência Bancária": 0,
    };

    registos.forEach((r) => {
      const metodo = (r.pagamento || "").split(" (")[0];
      const valor = parseFloat(r.valor || 0);
      if (!isNaN(valor) && totais.hasOwnProperty(metodo)) {
        totais[metodo] += valor;
      }
    });

    desenharGraficoDonut(totais);
  } catch (err) {
    console.error("Erro ao carregar totais:", err);
    alert("Erro ao carregar totais.");
  }
}

function desenharGraficoDonut(totais) {
  const ctx = document.getElementById("graficoPagamentos").getContext("2d");

  if (grafico) {
    grafico.destroy(); // apaga gráfico anterior antes de desenhar novo
  }

  grafico = new Chart(ctx, {
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

document.addEventListener("DOMContentLoaded", async () => {
  await carregarTotaisPorPagamento();

  document.getElementById("btnPesquisar").addEventListener("click", async () => {
    await carregarTotaisPorPagamento(); // atualiza com filtro
  });
});

async function carregarTotaisPorPagamento() {
  const inicio = document.getElementById("dataInicio").value;
  const fim = document.getElementById("dataFim").value;

  const params = new URLSearchParams();
  if (inicio && fim) {
    params.append("inicio", inicio);
    params.append("fim", fim);
  }

  try {
    const res = await fetchProtegido(`/api/registos/intervalo?${params.toString()}`);
    const registos = await res.json();

    const totais = {
      Dinheiro: 0,
      Multibanco: 0,
      "Transferência Bancária": 0,
    };

    registos.forEach((r) => {
      const metodo = (r.pagamento || "").split(" (")[0];
      const valor = parseFloat(r.valor || 0);
      if (!isNaN(valor) && totais.hasOwnProperty(metodo)) {
        totais[metodo] += valor;
      }
    });

    desenharGraficoDonut(totais);
  } catch (err) {
    console.error("Erro ao carregar totais:", err);
  }
}

let chart = null;

function desenharGraficoDonut(totais) {
  const ctx = document.getElementById("graficoPagamentos").getContext("2d");

  if (chart) {
    chart.destroy(); // remove o anterior
  }

  chart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: Object.keys(totais),
      datasets: [
        {
          label: "Totais por pagamento",
          data: Object.values(totais),
          backgroundColor: [
            "#28a745",
            "#007bff",
            "#ffc107",
          ],
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom",
        },
      },
    },
  });
}