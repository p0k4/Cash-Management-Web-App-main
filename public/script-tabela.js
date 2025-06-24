async function carregarDadosDoServidor() {
  try {
    const response = await fetch("http://localhost:3000/api/registos");
    const dados = await response.json();
    const tabela = document.getElementById("tabelaRegistos").querySelector("tbody");
    tabela.innerHTML = "";

    dados.forEach((reg) => {
      const novaLinha = tabela.insertRow();
      novaLinha.dataset.id = reg.id; // guarda o ID da BD para uso futuro

      // Operação
      novaLinha.insertCell().textContent = reg.operacao;

      // Data formatada
      let dataFormatada = reg.data;
      try {
        const dataObj = new Date(reg.data);
        if (!isNaN(dataObj)) {
          dataFormatada = dataObj.toLocaleDateString("pt-PT", {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
        }
      } catch (e) {
        console.warn("Data inválida:", reg.data);
      }
      novaLinha.insertCell().textContent = dataFormatada;

      // Nº Documento
      novaLinha.insertCell().textContent = reg.numDoc ?? reg.numdoc;

      // Pagamento + OP TPA se existir
      const pagamentoFinal = reg.pagamento + (reg.op_tpa ? ` (OP TPA: ${reg.op_tpa})` : "");
      novaLinha.insertCell().textContent = pagamentoFinal;

      // Valor formatado
      novaLinha.insertCell().textContent = parseFloat(reg.valor).toFixed(2) + " €";

      // Botões Editar e Apagar
      criarBotoesOpcoes(novaLinha);
    });

    atualizarTotalTabela();
  } catch (err) {
    console.error("Erro ao carregar dados do servidor:", err);
  }
}

function atualizarTotalTabela() {
  const linhas = document.querySelectorAll("#tabelaRegistos tbody tr");
  let total = 0;

  linhas.forEach((linha) => {
    const valorTexto = linha.cells[4].textContent.replace("€", "").trim();
    const valor = parseFloat(valorTexto.replace(",", "."));
    if (!isNaN(valor)) total += valor;
  });

  document.getElementById("totalTabela").textContent =
    "Total: " + total.toFixed(2) + " €";
}

function filtrarTabela() {
  const input = document.getElementById("filtroTabela").value.toLowerCase();
  const linhas = document.querySelectorAll("#tabelaRegistos tbody tr");
  linhas.forEach((linha) => {
    let visivel = false;
    linha.querySelectorAll("td").forEach((celula) => {
      if (celula.textContent.toLowerCase().includes(input)) visivel = true;
    });
    linha.style.display = visivel ? "" : "none";
  });
  atualizarTotalTabela();
}

// Inicializa ao carregar a página
window.addEventListener("DOMContentLoaded", carregarDadosDoServidor);

document
  .getElementById("btnApagarTudo")
  .addEventListener("click", async function () {
    const confirmar = confirm(
      "Tem certeza que deseja apagar TODOS os dados da tabela?"
    );
    if (!confirmar) return;

    try {
      const response = await fetch("http://localhost:3000/api/registos", {
        method: "DELETE",
      });
      const resultado = await response.json();

      if (resultado.success) {
        alert("Todos os registos foram apagados.");
        carregarDadosDoServidor(); // Atualiza a tabela no ecrã
      } else {
        alert("Erro ao apagar registos.");
      }
    } catch (error) {
      console.error("Erro ao apagar registos:", error);
      alert("Erro ao comunicar com o servidor.");
    }
  });
// Atualiza a função criarBotoesOpcoes com correções para edição
function criarBotoesOpcoes(linha) {
  const cellOpcoes = linha.insertCell();
  cellOpcoes.classList.add("col-opcoes");

  const id = linha.dataset.id;

  



  // Botão APAGAR
  const btnApagar = document.createElement("button");
  btnApagar.innerHTML = '<i class="fas fa-trash"></i> Apagar';
  btnApagar.className = "btn-apagar-linha";
  btnApagar.onclick = async function () {
    const confirmar = confirm("Tem certeza que deseja apagar esta linha?");
    if (!confirmar) return;

    try {
      const response = await fetch(`http://localhost:3000/api/registos/${id}`, {
        method: "DELETE",
      });
      const resultado = await response.json();
      if (response.ok && resultado.success) {
        linha.remove();
        atualizarTotalTabela();
      } else {
        alert("Erro ao apagar: " + (resultado.error || "desconhecido"));
      }
    } catch (err) {
      console.error("Erro ao apagar registo:", err);
      alert("Erro ao comunicar com o servidor.");
    }
  };

  // Botão EDITAR
  const btnEditar = document.createElement("button");
  btnEditar.innerHTML = '<i class="fas fa-edit"></i> Editar';
  btnEditar.className = "btn-editar-linha";
  let valoresOriginais = [];

  btnEditar.onclick = async function () {
    const estaEditando = btnEditar.textContent.includes("Guardar");

    if (!estaEditando) {
      valoresOriginais = [];
      for (let i = 0; i <= 4; i++) {
        const cell = linha.cells[i];
        const valorOriginal = cell.textContent.replace(" €", "").trim();
        valoresOriginais.push(valorOriginal);
        cell.textContent = "";

        if (i === 3) {
          const select = document.createElement("select");
          ["Dinheiro", "Multibanco", "Transferência Bancária"].forEach((opcao) => {
            const opt = document.createElement("option");
            opt.value = opcao;
            opt.textContent = opcao;
            if (valorOriginal.startsWith(opcao)) opt.selected = true;
            select.appendChild(opt);
          });

          const opTPAInput = document.createElement("input");
          opTPAInput.type = "text";
          opTPAInput.placeholder = "OP TPA";
          opTPAInput.className = "input-op-tpa";
          opTPAInput.style.marginLeft = "5px";
          opTPAInput.style.width = "160px";
          opTPAInput.style.display = valorOriginal.startsWith("Multibanco") ? "inline-block" : "none";
          opTPAInput.value = valorOriginal.includes("OP TPA") ? valorOriginal.split("OP TPA:")[1]?.replace(")", "").trim() : "";

          select.addEventListener("change", () => {
            opTPAInput.style.display = select.value === "Multibanco" ? "inline-block" : "none";
            if (select.value !== "Multibanco") opTPAInput.value = "";
          });

          cell.appendChild(select);
          cell.appendChild(opTPAInput);
        } else {
          const input = document.createElement("input");
          input.type = i === 1 ? "date" : "text";
          input.value = i === 1 ? new Date(valorOriginal.split("/").reverse().join("-")).toISOString().split("T")[0] : valorOriginal;
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
            i === 4 ? parseFloat(valoresOriginais[i]).toFixed(2) + " €" : valoresOriginais[i];
        }
        btnEditar.innerHTML = '<i class="fas fa-edit"></i> Editar';
        btnCancelar.remove();
        atualizarTotalTabela();
      };

      cellOpcoes.appendChild(btnCancelar);
    } else {
      const operacao = linha.cells[0].querySelector("input").value;
      const data = linha.cells[1].querySelector("input").value;
      const numDoc = parseInt(linha.cells[2].querySelector("input").value);
      const valor = parseFloat(linha.cells[4].querySelector("input").value);

      const select = linha.cells[3].querySelector("select");
      const opTPAInput = linha.cells[3].querySelector(".input-op-tpa");
      const pagamento = select.value;
      const op_tpa = pagamento === "Multibanco" ? opTPAInput.value.trim() : null;
      const pagamentoFinal = op_tpa ? `${pagamento} (OP TPA: ${op_tpa})` : pagamento;

      try {
        const response = await fetch(`http://localhost:3000/api/registos/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operacao, data, numDoc, pagamento, valor, op_tpa }),
        });
        const result = await response.json();
        if (response.ok && result.success) {
          linha.cells[0].textContent = operacao;
          linha.cells[1].textContent = new Date(data).toLocaleDateString("pt-PT");
          linha.cells[2].textContent = numDoc;
          linha.cells[3].textContent = pagamentoFinal;
          linha.cells[4].textContent = valor.toFixed(2) + " €";
          btnEditar.innerHTML = '<i class="fas fa-edit"></i> Editar';
          const cancelarBtn = cellOpcoes.querySelector(".btn-cancelar-linha");
          if (cancelarBtn) cancelarBtn.remove();
          atualizarTotalTabela();
        } else {
          alert("Erro ao atualizar registo.");
        }
      } catch (err) {
        console.error("Erro ao comunicar com o servidor:", err);
        alert("Erro ao comunicar com o servidor.");
      }
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
  link.download = `relatorio_caixa_${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
}

function exportarPDF() {
  if (!window.jspdf || !window.jspdf.jsPDF || typeof window.jspdf.jsPDF !== "function") {
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
document.getElementById("btnApagarTudo").addEventListener("click", function () {
  const confirmar = confirm("Tem certeza que deseja apagar TODOS os dados?");
  if (!confirmar) return;

  const tabela = document
    .getElementById("tabelaRegistos")
    .querySelector("tbody");
  tabela.innerHTML = ""; // remove todas as linhas

  localStorage.removeItem("caixaPiscinaDados");
  localStorage.removeItem("contadorOperacao");
  localStorage.removeItem("contadorDoc");
  contadorDoc = null;

  const inputDoc = document.getElementById("num-doc");
  inputDoc.readOnly = false;
  inputDoc.value = "";
  atualizarHintProximoDoc();

  contadorOperacao = 1;
  apagar(); // redefine os campos
  atualizarTotalTabela();
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

// Botão "Apagar Tudo"
document.getElementById("btnApagarTudo").addEventListener("click", async function () {
  // código existente aqui
});

// Botão "Reiniciar POS"
document.getElementById("btn-reiniciar-pos").addEventListener("click", async function () {
  const confirmar = confirm("Tem a certeza que quer apagar TODOS os dados do POS?");
  if (!confirmar) return;

  try {
    const response = await fetch("http://localhost:3000/api/registos", {
      method: "DELETE",
    });
    const resultado = await response.json();

    if (resultado.success) {
      alert("Todos os registos foram apagados com sucesso!");
      carregarDadosDoServidor(); // Recarrega a tabela atualizada (vazia)
    } else {
      alert("Erro ao apagar registos.");
    }
  } catch (err) {
    console.error("Erro ao apagar registos:", err);
    alert("Erro ao comunicar com o servidor.");
  }
});