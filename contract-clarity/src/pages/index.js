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

async function getNewMessages(contract, chatId, currentMessagesCount) {
    try {
        const messages = await contract.getMessageHistoryContents(chatId);
        const roles = await contract.getMessageHistoryRoles(chatId);

        console.log('Fetched messages:', messages);
        console.log('Fetched roles:', roles);

        const newMessages = [];
        messages.forEach((message, i) => {
            if (i >= currentMessagesCount) {
                newMessages.push({
                    role: roles[i],
                    content: messages[i]
                });
            }
        });
        return newMessages;
    } catch (error) {
        console.error('Error fetching new messages:', error);
        throw error;
    }
}

const chunkString = (str, size) => {
    const numChunks = Math.ceil(str.length / size);
    const chunks = new Array(numChunks);

    for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
        chunks[i] = str.substr(o, size);
    }

    return chunks;
};

export default function Home() {
    const [address, setAddress] = useState('');
    const [network, setNetwork] = useState('sepolia'); // Default to Sepolia
    const [contractCode, setContractCode] = useState('');
    const [error, setError] = useState('');
    const [response, setResponse] = useState([]);
    const [provider, setProvider] = useState(null);
    const [chatId, setChatId] = useState(null);
    const [currentMessagesCount, setCurrentMessagesCount] = useState(0);
    const [summary, setSummary] = useState('');
    const [prompt, setPrompt] = useState(''); // Initialize the prompt state

    const handleFetchContract = async () => {
        try {
            const res = await axios.get(`/api/contract`, {
                params: { address, network },
            });
            const sourceCode = res.data.SourceCode;
            setContractCode(sourceCode);
            setError('');
        } catch (err) {
            setError('Failed to fetch contract data');
            setContractCode('');
        }
    };

    const handleUnderstandContract = async () => {
        if (!provider) {
            setError('Please connect your wallet first');
            return;
        }

        if (!contractCode) {
            setError('No contract code available to explain. Please fetch the contract first.');
            return;
        }

        const chunks = chunkString(contractCode, 5000); // Chunk size set to 5000 characters

        try {
            const signer = provider.getSigner();
            const chatGptContract = new ethers.Contract(chatGptAddress, abi, signer);

            // Send initial prompt
            const initialPrompt = `I will send pieces of code of a smart contract in ${chunks.length} chunks. Please wait for the end of the smart contract.`;
            const gasLimitInitial = await chatGptContract.estimateGas.startChat(initialPrompt);
            const txInitial = await chatGptContract.startChat(initialPrompt, { gasLimit: gasLimitInitial });
            const receiptInitial = await txInitial.wait();
            const currentChatId = getChatId(receiptInitial, chatGptContract);
            setChatId(currentChatId);

            // Send chunks sequentially, waiting for a response each time
            for (let i = 0; i < chunks.length; i++) {
                const chunkPrompt = `Chunk ${i + 1}/${chunks.length}: ${chunks[i]}`;
                const gasLimitChunk = await chatGptContract.estimateGas.addMessage(chunkPrompt, currentChatId);
                const txChunk = await chatGptContract.addMessage(chunkPrompt, currentChatId, { gasLimit: gasLimitChunk });
                await txChunk.wait();

                // Wait for the LLM to process the chunk
                let newMessages = await getNewMessages(chatGptContract, currentChatId, currentMessagesCount);
                while (newMessages.length === 0 || newMessages[newMessages.length - 1].role !== 'assistant') {
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for 2 seconds before checking again
                    newMessages = await getNewMessages(chatGptContract, currentChatId, currentMessagesCount);
                }
                setCurrentMessagesCount(prev => prev + newMessages.length);
            }

            // Send final prompt for summary
            const finalPrompt = "All chunks sent. Please summarize the above code in detail.";
            const gasLimitFinal = await chatGptContract.estimateGas.addMessage(finalPrompt, currentChatId);
            const txFinal = await chatGptContract.addMessage(finalPrompt, currentChatId, { gasLimit: gasLimitFinal });
            await txFinal.wait();

            // Fetch summary
            const newMessages = await getNewMessages(chatGptContract, currentChatId, currentMessagesCount);
            setSummary(newMessages.find(msg => msg.role === 'assistant').content);

            setCurrentMessagesCount(prev => prev + newMessages.length);

        } catch (err) {
            setError('Failed to understand the contract');
            console.error(err);
        }
    };

    const handleSendPrompt = async () => {
        if (!provider) {
            setError('Please connect your wallet first');
            return;
        }

        if (!prompt) {
            setError('Please enter a prompt');
            return;
        }

        try {
            const signer = provider.getSigner();
            const chatGptContract = new ethers.Contract(chatGptAddress, abi, signer);

            const gasLimit = await chatGptContract.estimateGas.addMessage(prompt, chatId);
            const tx = await chatGptContract.addMessage(prompt, chatId, { gasLimit });
            await tx.wait();

            const newMessages = await getNewMessages(chatGptContract, chatId, currentMessagesCount);
            setResponse(prev => [...prev, { role: 'user', content: prompt }, ...newMessages]);
            setCurrentMessagesCount(prev => prev + newMessages.length + 1);

            setPrompt('');

        } catch (err) {
            setError('Failed to send prompt to contract');
            console.error(err);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
            <h1 className="text-4xl font-bold mb-8">Block Clarity</h1>
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
                <button
                    onClick={handleFetchContract}
                    className="w-full bg-blue-500 text-white p-2 rounded"
                >
                    Fetch Contract
                </button>
                <button
                    onClick={handleUnderstandContract}
                    className="w-full bg-green-500 text-white p-2 rounded mt-4"
                >
                    Understand Smart Contract
                </button>
            </div>
            {error && <p className="text-red-500 mt-4">{error}</p>}
            {contractCode && (
                <pre className="mt-4 bg-white p-4 border border-gray-300 rounded w-full max-w-3xl overflow-auto">
                    {contractCode}
                </pre>
            )}
            {summary && (
                <div className="mt-4 bg-white p-4 border border-gray-300 rounded w-full max-w-3xl overflow-auto">
                    <h2 className="text-xl font-bold mb-2">Summary</h2>
                    <p>{summary}</p>
                </div>
            )}
            <div className="mt-8 w-full max-w-md">
                <input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded mb-4 mt-4"
                    placeholder="Enter your prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                />
                <button
                    onClick={handleSendPrompt}
                    className="w-full bg-green-500 text-white p-2 rounded"
                >
                    Send Prompt
                </button>
            </div>
            <div className="bg-white p-4 border border-gray-300 rounded w-full max-w-3xl overflow-auto mt-4" style={{ height: '300px' }}>
                {response.map((msg, index) => (
                    <div key={index} className={`mb-2 p-2 rounded ${msg.role === 'user' ? 'bg-blue-100' : 'bg-green-100'}`}>
                        <strong>{msg.role}:</strong> {msg.content}
                    </div>
                ))}
            </div>
        </div>
    );
}
