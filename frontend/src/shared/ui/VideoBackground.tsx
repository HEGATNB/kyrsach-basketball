import { useEffect, useRef, useState } from 'react';

interface VideoBackgroundProps {
  videoSrc: string;
  overlayOpacity?: number;
  playbackSpeed?: number;
}

export const VideoBackground = ({
  videoSrc,
  overlayOpacity = 0.18,
  playbackSpeed = 1,
}: VideoBackgroundProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  useEffect(() => {
    if (!videoRef.current) {
      return;
    }

    videoRef.current.playbackRate = playbackSpeed;
    const playPromise = videoRef.current.play();

    if (playPromise) {
      playPromise.catch(() => {
        // Browser autoplay restrictions are fine here.
      });
    }
  }, [playbackSpeed]);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {!isVideoLoaded && <div className="absolute inset-0 bg-[linear-gradient(180deg,#120d09,#090604)]" />}

      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        onLoadedData={() => setIsVideoLoaded(true)}
        className="absolute inset-0 h-full w-full object-cover"
        style={{
          opacity: isVideoLoaded ? 1 : 0,
          filter: 'blur(0px) saturate(0.72) contrast(1.04) brightness(0.42)',
          transition: 'opacity 900ms ease',
        }}
      >
        <source src={videoSrc} type="video/mp4" />
      </video>

      <div
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,8,6,0.9),rgba(11,8,6,0.38),rgba(11,8,6,0.92))]"
        style={{ opacity: overlayOpacity }}
      />
    </div>
  );
};
