const { Cencori } = require("cencori");

const getCencoriClient = () => {
  const apiKey = process.env.CENCORI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing CENCORI_API_KEY in server environment.");
  }
  return new Cencori({ apiKey });
};

module.exports = { getCencoriClient };
