# Deploy Node/Express atrás do Nginx com HTTPS (Certbot)
Domínio: **stackweb.ddnsking.com**  
App Node: **/var/www/cash-app**, a correr em **localhost:3000**  
Sistema: **Ubuntu/Debian**

---

## 0) TL;DR (comandos rápidos)
```bash
# 0.1) Sistema e Nginx
sudo apt update && sudo apt -y upgrade
sudo apt -y install nginx
sudo ufw allow 'OpenSSH' && sudo ufw allow 'Nginx Full' && sudo ufw --force enable

# 0.2) Código e dependências (ajusta o repositório)
sudo mkdir -p /var/www/cash-app && sudo chown -R $USER:$USER /var/www/cash-app
cd /var/www/cash-app
# git clone <o_teu_repo.git> .
npm install

# 0.3) Serviço systemd (inicia no boot)
sudo tee /etc/systemd/system/cash-app.service > /dev/null << 'EOF'
[Unit]
Description=Cash App Node Server
After=network.target

[Service]
WorkingDirectory=/var/www/cash-app
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
# Se usas .env, garante que existe em /var/www/cash-app e que o código carrega dotenv

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable cash-app
sudo systemctl start cash-app
sudo systemctl status cash-app --no-pager

# 0.4) Nginx reverse proxy + redirects
sudo tee /etc/nginx/sites-available/cash-app.conf > /dev/null << 'EOF'
# HTTP -> HTTPS e www -> root
server {
    listen 80;
    listen [::]:80;
    server_name stackweb.ddnsking.com www.stackweb.ddnsking.com;
    return 301 https://stackweb.ddnsking.com$request_uri;
}

# HTTPS (Certbot irá gerir certificados em /etc/letsencrypt/live/stackweb.ddnsking.com/)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name stackweb.ddnsking.com;

    # Certificados (serão criados pelo Certbot)
    ssl_certificate     /etc/letsencrypt/live/stackweb.ddnsking.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/stackweb.ddnsking.com/privkey.pem;

    # TLS sensato
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_stapling on;
    ssl_stapling_verify on;

    # Segurança básica
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options SAMEORIGIN always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

    # Uploads (ajusta se precisares)
    client_max_body_size 20m;

    # Proxy para Node
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 90;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/cash-app.conf /etc/nginx/sites-enabled/cash-app.conf
sudo nginx -t && sudo systemctl reload nginx

# 0.5) Certbot (Let's Encrypt) via plugin Nginx
sudo apt -y install certbot python3-certbot-nginx
sudo certbot --nginx -d stackweb.ddnsking.com -d www.stackweb.ddnsking.com --redirect --agree-tos -m teu-email@dominio.com -n

# 0.6) Renovação automática (teste)
sudo certbot renew --dry-run
```

---

## 1) Variáveis/paths usados
- Domínio: `stackweb.ddnsking.com`
- Porta interna da app: `3000` (ajusta se diferente)
- Pasta da app: `/var/www/cash-app`
- Serviço systemd: `cash-app.service`
- Site Nginx: `/etc/nginx/sites-available/cash-app.conf` → symlink em `sites-enabled`

> Se usares PM2 em vez de systemd: `npm i -g pm2 && pm2 start server.js && pm2 save && pm2 startup`

---

## 2) .env (exemplo)
Cria `/var/www/cash-app/.env` se necessário e certifica-te que o código usa `dotenv`:
```bash
PORT=3000
DB_HOST=localhost
DB_USER=Martins
DB_PASSWORD=app.bdm
DB_NAME=POS_BD
JWT_SECRET=umseguroaqui
NODE_ENV=production
```

---

## 3) Verificações rápidas
```bash
# Serviço da app
systemctl status cash-app --no-pager
journalctl -u cash-app -f

# Nginx
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

---

## 4) Boas práticas extra (opcional)
### 4.1) Diffie-Hellman params
```bash
sudo openssl dhparam -out /etc/ssl/certs/dhparam.pem 2048
# Depois adiciona dentro do bloco server HTTPS:
# ssl_dhparam /etc/ssl/certs/dhparam.pem;
sudo nginx -t && sudo systemctl reload nginx
```
### 4.2) Gzip
```nginx
# Dentro do bloco HTTPS
gzip on;
gzip_types text/plain text/css application/json application/javascript application/xml image/svg+xml;
gzip_min_length 1024;
```
### 4.3) Limitar tamanho de pedido
```nginx
# Dentro do bloco HTTPS
client_max_body_size 20m;
```

---

## 5) Checklist final
- [ ] App Node a responder em `localhost:3000`
- [ ] `cash-app.service` **active (running)**
- [ ] Nginx `-t` OK + reload
- [ ] `certbot --nginx` executado com sucesso
- [ ] HTTP → **HTTPS** e **www** → **root** a funcionar
- [ ] Site acessível: https://stackweb.ddnsking.com/
