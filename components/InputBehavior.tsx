'use client';

import { useEffect } from 'react';

export default function InputBehavior() {
  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const el = e.target as HTMLInputElement;
      if (el.tagName === 'INPUT' && (el.type === 'number' || el.type === 'text' || el.type === 'tel')) {
        // Pequeño timeout para que funcione en iOS también
        setTimeout(() => el.select(), 0);
      }
    };

    const handleWheel = (e: WheelEvent) => {
      // Evitar que la rueda del mouse cambie el valor de inputs numéricos
      const el = e.target as HTMLInputElement;
      if (el.tagName === 'INPUT' && el.type === 'number') {
        el.blur();
      }
    };

    document.addEventListener('focus', handleFocus, true);
    document.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      document.removeEventListener('focus', handleFocus, true);
      document.removeEventListener('wheel', handleWheel);
    };
  }, []);

  return null;
}