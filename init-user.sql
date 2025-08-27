CREATE TABLE IF NOT EXISTS utilizadores (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  senha TEXT NOT NULL,
  admin BOOLEAN DEFAULT FALSE
);

-- Cria o utilizador "admin" com a password "admin" (hash correta)
INSERT INTO utilizadores (username, senha, admin)
VALUES (
  'admin',
  '$2b$10$uX8kMa/NX5WfGmBaErXddOVkQKUob7Dx7GhDCzAr1ksvhQvmj2Ely', -- hash da palavra "admin"
  TRUE
)
ON CONFLICT (username) DO NOTHING;
