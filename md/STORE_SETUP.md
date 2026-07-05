# 🛒 Guia de Reuso — Clonar a Loja / Landing para um Cliente Real

Este projeto foi preparado para ser **reutilizado como template de loja/landing**.
Quando você fechar com uma loja real, o objetivo é: **editar poucos arquivos de
configuração, trocar as imagens e publicar** — sem mexer na lógica dos componentes.

> **Regra de ouro:** conteúdo da marca e produtos mora em `config/`.
> Segredos moram em `.env`. Componentes leem de lá — não hardcode nada.

---

## 1. Fonte única da marca — `config/site.config.ts`

Edite **um arquivo** para rebrandar tudo (navbar, footer, SEO, PWA, planos):

| Campo | O que muda |
|-------|-----------|
| `brand.name` / `shortName` | Nome exibido em toda a UI |
| `brand.tagline` / `description` | Frases da landing e meta description |
| `brand.logo` | Caminho do logo em `/public` |
| `brand.versionLabel` | Selo ao lado do logo |
| `contact.email` / `whatsapp` | Botões de contato (some se vazio) |
| `urls.site` | Domínio canônico (SEO/sitemap/robots) |
| `urls.repo` / `sponsor` / `profile` | Links externos (some se vazio) |
| `socials.*` | Redes sociais |
| `seo.*` | Título, descrição, keywords, imagem OG |
| `footer.*` | Copyright, autor, nota |
| `features.*` | Liga/desliga newsletter, plano de apoio e links do GitHub |

Os componentes já consomem esses valores: `landing-navbar`, `landing-footer`,
`pricing-section`, `faq-section`, `final-cta-section`, `app/layout.tsx`,
`app/sitemap.ts`, `app/robots.ts`, `app/manifest.ts`.

## 2. Produtos e categorias — `config/catalog.ts`

Troque os dados de exemplo pelos itens reais da loja.

- **Preços em centavos** (`4990` = R$ 49,90) — evita erro de ponto flutuante.
- Imagens em `/public/produtos/…` (mantém o app portátil).
- Helpers prontos: `formatPrice`, `discountPercent`, `getProductsByCategory`,
  `getFeaturedProducts`, `getProductBySlug`, `getSortedCategories`.
- Suporta `variants` (tamanho/cor), `badge`, `compareAtPrice` (preço "de"),
  `featured` e `inStock`.

## 3. Imagens em `/public`

Substitua os arquivos mantendo os nomes (ou atualize os caminhos na config):

- `logo.webp`, `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`
- `faqs/faq1..7.webp` (previews da seção de dúvidas)
- `produtos/…` (fotos dos produtos)

## 4. Cor da marca (accent)

O tema usa um **accent** trocável. Presets ficam em
`components/settings/appearance/theme-presets.ts`. A landing sorteia um accent a
cada carregamento (demo); para fixar a cor da loja, defina um preset padrão.

---

## ✅ Checklist de Produção

### Conteúdo
- [ ] `config/site.config.ts` com nome, contato, redes, SEO e URLs reais
- [ ] `config/catalog.ts` com produtos, categorias, preços e fotos reais
- [ ] Imagens em `/public` substituídas (logo, ícones, produtos, FAQ)
- [ ] Páginas institucionais revisadas: `/privacy`, `/terms`, `/contact`, `/changelog`
- [ ] `features.*` ajustados (ex.: `showSponsorPlan: false` numa loja comum)

### Ambiente / Segredos (`.env`)
- [ ] `NEXT_PUBLIC_SITE_URL` = domínio real (sem barra no fim)
- [ ] `JWT_SECRET` e `ENCRYPTION_KEY` fortes e únicos (não reutilizar exemplos)
- [ ] Banco: `DATABASE_URL` (local) **ou** `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` (nuvem)
- [ ] Pagamentos (se houver checkout): chaves do provedor escolhido

### Qualidade
- [ ] `npx tsc --noEmit` sem erros
- [ ] `npm run lint` limpo
- [ ] `npm run build`:
      - ⚠️ pare o `npm run dev` antes (o build clobbera o `.next`)
      - ⚠️ **não rode duas builds ao mesmo tempo** — disputam o `life_os.db` e dão
        `SQLite: database is locked`
      - Localmente, com o banco em **modo réplica libSQL**, a coleta de dados das
        rotas de dashboard (`/ai`, `/connect`, `/cms/[id]`…) pode falhar com
        `database is locked`. Isso é do ambiente local, **não** da loja/landing.
        No deploy com **Turso** (nuvem) esse lock não ocorre — valide o build no
        pipeline de produção com `TURSO_DATABASE_URL` configurado.
- [ ] Testado em mobile (PWA "Adicionar à tela inicial")
- [ ] Open Graph conferido (compartilhar o link mostra título/imagem certos)

### Deploy
- [ ] Variáveis de ambiente configuradas no host (Vercel/Netlify/servidor)
- [ ] Domínio apontado e HTTPS ativo
- [ ] `sitemap.xml` e `robots.txt` respondendo com o domínio novo
- [ ] Favicon/ícones aparecendo na aba e na instalação PWA

---

## 🔜 Ainda não incluso (decidir com o cliente)

O template entrega **vitrine + landing de venda editável**. O **checkout
transacional** (pagamento real, pedidos, estoque persistido) depende de decisões
do cliente e ficou como próximo passo:

- Provedor de pagamento (Stripe, Mercado Pago, Pix…)
- Modelo de pedidos/estoque no banco (novos models Prisma)
- E-mails transacionais (confirmação de pedido)

Placeholders de env já estão comentados em `.env.example` para quando for a hora.
