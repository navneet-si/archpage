'use client';

import React, { useRef, useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const data = [
    {
        title:'THE BRUTALIST MONOLITH',
        videoUrl: '/tour_1.mp4',
        reversedVideoUrl: '/tour_1_reversed.mp4',
        checkpoints: [0, 4.15, 7.20, 8.40, 999],
    },
    {
        title:'THE KINETIC PAVILION',
        videoUrl: '/tour_2.mp4',
        reversedVideoUrl: '/tour_2_reversed.mp4',
        checkpoints: [0, 4.05, 6.50, 8.00, 999],
    }
];

// Global cache to prevent re-fetching blobs when component unmounts/remounts
const globalBlobCache: Record<string, string> = {};

export default function ProjectCarousel({ onClose }: { onClose: () => void }) {
  const container = useRef<HTMLDivElement>(null);
  
  const [blobsReady, setBlobsReady] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState(0); 
  const activeCardIndexRef = useRef(0);
  
  const [currentStep, setCurrentStep] = useState(0); 
  const targetTimeRef = useRef(data[0].checkpoints[0]);
  const virtualTimeRef = useRef(data[0].checkpoints[0]);
  const isVideoAnimatingRef = useRef(false);
  const activeDirectionRef = useRef<'forward' | 'backward'>('forward');

  // Preload videos into Blobs for zero-lag scrubbing
  useEffect(() => {
    let mounted = true;
    const fetchBlobs = async () => {
       const urls = data.flatMap(d => [d.videoUrl, d.reversedVideoUrl]);
       const toFetch = urls.filter(url => !globalBlobCache[url]);
       
       if (toFetch.length > 0) {
          await Promise.all(toFetch.map(async (url) => {
             try {
                const res = await fetch(url);
                const blob = await res.blob();
                globalBlobCache[url] = URL.createObjectURL(blob);
             } catch(e) {
                console.error("Failed to fetch", url, e);
                globalBlobCache[url] = url; // fallback
             }
          }));
       }
       if (mounted) {
          setBlobsReady(true);
       }
    };
    fetchBlobs();
    return () => { mounted = false; };
  }, []);

  // Next Project Handler
  const handleNextProject = () => {
     setActiveCardIndex((prev) => {
        const nextIdx = (prev + 1) % data.length;
        activeCardIndexRef.current = nextIdx;
        return nextIdx;
     });
     setCurrentStep(0);
     const initialTime = data[(activeCardIndex + 1) % data.length].checkpoints[0];
     targetTimeRef.current = initialTime;
     virtualTimeRef.current = initialTime;
     activeDirectionRef.current = 'forward';
  };

  // 1. Dual-Video Animation Engine
  useEffect(() => {
    if (!blobsReady) return;

    const fwdVid = document.getElementById(`fwd-vid-${activeCardIndex}`) as HTMLVideoElement;
    const revVid = document.getElementById(`rev-vid-${activeCardIndex}`) as HTMLVideoElement;
    if (!fwdVid || !revVid) return;

    // Reset initial state for the newly mounted active project
    if (activeDirectionRef.current === 'forward') {
       fwdVid.style.opacity = '1';
       virtualTimeRef.current = targetTimeRef.current;
       fwdVid.currentTime = virtualTimeRef.current;
       revVid.style.opacity = '0';
       revVid.currentTime = (revVid.duration || 10) - targetTimeRef.current;
    }

    fwdVid.play().then(() => fwdVid.pause()).catch(() => {});
    revVid.play().then(() => revVid.pause()).catch(() => {});

    let animationFrameId: number;

    const renderLoop = () => {
      if (fwdVid.readyState >= 1 && revVid.readyState >= 1 && fwdVid.duration) {
        const duration = fwdVid.duration; 
        const forwardTarget = Math.min(targetTimeRef.current, duration - 0.05);
        const activeDir = activeDirectionRef.current;

        if (activeDir === 'forward') {
          const current = virtualTimeRef.current;
          const diff = forwardTarget - current;
          
          if (Math.abs(diff) > 0.02) {
             isVideoAnimatingRef.current = true;
             
             // Exact physics curve from the first commit
             const distance = Math.abs(diff);
             const speedProgress = Math.min(distance / 1.5, 1.0);
             const virtualPlaybackRate = 0.5 + (speedProgress * 3.5);
             
             // Advance by (delta_time * playbackRate)
             const timeStep = Math.min(0.0166 * virtualPlaybackRate, distance);
             virtualTimeRef.current = current + (diff > 0 ? timeStep : -timeStep);
             fwdVid.currentTime = virtualTimeRef.current;
          } else {
             if (isVideoAnimatingRef.current) {
                virtualTimeRef.current = forwardTarget;
                fwdVid.currentTime = forwardTarget;
                isVideoAnimatingRef.current = false;
             }
          }
        } 
        else {
          const reverseTarget = duration - forwardTarget;
          const current = virtualTimeRef.current;
          const diff = reverseTarget - current;
          
          if (Math.abs(diff) > 0.02) {
             isVideoAnimatingRef.current = true;
             
             // Exact physics curve from the first commit
             const distance = Math.abs(diff);
             const speedProgress = Math.min(distance / 1.5, 1.0);
             const virtualPlaybackRate = 0.5 + (speedProgress * 3.5);
             
             // Advance by (delta_time * playbackRate)
             const timeStep = Math.min(0.0166 * virtualPlaybackRate, distance);
             virtualTimeRef.current = current + (diff > 0 ? timeStep : -timeStep);
             revVid.currentTime = virtualTimeRef.current;
          } else {
             if (isVideoAnimatingRef.current) {
                virtualTimeRef.current = reverseTarget;
                revVid.currentTime = reverseTarget;
                isVideoAnimatingRef.current = false;
             }
          }
        }
      }

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    animationFrameId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [activeCardIndex, blobsReady]);

  // 2. Scroll and Touch Input Handling
  useEffect(() => {
    if (!blobsReady) return;

    let isCoolingDown = false;
    let touchStartY = 0;

    const triggerScroll = (direction: 'up' | 'down') => {
      if (isCoolingDown || isVideoAnimatingRef.current) return;
      isCoolingDown = true;

      const fwdVid = document.getElementById(`fwd-vid-${activeCardIndexRef.current}`) as HTMLVideoElement;
      const revVid = document.getElementById(`rev-vid-${activeCardIndexRef.current}`) as HTMLVideoElement;
      
      if (!fwdVid || !revVid) {
         isCoolingDown = false;
         return;
      }
      
      const fDuration = fwdVid.duration || 10;
      const rDuration = revVid.duration || 10;

      if (direction === 'down') {
        if (activeDirectionRef.current === 'backward') {
           activeDirectionRef.current = 'forward';
           const newTime = Math.max(0, fDuration - virtualTimeRef.current);
           virtualTimeRef.current = newTime;
           fwdVid.currentTime = newTime;
           fwdVid.style.opacity = '1';
           revVid.style.opacity = '0';
        }
        
        setCurrentStep((prev) => {
          const next = Math.min(prev + 1, data[activeCardIndexRef.current].checkpoints.length - 1);
          targetTimeRef.current = data[activeCardIndexRef.current].checkpoints[next];
          return next;
        });
      } else {
        if (activeDirectionRef.current === 'forward') {
           activeDirectionRef.current = 'backward';
           const newTime = Math.max(0, fDuration - virtualTimeRef.current);
           virtualTimeRef.current = newTime;
           revVid.currentTime = newTime;
           fwdVid.style.opacity = '0';
           revVid.style.opacity = '1';
        }

        setCurrentStep((prev) => {
          const next = Math.max(prev - 1, 0);
          targetTimeRef.current = data[activeCardIndexRef.current].checkpoints[next];
          return next;
        });
      }

      setTimeout(() => {
        isCoolingDown = false;
      }, 500); 
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (Math.abs(e.deltaY) > 10) {
        triggerScroll(e.deltaY > 0 ? 'down' : 'up');
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault(); 
      const touchEndY = e.touches[0].clientY;
      const diff = touchStartY - touchEndY;
      
      if (Math.abs(diff) > 40) {
        triggerScroll(diff > 0 ? 'down' : 'up');
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [blobsReady]);

  if (!blobsReady) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center font-inter text-white">
         <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mb-6" />
         <p className="text-white/60 tracking-[0.2em] text-xs uppercase">Initializing Engine</p>
      </div>
    );
  }

  return (
    <div ref={container} className="fixed inset-0 z-[100] bg-black overflow-hidden font-inter text-white/90">
      
      {/* Background Videos with Swiping Transitions */}
      <div className="fixed inset-0 w-screen h-screen z-10 overflow-hidden bg-black">
        <AnimatePresence initial={false}>
          <motion.div
            key={activeCardIndex}
            className="absolute inset-0 w-full h-full transform-gpu"
            initial={{ x: '100%', scale: 0.8 }}
            animate={{ x: 0, scale: 1 }}
            exit={{ x: '-100%', scale: 1 }}
            transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
          >
            <video
              id={`fwd-vid-${activeCardIndex}`} 
              src={globalBlobCache[data[activeCardIndex].videoUrl] || data[activeCardIndex].videoUrl}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-150"
              style={{ opacity: 1 }}
              preload="auto"
              muted
              playsInline
            />

            <video
              id={`rev-vid-${activeCardIndex}`} 
              src={globalBlobCache[data[activeCardIndex].reversedVideoUrl] || data[activeCardIndex].reversedVideoUrl}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-150"
              style={{ opacity: 0 }}
              preload="auto"
              muted
              playsInline
            />
            
            {/* Dark overlay for readability */}
            <div className="absolute inset-0 bg-black/30 z-20 pointer-events-none" />
          </motion.div>
        </AnimatePresence>
      </div>

      <nav className="absolute left-10 top-10 z-50">
        <button 
          onClick={onClose} 
          className="!px-8 !py-3 whitespace-nowrap rounded-full text-xs uppercase font-medium tracking-widest text-white bg-white/10 backdrop-blur-md border border-white/20 shadow-[0_4px_30px_rgba(0,0,0,0.1)] hover:bg-white/20 hover:border-white/40 hover:scale-105 transition-all duration-300 cursor-pointer pointer-events-auto"
        >
           Back to Menu
        </button>
      </nav>

      {/* Checkpoint Indicators */}
      <div className="fixed right-8 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-5 items-center pointer-events-none">
        {data[activeCardIndex].checkpoints.map((_, index) => (
          <div
            key={index}
            className={`transition-all duration-500 ease-out rounded-full shadow-[0_0_10px_rgba(255,255,255,0.1)] 
              ${index === currentStep 
                ? 'w-2 h-8 bg-white' 
                : 'w-1.5 h-1.5 bg-white/20'
              }`}
          />
        ))}
      </div>

      {/* Chevron on Right Middle */}
      <button 
        onClick={handleNextProject}
        className="fixed right-24 top-1/2 -translate-y-1/2 z-50 w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-[0_4px_30px_rgba(0,0,0,0.1)] flex items-center justify-center hover:bg-white/20 hover:border-white/40 hover:scale-110 transition-all duration-300 pointer-events-auto cursor-pointer group"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6 text-white group-hover:translate-x-1 transition-transform duration-300">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Single Active Card on Bottom Right */}
      <div className="fixed right-12 bottom-12 z-40 pointer-events-none">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCardIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="relative w-[200px] h-[300px] rounded-xl overflow-hidden shadow-[6px_6px_10px_2px_rgba(0,0,0,0.6)] border border-white/10"
          >
            {/* Thumbnail Video paused at 0 */}
            <video 
              src={globalBlobCache[data[activeCardIndex].videoUrl] || data[activeCardIndex].videoUrl} 
              className="absolute inset-0 w-full h-full object-cover" 
              preload="metadata"
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
            
            {/* Title */}
            <div className="absolute bottom-6 left-6 right-6">
              <div className="w-8 h-[3px] bg-white rounded-full mb-3" />
              <h3 className="text-white text-lg font-bold tracking-wider leading-tight drop-shadow-md">
                {data[activeCardIndex].title}
              </h3>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

    </div>
  );
}
