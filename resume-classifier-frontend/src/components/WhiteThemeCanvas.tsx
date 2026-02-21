import React, { useEffect, useRef } from 'react';

const WhiteThemeCanvas: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        const mouse = { x: -1000, y: -1000 };

        // Physics
        let rotationX = 0;
        let rotationY = 0;
        let targetRotationX = 0;
        let targetRotationY = 0;
        let time = 0;

        const CONFIG = {
            count: 1500,
            radius: 450,
            color: '#1e293b',
            breathSpeed: 0.0015,
            breathAmp: 5,
            noiseSpeed: 0.005,
            magnetRadius: 600,   // Much wider reach
            magnetForce: 0.35    // Stronger pull
        };

        interface Point3D {
            x: number;
            y: number;
            z: number;
            bx: number;
            by: number;
            bz: number;
            phase: number;
            baseSize: number;
            // Physics state for magnetic pull
            vx: number;
            vy: number;
            dx: number; // Displacement X (from sphere center to attracted pos)
            dy: number;
        }

        let particles: Point3D[] = [];

        const initPoints = () => {
            particles = [];
            const phi = Math.PI * (3 - Math.sqrt(5));

            for (let i = 0; i < CONFIG.count; i++) {
                const y = 1 - (i / (CONFIG.count - 1)) * 2;
                const radiusAtY = Math.sqrt(1 - y * y);
                const theta = phi * i;

                const x = Math.cos(theta) * radiusAtY;
                const z = Math.sin(theta) * radiusAtY;

                let size = 0.5;
                const r = Math.random();
                if (r > 0.98) size = 2.0;
                else if (r > 0.9) size = 1.2;
                else size = 0.6 + Math.random() * 0.4;

                particles.push({
                    x: x * CONFIG.radius,
                    y: y * CONFIG.radius,
                    z: z * CONFIG.radius,
                    bx: x,
                    by: y,
                    bz: z,
                    phase: Math.random() * Math.PI * 2,
                    baseSize: size,
                    vx: 0,
                    vy: 0,
                    dx: 0, // Current magnetic displacement
                    dy: 0
                });
            }
        };

        const render = () => {
            time += 1;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const cx = canvas.width / 2;
            const cy = canvas.height / 2;

            // Fluid Inertia for Rotation
            const ease = 0.02;
            rotationX += (targetRotationX - rotationX) * ease;
            rotationY += (targetRotationY - rotationY) * ease;
            rotationY += 0.0005;

            const breath = Math.sin(time * CONFIG.breathSpeed) * CONFIG.breathAmp;
            const currentRadius = CONFIG.radius + breath;

            particles.forEach(p => {
                // 1. Calculate Base 3D Position (Spherical + Noise)
                const noiseX = Math.sin(p.phase + time * CONFIG.noiseSpeed) * 8;
                const noiseY = Math.cos(p.phase + time * CONFIG.noiseSpeed * 0.9) * 8;
                const noiseZ = Math.sin(p.phase + time * CONFIG.noiseSpeed * 1.1) * 8;

                const px = p.bx * currentRadius + noiseX;
                const py = p.by * currentRadius + noiseY;
                const pz = p.bz * currentRadius + noiseZ;

                // 2. Rotate 3D
                const y1 = py * Math.cos(rotationX) - pz * Math.sin(rotationX);
                const z1 = py * Math.sin(rotationX) + pz * Math.cos(rotationX);
                const x1 = px;

                const x2 = x1 * Math.cos(rotationY) - z1 * Math.sin(rotationY);
                const z2 = x1 * Math.sin(rotationY) + z1 * Math.cos(rotationY);
                const y2 = y1;

                // 3. Project to 2D Screen Space (Target Position)
                const scale = (z2 + 800) / 800;
                const targetScreenX = cx + x2;
                const targetScreenY = cy + y2;

                // 4. MAGNETIC PHYSICS INTERACTION
                // We offset the final screen position based on mouse pull
                // p.dx/dy store the "magnetic displacement"

                // Vector from particle (current visual pos) to Mouse
                // Current visual pos roughly matches (targetScreenX + p.dx)
                const currX = targetScreenX + p.dx;
                const currY = targetScreenY + p.dy;

                const mx = mouse.x - currX;
                const my = mouse.y - currY;
                const distToMouse = Math.sqrt(mx * mx + my * my);

                // Attraction (Magnet)
                if (distToMouse < CONFIG.magnetRadius) {
                    const force = (CONFIG.magnetRadius - distToMouse) / CONFIG.magnetRadius;
                    // Accelerate towards mouse
                    p.vx += (mx / distToMouse) * force * CONFIG.magnetForce * 5; // *5 for punchiness
                    p.vy += (my / distToMouse) * force * CONFIG.magnetForce * 5;
                }

                // Spring back to Base Position (TargetScreenX/Y)
                // The force trying to reset dx/dy to 0
                // Since dx = currX - targetScreenX, we just want to reduce dx
                p.vx -= p.dx * 0.02; // Weaker spring stiffness (stretchier)
                p.vy -= p.dy * 0.02;

                // Dampen velocity
                p.vx *= 0.92; // Less friction
                p.vy *= 0.92;

                // Update displacement
                p.dx += p.vx;
                p.dy += p.vy;

                // 5. Final Draw Position
                const finalX = targetScreenX + p.dx;
                const finalY = targetScreenY + p.dy;

                // Depth Opacity
                let alpha = (z2 + 350) / 700;
                alpha = Math.max(0.0, Math.min(1, alpha));

                if (alpha > 0.01) {
                    const r = p.baseSize * scale;
                    ctx.beginPath();
                    ctx.arc(finalX, finalY, r, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(30, 41, 59, ${alpha})`;
                    ctx.fill();
                }
            });

            animationFrameId = requestAnimationFrame(render);
        };

        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initPoints();
        };

        const handleMouseMove = (e: MouseEvent) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;

            // Also update rotation target (kept this because it feels good combined)
            const nx = (e.clientX / window.innerWidth) * 2 - 1;
            const ny = (e.clientY / window.innerHeight) * 2 - 1;
            targetRotationY = nx * 0.6;
            targetRotationX = ny * 0.4;
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('mousemove', handleMouseMove);

        handleResize();
        render();

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 z-0 pointer-events-none"
        />
    );
};

export default WhiteThemeCanvas;
