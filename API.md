# Cash Management API

API Node.js + Express + PostgreSQL para registar operações de caixa, gerir utilizadores e gerar saldos diários.  
Autenticação via **JWT**. Frontend servido a partir de `/public` e `/private`.

## 🚀 Stack

- Node.js, Express
- PostgreSQL (`pg`)
- JWT (`jsonwebtoken`)
- `bcrypt` (hash de senhas)
- `dotenv`

## 🔐 Autenticação

- Header obrigatório em rotas protegidas:
```
Authorization: Bearer <JWT>
```
- O token é devolvido pelo endpoint `/api/login` e expira em **30 minutos**.

## ⚙️ Variáveis de Ambiente (.env)

Exemplo:
```
PORT=3000
JWT_SECRET=uma_chave_bem_secreta_gera_isso
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cashdb
DB_USER=cashuser
DB_PASSWORD=supersegredo

# Opcional: permitir registo público (protegido por senha de admin)
ENABLE_PUBLIC_REGISTRATION=false
ADMIN_PASSWORD=define_isto_se_usares_registo_publico
```

## 🗄️ Esquema de Base de Dados (mínimo)

Cria as tabelas (ajusta nomes/constraints conforme precisares):

```sql
CREATE TABLE utilizadores (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  senha TEXT NOT NULL
);

CREATE TABLE registos (
  id SERIAL PRIMARY KEY,
  operacao TEXT NOT NULL,
  data DATE NOT NULL,
  numdoc INTEGER NOT NULL,
  pagamento TEXT NOT NULL,          -- "Dinheiro" | "Multibanco" | "Transferência Bancária"
  valor NUMERIC(12,2) NOT NULL,
  op_tpa TEXT,                      -- opcional, para Multibanco
  utilizador TEXT NOT NULL,         -- username que criou
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE sequencias_doc (
  utilizador TEXT PRIMARY KEY,      -- username
  ultimo_numdoc INTEGER NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- saldos por dia/utente (um por data+user)
CREATE TABLE saldos_diarios (
  id SERIAL PRIMARY KEY,
  data DATE NOT NULL,
  dinheiro NUMERIC(12,2) DEFAULT 0,
  multibanco NUMERIC(12,2) DEFAULT 0,
  transferencia NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0,
  user_id INTEGER NOT NULL REFERENCES utilizadores(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (data, user_id)
);
```

## ▶️ Setup & Run

```bash
npm install
cp .env.example .env   # (ou cria o teu .env)
# cria as tabelas no Postgres como acima
node server.js
# ou
npm run start
```

- App arranca em: `http://localhost:<PORT>` (por omissão, 3000)
- Frontend público: `/login.html`
- Páginas privadas: `/dashboard`, `/dashboard/tabela`, `/dashboard/historico`

## 📄 Endpoints

### Público

**POST /api/login**  
Body:
```json
{ "username": "admin", "password": "senha" }
```
Resposta (200):
```json
{ "token": "..." }
```

**GET /api/utilizadores**  
Lista usernames (para dropdown do login).  
Resposta (200):
```json
["admin","antonio", "..."]
```

**POST /api/registar-utilizador** *(opcional; controlado por `ENABLE_PUBLIC_REGISTRATION`)*  
Body:
```json
{ "username": "novo", "senha": "123", "adminPassword": "..." }
```

### Protegidos (JWT)

> Header: `Authorization: Bearer <token>`

#### Utilizadores (admin)

**GET /api/todos-utilizadores**  
Lista todos os utilizadores (apenas admin).  
Resposta:
```json
[ { "username": "admin" }, { "username": "antonio" } ]
```

**POST /api/novo-utilizador**  
Body:
```json
{ "username": "joao", "senha": "123" }
```

**PUT /api/utilizadores/:username**  
Body:
```json
{ "novaSenha": "nova123" }
```

**DELETE /api/utilizadores/:username**  
– Não permite apagar `admin`.

**GET /api/utilizador**  
Devolve `{ username: "..." }` do token.

#### Registos

**GET /api/registos**  
- Admin: todos
- Outros: apenas os seus

**GET /api/registos/intervalo?inicio=YYYY-MM-DD&fim=YYYY-MM-DD**  
- Admin: todos no intervalo  
- Outros: apenas os seus  
Resposta:
```json
[
  { "data":"2025-08-09","numdoc":1,"pagamento":"Multibanco","valor":"10.00","op_tpa":"123" }
]
```

**POST /api/registar**  
Body:
```json
{
  "operacao": "Operação 1",
  "data": "2025-08-09",
  "numDoc": 1,
  "pagamento": "Multibanco",
  "valor": 10.5,
  "op_tpa": "123"
}
```

**PUT /api/registos/:id**  
Body igual ao POST `/api/registar`.

**DELETE /api/registos/:id**  
Apaga por ID.

#### Sequência Nº Documento

**GET /api/next-numdoc**  
Resposta:
```json
{ "nextNumDoc": 42 }
```

**POST /api/save-numdoc**  
Body:
```json
{ "ultimo_numdoc": 41 }
```

#### Saldos

**GET /api/saldos-hoje**  
- Se **não houve fecho hoje**: soma do dia.
- Se **houve fecho** e **não há novos registos**: devolve valores de fecho.
- Se **houve fecho** e **há novos registos**: devolve soma **após** fecho.  
Resposta:
```json
{
  "fechado": false,
  "dinheiro": 10,
  "multibanco": 20,
  "transferencia": 30,
  "total": 60
}
```

**POST /api/fechar-saldos**  
Calcula totais do dia e faz upsert em `saldos_diarios`.  
Resposta:
```json
{ "mensagem": "Saldos fechados com sucesso!", "fecho": { ... } }
```

## 🧪 Exemplos cURL

Login:
```bash
curl -s http://localhost:3000/api/login   -H "Content-Type: application/json"   -d '{"username":"admin","password":"senha"}'
```

Listar registos (com token):
```bash
TOKEN="..."
curl -s http://localhost:3000/api/registos   -H "Authorization: Bearer $TOKEN"
```

Criar registo:
```bash
curl -s http://localhost:3000/api/registar   -H "Authorization: Bearer $TOKEN"   -H "Content-Type: application/json"   -d '{"operacao":"Operação 1","data":"2025-08-09","numDoc":1,"pagamento":"Dinheiro","valor":12.34}'
```

Fechar saldos:
```bash
curl -s -X POST http://localhost:3000/api/fechar-saldos   -H "Authorization: Bearer $TOKEN"
```

## 🔒 Notas de Segurança

- Mantém `JWT_SECRET` fora do repositório (só em `.env`).
- Usa **hash de senhas** (`bcrypt`) — nunca guardes a senha em texto simples.
- Limita a origem (CORS) se expuseres a API publicamente.
- Considera **HTTPS** em produção.
- Ajusta `expiresIn` do JWT conforme o risco/uso (default: 30m).

## 🛠️ Troubleshooting

- **401 Token inválido/expirado** → volta a fazer login.
- **403 Apenas admin** → verifica se o `username` do token é `admin`.
- **500 Erro no servidor** → vê logs do Node e a ligação ao Postgres.
- **Pool error** → confere credenciais `DB_*` no `.env`.
