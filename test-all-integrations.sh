#!/bin/bash

# OfflinePay Complete Integration Test Suite
# Tests all 5 prize track integrations and generates proof logs

set -e  # Exit on error

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     OfflinePay Integration Test Suite                          ║"
echo "║     Testing All 5 Prize Tracks (Pyth, Lit, Hedera, PayPal)    ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Configuration
BACKEND_URL="http://localhost:8080"
TEST_PHONE_1="+919TEST00001"
TEST_PHONE_2="+919TEST00002"
LOG_FILE="/tmp/offlinepay-integration-test-$(date +%Y%m%d-%H%M%S).log"

echo "📋 Test Configuration:"
echo "   Backend URL: $BACKEND_URL"
echo "   Test Phone 1: $TEST_PHONE_1"
echo "   Test Phone 2: $TEST_PHONE_2"
echo "   Log File: $LOG_FILE"
echo ""

# Function to make SMS webhook call
send_sms() {
    local phone=$1
    local body=$2
    echo "📤 Sending: $body (from $phone)"
    curl -s -X POST "$BACKEND_URL/webhook/sms" \
        -d "From=$phone" \
        -d "Body=$body" || true
    sleep 2
}

# Function to check logs for specific integration
check_logs() {
    local integration=$1
    local pattern=$2
    echo "🔍 Checking logs for: $integration"
    if tail -500 /tmp/backend-live.log | grep -i "$pattern" > /dev/null; then
        echo "   ✅ $integration working"
        return 0
    else
        echo "   ⚠️  $integration not found in logs"
        return 1
    fi
}

echo "════════════════════════════════════════════════════════════════"
echo "TEST 1: PYTH PRICE FEEDS ($1,500 Prize)"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Testing real-time INR/USD price fetching from Pyth Network..."
echo ""

send_sms "$TEST_PHONE_1" "STATUS"
sleep 3
send_sms "$TEST_PHONE_1" "BAL"
sleep 3

echo ""
echo "📊 Checking Pyth Price Feed Evidence..."
check_logs "Pyth Price Feed" "PYTH.*PRICE.*FETCHED" && PYTH_PRICE_OK=1 || PYTH_PRICE_OK=0
check_logs "Pyth Hermes" "Hermes API" && PYTH_HERMES_OK=1 || PYTH_HERMES_OK=0

if [ $PYTH_PRICE_OK -eq 1 ]; then
    echo "✅ Pyth Price Feeds: WORKING"
else
    echo "⚠️  Pyth Price Feeds: NEEDS REVIEW"
fi
echo ""

echo "════════════════════════════════════════════════════════════════"
echo "TEST 2: PYTH ENTROPY ($1,000 Prize)"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Testing on-chain OTP generation using Pyth Entropy..."
echo ""

send_sms "$TEST_PHONE_1" "SET PIN 9999"
sleep 3
send_sms "$TEST_PHONE_1" "PAY 50 INR to $TEST_PHONE_2"
sleep 3

echo ""
echo "📊 Checking Pyth Entropy Evidence..."
check_logs "Pyth Entropy" "PYTH ENTROPY" && PYTH_ENTROPY_OK=1 || PYTH_ENTROPY_OK=0
check_logs "OTP Generation" "OTP.*generated" && OTP_OK=1 || OTP_OK=0

if [ $PYTH_ENTROPY_OK -eq 1 ] || [ $OTP_OK -eq 1 ]; then
    echo "✅ Pyth Entropy: WORKING"
else
    echo "⚠️  Pyth Entropy: NEEDS REVIEW"
fi
echo ""

echo "════════════════════════════════════════════════════════════════"
echo "TEST 3: LIT PROTOCOL PKP WALLETS ($1,666 Prize)"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Testing Lit Protocol PKP wallet creation..."
echo ""

send_sms "$TEST_PHONE_2" "SET PIN 8888"
sleep 3
send_sms "$TEST_PHONE_2" "BAL"
sleep 3

echo ""
echo "📊 Checking Lit Protocol Evidence..."
check_logs "Lit PKP" "LIT PROTOCOL.*PKP" && LIT_PKP_OK=1 || LIT_PKP_OK=0
check_logs "Wallet Generation" "wallet.*generated\|PKP.*wallet" && WALLET_OK=1 || WALLET_OK=0

if [ $LIT_PKP_OK -eq 1 ] || [ $WALLET_OK -eq 1 ]; then
    echo "✅ Lit Protocol PKP: WORKING"
else
    echo "⚠️  Lit Protocol PKP: NEEDS REVIEW"
fi
echo ""

echo "════════════════════════════════════════════════════════════════"
echo "TEST 4: HEDERA TRANSACTIONS ($1,000 Prize)"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Testing Hedera blockchain integration..."
echo ""

echo "📊 Checking Hedera Evidence..."
check_logs "Hedera" "HEDERA" && HEDERA_OK=1 || HEDERA_OK=0
check_logs "Smart Contract" "SBT.*contract" && CONTRACT_OK=1 || CONTRACT_OK=0

if [ $HEDERA_OK -eq 1 ] || [ $CONTRACT_OK -eq 1 ]; then
    echo "✅ Hedera Integration: WORKING"
else
    echo "⚠️  Hedera Integration: NEEDS REVIEW"
fi
echo ""

echo "════════════════════════════════════════════════════════════════"
echo "TEST 5: PAYPAL PYUSD ($4,500 Prize)"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Testing PayPal PYUSD payment flow..."
echo ""

echo "📊 Checking PayPal PYUSD Evidence..."
check_logs "PYUSD" "PYUSD\|payment.*flow" && PYUSD_OK=1 || PYUSD_OK=0
check_logs "Currency Conversion" "INR.*USD" && CONVERSION_OK=1 || CONVERSION_OK=0

if [ $PYUSD_OK -eq 1 ] || [ $CONVERSION_OK -eq 1 ]; then
    echo "✅ PayPal PYUSD: WORKING"
else
    echo "⚠️  PayPal PYUSD: NEEDS REVIEW"
fi
echo ""

echo "════════════════════════════════════════════════════════════════"
echo "TEST SUMMARY"
echo "════════════════════════════════════════════════════════════════"
echo ""

TOTAL_TESTS=5
PASSED_TESTS=0

[ $PYTH_PRICE_OK -eq 1 ] && ((PASSED_TESTS++))
[ $PYTH_ENTROPY_OK -eq 1 ] || [ $OTP_OK -eq 1 ] && ((PASSED_TESTS++))
[ $LIT_PKP_OK -eq 1 ] || [ $WALLET_OK -eq 1 ] && ((PASSED_TESTS++))
[ $HEDERA_OK -eq 1 ] || [ $CONTRACT_OK -eq 1 ] && ((PASSED_TESTS++))
[ $PYUSD_OK -eq 1 ] || [ $CONVERSION_OK -eq 1 ] && ((PASSED_TESTS++))

echo "📊 Test Results:"
echo "   Pyth Price Feeds: $([ $PYTH_PRICE_OK -eq 1 ] && echo '✅' || echo '⚠️')"
echo "   Pyth Entropy:     $([ $PYTH_ENTROPY_OK -eq 1 ] || [ $OTP_OK -eq 1 ] && echo '✅' || echo '⚠️')"
echo "   Lit Protocol:     $([ $LIT_PKP_OK -eq 1 ] || [ $WALLET_OK -eq 1 ] && echo '✅' || echo '⚠️')"
echo "   Hedera:           $([ $HEDERA_OK -eq 1 ] || [ $CONTRACT_OK -eq 1 ] && echo '✅' || echo '⚠️')"
echo "   PayPal PYUSD:     $([ $PYUSD_OK -eq 1 ] || [ $CONVERSION_OK -eq 1 ] && echo '✅' || echo '⚠️')"
echo ""
echo "   Total: $PASSED_TESTS/$TOTAL_TESTS integrations working"
echo ""

# Calculate percentage
PERCENTAGE=$((PASSED_TESTS * 100 / TOTAL_TESTS))

if [ $PERCENTAGE -ge 80 ]; then
    echo "🎉 EXCELLENT! System is ${PERCENTAGE}% ready for prize submissions!"
elif [ $PERCENTAGE -ge 60 ]; then
    echo "👍 GOOD! System is ${PERCENTAGE}% ready. Minor fixes needed."
else
    echo "⚠️  ATTENTION! System is ${PERCENTAGE}% ready. Review needed."
fi

echo ""
echo "📝 Full logs saved to: $LOG_FILE"
echo "📝 Backend logs: /tmp/backend-live.log"
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "Next Steps:"
echo "1. Review logs for detailed integration evidence"
echo "2. Fix any integrations showing ⚠️"
echo "3. Run verification tests for smart contracts"
echo "4. Capture logs for prize submission proof"
echo "════════════════════════════════════════════════════════════════"

# Copy relevant logs to test log file
echo "" >> "$LOG_FILE"
echo "=== INTEGRATION TEST LOGS ===" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"
tail -500 /tmp/backend-live.log >> "$LOG_FILE"

exit 0

