'use client';

import { cn } from '@/lib/utils';

interface FocusLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'white';
  showText?: boolean;
  showSubtitle?: boolean;
}

// Tamanhos do SVG
const svgSizes = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
};

const textSizes = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-2xl',
};

export function FocusLogo({ className, size = 'md', variant = 'default', showText = true, showSubtitle = true }: FocusLogoProps) {
  const isWhite = variant === 'white';

  // Cores
  const bgColor = isWhite ? 'transparent' : '#2d3a5f';
  const iconColor = '#ffffff';
  const textColor = isWhite ? 'text-white' : 'text-[#2d3a5f]';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <svg
        viewBox="0 0 100 100"
        className={cn(svgSizes[size])}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Fundo circular */}
        <circle cx="50" cy="50" r="48" fill={bgColor} />

        {/* Escudo */}
        <path
          d="M30 32 L30 58 C30 62 35 70 50 76 C65 70 70 62 70 58 L70 32 L50 28 L30 32 Z"
          fill="none"
          stroke={iconColor}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Paginas do livro (dentro do escudo) */}
        <path
          d="M32 34 L48 31 L48 42"
          fill="none"
          stroke={iconColor}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M68 34 L52 31 L52 42"
          fill="none"
          stroke={iconColor}
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Lupa - circulo */}
        <circle
          cx="50"
          cy="46"
          r="10"
          fill="none"
          stroke={iconColor}
          strokeWidth="2.5"
        />

        {/* Lupa - cabo */}
        <line
          x1="58" y1="54"
          x2="66" y2="62"
          stroke={iconColor}
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Letra F dentro da lupa */}
        <text
          x="50"
          y="50"
          fontFamily="Arial, sans-serif"
          fontSize="12"
          fontWeight="bold"
          fill={iconColor}
          textAnchor="middle"
        >F</text>

        {/* Linhas de texto/dados */}
        <line x1="36" y1="62" x2="56" y2="62" stroke={iconColor} strokeWidth="2" strokeLinecap="round" />
        <line x1="38" y1="68" x2="54" y2="68" stroke={iconColor} strokeWidth="2" strokeLinecap="round" />
      </svg>

      {showText && (
        <div className="flex flex-col">
          <span className={cn('font-bold tracking-tight leading-tight', textSizes[size], textColor)}>
            Focus
          </span>
          {showSubtitle && size !== 'sm' && (
            <span className={cn('text-xs leading-tight', isWhite ? 'text-white/80' : 'text-[#2d3a5f]/70')}>
              Gestao Escolar
            </span>
          )}
        </div>
      )}
    </div>
  );
}
