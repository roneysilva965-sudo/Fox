# Arquitetura da plataforma Fox

## Visão macro

A Fox é uma plataforma de delivery orientada por eventos, multi-tenant, multi-vendor e multi-módulo. O backend é composto por microserviços NestJS, banco principal PostgreSQL, cache/estado efêmero em Redis, mensageria em RabbitMQ/Kafka, notificações via Firebase e distribuição HTTP/WebSocket através de NGINX/Kubernetes.

## Canais suportados

- App Cliente (Flutter)
- App Entregador (Flutter)
- App Lojista (Flutter)
- Painel Web Lojista
- Painel Web Admin/Operações
- APIs públicas e privadas documentadas em Swagger/OpenAPI

## Microserviços propostos

### Edge e identidade
- **api-gateway**: autenticação, rate limiting, BFF por canal, agregação de leitura.
- **identity-service**: usuários, sessões, MFA, RBAC, dispositivos e auditoria.

### Catálogo e comércio
- **merchant-service**: lojas, horários, zonas, políticas, onboarding, suspensão e reputação.
- **catalog-service**: categorias, produtos, variações, combos, adicionais, estoque e mídia.
- **promotion-service**: cupons, descontos, cashback, frete grátis, afiliados e campanhas.
- **search-service**: índice textual + geoespacial para feed e busca inteligente.

### Pedido e logística
- **order-service**: carrinho, checkout, pedido, timeline, cancelamento e reembolso operacional.
- **dispatch-service**: matching de entregador, regras por veículo, timeout e redispatch.
- **delivery-service**: tracking, prova de coleta/entrega, geofence, ETA e incidentes.
- **realtime-service**: WebSocket/SSE por canal e fan-out de eventos.

### Financeiro
- **payment-service**: PIX, cartão, split, antifraude, captura, chargeback e tokenização.
- **ledger-service**: razão financeira, wallet, repasse, saque, comissão, taxas e extratos.
- **settlement-service**: agenda de repasses e reconciliação bancária.

### Plataforma
- **notification-service**: push, e-mail, SMS/WhatsApp e templates.
- **config-service**: feature flags, parâmetros operacionais, A/B test e políticas por módulo.
- **support-service**: tickets, disputas, avaliações, moderação e SLA.

## Eventos de domínio principais

- `order.created`
- `order.accepted`
- `order.rejected`
- `order.preparation_time_updated`
- `order.ready_for_pickup`
- `dispatch.offer_created`
- `dispatch.offer_accepted`
- `dispatch.offer_expired`
- `delivery.picked_up`
- `delivery.location_updated`
- `delivery.completed`
- `payment.authorized`
- `payment.captured`
- `ledger.entry_posted`
- `wallet.withdrawal_requested`
- `promotion.applied`
- `review.created`

## Modelagem de estados

### Pedido
`draft -> pricing_validated -> payment_pending -> placed -> merchant_received -> preparing -> ready_for_pickup -> courier_assigned -> picked_up -> in_delivery -> delivered`

Estados alternativos:
- `rejected_by_merchant`
- `cancelled_by_customer`
- `cancelled_by_platform`
- `failed_delivery`
- `refunded`

### Oferta para entregador
`created -> sent -> viewed -> accepted | expired | rejected`

### Entrega
`awaiting_assignment -> courier_en_route_pickup -> arrived_pickup -> picked_up -> courier_en_route_dropoff -> arrived_dropoff -> completed`

## Requisitos de escalabilidade

- Leituras críticas com cache em Redis e invalidação por evento.
- WebSockets sticky-session ou broker-backed pub/sub.
- Dados geoespaciais em PostgreSQL/PostGIS.
- Idempotência para pagamento, despacho e eventos.
- Sagas para checkout, captura e cancelamentos.
- Outbox pattern para publicação confiável.

## Observabilidade

- OpenTelemetry em todos os serviços.
- Logs estruturados com `trace_id`, `order_id`, `merchant_id`, `courier_id`.
- Métricas de negócio: aceite, atraso, cancelamento, fill rate, GMV, custo logístico, NPS.
- Alertas por anomalia: fila de despacho, tempo médio de preparo, quedas de push, taxa de rejeição.

## Segurança e compliance

- RBAC granular para admin, operador, merchant_owner, merchant_manager, courier, customer.
- Criptografia de dados sensíveis, tokenização de cartão e segregação LGPD.
- Trilhas de auditoria para alterações de catálogo, preço e financeiro.
- Assinaturas HMAC entre serviços sensíveis quando aplicável.
