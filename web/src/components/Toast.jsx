import { useEffect } from 'react';
import './Toast.css';

/** Bottom-right confirmation toast. Auto-dismisses; pass `null` message to hide. */
export function Toast({ message, onDismiss }) {
  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div className="toast" role="status">
      {message}
    </div>
  );
}
