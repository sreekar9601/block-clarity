import Web3 from 'web3';
import fs from 'fs';
require('dotenv').config();

const web3 = new Web3(new Web3.providers.HttpProvider(process.env.RPC_URL));
const account = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY);
web3.eth.accounts.wallet.add(account);

const oracleAbi = JSON.parse(fs.readFileSync(process.env.ORACLE_ABI_PATH, 'utf-8')).abi;
const contract = new web3.eth.Contract(oracleAbi, process.env.ORACLE_ADDRESS);

export const requestIndexing = async (cid) => {
    try {
        const tx = contract.methods.addKnowledgeBase(cid);
        const gas = await tx.estimateGas({ from: account.address });
        const gasPrice = await web3.eth.getGasPrice();
        const data = tx.encodeABI();
        const nonce = await web3.eth.getTransactionCount(account.address);

        const signedTx = await web3.eth.accounts.signTransaction(
            {
                to: process.env.ORACLE_ADDRESS,
                data,
                gas,
                gasPrice,
                nonce,
                chainId: Number(process.env.CHAIN_ID),
            },
            process.env.PRIVATE_KEY
        );

        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        return receipt;
    } catch (error) {
        console.error('Failed to request indexing:', error);
        throw new Error('Indexing request failed');
    }
};
