# RentCoin Relayer Service

This service enables gasless transactions for the RentCoin token claiming process. Users can claim their tokens without needing ETH for gas fees.

## Setup

1. Install dependencies:
```bash
cd backend
npm install express ethers cors dotenv
```

2. Create a `.env` file with the following variables:
```env
# Relayer wallet private key (NEVER commit this to git)
RELAYER_PRIVATE_KEY=your_private_key_here

# Sepolia RPC URL (you can use a provider like Infura or Alchemy)
RPC_URL=https://rpc.sepolia.org

# Server port
PORT=3001
```

3. Fund the relayer wallet:
- The relayer wallet needs Sepolia ETH to pay for gas fees
- Get Sepolia ETH from a faucet like https://sepoliafaucet.com
- Send enough ETH to cover gas fees for multiple transactions

4. Start the server:
```bash
npm start
```

## Security Considerations

1. Private Key Security:
- NEVER commit the `.env` file to git
- Keep the relayer's private key secure
- Consider using a hardware wallet or secure key management service in production

2. Rate Limiting:
- Implement rate limiting to prevent abuse
- Monitor the relayer's ETH balance
- Set up alerts for low balance

3. Signature Verification:
- The service verifies user signatures before processing transactions
- Only processes transactions for valid signatures
- Prevents unauthorized claims

## Architecture

1. Frontend Flow:
- User makes PayPal payment
- Frontend creates a message containing user address and token amount
- User signs the message with their wallet
- Frontend sends signed message to relayer

2. Relayer Flow:
- Verifies the signature
- Executes the claim transaction using its own ETH
- Returns transaction hash to frontend

3. Smart Contract:
- Contract must trust the relayer address
- Uses EIP-2771 for meta-transactions
- Validates the original user's signature

## Monitoring

Monitor these aspects of the relayer:
1. ETH balance - ensure sufficient funds for gas
2. Server health - use the /health endpoint
3. Failed transactions - check logs for errors
4. Response times - ensure good performance

## Production Deployment

For production:
1. Use a secure hosting provider
2. Set up SSL/TLS
3. Implement proper monitoring
4. Use a production-grade database
5. Set up automated backups
6. Use proper key management
7. Implement rate limiting
8. Set up alerting for issues 