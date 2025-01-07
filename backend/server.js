require('dotenv').config();

const express = require('express');
const multer = require('multer');
const AWS = require('aws-sdk');
const cors = require('cors');

const app = express();
app.use(cors()); // Enable CORS for frontend-backend communication
const upload = multer(); // For handling file uploads in memory

// AWS SDK Configuration
AWS.config.update({ region : process.env.AWS_REGION || 'us-east-1' }); // Update to your AWS region
const textract = new AWS.Textract();

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
  
      // Call AWS Textract
      const result = await textract.analyzeDocument(params).promise();
      
      // Log the full response for debugging
      console.log('AWS Textract Response:', JSON.stringify(result, null, 2));
  
      // Send the result back to the frontend
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Error analyzing image:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });
  

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
