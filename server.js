const express = require('express');
const multer = require('multer');
const { BlobServiceClient } = require('@azure/storage-blob');
require('dotenv').config();

const app = express();
const port = 3000;

// Set up multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Connect to Azure Blob Storage
const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
const containerName = 'images'; // Replace with your container name
let containerClient = null;

async function initializeAzureBlob() {
    containerClient = blobServiceClient.getContainerClient(containerName);
    const createContainerResponse = await containerClient.createIfNotExists();
    if (createContainerResponse.succeeded) {
        console.log(`Container "${containerName}" is created`);
    }
}

// Route for file upload
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

// Start the server and initialize Azure Blob
app.listen(port, async () => {
    console.log(`Server running on http://localhost:${port}`);
    await initializeAzureBlob();
});
