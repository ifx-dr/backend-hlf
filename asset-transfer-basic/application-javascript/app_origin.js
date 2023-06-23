/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';
var express = require("express");
var app = express();
const cors = require('cors');
var busboy = require('connect-busboy');
var multer = require('multer');

const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const { buildCAClient, registerAndEnrollUser, enrollAdmin } = require('../../test-application/javascript/CAUtil.js');
const { buildCCPOrg1, buildWallet } = require('../../test-application/javascript/AppUtil.js');

const channelName = 'mychannel';
const chaincodeName = 'basic';
const mspOrg1 = 'Org1MSP';
const walletPath = path.join(__dirname, 'wallet');
const org1UserId = 'appUser';
const gateway = new Gateway();
function prettyJSONString(inputString) {
	return JSON.stringify(JSON.parse(inputString), null, 2);
}

app.use(express.json());
// for parsing application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));
// for parsing files in req.body
app.use(busboy());
// for parsing multipart/form-data
app.use(express.static('public'));
app.use(cors());
async function main() {
	try {
		// build an in memory object with the network configuration (also known as a connection profile)
		const ccp = buildCCPOrg1();

		// build an instance of the fabric ca services client based on
		// the information in the network configuration
		const caClient = buildCAClient(FabricCAServices, ccp, 'ca.org1.example.com');

		// setup the wallet to hold the credentials of the application user
		const wallet = await buildWallet(Wallets, walletPath);

		// in a real application this would be done on an administrative flow, and only once
		await enrollAdmin(caClient, wallet, mspOrg1);

		// in a real application this would be done only when a new user was required to be added
		// and would be part of an administrative flow
		await registerAndEnrollUser(caClient, wallet, mspOrg1, org1UserId, 'org1.department1');

		// Create a new gateway instance for interacting with the fabric network.
		// In a real application this would be done as the backend server session is setup for
		// a user that has been verified.

		try {
			// setup the gateway instance
			// The user will now be able to create connections to the fabric network and be able to
			// submit transactions and query. All transactions submitted by this gateway will be
			// signed by this user using the credentials stored in the wallet.
			await gateway.connect(ccp, {
				wallet,
				identity: org1UserId,
				discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
			});

			// Build a network instance based on the channel where the smart contract is deployed
			const network = await gateway.getNetwork(channelName);

			// Get the contract from the network.
			const contract = network.getContract(chaincodeName);

			app.get("/initiate", async (req, res) => {
				// Initialize a set of data on the channel using the chaincode 'Init_Ledger' function.
				// This type of transaction would only be run once by an application the first time it was started after it
				// deployed the first time.
				console.log('*****create variables and set initiate value****');
				await contract.submitTransaction('Init_Ledger');
			});
			//Check whether a proposal is expired every 1 min
			let NewLobeOwner = setInterval(async function(str1, str2) {
				let newLobeOwner = await contract.submitTransaction('CheckNewLobeOwner');
				console.log("********" + newLobeOwner);
			}, 60000000);
			//Check whether a proposal is expired every 10 min
			let interval = setInterval(async function(str1, str2) {
				await network.connectNetwork();
				let contract = await network.getContract();
				let time = await contract.submitTransaction('CheckTime');
				console.log("*****Here" + time);
			}, 60000000);
			app.get("/allData", async (req,res) => {
				//To get all the data , this will be sent to just one peer and the results will be shown
				let result = await contract.evaluateTransaction('GetAllData');
				console.log(`*** Result: ${prettyJSONString(result.toString())}`);
				res.json(JSON.parse(result.toString()));
			});
			app.get("/allMembers", async (req, res) => {
				//Get the amount of members in the system
				let result = await contract.evaluateTransaction('CheckTotalMembers');
				res.json(JSON.parse(result.toString()));
			});
			app.get("/DR", async (req, res) => {
				//Get the URI of the latest  DR
				let result = await contract.evaluateTransaction('CheckLatestDR');
				res.json(result.toString());
			});
			app.get("/DRHash", async (req, res) => {
				//Get the Hash value of the latest DR
				let result = await contract.evaluateTransaction('CheckDRHash');
				res.json(result.toString());
			});
			app.post("/tokens", async (req, res) => {
				//Get the tokens for member1
				console.log('membersId from frontend: '+ req.body.id);
				let result = await contract.submitTransaction('CheckTokens', req.body.id);
				res.json(result.toString());
				console.log('token amount: '+ result);
			});
			// For submitTransaction, the transaction will be sent to both peers and if both peers endorse the transaction, the endorsed proposal will be sent
			// to the orderer to be committed by each of the peer's to the channel ledger.
			app.post("/createProposal", async (req, res) => {
				console.log('\n--> Submit Transaction: CreatedProposal');
				let message = '';
				let penalization = await contract.submitTransaction('CheckInactivity', req.body.author);
				if(penalization != 0) {
					message = 'Penalization for inactivity: ' + penalization.toString() + ' tokens removed.\n';
					console.log(message);
				}

				let result = await contract.submitTransaction('CreateProposal', req.body.domain, req.body.uri, req.body.author, req.body.message, req.body.type, req.body.originalID);
				console.log('******The creation result is:' + result);
				if (message != '') result += message + '\n';
				res.json(result);
			});
			app.post("/validateProposal", async (req, res) => {
				let message = '';
				
				let penalization = await contract.submitTransaction('CheckInactivity', req.body.author_ID);
				if(penalization != 0) {
					message = 'Penalization for inactivity: ' + penalization.toString() + ' tokens removed.\n';
					console.log(message);
				} 
				
				let result = await contract.submitTransaction('ValidateProposal', req.body.prop_ID, req.body.author_ID, req.body.vote, req.body.messages);
				result = JSON.parse(result.toString());
				console.log(result.Message);

				if (result.Finished === true) {
					let endProposalResult = await contract.submitTransaction('EndProposal', result.ProposalID, result.Result);
					console.log(endProposalResult.toString());

					let checkLobeOwnerResult = await contract.submitTransaction('CheckNewLobOwner');
					console.log(checkLobeOwnerResult.toString());
				}

				result.Message = message + result.Message;
				res.json(result);
			});
			app.get("/ongoingProp", async (req, res) => {
				let result = await contract.evaluateTransaction('OnGoingProposal');
				res.json(JSON.parse(result.toString()));
			});
			async function parseFile(req) {
				console.log('In the ParseFile!');
				let RequireFile = null;
				req.pipe(req.busboy);
				req.busboy.on('file', async function(fieldname, file, filename) {
					console.log('FileName:'+ filename);
					file.on('data', async function (data) {
							RequireFile = await data;
							console.log('RequireFile:' + RequireFile);
						}
					);
				});
				await sleep(2000);
				return RequireFile;
			}
			app.get("/checkUpload", async (req, res) => {
				let result = await contract.evaluateTransaction('DRUpload_Available');
				res.json(result.toString());
				console.log("The DRUpload is visible*********"+ result.toString());
			});
			app.post("/ipfs", async (req, res) => {
				console.info("***********In the database API *****");
				const IPFS = require('ipfs-core');
				const ipfs = await IPFS.create();
				let RequireFile = await parseFile(req);
				await sleep(8000);
				console.log('RFile: ' + RequireFile);
				let result = await ipfs.add(RequireFile);
				console.log('Result: ' + result.path);
				let contract = await network.getContract();
				let addHash = await contract.submitTransaction('AddHash', result.path);
				res.json(addHash);
			});
		} finally {
			// Disconnect from the gateway when the application is closing
			// This will close all connections to the network
			gateway.disconnect();
		}
	} catch (error) {
		console.error(`******** FAILED to run the application: ${error}`);
	}
}

main();
app.listen(3001, async () => {
	console.log("Backend server running on port 3001.");
});
