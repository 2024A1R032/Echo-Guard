import { Radio, MapPin, Network, Search, Activity, FlaskConical, Trees } from 'lucide-react';

// group: "monitor" views are the everyday ones; "tools" are for analysis and testing.
export const VIEWS = [
  { id: 'radar', label: 'Live monitor', group: 'monitor', icon: Radio, description: 'Sensor positions, incoming detections and the signal pattern' },
  { id: 'forest', label: 'Drop a sound', group: 'monitor', icon: Trees, description: 'Drop a real audio or video clip into the forest and see which sensor hears it' },
  { id: 'map', label: 'Map', group: 'monitor', icon: MapPin, description: 'Sensors and detections on satellite imagery' },
  { id: 'clusters', label: 'Incidents', group: 'monitor', icon: Network, description: 'Alerts from nearby sensors merged into single incidents' },
  { id: 'swarm', label: 'Sensors', group: 'monitor', icon: Activity, description: 'Position, battery and latest detection for each sensor' },
  { id: 'vector-search', label: 'Similar sounds', group: 'tools', icon: Search, description: 'Find past detections that sound like a selected one' },
  { id: 'sandbox', label: 'Verify audio', group: 'tools', icon: FlaskConical, description: 'Check how the classifier responds to sample sounds' },
];
