---
status: ready
generated: 2026-02-02
---

# Mudar "Adicionar Professor" para "Adicionar Usuario" com selecao de funcao

## Objetivo

Transformar o botao "+ Adicionar Professor" em "+ Adicionar Usuario", permitindo que o admin crie usuarios com qualquer funcao: Administrador (`admin`), Professor (`professor`) ou Visualizador (`admin_viewer`).

## Arquivos a Modificar

### 1. TeacherModal (`components/teachers/TeacherModal.tsx`)

**Mudancas:**
- Renomear para `UserModal` (ou manter arquivo e mudar titulo)
- Adicionar novo campo **Funcao** (select) com opcoes:
  - Professor (default)
  - Administrador
  - Visualizador
- Passar `role` no payload do POST
- Mudar textos:
  - Titulo: "Cadastrar Professor" -> "Cadastrar Usuario" (criar) / "Editar Usuario" (editar)
  - Helper email: "O usuario recebera um email com instrucoes de acesso"
  - Toast sucesso: "Usuario cadastrado! Email de boas-vindas enviado."

**Campo Funcao (UI):**
```tsx
<select value={role} onChange={e => setRole(e.target.value)}>
  <option value="professor">Professor</option>
  <option value="admin">Administrador</option>
  <option value="admin_viewer">Visualizador</option>
</select>
```

- No modo edicao, funcao NAO aparece (ja tem o botao UserCog dedicado para mudar role)

### 2. API POST `/api/teachers` (`app/api/teachers/route.ts` linhas 57-151)

**Mudancas:**
- Aceitar campo opcional `role` no body (default: `'professor'`)
- Validar que `role` e um dos valores permitidos: `admin`, `professor`, `admin_viewer`
- Usar `role` ao inserir em `user_institutions` (linha ~120, atualmente hardcoded `'professor'`)
- Mudar mensagem de sucesso: "Usuario cadastrado com sucesso"

**Codigo atual (linha ~120):**
```typescript
role: 'professor',  // HARDCODED
```

**Codigo novo:**
```typescript
role: validRole,  // Do body, validado
```

### 3. Pagina Admin Professores (`app/admin/professores/page.tsx`)

**Mudancas:**
- Botao: "Adicionar Professor" -> "Adicionar Usuario" (linha ~380)
- Card titulo: "Professores" -> "Usuarios" (se aplicavel no header da lista)

### 4. Email de boas-vindas (`lib/email/sendVerificationEmail.ts`)

**Mudanca:**
- A funcao `sendWelcomeEmail` atualmente diz "Professor" no corpo do email
- Aceitar parametro `role` opcional e ajustar o texto:
  - `admin` -> "Administrador"
  - `professor` -> "Professor"
  - `admin_viewer` -> "Visualizador"

## Fora do Escopo

- Renomear a rota `/api/teachers` para `/api/users` (mantemos compatibilidade)
- Renomear o arquivo da pagina `app/admin/professores/` (URL permanece)
- Mudar o campo de funcao na edicao (ja existe botao UserCog para isso)

## Verificacao

1. Abrir pagina Usuarios como admin
2. Clicar "+ Adicionar Usuario"
3. Preencher nome, email, selecionar "Administrador" -> deve criar com role admin
4. Repetir com "Professor" e "Visualizador"
5. Verificar que email de boas-vindas menciona a funcao correta
6. Verificar que o novo usuario aparece na lista com badge de role correto
7. Build passando
