import axios from 'axios';
require('dotenv').config();

export const uploadToIPFS = async (document) => {
    try {
        // Log the API key to ensure it's being loaded correctly
        console.log('API Key:', process.env.NFT_STORAGE_API_KEY);

        // Log the document being sent to ensure it's correct
        // console.log('Document:', document);

        const response = await axios.post(
            'https://api.nft.storage/upload',
            document,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.NFT_STORAGE_API_KEY}`,
                    'Content-Type': 'text/plain', 
                },
            }
        );

        // Log the entire response for debugging purposes
        console.log('Response:', response);

        if (response.status !== 200) {
            console.error('IPFS upload failed:', response.data);
            throw new Error('Failed to upload document to IPFS');
        }

        return response.data.value.cid;
    } catch (error) {
        // Log the error details for further investigation
        console.error('IPFS upload error:', error.response ? error.response.data : error.message);
        throw new Error('Failed to upload document to IPFS');
    }
};