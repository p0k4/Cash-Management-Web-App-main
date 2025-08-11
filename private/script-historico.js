// ====================================
// script-historico.js
// Histórico de movimentos e saldos por intervalo de datas
// ====================================

// ====================================
// Obter token do localStorage
// ====================================
function getToken() {
  return localStorage.getItem("token");
}

// ====================================
// fetchProtegido - adiciona token JWT no header
// ====================================
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

// ====================================
// Buscar registos por intervalo de datas
// ====================================
async function buscarPorIntervalo() {
  const inicio = document.getElementById("dataInicio").value;
  const fim = document.getElementById("dataFim").value;
  const utilizador = document.getElementById("filtroUtilizador").value.trim();
  const numDoc = document.getElementById("filtroNumDoc").value.trim();
  const pagamento = document.getElementById("filtroPagamento").value;

  // Se nenhum campo de pesquisa estiver preenchido, avisar o utilizador
  if (!inicio && !fim && !utilizador && !numDoc && !pagamento) {
    alert("preencha um campo de pesquisa !");
    return;
  }

  // Montar query string dinâmica (adicionar apenas campos preenchidos)
  const params = new URLSearchParams();
  if (inicio) params.append("inicio", inicio);
  if (fim) params.append("fim", fim);
  if (utilizador) params.append("utilizador", utilizador);
  if (numDoc) params.append("numdoc", numDoc);
  if (pagamento) params.append("pagamento", pagamento);

  try {
    const resposta = await fetchProtegido(`/api/registos/intervalo?${params.toString()}`);
    if (!resposta.ok) {
      // Tentar ler mensagem do servidor quando disponível
      let msg = "Erro ao buscar registos";
      try {
        const errBody = await resposta.json();
        if (errBody && errBody.error) msg = errBody.error;
      } catch (e) {
        // ignorar
      }
      throw new Error(msg);
    }

    const registos = await resposta.json();
    preencherTabela(registos);
    atualizarSaldos(registos);
  } catch (err) {
    console.error("Erro ao buscar registos:", err);
    alert("Erro ao buscar registos.");
  }
}

// ====================================
// Preencher tabela de histórico
// ====================================
function preencherTabela(registos) {
  const tbody = document.querySelector("#tabelaHistorico tbody");
  tbody.innerHTML = "";

  registos.forEach((reg) => {
    const tr = document.createElement("tr");

    const data = new Date(reg.data).toLocaleDateString("pt-PT");
    const pagamento = reg.pagamento + (reg.pagamento === "Multibanco" && reg.op_tpa ? ` (OP TPA: ${reg.op_tpa})` : "");
    const valor = parseFloat(reg.valor).toFixed(2) + " €";
    const numDoc = reg.numdoc || "";

    tr.innerHTML = `
      <td>${data}</td>
      <td>${numDoc}</td>
      <td>${pagamento}</td>
      <td>${reg.utilizador || reg.user || ""}</td>
      <td>${valor}</td>
    `;

    tbody.appendChild(tr);
  });
}

// ====================================
// Atualizar saldos no histórico
// ====================================
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

// ====================================
// Exportar histórico para PDF
// ====================================
function exportarPDFHistorico() {
  if (!window.jspdf || !window.jspdf.jsPDF || typeof window.jspdf.jsPDF !== "function") {
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
    const utilizadorCell = tds[3].textContent.trim();
    const valorNum = parseFloat(tds[4].textContent.trim().replace(" €", "").replace(",", "."));
    if (!isNaN(valorNum)) total += valorNum;

    data.push([dataCell, numDocCell, pagamentoCell, utilizadorCell, valorNum.toFixed(2) + " €"]);
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
    head: [["Data", "Nº Documento", "Pagamento", "Utilizador", "Valor"]],
    body: data,
    startY: 35,
    styles: { halign: "center", fontSize: 10 },
    headStyles: { fillColor: [13, 74, 99], textColor: 255, fontStyle: "bold" },
  });

  doc.setFont("helvetica", "bold");
  doc.text(`Total: ${total.toFixed(2)} €`, 200, doc.lastAutoTable.finalY + 10, { align: "right" });

  doc.save(`historico_movimentos_${new Date().toISOString().split("T")[0]}.pdf`);
}

 // ====================================
 // Exportar histórico para CSV (única versão)
 // ====================================
 function exportarCSVHistorico() {
   const tabela = document.getElementById("tabelaHistorico");
   let csv = "";
   let total = 0;
   const linhas = tabela.querySelectorAll("tr");

   linhas.forEach((linha, idx) => {
     const celulas = linha.querySelectorAll("th, td");
     let linhaCSV = [];

     celulas.forEach((celula, index) => {
       let texto = celula.textContent.replace(/\n/g, "").trim().replace(/;/g, ",");
       linhaCSV.push(`"${texto}"`);

       // Detecta a última coluna como sendo a coluna do Valor (funciona mesmo com colunas adicionais)
       if (idx > 0 && index === celulas.length - 1) {
         let valor = parseFloat(texto.replace("€", "").replace(",", "."));
         if (!isNaN(valor)) total += valor;
       }
     });

     csv += linhaCSV.join(";") + "\n";
   });

   // Adiciona total alinhado na última coluna (preenche colunas anteriores com vazio)
   const headerCount = (tabela.querySelectorAll("thead th").length) || (tabela.querySelectorAll("tr")[0]?.querySelectorAll("th,td").length) || 4;
   const empties = Array(Math.max(0, headerCount - 1)).fill('""').join(";");
   csv += `${empties};"Total: ${total.toFixed(2)} €"\n`;

   const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
   const url = URL.createObjectURL(blob);
   const link = document.createElement("a");
   link.href = url;
   link.download = `historico_movimentos_${new Date().toISOString().split("T")[0]}.csv`;
   link.click();
 }

 // ====================================
 // Logout do utilizador
 // ====================================
 function fazerLogout() {
   localStorage.removeItem("token");
   window.location.href = "/login.html";
 }
 
 document.addEventListener("DOMContentLoaded", () => {
   const btnLogout = document.getElementById("btnLogout");
   if (btnLogout) {
     btnLogout.addEventListener("click", () => {
       if (confirm("Deseja Sair ?")) {
         fazerLogout();
       }
     });
   }
 });
 
 // ====================================
 // Mostrar nome do utilizador logado
 // ====================================
 async function mostrarNomeUtilizador() {
   try {
     const response = await fetchProtegido("/api/utilizador");
     const dados = await response.json();
     const span = document.querySelector(".nome-utilizador");
     if (span) span.textContent = dados.username;
   } catch (err) {
     console.error("Erro ao obter utilizador:", err);
   }
 }
 
 // ====================================
 // Carregar lista de utilizadores para o filtro (dropdown)
 // ====================================
 async function carregarUtilizadores() {
   try {
     const resposta = await fetch("/api/utilizadores");
     if (!resposta.ok) throw new Error("Não foi possível obter a lista de utilizadores");
     const users = await resposta.json();
     const select = document.getElementById("filtroUtilizador");
     if (!select) return;
     // limpar e adicionar opção padrão
     select.innerHTML = '<option value="">Todos</option>';
     users.forEach((u) => {
       const opt = document.createElement("option");
       opt.value = u;
       opt.textContent = u;
       select.appendChild(opt);
     });
   } catch (err) {
     console.error("Erro ao carregar utilizadores:", err);
   }
 }
 
 document.addEventListener("DOMContentLoaded", () => {
   mostrarNomeUtilizador();
   carregarUtilizadores();
 });
