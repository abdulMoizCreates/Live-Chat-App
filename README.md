# Live Chat App

Next.js (frontend) + Express + Socket.IO (backend) + MongoDB.

## Run it

You need Node 18+ and MongoDB running locally (or an Atlas URL).

Backend:

    cd server
    npm install
    npm run dev

Frontend (new terminal):

    cd client
    npm install
    npm run dev

Open http://localhost:3000 in two browser tabs, use different names, and chat.

## Config

server/.env
- PORT
- MONGO_URI  (put your Atlas link here if you don't have local Mongo)
- CLIENT_URL (frontend url, needed for CORS)

client/.env.local
- NEXT_PUBLIC_SERVER_URL (backend url)

## What it does

- realtime messages over websockets
- rooms (general, random, tech)
- last 50 messages saved in MongoDB and loaded on join
- online users list
- typing indicator
- auto reconnect

## Deploying

Frontend on Vercel, backend on Render/Railway (Vercel can't keep websockets open).
Set CLIENT_URL on the backend to your Vercel url, and NEXT_PUBLIC_SERVER_URL on the frontend to your backend url.
