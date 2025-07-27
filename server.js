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
    op_tpa TEXT,
    utilizador TEXT
  )
`, (err) => {
  if (err) {
    console.error('Erro ao criar tabela:', err);
  } else {
    console.log('✅ Tabela "registos" pronta!');
  }
});

pool.query(`
  CREATE TABLE IF NOT EXISTS utilizadores (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    senha TEXT NOT NULL
  )
`, (err) => {
  if (err) {
    console.error('Erro ao criar tabela utilizadores:', err);
  } else {
    console.log('✅ Tabela "utilizadores" pronta!');
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


app.post('/api/registar-utilizador', async (req, res) => {
  const { username, senha, adminPassword } = req.body;

  if (!username || !senha || !adminPassword) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }

  // Verifica se a senha do admin está correta
  const senhaAdminCorreta = process.env.ADMIN_PASSWORD || '10000';
  if (adminPassword !== senhaAdminCorreta) {
    return res.status(403).json({ error: 'Senha de admin incorreta.' });
  }

  try {
    const existe = await pool.query('SELECT * FROM utilizadores WHERE username = $1', [username]);
    if (existe.rows.length > 0) {
      return res.status(409).json({ error: 'Utilizador já existe.' });
    }

    await pool.query('INSERT INTO utilizadores (username, senha) VALUES ($1, $2)', [username, senha]);
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao registar utilizador:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM utilizadores WHERE username = $1 AND senha = $2',
      [username, password]
    );

    if (result.rows.length === 1) {
      const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '30m' });
      return res.json({ token });
    } else {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// ✅ NOVA ROTA: listar utilizadores para o login
app.get('/api/utilizadores', async (req, res) => {
  try {
    const result = await pool.query('SELECT username FROM utilizadores ORDER BY username ASC');
    const nomes = result.rows.map(u => u.username);
    res.json(nomes);
  } catch (err) {
    console.error('Erro ao listar utilizadores:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// Protege todas as outras rotas
app.use('/api', verificarToken);

// =============================
// TODAS AS ROTAS /api PROTEGIDAS
// =============================


// =============================
// ROTAS DA API
// =============================

// Obter todos os registos
app.get('/api/registos', async (req, res) => {
  try {
    const username = req.user.username;

    let resultado;

    if (username === 'admin') {
      // admin vê tudo
      resultado = await pool.query('SELECT * FROM registos ORDER BY id ASC');
    } else {
      // outros só veem os seus
      resultado = await pool.query(
        'SELECT * FROM registos WHERE utilizador = $1 ORDER BY id ASC',
        [username]
      );
    }

    res.json(resultado.rows);
  } catch (err) {
    console.error('Erro ao obter registos:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// API GET /api/registos/intervalo
app.get('/api/registos/intervalo', async (req, res) => {
  const { inicio, fim } = req.query;
  const username = req.user.username;

  if (!inicio || !fim) {
    return res.status(400).json({ error: "Datas inválidas." });
  }

  try {
    let resultado;
if (username === 'admin') {
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
app.post('/api/registar', async (req, res) => {
  const { operacao, data, numDoc, pagamento, valor, op_tpa } = req.body;
  const username = req.user.username;

  // console.log("➡️ Novo registo recebido:", {
  //   username,
  //   operacao,
  //   data,
  //   numDoc,
  //   pagamento,
  //   valor,
  //   op_tpa
  // });

  try {
    // 1️⃣ Inserir na tabela de registos
    await pool.query(
      `INSERT INTO registos (operacao, data, numDoc, pagamento, valor, op_tpa, utilizador)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [operacao, data, numDoc, pagamento, valor, op_tpa, username]
    );

    // 2️⃣ Atualizar sequência
    await pool.query(
      `INSERT INTO sequencias_doc (utilizador, ultimo_numdoc)
       VALUES ($1, $2)
       ON CONFLICT (utilizador) DO UPDATE SET ultimo_numdoc = $2`,
      [username, numDoc]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Erro ao inserir registo:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});
app.get('/api/next-numdoc', async (req, res) => {
  try {
    const username = req.user.username;

    const result = await pool.query(
      'SELECT ultimo_numdoc FROM sequencias_doc WHERE utilizador = $1',
      [username]
    );

    let nextNumDoc = 1;
    if (result.rows.length) {
      nextNumDoc = result.rows[0].ultimo_numdoc + 1;
    }

    res.json({ nextNumDoc });
  } catch (err) {
    console.error('Erro ao obter próximo numDoc:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// Apagar registos
app.delete('/api/registos', async (req, res) => {
  const username = req.user.username;

  try {
    if (username !== 'admin') {
      return res.status(403).json({ error: 'Apenas o admin pode apagar todos os dados.' });
    }

    await pool.query('DELETE FROM registos');
    await pool.query('DELETE FROM sequencias_doc');

    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao apagar registos:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

app.post('/api/save-numdoc', async (req, res) => {
  try {
    const username = req.user.username;
    const { ultimoNumDoc } = req.body;

    await pool.query(
      `INSERT INTO sequencias_doc (utilizador, ultimo_numdoc)
       VALUES ($1, $2)
       ON CONFLICT (utilizador) DO UPDATE SET ultimo_numdoc = $2`,
      [username, ultimoNumDoc]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao salvar numDoc:', err);
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

// Serve /dashboard
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'private', 'index.html'));
});

// Serve /tabela.html
app.get('/dashboard/tabela', (req, res) => {
  res.sendFile(path.join(__dirname, 'private', 'tabela.html'));
});
// Serve /dashboard/historico
app.get('/dashboard/historico', (req, res) => {
  res.sendFile(path.join(__dirname, 'private', 'historico.html'));
});

// Serve outras rotas (404)
app.use((req, res) => {
  res.status(404).send('404 - Rota não encontrada.');
});

// =============================
// START SERVER
// =============================
app.listen(PORT, () => {
  console.log(`✅ Servidor a correr em http://localhost:${PORT}`);
});