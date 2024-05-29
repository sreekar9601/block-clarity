import axios from 'axios';

const ETHERSCAN_API_KEY = '23UNT6J6GGKR52BESPA5YC2UD3KY9HMHH2'; 

export default async function handler(req, res) {
  const { address, network } = req.query;
  if (!address || !network) {
    return res.status(400).json({ error: 'Address and network are required' });
  }

  try {
    let response;
    if (network === 'sepolia') {
      response = await axios.get(
        `https://api-sepolia.etherscan.io/api?module=contract&action=getsourcecode&address=${address}&apikey=${ETHERSCAN_API_KEY}`
      );
    } else if (network === 'goerli') {
      response = await axios.get(
        `https://api-goerli.etherscan.io/api?module=contract&action=getsourcecode&address=${address}&apikey=${ETHERSCAN_API_KEY}`
      );
    } else if (network === 'galadriel') {
      response = await axios.get(
        `https://explorer.galadriel.com/api?module=contract&action=getsourcecode&address=${address}`
      );
    }

    const contractData = response.data.result[0];
    res.status(200).json(contractData);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching contract data' });
  }
}
