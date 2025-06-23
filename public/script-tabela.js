async function carregarDadosDoServidor() {
  try {
    const response = await fetch("http://localhost:3000/api/registos");
    const dados = await response.json();
    const tabela = document
      .getElementById("tabelaRegistos")
      .querySelector("tbody");
    tabela.innerHTML = "";

    dados.forEach((reg) => {
      const novaLinha = tabela.insertRow();
      novaLinha.dataset.id = reg.id; // Guarda o ID no atributo da linha

      novaLinha.insertCell(0).textContent = reg.operacao;
      novaLinha.insertCell(1).textContent = reg.data;
      novaLinha.insertCell(2).textContent = reg.numdoc ?? reg.numDoc;
      const pagamentoFinal =
        reg.pagamento + (reg.op_tpa ? ` (OP TPA: ${reg.op_tpa})` : "");
      novaLinha.insertCell(3).textContent = pagamentoFinal;
      novaLinha.insertCell(4).textContent =
        parseFloat(reg.valor).toFixed(2) + " €";

      const cellOpcoes = novaLinha.insertCell(5);
      const btnApagar = document.createElement("button");
      btnApagar.innerHTML = '<i class="fas fa-trash"></i> Apagar';
      btnApagar.className = "btn-apagar-linha";

      btnApagar.onclick = async function () {
        const confirmar = confirm("Deseja mesmo apagar esta linha?");
        if (!confirmar) return;

        const id = novaLinha.dataset.id;
        try {
          const res = await fetch(`http://localhost:3000/api/registos/${id}`, {
            method: "DELETE",
          });
          const json = await res.json();
          if (json.success) {
            novaLinha.remove();
            atualizarTotalTabela();
          } else {
            alert("Erro ao apagar.");
          }
        } catch (error) {
          console.error("Erro ao comunicar com servidor:", error);
          alert("Erro ao comunicar com o servidor.");
        }
      };

      cellOpcoes.appendChild(btnApagar);
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
