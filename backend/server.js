require('dotenv').config();

const express = require('express');
const multer = require('multer');
const AWS = require('aws-sdk');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors()); // Enable CORS for frontend-backend communication
const upload = multer(); // For handling file uploads in memory

AWS.config.update({ region: process.env.AWS_REGION || 'us-east-1' }); // Update to your AWS region
const textract = new AWS.Textract();

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
        const textractResult = await textract.analyzeDocument(params).promise();
        const extractedText = extractTextFromTextract(textractResult);
        console.log('Extracted Text:', extractedText);
        const gptPrompt = `
        Extract relevant nutritional information and ingredient insights from the following text:
        ${extractedText}

        Scoring Metric:
        - Assign a health score from 0 to 100.
        - +10 points for low sugar (≤5g per serving).
        - -10 points for high sodium (>150mg per serving).
        - +10 points for high dietary fiber (>3g per serving).

        Analysis Tasks:
        1. Provide a health score (0-100).
        2. Highlight positive aspects (e.g., low sugar, high fiber).
        3. Highlight negative aspects (e.g., high sodium, high saturated fat).
        4. Suggest healthier alternatives if applicable.
        `;

        const gptResponse = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: 'You are a helpful assistant that provides nutritional analysis.' },
                    { role: 'user', content: gptPrompt }
                ],
                max_tokens: 500,
                temperature: 0,
                top_p:1,
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
        res.json({ success: true, analysis: gptData });
    } catch (error) {
        console.error('Error analyzing image or calling GPT:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
