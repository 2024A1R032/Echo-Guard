#include <iostream>
#include <string>
#include <vector>
#include <csignal>
#include <memory>
#include "SimulationEngine.hpp"

// Global pointer for clean signal handling
static SimulationEngine* g_enginePtr = nullptr;

void signalHandler(int signum) {
    if (g_enginePtr && g_enginePtr->isRunning()) {
        std::cout << "\n[SIGNAL] Interrupt received (" << signum << "). Stopping simulator safely...\n" << std::endl;
        g_enginePtr->stop();
    } else {
        std::exit(signum);
    }
}

void printBanner() {
    std::cout << "\n"
              << "  ███████╗ ██████╗██╗  ██╗ ██████╗  ██████╗ ██╗   ██╗ █████╗ ██████╗ ██████╗ \n"
              << "  ██╔════╝██╔════╝██║  ██║██╔═══██╗██╔════╝ ██║   ██║██╔══██╗██╔══██╗██╔══██╗\n"
              << "  █████╗  ██║     ███████║██║   ██║██║  ███╗██║   ██║███████║██████╔╝██║  ██║\n"
              << "  ██╔══╝  ██║     ██╔══██║██║   ██║██║   ██║██║   ██║██╔══██║██╔══██╗██║  ██║\n"
              << "  ███████╗╚██████╗██║  ██║╚██████╔╝╚██████╔╝╚██████╔╝██║  ██║██║  ██║██████╔╝\n"
              << "  ╚══════╝ ╚═════╝╚═╝  ╚═╝ ╚═════╝  ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ \n"
              << "        --- Autonomous Bioacoustic Edge Sensor Network Simulator ---        \n\n";
}

void printUsage(const char* progName) {
    std::cout << "Usage: " << progName << " [options]\n\n"
              << "Options:\n"
              << "  --mode <mode>        Simulation mode: continuous (default), burst, single, interactive\n"
              << "  --nodes <count>      Number of active edge nodes (default: 4, max: 6)\n"
              << "  --interval <ms>      Interval between telemetry cycles in ms (default: 2000)\n"
              << "  --threat <type>      Specific threat type for burst/single: CHAINSAW, GUNSHOT, VEHICLE_ENGINE, ILLEGAL_VESSEL, BLAST_FISHING\n"
              << "  --prob <0.0-1.0>     Anomaly detection probability per node (default: 0.35)\n"
              << "  --iterations <count> Maximum simulation cycles before auto-exit (default: 0 = infinite)\n"
              << "  --host <ip>          FastAPI backend host (default: 127.0.0.1)\n"
              << "  --port <port>        FastAPI backend port (default: 8000)\n"
              << "  --help               Display this help text\n"
              << std::endl;
}

void runInteractiveMenu(SimulationEngine& engine, SimulationConfig& config) {
    while (true) {
        std::cout << "\n================ Interactive Control Panel ================\n"
                  << " [1] Start Continuous Bioacoustic Stream\n"
                  << " [2] Trigger Chainsaw Burst Surge (5 rapid alerts)\n"
                  << " [3] Trigger Gunshot Threat Alert (Single)\n"
                  << " [4] Trigger Illegal Vessel Intrusion Alert\n"
                  << " [5] Trigger Blast Fishing Acoustic Shockwave\n"
                  << " [6] Test Backend /health Connectivity\n"
                  << " [7] Exit Simulator\n"
                  << "===========================================================\n"
                  << " Select option [1-7]: ";

        int choice = 0;
        if (!(std::cin >> choice)) {
            std::cin.clear();
            std::string discard;
            std::cin >> discard;
            continue;
        }

        switch (choice) {
            case 1: {
                std::cout << "Starting stream (Press Ctrl+C to return to menu)..." << std::endl;
                engine.run();
                break;
            }
            case 2: {
                engine.runBurstScenario(5, ThreatType::CHAINSAW);
                break;
            }
            case 3: {
                engine.runSingleShot("NODE-ALPHA", ThreatType::GUNSHOT, 0.96);
                break;
            }
            case 4: {
                engine.runSingleShot("NODE-CHARLIE", ThreatType::ILLEGAL_VESSEL, 0.91);
                break;
            }
            case 5: {
                engine.runSingleShot("NODE-DELTA", ThreatType::BLAST_FISHING, 0.94);
                break;
            }
            case 6: {
                HttpClient client(config.backendHost, config.backendPort);
                bool ok = client.testConnection("/health");
                std::cout << (ok ? " [OK] Backend is healthy and reachable!\n" : " [FAILED] Cannot reach backend.\n");
                break;
            }
            case 7:
                std::cout << "Exiting EchoGuard Simulator. Goodbye.\n";
                return;
            default:
                std::cout << "Invalid choice. Please select 1-7.\n";
                break;
        }
    }
}

int main(int argc, char* argv[]) {
    // Register signal handler
    std::signal(SIGINT, signalHandler);
    std::signal(SIGTERM, signalHandler);

    printBanner();

    SimulationConfig config;
    std::string threatStr = "CHAINSAW";
    bool interactiveSelected = false;

    for (int i = 1; i < argc; ++i) {
        std::string arg = argv[i];
        if (arg == "--help" || arg == "-h") {
            printUsage(argv[0]);
            return 0;
        } else if (arg == "--mode" && i + 1 < argc) {
            std::string m = argv[++i];
            if (m == "burst") config.mode = SimulationMode::BURST_INCIDENT;
            else if (m == "single") config.mode = SimulationMode::SINGLE_SHOT;
            else if (m == "interactive") { config.mode = SimulationMode::INTERACTIVE; interactiveSelected = true; }
            else config.mode = SimulationMode::CONTINUOUS;
        } else if (arg == "--nodes" && i + 1 < argc) {
            config.nodeCount = std::max(1, std::min(6, std::stoi(argv[++i])));
        } else if (arg == "--interval" && i + 1 < argc) {
            config.intervalMs = std::max(100, std::stoi(argv[++i]));
        } else if (arg == "--prob" && i + 1 < argc) {
            config.anomalyProbability = std::max(0.0, std::min(1.0, std::stod(argv[++i])));
        } else if (arg == "--iterations" && i + 1 < argc) {
            config.maxIterations = std::max(0, std::stoi(argv[++i]));
        } else if (arg == "--threat" && i + 1 < argc) {
            threatStr = argv[++i];
        } else if (arg == "--host" && i + 1 < argc) {
            config.backendHost = argv[++i];
        } else if (arg == "--port" && i + 1 < argc) {
            config.backendPort = std::stoi(argv[++i]);
        }
    }

    SimulationEngine engine(config);
    g_enginePtr = &engine;

    // Run according to selected mode
    if (argc == 1 || interactiveSelected) {
        runInteractiveMenu(engine, config);
    } else if (config.mode == SimulationMode::BURST_INCIDENT) {
        ThreatType t = AcousticSignature::stringToThreatType(threatStr);
        engine.runBurstScenario(5, t);
    } else if (config.mode == SimulationMode::SINGLE_SHOT) {
        ThreatType t = AcousticSignature::stringToThreatType(threatStr);
        engine.runSingleShot("NODE-ALPHA", t, 0.95);
    } else {
        engine.run();
    }

    g_enginePtr = nullptr;
    return 0;
}
