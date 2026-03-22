# Fox Delivery Platform

Plataforma de delivery multi-vendor inspirada nos fluxos operacionais do **iFood** (cliente, entregador e parceiro/lojista) e nas capacidades modulares do **6amMart**.

## O que existe agora

O projeto agora contém um **backend executável mais completo**, cobrindo três eixos operacionais centrais:

- autenticação básica por sessão e perfil (`merchant_owner`, `courier`, `customer`);
- criação de pedidos por cliente;
- gestão operacional do pedido pelo lojista;
- catálogo do lojista com criação e listagem de produtos;
- geração automática de oferta de corrida ao entregador quando o pedido fica pronto para coleta;
- aceite da oferta, criação de task de entrega, progressão da entrega e crédito na wallet do entregador;
- tracking do pedido para o cliente;
- stream SSE para pedidos do lojista e ofertas/eventos do entregador;
- persistência local em arquivo JSON fora do modo de teste.

## Estrutura

- `apps/backend/src/main.js`: servidor HTTP com autenticação e rotas dos fluxos operacionais.
- `apps/backend/src/data/store.js`: store com persistência em arquivo, seed de usuários/lojista/entregador e publicação de eventos.
- `apps/backend/src/modules/auth`: login e resolução de sessão.
- `apps/backend/src/modules/catalog`: gestão básica do cardápio.
- `apps/backend/src/modules/orders`: regras de negócio do ciclo do pedido.
- `apps/backend/src/modules/courier`: dispatch operacional, task e wallet do entregador.
- `apps/backend/src/modules/merchant`: métricas do dashboard do lojista.
- `apps/backend/src/modules/realtime`: stream SSE para operação em tempo real.
- `apps/backend/test/backend.test.js`: testes ponta a ponta dos fluxos de lojista e entregador.
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

## Endpoints já funcionais

### Auth
- `POST /auth/login`
- `GET /auth/me`

### Cliente
- `POST /customer/orders`
- `GET /customer/orders/:orderId/tracking`

### Lojista
- `GET /merchant/orders`
- `POST /merchant/orders/:orderId/accept`
- `POST /merchant/orders/:orderId/reject`
- `PATCH /merchant/orders/:orderId/status`
- `GET /merchant/dashboard`
- `GET /merchant/catalog/products`
- `POST /merchant/catalog/products`
- `GET /merchant/orders/stream`

### Entregador
- `GET /courier/offers/active`
- `POST /courier/offers/:offerId/accept`
- `PATCH /courier/tasks/:taskId/status`
- `GET /courier/wallet`
- `GET /courier/offers/stream`

## Exemplo rápido

```bash
curl -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"phone":"5511911111111","role":"merchant_owner"}'
```

Use o `token` retornado como `Authorization: Bearer <token>` nas rotas protegidas.

## Próximos passos

1. trocar a persistência em arquivo por PostgreSQL + Redis;
2. converter o servidor em monorepo NestJS com serviços separados;
3. adicionar RBAC granular, refresh token, auditoria e MFA;
4. implementar pricing dinâmico, promoções, wallet do lojista e repasses;
5. conectar gateway de pagamento, PIX e split financeiro;
6. construir painéis web e apps Flutter.
