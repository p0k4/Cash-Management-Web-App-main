document.addEventListener("DOMContentLoaded", () => {
  const utilizador = localStorage.getItem("utilizadorParaEditarSenha");

  if (!utilizador) {
    alert("Utilizador não definido.");
    window.location.href = "/private/utilizadores.html";
    return;
  }

  // Mostra o nome do utilizador no HTML
  const userDisplay = document.getElementById("usernameDisplay");
  if (userDisplay) userDisplay.textContent = utilizador;

  // Envia formulário
  const form = document.getElementById("formSenha");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const novaSenha = document.getElementById("novaSenha").value;
    const confirmarSenha = document.getElementById("confirmarSenha").value;

    if (!novaSenha || !confirmarSenha) {
      alert("Preencha todos os campos.");
      return;
    }

    if (novaSenha !== confirmarSenha) {
      alert("As senhas não coincidem.");
      return;
    }

    try {
      const resposta = await fetch(`/api/utilizadores/${utilizador}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + localStorage.getItem("token"),
        },
        body: JSON.stringify({ novaSenha }),
      });

      const dados = await resposta.json();

      if (dados.success) {
        alert("✅ Senha atualizada com sucesso!");
        localStorage.removeItem("utilizadorParaEditarSenha");
        window.location.href = "/private/utilizadores.html";
      } else {
        alert(dados.error || "Erro ao atualizar senha.");
      }
    } catch (err) {
      console.error("Erro:", err);
      alert("Erro ao comunicar com o servidor.");
    }
  });
});
