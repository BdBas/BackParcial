import express from 'express';
import cors from 'cors';
import { OpenAI } from 'openai';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Configuración de MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Conectado a MongoDB'))
  .catch(err => console.error('Error conectando a MongoDB:', err));

// Modelo para los resultados de trivia
const triviaResultSchema = new mongoose.Schema({
  category: String,
  questions: [{
    question: String,
    options: [{
      text: String,
      isCorrect: Boolean
    }]
  }],
  score: Number,
  timestamp: { type: Date, default: Date.now }
});

const TriviaResult = mongoose.model('TriviaResult', triviaResultSchema);

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
    
    const triviaResult = new TriviaResult({
      category,
      questions,
      score
    });

    await triviaResult.save();
    res.json({ success: true });
  } catch (error) {
    console.error('Error al guardar resultados:', error);
    res.status(500).json({ error: 'Error al guardar resultados' });
  }
});

// Endpoint para obtener historial de resultados
app.get('/api/results', async (req, res) => {
  try {
    const results = await TriviaResult.find()
      .sort({ timestamp: -1 })
      .limit(10);

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