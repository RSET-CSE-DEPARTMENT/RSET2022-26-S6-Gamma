// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract IncidentReporting {

    uint256 public incidentCount = 0;

    struct Incident {
        uint256 id;
        string lat;
        string lon;
        string ipfsHash;   
        uint256 timestamp;
        bool verified;   
    }

    mapping(uint256 => Incident) public incidents;

    event IncidentReported(
        uint256 id,
        string lat,
        string lon,
        string ipfsHash,
        uint256 timestamp
    );

    event IncidentVerified(
        uint256 id,
        uint256 timestamp
    );

    // 🔹 Report Incident
    function reportIncident(
        string memory _lat,
        string memory _lon,
        string memory _ipfsHash
    ) public {

        incidentCount++;

        incidents[incidentCount] = Incident(
            incidentCount,
            _lat,
            _lon,
            _ipfsHash,
            block.timestamp,
            false   // ✅ default unverified
        );

        emit IncidentReported(
            incidentCount,
            _lat,
            _lon,
            _ipfsHash,
            block.timestamp
        );
    }

    // 🔹 Verify Incident (Creates NEW blockchain transaction)
    function verifyIncident(uint256 _id) public {

        require(_id > 0 && _id <= incidentCount, "Invalid incident ID");
        require(!incidents[_id].verified, "Already verified");

        incidents[_id].verified = true;

        emit IncidentVerified(_id, block.timestamp);
    }

    // 🔹 Get Incident (NOW RETURNS VERIFIED STATUS)
    function getIncident(uint256 _id)
        public
        view
        returns (
            uint256,
            string memory,
            string memory,
            string memory,
            uint256,
            bool
        )
    {
        Incident memory incident = incidents[_id];

        return (
            incident.id,
            incident.lat,
            incident.lon,
            incident.ipfsHash,
            incident.timestamp,
            incident.verified   
        );
    }
}
