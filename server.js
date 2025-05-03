import express from 'express';
import cors from 'cors';
import { OpenAI } from 'openai';
import admin from 'firebase-admin';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Configuración de Firebase Admin
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Configuración de OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Middleware
app.use(cors());
app.use(express.json());

// Endpoint para generar preguntas
app.post('/api/generate-questions', async (req, res) => {
  try {
    const { category } = req.body;
    
    const prompt = `Genera 5 preguntas de trivia sobre ${category}. Cada pregunta debe tener 4 opciones y solo una debe ser correcta. El formato debe ser JSON con la siguiente estructura:
    [
      {
        "question": "pregunta",
        "options": [
          {"text": "opción 1", "isCorrect": true/false},
          {"text": "opción 2", "isCorrect": true/false},
          {"text": "opción 3", "isCorrect": true/false},
          {"text": "opción 4", "isCorrect": true/false}
        ]
      }
    ]`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
    });

    const questions = JSON.parse(response.choices[0].message.content);
    res.json(questions);
  } catch (error) {
    console.error('Error al generar preguntas:', error);
    res.status(500).json({ error: 'Error al generar preguntas' });
  }
});

// Endpoint para guardar resultados
app.post('/api/save-results', async (req, res) => {
  try {
    const { category, questions, score } = req.body;
    
    await db.collection('triviaResults').add({
      category,
      questions,
      score,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error al guardar resultados:', error);
    res.status(500).json({ error: 'Error al guardar resultados' });
  }
});

// Endpoint para obtener historial de resultados
app.get('/api/results', async (req, res) => {
  try {
    const snapshot = await db.collection('triviaResults')
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get();

    const results = [];
    snapshot.forEach(doc => {
      results.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json(results);
  } catch (error) {
    console.error('Error al obtener resultados:', error);
    res.status(500).json({ error: 'Error al obtener resultados' });
  }
});

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ message: 'API de Trivia funcionando' });
});

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
}); 