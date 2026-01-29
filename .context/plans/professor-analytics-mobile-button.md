# Adicionar botao Analytics na navegacao mobile do professor

> Gerado em: 28/01/2026
> Escala: QUICK (alteracao de 1 arquivo, 2 linhas)

## Problema
A barra de navegacao inferior mobile (`BottomNav.tsx`) do professor tem apenas 3 itens:
- Inicio (`/professor`)
- Registrar (`/professor/registrar`)
- Minhas (`/professor/ocorrencias`)

Falta o botao para acessar a pagina de Analytics (`/professor/analytics`), que ja existe e funciona.

## Solucao

### Arquivo a modificar
- `components/layout/BottomNav.tsx`

### Alteracoes
1. Importar icone `BarChart3` do lucide-react (ja usado no Sidebar para Analytics)
2. Adicionar item ao array `navItems`:
   ```typescript
   { href: '/professor/analytics', label: 'Analytics', icon: BarChart3 }
   ```

### Resultado
Array `navItems` passara de 3 para 4 itens:
| # | Label | Rota | Icone |
|---|-------|------|-------|
| 1 | Inicio | /professor | LayoutDashboard |
| 2 | Registrar | /professor/registrar | PlusCircle |
| 3 | Minhas | /professor/ocorrencias | List |
| 4 | Analytics | /professor/analytics | BarChart3 |

### Consideracoes de layout
- Com 4 itens, o `justify-around` distribui igualmente - funciona bem
- Os icones `h-6 w-6` + label `text-xs` cabem em 4 colunas em telas >= 320px
- Nenhuma alteracao de CSS necessaria

## Checklist
- [ ] Adicionar import do BarChart3
- [ ] Adicionar item ao navItems
- [ ] Verificar build
