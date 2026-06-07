# Code Wiki - Lamma Chat (شات لمة)

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Architecture Overview](#2-architecture-overview)
3. [Technology Stack](#3-technology-stack)
4. [Project Structure](#4-project-structure)
5. [Core Modules & Components](#5-core-modules--components)
6. [State Management & Data Flow](#6-state-management--data-flow)
7. [Key Classes & Functions](#7-key-classes--functions)
8. [Dependencies](#8-dependencies)
9. [Running the Project](#9-running-the-project)
10. [Environment Configuration](#10-environment-configuration)

---

## 1. Project Overview

**Lamma Chat (شات لمة)** is a comprehensive Arabic chat application featuring:
- Real-time chat rooms with multiple themes
- User authentication (email/password, Google OAuth, guest login)
- PWA (Progressive Web App) support with offline capabilities
- VIP/Subscription system with role-based access
- Audio/Video call capabilities
- Radio and music streaming
- Gift system with animated effects
- Admin panel with moderation tools
- Ban/mute/kick functionality
- Custom themes and branding

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        LAMMA CHAT APP                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  LoginScreen │  │  ChatScreen │  │      PWA Components      │ │
│  │  (Auth)      │  │  (Main UI)  │  │  (Service Worker, etc.)  │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                         CORE LIBRARIES                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ supabase │ │ storage  │ │  themes  │ │   chat   │          │
│  │  (auth   │ │(local    │ │(theming) │ │helpers   │          │
│  │  + db)   │ │ storage) │ │          │ │          │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
├─────────────────────────────────────────────────────────────────┤
│                     EXTERNAL SERVICES                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐    │
│  │  Supabase    │  │   Gemini     │  │   Google OAuth       │    │
│  │ (Auth + DB)  │  │  (Search AI) │  │  (Authentication)    │    │
│  └──────────────┘  └──────────────┘  └──────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```