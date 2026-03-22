# Benchmark funcional: iFood Parceiros, iFood Entregadores e 6amMart

## Objetivo

Replicar **fluxos reais de operação**, não apenas CRUDs genéricos. Este benchmark foi estruturado para orientar produto, arquitetura e contratos de API da plataforma Fox.

## Evidências públicas analisadas

### iFood para Parceiros / ecossistema de lojistas
Com base em materiais públicos do ecossistema de parceiros do iFood, os elementos centrais observados são:
- vitrine digital com cardápio, fotos, preços e promoções;
- recepção de pedidos em painel com acompanhamento em tempo real;
- escolha entre logística própria ou logística do iFood;
- processamento de pagamentos e repasse ao parceiro;
- ferramentas de marketing e campanhas;
- rastreamento em tempo real e gestão de tempo de preparo no plano com logística iFood.

### iFood para Entregadores
Em canais públicos do iFood para entregadores, o padrão operacional esperado inclui:
- oferta de corrida/pedido com alerta sonoro forte;
- janela de aceite com timeout;
- sequência operacional de deslocamento até coleta, coleta e entrega;
- acompanhamento de ganhos e histórico;
- acesso a incentivos, níveis e recursos financeiros.

### 6amMart
A oferta pública do 6amMart evidencia um sistema de marketplace multi-vendor e multi-módulo com:
- operação centralizada para diversos módulos de negócio;
- cobrança por km e opção fixa por zona;
- gestão por zonas/áreas de cobertura;
- wallet e cashback;
- afiliados/referral;
- papéis e permissões para vendor;
- aprovação de produto, guest checkout, pagamentos offline/dinâmicos e extras por zona/horário.

## Matriz de replicação obrigatória

| Domínio | Fluxo real observado | Decisão de replicação na Fox |
|---|---|---|
| Lojista / pedidos | Pedido entra no painel em tempo real, com ação imediata de aceitar/recusar e gestão do preparo | Canal WebSocket + fallback push + SLA de aceite + cronômetro de preparo |
| Lojista / operação | Loja pode operar com frota própria ou logística da plataforma | `fulfillment_mode`: `merchant_delivery`, `platform_delivery`, `hybrid` |
| Lojista / cardápio | Cardápio com fotos, categorias, variações, adicionais e disponibilidade temporal | Catálogo com janelas de disponibilidade, modifiers e pricing rules |
| Lojista / marketing | Cupons, campanhas, destaque e promoções para aumentar sell-through | Serviço de promoções com regras por módulo, loja, cluster e wallet |
| Lojista / financeiro | Pagamento centralizado e repasse ao parceiro | Ledger, split, wallet e agenda de repasse |
| Entregador / despacho | Oferta com alerta sonoro e timeout de aceite | Dispatch service com push + WebSocket + score de elegibilidade |
| Entregador / entrega | Estados de ida para coleta, coleta, rota e entrega concluída | Máquina de estados logística e prova de entrega |
| Entregador / ganhos | Histórico, ganhos diários e saque | Wallet do entregador + liquidação por janelas |
| Cliente / descoberta | Busca, filtros, ranking por proximidade e SLA | Search + ranking + catálogo geoespacial |
| Cliente / tracking | Rastreamento em tempo real da preparação e entrega | Timeline unificada pedido + logistics stream |
| Multi-vendor | Marketplace com diversos segmentos | Módulos: food, grocery, pharmacy, pet, convenience, parcel |
| Multi-módulo | Regras por vertical | Configuração por módulo com catálogos e compliance específicos |
| Área/zona | Cobrança por km, área de cobertura, extras por zona | Engine de pricing geográfico + zone policies |
| Wallet e cashback | Incentivo e retenção do cliente | Wallet service + campanhas de cashback |
| Referral/afiliados | Aquisição e crescimento | Referral service com tracking de conversão |

## Fluxos críticos a serem reproduzidos

### 1. Painel do lojista no padrão iFood
1. Pedido recebido via WebSocket e push.
2. Painel toca som, mostra countdown de aceite e bloqueia timeout operacional.
3. Lojista aceita ou recusa com motivo.
4. Se aceito, define tempo de preparo inicial e pode reajustar ETA.
5. Itens avançam para `received -> preparing -> ready_for_pickup`.
6. Em logística da plataforma, pedido é publicado para o dispatch.
7. Em logística própria, a loja marca `out_for_delivery` e alimenta tracking.
8. Ao final, financeiro calcula comissão, taxa, gorjeta, cupom, subsídio e repasse.

### 2. App do entregador no padrão iFood
1. Pedido elegível entra na fila de despacho.
2. Matching considera geolocalização, tipo de veículo, score, capacidade e zona.
3. Entregador recebe oferta com alerta sonoro, valor estimado e timeout.
4. Ao aceitar, rota de coleta é aberta.
5. Coleta exige confirmação operacional (PIN, QR ou prova de coleta).
6. Rota ao cliente inicia com ETA e eventos de localização.
7. Entrega fecha com PIN, foto ou geofence.
8. Ganhos são lançados na wallet e ficam elegíveis para saque.

### 3. Cliente no padrão marketplace moderno
1. Busca e feed são personalizados por zona, módulo, horário e disponibilidade.
2. Checkout valida faixa de entrega, estoque, adicionais, promoções, meio de pagamento e endereço.
3. Após pagamento, timeline mostra aceite, preparo, coleta e entrega.
4. Pós-pedido oferece avaliação, suporte, recompensas e cashback.

## Requisitos não negociáveis derivados do benchmark

- Eventos de tempo real por pedido, loja e entregador.
- Engine de disponibilidade por horário e estoque.
- Rastreio geoespacial e ETA dinâmico.
- Conciliação financeira com ledger de dupla entrada.
- Políticas por módulo e por zona.
- Observabilidade fim a fim para SLA de aceite, preparo, despacho e entrega.
