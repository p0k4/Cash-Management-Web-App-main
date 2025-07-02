
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { Pool } = require("pg");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração PostgreSQL
// Configuração PostgreSQL adaptável
const isProduction = process.env.NODE_ENV === "production";

const pool = new Pool(
  isProduction
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        user: "martins",
        host: "localhost",
        database: "pos_db_s11u",
        password: "app.bdm",
        port: 5432,
      }
);
// Middleware
app.use(cors({
  origin: "*"
}));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// Criar tabela
pool.query(
  `CREATE TABLE IF NOT EXISTS registos (
    id SERIAL PRIMARY KEY,
    operacao TEXT,
    data DATE,
    numDoc INTEGER,
    pagamento TEXT,
    valor NUMERIC,
    op_tpa TEXT
  )`
)
  .then(() => {
    console.log("Tabela verificada/criada com sucesso.");
  })
  .catch(err => {
    console.error("❌ Erro ao criar tabela:", err);
  });

// POST - Criar novo registo
app.post("/api/registar", async (req, res) => {
 const { operacao, data, numDoc, pagamento, valor, op_tpa } = req.body;
   if (isNaN(valor) || valor <= 0 || valor > 10000) {
    return res.status(400).json({ error: "Valor inválido. Limite permitido é entre 0.01 € e 10.000 €" });
  }
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

// GET - Listar todos os registos
app.get("/api/registos", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM registos ORDER BY data DESC");
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar registos:", err);
    res.status(500).json({ error: "Erro ao buscar registos" });
  }
});

// GET - Filtrar por data
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

// PUT - Atualizar registo
app.put("/api/registos/:id", async (req, res) => {
  const id = req.params.id;
  const {
    operacao,
    data,
    numDoc, // <-- recebido do frontend
    pagamento,
    valor,
    op_tpa,
  } = req.body;

  console.log("Atualizar registo ID:", id, {
    operacao,
    data,
    numDoc,
    pagamento,
    valor,
    op_tpa
  });

  try {
    await pool.query(
      `UPDATE registos
       SET operacao = $1, data = $2, numdoc = $3, pagamento = $4, valor = $5, op_tpa = $6
       WHERE id = $7`,
      [operacao, data, numDoc, pagamento, valor, op_tpa, id] // numDoc usado aqui
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Erro ao atualizar registo:", err.message);
    res.status(500).json({ error: "Erro ao atualizar registo" });
  }
});

// DELETE - Apagar registo
app.delete("/api/registos/:id", async (req, res) => {
  const id = req.params.id;
  try {
    await pool.query(`DELETE FROM registos WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("Erro ao apagar registo:", err);
    res.status(500).json({ error: "Erro ao apagar registo" });
  }
});

// DELETE - Apagar todos os registos
app.delete("/api/registos", async (req, res) => {
  try {
    await pool.query("DELETE FROM registos");
    res.json({ success: true });
  } catch (err) {
    console.error("Erro ao apagar todos os registos:", err);
    res.status(500).json({ error: "Erro ao apagar registos" });
  }
});

// Catch-all para servir index.html em qualquer rota não-API
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor a correr na porta ${PORT}`);
});

