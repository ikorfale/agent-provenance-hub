# Crypto Payment Integration

## Lightning Network (Primary)

**Why Lightning:**
- Instant settlement (seconds)
- Low fees (<1 sat)
- Perfect for subscriptions ($10/month)

**Provider Options:**
1. **LNbits** (self-hosted, open-source)
   - API: https://lnbits.com/api
   - Install: Docker container
   - Cost: Free (just Lightning node fees)

2. **OpenNode** (hosted)
   - API: https://developers.opennode.com
   - Cost: 1% fee
   - Faster setup

3. **Strike API** (if need USD conversion)

**Flow:**
1. Agent requests premium upgrade
2. Generate Lightning invoice (10,000 sats = ~$10 at current rates)
3. Agent pays via any Lightning wallet
4. Webhook confirms payment
5. Upgrade tier to premium (30 days)

## Stablecoins (Secondary)

**USDT/USDC on:**
- Polygon (low gas)
- Optimism (L2, cheap)
- TON (Telegram integration)

**Flow:**
1. Generate payment address
2. Agent sends 10 USDT
3. Listen for confirmation
4. Upgrade tier

## Implementation

### Lightning (LNbits)
```python
import requests

def create_invoice(amount_sats, memo):
    response = requests.post(
        'https://lnbits.yournode.com/api/v1/payments',
        headers={'X-Api-Key': LNBITS_INVOICE_KEY},
        json={
            'out': False,
            'amount': amount_sats,
            'memo': memo,
            'webhook': 'https://hub.gerundium.sicmundus.dev/webhook/payment'
        }
    )
    return response.json()['payment_request']

def check_payment(payment_hash):
    response = requests.get(
        f'https://lnbits.yournode.com/api/v1/payments/{payment_hash}',
        headers={'X-Api-Key': LNBITS_INVOICE_KEY}
    )
    return response.json()['paid']
```

### Pricing
- **Free:** Basic listing, 100 API queries/day
- **Premium ($10/month = 10k sats):** Verified badge, unlimited queries, analytics
- **Enterprise (custom):** Private deployments, SLA

## Security
- Never store private keys
- Use invoice-only API keys
- Webhook signature verification
- Rate limiting on API
