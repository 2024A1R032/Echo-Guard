# EchoGuard C++ Bioacoustic Edge Node Simulator

A high-performance, memory-safe C++ simulation engine that models distributed bioacoustic IoT edge sensors deployed in protected conservation reserves (e.g. Amazon basin perimeter).

## Architecture & Features

- **Memory-Safe C++14 Design**: Utilizes RAII, smart pointers (`std::unique_ptr`), bounds checking, and zero owning raw pointers.
- **Acoustic Signature Generation**: Computes 128-dimensional unit-normalized acoustic vector embeddings for compatibility with pgvector cosine similarity searches.
- **Threat Categories**: Chainsaws, Gunshots, Vehicle Engines, Illegal Vessels, Blast Fishing, and Ambient Wildlife.
- **Zero-Dependency WinSock2 Network Layer**: Direct HTTP JSON telemetry streaming to FastAPI `POST /api/v1/telemetry/`.
- **Flexible Modes**:
  - `continuous`: Multi-node live sensor stream with randomized anomaly triggers.
  - `burst`: Concentrated threat surge scenario.
  - `single`: One-off threat injection for end-to-end testing.
  - `interactive`: Terminal UI menu for manual simulation control.

## Compilation

Run the build script:
```cmd
cd edge_simulator
build.bat
```
Or directly compile with MinGW:
```cmd
g++ -std=c++14 -O2 -Wall -Iinclude src/*.cpp -o bin/edge_simulator.exe -lws2_32
```

## Running the Simulator

### Interactive Mode
```cmd
.\bin\edge_simulator.exe
```

### Continuous Stream (3 nodes, 1500ms cycle)
```cmd
.\bin\edge_simulator.exe --mode continuous --nodes 3 --interval 1500 --prob 0.4
```

### Burst Scenario (Simulate chainsaw logging surge)
```cmd
.\bin\edge_simulator.exe --mode burst --threat CHAINSAW
```

### Single Alert Injection
```cmd
.\bin\edge_simulator.exe --mode single --threat GUNSHOT
```
