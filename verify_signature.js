import crypto from 'node:crypto';

// The signature you received in the header
const receivedSignature = 'f3e34a69fdfa47b8c633099e940c50507ad1e9c1950d97dfd18e2f8ced4f05d2';

// The payload you received (cleaned up from terminal output)
// Note: This must be EXACTLY the string that was signed.
// If your wbhk.js receives the raw body as a string, use that.
// If it receives a parsed JSON object, JSON.stringify(body) is used.
const payloadObject = {
  "ip": "::ffff:172.19.0.1",
  "data": {
    "id": "yhal19kgdywp",
    "name": null,
    "avatar": null,
    "profile": {},
    "username": null,
    "createdAt": 1768681892552,
    "updatedAt": 1768681892552,
    "customData": {},
    "identities": {},
    "hasPassword": true,
    "isSuspended": false,
    "lastSignInAt": null,
    "primaryEmail": "miguelangarano@gmail.com",
    "primaryPhone": null,
    "applicationId": null
  },
  "path": "/users",
  "event": "User.Created",
  "hookId": "a101nkted3er2xiyxo7m8",
  "method": "POST",
  "params": {},
  "status": 200,
  "createdAt": "2026-01-17T20:31:32.574Z",
  "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:145.0) Gecko/20100101 Firefox/145.0",
  "matchedRoute": "/users"
};

// Get the signing key from command line argument
const signingKey = process.argv[2];

if (!signingKey) {
  console.error('Please provide the signing key as an argument.');
  console.error('Usage: node verify_signature.js <YOUR_SIGNING_KEY>');
  process.exit(1);
}

// Re-calculate signature
const hmac = crypto.createHmac('sha256', signingKey);
const payloadString = JSON.stringify(payloadObject);
hmac.update(payloadString);
const calculatedSignature = hmac.digest('hex');

console.log('Payload string used for signature:', payloadString);
console.log('--------------------------------------------------');
console.log('Received Signature:  ', receivedSignature);
console.log('Calculated Signature:', calculatedSignature);
console.log('--------------------------------------------------');

if (receivedSignature === calculatedSignature) {
  console.log('✅ Signature is VALID');
} else {
  console.log('❌ Signature is INVALID');
}
