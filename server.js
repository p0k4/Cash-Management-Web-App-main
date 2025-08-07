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

// Tabela de saldos diários
pool.query(`
  CREATE TABLE IF NOT EXISTS saldos_diarios (
    id SERIAL PRIMARY KEY,
    data DATE,
    dinheiro NUMERIC,
    multibanco NUMERIC,
    transferencia NUMERIC,
    total NUMERIC,
    user_id INTEGER REFERENCES utilizadores(id)
  )
`, (err) => {
  if (err) {
    console.error('Erro ao criar tabela saldos_diarios:', err);
  } else {
    console.log('✅ Tabela "saldos_diarios" pronta!');
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

app.use(express.static(path.join(__dirname, 'public')));

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


// Listar todos os utilizadores
app.get('/api/todos-utilizadores', async (req, res) => {
  if (req.user.username !== 'admin') {
    return res.status(403).json({ error: 'Apenas o admin pode ver todos os utilizadores.' });
  }

  try {
    const resultado = await pool.query('SELECT username FROM utilizadores ORDER BY username ASC');
    res.json(resultado.rows);
  } catch (err) {
    console.error("Erro ao buscar utilizadores:", err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// Criar novo utilizador
app.post('/api/novo-utilizador', async (req, res) => {
  const { username, senha } = req.body;

  if (req.user.username !== 'admin') {
    return res.status(403).json({ error: 'Apenas o admin pode criar utilizadores.' });
  }

  if (!username || !senha) {
    return res.status(400).json({ error: 'Campos obrigatórios em falta.' });
  }

  try {
    const existe = await pool.query('SELECT * FROM utilizadores WHERE username = $1', [username]);
    if (existe.rows.length > 0) {
      return res.status(409).json({ error: 'Utilizador já existe.' });
    }

    await pool.query('INSERT INTO utilizadores (username, senha) VALUES ($1, $2)', [username, senha]);
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao criar utilizador:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// Apagar utilizador
app.delete('/api/utilizadores/:username', async (req, res) => {
  const { username } = req.params;

  if (req.user.username !== 'admin') {
    return res.status(403).json({ error: 'Apenas o admin pode apagar utilizadores.' });
  }

  if (username === 'admin') {
    return res.status(403).json({ error: 'Não é possível apagar o utilizador admin.' });
  }

  try {
    await pool.query('DELETE FROM utilizadores WHERE username = $1', [username]);
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao apagar utilizador:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// Editar utilizador (exemplo: alterar senha no futuro)
app.put('/api/utilizadores/:username', async (req, res) => {
  const { username } = req.params;
  const { novaSenha } = req.body;

  if (req.user.username !== 'admin') {
    return res.status(403).json({ error: 'Apenas o admin pode editar utilizadores.' });
  }

  try {
    await pool.query('UPDATE utilizadores SET senha = $1 WHERE username = $2', [novaSenha, username]);
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao editar utilizador:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

app.get('/api/utilizador', (req, res) => {
  res.json({ username: req.user.username });
});
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
// ✅ Ver saldos do dia (usado no dashboard)
app.get('/api/saldos-hoje', verificarToken, async (req, res) => {
  const username = req.user.username;

  // Data no formato YYYY-MM-DD
  const hoje = new Date();
  const dataHoje = hoje.getFullYear() + '-' +
                   String(hoje.getMonth() + 1).padStart(2, '0') + '-' +
                   String(hoje.getDate()).padStart(2, '0');

  try {
    const resultado = await pool.query(
      'SELECT id FROM utilizadores WHERE username = $1',
      [username]
    );
    const userId = resultado.rows[0].id;

    // Verifica se já existe fecho de caixa para hoje
    const fecho = await pool.query(
      'SELECT * FROM saldos_diarios WHERE data = $1 AND user_id = $2',
      [dataHoje, userId]
    );

    if (fecho.rows.length > 0) {
      return res.json({
        fechado: true,
        dinheiro: parseFloat(fecho.rows[0].dinheiro),
        multibanco: parseFloat(fecho.rows[0].multibanco),
        transferencia: parseFloat(fecho.rows[0].transferencia),
        total: parseFloat(fecho.rows[0].total)
      });
    }

    // Ainda não foi fechado — calcula com base nos registos do dia
    const { rows } = await pool.query(`
      SELECT pagamento, SUM(valor) as total
      FROM registos
      WHERE data::date = $1 AND utilizador = $2
      GROUP BY pagamento
    `, [dataHoje, username]);

    let dinheiro = 0, multibanco = 0, transferencia = 0;
    rows.forEach(r => {
      const total = parseFloat(r.total);
      if (r.pagamento.toLowerCase().includes('dinheiro')) dinheiro += total;
      if (r.pagamento.toLowerCase().includes('multibanco')) multibanco += total;
      if (r.pagamento.toLowerCase().includes('transferência')) transferencia += total;
    });

    const total = dinheiro + multibanco + transferencia;

    res.json({
      fechado: false,
      dinheiro,
      multibanco,
      transferencia,
      total
    });

  } catch (err) {
    console.error('Erro ao obter saldos do dia:', err);
    res.status(500).json({ erro: 'Erro no servidor' });
  }
});


// ✅ Fechar saldos do dia (guardar em saldos_diarios)
app.post('/api/fechar-saldos', verificarToken, async (req, res) => {
  const username = req.user.username;
  const hoje = new Date();
  const dataHoje = hoje.getFullYear() + '-' +
                   String(hoje.getMonth() + 1).padStart(2, '0') + '-' +
                   String(hoje.getDate()).padStart(2, '0');

  try {
    const resultado = await pool.query(
      'SELECT id FROM utilizadores WHERE username = $1',
      [username]
    );
    const userId = resultado.rows[0].id;

    const existe = await pool.query(
      'SELECT * FROM saldos_diarios WHERE data = $1 AND user_id = $2',
      [dataHoje, userId]
    );

    // // Comentável para testes
    // if (existe.rows.length > 0) {
    //   return res.status(400).json({ erro: 'Já existe um fecho de caixa para hoje.' });
    // }

    const { rows } = await pool.query(`
      SELECT pagamento, SUM(valor) as total
      FROM registos
      WHERE data = $1 AND utilizador = $2
      GROUP BY pagamento
    `, [dataHoje, username]);

    let dinheiro = 0, multibanco = 0, transferencia = 0;
    rows.forEach(r => {
      const total = parseFloat(r.total);
      if (r.pagamento.toLowerCase().includes('dinheiro')) dinheiro += total;
      if (r.pagamento.toLowerCase().includes('multibanco')) multibanco += total;
      if (r.pagamento.toLowerCase().includes('transferência')) transferencia += total;
    });

    const total = dinheiro + multibanco + transferencia;

    await pool.query(`
      INSERT INTO saldos_diarios (data, dinheiro, multibanco, transferencia, total, user_id)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [dataHoje, dinheiro, multibanco, transferencia, total, userId]);

    res.json({ mensagem: 'Saldos fechados com sucesso!' });
  } catch (err) {
    console.error("Erro ao fechar saldos:", err);
    res.status(500).json({ erro: 'Erro ao fechar saldos.' });
  }
});
// ------------------//

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