const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');

const app = express();
const port = 3001;

// Allow requests from the Vite frontend
app.use(cors({
  origin: 'http://localhost:3000'
}));

// Configure multer to store uploaded files in memory
const upload = multer({ storage: multer.memoryStorage() });

app.get('/', (req, res) => {
  res.json({ status: 'Custom Document Parser API is running properly' });
});

app.post('/api/parse', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No document file uploaded' });
    }

    const { buffer, mimetype, originalname } = req.file;
    let extractedText = '';

    console.log(`Parsing file: ${originalname} (${mimetype})`);

    if (mimetype === 'application/pdf') {
      const parser = new PDFParse({ data: buffer });
      const data = await parser.getText();
      extractedText = data.text;
    } else if (
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
      originalname.endsWith('.docx')
    ) {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    } else if (mimetype === 'text/plain' || originalname.endsWith('.txt')) {
      extractedText = buffer.toString('utf-8');
    } else {
      return res.status(400).json({ error: 'Unsupported file format. Please upload PDF, DOCX, or TXT.' });
    }

    res.json({ text: extractedText });
  } catch (error) {
    console.error('Error parsing document:', error);
    res.status(500).json({ error: 'Failed to parse document' });
  }
});

app.listen(port, () => {
  console.log(`Custom Document Parser API running at http://localhost:${port}`);
});
