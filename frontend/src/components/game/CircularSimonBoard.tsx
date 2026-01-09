/**
 * Circular Simon Board Component (Classic Design with SVG)
 * 
 * Authentic circular Simon game with proper pie-slice wedges using SVG paths.
 * Replicates the iconic look of the original 1978 Simon game.
 */

import { useState, useEffect, useRef } from 'react';
import type { Color } from '../../shared/types';
import { soundService } from '../../services/soundService';

// =============================================================================
// TYPES
// =============================================================================

interface CircularSimonBoardProps {
  sequence: Color[];
  round: number;
  isShowingSequence: boolean;
  isInputPhase: boolean;
  playerSequence: Color[];
  canSubmit: boolean;
  lastResult: { isCorrect: boolean; playerName: string } | null;
  onColorClick: (color: Color) => void;
  onSubmit: () => void;
  disabled?: boolean;
  secondsRemaining: number;
  timerColor: 'green' | 'yellow' | 'red';
  isTimerPulsing: boolean;
}

// =============================================================================
// SVG PATH HELPER - Creates pie slice arc path
// =============================================================================

function createWedgePath(
  centerX: number,
  centerY: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number
): string {
  // Convert angles to radians
  const startRad = (startAngle * Math.PI) / 180;
  const endRad = (endAngle * Math.PI) / 180;

  // Calculate points
  const x1 = centerX + outerRadius * Math.cos(startRad);
  const y1 = centerY + outerRadius * Math.sin(startRad);
  const x2 = centerX + outerRadius * Math.cos(endRad);
  const y2 = centerY + outerRadius * Math.sin(endRad);
  const x3 = centerX + innerRadius * Math.cos(endRad);
  const y3 = centerY + innerRadius * Math.sin(endRad);
  const x4 = centerX + innerRadius * Math.cos(startRad);
  const y4 = centerY + innerRadius * Math.sin(startRad);

  // Large arc flag (0 for arcs less than 180 degrees)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  // Create SVG path
  return `
    M ${x1} ${y1}
    A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2}
    L ${x3} ${y3}
    A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}
    Z
  `;
}

// =============================================================================
// WEDGE COMPONENT (SVG Pie Slice)
// =============================================================================

interface WedgeProps {
  color: Color;
  isActive: boolean;
  onClick: () => void;
  disabled: boolean;
  startAngle: number;
  endAngle: number;
  centerX: number;
  centerY: number;
  innerRadius: number;
  outerRadius: number;
}

const ColorWedge: React.FC<WedgeProps> = ({
  color,
  isActive,
  onClick,
  disabled,
  startAngle,
  endAngle,
  centerX,
  centerY,
  innerRadius,
  outerRadius,
}) => {
  // DIMMED base colors (darker when inactive) and VERY BRIGHT when active
  const colors: Record<Color, { dim: string; bright: string }> = {
    green: { dim: '#1a7a28', bright: '#44ff66' },  // Dark green -> Neon green
    red: { dim: '#8b1a1a', bright: '#ff4444' },    // Dark red -> Bright red
    yellow: { dim: '#8b7a00', bright: '#ffff00' }, // Dark yellow -> Pure yellow
    blue: { dim: '#0a3d6b', bright: '#44aaff' },   // Dark blue -> Bright blue
  };

  const wedgeColor = colors[color];
  const fillColor = isActive ? wedgeColor.bright : wedgeColor.dim;

  const path = createWedgePath(
    centerX,
    centerY,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle
  );

  return (
    <path
      d={path}
      fill={fillColor}
      stroke="#000"
      strokeWidth="5"
      onClick={disabled ? undefined : onClick}
      style={{
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'fill 0.1s ease, filter 0.1s ease, transform 0.1s ease',
        filter: isActive 
          ? `brightness(1.5) drop-shadow(0 0 30px ${wedgeColor.bright}) drop-shadow(0 0 60px ${wedgeColor.bright})` 
          : 'brightness(1)',
        transformOrigin: `${centerX}px ${centerY}px`,
        transform: isActive ? 'scale(1.05)' : 'scale(1)',
        opacity: disabled ? 0.6 : 1,
      }}
      role="button"
      aria-label={`${color} button`}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          onClick();
        }
      }}
    />
  );
};

// =============================================================================
// CIRCULAR SIMON BOARD COMPONENT
// =============================================================================

export const CircularSimonBoard: React.FC<CircularSimonBoardProps> = ({
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
  timerColor,
  isTimerPulsing,
}) => {
  const [activeColor, setActiveColor] = useState<Color | null>(null);

  // SVG dimensions
  const size = 300;
  const centerX = size / 2;
  const centerY = size / 2;
  const outerRadius = size / 2 - 10; // Leave margin for stroke
  const innerRadius = size * 0.18; // Center hub size
  const gapAngle = 4; // Gap between wedges in degrees

  // Wedge angles (with gaps)
  const wedges: { color: Color; start: number; end: number }[] = [
    { color: 'green', start: 180 + gapAngle / 2, end: 270 - gapAngle / 2 },   // Top Left
    { color: 'red', start: 270 + gapAngle / 2, end: 360 - gapAngle / 2 },      // Top Right
    { color: 'yellow', start: 90 + gapAngle / 2, end: 180 - gapAngle / 2 },    // Bottom Left
    { color: 'blue', start: 0 + gapAngle / 2, end: 90 - gapAngle / 2 },        // Bottom Right
  ];

  // Track which color in sequence is being shown
  const [sequenceIndex, setSequenceIndex] = useState<number>(-1);
  
  // Track if audio is initialized
  const audioInitialized = useRef(false);
  
  // CRITICAL FIX: Use ref to track current sequence to avoid closure issues
  // When sequence prop changes between rounds, the ref ensures we always read the latest value
  // Update ref immediately (not in useEffect) to ensure it's always current
  const sequenceRef = useRef<Color[]>(sequence);
  sequenceRef.current = sequence; // Update synchronously, not in useEffect

  // Initialize audio on first user interaction
  useEffect(() => {
    const initAudio = async () => {
      if (!audioInitialized.current) {
        await soundService.init();
        audioInitialized.current = true;
      }
    };

    // Try to init immediately (will work if user has interacted)
    initAudio();

    // Also listen for first click
    const handleClick = () => {
      initAudio();
      document.removeEventListener('click', handleClick);
    };
    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, []);

  // Animate sequence when showing - DRAMATIC and SLOW with SOUND
  useEffect(() => {
    // Reset state immediately when not showing
    if (!isShowingSequence || sequence.length === 0) {
      setActiveColor(null);
      setSequenceIndex(-1);
      return;
    }

    // CRITICAL: Capture sequence length at the start to prevent closure issues
    // Store it in a variable that won't change during the animation
    const sequenceLength = sequence.length;
    const sequenceToShow = [...sequence]; // Create a copy to ensure we have the exact sequence
    sequenceRef.current = sequenceToShow;
    
    console.log(`🎨 Starting sequence animation: Round ${round}, Length: ${sequenceLength}, Sequence:`, sequenceToShow);

    const SHOW_DURATION = 800;  // How long each color stays lit (matches sound)
    const SHOW_GAP = 400;       // Gap between colors (all dark)

    let currentIndex = 0;
    let timeoutId: ReturnType<typeof setTimeout>;
    let isCancelled = false; // Track if this effect was cancelled

    const showNextColor = () => {
      // CRITICAL FIX: Use the captured sequenceLength instead of reading from ref
      // This ensures we always use the length from when the animation started
      console.log(`🎨 showNextColor: index=${currentIndex}, sequenceLength=${sequenceLength}, cancelled=${isCancelled}`);
      
      if (isCancelled || currentIndex >= sequenceLength) {
        console.log(`🎨 Animation complete or cancelled. Index: ${currentIndex}, Length: ${sequenceLength}`);
        setActiveColor(null);
        setSequenceIndex(-1);
        return;
      }

      // Use the captured sequence array
      const color = sequenceToShow[currentIndex];
      console.log(`🎨 Showing color ${currentIndex + 1}/${currentSequence.length}: ${color}`);
      setActiveColor(color);
      setSequenceIndex(currentIndex);

      // 🔊 PLAY COLOR TONE (duration matches visual)
      soundService.playColor(color, SHOW_DURATION / 1000);

      // Vibrate when showing sequence
      if ('vibrate' in navigator) {
        navigator.vibrate(100);
      }

      setTimeout(() => {
        if (isCancelled) {
          console.log(`🎨 Cancelled during timeout for index ${currentIndex}`);
          return; // Don't continue if effect was cancelled
        }
        
        setActiveColor(null);
        currentIndex++;
        
        // Use the captured sequenceLength instead of reading from ref
        console.log(`🎨 After timeout: index=${currentIndex}, sequenceLength=${sequenceLength}, cancelled=${isCancelled}`);
        
        if (!isCancelled && currentIndex < sequenceLength) {
          timeoutId = setTimeout(showNextColor, SHOW_GAP);
        } else {
          console.log(`🎨 Animation finished. Final index: ${currentIndex}, Length: ${sequenceLength}`);
          setActiveColor(null);
          setSequenceIndex(-1);
        }
      }, SHOW_DURATION);
    };

    // Small delay before starting sequence
    timeoutId = setTimeout(showNextColor, 500);

    return () => {
      console.log(`🎨 Cleaning up animation effect. Round: ${round}, Sequence length: ${sequence.length}`);
      isCancelled = true; // Mark as cancelled to prevent stale callbacks
      if (timeoutId) clearTimeout(timeoutId);
      setActiveColor(null);
      setSequenceIndex(-1);
    };
  }, [isShowingSequence, sequence, round]); // Added round to dependencies to force reset on new round

  // Handle color button click
  const handleColorClick = (color: Color) => {
    if (disabled || isShowingSequence || !isInputPhase) return;

    // 🔊 PLAY COLOR TONE (short click sound)
    soundService.playColorClick(color);

    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }

    setActiveColor(color);
    setTimeout(() => setActiveColor(null), 150);
    onColorClick(color);
  };

  // Get color emoji
  const getColorEmoji = (color: Color): string => {
    const emojis: Record<Color, string> = {
      red: '🔴',
      blue: '🔵',
      yellow: '🟡',
      green: '🟢',
    };
    return emojis[color];
  };

  return (
    <div className="game-area flex flex-col items-center gap-3 w-full">
      {/* Round Display */}
      <div className="text-center">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">
          Round {round}
        </h2>
        {isShowingSequence ? (
          <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg px-4 py-2 animate-pulse">
            <p className="text-yellow-400 font-bold text-base">
              👀 MEMORIZE THE PATTERN!
            </p>
          </div>
        ) : (
          <p className="text-xs sm:text-sm text-gray-300">
            {disabled 
              ? '👻 Spectating...' 
              : isInputPhase
                ? '🎮 Repeat the pattern!' 
                : '✅ Ready'}
          </p>
        )}
      </div>

      {/* Timer Display */}
      {isInputPhase && secondsRemaining > 0 && (
        <div className="flex flex-col items-center">
          <div 
            className={`
              font-bold transition-all duration-200
              ${secondsRemaining > 10 ? 'text-3xl' : ''}
              ${secondsRemaining > 5 && secondsRemaining <= 10 ? 'text-4xl' : ''}
              ${secondsRemaining <= 5 ? 'text-5xl' : ''}
              ${timerColor === 'green' ? 'text-green-400' : ''}
              ${timerColor === 'yellow' ? 'text-yellow-400' : ''}
              ${timerColor === 'red' ? 'text-red-400' : ''}
              ${isTimerPulsing ? 'animate-pulse' : ''}
            `}
          >
            {secondsRemaining}s
          </div>
        </div>
      )}

      {/* SVG Circular Simon Board */}
      <div className="relative w-full max-w-[min(85vw,320px)] mx-auto">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="w-full h-auto"
          style={{ touchAction: 'manipulation' }}
        >
          {/* Background circle */}
          <circle
            cx={centerX}
            cy={centerY}
            r={outerRadius + 5}
            fill="#1a1a1a"
          />

          {/* Colored wedges */}
          {wedges.map((wedge) => (
            <ColorWedge
              key={wedge.color}
              color={wedge.color}
              isActive={activeColor === wedge.color}
              onClick={() => handleColorClick(wedge.color)}
              disabled={disabled || isShowingSequence || !isInputPhase}
              startAngle={wedge.start}
              endAngle={wedge.end}
              centerX={centerX}
              centerY={centerY}
              innerRadius={innerRadius}
              outerRadius={outerRadius}
            />
          ))}

          {/* Center hub */}
          <circle
            cx={centerX}
            cy={centerY}
            r={innerRadius - 2}
            fill="#1a1a1a"
            stroke="#333"
            strokeWidth="3"
          />

          {/* Center content - shows sequence counter during playback, or SIMON text */}
          {isShowingSequence && sequenceIndex >= 0 ? (
            <>
              {/* Sequence counter */}
              <text
                x={centerX}
                y={centerY + 8}
                textAnchor="middle"
                fill="#fff"
                fontSize="32"
                fontWeight="bold"
                fontFamily="Arial, sans-serif"
              >
                {sequenceIndex + 1}
              </text>
              <text
                x={centerX}
                y={centerY + 24}
                textAnchor="middle"
                fill="#888"
                fontSize="12"
                fontFamily="Arial, sans-serif"
              >
                of {sequence.length}
              </text>
            </>
          ) : (
            <text
              x={centerX}
              y={centerY + 6}
              textAnchor="middle"
              fill="white"
              fontSize="18"
              fontWeight="bold"
              fontFamily="Arial, sans-serif"
              letterSpacing="2"
            >
              SIMON
            </text>
          )}
        </svg>
      </div>

      {/* Player Sequence Display */}
      {isInputPhase && playerSequence.length > 0 && (
        <div className="bg-gray-700/80 rounded-lg p-2 w-full max-w-[min(85vw,320px)]">
          <div className="flex justify-center items-center gap-1 min-h-[28px]">
            {playerSequence.map((color, i) => (
              <span key={i} className="text-xl">
                {getColorEmoji(color)}
              </span>
            ))}
            <span className="text-gray-400 text-xs ml-2">
              {playerSequence.length}/{sequence.length}
            </span>
          </div>
        </div>
      )}

      {/* Submit Button */}
      {isInputPhase && (
        <button
          onClick={() => {
            if (canSubmit && 'vibrate' in navigator) {
              navigator.vibrate(100);
            }
            onSubmit();
          }}
          disabled={!canSubmit}
          style={{ touchAction: 'manipulation' }}
          className={`
            w-full max-w-[min(85vw,320px)] px-6 py-3 rounded-xl font-bold text-base
            min-h-[56px]
            transition-all duration-100
            ${canSubmit 
              ? 'bg-green-500 hover:bg-green-600 active:bg-green-700 text-white cursor-pointer shadow-lg active:scale-95' 
              : 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50'}
          `}
        >
          {canSubmit ? '✅ SUBMIT' : `⏳ ${playerSequence.length}/${sequence.length}`}
        </button>
      )}
    </div>
  );
};

export default CircularSimonBoard;
