#include "AcousticSignature.hpp"
#include <cmath>
#include <random>
#include <chrono>
#include <iomanip>
#include <sstream>
#include <ctime>

std::string AcousticSignature::threatTypeToString(ThreatType type) {
    switch (type) {
        case ThreatType::CHAINSAW:        return "CHAINSAW";
        case ThreatType::GUNSHOT:         return "GUNSHOT";
        case ThreatType::VEHICLE_ENGINE:  return "VEHICLE_ENGINE";
        case ThreatType::ILLEGAL_VESSEL:  return "ILLEGAL_VESSEL";
        case ThreatType::BLAST_FISHING:   return "BLAST_FISHING";
        case ThreatType::WILDLIFE_AMBIENT:return "WILDLIFE_AMBIENT";
        case ThreatType::UNKNOWN:
        default:                          return "UNKNOWN";
    }
}

ThreatType AcousticSignature::stringToThreatType(const std::string& str) {
    if (str == "CHAINSAW") return ThreatType::CHAINSAW;
    if (str == "GUNSHOT") return ThreatType::GUNSHOT;
    if (str == "VEHICLE_ENGINE") return ThreatType::VEHICLE_ENGINE;
    if (str == "ILLEGAL_VESSEL") return ThreatType::ILLEGAL_VESSEL;
    if (str == "BLAST_FISHING") return ThreatType::BLAST_FISHING;
    if (str == "WILDLIFE_AMBIENT") return ThreatType::WILDLIFE_AMBIENT;
    return ThreatType::UNKNOWN;
}

std::vector<double> AcousticSignature::generateEmbedding(const std::string& threatType, double seedFactor) {
    // Generate deterministic 128-dimensional unit normalized vector embedding
    // Consistent with backend vector representation
    unsigned long long baseHash = 0;
    for (char c : threatType) {
        baseHash = (baseHash * 31 + static_cast<unsigned char>(c)) % 1000000007ULL;
    }

    std::vector<double> vector(128, 0.0);
    double sumSq = 0.0;

    for (size_t i = 0; i < 128; ++i) {
        double val = std::sin(static_cast<double>(baseHash) + static_cast<double>(i) * seedFactor) * std::cos(static_cast<double>(i) * 0.1);
        // Round to 6 decimal places
        val = std::round(val * 1000000.0) / 1000000.0;
        vector[i] = val;
        sumSq += val * val;
    }

    double norm = std::sqrt(sumSq);
    if (norm <= 0.0) norm = 1.0;

    for (size_t i = 0; i < 128; ++i) {
        vector[i] = std::round((vector[i] / norm) * 1000000.0) / 1000000.0;
    }

    return vector;
}

ThreatEvent AcousticSignature::generateEvent(
    const std::string& deviceId, 
    ThreatType threatType, 
    double latitude, 
    double longitude,
    double minConfidence,
    double maxConfidence
) {
    static std::random_device rd;
    static std::mt19937 gen(rd());
    std::uniform_real_distribution<double> confDist(minConfidence, maxConfidence);
    std::uniform_real_distribution<double> seedDist(0.85, 1.15);

    std::string threatName = threatTypeToString(threatType);
    double confidence = confDist(gen);
    std::vector<double> embedding = generateEmbedding(threatName, seedDist(gen));

    // Current UTC timestamp in ISO 8601 format
    auto now = std::chrono::system_clock::now();
    std::time_t nowTime = std::chrono::system_clock::to_time_t(now);
    std::tm* tmPtr = std::gmtime(&nowTime);
    std::tm utcTm = *tmPtr;

    std::ostringstream ss;
    ss << std::put_time(&utcTm, "%Y-%m-%dT%H:%M:%SZ");

    ThreatEvent event;
    event.deviceId = deviceId;
    event.threatType = threatType;
    event.threatName = threatName;
    event.latitude = latitude;
    event.longitude = longitude;
    event.confidenceScore = std::round(confidence * 1000.0) / 1000.0;
    event.embedding = std::move(embedding);
    event.timestampIso = ss.str();

    return event;
}
