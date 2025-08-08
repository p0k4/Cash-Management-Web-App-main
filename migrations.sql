-- =============================
-- MIGRAÇÕES DO BANCO DE DADOS
-- =============================

-- Tabela de utilizadores
CREATE TABLE IF NOT EXISTS utilizadores (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  senha TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tabela de registos
CREATE TABLE IF NOT EXISTS registos (
  id SERIAL PRIMARY KEY,
  operacao TEXT NOT NULL,
  data DATE NOT NULL,
  numDoc INTEGER NOT NULL,
  pagamento TEXT NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  op_tpa TEXT,
  utilizador TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tabela de saldos diários
CREATE TABLE IF NOT EXISTS saldos_diarios (
  id SERIAL PRIMARY KEY,
  data DATE NOT NULL,
  dinheiro NUMERIC(10,2) DEFAULT 0,
  multibanco NUMERIC(10,2) DEFAULT 0,
  transferencia NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) DEFAULT 0,
  user_id INTEGER NOT NULL REFERENCES utilizadores(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(data, user_id)
);

-- Tabela de sequências de documentos
CREATE TABLE IF NOT EXISTS sequencias_doc (
  utilizador TEXT PRIMARY KEY,
  ultimo_numdoc INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_registos_utilizador ON registos(utilizador);
CREATE INDEX IF NOT EXISTS idx_registos_data ON registos(data);
CREATE INDEX IF NOT EXISTS idx_saldos_diarios_data_user ON saldos_diarios(data, user_id);
CREATE INDEX IF NOT EXISTS idx_sequencias_doc_utilizador ON sequencias_doc(utilizador);

-- Comentários nas tabelas
COMMENT ON TABLE utilizadores IS 'Tabela de utilizadores do sistema';
COMMENT ON TABLE registos IS 'Tabela de registos financeiros';
COMMENT ON TABLE saldos_diarios IS 'Tabela de saldos diários por utilizador';
COMMENT ON TABLE sequencias_doc IS 'Tabela de sequências de documentos por utilizador';
