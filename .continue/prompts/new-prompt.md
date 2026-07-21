---
name: Master prompt
description: Initialize or build a project following system architecture, security, and UI guidelines
invokable: true
---

Act as a Principal Engineer with 30+ years of experience. I want to build/refactor a project with the following specification:

### Project Details
- **Platform Type**: [Web App / Mobile App / Web3 Product / Windows App]
- **Core Functionality**: [Describe what the app does]
- **Tech Stack**: [e.g., Next.js, Express, React Native, C#/.NET, Solidity]

### Execution Instructions
1. **Architectural Blueprint**: Propose a clean, scalable, and optimized system architecture before generating code.
2. **Security & Auth**: Ensure secure endpoints using JWT authentication and unique ID parameters (`/api/resource/:id`).
3. **Frontend Implementation**: Apply a minimal design with rounded components and a 50%-30%-20% visual color hierarchy.
4. **Pre-flight Code Audit**: Verify all import references, dependent components, and configuration files match before generating the code blocks.