/**
 * ===============================================================
 *  Ficheiro: private/script-tabela.js
 *  Página: tabela.html
 *  Descrição:
 *    - Carrega registos do backend e renderiza na tabela.
 *    - Permite filtrar localmente as linhas.
 *    - Recalcula total visível (após filtro/edições).
 *    - Suporta editar/apagar registos (via API protegida por JWT).
 *
 *  Dependências:
 *    - JWT no localStorage (Bearer)
 *    - Rotas backend /api/registos*, /api/utilizador
 *
 * 
 * ===============================================================
 */

// ====================================
// Helper para obter o token do localStorage
// ====================================

/**
 * Lê o JWT guardado no browser.
 * @returns {string|null}
 */
function getToken() {
  return localStorage.getItem("token");
}

// ====================================
// fetchProtegido com Authorization
// ====================================

/**
 * Faz fetch anexando o header Authorization: Bearer <token>.
 * Redireciona para /login.html se não houver token.
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<Response>|void}
 */
async function fetchProtegido(url, options = {}) {
  const token = getToken();
  if (!token) {
    console.error("⚠️ Token não encontrado. Redirecionando para login.");
    window.location.href = "/login.html";
    return;
  }

  options.headers = options.headers || {};
  options.headers["Authorization"] = `Bearer ${token}`;
  return fetch(url, options);
}

// ====================================
// Carregar dados do servidor
// ====================================

/**
 * Busca registos em /api/registos e preenche <tbody> da #tabelaRegistos.
 * - Formata a data para pt-PT quando possível.
 * - Acrescenta botões (editar/apagar) por linha.
 * - Recalcula o total visível no fim.
 * @returns {Promise<void>}
 */
async function carregarDadosDoServidor() {
  try {
    const response = await fetchProtegido("/api/registos");
    if (!response.ok) throw new Error("Não autorizado ou erro do servidor");

    const dados = await response.json();
    const tabela = document.getElementById("tabelaRegistos").querySelector("tbody");
    tabela.innerHTML = "";

    dados.forEach((reg) => {
      const novaLinha = tabela.insertRow();
      novaLinha.dataset.id = reg.id;

      // Operação
      novaLinha.insertCell().textContent = reg.operacao;

      // Data (normaliza para dd/mm/aaaa quando possível)
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

      // Nº doc (aceita numDoc ou numdoc vindos da API)
      novaLinha.insertCell().textContent = reg.numDoc ?? reg.numdoc;

      // Pagamento (anexa OP TPA se existir)
      const pagamentoFinal = reg.pagamento + (reg.op_tpa ? ` (OP TPA: ${reg.op_tpa})` : "");
      novaLinha.insertCell().textContent = pagamentoFinal;

      // Valor formatado
      novaLinha.insertCell().textContent = parseFloat(reg.valor).toFixed(2) + " €";

      // Utilizador (quem fez o registo)
      novaLinha.insertCell().textContent = reg.utilizador || reg.user || "";

      // Ações
      criarBotoesOpcoes(novaLinha);
    });

    atualizarTotalTabela();
  } catch (err) {
    console.error("⚠️ Erro ao carregar dados do servidor:", err);
    alert("Erro ao carregar dados. Verifique se está logado.");
  }
}

// ====================================
// Filtro local na tabela
// ====================================

/**
 * Filtra as linhas da tabela localmente com base no texto do input #filtroTabela.
 * Recalcula o total visível após aplicar o filtro.
 * @returns {void}
 */
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

// ====================================
// Atualizar total
// ====================================

/**
 * Soma os valores (coluna 5) das linhas visíveis da tabela
 * e atualiza o elemento #totalTabela com o total formatado.
 * @returns {void}
 */
function atualizarTotalTabela() {
  const linhas = document.querySelectorAll("#tabelaRegistos tbody tr");
  let total = 0;

  linhas.forEach((linha) => {
    if (linha.style.display !== "none") {
      const valorTexto = linha.cells[4].textContent.replace("€", "").trim();
      const valor = parseFloat(valorTexto.replace(",", "."));
      if (!isNaN(valor)) total += valor;
    }
  });

  document.getElementById("totalTabela").textContent = "Total: " + total.toFixed(2) + " €";
}

// ====================================
// criarBotoesOpcoes COMPLETO COM JWT
// ====================================

/**
 * Cria os botões de ação por linha (Editar/Apagar) e liga-os à API protegida.
 * - DELETE /api/registos/:id → remove a linha se sucesso
 * - PUT /api/registos/:id → atualiza a linha com valores editados
 * @param {HTMLTableRowElement} linha
 * @returns {void}
 */
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
      const response = await fetchProtegido(`/api/registos/${id}`, {
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
      // Ativa modo de edição: guarda originais e transforma células em inputs
      valoresOriginais = [];
      for (let i = 0; i <= 4; i++) {
        const cell = linha.cells[i];
        const valorOriginal = cell.textContent.replace(" €", "").trim();
        valoresOriginais.push(valorOriginal);
        cell.textContent = "";

        if (i === 3) {
          // Select de pagamento + campo OP TPA condicional
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
          // Inputs para operação, data, numDoc, valor
          const input = document.createElement("input");
          input.type = i === 1 ? "date" : "text";
          if (i === 1) {
            // valorOriginal no formato dd/mm/aaaa → normaliza para yyyy-mm-dd sem UTC
            const [dd, mm, yyyy] = valorOriginal.split("/");
            input.value = `${yyyy}-${mm}-${dd}`;
          } else {
            input.value = valorOriginal;
          }
          input.style.width = "100%";
          cell.appendChild(input);
        }
      }

      btnEditar.innerHTML = '<i class="fas fa-check"></i> Guardar';

      // Botão CANCELAR (só no modo de edição)
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
      // Guarda edição: recolhe inputs, chama PUT e volta a desenhar a linha
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
        const response = await fetchProtegido(`/api/registos/${id}`, {
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

// ====================================
// Inicializa ao carregar
// ====================================

/**
 * No load: carrega os dados do servidor e mostra na tabela.
 */
window.addEventListener("DOMContentLoaded", carregarDadosDoServidor);

// ====================================
// Logout
// ====================================

/**
 * Remove token e envia para a página de login.
 */
function fazerLogout() {
  localStorage.removeItem("token");
  window.location.href = "/login.html";
}

document.addEventListener("DOMContentLoaded", () => {
  const btnLogout = document.getElementById("btnLogout");
  if (btnLogout) {
    btnLogout.addEventListener("click", fazerLogout);
  }
});

// ====================================
// Nome do utilizador (UI header)
// ====================================

/**
 * Obtém o utilizador atual e mostra o username na barra superior.
 * @returns {Promise<void>}
 */
async function mostrarNomeUtilizador() {
  try {
    const response = await fetchProtegido("/api/utilizador");
    const dados = await response.json();
    const span = document.querySelector(".nome-utilizador");
    if (span) {
      span.textContent = dados.username;
    }
  } catch (err) {
    console.error("Erro ao obter utilizador:", err);
  }
}

document.addEventListener("DOMContentLoaded", mostrarNomeUtilizador);
