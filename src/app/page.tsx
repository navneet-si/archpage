'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ProjectCarousel from '@/components/ProjectCarousel';

// The specific timestamps to pause at (in the forward timeline)
const CHECKPOINTS = [0, 5.5, 10];

export default function Home() {
  const forwardVideoRef = useRef<HTMLVideoElement>(null);
  const reverseVideoRef = useRef<HTMLVideoElement>(null);
  
  const [currentStep, setCurrentStep] = useState(0);
  const [mousePos, setMousePos] = useState({ x: -100, y: -100 });
  const [isHoveringLink, setIsHoveringLink] = useState(false);
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const activeProjectRef = useRef<string | null>(null);
  
  const targetTimeRef = useRef(CHECKPOINTS[0]);
  const isAnimatingRef = useRef(false);
  const activeDirectionRef = useRef<'forward' | 'backward'>('forward');

  // 1. Dual-Video Animation Engine
  useEffect(() => {
    const fwdVid = forwardVideoRef.current;
    const revVid = reverseVideoRef.current;
    if (!fwdVid || !revVid) return;

    // Preload both buffers slightly
    fwdVid.play().then(() => fwdVid.pause()).catch(() => {});
    revVid.play().then(() => revVid.pause()).catch(() => {});

    let animationFrameId: number;

    const renderLoop = () => {
      // Wait until metadata is loaded so we have accurate duration
      if (fwdVid.readyState >= 1 && revVid.readyState >= 1 && fwdVid.duration) {
        const duration = fwdVid.duration; 
        const forwardTarget = targetTimeRef.current;
        const activeDir = activeDirectionRef.current;

        // --- FORWARD SCROLLING ---
        if (activeDir === 'forward') {
          const current = fwdVid.currentTime;
          const diff = forwardTarget - current;
          
          if (diff > 0.05) {
             isAnimatingRef.current = true;
             
             // Dynamic Cinematic Easing
             const distance = Math.abs(diff);
             const speedProgress = Math.min(distance / 1.5, 1.0);
             fwdVid.playbackRate = 0.5 + (speedProgress * 3.5); // Max 4.0x
             
             if (fwdVid.paused) fwdVid.play().catch(()=>{});
          } else {
             if (isAnimatingRef.current) {
                fwdVid.pause();
                fwdVid.currentTime = forwardTarget;
                isAnimatingRef.current = false;
             }
          }
        } 
        // --- BACKWARD SCROLLING (Via Pre-Calculated Reversed Video) ---
        else {
          const reverseTarget = duration - forwardTarget;
          const current = revVid.currentTime;
          const diff = reverseTarget - current;
          
          // We are playing the REVERSED video FORWARD towards the reverseTarget!
          if (diff > 0.05) {
             isAnimatingRef.current = true;
             
             // Same dynamic easing, but applied to the reversed video
             const distance = Math.abs(diff);
             const speedProgress = Math.min(distance / 1.5, 1.0);
             revVid.playbackRate = 0.5 + (speedProgress * 3.5); // Max 4.0x
             
             if (revVid.paused) revVid.play().catch(()=>{});
          } else {
             if (isAnimatingRef.current) {
                revVid.pause();
                revVid.currentTime = reverseTarget;
                isAnimatingRef.current = false;
             }
          }
        }
      }

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    animationFrameId = requestAnimationFrame(renderLoop);

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // 2. Scroll and Touch Input Handling
  useEffect(() => {
    let isCoolingDown = false;
    let touchStartY = 0;

    const triggerScroll = (direction: 'up' | 'down') => {
      if (isCoolingDown || isAnimatingRef.current || activeProjectRef.current) return;
      isCoolingDown = true;

      const fwdVid = forwardVideoRef.current;
      const revVid = reverseVideoRef.current;
      
      if (!fwdVid || !revVid || !fwdVid.duration || !revVid.duration) {
         isCoolingDown = false;
         return;
      }

      if (direction === 'down') {
        // If we were previously rewinding, sync the forward video to the reverse video's current position
        if (activeDirectionRef.current === 'backward') {
           activeDirectionRef.current = 'forward';
           fwdVid.currentTime = Math.max(0, fwdVid.duration - revVid.currentTime);
           fwdVid.style.opacity = '1';
           revVid.style.opacity = '0';
        }
        
        setCurrentStep((prev) => {
          const next = Math.min(prev + 1, CHECKPOINTS.length - 1);
          targetTimeRef.current = CHECKPOINTS[next];
          return next;
        });
      } else {
        // If we were previously scrolling forward, sync the reverse video to the forward video's current position
        if (activeDirectionRef.current === 'forward') {
           activeDirectionRef.current = 'backward';
           revVid.currentTime = Math.max(0, fwdVid.duration - fwdVid.currentTime);
           fwdVid.style.opacity = '0';
           revVid.style.opacity = '1';
        }

        setCurrentStep((prev) => {
          const next = Math.max(prev - 1, 0);
          targetTimeRef.current = CHECKPOINTS[next];
          return next;
        });
      }

      // Add a slight cooldown to prevent double-scroll on sensitive trackpads
      setTimeout(() => {
        isCoolingDown = false;
      }, 500); 
    };

    // Trackpad / Mouse Wheel
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (Math.abs(e.deltaY) > 10) {
        triggerScroll(e.deltaY > 0 ? 'down' : 'up');
      }
    };

    // Mobile Swipe (Touch)
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

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <main className="bg-neutral-950 overflow-hidden w-screen h-screen">
      {/* Background Video Layer */}
      <div className="fixed inset-0 w-screen h-screen z-10 overflow-hidden bg-neutral-950">
        
        {/* Forward Video */}
        <video
          ref={forwardVideoRef}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-150"
          style={{ opacity: 1 }}
          preload="auto"
          muted
          playsInline
        >
          <source src="/new_tour.mp4" type="video/mp4" />
        </video>

        {/* Reversed Video */}
        <video
          ref={reverseVideoRef}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-150"
          style={{ opacity: 0 }}
          preload="auto"
          muted
          playsInline
        >
          <source src="/new_tour_reversed.mp4" type="video/mp4" />
        </video>

      </div>

      {/* Interactive HTML Overlay Layers */}
      <div className="absolute inset-0 z-20 w-full min-h-screen pointer-events-none">
        <AnimatePresence mode="wait">
          {/* CHECKPOINT 0: Entrance */}
          {currentStep === 0 && (
            <motion.div
              key="step-0"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.2 }
                },
                exit: {
                  opacity: 0,
                  transition: { staggerChildren: 0.1, staggerDirection: -1 }
                }
              }}
              className="absolute inset-0 flex items-center px-6 md:px-0"
            >
              {/* Dark Gradient Overlay for Landing Page */}
              <motion.div 
                 variants={{
                    hidden: { opacity: 0 },
                    visible: { opacity: 1, transition: { duration: 1 } },
                    exit: { opacity: 0, transition: { duration: 0.5 } }
                 }}
                 className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent -z-10"
              />

              <div className="absolute left-[8%] md:left-[12%] max-w-2xl text-left">
                <motion.h1 
                  variants={{
                    hidden: { opacity: 0, x: -50 },
                    visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: "easeOut" } },
                    exit: { opacity: 0, x: -50, transition: { duration: 0.5 } }
                  }}
                  className="text-5xl md:text-7xl font-light tracking-wide text-white mb-2"
                >
                  RADICAL SPACES.
                </motion.h1>
                <motion.span 
                  variants={{
                    hidden: { opacity: 0, x: -50 },
                    visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: "easeOut" } },
                    exit: { opacity: 0, x: -50, transition: { duration: 0.5 } }
                  }}
                  className="text-5xl md:text-7xl font-extrabold tracking-tight text-white block mb-6"
                >
                  DELHI NCR.
                </motion.span>
                <motion.p 
                  variants={{
                    hidden: { opacity: 0, x: -50 },
                    visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: "easeOut" } },
                    exit: { opacity: 0, x: -50, transition: { duration: 0.5 } }
                  }}
                  className="text-white/70 text-lg md:text-xl font-light leading-relaxed max-w-lg"
                >
                  We believe in raw materials, monumental forms, and the honest expression of concrete. 
                  Our brutalist philosophy creates spaces that are as structurally uncompromising as they are beautiful.
                </motion.p>
              </div>
            </motion.div>
          )}

          {/* CHECKPOINT 1: Project Menu */}
          {currentStep === 1 && (
            <motion.div
              key="step-1"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.15 }
                },
                exit: {
                  opacity: 0,
                  transition: { staggerChildren: 0.1, staggerDirection: -1 }
                }
              }}
              className="absolute inset-0 flex items-center px-6 md:px-0"
            >
              {/* Dark Gradient Overlay for Menu Readability */}
              <motion.div 
                 variants={{
                    hidden: { opacity: 0 },
                    visible: { opacity: 1, transition: { duration: 1 } },
                    exit: { opacity: 0, transition: { duration: 0.5 } }
                 }}
                 className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-transparent -z-10"
              />

              <div className="absolute left-[12%] md:left-[16%] max-w-none w-max">
                <nav className="flex flex-col gap-6 pointer-events-auto items-start">
                  {[
                    "VIEW HOUSES", 
                    "OPTION 2 (TBD)", 
                    "OPTION 3 (TBD)"
                  ].map((item, i) => (
                    <motion.button
                      key={item}
                      onClick={() => {
                        if (item === "VIEW HOUSES") {
                          setActiveProject(item);
                          activeProjectRef.current = item;
                        }
                      }}
                      onMouseEnter={() => setIsHoveringLink(true)}
                      onMouseLeave={() => setIsHoveringLink(false)}
                      variants={{
                        hidden: { opacity: 0, x: -30 },
                        visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeOut" } },
                        exit: { opacity: 0, x: -30, transition: { duration: 0.4 } }
                      }}
                      style={{ padding: "20px 64px" }}
                      className="group relative flex items-center justify-between gap-12 w-fit rounded-2xl transition-all duration-300 border-none bg-transparent hover:bg-white/30 hover:backdrop-blur-md cursor-pointer text-left"
                    >
                      <span className="text-white/70 group-hover:text-white text-xl md:text-2xl font-light tracking-wide transition-colors duration-300">
                        {item}
                      </span>
                      {/* Chevron Arrow */}
                      <svg 
                        className="w-4 h-4 text-white opacity-0 -translate-x-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24" 
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </motion.button>
                  ))}
                </nav>
              </div>
            </motion.div>
          )}

          {/* CHECKPOINT 2: Contact Endpoint */}
          {currentStep === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-md px-6 pointer-events-auto"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.8 }}
                className="flex flex-col items-center text-center"
              >
                <h2 className="text-4xl md:text-6xl font-light tracking-tight text-white mb-6">Let's build your masterpiece.</h2>
                <p className="text-white/60 text-lg md:text-xl font-light max-w-md mb-8">
                  Begin your custom architectural briefing. Our timelines typically start at 12 months from concept to concrete.
                </p>
                <a 
                  href="https://wa.me/1234567890"
                  target="_blank"
                  rel="noopener noreferrer"
                  onMouseEnter={() => setIsHoveringLink(true)}
                  onMouseLeave={() => setIsHoveringLink(false)}
                  className="!px-8 !py-3 whitespace-nowrap inline-flex items-center justify-center rounded-full text-xs uppercase font-medium tracking-widest text-white bg-white/10 backdrop-blur-md border border-white/20 shadow-[0_4px_30px_rgba(0,0,0,0.1)] hover:bg-white/20 hover:border-white/40 hover:scale-105 transition-all duration-300 cursor-pointer pointer-events-auto"
                >
                  Initiate Project
                </a>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Custom Mouse Cursor Ring */}
      <motion.div
        className="fixed top-0 left-0 w-16 h-16 border border-white/60 rounded-full pointer-events-none z-[100]"
        animate={{
          x: mousePos.x - 32, // center the 64px width ring
          y: mousePos.y - 32,
          scale: isHoveringLink ? 0.7 : 1, // Shrink slightly when hovering over a button
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 28, mass: 0.2 }} // Fast trailing spring physics
      />

      {/* Checkpoint Indicators */}
      <div className="fixed right-8 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-5 items-center pointer-events-none">
        {CHECKPOINTS.map((_, index) => (
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
      
      {/* Project Carousel Overlay */}
      {activeProject && (
        <ProjectCarousel onClose={() => {
          setActiveProject(null);
          activeProjectRef.current = null;
        }} />
      )}
    </main>
  );
}
