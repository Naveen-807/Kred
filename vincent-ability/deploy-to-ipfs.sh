#!/bin/bash

echo "🚀 Deploying Vincent Ability to IPFS"
echo "===================================="
echo ""

# Check if dist directory exists
if [ ! -d "dist" ]; then
    echo "❌ Error: dist/ directory not found"
    echo "Run 'pnpm build' first"
    exit 1
fi

# Check if ability files exist
if [ ! -f "dist/AaveWithdrawAndSend.js" ]; then
    echo "❌ Error: AaveWithdrawAndSend.js not found in dist/"
    exit 1
fi

echo "📦 Files to deploy:"
ls -lh dist/
echo ""

# Option 1: Using IPFS CLI (if installed)
if command -v ipfs &> /dev/null; then
    echo "📤 Uploading to IPFS using IPFS CLI..."
    
    # Add the entire dist directory
    IPFS_HASH=$(ipfs add -r dist/ | tail -1 | awk '{print $2}')
    
    echo "✅ Uploaded to IPFS!"
    echo "📍 IPFS Hash: $IPFS_HASH"
    echo "🌐 Gateway URL: https://ipfs.io/ipfs/$IPFS_HASH"
    echo ""
    echo "📝 Add this to your .env:"
    echo "VINCENT_ABILITY_IPFS_HASH=$IPFS_HASH"
    echo ""
    
else
    echo "⚠️  IPFS CLI not installed"
    echo ""
    echo "📋 Manual deployment options:"
    echo ""
    echo "Option 1: Use Pinata (https://pinata.cloud)"
    echo "  1. Create account at https://app.pinata.cloud"
    echo "  2. Upload dist/ folder"
    echo "  3. Copy CID"
    echo ""
    echo "Option 2: Use NFT.Storage (https://nft.storage)"
    echo "  1. Create account at https://nft.storage"
    echo "  2. Upload dist/ folder"
    echo "  3. Copy CID"
    echo ""
    echo "Option 3: Use Web3.Storage (https://web3.storage)"
    echo "  1. Create account at https://web3.storage"
    echo "  2. Upload dist/ folder"
    echo "  3. Copy CID"
    echo ""
    echo "Option 4: Install IPFS CLI"
    echo "  brew install ipfs"
    echo "  ipfs init"
    echo "  ipfs daemon &"
    echo "  ./deploy-to-ipfs.sh"
    echo ""
fi

echo "🎯 Next steps:"
echo "1. Copy the IPFS hash/CID"
echo "2. Register at https://vincent.lit.dev/register"
echo "3. Use App ID: 6195215305"
echo "4. Provide IPFS hash for your ability"
echo "5. Update .env with ability IDs"
echo ""
echo "✅ Done!"
