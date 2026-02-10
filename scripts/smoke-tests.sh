#!/bin/bash
# Smoke tests for Agent Provenance Hub
# Run this after deployment to verify all systems are working

set -e

API_BASE="${API_BASE:-https://gerundium.sicmundus.dev/api/hub/v1}"
COLOR_GREEN='\033[0;32m'
COLOR_RED='\033[0;31m'
COLOR_YELLOW='\033[1;33m'
COLOR_RESET='\033[0m'

echo -e "${COLOR_YELLOW}🔥 Running smoke tests for Agent Provenance Hub${COLOR_RESET}\n"

# Test counter
TOTAL=0
PASSED=0
FAILED=0

# Test function
run_test() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    
    TOTAL=$((TOTAL + 1))
    echo -n "Test $TOTAL: $name... "
    
    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" "${API_BASE}${endpoint}")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "${API_BASE}${endpoint}" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${COLOR_GREEN}✅ PASS${COLOR_RESET} (HTTP $http_code)"
        PASSED=$((PASSED + 1))
    else
        echo -e "${COLOR_RED}❌ FAIL${COLOR_RESET} (HTTP $http_code)"
        echo "Response: $body"
        FAILED=$((FAILED + 1))
    fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Core API Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"

# Test 1: Health check
run_test "Health Check" "GET" "/health"

# Test 2: Get trust score for non-existent agent (should 404)
run_test "Get Trust Score (404)" "GET" "/trust/github.com/nonexistent/agent"

# Test 3: Search agents (empty result is OK)
run_test "Search Agents" "GET" "/agents/search?q=test"

echo "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Frontend Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"

# Test 4: Frontend loads
run_test "Frontend Homepage" "GET" "/hub" "" "https://gerundium.sicmundus.dev/hub"

echo "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test Results"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"

echo -e "Total Tests: $TOTAL"
echo -e "${COLOR_GREEN}Passed: $PASSED${COLOR_RESET}"
if [ $FAILED -gt 0 ]; then
    echo -e "${COLOR_RED}Failed: $FAILED${COLOR_RESET}\n"
    exit 1
else
    echo -e "Failed: 0\n"
    echo -e "${COLOR_GREEN}✨ All smoke tests passed!${COLOR_RESET}\n"
    exit 0
fi
