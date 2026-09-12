#ifndef EDGE_NODE_HPP
#define EDGE_NODE_HPP

#include <string>
#include <vector>
#include "AcousticSignature.hpp"

class EdgeNode {
public:
    EdgeNode(
        const std::string& id, 
        double baseLatitude, 
        double baseLongitude, 
        double radiusKm = 0.5,
        double batteryLevel = 100.0
    );

    // Node state getters
    const std::string& getId() const;
    double getLatitude() const;
    double getLongitude() const;
    double getBatteryLevel() const;
    bool isOperational() const;

    // Simulate sensor reading / threat detection
    ThreatEvent detectThreat(ThreatType specifiedType = ThreatType::UNKNOWN);
    ThreatEvent detectRandomThreat();

    // Consume small amount of battery on operation
    void consumeBattery(double amount = 0.05);
    void rechargeBattery(double amount = 10.0);

private:
    std::string m_id;
    double m_baseLatitude;
    double m_baseLongitude;
    double m_currentLatitude;
    double m_currentLongitude;
    double m_radiusKm;
    double m_batteryLevel;
    
    void updateSimulatedCoordinates();
};

#endif // EDGE_NODE_HPP
