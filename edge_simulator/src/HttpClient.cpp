#include "HttpClient.hpp"
#include <iostream>
#include <sstream>
#include <iomanip>
#include <cstring>

#if defined(_WIN32) || defined(_WIN64)
#include <winsock2.h>
#include <ws2tcpip.h>
#else
#include <sys/socket.h>
#include <arpa/inet.h>
#include <netdb.h>
#include <unistd.h>
#define SOCKET int
#define INVALID_SOCKET -1
#define SOCKET_ERROR -1
#define closesocket close
#endif

HttpClient::HttpClient(const std::string& host, int port)
    : m_host(host), m_port(port), m_winsockInitialized(false) 
{
    initializeWinSock();
}

HttpClient::~HttpClient() {
    cleanupWinSock();
}

HttpClient::HttpClient(HttpClient&& other) noexcept
    : m_host(std::move(other.m_host)),
      m_port(other.m_port),
      m_winsockInitialized(other.m_winsockInitialized)
{
    other.m_winsockInitialized = false;
}

HttpClient& HttpClient::operator=(HttpClient&& other) noexcept {
    if (this != &other) {
        cleanupWinSock();
        m_host = std::move(other.m_host);
        m_port = other.m_port;
        m_winsockInitialized = other.m_winsockInitialized;
        other.m_winsockInitialized = false;
    }
    return *this;
}

void HttpClient::initializeWinSock() {
#if defined(_WIN32) || defined(_WIN64)
    WSADATA wsaData;
    int result = WSAStartup(MAKEWORD(2, 2), &wsaData);
    if (result == 0) {
        m_winsockInitialized = true;
    } else {
        std::cerr << "[HttpClient] Error initializing WinSock: " << result << std::endl;
    }
#else
    m_winsockInitialized = true;
#endif
}

void HttpClient::cleanupWinSock() {
#if defined(_WIN32) || defined(_WIN64)
    if (m_winsockInitialized) {
        WSACleanup();
        m_winsockInitialized = false;
    }
#endif
}

std::string HttpClient::serializeThreatEventJson(const ThreatEvent& event) {
    std::ostringstream ss;
    ss << std::fixed << std::setprecision(6);
    ss << "{\n";
    ss << "  \"device_id\": \"" << event.deviceId << "\",\n";
    ss << "  \"threat_type\": \"" << event.threatName << "\",\n";
    ss << "  \"latitude\": " << event.latitude << ",\n";
    ss << "  \"longitude\": " << event.longitude << ",\n";
    ss << "  \"confidence_score\": " << event.confidenceScore << ",\n";
    
    // Embedding vector
    ss << "  \"embedding\": [";
    for (size_t i = 0; i < event.embedding.size(); ++i) {
        ss << event.embedding[i];
        if (i + 1 < event.embedding.size()) {
            ss << ", ";
        }
    }
    ss << "]\n";
    ss << "}";
    return ss.str();
}

HttpResponse HttpClient::postJson(const std::string& path, const std::string& jsonPayload) {
    HttpResponse response;
    response.statusCode = 0;
    response.success = false;

    SOCKET sock = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    if (sock == INVALID_SOCKET) {
        response.errorMessage = "Failed to create socket";
        return response;
    }

    // Set connection timeout (3 seconds)
#if defined(_WIN32) || defined(_WIN64)
    DWORD timeoutMs = 3000;
    setsockopt(sock, SOL_SOCKET, SO_RCVTIMEO, (const char*)&timeoutMs, sizeof(timeoutMs));
    setsockopt(sock, SOL_SOCKET, SO_SNDTIMEO, (const char*)&timeoutMs, sizeof(timeoutMs));
#else
    struct timeval tv;
    tv.tv_sec = 3;
    tv.tv_usec = 0;
    setsockopt(sock, SOL_SOCKET, SO_RCVTIMEO, (const char*)&tv, sizeof(tv));
    setsockopt(sock, SOL_SOCKET, SO_SNDTIMEO, (const char*)&tv, sizeof(tv));
#endif

    sockaddr_in serverAddr;
    std::memset(&serverAddr, 0, sizeof(serverAddr));
    serverAddr.sin_family = AF_INET;
    serverAddr.sin_port = htons(static_cast<u_short>(m_port));
    serverAddr.sin_addr.s_addr = inet_addr(m_host.c_str());

    if (serverAddr.sin_addr.s_addr == INADDR_NONE) {
        // Resolve hostname
        struct hostent* hostEntry = gethostbyname(m_host.c_str());
        if (hostEntry && hostEntry->h_addr_list[0]) {
            std::memcpy(&serverAddr.sin_addr, hostEntry->h_addr_list[0], hostEntry->h_length);
        } else {
            closesocket(sock);
            response.errorMessage = "Failed to resolve host: " + m_host;
            return response;
        }
    }

    if (connect(sock, (struct sockaddr*)&serverAddr, sizeof(serverAddr)) == SOCKET_ERROR) {
        closesocket(sock);
        response.errorMessage = "Failed to connect to backend at " + m_host + ":" + std::to_string(m_port);
        return response;
    }

    // Build HTTP Request
    std::ostringstream request;
    request << "POST " << path << " HTTP/1.1\r\n";
    request << "Host: " << m_host << ":" << m_port << "\r\n";
    request << "Content-Type: application/json\r\n";
    request << "Content-Length: " << jsonPayload.length() << "\r\n";
    request << "Connection: close\r\n\r\n";
    request << jsonPayload;

    std::string requestStr = request.str();
    int sentBytes = send(sock, requestStr.c_str(), static_cast<int>(requestStr.length()), 0);
    if (sentBytes == SOCKET_ERROR) {
        closesocket(sock);
        response.errorMessage = "Failed to send HTTP data";
        return response;
    }

    // Read Response
    char buffer[4096];
    std::string rawResponse;
    int bytesRead = 0;
    while ((bytesRead = recv(sock, buffer, sizeof(buffer) - 1, 0)) > 0) {
        buffer[bytesRead] = '\0';
        rawResponse.append(buffer, bytesRead);
    }
    closesocket(sock);

    if (rawResponse.empty()) {
        response.errorMessage = "Empty response from server";
        return response;
    }

    // Parse HTTP Status Code
    size_t statusStart = rawResponse.find("HTTP/1.1 ");
    if (statusStart != std::string::npos) {
        statusStart += 9;
        std::string statusCodeStr = rawResponse.substr(statusStart, 3);
        try {
            response.statusCode = std::stoi(statusCodeStr);
        } catch (...) {
            response.statusCode = 0;
        }
    }

    // Extract Body
    size_t headerEnd = rawResponse.find("\r\n\r\n");
    if (headerEnd != std::string::npos) {
        response.body = rawResponse.substr(headerEnd + 4);
    } else {
        response.body = rawResponse;
    }

    response.success = (response.statusCode >= 200 && response.statusCode < 300);
    if (!response.success && response.errorMessage.empty()) {
        response.errorMessage = "HTTP Error " + std::to_string(response.statusCode);
    }

    return response;
}

HttpResponse HttpClient::sendTelemetryAlert(const ThreatEvent& event, const std::string& endpoint) {
    std::string payload = serializeThreatEventJson(event);
    return postJson(endpoint, payload);
}

bool HttpClient::testConnection(const std::string& healthPath) {
    SOCKET sock = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    if (sock == INVALID_SOCKET) return false;

    sockaddr_in serverAddr;
    std::memset(&serverAddr, 0, sizeof(serverAddr));
    serverAddr.sin_family = AF_INET;
    serverAddr.sin_port = htons(static_cast<u_short>(m_port));
    serverAddr.sin_addr.s_addr = inet_addr(m_host.c_str());

    if (connect(sock, (struct sockaddr*)&serverAddr, sizeof(serverAddr)) == SOCKET_ERROR) {
        closesocket(sock);
        return false;
    }

    std::string request = "GET " + healthPath + " HTTP/1.1\r\nHost: " + m_host + "\r\nConnection: close\r\n\r\n";
    send(sock, request.c_str(), static_cast<int>(request.length()), 0);

    char buf[512];
    int len = recv(sock, buf, sizeof(buf) - 1, 0);
    closesocket(sock);

    if (len > 0) {
        buf[len] = '\0';
        return std::strstr(buf, "200 OK") != nullptr || std::strstr(buf, "\"status\":\"ok\"") != nullptr;
    }
    return false;
}
