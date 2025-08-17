/**
 * ===============================================================
 *  Ficheiro: private/script.js
 *  Página: index.html (Dashboard)
 *  Descrição:
 *    - Gere o dashboard (saldos do dia e registos).
 *    - Permite inserir/editar/apagar operações.
 *    - Faz o fecho de saldos (backend) e sincroniza a UI.
 *    - Exporta CSV/PDF.
 *    - Interage com o backend (rotas /api/*) via JWT.
 *
 *  Dependências: JWT no localStorage, backend Node/Express, jsPDF/autoTable (globais p/ PDF)
 *  Expõe (para uso via HTML): window.registar, window.exportarRelatorio, window.exportarPDF, window.exportarResumoPDF
 * ===============================================================
 */

/**
 * Atualiza os elementos do DOM com os saldos do dia.
 * Lê /api/saldos-hoje, respeitando fecho de saldos.
 * @returns {Promise<void>}
 */

// ======================================
// Proteção inicial - redireciona para login se não houver token
// ======================================
const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "/login.html";
} else {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const username = payload.username || "Desconhecido";

    const spanUtilizador = document.getElementById("utilizadorAtivo");

    if (spanUtilizador) {
      const spanNome = spanUtilizador.querySelector("#nomeUtilizador");
      if (spanNome) {
        spanNome.textContent = username;
      }
    }
  } catch (e) {
    console.warn("Token inválido ou não parseável.", e);
    window.location.href = "/login.html";
  }
}

// ======================================
// fetchProtegido - todas as chamadas fetch usam Authorization
// ======================================

/**
 * Faz fetch com cabeçalho Authorization (JWT guardado no localStorage).
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<Response>}
 */
async function fetchProtegido(url, options = {}) {
  const headers = options.headers || {};
  headers["Authorization"] = `Bearer ${token}`;
  options.headers = headers;
  return fetch(url, options);
}

/** Parse inteiro “seguro” com fallback. */
function parseIntSeguro(valor, fallback) {
  return valor !== null && !isNaN(parseInt(valor)) ? parseInt(valor) : fallback;
}

// Carregar contadores salvos ou iniciar
let contadorOperacao = parseIntSeguro(
  localStorage.getItem("contadorOperacao"),
  1
);
let contadorDoc = parseIntSeguro(localStorage.getItem("contadorDoc"), null);

function obterHojeLisboaISO() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // en-CA => YYYY-MM-DD
  return formatter.format(new Date());
}

function setarDataAtual() {
  const dataInput = document.getElementById("data");
  const hojeLisboa = obterHojeLisboaISO();
  if (dataInput) dataInput.value = hojeLisboa;
}

function atualizarHintProximoDoc() {
  const input = document.getElementById("num-doc");
  if (contadorDoc !== null) {
    input.placeholder = `${contadorDoc}`;
  } else {
    input.placeholder = "Nº DOC";
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

function showSuccess(message) {
  // cria (ou reutiliza) um toast de sucesso maior e mais visível no body
  let el = document.getElementById("reg-success");
  if (!el) {
    el = document.createElement("div");
    el.id = "reg-success";
    el.className = "success-message";
    // estilos inline para garantir visibilidade consistente
    el.style.display = "none";
    el.style.position = "fixed";
    el.style.top = "12px";
    el.style.left = "50%";
    el.style.transform = "translateX(-50%)";
    el.style.zIndex = "9999";
    el.style.padding = "24px 36px";
    el.style.borderRadius = "14px";
    el.style.background = "#d4edda";
    el.style.color = "#155724";
    el.style.border = "1px solid #c3e6cb";
    el.style.boxShadow = "0 12px 40px rgba(0,0,0,0.18)";
    el.style.fontSize = "28px";
    el.style.fontWeight = "900";
    el.style.letterSpacing = "0.5px";
    el.style.lineHeight = "1.05";
    el.style.maxWidth = "800px";
    el.style.textAlign = "center";
    el.style.whiteSpace = "normal";
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.style.display = "block";
  el.style.opacity = "1";
  el.style.transition = "opacity 0.25s ease";
  // garante que só um timeout existe
  clearTimeout(window._regSuccessTimeout);
  window._regSuccessTimeout = setTimeout(() => {
    el.style.opacity = "0";
    setTimeout(() => {
      el.style.display = "none";
    }, 300);
  }, 6000);
}

/**
 * Regista uma nova operação e atualiza a tabela do dashboard.
 * @returns {Promise<void>}
 */
async function registar() {
  const valor = parseFloat(document.getElementById("valor").value);
  const pagamento = document.getElementById("pagamento").value;

  if (!pagamento) {
    alert("Por favor, selecione um método de pagamento.");
    return;
  }

  let pagamentoFinal = pagamento;
  const opTPA =
    pagamento === "Multibanco"
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
          operacao, // Envia para o backend!
          data,
          numDoc,
          pagamento: pagamentoFinal,
          valor,
          op_tpa: opTPA,
        }),
      });
      const result = await response.json();

      if (response.ok && !result.error) {
        const tabela = document
          .getElementById("tabelaRegistos")
          .querySelector("tbody");
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

        // Mostrar mensagem de sucesso ao utilizador
        try {
          showSuccess("Registado com sucesso ✅");
        } catch (e) {
          console.warn("showSuccess não disponível:", e);
        }

        // 🔓 Reabrir saldos se já estavam fechados
        if (typeof saldosFechadosHoje !== "undefined" && saldosFechadosHoje) {
          saldosFechadosHoje = false;
          await carregarSaldosDoDia();
        }
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

/**
 * Carrega registos do backend e preenche a tabela do dashboard.
 * @returns {Promise<void>}
 */
async function carregarDadosDoServidor() {
  try {
    const response = await fetchProtegido("/api/registos");
    const dados = await response.json();
    const tabela = document
      .getElementById("tabelaRegistos")
      .querySelector("tbody");
    tabela.innerHTML = "";
    dados.forEach((reg) => {
      const novaLinha = tabela.insertRow();
      novaLinha.insertCell(0).textContent = reg.operacao;
      novaLinha.insertCell(1).textContent = reg.data;
      novaLinha.insertCell(2).textContent =
        reg.numDoc !== undefined ? reg.numDoc : reg.numdoc;
      novaLinha.insertCell(3).textContent = reg.pagamento;
      novaLinha.insertCell(4).textContent =
        parseFloat(reg.valor).toFixed(2) + " €";
    });
    atualizarTotalTabela();
  } catch (err) {
    console.error("Erro ao carregar dados do servidor:", err);
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");
  let username = "Desconhecido";

  if (!token) {
    window.location.href = "/login.html";
    return;
  }

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    username = payload.username || "Desconhecido";
    const spanNome = document.querySelector(".nome-utilizador");
    if (spanNome) spanNome.textContent = username;
  } catch (e) {
    console.error("Token inválido:", e);
    window.location.href = "/login.html";
    return;
  }

  // ✅ Adiciona botão "Fechos" ao menu, se ainda não existir
  const menu = document.getElementById("menuLateral");
  const jaExisteFechos = [...document.querySelectorAll("#menuLateral a")].some(
    (el) => el.href.includes("/dashboard/fechos")
  );

  if (menu && !jaExisteFechos) {
    const fechosItem = document.createElement("li");
    fechosItem.innerHTML = `<a class="btn-menu" href="/dashboard/fechos"><i class="fas fa-clock"></i> Fechos</a>`;

    const logoutBtn = document.getElementById("btnLogout");
    if (logoutBtn && logoutBtn.parentElement) {
      menu.insertBefore(fechosItem, logoutBtn.parentElement); // Insere antes do Logout
    } else {
      menu.appendChild(fechosItem);
    }
  }

  // ✅ Apenas o admin vê o botão de reset de saldos (ambiente de teste)
  if (username === "admin") {
  } else {
    const btnApagar = document.getElementById("btnApagarTudo");
    if (btnApagar) btnApagar.style.display = "none";
  }

  const isDashboardPage =
    window.location.pathname.includes("/dashboard") &&
    !window.location.pathname.includes("/dashboard/tabela");
  const isTabelaPage =
    window.location.pathname.includes("/dashboard/tabela") ||
    window.location.pathname.endsWith("tabela.html");

  // 1) Sempre: carregar saldos do dia (o dashboard mostra via API)
  await carregarSaldosDoDia();

  // 2) TABELA: carregar registos e calcular totais locais
  if (isTabelaPage) {
    await carregarDadosDoServidor();
    atualizarTotalTabela();
  }

  // 3) Sequência de nº doc e UI comum
  await carregarNumDocDoServidor();

  if (contadorDoc === null || isNaN(contadorDoc)) contadorDoc = 1;

  const userKey = username;
  contadorOperacao = parseIntSeguro(
    localStorage.getItem(`${userKey}_contadorOperacao`),
    1
  );

  const storedDoc = parseIntSeguro(
    localStorage.getItem(`${userKey}_contadorDoc`),
    null
  );
  if (storedDoc !== null && storedDoc > contadorDoc) {
    contadorDoc = storedDoc;
  }

  const numDocInput = document.getElementById("num-doc");
  if (numDocInput && contadorDoc !== null && !isNaN(contadorDoc)) {
    numDocInput.value = contadorDoc;
  }

  setarDataAtual();
  atualizarHintProximoDoc();
  atualizarCampoOperacao();
});

/**
 * Recalcula total e totais por método a partir da tabela visível.
 * (Só na página da tabela e quando os saldos não estão fechados.)
 * @returns {void}
 */
function atualizarTotalTabela() {
  // Só recalcula na página da TABELA e quando NÃO está fechado
  const isTabelaPage =
    window.location.pathname.includes("/dashboard/tabela") ||
    window.location.pathname.endsWith("tabela.html");

  if (!isTabelaPage) return;
  if (typeof saldosFechadosHoje !== "undefined" && saldosFechadosHoje) return;

  const tabela = document.getElementById("tabelaRegistos");
  if (!tabela) return;

  const linhas = tabela.querySelectorAll("tbody tr");
  let total = 0;

  const totaisPorPagamento = {
    Dinheiro: 0,
    Multibanco: 0,
    "Transferência Bancária": 0,
  };

  linhas.forEach((linha) => {
    if (linha.style.display !== "none") {
      const valorTexto = (linha.cells[4]?.textContent || "").replace("€", "").trim();
      const pagamento = (linha.cells[3]?.textContent || "").trim();
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

  const totalTabelaEl = document.getElementById("totalTabela");
  if (totalTabelaEl) {
    totalTabelaEl.textContent = "Total: " + total.toFixed(2) + " €";
  }

  const totalEl = document.getElementById("total");
  if (totalEl) {
    totalEl.textContent = total.toFixed(2) + " €";
  }

  const divTotaisPorPagamento = document.getElementById("totaisPagamento");
  if (divTotaisPorPagamento) {
    divTotaisPorPagamento.innerHTML = `
      <div class="linha-pagamento">
        <span class="label-pagamento">Dinheiro</span>
        <span class="valor-pagamento">${totaisPorPagamento["Dinheiro"].toFixed(2)} €</span>
      </div>
      <div class="linha-pagamento">
        <span class="label-pagamento">Multibanco</span>
        <span class="valor-pagamento">${totaisPorPagamento["Multibanco"].toFixed(2)} €</span>
      </div>
      <div class="linha-pagamento">
        <span class="label-pagamento">Transferência Bancária</span>
        <span class="valor-pagamento">${totaisPorPagamento["Transferência Bancária"].toFixed(2)} €</span>
      </div>
    `;
  }
}

/**
 * Valida o formulário (campos obrigatórios simples).
 * @returns {boolean}
 */
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
          opTPAInput.style.width = "180px";
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

/**
 * Exporta a tabela de registos (dashboard) para CSV.
 * @returns {void}
 */
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
        texto = texto.replace(/;/g, ",");
        linhaCSV.push(`"${texto}"`);
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

/**
 * Exporta a tabela de registos (dashboard) para PDF.
 * @returns {void}
 */
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
      const temOperacao = tds.length === 6;

      const dataCell = tds[temOperacao ? 1 : 0].textContent.trim();
      const numDocCell = tds[temOperacao ? 2 : 1].textContent.trim();
      const pagamentoCell = tds[temOperacao ? 3 : 2].textContent.trim();
      let valorTexto = tds[temOperacao ? 4 : 3].textContent
        .trim()
        .replace(" €", "");

      const valorNum = parseFloat(valorTexto.replace(",", "."));
      if (!isNaN(valorNum)) total += valorNum;

      data.push([
        dataCell,
        numDocCell,
        pagamentoCell,
        valorNum.toFixed(2) + " €",
      ]);
    }
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Relatório de Caixa", 105, 15, { align: "center" });

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
    head: [["Data", "Nº Documento", "Pagamento", "Valor"]],
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

// Botão “Fechar Caixa” — adiciona listener só se existir
{
  const btnFecharCaixa = document.getElementById("btnFecharCaixa");
  if (btnFecharCaixa) {
    btnFecharCaixa.addEventListener("click", function () {
      exportarResumoPDF();
    });
  }
}

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
    document.getElementById("op-tpa").value = "";
  }
});

/* Payment mode icon buttons: clicking an icon sets the selected mode via the hidden select,
   shows the OP TPA "balão" only when Multibanco is active, and highlights the chosen icon. */
(function wirePaymentIcons() {
  const payBtns = Array.from(document.querySelectorAll(".pay-mode-btn"));
  const pagamentoSelect = document.getElementById("pagamento");
  const campoTPA = document.getElementById("campo-tpa");
  const opTPA = document.getElementById("op-tpa");

  if (!payBtns.length) return;

  function setActive(mode) {
    payBtns.forEach((b) => {
      if (b.dataset.pay === mode) b.classList.add("active");
      else b.classList.remove("active");
    });

    // show/hide the OP TPA balão
    if (campoTPA) {
      if (mode === "Multibanco") {
        campoTPA.style.display = "block";
        if (opTPA) opTPA.focus();
      } else {
        campoTPA.style.display = "none";
        if (opTPA) opTPA.value = "";
      }
    }
  }

  // Click on icon -> set select value, dispatch change and update active state
  payBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.pay;
      if (pagamentoSelect) {
        pagamentoSelect.value = mode;
        pagamentoSelect.dispatchEvent(new Event("change", { bubbles: true }));
      }
      setActive(mode);
    });
  });

  // If select changes (kept hidden for accessibility), update active icons and campoTPA
  if (pagamentoSelect) {
    pagamentoSelect.addEventListener("change", function () {
      setActive(this.value);
    });
    // initialize active state from current select value (or none)
    setActive(pagamentoSelect.value || "");
  }
})();

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

/**
 * Exporta um resumo PDF dos saldos atuais (via /api/saldos-hoje).
 * @returns {Promise<void>}
 */
async function exportarResumoPDF() {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert("jsPDF ou AutoTable não está carregado corretamente.");
    return;
  }

  const token = localStorage.getItem("token");
  if (!token) {
    alert("Sessão expirada. Faça login novamente.");
    return;
  }

  // 1) Buscar os totais atuais ao backend (respeita fecho / reabertura)
  let dinheiro = 0, multibanco = 0, transferencia = 0, total = 0;

  try {
    const resp = await fetch("/api/saldos-hoje", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, "Cache-Control": "no-store" }
    });

    const dados = await resp.json();
    if (!resp.ok) throw new Error(dados.erro || "Erro ao obter saldos");

    // Quando está fechado, o backend devolve os valores do fecho (podem ser 0).
    // Quando há registos depois do fecho, devolve só o período ativo.
    dinheiro = parseFloat(dados.dinheiro || 0);
    multibanco = parseFloat(dados.multibanco || 0);
    transferencia = parseFloat(dados.transferencia || 0);
    total = parseFloat(dados.total || (dinheiro + multibanco + transferencia));
  } catch (e) {
    console.error("Erro ao obter saldos para o PDF:", e);
    alert("Não foi possível gerar o resumo. Verifique a ligação ao servidor.");
    return;
  }

  // Bloqueia exportação se saldos do dashboard estiverem a zero ou fechados
  if (
    (typeof saldosFechadosHoje !== "undefined" && saldosFechadosHoje) ||
    (Number.isFinite(dinheiro) && Number.isFinite(multibanco) && Number.isFinite(transferencia) &&
      dinheiro === 0 && multibanco === 0 && transferencia === 0)
  ) {
    alert("Não existem valores a exportar.");
    return;
  }

  // 2) Gerar PDF com jsPDF
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

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
  doc.text(`${dinheiro.toFixed(2)} €`, 160, y, { align: "right" });

  y += 8;
  doc.text(`Multibanco`, 30, y);
  doc.text(`${multibanco.toFixed(2)} €`, 160, y, { align: "right" });

  y += 8;
  doc.text(`Transferência Bancária`, 30, y);
  doc.text(`${transferencia.toFixed(2)} €`, 160, y, { align: "right" });

  y += 12;
  doc.setDrawColor(13, 74, 99);
  doc.line(20, y, 190, y);

  y += 10;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 102, 51);
  doc.text(`TOTAL GERAL: ${total.toFixed(2)} €`, 105, y, { align: "center" });

  y += 20;
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(120);
  doc.text("Documento gerado pelo Sistema POS", 105, y, { align: "center" });

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const username = payload.username || "Desconhecido";
    y += 8;
    doc.text(`Emitido por: ${username}`, 105, y, { align: "center" });
  } catch {}

  doc.save(`resumo_caixa_${new Date().toISOString().split("T")[0]}.pdf`);
}

document.getElementById("btnLogout").addEventListener("click", function () {
  if (!confirm("Deseja Sair ?")) return;
  localStorage.removeItem("token");
  window.location.href = "/login.html";
});

const btnEditarDoc = document.getElementById("btnEditarDoc");
const numDocInput = document.getElementById("num-doc");

if (btnEditarDoc && numDocInput) {
  btnEditarDoc.addEventListener("click", async () => {
    if (numDocInput.readOnly) {
      numDocInput.readOnly = false;
      numDocInput.focus();
      btnEditarDoc.textContent = "Guardar";
    } else {
      const novoValor = parseInt(numDocInput.value, 10);
      if (isNaN(novoValor) || novoValor < 1) {
        alert("Insira um número de documento válido!");
        return;
      }

      contadorDoc = novoValor;

      // (opcional) manter localmente
      localStorage.setItem("contadorDoc", contadorDoc);
      localStorage.setItem("contadorDocManual", "true");

      // ✅ sincroniza com o servidor (guarda ultimo_numdoc = contadorDoc - 1)
      await guardarNumDocNoServidor(contadorDoc - 1);

      numDocInput.readOnly = true;
      atualizarHintProximoDoc();
      btnEditarDoc.textContent = "INICIAR";
      alert(`Sequência de Nº DOC atualizada para começar em ${contadorDoc}`);
    }
  });
}

/**
 * Obtém do servidor o próximo número de documento e bloqueia input.
 * @returns {Promise<void>}
 */
async function carregarNumDocDoServidor() {
  try {
    const response = await fetchProtegido("/api/next-numdoc");
    const data = await response.json();
    contadorDoc = data.nextNumDoc;

    const numDocInput = document.getElementById("num-doc");
    if (numDocInput) {
      numDocInput.value = contadorDoc;
      numDocInput.readOnly = true;
    }

    atualizarHintProximoDoc();
  } catch (err) {
    console.error("Erro ao obter numDoc do servidor:", err);
  }
}

/**
 * Guarda no servidor o último número de documento emitido.
 * @param {number} ultimoNumDoc
 * @returns {Promise<void>}
 */
async function guardarNumDocNoServidor(ultimoNumDoc) {
  try {
    await fetchProtegido("/api/save-numdoc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ultimo_numdoc: ultimoNumDoc }), // SNAKE_CASE!
    });
  } catch (err) {
    console.error("Erro ao salvar numDoc no servidor:", err);
  }
}

// ==========================
// PREPARAR SALDOS A ZERO
// ==========================
/**
 * Preenche o painel com saldos a zero (UI).
 * @returns {void}
 */
function prepararPainelSaldosVazio() {
  const div = document.getElementById("totaisPagamento");
  if (div) {
    div.innerHTML = `
      <div class="linha-pagamento">
        <span class="label-pagamento">Dinheiro</span>
        <span class="valor-pagamento">0.00 €</span>
      </div>
      <div class="linha-pagamento">
        <span class="label-pagamento">Multibanco</span>
        <span class="valor-pagamento">0.00 €</span>
      </div>
      <div class="linha-pagamento">
        <span class="label-pagamento">Transferência Bancária</span>
        <span class="valor-pagamento">0.00 €</span>
      </div>
    `;
  }

  const totalEl = document.getElementById("total");
  if (totalEl) totalEl.textContent = "0.00 €";
}

// ==========================
// CARREGAR SALDOS DO BACKEND
// ==========================
let saldosFechadosHoje = false;

/**
 * Lê /api/saldos-hoje e atualiza o painel (respeita fecho).
 * @returns {Promise<void>}
 */
async function carregarSaldosDoDia() {
  const token = localStorage.getItem("token");

  try {
    const response = await fetch("/api/saldos-hoje", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Cache-Control": "no-store",
        Pragma: "no-cache",
      },
    });

    const data = await response.json();
    console.log("📦 API /saldos-hoje:", data);

    saldosFechadosHoje = data.fechado === true;

    if (saldosFechadosHoje) {
      console.log("🔒 Saldos fechados — mostrar a zero!");
      prepararPainelSaldosVazio();
      return;
    }

    // Saldos ainda abertos — mostrar valores reais do dia
    const dinheiro = parseFloat(data.dinheiro || 0);
    const multibanco = parseFloat(data.multibanco || 0);
    const transferencia = parseFloat(data.transferencia || 0);
    const total = dinheiro + multibanco + transferencia;

    const div = document.getElementById("totaisPagamento");
    if (div) {
      div.innerHTML = `
        <div class="linha-pagamento">
          <span class="label-pagamento">Dinheiro</span>
          <span class="valor-pagamento">${dinheiro.toFixed(2)} €</span>
        </div>
        <div class="linha-pagamento">
          <span class="label-pagamento">Multibanco</span>
          <span class="valor-pagamento">${multibanco.toFixed(2)} €</span>
        </div>
        <div class="linha-pagamento">
          <span class="label-pagamento">Transferência Bancária</span>
          <span class="valor-pagamento">${transferencia.toFixed(2)} €</span>
        </div>
      `;
    }

    const totalEl = document.getElementById("total");
    if (totalEl) totalEl.textContent = `${total.toFixed(2)} €`;
  } catch (err) {
    console.error("❌ Erro ao carregar saldos:", err);
  }
}

// ==========================
// ZERAR SALDOS NO FRONTEND
// ==========================
/**
 * Zera visualmente os saldos no painel.
 * @returns {void}
 */
function resetarSaldosFrontend() {
  const valores = document.querySelectorAll(".valor-pagamento");
  valores.forEach((el) => (el.textContent = "0.00 €"));

  const totalEl = document.getElementById("total");
  if (totalEl) totalEl.textContent = "0.00 €";
}

// ==========================
// BOTÃO FECHAR SALDOS (único listener mantido)
// ==========================
document
  .getElementById("btnFecharSaldos")
  .addEventListener("click", async () => {
    const confirmar = confirm(
      "Deseja realmente fechar os saldos do dia?\nEsta ação não pode ser desfeita."
    );
    if (!confirmar) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/fechar-saldos", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const resultado = await response.json();

      if (response.ok) {
        alert("✅ " + resultado.mensagem);
        saldosFechadosHoje = true;
        prepararPainelSaldosVazio();
        // ⬇️ SINCRONIZA O DASHBOARD IMEDIATAMENTE!
        await carregarSaldosDoDia();
      } else {
        if (resultado.erro?.includes("fecho de caixa")) {
          alert("⚠️ Já fechaste os saldos para hoje.");
          saldosFechadosHoje = true;
        } else {
          alert("⚠️ " + (resultado.erro || "Erro ao fechar saldos."));
        }
      }
    } catch (erro) {
      console.error("Erro ao fechar saldos:", erro);
      alert("Erro de ligação com o servidor.");
    }
  });

// ==========================
// Sessão / Inatividade
// ==========================
const TEMPO_LIMITE_INATIVIDADE = 30 * 60 * 1000;
let inatividadeTimer;

function fazerLogout() {
  localStorage.removeItem("token");
  window.location.href = "/login.html";
}

function isTokenExpired() {
  const token = window.APP_TOKEN;
  try {
    const payloadBase64 = token.split(".")[1];
    const payloadJson = atob(payloadBase64);
    const payload = JSON.parse(payloadJson);
    const exp = payload.exp;
    if (!exp) return true;
    const now = Math.floor(Date.now() / 1000);
    return now >= exp;
  } catch (e) {
    return true;
  }
}

function resetarTimerInatividade() {
  clearTimeout(inatividadeTimer);
  inatividadeTimer = setTimeout(() => {
    fazerLogout();
  }, TEMPO_LIMITE_INATIVIDADE);
}

window.APP_TOKEN = localStorage.getItem("token");
if (!window.APP_TOKEN || isTokenExpired()) {
  fazerLogout();
} else {
  resetarTimerInatividade();
}

// Atividade do utilizador reseta o timer
["mousemove", "keydown", "click", "scroll", "input", "change"].forEach(
  (event) => document.addEventListener(event, resetarTimerInatividade)
);

// ✅ Verificação periódica se token ainda existe
function verificarSessaoAtiva() {
  window.APP_TOKEN = localStorage.getItem("token");
  if (!window.APP_TOKEN || isTokenExpired()) {
    fazerLogout();
  }
}

// Verifica a cada 10 segundos
setInterval(verificarSessaoAtiva, 10 * 1000);

/* =========================================================
 * Persistência local (stub) — o código chama esta função.
 * Mantém-se como no-op para satisfazer ESLint sem mudar lógica.
 * Substitui pelo que quiseres guardar (ex.: estado da tabela).
 * =======================================================*/
function salvarDadosLocal() {
  // TODO: Implementar persistência local se necessário.
}

/* =========================================================
 * Expor funções chamadas via HTML (quando aplicável)
 * =======================================================*/
window.registar = registar;
window.exportarRelatorio = exportarRelatorio;
window.exportarPDF = exportarPDF;
window.exportarResumoPDF = exportarResumoPDF;

