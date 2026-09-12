cmake_minimum_required(VERSION 3.10)
project(EchoGuardEdgeSimulator CXX)

set(CMAKE_CXX_STANDARD 14)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include_directories(include)

set(SOURCES
    src/AcousticSignature.cpp
    src/EdgeNode.cpp
    src/HttpClient.cpp
    src/SimulationEngine.cpp
    src/main.cpp
)

add_executable(edge_simulator ${SOURCES})

if(WIN32)
    target_link_libraries(edge_simulator ws2_32)
endif()
