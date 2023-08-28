// Import necessary modules from 'nostr-tools' library
import {
    generatePrivateKey,
    getPublicKey,
    nip04,
    relayInit,
    getEventHash,
    getSignature,
    nip19
} from 'nostr-tools'
import 'websocket-polyfill'
import 'dotenv/config'
import * as crypto from "crypto";

// Assign 'crypto' module to global object 'globalThis.crypto'
globalThis.crypto = crypto;

// Initialize a relay object by calling the 'relayInit' function and passing the WebSocket URL as a parameter
const relay = relayInit('wss://wallet.sats4.life/nostrrelay/mix')

// Register an event listener for the 'connect' event of the relay object
relay.on('connect', () => {
    console.log(`connected to ${relay.url}`)
})

// Register an event listener for the 'error' event of the relay object
relay.on('error', () => {
    console.log(`failed to connect to ${relay.url}`)
})

// Connect to the relay server by calling the 'connect' method of the relay object
await relay.connect()

// Managing the keys

// sender 
let senderPrivkey = process.env.SPRIV
let senderPubkey = getPublicKey(senderPrivkey)

// receiver 
let receiverPubkey = process.env.RPUB

// channel pubkey 
let channelPubkey = process.env.CHANPUB

// ephemeral sender key
let ephemeralPrivkey = generatePrivateKey()
let ephemeralPubkey = getPublicKey(ephemeralPrivkey)

// on the sender side
// Check if a message is provided as a command line argument
if (process.argv.length <= 2) {
    console.log("Please provide a message as a command line argument");
    process.exit(1);
}
  
  // Get the message from the command line argument
  const message = process.argv[2];
  
  // Print the received message
  console.log("Received message:", message);

// Encrypt the message using the 'nip04' module
let ciphertext1 = await nip04.encrypt(senderPrivkey, receiverPubkey, message)

// Create an event object kind 4
let stealth_event = {
    kind: 4,
    pubkey: senderPubkey,
    tags: [['p', receiverPubkey]],
    content: ciphertext1,
    created_at: Math.floor(Date.now() / 1000)
}

// Encrypt the stealth_event using the 'nip04' module
let ciphertext2 = await nip04.encrypt(senderPrivkey, receiverPubkey, JSON.stringify(stealth_event))

// Create an event object kind 1337
let event = {
    kind: 1337,
    pubkey: ephemeralPubkey,
    tags: [['p', channelPubkey]],
    content: ciphertext2,
    created_at: Math.floor(Date.now() / 1000)
}

// Sign the event using the 'getSignature' function
event.id = getEventHash(event)
event.sig = getSignature(event, ephemeralPrivkey)

// Publish the event using the 'publish' method of the relay object
let pub = relay.publish(event)
pub.on('ok', () => {
    console.log(`${relay.url} has accepted our event`)
})
pub.on('failed', reason => {
    console.log(`failed to publish to ${relay.url}: ${reason}`)
})

// Disconnect from the relay server by calling the 'close' method of the relay object
relay.close()


