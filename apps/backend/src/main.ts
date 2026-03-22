export type ServiceName =
  | 'api-gateway'
  | 'identity-service'
  | 'merchant-service'
  | 'catalog-service'
  | 'order-service'
  | 'dispatch-service'
  | 'delivery-service'
  | 'payment-service'
  | 'ledger-service'
  | 'notification-service'
  | 'realtime-service';

export const platformServices: ServiceName[] = [
  'api-gateway',
  'identity-service',
  'merchant-service',
  'catalog-service',
  'order-service',
  'dispatch-service',
  'delivery-service',
  'payment-service',
  'ledger-service',
  'notification-service',
  'realtime-service',
];
