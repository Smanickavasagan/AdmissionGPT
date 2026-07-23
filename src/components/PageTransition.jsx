import { useLocation } from 'react-router-dom';
import { useRef, useEffect } from 'react';
import './PageTransition.css';

export default function PageTransition({ children }) {
  const { pathname } = useLocation();
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.remove('page-enter');
    void el.offsetWidth; // force reflow
    el.classList.add('page-enter');
  }, [pathname]);

  return (
    <div ref={ref} className="page-transition page-enter">
      {children}
    </div>
  );
}
