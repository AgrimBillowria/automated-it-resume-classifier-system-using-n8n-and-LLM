import React, { useRef, useEffect } from 'react';

interface TextSegment {
    text: string;
    fontWeight?: string | number;
    color?: string; // e.g. 'rgba(255,255,255,1)'
}

interface ParticleTextProps {
    segments: TextSegment[];
    className?: string;
    fontSize?: number;
    letterSpacing?: number; // in em (e.g. 0.2)
}

const ParticleText: React.FC<ParticleTextProps> = ({
    segments,
    className = '',
    fontSize = 60,
    letterSpacing = 0.2
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        let animationFrameId: number;
        let particles: Particle[] = [];
        // Start mouse off-screen
        const mouse = { x: -1000, y: -1000 };

        interface Particle {
            x: number;
            y: number;
            originX: number;
            originY: number;
            vx: number;
            vy: number;
            color: string;
            size: number;
            angle: number;
        }

        const density = 2; // Pixel skip step
        const particleSize = 1.2;
        const interactionRadius = 80;

        const init = () => {
            // 1. Measure Total Dimensions
            const spacingPx = fontSize * letterSpacing;

            // Calculate total width based on segments
            const segmentMetrics = segments.map(seg => {
                ctx.font = `${seg.fontWeight || 'bold'} ${fontSize}px "Outfit", sans-serif`;
                const chars = seg.text.split('');
                const charWidths = chars.map(char => ctx.measureText(char).width);
                const segWidth = charWidths.reduce((a, b) => a + b, 0) + (chars.length) * spacingPx;
                return { chars, charWidths, segWidth };
            });

            // Total width minus the last spacing of the last character
            const totalWidth = segmentMetrics.reduce((a, b) => a + b.segWidth, 0) - spacingPx;

            // Set canvas size
            canvas.width = totalWidth + 40; // buffer
            canvas.height = fontSize * 4;

            particles = [];

            const startX = (canvas.width - totalWidth) / 2;
            const startY = canvas.height / 2;

            let currentX = startX;

            // 2. Draw Text Segments
            ctx.textBaseline = 'middle';

            segments.forEach((seg, segIdx) => {
                ctx.fillStyle = seg.color || 'white';
                ctx.font = `${seg.fontWeight || 'bold'} ${fontSize}px "Outfit", sans-serif`;

                const { chars, charWidths } = segmentMetrics[segIdx];

                chars.forEach((char, charIdx) => {
                    ctx.fillText(char, currentX, startY);
                    currentX += charWidths[charIdx] + spacingPx;
                });
            });

            // 3. Scan Pixels
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear text

            for (let y = 0; y < canvas.height; y += density) {
                for (let x = 0; x < canvas.width; x += density) {
                    const index = (y * canvas.width + x) * 4;
                    const alpha = data[index + 3];

                    if (alpha > 10) {
                        const r = data[index];
                        const g = data[index + 1];
                        const b = data[index + 2];
                        const color = `rgba(${r},${g},${b},${alpha / 255})`;

                        particles.push({
                            x: x,
                            y: y,
                            originX: x,
                            originY: y,
                            vx: 0,
                            vy: 0,
                            color: color,
                            size: particleSize,
                            angle: Math.random() * Math.PI * 2
                        });
                    }
                }
            }
        };

        const update = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach(p => {
                // Interactive Physics: Mouse Proximity
                const dx = mouse.x - p.x;
                const dy = mouse.y - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                const isClose = dist < interactionRadius;

                if (isClose) {
                    // EXPLODE / MELT Logic
                    const force = (interactionRadius - dist) / interactionRadius;

                    // Push away from mouse slightly + random noise
                    p.vx += (Math.random() - 0.5) * 4 * force;
                    p.vy += (Math.random() - 0.5) * 4 * force;

                    // Add "Melt" gravity
                    p.vy += 0.5 * force;
                } else {
                    // RETURN Logic
                    const hdx = p.originX - p.x;
                    const hdy = p.originY - p.y;
                    const hdist = Math.sqrt(hdx * hdx + hdy * hdy);

                    if (hdist > 0.5) {
                        const force = hdist * 0.08;
                        p.vx += (hdx / hdist) * force * 0.5;
                        p.vy += (hdy / hdist) * force * 0.5;
                    } else {
                        p.x = p.originX;
                        p.y = p.originY;
                        p.vx = 0;
                        p.vy = 0;
                    }
                }

                // Friction
                p.vx *= 0.85;
                p.vy *= 0.85;

                // Position Update
                p.x += p.vx;
                p.y += p.vy;

                // Draw
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            });

            animationFrameId = requestAnimationFrame(update);
        };

        const handleMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            mouse.x = e.clientX - rect.left;
            mouse.y = e.clientY - rect.top;
        };

        const handleMouseLeave = () => {
            // Move mouse far away to trigger return
            mouse.x = -1000;
            mouse.y = -1000;
        };

        document.fonts.ready.then(() => {
            init();
        });

        update();

        window.addEventListener('resize', init);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', init);
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, [segments, fontSize, letterSpacing]);

    return (
        <div className={`${className} relative inline-flex justify-center items-center`}>
            <canvas ref={canvasRef} style={{ width: 'auto', height: 'auto', maxWidth: '100%' }} />
        </div>
    );
};

export default ParticleText;
