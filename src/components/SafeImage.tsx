import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackTitle?: string;
  fallbackSubtitle?: string;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  className = '',
  fallbackTitle = 'AHUZA',
  fallbackSubtitle = 'Indian Contemporary Collection',
  ...rest
}) => {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#EFECE6] via-[#E5DFD5] to-[#D6CFC2] text-[#18181B] p-6 text-center select-none ${className}`}
        role="img"
        aria-label={alt || fallbackTitle}
      >
        <Sparkles className="w-6 h-6 text-[#9A3412] mb-2 opacity-80" />
        <span className="font-display text-lg font-semibold tracking-wide text-[#18181B]">
          {fallbackTitle}
        </span>
        <span className="text-xs text-[#52525B] mt-1">{fallbackSubtitle}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || fallbackTitle}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
      {...rest}
    />
  );
};
