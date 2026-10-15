import { Peer, type DataConnection } from 'peerjs';
import {
  DEFAULT_PALETTE,
  DEFAULT_SYMBOLS,
  createInitialState,
  dropCoin,
  rematchState,
} from '../engine/gameEngine';
import type { GameConfig, GameState, Player } from '../engine/types';
import { isSupabaseConfigured, supabase } from './supabaseClient';

export interface OnlineRoom {
  id: string;
  code: string;
  hostId: string;
  status: 'lobby' | 'playing' | 'ended';
  players: Player[];
  gameState: GameState | null;
  config: GameConfig;
  createdAt: number;
}

export interface LastMoveEvent {
  col: number;
  playerId: string;
  isWin: boolean;
  isDraw: boolean;
}

export interface CallSignalEvent {
  type: 'CALL_INVITE' | 'CALL_ACCEPTED' | 'CALL_DECLINED' | 'CALL_CANCELLED' | 'CALL_ENDED';
  callerId?: string;
  callerName?: string;
  callerAvatar?: string;
  callerColor?: string;
  answererId?: string;
  answererName?: string;
  roomCode?: string;
}

export type CallSignalCallback = (event: CallSignalEvent) => void;

export type RoomEventCallback = (room: OnlineRoom, lastMove?: LastMoveEvent) => void;

/**
 * Returns a unique player ID for the current browser tab.
 * Uses sessionStorage so separate tabs in the same browser are distinct players.
 */
export function getLocalPlayerId(): string {
  if (typeof window === 'undefined') return 'usr_guest';
  let id = sessionStorage.getItem('throw_it_tab_player_id');
  if (!id) {
    id = `usr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    sessionStorage.setItem('throw_it_tab_player_id', id);
  }
  return id;
}

class OnlineRoomManager {
  private activeRoom: OnlineRoom | null = null;
  private listeners: Set<RoomEventCallback> = new Set();
  private callListeners: Set<CallSignalCallback> = new Set();
  private broadcastChannel: BroadcastChannel | null = null;
  private supabaseChannel: any = null;
  private peer: Peer | null = null;
  private guestConnections: Map<string, DataConnection> = new Map();
  private hostConnection: DataConnection | null = null;

  public subscribe(cb: RoomEventCallback): () => void {
    this.listeners.add(cb);
    if (this.activeRoom) cb(this.activeRoom);
    return () => this.listeners.delete(cb);
  }

  public subscribeCall(cb: CallSignalCallback): () => void {
    this.callListeners.add(cb);
    return () => this.callListeners.delete(cb);
  }

  public notifyCallSignal(event: CallSignalEvent) {
    this.callListeners.forEach((cb) => cb(event));
  }

  public sendCallSignal(event: CallSignalEvent) {
    // 1. BroadcastChannel
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ type: 'CALL_SIGNAL', signal: event });
      } catch (err) {
        console.warn('BroadcastChannel call signal error:', err);
      }
    }

    // 2. PeerJS DataConnections (to all guests if host)
    this.guestConnections.forEach((conn) => {
      if (conn.open) {
        try {
          conn.send({ type: 'CALL_SIGNAL', signal: event });
        } catch (err) {
          console.warn('PeerJS call signal error:', err);
        }
      }
    });

    // 3. Host connection (if guest)
    if (this.hostConnection && this.hostConnection.open) {
      try {
        this.hostConnection.send({ type: 'CALL_SIGNAL', signal: event });
      } catch (err) {
        console.warn('Host connection call signal error:', err);
      }
    }
  }

  public getPeer(): Peer | null {
    return this.peer;
  }

  public getHostPeerId(code: string): string {
    return `throwit-${code.toLowerCase()}`;
  }

  private notify(lastMove?: LastMoveEvent) {
    if (!this.activeRoom) return;
    this.listeners.forEach((cb) => cb(this.activeRoom!, lastMove));
  }

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  public getActiveRoom(): OnlineRoom | null {
    return this.activeRoom;
  }

  /**
   * Broadcasts room update across all active transports:
   * 1. BroadcastChannel (local multi-tab)
   * 2. PeerJS DataConnections (P2P cross-device)
   * 3. Supabase Realtime (if credentials configured)
   */
  private broadcastUpdate(payload: { type: string; room: OnlineRoom; lastMove?: LastMoveEvent }) {
    this.activeRoom = payload.room;
    this.notify(payload.lastMove);

    // 1. Save to localStorage for instant local multi-tab recovery
    try {
      localStorage.setItem(`throw_it_saved_room_${payload.room.code}`, JSON.stringify(payload.room));
    } catch {
      // Ignore quota errors
    }

    // 2. BroadcastChannel (same browser / multi-tab)
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(payload);
      } catch (err) {
        console.warn('BroadcastChannel error:', err);
      }
    }

    // 3. PeerJS DataConnections to connected guests
    this.guestConnections.forEach((conn) => {
      if (conn.open) {
        try {
          conn.send(payload);
        } catch (err) {
          console.warn('PeerJS send error:', err);
        }
      }
    });

    // 4. Supabase broadcast if available
    if (isSupabaseConfigured && supabase && this.supabaseChannel) {
      try {
        this.supabaseChannel.send({
          type: 'broadcast',
          event: 'room_sync',
          payload,
        });
      } catch (err) {
        console.warn('Supabase broadcast error:', err);
      }
    }
  }

  /**
   * Assigns a distinct color and symbol to avoid visual confusion
   */
  private assignDistinctAttributes(existingPlayers: Player[], candidate: Player): Player {
    const usedColors = new Set(existingPlayers.map((p) => p.color.toLowerCase()));
    let color = candidate.color;
    if (usedColors.has(color.toLowerCase())) {
      const available = DEFAULT_PALETTE.find((c) => !usedColors.has(c.toLowerCase()));
      color = available || DEFAULT_PALETTE[existingPlayers.length % DEFAULT_PALETTE.length];
    }

    const symbol = DEFAULT_SYMBOLS[existingPlayers.length % DEFAULT_SYMBOLS.length];
    return {
      ...candidate,
      color,
      symbol,
    };
  }

  /**
   * Host creates a new online room
   */
  public async createRoom(host: Player, config: Partial<GameConfig>): Promise<OnlineRoom> {
    this.cleanupTransports();

    const code = this.generateRoomCode();
    const id = `room_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const newRoom: OnlineRoom = {
      id,
      code,
      hostId: host.id,
      status: 'lobby',
      players: [{ ...host, isReady: true, score: 0 }],
      gameState: null,
      config: {
        rows: config.rows ?? 6,
        cols: config.cols ?? 7,
        connectTarget: 4,
        turnTimeoutSeconds: config.turnTimeoutSeconds ?? 0,
        handoffPrivacy: false,
      },
      createdAt: Date.now(),
    };

    this.activeRoom = newRoom;
    this.setupHostTransports(newRoom);
    this.broadcastUpdate({ type: 'ROOM_SYNC', room: newRoom });
    return newRoom;
  }

  /**
   * Sets up transports for the Host
   */
  private setupHostTransports(room: OnlineRoom) {
    const code = room.code;

    // 1. BroadcastChannel for local tabs
    try {
      this.broadcastChannel = new BroadcastChannel(`throw_it_room_${code}`);
      this.broadcastChannel.onmessage = (event) => {
        const data = event.data;
        if (!data || !this.activeRoom) return;

        if (data.type === 'JOIN_REQUEST' && data.player) {
          this.handlePlayerJoin(data.player);
        } else if (data.type === 'SUBMIT_MOVE' && data.col !== undefined && data.playerId) {
          try {
            this.submitMove(data.playerId, data.col);
          } catch (err) {
            console.warn('Move rejected:', err);
          }
        } else if (data.type === 'PLAYER_LEAVE' && data.playerId) {
          this.handlePlayerLeave(data.playerId);
        } else if (data.type === 'CALL_SIGNAL' && data.signal) {
          this.notifyCallSignal(data.signal);
        }
      };
    } catch (err) {
      console.warn('BroadcastChannel unavailable:', err);
    }

    // 2. PeerJS for cross-device P2P
    try {
      const peerId = `throwit-${code.toLowerCase()}`;
      this.peer = new Peer(peerId);

      this.peer.on('open', () => {
        // Host peer listening
      });

      this.peer.on('connection', (conn) => {
        conn.on('open', () => {
          this.guestConnections.set(conn.peer, conn);
          // Send initial room state
          if (this.activeRoom) {
            conn.send({ type: 'ROOM_SYNC', room: this.activeRoom });
          }
        });

        conn.on('data', (data: any) => {
          if (!data || !this.activeRoom) return;
          if (data.type === 'JOIN_REQUEST' && data.player) {
            this.handlePlayerJoin(data.player);
          } else if (data.type === 'SUBMIT_MOVE' && data.col !== undefined && data.playerId) {
            try {
              this.submitMove(data.playerId, data.col);
            } catch (err) {
              console.warn('Move error:', err);
            }
          } else if (data.type === 'PLAYER_LEAVE' && data.playerId) {
            this.handlePlayerLeave(data.playerId);
          } else if (data.type === 'CALL_SIGNAL' && data.signal) {
            this.notifyCallSignal(data.signal);
            // Relay to other guests
            this.guestConnections.forEach((otherConn) => {
              if (otherConn !== conn && otherConn.open) {
                try {
                  otherConn.send(data);
                } catch {
                  // Ignore
                }
              }
            });
          }
        });

        conn.on('close', () => {
          this.guestConnections.delete(conn.peer);
        });

        conn.on('error', (err) => {
          console.warn('Guest connection error:', err);
          this.guestConnections.delete(conn.peer);
        });
      });

      this.peer.on('error', (err) => {
        console.warn('Host PeerJS warning:', err);
      });
    } catch (err) {
      console.warn('PeerJS init failed:', err);
    }

    // 3. Supabase Realtime if configured
    if (isSupabaseConfigured && supabase) {
      try {
        this.supabaseChannel = supabase
          .channel(`room_${code}`)
          .on('broadcast', { event: 'room_sync' }, (payload: any) => {
            const data = payload.payload;
            if (data?.type === 'JOIN_REQUEST' && data.player) {
              this.handlePlayerJoin(data.player);
            } else if (data?.type === 'SUBMIT_MOVE') {
              this.submitMove(data.playerId, data.col);
            }
          })
          .subscribe();
      } catch (err) {
        console.warn('Supabase channel error:', err);
      }
    }
  }

  /**
   * Host processes a player joining
   */
  private handlePlayerJoin(player: Player) {
    if (!this.activeRoom || this.activeRoom.status !== 'lobby') return;
    if (this.activeRoom.players.length >= 7) return;

    const existingIdx = this.activeRoom.players.findIndex((p) => p.id === player.id);
    if (existingIdx >= 0) {
      this.activeRoom.players[existingIdx] = {
        ...this.activeRoom.players[existingIdx],
        ...player,
      };
    } else {
      const distinctPlayer = this.assignDistinctAttributes(this.activeRoom.players, player);
      this.activeRoom.players.push({ ...distinctPlayer, isReady: true, score: 0 });
    }

    this.broadcastUpdate({ type: 'ROOM_SYNC', room: this.activeRoom });
  }

  /**
   * Host processes player leaving
   */
  private handlePlayerLeave(playerId: string) {
    if (!this.activeRoom) return;
    this.activeRoom.players = this.activeRoom.players.filter((p) => p.id !== playerId);
    if (this.activeRoom.players.length > 0) {
      if (this.activeRoom.hostId === playerId) {
        this.activeRoom.hostId = this.activeRoom.players[0].id;
      }
      this.broadcastUpdate({ type: 'ROOM_SYNC', room: this.activeRoom });
    } else {
      this.activeRoom = null;
      this.cleanupTransports();
    }
  }

  /**
   * Guest joins an existing room by code
   */
  public async joinRoom(code: string, player: Player): Promise<OnlineRoom> {
    this.cleanupTransports();

    const cleanCode = code.trim().toUpperCase();

    // Set up BroadcastChannel first
    try {
      this.broadcastChannel = new BroadcastChannel(`throw_it_room_${cleanCode}`);
      this.broadcastChannel.onmessage = (event) => {
        const data = event.data;
        if (data && (data.type === 'ROOM_SYNC' || data.type === 'GAME_START')) {
          this.activeRoom = data.room;
          this.notify(data.lastMove);
        } else if (data?.type === 'CALL_SIGNAL' && data.signal) {
          this.notifyCallSignal(data.signal);
        }
      };
    } catch (err) {
      console.warn('BroadcastChannel error:', err);
    }

    // Check localStorage (immediate multi-tab sync)
    let foundRoom: OnlineRoom | null = null;
    const saved = localStorage.getItem(`throw_it_saved_room_${cleanCode}`);
    if (saved) {
      try {
        foundRoom = JSON.parse(saved);
      } catch {
        foundRoom = null;
      }
    }

    if (foundRoom) {
      if (foundRoom.players.length >= 7) {
        throw new Error('This room has reached the maximum capacity of 7 players.');
      }
      if (foundRoom.status === 'playing') {
        throw new Error('This match has already begun.');
      }

      // Add guest to room
      const existingIdx = foundRoom.players.findIndex((p) => p.id === player.id);
      let distinctPlayer = player;
      if (existingIdx >= 0) {
        foundRoom.players[existingIdx] = { ...foundRoom.players[existingIdx], ...player };
      } else {
        distinctPlayer = this.assignDistinctAttributes(foundRoom.players, player);
        foundRoom.players.push({ ...distinctPlayer, isReady: true, score: 0 });
      }

      this.activeRoom = foundRoom;
      localStorage.setItem(`throw_it_saved_room_${cleanCode}`, JSON.stringify(foundRoom));

      // Notify host tab via BroadcastChannel
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({
          type: 'JOIN_REQUEST',
          player: distinctPlayer,
          room: foundRoom,
        });
        this.broadcastChannel.postMessage({
          type: 'ROOM_SYNC',
          room: foundRoom,
        });
      }

      this.notify();
      this.setupGuestTransports(cleanCode, distinctPlayer);
      return foundRoom;
    }

    // If not found in localStorage (cross-device connection), connect via PeerJS
    return new Promise<OnlineRoom>((resolve, reject) => {
      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          reject(new Error(`Room "${cleanCode}" not found. Verify the 6-character code with the host.`));
        }
      }, 5000);

      try {
        this.peer = new Peer();

        this.peer.on('open', () => {
          const hostPeerId = `throwit-${cleanCode.toLowerCase()}`;
          const conn = this.peer!.connect(hostPeerId);
          this.hostConnection = conn;

          conn.on('open', () => {
            conn.send({ type: 'JOIN_REQUEST', player, code: cleanCode });
          });

          conn.on('data', (data: any) => {
            if (data?.type === 'ROOM_SYNC' || data?.type === 'GAME_START') {
              this.activeRoom = data.room;
              this.notify(data.lastMove);
              if (!resolved) {
                resolved = true;
                clearTimeout(timeout);
                resolve(data.room);
              }
            } else if (data?.type === 'CALL_SIGNAL' && data.signal) {
              this.notifyCallSignal(data.signal);
            }
          });

          conn.on('error', (err) => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              reject(new Error(`Could not connect to room "${cleanCode}". ${err.message}`));
            }
          });
        });

        this.peer.on('error', (err) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            reject(new Error(`Connection error: ${err.message}`));
          }
        });
      } catch (err: any) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          reject(new Error(err.message || 'Failed to initialize peer connection.'));
        }
      }
    });
  }

  /**
   * Sets up guest background transports for cross-device support
   */
  private setupGuestTransports(code: string, player: Player) {
    try {
      if (!this.peer) {
        this.peer = new Peer();
        this.peer.on('open', () => {
          const hostPeerId = `throwit-${code.toLowerCase()}`;
          const conn = this.peer!.connect(hostPeerId);
          this.hostConnection = conn;

          conn.on('open', () => {
            conn.send({ type: 'JOIN_REQUEST', player, code });
          });

          conn.on('data', (data: any) => {
            if (data?.type === 'ROOM_SYNC' || data?.type === 'GAME_START') {
              this.activeRoom = data.room;
              this.notify(data.lastMove);
            } else if (data?.type === 'CALL_SIGNAL' && data.signal) {
              this.notifyCallSignal(data.signal);
            }
          });
        });
      }
    } catch {
      // Local fallback
    }
  }

  /**
   * Host starts the online match
   */
  public startMatch(hostId: string) {
    if (!this.activeRoom) return;
    if (this.activeRoom.hostId !== hostId && this.activeRoom.hostId !== 'host_pending') {
      throw new Error('Only the room host can start the match.');
    }
    if (this.activeRoom.players.length < 2) {
      throw new Error('At least 2 players are required to start.');
    }

    const state = createInitialState(this.activeRoom.players, this.activeRoom.config, 'online');
    this.activeRoom.status = 'playing';
    this.activeRoom.gameState = state;

    this.broadcastUpdate({
      type: 'GAME_START',
      room: this.activeRoom,
    });
  }

  /**
   * Submits a move (either as host or relayed to host)
   */
  public submitMove(playerId: string, col: number) {
    if (!this.activeRoom || !this.activeRoom.gameState) return;
    const currentState = this.activeRoom.gameState;

    if (currentState.status !== 'playing') {
      throw new Error('Match is not currently in progress.');
    }

    const activePlayer = currentState.players[currentState.currentTurnIndex];
    if (activePlayer.id !== playerId) {
      throw new Error('It is not your turn.');
    }

    // Execute dropCoin
    const result = dropCoin(currentState, col, playerId);
    this.activeRoom.gameState = result.state;
    if (result.isWin || result.isDraw) {
      this.activeRoom.status = 'ended';
    }

    const lastMove: LastMoveEvent = {
      col,
      playerId,
      isWin: result.isWin,
      isDraw: result.isDraw,
    };

    // If we have an active host connection (we are a guest), send to host
    if (this.hostConnection && this.hostConnection.open) {
      this.hostConnection.send({
        type: 'SUBMIT_MOVE',
        col,
        playerId,
      });
    }

    this.broadcastUpdate({
      type: 'ROOM_SYNC',
      room: this.activeRoom,
      lastMove,
    });
  }

  /**
   * Rematch online room
   */
  public triggerRematch() {
    if (!this.activeRoom || !this.activeRoom.gameState) return;
    const nextState = rematchState(this.activeRoom.gameState);
    this.activeRoom.status = 'playing';
    this.activeRoom.gameState = nextState;

    this.broadcastUpdate({
      type: 'ROOM_SYNC',
      room: this.activeRoom,
    });
  }

  /**
   * Leaves room and cleans up
   */
  public leaveRoom(playerId: string) {
    if (!this.activeRoom) return;

    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: 'PLAYER_LEAVE',
        playerId,
      });
    }

    if (this.hostConnection && this.hostConnection.open) {
      this.hostConnection.send({
        type: 'PLAYER_LEAVE',
        playerId,
      });
    }

    this.handlePlayerLeave(playerId);
    this.cleanupTransports();
    this.activeRoom = null;
  }

  private cleanupTransports() {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.close();
      } catch {
        // Ignore
      }
      this.broadcastChannel = null;
    }

    if (this.hostConnection) {
      try {
        this.hostConnection.close();
      } catch {
        // Ignore
      }
      this.hostConnection = null;
    }

    this.guestConnections.forEach((conn) => {
      try {
        conn.close();
      } catch {
        // Ignore
      }
    });
    this.guestConnections.clear();

    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {
        // Ignore
      }
      this.peer = null;
    }

    if (this.supabaseChannel && supabase) {
      try {
        supabase.removeChannel(this.supabaseChannel);
      } catch {
        // Ignore
      }
      this.supabaseChannel = null;
    }
  }
}

export const onlineManager = new OnlineRoomManager();
