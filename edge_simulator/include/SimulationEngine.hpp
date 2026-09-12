#ifndef SIMULATION_ENGINE_HPP
#define SIMULATION_ENGINE_HPP

#include <vector>
#include <memory>
#include <string>
#include <atomic>
#include "EdgeNode.hpp"
#include "HttpClient.hpp"

enum class SimulationMode {
    CONTINUOUS,
    BURST_INCIDENT,
    SINGLE_SHOT,
    INTERACTIVE
};

struct SimulationConfig {
    int nodeCount = 4;
    int intervalMs = 2000;
    double anomalyProbability = 0.35;
    std::string backendHost = "127.0.0.1";
    int backendPort = 8000;
    SimulationMode mode = SimulationMode::CONTINUOUS;
    int maxIterations = 0; // 0 = infinite
};

class SimulationEngine {
public:
    SimulationEngine(const SimulationConfig& config);
    ~SimulationEngine() = default;

    void addNode(std::unique_ptr<EdgeNode> node);
    void setupDefaultSwarm();

    // Simulation execution
    void run();
    void runSingleShot(const std::string& nodeId, ThreatType threatType, double confidence = 0.95);
    void runBurstScenario(int burstCount = 5, ThreatType primaryThreat = ThreatType::CHAINSAW);
    void stop();

    bool isRunning() const;

private:
    SimulationConfig m_config;
    std::vector<std::unique_ptr<EdgeNode>> m_nodes;
    std::unique_ptr<HttpClient> m_httpClient;
    std::atomic<bool> m_running{false};

    void processIteration(int iterationIndex);
    void logEvent(const ThreatEvent& event, const HttpResponse& response);
};

#endif // SIMULATION_ENGINE_HPP
