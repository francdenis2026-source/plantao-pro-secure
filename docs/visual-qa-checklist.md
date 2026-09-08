# Checklist Visual — Fases 5 & 6 (Navy Trust + Tactical Amber)

> Execute a cada PR que toque `index.css`, `tailwind.config.ts`, `Index.tsx`,
> `AgentPanel.tsx`, `Admin.tsx`, `Master.tsx` ou `Dashboard.tsx`.

## 1. Carregamento sem "tela branca"

- [ ] Home (`/`) renderiza HeroCinematic + cards de equipe + bento de pilares mesmo com JS lento (DevTools → throttling Slow 3G).
- [ ] Sem flash branco entre `index.html` e o React mount — `body` herda `bg-background` (HSL 222 60% 5%).
- [ ] PWA (`sw.js`) entrega shell offline; rotas autenticadas mostram skeleton, nunca branco.
- [ ] Safari 14+ / Chrome ≥ 90 / Edge ≥ 90 / Firefox ≥ 88 — testar `min-h-dvh` cai pra `min-h-screen` via Tailwind.
- [ ] Telas pequenas (320×568): hero não corta título, bento grid colapsa para 2 colunas, footer permanece visível.

## 2. Contraste (WCAG AA — mínimo 4.5:1 texto / 3:1 UI)

- [ ] `text-foreground` sobre `bg-background` ≥ 12:1 ✅ (token).
- [ ] `text-muted-foreground` sobre `bg-card` ≥ 4.5:1.
- [ ] Botões `bg-primary text-primary-foreground` (âmbar + navy) ≥ 7:1.
- [ ] `command-badge` legível em qualquer fundo (verificar no hero, no bento e no AgentPanel).
- [ ] Sem texto cinza-claro (`text-gray-300`, `text-muted-foreground/50`) — usar tokens.

## 3. Foco de teclado

- [ ] `Tab` percorre: skip-link → header → hero CTA → cards de equipe (ALFA→DELTA) → pilares → footer.
- [ ] Anel de foco visível (`focus-visible:ring-2 ring-ring`) — âmbar `--ring: 38 92% 50%`.
- [ ] Dialogs (CPF check, login, master) prendem foco e devolvem ao trigger no `Esc`.
- [ ] Botão ícone-only (`size="icon"`) tem `aria-label` (Sidebar, Header, PWAInstallPrompt).
- [ ] `tactical-strip` é decorativo (`::before` com `pointer-events:none`) — não rouba foco.

## 4. Performance / Motion

- [ ] `hover-lift` usa `transform` + `will-change: transform` → GPU, sem layout thrash.
- [ ] `amber-pulse` (`box-shadow`) limitado a 1–2 elementos por viewport (não aplicar em listas).
- [ ] `prefers-reduced-motion: reduce` desativa pulse/lift (adicionar regra global se faltar).
- [ ] Lighthouse mobile: Performance ≥ 80, A11y ≥ 95, Best Practices ≥ 95.
- [ ] Hero image (`hero-ise-acre.jpg`) servido com `loading="eager"` apenas na home; demais com `loading="lazy"`.

## 5. Regressão funcional (sanity)

- [ ] Login CPF + senha funciona (`/` → AgentPanel).
- [ ] Login Master + Admin funcionam (rotas `/master`, `/admin`).
- [ ] Tabs do AgentPanel não perdem estado ao aplicar `tactical-strip`.
- [ ] BH, Chat, Plantões, Trocas — abrir cada um e confirmar render.
- [ ] Dark mode é o padrão; alternar tema não quebra tokens novos.

## 6. Como rodar rápido

```bash
# Build + typecheck
bun run build

# Lighthouse mobile na home
npx lighthouse http://localhost:8080 --preset=desktop --only-categories=accessibility,performance

# Auditoria axe via Playwright
bunx playwright test tests/a11y.spec.ts
```

> Marque cada item antes de pedir review. Falhou? Reverter o commit isolado da
> Fase correspondente (5 ou 6) — os utilitários `tactical-strip`, `hover-lift`
> e `amber-pulse` ficam em `src/index.css` (linhas 343-377).
