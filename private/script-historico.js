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