import express from 'express';
import { ethers } from 'ethers';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Define error interface
interface ContractError extends Error {
    code?: string;
    reason?: string;
    data?: any;
}

// Initialize the contract owner wallet
const OWNER_PRIVATE_KEY = "4625e1cdb365343ad595e9c037ec2e09817a85c5cf122dd65f079c8e2445a57c";
const TOKEN_CONTRACT_ADDRESS = "0x37BC77fc80E85E7B76Ee59dEd861D0e40E9c58d5";
const OWNER_ADDRESS = "0x7D0441d822E347c3f900248c5a943680E1c3B2a9";

// Use multiple RPC endpoints
const RPC_URLS = [
    "https://eth-sepolia.public.blastapi.io",
    "https://rpc2.sepolia.org",
    "https://rpc.sepolia.org"
];

let currentRpcIndex = 0;

// Create provider with retry logic
function createProvider() {
    const provider = new ethers.providers.JsonRpcProvider({
        url: RPC_URLS[currentRpcIndex],
        timeout: 30000, // 30 seconds
    });

    // Add request retry logic
    const originalSend = provider.send.bind(provider);
    provider.send = async (method: string, params: any[]) => {
        let lastError;
        for (let i = 0; i < RPC_URLS.length; i++) {
            try {
                console.log(`Using RPC endpoint: ${RPC_URLS[currentRpcIndex]}`);
                return await originalSend(method, params);
            } catch (error) {
                console.log(`RPC endpoint ${currentRpcIndex} failed, trying next...`);
                lastError = error;
                // Try next RPC endpoint
                currentRpcIndex = (currentRpcIndex + 1) % RPC_URLS.length;
                provider.connection.url = RPC_URLS[currentRpcIndex];
            }
        }
        throw lastError;
    };

    return provider;
}

let provider = createProvider();
let ownerWallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);

// Verify that we're using the correct wallet
if (ownerWallet.address.toLowerCase() !== OWNER_ADDRESS.toLowerCase()) {
    throw new Error(`Wallet address mismatch. Expected ${OWNER_ADDRESS} but got ${ownerWallet.address}`);
}

// Function to recreate provider and wallet
async function resetConnection() {
    try {
        console.log("Resetting connection...");
        // Try next RPC endpoint
        currentRpcIndex = (currentRpcIndex + 1) % RPC_URLS.length;
        provider = createProvider();
        ownerWallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);
        console.log("Connection reset completed");
        return true;
    } catch (error) {
        console.error("Error resetting connection:", error);
        return false;
    }
}

// Contract ABI (only the functions we need)
const CONTRACT_ABI = [
    "function transfer(address to, uint256 amount) returns (bool)",
    "function balanceOf(address account) view returns (uint256)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)"
];

const contract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, CONTRACT_ABI, ownerWallet);

// Verify provider connection and token balance
async function checkConnection() {
    try {
        console.log("Checking network connection...");
        const network = await provider.getNetwork();
        console.log("Connected to network:", network.name, "chainId:", network.chainId);
        
        console.log("Checking ETH balance...");
        const ethBalance = await ownerWallet.getBalance();
        console.log("ETH balance:", ethers.utils.formatEther(ethBalance), "ETH");
        
        // Check token balance
        try {
            console.log("Checking token balance...");
            const tokenBalance = await contract.balanceOf(OWNER_ADDRESS);
            console.log("Token balance:", ethers.utils.formatEther(tokenBalance));
            
            // Check if we have enough tokens
            if (tokenBalance.isZero()) {
                console.error("Warning: Token balance is zero!");
            }
        } catch (error: any) {
            console.log("Could not check token balance:", error.message);
        }
        
        return true;
    } catch (error: any) {
        console.error("Connection error:", {
            message: error.message,
            code: error.code,
            reason: error.reason
        });
        await resetConnection();
        return false;
    }
}

// Check connection on startup
checkConnection();

// Add error handler for provider
provider.on("error", (error) => {
    console.error("Provider error:", error);
    resetConnection();
});

// Endpoint to handle automatic token distribution
app.post('/distribute', async (req, res) => {
    try {
        const {
            userAddress,
            quantity
        } = req.body;

        // Validate input
        if (!ethers.utils.isAddress(userAddress)) {
            return res.status(400).json({ error: 'Invalid user address' });
        }

        if (!quantity || isNaN(quantity) || parseFloat(quantity) <= 0) {
            return res.status(400).json({ error: 'Invalid quantity' });
        }

        // Ensure connection is active
        await checkConnection();

        // Convert quantity to proper decimal places (18 decimals)
        const amount = ethers.utils.parseUnits(quantity.toString(), 18);

        // Check token balance before transfer
        const balance = await contract.balanceOf(OWNER_ADDRESS);
        if (balance.lt(amount)) {
            return res.status(400).json({
                error: 'Insufficient token balance',
                details: `Required: ${ethers.utils.formatEther(amount)}, Available: ${ethers.utils.formatEther(balance)}`
            });
        }

        // Try transfer with retries
        let lastError;
        for (let i = 0; i < 3; i++) {
            try {
                console.log(`Transfer attempt ${i + 1}...`);
                
                // Get current gas price and increase it slightly for faster confirmation
                const gasPrice = await provider.getGasPrice();
                const adjustedGasPrice = gasPrice.mul(120).div(100); // 20% higher

                const transferTx = await contract.transfer(userAddress, amount, {
                    gasLimit: 300000,
                    gasPrice: adjustedGasPrice
                });
                console.log('Transaction sent:', transferTx.hash);
                const transferReceipt = await transferTx.wait();
                console.log('Transaction confirmed:', transferReceipt.transactionHash);

                return res.json({
                    success: true,
                    transactionHash: transferReceipt.transactionHash,
                    from: OWNER_ADDRESS,
                    to: userAddress,
                    amount: ethers.utils.formatEther(amount)
                });
            } catch (error: any) {
                console.log(`Transfer attempt ${i + 1} failed:`, error.message);
                lastError = error;
                if (error.code === 'NETWORK_ERROR') {
                    await resetConnection();
                }
                await new Promise(resolve => setTimeout(resolve, (i + 1) * 2000));
            }
        }

        throw lastError;
    } catch (error: any) {
        console.error('Distribution error:', error);
        
        let errorMessage = 'Failed to distribute tokens. Please try again.';
        if (error.code === 'NETWORK_ERROR') {
            errorMessage = 'Network connection issue. Please try again in a few moments.';
        } else if (error.code === 'INSUFFICIENT_FUNDS') {
            errorMessage = 'Contract owner has insufficient funds for gas.';
        } else if (error.reason) {
            errorMessage = error.reason;
        }

        res.status(500).json({
            error: errorMessage,
            details: error.message,
            code: error.code
        });
    }
});

// Health check endpoint
app.get('/health', async (req, res) => {
    const isConnected = await checkConnection();
    let networkInfo = null;
    let tokenBalance = null;
    
    try {
        networkInfo = await provider.getNetwork();
        tokenBalance = await contract.balanceOf(OWNER_ADDRESS);
    } catch (error) {
        console.error("Could not get network info:", error);
    }
    
    res.json({ 
        status: isConnected ? 'ok' : 'error',
        network: networkInfo ? networkInfo.name : 'unknown',
        chainId: networkInfo ? networkInfo.chainId : 'unknown',
        timestamp: new Date().toISOString(),
        walletAddress: OWNER_ADDRESS,
        tokenBalance: tokenBalance ? ethers.utils.formatEther(tokenBalance) : 'unknown',
        rpcUrl: RPC_URLS[currentRpcIndex]
    });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Distribution server running on port ${PORT}`);
}); 