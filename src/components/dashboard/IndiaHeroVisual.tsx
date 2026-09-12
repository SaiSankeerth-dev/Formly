"use client";

import React from "react";

export function IndiaHeroVisual({ className = "" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-end overflow-hidden pointer-events-none select-none ${className}`}>
      {/* Slogan Banner on Left of Monuments */}
      <div className="hidden lg:flex flex-col items-end text-right mr-4 z-10 shrink-0">
        <div className="text-[12px] font-black tracking-wider text-slate-800 uppercase leading-tight">
          CITIZENS
        </div>
        <div className="text-[13px] font-black tracking-wider text-[#2F27CE] uppercase leading-tight">
          STRONGER INDIA
        </div>
        <div className="text-[12px] font-black tracking-wider text-slate-700 uppercase leading-tight">
          BRIGHTER
        </div>
        <div className="text-[12px] font-black tracking-wider text-slate-800 uppercase leading-tight">
          TOMORROW
        </div>
        <div className="h-1 w-20 mt-1 flex rounded-full overflow-hidden shadow-2xs">
          <div className="flex-1 bg-[#FF9933]" />
          <div className="w-1 bg-white" />
          <div className="flex-1 bg-[#138808]" />
        </div>
      </div>

      {/* Main SVG Composition */}
      <div className="w-64 sm:w-80 md:w-96 lg:w-[420px] h-44 sm:h-48 md:h-52 relative shrink-0">
        <svg
          viewBox="0 0 420 180"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <defs>
            <linearGradient id="softBlueSky" x1="0" y1="0" x2="420" y2="180" gradientUnits="userSpaceOnUse">
              <stop stopColor="#EEF2FF" stopOpacity="0.5" />
              <stop offset="1" stopColor="#E0E7FF" stopOpacity="0.1" />
            </linearGradient>

            <linearGradient id="monumentLayerBack" x1="200" y1="60" x2="200" y2="180" gradientUnits="userSpaceOnUse">
              <stop stopColor="#C7D2FE" stopOpacity="0.5" />
              <stop offset="1" stopColor="#A5B4FC" stopOpacity="0.8" />
            </linearGradient>

            <linearGradient id="monumentLayerFront" x1="200" y1="70" x2="200" y2="180" gradientUnits="userSpaceOnUse">
              <stop stopColor="#818CF8" stopOpacity="0.75" />
              <stop offset="1" stopColor="#6366F1" stopOpacity="0.95" />
            </linearGradient>

            <linearGradient id="flagSaffronGrad" x1="0" y1="0" x2="1" y2="0">
              <stop stopColor="#FF9933" />
              <stop offset="1" stopColor="#FF7700" />
            </linearGradient>

            <linearGradient id="flagGreenGrad" x1="0" y1="0" x2="1" y2="0">
              <stop stopColor="#138808" />
              <stop offset="1" stopColor="#0E6606" />
            </linearGradient>

            {/* Soft decorative background glow blob */}
            <radialGradient id="sunGlow" cx="70%" cy="30%" r="60%">
              <stop offset="0%" stopColor="#DBEAFE" stopOpacity="0.7" />
              <stop offset="60%" stopColor="#EDE9FE" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Background Ambient Glow */}
          <circle cx="300" cy="80" r="100" fill="url(#sunGlow)" />

          {/* Flying Birds in Distance */}
          <path d="M 120 42 Q 126 37 132 42 Q 138 37 144 42" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.6" />
          <path d="M 142 32 Q 147 28 152 32 Q 157 28 162 32" stroke="#64748B" strokeWidth="1.3" strokeLinecap="round" fill="none" opacity="0.5" />
          <path d="M 160 46 Q 164 43 168 46 Q 172 43 176 46" stroke="#64748B" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.5" />
          <path d="M 320 28 Q 325 24 330 28 Q 335 24 340 28" stroke="#64748B" strokeWidth="1.3" strokeLinecap="round" fill="none" opacity="0.4" />

          {/* Flowing Soft Backdrop Curves */}
          <path
            d="M 140 180 C 180 130, 260 120, 420 100 L 420 180 Z"
            fill="#E0E7FF"
            fillOpacity="0.35"
          />

          {/* BACK LAYER MONUMENTS: Minarets, Domes, Pillars */}
          <g fill="url(#monumentLayerBack)">
            {/* Far Left Minaret */}
            <rect x="180" y="70" width="8" height="110" rx="1" />
            <circle cx="184" cy="67" r="5" />
            <line x1="184" y1="62" x2="184" y2="52" stroke="#A5B4FC" strokeWidth="1.5" />

            {/* Qutub-style Tower / Pillar */}
            <path d="M 360 180 L 366 50 L 372 50 L 378 180 Z" />
            <circle cx="369" cy="48" r="4" />
            <line x1="369" y1="44" x2="369" y2="34" stroke="#A5B4FC" strokeWidth="1.5" />

            {/* Temple Gopa / Dome */}
            <path d="M 320 180 L 320 95 Q 335 70 350 95 L 350 180 Z" />
            <line x1="335" y1="72" x2="335" y2="58" stroke="#A5B4FC" strokeWidth="1.5" />
          </g>

          {/* FRONT LAYER MONUMENTS: India Gate & Taj Mahal Dome */}
          <g fill="url(#monumentLayerFront)">
            {/* India Gate Silhouette */}
            <g transform="translate(195, 45)">
              {/* Base plinth */}
              <rect x="0" y="115" width="60" height="20" rx="2" />
              {/* Left Pillar */}
              <rect x="4" y="38" width="13" height="80" rx="1.5" />
              {/* Right Pillar */}
              <rect x="43" y="38" width="13" height="80" rx="1.5" />
              {/* Inner Arch Cutout */}
              <path d="M 17 65 C 17 48, 43 48, 43 65 L 43 118 L 17 118 Z" fill="#EEF2FF" opacity="0.6" />
              {/* Entablature */}
              <rect x="2" y="24" width="56" height="16" rx="2" />
              {/* Attic / Top Block */}
              <rect x="8" y="14" width="44" height="12" rx="1.5" />
              {/* Top Crown Chhatri */}
              <rect x="22" y="5" width="16" height="10" rx="1" />
              <line x1="30" y1="5" x2="30" y2="0" stroke="#6366F1" strokeWidth="1.5" />
            </g>

            {/* Taj Mahal Central Dome & Arches */}
            <g transform="translate(265, 55)">
              {/* Base Plinth */}
              <rect x="0" y="105" width="84" height="20" rx="2" />
              {/* Left Wing */}
              <rect x="4" y="60" width="22" height="48" rx="1" />
              {/* Right Wing */}
              <rect x="58" y="60" width="22" height="48" rx="1" />
              {/* Main Central Iwan Gate */}
              <rect x="22" y="45" width="40" height="63" rx="2" />
              {/* Central Arch Cutout */}
              <path d="M 30 65 C 30 52, 54 52, 54 65 L 54 108 L 30 108 Z" fill="#EEF2FF" opacity="0.6" />
              {/* Onion Dome */}
              <path d="M 27 46 C 27 18, 42 12, 42 4 C 42 12, 57 18, 57 46 Z" />
              <line x1="42" y1="4" x2="42" y2="-4" stroke="#6366F1" strokeWidth="1.8" />
              {/* Left Chhatri */}
              <rect x="12" y="40" width="8" height="20" rx="1" />
              <path d="M 10 40 Q 16 32 22 40 Z" />
              {/* Right Chhatri */}
              <rect x="64" y="40" width="8" height="20" rx="1" />
              <path d="M 62 40 Q 68 32 74 40 Z" />
            </g>
          </g>

          {/* National Flagpole with Fluttering Tricolor Flag */}
          <g transform="translate(245, 18)">
            {/* Pole */}
            <line x1="0" y1="0" x2="0" y2="120" stroke="#475569" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="0" cy="0" r="2.5" fill="#E2E8F0" stroke="#334155" strokeWidth="1" />

            {/* Waving Indian Flag */}
            <g>
              {/* Saffron Stripe */}
              <path
                d="M 1 3 Q 14 -1, 28 3 Q 40 7, 52 3 L 52 14 Q 40 18, 28 14 Q 14 10, 1 14 Z"
                fill="url(#flagSaffronGrad)"
              />
              {/* White Stripe */}
              <path
                d="M 1 14 Q 14 10, 28 14 Q 40 18, 52 14 L 52 25 Q 40 29, 28 25 Q 14 21, 1 25 Z"
                fill="#FFFFFF"
              />
              {/* Ashoka Chakra in center */}
              <circle cx="26" cy="19.5" r="3" stroke="#000088" strokeWidth="0.8" fill="none" />
              {/* Green Stripe */}
              <path
                d="M 1 25 Q 14 21, 28 25 Q 40 29, 52 25 L 52 36 Q 40 40, 28 36 Q 14 32, 1 36 Z"
                fill="url(#flagGreenGrad)"
              />
            </g>
          </g>

          {/* Script Text: "Your Government Services Companion" in flowing curved blue style */}
          <g transform="translate(300, 28) rotate(6)">
            <text
              x="0"
              y="0"
              fill="#2F27CE"
              fontFamily="system-ui, -apple-system, sans-serif"
              fontSize="11"
              fontStyle="italic"
              fontWeight="600"
              opacity="0.85"
            >
              Your
            </text>
            <text
              x="-6"
              y="13"
              fill="#2F27CE"
              fontFamily="system-ui, -apple-system, sans-serif"
              fontSize="11"
              fontStyle="italic"
              fontWeight="700"
              opacity="0.85"
            >
              Government Services
            </text>
            <text
              x="12"
              y="26"
              fill="#2F27CE"
              fontFamily="system-ui, -apple-system, sans-serif"
              fontSize="11"
              fontStyle="italic"
              fontWeight="600"
              opacity="0.85"
            >
              Companion
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
}
