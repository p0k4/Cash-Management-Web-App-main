
// ======================================
// Proteção inicial - redireciona para login se não houver token
// ======================================
const token = localStorage.getItem('token');
if (!token) {
  window.location.href = '/login.html';
}

// ======================================
// fetchProtegido - todas as chamadas fetch usam Authorization
// ======================================
async function fetchProtegido(url, options = {}) {
  const headers = options.headers || {};
  headers['Authorization'] = `Bearer ${token}`;
  options.headers = headers;
  return fetch(url, options);
}

// Função para parse seguro com fallback
function parseIntSeguro(valor, fallback) {
  return (valor !== null && !isNaN(parseInt(valor))) ? parseInt(valor) : fallback;
}

// Carregar contadores salvos ou iniciar
let contadorOperacao = parseIntSeguro(localStorage.getItem("contadorOperacao"), 1);
let contadorDoc = parseIntSeguro(localStorage.getItem("contadorDoc"), null);

function setarDataAtual() {
  const dataInput = document.getElementById("data");
  const hoje = new Date().toISOString().split("T")[0];
  dataInput.value = hoje;
}

function atualizarHintProximoDoc() {
  const input = document.getElementById("num-doc");
  if (contadorDoc !== null) {
    input.placeholder = `${contadorDoc}`;
  } else {
    input.placeholder = "--> Nº DOC";
  }
}

function atualizarCampoOperacao() {
  const operacaoInput = document.getElementById("operacao");
  if (operacaoInput) {
    operacaoInput.value = "Operação " + contadorOperacao;
  }
}

function limparFormulario() {
  document.getElementById("num-doc").value = "";
  document.getElementById("pagamento").value = "";
  document.getElementById("valor").value = "";
  setarDataAtual();
  atualizarHintProximoDoc();
  atualizarCampoOperacao();
}

async function registar() {
  const valor = parseFloat(document.getElementById("valor").value);
  const pagamento = document.getElementById("pagamento").value;

  if (!pagamento) {
    alert("Por favor, selecione um método de pagamento.");
    return;
  }

  let pagamentoFinal = pagamento;
  const opTPA = pagamento === "Multibanco"
    ? document.getElementById("op-tpa").value.trim()
    : null;

 if (!isNaN(valor) && valor > 0 && valor <= 10000) {
    // Gera o rótulo da operação automaticamente
    const operacao = "Operação " + contadorOperacao;
    const data = document.getElementById("data").value;
    let numDocInput = document.getElementById("num-doc");

    if (contadorDoc === null) {
      contadorDoc = parseInt(numDocInput.value);
      if (isNaN(contadorDoc)) {
        alert("Insira um número de documento válido para iniciar.");
        return;
      }
      numDocInput.readOnly = true;
    }

    const numDoc = contadorDoc;
    contadorDoc++;
    numDocInput.value = contadorDoc;
    atualizarHintProximoDoc();

    try {
      const response = await fetchProtegido("/api/registar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operacao,   // Envia para o backend!
          data,
          numDoc,
          pagamento: pagamentoFinal,
          valor,
          op_tpa: opTPA,
        }),
      });
      const result = await response.json();

      if (response.ok && !result.error) {
        const tabela = document.getElementById("tabelaRegistos").querySelector("tbody");
        const novaLinha = tabela.insertRow();
        novaLinha.insertCell(0).textContent = operacao;
        novaLinha.insertCell(1).textContent = data;
        novaLinha.insertCell(2).textContent = numDoc;
        novaLinha.insertCell(3).textContent = pagamentoFinal;
        novaLinha.insertCell(4).textContent = valor.toFixed(2) + " €";
        criarBotoesOpcoes(novaLinha);

        contadorOperacao++;
        limparFormulario();
        atualizarTotalTabela();
      } else {
        alert("Erro ao registar: " + (result.error || "desconhecido"));
      }
    } catch (error) {
      console.error("Erro ao comunicar com o servidor:", error);
      alert("Erro ao comunicar com o servidor.");
    }

    localStorage.setItem("contadorOperacao", contadorOperacao);
    localStorage.setItem("contadorDoc", contadorDoc);
  } else {
    alert("Insira um valor válido!");
  }
}

async function carregarDadosDoServidor() {
  try {
    const response = await fetchProtegido("/api/registos");
    const dados = await response.json();
    const tabela = document.getElementById("tabelaRegistos").querySelector("tbody");
    tabela.innerHTML = "";
    dados.forEach((reg) => {
      const novaLinha = tabela.insertRow();
      novaLinha.insertCell(0).textContent = reg.operacao;
      novaLinha.insertCell(1).textContent = reg.data;
      novaLinha.insertCell(2).textContent = reg.numDoc !== undefined ? reg.numDoc : reg.numdoc;
      novaLinha.insertCell(3).textContent = reg.pagamento;
      novaLinha.insertCell(4).textContent = parseFloat(reg.valor).toFixed(2) + " €";
    });
    atualizarTotalTabela();
  } catch (err) {
    console.error("Erro ao carregar dados do servidor:", err);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  contadorOperacao = parseIntSeguro(localStorage.getItem("contadorOperacao"), 1);
  contadorDoc = parseIntSeguro(localStorage.getItem("contadorDoc"), null);

  setarDataAtual();
  atualizarHintProximoDoc();
  atualizarCampoOperacao();
  carregarDadosDoServidor();
});

// Salva os contadores antes de sair ou recarregar
window.addEventListener("beforeunload", () => {
  localStorage.setItem("contadorOperacao", contadorOperacao);
  localStorage.setItem("contadorDoc", contadorDoc);
});
function atualizarTotalTabela() {
  const tabela = document.getElementById("tabelaRegistos");
  const linhas = tabela.querySelectorAll("tbody tr");
  let total = 0;

  const totaisPorPagamento = {
    Dinheiro: 0,
    Multibanco: 0,
    "Transferência Bancária": 0,
  };

  linhas.forEach((linha) => {
    if (linha.style.display !== "none") {
      const valorTexto = linha.cells[4].textContent.replace("€", "").trim();
      let pagamento = linha.cells[3].textContent.trim();
      const metodoBase = pagamento.split(" (OP TPA")[0].trim();
      const valor = parseFloat(valorTexto.replace(",", "."));
      if (!isNaN(valor)) {
        total += valor;
        if (totaisPorPagamento[metodoBase] !== undefined) {
          totaisPorPagamento[metodoBase] += valor;
        }
      }
    }
  });

  document.getElementById("totalTabela").textContent =
    "Total: " + total.toFixed(2) + " €";

  const totalEl = document.getElementById("total");
  if (totalEl) totalEl.textContent = total.toFixed(2) + " €";

  const divTotaisPorPagamento = document.getElementById("totaisPagamento");
  if (divTotaisPorPagamento) {
    divTotaisPorPagamento.innerHTML = `
      <strong></strong>
      - Dinheiro: ${totaisPorPagamento["Dinheiro"].toFixed(2)} €<br/>
      - Multibanco: ${totaisPorPagamento["Multibanco"].toFixed(2)} €<br/>
      - Transferência Bancária: ${totaisPorPagamento[
        "Transferência Bancária"
      ].toFixed(2)} €
    `;
  }
}
function validarFormulario() {
  const campos = {
    data: document.getElementById("data"),
    numDoc: document.getElementById("num-doc"),
    pagamento: document.getElementById("pagamento"),
    valor: document.getElementById("valor"),
  };

  let valido = true;

  Object.values(campos).forEach((campo) => {
    if (!campo.value.trim()) {
      campo.classList.add("campo-invalido");
      valido = false;
    } else {
      campo.classList.remove("campo-invalido");
    }
  });
  return valido;
}

// Adiciona listeners de input aos campos do formulário
["data", "num-doc", "pagamento", "valor"].forEach((id) => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener("input", validarFormulario);
  }
});

function criarBotoesOpcoes(linha) {
  const cellOpcoes = linha.insertCell(5);
  cellOpcoes.classList.add("col-opcoes");

  const btnApagar = document.createElement("button");
  btnApagar.innerHTML = '<i class="fas fa-trash"></i> Apagar';
  btnApagar.className = "btn-apagar-linha";
  btnApagar.onclick = function () {
    const confirmar = confirm("Tem certeza que deseja apagar esta linha?");
    if (confirmar) {
      linha.remove();

      atualizarTotalTabela();
    }
  };

  const btnEditar = document.createElement("button");
  btnEditar.innerHTML = '<i class="fas fa-edit"></i> Editar';
  btnEditar.className = "btn-editar-linha";

  let valoresOriginais = [];

  btnEditar.onclick = function () {
    const estaEditando = btnEditar.textContent.includes("Guardar");

    if (!estaEditando) {
      valoresOriginais = [];

      for (let i = 0; i <= 4; i++) {
        const cell = linha.cells[i];
        const valorOriginal = cell.textContent.replace(" €", "");
        valoresOriginais.push(valorOriginal);
        cell.textContent = "";

        if (i === 3) {
          const select = document.createElement("select");
          ["Dinheiro", "Multibanco", "Transferência Bancária"].forEach(
            (opcao) => {
              const opt = document.createElement("option");
              opt.value = opcao;
              opt.textContent = opcao;
              if (valorOriginal.startsWith(opcao)) opt.selected = true;
              select.appendChild(opt);
            }
          );

          const opTPAInput = document.createElement("input");
          opTPAInput.type = "text";
          opTPAInput.placeholder = "OP TPA";
          opTPAInput.style.marginLeft = "0px";
          opTPAInput.style.width = "180px"; // 👈 ajusta aqui o tamanho como quiseres
          opTPAInput.style.display = valorOriginal.startsWith("Multibanco")
            ? "inline-block"
            : "none";
          opTPAInput.value = valorOriginal.includes("OP TPA")
            ? valorOriginal.split("OP TPA:")[1]?.replace(")", "").trim()
            : "";
          select.addEventListener("change", () => {
            opTPAInput.style.display =
              select.value === "Multibanco" ? "inline-block" : "none";
            if (select.value !== "Multibanco") opTPAInput.value = "";
          });

          cell.appendChild(select);
          cell.appendChild(opTPAInput);
        } else {
          const input = document.createElement("input");
          input.value = valorOriginal;
          input.style.width = "100%";
          cell.appendChild(input);
        }
      }

      btnEditar.innerHTML = '<i class="fas fa-check"></i> Guardar';

      const btnCancelar = document.createElement("button");
      btnCancelar.innerHTML = '<i class="fas fa-times"></i> Cancelar';
      btnCancelar.className = "btn-cancelar-linha";
      btnCancelar.onclick = function () {
        for (let i = 0; i <= 4; i++) {
          linha.cells[i].textContent =
            i === 4
              ? parseFloat(valoresOriginais[i]).toFixed(2) + " €"
              : valoresOriginais[i];
        }
        btnEditar.innerHTML = '<i class="fas fa-edit"></i> Editar';
        btnCancelar.remove();
        salvarDadosLocal();
        atualizarTotalTabela();
      };

      cellOpcoes.appendChild(btnCancelar);
    } else {
      for (let i = 0; i <= 4; i++) {
        if (i === 3) {
          const select = linha.cells[i].querySelector("select");
          const opTPA = linha.cells[i].querySelector("input");
          const pagamentoFinal =
            select.value === "Multibanco" && opTPA.value.trim()
              ? `${select.value} (OP TPA: ${opTPA.value.trim()})`
              : select.value;
          linha.cells[i].textContent = pagamentoFinal;
        } else {
          const input = linha.cells[i].querySelector("input");
          const valor =
            i === 4 ? parseFloat(input.value).toFixed(2) + " €" : input.value;
          linha.cells[i].textContent = valor;
        }
      }
      btnEditar.innerHTML = '<i class="fas fa-edit"></i> Editar';
      const cancelarBtn = cellOpcoes.querySelector(".btn-cancelar-linha");
      if (cancelarBtn) cancelarBtn.remove();
      salvarDadosLocal();
      atualizarTotalTabela();
    }
  };

  btnEditar.style.marginRight = "5px";
  cellOpcoes.appendChild(btnEditar);
  cellOpcoes.appendChild(btnApagar);
}
function exportarRelatorio() {
  const tabela = document.getElementById("tabelaRegistos");
  let csv = "";
  let total = 0;
  const linhas = tabela.querySelectorAll("tr");

  linhas.forEach((linha, idx) => {
    if (linha.style.display !== "none") {
      const celulas = linha.querySelectorAll("th, td");
      let linhaCSV = [];
      celulas.forEach((celula, index) => {
        if (index === 5) return; // Ignora "Opções"
        let texto = celula.textContent.replace(/\n/g, "").trim();
        texto = texto.replace(/;/g, ","); // Garante que não há conflitos com separador
        linhaCSV.push(`"${texto}"`); // Envolve em aspas por segurança
        if (idx > 0 && index === 4) {
          let valor = parseFloat(texto.replace("€", "").replace(",", "."));
          if (!isNaN(valor)) total += valor;
        }
      });
      csv += linhaCSV.join(";") + "\n";
    }
  });

  csv += "\n;;;;Total: " + total.toFixed(2) + " €";

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `relatorio_caixa_${
    new Date().toISOString().split("T")[0]
  }.csv`;
  link.click();
}

function exportarPDF() {
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

  const linhas = document.querySelectorAll("#tabelaRegistos tbody tr");

  linhas.forEach((linha) => {
    if (linha.style.display !== "none") {
      const tds = linha.querySelectorAll("td");
      const row = [];
      for (let i = 0; i < 5; i++) {
        let texto = tds[i].textContent.trim().replace(" €", "");
        if (i === 4) {
          const num = parseFloat(texto.replace(",", "."));
          if (!isNaN(num)) total += num;
          row.push(num.toFixed(2) + " €");
        } else {
          row.push(texto);
        }
      }
      data.push(row);
    }
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Relatório de Caixa", 105, 15, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const dataHora = new Date().toLocaleString("pt-PT");
  doc.text(`Exportado em: ${dataHora}`, 105, 22, { align: "center" });

  doc.autoTable({
    head: [["Operação", "Data", "Nº Documento", "Pagamento", "Valor"]],
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

  doc.save(`relatorio_caixa_${new Date().toISOString().split("T")[0]}.pdf`);
}
document
.getElementById("btnApagarTudo")
  .addEventListener("click", async function () {
      exportarResumoPDF();
    const confirmar = confirm("Tem certeza que deseja apagar TODOS os dados?");
    if (!confirmar) return;

    try {
      const response = await fetchProtegido("/api/registos", {
        method: "DELETE",
      });
      const resultado = await response.json();

      if (resultado.success) {
        alert("Todos os registos foram apagados da base de dados.");
        contadorOperacao = 1;
        contadorDoc = null;

        const inputDoc = document.getElementById("num-doc");
        inputDoc.readOnly = false;
        inputDoc.value = "";
        atualizarHintProximoDoc();

        limparFormulario();
        carregarDadosDoServidor();
        atualizarTotalTabela();
      } else {
        alert("Erro ao apagar registos.");
      }
    } catch (err) {
      console.error("Erro ao comunicar com o servidor:", err);
      alert("Erro ao comunicar com o servidor.");
    }
  });
/* função duplicada de atualizarHintProximoDoc removida para evitar conflitos */

// Adiciona listeners para exportação se existirem os botões
const btnExportarRelatorio = document.getElementById("btnExportarRelatorio");
if (btnExportarRelatorio) {
  btnExportarRelatorio.addEventListener("click", exportarRelatorio);
}
const btnExportarPDF = document.getElementById("btnExportarPDF");
if (btnExportarPDF) {
  btnExportarPDF.addEventListener("click", exportarPDF);
}

document.getElementById("pagamento").addEventListener("change", function () {
  const campoTPA = document.getElementById("campo-tpa");
  if (this.value === "Multibanco") {
    campoTPA.style.display = "block";
  } else {
    campoTPA.style.display = "none";
    document.getElementById("op-tpa").value = ""; // limpa o campo se mudar
  }
});
// Salva o contador antes de sair ou recarregar
window.addEventListener("beforeunload", () => {
  localStorage.setItem("contadorOperacao", contadorOperacao);
  localStorage.setItem("contadorDoc", contadorDoc);
});
document.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    const btnRegistar = document.getElementById("btnRegistar");
    if (btnRegistar) btnRegistar.click();
  }
});


function exportarResumoPDF() {
  if (!window.jspdf || !window.jspdf.jsPDF || typeof window.jspdf.jsPDF !== "function") {
    alert("jsPDF ou AutoTable não está carregado corretamente.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Calcular os totais
  let total = 0;
  const totaisPorPagamento = {
    Dinheiro: 0,
    Multibanco: 0,
    "Transferência Bancária": 0
  };

  const linhas = document.querySelectorAll("#tabelaRegistos tbody tr");

  linhas.forEach((linha) => {
    if (linha.style.display !== "none") {
      const valorTexto = linha.cells[4].textContent.replace("€", "").trim();
      const pagamento = linha.cells[3].textContent.trim();
      const metodoBase = pagamento.split(" (OP TPA")[0].trim();
      const valor = parseFloat(valorTexto.replace(",", "."));
      if (!isNaN(valor)) {
        total += valor;
        if (totaisPorPagamento[metodoBase] !== undefined) {
          totaisPorPagamento[metodoBase] += valor;
        }
      }
    }
  });

  // Cabeçalho
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

  // Tabela de Totais
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
  doc.text(`${totaisPorPagamento["Dinheiro"].toFixed(2)} €`, 160, y, { align: "right" });

  y += 8;
  doc.text(`Multibanco`, 30, y);
  doc.text(`${totaisPorPagamento["Multibanco"].toFixed(2)} €`, 160, y, { align: "right" });

  y += 8;
  doc.text(`Transferência Bancária`, 30, y);
  doc.text(`${totaisPorPagamento["Transferência Bancária"].toFixed(2)} €`, 160, y, { align: "right" });

  // Separador
  y += 12;
  doc.setDrawColor(13, 74, 99);
  doc.line(20, y, 190, y);

  // Total Geral
  y += 10;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 102, 51);
  doc.text(`TOTAL GERAL: ${total.toFixed(2)} €`, 105, y, { align: "center" });

  // Rodapé opcional
  y += 20;
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(120);
  doc.text("Relatório gerado pelo Sistema POS CASH", 105, y, { align: "center" });

  // Salvar
  doc.save(`resumo_caixa_${new Date().toISOString().split("T")[0]}.pdf`);
}