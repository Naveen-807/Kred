#!/bin/bash

# OfflinePay Quick Setup Script
# This script helps you set up the project quickly

set -e

echo "🚀 OfflinePay Setup Script"
echo "=========================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}❌ pnpm is not installed${NC}"
    echo "Install it with: npm install -g pnpm"
    exit 1
fi

echo -e "${GREEN}✓ pnpm found${NC}"

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo -e "${YELLOW}⚠ MongoDB is not running${NC}"
    echo "Start it with: mongod --dbpath ~/data/db"
else
    echo -e "${GREEN}✓ MongoDB is running${NC}"
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
pnpm install

# Check for .env files
echo ""
echo "🔐 Checking environment configuration..."

if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}⚠ backend/.env not found${NC}"
    echo "Copying from .env.example..."
    cp backend/.env.example backend/.env
    echo -e "${RED}⚠ Please edit backend/.env with your actual credentials${NC}"
fi

if [ ! -f "vincent-ability/.env" ]; then
    echo -e "${YELLOW}⚠ vincent-ability/.env not found${NC}"
    echo "Copying from .env.example..."
    cp vincent-ability/.env.example vincent-ability/.env
    echo -e "${RED}⚠ Please edit vincent-ability/.env with your Pinata JWT${NC}"
fi

# Build contracts
echo ""
echo "🔨 Compiling smart contracts..."
cd contracts
pnpm install
npx hardhat compile
cd ..

echo -e "${GREEN}✓ Contracts compiled${NC}"

# Build Vincent abilities
echo ""
echo "🔨 Building Vincent abilities..."
cd vincent-ability
pnpm install
pnpm build
cd ..

echo -e "${GREEN}✓ Vincent abilities built${NC}"

# Build backend
echo ""
echo "🔨 Building backend..."
cd backend
pnpm install
cd ..

echo -e "${GREEN}✓ Backend ready${NC}"

# Summary
echo ""
echo "=========================="
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo "=========================="
echo ""
echo "Next steps:"
echo "1. Edit backend/.env with your credentials"
echo "2. Deploy SBT contract: cd contracts && npx hardhat run scripts/deployProofOfCommerce.ts --network hederaTestnet"
echo "3. Start backend: cd backend && pnpm dev"
echo "4. Configure SMS webhooks (see DEPLOYMENT.md)"
echo ""
echo "For detailed instructions, see DEPLOYMENT.md"
