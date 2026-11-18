import { useRef, type KeyboardEvent, type MouseEvent, type PointerEvent, type WheelEvent } from 'react';
import type { Command } from './model';

const keys: Record<string, Command> = {
  ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
  Enter: 'confirm', ' ': 'confirm', Escape: 'back', Backspace: 'back',
  x: 'details', X: 'details', KeyX: 'details', m: 'menu', M: 'menu', KeyM: 'menu', ContextMenu: 'menu',
};
export function handleXmbKey(event: KeyboardEvent, command: (value: Command) => void) {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  const action = event.shiftKey && event.key === 'F10' ? 'menu' : keys[event.key] ?? keys[event.code];
  if (!action) return;
  event.preventDefault();
  event.stopPropagation();
  if (!event.repeat || ['left', 'right', 'up', 'down'].includes(action)) command(action);
}

export function useBrowserGestures(command: (value: Command) => void) {
  const start = useRef<{ id: number; x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const lastWheel = useRef(-Infinity);

  return {
    onPointerDown(event: PointerEvent) {
      swiped.current = false;
      start.current = event.isPrimary && event.pointerType === 'touch'
        ? { id: event.pointerId, x: event.clientX, y: event.clientY } : null;
    },
    onPointerCancel() { start.current = null; },
    onPointerUp(event: PointerEvent) {
      const point = start.current;
      start.current = null;
      if (!point || event.pointerId !== point.id) return;
      const dx = event.clientX - point.x, dy = event.clientY - point.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return;
      swiped.current = true;
      command(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'right' : 'left') : (dy < 0 ? 'down' : 'up'));
    },
    onClickCapture(event: MouseEvent) {
      if (swiped.current) { swiped.current = false; event.preventDefault(); event.stopPropagation(); }
    },
    onWheel(event: WheelEvent) {
      if (event.ctrlKey || Math.max(Math.abs(event.deltaX), Math.abs(event.deltaY)) < 1) return;
      event.stopPropagation();
      if (event.timeStamp - lastWheel.current < 110) return;
      lastWheel.current = event.timeStamp;
      command(Math.abs(event.deltaX) > Math.abs(event.deltaY)
        ? (event.deltaX > 0 ? 'right' : 'left') : (event.deltaY > 0 ? 'down' : 'up'));
    },
  };
}
