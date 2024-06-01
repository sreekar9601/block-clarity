import { useState } from 'react';
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

export default function TestIndex() {
    const [prompt, setPrompt] = useState('');
    const [response, setResponse] = useState([]);
    const [provider, setProvider] = useState(null);
    const [error, setError] = useState('');
    const [chatId, setChatId] = useState(null);
    const [currentMessagesCount, setCurrentMessagesCount] = useState(0);

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

            let currentChatId = chatId;
            if (!chatId) {
                const gasLimit = await chatGptContract.estimateGas.startChat(prompt);
                const tx = await chatGptContract.startChat(prompt, { gasLimit });
                const receipt = await tx.wait();
                currentChatId = getChatId(receipt, chatGptContract);
                setChatId(currentChatId);
            } else {
                const gasLimit = await chatGptContract.estimateGas.addMessage(prompt, currentChatId);
                const tx = await chatGptContract.addMessage(prompt, currentChatId, { gasLimit });
                await tx.wait();
            }

            const newMessages = await getNewMessages(chatGptContract, currentChatId, currentMessagesCount);
            setResponse((prev) => [...prev, { role: 'user', content: prompt }, ...newMessages]);
            setCurrentMessagesCount((prev) => prev + newMessages.length + 1);

            setPrompt('');

        } catch (err) {
            setError('Failed to send prompt to contract');
            console.error(err);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
            <h1 className="text-4xl font-bold mb-8">Chat with LLM</h1>
            <div className="w-full max-w-md">
                <ConnectWalletButton setProvider={setProvider} />
                <div className="bg-white p-4 border border-gray-300 rounded w-full max-w-3xl overflow-auto" style={{ height: '300px' }}>
                    {response.map((msg, index) => (
                        <div key={index} className={`mb-2 p-2 rounded ${msg.role === 'user' ? 'bg-blue-100' : 'bg-green-100'}`}>
                            <strong>{msg.role}:</strong> {msg.content}
                        </div>
                    ))}
                </div>
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
            {error && <p className="text-red-500 mt-4">{error}</p>}
        </div>
    );
}
