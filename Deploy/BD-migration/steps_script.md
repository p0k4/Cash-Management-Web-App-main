# (opcional) editar variáveis no topo do script
nano migrar_pos_bd.sh

# tornar executável (se necessário)
chmod +x migrar_pos_bd.sh

# criar dump da origem
./migrar_pos_bd.sh dump

# restaurar no destino (usa o DUMP_PATH criado)
./migrar_pos_bd.sh restore

# ou fazer tudo de uma vez
./migrar_pos_bd.sh both

# ver exemplo do .env
./migrar_pos_bd.sh env

# ver SQL para alinhar sequências
./migrar_pos_bd.sh seq
