import { useState } from 'react';
import axios from 'axios';
import ConnectWalletButton from '../components/ConnectWalletButton';
import { ethers } from 'ethers';
import abi from '../abis/ChatGpt.json'; // Ensure this ABI matches the deployed contract

const chatGptAddress = "0xf69475444b076207d2f69d60e67c1f255104b453";

function getChatId(receipt, contract) {
    let chatId = null;
    for (const log of receipt.logs) {
        try {
            const parsedLog = contract.interface.parseLog(log);
            if (parsedLog && parsedLog.name === "ChatCreated") {
                chatId = parsedLog.args.chatId.toNumber(); // Use toNumber() for BigNumber
                break; // Break out of the loop once chatId is found
            }
        } catch (error) {
            console.log("Could not parse log:", log);
        }
    }
    return chatId;
}

export default function Home() {
    const [address, setAddress] = useState('');
    const [network, setNetwork] = useState('sepolia'); // Default to Sepolia
    const [contractCode, setContractCode] = useState('');
    const [error, setError] = useState('');
    const [prompt, setPrompt] = useState('');
    const [response, setResponse] = useState('');
    const [provider, setProvider] = useState(null);
    const [chatId, setChatId] = useState(null);

    const handleSearch = async () => {
        try {
            const res = await axios.get(`/api/contract`, {
                params: { address, network },
            });
            setContractCode(res.data.SourceCode);
            setError('');
        } catch (err) {
            setError('Failed to fetch contract data');
            setContractCode('');
        }
    };

    const handleUploadAndIndex = async () => {
        try {
            const res = await axios.post('/api/smartContract', { contractCode });
            setResponse(`Document uploaded to IPFS with CID: ${res.data.cid}. Indexing response: ${res.data.receipt}`);
            setError('');
        } catch (err) {
            setError('Failed to upload and index the contract code');
            console.error(err);
        }
    };

    const handleSendPrompt = async () => {
        if (!address || !prompt) {
            setError('Please enter a contract address and prompt');
            return;
        }

        if (!provider) {
            setError('Please connect your wallet first');
            return;
        }

        try {
            const signer = provider.getSigner();
            const chatGptContract = new ethers.Contract(chatGptAddress, abi, signer);
            const tx = await chatGptContract.startChat(prompt);
            console.log('Transaction:', tx);

            const receipt = await tx.wait();
            console.log('Receipt:', receipt);

            const chatId = getChatId(receipt, chatGptContract);
            console.log(`Created chat ID: ${chatId}`);

            if (chatId === null) {
                setError('Failed to get chat ID from the transaction receipt');
                return;
            }

            setChatId(chatId);
            setResponse(`Chat started with ID: ${chatId}. Waiting for response...`);

            // Fetch the message history after the transaction is complete
            const messages = await chatGptContract.getMessageHistoryContents(chatId);
            setResponse(messages.join('\n')); // Display messages

        } catch (err) {
            setError('Failed to send prompt to contract');
            console.error(err);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
            <h1 className="text-4xl font-bold mb-8">Contract Clarity</h1>
            <div className="w-full max-w-md">
                <ConnectWalletButton setProvider={setProvider} />
                <select
                    className="w-full p-2 border border-gray-300 rounded mb-4"
                    value={network}
                    onChange={(e) => setNetwork(e.target.value)}
                >
                    <option value="sepolia">Ethereum Sepolia</option>
                    <option value="goerli">Ethereum Goerli</option>
                    <option value="galadriel">Galadriel Devnet</option>
                </select>
                <input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded mb-4"
                    placeholder="Enter smart contract address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                />
                <input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded mb-4"
                    placeholder="Enter your prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                />
                <button
                    onClick={handleSearch}
                    className="w-full bg-blue-500 text-white p-2 rounded"
                >
                    Search
                </button>
                <button
                    onClick={handleUploadAndIndex}
                    className="w-full bg-orange-500 text-white p-2 rounded mt-4"
                >
                    Upload & Index
                </button>
                <button
                    onClick={handleSendPrompt}
                    className="w-full bg-green-500 text-white p-2 rounded mt-4"
                >
                    Send Prompt
                </button>
            </div>
            {error && <p className="text-red-500 mt-4">{error}</p>}
            {contractCode && (
                <pre className="mt-4 bg-white p-4 border border-gray-300 rounded w-full max-w-3xl overflow-auto">
                    {contractCode}
                </pre>
            )}
            {response && (
                <pre className="mt-4 bg-white p-4 border border-gray-300 rounded w-full max-w-3xl overflow-auto">
                    {response}
                </pre>
            )}
        </div>
    );
}
