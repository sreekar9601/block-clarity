import { useState, useEffect } from 'react';
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
    const [response, setResponse] = useState('');
    const [provider, setProvider] = useState(null);
    const [chatId, setChatId] = useState(null);
    const [maxPromptSize, setMaxPromptSize] = useState(5000); // Adjusted chunk size

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

    const handleExplainContract = async () => {
        if (!provider) {
            setError('Please connect your wallet first');
            return;
        }

        if (!contractCode) {
            setError('No contract code available to explain. Please fetch the contract first.');
            return;
        }

        const chunks = chunkString(contractCode, maxPromptSize);

        try {
            const initialPrompt = `I will send pieces of code of a smart contract in ${chunks.length} chunks. Please wait for the end of the smart contract.`;
            const initialChatId = await sendInitialPrompt(initialPrompt);
            setChatId(initialChatId);

            for (let i = 0; i < chunks.length; i++) {
                const chunkPrompt = `Chunk ${i + 1}/${chunks.length}: ${chunks[i]}`;
                await sendChunkToContract(chunkPrompt, initialChatId);
                await waitForAssistantResponse(initialChatId); // Wait for the assistant to respond before sending the next chunk
            }

            const finalPrompt = "All chunks sent. Please summarize the above code in detail.";
            await sendFinalPrompt(initialChatId, finalPrompt);

            const messages = await getMessageHistoryContents(initialChatId);
            setResponse(messages.map(msg => `${msg.role}: ${msg.content}`).join('\n')); // Display messages

        } catch (err) {
            setError('Failed to send chunks to contract');
            console.error(err);
        }
    };

    const sendInitialPrompt = async (initialPrompt) => {
        const signer = provider.getSigner();
        const chatGptContract = new ethers.Contract(chatGptAddress, abi, signer);
        
        try {
            const gasLimit = await chatGptContract.estimateGas.startChat(initialPrompt);
            const tx = await chatGptContract.startChat(initialPrompt, { gasLimit });
            const receipt = await tx.wait();
            const chatId = getChatId(receipt, chatGptContract);
            
            if (chatId === null) {
                throw new Error('Failed to get chat ID from the transaction receipt');
            }

            console.log(`Initial prompt sent successfully. Chat ID: ${chatId}`);
            return chatId;
        } catch (err) {
            console.error(`Failed to send initial prompt:`, err);
            throw err;
        }
    };

    const sendChunkToContract = async (chunkPrompt, chatId) => {
        const signer = provider.getSigner();
        const chatGptContract = new ethers.Contract(chatGptAddress, abi, signer);

        try {
            const gasLimit = await chatGptContract.estimateGas.addMessage(chunkPrompt, chatId);
            const tx = await chatGptContract.addMessage(chunkPrompt, chatId, { gasLimit });
            await tx.wait();

            console.log(`Chunk sent successfully: ${chunkPrompt}`);
        } catch (err) {
            console.error(`Failed to send chunk:`, err);
            throw err;
        }
    };

    const waitForAssistantResponse = async (chatId) => {
        const signer = provider.getSigner();
        const chatGptContract = new ethers.Contract(chatGptAddress, abi, signer);
        const checkResponseInterval = 5000; // Check every 5 seconds
        const maxRetries = 24; // Retry for 2 minutes

        for (let i = 0; i < maxRetries; i++) {
            const messages = await getMessageHistoryContents(chatId);
            const lastMessage = messages[messages.length - 1];

            console.log(`Checking response... attempt ${i + 1}/${maxRetries}`);
            console.log(`Last message: ${lastMessage ? JSON.stringify(lastMessage) : 'None'}`);

            if (lastMessage && lastMessage.role === 'assistant') {
                return;
            }

            await new Promise((resolve) => setTimeout(resolve, checkResponseInterval));
        }

        throw new Error('Assistant did not respond in a timely manner.');
    };

    const sendFinalPrompt = async (chatId, prompt) => {
        const signer = provider.getSigner();
        const chatGptContract = new ethers.Contract(chatGptAddress, abi, signer);
        try {
            const gasLimit = await chatGptContract.estimateGas.addMessage(prompt, chatId);
            const tx = await chatGptContract.addMessage(prompt, chatId, { gasLimit });
            await tx.wait();
            console.log(`Final prompt sent successfully`);
        } catch (err) {
            console.error(`Failed to send final prompt:`, err);
            throw err; // Stop further processing if a chunk fails
        }
    };

    const getMessageHistoryContents = async (chatId) => {
        const signer = provider.getSigner();
        const chatGptContract = new ethers.Contract(chatGptAddress, abi, signer);
        try {
            const messages = await chatGptContract.getMessageHistoryContents(chatId);
            return messages.map(message => ({
                role: message.role,
                content: message.content
            }));
        } catch (err) {
            console.error(`Failed to get message history contents:`, err);
            throw err;
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
                <button
                    onClick={handleFetchContract}
                    className="w-full bg-blue-500 text-white p-2 rounded"
                >
                    Fetch Contract
                </button>
                <button
                    onClick={handleExplainContract}
                    className="w-full bg-green-500 text-white p-2 rounded mt-4"
                >
                    Explain Contract
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
