/**
 * Retro Simon Board Component
 * 
 * Authentic retro arcade-style Simon game with:
 * - Circular cream/beige game board
 * - 4 colored 3D buttons (red, green, blue, yellow)
 * - Center speaker grille with S logo
 * - LCD score display
 */

import { useState, useEffect, useRef } from 'react';
import type { Color } from '../../shared/types';
import { soundService } from '../../services/soundService';

// =============================================================================
// TYPES
// =============================================================================

interface RetroSimonBoardProps {
  sequence: Color[];
  round: number;
  isShowingSequence: boolean;
  isInputPhase: boolean;
  playerSequence: Color[];
  canSubmit: boolean;
  onColorClick: (color: Color) => void;
  onSubmit: () => void;
  disabled?: boolean;
  secondsRemaining: number;
  score?: number;
  highScore?: number;
}

// =============================================================================
// COLOR BUTTON COMPONENT
// =============================================================================

interface ColorButtonProps {
  color: Color;
  isActive: boolean;
  onClick: () => void;
  disabled: boolean;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

const ColorButton: React.FC<ColorButtonProps> = ({
  color,
  isActive,
  onClick,
  disabled,
  position,
}) => {
  const colors: Record<Color, { base: string; glow: string; active: string }> = {
    red: { base: '#dc2626', glow: '#ef4444', active: '#ff6b6b' },
    green: { base: '#16a34a', glow: '#22c55e', active: '#4ade80' },
    blue: { base: '#2563eb', glow: '#3b82f6', active: '#60a5fa' },
    yellow: { base: '#ca8a04', glow: '#eab308', active: '#facc15' },
  };

  const positionClasses: Record<string, string> = {
    'top-left': 'top-[12%] left-[12%]',
    'top-right': 'top-[12%] right-[12%]',
    'bottom-left': 'bottom-[12%] left-[12%]',
    'bottom-right': 'bottom-[12%] right-[12%]',
  };

  const btnColor = colors[color];

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`
        absolute w-[30%] h-[30%] rounded-full
        ${positionClasses[position]}
        transition-all duration-100
        ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
      `}
      style={{
        background: isActive 
          ? `radial-gradient(circle at 30% 30%, ${btnColor.active}, ${btnColor.glow})` 
          : `radial-gradient(circle at 30% 30%, ${btnColor.glow}, ${btnColor.base})`,
        boxShadow: isActive
          ? `
              inset 0 -4px 15px rgba(0, 0, 0, 0.2),
              inset 0 4px 15px rgba(255, 255, 255, 0.4),
              0 0 30px ${btnColor.glow},
              0 0 60px ${btnColor.glow}
            `
          : `
              inset 0 -8px 20px rgba(0, 0, 0, 0.4),
              inset 0 8px 20px rgba(255, 255, 255, 0.2),
              0 4px 8px rgba(0, 0, 0, 0.5)
            `,
        transform: isActive ? 'scale(1.05)' : 'scale(1)',
        filter: isActive ? 'brightness(1.3)' : 'brightness(1)',
      }}
      aria-label={`${color} button`}
    />
  );
};

// =============================================================================
// RETRO SIMON BOARD COMPONENT
// =============================================================================

export const RetroSimonBoard: React.FC<RetroSimonBoardProps> = ({
  sequence,
  round,
  isShowingSequence,
  isInputPhase,
  playerSequence,
  canSubmit,
  onColorClick,
  onSubmit,
  disabled = false,
  secondsRemaining,
  score = 0,
  highScore = 0,
}) => {
  const [activeColor, setActiveColor] = useState<Color | null>(null);
  const [sequenceIndex, setSequenceIndex] = useState<number>(-1);
  const audioInitialized = useRef(false);
  const sequenceRef = useRef<Color[]>(sequence);
  sequenceRef.current = sequence;

  // Initialize audio
  useEffect(() => {
    const initAudio = async () => {
      if (!audioInitialized.current) {
        await soundService.init();
        audioInitialized.current = true;
      }
    };
    initAudio();
    const handleClick = () => {
      initAudio();
      document.removeEventListener('click', handleClick);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Animate sequence
  useEffect(() => {
    if (!isShowingSequence || sequence.length === 0) {
      setActiveColor(null);
      setSequenceIndex(-1);
      return;
    }

    const sequenceLength = sequence.length;
    const sequenceToShow = [...sequence];
    const SHOW_DURATION = 600;
    const SHOW_GAP = 200;
    let currentIndex = 0;
    let timeoutId: ReturnType<typeof setTimeout>;
    let isCancelled = false;

    const showNextColor = () => {
      if (isCancelled || currentIndex >= sequenceLength) {
        setActiveColor(null);
        setSequenceIndex(-1);
        return;
      }

      const color = sequenceToShow[currentIndex];
      setActiveColor(color);
      setSequenceIndex(currentIndex);
      soundService.playColor(color, SHOW_DURATION / 1000);

      if ('vibrate' in navigator) {
        navigator.vibrate(100);
      }

      setTimeout(() => {
        if (isCancelled) return;
        setActiveColor(null);
        currentIndex++;
        if (!isCancelled && currentIndex < sequenceLength) {
          timeoutId = setTimeout(showNextColor, SHOW_GAP);
        } else {
          setActiveColor(null);
          setSequenceIndex(-1);
        }
      }, SHOW_DURATION);
    };

    timeoutId = setTimeout(showNextColor, 500);

    return () => {
      isCancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      setActiveColor(null);
      setSequenceIndex(-1);
    };
  }, [isShowingSequence, sequence, round]);

  // Handle color click
  const handleColorClick = (color: Color) => {
    if (disabled || isShowingSequence || !isInputPhase) return;
    soundService.playColorClick(color);
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    setActiveColor(color);
    setTimeout(() => setActiveColor(null), 150);
    onColorClick(color);
  };

  // Button positions: red=top-left, green=top-right, blue=bottom-left, yellow=bottom-right
  const buttons: { color: Color; position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' }[] = [
    { color: 'red', position: 'top-left' },
    { color: 'green', position: 'top-right' },
    { color: 'blue', position: 'bottom-left' },
    { color: 'yellow', position: 'bottom-right' },
  ];

  return (
    <div className="game-area flex flex-col items-center gap-4 w-full max-w-lg mx-auto px-4">
      {/* Title */}
      <div className="text-center">
        <h1 className="neon-text neon-cyan text-lg sm:text-xl tracking-wider">RETRO</h1>
        <h1 className="neon-text neon-pink text-2xl sm:text-3xl tracking-wider">SIMON SAYS</h1>
      </div>

      {/* Game Board */}
      <div className="relative w-full max-w-[320px] aspect-square">
        {/* Cream colored circular board */}
        <div 
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle at 30% 30%, #e8dcc8, #d4c4a8, #b8a88c)',
            boxShadow: `
              inset 0 -10px 30px rgba(0, 0, 0, 0.2),
              inset 0 10px 30px rgba(255, 255, 255, 0.3),
              0 10px 40px rgba(0, 0, 0, 0.5)
            `,
          }}
        >
          {/* Speaker grille lines */}
          <div className="absolute top-[8%] left-1/2 -translate-x-1/2 w-[30%] h-[8%]">
            {[...Array(5)].map((_, i) => (
              <div 
                key={i}
                className="w-full h-[2px] bg-gray-600/40 mb-[3px] rounded-full"
                style={{ transform: `scaleX(${1 - i * 0.15})` }}
              />
            ))}
          </div>
          <div className="absolute bottom-[8%] left-1/2 -translate-x-1/2 w-[30%] h-[8%]">
            {[...Array(5)].map((_, i) => (
              <div 
                key={i}
                className="w-full h-[2px] bg-gray-600/40 mb-[3px] rounded-full"
                style={{ transform: `scaleX(${1 - i * 0.15})` }}
              />
            ))}
          </div>
          <div className="absolute left-[8%] top-1/2 -translate-y-1/2 w-[8%] h-[30%] flex flex-col justify-center">
            {[...Array(5)].map((_, i) => (
              <div 
                key={i}
                className="h-[2px] bg-gray-600/40 mb-[3px] rounded-full"
                style={{ width: `${100 - i * 15}%` }}
              />
            ))}
          </div>
          <div className="absolute right-[8%] top-1/2 -translate-y-1/2 w-[8%] h-[30%] flex flex-col justify-center items-end">
            {[...Array(5)].map((_, i) => (
              <div 
                key={i}
                className="h-[2px] bg-gray-600/40 mb-[3px] rounded-full"
                style={{ width: `${100 - i * 15}%` }}
              />
            ))}
          </div>
        </div>

        {/* Color buttons */}
        {buttons.map((btn) => (
          <ColorButton
            key={btn.color}
            color={btn.color}
            position={btn.position}
            isActive={activeColor === btn.color}
            onClick={() => handleColorClick(btn.color)}
            disabled={disabled || isShowingSequence || !isInputPhase}
          />
        ))}

        {/* Center speaker/hub */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[25%] aspect-square rounded-full speaker-grille flex items-center justify-center"
          style={{
            boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.8), 0 2px 5px rgba(0,0,0,0.5)',
          }}
        >
          <div className="w-[60%] aspect-square rounded-full bg-gray-900 border-2 border-gray-600 flex items-center justify-center">
            <span className="text-white font-bold text-xl" style={{ fontFamily: 'Orbitron, sans-serif' }}>S</span>
          </div>
        </div>

        {/* Score display below center */}
        <div className="absolute bottom-[35%] left-1/2 -translate-x-1/2 lcd-display text-xs">
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex justify-between w-full gap-2">
              <span className="text-gray-500">HI-SCORE:</span>
              <span className="text-green-400">{String(highScore).padStart(5, '0')}</span>
            </div>
            <div className="flex justify-between w-full gap-2">
              <span className="text-gray-500">SCORE:</span>
              <span className="text-green-400">{String(score).padStart(5, '0')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Status display */}
      <div className="text-center">
        {isShowingSequence ? (
          <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg px-4 py-2 animate-pulse">
            <p className="text-yellow-400 font-bold text-sm neon-text" style={{ fontFamily: 'Orbitron' }}>
              👀 WATCH THE PATTERN!
            </p>
            {sequenceIndex >= 0 && (
              <p className="text-yellow-300 text-xs mt-1">
                {sequenceIndex + 1} / {sequence.length}
              </p>
            )}
          </div>
        ) : isInputPhase ? (
          <div className="text-cyan-400 text-sm">
            <p>🎮 YOUR TURN - Round {round}</p>
            {secondsRemaining > 0 && (
              <p className={`text-2xl font-bold mt-1 ${secondsRemaining <= 5 ? 'text-red-400 animate-pulse' : ''}`}>
                {secondsRemaining}s
              </p>
            )}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">Ready to play!</p>
        )}
      </div>

      {/* Player sequence indicator */}
      {isInputPhase && playerSequence.length > 0 && (
        <div className="flex gap-1 justify-center">
          {playerSequence.map((color, i) => (
            <div
              key={i}
              className="w-4 h-4 rounded-full"
              style={{
                backgroundColor: color === 'red' ? '#ef4444' : color === 'green' ? '#22c55e' : color === 'blue' ? '#3b82f6' : '#eab308',
                boxShadow: `0 0 10px ${color === 'red' ? '#ef4444' : color === 'green' ? '#22c55e' : color === 'blue' ? '#3b82f6' : '#eab308'}`,
              }}
            />
          ))}
          <span className="text-gray-400 text-xs ml-2">
            {playerSequence.length}/{sequence.length}
          </span>
        </div>
      )}

      {/* Submit button */}
      {isInputPhase && (
        <button
          onClick={() => {
            if (canSubmit && 'vibrate' in navigator) {
              navigator.vibrate(100);
            }
            onSubmit();
          }}
          disabled={!canSubmit}
          className={`
            retro-btn w-full max-w-[280px]
            ${canSubmit ? 'retro-btn-cyan' : 'opacity-50 cursor-not-allowed border-gray-600 text-gray-600'}
          `}
        >
          {canSubmit ? '✓ SUBMIT' : `${playerSequence.length}/${sequence.length}`}
        </button>
      )}

      {/* Decorative star */}
      <div className="absolute bottom-4 right-4 text-white text-2xl star-icon">✦</div>
    </div>
  );
};

export default RetroSimonBoard;

