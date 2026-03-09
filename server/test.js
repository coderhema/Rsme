const fs = require('fs');
const pdfParse = require('pdf-parse');

async function test() {
  const buffer = fs.readFileSync('../Tolulope_Olugbemi_Resume.pdf');
  try {
    const parser = new pdfParse.PDFParse({ data: buffer });
    const textResult = await parser.getText();
    console.log("Text length:", textResult.text.length);
  } catch (e) {
    console.error(e);
  }
}
test();
