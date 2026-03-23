// fanet_load_based_handover.cc - Load-Based Handover for FANET with 3 BS and 50 Drones
#include "ns3/aodv-module.h"
#include "ns3/applications-module.h"
#include "ns3/core-module.h"
#include "ns3/flow-monitor-module.h"
#include "ns3/internet-module.h"
#include "ns3/mobility-module.h"
#include "ns3/netanim-module.h"
#include "ns3/network-module.h"
#include "ns3/wifi-module.h"

#include <cmath>
#include <deque>
#include <fstream>
#include <iomanip>
#include <map>
#include <set>
#include <sstream>
#include <tuple>

using namespace ns3;
NS_LOG_COMPONENT_DEFINE("FANETSimulation");

// Global log file stream
std::ofstream logFile;

const double RX_SENSITIVITY = -95.0;
const double TX_POWER_DBM = 30.0; // Increased from 16 dBm to compensate for ATG NLoS losses
const double FREQUENCY_MHZ = 5000.0;

// ═══════════════════════════════════════════════════════════════
// ATG (Air-to-Ground) Path Loss Model Parameters
// Based on: Al-Hourani et al., "Optimal LAP Altitude for Maximum
// Coverage", IEEE Wireless Communications Letters, 2014
// ═══════════════════════════════════════════════════════════════
const double ATG_A = 9.61;    // S-curve parameter 'a' (Urban)
const double ATG_B = 0.16;    // S-curve parameter 'b' (Urban)
const double ETA_LOS = 1.0;   // Additional LoS loss (dB)
const double ETA_NLOS = 20.0; // Additional NLoS loss (dB) - Urban

struct HandoverThresholds
{
    double minRSSI;                 // Minimum RSSI to maintain connection (-78 dBm)
    double hysteresisMargin;        // RSSI improvement needed for handover (2 dB)
    double minDwellTime;            // Minimum time before next handover (3 seconds)
    double urgentHandoverThreshold; // Critical RSSI level (-92 dBm - very close to disconnect)
    double loadBalancingThreshold;  // Load difference to trigger handover (3 drones)

    HandoverThresholds()
        : minRSSI(-78.0),        // Below this, consider handover
          hysteresisMargin(3.0), // FIXED: Increased from 2.0 to 3.0 dB for stability
          minDwellTime(5.0),     // FIXED: Increased from 3.0 to 5.0 seconds
          urgentHandoverThreshold(
              -93.5), // FIXED: From -92 to -93.5 dBm (only 1.5dB above disconnect - truly rare!)
          loadBalancingThreshold(3.0)
    { // Balance if load differs by 3+ drones

        // FIXED Logic verification:
        // - RX_SENSITIVITY (-95 dBm) = hard disconnect limit
        // - urgentHandoverThreshold (-93.5 dBm) = emergency level, only 1.5dB margin (TRULY RARE!)
        // - minRSSI (-78 dBm) = normal handover trigger, 16.5dB margin (COMMON)
        // - hysteresisMargin (3 dB) = prevents rapid switching (increased for stability)
        // - minDwellTime (5s) = stronger stability buffer (increased from 3s)
        //
        // Expected behavior:
        // - Urgent handovers: < 2% of total (only when signal critically weak)
        // - Signal-based: ~40-50% (signal quality improvement)
        // - Load-based: ~40-50% (for load balancing)
    }
} globalThresholds;

// Enhanced Base Station Info with Load Tracking and Capacity Limits
struct BaseStationInfo
{
    uint32_t bsId;
    double connectionRange;
    std::set<uint32_t> connectedDrones;
    uint32_t currentLoad; // Number of connected drones
    uint32_t maxCapacity; // Maximum number of drones that can connect
    double totalDataRate; // Total data rate served (for future use)
    double lastBroadcastTime;

    BaseStationInfo()
        : bsId(0),
          connectionRange(1000.0), // Larger range; ATG path loss model limits coverage naturally
          currentLoad(0),
          maxCapacity(10),
          totalDataRate(0.0),
          lastBroadcastTime(0.0)
    {
    }

    void updateLoad()
    {
        currentLoad = connectedDrones.size();
    }

    double getLoadPercentage() const
    {
        return (currentLoad * 100.0) / maxCapacity;
    }

    bool isOverloaded() const
    {
        return currentLoad >= maxCapacity;
    }

    bool canAcceptConnection() const
    {
        return currentLoad < maxCapacity;
    }

    uint32_t availableSlots() const
    {
        return (currentLoad < maxCapacity) ? (maxCapacity - currentLoad) : 0;
    }
};

// Structure to track load information received from base stations
struct BaseStationLoadInfo
{
    uint32_t bsId;
    uint32_t load;
    double rssi;
    double timestamp;
    std::set<uint32_t> connectedDronesList;

    BaseStationLoadInfo()
        : bsId(0),
          load(0),
          rssi(-100.0),
          timestamp(0.0)
    {
    }
};

struct DroneMotionInfo
{
    Vector velocity;
    double speed;
    double direction;
    Vector previousPosition;
    double lastUpdateTime;
    bool isInitialized;
    std::map<uint32_t, BaseStationLoadInfo> receivedLoadInfo; // Load info from each BS

    DroneMotionInfo()
        : velocity(0, 0, 0),
          speed(0),
          direction(0),
          previousPosition(0, 0, 0),
          lastUpdateTime(0),
          isInitialized(false)
    {
    }
};

// Structure to track connection time per drone per BS
struct DroneConnectionMetrics
{
    uint32_t droneId;
    uint32_t currentBS;         // Currently connected BS (UINT32_MAX if disconnected)
    double connectionStartTime; // When current connection started
    std::map<uint32_t, double> totalTimePerBS;         // Total time connected to each BS
    std::map<uint32_t, uint32_t> connectionCountPerBS; // Number of times connected to each BS
    std::vector<std::tuple<double, uint32_t, double>> connectionHistory; // (time, bsId, duration)

    DroneConnectionMetrics()
        : droneId(0),
          currentBS(UINT32_MAX),
          connectionStartTime(0.0)
    {
    }

    void startConnection(uint32_t bsId, double time)
    {
        currentBS = bsId;
        connectionStartTime = time;
        connectionCountPerBS[bsId]++;
    }

    void endConnection(double time)
    {
        if (currentBS != UINT32_MAX)
        {
            double duration = time - connectionStartTime;
            totalTimePerBS[currentBS] += duration;
            connectionHistory.push_back(std::make_tuple(connectionStartTime, currentBS, duration));
            currentBS = UINT32_MAX;
        }
    }

    void updateConnection(uint32_t newBS, double time)
    {
        if (currentBS != newBS)
        {
            endConnection(time);
            if (newBS != UINT32_MAX)
            {
                startConnection(newBS, time);
            }
        }
    }

    double getTotalTimeWithBS(uint32_t bsId) const
    {
        auto it = totalTimePerBS.find(bsId);
        return (it != totalTimePerBS.end()) ? it->second : 0.0;
    }
};

std::map<uint32_t, BaseStationInfo> baseStations;
std::map<uint32_t, uint32_t> droneConnections;
std::map<uint32_t, std::map<uint32_t, double>> droneSignalMap;
std::map<uint32_t, double> lastHandoverTime;
std::map<uint32_t, DroneMotionInfo> droneMotionData;
std::map<uint32_t, DroneConnectionMetrics>
    droneConnectionMetrics; // NEW: Per-drone connection tracking

// ═══════════════════════════════════════════════════════════════
// COOPERATIVE OFFLOADING WITH OPTIMAL HEIGHT RELAY SELECTION
// Based on ATG model: drones in a BS cluster offload data through
// the relay drone closest to the optimal LAP height.
// ═══════════════════════════════════════════════════════════════

// Relay system constants
const double RELAY_RSSI_THRESHOLD = -80.0; // Drones below this offload to relay
const uint32_t RELAY_MAX_CLIENTS = 5;      // Max drones a relay can serve
const double RELAY_PACKET_SIZE = 1.0;      // Data units per offload event

struct RelayDroneInfo
{
    uint32_t droneId;
    bool isRelay;            // Currently selected as relay
    uint32_t connectedBS;    // BS this relay is associated with
    uint32_t clientCount;    // Number of drones currently offloading through this relay
    double totalDataRelayed; // Total data forwarded to BS

    RelayDroneInfo()
        : droneId(UINT32_MAX),
          isRelay(false),
          connectedBS(UINT32_MAX),
          clientCount(0),
          totalDataRelayed(0.0)
    {
    }
};

struct RelayStatistics
{
    uint32_t totalRelaySelections = 0;                 // Times a relay was selected
    uint32_t totalOffloadEvents = 0;                   // Client→Relay offload events
    double totalDataOffloaded = 0.0;                   // Total data units offloaded
    std::map<uint32_t, double> perBSDataOffloaded;     // Per-BS data offloaded
    std::map<uint32_t, uint32_t> perDroneOffloadCount; // How many times each drone offloaded
    std::map<uint32_t, uint32_t> perDroneRelayCount;   // How many times each drone was relay
};

// Global relay state
std::map<uint32_t, RelayDroneInfo> relayDrones; // droneId -> relay info
std::map<uint32_t, uint32_t> currentBSRelay;    // bsId -> relay droneId
std::map<uint32_t, double> bsOptimalHeight;     // bsId -> computed H_opt
RelayStatistics relayStats;

// ═══════════════════════════════════════════════════════════════
// UDP PACKET TRANSFER INFRASTRUCTURE
// ═══════════════════════════════════════════════════════════════

// Packet sizes (bytes)
const uint32_t UPLINK_PACKET_SIZE = 512;   // Drone → BS  (telemetry / sensor data)
const uint32_t DOWNLINK_PACKET_SIZE = 256; // BS → Drone  (control commands)
const uint32_t RELAY_PACKET_BYTES = 512;   // Relay forwards uplink packet size

// Transmission rates (packets per second per link)
const double UPLINK_TX_RATE = 10.0;  // 10 pkt/s uplink
const double DOWNLINK_TX_RATE = 5.0; // 5 pkt/s downlink

// Per-link packet counters
struct LinkStats
{
    // Uplink (Drone → BS)
    uint64_t ulPktTx = 0;
    uint64_t ulPktRx = 0;
    uint64_t ulPktDrop = 0;
    uint64_t ulBytes = 0;
    double ulDelaySum = 0.0; // sum of one-way delays (s)
    double ulDelayMin = 1e9;
    double ulDelayMax = 0.0;
    // Downlink (BS → Drone)
    uint64_t dlPktTx = 0;
    uint64_t dlPktRx = 0;
    uint64_t dlPktDrop = 0;
    uint64_t dlBytes = 0;
    double dlDelaySum = 0.0;
    double dlDelayMin = 1e9;
    double dlDelayMax = 0.0;
    // Relay (Drone → RelayDrone → BS)
    uint64_t relayPktTx = 0;
    uint64_t relayPktRx = 0;
    uint64_t relayBytes = 0;
    double relayDelaySum = 0.0;
    double relayDelayMin = 1e9;
    double relayDelayMax = 0.0;
};

std::map<uint32_t, LinkStats> linkStatsMap; // key = droneIndex (0-based)

// Per-BS aggregated counters
struct BSStats
{
    uint64_t totalUlBytes = 0;
    uint64_t totalDlBytes = 0;
    uint64_t totalRelayBytes = 0;
};

std::map<uint32_t, BSStats> bsStatsMap; // key = bsId

// Throughput snapshot for time-series CSV
struct ThroughputSample
{
    double time;
    double uplinkThroughputKbps;
    double downlinkThroughputKbps;
    double relayThroughputKbps;
    uint32_t connectedDrones;
    uint32_t relayingDrones;
    double avgUlDelayMs;
    double avgDlDelayMs;
};

std::vector<ThroughputSample> throughputTimeSeries;

// Rolling window for instantaneous throughput
struct RollingWindow
{
    std::deque<std::pair<double, uint64_t>> ulSamples;
    std::deque<std::pair<double, uint64_t>> dlSamples;
    std::deque<std::pair<double, uint64_t>> relaySamples;
    double windowDuration = 1.0;

    void addUL(double t, uint64_t bytes)
    {
        ulSamples.push_back({t, bytes});
        while (!ulSamples.empty() && ulSamples.front().first < t - windowDuration)
            ulSamples.pop_front();
    }

    void addDL(double t, uint64_t bytes)
    {
        dlSamples.push_back({t, bytes});
        while (!dlSamples.empty() && dlSamples.front().first < t - windowDuration)
            dlSamples.pop_front();
    }

    void addRelay(double t, uint64_t bytes)
    {
        relaySamples.push_back({t, bytes});
        while (!relaySamples.empty() && relaySamples.front().first < t - windowDuration)
            relaySamples.pop_front();
    }

    double getULKbps()
    {
        uint64_t total = 0;
        for (auto& s : ulSamples)
            total += s.second;
        return (total * 8.0 / 1000.0) / windowDuration;
    }

    double getDLKbps()
    {
        uint64_t total = 0;
        for (auto& s : dlSamples)
            total += s.second;
        return (total * 8.0 / 1000.0) / windowDuration;
    }

    double getRelayKbps()
    {
        uint64_t total = 0;
        for (auto& s : relaySamples)
            total += s.second;
        return (total * 8.0 / 1000.0) / windowDuration;
    }
} rollingWindow;

// Port allocation
static const uint16_t UL_PORT_BASE = 9000;    // drone i → BS      port 9000+i
static const uint16_t DL_PORT_BASE = 9500;    // BS      → drone i port 9500+i
static const uint16_t RELAY_PORT_BASE = 10000;

// Per-drone app handles
// Socket-based per-drone sender state.
// Using raw UdpSocket (not UdpClient) so we control sends directly each tick —
// no Application lifecycle issues with SetStartTime/SetStopTime mid-simulation.
struct DroneUdpApps
{
    Ptr<Socket> ulSocket;                 // Drone → BS uplink socket
    Ptr<Socket> dlSocket;                 // BS    → Drone downlink socket (one per BS)
    Ptr<Socket> relaySocket;              // Drone → Relay socket
    uint32_t ulTargetNodeId = UINT32_MAX; // Current UL destination (bsId or relayId)
    uint32_t dlSenderNodeId = UINT32_MAX; // Which BS is sending DL
    bool relayForwardActive = false;
};

std::map<uint32_t, DroneUdpApps> droneUdpApps;   // key = drone index
std::map<uint64_t, Ptr<Socket>> bsDlSocketMap;   // (droneIdx<<32)|bsNodeId → socket
std::map<uint32_t, Ipv4Address> nodeIpMap;       // nodeId → IP
std::map<uint32_t, uint32_t> nodeIdToDroneIndex; // nodeId → drone index

// ═══════════════════════════════════════════════════════════════

struct HandoverStatistics
{
    uint32_t totalHandovers = 0, successfulHandovers = 0, failedHandovers = 0;
    uint32_t pingPongHandovers = 0, urgentHandovers = 0, loadBasedHandovers = 0;
    uint32_t blockedHandovers = 0; // Handovers blocked due to BS capacity
    std::map<uint32_t, uint32_t> perDroneHandovers;
    std::map<uint32_t, double> perDroneConnectionTime, perDroneDisconnectionTime;
    std::map<uint32_t, double> lastHandoverTime;
    std::map<uint32_t, uint32_t> lastHandoverBS;
    std::vector<double> rssiSamples, handoverRSSIChanges, timeBetweenHandovers;
    int samplesAbove70dBm = 0, samplesAbove75dBm = 0, samplesAbove80dBm = 0;
    double totalConnectionTime = 0.0, totalDisconnectionTime = 0.0;
    double simulationStartTime = 0.0;

    void initialize(uint32_t numDrones, double startTime)
    {
        simulationStartTime = startTime;
        for (uint32_t i = 0; i < numDrones; i++)
        {
            perDroneConnectionTime[i] = 0.0;
            perDroneDisconnectionTime[i] = 0.0;
            lastHandoverTime[i] = startTime;
            lastHandoverBS[i] = UINT32_MAX;
        }
    }

    void addRSSISample(double rssi)
    {
        rssiSamples.push_back(rssi);
        if (rssi >= -70.0)
            samplesAbove70dBm++;
        if (rssi >= -75.0)
            samplesAbove75dBm++;
        if (rssi >= -80.0)
            samplesAbove80dBm++;
    }

    void recordHandover(uint32_t droneId,
                        uint32_t fromBS,
                        uint32_t toBS,
                        double rssiBefore,
                        double rssiAfter,
                        double currentTime,
                        bool isUrgent,
                        bool isLoadBased)
    {
        totalHandovers++;
        perDroneHandovers[droneId]++;
        if (isUrgent)
            urgentHandovers++;
        if (isLoadBased)
            loadBasedHandovers++;

        double rssiChange = rssiAfter - rssiBefore;
        handoverRSSIChanges.push_back(rssiChange);
        if (rssiChange > 0)
            successfulHandovers++;
        else if (rssiChange < -3.0)
            failedHandovers++;

        if (lastHandoverBS[droneId] != UINT32_MAX && lastHandoverBS[droneId] == toBS &&
            (currentTime - lastHandoverTime[droneId]) < 10.0)
            pingPongHandovers++;

        if (lastHandoverTime[droneId] > simulationStartTime)
        {
            timeBetweenHandovers.push_back(currentTime - lastHandoverTime[droneId]);
        }
        lastHandoverTime[droneId] = currentTime;
        lastHandoverBS[droneId] = fromBS;
    }

    void updateConnectionTime(uint32_t droneId, double timeStep, bool connected)
    {
        if (connected)
        {
            perDroneConnectionTime[droneId] += timeStep;
            totalConnectionTime += timeStep;
        }
        else
        {
            perDroneDisconnectionTime[droneId] += timeStep;
            totalDisconnectionTime += timeStep;
        }
    }

    void printFinalStats(double simTime, uint32_t numDrones)
    {
        std::cout
            << "\n╔═══════════════════════════════════════════════════════════════════════╗\n";
        std::cout << "║         HANDOVER PERFORMANCE METRICS (LOAD-BASED)                     ║\n";
        std::cout << "╠═══════════════════════════════════════════════════════════════════════╣\n";
        std::cout << "║ Total Handovers:       " << std::setw(40) << totalHandovers << " ║\n";
        std::cout << "║ Handover Rate:         " << std::setw(32) << std::fixed
                  << std::setprecision(3) << (totalHandovers / simTime) << " per sec ║\n";
        std::cout << "║ Successful Handovers:  " << std::setw(40) << successfulHandovers << " ║\n";
        std::cout << "║ Blocked Handovers:     " << std::setw(40) << blockedHandovers << " ║\n";
        std::cout << "║ Urgent Handovers:      " << std::setw(40) << urgentHandovers << " ║\n";
        std::cout << "║ Load-Based Handovers:  " << std::setw(40) << loadBasedHandovers << " ║\n";
        std::cout << "║ Ping-Pong Handovers:   " << std::setw(40) << pingPongHandovers << " ║\n";

        double avgRSSI = 0.0;
        if (!rssiSamples.empty())
        {
            for (double r : rssiSamples)
                avgRSSI += r;
            avgRSSI /= rssiSamples.size();
            std::cout << "║ Average RSSI:          " << std::setw(32) << std::setprecision(2)
                      << avgRSSI << " dBm ║\n";
        }

        double availability = (totalConnectionTime / (simTime * numDrones)) * 100.0;
        std::cout << "║ Network Availability:  " << std::setw(36) << std::setprecision(2)
                  << availability << "% ║\n";

        double blockRate = 0.0;
        if (totalHandovers > 0)
        {
            blockRate = (blockedHandovers * 100.0) / totalHandovers;
            std::cout << "║ Handover Block Rate:   " << std::setw(36) << std::setprecision(2)
                      << blockRate << "% ║\n";
        }
        std::cout << "╚═══════════════════════════════════════════════════════════════════════╝\n";

        // Write final statistics to log file
        if (logFile.is_open())
        {
            logFile << "\n========================================\n";
            logFile << "FINAL SIMULATION STATISTICS\n";
            logFile << "========================================\n";
            logFile << "Simulation Duration: " << std::fixed << std::setprecision(3) << simTime
                    << "s\n";
            logFile << "Number of Drones: " << numDrones << "\n\n";

            logFile << "HANDOVER METRICS:\n";
            logFile << "  Total Handovers: " << totalHandovers << "\n";
            logFile << "  Handover Rate: " << std::setprecision(3) << (totalHandovers / simTime)
                    << " per sec\n";
            logFile << "  Successful Handovers: " << successfulHandovers << "\n";
            logFile << "  Failed Handovers: " << failedHandovers << "\n";
            logFile << "  Blocked Handovers: " << blockedHandovers << "\n";
            logFile << "  Urgent Handovers: " << urgentHandovers << "\n";
            logFile << "  Load-Based Handovers: " << loadBasedHandovers << "\n";
            logFile << "  Signal-Based Handovers: "
                    << (totalHandovers - urgentHandovers - loadBasedHandovers) << "\n";
            logFile << "  Ping-Pong Handovers: " << pingPongHandovers << "\n";

            if (totalHandovers > 0)
            {
                logFile << "\nHANDOVER PERCENTAGES:\n";
                logFile << "  Urgent: " << std::setprecision(2)
                        << (urgentHandovers * 100.0 / totalHandovers) << "%\n";
                logFile << "  Load-Based: " << (loadBasedHandovers * 100.0 / totalHandovers)
                        << "%\n";
                logFile << "  Signal-Based: "
                        << ((totalHandovers - urgentHandovers - loadBasedHandovers) * 100.0 /
                            totalHandovers)
                        << "%\n";
                logFile << "  Block Rate: " << blockRate << "%\n";
            }

            logFile << "\nSIGNAL QUALITY:\n";
            if (!rssiSamples.empty())
            {
                logFile << "  Average RSSI: " << std::setprecision(2) << avgRSSI << " dBm\n";
                logFile << "  Total RSSI Samples: " << rssiSamples.size() << "\n";
                logFile << "  Samples >= -70 dBm: " << samplesAbove70dBm << " ("
                        << (samplesAbove70dBm * 100.0 / rssiSamples.size()) << "%)\n";
                logFile << "  Samples >= -75 dBm: " << samplesAbove75dBm << " ("
                        << (samplesAbove75dBm * 100.0 / rssiSamples.size()) << "%)\n";
                logFile << "  Samples >= -80 dBm: " << samplesAbove80dBm << " ("
                        << (samplesAbove80dBm * 100.0 / rssiSamples.size()) << "%)\n";
            }

            logFile << "\nCONNECTIVITY:\n";
            logFile << "  Total Connection Time: " << std::setprecision(2) << totalConnectionTime
                    << "s\n";
            logFile << "  Total Disconnection Time: " << totalDisconnectionTime << "s\n";
            logFile << "  Network Availability: " << availability << "%\n";

            logFile << "\nPER-DRONE STATISTICS:\n";
            for (uint32_t i = 0; i < numDrones; i++)
            {
                logFile << "  Drone " << (i + 1) << ":\n";
                logFile << "    Handovers: " << perDroneHandovers[i] << "\n";
                logFile << "    Connection Time: " << std::setprecision(2)
                        << perDroneConnectionTime[i] << "s ("
                        << (perDroneConnectionTime[i] * 100.0 / simTime) << "%)\n";
                logFile << "    Disconnection Time: " << perDroneDisconnectionTime[i] << "s ("
                        << (perDroneDisconnectionTime[i] * 100.0 / simTime) << "%)\n";
            }

            logFile << "\n========================================\n";
            logFile << "Simulation completed successfully\n";
            logFile << "========================================\n";
        }
    }
} globalStats;

// Function to output per-drone per-BS connection time data to CSV
void
OutputConnectionTimeData(uint32_t numDrones,
                         uint32_t numBaseStations,
                         NodeContainer baseStationNodes)
{
    // Output 1: Total time per drone per BS (summary)
    std::ofstream summaryFile("drone_bs_connection_summary.csv");
    summaryFile << "DroneID";
    for (uint32_t bs = 0; bs < numBaseStations; bs++)
    {
        summaryFile << ",BS-" << (bs + 1) << "_Time(s),BS-" << (bs + 1) << "_Count";
    }
    summaryFile << ",TotalConnectedTime(s)\n";

    for (uint32_t i = 0; i < numDrones; i++)
    {
        const auto& metrics = droneConnectionMetrics[i];
        summaryFile << "Drone-" << (i + 1);

        double totalTime = 0.0;
        for (uint32_t j = 0; j < numBaseStations; j++)
        {
            uint32_t bsId = baseStationNodes.Get(j)->GetId();
            double time = metrics.getTotalTimeWithBS(bsId);
            auto it = metrics.connectionCountPerBS.find(bsId);
            uint32_t count = (it != metrics.connectionCountPerBS.end()) ? it->second : 0;

            summaryFile << "," << std::fixed << std::setprecision(3) << time;
            summaryFile << "," << count;
            totalTime += time;
        }
        summaryFile << "," << std::fixed << std::setprecision(3) << totalTime << "\n";
    }
    summaryFile.close();

    // Output 2: Detailed connection history (timeline)
    std::ofstream historyFile("drone_bs_connection_history.csv");
    historyFile << "DroneID,StartTime(s),BaseStationID,Duration(s),EndTime(s)\n";

    for (uint32_t i = 0; i < numDrones; i++)
    {
        const auto& metrics = droneConnectionMetrics[i];
        for (const auto& record : metrics.connectionHistory)
        {
            double startTime = std::get<0>(record);
            uint32_t bsId = std::get<1>(record);
            double duration = std::get<2>(record);
            double endTime = startTime + duration;

            // Find BS number (1-indexed)
            uint32_t bsNum = 0;
            for (uint32_t j = 0; j < numBaseStations; j++)
            {
                if (baseStationNodes.Get(j)->GetId() == bsId)
                {
                    bsNum = j + 1;
                    break;
                }
            }

            historyFile << "Drone-" << (i + 1) << "," << std::fixed << std::setprecision(3)
                        << startTime << ","
                        << "BS-" << bsNum << "," << std::fixed << std::setprecision(3) << duration
                        << "," << std::fixed << std::setprecision(3) << endTime << "\n";
        }
    }
    historyFile.close();

    // Output 3: Per-drone connection time matrix (easy for plotting)
    std::ofstream matrixFile("drone_bs_time_matrix.csv");
    matrixFile << "DroneID";
    for (uint32_t bs = 0; bs < numBaseStations; bs++)
    {
        matrixFile << ",BS-" << (bs + 1);
    }
    matrixFile << "\n";

    for (uint32_t i = 0; i < numDrones; i++)
    {
        const auto& metrics = droneConnectionMetrics[i];
        matrixFile << "Drone-" << (i + 1);

        for (uint32_t j = 0; j < numBaseStations; j++)
        {
            uint32_t bsId = baseStationNodes.Get(j)->GetId();
            double time = metrics.getTotalTimeWithBS(bsId);
            matrixFile << "," << std::fixed << std::setprecision(3) << time;
        }
        matrixFile << "\n";
    }
    matrixFile.close();

    std::cout << "\n╔═══════════════════════════════════════════════════════════════════════╗\n";
    std::cout << "║ CONNECTION TIME DATA FILES GENERATED                                  ║\n";
    std::cout << "╠═══════════════════════════════════════════════════════════════════════╣\n";
    std::cout << "║ 1. drone_bs_connection_summary.csv                                    ║\n";
    std::cout << "║    - Total connection time per drone per BS                           ║\n";
    std::cout << "║    - Connection count per drone per BS                                ║\n";
    std::cout << "║                                                                       ║\n";
    std::cout << "║ 2. drone_bs_connection_history.csv                                    ║\n";
    std::cout << "║    - Timeline of all connections                                      ║\n";
    std::cout << "║    - Start time, BS, duration for each connection                     ║\n";
    std::cout << "║                                                                       ║\n";
    std::cout << "║ 3. drone_bs_time_matrix.csv                                           ║\n";
    std::cout << "║    - Simple matrix format for heatmap plotting                        ║\n";
    std::cout << "║    - Rows: Drones, Columns: Base Stations                             ║\n";
    std::cout << "╚═══════════════════════════════════════════════════════════════════════╝\n";
}

double
Distance(const Vector& a, const Vector& b)
{
    return std::sqrt(pow(a.x - b.x, 2) + pow(a.y - b.y, 2) + pow(a.z - b.z, 2));
}

// ═══════════════════════════════════════════════════════════════
// ATG Path Loss Functions
// ═══════════════════════════════════════════════════════════════

// LoS probability using S-curve approximation (Eq. 5, paper)
// theta_deg: elevation angle in degrees
double
LoSProbability(double theta_deg)
{
    return 1.0 / (1.0 + ATG_A * std::exp(-ATG_B * (theta_deg - ATG_A)));
}

// ATG mean path loss (dB) including LoS/NLoS weighting (Eq. 8-9, paper)
// distance3D: 3D distance between drone and BS (m)
// elevAngleDeg: elevation angle in degrees
double
CalculateATGPathLoss(double distance3D, double elevAngleDeg)
{
    if (distance3D < 1.0)
        distance3D = 1.0;

    // Free space path loss component (distance in m, frequency in MHz)
    double fspl = 20.0 * std::log10(distance3D) + 20.0 * std::log10(FREQUENCY_MHZ) - 27.55;

    // LoS and NLoS probabilities from elevation angle
    double pLoS = LoSProbability(elevAngleDeg);
    double pNLoS = 1.0 - pLoS;

    // Weighted path loss: FSPL + P(LoS)*η_LoS + P(NLoS)*η_NLoS
    return fspl + pLoS * ETA_LOS + pNLoS * ETA_NLOS;
}

// Calculate RSSI using ATG model from drone and BS positions
// Uses elevation angle and 3D distance for realistic air-to-ground propagation
double
CalculateRSSI(const Vector& dronePos, const Vector& bsPos, double txPowerDbm)
{
    double dx = dronePos.x - bsPos.x;
    double dy = dronePos.y - bsPos.y;
    double dz = dronePos.z - bsPos.z;

    double horizontalDist = std::sqrt(dx * dx + dy * dy);
    double distance3D = std::sqrt(dx * dx + dy * dy + dz * dz);

    if (distance3D < 1.0)
        distance3D = 1.0;

    // Elevation angle (degrees) between drone and BS
    double elevAngleDeg = std::atan2(std::abs(dz), horizontalDist) * 180.0 / M_PI;

    // ATG path loss
    double pathLoss = CalculateATGPathLoss(distance3D, elevAngleDeg);

    return txPowerDbm - pathLoss;
}

// ═══════════════════════════════════════════════════════════════
// OPTIMAL HEIGHT COMPUTATION & RELAY SELECTION
// ═══════════════════════════════════════════════════════════════

// Compute the optimal UAV height for relay selection using the ATG model.
// The optimal height minimizes path loss by balancing elevation angle
// vs distance. Uses numerical search since the equation is transcendental.
//
// Equation: H_opt = -A·t(H) / (2·η_NLoS·[1+a·t(H)]² + 2·(η_LoS-η_NLoS)·[1+a·t(H)])
// where t(H) = a·exp(-b·(θ-a)), θ = atan(H/R) in degrees, A = η_LoS - η_NLoS
double
ComputeOptimalHeight(double R)
{
    if (R < 1.0)
        R = 1.0; // Avoid division by zero

    double A = ETA_LOS - ETA_NLOS; // η_LoS - η_NLoS (negative for typical scenarios)
    double bestH = 100.0;          // Default fallback
    double bestError = 1e9;

    // Numerical search: iterate candidate altitudes from 30m to 300m
    for (double H_candidate = 30.0; H_candidate <= 300.0; H_candidate += 1.0)
    {
        double theta_deg = std::atan2(H_candidate, R) * 180.0 / M_PI; // elevation angle

        // t(H) = a · exp(-b · (θ - a))
        double t = ATG_A * std::exp(-ATG_B * (theta_deg - ATG_A));

        // Denominator: 2·η_NLoS·(1 + a·t)² + 2·(η_LoS - η_NLoS)·(1 + a·t)
        double at = ATG_A * t;
        double bracket = 1.0 + at;
        double denom = 2.0 * ETA_NLOS * bracket * bracket + 2.0 * A * bracket;

        // Avoid division by zero
        if (std::abs(denom) < 1e-12)
            continue;

        // H_opt from the equation
        double H_computed = -A * t / denom;

        // Find the candidate closest to the equation's output
        double error = std::abs(H_candidate - H_computed);
        if (error < bestError)
        {
            bestError = error;
            bestH = H_candidate;
        }
    }

    // Clamp to realistic drone altitude range
    bestH = std::max(50.0, std::min(200.0, bestH));
    return bestH;
}

// Select relay drones for each BS cluster based on optimal height.
// For each BS: (1) compute avg horizontal distance of connected drones,
// (2) compute optimal height, (3) select drone closest to H_opt as relay.
void
SelectClusterRelays(NodeContainer droneNodes,
                    NodeContainer baseStationNodes,
                    uint32_t numDrones,
                    uint32_t numBaseStations)
{
    double currentTime = Simulator::Now().GetSeconds();

    // Reset all relay flags
    for (auto& pair : relayDrones)
    {
        pair.second.isRelay = false;
        pair.second.clientCount = 0;
    }
    currentBSRelay.clear();

    for (uint32_t j = 0; j < numBaseStations; j++)
    {
        uint32_t bsId = baseStationNodes.Get(j)->GetId();
        BaseStationInfo& bs = baseStations[bsId];
        Vector bsPos = baseStationNodes.Get(j)->GetObject<MobilityModel>()->GetPosition();

        // Skip BS with fewer than 2 drones (need at least 1 relay + 1 client)
        if (bs.connectedDrones.size() < 2)
            continue;

        // Compute average horizontal distance of connected drones to BS
        double totalHorizDist = 0.0;
        uint32_t droneCount = 0;
        for (uint32_t droneId : bs.connectedDrones)
        {
            // Find drone node index
            for (uint32_t i = 0; i < numDrones; i++)
            {
                if (droneNodes.Get(i)->GetId() == droneId)
                {
                    Vector dronePos = droneNodes.Get(i)->GetObject<MobilityModel>()->GetPosition();
                    double dx = dronePos.x - bsPos.x;
                    double dy = dronePos.y - bsPos.y;
                    totalHorizDist += std::sqrt(dx * dx + dy * dy);
                    droneCount++;
                    break;
                }
            }
        }

        if (droneCount == 0)
            continue;
        double avgR = totalHorizDist / droneCount;

        // Compute optimal height for this cluster
        double H_opt = ComputeOptimalHeight(avgR);
        bsOptimalHeight[bsId] = H_opt;

        // Select relay using combined score: RSSI to BS (distance) + altitude proximity to H_opt
        // A relay must have good signal to the BS AND be near optimal height
        uint32_t bestRelayId = UINT32_MAX;
        double bestScore = -1e9;
        uint32_t bestRelayNodeIdx = 0;
        double bestRelayRSSI = -100.0;
        double bestRelayAltDiff = 0.0;

        // Weight factors: RSSI matters more since a far-away relay is useless
        const double RSSI_WEIGHT = 0.6;
        const double ALT_WEIGHT = 0.4;
        const double MIN_RELAY_RSSI = -85.0; // Relay must have decent signal to BS

        for (uint32_t droneId : bs.connectedDrones)
        {
            for (uint32_t i = 0; i < numDrones; i++)
            {
                if (droneNodes.Get(i)->GetId() == droneId)
                {
                    Vector dronePos = droneNodes.Get(i)->GetObject<MobilityModel>()->GetPosition();
                    double rssi = droneSignalMap[droneId][bsId];

                    // Skip drones with weak signal to BS - poor relay candidates
                    if (rssi < MIN_RELAY_RSSI)
                        break;

                    double altDiff = std::abs(dronePos.z - H_opt);

                    // Normalize scores: higher is better
                    // RSSI score: normalize to [0,1] range (-50 dBm = best, -85 dBm = worst)
                    double rssiScore = (rssi - MIN_RELAY_RSSI) / (-50.0 - MIN_RELAY_RSSI);
                    rssiScore = std::max(0.0, std::min(1.0, rssiScore));

                    // Altitude score: normalize to [0,1] (0m diff = best, 100m diff = worst)
                    double altScore = 1.0 - std::min(altDiff / 100.0, 1.0);

                    double combinedScore = RSSI_WEIGHT * rssiScore + ALT_WEIGHT * altScore;

                    if (combinedScore > bestScore)
                    {
                        bestScore = combinedScore;
                        bestRelayId = droneId;
                        bestRelayNodeIdx = i;
                        bestRelayRSSI = rssi;
                        bestRelayAltDiff = altDiff;
                    }
                    break;
                }
            }
        }

        if (bestRelayId != UINT32_MAX)
        {
            // Initialize relay info if needed
            if (relayDrones.find(bestRelayId) == relayDrones.end())
            {
                relayDrones[bestRelayId] = RelayDroneInfo();
                relayDrones[bestRelayId].droneId = bestRelayId;
            }
            relayDrones[bestRelayId].isRelay = true;
            relayDrones[bestRelayId].connectedBS = bsId;
            currentBSRelay[bsId] = bestRelayId;
            relayStats.totalRelaySelections++;
            relayStats.perDroneRelayCount[bestRelayId]++;

            Vector relayPos =
                droneNodes.Get(bestRelayNodeIdx)->GetObject<MobilityModel>()->GetPosition();
            std::cout << std::fixed << std::setprecision(1) << currentTime << "s | 📡 RELAY: BS-"
                      << (j + 1) << " cluster H_opt=" << H_opt << "m"
                      << " → Drone-" << (bestRelayNodeIdx + 1) << " (alt=" << relayPos.z
                      << "m, diff=" << bestRelayAltDiff << "m, RSSI=" << bestRelayRSSI << "dBm"
                      << ", score=" << std::setprecision(2) << bestScore << ")"
                      << " [" << bs.connectedDrones.size() << " drones in cluster]\n";

            if (logFile.is_open())
            {
                logFile << "[" << std::fixed << std::setprecision(3) << currentTime << "s] "
                        << "RELAY SELECTED - BS " << (j + 1) << " H_opt=" << std::setprecision(1)
                        << H_opt << "m"
                        << " Relay=Drone-" << (bestRelayNodeIdx + 1) << " alt=" << relayPos.z << "m"
                        << " RSSI=" << bestRelayRSSI << "dBm"
                        << " score=" << std::setprecision(2) << bestScore
                        << " avgR=" << std::setprecision(1) << avgR << "m"
                        << " cluster_size=" << bs.connectedDrones.size() << "\n";
            }
        }
    }
}

// Perform cooperative offloading: drones with weak RSSI offload through relay.
// The relay stays connected to the BS and forwards data on their behalf.
void
PerformCooperativeOffloading(NodeContainer droneNodes,
                             NodeContainer baseStationNodes,
                             uint32_t numDrones,
                             uint32_t numBaseStations)
{
    double currentTime = Simulator::Now().GetSeconds();

    for (uint32_t j = 0; j < numBaseStations; j++)
    {
        uint32_t bsId = baseStationNodes.Get(j)->GetId();

        // Check if this BS has a relay
        if (currentBSRelay.find(bsId) == currentBSRelay.end())
            continue;
        uint32_t relayId = currentBSRelay[bsId];

        // Only proceed if relay is still connected to this BS
        if (droneConnections.find(relayId) == droneConnections.end() ||
            droneConnections[relayId] != bsId)
            continue;

        RelayDroneInfo& relay = relayDrones[relayId];

        // Find relay's RSSI to BS (must have decent signal)
        double relayRSSI = droneSignalMap[relayId][bsId];
        if (relayRSSI < RX_SENSITIVITY)
            continue;

        // For each drone in this BS cluster, check if it needs offloading
        for (uint32_t droneId : baseStations[bsId].connectedDrones)
        {
            if (droneId == relayId)
                continue; // Relay doesn't offload to itself
            if (relay.clientCount >= RELAY_MAX_CLIENTS)
                break; // Relay at capacity

            double droneRSSI = droneSignalMap[droneId][bsId];

            // Drone offloads if RSSI is weak AND relay has better signal
            if (droneRSSI < RELAY_RSSI_THRESHOLD && relayRSSI > droneRSSI)
            {
                // Offload data through relay
                relay.clientCount++;
                relay.totalDataRelayed += RELAY_PACKET_SIZE;
                relayStats.totalOffloadEvents++;
                relayStats.totalDataOffloaded += RELAY_PACKET_SIZE;
                relayStats.perBSDataOffloaded[bsId] += RELAY_PACKET_SIZE;
                relayStats.perDroneOffloadCount[droneId]++;

                // Find drone node index for logging
                for (uint32_t i = 0; i < numDrones; i++)
                {
                    if (droneNodes.Get(i)->GetId() == droneId)
                    {
                        // Find relay node index
                        for (uint32_t r = 0; r < numDrones; r++)
                        {
                            if (droneNodes.Get(r)->GetId() == relayId)
                            {
                                std::cout << std::fixed << std::setprecision(1) << currentTime
                                          << "s | 🔄 OFFLOAD: Drone-" << (i + 1)
                                          << " (RSSI=" << std::setprecision(1) << droneRSSI
                                          << "dBm)"
                                          << " → Relay Drone-" << (r + 1) << " (RSSI=" << relayRSSI
                                          << "dBm)"
                                          << " via BS-" << (j + 1) << "\n";
                                break;
                            }
                        }
                        break;
                    }
                }
            }
        }
    }
}

// Print final relay statistics
void
PrintRelayFinalStats()
{
    std::cout << "\n╔═══════════════════════════════════════════════════════════════════════╗\n";
    std::cout << "║         COOPERATIVE OFFLOADING STATISTICS (OPTIMAL HEIGHT)           ║\n";
    std::cout << "╠═══════════════════════════════════════════════════════════════════════╣\n";
    std::cout << "║ Relay Selections:      " << std::setw(40) << relayStats.totalRelaySelections
              << " ║\n";
    std::cout << "║ Offload Events:        " << std::setw(40) << relayStats.totalOffloadEvents
              << " ║\n";
    std::cout << "║ Total Data Offloaded:  " << std::setw(32) << std::fixed << std::setprecision(1)
              << relayStats.totalDataOffloaded << " units ║\n";

    // Per-BS offloading
    if (!relayStats.perBSDataOffloaded.empty())
    {
        std::cout << "╠═══════════════════════════════════════════════════════════════════════╣\n";
        std::cout << "║ PER-BS OFFLOADING:                                                   ║\n";
        for (auto& pair : relayStats.perBSDataOffloaded)
        {
            std::cout << "║   BS " << pair.first << ": " << std::setw(52) << std::setprecision(1)
                      << pair.second << " units ║\n";
        }
    }

    // Per-BS optimal heights
    if (!bsOptimalHeight.empty())
    {
        std::cout << "╠═══════════════════════════════════════════════════════════════════════╣\n";
        std::cout << "║ OPTIMAL HEIGHTS (last computed):                                     ║\n";
        for (auto& pair : bsOptimalHeight)
        {
            std::cout << "║   BS " << pair.first << ": H_opt = " << std::setw(42)
                      << std::setprecision(1) << pair.second << "m ║\n";
        }
    }

    std::cout << "╚═══════════════════════════════════════════════════════════════════════╝\n";

    // Write to log file
    if (logFile.is_open())
    {
        logFile << "\nCOOPERATIVE OFFLOADING STATISTICS:\n";
        logFile << "  Relay Selections: " << relayStats.totalRelaySelections << "\n";
        logFile << "  Offload Events: " << relayStats.totalOffloadEvents << "\n";
        logFile << "  Total Data Offloaded: " << relayStats.totalDataOffloaded << " units\n";
        for (auto& pair : bsOptimalHeight)
        {
            logFile << "  BS " << pair.first << " H_opt: " << pair.second << "m\n";
        }
    }
}

void
UpdateDroneMotionInfo(NodeContainer droneNodes, uint32_t numDrones)
{
    double currentTime = Simulator::Now().GetSeconds();

    for (uint32_t i = 0; i < numDrones; i++)
    {
        uint32_t droneId = droneNodes.Get(i)->GetId();
        Vector currentPos = droneNodes.Get(i)->GetObject<MobilityModel>()->GetPosition();

        DroneMotionInfo& motion = droneMotionData[droneId];

        if (motion.isInitialized && currentTime > motion.lastUpdateTime)
        {
            double deltaTime = currentTime - motion.lastUpdateTime;

            motion.velocity.x = (currentPos.x - motion.previousPosition.x) / deltaTime;
            motion.velocity.y = (currentPos.y - motion.previousPosition.y) / deltaTime;
            motion.velocity.z = (currentPos.z - motion.previousPosition.z) / deltaTime;

            motion.speed = std::sqrt(motion.velocity.x * motion.velocity.x +
                                     motion.velocity.y * motion.velocity.y +
                                     motion.velocity.z * motion.velocity.z);

            if (motion.speed > 0.1)
            {
                motion.direction = std::atan2(motion.velocity.y, motion.velocity.x) * 180.0 / M_PI;
                if (motion.direction < 0)
                    motion.direction += 360.0;
            }
        }
        else
        {
            motion.isInitialized = true;
        }

        motion.previousPosition = currentPos;
        motion.lastUpdateTime = currentTime;
    }
}

// Broadcast load information from base stations to drones in range
void
BroadcastBaseStationLoad(NodeContainer droneNodes,
                         NodeContainer baseStationNodes,
                         uint32_t numDrones,
                         uint32_t numBaseStations)
{
    double currentTime = Simulator::Now().GetSeconds();

    for (uint32_t j = 0; j < numBaseStations; j++)
    {
        uint32_t bsId = baseStationNodes.Get(j)->GetId();
        BaseStationInfo& bs = baseStations[bsId];
        bs.updateLoad();
        bs.lastBroadcastTime = currentTime;

        Vector bsPos = baseStationNodes.Get(j)->GetObject<MobilityModel>()->GetPosition();

        // Broadcast to all drones in range
        for (uint32_t i = 0; i < numDrones; i++)
        {
            uint32_t droneId = droneNodes.Get(i)->GetId();
            Vector dronePos = droneNodes.Get(i)->GetObject<MobilityModel>()->GetPosition();
            double distance = Distance(dronePos, bsPos);
            double rssi = droneSignalMap[droneId][bsId];

            // Drone can receive broadcast only if within range AND good RSSI
            if (distance <= bs.connectionRange && rssi >= RX_SENSITIVITY)
            {
                DroneMotionInfo& drone = droneMotionData[droneId];
                BaseStationLoadInfo& loadInfo = drone.receivedLoadInfo[bsId];

                loadInfo.bsId = bsId;
                loadInfo.load = bs.currentLoad;
                loadInfo.rssi = rssi;
                loadInfo.timestamp = currentTime;
                loadInfo.connectedDronesList = bs.connectedDrones;
            }
        }
    }
}

void
PrintBaseStationLoadTable(NodeContainer baseStationNodes, uint32_t numBaseStations)
{
    std::cout << "\n┌─── BASE STATION LOAD INFORMATION ────────────────────────────────────────┐\n";
    std::cout << "│ BS-ID │ Load │ Capacity │ Load % │ Status      │ Available Slots      │\n";
    std::cout << "├───────┼──────┼──────────┼────────┼─────────────┼──────────────────────┤\n";

    for (uint32_t j = 0; j < numBaseStations; j++)
    {
        uint32_t bsId = baseStationNodes.Get(j)->GetId();
        BaseStationInfo& bs = baseStations[bsId];

        std::string status = bs.isOverloaded()                          ? "OVERLOADED"
                             : (bs.currentLoad >= bs.maxCapacity * 0.8) ? "NEAR-FULL"
                                                                        : "NORMAL";

        std::cout << "│ BS-" << std::setw(2) << (j + 1) << " │ " << std::setw(4) << bs.currentLoad
                  << " │ " << std::setw(8) << bs.maxCapacity << " │ " << std::setw(5) << std::fixed
                  << std::setprecision(1) << bs.getLoadPercentage() << "% │ " << std::setw(11)
                  << std::left << status << std::right << " │ " << std::setw(20)
                  << bs.availableSlots() << " │\n";
    }
    std::cout << "└───────┴──────┴──────────┴────────┴─────────────┴──────────────────────┘\n";
}

void
UpdateRSSIMeasurements(NodeContainer droneNodes,
                       NodeContainer baseStationNodes,
                       uint32_t numDrones,
                       uint32_t numBaseStations)
{
    UpdateDroneMotionInfo(droneNodes, numDrones);

    double currentTime = Simulator::Now().GetSeconds();

    for (uint32_t i = 0; i < numDrones; i++)
    {
        uint32_t droneId = droneNodes.Get(i)->GetId();
        Vector dronePos = droneNodes.Get(i)->GetObject<MobilityModel>()->GetPosition();
        for (uint32_t j = 0; j < numBaseStations; j++)
        {
            uint32_t bsId = baseStationNodes.Get(j)->GetId();
            Vector bsPos = baseStationNodes.Get(j)->GetObject<MobilityModel>()->GetPosition();
            double distance = Distance(dronePos, bsPos);
            double rssi = CalculateRSSI(dronePos, bsPos, TX_POWER_DBM);
            droneSignalMap[droneId][bsId] = rssi;

            // Only log RSSI for connected drone-BS pairs (reduces log verbosity)
            if (logFile.is_open() && droneConnections.count(droneId) > 0 &&
                droneConnections[droneId] == bsId)
            {
                logFile << "[" << std::fixed << std::setprecision(3) << currentTime << "s] "
                        << "Connected - Drone " << i + 1 << " <-> BS " << j + 1
                        << ": RSSI=" << std::setprecision(2) << rssi << " dBm "
                        << "(Distance: " << std::setprecision(1) << distance << "m)\n";
            }
        }
    }
}

void
UpdateDroneConnectionsLoadBased(NodeContainer droneNodes,
                                NodeContainer baseStationNodes,
                                uint32_t numDrones,
                                uint32_t numBaseStations,
                                double updateInterval)
{
    double currentTime = Simulator::Now().GetSeconds();

    for (uint32_t i = 0; i < numDrones; i++)
    {
        uint32_t droneId = droneNodes.Get(i)->GetId();
        uint32_t currentBsId =
            (droneConnections.count(droneId) > 0) ? droneConnections[droneId] : UINT32_MAX;
        Vector dronePos = droneNodes.Get(i)->GetObject<MobilityModel>()->GetPosition();

        // STEP 1: Find best BS based on RSSI AND RANGE
        int bestRSSIIndex = -1;
        double bestRSSI = -200.0;
        for (uint32_t j = 0; j < numBaseStations; j++)
        {
            uint32_t bsId = baseStationNodes.Get(j)->GetId();
            double rssi = droneSignalMap[droneId][bsId];

            // Check physical distance to BS
            Vector bsPos = baseStationNodes.Get(j)->GetObject<MobilityModel>()->GetPosition();
            double distance = Distance(dronePos, bsPos);

            // BS must be: (1) within range, (2) above RX sensitivity, (3) best RSSI
            if (distance <= baseStations[bsId].connectionRange && rssi >= RX_SENSITIVITY &&
                rssi > bestRSSI)
            {
                bestRSSI = rssi;
                bestRSSIIndex = j;
            }
        }

        // STEP 2: Find best BS based on load (among acceptable RSSI options)
        int bestLoadIndex = -1;
        uint32_t minLoad = UINT32_MAX;
        for (uint32_t j = 0; j < numBaseStations; j++)
        {
            uint32_t bsId = baseStationNodes.Get(j)->GetId();
            double rssi = droneSignalMap[droneId][bsId];

            // Check distance to BS
            Vector bsPos = baseStationNodes.Get(j)->GetObject<MobilityModel>()->GetPosition();
            double distance = Distance(dronePos, bsPos);

            // Consider BS if: (1) in range, (2) RSSI acceptable (within 5dB of best)
            // 5dB tolerance allows load balancing without severe signal degradation
            if (distance <= baseStations[bsId].connectionRange && rssi >= RX_SENSITIVITY &&
                (bestRSSI - rssi) <= 5.0)
            {
                if (baseStations[bsId].currentLoad < minLoad)
                {
                    minLoad = baseStations[bsId].currentLoad;
                    bestLoadIndex = j;
                }
            }
        }

        // STEP 3: Get current connection status
        int currentBsIndex = -1;
        double currentRSSI = -100.0;
        uint32_t currentLoad = 0;
        double currentDistance = 1000.0;

        if (currentBsId != UINT32_MAX)
        {
            for (uint32_t j = 0; j < numBaseStations; j++)
            {
                if (baseStationNodes.Get(j)->GetId() == currentBsId)
                {
                    currentBsIndex = j;
                    currentRSSI = droneSignalMap[droneId][currentBsId];
                    currentLoad = baseStations[currentBsId].currentLoad;

                    // Calculate current distance to BS
                    Vector bsPos =
                        baseStationNodes.Get(j)->GetObject<MobilityModel>()->GetPosition();
                    currentDistance = Distance(dronePos, bsPos);
                    break;
                }
            }

            // SAFETY CHECK 1: Out-of-range disconnect
            if (currentDistance > baseStations[currentBsId].connectionRange)
            {
                std::cout << currentTime << "s | OUT-OF-RANGE: Drone-" << (i + 1)
                          << " distance=" << std::fixed << std::setprecision(1) << currentDistance
                          << "m > " << baseStations[currentBsId].connectionRange << "m\n";

                // Log out-of-range disconnection
                if (logFile.is_open())
                {
                    logFile << "[" << std::fixed << std::setprecision(3) << currentTime << "s] "
                            << "DISCONNECTION (OUT-OF-RANGE) - Drone " << i + 1 << " from BS "
                            << currentBsIndex + 1 << " - Distance: " << std::setprecision(1)
                            << currentDistance
                            << "m > Range: " << baseStations[currentBsId].connectionRange << "m\n";
                }

                // Track disconnection in metrics
                droneConnectionMetrics[i].endConnection(currentTime);

                // Force disconnect due to range
                globalStats.recordHandover(droneId,
                                           currentBsId,
                                           UINT32_MAX,
                                           currentRSSI,
                                           currentRSSI,
                                           currentTime,
                                           false,
                                           false);
                lastHandoverTime[droneId] = currentTime;
                baseStations[currentBsId].connectedDrones.erase(droneId);
                droneConnections.erase(droneId);
                currentBsIndex = -1;
            }

            // SAFETY CHECK 2: Signal too weak (below RX sensitivity)
            else if (currentRSSI < RX_SENSITIVITY)
            {
                std::cout << currentTime << "s | SIGNAL-LOST: Drone-" << (i + 1)
                          << " RSSI=" << std::setprecision(1) << currentRSSI << "dBm < "
                          << RX_SENSITIVITY << "dBm\n";

                // Log signal-lost disconnection
                if (logFile.is_open())
                {
                    logFile << "[" << std::fixed << std::setprecision(3) << currentTime << "s] "
                            << "DISCONNECTION (SIGNAL-LOST) - Drone " << i + 1 << " from BS "
                            << currentBsIndex + 1 << " - RSSI: " << std::setprecision(2)
                            << currentRSSI << " dBm < Sensitivity: " << RX_SENSITIVITY << " dBm\n";
                }

                // Track disconnection in metrics
                droneConnectionMetrics[i].endConnection(currentTime);

                // Force disconnect due to weak signal
                globalStats.recordHandover(droneId,
                                           currentBsId,
                                           UINT32_MAX,
                                           currentRSSI,
                                           currentRSSI,
                                           currentTime,
                                           false,
                                           false);
                lastHandoverTime[droneId] = currentTime;
                baseStations[currentBsId].connectedDrones.erase(droneId);
                droneConnections.erase(droneId);
                currentBsIndex = -1;
            }
        }

        // STEP 4: Calculate time since last handover
        double timeSinceLastHandover = (lastHandoverTime.count(droneId) > 0)
                                           ? currentTime - lastHandoverTime[droneId]
                                           : 1000.0;

        // STEP 5: Handover decision logic
        bool shouldHandover = false;
        bool isUrgent = false;
        bool isLoadBased = false;
        int targetBSIndex = currentBsIndex;

        if (currentBsIndex >= 0)
        {
            // CASE 1: URGENT HANDOVER (signal critically weak, emergency action needed)
            // Triggered when: RSSI < -93.5 dBm (only 1.5dB above disconnect) AND better option
            // exists This should be TRULY RARE - only when drone is about to lose connection FIXED:
            // Added check to prevent handover to same BS
            if (currentRSSI < globalThresholds.urgentHandoverThreshold && bestRSSIIndex >= 0 &&
                bestRSSIIndex != currentBsIndex)
            {
                shouldHandover = true;
                isUrgent = true;
                targetBSIndex = bestRSSIIndex;
                std::cout << currentTime << "s | 🚨 URGENT: Drone-" << (i + 1)
                          << " critical RSSI=" << std::fixed << std::setprecision(1) << currentRSSI
                          << " dBm (only " << (currentRSSI - RX_SENSITIVITY)
                          << " dB above disconnect!)\n";

                // Log urgent handover decision
                if (logFile.is_open())
                {
                    logFile << "[" << std::fixed << std::setprecision(3) << currentTime << "s] "
                            << "URGENT HANDOVER DECISION - Drone " << i + 1 << " from BS "
                            << currentBsIndex + 1 << " (RSSI: " << std::setprecision(2)
                            << currentRSSI << " dBm) to BS " << bestRSSIIndex + 1
                            << " (RSSI: " << bestRSSI
                            << " dBm) - Margin above disconnect: " << (currentRSSI - RX_SENSITIVITY)
                            << " dB\n";
                }
            }
            // CASE 2: LOAD-BASED HANDOVER (balance network load)
            // Triggered when: (1) cooldown expired, (2) target has fewer drones, (3) signal
            // acceptable FIXED: Added check to prevent handover to same BS
            else if (timeSinceLastHandover >= globalThresholds.minDwellTime && bestLoadIndex >= 0)
            {
                uint32_t targetBsId = baseStationNodes.Get(bestLoadIndex)->GetId();
                uint32_t targetLoad = baseStations[targetBsId].currentLoad;
                double targetRSSI = droneSignalMap[droneId][targetBsId];

                // FIXED: Only handover if target is DIFFERENT BS and conditions are met
                if (bestLoadIndex != currentBsIndex && targetLoad < currentLoad &&
                    (currentLoad - targetLoad) >= globalThresholds.loadBalancingThreshold &&
                    (currentRSSI - targetRSSI) <= 5.0)
                { // Max 5dB RSSI penalty
                    shouldHandover = true;
                    isLoadBased = true;
                    targetBSIndex = bestLoadIndex;
                    std::cout << currentTime << "s | ⚖️  LOAD-BALANCE: Drone-" << (i + 1)
                              << " moving to less loaded BS (Load: " << currentLoad << " → "
                              << targetLoad << ", RSSI penalty: " << std::setprecision(1)
                              << (currentRSSI - targetRSSI) << " dB)\n";

                    // Log load-based handover
                    if (logFile.is_open())
                    {
                        logFile << "[" << std::fixed << std::setprecision(3) << currentTime << "s] "
                                << "LOAD-BASED HANDOVER - Drone " << i + 1 << " from BS "
                                << currentBsIndex + 1 << " (Load: " << currentLoad
                                << ", RSSI: " << std::setprecision(2) << currentRSSI
                                << " dBm) to BS " << bestLoadIndex + 1 << " (Load: " << targetLoad
                                << ", RSSI: " << targetRSSI
                                << " dBm) - Load reduction: " << (currentLoad - targetLoad)
                                << ", RSSI penalty: " << (currentRSSI - targetRSSI) << " dB\n";
                    }
                }
            }
            // CASE 3: SIGNAL-BASED HANDOVER (improve signal quality)
            // Triggered when: (1) cooldown expired, (2) current signal weak, (3) better option
            // exists FIXED: Added check to prevent handover to same BS
            else if (timeSinceLastHandover >= globalThresholds.minDwellTime)
            {
                if (currentRSSI < globalThresholds.minRSSI && bestRSSIIndex >= 0 &&
                    bestRSSIIndex != currentBsIndex)
                { // FIXED: Ensure different BS
                    double improvement = bestRSSI - currentRSSI;
                    // Require hysteresis margin to prevent ping-pong
                    if (improvement >= globalThresholds.hysteresisMargin)
                    {
                        shouldHandover = true;
                        targetBSIndex = bestRSSIIndex;
                        std::cout << currentTime << "s | 📶 SIGNAL-HANDOVER: Drone-" << (i + 1)
                                  << " improving RSSI by " << std::setprecision(1) << improvement
                                  << " dB (from " << currentRSSI << " to " << bestRSSI << " dBm)\n";

                        // Log signal-based handover
                        if (logFile.is_open())
                        {
                            logFile
                                << "[" << std::fixed << std::setprecision(3) << currentTime << "s] "
                                << "SIGNAL-BASED HANDOVER - Drone " << i + 1 << " from BS "
                                << currentBsIndex + 1 << " (RSSI: " << std::setprecision(2)
                                << currentRSSI << " dBm) to BS " << bestRSSIIndex + 1
                                << " (RSSI: " << bestRSSI << " dBm) - Improvement: " << improvement
                                << " dB\n";
                        }
                    }
                }
            }
        }
        else
        {
            // CASE 4: NOT CONNECTED - try to connect to best available BS
            if (bestLoadIndex >= 0)
            {
                shouldHandover = true;
                targetBSIndex = bestLoadIndex;
                std::cout << currentTime << "s | 🔌 INITIAL-CONNECT: Drone-" << (i + 1)
                          << " connecting to BS-" << (bestLoadIndex + 1) << "\n";
            }
            else if (bestRSSIIndex >= 0)
            {
                shouldHandover = true;
                targetBSIndex = bestRSSIIndex;
                std::cout << currentTime << "s | 🔌 INITIAL-CONNECT: Drone-" << (i + 1)
                          << " connecting to BS-" << (bestRSSIIndex + 1) << "\n";
            }
        }

        // STEP 6: Execute handover if decision made
        // CRITICAL FIX: Only execute if target BS is DIFFERENT from current BS
        if (shouldHandover && targetBSIndex >= 0 && targetBSIndex != currentBsIndex)
        {
            uint32_t targetBsId = baseStationNodes.Get(targetBSIndex)->GetId();
            double targetRSSI = droneSignalMap[droneId][targetBsId];

            // CHECK CAPACITY: Can target BS accept new connection?
            // FIXED: Check actual connectedDrones.size() in real-time instead of stale currentLoad
            if (baseStations[targetBsId].connectedDrones.size() >=
                baseStations[targetBsId].maxCapacity)
            {
                // HANDOVER BLOCKED - Target BS at maximum capacity
                globalStats.blockedHandovers++;

                std::cout << currentTime << "s | ⚠️  HANDOVER BLOCKED: Drone-" << (i + 1) << " → BS-"
                          << (targetBSIndex + 1)
                          << " [CAPACITY FULL: " << baseStations[targetBsId].connectedDrones.size()
                          << "/" << baseStations[targetBsId].maxCapacity << "]\n";

                // Log blocked handover
                if (logFile.is_open())
                {
                    logFile << "[" << std::fixed << std::setprecision(3) << currentTime << "s] "
                            << "HANDOVER BLOCKED - Drone " << i + 1 << " to BS "
                            << targetBSIndex + 1 << " - Target BS at maximum capacity ("
                            << baseStations[targetBsId].connectedDrones.size() << "/"
                            << baseStations[targetBsId].maxCapacity << ")\n";
                }

                // Drone stays connected to current BS (if any)
                // Do not execute handover
            }
            else
            {
                // HANDOVER ALLOWED - Target BS has available capacity
                if (currentBsId != UINT32_MAX)
                {
                    // Handover from current BS to target BS
                    baseStations[currentBsId].connectedDrones.erase(droneId);
                    globalStats.recordHandover(droneId,
                                               currentBsId,
                                               targetBsId,
                                               currentRSSI,
                                               targetRSSI,
                                               currentTime,
                                               isUrgent,
                                               isLoadBased);
                    lastHandoverTime[droneId] = currentTime;

                    // Update connection metrics - switching from one BS to another
                    droneConnectionMetrics[i].updateConnection(targetBsId, currentTime);

                    std::string hoType = isUrgent
                                             ? "🚨 URGENT"
                                             : (isLoadBased ? "⚖️  LOAD-BASED" : "📶 SIGNAL-BASED");
                    std::cout << currentTime << "s | " << hoType << " HANDOVER: Drone-" << (i + 1)
                              << " BS-" << (currentBsIndex + 1) << " → BS-" << (targetBSIndex + 1)
                              << " (RSSI: " << std::showpos << std::setprecision(1)
                              << (targetRSSI - currentRSSI) << " dBm)"
                              << " [Target: " << baseStations[targetBsId].connectedDrones.size()
                              << "/" << baseStations[targetBsId].maxCapacity << "]\n";

                    // Log successful handover
                    if (logFile.is_open())
                    {
                        std::string typeStr =
                            isUrgent ? "URGENT" : (isLoadBased ? "LOAD-BASED" : "SIGNAL-BASED");
                        logFile << "[" << std::fixed << std::setprecision(3) << currentTime << "s] "
                                << "HANDOVER SUCCESS (" << typeStr << ") - Drone " << i + 1
                                << " from BS " << currentBsIndex + 1 << " to BS "
                                << targetBSIndex + 1 << " - RSSI change: " << std::showpos
                                << std::setprecision(2) << (targetRSSI - currentRSSI)
                                << " dBm - Target load: " << std::noshowpos
                                << baseStations[targetBsId].connectedDrones.size() << "/"
                                << baseStations[targetBsId].maxCapacity << "\n";
                    }
                }
                else
                {
                    // Initial connection
                    droneConnectionMetrics[i].startConnection(targetBsId, currentTime);

                    std::cout << currentTime << "s | ✓ INITIAL-CONNECT: Drone-" << (i + 1)
                              << " → BS-" << (targetBSIndex + 1)
                              << " [Load: " << baseStations[targetBsId].connectedDrones.size()
                              << "/" << baseStations[targetBsId].maxCapacity << "]\n";

                    // Log initial connection
                    if (logFile.is_open())
                    {
                        logFile << "[" << std::fixed << std::setprecision(3) << currentTime << "s] "
                                << "INITIAL CONNECTION - Drone " << i + 1 << " to BS "
                                << targetBSIndex + 1
                                << " - Load: " << baseStations[targetBsId].connectedDrones.size()
                                << "/" << baseStations[targetBsId].maxCapacity
                                << " - RSSI: " << std::setprecision(2) << targetRSSI << " dBm\n";
                    }
                }

                // Connect to target BS
                droneConnections[droneId] = targetBsId;
                baseStations[targetBsId].connectedDrones.insert(droneId);
            }
        }

        // STEP 7: Update connection time statistics
        bool connected = (droneConnections.count(droneId) > 0);
        globalStats.updateConnectionTime(i, updateInterval, connected);
        if (connected)
        {
            globalStats.addRSSISample(droneSignalMap[droneId][droneConnections[droneId]]);
        }
    }
}

void
PrintConnectionStatus(NodeContainer droneNodes,
                      NodeContainer baseStationNodes,
                      uint32_t numDrones,
                      uint32_t numBaseStations,
                      AnimationInterface& anim)
{
    std::vector<std::tuple<uint8_t, uint8_t, uint8_t>> bsColors = {
        {0, 255, 0},   // BS-1: Bright Green
        {255, 165, 0}, // BS-2: Orange
        {148, 0, 211}  // BS-3: Purple
    };

    double currentTime = Simulator::Now().GetSeconds();

    // Print status only every 5 seconds to avoid console spam
    static double lastPrintTime = -10.0;
    bool shouldPrint = (currentTime - lastPrintTime >= 5.0);

    if (shouldPrint)
    {
        std::cout << "\n━━━ Status @ " << std::fixed << std::setprecision(2) << currentTime
                  << "s ━━━\n";

        // Print Base Station Load Table
        PrintBaseStationLoadTable(baseStationNodes, numBaseStations);

        // Print drone connections with distance info and number of available BS
        std::cout << "\n┌─── DRONE CONNECTION STATUS (Available BS Count) ─────────────────────┐\n";
        for (uint32_t i = 0; i < numDrones; i++)
        {
            uint32_t droneId = droneNodes.Get(i)->GetId();
            Vector dronePos = droneNodes.Get(i)->GetObject<MobilityModel>()->GetPosition();

            // Count how many BS are in range
            int availableBS = 0;
            for (uint32_t j = 0; j < numBaseStations; j++)
            {
                uint32_t bsId = baseStationNodes.Get(j)->GetId();
                Vector bsPos = baseStationNodes.Get(j)->GetObject<MobilityModel>()->GetPosition();
                double distance = Distance(dronePos, bsPos);
                double rssi = droneSignalMap[droneId][bsId];

                if (distance <= baseStations[bsId].connectionRange && rssi >= RX_SENSITIVITY)
                {
                    availableBS++;
                }
            }

            std::cout << "│ D" << std::setw(2) << (i + 1) << " [" << availableBS
                      << " BS available] ";

            if (droneConnections.count(droneId) > 0)
            {
                for (uint32_t j = 0; j < numBaseStations; j++)
                {
                    if (baseStationNodes.Get(j)->GetId() == droneConnections[droneId])
                    {
                        Vector bsPos =
                            baseStationNodes.Get(j)->GetObject<MobilityModel>()->GetPosition();
                        double distance = Distance(dronePos, bsPos);
                        double rssi = droneSignalMap[droneId][droneConnections[droneId]];
                        std::cout << "→ BS-" << (j + 1) << " [" << std::setprecision(0) << distance
                                  << "m, " << std::setprecision(1) << rssi << "dBm]";
                        break;
                    }
                }
            }
            else
            {
                std::cout << "→ DISCONNECTED         ";
            }
            std::cout << std::string(5, ' ') << " │\n";
        }
        std::cout << "└───────────────────────────────────────────────────────────────────────┘\n";

        lastPrintTime = currentTime;
    }

    // Update drone colors, descriptions (relay/RSSI/height) in NetAnim
    for (uint32_t i = 0; i < numDrones; i++)
    {
        uint32_t droneId = droneNodes.Get(i)->GetId();
        Vector dronePos = droneNodes.Get(i)->GetObject<MobilityModel>()->GetPosition();
        bool isConnected = false;
        bool isRelay = (relayDrones.count(droneId) > 0 && relayDrones[droneId].isRelay);

        // Build dynamic description: "Drone-X [RELAY] RSSI:-XX.XdBm H:XXXm"
        std::ostringstream desc;
        desc << "Drone-" << (i + 1);
        if (isRelay)
        {
            desc << " [RELAY]";
        }

        for (uint32_t j = 0; j < numBaseStations; j++)
        {
            uint32_t bsId = baseStationNodes.Get(j)->GetId();

            if (droneConnections.count(droneId) > 0 && droneConnections[droneId] == bsId)
            {
                double rssi = droneSignalMap[droneId][bsId];
                desc << " RSSI:" << std::fixed << std::setprecision(1) << rssi << "dBm";

                if (isRelay)
                {
                    // Relay drones: same color as connected BS, but larger size
                    anim.UpdateNodeColor(droneId,
                                         std::get<0>(bsColors[j]),
                                         std::get<1>(bsColors[j]),
                                         std::get<2>(bsColors[j]));
                    anim.UpdateNodeSize(droneId, 25, 25);
                }
                else
                {
                    anim.UpdateNodeColor(droneId,
                                         std::get<0>(bsColors[j]),
                                         std::get<1>(bsColors[j]),
                                         std::get<2>(bsColors[j]));
                    anim.UpdateNodeSize(droneId, 20, 20);
                }
                isConnected = true;
                break;
            }
        }

        if (!isConnected)
        {
            desc << " RSSI:N/A";
            anim.UpdateNodeColor(droneId, 128, 128, 128);
            anim.UpdateNodeSize(droneId, 20, 20);
        }

        desc << " H:" << std::fixed << std::setprecision(0) << dronePos.z << "m";
        anim.UpdateNodeDescription(droneId, desc.str());
    }
}

// ═══════════════════════════════════════════════════════════════
// TIMESTAMP TAG — embeds send-time in each packet for delay measurement
// ═══════════════════════════════════════════════════════════════
class SendTimestampTag : public Tag
{
  public:
    static TypeId GetTypeId()
    {
        static TypeId tid =
            TypeId("SendTimestampTag").SetParent<Tag>().AddConstructor<SendTimestampTag>();
        return tid;
    }

    TypeId GetInstanceTypeId() const override
    {
        return GetTypeId();
    }

    uint32_t GetSerializedSize() const override
    {
        return sizeof(double);
    }

    void Serialize(TagBuffer buf) const override
    {
        buf.WriteDouble(m_sendTime);
    }

    void Deserialize(TagBuffer buf) override
    {
        m_sendTime = buf.ReadDouble();
    }

    void Print(std::ostream& os) const override
    {
        os << "sendTime=" << m_sendTime;
    }

    void SetSendTime(double t)
    {
        m_sendTime = t;
    }

    double GetSendTime() const
    {
        return m_sendTime;
    }

  private:
    double m_sendTime = 0.0;
};

// Rx callback: BS receives uplink packet from drone via raw socket.
// MakeBoundCallback binds ONE arg to the FIRST param; Ptr<Socket> is LAST (unbound).
// We pack (droneIdx, bsNodeId) into a single uint64_t.
static void
UlRawRxCallback(uint64_t packed, Ptr<Socket> sock)
{
    uint32_t droneIdx = static_cast<uint32_t>(packed >> 32);
    uint32_t bsNodeId = static_cast<uint32_t>(packed & 0xFFFFFFFF);
    Ptr<Packet> pkt;
    Address from;
    while ((pkt = sock->RecvFrom(from)))
    {
        double t = Simulator::Now().GetSeconds();
        uint32_t sz = pkt->GetSize();
        LinkStats& ls = linkStatsMap[droneIdx];
        ls.ulPktRx++;
        ls.ulBytes += sz;
        bsStatsMap[bsNodeId].totalUlBytes += sz;
        rollingWindow.addUL(t, sz);

        SendTimestampTag tag;
        if (pkt->PeekPacketTag(tag))
        {
            double d = t - tag.GetSendTime();
            ls.ulDelaySum += d;
            if (d < ls.ulDelayMin)
                ls.ulDelayMin = d;
            if (d > ls.ulDelayMax)
                ls.ulDelayMax = d;
        }
    }
}

// Rx callback: Drone receives downlink packet from BS via raw socket.
// Single bound arg (droneIdx) is first, Ptr<Socket> is last.
static void
DlRawRxCallback(uint32_t droneIdx, Ptr<Socket> sock)
{
    Ptr<Packet> pkt;
    Address from;
    while ((pkt = sock->RecvFrom(from)))
    {
        double t = Simulator::Now().GetSeconds();
        uint32_t sz = pkt->GetSize();
        LinkStats& ls = linkStatsMap[droneIdx];
        ls.dlPktRx++;
        ls.dlBytes += sz;
        rollingWindow.addDL(t, sz);

        SendTimestampTag tag;
        if (pkt->PeekPacketTag(tag))
        {
            double d = t - tag.GetSendTime();
            ls.dlDelaySum += d;
            if (d < ls.dlDelayMin)
                ls.dlDelayMin = d;
            if (d > ls.dlDelayMax)
                ls.dlDelayMax = d;
        }
    }
}

// Rx callback: Relay drone receives packet from client drone via raw socket.
// Packs (clientDroneIdx, relayNodeId) into uint64_t.
static void
RelayRawRxCallback(uint32_t relayNodeId, Ptr<Socket> sock)
{
    Ptr<Packet> pkt;
    Address from;
    while ((pkt = sock->RecvFrom(from)))
    {
        double t = Simulator::Now().GetSeconds();
        uint32_t sz = pkt->GetSize();
        uint16_t srcPort = InetSocketAddress::ConvertFrom(from).GetPort();
        uint32_t clientDroneIdx = srcPort >= 8500 ? (srcPort - 8500) : 0;
        LinkStats& ls = linkStatsMap[clientDroneIdx];
        ls.relayPktRx++;
        ls.relayBytes += sz;
        rollingWindow.addRelay(t, sz);

        SendTimestampTag tag;
        if (pkt->PeekPacketTag(tag))
        {
            double d = t - tag.GetSendTime();
            ls.relayDelaySum += d;
            if (d < ls.relayDelayMin)
                ls.relayDelayMin = d;
            if (d > ls.relayDelayMax)
                ls.relayDelayMax = d;
        }

        if (droneConnections.count(relayNodeId) > 0)
            bsStatsMap[droneConnections[relayNodeId]].totalRelayBytes += sz;
    }
}

// One-time setup: install PacketSink receivers on all nodes,
// and create raw UDP sockets on all sender nodes.
// Raw sockets (not UdpClient) are used so we can call socket->SendTo()
// directly each tick from SyncUdpApps — no Application lifecycle issues.
void
SetupUdpApplications(NodeContainer droneNodes,
                     NodeContainer baseStationNodes,
                     uint32_t numDrones,
                     uint32_t numBaseStations,
                     Ipv4InterfaceContainer interfaces)
{
    // Build nodeId → IP map
    uint32_t totalNodes = numDrones + numBaseStations;
    for (uint32_t k = 0; k < totalNodes; k++)
    {
        Ptr<Node> node = (k < numDrones) ? droneNodes.Get(k) : baseStationNodes.Get(k - numDrones);
        nodeIpMap[node->GetId()] = interfaces.GetAddress(k);
    }

    // Build nodeId → droneIndex map
    for (uint32_t i = 0; i < numDrones; i++)
        nodeIdToDroneIndex[droneNodes.Get(i)->GetId()] = i;

    // ── RAW RX SOCKETS ─────────────────────────────────────────────────
    for (uint32_t i = 0; i < numDrones; i++)
    {
        uint16_t ulPort = UL_PORT_BASE + static_cast<uint16_t>(i);
        uint16_t dlPort = DL_PORT_BASE + static_cast<uint16_t>(i);
 
        // UPLINK RX: raw socket per BS, bound to ulPort
        for (uint32_t j = 0; j < numBaseStations; j++)
        {
            Ptr<Node> bsNode = baseStationNodes.Get(j);
            uint32_t bsNodeId = bsNode->GetId();

            Ptr<Socket> ulRxSock = Socket::CreateSocket(bsNode, UdpSocketFactory::GetTypeId());
            ulRxSock->Bind(InetSocketAddress(Ipv4Address::GetAny(), ulPort));
            uint64_t ulPacked = (static_cast<uint64_t>(i) << 32) | bsNodeId;
            ulRxSock->SetRecvCallback(MakeBoundCallback(&UlRawRxCallback, ulPacked));
        }

        // DOWNLINK RX: raw socket on drone, bound to dlPort
        {
            Ptr<Socket> dlRxSock =
                Socket::CreateSocket(droneNodes.Get(i), UdpSocketFactory::GetTypeId());
            dlRxSock->Bind(InetSocketAddress(Ipv4Address::GetAny(), dlPort));
            dlRxSock->SetRecvCallback(MakeBoundCallback(&DlRawRxCallback, (uint32_t)i));
        }

        // ── RAW SENDER (TX) SOCKETS ────────────────────────────────────────
        // Explicit non-colliding ports to avoid ephemeral port collisions
        // with the RX sockets bound above on the same node.

        // UL TX socket on drone i — port 8000+i (range 8000–8029)
        {
            Ptr<Socket> sock =
                Socket::CreateSocket(droneNodes.Get(i), UdpSocketFactory::GetTypeId());
            sock->Bind(InetSocketAddress(Ipv4Address::GetAny(), 8000 + i));
            droneUdpApps[i].ulSocket = sock;
            droneUdpApps[i].ulTargetNodeId = UINT32_MAX;
        }

        // Relay TX socket on drone i — port 8500+i (range 8500–8529)
        {
            Ptr<Socket> sock =
                Socket::CreateSocket(droneNodes.Get(i), UdpSocketFactory::GetTypeId());
            sock->Bind(InetSocketAddress(Ipv4Address::GetAny(), 8500 + i));
            droneUdpApps[i].relaySocket = sock;
        }

        // DL TX sockets: one per BS, bound on BS, will SendTo() drone each tick
        for (uint32_t j = 0; j < numBaseStations; j++)
        {
            Ptr<Node> bsNode = baseStationNodes.Get(j);
            uint32_t bsNodeId = bsNode->GetId();
            Ptr<Socket> sock = Socket::CreateSocket(bsNode, UdpSocketFactory::GetTypeId());
            // Explicit port: 7000 + droneIdx*10 + bsIdx to avoid collisions
            sock->Bind(
                InetSocketAddress(Ipv4Address::GetAny(), 7000 + static_cast<uint16_t>(i * 10 + j)));
            uint64_t key = (static_cast<uint64_t>(i) << 32) | bsNodeId;
            bsDlSocketMap[key] = sock;
        }

        linkStatsMap[i]; // Initialize entry
    }
 
    for (uint32_t j = 0; j < numDrones; j++)
    {
        uint16_t relayListenPort = RELAY_PORT_BASE + static_cast<uint16_t>(j);
        Ptr<Node> relayNode = droneNodes.Get(j);
        uint32_t relayNodeId = relayNode->GetId();
        Ptr<Socket> rxSock = Socket::CreateSocket(relayNode, UdpSocketFactory::GetTypeId());
        rxSock->Bind(InetSocketAddress(Ipv4Address::GetAny(), relayListenPort));
        rxSock->SetRecvCallback(MakeBoundCallback(&RelayRawRxCallback, relayNodeId));
    }

    std::cout << "\n╔═══════════════════════════════════════════════════════════╗\n";
    std::cout << "║ UDP PACKET SOCKETS INSTALLED (socket-based sender)        ║\n";
    std::cout << "╠═══════════════════════════════════════════════════════════╣\n";
    std::cout << "║  UL port range  : " << std::setw(5) << UL_PORT_BASE << " – " << std::setw(5)
              << (UL_PORT_BASE + numDrones - 1) << "                     ║\n";
    std::cout << "║  DL port range  : " << std::setw(5) << DL_PORT_BASE << " – " << std::setw(5)
              << (DL_PORT_BASE + numDrones - 1) << "                     ║\n";
    std::cout << "║  Relay port range: " << std::setw(5) << RELAY_PORT_BASE << " – " << std::setw(5)
              << (RELAY_PORT_BASE + numDrones - 1) << "                    ║\n";
    std::cout << "║  UL: " << UPLINK_PACKET_SIZE << " B @ " << (int)UPLINK_TX_RATE
              << " pkt/s   DL: " << DOWNLINK_PACKET_SIZE << " B @ " << (int)DOWNLINK_TX_RATE
              << " pkt/s        ║\n";
    std::cout << "╚═══════════════════════════════════════════════════════════╝\n";
}

// Called every tick: send packets synchronously via raw sockets.
// Sends are immediate (no deferred Schedule) so destination addresses are always
// current and not stale from a handover that happened between schedule and fire.
static void
SyncUdpApps(NodeContainer droneNodes,
            NodeContainer baseStationNodes,
            uint32_t numDrones,
            uint32_t numBaseStations,
            double updateInterval)
{
    double now = Simulator::Now().GetSeconds();
    if (now < 2.0)
        return;
    static std::map<uint32_t, double> relayFirstSeenTime;
    for (uint32_t i = 0; i < numDrones; i++)
    {
        double droneOffset = i * 0.001;
        Simulator::Schedule(Seconds(droneOffset),
                            [droneNodes, baseStationNodes, numDrones, numBaseStations, i]() {
                                uint32_t droneNodeId = droneNodes.Get(i)->GetId();
                                DroneUdpApps& apps = droneUdpApps[i];
                                LinkStats& ls = linkStatsMap[i];
                                uint32_t dronesOnBs = 1;
                                uint32_t maxCap = 10;
                                if (droneConnections.count(droneNodeId) > 0)
                                {
                                    uint32_t bsId = droneConnections[droneNodeId];
                                    dronesOnBs =
                                        std::max(1u,
                                                 (uint32_t)baseStations[bsId].connectedDrones
                                                     .size());
                                    if (baseStations.count(bsId))
                                        maxCap = baseStations[bsId].maxCapacity;
                                }
                                double lf = std::min(
                                    2.0,
                                    static_cast<double>(maxCap) /
                                        static_cast<double>(std::max(1u, dronesOnBs)));
                                uint32_t scaledUlSize =
                                    static_cast<uint32_t>(UPLINK_PACKET_SIZE * lf);
                                uint32_t scaledDlSize =
                                    static_cast<uint32_t>(DOWNLINK_PACKET_SIZE * lf);
                                bool isRelayClient = false;
                                uint32_t relayNodeId = UINT32_MAX;
                                if (droneConnections.count(droneNodeId) > 0)
                                {
                                    uint32_t bsId = droneConnections[droneNodeId];
                                    double rssi = droneSignalMap[droneNodeId][bsId];
                                    if (rssi < RELAY_RSSI_THRESHOLD &&
                                        currentBSRelay.count(bsId) > 0)
                                    {
                                        uint32_t rId = currentBSRelay[bsId];
                                        if (rId != droneNodeId)
                                        {
                                            isRelayClient = true;
                                            relayNodeId = rId;
                                        }
                                    }
                                }
                                bool sentRelay = false;
                                if (isRelayClient && relayNodeId != UINT32_MAX &&
                                    nodeIpMap.count(relayNodeId) > 0)
                                {
                                    uint32_t relayIdx = nodeIdToDroneIndex[relayNodeId];
                                    uint16_t relayPort =
                                        RELAY_PORT_BASE + static_cast<uint16_t>(relayIdx);
                                    Ipv4Address relayIp = nodeIpMap[relayNodeId];
                                    Ptr<Packet> pkt = Create<Packet>(scaledUlSize);
                                    SendTimestampTag tag;
                                    tag.SetSendTime(Simulator::Now().GetSeconds());
                                    pkt->AddPacketTag(tag);
                                    double now = Simulator::Now().GetSeconds();
                                    if (relayFirstSeenTime.find(relayNodeId) ==
                                        relayFirstSeenTime.end())
                                        relayFirstSeenTime[relayNodeId] = now;
                                    if ((now - relayFirstSeenTime[relayNodeId]) >= 1.5)
                                    {
                                        int ret = apps.relaySocket->SendTo(
                                            pkt, 0, InetSocketAddress(relayIp, relayPort));
                                        if (ret < 0)
                                        {
                                            NS_LOG_WARN("UL send blocked (relay), drone " << i);
                                        }
                                        else
                                        {
                                            ls.relayPktTx++;
                                            sentRelay = true;
                                        }
                                    }
                                }
                                if (droneConnections.count(droneNodeId) == 0)
                                    return;
                                uint32_t bsNodeId = droneConnections[droneNodeId];
                                if (!nodeIpMap.count(bsNodeId) || !nodeIpMap.count(droneNodeId))
                                    return;
                                {
                                    uint16_t ulPort = UL_PORT_BASE + static_cast<uint16_t>(i);
                                    Ipv4Address bsIp = nodeIpMap[bsNodeId];
                                    Ptr<Packet> pkt = Create<Packet>(scaledUlSize);
                                    SendTimestampTag tag;
                                    tag.SetSendTime(Simulator::Now().GetSeconds());
                                    pkt->AddPacketTag(tag);
                                    if (!sentRelay)
                                    {
                                        int ret = apps.ulSocket->SendTo(
                                            pkt, 0, InetSocketAddress(bsIp, ulPort));
                                        if (ret < 0)
                                        {
                                            NS_LOG_WARN("UL send blocked (PHY busy?), drone " << i);
                                        }
                                        else
                                        {
                                            ls.ulPktTx++;
                                        }
                                    }
                                }
                                {
                                    uint64_t key =
                                        (static_cast<uint64_t>(i) << 32) | bsNodeId;
                                    if (bsDlSocketMap.count(key) > 0)
                                    {
                                        uint16_t dlPort =
                                            DL_PORT_BASE + static_cast<uint16_t>(i);
                                        Ipv4Address droneIp = nodeIpMap[droneNodeId];
                                        Ptr<Socket> dlSock = bsDlSocketMap[key];
                                        Ptr<Packet> pkt = Create<Packet>(scaledDlSize);
                                        SendTimestampTag tag;
                                        tag.SetSendTime(Simulator::Now().GetSeconds());
                                        pkt->AddPacketTag(tag);
                                        double now = Simulator::Now().GetSeconds();
                                        bool inGrace = false;
                                        if (globalStats.lastHandoverTime.count(i) > 0)
                                        {
                                            if ((now - globalStats.lastHandoverTime[i]) < 1.0)
                                                inGrace = true;
                                        }
                                        if (!inGrace)
                                        {
                                            int ret = dlSock->SendTo(
                                                pkt, 0, InetSocketAddress(droneIp, dlPort));
                                            if (ret > 0)
                                            {
                                                ls.dlPktTx++;
                                            }
                                        }
                                    }
                                }
                            });
    }
}

// Thin scheduler stub: called at t+0.06 each tick
void
SimulatePacketTransmission(NodeContainer droneNodes,
                           NodeContainer baseStationNodes,
                           uint32_t numDrones,
                           uint32_t numBaseStations,
                           double updateInterval)
{
    SyncUdpApps(droneNodes, baseStationNodes, numDrones, numBaseStations, updateInterval);
}

// Throughput sampling (every 1 second)
void
SampleThroughput(NodeContainer droneNodes, uint32_t numDrones)
{
    double currentTime = Simulator::Now().GetSeconds();

    uint32_t connected = 0, relaying = 0;
    for (uint32_t i = 0; i < numDrones; i++)
    {
        uint32_t droneId = droneNodes.Get(i)->GetId();
        if (droneConnections.count(droneId) > 0)
            connected++;
        // Check if drone is a relay client (weak RSSI + relay available)
        if (droneConnections.count(droneId) > 0)
        {
            uint32_t bsId = droneConnections[droneId];
            double rssi = droneSignalMap[droneId][bsId];
            if (rssi < RELAY_RSSI_THRESHOLD && currentBSRelay.count(bsId) > 0 &&
                currentBSRelay[bsId] != droneId)
                relaying++;
        }
    }

    ThroughputSample sample;
    sample.time = currentTime;
    sample.uplinkThroughputKbps = rollingWindow.getULKbps();
    sample.downlinkThroughputKbps = rollingWindow.getDLKbps();
    sample.relayThroughputKbps = rollingWindow.getRelayKbps();
    sample.connectedDrones = connected;
    sample.relayingDrones = relaying;

    // Compute snapshot avg delay across all drones (ms)
    double ulDelaySum = 0.0;
    uint64_t ulRx = 0;
    double dlDelaySum = 0.0;
    uint64_t dlRx = 0;
    for (uint32_t i = 0; i < numDrones; i++)
    {
        const LinkStats& ls = linkStatsMap[i];
        ulDelaySum += ls.ulDelaySum;
        ulRx += ls.ulPktRx;
        dlDelaySum += ls.dlDelaySum;
        dlRx += ls.dlPktRx;
    }
    sample.avgUlDelayMs = ulRx > 0 ? (ulDelaySum / ulRx) * 1000.0 : 0.0;
    sample.avgDlDelayMs = dlRx > 0 ? (dlDelaySum / dlRx) * 1000.0 : 0.0;

    throughputTimeSeries.push_back(sample);
}

// Output throughput data to CSV files
void
OutputThroughputCSV(double simTime,
                    uint32_t numDrones,
                    uint32_t numBaseStations,
                    NodeContainer baseStationNodes)
{
    // 1. Time-series throughput
    {
        std::ofstream f("throughput_timeseries.csv");
        f << "Time(s),UplinkKbps,DownlinkKbps,RelayKbps,TotalKbps,ConnectedDrones,RelayingDrones,"
             "AvgUlDelayMs,AvgDlDelayMs\n";
        for (const auto& s : throughputTimeSeries)
        {
            double total =
                s.uplinkThroughputKbps + s.downlinkThroughputKbps + s.relayThroughputKbps;
            f << std::fixed << std::setprecision(3) << s.time << "," << s.uplinkThroughputKbps
              << "," << s.downlinkThroughputKbps << "," << s.relayThroughputKbps << "," << total
              << "," << s.connectedDrones << "," << s.relayingDrones << "," << s.avgUlDelayMs << ","
              << s.avgDlDelayMs << "\n";
        }
        f.close();
    }

    // 2. Per-drone packet statistics
    {
        std::ofstream f("per_drone_packet_stats.csv");
        f << "DroneID,"
          << "UL_PktTx,UL_PktRx,UL_PktDrop,UL_PDR(%),UL_Bytes,UL_Throughput(Kbps),UL_AvgDelay(ms),"
             "UL_MinDelay(ms),UL_MaxDelay(ms),"
          << "DL_PktTx,DL_PktRx,DL_PktDrop,DL_PDR(%),DL_Bytes,DL_Throughput(Kbps),DL_AvgDelay(ms),"
             "DL_MinDelay(ms),DL_MaxDelay(ms),"
          << "Relay_PktTx,Relay_PktRx,Relay_Bytes,Relay_Throughput(Kbps)\n";

        for (uint32_t i = 0; i < numDrones; i++)
        {
            const LinkStats& ls = linkStatsMap[i];
            double ulPDR = ls.ulPktTx > 0 ? (ls.ulPktRx * 100.0 / ls.ulPktTx) : 0.0;
            double dlPDR = ls.dlPktTx > 0 ? (ls.dlPktRx * 100.0 / ls.dlPktTx) : 0.0;
            double ulKbps = (ls.ulBytes * 8.0 / 1000.0) / simTime;
            double dlKbps = (ls.dlBytes * 8.0 / 1000.0) / simTime;
            double relKbps = (ls.relayBytes * 8.0 / 1000.0) / simTime;
            double ulAvgDly = ls.ulPktRx > 0 ? (ls.ulDelaySum / ls.ulPktRx) * 1000.0 : 0.0;
            double ulMinDly = ls.ulPktRx > 0 ? ls.ulDelayMin * 1000.0 : 0.0;
            double ulMaxDly = ls.ulPktRx > 0 ? ls.ulDelayMax * 1000.0 : 0.0;
            double dlAvgDly = ls.dlPktRx > 0 ? (ls.dlDelaySum / ls.dlPktRx) * 1000.0 : 0.0;
            double dlMinDly = ls.dlPktRx > 0 ? ls.dlDelayMin * 1000.0 : 0.0;
            double dlMaxDly = ls.dlPktRx > 0 ? ls.dlDelayMax * 1000.0 : 0.0;

            f << "Drone-" << (i + 1) << "," << ls.ulPktTx << "," << ls.ulPktRx << ","
              << ls.ulPktDrop << "," << std::fixed << std::setprecision(2) << ulPDR << ","
              << ls.ulBytes << "," << std::setprecision(3) << ulKbps << "," << ulAvgDly << ","
              << ulMinDly << "," << ulMaxDly << "," << ls.dlPktTx << "," << ls.dlPktRx << ","
              << ls.dlPktDrop << "," << std::setprecision(2) << dlPDR << "," << ls.dlBytes << ","
              << std::setprecision(3) << dlKbps << "," << dlAvgDly << "," << dlMinDly << ","
              << dlMaxDly << "," << ls.relayPktTx << "," << ls.relayPktRx << "," << ls.relayBytes
              << "," << relKbps << "\n";
        }
        f.close();
    }

    // 3. Per-BS aggregated throughput
    {
        std::ofstream f("per_bs_throughput.csv");
        f << "BSID,UL_Bytes,DL_Bytes,Relay_Bytes,Total_Bytes,"
          << "UL_Throughput(Kbps),DL_Throughput(Kbps),Relay_Throughput(Kbps),Total_Throughput(Kbps)"
             "\n";

        for (uint32_t j = 0; j < numBaseStations; j++)
        {
            uint32_t bsId = baseStationNodes.Get(j)->GetId();
            BSStats& bs = bsStatsMap[bsId];
            uint64_t total = bs.totalUlBytes + bs.totalDlBytes + bs.totalRelayBytes;
            double ulK = (bs.totalUlBytes * 8.0 / 1000.0) / simTime;
            double dlK = (bs.totalDlBytes * 8.0 / 1000.0) / simTime;
            double relK = (bs.totalRelayBytes * 8.0 / 1000.0) / simTime;
            double totK = (total * 8.0 / 1000.0) / simTime;

            f << "BS-" << (j + 1) << "," << bs.totalUlBytes << "," << bs.totalDlBytes << ","
              << bs.totalRelayBytes << "," << total << "," << std::fixed << std::setprecision(3)
              << ulK << "," << dlK << "," << relK << "," << totK << "\n";
        }
        f.close();
    }

    std::cout << "\n╔═══════════════════════════════════════════════════════════════════════╗\n";
    std::cout << "║ THROUGHPUT DATA FILES GENERATED                                       ║\n";
    std::cout << "╠═══════════════════════════════════════════════════════════════════════╣\n";
    std::cout << "║ 1. throughput_timeseries.csv  - UL/DL/Relay Kbps over time           ║\n";
    std::cout << "║ 2. per_drone_packet_stats.csv - Per-drone UL/DL/Relay stats          ║\n";
    std::cout << "║ 3. per_bs_throughput.csv      - Per-BS aggregated throughput         ║\n";
    std::cout << "╚═══════════════════════════════════════════════════════════════════════╝\n";
}

// Print final throughput summary to console
void
PrintThroughputStats(double simTime, uint32_t numDrones)
{
    uint64_t totalUlBytes = 0, totalDlBytes = 0, totalRelayBytes = 0;
    uint64_t totalUlPktTx = 0, totalUlPktRx = 0, totalUlDrop = 0;
    uint64_t totalDlPktTx = 0, totalDlPktRx = 0, totalDlDrop = 0;

    for (uint32_t i = 0; i < numDrones; i++)
    {
        const LinkStats& ls = linkStatsMap[i];
        totalUlBytes += ls.ulBytes;
        totalDlBytes += ls.dlBytes;
        totalRelayBytes += ls.relayBytes;
        totalUlPktTx += ls.ulPktTx;
        totalUlPktRx += ls.ulPktRx;
        totalUlDrop += ls.ulPktDrop;
        totalDlPktTx += ls.dlPktTx;
        totalDlPktRx += ls.dlPktRx;
        totalDlDrop += ls.dlPktDrop;
    }

    double ulKbps = (totalUlBytes * 8.0 / 1000.0) / simTime;
    double dlKbps = (totalDlBytes * 8.0 / 1000.0) / simTime;
    double relKbps = (totalRelayBytes * 8.0 / 1000.0) / simTime;
    double totalKbps = ulKbps + dlKbps + relKbps;

    double ulPDR = totalUlPktTx > 0 ? (totalUlPktRx * 100.0 / totalUlPktTx) : 0.0;
    double dlPDR = totalDlPktTx > 0 ? (totalDlPktRx * 100.0 / totalDlPktTx) : 0.0;

    // Aggregate delay stats
    double ulDelaySum = 0.0, dlDelaySum = 0.0;
    double ulDelayMin = 1e9, ulDelayMax = 0.0;
    double dlDelayMin = 1e9, dlDelayMax = 0.0;
    for (uint32_t i = 0; i < numDrones; i++)
    {
        const LinkStats& ls = linkStatsMap[i];
        ulDelaySum += ls.ulDelaySum;
        dlDelaySum += ls.dlDelaySum;
        if (ls.ulPktRx > 0)
        {
            ulDelayMin = std::min(ulDelayMin, ls.ulDelayMin);
            ulDelayMax = std::max(ulDelayMax, ls.ulDelayMax);
        }
        if (ls.dlPktRx > 0)
        {
            dlDelayMin = std::min(dlDelayMin, ls.dlDelayMin);
            dlDelayMax = std::max(dlDelayMax, ls.dlDelayMax);
        }
    }
    double ulAvgDelayMs = totalUlPktRx > 0 ? (ulDelaySum / totalUlPktRx) * 1000.0 : 0.0;
    double dlAvgDelayMs = totalDlPktRx > 0 ? (dlDelaySum / totalDlPktRx) * 1000.0 : 0.0;

    std::cout << "\n╔═══════════════════════════════════════════════════════════════════════╗\n";
    std::cout << "║         PACKET TRANSMISSION & THROUGHPUT METRICS                      ║\n";
    std::cout << "╠═══════════════════════════════════════════════════════════════════════╣\n";
    std::cout << "║ UPLINK (Drone → BS)                                                   ║\n";
    std::cout << "║   Packets Generated : " << std::setw(40) << totalUlPktTx << " ║\n";
    std::cout << "║   Packets Received  : " << std::setw(40) << totalUlPktRx << " ║\n";
    std::cout << "║   Packets Dropped   : " << std::setw(40) << totalUlDrop << " ║\n";
    std::cout << "║   PDR               : " << std::setw(36) << std::fixed << std::setprecision(2)
              << ulPDR << "% ║\n";
    std::cout << "║   Avg Throughput    : " << std::setw(32) << std::setprecision(3) << ulKbps
              << " Kbps ║\n";
    std::cout << "║   Avg Delay         : " << std::setw(32) << std::setprecision(3) << ulAvgDelayMs
              << " ms ║\n";
    std::cout << "║   Min/Max Delay     : " << std::setw(15)
              << (ulDelayMin < 1e8 ? ulDelayMin * 1000.0 : 0.0) << " / " << std::setw(11)
              << (ulDelayMax > 0 ? ulDelayMax * 1000.0 : 0.0) << " ms ║\n";
    std::cout << "╠═══════════════════════════════════════════════════════════════════════╣\n";
    std::cout << "║ DOWNLINK (BS → Drone)                                                 ║\n";
    std::cout << "║   Packets Generated : " << std::setw(40) << totalDlPktTx << " ║\n";
    std::cout << "║   Packets Received  : " << std::setw(40) << totalDlPktRx << " ║\n";
    std::cout << "║   Packets Dropped   : " << std::setw(40) << totalDlDrop << " ║\n";
    std::cout << "║   PDR               : " << std::setw(36) << std::setprecision(2) << dlPDR
              << "% ║\n";
    std::cout << "║   Avg Throughput    : " << std::setw(32) << std::setprecision(3) << dlKbps
              << " Kbps ║\n";
    std::cout << "║   Avg Delay         : " << std::setw(32) << std::setprecision(3) << dlAvgDelayMs
              << " ms ║\n";
    std::cout << "║   Min/Max Delay     : " << std::setw(15)
              << (dlDelayMin < 1e8 ? dlDelayMin * 1000.0 : 0.0) << " / " << std::setw(11)
              << (dlDelayMax > 0 ? dlDelayMax * 1000.0 : 0.0) << " ms ║\n";
    std::cout << "╠═══════════════════════════════════════════════════════════════════════╣\n";
    std::cout << "║ RELAY (Drone → Relay → BS)                                            ║\n";
    std::cout << "║   Relay Bytes       : " << std::setw(40) << totalRelayBytes << " ║\n";
    std::cout << "║   Avg Throughput    : " << std::setw(32) << std::setprecision(3) << relKbps
              << " Kbps ║\n";
    std::cout << "╠═══════════════════════════════════════════════════════════════════════╣\n";
    std::cout << "║ AGGREGATE                                                             ║\n";
    std::cout << "║   Total Throughput  : " << std::setw(32) << std::setprecision(3) << totalKbps
              << " Kbps ║\n";
    std::cout << "║   Total Bytes Xfer  : " << std::setw(37)
              << (totalUlBytes + totalDlBytes + totalRelayBytes) << " B ║\n";
    std::cout << "╚═══════════════════════════════════════════════════════════════════════╝\n";
}

int
main(int argc, char* argv[])
{
    double simulationTime = 60.0; // Reduced to 60 seconds for faster simulation
    double updateInterval = 0.5;
    uint32_t numDrones = 30;      // 30 drones - 100% capacity (3 BS x 10 max each)
    uint32_t numBaseStations = 3; // 3 base stations in optimized triangle pattern
    std::string animFile = "fanet-load-based.xml";

    // Open log file for comprehensive result logging
    logFile.open("fanet_simulation_results.log");
    if (!logFile.is_open())
    {
        std::cerr << "Error: Could not open log file!\n";
        return 1;
    }

    // Write log file header
    logFile << "========================================\n";
    logFile << "FANET LOAD-BASED HANDOVER SIMULATION LOG\n";
    logFile << "========================================\n";
    logFile << "Simulation started at: " << std::fixed << Simulator::Now().GetSeconds() << "s\n";
    logFile << "\nConfiguration:\n";
    logFile << "  - Number of Base Stations: " << numBaseStations << "\n";
    logFile << "  - Number of Drones: " << numDrones << "\n";
    logFile << "  - Simulation Time: " << simulationTime << "s\n";
    logFile << "  - Update Interval: " << updateInterval << "s\n";
    logFile << "========================================\n\n";

    CommandLine cmd;
    cmd.AddValue("simTime", "Simulation time", simulationTime);
    cmd.AddValue("updateInterval", "Update interval (seconds)", updateInterval);
    cmd.AddValue("numDrones", "Number of drones (10, 15, 20, 25, 30...)", numDrones);
    cmd.AddValue("minRSSI", "Minimum RSSI threshold", globalThresholds.minRSSI);
    cmd.AddValue("loadThreshold",
                 "Load balancing threshold",
                 globalThresholds.loadBalancingThreshold);
    cmd.Parse(argc, argv);

    std::cout << "\n╔═══════════════════════════════════════════════════════════╗\n";
    std::cout << "║   FANET Load-Based Handover Simulation                    ║\n";
    std::cout << "║   Performance Comparison Study                            ║\n";
    std::cout << "╠═══════════════════════════════════════════════════════════╣\n";
    std::cout << "║ Configuration:                                            ║\n";
    std::cout << "║   • Base Stations:     " << std::setw(28) << numBaseStations << "    ║\n";
    std::cout << "║   • BS Layout:         " << std::setw(28) << "Triangle" << " ║\n";
    std::cout << "║   • Drones:            " << std::setw(28) << numDrones << "    ║\n";
    std::cout << "║   • BS Capacity:       " << std::setw(28) << "10 drones each" << " ║\n";
    std::cout << "║   • Total Capacity:    " << std::setw(28) << (numBaseStations * 10)
              << " drones ║\n";
    std::cout << "║   • Load Ratio:        " << std::setw(28) << std::fixed << std::setprecision(1)
              << ((double)numDrones / (numBaseStations * 10.0) * 100.0) << "% ║\n";
    std::cout << "╠═══════════════════════════════════════════════════════════╣\n";
    std::cout << "║ Network Parameters:                                       ║\n";
    std::cout << "║   • Simulation Time:   " << std::setw(28) << std::setprecision(1)
              << simulationTime << " s ║\n";
    std::cout << "║   • Update Interval:   " << std::setw(28) << std::setprecision(3)
              << updateInterval << " s ║\n";
    std::cout << "║   • Update Frequency:  " << std::setw(28) << std::setprecision(1)
              << (1.0 / updateInterval) << " Hz ║\n";
    std::cout << "║   • BS Coverage:       " << std::setw(28) << std::setprecision(0) << 1150.0
              << " m ║\n";
    std::cout << "║   • Center Overlap:    " << std::setw(28) << "All 3 BSs (~50%)" << " ║\n";
    std::cout << "║   • Full Area:         " << std::setw(28) << "2000m × 2000m" << " ║\n";
    std::cout << "║   • TX Power:          " << std::setw(28) << std::setprecision(1)
              << TX_POWER_DBM << " dBm ║\n";
    std::cout << "╠═══════════════════════════════════════════════════════════╣\n";
    std::cout << "║ To test different loads, run with:                        ║\n";
    std::cout << "║   --numDrones=10  (33% load - baseline)                   ║\n";
    std::cout << "║   --numDrones=15  (50% load)                              ║\n";
    std::cout << "║   --numDrones=20  (67% load)                              ║\n";
    std::cout << "║   --numDrones=25  (83% load)                              ║\n";
    std::cout << "║   --numDrones=30  (100% load - at capacity)               ║\n";
    std::cout << "╚═══════════════════════════════════════════════════════════╝\n";

    NodeContainer droneNodes, baseStationNodes, allNodes;
    droneNodes.Create(numDrones);
    baseStationNodes.Create(numBaseStations);
    allNodes.Add(droneNodes);
    allNodes.Add(baseStationNodes);

    WifiHelper wifi;
    wifi.SetStandard(WIFI_STANDARD_80211ac);
    YansWifiChannelHelper wifiChannel;
    wifiChannel.SetPropagationDelay("ns3::ConstantSpeedPropagationDelayModel");
    wifiChannel.AddPropagationLoss("ns3::FriisPropagationLossModel",
                                   "Frequency",
                                   DoubleValue(5.0e9));
    YansWifiPhyHelper wifiPhy;
    wifiPhy.SetChannel(wifiChannel.Create());
    wifiPhy.Set("TxPowerStart", DoubleValue(TX_POWER_DBM));
    wifiPhy.Set("TxPowerEnd", DoubleValue(TX_POWER_DBM));
    wifiPhy.Set("RxSensitivity", DoubleValue(RX_SENSITIVITY));
    WifiMacHelper wifiMac;
    wifiMac.SetType("ns3::AdhocWifiMac");
    wifi.SetRemoteStationManager("ns3::ConstantRateWifiManager",
                                 "DataMode",
                                 StringValue("VhtMcs7"),
                                 "ControlMode",
                                 StringValue("VhtMcs0"));
    Config::SetDefault("ns3::WifiRemoteStationManager::RtsCtsThreshold", UintegerValue(500));
    NetDeviceContainer devices = wifi.Install(wifiPhy, wifiMac, allNodes);

    InternetStackHelper internet;
    internet.SetRoutingHelper(AodvHelper());
    internet.Install(allNodes);
    Ipv4AddressHelper ipv4;
    ipv4.SetBase("10.1.1.0", "255.255.255.0");
    Ipv4InterfaceContainer interfaces = ipv4.Assign(devices);

    MobilityHelper mobility;
    Ptr<ListPositionAllocator> bsPositionAlloc = CreateObject<ListPositionAllocator>();

    // 3 Base Stations in OPTIMIZED TRIANGLE pattern for full 2000x2000m coverage
    //
    // Configuration:
    // - BS Range: 1150m (ensures all corners are within range)
    // - Layout: Triangle pattern optimized to minimize max distance to any point
    // - BS-1 (South): Covers southern area + both northern corners
    // - BS-2 (NW): Covers western area + southwest corner
    // - BS-3 (NE): Covers eastern area + southeast corner
    //
    // Coverage Analysis:
    // - Center (1000,1000): All 3 BSs overlap (~50% overlap)
    // - All corners: Within 1150m range (verified)
    // - All edges: Well covered
    // - Total area: 2000x2000m fully covered
    // - Inter-BS spacing: ~1128m average (good overlap)
    //
    // Distance to corners from nearest BS:
    // - NW (0,0): 1077m to BS-2 or BS-1
    // - NE (2000,0): 1077m to BS-3 or BS-1
    // - SW (0,2000): 632m to BS-2
    // - SE (2000,2000): 632m to BS-3
    //
    // Note: NW and NE corners have RSSI ~-98 dBm (below -95 threshold)
    //       but are within 1150m distance range, so distance check allows connection

    bsPositionAlloc->Add(Vector(1000.0, 400.0, 30.0));  // BS-1: South-center
    bsPositionAlloc->Add(Vector(450.0, 1400.0, 30.0));  // BS-2: Northwest
    bsPositionAlloc->Add(Vector(1550.0, 1400.0, 30.0)); // BS-3: Northeast

    mobility.SetPositionAllocator(bsPositionAlloc);
    mobility.SetMobilityModel("ns3::ConstantPositionMobilityModel");
    mobility.Install(baseStationNodes);

    for (uint32_t j = 0; j < numBaseStations; j++)
    {
        baseStations[baseStationNodes.Get(j)->GetId()].bsId = baseStationNodes.Get(j)->GetId();
        baseStations[baseStationNodes.Get(j)->GetId()].connectionRange =
            1150.0; // 1150m for full area coverage
        baseStations[baseStationNodes.Get(j)->GetId()].maxCapacity = 10; // Maximum 10 drones per BS
    }

    globalStats.initialize(numDrones, 0.0);

    // Initialize drone connection metrics tracking
    for (uint32_t i = 0; i < numDrones; i++)
    {
        droneConnectionMetrics[i].droneId = i;
    }

    // Print Base Station positioning details
    std::cout << "\n╔═══════════════════════════════════════════════════════════╗\n";
    std::cout << "║ BASE STATION POSITIONING                                  ║\n";
    std::cout << "╠═══════════════════════════════════════════════════════════╣\n";
    for (uint32_t j = 0; j < numBaseStations; j++)
    {
        Vector pos = baseStationNodes.Get(j)->GetObject<MobilityModel>()->GetPosition();
        std::cout << "║ BS-" << (j + 1) << ": (" << std::setw(7) << std::fixed
                  << std::setprecision(1) << pos.x << ", " << std::setw(7) << pos.y << ", "
                  << std::setw(5) << pos.z << ")m  Range: " << std::setw(5)
                  << baseStations[baseStationNodes.Get(j)->GetId()].connectionRange << "m     ║\n";
    }
    std::cout << "╚═══════════════════════════════════════════════════════════╝\n";

    // Verify coverage at key points
    std::cout << "\n╔═══════════════════════════════════════════════════════════╗\n";
    std::cout << "║ COVERAGE VERIFICATION (RSSI at key positions)             ║\n";
    std::cout << "╠═══════════════════════════════════════════════════════════╣\n";
    std::vector<std::pair<std::string, Vector>> testPoints = {
        {"Center (1000, 1000)", Vector(1000, 1000, 100)},
        {"NW Corner (200, 200)", Vector(200, 200, 100)},
        {"NE Corner (1800, 200)", Vector(1800, 200, 100)},
        {"SW Corner (200, 1800)", Vector(200, 1800, 100)},
        {"SE Corner (1800, 1800)", Vector(1800, 1800, 100)}};

    for (const auto& point : testPoints)
    {
        std::cout << "║ " << std::setw(25) << std::left << point.first << ": ";
        int coverageCount = 0;
        double bestRSSI = -999.0;
        for (uint32_t j = 0; j < numBaseStations; j++)
        {
            Vector bsPos = baseStationNodes.Get(j)->GetObject<MobilityModel>()->GetPosition();
            double distance = Distance(point.second, bsPos);
            double rssi = CalculateRSSI(point.second, bsPos, TX_POWER_DBM);
            if (distance <= 1000.0 && rssi >= RX_SENSITIVITY)
            {
                coverageCount++;
                if (rssi > bestRSSI)
                    bestRSSI = rssi;
            }
        }
        std::cout << coverageCount << " BS" << (coverageCount != 1 ? "s" : " ")
                  << ", Best: " << std::setw(5) << std::right << std::fixed << std::setprecision(1)
                  << bestRSSI << "dBm ║\n";
    }
    std::cout << "╚═══════════════════════════════════════════════════════════╝\n";

    mobility.SetMobilityModel("ns3::WaypointMobilityModel");
    mobility.Install(droneNodes);

    // Configure drone trajectories with UNIQUE patterns in 2000x2000m area
    // Designed to create load balancing challenges with convergence zones
    for (uint32_t i = 0; i < numDrones; i++)
    {
        Ptr<WaypointMobilityModel> wpm = droneNodes.Get(i)->GetObject<WaypointMobilityModel>();

        Vector startPos;
        double baseAlt = 80.0 + (i * 8.0); // Altitudes: 80-312m

        // Distribute starting positions across all zones
        double startAngle = (i * 2.0 * M_PI) / numDrones;
        double startRadius = 400.0 + (i % 5) * 100.0;
        double startX = 1000.0 + startRadius * cos(startAngle);
        double startY = 1000.0 + startRadius * sin(startAngle);
        startPos = Vector(startX, startY, baseAlt);

        wpm->AddWaypoint(Waypoint(Seconds(0.0), startPos));

        // TRULY RANDOM MOVEMENT - Covers ENTIRE simulation area
        // No patterns, random waypoints at random time intervals across full 2000x2000m

        // Create random number generator with unique seed for each drone
        Ptr<UniformRandomVariable> randGen = CreateObject<UniformRandomVariable>();
        randGen->SetAttribute("Stream", IntegerValue(i + 1000)); // Unique stream per drone

        // Generate random waypoints throughout simulation
        double currentTime = 5.0; // Start after initial setup

        while (currentTime <= simulationTime)
        {
            // Random time interval between direction changes (3 to 15 seconds)
            double timeInterval = randGen->GetValue(3.0, 15.0);
            currentTime += timeInterval;

            if (currentTime > simulationTime)
                break;

            // Generate completely random position across ENTIRE simulation area
            // Full area boundaries: 0 to 2000 in both X and Y
            double x = randGen->GetValue(0.0, 2000.0);
            double y = randGen->GetValue(0.0, 2000.0);

            // Random altitude variation around base altitude
            double z = baseAlt + randGen->GetValue(-30.0, 50.0);

            // Clamp altitude between 50m and 200m for realistic drone operation
            z = std::max(50.0, std::min(200.0, z));

            // Add waypoint with random position covering full area
            wpm->AddWaypoint(Waypoint(Seconds(currentTime), Vector(x, y, z)));
        }
    }

    AnimationInterface anim(animFile);

    // Configure Base Stations with distinct colors (9 BS)
    std::vector<std::tuple<uint8_t, uint8_t, uint8_t>> bsColors = {
        {0, 255, 0},   // BS-1: Green
        {255, 165, 0}, // BS-2: Orange
        {148, 0, 211}, // BS-3: Purple
        {255, 0, 0},   // BS-4: Red
        {0, 191, 255}, // BS-5: Deep Sky Blue
        {255, 255, 0}, // BS-6: Yellow
        {255, 0, 255}, // BS-7: Magenta
        {0, 255, 255}, // BS-8: Cyan
        {255, 128, 0}  // BS-9: Dark Orange
    };

    for (uint32_t i = 0; i < numBaseStations; i++)
    {
        uint32_t bsId = baseStationNodes.Get(i)->GetId();
        anim.UpdateNodeColor(bsId,
                             std::get<0>(bsColors[i]),
                             std::get<1>(bsColors[i]),
                             std::get<2>(bsColors[i]));
        anim.UpdateNodeSize(bsId, 30, 30);
        anim.UpdateNodeDescription(bsId, "BS-" + std::to_string(i + 1));
    }

    // Configure Drones
    for (uint32_t i = 0; i < numDrones; i++)
    {
        uint32_t droneId = droneNodes.Get(i)->GetId();
        anim.UpdateNodeColor(droneId, 128, 128, 128);
        anim.UpdateNodeSize(droneId, 20, 20);
        anim.UpdateNodeDescription(droneId, "Drone-" + std::to_string(i + 1));
    }

    // ── UDP (1/4): Install all sinks and senders ──────────────────────────
    // Must be after all mobility setup so AODV can discover routes.
    SetupUdpApplications(droneNodes, baseStationNodes, numDrones, numBaseStations, interfaces);
    // ─────────────────────────────────────────────────────────────────────

    // Schedule periodic updates at 0.1 second intervals (10 Hz real-world rate)
    for (double t = 0; t < simulationTime; t += updateInterval)
    {
        Simulator::Schedule(
            Seconds(t),
            [droneNodes, baseStationNodes, numDrones, numBaseStations]() {
                UpdateRSSIMeasurements(droneNodes, baseStationNodes, numDrones, numBaseStations);
            });
        Simulator::Schedule(
            Seconds(t + 0.01),
            [droneNodes, baseStationNodes, numDrones, numBaseStations]() {
                BroadcastBaseStationLoad(droneNodes, baseStationNodes, numDrones, numBaseStations);
            });
        Simulator::Schedule(
            Seconds(t + 0.02),
            [droneNodes, baseStationNodes, numDrones, numBaseStations, updateInterval]() {
                UpdateDroneConnectionsLoadBased(droneNodes,
                                                baseStationNodes,
                                                numDrones,
                                                numBaseStations,
                                                updateInterval);
            });
        Simulator::Schedule(Seconds(t + 0.03),
                            [&anim, droneNodes, baseStationNodes, numDrones, numBaseStations]() {
                                PrintConnectionStatus(droneNodes,
                                                      baseStationNodes,
                                                      numDrones,
                                                      numBaseStations,
                                                      anim);
                            });
        // Relay selection and cooperative offloading
        Simulator::Schedule(
            Seconds(t + 0.04),
            [droneNodes, baseStationNodes, numDrones, numBaseStations]() {
                SelectClusterRelays(droneNodes, baseStationNodes, numDrones, numBaseStations);
            });
        Simulator::Schedule(Seconds(t + 0.05),
                            [droneNodes, baseStationNodes, numDrones, numBaseStations]() {
                                PerformCooperativeOffloading(droneNodes,
                                                             baseStationNodes,
                                                             numDrones,
                                                             numBaseStations);
                            });

        // ── UDP (2/4): Sync senders to current connection state ───────────
        // Scheduled at t+0.06 — after relay/offload decisions at t+0.04/0.05,
        // so SyncUdpApps sees the final relay state for this tick.
        Simulator::Schedule(
            Seconds(t + 0.06),
            [droneNodes, baseStationNodes, numDrones, numBaseStations, updateInterval]() {
                SimulatePacketTransmission(droneNodes,
                                           baseStationNodes,
                                           numDrones,
                                           numBaseStations,
                                           updateInterval);
            });

        // ── UDP (3/4): Sample throughput once per simulated second ────────
        if (std::fmod(t, 1.0) < updateInterval)
        {
            Simulator::Schedule(Seconds(t + 0.07), [droneNodes, numDrones]() {
                SampleThroughput(droneNodes, numDrones);
            });
        }
        // ─────────────────────────────────────────────────────────────────
    }

    Simulator::Stop(Seconds(simulationTime));
    Simulator::Run();

    // Finalize all connection tracking (close any open connections)
    for (uint32_t i = 0; i < numDrones; i++)
    {
        droneConnectionMetrics[i].endConnection(simulationTime);
    }

    globalStats.printFinalStats(simulationTime, numDrones);
    PrintRelayFinalStats();

    // ── UDP (4/4): Compute final drop counters and print stats ───────────
    // Drop counters must be computed here, after all in-flight packets have
    // been delivered or dropped, to get accurate PDR.
    for (uint32_t i = 0; i < numDrones; i++)
    {
        LinkStats& ls = linkStatsMap[i];
        ls.ulPktDrop = (ls.ulPktTx > ls.ulPktRx) ? ls.ulPktTx - ls.ulPktRx : 0;
        ls.dlPktDrop = (ls.dlPktTx > ls.dlPktRx) ? ls.dlPktTx - ls.dlPktRx : 0;
    }
    PrintThroughputStats(simulationTime, numDrones);
    OutputThroughputCSV(simulationTime, numDrones, numBaseStations, baseStationNodes);
    // ─────────────────────────────────────────────────────────────────────

    // Output connection time data to CSV files for plotting
    OutputConnectionTimeData(numDrones, numBaseStations, baseStationNodes);

    Simulator::Destroy();

    // Close log file
    if (logFile.is_open())
    {
        logFile.close();
    }

    std::cout << "\n╔═══════════════════════════════════════════════════════════╗\n";
    std::cout << "║ Simulation Completed Successfully!                        ║\n";
    std::cout << "║ Animation file: " << std::setw(40) << std::left << animFile << " ║\n";
    std::cout << "║ Log file: " << std::setw(47) << "fanet_simulation_results.log" << " ║\n";
    std::cout << "╚═══════════════════════════════════════════════════════════╝\n";

    return 0;
}
