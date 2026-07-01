/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shirt, Baby, Home, ShieldCheck, ArrowRight, X, Sparkles, Flame, CheckCircle, Smartphone } from 'lucide-react';

interface OnboardingProps {
  onClose: () => void;
}

export default function Onboarding({ onClose }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Handcrafted Apparel & Curations",
      subtitle: "Bespoke Sourcing Platform",
      description: "Welcome to our direct pre-order terminal. We do not deal in mass-produced housewares or generic clothing. We curate premium, individual garments for adults, tailored accessories, and exquisite home detail accents.",
      icon: Shirt,
      accent: "Adult Apparel",
      badgeIcon: Sparkles,
      color: "from-amber-600/20 to-stone-900",
      accentColor: "text-amber-400"
    },
    {
      title: "Kids & Youth Sizing (0–18 Years)",
      subtitle: "Made for Growth & Durability",
      description: "Our dedicated children and youth catalogs cover sizing from newborn (0 months) up to teens (18 years). Every piece is meticulously tailored with room to grow, utilizing ultra-soft organic fibers and reinforced flatlock seams.",
      icon: Baby,
      accent: "0–18y Children Sizing",
      badgeIcon: Flame,
      color: "from-rose-600/20 to-stone-900",
      accentColor: "text-rose-400"
    },
    {
      title: "Securing Limited Allocations",
      subtitle: "Insured Direct Deliveries",
      description: "Artisan workshops operate with strict volume ceilings. Real-time trackers display remaining pre-order slots. Choose your currency (NGN / USD), lock in your reserve allocation, and follow transit windows transparently.",
      icon: ShieldCheck,
      accent: "Direct Pre-orders",
      badgeIcon: CheckCircle,
      color: "from-emerald-600/20 to-stone-900",
      accentColor: "text-emerald-400"
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('has_completed_preorder_onboarding', 'true');
    onClose();
  };

  const ActiveIcon = steps[currentStep].icon;
  const ActiveBadgeIcon = steps[currentStep].badgeIcon;

  return (
    <div className="fixed inset-0 z-55 flex items-stretch justify-stretch bg-stone-950 select-none overflow-hidden h-screen w-screen">
      {/* Immersive Screen Wrapper */}
      <div className="w-full h-full flex flex-col md:flex-row items-stretch justify-stretch relative">
        
        {/* Left Half: Aesthetic Visual Brand Board */}
        <div className="h-[35%] md:h-full md:w-[45%] lg:w-[40%] bg-stone-900 text-stone-100 p-6 md:p-12 flex flex-col justify-between relative overflow-hidden border-b md:border-b-0 md:border-r border-stone-800 shrink-0">
          {/* Ambient Glowing Background */}
          <div className="absolute inset-0 bg-radial-[circle_at_top_left] from-stone-800/50 via-stone-950 to-stone-950 pointer-events-none" />
          
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentStep}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className={`absolute inset-0 bg-gradient-to-br ${steps[currentStep].color} opacity-40 pointer-events-none`}
            />
          </AnimatePresence>

          {/* Top Row: Terminal Identifier */}
          <div className="relative z-10 flex items-center justify-between md:block md:space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-stone-300 font-mono">Bespoke Portal</span>
            </div>
            
            <button 
              onClick={handleComplete}
              className="md:hidden flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-stone-200 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm transition-all"
              title="Skip onboarding"
            >
              Skip
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* Center visual: Big Bold Pulsing Sizing / Sourcing Icon */}
          <div className="relative z-10 flex flex-col items-center justify-center flex-1 py-2 md:py-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, scale: 0.75, rotate: -20 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.75, rotate: 20 }}
                transition={{ type: "spring", stiffness: 350, damping: 22 }}
                className={`p-6 md:p-10 rounded-full bg-stone-950/80 border border-stone-800/60 shadow-2xl ${steps[currentStep].accentColor} mb-3 md:mb-6`}
              >
                <ActiveIcon className="w-12 h-12 md:w-20 md:h-20 stroke-[1]" />
              </motion.div>
            </AnimatePresence>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="text-center hidden xs:block"
              >
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest bg-stone-950 text-stone-300 border border-stone-800 shadow-md">
                  <ActiveBadgeIcon className={`w-3.5 h-3.5 ${steps[currentStep].accentColor}`} />
                  {steps[currentStep].accent}
                </span>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom branding identifier */}
          <div className="hidden md:flex items-center justify-between text-[10px] text-stone-500 font-mono tracking-wider relative z-10">
            <span>SECURED BY FIRESTORE</span>
            <span>VER. 3.5</span>
          </div>
        </div>

        {/* Right Half: Narrative & Interactive wizard content (Fully fills the viewport) */}
        <div className="flex-1 bg-stone-50 p-6 sm:p-10 md:p-16 flex flex-col justify-between overflow-y-auto">
          
          {/* Progress Row & Desktop Skip button */}
          <div className="flex items-center justify-between shrink-0">
            <div className="flex gap-2 w-1/3">
              {steps.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStep(idx)}
                  className={`h-2 rounded-full transition-all duration-500 flex-1 ${
                    idx === currentStep ? 'bg-stone-900 shadow-sm' : 'bg-stone-300/70 hover:bg-stone-400'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
            
            <button 
              onClick={handleComplete}
              className="hidden md:flex items-center gap-1 px-4 py-2 rounded-full hover:bg-stone-200 text-stone-600 hover:text-stone-950 transition-all font-bold text-xs uppercase tracking-wider active:scale-95"
              title="Skip onboarding"
            >
              <span>Skip Introductory Walkthrough</span>
              <X className="w-4 h-4 text-stone-400" />
            </button>
          </div>

          {/* Slide narratives with rich serif heading and custom spacing */}
          <div className="flex-1 flex flex-col justify-center py-6 md:py-12 max-w-2xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ type: "spring", stiffness: 350, damping: 28 }}
                className="space-y-4 md:space-y-6"
              >
                <div className="space-y-1.5 md:space-y-2">
                  <span className={`text-[10px] md:text-xs font-black uppercase tracking-widest block font-mono ${steps[currentStep].accentColor.replace('text-', 'text-stone-600')}`}>
                    {steps[currentStep].subtitle}
                  </span>
                  <h1 className="font-serif text-2xl sm:text-3xl md:text-5xl font-black text-stone-900 leading-[1.1] tracking-tight">
                    {steps[currentStep].title}
                  </h1>
                </div>
                
                <p className="text-xs sm:text-sm md:text-base text-stone-600 leading-relaxed font-normal font-sans">
                  {steps[currentStep].description}
                </p>

                {/* Device responsiveness illustration badge */}
                <div className="flex items-center gap-2 text-stone-400 text-[10px] md:text-xs font-mono pt-2">
                  <Smartphone className="w-4 h-4 text-stone-400" />
                  <span>Configured beautifully for mobile, tablet, desktop &amp; retina views.</span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Stepper Footer Action Controls */}
          <div className="flex items-center justify-between pt-6 border-t border-stone-200 shrink-0">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className={`text-xs md:text-sm font-black uppercase tracking-widest transition-all ${
                currentStep === 0 
                  ? 'text-stone-300 cursor-not-allowed pointer-events-none' 
                  : 'text-stone-500 hover:text-stone-950 active:scale-95'
              }`}
            >
              Back
            </button>

            <button
              id="onboarding-next-btn"
              onClick={handleNext}
              className="flex items-center gap-2 bg-stone-900 text-white hover:bg-stone-850 active:scale-95 px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl text-xs md:text-sm font-black uppercase tracking-widest shadow-xl hover:shadow-2xl transition-all"
            >
              <span>{currentStep === steps.length - 1 ? 'Start Browsing Catalog' : 'Next Step'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
