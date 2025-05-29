// src/websocketServer.ts
import WebSocket, { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

// const wss = new WebSocket.Server({ port: 8080 });

console.log('WebSocket server running on ws://localhost:8080');

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.send(JSON.stringify({ title: 'Welcome!', message: 'You are connected.' }));
  ws.on('close', () => console.log('Client disconnected'));
});

// Simulate push notifications every 10 seconds
setInterval(() => {
  const payload = {
    title: 'New Notification',
    message: `This is a push at ${new Date().toLocaleTimeString()}`,
  };

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(payload));
    }
  });
}, 10000);

export default wss;
