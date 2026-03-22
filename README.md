# Fox Delivery Platform

Plataforma de delivery multi-vendor inspirada nos fluxos operacionais do **iFood** (cliente, entregador e parceiro/lojista) e nas capacidades modulares do **6amMart**.

## O que existe agora

O projeto agora contém um **backend executável mais completo**, cobrindo cinco eixos operacionais centrais:

- autenticação básica por sessão e perfil (`merchant_owner`, `courier`, `customer`, `admin`);
- descoberta de lojas, pricing de carrinho e aplicação de cupons;
- criação de pedidos por cliente, tracking com cashback/descontos e wallet do cliente;
- gestão operacional do pedido pelo lojista, incluindo settings e pausa da loja;
- catálogo do lojista com criação e listagem de produtos;
- geração automática de oferta de corrida ao entregador quando o pedido fica pronto para coleta;
- aceite da oferta, criação de task de entrega, progressão da entrega, saque simplificado e crédito na wallet do entregador;
- extrato financeiro do lojista com ledger simplificado após entrega concluída;
- visão operacional básica para admin/backoffice;
- painel web inicial do lojista servido pelo backend em `/app/merchant`;
- painel web inicial do entregador servido pelo backend em `/app/courier`;
- painel web inicial do cliente servido pelo backend em `/app/customer`;
- stream SSE para pedidos do lojista e ofertas/eventos do entregador;
- persistência local em arquivo JSON fora do modo de teste.

## Estrutura

- `apps/backend/src/main.js`: servidor HTTP com autenticação e rotas dos fluxos operacionais.
- `apps/backend/src/data/store.js`: store com persistência em arquivo, seed de usuários/lojista/entregador/admin/cupom e publicação de eventos.
- `apps/backend/src/modules/auth`: login e resolução de sessão.
- `apps/backend/src/modules/discovery`: ranking simples de feed para o cliente.
- `apps/backend/src/modules/pricing`: precificação de carrinho com taxa de serviço, cupom e cashback.
- `apps/backend/src/modules/catalog`: gestão básica do cardápio.
- `apps/backend/src/modules/orders`: regras de negócio do ciclo do pedido.
- `apps/backend/src/modules/courier`: dispatch operacional, task, saque e wallet do entregador.
- `apps/backend/src/modules/customer`: tracking e wallet do cliente.
- `apps/backend/src/modules/merchant`: dashboard, statement financeiro e settings do lojista.
- `apps/backend/src/modules/admin`: visão resumida de backoffice.
- `apps/backend/src/modules/realtime`: stream SSE para operação em tempo real.
- `apps/backend/test/backend.test.js`: testes ponta a ponta dos fluxos de lojista, cliente, entregador e admin.
- `apps/web/merchant`: painel web inicial do lojista com dashboard, settings, pedidos e catálogo.
- `apps/web/courier`: painel web inicial do entregador com ofertas, task updates e wallet.
- `apps/web/customer`: painel web inicial do cliente com feed, pricing, pedido e wallet.
- `docs/benchmark/ifood-6ammart-analysis.md`: benchmark funcional e requisitos-alvo.
- `docs/architecture/platform-architecture.md`: arquitetura alvo de microserviços.
- `docs/database/schema.sql`: modelo relacional-alvo em PostgreSQL.
- `docs/api/openapi.yaml`: contrato-alvo para evolução da API.

## Como rodar

```bash
cd apps/backend
npm start
```

Servidor padrão: `http://localhost:3000`.

## Credenciais seed para login

### Lojista
- telefone: `5511911111111`
- role: `merchant_owner`

### Entregador
- telefone: `5511922222222`
- role: `courier`

### Admin
- telefone: `5511944444444`
- role: `admin`

## Cupons seed
- `FOX10`: 10% de desconto no subtotal
- `FRETEGRATIS`: zera o frete

## Endpoints já funcionais

### Auth
- `POST /auth/login`
- `GET /auth/me`

### Cliente
- `GET /customer/discovery/feed`
- `POST /customer/cart/price`
- `POST /customer/orders`
- `GET /customer/orders/:orderId/tracking`
- `GET /customer/wallet`

### Lojista
- `GET /merchant/orders`
- `POST /merchant/orders/:orderId/accept`
- `POST /merchant/orders/:orderId/reject`
- `PATCH /merchant/orders/:orderId/status`
- `GET /merchant/dashboard`
- `GET /merchant/finance/statement`
- `GET /merchant/settings`
- `PATCH /merchant/settings`
- `GET /merchant/catalog/products`
- `POST /merchant/catalog/products`
- `GET /merchant/orders/stream`

### Entregador
- `GET /courier/offers/active`
- `POST /courier/offers/:offerId/accept`
- `PATCH /courier/tasks/:taskId/status`
- `GET /courier/wallet`
- `POST /courier/wallet/withdrawals`
- `GET /courier/offers/stream`

### Admin
- `GET /admin/overview`

## Painéis web

- Lojista: `http://localhost:3000/app/merchant`
- Entregador: `http://localhost:3000/app/courier`
- Cliente: `http://localhost:3000/app/customer`

## Exemplo rápido

```bash
curl -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"phone":"5511944444444","role":"admin"}'
```

## Próximos passos

1. trocar a persistência em arquivo por PostgreSQL + Redis;
2. converter o servidor em monorepo NestJS com serviços separados;
3. adicionar RBAC granular, refresh token, auditoria e MFA;
4. implementar pricing dinâmico por zona/horário, promoções avançadas e payouts reais;
5. conectar gateway de pagamento, PIX e split financeiro;
6. construir painéis web e apps Flutter.
