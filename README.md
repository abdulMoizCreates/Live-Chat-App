# Live Chat — one-to-one realtime chat

Next.js (frontend) + Express + Socket.IO (backend) + MongoDB. Registered users log in, see who else is on the app, and chat 1-to-1 in real time with delivery/read receipts, presence and typing indicators. Built as a university assignment — the starting version had room-based chat with username-only join; this one is fully account-based.

## Features

- JWT auth: register / login / protected chat page / logout
- user listing + live search box
- 1-to-1 realtime messaging over Socket.IO
- online / offline presence with "last seen"
- typing indicators ("typing..."), auto-stop after a short pause
- message history saved in MongoDB, paginated ("Load older messages")
- delivery and read receipts: one tick = sent, two = delivered, blue two = read
- WhatsApp-style layout: sidebar (search, chats, unread badges, online dots) + chat window
- responsive: on mobile either the list or the chat is shown, with a back button
- error handling: wrong password, duplicate username, server down banner with auto-retry, socket auto-reconnect with state refresh

## Tech stack

| Side    | Used |
|---------|------|
| frontend | Next.js 14 (app router), React 18, plain CSS, socket.io-client |
| backend  | Node.js, Express 4, Socket.IO 4, Mongoose 8 (MongoDB) |
| auth     | JWT (`jsonwebtoken`), bcrypt password hashing |

## Run it

You need Node 18+ and MongoDB running locally (or an Atlas URI).

```bash
# backend
cd server
npm install
npm run seed    # optional: creates ali / sara / bilal (password: secret1)
npm run dev

# frontend (new terminal)
cd client
npm install
npm run dev
```

Open http://localhost:3000 in two browsers (e.g. normal + incognito), register two users, and chat. The chat page redirects to /login until you are logged in.

## Folder structure

```
client/
  app/                # pages: / (chat, protected), /login, /register
  components/         # AuthForm, Sidebar, ChatItem, ChatWindow, MessageBubble
  lib/                # api.js, auth.js (localStorage), socket.js, format.js
server/
  index.js            # express + socket.io wiring
  seed.js             # creates 3 demo users (npm run seed)
  models/             # User, Conversation, Message
  routes/             # auth, users, conversations, messages
  middleware/         # auth (REST JWT), socketAuth
  sockets/            # all Socket.IO event handlers
```

## Config / env variables

**server/.env** (copy from `server/.env.example`)

| Var         | Meaning                                        |
|-------------|------------------------------------------------|
| PORT        | backend port (default 5000)                    |
| MONGO_URI   | MongoDB connection string                      |
| CLIENT_URL  | frontend origin, allowed by CORS + Socket.IO   |
| JWT_SECRET  | any long random string, required, signs tokens |

**client/.env.local** (copy from `client/.env.example`)

| Var                    | Meaning         |
|------------------------|-----------------|
| NEXT_PUBLIC_SERVER_URL | backend base url |

## REST API

All endpoints but the auth ones require the header `Authorization: Bearer <token>`.

| Method | Path                  | Body / Query          | Returns |
|--------|-----------------------|-----------------------|---------|
| POST   | `/api/auth/register`  | `{username, password}`| `409` if taken `{token, user}` |
| POST   | `/api/auth/login`     | `{username, password}`| `401` if wrong `{token, user}` |
| GET    | `/api/auth/me`        | –                     | `{user}` |
| GET    | `/api/users`          | `?search=<username>`  | all users except me: `[{_id, username, isOnline, lastSeen, ...}]` |
| GET    | `/api/conversations`  | –                     | my chats, newest first: `[{_id, participants, lastMessage, unreadCount, updatedAt}]` |
| GET    | `/api/messages/:userId`| `?page=&limit=` (1/30)| `{messages[], page, hasMore}` |

## Socket.IO events

Connect only with a valid JWT: `io(URL, { auth: { token } })` — otherwise the socket is rejected with `unauthorized`. Every user joins a personal room named by their user id; messages/plays are delivered to partner + sender rooms.

| Direction | Event | Payload | Purpose |
|-----------|-------|---------|---------|
| client → server | `send_message` | `{ to, text }` | save + deliver to the receiver's room; status becomes `delivered` if they are online |
| client → server | `typing` / `stop_typing` | `{ to }` | partner shows "typing..." / clears it |
| client → server | `mark_read` | `{ from }` | mark that user's messages in our conversation as `read` |
| server → client | `new_message` | message `{_id, conversation, sender, text, status, createdAt, ...}` | sent to both rooms (sender copy lets other tabs sync ticks) |
| server → client | `messages_read` | `{ conversation, by, messageIds }` | sender turns ticks blue |
| server → client | `typing` / `stop_typing` | `{ from, username }` / `{ from }` | show / clear the indicator |
| server → client | `presence` | `{ userId, username, isOnline, lastSeen? }` | presence change for anyone; `isOnline: false` + `lastSeen` on disconnect of the last tab |

## Status flow of a message

`sent` → `delivered` (receiver online at send time) → `read` (receiver opens the chat, or reads it while the chat is open). Unread counts in `/api/conversations` are messages from the partner with status ≠ read.

## Deploying

Frontend on Vercel, backend on Render/Railway (Vercel can't keep websockets open). Set `CLIENT_URL` on the backend to your Vercel URL, and `NEXT_PUBLIC_SERVER_URL` on the frontend to your backend URL. Generate a strong `JWT_SECRET`.
