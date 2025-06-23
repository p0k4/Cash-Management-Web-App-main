# 💰 Aplicação de Gestão de Caixa

Este projeto é uma aplicação web para registo e gestão de movimentos de caixa, com suporte a diferentes métodos de pagamento (incluindo OP TPA), exportação de dados e integração com base de dados PostgreSQL.

---

## 📦 Tecnologias Utilizadas

- **Frontend**: HTML, CSS, JavaScript (puro)
- **Backend**: Node.js + Express
- **Base de Dados**: PostgreSQL
- **Exportação**: jsPDF, jsPDF AutoTable, CSV manual

---

## 📁 Estrutura do Projeto

```
/public
│  index.html          # Página principal com formulário de registo
│  tabela.html         # Página com a tabela de registos
│  style.css           # Estilo da aplicação
│  script.js           # Lógica frontend (registo, exportação, carregamento)
│
server.js              # Servidor Express (API e ligação à BD)
```

---

## 🧪 Funcionalidades

### 📝 Registo de Operações

- Inserção de:
  - Operação automática (ex: `Operação 1`)
  - Data (pré-preenchida com hoje)
  - Nº Documento (único e sequencial)
  - Método de Pagamento:
    - Dinheiro
    - Multibanco + campo extra OP TPA
    - Transferência Bancária
  - Valor (€)

---

### 💾 Integração com PostgreSQL

- Os dados são guardados diretamente na BD via API:
  - **Rota POST**: `/api/registar`
  - **Rota GET**: `/api/registos` (para tabela)
- A tabela na BD:
```sql
CREATE TABLE IF NOT EXISTS registos (
  id SERIAL PRIMARY KEY,
  operacao TEXT,
  data DATE,
  numDoc INTEGER,
  pagamento TEXT,
  op_tpa TEXT,
  valor NUMERIC
);
```

---

### 📊 Visualização (tabela.html)

- Mostra todos os registos do backend
- Formata a data para `DD/MM/AAAA`
- Exibe `OP TPA` se existir
- Mostra o total geral e por método de pagamento
- Permite editar (apenas visualmente) ou apagar registos (localmente)

---

### 📤 Exportações

- **PDF**: com cabeçalho, data, e totais, gerado com `jsPDF` + `AutoTable`
- **CSV**: compatível com Excel, com total incluído

---

## 🚀 Como Executar Localmente

### 1. Clona o projeto
```bash
git clone https://github.com/teu-utilizador/gestao-caixa.git
cd gestao-caixa
```

### 2. Instala as dependências
```bash
npm install express pg cors body-parser
```

### 3. Configura a base de dados PostgreSQL
Cria uma BD chamada `POS_BD` e usa o seguinte utilizador:

```
user:     Martins
password: app.bdm
host:     localhost
port:     5432
```

> ⚠️ **Certifica-te que o PostgreSQL está a correr!**

### 4. Inicia o servidor
```bash
node server.js
```

### 5. Abre no browser
Abre `index.html` para inserir registos, ou `tabela.html` para consultar os dados.

---

## 📌 Notas Finais

- O `localStorage` foi **desativado** — todos os dados vêm da base de dados.
- Os dados inseridos no `formulário` são imediatamente visíveis na `tabela`.
- As operações são numeradas automaticamente (`Operação 1`, `Operação 2`, ...).

---

## 📬 Futuras Melhorias

- Apagar ou editar registos diretamente na base de dados
- Autenticação de utilizador
- Filtros por data e exportações parciais
- Hospedagem online (Vercel + Railway ou Render)

---

## 👨‍💻 Desenvolvido por

Martins — Projeto de uso interno e académico de gestão de caixa