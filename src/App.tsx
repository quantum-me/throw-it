import React from 'react';
import { GameBoard } from './components/GameBoard';
import { HomeScreen } from './components/HomeScreen';
import { HowToPlayModal } from './components/HowToPlayModal';
import { Navbar } from './components/Navbar';
import { OnlineLobby } from './components/OnlineLobby';
import { PassHandoffModal } from './components/PassHandoffModal';
import { PlayerPanel } from './components/PlayerPanel';
import { SettingsModal } from './components/SettingsModal';
import { SetupWizard } from './components/SetupWizard';
import { WinModal } from './components/WinModal';
import { CallPanel } from './components/call/CallPanel';
import { GameProvider, useGame } from './context/GameContext';
import { onlineManager } from './online/onlineRoomManager';

const GameContainer: React.FC = () => {
  const { view, gameState } = useGame();
  const onlineRoom = onlineManager.getActiveRoom();

  const playerName = localStorage.getItem('throw_it_player_name') || 'Player';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center w-full">
        {view === 'home' && <HomeScreen />}
        {view === 'setup_wizard' && <SetupWizard />}
        {view === 'online_lobby' && <OnlineLobby />}

        {view === 'game' && gameState && (
          <div className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 flex flex-col justify-center">
            {/* Optional Call Panel during Online Match */}
            {gameState.mode === 'online' && onlineRoom && (
              <div className="mb-3 max-w-xl mx-auto w-full">
                <CallPanel roomCode={onlineRoom.code} playerName={playerName} />
              </div>
            )}

            {/* Main Game Screen: Grid with Board & Live Player Info */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Left/Center: Interactive Game Board */}
              <div className="lg:col-span-8 flex flex-col items-center justify-center">
                <GameBoard />
              </div>

              {/* Right: Live Player Information & Controls Panel */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                <PlayerPanel />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Global Modals */}
      <WinModal />
      <PassHandoffModal />
      <HowToPlayModal />
      <SettingsModal />
    </div>
  );
};

export function App() {
  return (
    <GameProvider>
      <GameContainer />
    </GameProvider>
  );
}

export default App;
