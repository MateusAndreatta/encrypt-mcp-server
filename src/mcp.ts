import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v3";
import { decrypt , encrypt } from "./service.ts";

export const server = new McpServer({
    name: "@mateusandreatta/encrypt-mcp-server",
    version: "0.0.1",
})

server.registerTool(
    'encrypt_message',
    {
        description: 'Encrypts a message using a passphrase',
        inputSchema: {
            message: z.string().describe('The message to encrypt'),
            encryptionKey: z.string().describe('The passphrase to use for encryption'),
        },
        outputSchema: {
            encryptedMessage: z.string().describe('The encrypted message'),
        }
    },
    async ({ message, encryptionKey }) => {
        try {
            const encryptedMessage = encrypt(message, encryptionKey);
            return {
                content: [{ type: "text", text: encryptedMessage }],
                structuredContent: { encryptedMessage }
            }
        } catch (error) {
            // default struct to mcps error return
            return {
                isError: true,
                context: [{
                    type: 'text',
                    text: `Error encrypting message: ${error instanceof Error ? error.message : String(error)}`,
                }]
            }
        }
    }
)

server.registerTool(
    'decrypt_message',
    {
        description: 'Decrypts a message that was encrypted using encrypt_message tool',
        inputSchema: {
            encryptedMessage: z.string().describe('The encrypted message to decrypt'),
            encryptionKey: z.string().describe('The passphrase to use for decryption'),
        },
        outputSchema: {
            decryptedMessage: z.string().describe('The decrypted message'),
        }
    },
    async ( {encryptedMessage, encryptionKey} ) => {

        try{
            const decryptedMessage = decrypt(encryptedMessage, encryptionKey);
            return {
                content: [{ type: "text", text: decryptedMessage }],
                structuredContent: { decryptedMessage }
            }
        } catch (error) {
            return {
                isError: true,
                context: [{
                    type: 'text',
                    text: `Error decrypting message: ${error instanceof Error ? error.message : String(error)}`,
                }]
            }
        }
    }
)

server.registerResource(
    'encryption://info', // name
    'encryption://info', // template uri
    {
        description: 'Describes the encryption algorithm, key requirements, and output format used by this server',
    },
    () => ({
        contents: [
            {
                uri: "encryption://info",
                mimeType: "text/plain",
                text: `
Algorithm : AES-256-CBC
Key derivation: scrypt (passphrase + fixed server salt → 32-byte key)
Output format: <16-byte IV in hex>:<ciphertext in hex>  (separated by ":")
Notes:
  - Users pass any passphrase — the server derives a strong 32-byte key automatically using scrypt.
  - A random IV is generated for every encryption — the same message encrypted twice will produce different output.
  - Use the exact same passphrase to decrypt.
  - Keep the full "iv:ciphertext" string to decrypt later.
                `.trim(),
            },
        ]
    })
)

server.registerPrompt(
    "encrypt_message_prompt",
    {
        description: "Prompt to encrypt a plain-text message using the encrypt_message tool",
        argsSchema: {
            encryptedMessage: z.string().describe('The encrypted message to decrypt'),
            encryptionKey: z.string().describe('The passphrase to use for decryption'),
        }
    },
    ({ encryptedMessage, encryptionKey }) => ({
        messages: [
            {
                role: 'user',
                content: {
                    type: "text",
                    text: `Please encrypt the following message using the encrypt_message tool.\nMessage: ${encryptedMessage}\nEncryption key: ${encryptionKey}`,
                }
            }
        ]
    })
)