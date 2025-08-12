Lista final e comandos necessários para deploy (resumo pronto para executar):

Dependências (runtime) — já no package.json:
- express
- body-parser
- cors
- dotenv
- jsonwebtoken
- bcrypt
- pg

DevDependency:
- nodemon

Comandos recomendados
- Instalar dependências em produção (usa package-lock.json):
  npm ci --production
- Instalar dependências incluindo dev:
  npm ci
- Alternativa genérica:
  npm install
- (Opcional, recomendado em produção) instalar gestor de processos global:
  npm install -g pm2

Variáveis de ambiente obrigatórias / recomendadas (criar .env na raiz):
PORT=3000
JWT_SECRET=uma_chave_secreta_muito_forte
DB_USER=meu_user
DB_PASSWORD=senha
DB_NAME=nome_bd
DB_HOST=localhost
DB_PORT=5432
ENABLE_PUBLIC_REGISTRATION=false
ADMIN_PASSWORD=senha_admin_opcional

Aplicar migrations PostgreSQL (exemplo):
psql -U <DB_USER> -d <DB_NAME> -h <DB_HOST> -f migrations.sql

Iniciar a app
- Em produção (sem nodemon):
  npm start
- Em desenvolvimento:
  npm run dev
- Exemplo com pm2:
  pm2 start npm --name cash-app -- start

Notas importantes
- O servidor requer a variável JWT_SECRET (o processo encerra se não existir).
- PostgreSQL deve estar acessível com as variáveis DB_* configuradas.
- O ficheiro migrations.sql contém o esquema; aplique-o antes de usar a app.
- bcrypt pode exigir ferramentas de compilação no macOS (Xcode Command Line Tools). Se houver erro ao instalar bcrypt, instale essas ferramentas ou use uma imagem Docker com as ferramentas de build.
- Em deploy automático/CI: prefira npm ci --production e usar um process manager (pm2, systemd ou Docker/Kubernetes).

Passos típicos de deploy (rápido)
1. git clone <repo>
2. cd Cash-Management-Web-App-main
3. Criar .env com as variáveis acima
4. npm ci --production
5. Aplicar migrations: psql -U <DB_USER> -d <DB_NAME> -h <DB_HOST> -f migrations.sql
6. Iniciar: pm2 start npm --name cash-app -- start  (ou npm start)

Este resumo contém todos os pacotes necessários, comandos de instalação e variáveis de ambiente requeridas para fazer o deploy da aplicação.