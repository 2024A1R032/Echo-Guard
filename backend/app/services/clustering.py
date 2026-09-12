"""
Spatial-Temporal Multi-Sensor Fusion & Incident Deduplication Engine.
Merges redundant acoustic telemetry from multiple nearby sensor nodes
into consolidated, triangulated Tactical Incident Clusters.
"""
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
import math
import uuid

def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate great-circle distance between two GPS points in meters."""
    R = 6371000  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

class IncidentClusterManager:
    def __init__(self, spatial_radius_meters: float = 650.0, time_window_seconds: float = 90.0):
        self.spatial_radius_meters = spatial_radius_meters
        self.time_window_seconds = time_window_seconds
        # In-memory store of active clusters: id -> cluster_dict
        self.clusters: Dict[str, Dict[str, Any]] = {}
        self.total_raw_alerts_processed: int = 0

    def process_alert(self, alert_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process an incoming alert, check for spatial-temporal clustering match,
        and merge or create a new consolidated incident cluster.
        """
        self.total_raw_alerts_processed += 1
        alert_lat = float(alert_data.get("latitude", 0.0))
        alert_lon = float(alert_data.get("longitude", 0.0))
        alert_threat = alert_data.get("threat_type", "UNKNOWN")
        alert_device = alert_data.get("device_id", "NODE-001")
        alert_conf = float(alert_data.get("confidence_score", 0.8))
        alert_id = str(alert_data.get("id", uuid.uuid4()))
        
        now = datetime.now(timezone.utc)
        
        # Look for matching active cluster
        matched_cluster = None
        for cluster in self.clusters.values():
            if cluster["threat_type"] != alert_threat:
                continue
            
            # Check time window
            last_seen = cluster["last_updated"]
            if isinstance(last_seen, str):
                last_seen = datetime.fromisoformat(last_seen.replace("Z", "+00:00"))
            
            if (now - last_seen).total_seconds() > self.time_window_seconds:
                continue
            
            # Check spatial distance to cluster epicenter
            dist = haversine_distance_meters(alert_lat, alert_lon, cluster["epicenter_lat"], cluster["epicenter_lon"])
            if dist <= self.spatial_radius_meters:
                matched_cluster = cluster
                break
        
        if matched_cluster:
            # Merge into existing cluster (Triangulation)
            prev_count = matched_cluster["alert_count"]
            new_count = prev_count + 1
            
            # Weighted coordinate centroid calculation
            old_weight = matched_cluster["peak_confidence"] * prev_count
            new_weight = old_weight + alert_conf
            
            matched_cluster["epicenter_lat"] = round(
                (matched_cluster["epicenter_lat"] * old_weight + alert_lat * alert_conf) / new_weight, 6
            )
            matched_cluster["epicenter_lon"] = round(
                (matched_cluster["epicenter_lon"] * old_weight + alert_lon * alert_conf) / new_weight, 6
            )
            
            if alert_device not in matched_cluster["contributing_nodes"]:
                matched_cluster["contributing_nodes"].append(alert_device)
            
            matched_cluster["alert_ids"].append(alert_id)
            matched_cluster["alert_count"] = new_count
            matched_cluster["peak_confidence"] = max(matched_cluster["peak_confidence"], alert_conf)
            matched_cluster["last_updated"] = now.isoformat()
            
            # Update triangulation status
            num_nodes = len(matched_cluster["contributing_nodes"])
            if num_nodes >= 3:
                matched_cluster["triangulation_status"] = "HIGH_ACCURACY_3_NODE_TRIANGULATED"
            elif num_nodes == 2:
                matched_cluster["triangulation_status"] = "DUAL_NODE_BEARING_CORRELATED"
            else:
                matched_cluster["triangulation_status"] = "SINGLE_NODE_PROXIMITY"
                
            return matched_cluster
        else:
            # Create a brand new incident cluster
            cluster_id = f"INC-AMZ-{int(now.timestamp()) % 100000:05d}"
            new_cluster = {
                "incident_id": cluster_id,
                "threat_type": alert_threat,
                "epicenter_lat": alert_lat,
                "epicenter_lon": alert_lon,
                "peak_confidence": alert_conf,
                "contributing_nodes": [alert_device],
                "alert_count": 1,
                "alert_ids": [alert_id],
                "created_at": now.isoformat(),
                "last_updated": now.isoformat(),
                "status": "ACTIVE_INVESTIGATION",
                "triangulation_status": "SINGLE_NODE_PROXIMITY"
            }
            self.clusters[cluster_id] = new_cluster
            return new_cluster

    def get_all_clusters(self) -> List[Dict[str, Any]]:
        return list(sorted(self.clusters.values(), key=lambda c: c["last_updated"], reverse=True))

    def get_cluster(self, incident_id: str) -> Optional[Dict[str, Any]]:
        return self.clusters.get(incident_id)

    def get_deduplication_metrics(self) -> Dict[str, Any]:
        total_clusters = len(self.clusters)
        raw_alerts = self.total_raw_alerts_processed
        dedup_ratio = 0.0
        if raw_alerts > 0:
            dedup_ratio = round((1.0 - (total_clusters / max(1, raw_alerts))) * 100.0, 1)
        return {
            "total_raw_alerts": raw_alerts,
            "consolidated_incident_clusters": total_clusters,
            "redundancy_elimination_rate_percent": max(0.0, dedup_ratio),
            "noise_reduction_factor": f"{raw_alerts}:{total_clusters}" if total_clusters > 0 else "1:1"
        }

cluster_manager = IncidentClusterManager()
