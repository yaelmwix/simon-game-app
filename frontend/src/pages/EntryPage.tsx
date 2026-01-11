/**
 * Entry Page - Retro Arcade Style
 * 
 * Neon-styled name + game selection page.
 * First screen players see.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createSession, joinGame } from '../services/authService';
import { useAuthStore } from '../store/authStore';

export function EntryPage() {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<'create' | 'join' | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [gameCode, setGameCode] = useState('');
  const [avatarId, setAvatarId] = useState('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { setSession } = useAuthStore();
  const navigate = useNavigate();
  
  // Handle invite link with game code in URL
  useEffect(() => {
    const joinCode = searchParams.get('join');
    if (joinCode) {
      setMode('join');
      setGameCode(joinCode.toUpperCase());
    }
  }, [searchParams]);

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await createSession(displayName, avatarId);
      setSession(response.session);
      navigate('/waiting');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create game');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGame = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(false);

    try {
      const response = await joinGame(displayName, avatarId, gameCode);
      setSession(response.session);
      navigate('/waiting');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join game');
    } finally {
      setLoading(false);
    }
  };

  // Main menu screen
  if (!mode) {
    return (
      <div className="min-h-screen retro-bg-static flex items-center justify-center p-4">
        <div className="crt-frame bg-black/80 p-6 sm:p-8 max-w-md w-full">
          {/* Retro Game Board Preview */}
          <div className="relative w-48 h-48 mx-auto mb-6">
            {/* Cream board */}
            <div 
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle at 30% 30%, #e8dcc8, #d4c4a8, #b8a88c)',
                boxShadow: 'inset 0 -5px 15px rgba(0,0,0,0.2), 0 5px 20px rgba(0,0,0,0.5)',
              }}
            >
              {/* Mini buttons */}
              <div className="absolute top-[15%] left-[15%] w-[25%] h-[25%] rounded-full bg-red-500" style={{ boxShadow: 'inset 0 -3px 8px rgba(0,0,0,0.3)' }} />
              <div className="absolute top-[15%] right-[15%] w-[25%] h-[25%] rounded-full bg-green-500" style={{ boxShadow: 'inset 0 -3px 8px rgba(0,0,0,0.3)' }} />
              <div className="absolute bottom-[15%] left-[15%] w-[25%] h-[25%] rounded-full bg-blue-500" style={{ boxShadow: 'inset 0 -3px 8px rgba(0,0,0,0.3)' }} />
              <div className="absolute bottom-[15%] right-[15%] w-[25%] h-[25%] rounded-full bg-yellow-500" style={{ boxShadow: 'inset 0 -3px 8px rgba(0,0,0,0.3)' }} />
              
              {/* Center */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[22%] h-[22%] rounded-full bg-gray-900 flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="neon-text neon-cyan text-xl sm:text-2xl tracking-wider mb-1">RETRO</h1>
            <h1 className="neon-text neon-pink text-3xl sm:text-4xl tracking-wider">SIMON SAYS</h1>
          </div>

          {/* LCD Score Display */}
          <div className="lcd-display mx-auto mb-8 text-center">
            <div className="flex justify-center gap-8 text-xs">
              <div>
                <span className="text-gray-500">HI-SCORE: </span>
                <span className="text-green-400">01200</span>
              </div>
              <div>
                <span className="text-gray-500">SCORE: </span>
                <span className="text-green-400">00450</span>
              </div>
            </div>
          </div>
          
          {/* Buttons */}
          <div className="flex justify-center gap-4">
            <button
              onClick={() => setMode('create')}
              className="retro-btn retro-btn-cyan text-sm"
              style={{ touchAction: 'manipulation' }}
            >
              1 PLAYER
            </button>
            
            <button
              onClick={() => setMode('join')}
              className="retro-btn retro-btn-pink text-sm"
              style={{ touchAction: 'manipulation' }}
            >
              2 PLAYERS
            </button>
          </div>

          {/* Decorative star */}
          <div className="absolute bottom-4 right-4 text-white text-xl star-icon">✦</div>
        </div>
      </div>
    );
  }

  // Create/Join form
  return (
    <div className="min-h-screen retro-bg-static flex items-center justify-center p-4">
      <div className="crt-frame bg-black/80 p-6 sm:p-8 max-w-md w-full">
        <button
          onClick={() => setMode(null)}
          className="text-cyan-400 hover:text-cyan-300 mb-4 text-sm flex items-center gap-2"
        >
          <span>←</span> BACK
        </button>
        
        <h2 className="neon-text neon-cyan text-xl sm:text-2xl mb-6 text-center">
          {mode === 'create' ? '1 PLAYER' : 'JOIN GAME'}
        </h2>
        
        <form onSubmit={mode === 'create' ? handleCreateGame : handleJoinGame} className="space-y-4">
          <div>
            <label className="block text-cyan-400 text-xs mb-2 tracking-wider">
              ENTER NAME:
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value.toUpperCase())}
              placeholder="YOUR NAME"
              minLength={3}
              maxLength={12}
              required
              className="retro-input w-full"
            />
          </div>
          
          {mode === 'join' && (
            <div>
              <label className="block text-cyan-400 text-xs mb-2 tracking-wider">
                GAME CODE:
                {searchParams.get('join') && (
                  <span className="ml-2 text-green-400">
                    ✓ FROM INVITE
                  </span>
                )}
              </label>
              <input
                type="text"
                value={gameCode}
                onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                placeholder="ABCDEF"
                maxLength={6}
                required
                className="retro-input w-full"
              />
            </div>
          )}
          
          <div>
            <label className="block text-cyan-400 text-xs mb-2 tracking-wider">
              SELECT AVATAR:
            </label>
            <div className="grid grid-cols-4 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8'].map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setAvatarId(id)}
                  className={`
                    p-3 rounded-lg border-2 transition-all
                    ${avatarId === id
                      ? 'border-cyan-400 bg-cyan-400/20 shadow-[0_0_15px_rgba(0,245,255,0.5)]'
                      : 'border-gray-600 hover:border-gray-500'
                    }
                  `}
                  style={{ touchAction: 'manipulation' }}
                >
                  <span className="text-2xl">{['😀', '🎮', '🚀', '⚡', '🎨', '🎯', '🏆', '🌟'][parseInt(id) - 1]}</span>
                </button>
              ))}
            </div>
          </div>
          
          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-400 px-4 py-2 rounded text-xs">
              {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className={`
              retro-btn w-full mt-6
              ${loading ? 'opacity-50 cursor-not-allowed border-gray-600 text-gray-600' : 'retro-btn-pink'}
            `}
            style={{ touchAction: 'manipulation' }}
          >
            {loading ? 'LOADING...' : mode === 'create' ? '[START]' : '[JOIN]'}
          </button>
        </form>

        {/* Decorative star */}
        <div className="absolute bottom-4 right-4 text-white text-xl star-icon">✦</div>
      </div>
    </div>
  );
}
