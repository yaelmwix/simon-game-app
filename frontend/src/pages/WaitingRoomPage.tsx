/**
 * Waiting Room / Game Page
 * 
 * Combined page that shows:
 * - Waiting room before game starts
 * - Simon game board during gameplay
 */

import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useSimonStore } from '../store/simonStore';
import { socketService } from '../services/socketService';
import { SimonBoard } from '../components/game/SimonBoard';
import { Toast } from '../components/ui/Toast';

export function WaitingRoomPage() {
  const { session } = useAuthStore();
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
    lastResult,
    message,
    initializeListeners,
    cleanup,
    addColorToSequence,
    submitSequence,
  } = useSimonStore();
  
  const [roomStatus, setRoomStatus] = useState<'waiting' | 'countdown' | 'active'>('waiting');
  const [countdownValue, setCountdownValue] = useState<number | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState<any[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  // Initialize on mount
  useEffect(() => {
    console.log('🎮 WaitingRoomPage mounted');
    
    // Initialize Simon listeners
    initializeListeners();
    
    // Connect socket
    const socket = socketService.getSocket();
    if (!socket) {
      console.error('❌ No socket connection');
      return;
    }
    
    // Join room via socket
    if (gameCode && playerId) {
      socket.emit('join_room_socket', { gameCode, playerId });
    }
    
    // Listen for initial room state (ONCE to avoid race condition)
    socket.once('room_state', (room: any) => {
      console.log('📦 Initial room state:', room);
      setPlayers(room.players || []);
      setRoomStatus(room.status);
      
      // Check if we're the host
      const me = room.players?.find((p: any) => p.id === playerId);
      setIsHost(me?.isHost || false);
    });
    
    // Listen for room state updates (when players join/leave)
    socket.on('room_state_update', (room: any) => {
      console.log('🔄 Room state updated:', room);
      setPlayers(room.players || []);
      setRoomStatus(room.status);
      
      // Check if we're the host
      const me = room.players?.find((p: any) => p.id === playerId);
      setIsHost(me?.isHost || false);
    });
    
    // Listen for countdown
    socket.on('countdown', (data: { count: number }) => {
      console.log('⏳ Countdown:', data.count);
      setRoomStatus('countdown');
      setCountdownValue(data.count);
      
      if (data.count === 0) {
        setRoomStatus('active');
        setCountdownValue(null);
      }
    });
    
    // Listen for player joined (for real-time feedback)
    socket.on('player_joined', (player: any) => {
      console.log('👋 Player joined:', player);
      // Don't modify state here - wait for room_state_update
    });
    
    // Listen for player left
    socket.on('player_left', (data: { playerId: string }) => {
      console.log('👋 Player left:', data.playerId);
      setPlayers(prev => prev.filter(p => p.id !== data.playerId));
    });
    
    // Cleanup on unmount
    return () => {
      cleanup();
      socket.off('room_state');
      socket.off('room_state_update');
      socket.off('countdown');
      socket.off('player_joined');
      socket.off('player_left');
    };
  }, [gameCode, playerId, initializeListeners, cleanup]);
  
  // Handle start game (host only)
  const handleStartGame = () => {
    const socket = socketService.getSocket();
    if (!socket || !gameCode || !playerId) return;
    
    socket.emit('start_game', { gameCode, playerId });
  };
  
  // Copy game code to clipboard
  const copyGameCode = async () => {
    if (!gameCode) return;
    
    try {
      await navigator.clipboard.writeText(gameCode);
      setToast({ message: 'Game code copied!', type: 'success' });
    } catch (err) {
      setToast({ message: 'Failed to copy code', type: 'error' });
    }
  };
  
  // Copy invite link to clipboard
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
  
  // Share game using native share API (mobile-friendly)
  const shareGame = async () => {
    if (!gameCode) return;
    
    const inviteUrl = `${window.location.origin}/?join=${gameCode}`;
    
    // Check if native share is supported
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my Simon Game!',
          text: `Join me in Simon Says! Use code: ${gameCode}`,
          url: inviteUrl,
        });
        setToast({ message: 'Invite shared!', type: 'success' });
      } catch (err) {
        // User cancelled or error - fallback to copy
        if ((err as Error).name !== 'AbortError') {
          copyInviteLink();
        }
      }
    } else {
      // Fallback to copy for desktop
      copyInviteLink();
    }
  };
  
  // Render game board if active
  if (roomStatus === 'active' && isGameActive) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-2 sm:p-4">
        <div className="max-w-sm sm:max-w-2xl md:max-w-4xl w-full">
          {/* Game Code Display */}
          <div className="text-center mb-2 sm:mb-4">
            <p className="text-white/70 text-xs sm:text-sm">Game Code: <span className="font-mono font-bold">{gameCode}</span></p>
          </div>
          
          {/* Simon Board */}
          <SimonBoard
            sequence={currentSequence}
            round={currentRound}
            isShowingSequence={isShowingSequence}
            isInputPhase={isInputPhase}
            playerSequence={playerSequence}
            canSubmit={canSubmit}
            lastResult={lastResult}
            onColorClick={addColorToSequence}
            onSubmit={() => {
              if (gameCode && playerId) {
                submitSequence(gameCode, playerId);
              }
            }}
            disabled={false}
          />
          
          {/* Message Display */}
          <div className="mt-6 text-center">
            <p className="text-white text-lg font-medium">{message}</p>
          </div>
          
          {/* Players Status */}
          <div className="mt-8 bg-white/10 backdrop-blur rounded-2xl p-4">
            <h3 className="text-white font-bold mb-2">Players</h3>
            <div className="grid grid-cols-2 gap-2">
              {players.map(player => (
                <div key={player.id} className="text-white/80 text-sm">
                  {player.displayName} {player.isHost && '👑'}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Render countdown
  if (roomStatus === 'countdown' && countdownValue !== null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-6xl sm:text-7xl md:text-9xl font-bold text-white mb-4">{countdownValue}</h1>
          <p className="text-lg sm:text-xl md:text-2xl text-white/80">Get ready!</p>
        </div>
      </div>
    );
  }
  
  // Render waiting room
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-3 sm:p-4">
      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 md:p-8 max-w-md sm:max-w-xl md:max-w-2xl w-full">
        <h1 className="text-2xl sm:text-3xl font-bold text-center mb-2">Waiting Room</h1>
        
        {/* Game Code Display with Share Buttons */}
        <div className="mb-6 sm:mb-8">
          <p className="text-center text-gray-600 mb-3 text-sm sm:text-base">
            Game Code: <span className="font-mono font-bold text-xl sm:text-2xl text-purple-600">{gameCode}</span>
          </p>
          
          {/* Invite Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              onClick={copyGameCode}
              className="bg-gray-100 hover:bg-gray-200 active:bg-gray-300 active:scale-95 text-gray-700 font-medium py-2.5 sm:py-2 px-4 rounded-lg transition-all duration-75 flex items-center justify-center gap-2 text-sm sm:text-base min-h-[44px]"
              style={{ touchAction: 'manipulation' }}
              title="Copy game code"
            >
              📋 <span className="hidden sm:inline">Copy Code</span><span className="sm:hidden">Code</span>
            </button>
            
            <button
              onClick={copyInviteLink}
              className="bg-blue-100 hover:bg-blue-200 active:bg-blue-300 active:scale-95 text-blue-700 font-medium py-2.5 sm:py-2 px-4 rounded-lg transition-all duration-75 flex items-center justify-center gap-2 text-sm sm:text-base min-h-[44px]"
              style={{ touchAction: 'manipulation' }}
              title="Copy invite link"
            >
              🔗 <span className="hidden sm:inline">Copy Link</span><span className="sm:hidden">Link</span>
            </button>
            
            <button
              onClick={shareGame}
              className="bg-green-100 hover:bg-green-200 active:bg-green-300 active:scale-95 text-green-700 font-medium py-2.5 sm:py-2 px-4 rounded-lg transition-all duration-75 flex items-center justify-center gap-2 text-sm sm:text-base min-h-[44px]"
              style={{ touchAction: 'manipulation' }}
              title="Share with friends"
            >
              📤 Share
            </button>
          </div>
        </div>
        
        {/* Players List */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Players ({players.length})</h2>
          <div className="space-y-2">
            {players.map(player => (
              <div 
                key={player.id} 
                className="bg-gray-100 rounded-lg p-3 flex items-center justify-between"
              >
                <span className="font-medium">
                  {player.displayName}
                  {player.id === playerId && ' (You)'}
                </span>
                {player.isHost && <span className="text-yellow-500">👑 Host</span>}
              </div>
            ))}
          </div>
        </div>
        
        {/* Start Button (host only) */}
        {isHost && (
          <button
            onClick={handleStartGame}
            className="w-full bg-green-500 hover:bg-green-600 active:bg-green-700 active:scale-98 text-white font-bold py-3 sm:py-4 px-6 rounded-lg sm:rounded-xl transition-all duration-75 text-base sm:text-lg min-h-[56px]"
            style={{ touchAction: 'manipulation' }}
          >
            🎮 Start Game
          </button>
        )}
        
        {!isHost && (
          <p className="text-center text-gray-500 text-sm sm:text-base">
            Waiting for host to start the game...
          </p>
        )}
      </div>
    </div>
  );
}
