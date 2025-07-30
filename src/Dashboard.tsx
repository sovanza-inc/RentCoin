import React, { useEffect, useState, useRef } from "react";
import { ConnectButton, useActiveAccount, ClaimButton } from "thirdweb/react";
import { client } from "./client";
import { getContract } from "thirdweb";
import { getBalance } from "thirdweb/extensions/erc20";
import { sepolia } from "thirdweb/chains";
import { formatUnits } from "ethers/lib/utils.js";
import PayPalButton from "./components/PayPalButton";
import { ethers } from 'ethers';
import './types.d'; // Import the window type declaration

interface StatusMessage {
    type: 'success' | 'error' | 'info' | 'loading';
    message: string;
}

const BACKEND_URL = process.env.VITE_API_URL || 'https://rent-coin-backend.vercel.app';
const MIN_TOKEN_AMOUNT = 0.00001; // Minimum token amount
const DEFAULT_TOKEN_AMOUNT = 0.00001; // Default token amount

const Dashboard = () => {
    const address = useActiveAccount();
    const [balance, setBalance] = useState<string>("0");
    const [loading, setLoading] = useState(true);
    const [tokenAmount, setTokenAmount] = useState<number>(DEFAULT_TOKEN_AMOUNT);
    const [processingPayment, setProcessingPayment] = useState(false);
    const [paymentCompleted, setPaymentCompleted] = useState(false);
    const [status, setStatus] = useState<StatusMessage | null>(null);
    const [progress, setProgress] = useState<number>(0);
    const claimButtonRef = useRef<HTMLButtonElement>(null);
    const [autoClaimInProgress, setAutoClaimInProgress] = useState(false);
    const [maxAvailableTokens, setMaxAvailableTokens] = useState<number>(0);
    const [error, setError] = useState<string | null>(null);
    const [isValidAmount, setIsValidAmount] = useState(true);

    const contract = getContract({
        client,
        address: "0x37BC77fc80E85E7B76Ee59dEd861D0e40E9c58d5",
        chain: sepolia
    });

    // Fetch available token balance
    const fetchAvailableTokens = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/health`);
            const data = await response.json();
            if (data.tokenBalance) {
                setMaxAvailableTokens(parseFloat(data.tokenBalance));
            }
        } catch (error) {
            console.error("Error fetching available tokens:", error);
        }
    };

    useEffect(() => {
        fetchAvailableTokens();
    }, []);

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

    useEffect(() => {
        const fetchBalance = async () => {
            if (address?.address) {
                try {
                    setLoading(true);
                    const tokenBalance = await getBalance({
                        contract,
                        address: address.address
                    });
                    
                    // Convert from wei (18 decimals) to normal units
                    const formattedBalance = formatUnits(tokenBalance.value, 18);
                    setBalance(formattedBalance);
                } catch (error) {
                    console.error("Error fetching balance:", error);
                    setBalance("0");
                } finally {
                    setLoading(false);
                }
            }
        };

        fetchBalance();
    }, [address?.address]);

    const validateTokenAmount = (value: string): number => {
        const num = parseFloat(value);
        if (isNaN(num) || num < MIN_TOKEN_AMOUNT) {
            setError(`Minimum purchase amount is ${MIN_TOKEN_AMOUNT} tokens`);
            setIsValidAmount(false);
            return num;
        }
        // Check if amount exceeds available tokens
        if (num > maxAvailableTokens) {
            setError(`Insufficient balance. Maximum available tokens: ${maxAvailableTokens} RC`);
            setIsValidAmount(false);
            return num;
        }
        setError(null);
        setIsValidAmount(true);
        return num;
    };

    const handlePayPalSuccess = async (details: any, purchasedTokenAmount: number) => {
        // Only proceed if amount is valid
        if (!isValidAmount) {
            handleStatusChange('error', `Cannot process. ${error}`);
            return;
        }
        
        try {
            setProcessingPayment(true);
            console.log("Payment completed successfully", details);
            
            handleStatusChange('loading', 'Payment successful! Automatically distributing your tokens...');
            try {
                if (!address?.address) {
                    throw new Error('Wallet not connected');
                }

                const response = await fetch(`${BACKEND_URL}/distribute`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        userAddress: address.address,
                        quantity: purchasedTokenAmount.toString()
                    }),
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Failed to distribute tokens');
                }

                const result = await response.json();
                console.log('Distribution transaction sent:', result.transactionHash);
                handleStatusChange('success', `Successfully received ${purchasedTokenAmount} RentCoins!`);
                setTokenAmount(DEFAULT_TOKEN_AMOUNT);

                // Refresh available tokens
                await fetchAvailableTokens();

                // Refresh balance after distribution
                if (contract) {
                    const newBalance = await getBalance({
                        contract,
                        address: address.address
                    });
                    setBalance(formatUnits(newBalance.value, 18));
                }
            } catch (error: any) {
                console.error("Error distributing tokens:", error);
                handleStatusChange('error', error.message || 'Failed to distribute tokens. Please contact support.');
            }
        } catch (error) {
            console.error("Error processing payment:", error);
            handleStatusChange('error', 'An error occurred while processing your payment. Please contact support.');
        } finally {
            setProcessingPayment(false);
        }
    };

    const handlePayPalError = (error: any) => {
        console.error("PayPal payment failed:", error);
        handleStatusChange('error', 'Payment failed. Please try again.');
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Wallet Connection */}
            <div className="flex justify-end mb-8">
                <ConnectButton
                    client={client}
                    appMetadata={{
                        name: "RentCoin Dashboard",
                        url: window.location.href,
                    }}
                />
            </div>

            {/* Dashboard Content */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700">
                <h1 className="text-3xl font-bold text-white mb-8">Your RentCoin Holdings</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700">
                        <h3 className="text-lg font-medium text-gray-400 mb-2">Total Tokens</h3>
                        <div className="flex items-center space-x-2">
                            <div className="text-3xl font-bold text-green-400">
                                {loading ? (
                                    <div className="animate-pulse bg-gray-700 h-9 w-24 rounded"></div>
                                ) : (
                                    `${parseFloat(balance).toLocaleString()} RC`
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700">
                        <h3 className="text-lg font-medium text-gray-400 mb-2">Current Value</h3>
                        <div className="flex items-center space-x-2">
                            <div className="text-3xl font-bold text-green-400">
                                {loading ? (
                                    <div className="animate-pulse bg-gray-700 h-9 w-24 rounded"></div>
                                ) : (
                                    `$${(parseFloat(balance) * 175).toLocaleString()}`
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* PayPal Integration Section */}
                {address && (
                    <div className="mt-8 bg-gray-900/50 rounded-xl p-6 border border-gray-700">
                        <h2 className="text-2xl font-bold text-white mb-4">Purchase Tokens with PayPal</h2>
                        
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

                        <div className="mb-4">
                            <label className="block text-gray-400 mb-2">Number of Tokens to Purchase</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={tokenAmount}
                                    step={MIN_TOKEN_AMOUNT.toString()}
                                    min={MIN_TOKEN_AMOUNT}
                                    onChange={(e) => {
                                        const newAmount = validateTokenAmount(e.target.value);
                                        setTokenAmount(newAmount);
                                        setStatus(null);
                                        setProgress(0);
                                    }}
                                    className={`w-full bg-gray-800/50 border ${error ? 'border-red-500' : 'border-gray-700'} rounded-lg py-3 px-4 text-white focus:outline-none focus:border-blue-500`}
                                    placeholder={`Enter number of tokens (min ${MIN_TOKEN_AMOUNT})`}
                                    disabled={processingPayment}
                                />
                                <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">RC</span>
                            </div>
                            <div className="mt-2 text-sm">
                                {error ? (
                                    <p className="text-red-500">{error}</p>
                                ) : (
                                    <>
                                        <p className="text-gray-400">Minimum purchase: {MIN_TOKEN_AMOUNT} tokens</p>
                                        <p className="text-gray-400">Available tokens: {maxAvailableTokens} RC</p>
                                    </>
                                )}
                            </div>
                        </div>

                        {paymentCompleted ? (
                            <div className="mb-6">
                                {autoClaimInProgress && (
                                    <div className="bg-blue-900/50 border border-blue-500 text-blue-400 p-4 rounded-lg mb-4">
                                        <p>Please confirm the transaction in your wallet to claim your tokens.</p>
                                    </div>
                                )}
                                <ClaimButton
                                    contractAddress="0x37BC77fc80E85E7B76Ee59dEd861D0e40E9c58d5"
                                    chain={sepolia}
                                    client={client}
                                    claimParams={{
                                        type: "ERC20" as const,
                                        quantity: tokenAmount.toString(),
                                    }}
                                    onTransactionSent={(result) => {
                                        handleStatusChange('loading', 'Processing your claim...');
                                        console.log('Transaction sent:', result.transactionHash);
                                    }}
                                    onTransactionConfirmed={(receipt) => {
                                        handleStatusChange('success', `Successfully claimed ${tokenAmount} RentCoins!`);
                                        setPaymentCompleted(false);
                                        setAutoClaimInProgress(false);
                                        setTokenAmount(DEFAULT_TOKEN_AMOUNT);
                                        console.log('Transaction confirmed:', receipt.transactionHash);
                                    }}
                                    onError={(error: Error) => {
                                        const errorMessage = error.message || '';
                                        if (errorMessage.includes('insufficient funds for gas')) {
                                            handleStatusChange('error', 'Insufficient Sepolia ETH for gas fees. Please get some Sepolia ETH from the faucet and try again.');
                                        } else {
                                            handleStatusChange('error', 'Failed to claim tokens. Please try again or contact support.');
                                        }
                                        setAutoClaimInProgress(false);
                                        console.error('Transaction error:', error);
                                    }}
                                >
                                    {autoClaimInProgress ? 'Confirm in Wallet' : `Claim ${tokenAmount} Token${tokenAmount !== 1 ? 's' : ''}`}
                                </ClaimButton>
                            </div>
                        ) : processingPayment ? (
                            <div className="text-gray-400">Processing your payment and token distribution...</div>
                        ) : (
                            <div>
                                {isValidAmount ? (
                                    <PayPalButton
                                        tokenAmount={tokenAmount}
                                        onSuccess={handlePayPalSuccess}
                                        onError={handlePayPalError}
                                    />
                                ) : (
                                    <button 
                                        className="w-full bg-gray-700 text-gray-400 py-3 px-4 rounded-lg cursor-not-allowed"
                                        disabled
                                    >
                                        Please enter a valid amount
                                    </button>
                                )}
                            </div>
                        )}

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
                                    <span>You must have Sepolia ETH (testnet) for gas fees - get it free from <a href="https://sepoliafaucet.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">Sepolia Faucet</a></span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-green-400 mr-2">•</span>
                                    <span>Make sure you're connected to Sepolia testnet in your wallet</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-green-400 mr-2">•</span>
                                    <span>Transaction may take a few minutes to process on the Sepolia network</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-green-400 mr-2">•</span>
                                    <span>Minimum purchase amount is 0.1 tokens</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>

            {/* Auth Overlay */}
            {!address && (
                <div className="fixed inset-0 bg-gray-900/90 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-700 max-w-md w-full mx-4">
                        <h2 className="text-2xl font-bold text-white mb-6 text-center">Connect Wallet to Access Dashboard</h2>
                        <div className="flex justify-center">
                            <ConnectButton
                                client={client}
                                appMetadata={{
                                    name: "RentCoin Dashboard",
                                    url: window.location.href,
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
