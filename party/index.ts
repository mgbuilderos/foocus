import type * as Party from "partykit/server";

export default class PlanAndDoServer implements Party.Server {
  constructor(readonly room: Party.Room) {}

  peers = new Map<string, any>();

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    this.peers.set(conn.id, { id: conn.id, state: 'IDLE', currentTaskIndex: 0, totalTasks: 0 });
    this.broadcastPeers();
  }

  onClose(conn: Party.Connection) {
    this.peers.delete(conn.id);
    this.broadcastPeers();
  }

  onMessage(message: string, sender: Party.Connection) {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'HEARTBEAT':
          const peer = this.peers.get(sender.id);
          if (peer) {
            peer.state = data.state;
            peer.currentTaskIndex = data.currentTaskIndex;
            peer.totalTasks = data.totalTasks;
            // Only broadcast occasionally or if something significant changed to avoid flooding
            this.broadcastPeers();
          }
          break;
        case 'UPDATE_SCHEDULE':
        case 'START_SPRINT':
        case 'PAUSE_SPRINT':
        case 'FINISH_TASK_EARLY':
          // Relay commands to other peers
          this.room.broadcast(message, [sender.id]);
          break;
      }
    } catch (e) {
      console.error("Failed to parse message", e);
    }
  }

  broadcastPeers() {
    const peersArray = Array.from(this.peers.values());
    this.room.broadcast(JSON.stringify({
      type: 'SYNC_PEERS',
      peers: peersArray
    }));
  }
}
