FANET Load-Based Handover and Cooperative Offloading System (NS-3 Simulation)

Overview
This project is a simulation-based system for studying reliable communication in Flying Ad-Hoc Networks (FANETs). It models multiple drones communicating with ground base stations while maintaining connectivity under mobility, signal degradation, and network congestion. The system implements intelligent handover management, load balancing, and cooperative relay-based offloading to ensure Quality of Service (QoS). The simulation uses a hybrid decision mechanism combining signal strength, network load, and emergency conditions.

Key Features

Load-Based Handover
Drones dynamically switch between base stations based on signal strength and current network load to maintain optimal connectivity.

Urgent Handover Mechanism
Triggers immediate handover when signal quality drops near receiver sensitivity, preventing sudden disconnection.

Cooperative Relay Offloading
When direct communication weakens, nearby drones act as temporary relay nodes to forward data to the base station.

Optimal Relay Selection
Relay drones are chosen based on distance, elevation angle, and signal quality to maximize communication efficiency.

Ping-Pong Prevention
Hysteresis and dwell-time constraints reduce unnecessary frequent handovers between base stations.

Performance Monitoring
Tracks detailed metrics including handover counts, throughput, connection time, and network availability.

System Architecture
The system follows a layered simulation architecture:

Drone Layer
Mobile UAV nodes generating traffic and performing handovers.

Base Station Layer
Ground stations providing connectivity with limited capacity.

Relay Layer
Selected drones acting as micro base stations for offloaded clients.

Network Layer
Implements routing, communication channels, and signal propagation models.

Metrics & Logging Module
Collects performance statistics and generates output files.

Workflow

Drone initially connects to the nearest base station
Signal strength and load conditions are continuously monitored
If signal weakens or BS becomes overloaded:
â Normal handover to a better BS, or
â Urgent handover if near disconnection, or
â Offloading via relay drone if no BS is suitable
Relay forwards data to the base station
System logs performance metrics throughout the simulation

Technologies Used

Simulation Framework: NS-3
Programming Language: C++
Networking Model: IPv4 with CSMA channel
Propagation Model: Air-to-Ground path loss model
Data Output: CSV logs for analysis
Tools: GCC/Clang, Linux environment

Advantages

Maintains connectivity in highly dynamic UAV networks
Balances network load across base stations
Reduces packet loss and service interruption
Provides realistic modeling for research purposes
Supports analysis of QoS in aerial communication systems

Limitations

Simulation-based 
Assumes predefined parameters and environment
Does not include energy consumption modeling
Performance depends on chosen mobility and traffic models

Future Enhancements

Integration with 5G/6G network models
Energy-aware routing and handover decisions
Machine learningâbased predictive handover
Support for heterogeneous networks
Real-time visualization using NetAnim
Inclusion of security mechanisms

Project Status

This project is developed as an academic/research prototype to demonstrate advanced handover management and cooperative communication strategies in FANET environments.

Contributors
Nitha Theres George,Visakh V Gireesh,Neha Liz Jacob,Reesa Teddy