import { useState } from 'react';
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { client } from "./client";
import { ethereum } from "thirdweb/chains";
import { getContract } from "thirdweb";
import { claimTo } from "thirdweb/extensions/erc20";
import { ClaimableERC20 } from "thirdweb/modules";
import { ClaimButton } from "thirdweb/react";


interface StatusMessage {
    type: 'success' | 'error' | 'info' | 'loading';
    message: string;
}

export const TokenMint = () => {
    const [quantity, setQuantity] = useState<string>('');
    const [status, setStatus] = useState<StatusMessage | null>(null);
    const [progress, setProgress] = useState<number>(0);
    const address = useActiveAccount();

    const handleStatusChange = (type: StatusMessage['type'], message: string) => {
        setStatus({ type, message });
        if (type === 'loading') {
            setProgress(30);
            setTimeout(() => setProgress(60), 1000);
        } else if (type === 'success') {
            setProgress(100);
            setTimeout(() => {
                setProgress(0);
                setStatus(null);
            }, 3000);
        } else if (type === 'error') {
            setProgress(0);
            setTimeout(() => setStatus(null), 5000);
        }
    };

    const contract = getContract({
        client,
        address: "0x6bb74a695d9c89aadef3c9ca8f9e72c0318a164f",
        chain: ethereum,
      });

    // const handleMint = async () => {
    //     if (!quantity || !address) {
    //         setStatus('Please enter a quantity and connect your wallet');
    //         return;
    //     }

    //     try {
    //         const transaction = claimTo({
    //             contract,
    //             to: address?.address || '',
    //             quantity: (parseFloat(quantity) * 1e18).toString(), // Convert to string with 18 decimals
    //         });

    //         setStatus('Minting in progress...');
    //         await sendTransaction(transaction);
    //         setStatus('Tokens minted successfully!');
    //         setQuantity('');
    //     } catch (error) {

    return (
        <div className="max-w-3xl mx-auto mt-10 p-8 bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl text-white">
            <div className="text-center mb-8">
                <h2 className="text-4xl font-bold mb-2 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">RentCoin Token Sale</h2>
                <p className="text-gray-400">Secure your tokens on the Ethereum mainnet</p>
            </div>

            {/* Progress Bar */}
            {progress > 0 && (
                <div className="w-full bg-gray-700 rounded-full h-2 mb-6 overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-green-400 to-blue-500 transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}

            {/* Status Message */}
            {status && (
                <div className={`mb-6 p-4 rounded-lg ${{
                    success: 'bg-green-900/50 border border-green-500 text-green-400',
                    error: 'bg-red-900/50 border border-red-500 text-red-400',
                    info: 'bg-blue-900/50 border border-blue-500 text-blue-400',
                    loading: 'bg-gray-800/50 border border-gray-600 text-gray-300'
                }[status.type]}`}>
                    <div className="flex items-center space-x-2">
                        {status.type === 'loading' && (
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        )}
                        {status.type === 'success' && (
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                        {status.type === 'error' && (
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        )}
                        <span>{status.message}</span>
                    </div>
                </div>
            )}
            
            {/* Price Card */}
            <div className="bg-gray-800 rounded-xl p-6 mb-8 border border-gray-700">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-xl font-semibold">Current Price</span>
                    <span className="text-2xl font-bold text-green-400">$175</span>
                </div>
                <div className="h-px bg-gray-700 mb-4"></div>
                <div className="text-sm text-gray-400">
                    <p>First 3,000 tokens available at launch price</p>
                </div>
            </div>

            {/* Input Section */}
            <div className="mb-6">
                <label className="block text-gray-400 mb-2">Token Quantity</label>
                <div className="relative">
                    <input
                        type="number"
                        value={quantity}
                        onChange={(e) => {
                            setQuantity(e.target.value);
                            setStatus(null);
                            setProgress(0);
                        }}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-blue-500"
                        placeholder="Enter number of tokens"
                    />
                    <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">RC</span>
                </div>
            </div>

            {/* Claim Button */}
            <div className="mb-6">
                <ClaimButton
                    contractAddress="0x6bb74a695d9c89aadef3c9ca8f9e72c0318a164f"
                    chain={ethereum}
                    client={client}
                    claimParams={{
                        type: "ERC20",
                        quantity: quantity || "0",
                    }}
                    onTransactionSent={(result) => {
                        handleStatusChange('loading', 'Processing your claim...');
                        console.log('Transaction sent:', result.transactionHash);
                    }}
                    onTransactionConfirmed={(receipt) => {
                        handleStatusChange('success', `Successfully claimed ${quantity} RentCoins!`);
                        setQuantity('');
                        console.log('Transaction confirmed:', receipt.transactionHash);
                    }}
                    onError={(error: Error) => {
                        handleStatusChange('error', error.message || 'Failed to claim tokens. Please try again.');
                        console.error('Transaction error:', error);
                    }}
                >
                    {quantity ? `Claim ${quantity} Tokens` : 'Enter amount to claim'}
                </ClaimButton>
            </div>

            {/* Instructions */}
            <div className="mt-8 bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                <h3 className="text-xl font-semibold text-white mb-4">Important Information</h3>
                <ul className="space-y-3 text-gray-300">
                    <li className="flex items-start">
                        <span className="text-green-400 mr-2">•</span>
                        <span>First 3,000 tokens are available at $175 each</span>
                    </li>
                    <li className="flex items-start">
                        <span className="text-green-400 mr-2">•</span>
                        <span>You must have sufficient ETH equivalent to the dollar value of tokens</span>
                    </li>
                    <li className="flex items-start">
                        <span className="text-green-400 mr-2">•</span>
                        <span>MetaMask will not open if you don't have enough ETH balance</span>
                    </li>
                    <li className="flex items-start">
                        <span className="text-green-400 mr-2">•</span>
                        <span>Transaction may take a few minutes to process on the Ethereum network</span>
                    </li>
                    <li className="flex items-start">
                        <span className="text-green-400 mr-2">•</span>
                        <span>Make sure you're connected to Ethereum mainnet in your wallet</span>
                    </li>
                </ul>
            </div>
        </div>
    );
};

export default TokenMint;
