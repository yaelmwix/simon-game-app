/**
 * Game Over Screen Component - Retro Arcade Style
 * 
 * Displays the end game results with:
 * - High scores leaderboard
 * - Winner celebration
 * - Play Again / Home buttons
 */

import { useEffect, useState } from 'react';
import { soundService } from '../../services/soundService';

// =============================================================================
// TYPES
// =============================================================================

interface GameOverScreenProps {
  winner: {
    playerId: string;
    name: string;
    score: number;
  } | null;
  finalScores: Array<{
    playerId: string;
    name: string;
    score: number;
    isEliminated?: boolean;
  }>;
  currentPlayerId: string;
  roundsPlayed: number;
  onPlayAgain: () => void;
  onGoHome: () => void;
  gameCode: string;
}

// =============================================================================
// CONFETTI COMPONENT
// =============================================================================

const Confetti: React.FC = () => {
  const colors = ['#00f5ff', '#ff00ff', '#ffff00', '#00ff66'];
  const confettiPieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 3,
    duration: 2 + Math.random() * 2,
    color: colors[Math.floor(Math.random() * colors.length)],
    rotation: Math.random() * 360,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {confettiPieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute w-3 h-3 animate-fall"
          style={{
            left: `${piece.left}%`,
            top: '-20px',
            backgroundColor: piece.color,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            transform: `rotate(${piece.rotation}deg)`,
            borderRadius: Math.random() > 0.5 ? '50%' : '0',
            boxShadow: `0 0 10px ${piece.color}`,
          }}
        />
      ))}
    </div>
  );
};

// =============================================================================
// GAME OVER SCREEN COMPONENT
// =============================================================================

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
  winner,
  finalScores,
  currentPlayerId,
  roundsPlayed,
  onPlayAgain,
  onGoHome,
  gameCode,
}) => {
  const [showConfetti, setShowConfetti] = useState(true);
  const [animatedScore, setAnimatedScore] = useState(0);
  const isWinner = winner?.playerId === currentPlayerId;
  const isSoloGame = finalScores.length === 1;
  const myScore = finalScores.find(s => s.playerId === currentPlayerId)?.score || 0;

  // Animate score count-up
  useEffect(() => {
    if (!winner) return;
    
    const targetScore = winner.score;
    const duration = 1500;
    const steps = 30;
    const increment = targetScore / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= targetScore) {
        setAnimatedScore(targetScore);
        clearInterval(timer);
      } else {
        setAnimatedScore(Math.floor(current));
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [winner]);

  // Play victory sound on mount
  useEffect(() => {
    soundService.playVictory();
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  // Share score functionality
  const handleShare = async () => {
    const rank = finalScores.findIndex(s => s.playerId === currentPlayerId) + 1;
    
    const shareText = isSoloGame
      ? `🎮 I reached Round ${roundsPlayed} in RETRO SIMON SAYS with ${myScore} points! Can you beat my score?`
      : `🏆 I finished #${rank} in RETRO SIMON SAYS with ${myScore} points! ${isWinner ? '👑 WINNER!' : ''}`;
    
    const shareUrl = `${window.location.origin}/?join=${gameCode}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Retro Simon Says Score',
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          navigator.clipboard.writeText(shareText + '\n' + shareUrl);
        }
      }
    } else {
      navigator.clipboard.writeText(shareText + '\n' + shareUrl);
    }
  };

  return (
    <div className="min-h-screen retro-bg-static flex items-center justify-center p-4 relative overflow-hidden">
      {/* Confetti */}
      {showConfetti && <Confetti />}
      
      <div className="crt-frame bg-black/80 p-6 sm:p-8 w-full max-w-md relative z-10">
        {/* High Scores Title */}
        <h1 className="neon-text neon-cyan text-2xl sm:text-3xl text-center mb-6 tracking-wider">
          HIGH SCORES
        </h1>

        {/* Leaderboard */}
        <div className="lcd-display mb-6">
          <div className="space-y-1">
            {finalScores.map((player, index) => {
              const isCurrentPlayer = player.playerId === currentPlayerId;
              const rank = index + 1;
              
              return (
                <div
                  key={player.playerId}
                  className={`flex items-center justify-between py-1 ${
                    isCurrentPlayer 
                      ? 'text-cyan-400' 
                      : rank <= 3 
                        ? 'text-green-400' 
                        : 'text-gray-400'
                  }`}
                >
                  <span className="text-xs uppercase tracking-wider">
                    {rank}. {player.name.slice(0, 3).toUpperCase()}
                    {isCurrentPlayer && ' ←'}
                  </span>
                  <span className="text-xs">
                    {String(player.score).padStart(4, '0')}
                    {player.isEliminated && ' 💀'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* New High Score / Winner Section */}
        {winner && (isWinner || isSoloGame) && (
          <div className="text-center mb-6">
            <div className="border-2 border-yellow-400 rounded-lg px-4 py-2 mb-4">
              <p className="neon-text neon-yellow text-sm tracking-wider animate-pulse">
                {isSoloGame ? 'GAME COMPLETE!' : '🏆 NEW HIGH SCORE!'}
              </p>
            </div>
            
            <div className="text-4xl font-bold neon-text neon-pink mb-2">
              {String(animatedScore).padStart(5, '0')}
            </div>
            
            <p className="text-gray-400 text-xs">
              ROUND {roundsPlayed} REACHED
            </p>
          </div>
        )}

        {/* Game Stats */}
        <div className="lcd-display mb-6">
          <div className="flex justify-around text-center text-xs">
            <div>
              <div className="text-green-400 text-lg">{roundsPlayed}</div>
              <div className="text-gray-500">ROUNDS</div>
            </div>
            <div className="text-gray-600">|</div>
            <div>
              <div className="text-green-400 text-lg">
                {String(myScore).padStart(4, '0')}
              </div>
              <div className="text-gray-500">SCORE</div>
            </div>
            {!isSoloGame && (
              <>
                <div className="text-gray-600">|</div>
                <div>
                  <div className="text-green-400 text-lg">
                    #{finalScores.findIndex(s => s.playerId === currentPlayerId) + 1}
                  </div>
                  <div className="text-gray-500">RANK</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={onPlayAgain}
            className="retro-btn retro-btn-cyan w-full"
            style={{ touchAction: 'manipulation' }}
          >
            [SUBMIT] PLAY AGAIN
          </button>

          <button
            onClick={onGoHome}
            className="retro-btn retro-btn-pink w-full"
            style={{ touchAction: 'manipulation' }}
          >
            [CANCEL] HOME
          </button>

          <button
            onClick={handleShare}
            className="retro-btn w-full text-gray-400 border-gray-600 hover:border-gray-500"
            style={{ touchAction: 'manipulation' }}
          >
            📤 SHARE SCORE
          </button>
        </div>

        {/* Decorative star */}
        <div className="absolute bottom-4 right-4 text-white text-xl star-icon">✦</div>
      </div>

      {/* CSS for confetti animation */}
      <style>{`
        @keyframes fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-fall {
          animation: fall linear infinite;
        }
        .neon-yellow {
          color: #ffff00;
          text-shadow: 
            0 0 5px #ffff00,
            0 0 10px #ffff00,
            0 0 20px #ffff00;
        }
      `}</style>
    </div>
  );
};

export default GameOverScreen;
