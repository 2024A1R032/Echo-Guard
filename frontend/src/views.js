import { Radio, MapPin, Network, Search, Activity, FlaskConical, Headphones } from 'lucide-react';

export const VIEWS = [
  { id: 'radar', label: 'Live monitor', icon: Radio, description: 'Sensor positions, incoming detections and the audio signal' },
  { id: 'map', label: 'Map', icon: MapPin, description: 'Sensors and detections on satellite imagery' },
  { id: 'simulate', label: 'Simulate', icon: Headphones, description: 'Play realistic field audio and watch sensors detect threats live' },
  { id: 'clusters', label: 'Incidents', icon: Network, description: 'Alerts from nearby sensors merged into single incidents' },
  { id: 'vector-search', label: 'Similar sounds', icon: Search, description: 'Find past detections that sound like a selected one' },
  { id: 'swarm', label: 'Sensors', icon: Activity, description: 'Sensor health and detections by threat type' },
  { id: 'sandbox', label: 'Verify audio', icon: FlaskConical, description: 'Check how the classifier responds to sample sounds' },
];
