Avaliação do ficheiro migrations.sql e instruções de uso
======================================================

Resumo rápido
------------
O ficheiro `migrations.sql` está funcional e contém as tabelas e índices mínimos necessários para a aplicação:
- utilizadores
- registos
- saldos_diarios
- sequencias_doc
- índices úteis e comentários

Pontos a notar (observações / possíveis melhorias)
-------------------------------------------------
1. Integridade referencial
   - A tabela `saldos_diarios` referencia `utilizadores(id)` (boa prática).
   - A tabela `registos` guarda `utilizador TEXT` mas não tem uma constraint FOREIGN KEY para `utilizadores(username)`. Se desejar integridade referencial (impedir registos com utilizador inexistente), considere adicionar:
     ALTER TABLE registos ADD CONSTRAINT fk_registos_utilizador FOREIGN KEY (utilizador) REFERENCES utilizadores(username);
   - A tabela `sequencias_doc` usa `utilizador TEXT PRIMARY KEY` (permite associar por username). Isto é coerente com a app, mas cuidado se mudar usernames: será necessário actualizar dependências.

2. Tipos e precisão
   - `valor` e colunas de saldo usam NUMERIC(10,2) — adequado para valores monetários.
   - `data` é DATE; para registos com hora precisa usa-se `created_at TIMESTAMP` (já existe).

3. Conflitos/uniqueness
   - `UNIQUE(data, user_id)` em `saldos_diarios` bloqueia múltiplos fechos no mesmo dia por utilizador (substitui via ON CONFLICT no código) — isto coincide com a lógica do server.

Como aplicar as migrations (exemplos)
-------------------------------------
1) Se o Postgres já tiver um utilizador com permissões e a BD criada:
- Exemplo (local):
  PGPASSWORD='SUA_SENHA' psql -U <DB_USER> -d <DB_NAME> -h <DB_HOST> -f migrations.sql

  Substitua `<DB_USER>`, `<DB_NAME>`, `<DB_HOST>` e `SUA_SENHA`.

2) Criar utilizador e base (executar como superuser `postgres`):
- Criar role e DB:
  psql -U postgres -c "CREATE ROLE martins WITH LOGIN PASSWORD 'SUA_SENHA';"
  psql -U postgres -c "CREATE DATABASE caixa_db OWNER martins;"

- Depois aplicar migrations como o utilizador criado:
  PGPASSWORD='SUA_SENHA' psql -U martins -d caixa_db -h localhost -f migrations.sql

3) Verificar que as tabelas foram criadas:
  PGPASSWORD='SUA_SENHA' psql -U martins -d caixa_db -h localhost -c "\dt"
  PGPASSWORD='SUA_SENHA' psql -U martins -d caixa_db -h localhost -c "\d registos"

4) Criar o utilizador admin inicial (recomendado via hash bcrypt)
- Gerar hash bcrypt (no seu ambiente onde o node e bcrypt estão instalados):
  HASH=$(node -e "console.log(require('bcrypt').hashSync('SENHA_ADMIN',10))")
- Inserir admin na BD:
  PGPASSWORD='SUA_SENHA' psql -U martins -d caixa_db -h localhost -c "INSERT INTO utilizadores (username, senha) VALUES ('admin', '$HASH');"

Notas sobre o comando acima:
- Substitua `SENHA_ADMIN` pela password desejada do admin.
- O comando `node -e "..."` precisa de node e do módulo bcrypt instalados no ambiente onde executar.
- Se preferir, crie o utilizador admin através da API da aplicação (endpoint de registo público) configurando `ENABLE_PUBLIC_REGISTRATION=true` e `ADMIN_PASSWORD` no .env, ou através de um pequeno script Node que use pool/pg para inserir o hash.

Uso dentro de Docker / Docker Compose
------------------------------------
- Se o Postgres corre num container `db`, aplique as migrations a partir do host com `psql` apontando para o container, ou:
  cat migrations.sql | docker exec -i <db-container-name> psql -U <DB_USER> -d <DB_NAME>
- Alternativamente, copie `migrations.sql` para o container e execute `psql -f`.

Boas práticas de deploy
-----------------------
- Não exponha passwords em linhas de comando em ambientes partilhados. Use:
  - ficheiro `.pgpass`
  - variáveis de ambiente do serviço (systemd unit, container env)
  - gestor de segredos
- Faça backup antes de aplicar migrations em produção.
- Teste em ambiente de staging primeiro.

Sugestões de melhoria (opcionais)
---------------------------------
- Adicionar foreign key em `registos(utilizador)` para `utilizadores(username)` se quiser garantir integridade referencial.
- Adicionar timestamps com timezone (TIMESTAMP WITH TIME ZONE) se a app tiver utilizadores em fusos diferentes ou se precisar comparar com logs externos.
- Criar um pequeno script de "seed" que:
  - aplica migrations,
  - insere utilizador admin (hash com bcrypt),
  - cria contas/testes opcionais.
  Posso gerar esse script se desejar.

Conclusão
---------
O ficheiro `migrations.sql` está pronto para uso como migração inicial. Siga os comandos acima para aplicar no seu ambiente. Se quiser, eu:
- gero automaticamente um script de seed (com criação de admin),
- ou gero o comando psql exactamente adaptado aos valores que quer usar (indique DB_USER, DB_NAME, DB_HOST e se prefere criar o utilizador `martins` ou usar outro).
