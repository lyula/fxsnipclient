
# Journalyze

> **A modern, full-stack journaling and social platform for traders and communities.**


## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Setup Instructions](#setup-instructions)
- [API Documentation](#api-documentation)
- [User Guide](#user-guide)
- [Technical Architecture](#technical-architecture)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

**Journalyze** is a full-stack web application designed for journaling, social interaction, and payment-enabled features, tailored for trading communities. It provides a Progressive Web App (PWA) experience, real-time messaging, notifications, and a robust API for extensibility.
 
 **Backend GitHub Repository:** [https://github.com/lyula/fxsnipserver.git](https://github.com/lyula/fxsnipserver.git)
 **Frontend Deployment:** [https://fxsnip.vercel.app](https://fxsnip.vercel.app)
 
---

<!-- Features -->
- **Journaling:** Create, edit, and manage personal trading journals.
- **Social Feed:** Post, like, comment, and reply on community posts.
- **User Profiles:** View and follow other users, see public posts and stats.
- **Real-time Messaging:** Chat with other users via Socket.IO.
- **Notifications:** Receive real-time notifications for likes, comments, follows, and payments.
- **Payments:** Badge and journal payment flows with support for mobile money (e.g., M-Pesa/PayHero).
- **PWA Support:** Installable, offline-capable, and desktop-friendly.
- **Admin Features:** Manage pricing, badge payments, and user roles.

---

## Setup Instructions

### Prerequisites
- Node.js (v18+ recommended)
- pnpm (or npm/yarn)
- MongoDB (local or cloud)
- Cloudinary account for media uploads

### 1. Clone the Repository
```sh
git clone https://github.com/lyula/fxsnipclient.git
cd forex-journal
```

### 2. Environment Variables
Create `.env` files in both `server/` and `client/` directories. Example for `server/.env`:
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/journalyze
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLIENT_URL=http://localhost:5173
```

### 3. Install Dependencies
```sh
cd server && pnpm install
cd ../client && pnpm install
```

### 4. Start the Development Servers
**Backend:**
```sh
cd server
pnpm dev
```
**Frontend:**
```sh
cd client
pnpm dev
```
The client will run on [http://localhost:5173](http://localhost:5173) and the server on [http://localhost:5000](http://localhost:5000).

---

## API Documentation

### Authentication
- `POST /api/auth/register` — Register a new user
- `POST /api/auth/login` — Login and receive JWT
- `GET /api/auth/me` — Get current user info (auth required)

### User
- `GET /api/user/profile` — Get own profile
- `PUT /api/user/profile` — Update profile
- `POST /api/user/follow/:userId` — Follow a user
- `POST /api/user/unfollow/:userId` — Unfollow a user
- `GET /api/user/search?query=...` — Search users

### Posts
- `POST /api/posts` — Create a post
- `GET /api/posts` — Get all posts (paginated)
- `GET /api/posts/:postId` — Get a single post
- `PUT /api/posts/:postId` — Edit a post
- `DELETE /api/posts/:postId` — Delete a post
- `POST /api/posts/:postId/like` — Like a post
- `POST /api/posts/:postId/comments` — Add comment
- `POST /api/posts/:postId/comments/:commentId/like` — Like a comment
- `POST /api/posts/:postId/comments/:commentId/replies` — Add reply
- `POST /api/posts/:postId/comments/:commentId/replies/:replyId/like` — Like a reply
- `POST /api/posts/:id/view` — Increment post views
- `GET /api/posts/user/:username` — Get posts by username
- `GET /api/posts/by-userid/:userId` — Get posts by user ID
- `GET /api/posts/following` — Get posts from followed users
- `GET /api/posts/search?query=...` — Search posts

### Journal
- `POST /api/journal` — Create journal entry
- `GET /api/journal` — Get journal entries
- `PUT /api/journal/:id` — Update journal entry
- `DELETE /api/journal/:id` — Delete journal entry

### Messaging
- `POST /api/message` — Send a message
- `GET /api/message` — Get all conversations
- `GET /api/message/:userId` — Get conversation with a user
- `GET /api/message/unread-count` — Get unread conversation count

### Notifications
- `GET /api/user/notifications` — Get notifications
- `POST /api/user/notifications/read` — Mark all as read

### Payments & Pricing
- `POST /api/badge-payments` — Create badge payment
- `GET /api/badge-payments/latest` — Get latest badge payment
- `GET /api/badge-payments/my` — Get all badge payments for user
- `GET /api/badge-payments/all` — Get all badge payments (admin)
- `GET /api/badge-pricing` — Get badge pricing
- `PUT /api/badge-pricing` — Update badge pricing (admin)
- `POST /api/journal-payments` — Create journal payment
- `GET /api/journal-payments/latest` — Get latest journal payment
- `GET /api/journal-payments` — Get all journal payments for user
- `GET /api/journal-payments/status` — Poll payment status
- `GET /api/journal-pricing` — Get journal pricing
- `PUT /api/journal-pricing` — Update journal pricing (admin)

---

## User Guide

### Getting Started
1. **Register** for an account or log in.
2. **Set up your profile** with a username, bio, and profile image.
3. **Create journal entries** to track your trades or thoughts.
4. **Post to the community feed** to share insights or ask questions.
5. **Interact** with posts: like, comment, reply, and follow users.
6. **Upgrade** with badge or journal payments for premium features.
7. **Access your dashboard** for notifications, payments, and messaging.

### PWA Features
- Install Journalyze on desktop or mobile for a native-like experience.
- Works offline and supports push notifications.

### Payments
- Pay for badges or journal access using supported payment methods (e.g., M-Pesa).
- View payment history and manage subscriptions in your dashboard.

### Messaging
- Chat with other users in real time.
- Receive notifications for new messages and replies.

---

## Technical Architecture

### Frontend
- **Framework:** React (Vite, Tailwind CSS, PWA support)
- **State Management:** React Context, hooks
- **Routing:** React Router
- **PWA:** VitePWA plugin, service workers, offline support
- **API Integration:** RESTful calls via fetch/axios

### Backend
- **Framework:** Node.js, Express.js
- **Database:** MongoDB (Mongoose ODM)
- **Authentication:** JWT-based
- **Real-time:** Socket.IO for messaging and online status
- **Media:** Cloudinary for image/video uploads
- **Payments:** Integration with PayHero/M-Pesa for badge/journal payments
- **Scheduling:** node-cron for periodic tasks (e.g., badge expiry, FX rate updates)

### Key Modules
- **User:** Registration, login, profile, follow/unfollow
- **Posts:** CRUD, likes, comments, replies, views, search
- **Journal:** CRUD for journal entries
- **Messaging:** Conversations, unread counts, real-time updates
- **Notifications:** Real-time and persistent notifications
- **Payments:** Badge and journal payment flows, pricing management
- **Admin:** Pricing and payment management endpoints

### Folder Structure
- `client/` — React frontend (src/components, src/pages, src/context, src/utils, etc.)
- `server/` — Express backend (routes, controllers, models, sockets, middleware, utils)

---

## Contributing
Pull requests are welcome! Please open an issue first to discuss major changes.

---

## License
Copyright © 2025 Sacred "Zack" Baraka Lyula.

All rights reserved. This project and its source code are protected by copyright law. No part of this project may be used, copied, modified, distributed, or reproduced in any form without the express written permission of the author.

Unauthorized use is strictly prohibited.
