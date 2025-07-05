require('dotenv').config();
const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'um-segredo-bem-forte';

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

// Criação da tabela se não existir
pool.query(`
  CREATE TABLE IF NOT EXISTS registos (
    id SERIAL PRIMARY KEY,
    operacao TEXT,
    data DATE,
    numDoc INTEGER,
    pagamento TEXT,
    valor NUMERIC,
    op_tpa TEXT
  )
`, (err) => {
  if (err) {
    console.error('Erro ao criar tabela:', err);
  } else {
    console.log('✅ Tabela "registos" pronta!');
  }
});

// =============================
// MIDDLEWARES GLOBAIS
// =============================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =============================
// MIDDLEWARE JWT PARA A API
// =============================
function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).send('Unauthorized');

  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).send('Unauthorized');
    req.user = decoded;
    next();
  });
}

// =============================
// ROTAS PÚBLICAS
// =============================

// Assets públicos
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));

// Página de login
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Redirecionamento /
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

// Serve /private SEM proteção -> HTML, CSS, JS
app.use('/private', express.static(path.join(__dirname, 'private')));

// =============================
// LOGIN (público)
// =============================
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (username === 'admin' && password === '8000') {
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '5m' });
    return res.json({ token });
  }

  return res.status(401).json({ error: 'Credenciais inválidas' });
});

// =============================
// TODAS AS ROTAS /api PROTEGIDAS
// =============================
app.use('/api', verificarToken);

// =============================
// ROTAS DA API
// =============================

// Obter todos os registos
app.get('/api/registos', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT * FROM registos ORDER BY id ASC');
    res.json(resultado.rows);
  } catch (err) {
    console.error('Erro ao obter registos:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// Inserir novo registo
app.post('/api/registar', async (req, res) => {
  const { operacao, data, numDoc, pagamento, valor, op_tpa } = req.body;
  try {
    await pool.query(
      `INSERT INTO registos (operacao, data, numDoc, pagamento, valor, op_tpa)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [operacao, data, numDoc, pagamento, valor, op_tpa]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao inserir registo:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// Apagar todos os registos
app.delete('/api/registos', async (req, res) => {
  try {
    await pool.query('DELETE FROM registos');
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao apagar registos:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// Apagar um registo por ID
app.delete('/api/registos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM registos WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao apagar registo:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// Editar registo por ID
app.put('/api/registos/:id', async (req, res) => {
  const { id } = req.params;
  const { operacao, data, numDoc, pagamento, valor, op_tpa } = req.body;
  try {
    await pool.query(
      `UPDATE registos
       SET operacao = $1, data = $2, numDoc = $3, pagamento = $4, valor = $5, op_tpa = $6
       WHERE id = $7`,
      [operacao, data, numDoc, pagamento, valor, op_tpa, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao atualizar registo:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// =============================
// SERVE /dashboard -> /private/index.html
// =============================
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'private', 'index.html'));
});

// =============================
// Catch-All para SPA (serve sempre o index.html)
// =============================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'private', 'index.html'));
});

// =============================
// START SERVER
// =============================
app.listen(PORT, () => {
  console.log(`✅ Servidor a correr em http://localhost:${PORT}`);
});