import { useState } from 'react';
import axios from 'axios';

export default function Home() {
  const [address, setAddress] = useState('');
  const [contractCode, setContractCode] = useState('');
  const [error, setError] = useState('');

  const handleSearch = async () => {
    try {
      const res = await axios.get(`/api/contract?address=${address}`);
      setContractCode(res.data.SourceCode);
      setError('');
    } catch (err) {
      setError('Failed to fetch contract data');
      setContractCode('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold mb-8">Contract Clarity</h1>
      <div className="w-full max-w-md">
        <input
          type="text"
          className="w-full p-2 border border-gray-300 rounded mb-4"
          placeholder="Enter smart contract address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <button
          onClick={handleSearch}
          className="w-full bg-blue-500 text-white p-2 rounded"
        >
          Search
        </button>
      </div>
      {error && <p className="text-red-500 mt-4">{error}</p>}
      {contractCode && (
        <pre className="mt-4 bg-white p-4 border border-gray-300 rounded w-full max-w-3xl overflow-auto">
          {contractCode}
        </pre>
      )}
    </div>
  );
}
