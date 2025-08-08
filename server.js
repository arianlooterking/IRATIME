import express from 'express';
import register from './api/auth/register.js';
import checkIn from './api/events/check-in.js';
import checkOut from './api/events/check-out.js';
import breakStart from './api/events/break-start.js';
import breakEnd from './api/events/break-end.js';
import routerWebhook from './api/router/webhook.js';

const app = express();
app.use(express.json());
app.use(express.static('web'));

// Auth
app.post('/api/auth/register', register);

// Event routes
app.post('/api/events/check-in', checkIn);
app.post('/api/events/check-out', checkOut);
app.post('/api/events/break-start', breakStart);
app.post('/api/events/break-end', breakEnd);

// Router webhook
app.post('/api/router/webhook', routerWebhook);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

export default app;

