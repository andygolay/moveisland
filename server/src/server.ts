import type * as Party from "partykit/server";
import type {
  PlayerState,
  ClientMessage,
  ServerMessage,
  JoinMessage,
  PositionMessage,
  ChessJoinMessage,
  ChessLeaveMessage,
  ChessWatchMessage,
  ChessStopWatchingMessage,
  ChessSetGameIdMessage,
  ChessSetChallengeIdMessage,
  ChessState,
  ChessPlayer,
  ChessSpectator,
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

// Table IDs must match the client CHESS_TABLES
const TABLE_IDS = ['table-1', 'table-2', 'table-3'];

function createEmptyChessState(): ChessState {
  return {
    status: 'empty',
    player1: null,
    player2: null,
    spectators: [],
  };
}

export default class MoveIslandServer implements Party.Server {
  // Chess game state per table
  private chessTables: Map<string, ChessState> = new Map(
    TABLE_IDS.map(id => [id, createEmptyChessState()])
  );

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
        case "chessJoin":
          this.handleChessJoin(sender, data);
          break;
        case "chessLeave":
          this.handleChessLeave(sender, data);
          break;
        case "chessWatch":
          this.handleChessWatch(sender, data);
          break;
        case "chessStopWatching":
          this.handleChessStopWatching(sender, data);
          break;
        case "chessSetGameId":
          this.handleChessSetGameId(sender, data);
          break;
        case "chessSetChallengeId":
          this.handleChessSetChallengeId(sender, data);
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

    // Send all chess table states to new player
    for (const [tableId, state] of this.chessTables) {
      const chessMsg: ServerMessage = {
        type: 'chessState',
        tableId,
        state,
      };
      conn.send(JSON.stringify(chessMsg));
    }

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

  private handleChessJoin(conn: Party.Connection, data: ChessJoinMessage) {
    const { tableId, player } = data;
    const chessState = this.chessTables.get(tableId);
    if (!chessState) return;

    const connPlayer = this.getPlayer(conn);

    if (!chessState.player1) {
      // First player joins as white
      chessState.player1 = { ...player, side: 'white' };
      chessState.status = 'waiting';
      // Store the chess info on the connection for cleanup on disconnect
      if (connPlayer) {
        connPlayer.chessOdId = player.odId;
        connPlayer.chessTableId = tableId;
        this.setPlayer(conn, connPlayer);
      }
    } else if (!chessState.player2 && chessState.player1.odId !== player.odId) {
      // Second player joins as black
      chessState.player2 = { ...player, side: 'black' };
      chessState.status = 'playing';
      // Store the chess info on the connection for cleanup on disconnect
      if (connPlayer) {
        connPlayer.chessOdId = player.odId;
        connPlayer.chessTableId = tableId;
        this.setPlayer(conn, connPlayer);
      }
    }

    // Broadcast updated state to all players
    this.broadcastChessState(tableId);
  }

  private handleChessLeave(conn: Party.Connection, data: ChessLeaveMessage) {
    const { tableId, odId } = data;
    const chessState = this.chessTables.get(tableId);
    if (!chessState) return;

    if (chessState.player1?.odId === odId) {
      if (chessState.player2) {
        // Player 2 becomes player 1
        chessState.player1 = { ...chessState.player2, side: 'white' };
        chessState.player2 = null;
        chessState.status = 'waiting';
      } else {
        chessState.player1 = null;
        chessState.status = 'empty';
        chessState.gameId = undefined;
              chessState.challengeId = undefined;
      }
    } else if (chessState.player2?.odId === odId) {
      chessState.player2 = null;
      chessState.status = 'waiting';
    }

    // Broadcast updated state to all players
    this.broadcastChessState(tableId);
  }

  private handleChessWatch(conn: Party.Connection, data: ChessWatchMessage) {
    const { tableId, spectator } = data;
    const chessState = this.chessTables.get(tableId);
    if (!chessState) return;

    // Add spectator if not already watching
    if (!chessState.spectators.find(s => s.odId === spectator.odId)) {
      chessState.spectators.push(spectator);

      const connPlayer = this.getPlayer(conn);
      if (connPlayer) {
        connPlayer.chessOdId = spectator.odId;
        connPlayer.chessTableId = tableId;
        connPlayer.isSpectating = true;
        this.setPlayer(conn, connPlayer);
      }

      this.broadcastChessState(tableId);
    }
  }

  private handleChessStopWatching(conn: Party.Connection, data: ChessStopWatchingMessage) {
    const { tableId, odId } = data;
    const chessState = this.chessTables.get(tableId);
    if (!chessState) return;

    chessState.spectators = chessState.spectators.filter(s => s.odId !== odId);
    this.broadcastChessState(tableId);
  }

  private handleChessSetGameId(conn: Party.Connection, data: ChessSetGameIdMessage) {
    const { tableId, gameId } = data;
    const chessState = this.chessTables.get(tableId);
    if (!chessState) return;

    chessState.gameId = gameId;
    console.log(`Chess: Game ID set to ${gameId} for table ${tableId}`);
    this.broadcastChessState(tableId);
  }

  private handleChessSetChallengeId(conn: Party.Connection, data: ChessSetChallengeIdMessage) {
    const { tableId, challengeId } = data;
    const chessState = this.chessTables.get(tableId);
    if (!chessState) return;

    chessState.challengeId = challengeId;
    console.log(`Chess: Challenge ID set to ${challengeId} for table ${tableId}`);
    this.broadcastChessState(tableId);
  }

  private broadcastChessState(tableId: string) {
    const chessState = this.chessTables.get(tableId);
    if (!chessState) return;

    const msg: ServerMessage = {
      type: 'chessState',
      tableId,
      state: chessState,
    };
    const json = JSON.stringify(msg);

    for (const conn of this.room.getConnections()) {
      conn.send(json);
    }
  }

  onClose(conn: Party.Connection) {
    const player = this.getPlayer(conn);
    if (player) {
      console.log(`Player left: ${player.id}`);

      // Clean up chess state if this player was in a chess game
      const chessOdId = player.chessOdId;
      const chessTableId = player.chessTableId;

      if (chessOdId && chessTableId) {
        const chessState = this.chessTables.get(chessTableId);
        if (chessState) {
          let changed = false;

          if (player.isSpectating) {
            // Remove from spectators
            chessState.spectators = chessState.spectators.filter(s => s.odId !== chessOdId);
            changed = true;
            console.log(`Chess: Spectator left (${chessOdId}) from ${chessTableId}`);
          } else if (chessState.player1?.odId === chessOdId) {
            if (chessState.player2) {
              chessState.player1 = { ...chessState.player2, side: 'white' };
              chessState.player2 = null;
              chessState.status = 'waiting';
            } else {
              chessState.player1 = null;
              chessState.status = 'empty';
              chessState.gameId = undefined;
              chessState.challengeId = undefined;
            }
            changed = true;
            console.log(`Chess: Player 1 left (${chessOdId}) from ${chessTableId}, status now: ${chessState.status}`);
          } else if (chessState.player2?.odId === chessOdId) {
            chessState.player2 = null;
            chessState.status = 'waiting';
            changed = true;
            console.log(`Chess: Player 2 left (${chessOdId}) from ${chessTableId}, status now: ${chessState.status}`);
          }

          if (changed) {
            this.broadcastChessState(chessTableId);
          }
        }
      }

      // Notify other players about general departure
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
