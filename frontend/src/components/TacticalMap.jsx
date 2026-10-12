import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTelemetry } from '../context/TelemetryContext';
import { 
  Radio, 
  ShieldAlert, 
  Layers, 
  Maximize2, 
  Battery, 
  Signal, 
  Crosshair, 
  ExternalLink,
  Flame,
  Volume2
} from 'lucide-react';
import { threatLabel } from '../utils/threat';

const { BaseLayer } = LayersControl;

// Custom SVG-based High-Tech Map Icons
const createNodeIcon = (isActiveThreat, threatType) => {
  const color = isActiveThreat 
    ? (threatType === 'CHAINSAW' ? '#cc3a21' : threatType === 'GUNSHOT' ? '#dc2626' : '#a8660f')
    : '#2e7d4f';

  return L.divIcon({
    className: 'tactical-custom-marker',
    html: `
      <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
        ${isActiveThreat ? `
          <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: ${color}; opacity: 0.35; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: absolute; width: 48px; height: 48px; border-radius: 50%; border: 1.5px dashed ${color}; opacity: 0.6; animation: spin 8s linear infinite;"></div>
        ` : ''}
        <div style="width: 22px; height: 22px; border-radius: 50%; background: #ffffff; border: 3px solid ${color}; box-shadow: 0 0 12px ${color}88; display: flex; align-items: center; justify-content: center; z-index: 10;">
          <div style="width: 8px; height: 8px; border-radius: 50%; background: ${color};"></div>
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
};

export default function TacticalMap({ onOpenDispatch }) {
  const { nodes, allAlerts } = useTelemetry();
  const [selectedLayer, setSelectedLayer] = useState('satellite');
  const [mapCenter, setMapCenter] = useState([-3.4650, -62.2150]); // Amazon Conservation Grid Center
  const [zoomLevel, setZoomLevel] = useState(13);

  // Match recent alerts to nodes
  const activeAlertMap = {};
  allAlerts.forEach((alert) => {
    if (!activeAlertMap[alert.device_id]) {
      activeAlertMap[alert.device_id] = alert;
    }
  });

  const latestActiveThreat = allAlerts.length > 0 ? allAlerts[0] : null;

  return (
    <div className="tactical-map-container glass-panel" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 190px)', minHeight: '620px', overflow: 'hidden', position: 'relative' }}>
      {/* Top Map Control Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-card)', zIndex: 1000 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-emerald)', boxShadow: '0 0 8px var(--accent-emerald)' }}></div>
          <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
            Sensor map
          </span>
          <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem', borderRadius: '4px', background: 'var(--accent-cyan-light)', color: 'var(--accent-cyan)', fontWeight: 600 }}>
            Sanctuary sector 4B
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {latestActiveThreat && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.75rem', borderRadius: '6px', background: 'var(--accent-rose-light)', border: '1px solid var(--accent-rose)' }}>
              <Flame size={15} color="var(--threat-chainsaw)" />
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--threat-chainsaw)' }}>
                Latest: {threatLabel(latestActiveThreat.threat_type)} at {latestActiveThreat.device_id}
              </span>
            </div>
          )}

          <button
            className="btn-secondary"
            onClick={() => setMapCenter([-3.4650, -62.2150])}
            style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem' }}
            title="Recenter map"
          >
            <Crosshair size={14} />
            <span>Center map</span>
          </button>
        </div>
      </div>

      {/* Leaflet Map Frame */}
      <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%' }}>
        <MapContainer
          center={mapCenter}
          zoom={zoomLevel}
          scrollWheelZoom={true}
          style={{ width: '100%', height: '100%', background: '#16241b' }}
        >
          <LayersControl position="topright">
            <BaseLayer checked name="Satellite (Esri)">
              <TileLayer
                attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />
            </BaseLayer>
            <BaseLayer name="Dark map (CartoDB)">
              <TileLayer
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
            </BaseLayer>
            <BaseLayer name="Terrain (OpenTopoMap)">
              <TileLayer
                attribution='Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
                url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
              />
            </BaseLayer>
            <BaseLayer name="Street map (OpenStreetMap)">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </BaseLayer>
          </LayersControl>

          {/* Sensor Nodes & Threat Radiuses */}
          {nodes.map((node) => {
            const activeAlert = activeAlertMap[node.id];
            const hasThreat = !!activeAlert;
            const threatType = activeAlert ? activeAlert.threat_type : null;
            const icon = createNodeIcon(hasThreat, threatType);

            return (
              <React.Fragment key={node.id}>
                {/* Acoustic Coverage Radius Circle */}
                <Circle
                  center={[node.lat, node.lon]}
                  radius={650} // 650m acoustic detection radius
                  pathOptions={{
                    color: hasThreat ? '#cc3a21' : '#1f5a3a',
                    fillColor: hasThreat ? '#cc3a21' : '#1f5a3a',
                    fillOpacity: hasThreat ? 0.2 : 0.08,
                    weight: hasThreat ? 2 : 1,
                    dashArray: hasThreat ? '4, 4' : undefined,
                  }}
                />

                <Marker position={[node.lat, node.lon]} icon={icon}>
                  <Popup className="tactical-popup">
                    <div style={{ minWidth: 240, padding: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid #dce2db', paddingBottom: '6px' }}>
                        <div>
                          <strong style={{ color: '#16241b', fontSize: '0.95rem' }}>{node.id}</strong>
                          <div style={{ fontSize: '0.72rem', color: '#66756b' }}>{node.name}</div>
                        </div>
                        <span style={{ 
                          fontSize: '0.7rem', 
                          padding: '2px 6px', 
                          borderRadius: '4px', 
                          background: hasThreat ? '#f8dedb' : '#dfeee4',
                          color: hasThreat ? '#a52a1a' : '#2e7d4f',
                          fontWeight: 700 
                        }}>
                          {hasThreat ? threatLabel(threatType) : 'No recent detection'}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.78rem', color: '#44554a', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div><strong>Position:</strong> {node.lat.toFixed(5)}, {node.lon.toFixed(5)}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Battery size={14} color="#2e7d4f" />
                          <span>Battery: {node.battery}%</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Signal size={14} color="#1f5a3a" />
                          <span>Signal: {node.signal_dbm || -65} dBm</span>
                        </div>
                        {hasThreat && (
                          <div style={{ marginTop: '6px', padding: '6px', background: '#f9e2dd', borderRadius: '4px', borderLeft: '3px solid #cc3a21' }}>
                            <div style={{ fontWeight: 600, color: '#a52a1a' }}>Detected: {threatLabel(threatType)}</div>
                            <div style={{ fontSize: '0.72rem', color: '#a52a1a' }}>
                              Confidence: {(activeAlert.confidence_score * 100).toFixed(1)}%
                            </div>
                          </div>
                        )}
                      </div>

                      {onOpenDispatch && (
                        <button
                          onClick={() => onOpenDispatch()}
                          style={{
                            marginTop: '10px',
                            width: '100%',
                            padding: '6px 10px',
                            background: '#1f5a3a',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                        >
                          <ExternalLink size={12} />
                          <span>Create dispatch report</span>
                        </button>
                      )}
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
            );
          })}
        </MapContainer>

        {/* Map Legend Overlay */}
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(8px)',
          border: '1px solid #c4cdc5',
          borderRadius: '8px',
          padding: '10px 14px',
          fontSize: '0.75rem',
          color: '#16241b',
          zIndex: 1000,
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.1)',
        }}>
          <div style={{ fontWeight: 600, marginBottom: '6px', color: '#16241b' }}>Legend</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#2e7d4f', display: 'inline-block' }}></span>
              <span>Sensor with no recent detection (650 m range)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#cc3a21', display: 'inline-block' }}></span>
              <span>Recent detection</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: 18, height: 3, background: 'rgba(31, 90, 58, 0.5)', display: 'inline-block' }}></span>
              <span>Listening range</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
