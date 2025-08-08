require("dotenv").config();
const express = require("express");
const path = require("path");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

// Validação do JWT_SECRET
if (!JWT_SECRET) {
  console.error("❌ JWT_SECRET não configurado no .env");
  process.exit(1);
}

// =============================
// CONFIGURAÇÃO DO POOL PG
// =============================
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
});

// Teste de conexão
pool.on('error', (err) => {
  console.error('❌ Erro inesperado no pool:', err);
  process.exit(-1);
});

// =============================
// MIDDLEWARES GLOBAIS
// =============================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// =============================
// MIDDLEWARE JWT PARA A API
// =============================
function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Token não fornecido" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Formato de token inválido" });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "Token inválido ou expirado" });
    }
    req.user = decoded;
    next();
  });
}

// Middleware para verificar se é admin
function verificarAdmin(req, res, next) {
  if (req.user.username !== "admin") {
    return res.status(403).json({ error: "Acesso negado - Apenas admin" });
  }
  next();
}

// =============================
// VALIDAÇÕES
// =============================
function validarRegisto(req, res, next) {
  const { operacao, data, numDoc, pagamento, valor, op_tpa } = req.body;
  
  if (!operacao || !data || !numDoc || !pagamento || !valor) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios" });
  }
  
  if (isNaN(valor) || parseFloat(valor) <= 0) {
    return res.status(400).json({ error: "Valor deve ser um número positivo" });
  }
  
  if (isNaN(numDoc) || parseInt(numDoc) <= 0) {
    return res.status(400).json({ error: "Número do documento deve ser positivo" });
  }
  
  next();
}

// =============================
// ROTAS PÚBLICAS
// =============================
app.use(express.static(path.join(__dirname, "public")));
app.use("/assets", express.static(path.join(__dirname, "public", "assets")));

app.get("/login.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/", (req, res) => {
  res.redirect("/login.html");
});

// Serve /private SEM proteção -> HTML, CSS, JS
app.use("/private", express.static(path.join(__dirname, "private")));

// =============================
// LOGIN (público)
// =============================
if (process.env.ENABLE_PUBLIC_REGISTRATION === 'true') {
  app.post("/api/registar-utilizador", async (req, res) => {
    const { username, senha, adminPassword } = req.body;

    if (!username || !senha || !adminPassword) {
      return res.status(400).json({ error: "Todos os campos são obrigatórios." });
    }

    const senhaAdminCorreta = process.env.ADMIN_PASSWORD;
    if (!senhaAdminCorreta || adminPassword !== senhaAdminCorreta) {
      return res.status(403).json({ error: "Senha de admin incorreta." });
    }

    try {
      const existe = await pool.query(
        "SELECT * FROM utilizadores WHERE username = $1",
        [username]
      );
      if (existe.rows.length > 0) {
        return res.status(409).json({ error: "Utilizador já existe." });
      }

      const senhaHash = await bcrypt.hash(senha, 10);
      await pool.query(
        "INSERT INTO utilizadores (username, senha) VALUES ($1, $2)",
        [username, senhaHash]
      );
      res.json({ success: true });
    } catch (err) {
      console.error("Erro ao registar utilizador:", err);
      res.status(500).json({ error: "Erro no servidor" });
    }
  });
} else {
  app.post("/api/registar-utilizador", (req, res) => {
    return res.status(403).json({ error: "Registo público desativado." });
  });
}

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username e password são obrigatórios" });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM utilizadores WHERE username = $1",
      [username]
    );

    if (result.rows.length === 1) {
      const user = result.rows[0];
      const senhaValida = await bcrypt.compare(password, user.senha);
      
      if (senhaValida) {
        const token = jwt.sign(
          { username: user.username, id: user.id },
          JWT_SECRET,
          { expiresIn: "30m" }
        );
        return res.json({ token });
      }
    }
    
    return res.status(401).json({ error: "Credenciais inválidas" });
  } catch (err) {
    console.error("Erro no login:", err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

// Listar utilizadores para o login
app.get("/api/utilizadores", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT username FROM utilizadores ORDER BY username ASC"
    );
    const nomes = result.rows.map((u) => u.username);
    res.json(nomes);
  } catch (err) {
    console.error("Erro ao listar utilizadores:", err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

// =============================
// ROTAS PROTEGIDAS
// =============================
app.use("/api", verificarToken);

// Listar todos os utilizadores (apenas admin)
app.get("/api/todos-utilizadores", verificarAdmin, async (req, res) => {
  try {
    const resultado = await pool.query(
      "SELECT username FROM utilizadores ORDER BY username ASC"
    );
    res.json(resultado.rows);
  } catch (err) {
    console.error("Erro ao buscar utilizadores:", err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

// Criar novo utilizador (apenas admin)
app.post("/api/novo-utilizador", verificarAdmin, async (req, res) => {
  const { username, senha } = req.body;

  if (!username || !senha) {
    return res.status(400).json({ error: "Campos obrigatórios em falta." });
  }

  try {
    const existe = await pool.query(
      "SELECT * FROM utilizadores WHERE username = $1",
      [username]
    );
    if (existe.rows.length > 0) {
      return res.status(409).json({ error: "Utilizador já existe." });
    }

    const senhaHash = await bcrypt.hash(senha, 10);
    await pool.query(
      "INSERT INTO utilizadores (username, senha) VALUES ($1, $2)",
      [username, senhaHash]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Erro ao criar utilizador:", err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

// Apagar utilizador (apenas admin)
app.delete("/api/utilizadores/:username", verificarAdmin, async (req, res) => {
  const { username } = req.params;

  if (username === "admin") {
    return res.status(403).json({ error: "Não é possível apagar o utilizador admin." });
  }

  try {
    const result = await pool.query("DELETE FROM utilizadores WHERE username = $1", [username]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Utilizador não encontrado" });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Erro ao apagar utilizador:", err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

// Editar utilizador (apenas admin)
app.put("/api/utilizadores/:username", verificarAdmin, async (req, res) => {
  const { username } = req.params;
  const { novaSenha } = req.body;

  if (!novaSenha) {
    return res.status(400).json({ error: "Nova senha é obrigatória" });
  }

  try {
    const senhaHash = await bcrypt.hash(novaSenha, 10);
    const result = await pool.query(
      "UPDATE utilizadores SET senha = $1 WHERE username = $2",
      [senhaHash, username]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Utilizador não encontrado" });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error("Erro ao editar utilizador:", err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

app.get("/api/utilizador", (req, res) => {
  res.json({ username: req.user.username });
});

// =============================
// GESTÃO DE REGISTOS
// =============================

// Obter todos os registos
app.get("/api/registos", async (req, res) => {
  try {
    const username = req.user.username;

    let resultado;
    if (username === "admin") {
      resultado = await pool.query("SELECT * FROM registos ORDER BY id ASC");
    } else {
      resultado = await pool.query(
        "SELECT * FROM registos WHERE utilizador = $1 ORDER BY id ASC",
        [username]
      );
    }

    res.json(resultado.rows);
  } catch (err) {
    console.error("Erro ao obter registos:", err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

// Buscar registos por intervalo
app.get("/api/registos/intervalo", async (req, res) => {
  const { inicio, fim } = req.query;
  const username = req.user.username;

  if (!inicio || !fim) {
    return res.status(400).json({ error: "Datas inválidas." });
  }

  try {
    let resultado;
    if (username === "admin") {
      resultado = await pool.query(
        `SELECT data, numdoc, pagamento, valor, op_tpa FROM registos
         WHERE data BETWEEN $1 AND $2
         ORDER BY data ASC`,
        [inicio, fim]
      );
    } else {
      resultado = await pool.query(
        `SELECT data, numdoc, pagamento, valor, op_tpa FROM registos
         WHERE data BETWEEN $1 AND $2 AND utilizador = $3
         ORDER BY data ASC`,
        [inicio, fim, username]
      );
    }

    res.json(resultado.rows);
  } catch (err) {
    console.error("Erro ao buscar registos por intervalo:", err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

// Inserir novo registo
app.post("/api/registar", validarRegisto, async (req, res) => {
  const { operacao, data, numDoc, pagamento, valor, op_tpa } = req.body;
  const username = req.user.username;

  try {
    // Inserir na tabela de registos
    await pool.query(
      `INSERT INTO registos (operacao, data, numDoc, pagamento, valor, op_tpa, utilizador)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [operacao, data, numDoc, pagamento, valor, op_tpa, username]
    );

    // Atualizar sequência
    await pool.query(
      `INSERT INTO sequencias_doc (utilizador, ultimo_numdoc)
       VALUES ($1, $2)
       ON CONFLICT (utilizador) DO UPDATE SET ultimo_numdoc = $2, updated_at = NOW()`,
      [username, numDoc]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Erro ao inserir registo:", err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

// Guardar numDoc atual
app.post("/api/save-numdoc", async (req, res) => {
  try {
    const username = req.user.username;
    const { ultimo_numdoc } = req.body;

    if (!ultimo_numdoc || isNaN(ultimo_numdoc)) {
      return res.status(400).json({ error: "numDoc inválido" });
    }

    await pool.query(
      `INSERT INTO sequencias_doc (utilizador, ultimo_numdoc, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (utilizador)
       DO UPDATE SET ultimo_numdoc = $2, updated_at = NOW()`,
      [username, ultimo_numdoc]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Erro ao salvar numDoc:", err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

// Obter próximo numDoc
app.get("/api/next-numdoc", async (req, res) => {
  try {
    const username = req.user.username;

    const result = await pool.query(
      "SELECT ultimo_numdoc FROM sequencias_doc WHERE utilizador = $1",
      [username]
    );

    let nextNumDoc = 1;
    if (result.rows.length) {
      nextNumDoc = result.rows[0].ultimo_numdoc + 1;
    }

    res.json({ nextNumDoc });
  } catch (err) {
    console.error("Erro ao obter próximo numDoc:", err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

// Apagar um registo por ID
app.delete("/api/registos/:id", async (req, res) => {
  const { id } = req.params;
  
  if (!id || isNaN(id)) {
    return res.status(400).json({ error: "ID inválido" });
  }

  try {
    const result = await pool.query("DELETE FROM registos WHERE id = $1", [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Registo não encontrado" });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Erro ao apagar registo:", err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

// Editar registo por ID
app.put("/api/registos/:id", validarRegisto, async (req, res) => {
  const { id } = req.params;
  const { operacao, data, numDoc, pagamento, valor, op_tpa } = req.body;
  
  if (!id || isNaN(id)) {
    return res.status(400).json({ error: "ID inválido" });
  }

  try {
    const result = await pool.query(
      `UPDATE registos
       SET operacao = $1, data = $2, numDoc = $3, pagamento = $4, valor = $5, op_tpa = $6
       WHERE id = $7`,
      [operacao, data, numDoc, pagamento, valor, op_tpa, id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Registo não encontrado" });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error("Erro ao atualizar registo:", err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

// =============================
// GESTÃO DE SALDOS
// =============================

// Obter saldos de hoje
app.get("/api/saldos-hoje", async (req, res) => {
  const username = req.user.username;

  try {
    // Obter user_id
    const { rows: userRows } = await pool.query(
      "SELECT id FROM utilizadores WHERE username = $1",
      [username]
    );
    if (!userRows.length) {
      return res.status(404).json({ erro: "Utilizador não encontrado." });
    }
    const userId = userRows[0].id;

    // Último fecho de HOJE
    const { rows: fechos } = await pool.query(
      `SELECT dinheiro, multibanco, transferencia, total, created_at
         FROM saldos_diarios
        WHERE data = CURRENT_DATE AND user_id = $1
        ORDER BY created_at DESC
        LIMIT 1`,
      [userId]
    );

    // Sem fecho hoje: somar tudo de hoje
    if (fechos.length === 0) {
      const { rows: somaRows } = await pool.query(
        `SELECT pagamento, SUM(valor) AS total
           FROM registos
          WHERE data = CURRENT_DATE AND utilizador = $1
          GROUP BY pagamento`,
        [username]
      );

      let dinheiro = 0, multibanco = 0, transferencia = 0;
      for (const r of somaRows) {
        const m = (r.pagamento || "").toLowerCase();
        const v = parseFloat(r.total || 0);
        if (m.includes("dinheiro")) dinheiro += v;
        else if (m.includes("multibanco")) multibanco += v;
        else if (m.includes("transfer")) transferencia += v;
      }

      return res.json({
        fechado: false,
        dinheiro,
        multibanco,
        transferencia,
        total: dinheiro + multibanco + transferencia,
      });
    }

    // Há fecho hoje
    const fecho = fechos[0];
    const tsFecho = fecho.created_at;

    // Ver se há registos DEPOIS do fecho
    const { rows: regDepoisFecho } = await pool.query(
      `SELECT 1
         FROM registos
        WHERE data = CURRENT_DATE
          AND utilizador = $1
          AND created_at > $2
        LIMIT 1`,
      [username, tsFecho]
    );

    // Sem novos registos → mostra o valor do fecho
    if (regDepoisFecho.length === 0) {
      return res.json({
        fechado: true,
        dinheiro: parseFloat(fecho.dinheiro || 0),
        multibanco: parseFloat(fecho.multibanco || 0),
        transferencia: parseFloat(fecho.transferencia || 0),
        total: parseFloat(fecho.total || 0),
      });
    }

    // Houve registos após fecho → somar APENAS os posteriores
    const { rows: somaPos } = await pool.query(
      `SELECT pagamento, SUM(valor) AS total
         FROM registos
        WHERE data = CURRENT_DATE
          AND utilizador = $1
          AND created_at > $2
        GROUP BY pagamento`,
      [username, tsFecho]
    );

    let dinheiro = 0, multibanco = 0, transferencia = 0;
    for (const r of somaPos) {
      const m = (r.pagamento || "").toLowerCase();
      const v = parseFloat(r.total || 0);
      if (m.includes("dinheiro")) dinheiro += v;
      else if (m.includes("multibanco")) multibanco += v;
      else if (m.includes("transfer")) transferencia += v;
    }

    return res.json({
      fechado: false,
      dinheiro,
      multibanco,
      transferencia,
      total: dinheiro + multibanco + transferencia,
    });
  } catch (err) {
    console.error("❌ ERRO /api/saldos-hoje:", err);
    res.status(500).json({ erro: "Erro interno no servidor." });
  }
});

// Fechar saldos
app.post("/api/fechar-saldos", async (req, res) => {
  const username = req.user.username;
  console.log("🧾 [/api/fechar-saldos] user =", username);

  try {
    const userQuery = await pool.query(
      "SELECT id FROM utilizadores WHERE username = $1",
      [username]
    );
    if (!userQuery.rows.length) {
      return res.status(404).json({ erro: "Utilizador não encontrado." });
    }
    const userId = userQuery.rows[0].id;

    const { rows } = await pool.query(
      `SELECT pagamento, SUM(valor) AS total
         FROM registos
        WHERE data = CURRENT_DATE AND utilizador = $1
        GROUP BY pagamento`,
      [username]
    );

    let dinheiro = 0, multibanco = 0, transferencia = 0;
    for (const r of rows) {
      const tot = parseFloat(r.total) || 0;
      const p = (r.pagamento || "").toLowerCase();
      if (p.includes("dinheiro")) dinheiro += tot;
      else if (p.includes("multibanco")) multibanco += tot;
      else if (p.includes("transferência")) transferencia += tot;
    }
    const total = dinheiro + multibanco + transferencia;

    const upsert = await pool.query(
      `INSERT INTO saldos_diarios (data, dinheiro, multibanco, transferencia, total, user_id)
       VALUES (CURRENT_DATE, $1, $2, $3, $4, $5)
       ON CONFLICT (data, user_id)
       DO UPDATE SET
         dinheiro = EXCLUDED.dinheiro,
         multibanco = EXCLUDED.multibanco,
         transferencia = EXCLUDED.transferencia,
         total = EXCLUDED.total,
         created_at = NOW()
       RETURNING *`,
      [dinheiro, multibanco, transferencia, total, userId]
    );

    console.log("✅ Fecho guardado:", upsert.rows[0]);
    res.json({ mensagem: "Saldos fechados com sucesso!", fecho: upsert.rows[0] });
  } catch (err) {
    console.error("💥 ERRO /api/fechar-saldos:", err);
    res.status(500).json({ erro: "Erro ao fechar saldos.", detalhe: String(err?.message || err) });
  }
});

// =============================
// ROTAS DE PÁGINAS
// =============================

app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "private", "index.html"));
});

app.get("/dashboard/tabela", (req, res) => {
  res.sendFile(path.join(__dirname, "private", "tabela.html"));
});

app.get("/dashboard/historico", (req, res) => {
  res.sendFile(path.join(__dirname, "private", "historico.html"));
});

// =============================
// TRATAMENTO DE ERROS
// =============================

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error('❌ Erro não tratado:', err);
  res.status(500).json({ error: "Erro interno do servidor" });
});

// Rota 404
app.use((req, res) => {
  res.status(404).json({ error: "Rota não encontrada" });
});

// =============================
// START SERVER
// =============================
app.listen(PORT, () => {
  console.log(`✅ Servidor a correr em http://localhost:${PORT}`);
  console.log(`🔐 JWT_SECRET configurado: ${JWT_SECRET ? 'Sim' : 'Não'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 Encerrando servidor...');
  pool.end();
  process.exit(0);
});
