#include "EdgeNode.hpp"
#include <random>
#include <cmath>
#include <algorithm>

EdgeNode::EdgeNode(
    const std::string& id, 
    double baseLatitude, 
    double baseLongitude, 
    double radiusKm,
    double batteryLevel
) : m_id(id),
    m_baseLatitude(baseLatitude),
    m_baseLongitude(baseLongitude),
    m_currentLatitude(baseLatitude),
    m_currentLongitude(baseLongitude),
    m_radiusKm(radiusKm),
    m_batteryLevel(batteryLevel)
{
}

const std::string& EdgeNode::getId() const {
    return m_id;
}

double EdgeNode::getLatitude() const {
    return m_currentLatitude;
}

double EdgeNode::getLongitude() const {
    return m_currentLongitude;
}

double EdgeNode::getBatteryLevel() const {
    return m_batteryLevel;
}

bool EdgeNode::isOperational() const {
    return m_batteryLevel > 5.0;
}

void EdgeNode::updateSimulatedCoordinates() {
    static std::random_device rd;
    static std::mt19937 gen(rd());
    
    // 1 km is approximately 0.009 degrees latitude/longitude
    double maxOffsetDeg = (m_radiusKm / 111.0);
    std::uniform_real_distribution<double> dist(-maxOffsetDeg, maxOffsetDeg);

    m_currentLatitude = m_baseLatitude + dist(gen);
    m_currentLongitude = m_baseLongitude + dist(gen);
}

ThreatEvent EdgeNode::detectThreat(ThreatType specifiedType) {
    updateSimulatedCoordinates();
    consumeBattery(0.08);
    
    return AcousticSignature::generateEvent(
        m_id,
        specifiedType,
        m_currentLatitude,
        m_currentLongitude,
        0.75,
        0.98
    );
}

ThreatEvent EdgeNode::detectRandomThreat() {
    static std::random_device rd;
    static std::mt19937 gen(rd());
    
    // Distribution favoring realistic illegal poaching/logging events
    std::discrete_distribution<int> typeDist({
        25, // CHAINSAW
        20, // GUNSHOT
        20, // VEHICLE_ENGINE
        15, // ILLEGAL_VESSEL
        10, // BLAST_FISHING
        10  // UNKNOWN
    });

    ThreatType types[] = {
        ThreatType::CHAINSAW,
        ThreatType::GUNSHOT,
        ThreatType::VEHICLE_ENGINE,
        ThreatType::ILLEGAL_VESSEL,
        ThreatType::BLAST_FISHING,
        ThreatType::UNKNOWN
    };

    ThreatType chosen = types[typeDist(gen)];
    return detectThreat(chosen);
}

void EdgeNode::consumeBattery(double amount) {
    m_batteryLevel = std::max(0.0, m_batteryLevel - amount);
}

void EdgeNode::rechargeBattery(double amount) {
    m_batteryLevel = std::min(100.0, m_batteryLevel + amount);
}
