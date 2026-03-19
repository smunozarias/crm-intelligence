/**
 * Local API server for development
 * Runs the Vercel serverless functions locally
 */
import 'dotenv/config';
import express from 'express';
import geminiHandler from './gemini.js';

const app = express();
app.use(express.json({ limit: '10mb' }));

// Wrap Vercel handler for Express
app.post('/api/gemini', (req, res) => {
  geminiHandler(req, res);
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Local API server running on http://localhost:${PORT}`);
  console.log(`   POST /api/gemini → Gemini AI analysis`);
});
