import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  Crown,
  Globe,
  Loader2,
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
import { getLocalPlayerId, onlineManager } from '../online/onlineRoomManager';
import type { OnlineRoom } from '../online/onlineRoomManager';
import { isSupabaseConfigured } from '../online/supabaseClient';
import { ColorPalettePicker } from './ColorPalettePicker';
import { AvatarIcon } from './SetupWizard';

export const OnlineLobby: React.FC = () => {
  const { setView, setGameState } = useGame();

  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [currentRoom, setCurrentRoom] = useState<OnlineRoom | null>(() => onlineManager.getActiveRoom());

  // Player input info
  const localPlayerId = React.useMemo(() => getLocalPlayerId(), []);

  const [playerName, setPlayerName] = useState<string>(() => {
    return localStorage.getItem('throw_it_player_name') || `Player ${Math.floor(Math.random() * 899 + 100)}`;
  });
  const [selectedColor, setSelectedColor] = useState<string>(DEFAULT_PALETTE[0]);
  const [selectedAvatar, setSelectedAvatar] = useState<string>('crown');
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isJoining, setIsJoining] = useState<boolean>(false);
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
      setCurrentRoom({ ...room });
      if (room.status === 'playing' && room.gameState) {
        setGameState(room.gameState);
        setView('game');
      }
    });
    return unsubscribe;
  }, [setGameState, setView]);

  const handleCreateRoom = async () => {
    setErrorMessage(null);
    try {
      localStorage.setItem('throw_it_player_name', playerName);
      const hostPlayer: Player = {
        id: localPlayerId,
        name: playerName.trim() || 'Host Player',
        color: selectedColor,
        symbol: DEFAULT_SYMBOLS[0],
        avatar: selectedAvatar,
        score: 0,
        isReady: true,
      };

      const room = await onlineManager.createRoom(hostPlayer, {
        rows: DEFAULT_ROWS,
        cols: DEFAULT_COLS,
        turnTimeoutSeconds: 0,
      });
      setCurrentRoom({ ...room });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create room.');
    }
  };

  const handleJoinRoom = async () => {
    const code = joinCodeInput.trim().toUpperCase();
    if (!code || code.length < 4) {
      setErrorMessage('Please enter a valid room code (e.g. DROP7X).');
      return;
    }
    setErrorMessage(null);
    setIsJoining(true);

    try {
      localStorage.setItem('throw_it_player_name', playerName);
      const joinPlayer: Player = {
        id: localPlayerId,
        name: playerName.trim() || 'Guest Player',
        color: selectedColor,
        symbol: DEFAULT_SYMBOLS[1],
        avatar: selectedAvatar,
        score: 0,
        isReady: true,
      };

      const room = await onlineManager.joinRoom(code, joinPlayer);
      setCurrentRoom({ ...room });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to join room.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleCopyInviteLink = () => {
    if (!currentRoom) return;
    const cleanUrl = `${window.location.origin}${window.location.pathname}?room=${currentRoom.code}`;
    navigator.clipboard.writeText(cleanUrl);
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
    setErrorMessage(null);
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

  const isHost = currentRoom ? currentRoom.hostId === localPlayerId : false;
  const canStart = currentRoom ? currentRoom.players.length >= 2 : false;

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
              Create a match, share room code or link, and battle live.
            </p>
          </div>
        </div>
      </div>

      {/* Network Sync Notice */}
      <div className="mb-4 p-3.5 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/60 text-cyan-900 dark:text-cyan-200 text-xs flex flex-col gap-1 shadow-sm">
        <div className="flex items-center gap-2 font-bold text-cyan-700 dark:text-cyan-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          Live Realtime Multiplayer Ready
        </div>
        <p className="text-slate-600 dark:text-slate-300">
          Syncs instantly across multiple browser tabs and windows on your computer, as well as P2P WebRTC across devices!
          {isSupabaseConfigured && ' Supabase cloud sync is active.'}
        </p>
      </div>

      {errorMessage && (
        <div className="mb-4 p-3.5 rounded-xl bg-red-50 dark:bg-red-500/15 border border-red-200 dark:border-red-500/40 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center justify-between">
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-500 hover:text-red-700 dark:hover:text-red-200 font-bold ml-2 text-sm"
          >
            ✕
          </button>
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
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                canStart
                  ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                  : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'
              }`}>
                {canStart ? 'Ready to Start' : 'Waiting for 2nd Player...'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {currentRoom.players.map((p, idx) => {
                const isYou = p.id === localPlayerId;
                const isPlayerHost = p.id === currentRoom.hostId;
                return (
                  <div
                    key={p.id}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between transition ${
                      isYou
                        ? 'bg-cyan-50/50 dark:bg-cyan-950/20 border-cyan-300 dark:border-cyan-700/60 shadow-sm'
                        : 'bg-slate-50 dark:bg-game-surfaceLight border-slate-200 dark:border-slate-700/60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="w-9 h-9 rounded-full border-2 border-white flex items-center justify-center text-white shrink-0 relative shadow-sm"
                        style={{ backgroundColor: p.color }}
                      >
                        <AvatarIcon avatar={p.avatar} className="w-5 h-5" />
                      </span>
                      <div className="truncate">
                        <div className="text-sm font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                          <span>{p.name}</span>
                          {isPlayerHost && (
                            <span title="Host">
                              <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          {isYou ? '⭐ You' : `Player ${idx + 1}`}
                        </span>
                      </div>
                    </div>

                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                      Ready
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lobby Actions */}
          <div className="pt-2 flex flex-col gap-2.5">
            {isHost ? (
              <button
                onClick={handleStartMatch}
                disabled={!canStart}
                className={`w-full py-4 rounded-2xl font-black text-base shadow-lg flex items-center justify-center gap-2 transition active:scale-95 ${
                  canStart
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 shadow-emerald-500/25 animate-pulse'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
                }`}
              >
                <Play className="w-5 h-5 fill-current" />
                {canStart ? `START ONLINE MATCH (${currentRoom.players.length} PLAYERS)` : 'WAITING FOR PLAYERS (MIN 2)'}
              </button>
            ) : (
              <div className="text-center py-4 rounded-2xl bg-slate-50 dark:bg-game-surfaceLight border border-slate-200 dark:border-game-border text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-cyan-500" />
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
                disabled={isJoining || !joinCodeInput.trim()}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/20 active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isJoining && <Loader2 className="w-4 h-4 animate-spin" />}
                {isJoining ? 'JOINING ROOM...' : 'JOIN ROOM'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
