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

        const gptPrompt = `
        Analyze the following text for nutritional information or ingredient insights:
        ${extractedText}

        Scoring Metric:
        - Assign a health score from 0 to 100.
        - +10 points for low sugar (≤5g per serving).
        - -10 points for high sodium (>150mg per serving).
        - +10 points for high dietary fiber (>3g per serving).
        - -10 points for high saturated fat (>1g per serving).
        - +10 points if the product uses only natural ingredients (no artificial additives).
        - -10 points if the ingredients include high-fructose corn syrup, trans fats, or excessive preservatives.

        If only ingredients are provided:
        - Identify potential harmful ingredients and their impact.
        - Highlight positive aspects like natural or organic ingredients.
        - Provide a health score (0-100) based on the above rules.

        Analysis Tasks:
        1. Provide a health score (0-100).
        2. Highlight positive aspects (e.g., low sugar, high fiber, natural ingredients).
        3. Highlight negative aspects (e.g., high sodium, trans fats, artificial additives).
        4. Suggest healthier alternatives if applicable.
        `;

        const gptResponse = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: 'You are a precise and consistent assistant that performs nutritional and ingredient analysis with detailed, unbiased scoring.' },
                    { role: 'user', content: gptPrompt }
                ],
                max_tokens: 700,
                temperature: 0.2,
                top_p: 1,
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

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
