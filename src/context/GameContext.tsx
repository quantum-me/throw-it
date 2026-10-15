import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  dropCoin,
  createInitialState,
  rematchState,
  undoMove,
} from '../engine/gameEngine';
import { getRobotMove } from '../engine/robot';
import type { GameConfig, GameMode, GameState, Player, RoboDifficulty } from '../engine/types';
import { getLocalPlayerId, onlineManager } from '../online/onlineRoomManager';
import { sound } from '../utils/audio';

export type AppView = 'home' | 'setup_wizard' | 'game' | 'online_lobby';

interface GameContextType {
  // Navigation & View
  view: AppView;
  setView: (view: AppView) => void;
  selectedMode: GameMode;
  setSelectedMode: (mode: GameMode) => void;

  // Settings & Theme
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  soundEnabled: boolean;
  toggleSound: () => void;
  animationsEnabled: boolean;
  setAnimationsEnabled: (enabled: boolean) => void;
  accessibleSymbols: boolean;
  setAccessibleSymbols: (enabled: boolean) => void;

  // Active Game State
  gameState: GameState | null;
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>;
  isRobotThinking: boolean;
  handoffPlayer: Player | null;
  dismissHandoff: () => void;

  // Actions
  handleMakeMove: (col: number) => void;
  handleUndo: () => void;
  handleRematch: () => void;
  startNewGame: (players: Player[], config: Partial<GameConfig>, mode: GameMode) => void;
  returnToHome: () => void;

  // Modals
  howToPlayOpen: boolean;
  setHowToPlayOpen: (open: boolean) => void;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('throw_it_theme');
    return (saved as 'dark' | 'light') || 'dark';
  });

  // Sound state
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('throw_it_sound_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  // Animation preferences
  const [animationsEnabled, setAnimationsEnabledState] = useState<boolean>(() => {
    const saved = localStorage.getItem('throw_it_animations');
    return saved !== null ? saved === 'true' : true;
  });

  // Accessible symbols overlay
  const [accessibleSymbols, setAccessibleSymbolsState] = useState<boolean>(() => {
    const saved = localStorage.getItem('throw_it_accessible_symbols');
    return saved !== null ? saved === 'true' : true;
  });

  // Views & modals
  const [view, setView] = useState<AppView>('home');
  const [selectedMode, setSelectedMode] = useState<GameMode>('local');
  const [howToPlayOpen, setHowToPlayOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Active game
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isRobotThinking, setIsRobotThinking] = useState(false);
  const [handoffPlayer, setHandoffPlayer] = useState<Player | null>(null);

  // Sync theme to document element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    localStorage.setItem('throw_it_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      sound.setEnabled(next);
      return next;
    });
  };

  const setAnimationsEnabled = (val: boolean) => {
    setAnimationsEnabledState(val);
    localStorage.setItem('throw_it_animations', String(val));
  };

  const setAccessibleSymbols = (val: boolean) => {
    setAccessibleSymbolsState(val);
    localStorage.setItem('throw_it_accessible_symbols', String(val));
  };

  // Start new game
  const startNewGame = (players: Player[], config: Partial<GameConfig>, mode: GameMode) => {
    const state = createInitialState(players, config, mode);
    setGameState(state);
    setView('game');

    // If first player is a robot (rare but possible), trigger turn
    if (state.players[0].isRobot) {
      triggerRobotTurn(state);
    }
  };

  // Robot turn orchestration with smooth thinking delay
  const triggerRobotTurn = (currentState: GameState) => {
    if (currentState.status !== 'playing') return;
    const activePlayer = currentState.players[currentState.currentTurnIndex];
    if (!activePlayer.isRobot) return;

    setIsRobotThinking(true);
    const difficulty: RoboDifficulty = activePlayer.robotDifficulty || 'medium';

    // Thinking delay between 400ms and 750ms for realistic pacing
    const delay = difficulty === 'hard' ? 600 : 450;

    setTimeout(() => {
      try {
        const col = getRobotMove(currentState, difficulty);
        if (col !== -1) {
          const result = dropCoin(currentState, col, activePlayer.id);
          sound.playCoinDrop();

          if (result.isWin) {
            sound.playVictory();
          } else if (result.isDraw) {
            sound.playDraw();
          } else {
            sound.playTurnChange();
          }

          setGameState(result.state);

          // If next player is also a robot
          if (result.state.status === 'playing' && result.state.players[result.state.currentTurnIndex].isRobot) {
            triggerRobotTurn(result.state);
          }
        }
      } catch (err) {
        console.error('Robot move error:', err);
      } finally {
        setIsRobotThinking(false);
      }
    }, delay);
  };

  // Subscribe to online room manager events for seamless global sync
  useEffect(() => {
    const unsubscribe = onlineManager.subscribe((room, lastMove) => {
      if (room.status === 'playing' && room.gameState) {
        setGameState(room.gameState);
        setView('game');

        if (lastMove) {
          if (lastMove.isWin) {
            sound.playVictory();
          } else if (lastMove.isDraw) {
            sound.playDraw();
          } else {
            sound.playCoinDrop();
            sound.playTurnChange();
          }
        }
      } else if (room.status === 'ended' && room.gameState) {
        setGameState(room.gameState);
        if (lastMove?.isWin) {
          sound.playVictory();
        } else if (lastMove?.isDraw) {
          sound.playDraw();
        }
      }
    });
    return unsubscribe;
  }, []);

  // Player coin drop
  const handleMakeMove = (col: number) => {
    if (!gameState || gameState.status !== 'playing' || isRobotThinking) return;

    if (gameState.mode === 'online') {
      const activePlayer = gameState.players[gameState.currentTurnIndex];
      const localId = getLocalPlayerId();
      if (activePlayer.id !== localId) {
        sound.playInvalidMove();
        return;
      }

      try {
        onlineManager.submitMove(localId, col);
      } catch {
        sound.playInvalidMove();
      }
      return;
    }

    const activePlayer = gameState.players[gameState.currentTurnIndex];

    try {
      const result = dropCoin(gameState, col, activePlayer.id);
      sound.playCoinDrop();

      if (result.isWin) {
        sound.playVictory();
      } else if (result.isDraw) {
        sound.playDraw();
      } else {
        sound.playTurnChange();
      }

      setGameState(result.state);

      // Handle Pass & Play handoff privacy screen
      if (
        gameState.mode === 'local' &&
        gameState.config.handoffPrivacy &&
        result.state.status === 'playing'
      ) {
        const nextPlayer = result.state.players[result.state.currentTurnIndex];
        setHandoffPlayer(nextPlayer);
      }

      // Check if next player is a Robot
      if (
        result.state.status === 'playing' &&
        result.state.players[result.state.currentTurnIndex].isRobot
      ) {
        triggerRobotTurn(result.state);
      }
    } catch {
      sound.playInvalidMove();
    }
  };

  const dismissHandoff = () => {
    setHandoffPlayer(null);
  };

  const handleUndo = () => {
    if (!gameState || gameState.mode === 'online') return;
    const reverted = undoMove(gameState);
    if (reverted) {
      setGameState(reverted);
    }
  };

  const handleRematch = () => {
    if (!gameState) return;

    if (gameState.mode === 'online') {
      onlineManager.triggerRematch();
      return;
    }

    const nextState = rematchState(gameState);
    setGameState(nextState);

    if (nextState.players[0].isRobot) {
      triggerRobotTurn(nextState);
    }
  };

  const returnToHome = () => {
    setView('home');
    setGameState(null);
    setHandoffPlayer(null);
  };

  return (
    <GameContext.Provider
      value={{
        view,
        setView,
        selectedMode,
        setSelectedMode,
        theme,
        toggleTheme,
        soundEnabled,
        toggleSound,
        animationsEnabled,
        setAnimationsEnabled,
        accessibleSymbols,
        setAccessibleSymbols,
        gameState,
        setGameState,
        isRobotThinking,
        handoffPlayer,
        dismissHandoff,
        handleMakeMove,
        handleUndo,
        handleRematch,
        startNewGame,
        returnToHome,
        howToPlayOpen,
        setHowToPlayOpen,
        settingsOpen,
        setSettingsOpen,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
