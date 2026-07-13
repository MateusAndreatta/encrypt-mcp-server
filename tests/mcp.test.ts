import { describe, it, after, before } from "node:test";
import assert from "node:assert";
import { Client } from "@modelcontextprotocol/sdk/client";
import { createTestClient } from "./helpers.ts";

async function encryptMessage(client: Client, message: string, encryptionKey: string){
    const result = await client.callTool({
        name: 'encrypt_message',
        arguments: {
            message,
            encryptionKey
        }
    }) as unknown as { structuredContent: { encryptedMessage: string } };

    return result;
}

async function decryptMessage(client: Client, encryptedMessage: string, encryptionKey: string){
    const result = await client.callTool({
        name: 'decrypt_message',
        arguments: {
            encryptedMessage,
            encryptionKey
        }
    }) as unknown as { structuredContent: { decryptedMessage: string } };

    return result;
}


describe("MCP Tool Tests", () => {
    let client: Client;
    let encryptionKey = "my-secret-passphrase";
    before(async () => {
        client = await createTestClient();
    })

    after(async () => {
        await client.close();
    });

    it("should encrypt a message", async () => {
        const message = "Hello, World!";
        const result = await encryptMessage(client, message, encryptionKey);
        console.log("Encrypted message:", result.structuredContent.encryptedMessage);
        assert.ok(result.structuredContent.encryptedMessage.length > 60,
                  "Encrypted message should be present in the result");
    })

    it("should decrypt a message", async () => {
        const message = "Hello, World!";
        const key = "my-secret-passphrase-2";
        const { structuredContent: { encryptedMessage } } = await encryptMessage(client, message, encryptionKey);
        console.log("-- Encrypted message:", encryptedMessage);
        const result = await decryptMessage(client, encryptedMessage, encryptionKey);
        console.log("-- Decrypted message:", result.structuredContent.decryptedMessage);

        assert.deepStrictEqual(
            result.structuredContent.decryptedMessage,
            message,
            "Decrypted message should match the original message"
        )
    })

    it("should list the encryption://info resource", async () => {
        const { resources } = await client.listResources()
        const info = resources.find(item => item.uri === "encryption://info");

        assert.ok(info, "encryption://info resource should be present");
    })

    it("should return the encrypt_message_prompt", async () => {
        const result = await client.getPrompt( {
            name: "encrypt_message_prompt",
            arguments: {
                encryptedMessage: "Hello, World!",
                encryptionKey: "my-secret-passphrase"
            }
        })
        const item = result.messages.at(0)?.content as unknown as { type: "text", text: string };
        assert.ok(
            item.text.includes("encrypt_message"),
            "Prompt should contain the encrypt_message tool"
        );
    })

})