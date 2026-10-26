import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTelemetry } from '../context/TelemetryContext';

// Test controls live here so the main top bar stays quiet.
export default function DemoMenu({ onOpenDispatch }) {
  const { testAlarmSound, triggerSimulationAlert } = useTelemetry();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const firstItemRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    firstItemRef.current?.focus();
    const onPointer = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const sendTestAlert = () => {
    setOpen(false);
    testAlarmSound();
    triggerSimulationAlert('CHAINSAW', 'NODE-ALPHA', 0.98);
  };

  const simulateIncident = () => {
    setOpen(false);
    onOpenDispatch();
  };

  return (
    <div className="demo-menu" ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        className="btn-secondary"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        Demo tools
        <ChevronDown size={15} aria-hidden="true" className="demo-chevron" />
      </button>

      {open && (
        <div className="demo-popover" role="menu" aria-label="Demo tools">
          <button type="button" role="menuitem" className="demo-item" ref={firstItemRef} onClick={sendTestAlert}>
            <span className="demo-item-title">Send test alert</span>
            <span className="demo-item-desc">Plays the alert sound and adds a test chainsaw detection</span>
          </button>
          <button type="button" role="menuitem" className="demo-item" onClick={simulateIncident}>
            <span className="demo-item-title">Simulate an incident</span>
            <span className="demo-item-desc">Choose the threat, sensor and confidence yourself</span>
          </button>
        </div>
      )}
    </div>
  );
}
