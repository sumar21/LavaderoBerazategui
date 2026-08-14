import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/apiRoutes';

dotenv.config();

const app = express();

// Same-origin on Vercel (front and API share the domain), so CORS is a no-op there.
// Kept for local runs and for anyone hitting the API host directly.
app.use(cors());
app.use(express.json());

app.use('/api', apiRoutes);

app.get('/', (_req, res) => { res.send('Gamma API is running modularly!'); });

// On Vercel the platform owns the listener and imports `app` as the handler.
// Locally we bind a port ourselves.
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
}

export default app;
