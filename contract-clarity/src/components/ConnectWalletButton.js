import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const ConnectWalletButton = ({ setProvider }) => {
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const address = await signer.getAddress();
        setWalletAddress(address);
        setWalletConnected(true);
        setProvider(provider);
      } catch (error) {
        console.error('Failed to connect wallet:', error);
      }
    } else {
      console.error('MetaMask is not installed');
    }
  };

  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      window.ethereum.on('accountsChanged', () => {
        connectWallet();
      });
    }
  }, []);

  return (
    <div>
      {walletConnected ? (
        <button className="bg-green-500 text-white p-2 rounded">
          Connected: {walletAddress.substring(0, 6)}...
        </button>
      ) : (
        <button onClick={connectWallet} className="bg-blue-500 text-white p-2 rounded">
          Connect Wallet
        </button>
      )}
    </div>
  );
};

export default ConnectWalletButton;
