#!/usr/bin/env bash
set -euo pipefail

# ==========================
# Configuração (edita aqui)
# ==========================
ORIG_HOST="127.0.0.1"        # Host do Postgres de ORIGEM
ORIG_PORT="5432"
ORIG_DB="POS_BD"
ORIG_USER="Martins"
ORIG_PASS="app.bdm"

DEST_HOST="127.0.0.1"        # Host do Postgres de DESTINO
DEST_PORT="5432"
DEST_DB="POS_BD"
DEST_USER="Martins"
DEST_PASS="app.bdm"

DUMP_PATH="/tmp/pos_bd_$(date +%F_%H%M).dump"
PARALLEL_JOBS="4"

# ==========================
# Funções
# ==========================
dump_origin() {
  echo "==> Dump da origem para ${DUMP_PATH} (formato custom -Fc)"
  PGPASSWORD="${ORIG_PASS}" pg_dump \
    -h "${ORIG_HOST}" -p "${ORIG_PORT}" \
    -U "${ORIG_USER}" -d "${ORIG_DB}" \
    -Fc -f "${DUMP_PATH}"
  echo "OK: dump criado em ${DUMP_PATH}"
}

restore_dest() {
  echo "==> Restauração no destino a partir de ${DUMP_PATH}"
  PGPASSWORD="${DEST_PASS}" pg_restore \
    -h "${DEST_HOST}" -p "${DEST_PORT}" \
    -U "${DEST_USER}" -d "${DEST_DB}" \
    --no-owner --role="${DEST_USER}" -j "${PARALLEL_JOBS}" "${DUMP_PATH}"
  echo "OK: restauração concluída"
}

align_sequences_sql() {
cat <<'SQL'
-- Ajusta nomes conforme as tuas tabelas/seqs:
SELECT setval('registos_id_seq', (SELECT COALESCE(MAX(id),1) FROM registos));
SELECT setval('saldos_diarios_id_seq', (SELECT COALESCE(MAX(id),1) FROM saldos_diarios));
SELECT setval('utilizadores_id_seq', (SELECT COALESCE(MAX(id),1) FROM utilizadores));
SQL
}

print_env_example() {
cat <<'ENV'
# Exemplo de .env para a app
PORT=3000
DB_HOST=localhost
DB_USER=Martins
DB_PASSWORD=app.bdm
DB_NAME=POS_BD
JWT_SECRET=umseguroaqui
NODE_ENV=production
ENV
}

usage() {
  cat <<EOF
Uso: $0 [comando]

Comandos:
  dump       - criar dump da ORIGEM (${ORIG_HOST}/${ORIG_DB})
  restore    - restaurar dump no DESTINO (${DEST_HOST}/${DEST_DB})
  both       - dump + restore (no mesmo passo)
  env        - imprimir exemplo de .env
  seq        - imprimir SQL para alinhar sequências
EOF
}

# ==========================
# Main
# ==========================
cmd="${1:-}"
case "${cmd}" in
  dump)
    dump_origin
    ;;
  restore)
    if [[ ! -f "${DUMP_PATH}" ]]; then
      echo "ERRO: Dump não encontrado em ${DUMP_PATH}. Corre 'dump' primeiro ou ajusta DUMP_PATH."
      exit 1
    fi
    restore_dest
    ;;
  both)
    dump_origin
    restore_dest
    ;;
  env)
    print_env_example
    ;;
  seq)
    align_sequences_sql
    ;;
  *)
    usage
    exit 1
    ;;
esac
