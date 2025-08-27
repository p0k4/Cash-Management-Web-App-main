CREATE TABLE IF NOT EXISTS utilizadores (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  senha TEXT NOT NULL,
  admin BOOLEAN DEFAULT FALSE
);

-- ⚠️ Cria o utilizador "admin" com password "admin" encriptada com bcrypt
INSERT INTO utilizadores (username, senha, admin)
VALUES (
  'admin',
  '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZ2duB3XtKQMn1UeN8jDWZg.S2a9xS', -- ← hash da senha "admin"
  TRUE
)
ON CONFLICT (username) DO NOTHING;
