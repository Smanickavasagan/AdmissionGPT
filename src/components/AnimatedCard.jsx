import { useRef } from 'react';
import './AnimatedCard.css';

export default function AnimatedCard({ children, className = '', style = {} }) {
  const ref = useRef(null);

  const handleMouseMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    const x = (e.clientX - left) / width  - 0.5;
    const y = (e.clientY - top)  / height - 0.5;
    el.style.transform = `perspective(700px) rotateY(${x * 7}deg) rotateX(${-y * 7}deg) translateY(-5px) scale(1.02)`;
    el.style.boxShadow = `
      ${-x * 14}px ${-y * 14}px 36px -8px rgba(37,99,235,0.18),
      0 8px 24px -6px rgba(37,99,235,0.10)
    `;
  };

  const handleMouseLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = '';
    el.style.boxShadow = '';
  };

  return (
    <div
      ref={ref}
      className={`anim-card ${className}`}
      style={style}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  );
}
