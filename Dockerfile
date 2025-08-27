# Dockerfile
FROM node:20

# Define diretório de trabalho
WORKDIR /app

# Copia os ficheiros
COPY package*.json ./
RUN npm install

COPY . .

# Expõe a porta da app
EXPOSE 3000

# Inicia o servidor
CMD ["npm", "start"]
