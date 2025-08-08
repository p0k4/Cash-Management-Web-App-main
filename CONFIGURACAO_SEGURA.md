# 🔐 Configuração Segura do Sistema

## ⚡ **Alterações de Segurança Implementadas**

### 🔑 **Nova Senha de Administrador**

A senha de administrador foi alterada para uma versão mais segura e é agora **unificada** para ambas as funções:

- **Login do admin**: Mesma senha
- **Criação de novos utilizadores**: Mesma senha

### 📋 **Credenciais Atuais**

**Para fazer LOGIN como admin:**
- Username: `admin`
- Password: `#admin.am80`

**Para REGISTAR novos utilizadores:**
- Admin Password: `#admin.am80`

### 🛡️ **Melhorias de Segurança**

1. **Senha complexa**: Contém caracteres especiais (#, .)
2. **Sem exposição**: Removida a dica visual da interface web
3. **Unificação**: Mesma senha para login e criação de utilizadores
4. **Configuração segura**: Senha protegida por aspas no arquivo .env

### ⚙️ **Configuração no .env**

```env
# Use aspas para proteger caracteres especiais
ADMIN_PASSWORD="#admin.am80"
```

### 🔒 **Boas Práticas Implementadas**

- ✅ **Sem hardcoding**: Senha obtida via variável de ambiente
- ✅ **Sem exposição na UI**: Interface não mostra a senha
- ✅ **Hash seguro**: Senhas de utilizadores hasheadas com bcrypt
- ✅ **Validação robusta**: Verificação tanto no cliente quanto no servidor

### 🚨 **Importante para Produção**

1. **Altere a senha padrão** antes de colocar em produção
2. **Use uma senha ainda mais complexa** (mínimo 12 caracteres)
3. **Configure HTTPS** para proteger a transmissão
4. **Monitore tentativas** de acesso não autorizadas
5. **Faça backup regular** das configurações

### 💡 **Exemplo de Senha Forte para Produção**

```env
ADMIN_PASSWORD="Adm!n$2024#CashMgmt*Secure"
```

### 🔄 **Como Alterar a Senha**

1. Edite o arquivo `.env`:
   ```env
   ADMIN_PASSWORD="sua_nova_senha_aqui"
   ```

2. Atualize a senha do utilizador admin no banco:
   ```sql
   -- Execute no PostgreSQL
   UPDATE utilizadores 
   SET senha = crypt('sua_nova_senha_aqui', gen_salt('bf')) 
   WHERE username = 'admin';
   ```

3. Reinicie o servidor para carregar as novas configurações

### 🎯 **Status Atual**

- ✅ Sistema configurado com senha segura
- ✅ Interface web sem exposição de credenciais
- ✅ Unificação login/registro completada
- ✅ Documentação atualizada
- ✅ Testes de funcionalidade aprovados
