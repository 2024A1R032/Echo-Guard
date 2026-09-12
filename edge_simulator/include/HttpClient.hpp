#ifndef HTTP_CLIENT_HPP
#define HTTP_CLIENT_HPP

#include <string>
#include <vector>
#include <memory>
#include "AcousticSignature.hpp"

struct HttpResponse {
    int statusCode;
    std::string body;
    bool success;
    std::string errorMessage;
};

class HttpClient {
public:
    HttpClient(const std::string& host = "127.0.0.1", int port = 8000);
    ~HttpClient();

    // Disable copy semantics for RAII socket safety
    HttpClient(const HttpClient&) = delete;
    HttpClient& operator=(const HttpClient&) = delete;

    // Enable move semantics
    HttpClient(HttpClient&&) noexcept;
    HttpClient& operator=(HttpClient&&) noexcept;

    // Network transmission
    HttpResponse postJson(const std::string& path, const std::string& jsonPayload);
    HttpResponse sendTelemetryAlert(const ThreatEvent& event, const std::string& endpoint = "/api/v1/telemetry/");

    // Utilities
    static std::string serializeThreatEventJson(const ThreatEvent& event);
    bool testConnection(const std::string& healthPath = "/health");

private:
    std::string m_host;
    int m_port;
    bool m_winsockInitialized;

    void initializeWinSock();
    void cleanupWinSock();
};

#endif // HTTP_CLIENT_HPP
