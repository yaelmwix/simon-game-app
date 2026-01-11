/**
 * Waiting Room / Game Page - Retro Arcade Style
 * 
 * Combined page that shows:
 * - Waiting room before game starts
 * - Simon game board during gameplay
 */

import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useSimonStore } from '../store/simonStore';
import { socketService } from '../services/socketService';
import { soundService } from '../services/soundService';
import { RetroSimonBoard } from '../components/game/RetroSimonBoard';
import { GameOverScreen } from '../components/game/GameOverScreen';
import { Toast } from '../components/ui/Toast';
import { MuteButton } from '../components/ui/MuteButton';

export function WaitingRoomPage() {
  const navigate = useNavigate();
  const { session, clearSession } = useAuthStore();
  const gameCode = session?.gameCode;
  const playerId = session?.playerId;
  
  const { 
    isGameActive, 
    currentSequence, 
    currentRound, 
    isShowingSequence,
    isInputPhase,
    playerSequence,
    canSubmit,
    message,
    secondsRemaining,
    isEliminated,
    scores,
    submittedPlayers,
    isGameOver,
    gameWinner,
    finalScores,
    initializeListeners,
    cleanup,
    addColorToSequence,
    submitSequence,
    resetGame,
  } = useSimonStore();
  
  const [roomStatus, setRoomStatus] = useState<'waiting' | 'countdown' | 'active'>('waiting');
  const [countdownValue, setCountdownValue] = useState<number | null>(null);
  const [isHost, setIsHost] = useState(session?.isHost || false);
  const [players, setPlayers] = useState<any[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const lastCountdownValue = useRef<number | null>(null);
  
  // Calculate current score and high score
  const currentScore = scores[playerId || ''] || 0;
  const highScore = Math.max(...Object.values(scores), currentScore);
  
  // Initialize on mount
  useEffect(() => {
    console.log('🎮 WaitingRoomPage mounted');
    
    const socket = socketService.connect();
    console.log('✅ Socket connected:', socket.connected);
    
    initializeListeners();
    
    if (gameCode && playerId) {
      socket.emit('join_room_socket', { gameCode, playerId });
    }
    
    socket.once('room_state', (room: any) => {
      console.log('📦 Initial room state:', room);
      setPlayers(room.players || []);
      setRoomStatus(room.status);
      
      const me = room.players?.find((p: any) => p.id === playerId);
      const isHostPlayer = me?.isHost || false;
      setIsHost(isHostPlayer);
    });
    
    socket.on('room_state_update', (room: any) => {
      console.log('🔄 Room state updated:', room);
      setPlayers(room.players || []);
      setRoomStatus(room.status);
      
      const me = room.players?.find((p: any) => p.id === playerId);
      setIsHost(me?.isHost || false);
    });
    
    socket.on('error', (data: { message: string }) => {
      console.error('❌ Server error:', data.message);
      setToast({ message: data.message, type: 'error' });
    });
    
    socket.on('countdown', (data: { count: number }) => {
      console.log('⏳ Countdown:', data.count);
      setRoomStatus('countdown');
      setCountdownValue(data.count);
      
      if (lastCountdownValue.current !== data.count) {
        soundService.playCountdown(data.count);
        lastCountdownValue.current = data.count;
      }
      
      if (data.count === 0) {
        setRoomStatus('active');
        setCountdownValue(null);
        lastCountdownValue.current = null;
      }
    });
    
    socket.on('player_joined', (player: any) => {
      console.log('👋 Player joined:', player);
    });
    
    socket.on('player_left', (data: { playerId: string }) => {
      console.log('👋 Player left:', data.playerId);
      setPlayers(prev => prev.filter(p => p.id !== data.playerId));
    });
    
    socket.on('game_restarted', (data: { gameCode: string }) => {
      console.log('🔄 Game restarted:', data.gameCode);
      resetGame();
      setRoomStatus('waiting');
      lastCountdownValue.current = null;
    });
    
    return () => {
      cleanup();
      socket.off('room_state');
      socket.off('room_state_update');
      socket.off('error');
      socket.off('countdown');
      socket.off('player_joined');
      socket.off('player_left');
      socket.off('game_restarted');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameCode, playerId]);
  
  const handleStartGame = async () => {
    await soundService.init();
    
    const socket = socketService.getSocket();
    
    if (!socket) {
      setToast({ message: 'No connection to server', type: 'error' });
      return;
    }
    
    if (!gameCode || !playerId) {
      setToast({ message: 'Missing game info', type: 'error' });
      return;
    }
    
    socket.emit('start_game', { gameCode, playerId });
  };
  
  const copyGameCode = async () => {
    if (!gameCode) return;
    
    try {
      await navigator.clipboard.writeText(gameCode);
      setToast({ message: 'Game code copied!', type: 'success' });
    } catch (err) {
      setToast({ message: 'Failed to copy code', type: 'error' });
    }
  };
  
  const copyInviteLink = async () => {
    if (!gameCode) return;
    
    const inviteUrl = `${window.location.origin}/?join=${gameCode}`;
    
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setToast({ message: 'Invite link copied!', type: 'success' });
    } catch (err) {
      setToast({ message: 'Failed to copy link', type: 'error' });
    }
  };
  
  const handlePlayAgain = () => {
    resetGame();
    setRoomStatus('waiting');
    
    const socket = socketService.getSocket();
    if (socket && gameCode && playerId) {
      socket.emit('restart_game', { gameCode, playerId });
    }
  };

  const handleGoHome = () => {
    cleanup();
    clearSession();
    navigate('/');
  };

  const shareGame = async () => {
    if (!gameCode) return;
    
    const inviteUrl = `${window.location.origin}/?join=${gameCode}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my Simon Game!',
          text: `Join me in Simon Says! Use code: ${gameCode}`,
          url: inviteUrl,
        });
        setToast({ message: 'Invite shared!', type: 'success' });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          copyInviteLink();
        }
      }
    } else {
      copyInviteLink();
    }
  };
  
  // Render Game Over screen
  if (isGameOver) {
    return (
      <>
        <MuteButton />
        <GameOverScreen
          winner={gameWinner}
          finalScores={finalScores}
          currentPlayerId={playerId || ''}
          roundsPlayed={currentRound}
          onPlayAgain={handlePlayAgain}
          onGoHome={handleGoHome}
          gameCode={gameCode || ''}
        />
      </>
    );
  }

  // Render game board if active
  if (roomStatus === 'active' && isGameActive) {
    return (
      <div className="min-h-screen retro-bg-static flex items-center justify-center p-2 sm:p-4">
        <MuteButton />
        
        <div className="crt-frame bg-black/80 p-4 sm:p-6 w-full max-w-lg">
          {/* Scoreboard */}
          {isGameActive && Object.keys(scores).length > 0 && (
            <div className="mb-4">
              <h3 className="neon-text neon-cyan text-xs tracking-wider mb-2 text-center">LEADERBOARD</h3>
              <div className="lcd-display">
                <div className="space-y-1">
                  {players
                    .sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0))
                    .map((player, index) => {
                      const score = scores[player.id] || 0;
                      const hasSubmitted = submittedPlayers.includes(player.id);
                      const isCurrentPlayer = player.id === playerId;
                      
                      return (
                        <div
                          key={player.id}
                          className={`flex items-center justify-between text-xs ${
                            isCurrentPlayer ? 'text-cyan-400' : index < 3 ? 'text-green-400' : 'text-gray-400'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span>{index + 1}.</span>
                            <span className="uppercase">{player.displayName.slice(0, 3)}</span>
                          </span>
                          <div className="flex items-center gap-2">
                            <span>{String(score).padStart(4, '0')}</span>
                            {hasSubmitted && isInputPhase && (
                              <span className="text-green-400">✓</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
          
          {/* Eliminated Message */}
          {isEliminated && (
            <div className="bg-red-900/50 border-2 border-red-500 rounded-lg p-3 mb-4 text-center">
              <div className="text-3xl mb-1">💀</div>
              <div className="text-red-400 font-bold neon-text">ELIMINATED!</div>
            </div>
          )}
          
          <RetroSimonBoard
            sequence={currentSequence}
            round={currentRound}
            isShowingSequence={isShowingSequence}
            isInputPhase={isInputPhase}
            playerSequence={playerSequence}
            canSubmit={canSubmit}
            onColorClick={addColorToSequence}
            onSubmit={() => {
              if (gameCode && playerId) {
                submitSequence(gameCode, playerId);
              }
            }}
            disabled={isEliminated}
            secondsRemaining={secondsRemaining}
            score={currentScore}
            highScore={highScore}
          />
          
          {/* Message Display */}
          {message && (
            <div className="mt-4 text-center">
              <p className="text-cyan-400 text-sm">{message}</p>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // Render countdown
  if (roomStatus === 'countdown' && countdownValue !== null) {
    return (
      <div className="min-h-screen retro-bg-static flex items-center justify-center p-4">
        <div className="crt-frame bg-black/80 p-12 text-center">
          <h1 className="neon-text neon-pink text-7xl sm:text-9xl mb-4">{countdownValue}</h1>
          <p className="neon-text neon-cyan text-xl sm:text-2xl">GET READY!</p>
        </div>
      </div>
    );
  }
  
  // Render waiting room
  return (
    <div className="min-h-screen retro-bg-static flex items-center justify-center p-3 sm:p-4">
      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      
      <div className="crt-frame bg-black/80 p-6 sm:p-8 max-w-md w-full">
        <h1 className="neon-text neon-cyan text-xl sm:text-2xl text-center mb-6">WAITING ROOM</h1>
        
        {/* Game Code Display */}
        <div className="mb-6 text-center">
          <p className="text-gray-400 text-xs mb-2 tracking-wider">GAME CODE:</p>
          <p className="neon-text neon-pink text-3xl sm:text-4xl tracking-[0.3em]">{gameCode}</p>
        </div>
        
        {/* Invite Buttons */}
        <div className="flex flex-wrap gap-2 justify-center mb-6">
          <button
            onClick={copyGameCode}
            className="retro-btn retro-btn-cyan text-xs px-3 py-2"
            style={{ touchAction: 'manipulation' }}
          >
            📋 CODE
          </button>
          
          <button
            onClick={copyInviteLink}
            className="retro-btn retro-btn-cyan text-xs px-3 py-2"
            style={{ touchAction: 'manipulation' }}
          >
            🔗 LINK
          </button>
          
          <button
            onClick={shareGame}
            className="retro-btn retro-btn-pink text-xs px-3 py-2"
            style={{ touchAction: 'manipulation' }}
          >
            📤 SHARE
          </button>
        </div>
        
        {/* Players List */}
        <div className="mb-6">
          <h2 className="text-cyan-400 text-xs tracking-wider mb-3">
            PLAYERS ({players.length})
          </h2>
          <div className="lcd-display">
            {players.map((player, index) => (
              <div 
                key={player.id} 
                className={`flex items-center justify-between py-1 ${
                  player.id === playerId ? 'text-cyan-400' : 'text-green-400'
                }`}
              >
                <span className="text-xs uppercase">
                  {index + 1}. {player.displayName}
                  {player.id === playerId && ' (YOU)'}
                </span>
                {player.isHost && <span className="text-yellow-400">👑</span>}
              </div>
            ))}
          </div>
        </div>
        
        {/* Start Button (host only, or solo player) */}
        {(isHost || players.length === 1) && (
          <>
            {players.length === 1 && (
              <p className="text-center text-xs text-gray-500 mb-3">
                Start solo or wait for others
              </p>
            )}
            <button
              onClick={handleStartGame}
              className="retro-btn retro-btn-pink w-full"
              style={{ touchAction: 'manipulation' }}
            >
              🎮 {players.length === 1 ? 'START SOLO' : 'START GAME'}
            </button>
          </>
        )}
        
        {!isHost && players.length > 1 && (
          <p className="text-center text-gray-500 text-xs tracking-wider">
            WAITING FOR HOST...
          </p>
        )}

        {/* Decorative star */}
        <div className="absolute bottom-4 right-4 text-white text-xl star-icon">✦</div>
      </div>
    </div>
  );
}
