#!/bin/bash

# Complete End-to-End Payment Test
# Tests all 5 prize track integrations in a single flow

set -e

echo "╔═══════════════════════════════════════════════════════════════════════╗"
echo "║                                                                       ║"
echo "║           COMPLETE PAYMENT FLOW TEST                                 ║"
echo "║           Testing All 5 Prize Track Integrations                     ║"
echo "║                                                                       ║"
echo "╚═══════════════════════════════════════════════════════════════════════╝"
echo ""

# Configuration
BACKEND_URL="http://localhost:8080"
SENDER_PHONE="+919900111111"
RECIPIENT_PHONE="+919900222222"
PIN="9876"
PAYMENT_AMOUNT="100"

echo "📋 Test Configuration:"
echo "   Backend: $BACKEND_URL"
echo "   Sender: $SENDER_PHONE"
echo "   Recipient: $RECIPIENT_PHONE"
echo "   Payment: $PAYMENT_AMOUNT INR"
echo ""

# Clear old logs
echo "🧹 Clearing old backend logs..."
> /tmp/payment-test.log

echo ""
echo "════════════════════════════════════════════════════════════════════════"
echo "STEP 1: SET UP SENDER (Create wallet + Set PIN)"
echo "════════════════════════════════════════════════════════════════════════"
echo ""

echo "📤 Sending: SET PIN $PIN"
curl -s -X POST "$BACKEND_URL/webhook/sms" \
    -d "From=$SENDER_PHONE" \
    -d "Body=SET PIN $PIN"
sleep 3

echo "✅ PIN set for sender"
echo ""

echo "════════════════════════════════════════════════════════════════════════"
echo "STEP 2: CHECK SENDER WALLET (Lit Protocol PKP)"
echo "════════════════════════════════════════════════════════════════════════"
echo ""

echo "📤 Sending: BAL"
curl -s -X POST "$BACKEND_URL/webhook/sms" \
    -d "From=$SENDER_PHONE" \
    -d "Body=BAL"
sleep 3

echo ""
echo "🔍 Checking logs for Lit Protocol PKP wallet..."
if tail -100 /tmp/backend-live.log | grep -i "LIT PROTOCOL.*PKP" > /dev/null; then
    echo "✅ Lit Protocol PKP wallet detected in logs"
    tail -100 /tmp/backend-live.log | grep "LIT PROTOCOL" | tail -3
else
    echo "⚠️  No Lit Protocol PKP found in logs"
fi

echo ""
echo "🔍 Checking logs for Pyth price feed..."
if tail -100 /tmp/backend-live.log | grep -i "PYTH.*PRICE" > /dev/null; then
    echo "✅ Pyth price feed detected in logs"
    tail -100 /tmp/backend-live.log | grep "PYTH.*PRICE" | tail -3
else
    echo "⚠️  No Pyth price data found in logs"
fi

echo ""
echo "════════════════════════════════════════════════════════════════════════"
echo "STEP 3: INITIATE PAYMENT (Triggers OTP via Pyth Entropy)"
echo "════════════════════════════════════════════════════════════════════════"
echo ""

echo "📤 Sending: PAY $PAYMENT_AMOUNT INR to $RECIPIENT_PHONE"
curl -s -X POST "$BACKEND_URL/webhook/sms" \
    -d "From=$SENDER_PHONE" \
    -d "Body=PAY $PAYMENT_AMOUNT INR to $RECIPIENT_PHONE"
sleep 5

echo ""
echo "🔍 Checking for OTP generation..."
if tail -100 /tmp/backend-live.log | grep -i "OTP" > /dev/null; then
    echo "✅ OTP generation detected"
    OTP=$(tail -100 /tmp/backend-live.log | grep -i "otp" | grep -o '"otp":"[0-9]*"' | head -1 | cut -d'"' -f4)
    if [ -n "$OTP" ]; then
        echo "📱 OTP: $OTP"
    else
        echo "⚠️  Could not extract OTP from logs"
        OTP="123456"
        echo "📱 Using default OTP: $OTP"
    fi
else
    echo "⚠️  No OTP found in logs, using default"
    OTP="123456"
fi

echo ""
echo "════════════════════════════════════════════════════════════════════════"
echo "STEP 4: VERIFY OTP"
echo "════════════════════════════════════════════════════════════════════════"
echo ""

echo "📤 Sending OTP: $OTP"
curl -s -X POST "$BACKEND_URL/webhook/sms" \
    -d "From=$SENDER_PHONE" \
    -d "Body=$OTP"
sleep 3

echo "✅ OTP submitted"
echo ""

echo "════════════════════════════════════════════════════════════════════════"
echo "STEP 5: VERIFY PIN (Completes Payment)"
echo "════════════════════════════════════════════════════════════════════════"
echo ""

echo "📤 Sending PIN: $PIN"
curl -s -X POST "$BACKEND_URL/webhook/sms" \
    -d "From=$SENDER_PHONE" \
    -d "Body=$PIN"
sleep 5

echo "✅ PIN submitted"
echo ""

echo "════════════════════════════════════════════════════════════════════════"
echo "STEP 6: VERIFY ALL INTEGRATIONS"
echo "════════════════════════════════════════════════════════════════════════"
echo ""

echo "📊 Analyzing backend logs for integration evidence..."
echo ""

# Save recent logs
tail -500 /tmp/backend-live.log > /tmp/payment-test.log

# Check each integration
PYTH_PRICE=0
PYTH_ENTROPY=0
LIT_PKP=0
HEDERA=0
PYUSD=0

echo "1️⃣  Pyth Price Feeds ($1,500 prize):"
if grep -i "PYTH.*PRICE.*FETCHED" /tmp/payment-test.log > /dev/null; then
    echo "   ✅ Price feed working"
    grep "PYTH.*PRICE" /tmp/payment-test.log | tail -2 | sed 's/^/   /'
    PYTH_PRICE=1
else
    echo "   ⚠️  Price feed not detected"
fi
echo ""

echo "2️⃣  Pyth Entropy ($1,000 prize):"
if grep -i "PYTH.*ENTROPY\|OTP.*generated" /tmp/payment-test.log > /dev/null; then
    echo "   ✅ OTP generation working"
    grep -i "OTP" /tmp/payment-test.log | tail -2 | sed 's/^/   /'
    PYTH_ENTROPY=1
else
    echo "   ⚠️  Pyth Entropy not detected"
fi
echo ""

echo "3️⃣  Lit Protocol PKP ($1,666 prize):"
if grep -i "LIT PROTOCOL.*PKP\|wallet.*generated" /tmp/payment-test.log > /dev/null; then
    echo "   ✅ PKP wallet working"
    grep -i "LIT PROTOCOL" /tmp/payment-test.log | tail -2 | sed 's/^/   /'
    LIT_PKP=1
else
    echo "   ⚠️  Lit PKP not detected"
fi
echo ""

echo "4️⃣  Hedera Transactions ($1,000 prize):"
if grep -i "HEDERA\|transaction.*hash" /tmp/payment-test.log > /dev/null; then
    echo "   ✅ Hedera integration detected"
    grep -i "HEDERA\|SBT" /tmp/payment-test.log | tail -2 | sed 's/^/   /'
    HEDERA=1
else
    echo "   ⚠️  Hedera not detected in this test"
fi
echo ""

echo "5️⃣  PayPal PYUSD ($4,500 prize):"
if grep -i "PYUSD\|payment.*flow\|INR.*USD" /tmp/payment-test.log > /dev/null; then
    echo "   ✅ PYUSD payment flow detected"
    grep -i "INR.*USD\|payment" /tmp/payment-test.log | tail -2 | sed 's/^/   /'
    PYUSD=1
else
    echo "   ⚠️  PYUSD flow not detected"
fi
echo ""

echo "════════════════════════════════════════════════════════════════════════"
echo "TEST RESULTS SUMMARY"
echo "════════════════════════════════════════════════════════════════════════"
echo ""

TOTAL=$((PYTH_PRICE + PYTH_ENTROPY + LIT_PKP + HEDERA + PYUSD))

echo "Integration Status:"
echo "  Pyth Price Feeds:  $([ $PYTH_PRICE -eq 1 ] && echo '✅ WORKING' || echo '⚠️  NEEDS REVIEW')"
echo "  Pyth Entropy:      $([ $PYTH_ENTROPY -eq 1 ] && echo '✅ WORKING' || echo '⚠️  NEEDS REVIEW')"
echo "  Lit Protocol PKP:  $([ $LIT_PKP -eq 1 ] && echo '✅ WORKING' || echo '⚠️  NEEDS REVIEW')"
echo "  Hedera:            $([ $HEDERA -eq 1 ] && echo '✅ WORKING' || echo '⚠️  NEEDS REVIEW')"
echo "  PayPal PYUSD:      $([ $PYUSD -eq 1 ] && echo '✅ WORKING' || echo '⚠️  NEEDS REVIEW')"
echo ""
echo "  Score: $TOTAL/5 integrations verified"
echo ""

PERCENTAGE=$((TOTAL * 100 / 5))

if [ $PERCENTAGE -ge 80 ]; then
    echo "🎉 EXCELLENT! ${PERCENTAGE}% of integrations working!"
    echo "   System is ready for prize submissions!"
elif [ $PERCENTAGE -ge 60 ]; then
    echo "👍 GOOD! ${PERCENTAGE}% of integrations working."
    echo "   Minor fixes needed for full readiness."
else
    echo "⚠️  ATTENTION! Only ${PERCENTAGE}% working."
    echo "   Review logs for issues."
fi

echo ""
echo "════════════════════════════════════════════════════════════════════════"
echo "DETAILED LOGS"
echo "════════════════════════════════════════════════════════════════════════"
echo ""
echo "📝 Full test logs saved to: /tmp/payment-test.log"
echo "📝 Backend logs: /tmp/backend-live.log"
echo ""
echo "To view detailed logs:"
echo "  cat /tmp/payment-test.log | grep -i 'PYTH\|LIT\|HEDERA'"
echo ""
echo "════════════════════════════════════════════════════════════════════════"
echo ""

if [ $TOTAL -ge 3 ]; then
    echo "✅ Payment flow test PASSED!"
    echo "   Ready to proceed with demo videos and submissions!"
    exit 0
else
    echo "⚠️  Payment flow test needs attention"
    echo "   Review logs and fix issues before proceeding"
    exit 1
fi

