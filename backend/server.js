require('dotenv').config();

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const axios = require('axios');
const { TextractClient, AnalyzeDocumentCommand } = require('@aws-sdk/client-textract');
const app = express();
app.use(cors()); // Enable CORS for frontend-backend communication
const upload = multer(); // For handling file uploads in memory

// AWS.config.update({ region: process.env.AWS_REGION || 'us-east-1' }); // Update to your AWS region
const textractClient = new TextractClient({ region: 'us-west-1' });

const apiKey = process.env.OPENAI_API_KEY;

function extractTextFromTextract(textractResponse) {
    const blocks = textractResponse.Blocks || [];
    let rawText = '';

    blocks.forEach((block) => {
        if (block.BlockType === 'LINE') {
            rawText += block.Text + '\n';
        }
    });

    return rawText;
}

// Route to process uploaded images
app.post('/analyze-label', upload.single('image'), async (req, res) => {
    try {
        const fileBuffer = req.file.buffer;

        const params = {
            Document: {
                Bytes: fileBuffer,
            },
            FeatureTypes: ['TABLES', 'FORMS'],
        };

        // Use AWS SDK v3 to analyze the document
        const command = new AnalyzeDocumentCommand(params);
        const textractResult = await textractClient.send(command);

        // Extract text from the Textract result
        const extractedText = extractTextFromTextract(textractResult);
        console.log('Extracted Text:', extractedText);
        const gptPrompt = (extractedText) => `
        Analyze the following text for nutritional information or ingredient insights:
        ${extractedText}

        Scoring Guidelines:
        - Provide the health score in EXACTLY this format: "Health Score: X" (where X is a number from 0-100, with no suffix)
        - Base score starts at 60, then adjust according to:
        +10: Low sugar (≤5g per serving)
        -10: High sodium (>150mg per serving)
        +10: High fiber (>3g per serving)
        -10: High saturated fat (>1g per serving)
        +10: Natural ingredients only
        -10: Contains HFCS/trans fats/excessive preservatives

        Required Format:
        1. Health Score: [number]
        2. Positive Aspects:
        - [bullet points starting with dash]
        3. Negative Aspects:
        - [bullet points starting with dash]
        4. Healthier Alternatives:
        - [bullet points starting with dash]

        Rules:
        - Always start with "1. Health Score: " followed by just the number
        - Use bullet points with dashes (-) for all lists
        - Keep responses focused and concise
        - Organize information in exactly these sections
        `;

        const gptResponse = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', 
                      content: 'You are a nutrition analyst. Always format health scores as plain numbers without suffixes or ranges.' },
                    { role: 'user', content: gptPrompt(extractedText) }
                ],
                max_tokens: 700,
                temperature: 0.1,
                presence_penalty:-0.1,
                frequency_penalty: 0.1,
            },
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        const gptData = gptResponse.data.choices[0].message.content.trim();
        console.log('GPT-3.5 Turbo Response:', gptData);
        res.status(200).json({ success: true, analysis: gptData });
    } catch (error) {
        console.error('Error analyzing image or calling GPT:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
    }
});

const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'https://nutri-vision-kappa.vercel.app';

app.use(cors({
    origin: [
        CORS_ORIGIN,
        'https://nutri-vision-kappa.vercel.app',
        'http://localhost:3000'
      ],
    methods: ['GET', 'POST'],
    credentials: false
  }));
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
