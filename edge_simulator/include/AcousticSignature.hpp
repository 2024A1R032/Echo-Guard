#ifndef ACOUSTIC_SIGNATURE_HPP
#define ACOUSTIC_SIGNATURE_HPP

#include <string>
#include <vector>
#include <memory>

enum class ThreatType {
    CHAINSAW,
    GUNSHOT,
    VEHICLE_ENGINE,
    ILLEGAL_VESSEL,
    BLAST_FISHING,
    WILDLIFE_AMBIENT,
    UNKNOWN
};

struct ThreatEvent {
    std::string deviceId;
    ThreatType threatType;
    std::string threatName;
    double latitude;
    double longitude;
    double confidenceScore;
    std::vector<double> embedding;
    std::string timestampIso;
};

class AcousticSignature {
public:
    static std::string threatTypeToString(ThreatType type);
    static ThreatType stringToThreatType(const std::string& str);
    
    // Generates a 128-dimensional unit-normalized bioacoustic feature vector
    static std::vector<double> generateEmbedding(const std::string& threatType, double seedFactor = 1.0);
    
    // Generates a simulated threat event with realistic confidence score and synthetic embedding
    static ThreatEvent generateEvent(
        const std::string& deviceId, 
        ThreatType threatType, 
        double latitude, 
        double longitude,
        double minConfidence = 0.65,
        double maxConfidence = 0.99
    );
};

#endif // ACOUSTIC_SIGNATURE_HPP
