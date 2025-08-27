-- =============================
-- Estrutura inicial da base de dados POS
-- =============================

-- Utilizadores
CREATE TABLE IF NOT EXISTS utilizadores (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  senha TEXT NOT NULL,
  role TEXT DEFAULT 'user'
);

-- Registos
CREATE TABLE IF NOT EXISTS registos (
  id SERIAL PRIMARY KEY,
  operacao TEXT,
  data DATE,
  numdoc INTEGER,
  pagamento TEXT,
  valor NUMERIC,
  op_tpa TEXT,
  utilizador TEXT,
  created_at TIMESTAMP DEFAULT now() NOT NULL
);

-- Saldos Diários
CREATE TABLE IF NOT EXISTS saldos_diarios (
  id SERIAL PRIMARY KEY,
  data DATE NOT NULL,
  dinheiro NUMERIC(10,2) DEFAULT 0,
  multibanco NUMERIC(10,2) DEFAULT 0,
  transferencia NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) DEFAULT 0,
  user_id INTEGER NOT NULL REFERENCES utilizadores(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  montante_periodo NUMERIC
);

-- Fecho de Caixa
CREATE TABLE IF NOT EXISTS fecho_caixa (
  id SERIAL PRIMARY KEY,
  data DATE NOT NULL,
  hora TIME DEFAULT CURRENT_TIME NOT NULL,
  total_dinheiro NUMERIC(10,2),
  total_multibanco NUMERIC(10,2),
  total_transferencia NUMERIC(10,2),
  total_geral NUMERIC(10,2),
  user_id INTEGER NOT NULL REFERENCES utilizadores(id) ON DELETE CASCADE
);

-- Sequência de documentos
CREATE TABLE IF NOT EXISTS sequencias_doc (
  utilizador TEXT PRIMARY KEY,
  ultimo_numdoc INTEGER,
  updated_at TIMESTAMP DEFAULT now() NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_registos_user_date ON registos (utilizador, data);
CREATE INDEX IF NOT EXISTS idx_registos_user_date_created ON registos (utilizador, data, created_at);
CREATE INDEX IF NOT EXISTS idx_saldos_user_date_created ON saldos_diarios (user_id, data, created_at);

-- ⚙️ Utilizador admin pré-criado com senha "admin" (bcrypt hash)
INSERT INTO utilizadores (username, senha, role)
VALUES (
  'admin',
  '$2b$10$yz6WyyzlrRrDN0pUpqf37.1io1MTzFaylSiWzzT6h76WQxhcoOpge',
  'admin'
)
ON CONFLICT (username) DO NOTHING;
