# Migração da Base de Dados PostgreSQL (POS_BD)

Este guia cobre a migração da base de dados **POS_BD** com o utilizador **Martins** entre servidores (origem → destino), com comandos prontos a usar.

---

## 1) Preparar o servidor de destino (criar utilizador e BD)
```sql
-- No servidor DESTINO:
-- Entrar no psql como postgres:
--   sudo -u postgres psql

CREATE ROLE "Martins" LOGIN PASSWORD 'app.bdm';
CREATE DATABASE "POS_BD" OWNER "Martins";

\c POS_BD
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
\q
```

---

## 2) Exportar do servidor ORIGEM (pg_dump)
```bash
# Instalar cliente se necessário
sudo apt -y install postgresql-client

# Dump em formato custom (-Fc), comprimido
PGPASSWORD='app.bdm' pg_dump \
  -h 127.0.0.1 -U Martins -d POS_BD \
  -Fc -f /tmp/pos_bd_$(date +%F_%H%M).dump
```

---

## 3) Copiar o dump para o DESTINO (scp)
```bash
# A partir do ORIGEM (ou da tua máquina)
scp /tmp/pos_bd_*.dump USER_NO_DESTINO@IP_DESTINO:/tmp/
# Ex.: scp /tmp/pos_bd_2025-08-13_1830.dump ubuntu@stackweb.ddnsking.com:/tmp/
```

---

## 4) Restaurar no DESTINO (pg_restore)
```bash
sudo apt -y install postgresql-client

PGPASSWORD='app.bdm' pg_restore \
  -h 127.0.0.1 -U Martins -d POS_BD \
  --no-owner --role=Martins -j 4 /tmp/pos_bd_*.dump
```

### Alternativas
- Só esquema (DDL):
```bash
PGPASSWORD='app.bdm' pg_dump -h 127.0.0.1 -U Martins -d POS_BD -s -f /tmp/schema.sql
```
- Só dados (DML):
```bash
PGPASSWORD='app.bdm' pg_dump -h 127.0.0.1 -U Martins -d POS_BD -a -f /tmp/data.sql
```

---

## 5) Atualizar `.env` da app e reiniciar serviço
```bash
# /var/www/cash-app/.env (exemplo)
PORT=3000
DB_HOST=localhost
DB_USER=Martins
DB_PASSWORD=app.bdm
DB_NAME=POS_BD
JWT_SECRET=umseguroaqui
NODE_ENV=production

sudo systemctl restart cash-app
sudo systemctl status cash-app --no-pager
```

---

## 6) Verificações e alinhamento de sequências
```sql
-- sudo -u postgres psql -d POS_BD
SELECT COUNT(*) AS registos FROM registos;
SELECT COUNT(*) AS saldos FROM saldos_diarios;
SELECT COUNT(*) AS users   FROM utilizadores;

-- Ajustar sequências (exemplos; ajusta nomes conforme as tuas tabelas):
SELECT setval('registos_id_seq', (SELECT COALESCE(MAX(id),1) FROM registos));
SELECT setval('saldos_diarios_id_seq', (SELECT COALESCE(MAX(id),1) FROM saldos_diarios));
SELECT setval('utilizadores_id_seq', (SELECT COALESCE(MAX(id),1) FROM utilizadores));
```

---

## 7) Migração sem downtime (opcional)
1. Pré‑dump completo
2. Colocar app em modo manutenção
3. Dump final/delta
4. Restaurar delta ou dump final
5. Trocar `.env`, levantar app, smoke‑tests

---

## 8) One‑liner direto ORIGEM→DESTINO
```bash
# Executar no DESTINO (requer acesso ao Postgres da ORIGEM)
PGPASSWORD='app.bdm' pg_dump -h ORIGEM -U Martins -d POS_BD -Fc | \
PGPASSWORD='app.bdm' pg_restore -h 127.0.0.1 -U Martins -d POS_BD --no-owner --role=Martins -j 4
```

---

## 9) Problemas comuns
- Versões diferentes de Postgres: usa o `pg_dump` do DESTINO a falar com ORIGEM.
- Permissões: usar `--no-owner --role=Martins` na restauração.
- Extensões: criar antes de restaurar.
- Firewall/porta 5432: abrir apenas para o IP da app.
