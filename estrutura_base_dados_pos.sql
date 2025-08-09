
-- Tabela de utilizadores
CREATE TABLE IF NOT EXISTS utilizadores (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) DEFAULT 'user',
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de registos (movimentos)
CREATE TABLE IF NOT EXISTS registos (
  id SERIAL PRIMARY KEY,
  operacao VARCHAR(255) NOT NULL,
  data DATE NOT NULL,
  numDoc INTEGER,
  pagamento VARCHAR(100) NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  op_tpa VARCHAR(100),
  utilizador VARCHAR(100) NOT NULL
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
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de sequência de documentos
CREATE TABLE IF NOT EXISTS sequencias_doc (
  id SERIAL PRIMARY KEY,
  utilizador VARCHAR(100) UNIQUE NOT NULL,
  ultimo_numdoc INTEGER DEFAULT 0
);

-- Tabela de fecho de caixa (opcional se estiver em uso)
CREATE TABLE IF NOT EXISTS fecho_caixa (
  id SERIAL PRIMARY KEY,
  data DATE NOT NULL,
  hora TIME NOT NULL,
  total_dinheiro NUMERIC(10,2),
  total_multibanco NUMERIC(10,2),
  total_transferencia NUMERIC(10,2),
  total_geral NUMERIC(10,2),
  user_id INTEGER NOT NULL REFERENCES utilizadores(id)
);
