# Blockchain Based Incident Reporting System
## Overview
This project is a web-based decentralized application (DApp) designed for reliable and transparent urban incident reporting. It leverages blockchain technology and decentralized storage to ensure data integrity, security, and trust.
Citizens can report incidents by submitting details such as description, location, timestamp, and image evidence. The system follows a hybrid storage model, combining blockchain and IPFS.
## Key Features
- Incident Reporting
  - Users can report incidents with detailed information and media evidence.
- Blockchain Integration
  - Stores critical data (incident ID, timestamp, hash) on the blockchain to ensure immutability.
- IPFS Storage
  - Media files (images) are stored on IPFS using content-based addressing.
- Interactive Map
  - Displays incidents with markers:
    - Yellow → Unverified
    - Green → Verified
- Verification System
  - Incidents can be verified to improve reliability and prevent false reporting.
- Chatbot Assistance
  - Provides real-time guidance to users during incident reporting.
  - Answers FAQs and improves user experience.
## System Architecture
The system follows a hybrid architecture:
- Frontend
  - User interface for reporting and viewing incidents.
- Backend
  - Handles request processing and communication between components.
- Blockchain Layer (Ethereum)
  - Stores metadata and ensures transparency.
- IPFS
  - Stores large media files and returns a unique content hash (CID).
- Chatbot Module
  - Assists users and enhances usability.
## Workflow
1. User submits an incident through the web interface
2. Media file is uploaded to IPFS → returns CID
3. Essential data + CID is stored on blockchain
4. Incident is displayed on the map
5. Verification process updates incident status
## Technologies Used
- Frontend: HTML, CSS, JavaScript
- Backend: PHP
- Database: MySQL
- Blockchain: Ethereum
- Storage: IPFS (via Pinata or similar services)
- Tools: GitHub, MetaMask
## Advantages
- Ensures data integrity and transparency
- Prevents tampering of incident records
- Decentralized storage reduces single point of failure
- Improves trust in public reporting systems
## Limitations
- Blockchain transactions may involve cost (gas fees)
- System is currently a prototype/demo and not fully deployed
- Requires internet connectivity and basic user awareness
## Future Enhancements
- Integration with Layer 2 solutions to reduce cost
- Mobile application support
- Government/authority integration
- Real-time alert notifications
## Project Status
This project is developed as a prototype for academic purposes and demonstrates the feasibility of using blockchain and decentralized storage for incident reporting.
## Contributors
- Siona Kurisinkal Biju, Susen Ann George, Treesa Maria Cinil, Niya Sony
