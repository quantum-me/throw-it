import {
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

export type RoomEventCallback = (room: OnlineRoom) => void;

class OnlineRoomManager {
  private activeRoom: OnlineRoom | null = null;
  private listeners: Set<RoomEventCallback> = new Set();
  private broadcastChannel: BroadcastChannel | null = null;
  private supabaseChannel: any = null;

  public subscribe(cb: RoomEventCallback): () => void {
    this.listeners.add(cb);
    if (this.activeRoom) cb(this.activeRoom);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    if (!this.activeRoom) return;
    this.listeners.forEach((cb) => cb(this.activeRoom!));
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
   * Initializes channel synchronization (Supabase Realtime + local BroadcastChannel)
   */
  private setupSync(code: string) {
    if (typeof window === 'undefined') return;

    // 1. Local BroadcastChannel for instant multi-tab testing
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
    }
    try {
      this.broadcastChannel = new BroadcastChannel(`throw_it_room_${code}`);
      this.broadcastChannel.onmessage = (event) => {
        if (event.data && event.data.room) {
          this.activeRoom = event.data.room;
          this.notify();
        }
      };
    } catch {
      // BroadcastChannel fallback
    }

    // 2. Supabase Realtime channel if credentials exist
    if (isSupabaseConfigured && supabase) {
      if (this.supabaseChannel) {
        supabase.removeChannel(this.supabaseChannel);
      }

      this.supabaseChannel = supabase.channel(`room_${code}`)
        .on('broadcast', { event: 'room_sync' }, (payload: any) => {
          if (payload.payload && payload.payload.room) {
            this.activeRoom = payload.payload.room;
            this.notify();
          }
        })
        .subscribe();
    }
  }

  /**
   * Broadcasts room update to peers
   */
  private broadcastUpdate() {
    if (!this.activeRoom) return;
    this.notify();

    // Broadcast across tabs
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ room: this.activeRoom });
    }

    // Save to localStorage for recovery
    localStorage.setItem(`throw_it_saved_room_${this.activeRoom.code}`, JSON.stringify(this.activeRoom));

    // Broadcast via Supabase
    if (isSupabaseConfigured && supabase && this.supabaseChannel) {
      this.supabaseChannel.send({
        type: 'broadcast',
        event: 'room_sync',
        payload: { room: this.activeRoom },
      });
    }
  }

  /**
   * Creates a new online multiplayer room
   */
  public async createRoom(host: Player, config: Partial<GameConfig>): Promise<OnlineRoom> {
    const code = this.generateRoomCode();
    const id = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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
    this.setupSync(code);
    this.broadcastUpdate();
    return newRoom;
  }

  /**
   * Joins an existing room by code
   */
  public async joinRoom(code: string, player: Player): Promise<OnlineRoom> {
    const cleanCode = code.trim().toUpperCase();
    this.setupSync(cleanCode);

    // Check localStorage or cached room
    let room = this.activeRoom;
    if (!room || room.code !== cleanCode) {
      const saved = localStorage.getItem(`throw_it_saved_room_${cleanCode}`);
      if (saved) {
        room = JSON.parse(saved);
      }
    }

    if (!room) {
      // Create guest session placeholder if connecting
      room = {
        id: `room_${cleanCode}`,
        code: cleanCode,
        hostId: 'host_pending',
        status: 'lobby',
        players: [],
        gameState: null,
        config: { rows: 6, cols: 7, connectTarget: 4, turnTimeoutSeconds: 0, handoffPrivacy: false },
        createdAt: Date.now(),
      };
    }

    if (room.players.length >= 7) {
      throw new Error('This room has reached the maximum capacity of 7 players.');
    }

    if (room.status === 'playing') {
      throw new Error('This match has already begun.');
    }

    // Check if player already in room
    const existingIndex = room.players.findIndex((p) => p.id === player.id);
    if (existingIndex >= 0) {
      room.players[existingIndex] = { ...room.players[existingIndex], ...player };
    } else {
      room.players.push({ ...player, isReady: false, score: 0 });
    }

    this.activeRoom = room;
    this.broadcastUpdate();
    return room;
  }

  /**
   * Toggles player ready status in lobby
   */
  public setReady(playerId: string, isReady: boolean) {
    if (!this.activeRoom) return;
    this.activeRoom.players = this.activeRoom.players.map((p) =>
      p.id === playerId ? { ...p, isReady } : p
    );
    this.broadcastUpdate();
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
    this.broadcastUpdate();
  }

  /**
   * Submits an authoritative move for validation and broadcast
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

    const result = dropCoin(currentState, col, playerId);
    this.activeRoom.gameState = result.state;
    if (result.isWin || result.isDraw) {
      this.activeRoom.status = 'ended';
    }

    this.broadcastUpdate();
  }

  /**
   * Rematch online room
   */
  public triggerRematch() {
    if (!this.activeRoom || !this.activeRoom.gameState) return;
    const nextState = rematchState(this.activeRoom.gameState);
    this.activeRoom.status = 'playing';
    this.activeRoom.gameState = nextState;
    this.broadcastUpdate();
  }

  /**
   * Leaves room and cleans up
   */
  public leaveRoom(playerId: string) {
    if (!this.activeRoom) return;
    this.activeRoom.players = this.activeRoom.players.filter((p) => p.id !== playerId);
    if (this.activeRoom.players.length === 0) {
      this.activeRoom = null;
    } else {
      // If host left, pass host to next player
      if (this.activeRoom.hostId === playerId) {
        this.activeRoom.hostId = this.activeRoom.players[0].id;
      }
      this.broadcastUpdate();
    }

    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
    if (this.supabaseChannel && supabase) {
      supabase.removeChannel(this.supabaseChannel);
      this.supabaseChannel = null;
    }
  }
}

export const onlineManager = new OnlineRoomManager();
