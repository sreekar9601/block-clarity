import axios from 'axios';

const ETHERSCAN_API_KEY = '23UNT6J6GGKR52BESPA5YC2UD3KY9HMHH2'; // Replace with your Etherscan API key

export default async function handler(req, res) {
  const { address } = req.query;
  if (!address) {
    return res.status(400).json({ error: 'Address is required' });
  }

  try {
    const response = await axios.get(
      `https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${address}&apikey=${ETHERSCAN_API_KEY}`
    );
    const contractData = response.data.result[0];
    res.status(200).json(contractData);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching contract data' });
  }
}
