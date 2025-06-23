// server.js para PostgreSQL
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { Pool } = require("pg");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração da base de dados PostgreSQL
const pool = new Pool({
  user: "Martins",
  host: "localhost",
  database: "POS_BD",
  password: "app.bdm",
  port: 5432, // porta default do PostgreSQL
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// Criar tabela se não existir
pool.query(
  `CREATE TABLE IF NOT EXISTS registos (
    id SERIAL PRIMARY KEY,
    operacao TEXT,
    data DATE,
    numDoc INTEGER,
    pagamento TEXT,
    valor NUMERIC
  )`,
  (err) => {
    if (err) {
      console.error("Erro ao criar tabela:", err);
    } else {
      console.log("Tabela verificada/criada com sucesso.");
    }
  }
);

// Rota para registar dados
app.post("/api/registar", async (req, res) => {
  const { operacao, data, numDoc, pagamento, valor, op_tpa } = req.body;

  if (!operacao || !data || !numDoc || !pagamento || !valor) {
    return res.status(400).json({ error: "Dados incompletos" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO registos (operacao, data, numDoc, pagamento, valor, op_tpa)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [operacao, data, numDoc, pagamento, valor, op_tpa || null]
    );
    res.json({ success: true, id: result.rows[0].id });
  } catch (err) {
    console.error("Erro ao inserir registo:", err);
    res.status(500).json({ error: "Erro ao inserir registo" });
  }
});

// Rota para listar todos os registos
app.get("/api/registos", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM registos ORDER BY data DESC");
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar registos:", err);
    res.status(500).json({ error: "Erro ao buscar registos" });
  }
});

// Rota para filtrar registos por data
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

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor a correr na porta ${PORT}`);
});

// Rota para apagar todos os registos
app.delete("/api/registos", async (req, res) => {
  try {
    await pool.query("DELETE FROM registos");
    res.json({ success: true });
  } catch (err) {
    console.error("Erro ao apagar registos:", err);
    res.status(500).json({ error: "Erro ao apagar registos" });
  }
});

// Rota para apagar um registo específico por ID
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