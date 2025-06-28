// URL base relativa
const BASE_URL = "/api/registos";

// Carrega dados do servidor
async function carregarDadosDoServidor() {
  try {
    const response = await fetch(BASE_URL);
    const dados = await response.json();

    const tabela = document.getElementById("tabelaRegistos").querySelector("tbody");
    tabela.innerHTML = "";

    dados.forEach((reg) => {
      const novaLinha = tabela.insertRow();
      novaLinha.dataset.id = reg.id;

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
      } catch {}
      novaLinha.insertCell().textContent = dataFormatada;

      // Nº Documento
      novaLinha.insertCell().textContent = reg.numDoc ?? reg.numdoc;

      // Pagamento + OP TPA
      const pagamentoFinal = reg.pagamento + (reg.op_tpa ? ` (OP TPA: ${reg.op_tpa})` : "");
      novaLinha.insertCell().textContent = pagamentoFinal;

      // Valor
      novaLinha.insertCell().textContent = parseFloat(reg.valor).toFixed(2) + " €";

      criarBotoesOpcoes(novaLinha);
    });

    atualizarTotalTabela();
  } catch (err) {
    console.error("Erro ao carregar dados do servidor:", err);
  }
}

// Atualiza totais
function atualizarTotalTabela() {
  const linhas = document.querySelectorAll("#tabelaRegistos tbody tr");
  let total = 0;

  linhas.forEach((linha) => {
    const valorTexto = linha.cells[4].textContent.replace("€", "").trim();
    const valor = parseFloat(valorTexto.replace(",", "."));
    if (!isNaN(valor)) total += valor;
  });

  document.getElementById("totalTabela").textContent = "Total: " + total.toFixed(2) + " €";
}

// Botão de apagar tudo
const btnApagarTudo = document.getElementById("btnApagarTudo");
if (btnApagarTudo) {
  btnApagarTudo.addEventListener("click", async () => {
    if (!confirm("Tem certeza que deseja apagar TODOS os dados da tabela?")) return;

    try {
      const response = await fetch(BASE_URL, { method: "DELETE" });
      const resultado = await response.json();

      if (resultado.success) {
        alert("Todos os registos foram apagados.");
        carregarDadosDoServidor();
      } else {
        alert("Erro ao apagar registos.");
      }
    } catch (error) {
      console.error("Erro ao apagar registos:", error);
      alert("Erro ao comunicar com o servidor.");
    }
  });
}

// Filtro
function filtrarTabela() {
  const input = document.getElementById("filtroTabela")?.value.toLowerCase() || "";
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

// Função de criar botões
function criarBotoesOpcoes(linha) {
  const cellOpcoes = linha.insertCell();
  cellOpcoes.classList.add("col-opcoes");

  const id = linha.dataset.id;

  // Apagar
  const btnApagar = document.createElement("button");
  btnApagar.innerHTML = '<i class="fas fa-trash"></i> Apagar';
  btnApagar.className = "btn-apagar-linha";
  btnApagar.onclick = async () => {
    if (!confirm("Tem certeza que deseja apagar esta linha?")) return;

    try {
      const response = await fetch(`${BASE_URL}/${id}`, { method: "DELETE" });
      const resultado = await response.json();
      if (resultado.success) {
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

  // Editar
  const btnEditar = document.createElement("button");
  btnEditar.innerHTML = '<i class="fas fa-edit"></i> Editar';
  btnEditar.className = "btn-editar-linha";

  let valoresOriginais = [];

  btnEditar.onclick = async () => {
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
      btnCancelar.onclick = () => {
        for (let i = 0; i <= 4; i++) {
          linha.cells[i].textContent = i === 4
            ? parseFloat(valoresOriginais[i]).toFixed(2) + " €"
            : valoresOriginais[i];
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

      try {
        const response = await fetch(`${BASE_URL}/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operacao, data, numDoc, pagamento, valor, op_tpa }),
        });
        const result = await response.json();
        if (result.success) {
          linha.cells[0].textContent = operacao;
          linha.cells[1].textContent = new Date(data).toLocaleDateString("pt-PT");
          linha.cells[2].textContent = numDoc;
          linha.cells[3].textContent = pagamento + (op_tpa ? ` (OP TPA: ${op_tpa})` : "");
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

// Carregar ao iniciar
window.addEventListener("DOMContentLoaded", carregarDadosDoServidor);