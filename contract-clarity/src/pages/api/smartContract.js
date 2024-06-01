import { uploadToIPFS } from './utils/ipfs';
import { requestIndexing } from './utils/indexing';

export default async function handler(req, res) {
    if (req.method === 'POST') {
        try {
            const { contractCode } = req.body;

            if (!contractCode) {
                res.status(400).json({ error: 'Contract code is required' });
                return;
            }


            // Step 1: Upload to IPFS
            const cid = await uploadToIPFS(contractCode);

            // Step 2: Request Indexing
            const receipt = await requestIndexing(cid);

            res.status(200).json({ success: true, cid, receipt });
        } catch (error) {
            console.error('Failed to upload and index the contract code:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
