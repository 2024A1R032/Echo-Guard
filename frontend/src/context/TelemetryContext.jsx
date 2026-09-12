import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { fetchRecentAlerts, getWebSocketEndpoint, checkBackendHealth, postTelemetryAlert } from '../services/api';

const TelemetryContext = createContext(null);

export const DEFAULT_NODES = [
  { id: 'NODE-ALPHA', name: 'Alpha Reserve North', lat: -3.4653, lon: -62.2159, battery: 94, status: 'ONLINE', signal: 98 },
  { id: 'NODE-BRAVO', name: 'Bravo River Outpost', lat: -3.4812, lon: -62.1984, battery: 88, status: 'ONLINE', signal: 92 },
  { id: 'NODE-CHARLIE', name: 'Charlie Canopy Perimeter', lat: -3.4501, lon: -62.2341, battery: 91, status: 'ONLINE', signal: 95 },
  { id: 'NODE-DELTA', name: 'Delta Marine Sanctuary', lat: -3.4735, lon: -62.2510, battery: 76, status: 'ONLINE', signal: 86 },
  { id: 'NODE-ECHO', name: 'Echo Deep Rainforest', lat: -3.4920, lon: -62.2215, battery: 83, status: 'ONLINE', signal: 89 },
  { id: 'NODE-FOXTROT', name: 'Foxtrot Boundary Creek', lat: -3.4410, lon: -62.1890, battery: 65, status: 'ONLINE', signal: 78 },
];

export function TelemetryProvider({ children }) {
  const [alerts, setAlerts] = useState([]);
  const [activeThreats, setActiveThreats] = useState([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [backendOnline, setBackendOnline] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [filterThreat, setFilterThreat] = useState('ALL');
  const [nodes, setNodes] = useState(DEFAULT_NODES);

  const wsRef = useRef(null);
  const audioCtxRef = useRef(null);

  // Play audible tactical alarm beep using Web Audio API
  const playAlertSound = useCallback((threatType = 'CHAINSAW') => {
    if (!audioEnabled) return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      let baseFreq = 880;
      if (threatType === 'GUNSHOT') baseFreq = 950;
      if (threatType === 'CHAINSAW') baseFreq = 800;
      if (threatType === 'BLAST_FISHING') baseFreq = 650;

      // Tone 1 (Initial Beep)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(baseFreq, now);
      osc1.frequency.exponentialRampToValueAtTime(baseFreq * 1.25, now + 0.1);
      gain1.gain.setValueAtTime(0.18, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.12);

      // Tone 2 (Secondary High Beep)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(baseFreq * 1.4, now + 0.14);
      osc2.frequency.exponentialRampToValueAtTime(baseFreq * 1.6, now + 0.28);
      gain2.gain.setValueAtTime(0.2, now + 0.14);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.14);
      osc2.stop(now + 0.3);
    } catch (e) {
      console.warn('Audio playback failed (interaction required):', e);
    }
  }, [audioEnabled]);

  const testAlarmSound = useCallback(() => {
    playAlertSound('CHAINSAW');
  }, [playAlertSound]);

  // Handle incoming live alert
  const handleNewAlert = useCallback((alert) => {
    const alertWithMeta = {
      ...alert,
      isNew: true,
      receivedAt: new Date().toISOString(),
    };

    setAlerts((prev) => [alertWithMeta, ...prev.slice(0, 99)]);
    setActiveThreats((prev) => [alertWithMeta, ...prev.slice(0, 9)]);
    playAlertSound(alert.threat_type);

    // Update node battery / activity
    setNodes((prevNodes) =>
      prevNodes.map((n) => {
        if (n.id === alert.device_id) {
          return {
            ...n,
            battery: Math.max(5, n.battery - 0.2),
            lat: alert.latitude || n.lat,
            lon: alert.longitude || n.lon,
            lastDetection: alert.threat_type,
            lastDetectionTime: new Date().toLocaleTimeString(),
          };
        }
        return n;
      })
    );
  }, [playAlertSound]);

  // Connect WebSocket
  useEffect(() => {
    let reconnectTimeout = null;
    let ws = null;

    const connectWs = () => {
      const endpoint = getWebSocketEndpoint();
      try {
        ws = new WebSocket(endpoint);
        wsRef.current = ws;

        ws.onopen = () => {
          setWsConnected(true);
          setBackendOnline(true);
          console.log('[Telemetry WS] Connected to live feed.');
        };

        ws.onmessage = (evt) => {
          try {
            const data = JSON.parse(evt.data);
            handleNewAlert(data);
          } catch (e) {
            console.error('[Telemetry WS] Parse error:', e);
          }
        };

        ws.onclose = () => {
          setWsConnected(false);
          reconnectTimeout = setTimeout(connectWs, 3000);
        };

        ws.onerror = () => {
          setWsConnected(false);
          ws.close();
        };
      } catch (err) {
        setWsConnected(false);
        reconnectTimeout = setTimeout(connectWs, 3000);
      }
    };

    connectWs();

    // Initial alert load
    fetchRecentAlerts(30).then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setAlerts(data);
        setActiveThreats(data.slice(0, 5));
      }
    });

    // Health check polling
    const healthInterval = setInterval(() => {
      checkBackendHealth().then((isHealthy) => {
        setBackendOnline(isHealthy);
      });
    }, 4000);

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      clearInterval(healthInterval);
      if (ws) ws.close();
    };
  }, [handleNewAlert]);

  // Trigger manual simulation alert
  const triggerSimulationAlert = async (threatType, nodeId = 'NODE-ALPHA', confidence = 0.95) => {
    const node = nodes.find((n) => n.id === nodeId) || nodes[0];
    const payload = {
      device_id: node.id,
      threat_type: threatType,
      latitude: node.lat + (Math.random() - 0.5) * 0.005,
      longitude: node.lon + (Math.random() - 0.5) * 0.005,
      confidence_score: confidence,
    };

    try {
      const created = await postTelemetryAlert(payload);
      handleNewAlert(created);
      return created;
    } catch (err) {
      console.error('[Simulate] Failed to dispatch alert:', err);
      // Fallback local mock
      const mockAlert = {
        id: `mock-${Date.now()}`,
        ...payload,
        timestamp: new Date().toISOString(),
      };
      handleNewAlert(mockAlert);
      return mockAlert;
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    if (filterThreat !== 'ALL' && a.threat_type !== filterThreat) return false;
    if (selectedNode && a.device_id !== selectedNode.id) return false;
    return true;
  });

  const value = {
    alerts: filteredAlerts,
    allAlerts: alerts,
    activeThreats,
    nodes,
    wsConnected,
    backendOnline,
    selectedNode,
    setSelectedNode,
    audioEnabled,
    setAudioEnabled,
    filterThreat,
    setFilterThreat,
    triggerSimulationAlert,
    playAlertSound,
    testAlarmSound,
  };

  return <TelemetryContext.Provider value={value}>{children}</TelemetryContext.Provider>;
}

export function useTelemetry() {
  const context = useContext(TelemetryContext);
  if (!context) {
    throw new Error('useTelemetry must be used within a TelemetryProvider');
  }
  return context;
}
