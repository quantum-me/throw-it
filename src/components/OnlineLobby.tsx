import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  Crown,
  Globe,
  Play,
  Share2,
  Users,
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import {
  DEFAULT_AVATARS,
  DEFAULT_COLS,
  DEFAULT_PALETTE,
  DEFAULT_ROWS,
  DEFAULT_SYMBOLS,
} from '../engine/gameEngine';
import type { Player } from '../engine/types';
import { onlineManager } from '../online/onlineRoomManager';
import type { OnlineRoom } from '../online/onlineRoomManager';
import { isSupabaseConfigured } from '../online/supabaseClient';
import { ColorPalettePicker } from './ColorPalettePicker';
import { AvatarIcon } from './SetupWizard';

export const OnlineLobby: React.FC = () => {
  const { setView, setGameState } = useGame();

  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [currentRoom, setCurrentRoom] = useState<OnlineRoom | null>(null);

  // Player input info
  const [playerName, setPlayerName] = useState<string>(() => {
    return localStorage.getItem('throw_it_player_name') || 'Guest Player';
  });
  const [selectedColor, setSelectedColor] = useState<string>(DEFAULT_PALETTE[0]);
  const [selectedAvatar, setSelectedAvatar] = useState<string>('crown');
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check URL params for invite link (?room=CODE)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room');
      if (roomParam) {
        setJoinCodeInput(roomParam.toUpperCase());
        setActiveTab('join');
      }
    }
  }, []);

  // Subscribe to online room manager events
  useEffect(() => {
    const unsubscribe = onlineManager.subscribe((room) => {
      setCurrentRoom(room);
      if (room.status === 'playing' && room.gameState) {
        setGameState(room.gameState);
        setView('game');
      }
    });
    return unsubscribe;
  }, [setGameState, setView]);

  const localPlayerId = React.useMemo(() => {
    let id = localStorage.getItem('throw_it_local_player_id');
    if (!id) {
      id = `usr_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('throw_it_local_player_id', id);
    }
    return id;
  }, []);

  const handleCreateRoom = async () => {
    setErrorMessage(null);
    try {
      localStorage.setItem('throw_it_player_name', playerName);
      const hostPlayer: Player = {
        id: localPlayerId,
        name: playerName,
        color: selectedColor,
        symbol: DEFAULT_SYMBOLS[0],
        avatar: selectedAvatar,
        score: 0,
        isReady: true,
      };

      const room = await onlineManager.createRoom(hostPlayer, {
        rows: DEFAULT_ROWS,
        cols: DEFAULT_COLS,
        turnTimeoutSeconds: 30,
      });
      setCurrentRoom(room);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create room.');
    }
  };

  const handleJoinRoom = async () => {
    if (!joinCodeInput.trim()) {
      setErrorMessage('Please enter a valid 6-character room code.');
      return;
    }
    setErrorMessage(null);

    try {
      localStorage.setItem('throw_it_player_name', playerName);
      const joinPlayer: Player = {
        id: localPlayerId,
        name: playerName,
        color: selectedColor,
        symbol: DEFAULT_SYMBOLS[1],
        avatar: selectedAvatar,
        score: 0,
        isReady: true,
      };

      const room = await onlineManager.joinRoom(joinCodeInput, joinPlayer);
      setCurrentRoom(room);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to join room.');
    }
  };

  const handleCopyInviteLink = () => {
    if (!currentRoom) return;
    const url = `${window.location.origin}${window.location.pathname}?room=${currentRoom.code}`;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleCopyCode = () => {
    if (!currentRoom) return;
    navigator.clipboard.writeText(currentRoom.code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleStartMatch = () => {
    if (!currentRoom) return;
    try {
      onlineManager.startMatch(localPlayerId);
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const handleLeaveLobby = () => {
    if (currentRoom) {
      onlineManager.leaveRoom(localPlayerId);
      setCurrentRoom(null);
    } else {
      setView('home');
    }
  };

  const isHost = currentRoom?.hostId === localPlayerId || currentRoom?.hostId === 'host_pending';

  return (
    <div className="flex-1 max-w-2xl mx-auto px-4 py-8 w-full flex flex-col justify-center">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={handleLeaveLobby}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-game-surfaceLight dark:hover:bg-game-border text-slate-700 dark:text-slate-300 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Globe className="w-6 h-6 text-emerald-500 dark:text-emerald-400" />
              Online Multiplayer Rooms
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Create a match, share room code or link, and play in real-time.
            </p>
          </div>
        </div>
      </div>

      {/* Backend Status Notice */}
      {!isSupabaseConfigured && (
        <div className="mb-4 p-3.5 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/60 text-cyan-900 dark:text-cyan-200 text-xs flex flex-col gap-1 shadow-sm">
          <div className="flex items-center gap-2 font-bold text-cyan-700 dark:text-cyan-300">
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
            Active Realtime Mode (Multi-Tab & LAN Peer Sync)
          </div>
          <p className="text-slate-600 dark:text-slate-300">
            Throw It is running with active BroadcastChannel sync. You can test multiplayer immediately across separate browser tabs/windows! To connect distant players over the public internet, add your Supabase credentials to <code className="bg-slate-200 dark:bg-slate-900 px-1 py-0.5 rounded text-cyan-800 dark:text-cyan-300">.env</code>.
          </p>
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-500/15 border border-red-200 dark:border-red-500/40 text-red-700 dark:text-red-300 text-xs font-semibold">
          {errorMessage}
        </div>
      )}

      {/* VIEW A: Room Lobby (Once inside a room) */}
      {currentRoom ? (
        <div className="p-6 rounded-3xl bg-white dark:bg-game-surface border border-slate-200 dark:border-game-border flex flex-col gap-5 shadow-2xl">
          {/* Room Code & Share Banner */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-game-surfaceLight border border-slate-200 dark:border-game-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Room Invitation Code
              </span>
              <div className="text-3xl font-black tracking-widest text-cyan-600 dark:text-cyan-400 mt-0.5">
                {currentRoom.code}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyCode}
                className="py-2 px-3 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-game-border dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
              >
                {isCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                Copy Code
              </button>
              <button
                onClick={handleCopyInviteLink}
                className="py-2 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-cyan-500/20"
              >
                <Share2 className="w-4 h-4" />
                Copy Link
              </button>
            </div>
          </div>

          {/* Connected Players in Room */}
          <div>
            <div className="flex items-center justify-between mb-3 text-sm font-bold text-slate-800 dark:text-slate-300">
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                Players in Room ({currentRoom.players.length}/7)
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">Min 2 required</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {currentRoom.players.map((p, idx) => (
                <div
                  key={p.id}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-game-surfaceLight border border-slate-200 dark:border-slate-700/60 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white shrink-0 relative shadow-sm"
                      style={{ backgroundColor: p.color }}
                    >
                      <AvatarIcon avatar={p.avatar} className="w-4 h-4" />
                    </span>
                    <div className="truncate">
                      <div className="text-sm font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                        <span>{p.name}</span>
                        {p.id === currentRoom.hostId && (
                          <span title="Host"><Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" /></span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {p.id === localPlayerId ? 'You' : `Player ${idx + 1}`}
                      </span>
                    </div>
                  </div>

                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                    Ready
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Lobby Actions */}
          <div className="pt-2 flex flex-col gap-2.5">
            {isHost ? (
              <button
                onClick={handleStartMatch}
                disabled={currentRoom.players.length < 2}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-base shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
              >
                <Play className="w-5 h-5 fill-current" />
                START ONLINE MATCH
              </button>
            ) : (
              <div className="text-center py-3 text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">
                Waiting for room host to start the game...
              </div>
            )}

            <button
              onClick={handleLeaveLobby}
              className="w-full py-2.5 text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 font-semibold transition"
            >
              Leave Room
            </button>
          </div>
        </div>
      ) : (
        /* VIEW B: Create or Join Mode Tabs */
        <div className="p-6 rounded-3xl bg-white dark:bg-game-surface border border-slate-200 dark:border-game-border flex flex-col gap-5 shadow-2xl">
          {/* Player Profile Inputs */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-game-surfaceLight border border-slate-200 dark:border-game-border flex flex-col gap-3">
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Your Player Profile
            </h4>
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={16}
                placeholder="Enter your name"
                className="w-full sm:flex-1 bg-white dark:bg-game-surface border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-cyan-400"
              />

              {/* Avatar Selector */}
              <div className="flex items-center gap-1 bg-white dark:bg-game-surface p-1 rounded-xl border border-slate-200 dark:border-slate-700/60">
                {DEFAULT_AVATARS.slice(0, 5).map((av) => (
                  <button
                    key={av}
                    onClick={() => setSelectedAvatar(av)}
                    className={`p-1.5 rounded-lg ${
                      selectedAvatar === av
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <AvatarIcon avatar={av} className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>

            {/* Color Palette Picker */}
            <ColorPalettePicker
              selectedColor={selectedColor}
              onSelectColor={setSelectedColor}
              label="Coin Color (Presets or Spectrum)"
            />
          </div>

          {/* Action Tabs: Create Room vs Join Room */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-game-surfaceLight rounded-2xl border border-slate-200 dark:border-game-border">
            <button
              onClick={() => setActiveTab('create')}
              className={`py-2.5 text-xs sm:text-sm font-black rounded-xl transition ${
                activeTab === 'create'
                  ? 'bg-cyan-500 text-slate-950 shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Create New Room
            </button>
            <button
              onClick={() => setActiveTab('join')}
              className={`py-2.5 text-xs sm:text-sm font-black rounded-xl transition ${
                activeTab === 'join'
                  ? 'bg-cyan-500 text-slate-950 shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Join by Code
            </button>
          </div>

          {/* Tab 1: Create Room */}
          {activeTab === 'create' && (
            <div className="flex flex-col gap-4 text-center">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                You will become the room host. Once created, you will receive a 6-character room code and a shareable invitation link.
              </p>
              <button
                onClick={handleCreateRoom}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black text-sm shadow-lg shadow-cyan-500/20 active:scale-95 transition"
              >
                CREATE ROOM & INVITE FRIENDS
              </button>
            </div>
          )}

          {/* Tab 2: Join Room */}
          {activeTab === 'join' && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 block">
                  Enter 6-Character Room Code:
                </label>
                <input
                  type="text"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  placeholder="e.g. DROP7X"
                  maxLength={6}
                  className="w-full text-center tracking-widest text-xl font-black bg-slate-50 dark:bg-game-surfaceLight border-2 border-slate-300 dark:border-slate-700 rounded-2xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-400 uppercase"
                />
              </div>

              <button
                onClick={handleJoinRoom}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/20 active:scale-95 transition"
              >
                JOIN ROOM
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
