export const domainEvents = [
  'order.created',
  'order.accepted',
  'order.rejected',
  'order.preparation_time_updated',
  'order.ready_for_pickup',
  'dispatch.offer_created',
  'dispatch.offer_accepted',
  'dispatch.offer_expired',
  'delivery.picked_up',
  'delivery.location_updated',
  'delivery.completed',
  'payment.authorized',
  'payment.captured',
  'ledger.entry_posted',
  'wallet.withdrawal_requested',
  'promotion.applied',
  'review.created',
] as const;

export type DomainEvent = (typeof domainEvents)[number];
