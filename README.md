
# Cash Management Web App

Sistema de gestão de caixa simples e interativo construído com HTML, CSS, JavaScript e Node.js. 
Desenhado para gerir transações financeiras (entradas e saídas) para pequenos serviços, 
como uma **caixa de piscina pública**.

## 🚀 Funcionalidades

- ✅ Gestão de utilizadores com autenticação JWT
- ✅ Registos financeiros (entradas/saídas)
- ✅ Saldos diários automáticos
- ✅ Sequência de documentos por utilizador
- ✅ Interface web responsiva
- ✅ Relatórios por período
- ✅ Sistema de permissões (admin/utilizador)

## 📋 Pré-requisitos

- Node.js (versão 16 ou superior)
- PostgreSQL (versão 12 ou superior)
- npm ou yarn

## 🛠️ Instalação

1. **Clone o repositório**
   ```bash
   git clone <url-do-repositorio>
   cd Cash-Management-Web-App-main
   ```

2. **Instale as dependências**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente**
   ```bash
   cp .env.example .env
   ```
   
   Edite o arquivo `.env` com as suas configurações:
   ```env
   # Configurações do Banco de Dados
   DB_USER=seu_usuario
   DB_PASSWORD=sua_senha
   DB_NAME=nome_do_banco
   DB_HOST=localhost
   DB_PORT=5432

   # Configurações de Segurança
   JWT_SECRET=seu_jwt_secret_muito_seguro_aqui
   ADMIN_PASSWORD="sua_senha_admin_secreta"

   # Configurações do Servidor
   PORT=3000
   ```

4. **Configure o banco de dados**
   ```bash
   # Execute as migrações
   psql -U seu_usuario -d nome_do_banco -f migrations.sql
   ```

5. **Inicie o servidor**
   ```bash
   # Desenvolvimento
   npm run dev
   
   # Produção
   npm start
   ```

## 🔐 Segurança

### Melhorias Implementadas

- ✅ **Senhas hasheadas** com bcrypt
- ✅ **JWT tokens** seguros
- ✅ **Validação de entrada** em todas as rotas
- ✅ **Middleware de autenticação** robusto
- ✅ **Tratamento de erros** consistente
- ✅ **Logs de auditoria** básicos

### Configurações Recomendadas

1. **JWT_SECRET**: Use uma string aleatória de pelo menos 32 caracteres
2. **ADMIN_PASSWORD**: Configure uma senha forte para administração (use aspas se contiver caracteres especiais)
3. **HTTPS**: Use HTTPS em produção
4. **Rate Limiting**: Considere implementar rate limiting
5. **CORS**: Configure CORS adequadamente para produção

## 📊 Estrutura do Banco de Dados

### Tabelas Principais

- **utilizadores**: Gestão de utilizadores do sistema
- **registos**: Registos financeiros (entradas/saídas)
- **saldos_diarios**: Saldos diários por utilizador
- **sequencias_doc**: Sequências de documentos por utilizador

### Índices

- Índices otimizados para consultas frequentes
- Constraints de integridade referencial
- Validações de dados

## 🎯 API Endpoints

### Autenticação (Público)
- `POST /api/login` - Login de utilizador
- `POST /api/registar-utilizador` - Registar novo utilizador
- `GET /api/utilizadores` - Listar utilizadores

### Gestão de Utilizadores (Admin)
- `GET /api/todos-utilizadores` - Listar todos os utilizadores
- `POST /api/novo-utilizador` - Criar novo utilizador
- `DELETE /api/utilizadores/:username` - Apagar utilizador
- `PUT /api/utilizadores/:username` - Editar utilizador

### Gestão de Registos
- `GET /api/registos` - Listar registos
- `GET /api/registos/intervalo` - Registos por período
- `POST /api/registar` - Criar novo registo
- `PUT /api/registos/:id` - Editar registo
- `DELETE /api/registos/:id` - Apagar registo

### Gestão de Saldos
- `GET /api/saldos-hoje` - Saldos do dia atual
- `POST /api/fechar-saldos` - Fechar saldos do dia

### Sequências
- `GET /api/next-numdoc` - Próximo número de documento
- `POST /api/save-numdoc` - Guardar número de documento

## 🐛 Troubleshooting

### Problemas Comuns

1. **Erro de conexão com banco**
   - Verifique as credenciais no `.env`
   - Certifique-se que o PostgreSQL está a correr

2. **JWT_SECRET não configurado**
   - Configure a variável JWT_SECRET no `.env`

3. **Tabelas não criadas**
   - Execute o script `migrations.sql`

4. **Erro de permissões**
   - Verifique se o utilizador tem permissões no banco

## 📝 Logs

O sistema inclui logs detalhados para:
- Requisições HTTP
- Erros de autenticação
- Operações de banco de dados
- Fechamento de saldos

## 🔄 Atualizações

Para atualizar o sistema:

1. Faça backup do banco de dados
2. Atualize o código
3. Execute as novas migrações
4. Reinicie o servidor

## 📄 Licença

ISC License

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para a feature
3. Commit as alterações
4. Push para a branch
5. Abra um Pull Request



