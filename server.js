const express = require('express');
const multer = require('multer');
const { BlobServiceClient } = require('@azure/storage-blob');
const { DefaultAzureCredential } = require('@azure/identity'); // Import Managed Identity credentials
const { SecretClient } = require('@azure/keyvault-secrets'); // Import Key Vault client
require('dotenv').config();

const app = express();
const port = 3000;


const upload = multer({ storage: multer.memoryStorage() });


const credential = new DefaultAzureCredential(); 


const keyVaultName = process.env.KEY_VAULT_NAME; 
const kvUri = `https://todo-keyvault123456.vault.azure.net/`;
const secretClient = new SecretClient(kvUri, credential);


async function getConnectionString() {
    const secretName = process.env.AZURE_STORAGE_CONNECTION_STRING; 
    const secret = await secretClient.getSecret(secretName);
    return secret.value; 
}


let blobServiceClient = null;
const containerName = 'images'; 
let containerClient = null;

async function initializeAzureBlob() {
    const connectionString = await getConnectionString(); 
    blobServiceClient = BlobServiceClient.fromConnectionString(connectionString); 
    containerClient = blobServiceClient.getContainerClient(containerName);
    
    const createContainerResponse = await containerClient.createIfNotExists();
    if (createContainerResponse.succeeded) {
        console.log(`Container "${containerName}" is created`);
    }
}


app.post('/upload', upload.single('file'), async (req, res) => {
    const blobName = req.file.originalname;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    try {
        await blockBlobClient.uploadData(req.file.buffer, {
            blobHTTPHeaders: { blobContentType: req.file.mimetype }
        });
        res.status(200).send('File uploaded successfully');
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).send('File upload failed');
    }
});


app.listen(port, async () => {
    console.log(`Server running on http://localhost:${port}`);
    await initializeAzureBlob();
});
