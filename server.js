const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { Pool } = require("pg");
const path = require("path");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");

const authRoutes = require("./routes/auth"); // Importa router de autenticação

const app = express();
const PORT = process.env.PORT || 3000;

const SECRET = process.env.JWT_SECRET || "segredoSuperSeguro";

// PostgreSQL Pool com DATABASE_URL e SSL para Render
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});

// Middlewares
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));
app.use(bodyParser.json());
app.use(cookieParser());

// Servir ficheiros públicos (login, scripts, etc)
app.use(express.static(path.join(__dirname, "public")));

// Middleware para rotas protegidas
const authMiddleware = (req, res, next) => {
  const token = req.cookies.token;
  try {
    jwt.verify(token, SECRET);
    next();
  } catch (err) {
    return res.redirect("/login.html");
  }
};

// Servir a pasta /private só com token válido
app.use("/private", authMiddleware, express.static(path.join(__dirname, "private")));

// Rota de dashboard
app.get("/dashboard", authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, "private", "index.html"));
});

// Rota para tabela.html também protegida
app.get("/tabela.html", authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, "private", "tabela.html"));
});

// Rotas de autenticação
app.use("/api", authRoutes);

// Criar tabela se não existir
pool.query(`
  CREATE TABLE IF NOT EXISTS registos (
    id SERIAL PRIMARY KEY,
    operacao TEXT,
    data DATE,
    numDoc INTEGER,
    pagamento TEXT,
    valor NUMERIC,
    op_tpa TEXT
  )`,
  (err) => {
    if (err) console.error("Erro ao criar tabela:", err);
    else console.log("Tabela verificada/criada com sucesso.");
  }
);

// CRUD Registos

app.post("/api/registar", async (req, res) => {
  const { operacao, data, numDoc, pagamento, valor, op_tpa } = req.body;

  if (!operacao || !data || !numDoc || !pagamento || !valor) {
    return res.status(400).json({ error: "Dados incompletos" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO registos (operacao, data, numDoc, pagamento, valor, op_tpa)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [operacao, data, numDoc, pagamento, valor, op_tpa]
    );
    res.json({ success: true, id: result.rows[0].id });
  } catch (err) {
    console.error("Erro ao inserir registo:", err);
    res.status(500).json({ error: "Erro ao inserir registo" });
  }
});

app.get("/api/registos", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM registos ORDER BY data DESC");
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar registos:", err);
    res.status(500).json({ error: "Erro ao buscar registos" });
  }
});

app.get("/api/registos/filtrar", async (req, res) => {
  const { inicio, fim } = req.query;
  try {
    const result = await pool.query(
      `SELECT * FROM registos WHERE data BETWEEN $1 AND $2 ORDER BY data DESC`,
      [inicio, fim]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao filtrar registos:", err);
    res.status(500).json({ error: "Erro ao filtrar registos" });
  }
});

app.put("/api/registos/:id", async (req, res) => {
  const { id } = req.params;
  const { operacao, data, numDoc, pagamento, valor, op_tpa } = req.body;

  try {
    await pool.query(
      `UPDATE registos
       SET operacao = $1, data = $2, numdoc = $3, pagamento = $4, valor = $5, op_tpa = $6
       WHERE id = $7`,
      [operacao, data, numDoc, pagamento, valor, op_tpa, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Erro ao atualizar registo:", err.message);
    res.status(500).json({ error: "Erro ao atualizar registo" });
  }
});

app.delete("/api/registos/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM registos WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("Erro ao apagar registo:", err);
    res.status(500).json({ error: "Erro ao apagar registo" });
  }
});

app.delete("/api/registos", async (req, res) => {
  try {
    await pool.query("DELETE FROM registos");
    res.json({ success: true });
  } catch (err) {
    console.error("Erro ao apagar todos os registos:", err);
    res.status(500).json({ error: "Erro ao apagar registos" });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor a correr na porta ${PORT}`);
});