export class RealtimeService {
  constructor(store) {
    this.store = store;
  }

  attachStream(response, channel, entityId) {
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    response.write(`event: ready\ndata: ${JSON.stringify({ channel, entityId, connectedAt: new Date().toISOString() })}\n\n`);
    return this.store.registerClient(response, channel, entityId);
  }
}
