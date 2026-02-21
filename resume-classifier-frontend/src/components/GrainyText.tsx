import React from 'react';

interface GrainyTextProps {
    text: string;
    className?: string;
}



// Simplified Robust Version using CSS masking / background clip if possible?
// No, SVG filter is best for dynamic text.

const GrainyTextSimple: React.FC<GrainyTextProps> = ({ text, className }) => {
    return (
        <div className="relative isolate">
            {/* Define Filter Globally or scoped */}
            <svg style={{ position: 'absolute', width: 0, height: 0 }}>
                <filter id="noiseFilter">
                    <feTurbulence
                        type="fractalNoise"
                        baseFrequency="1.5"
                        numOctaves="3"
                        stitchTiles="stitch"
                    />
                    <feColorMatrix type="saturate" values="0" />
                    {/* Animate opacity or transform of masking noise? 
                        Animating 'seed' is jerky in some browsers but "cinematic" 
                    */}
                    <animate
                        attributeName="seed"
                        values="1;5;10;15;20"
                        dur="0.5s"
                        repeatCount="indefinite"
                        calcMode="discrete"
                    />
                </filter>
            </svg>

            <h1 className={`${className} relative overflow-hidden`}>
                {/* Base Text */}
                <span className="text-white relative z-10">{text}</span>

                {/* Noise Overlay */}
                <span
                    className="absolute inset-0 text-transparent pointer-events-none select-none z-20"
                    style={{
                        textShadow: '0 0 0 rgba(255,255,255, 0.5)',
                        filter: 'url(#noiseFilter)',
                        mixBlendMode: 'difference'
                    }}
                >
                    {text}
                </span>
            </h1>
        </div>
    );
};

export default GrainyTextSimple;
