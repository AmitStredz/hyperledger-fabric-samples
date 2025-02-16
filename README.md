# **Hyperledger Fabric Network - Custom Implementation**

## **1. Overview of the Changes**
This project extends the original **Fabric Samples** repository by modifying the **test-network** to support enhanced functionalities. Below are the key enhancements:

- Introduced **`application/`** and **`chaincode-node/`** folders:
  - **`application/`**: A Node.js-based application that provides APIs to interact with the chaincode.
  - **`chaincode-node/`**: Chaincode written in JavaScript (Node.js) to define ledger transactions.
- Updated **`docker-compose-test-net.yaml`**:
  - Increased the number of peers to **two per organization** for better network simulation.
- **Network Setup & User Roles**:
  - The network was created using **Certificate Authority (CA)**.
  - Three user roles were introduced:
    - **Admin**
    - **Auditor**
    - **Regular User**

## **2. Attribute-Based Access Control (ABAC) Implementation**
- **Objective:** Implemented ABAC to control access based on user attributes.
- **Current Status:** Encountered minor permission-related issues, which are likely due to configuration details. This requires further refinement.

## **3. How to Run the Application**
Follow these steps to set up and test the modified network:

### **Step 1: Set Up the Network**
Run the following commands to start the network with the updated configuration:
```sh
cd test-network
./network.sh up createChannel -ca
```
### **Step 2: Deploy the Chaincode**
Follow the steps provided in the doc to pack and deploy the chaincode.

[https://hyperledger-fabric.readthedocs.io/en/release-2.2/deploy_chaincode.html#package-the-smart-contract]

### **Step 3:  Set Up the Fabric CA Client Configuration**
Ensure the fabric-ca-client configuration is set correctly:

```sh
export FABRIC_CA_CLIENT_HOME=$(pwd)/organizations/peerOrganizations/org1.example.com/
```
### **Step 4:Enroll the CA Admin (Required Before Registering Users)**
Run this enrollment command before registering identities:

```sh
fabric-ca-client enroll \
  -u https://admin:adminpw@localhost:7054 \
  --tls.certfiles $(pwd)/organizations/fabric-ca/org1/tls-cert.pem

```
### **Step 5:Register the Admin User**
```sh
fabric-ca-client register \
  --id.name admin1 \
  --id.secret admin1pw \
  --id.type client \
  --id.attrs 'role=admin:ecert' \
  -u https://localhost:7054 \
  --tls.certfiles $(pwd)/organizations/fabric-ca/org1/tls-cert.pem
```
### **Step 6:  Enroll the Admin**
```sh
fabric-ca-client enroll \
  -u https://admin1:admin1pw@localhost:7054 \
  --tls.certfiles $(pwd)/organizations/fabric-ca/org1/tls-cert.pem \
  -M $(pwd)/organizations/peerOrganizations/org1.example.com/users/Admin1@org1.example.com/msp

```
### **Step 7: Verify Enrollment**
```sh
ls $(pwd)/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
```
Now that the admin is enrolled, WE can proceed with creating the admin identity for Org1 by copying the necessary MSP files.
### **Step 8: Move the Admin MSP to the Correct Location**
```sh
mkdir -p $(pwd)/organizations/peerOrganizations/org1.example.com/msp/admin1certs
cp $(pwd)/organizations/peerOrganizations/org1.example.com/users/Admin1@org1.example.com/msp/signcerts/cert.pem \
   $(pwd)/organizations/peerOrganizations/org1.example.com/msp/admin1certs/

```
### **Step 9:  Verify the Enrollment**
```sh
ls $(pwd)/organizations/peerOrganizations/org1.example.com/msp/admin1certs/
```
It should show cert.pem, confirming that the admin certificate is placed correctly.

### **Step 10: Register the Auditor**
```sh
fabric-ca-client register \
  --id.name auditor \
  --id.secret auditorpw \
  --id.type client \
  --id.attrs 'role=auditor:ecert' \
  -u https://localhost:7054 \
  --tls.certfiles $(pwd)/organizations/fabric-ca/org1/tls-cert.pem

```
### **Step 11:  Enroll the Auditor**
```sh
fabric-ca-client enroll \
  -u https://auditor:auditorpw@localhost:7054 \
  --tls.certfiles $(pwd)/organizations/fabric-ca/org1/tls-cert.pem \
  -M $(pwd)/organizations/peerOrganizations/org1.example.com/users/Auditor@org1.example.com/msp


```
### **Step 12: Register the RegUser1**
```sh
fabric-ca-client register \
  --id.name reguser1 \
  --id.secret reguser1pw \
  --id.type client \
  --id.attrs 'role=user:ecert' \
  -u https://localhost:7054 \
  --tls.certfiles $(pwd)/organizations/fabric-ca/org1/tls-cert.pem
```
### **Step 13: Enroll the RegUser1**
```sh
fabric-ca-client enroll \
  -u https://reguser1:reguser1pw@localhost:7054 \
  --tls.certfiles $(pwd)/organizations/fabric-ca/org1/tls-cert.pem \
  -M $(pwd)/organizations/peerOrganizations/org1.example.com/users/Reguser1@org1.example.com/msp
```

### **Step 14: Move Auditor Certificate**
```sh
mkdir -p $(pwd)/organizations/peerOrganizations/org1.example.com/msp/auditorcerts
cp $(pwd)/organizations/peerOrganizations/org1.example.com/users/Auditor@org1.example.com/msp/signcerts/cert.pem \
   $(pwd)/organizations/peerOrganizations/org1.example.com/msp/auditorcerts/
```
### **Step 15:  Move Regular User Certificate**
```sh
mkdir -p $(pwd)/organizations/peerOrganizations/org1.example.com/msp/usercerts
cp $(pwd)/organizations/peerOrganizations/org1.example.com/users/Reguser1@org1.example.com/msp/signcerts/cert.pem \
   $(pwd)/organizations/peerOrganizations/org1.example.com/msp/usercerts/
```
### **Step 16: Verify Enrollment & Certificates**
```sh
ls $(pwd)/organizations/peerOrganizations/org1.example.com/msp/
```
You should see:
admincerts auditorcerts usercerts

### **Step 17: Get enrolled identity details**
```sh
fabric-ca-client identity list -u https://localhost:7054 \
 --tls.certfiles ${PWD}/organizations/fabric-ca/org1/tls-cert.pem
```
### **Step 18:  Check Installed Chaincode (On a Peer)**
```sh
peer lifecycle chaincode queryinstalled --peerAddresses localhost:7051 --tlsRootCertFiles $CORE_PEER_TLS_ROOTCERT_FILE
```
### **Step 19: Check Committed Chaincode (On a Channel)**
```sh
peer lifecycle chaincode querycommitted --channelID mychannel

```
Now we are goog to go. The chaincode is deployed and the CA indentities are created.

### **Step 20: Run the Application**

From the test-network directory, follow the steps to run the nodeJs application and test the API:

**Install dependencies**
```sh
cd applications/myapp
npm Install
```
**Run the node file**
```sh
node index.js
```
### **Step 21: Testing**
Using Postman or any REST client, test API requests for different user roles.

Initialize the ledger
```sh
POST http://localhost:3000/initLedger
```
Retrieve all assets
```sh
GET http://localhost:3000/getAllAssets
```
Create an asset
```sh
POST http://localhost:3000/assets
```
Retrive an asset
```sh
GET http://localhost:3000/assets/:id
```
Update an asset
```sh
PUT http://localhost:3000/assets/:id
```
Delete an asset
```sh
DELETE http://localhost:3000/assets/:id
```
Transfers asset from one user to other
```sh
POST http://localhost:3000/transferAsset
```
**Payload Body Format**
```sh
{
      "id": 1,
      "color": "blue",
      "size": "15",
      "owner": "reguser1",
      "value": "5",
},

```


[//]: # (SPDX-License-Identifier: CC-BY-4.0)

# Hyperledger Fabric Samples

You can use Fabric samples to get started working with Hyperledger Fabric, explore important Fabric features, and learn how to build applications that can interact with blockchain networks using the Fabric SDKs. To learn more about Hyperledger Fabric, visit the [Fabric documentation](https://hyperledger-fabric.readthedocs.io/en/latest).

Note that this branch contains samples for the latest Fabric release. For older Fabric versions, refer to the corresponding branches:

- [release-2.2](https://github.com/hyperledger/fabric-samples/tree/release-2.2)
- [release-1.4](https://github.com/hyperledger/fabric-samples/tree/release-1.4)

## Getting started with the Fabric samples

To use the Fabric samples, you need to download the Fabric Docker images and the Fabric CLI tools. First, make sure that you have installed all of the [Fabric prerequisites](https://hyperledger-fabric.readthedocs.io/en/latest/prereqs.html). You can then follow the instructions to [Install the Fabric Samples, Binaries, and Docker Images](https://hyperledger-fabric.readthedocs.io/en/latest/install.html) in the Fabric documentation. In addition to downloading the Fabric images and tool binaries, the Fabric samples will also be cloned to your local machine.

## Test network

The [Fabric test network](test-network) in the samples repository provides a Docker Compose based test network with two
Organization peers and an ordering service node. You can use it on your local machine to run the samples listed below.
You can also use it to deploy and test your own Fabric chaincodes and applications. To get started, see
the [test network tutorial](https://hyperledger-fabric.readthedocs.io/en/latest/test_network.html).

The [Kubernetes Test Network](test-network-k8s) sample builds upon the Compose network, constructing a Fabric
network with peer, orderer, and CA infrastructure nodes running on Kubernetes.  In addition to providing a sample
Kubernetes guide, the Kube test network can be used as a platform to author and debug _cloud ready_ Fabric Client
applications on a development or CI workstation.


## Asset transfer samples and tutorials

The asset transfer series provides a series of sample smart contracts and applications to demonstrate how to store and transfer assets using Hyperledger Fabric.
Each sample and associated tutorial in the series demonstrates a different core capability in Hyperledger Fabric. The **Basic** sample provides an introduction on how
to write smart contracts and how to interact with a Fabric network using the Fabric SDKs. The **Ledger queries**, **Private data**, and **State-based endorsement**
samples demonstrate these additional capabilities. Finally, the **Secured agreement** sample demonstrates how to bring all the capabilities together to securely
transfer an asset in a more realistic transfer scenario.

|  **Smart Contract** | **Description** | **Tutorial** | **Smart contract languages** | **Application languages** |
| -----------|------------------------------|----------|---------|---------|
| [Basic](asset-transfer-basic) | The Basic sample smart contract that allows you to create and transfer an asset by putting data on the ledger and retrieving it. This sample is recommended for new Fabric users. | [Writing your first application](https://hyperledger-fabric.readthedocs.io/en/latest/write_first_app.html) | Go, JavaScript, TypeScript, Java | Go, TypeScript, Java |
| [Ledger queries](asset-transfer-ledger-queries) | The ledger queries sample demonstrates range queries and transaction updates using range queries (applicable for both LevelDB and CouchDB state databases), and how to deploy an index with your chaincode to support JSON queries (applicable for CouchDB state database only). | [Using CouchDB](https://hyperledger-fabric.readthedocs.io/en/latest/couchdb_tutorial.html) | Go, JavaScript | Java, JavaScript |
| [Private data](asset-transfer-private-data) | This sample demonstrates the use of private data collections, how to manage private data collections with the chaincode lifecycle, and how the private data hash can be used to verify private data on the ledger. It also demonstrates how to control asset updates and transfers using client-based ownership and access control. | [Using Private Data](https://hyperledger-fabric.readthedocs.io/en/latest/private_data_tutorial.html) | Go, TypeScript, Java | TypeScript |
| [State-Based Endorsement](asset-transfer-sbe) | This sample demonstrates how to override the chaincode-level endorsement policy to set endorsement policies at the key-level (data/asset level). | [Using State-based endorsement](https://github.com/hyperledger/fabric-samples/tree/main/asset-transfer-sbe) | Java, TypeScript | JavaScript |
| [Secured agreement](asset-transfer-secured-agreement) | Smart contract that uses implicit private data collections, state-based endorsement, and organization-based ownership and access control to keep data private and securely transfer an asset with the consent of both the current owner and buyer. | [Secured asset transfer](https://hyperledger-fabric.readthedocs.io/en/latest/secured_asset_transfer/secured_private_asset_transfer_tutorial.html)  | Go | TypeScript |
| [Events](asset-transfer-events) | The events sample demonstrates how smart contracts can emit events that are read by the applications interacting with the network. | [README](asset-transfer-events/README.md)  | Go, JavaScript, Java | Go, TypeScript, Java |
| [Attribute-based access control](asset-transfer-abac) | Demonstrates the use of attribute and identity based access control using a simple asset transfer scenario | [README](asset-transfer-abac/README.md)  | Go | _None_ |

## Full stack asset transfer guide

The [full stack asset transfer guide](full-stack-asset-transfer-guide#readme) workshop demonstrates how a generic asset transfer solution for Hyperledger Fabric can be developed and deployed. This covers chaincode development, client application development, and deployment to a production-like environment.

## Additional samples

Additional samples demonstrate various Fabric use cases and application patterns.

|  **Sample** | **Description** | **Documentation** |
| -------------|------------------------------|------------------|
| [Off chain data](off_chain_data) | Learn how to use block events to build an off-chain database for reporting and analytics. | [Peer channel-based event services](https://hyperledger-fabric.readthedocs.io/en/latest/peer_event_services.html) |
| [Token SDK](token-sdk) | Sample REST API around the Hyperledger Labs [Token SDK](https://github.com/hyperledger-labs/fabric-token-sdk) for privacy friendly (zero knowledge proof) UTXO transactions. | [README](token-sdk/README.md) |
| [Token ERC-20](token-erc-20) | Smart contract demonstrating how to create and transfer fungible tokens using an account-based model. | [README](token-erc-20/README.md) |
| [Token UTXO](token-utxo) | Smart contract demonstrating how to create and transfer fungible tokens using a UTXO (unspent transaction output) model. | [README](token-utxo/README.md) |
| [Token ERC-1155](token-erc-1155) | Smart contract demonstrating how to create and transfer multiple tokens (both fungible and non-fungible) using an account based model. | [README](token-erc-1155/README.md) |
| [Token ERC-721](token-erc-721) | Smart contract demonstrating how to create and transfer non-fungible tokens using an account-based model. | [README](token-erc-721/README.md) |
| [High throughput](high-throughput) | Learn how you can design your smart contract to avoid transaction collisions in high volume environments. | [README](high-throughput/README.md) |
| [Simple Auction](auction-simple) | Run an auction where bids are kept private until the auction is closed, after which users can reveal their bid. | [README](auction-simple/README.md) |
| [Dutch Auction](auction-dutch) | Run an auction in which multiple items of the same type can be sold to more than one buyer. This example also includes the ability to add an auditor organization. | [README](auction-dutch/README.md) |


## License <a name="license"></a>

Hyperledger Project source code files are made available under the Apache
License, Version 2.0 (Apache-2.0), located in the [LICENSE](LICENSE) file.
Hyperledger Project documentation files are made available under the Creative
Commons Attribution 4.0 International License (CC-BY-4.0), available at http://creativecommons.org/licenses/by/4.0/.
