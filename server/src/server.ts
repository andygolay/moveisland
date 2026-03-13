import type * as Party from "partykit/server";
import type {
  PlayerState,
  ClientMessage,
  ServerMessage,
  JoinMessage,
  PositionMessage,
} from "./types";

// Zone size for spatial partitioning
const ZONE_SIZE = 50;

function getZone(x: number, z: number): string {
  return `${Math.floor(x / ZONE_SIZE)},${Math.floor(z / ZONE_SIZE)}`;
}

function getAdjacentZones(zone: string): string[] {
  const [zx, zz] = zone.split(",").map(Number);
  const zones: string[] = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      zones.push(`${zx + dx},${zz + dz}`);
    }
  }
  return zones;
}

export default class MoveIslandServer implements Party.Server {
  constructor(readonly room: Party.Room) {}

  // Get player state from connection
  private getPlayer(conn: Party.Connection): PlayerState | undefined {
    return conn.state as PlayerState | undefined;
  }

  // Set player state on connection
  private setPlayer(conn: Party.Connection, player: PlayerState) {
    conn.setState(player);
  }

  // Broadcast to players in adjacent zones
  private broadcastToZone(
    message: ServerMessage,
    senderZone: string,
    excludeId?: string
  ) {
    const adjacentZones = getAdjacentZones(senderZone);
    const json = JSON.stringify(message);

    for (const conn of this.room.getConnections()) {
      if (excludeId && conn.id === excludeId) continue;

      const player = this.getPlayer(conn);
      if (!player) continue;

      const playerZone = getZone(player.x, player.z);
      if (adjacentZones.includes(playerZone)) {
        conn.send(json);
      }
    }
  }

  // Get all players as state array
  private getAllPlayers(excludeId?: string): PlayerState[] {
    const players: PlayerState[] = [];
    for (const conn of this.room.getConnections()) {
      if (excludeId && conn.id === excludeId) continue;
      const player = this.getPlayer(conn);
      if (player) {
        players.push(player);
      }
    }
    return players;
  }

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    console.log(`Client connected: ${conn.id}`);
    // Player state will be set when they send 'join' message
  }

  onMessage(message: string | ArrayBuffer, sender: Party.Connection) {
    if (typeof message !== "string") return;

    try {
      const data: ClientMessage = JSON.parse(message);

      switch (data.type) {
        case "join":
          this.handleJoin(sender, data);
          break;
        case "position":
          this.handlePosition(sender, data);
          break;
      }
    } catch (error) {
      console.error("Failed to parse message:", error);
      sender.send(
        JSON.stringify({ type: "error", message: "Invalid message format" })
      );
    }
  }

  private handleJoin(conn: Party.Connection, data: JoinMessage) {
    // Create player state
    const player: PlayerState = {
      id: conn.id,
      walletAddress: data.walletAddress,
      nftImage: data.nftImage,
      nftName: data.nftName,
      x: 0,
      y: 0,
      z: 0,
      rotation: 0,
      animation: "idle",
    };

    this.setPlayer(conn, player);
    console.log(`Player joined: ${player.id} (${data.walletAddress})`);

    // Send existing players to new player
    const existingPlayers = this.getAllPlayers(conn.id);
    const playersMsg: ServerMessage = {
      type: "players",
      players: existingPlayers,
    };
    conn.send(JSON.stringify(playersMsg));

    // Notify other players about new player
    const joinedMsg: ServerMessage = {
      type: "playerJoined",
      player,
    };
    this.broadcastToZone(joinedMsg, getZone(player.x, player.z), conn.id);
  }

  private handlePosition(conn: Party.Connection, data: PositionMessage) {
    const player = this.getPlayer(conn);
    if (!player) {
      conn.send(
        JSON.stringify({ type: "error", message: "Not joined yet" })
      );
      return;
    }

    // Update player position
    player.x = data.x;
    player.y = data.y;
    player.z = data.z;
    player.rotation = data.rotation;
    player.animation = data.animation;
    this.setPlayer(conn, player);

    // Broadcast to nearby players
    const updateMsg: ServerMessage = {
      type: "players",
      players: [player],
    };
    this.broadcastToZone(updateMsg, getZone(player.x, player.z), conn.id);
  }

  onClose(conn: Party.Connection) {
    const player = this.getPlayer(conn);
    if (player) {
      console.log(`Player left: ${player.id}`);

      // Notify other players
      const leftMsg: ServerMessage = {
        type: "playerLeft",
        playerId: player.id,
      };
      this.broadcastToZone(leftMsg, getZone(player.x, player.z));
    }
  }

  onError(conn: Party.Connection, error: Error) {
    console.error(`Connection error for ${conn.id}:`, error);
  }
}
