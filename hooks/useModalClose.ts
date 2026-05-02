import { useRef } from 'react';

/**
 * Evita que el modal se cierre cuando el usuario arrastra el mouse
 * desde adentro del modal hacia afuera (por ejemplo al seleccionar texto).
 * Solo cierra si el mousedown Y el mouseup ocurrieron sobre el overlay.
 */
export function useModalClose(onClose: () => void) {
  const mouseDownOnOverlay = useRef(false);

  const overlayProps = {
    onMouseDown: (e: React.MouseEvent) => {
      mouseDownOnOverlay.current = e.target === e.currentTarget;
    },
    onMouseUp: (e: React.MouseEvent) => {
      if (mouseDownOnOverlay.current && e.target === e.currentTarget) {
        onClose();
      }
    },
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
  };

  return overlayProps;
}