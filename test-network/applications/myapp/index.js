const express = require('express');
const bodyParser = require('body-parser');
const grpc = require('@grpc/grpc-js');
const { connect, hash, signers } = require('@hyperledger/fabric-gateway');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { TextDecoder } = require('util');

const app = express();
const port = 3000;

app.use(bodyParser.json());

const channelName = 'mychannel';
const chaincodeName = 'basic';
const mspId = 'Org1MSP';

// Path to crypto materials
const cryptoPath = path.resolve(
    __dirname,
    '..',
    '..',
    '..',
    'test-network',
    'organizations',
    'peerOrganizations',
    'org1.example.com'
);


const keyDirectoryPath = path.resolve(cryptoPath, 'users', 'User1@org1.example.com', 'msp', 'keystore');
const certDirectoryPath = path.resolve(cryptoPath, 'users', 'User1@org1.example.com', 'msp', 'signcerts');
const tlsCertPath = path.resolve(cryptoPath, 'peers', 'peer0.org1.example.com', 'tls', 'ca.crt');
const peerEndpoint = 'localhost:7051';
const peerHostAlias = 'peer0.org1.example.com';

const utf8Decoder = new TextDecoder();

async function newGrpcConnection() {
    const tlsRootCert = await fs.readFile(tlsCertPath);
    const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
    return new grpc.Client(peerEndpoint, tlsCredentials, {
        'grpc.ssl_target_name_override': peerHostAlias,
    });
}

async function newIdentity() {
    const certPath = (await fs.readdir(certDirectoryPath))[0];
    const credentials = await fs.readFile(path.join(certDirectoryPath, certPath));
    return { mspId, credentials };
}

async function newSigner() {
    const keyPath = (await fs.readdir(keyDirectoryPath))[0];
    const privateKeyPem = await fs.readFile(path.join(keyDirectoryPath, keyPath));
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    return signers.newPrivateKeySigner(privateKey);
}

async function getContract() {
    const client = await newGrpcConnection();
    const gateway = connect({
        client,
        identity: await newIdentity(),
        signer: await newSigner(),
        hash: hash.sha256,
    });

    const network = gateway.getNetwork(channelName);
    return network.getContract(chaincodeName);
}

// API Endpoints

app.post('/initLedger', async (req, res) => {
    try {
        const contract = await getContract();
        await contract.submitTransaction('InitLedger');
        res.json({ message: 'Ledger initialized successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/getAllAssets', async (req, res) => {
    try {
        const contract = await getContract();
        const resultBytes = await contract.evaluateTransaction('GetAllAssets');
        const result = JSON.parse(utf8Decoder.decode(resultBytes));
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/createAsset', async (req, res) => {
    try {
        const { id, color, size, owner, value } = req.body;
        const contract = await getContract();
        await contract.submitTransaction('CreateAsset', id, color, size, owner, value);
        res.json({ message: `Asset ${id} created successfully` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/transferAsset', async (req, res) => {
    try {
        const { id, newOwner } = req.body;
        const contract = await getContract();
        const commit = await contract.submitAsync('TransferAsset', { arguments: [id, newOwner] });
        const oldOwner = utf8Decoder.decode(commit.getResult());

        const status = await commit.getStatus();
        if (!status.successful) {
            throw new Error(`Transaction ${status.transactionId} failed`);
        }

        res.json({ message: `Asset ${id} transferred from ${oldOwner} to ${newOwner}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/readAsset/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const contract = await getContract();
        const resultBytes = await contract.evaluateTransaction('ReadAsset', id);
        const result = JSON.parse(utf8Decoder.decode(resultBytes));
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/updateAsset', async (req, res) => {
    try {
        const { id, color, size, owner, value } = req.body;
        const contract = await getContract();
        await contract.submitTransaction('UpdateAsset', id, color, size, owner, value);
        res.json({ message: `Asset ${id} updated successfully` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

// const express = require('express');
// const { Gateway, Wallets } = require('fabric-network');
// const FabricCAServices = require('fabric-ca-client');
// const path = require('path');
// const fs = require('fs');

// const app = express();
// app.use(express.json());

// const channelName = 'mychannel';
// const chaincodeName = 'abac';
// const mspOrg1 = 'Org1MSP';
// const walletPath = path.join(__dirname, 'wallet');
// const org1UserId = 'reguser2';

// // Helper function to create a Fabric Gateway connection
// async function connectToFabric() {
//     try {
//         // Load the network configuration
//         const ccpPath = path.resolve(__dirname, 'connection-org1.json');
//         const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

//         // Create a new wallet for managing identities
//         const wallet = await Wallets.newFileSystemWallet(walletPath);

//         // Create a new gateway instance
//         const gateway = new Gateway();
        
//         await gateway.connect(ccp, {
//             wallet,
//             identity: org1UserId,
//             discovery: { enabled: true, asLocalhost: true }
//         });

//         // Get the network and contract
//         const network = await gateway.getNetwork(channelName);
//         const contract = network.getContract(chaincodeName);

//         return { gateway, contract };
//     } catch (error) {
//         throw new Error(`Failed to connect to Fabric: ${error}`);
//     }
// }


// app.post('/initLedger', async (req, res) => {
//     try {
//         const contract = await getContract();
//         await contract.submitTransaction('InitLedger');
//         res.json({ message: 'Ledger initialized successfully' });
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// });

// // Create a new asset
// app.post('/assets', async (req, res) => {
//     try {
//         const { id, color, size, appraisedValue } = req.body;
//         const { gateway, contract } = await connectToFabric();

//         await contract.submitTransaction(
//             'CreateAsset',
//             id,
//             color,
//             size.toString(),
//             appraisedValue.toString()
//         );

//         gateway.disconnect();
//         res.status(201).json({ message: `Asset ${id} has been created` });
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// });

// // Read an asset
// app.get('/assets/:id', async (req, res) => {
//     try {
//         const { gateway, contract } = await connectToFabric();
//         const result = await contract.evaluateTransaction(
//             'ReadAsset',
//             req.params.id
//         );
        
//         gateway.disconnect();
//         res.json(JSON.parse(result.toString()));
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// });

// // Update an asset
// app.put('/assets/:id', async (req, res) => {
//     try {
//         const { color, size, appraisedValue } = req.body;
//         const { gateway, contract } = await connectToFabric();

//         await contract.submitTransaction(
//             'UpdateAsset',
//             req.params.id,
//             color,
//             size.toString(),
//             appraisedValue.toString()
//         );

//         gateway.disconnect();
//         res.json({ message: `Asset ${req.params.id} has been updated` });
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// });

// // Delete an asset
// app.delete('/assets/:id', async (req, res) => {
//     try {
//         const { gateway, contract } = await connectToFabric();
//         await contract.submitTransaction('DeleteAsset', req.params.id);
        
//         gateway.disconnect();
//         res.json({ message: `Asset ${req.params.id} has been deleted` });
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// });

// // Transfer an asset
// app.post('/assets/:id/transfer', async (req, res) => {
//     try {
//         const { newOwner } = req.body;
//         const { gateway, contract } = await connectToFabric();

//         await contract.submitTransaction(
//             'TransferAsset',
//             req.params.id,
//             newOwner
//         );

//         gateway.disconnect();
//         res.json({ message: `Asset ${req.params.id} has been transferred to ${newOwner}` });
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// });

// // Get all assets
// app.get('/assets', async (req, res) => {
//     try {
//         const { gateway, contract } = await connectToFabric();
//         const result = await contract.evaluateTransaction('GetAllAssets');
        
//         gateway.disconnect();
//         res.json(JSON.parse(result.toString()));
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// });

// const port = 3000;
// app.listen(port, () => {
//     console.log(`Server is running on port ${port}`);
// });