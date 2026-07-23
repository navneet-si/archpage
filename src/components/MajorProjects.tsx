'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const projects = [
  { id: 1, title: 'MIXED USE DEVELOPMENT', image: '/mixed.jpeg' },
  { id: 2, title: 'RAILWAY INFRASTRUCTURE', image: '/railway.jpeg' },
  { id: 3, title: 'AVIATION HUB', image: '/airport.jpeg' },
  { id: 4, title: 'MASS HOUSING PROJECTS', image: '/mass_housing.jpeg' }
];

export default function MajorProjects({ onClose }: { onClose: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollLeft, clientWidth } = containerRef.current;
    // Calculate which image is mostly in view
    const index = Math.round(scrollLeft / clientWidth);
    if (index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  // Allow mouse wheel to horizontally scroll the gallery
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      // Horizontal scroll or vertical scroll translates to horizontal
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        container.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      className="fixed inset-0 z-50 bg-neutral-950 flex font-sans"
    >
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="w-full h-full flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory hide-scrollbar relative"
        style={{ scrollBehavior: 'smooth' }}
      >
        {projects.map((project, index) => (
          <div 
            key={project.id} 
            className="w-screen h-screen flex-shrink-0 snap-start relative"
          >
            {/* Dark gradient overlay for text contrast and brutalist feel */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/60 z-10" />
            <img 
              src={project.image} 
              alt={project.title} 
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        ))}
      </div>

      {/* Dynamic Title Overlay */}
      <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-end pb-32 px-12 md:px-24">
         <AnimatePresence mode="wait">
            <motion.div
               key={activeIndex}
               initial={{ opacity: 0, y: 30 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -20 }}
               transition={{ duration: 0.6, ease: "easeOut" }}
            >
               <span className="text-white/50 tracking-[0.3em] text-sm md:text-base font-light mb-4 block uppercase">
                 Project {String(activeIndex + 1).padStart(2, '0')}
               </span>
               <h2 className="text-4xl md:text-7xl font-bold tracking-tighter text-white max-w-4xl leading-tight">
                 {projects[activeIndex].title}
               </h2>
            </motion.div>
         </AnimatePresence>
      </div>

      {/* Chevron Hint for Scrolling */}
      <div className="absolute right-12 top-1/2 -translate-y-1/2 z-20 pointer-events-none flex items-center justify-center">
         <motion.svg 
            animate={{ x: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className={`w-8 h-8 text-white/50 transition-opacity duration-300 ${activeIndex === projects.length - 1 ? 'opacity-0' : 'opacity-100'}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
         >
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5l7 7-7 7" />
         </motion.svg>
      </div>

      {/* Progress Bar / Dots */}
      <div className="absolute bottom-12 left-12 md:left-24 flex gap-4 z-20 pointer-events-none items-center">
        {projects.map((_, idx) => (
           <div 
             key={idx}
             className={`h-[2px] transition-all duration-500 ${idx === activeIndex ? 'w-16 bg-white' : 'w-6 bg-white/30'}`}
           />
        ))}
      </div>

      {/* Back to Menu Button */}
      <button 
        onClick={onClose}
        className="absolute top-8 left-8 md:top-12 md:left-12 z-50 flex items-center justify-center w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 hover:scale-105 transition-all duration-300 pointer-events-auto group"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5 text-white group-hover:-translate-x-1 transition-transform duration-300">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Global Style for hiding scrollbar */}
      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </motion.div>
  );
}
