// =============================
// server.js - POS Cash App
// =============================

require('dotenv').config();
const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'segredo_muito_secreto';

// =============================
// MIDDLEWARES GLOBAIS
// =============================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =============================
// MIDDLEWARE JWT (protegido)
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
// ROTA RAIZ → Envia o login.html
// =============================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// =============================
// ROTAS ESTÁTICAS PÚBLICAS
// =============================
// Para /assets (CSS, JS)
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));

// Para /login.html
app.use('/login.html', express.static(path.join(__dirname, 'public', 'login.html')));

// =============================
// ROTAS PROTEGIDAS
// =============================
// Tudo em /private exige token
app.use('/private', verificarToken, express.static(path.join(__dirname, 'private')));

// =============================
// ROTAS DA API (Protegidas)
// =============================
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  // Exemplo simplificado: "admin" / "admin"
  if (username === 'admin' && password === 'admin') {
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
    return res.json({ token });
  }

  return res.status(401).json({ error: 'Credenciais inválidas' });
});

// ✅ Listar registos (mock)
app.get('/api/registos', verificarToken, (req, res) => {
  const dados = [
    { operacao: 'Operação 1', data: '2025-07-02', numDoc: 1001, pagamento: 'Dinheiro', valor: 10.00 },
    { operacao: 'Operação 2', data: '2025-07-02', numDoc: 1002, pagamento: 'Multibanco', valor: 20.00 }
  ];
  res.json(dados);
});

// ✅ Registar dados (mock)
app.post('/api/registar', verificarToken, (req, res) => {
  console.log('✅ Novo registo:', req.body);
  res.json({ success: true });
});

// ✅ Apagar todos os registos (mock)
app.delete('/api/registos', verificarToken, (req, res) => {
  console.log('⚠️ Apagar todos os registos!');
  res.json({ success: true });
});

// =============================
// CATCH-ALL → 404
// =============================
app.use((req, res) => {
  res.status(404).send('404 - Rota não encontrada.');
});

// =============================
// INICIAR SERVIDOR
// =============================
app.listen(PORT, () => {
  console.log(`✅ Servidor a correr em http://localhost:${PORT}`);
});