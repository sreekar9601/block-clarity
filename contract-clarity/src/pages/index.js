import { useState, useEffect } from 'react';
import axios from 'axios';
import ConnectWalletButton from '../components/ConnectWalletButton';
import { ethers } from 'ethers';

const chatGptAddress = "0x7E9b05042faf2981e2b8e135e7D9Ff160d0BDC02";

// Helper function to extract chatId from the transaction receipt
function getChatId(receipt, contract) {
  let chatId;
  for (const log of receipt.logs) {
    try {
      const parsedLog = contract.interface.parseLog(log);
      if (parsedLog && parsedLog.name === "ChatCreated") {
        // Second event argument
        chatId = parsedLog.args.chatId.toString();
      }
    } catch (error) {
      // This log might not have been from your contract, or it might be an anonymous log
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

      // ChatGpt contract ABI (simplified version, you need the full ABI)
      const abi = [
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "initialOracleAddress",
              "type": "address"
            },
            {
              "internalType": "string",
              "name": "knowledgeBaseCID",
              "type": "string"
            }
          ],
          "stateMutability": "nonpayable",
          "type": "constructor"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "address",
              "name": "owner",
              "type": "address"
            },
            {
              "indexed": true,
              "internalType": "uint256",
              "name": "chatId",
              "type": "uint256"
            }
          ],
          "name": "ChatCreated",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "address",
              "name": "newOracleAddress",
              "type": "address"
            }
          ],
          "name": "OracleAddressUpdated",
          "type": "event"
        },
        {
          "inputs": [
            {
              "internalType": "string",
              "name": "message",
              "type": "string"
            },
            {
              "internalType": "uint256",
              "name": "runId",
              "type": "uint256"
            }
          ],
          "name": "addMessage",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "uint256",
              "name": "",
              "type": "uint256"
            }
          ],
          "name": "chatRuns",
          "outputs": [
            {
              "internalType": "address",
              "name": "owner",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "messagesCount",
              "type": "uint256"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "uint256",
              "name": "chatId",
              "type": "uint256"
            }
          ],
          "name": "getMessageHistoryContents",
          "outputs": [
            {
              "internalType": "string[]",
              "name": "",
              "type": "string[]"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "uint256",
              "name": "chatId",
              "type": "uint256"
            }
          ],
          "name": "getMessageHistoryRoles",
          "outputs": [
            {
              "internalType": "string[]",
              "name": "",
              "type": "string[]"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "knowledgeBase",
          "outputs": [
            {
              "internalType": "string",
              "name": "",
              "type": "string"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "uint256",
              "name": "runId",
              "type": "uint256"
            },
            {
              "internalType": "string[]",
              "name": "documents",
              "type": "string[]"
            },
            {
              "internalType": "string",
              "name": "",
              "type": "string"
            }
          ],
          "name": "onOracleKnowledgeBaseQueryResponse",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "uint256",
              "name": "runId",
              "type": "uint256"
            },
            {
              "internalType": "string",
              "name": "response",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "",
              "type": "string"
            }
          ],
          "name": "onOracleLlmResponse",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "oracleAddress",
          "outputs": [
            {
              "internalType": "address",
              "name": "",
              "type": "address"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "newOracleAddress",
              "type": "address"
            }
          ],
          "name": "setOracleAddress",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "string",
              "name": "message",
              "type": "string"
            }
          ],
          "name": "startChat",
          "outputs": [
            {
              "internalType": "uint256",
              "name": "i",
              "type": "uint256"
            }
          ],
          "stateMutability": "nonpayable",
          "type": "function"
        }
      ];

      // Create a new contract instance for the ChatGpt contract
      const chatGptContract = new ethers.Contract(chatGptAddress, abi, signer);

      // Send the initial chat message and get the transaction
      const tx = await chatGptContract.startChat(prompt);

      // Wait for the transaction to be mined
      const receipt = await tx.wait();

      // Extract the ChatCreated event from the receipt
      const chatId = getChatId(receipt, chatGptContract);
      console.log(`Created chat ID: ${chatId}`);

      if (!chatId && chatId !== 0) {
        setError('Failed to get chat ID from the transaction receipt');
        return;
      }

      // Store the chat ID in state
      setChatId(chatId);

      // Update the response state with a placeholder (since response will be async)
      setResponse(`Chat started with ID: ${chatId}. Waiting for response...`);

    } catch (err) {
      setError('Failed to send prompt to contract');
      console.error(err);
    }
  };

  useEffect(() => {
    if (chatId && provider) {
      const signer = provider.getSigner();
      const chatGptContract = new ethers.Contract(chatGptAddress, [
        "event ChatCreated(address indexed owner, uint indexed chatId)",
        "event OracleLlmResponse(uint indexed runId, string response, string errorMessage)"
      ], signer);

      // Listen for the OracleLlmResponse event
      chatGptContract.on("OracleLlmResponse", (runId, response, errorMessage) => {
        if (runId.toString() === chatId.toString()) {
          if (errorMessage) {
            setError(`Error: ${errorMessage}`);
          } else {
            setResponse(response);
          }
        }
      });

      // Clean up event listener on component unmount
      return () => {
        chatGptContract.removeAllListeners("OracleLlmResponse");
      };
    }
  }, [chatId, provider]);

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
