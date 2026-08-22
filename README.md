<img width="1885" height="907" alt="image" src="https://github.com/user-attachments/assets/2aefd75c-dff9-49a5-bf08-ee124e7de9db" />
# OpenSource Copilot

<p align="center">
  <strong>AI-powered intelligence for open-source contribution</strong>
</p>

<p align="center">
  Understand repositories. Find the right issues. Discover relevant code. Build with confidence.
</p>

<p align="center">
  <a href="https://github.com/Alishaa-987/OpenSource-Copilot">
    <img src="https://img.shields.io/badge/GitHub-OpenSource--Copilot-black?logo=github" alt="GitHub">
  </a>
  <img src="https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/NestJS-E0234E?logo=nestjs" alt="NestJS">
  <img src="https://img.shields.io/badge/Next.js-black?logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/PostgreSQL-316192?logo=postgresql" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Kafka-231F20?logo=apachekafka" alt="Kafka">
  <img src="https://img.shields.io/badge/Qdrant-Vector%20Database-red" alt="Qdrant">
  <img src="https://img.shields.io/badge/License-See%20Repository-lightgrey" alt="License">
</p>

---

#                                                                             OpenSource Copilot

> **AI-powered intelligence for understanding open-source repositories and helping developers make their first meaningful contribution.**

OpenSource Copilot is an AI-powered developer platform designed to reduce the complexity of contributing to unfamiliar open-source repositories.

It connects with GitHub, imports repository context, analyzes issues, identifies relevant code, retrieves repository-specific knowledge, and provides structured contributor guidance.

The goal is simple:

> **Turn repository complexity into actionable context so developers can understand what to work on, where to work, and how to start.**

---


## Overview

Contributing to an unfamiliar open-source repository is often difficult because of the amount of context a developer needs to understand before writing code.

A contributor may need to:

- Understand the repository architecture
- Explore thousands of files
- Find relevant issues
- Understand what an issue actually means
- Identify the code responsible for a problem
- Find related issues or pull requests
- Determine where a change should be made
- Understand the expected implementation approach
- Validate whether enough context has been gathered before starting development

OpenSource Copilot is built to reduce this onboarding friction.

Instead of acting as a generic AI chatbot, it focuses on the repository as the primary source of context.

---

## Problem

The traditional open-source contribution workflow often looks like this:

```text
Discover Repository
        |
        v
Read README
        |
        v
Explore Repository Structure
        |
        v
Search Issues
        |
        v
Read Issue Discussions
        |
        v
Search the Codebase
        |
        v
Guess Relevant Files
        |
        v
Understand Architecture
        |
        v
Search Similar Issues / PRs
        |
        v
Plan Implementation
        |
        v
Start Coding
```

For experienced maintainers this process may be familiar, but for a new contributor it can be overwhelming.

OpenSource Copilot aims to shorten this path.

---

## Solution

OpenSource Copilot transforms repository information into structured contributor intelligence.

```text 
GitHub Repository
       |
       v
Repository Import
       |
       +------------------+
       |                  |
       v                  v
Repository Data        Issues
       |                  |
       +--------+---------+
                |
                v
       Repository Intelligence
                |
        +-------+-------+
        |       |       |
        v       v       v
      Code    Issue   Retrieval
     Mapping Analysis   Context
        |       |       |
        +-------+-------+
                |
                v
       Contributor Intelligence
                |
        +-------+-------+-------+
        |       |       |       |
        v       v       v       v
    Relevant Root  Workflow Recommendations
      Files      Cause
                |
                v
       Confident Contribution
```
       

## Key Features

## GitHub Integration

Connect OpenSource Copilot with GitHub to work directly with real repositories.

Features include:

- GitHub OAuth authentication
- Repository discovery
- Public repository import
- Authenticated repository import
- Repository metadata retrieval
- README and document retrieval
- GitHub issue retrieval
- Issue labels and metadata
- Secure server-side sessions
  
## AI-Powered Issue Intelligence

OpenSource Copilot doesn't simply display GitHub issues.

- It analyzes issues in the context of the repository.
- Given an issue, the system can help answer:
- What is this issue actually asking?
- Which part of the repository is involved?
- Which files are likely relevant?
- What could be causing the problem?
- How should I approach the implementation?
- This turns an issue from a piece of text into an actionable engineering problem.

## Issue-to-Code Mapping

One of the core capabilities of OpenSource Copilot is connecting an issue to the codebase.
```
GitHub Issue
     │
     ▼
Issue Understanding
     │
     ▼
Repository Context
     │
     ▼
Relevant Code Candidates
     │
     ▼
Confidence Scoring
     │
     ▼
Relevant Files
```

Instead of searching an entire repository manually, contributors receive a focused starting point.

## Root Cause Analysis

OpenSource Copilot goes beyond summarizing issue descriptions.

It uses repository context to reason about the area of the codebase related to the issue and provide an explainable analysis of the likely cause.

The objective is to help developers move from:

"What is wrong?"

to:
```
"Why is it happening?"
        ↓
"Where is it happening?"
        ↓
"What should I investigate?"
        ↓
"What should I change?"
```
## Implementation Guidance

Once the relevant code has been identified, OpenSource Copilot can provide a structured implementation approach.

The guidance focuses on helping contributors understand:

- What to inspect first
- Which files are involved
- What parts of the architecture matter
- What type of change may be required
- What should be considered before implementation

The developer remains in control of the implementation.
---

## AI + RAG
Repository-Aware Artificial Intelligence

The core idea behind OpenSource Copilot is simple:

AI should understand the repository before giving repository-specific guidance.

Generic AI assistants can provide useful programming answers, but they often lack the context of a specific codebase.

OpenSource Copilot addresses this using Retrieval-Augmented Generation (RAG).

## How RAG Works

Repository content is processed and transformed into searchable knowledge.
```
Repository Files & Documents
            │
            ▼
      Document Processing
            │
            ▼
          Chunking
            │
            ▼
        Embeddings
            │
            ▼
     Qdrant Vector Database
            │
            ▼
   Semantic Repository Search
            │
            ▼
     Relevant Context
            │
            ▼
       AI Orchestration
            │
            ▼
     Grounded AI Response
```
When a developer asks a question, OpenSource Copilot retrieves the most relevant repository context before generating the answer.

This allows the AI to reason using information from the actual project.

## Why RAG?

Without repository context:
```
Developer Question
        ↓
Generic AI Knowledge
        ↓
Generic Answer
```
With OpenSource Copilot:
```
Developer Question
        ↓
Repository Retrieval
        ↓
Relevant Files / Documents / Issues
        ↓
Repository Context
        ↓
AI Reasoning
        ↓
Repository-Grounded Answer
```

This makes the system more useful for repository-specific questions.

## Repository Isolation

Retrieval is scoped to the repository being accessed.

This means information from unrelated repositories should not be mixed into the context used for a response.
``` 
User
 │
 ▼
Repository Access Check
 │
 ▼
Repository-Scoped Retrieval
 │
 ▼
Relevant Repository Context
 │
 ▼
AI Response
```

## AI Safety

Repository content is treated as untrusted data.

OpenSource Copilot separates:

- System instructions
- User questions
- Retrieved repository content

This helps prevent repository-controlled content from being treated as privileged AI instructions.

The system also includes:

- Context validation
- Repository access checks
- Insufficient-context handling
- Source deduplication
- Provider failure handling
- Contributor Intelligence

## Contributor Intelligence

OpenSource Copilot is designed around the contributor journey.

## First Contribution Recommendations

Finding a suitable first issue can be difficult.

OpenSource Copilot can provide deterministic recommendations based on available repository and issue context.

The goal is to help contributors find realistic starting points instead of randomly selecting an issue.

## Similar Issues

Related issues can provide valuable historical context.

OpenSource Copilot can identify similar issues within the same repository to help contributors understand:

- Whether a similar problem has appeared before
- How the repository has discussed similar problems
- What areas of the codebase were involved
- What previous context may be useful
 ## Pull Request Context

Where authorized pull-request data is available, OpenSource Copilot can use related PR context to provide additional insight into how similar problems were approached.

Access is permission-aware and fails closed when an authorized PR source is unavailable.

User Journey
```
A typical OpenSource Copilot workflow looks like:

1. Sign in with GitHub
        ↓
2. Select or import a repository
        ↓
3. Open repository issues
        ↓
4. Select an issue
        ↓
5. Open Issue Intelligence
        ↓
6. Understand the issue
        ↓
7. Explore relevant files
        ↓
8. Review root-cause analysis
        ↓
9. Review implementation guidance
        ↓
10. Explore similar context
        ↓
11. Start contributing
```
The experience is designed to reduce the amount of manual repository exploration required before a developer can begin meaningful work.

## Architecture

OpenSource Copilot uses a modular, service-oriented backend architecture.

                         ┌─────────────────────┐
                         │      Next.js        │
                         │      Web App        │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │      Gateway        │
                         └──────────┬──────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
              ▼                     ▼                     ▼
     ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
     │ Repository      │   │ Guidance        │   │ Knowledge       │
     │ Service         │   │ Service         │   │ Service         │
     │                 │   │                 │   │                 │
     │ GitHub          │   │ Contributor     │   │ AI + RAG        │
     │ Integration     │   │ Intelligence    │   │ Retrieval       │
     └────────┬────────┘   └────────┬────────┘   └────────┬────────┘
              │                     │                     │
              ▼                     ▼                     ▼
       ┌─────────────┐       ┌─────────────┐       ┌─────────────┐
       │ PostgreSQL  │       │ PostgreSQL  │       │   Qdrant    │
       │             │       │             │       │             │
       │ Repository  │       │ Guidance    │       │ Vector Data │
       │ Data        │       │ Data        │       │             │
       └─────────────┘       └─────────────┘       └─────────────┘
              │
              ├──────────────────────┐
              ▼                      ▼
         ┌───────────┐         ┌───────────┐
         │   Redis   │         │   Kafka   │
         │ Sessions  │         │  Events   │
         └───────────┘         └─────┬─────┘
                                     │
                                     ▼
                              Knowledge Service
## Services

## Gateway

The central backend entry point responsible for routing, shared infrastructure, health checks, and backend application coordination.

Repository Service

Responsible for:

- GitHub integration
- OAuth
- Repository management
- Repository import
- Issues
- Repository documents
- Repository access
##  Guidance Service

Responsible for:

- Issue Intelligence
- Issue-to-code mapping
- Root cause analysis
- Contribution workflows
- Contributor recommendations
- Similar issue context
- Similar PR context
## Knowledge Service

Responsible for:

- Repository knowledge ingestion
- Document chunking
- Embeddings
- Qdrant vector storage
- Semantic retrieval
- AI orchestration
- Grounded responses
 ## Event-Driven Processing

OpenSource Copilot uses Apache Kafka for asynchronous communication between backend services.

For example:
```
Repository Import
       │
       ▼
Repository Service
       │
       ▼
RepositoryImported Event
       │
       ▼
      Kafka
       │
       ▼
Knowledge Service
       │
       ▼
Repository Knowledge Processing
```
This allows repository processing to remain decoupled from the service responsible for managing repository data.

## Data Layer

OpenSource Copilot uses separate data ownership boundaries for different backend services.

## Repository Service

Owns repository-related data such as:

- Users
- GitHub installations
- Repositories
- Repository access
- Repository documents
- Issues
- Issue labels
## Guidance Service

Owns contributor intelligence data such as:

- Recommendations
- Issue intelligence
## Knowledge Service

Uses Qdrant for vector-based repository knowledge and semantic retrieval.

Services communicate through APIs and events rather than directly accessing another service's database.

## Technology Stack

| Category         | Technologies                     |
| ---------------- | -------------------------------- |
| Frontend         | Next.js, React, TypeScript       |
| Backend          | NestJS, TypeScript               |
| Monorepo         | Nx                               |
| Database         | PostgreSQL                       |
| ORM              | Prisma                           |
| Cache / Sessions | Redis                            |
| Messaging        | Apache Kafka, KafkaJS            |
| Vector Database  | Qdrant                           |
| AI               | OpenAI-compatible providers      |
| Embeddings       | Configurable embedding providers |
| GitHub           | GitHub REST API, GitHub OAuth    |
| Validation       | Zod                              |
| Logging          | Pino                             |
| Infrastructure   | Docker, Docker Compose           |


## Project Structure
```
OpenSource-Copilot/
│
├── apps/
│   ├── web/
│   │   └── Next.js frontend
│   │
│   ├── gateway/
│   │   └── API gateway
│   │
│   ├── repository-service/
│   │   └── GitHub & repository intelligence
│   │
│   ├── guidance-service/
│   │   └── Contributor intelligence
│   │
│   └── knowledge-service/
│       └── AI & RAG
│
├── libs/
│   ├── contracts/
│   ├── config/
│   ├── observability/
│   ├── shared/
│   ├── database/
│   ├── kafka/
│   └── github/
│
├── docker-compose.yml
├── nx.json
├── package.json
├── tsconfig.json
└── README.md
```
## Getting Started

## Prerequisites

Make sure you have the following installed:

- Node.js
- npm
- Git
- Docker Desktop

You will also need credentials/configuration for the services used by the application, including GitHub OAuth and the configured AI, embedding, and Qdrant providers.

## Clone the Repository
```
git clone https://github.com/Alishaa-987/OpenSource-Copilot.git
cd OpenSource-Copilot
```
## Install Dependencies
```
npm install
```
## Configure Environment Variables

Create your local environment file:
```
cp .env.example .env
```
Configure the required values for:

- PostgreSQL
- Redis
- Kafka
- GitHub OAuth
- Qdrant
- AI provider
- Embedding provider
- Service configuration

Never commit real API keys, OAuth secrets, or other credentials.

## Run Local Infrastructure

The project provides Docker Compose configuration for local infrastructure.
```
docker compose up -d
```
This starts the required infrastructure services, including:

- PostgreSQL
- Redis
- Apache Kafka

Qdrant and external AI/embedding providers can be configured according to the environment being used.

## Run the Services

Start the backend services using Nx:
```
npx nx serve gateway
```
```
npx nx serve repository-service
```
```
npx nx serve guidance-service
```
```
npx nx serve knowledge-service
```
Start the frontend:
```
npx nx serve web
```
## Development

Run type checking:
```
npx nx run-many --target=typecheck
```
Run tests:
```
npx nx run-many --target=test
```
Build services:
```
npx nx run-many --target=build
```
Infrastructure-dependent tests may require:
```
RUN_INTEGRATION=1
```
with PostgreSQL, Redis, and Kafka running locally.

## Roadmap

OpenSource Copilot is actively evolving.

Planned improvements include:

- Repository architecture visualization
- GitHub webhook integration
- Background repository synchronization
- Deeper code understanding
- Branch-aware repository indexing
- Advanced code-aware retrieval
- Retrieval reranking
- Improved issue-to-code reasoning
- Pull request intelligence
- Personalized contributor recommendations
- Contribution difficulty estimation
- Interactive contributor onboarding
- Advanced AI orchestration
- Additional AI and embedding providers
- Production observability and distributed tracing
- Vision

Open-source projects contain an enormous amount of knowledge, but that knowledge is often difficult for new contributors to discover.
```
OpenSource Copilot aims to make that knowledge accessible.

Repository Complexity
        ↓
Repository Understanding
        ↓
Issue Understanding
        ↓
Code Understanding
        ↓
AI-Powered Guidance
        ↓
Confident Contribution
```
The long-term vision is to make contributing to unfamiliar open-source projects feel less like navigating an unknown codebase and more like having an experienced contributor guide you through it.

## Contributing

Contributions are welcome.

If you would like to contribute:

- Fork the repository.
- Create a feature branch.
- Make your changes.
- Add relevant tests.
- Verify the affected services.
- Open a pull request with a clear description of your changes.

Please preserve the existing service boundaries and repository access controls when contributing to the backend.

## License

This project is licensed under the terms specified in the repository's license.
