interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  align?: 'left' | 'center';
  className?: string;
}

const sizeStyles = {
  sm: {
    root: 'gap-1.5',
    word: 'text-[26px]',
    ball: 26,
    tagline: 'text-[9px]',
  },
  md: {
    root: 'gap-2',
    word: 'text-[32px]',
    ball: 32,
    tagline: 'text-[10px]',
  },
  lg: {
    root: 'gap-2.5',
    word: 'text-[46px] sm:text-[52px]',
    ball: 46,
    tagline: 'text-[11px]',
  },
};

export function BrandLogo({
  size = 'md',
  showTagline = false,
  align = 'left',
  className = '',
}: BrandLogoProps) {
  const config = sizeStyles[size];
  const alignment = align === 'center' ? 'items-center text-center' : 'items-start text-left';

  return (
    <div className={`inline-flex flex-col ${alignment} ${className}`}>
      <div className={`inline-flex items-center ${config.root}`}>
        <span className={`brand-wordmark ${config.word}`}>SC</span>

        <span
          className="brand-ball"
          aria-hidden="true"
          style={{ width: `${config.ball}px`, height: `${config.ball}px` }}
        >
          <span className="brand-ball-equator" />
          <span className="brand-ball-arc brand-ball-arc-left" />
          <span className="brand-ball-arc brand-ball-arc-right" />
        </span>

        <span className={`brand-wordmark ${config.word}`}>RE</span>
      </div>

      {showTagline && (
        <p className={`mt-1 uppercase tracking-[0.32em] text-[var(--text-soft)] ${config.tagline}`}>
          Basketball Intelligence
        </p>
      )}
    </div>
  );
}

export default BrandLogo;
