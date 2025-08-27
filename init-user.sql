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
  '$2b$10$8urCAbmC7py4LifxGWDevOM6wR2o9GFw/5abw21lTfkaayLI9eeu2', -- hash da palavra "admin"
  TRUE
)
ON CONFLICT (username) DO NOTHING;
