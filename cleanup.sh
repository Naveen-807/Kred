#!/bin/bash

echo "🧹 OfflinePay Project Cleanup"
echo "=============================="
echo ""
echo "This will remove redundant files while preserving all essential code and documentation."
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Cleanup cancelled."
    exit 1
fi

echo ""
echo "🗑️  Removing redundant documentation..."

# Remove redundant documentation files
rm -f COMPONENT_TEST_RESULTS.md
rm -f FINAL_AUDIT.md
rm -f FINAL_IMPLEMENTATION_SUMMARY.md
rm -f FINAL_STATUS.md
rm -f FINAL_STEPS.md
rm -f HACKATHON_DEMO_PLAN.md
rm -f IMPLEMENTATION_COMPLETE.md
rm -f INVISIBLE_ONBOARDING.md
rm -f PYTH_IMPLEMENTATION_PLAN.md
rm -f PYTH_INTEGRATION_STATUS.md
rm -f QUICK_START.md
rm -f REAL_BLOCKCHAIN_IMPLEMENTATION.md
rm -f TWILIO_SETUP_GUIDE.md
rm -f YOU_ARE_READY.md
rm -f DEPLOYMENT.md

echo "✅ Removed 15 redundant documentation files"

echo ""
echo "🗑️  Removing redundant test files..."

# Remove basic test files (keep proof-of-work tests)
rm -f backend/test-otp.js
rm -f backend/test-payment-flow.js
rm -f backend/test-pyth-price.js
rm -f backend/test-pyth-simple.js
rm -f backend/test-twilio.js

echo "✅ Removed 5 basic test files"

echo ""
echo "🗑️  Removing temporary directories..."

# Remove temporary directories
rm -rf tmp_vincent_kit
rm -rf docs
rm -f test-payment-flow.sh

echo "✅ Removed temporary directories"

echo ""
echo "🗑️  Removing system files..."

# Remove system files
find . -name ".DS_Store" -type f -delete

echo "✅ Removed .DS_Store files"

echo ""
echo "=============================="
echo "✨ Cleanup Complete!"
echo "=============================="
echo ""
echo "📁 Kept Essential Files:"
echo "  ✅ README.md"
echo "  ✅ PRIZE_WINNING_SUMMARY.md"
echo "  ✅ VINCENT_DEFI_AUTOMATION.md"
echo "  ✅ PROOF_FOR_JUDGES.md"
echo "  ✅ DEPLOYMENT_STATUS.md"
echo "  ✅ SUBMISSION_CHECKLIST.md"
echo ""
echo "🧪 Kept Proof-of-Work Tests:"
echo "  ✅ test-complete-flow.js"
echo "  ✅ test-hedera.js"
echo "  ✅ test-hedera-transfer.js"
echo "  ✅ test-wallet.js"
echo ""
echo "📂 All source code preserved:"
echo "  ✅ backend/src/"
echo "  ✅ contracts/"
echo "  ✅ vincent-ability/"
echo "  ✅ ai-agent/"
echo ""
echo "🎉 Project is now clean and ready for submission!"
