// ============================================
// 🔧 Variáveis de ambiente (.env)
// ============================================
require("dotenv").config();

// ============================================
// 📦 Dependências
// ============================================
const express = require("express");
const path = require("path");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { Pool } = require("pg");

// ============================================
// 🚀 App & Config base
// ============================================
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

// ⚠️ Garantir que a chave JWT existe
if (!JWT_SECRET) {
  console.error("❌ JWT_SECRET não configurado no .env");
  process.exit(1);
}

// ============================================
// 🗄️ Pool de ligação ao PostgreSQL
// ============================================
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
});

// Monitoriza erros inesperados do pool
pool.on("error", (err) => {
  console.error("❌ Erro inesperado no pool:", err);
  process.exit(-1);
});

// ============================================
// 🌐 Middlewares globais
// ============================================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Log de cada pedido
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ============================================
// 🔐 Middlewares de segurança (JWT + Admin)
// ============================================

// Verifica e decodifica o token JWT
function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader)
    return res.status(401).json({ error: "Token não fornecido" });

  const token = authHeader.split(" ")[1];
  if (!token)
    return res.status(401).json({ error: "Formato de token inválido" });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err)
      return res.status(401).json({ error: "Token inválido ou expirado" });
    req.user = decoded; // { username, id }
    next();
  });
}

// Restringe rota a administradores
function verificarAdmin(req, res, next) {
  if (req.user.username !== "admin") {
    return res.status(403).json({ error: "Acesso negado - Apenas admin" });
  }
  next();
}

// ============================================
// 🧪 Validação de payloads
// ============================================
function validarRegisto(req, res, next) {
  const { operacao, data, numDoc, pagamento, valor /* op_tpa */ } = req.body;

  if (!operacao || !data || !numDoc || !pagamento || !valor) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios" });
  }
  if (isNaN(valor) || parseFloat(valor) <= 0) {
    return res.status(400).json({ error: "Valor deve ser um número positivo" });
  }
  if (isNaN(numDoc) || parseInt(numDoc) <= 0) {
    return res
      .status(400)
      .json({ error: "Número do documento deve ser positivo" });
  }
  next();
}

// ============================================
// 🌐 Rotas públicas (estáticos + login)
// ============================================

// Ficheiros estáticos
app.use(express.static(path.join(__dirname, "public")));
app.use("/assets", express.static(path.join(__dirname, "public", "assets")));

// Páginas públicas
app.get("/login.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// Redireciona raiz para login
app.get("/", (req, res) => {
  res.redirect("/login.html");
});

// Serve HTML/CSS/JS do dashboard (proteção é feita no frontend via JWT)
app.use("/private", express.static(path.join(__dirname, "private")));

// ============================================
// 🔑 Autenticação & Registo público (opcional)
// ============================================

// Registo público condicionado por flag .env
if (process.env.ENABLE_PUBLIC_REGISTRATION === "true") {
  app.post("/api/registar-utilizador", async (req, res) => {
    const { username, senha, adminPassword } = req.body;

    if (!username || !senha || !adminPassword) {
      return res
        .status(400)
        .json({ error: "Todos os campos são obrigatórios." });
    }

    const senhaAdminCorreta = process.env.ADMIN_PASSWORD;
    if (!senhaAdminCorreta || adminPassword !== senhaAdminCorreta) {
      return res.status(403).json({ error: "Senha de admin incorreta." });
    }

    try {
      const existe = await pool.query(
        "SELECT 1 FROM utilizadores WHERE username = $1",
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
  // Endpoint existe mas sempre bloqueado
  app.post("/api/registar-utilizador", (req, res) => {
    return res.status(403).json({ error: "Registo público desativado." });
  });
}

// Login → devolve JWT
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res
      .status(400)
      .json({ error: "Username e password são obrigatórios" });

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
          { expiresIn: "30m" } // expira em 30 minutos
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

// Suporte ao dropdown de utilizadores no login
app.get("/api/utilizadores", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT username FROM utilizadores ORDER BY username ASC"
    );
    res.json(result.rows.map((u) => u.username));
  } catch (err) {
    console.error("Erro ao listar utilizadores:", err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

// ============================================
// 🔒 Rotas protegidas (precisam de JWT)
// ============================================
app.use("/api", verificarToken);

// ── Gestão de utilizadores (apenas admin) ─────────────────────

// Lista todos os utilizadores (para UI de gestão)
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

// Cria novo utilizador
app.post("/api/novo-utilizador", verificarAdmin, async (req, res) => {
  const { username, senha } = req.body;
  if (!username || !senha) {
    return res.status(400).json({ error: "Campos obrigatórios em falta." });
  }

  try {
    const existe = await pool.query(
      "SELECT 1 FROM utilizadores WHERE username = $1",
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

// Apaga utilizador (não permite apagar admin)
app.delete("/api/utilizadores/:username", verificarAdmin, async (req, res) => {
  const { username } = req.params;
  if (username === "admin") {
    return res
      .status(403)
      .json({ error: "Não é possível apagar o utilizador admin." });
  }

  try {
    const result = await pool.query(
      "DELETE FROM utilizadores WHERE username = $1",
      [username]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Utilizador não encontrado" });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Erro ao apagar utilizador:", err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

// Atualiza senha do utilizador
app.put("/api/utilizadores/:username", verificarAdmin, async (req, res) => {
  const { username } = req.params;
  const { novaSenha } = req.body;

  if (!novaSenha)
    return res.status(400).json({ error: "Nova senha é obrigatória" });

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

// Devolve o username a partir do token
app.get("/api/utilizador", (req, res) => {
  res.json({ username: req.user.username });
});

// ============================================
// 🧾 Gestão de registos
// ============================================

// Lista registos (admin vê todos; user vê os seus)
app.get("/api/registos", async (req, res) => {
  try {
    const username = req.user.username;

    const resultado =
      username === "admin"
        ? await pool.query("SELECT * FROM registos ORDER BY id ASC")
        : await pool.query(
            "SELECT * FROM registos WHERE utilizador = $1 ORDER BY id ASC",
            [username]
          );

    res.json(resultado.rows);
  } catch (err) {
    console.error("Erro ao obter registos:", err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

// Lista registos por intervalo (com/sem filtro por utilizador)
app.get("/api/registos/intervalo", async (req, res) => {
  const { inicio, fim, utilizador, numdoc, pagamento } = req.query;
  const username = req.user.username;

  try {
    // Construir query dinamicamente; permitir pesquisas sem datas
    let sql = `
      SELECT data, numdoc, pagamento, valor, op_tpa, utilizador
        FROM registos
       WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    // Filtro por datas (apenas se ambas as datas foram fornecidas)
    if (inicio && fim) {
      sql += ` AND data BETWEEN $${idx++} AND $${idx++}`;
      params.push(inicio, fim);
    } else if ((inicio && !fim) || (!inicio && fim)) {
      // Se apenas uma das datas for fornecida, pedir ambos (evita confusão)
      return res
        .status(400)
        .json({
          error:
            "Ambas as datas (inicio e fim) devem ser fornecidas para filtrar por intervalo.",
        });
    }

    // Filtros dinâmicos
    if (username !== "admin") {
      // utilizador não-admin vê apenas os seus registos
      sql += ` AND utilizador = $${idx++}`;
      params.push(username);
    } else if (utilizador) {
      sql += ` AND utilizador ILIKE $${idx++}`;
      params.push(`%${utilizador}%`);
    }

    if (numdoc) {
      sql += ` AND CAST(numdoc AS TEXT) ILIKE $${idx++}`;
      params.push(`%${numdoc}%`);
    }
    if (pagamento) {
      sql += ` AND pagamento = $${idx++}`;
      params.push(pagamento);
    }

    sql += " ORDER BY data ASC";

    const resultado = await pool.query(sql, params);

    res.json(resultado.rows);
  } catch (err) {
    console.error("Erro ao buscar registos por intervalo:", err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

// Cria novo registo e atualiza sequência de numDoc
app.post("/api/registar", validarRegisto, async (req, res) => {
  const { operacao, data, numDoc, pagamento, valor, op_tpa } = req.body;
  const username = req.user.username;

  try {
    await pool.query(
      `INSERT INTO registos (operacao, data, numDoc, pagamento, valor, op_tpa, utilizador)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [operacao, data, numDoc, pagamento, valor, op_tpa, username]
    );

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

// Guarda manualmente o último numDoc (UI de edição)
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

// Devolve o próximo numDoc sugerido
app.get("/api/next-numdoc", async (req, res) => {
  try {
    const username = req.user.username;
    const result = await pool.query(
      "SELECT ultimo_numdoc FROM sequencias_doc WHERE utilizador = $1",
      [username]
    );

    let nextNumDoc = 1;
    if (result.rows.length) nextNumDoc = result.rows[0].ultimo_numdoc + 1;

    res.json({ nextNumDoc });
  } catch (err) {
    console.error("Erro ao obter próximo numDoc:", err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

// Apaga um registo por ID
app.delete("/api/registos/:id", async (req, res) => {
  const { id } = req.params;
  if (!id || isNaN(id)) return res.status(400).json({ error: "ID inválido" });

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

// Atualiza um registo por ID
app.put("/api/registos/:id", validarRegisto, async (req, res) => {
  const { id } = req.params;
  const { operacao, data, numDoc, pagamento, valor, op_tpa } = req.body;

  if (!id || isNaN(id)) return res.status(400).json({ error: "ID inválido" });

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

// ============================================
// 💰 Gestão de saldos do dia
// ============================================

// Devolve um fecho específico por ID (para gerar PDF)
app.get("/api/fechos/:id", verificarToken, async (req, res) => {
  const { id } = req.params;
  if (!id || isNaN(id)) return res.status(400).json({ error: "ID inválido" });

  try {
    const { rows } = await pool.query(
      `SELECT sd.id, sd.created_at, sd.dinheiro, sd.multibanco, sd.transferencia,
              sd.total, sd.montante_periodo, u.username
         FROM saldos_diarios sd
         JOIN utilizadores u ON u.id = sd.user_id
        WHERE sd.id = $1
        LIMIT 1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Fecho não encontrado" });
    }

    const r = rows[0];
    res.json({
      id: r.id,
      created_at: r.created_at,
      utilizador: r.username,
      dinheiro: parseFloat(r.dinheiro || 0),
      multibanco: parseFloat(r.multibanco || 0),
      transferencia: parseFloat(r.transferencia || 0),
      total: parseFloat(r.total || 0),
      montante_periodo: parseFloat(r.montante_periodo || 0),
    });
  } catch (err) {
    console.error("Erro ao obter fecho:", err);
    res.status(500).json({ error: "Erro ao obter fecho" });
  }
});

// Calcula e devolve saldos do dia, respeitando “fecho”
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

    // Último fecho de hoje (por utilizador)
    const { rows: fechos } = await pool.query(
      `SELECT dinheiro, multibanco, transferencia, total, created_at
         FROM saldos_diarios
        WHERE data = CURRENT_DATE AND user_id = $1
        ORDER BY created_at DESC
        LIMIT 1`,
      [userId]
    );

    // Sem fecho hoje → somar o dia inteiro
    if (fechos.length === 0) {
      const { rows: somaRows } = await pool.query(
        `SELECT pagamento, SUM(valor) AS total
           FROM registos
          WHERE data = CURRENT_DATE AND utilizador = $1
          GROUP BY pagamento`,
        [username]
      );

      let dinheiro = 0,
        multibanco = 0,
        transferencia = 0;
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

    // Há fecho hoje → ver se houve registos depois
    const fecho = fechos[0];
    const tsFecho = fecho.created_at;

    const { rows: regDepoisFecho } = await pool.query(
      `SELECT 1
         FROM registos
        WHERE data = CURRENT_DATE
          AND utilizador = $1
          AND created_at > $2
        LIMIT 1`,
      [username, tsFecho]
    );

    // Sem novos registos → devolve o fecho
    if (regDepoisFecho.length === 0) {
      return res.json({
        fechado: true,
        dinheiro: parseFloat(fecho.dinheiro || 0),
        multibanco: parseFloat(fecho.multibanco || 0),
        transferencia: parseFloat(fecho.transferencia || 0),
        total: parseFloat(fecho.total || 0),
      });
    }

    // Houve registos após fecho → somar apenas posteriores
    const { rows: somaPos } = await pool.query(
      `SELECT pagamento, SUM(valor) AS total
         FROM registos
        WHERE data = CURRENT_DATE
          AND utilizador = $1
          AND created_at > $2
        GROUP BY pagamento`,
      [username, tsFecho]
    );

    let dinheiro = 0,
      multibanco = 0,
      transferencia = 0;
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
//_____________________________________________________________________
// Regista/atualiza o fecho de saldos do dia

app.post("/api/fechar-saldos", async (req, res) => {
  const username = req.user.username;
  console.log("🧾 [/api/fechar-saldos] user =", username);

  try {
    // Obter o user_id
    const userQuery = await pool.query(
      "SELECT id FROM utilizadores WHERE username = $1",
      [username]
    );
    if (!userQuery.rows.length) {
      return res.status(404).json({ erro: "Utilizador não encontrado." });
    }
    const userId = userQuery.rows[0].id;

    // Soma atual por método
    const { rows } = await pool.query(
      `SELECT pagamento, SUM(valor) AS total
         FROM registos
        WHERE data = CURRENT_DATE AND utilizador = $1
        GROUP BY pagamento`,
      [username]
    );

    let dinheiro = 0,
      multibanco = 0,
      transferencia = 0;
    for (const r of rows) {
      const tot = parseFloat(r.total) || 0;
      const p = (r.pagamento || "").toLowerCase();
      if (p.includes("dinheiro")) dinheiro += tot;
      else if (p.includes("multibanco")) multibanco += tot;
      else if (p.includes("transferência")) transferencia += tot;
    }

    // Valores do total atual (antes de subtrair o fecho anterior)
    let dinheiroPeriodo = dinheiro;
    let multibancoPeriodo = multibanco;
    let transferenciaPeriodo = transferencia;

    // Buscar último fecho (de qualquer data)
    const { rows: ultimoFecho } = await pool.query(
      `SELECT dinheiro, multibanco, transferencia
         FROM saldos_diarios
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 1`,
      [userId]
    );

    // Subtrair valores do último fecho para obter só o período
    if (ultimoFecho.length > 0) {
      const prev = ultimoFecho[0];
      dinheiroPeriodo -= parseFloat(prev.dinheiro || 0);
      multibancoPeriodo -= parseFloat(prev.multibanco || 0);
      transferenciaPeriodo -= parseFloat(prev.transferencia || 0);
    }

    const totalPeriodo =
      dinheiroPeriodo + multibancoPeriodo + transferenciaPeriodo;

    // Inserir o fecho com os valores do PERÍODO (não acumulado)
    const insert = await pool.query(
      `INSERT INTO saldos_diarios
       (data, dinheiro, multibanco, transferencia, total, montante_periodo, user_id)
       VALUES (CURRENT_DATE, $1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        dinheiroPeriodo,
        multibancoPeriodo,
        transferenciaPeriodo,
        totalPeriodo,
        totalPeriodo,
        userId,
      ]
    );

    console.log("✅ Fecho guardado:", insert.rows[0]);
    res.json({
      mensagem: "Saldos fechados com sucesso!",
      fecho: insert.rows[0],
    });
  } catch (err) {
    console.error("💥 ERRO /api/fechar-saldos:", err);
    res
      .status(500)
      .json({
        erro: "Erro ao fechar saldos.",
        detalhe: String(err?.message || err),
      });
  }
});

/**
 * Lista de fechos (admin apenas) - lê de saldos_diarios
 * Não altera a BD; só leitura.
 */
app.get("/api/fechos", verificarAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT sd.id, sd.data, sd.created_at, sd.total, sd.montante_periodo, u.username
         FROM saldos_diarios sd
         JOIN utilizadores u ON u.id = sd.user_id
        ORDER BY sd.created_at DESC`
    );

    const payload = rows.map((r) => ({
      id: r.id,
      data: r.data,
      created_at: r.created_at,
      utilizador: r.username,
      total: parseFloat(r.total || 0),
      montante_periodo: parseFloat(r.montante_periodo || 0),
    }));

    res.json(payload);
  } catch (err) {
    console.error("Erro ao listar fechos:", err);
    res.status(500).json({ error: "Erro ao listar fechos" });
  }
});

// Nova rota para filtrar fechos por intervalo e utilizador (admin apenas)
app.get("/api/fechos/intervalo", verificarAdmin, async (req, res) => {
  const { inicio, fim, utilizador } = req.query;

  try {
    let sql = `
      SELECT sd.id, sd.data, sd.created_at, sd.total, sd.montante_periodo, u.username
        FROM saldos_diarios sd
        JOIN utilizadores u ON u.id = sd.user_id
       WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (inicio && fim) {
      sql += ` AND sd.data BETWEEN $${idx++} AND $${idx++}`;
      params.push(inicio, fim);
    } else if ((inicio && !fim) || (!inicio && fim)) {
      return res
        .status(400)
        .json({
          error:
            "Ambas as datas (inicio e fim) devem ser fornecidas para filtrar por intervalo.",
        });
    }

    if (utilizador) {
      sql += ` AND u.username ILIKE $${idx++}`;
      params.push(`%${utilizador}%`);
    }

    sql += " ORDER BY sd.created_at DESC";

    const { rows } = await pool.query(sql, params);

    const payload = rows.map((r) => ({
      id: r.id,
      data: r.data,
      created_at: r.created_at,
      utilizador: r.username,
      total: parseFloat(r.total || 0),
      montante_periodo: parseFloat(r.montante_periodo || 0),
    }));

    res.json(payload);
  } catch (err) {
    console.error("Erro ao filtrar fechos:", err);
    res.status(500).json({ error: "Erro ao filtrar fechos" });
  }
});

// Apaga um fecho por ID (admin apenas)
app.delete("/api/fechos/:id", verificarAdmin, async (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(id)) return res.status(400).json({ error: "ID inválido" });

  // 🛡️ Proteger em produção
  if (process.env.NODE_ENV === "production") {
    return res
      .status(403)
      .json({ error: "Não é permitido apagar fechos em produção." });
  }

  try {
    const result = await pool.query(
      "DELETE FROM saldos_diarios WHERE id = $1",
      [id]
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: "Fecho não encontrado" });
    res.json({ success: true });
  } catch (err) {
    console.error("Erro ao apagar fecho:", err);
    res.status(500).json({ error: "Erro ao apagar fecho" });
  }
});
// 🔒 Lista os fechos do próprio utilizador (sem precisar de admin)
app.get("/api/fechos-user", async (req, res) => {
  const username = req.user.username;

  try {
    const { rows: userRows } = await pool.query(
      "SELECT id FROM utilizadores WHERE username = $1",
      [username]
    );
    if (!userRows.length) {
      return res.status(404).json({ error: "Utilizador não encontrado" });
    }

    const userId = userRows[0].id;

    const { rows } = await pool.query(
      `SELECT id, data, created_at, total, montante_periodo
         FROM saldos_diarios
        WHERE user_id = $1
        ORDER BY created_at DESC`,
      [userId]
    );

    res.json(
      rows.map((r) => ({
        id: r.id,
        data: r.data,
        created_at: r.created_at,
        total: parseFloat(r.total || 0),
        montante_periodo: parseFloat(r.montante_periodo || 0),
        utilizador: username,
      }))
    );
  } catch (err) {
    console.error("Erro ao listar fechos do utilizador:", err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

app.get("/api/analise", verificarToken, async (req, res) => {
  const { inicio, fim, utilizador, pagamento } = req.query;

  if (!inicio || !fim) {
    return res.status(400).json({ error: "Datas obrigatórias." });
  }

  const params = [inicio, fim];
  let query = `
    SELECT data, utilizador, valor, pagamento
    FROM registos
    WHERE data BETWEEN $1 AND $2
  `;

  if (utilizador && utilizador !== "todos") {
    params.push(utilizador);
    query += ` AND utilizador = $${params.length}`;
  }

  if (pagamento && pagamento !== "todos") {
    params.push(pagamento);
    query += ` AND pagamento ILIKE $${params.length}`;
  }

  try {
    const resultado = await pool.query(query, params);
    const registos = resultado.rows;

    // === 1. Agrupado por data para gráfico ===
    const agrupadoPorData = {};
    registos.forEach((r) => {
      let dataFormatada = "desconhecida";
      if (r.data) {
        const data = new Date(r.data);
        if (!isNaN(data)) {
          const ano = data.getFullYear();
          const mes = String(data.getMonth() + 1).padStart(2, "0");
          const dia = String(data.getDate()).padStart(2, "0");
          dataFormatada = `${ano}-${mes}-${dia}`;
        }
      }

      if (!agrupadoPorData[dataFormatada]) {
        agrupadoPorData[dataFormatada] = { total: 0 };
      }

      agrupadoPorData[dataFormatada].total += parseFloat(r.valor || 0);
    });

    // === 2. Resumo por utilizador ===
    const resumoPorUtilizador = {};
    registos.forEach((r) => {
      const user = r.utilizador || "Desconhecido";
      const valor = parseFloat(r.valor || 0);
      const pagamento = (r.pagamento || "").toLowerCase();

      if (!resumoPorUtilizador[user]) {
        resumoPorUtilizador[user] = {
          utilizador: user,
          vendas_com_iva: 0,
          vendas: 0,
          custos: 0,
          resultado: 0,
          numero_vendas: 0,
          dinheiro: 0,
          multibanco: 0,
          transferencia: 0,
        };
      }

      resumoPorUtilizador[user].vendas_com_iva += valor;
      resumoPorUtilizador[user].vendas += valor * 0.85;       // Supondo 15% IVA
      resumoPorUtilizador[user].custos += valor * 0.10;        // Exemplo
      resumoPorUtilizador[user].resultado += valor * 0.75;     // Exemplo
      resumoPorUtilizador[user].numero_vendas += 1;

      if (pagamento.includes("dinheiro")) {
        resumoPorUtilizador[user].dinheiro += valor;
      } else if (pagamento.includes("multibanco")) {
        resumoPorUtilizador[user].multibanco += valor;
      } else if (pagamento.includes("transfer")) {
        resumoPorUtilizador[user].transferencia += valor;
      }
    });

    res.json({
      agrupadoPorData,
      resumoPorUtilizador: Object.values(resumoPorUtilizador),
      total: registos.length,
    });
  } catch (err) {
    console.error("Erro na rota /api/analise:", err.stack || err.message || err);
    res.status(500).json({ error: "Erro ao gerar análise." });
  }
});
// ============================================
// 🧭 Rotas de páginas privadas (HTML)
// ============================================
app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "private", "index.html"));
});

app.get("/dashboard/tabela", (req, res) => {
  res.sendFile(path.join(__dirname, "private", "tabela.html"));
});

app.get("/dashboard/historico", (req, res) => {
  res.sendFile(path.join(__dirname, "private", "historico.html"));
});

app.get("/dashboard/fechos", (req, res) => {
  res.sendFile(path.join(__dirname, "private", "fechos.html"));
});

app.get("/dashboard/analise", (req, res) => {
  res.sendFile(path.join(__dirname, "private", "analise.html"));
});

// ============================================
// 🧯 Tratamento de erros (fallbacks)
// ============================================

// Handler de erros não tratados (evita crash silencioso)
app.use((err, req, res, next) => {
  console.error("❌ Erro não tratado:", err);
  res.status(500).json({ error: "Erro interno do servidor" });
});

// 404 para rotas desconhecidas
app.use((req, res) => {
  res.status(404).json({ error: "Rota não encontrada" });
});

// ============================================
// 🟢 Start do servidor
// ============================================
app.listen(PORT, () => {
  console.log(`✅ Servidor a correr em http://localhost:${PORT}`);
  console.log(`🔐 JWT_SECRET configurado: ${JWT_SECRET ? "Sim" : "Não"}`);
});

// Encerramento gracioso (Docker/k8s, etc.)
process.on("SIGTERM", () => {
  console.log("🔄 Encerrando servidor...");
  pool.end();
  process.exit(0);
});
