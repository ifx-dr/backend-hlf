/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';
var express = require("express");
var app = express();
const cors = require('cors');
// var busboy = require('connect-busboy');
var busboy = require('busboy');
var multer = require('multer');

const fs = require('fs');
const yaml = require('js-yaml')
const crypto = require("crypto");
const BC = require('./blockchain/blockchain')
const algorithm = "aes-256-cbc"; 
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

const memberAssetCollectionName = 'assetCollection';
const org1PrivateCollectionName = 'Org1MSPPrivateCollection';

function prettyJSONString(inputString) {
	return JSON.stringify(JSON.parse(inputString), null, 2);
}

const retry_cnt = 3;
var NewProposalLock = true;
var VaidateProposalLock = true;
var NewBlockLock = true;

app.use(express.json());
// for parsing application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));
// for parsing files in req.body
// app.use(busboy());
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
			// contract.addDiscoveryInterest({ name: chaincodeName, collectionNames: [org1PrivateCollectionName] });

			// app.get("/private", async(req, res)=>{
			// 	console.log('get private data from PDC');
			// 	let result = await contract.evaluateTransaction('ReadPrivateAsset', org1PrivateCollectionName, "privateData");
			// 	console.log(JSON.parse(result));
			// 	res.json(JSON.parse(`{"success":${JSON.stringify(result)}}`));
			// })
			// app.get("/crypto", async(req, res)=>{
			// 	console.log('get symmetric key from PDC');
			// 	let result = JSON.parse(await contract.evaluateTransaction('GetSymmetricKey'));
			// 	console.log(result);
			// 	let data = Buffer.from(result.data);
			// 	let cryptoMaterials = JSON.parse(data.toString());
			// 	console.log(data.toString());
			// 	console.log(cryptoMaterials.IV);
			// 	res.json(JSON.parse(`{"success":${JSON.stringify(result)}}`));
			// })
			app.get("/initiate", async (req, res) => {
				console.log('*****read ledger file*****')
				let fileContents = fs.readFileSync('ledger.yaml', 'utf8');
				let ledger = yaml.load(fileContents);
				let blockchain = BC.loadChainFromExcel('./blockchain/blockchain_hist.xlsx');
				// console.log(blockchain);
				let latestBlock = blockchain.getLatestBlock();
				let flag = false;
				let result;
				for(let i=0;i<retry_cnt;i++){
					try {
						await contract.submitTransaction('InitLedgerFromFile', JSON.stringify(ledger));
						await contract.submitTransaction('WriteBlockchain', JSON.stringify(blockchain));
						await contract.submitTransaction('WriteLatestBlock', JSON.stringify(latestBlock));
						console.log('app initiate: success ')
						flag = true;
						break;
					} catch (error) {
						console.log('app initiate: failed '+i)
						result = error;
					}
				}
				if(flag)
					res.json(JSON.parse('{"success":"ledger initialized from file"}'));
				else
					res.json(JSON.parse(`{"error":"initialize failed, error:${result}"}`));
			})
			app.get("/saveStatus", async (req, res) => {
				console.log('*****save system status: members, ongoing and closed proposals****');
				// await contract.submitTransaction('SaveSystemStatus');
				let ledger = {};
				ledger["UserInfo"] = JSON.parse(await contract.evaluateTransaction('GetMembers'));
				ledger["OngoingProposalInfo"] = JSON.parse(await contract.evaluateTransaction("GetAllOngoingProposal"));
				ledger["ClosedProposalInfo"] = JSON.parse(await contract.evaluateTransaction("GetAllClosedProposal"));;
				let yamlStr = yaml.dump(ledger);
				fs.writeFileSync('ledger_out.yaml', yamlStr, 'utf8');

				let chain = JSON.parse(await contract.evaluateTransaction("GetBlockchain"))
				BC.exportChainOnlyToExcel(chain, './blockchain/blockchain_hist_out.xlsx');
				// let latestBlock = JSON.parse(await contract.evaluateTransaction("GetLatestBlock"))
				res.json(JSON.parse('{"success":"ledger saved"}'));
			});
			app.get("/initiate_origin", async (req, res) => {
				// Initialize a set of data on the channel using the chaincode 'Init_Ledger' function.
				// This type of transaction would only be run once by an application the first time it was started after it
				// deployed the first time.
				console.log('*****create variables and set initiate value****');
				await contract.submitTransaction('Init_Ledger');

				// let assetData = {
				// 	name:"simple test",
				// 	prop:100
				// };
				// let statefulTxn = contract.createTransaction('CreatePrivateAsset');
				// let tmapData = Buffer.from(JSON.stringify(assetData));
				// console.log(tmapData);
				// statefulTxn.setTransient({
				// 	asset_properties: tmapData
				// });
				// let result = await statefulTxn.submit();
				// console.log(JSON.stringify(result))

				// await contract.submitTransaction('GenerateSymmetricKey');
				res.json(JSON.parse('{"success":"ledger initialized"}'));
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
				let result;
				for(let i=0;i<retry_cnt;i++){
					try {
						result = await contract.evaluateTransaction('CheckTotalMembers');
						console.log(`app allMembers: success, `+result);
						break;
					} catch (error) {
						console.log(`app allMembers: failed ${i}, `+error)
						result = error;
					}
				}
				res.json(JSON.parse(result.toString()));
			});
			app.get("/DR", async (req, res) => {
				//Get the URI of the latest  DR
				let result;
				for(let i=0;i<retry_cnt;i++){
					try {	
						result = await contract.evaluateTransaction('CheckLatestDR');
						console.log("app CheckLatestDR: "+result.toString());
						break;
					} catch (error) {
						console.log("app CheckLatestDR: failed, error: "+result.toString());
						result += error;
					}
				}
				res.json(result.toString());
			});
			app.get("/OngoingDR", async (req, res) => {
				//Get the URI of the ongoing  DR
				let result;
				let flag = false;
				for(let i=0;i<retry_cnt;i++){
					try {
						result = await contract.evaluateTransaction('CheckOngoingHash');
						console.log("app CheckOngoingDR: success, "+(result));
						flag = true;
						break;
					} catch (error) {
						console.log(`app CheckOngoingDR: failed ${i}, `+(error));
						result = error;
					}
				}
				res.json(result.toString());
			});
			app.get("/DRHash", async (req, res) => {
				//Get the Hash value of the latest DR
				let result;
				let flag = false;
				for(let i=0;i<retry_cnt;i++){
					try {
						result = await contract.evaluateTransaction('CheckDRHash');
						console.log("app CheckDRHash: success, "+result.toString());
						flag = true;
						break;
					} catch (error) {
						console.log(`app CheckDRHash: failed ${i}, `+(error));
						result = error;
					}
				}
				res.json(result.toString());
			});
			app.get("/checkNewBlockRequest", async (req, res) => {
				//check if there is a new block to be generated
				let result;
				let flag = false;
				for(let i=0;i<retry_cnt;i++){
					try {
						result = await contract.evaluateTransaction('GetNewBlockRequest');
						console.log("app GetNewBlockRequest: success, "+result.toString());
						flag = true;
						break;
					} catch (error) {
						console.log(`app GetNewBlockRequest: failed ${i}, `+(error));
						result = error;
					}
				}
				res.json(result.toString());
			});
			app.post("/generateBlock", async (req, res) => {
				if(!NewBlockLock){
					res.json('please wait');
				}
				else{
					NewBlockLock = !NewBlockLock;
					let result;
					let flag = false;
					for(let i=0;i<retry_cnt;i++){
						try {
							result = await contract.evaluateTransaction('GetBlockchain');
							let blockchain = new BC.Blockchain();
							blockchain.chain = JSON.parse(result);
							let newBlock = new BC.Block(req.body.index, req.body.timestamp, req.body.data);
							blockchain.addBlock(newBlock)
							console.log("view blockchain:\n"+result.toString());
							await contract.submitTransaction('WriteBlockchain', JSON.stringify(blockchain));
							await contract.submitTransaction('WriteLatestBlock', JSON.stringify(blockchain.getLatestBlock()));
							await contract.submitTransaction('CloseNewBlockRequest');
							flag = true;
							break;
						} catch (error) {
							result = `app generateBlock failed ${i}, error: `+error;
							console.log(result);
						}
					}
					NewBlockLock = !NewBlockLock;
					if(flag)
						res.json('Successfully generated a new block!');
					else
						res.json(result);
				}
			});
			app.post("/tokens", async (req, res) => {
				//Get the tokens for member1
				console.log('membersId from frontend: '+ req.body.id);
				let result;
				if(req.body.id!=='visitor'){
					let flag = false;
					for(let i=0;i<retry_cnt;i++){
						try {
							result = await contract.submitTransaction('CheckTokens', req.body.id);
							flag = true;
							break;
						} catch (error) {
							console.log(`app tokens: failed ${i}, `+error);
							result = error;
						}
					}
				}
				else{
					result = "please login";
				}
				// let result = await contract.submitTransaction('CheckTokens', req.body.id);
				res.json(result.toString());
				console.log('token amount: '+ result);
			});
			// For submitTransaction, the transaction will be sent to both peers and if both peers endorse the transaction, the endorsed proposal will be sent
			// to the orderer to be committed by each of the peer's to the channel ledger.
			app.post("/createProposal", async (req, res) => {
				if(!NewProposalLock){
					res.json(`please wait`);
				}
				else{
					NewProposalLock = !NewProposalLock;
					console.log('\n--> Submit Transaction: CreatedProposal');
					let message = '';
					console.log('author: '+req.body.author)
					let flag = false;
					let result;
					for(let i=0;i<retry_cnt;i++){
						try {
							let penalization = await contract.submitTransaction('CheckInactivity', req.body.author);
							if(penalization != 0) {
								message = 'Penalization for inactivity: ' + penalization.toString() + ' tokens removed.\n';
								console.log(message);
							}

							result = await contract.submitTransaction('CreateProposal', req.body.domain, req.body.uri, req.body.author, req.body.message, req.body.type, req.body.originalID, req.body.download);
							console.log('******The creation result is:' + result);
							if (message != '') result += message + '\n';
							console.log('app createProposal: success, '+result.toString());
							flag = true;
							break;
						} catch (error) {
							console.log(`app createProposal: failed ${i}, `+error)
							result = error;
						}
					}
					NewProposalLock = !NewProposalLock;
					res.json(result.toString());
				}
			});
			app.post("/validateProposal", async (req, res) => {
				if(!VaidateProposalLock){
					res.json(`please wait`);
				}
				else{
					VaidateProposalLock = !VaidateProposalLock;
					let result;
					let message = '';
					for(let i=0;i<retry_cnt;i++){
						try {
							let penalization = await contract.submitTransaction('CheckInactivity', req.body.author_ID);
							if(penalization != 0) {
								message = 'Penalization for inactivity: ' + penalization.toString() + ' tokens removed.\n';
								console.log(message);
							} 
							
							result = await contract.submitTransaction('ValidateProposal', req.body.prop_ID, req.body.author_ID, req.body.vote, req.body.messages);
							result = JSON.parse(result.toString());
							console.log(result.Message);

							if (result.Finished === true) {
								let endProposalResult = await contract.submitTransaction('EndProposal', result.ProposalID, result.Result);
								console.log(endProposalResult.toString());

								let checkLobeOwnerResult = await contract.submitTransaction('CheckNewLobOwner');
								console.log(checkLobeOwnerResult.toString());
							}

							result.Message = message + result.Message;
							console.log('app validateProposal: success, '+result);
							break;
						} catch (error) {
							console.log(`app validateProposal: failed ${i}, `+error);
							result.Message = error;
						}
					}
					VaidateProposalLock = !VaidateProposalLock;
					res.json(result);
				}
			});
			app.get("/ongoingProp", async (req, res) => {
				let result;
				for(let i=0;i<retry_cnt;i++){
					try {
						result = await contract.evaluateTransaction('GetOngoingProposal');
						console.log('app ongoingProp: success, '+result.toString());
						break;
					} catch (error) {
						console.log(`app ongoingProp: failed ${i}, `+error);
						result = `{"error":${error}}`;
					}
				}
				res.json(JSON.parse(result.toString()));
			});
			
			app.get("/checkUpload", async (req, res) => {
				let result;
				for(let i=0;i<retry_cnt;i++){
					try {
						result = await contract.evaluateTransaction('DRUpload_Available');
						console.log('app checkUpload: success, '+result.toString());
						break;
					} catch (error) {
						console.log(`app checkUpload: failed ${i}, `+error);
						result = error;
					}
				}
				res.json(result.toString());
				console.log("The DRUpload is visible*********"+ result.toString());
			});
			
			// app.post("/downloadDecryptedDR", async (req, res) =>{
			// 	let result = await contract.evaluateTransaction('GetSymmetricKey');
			// 	cryptoMaterials = JSON.parse(result);
			// 	let symmetricKey = cryptoMaterials.symmetricKey;
			// 	let IV = cryptoMaterials.IV;
			// 	let hashStr = "";
			// 	let getPath = "./";
			// 	ipfs.get(hashStr,async (err,result)=>{
			// 		if(err) throw err;
			// 		// console.log(result);  //注意：调用get方法时回调函数中的参数是一个数组形式 内容在content中
			// 		// fs.writeFileSync(getPath, result[0].content);
			// 		// console.log('file: ' + getPath);
			// 		// console.log('从ipfs中下载文件成功!')
			// 		//写入文件
			// 		let encryptedData = result[0].content.toString();
			// 		const decipher = crypto.createDecipheriv(algorithm, symmetricKey, IV);
			// 		let decryptedData = decipher.update(encryptedData, "hex", "utf-8");
			// 		decryptedData += decipher.final("utf8");
			// 		fs.writeFile('./fromIPFS.txt', decryptedData)
			// 	})
			// })
			// login: search by member ID, return name and role
			app.post("/memberInfo", async (req, res) => {
				//Get the amount of members in the system
				console.log(JSON.stringify(req.body));
				let result;
				for(let i=0;i<retry_cnt;i++){
					try {
						result = await contract.evaluateTransaction('GetMemberById', req.body.memberID);
						console.log('app memberInfo: success, '+JSON.stringify(result.toString()));
						break;
					} catch (error) {
						console.log(`app memberInfo: failed ${i}, `+error);
						result = `{"error":${error}}`;
					}
				}
				res.json(JSON.parse(result.toString()));
			});

			// check blockchain
			app.get("/checkBlockchain", async (req, res) => {
				let result = await contract.evaluateTransaction('GetBlockchain');
				res.json(result.toString());
				console.log("view blockchain:\n"+result.toString());
			});
			app.get("/checkLatestBlock", async (req, res) => {
				let result = await contract.evaluateTransaction('GetLatestBlock');
				res.json(result.toString());
				console.log("view latest block:\n"+ result.toString());
			});
			app.get("/checkAllLobeOwners", async (req, res) => {
				let result = await contract.evaluateTransaction('GetAllLobeOwners');
				res.json(result.toString());
				console.log("view all lobe owners:\n"+ result.toString());
			});
			app.get("/checkMembersInDomain", async (req, res) => {
				let result = await contract.evaluateTransaction('GetMembersInDomain');
				res.json(result.toString());
				console.log("view members in domains:\n"+ result.toString());
			});
			// (temporary) load/save the domains for frontend
			app.get("/loadDomainsInFrontend", async (req, res) => {
				console.log("app load domain");
				let fileContents = fs.readFileSync('../../../Frontend/src/config.json', 'utf8');
				console.log(fileContents);
				let allDomains =JSON.parse(fileContents)["allDomains"];
				console.log(allDomains);
				res.json(JSON.stringify(allDomains));
			})
			app.post("/saveDomainsInFrontend", async (req, res) => {
				console.log("app save domain");
				fs.writeFileSync('../../../Frontend/src/config.json', JSON.stringify(req.body), 'utf8');
				res.json('done');
			})
			async function parseFile(req) {
				console.log('In the ParseFile!');
				var RequireFile = null;
				// req.pipe(req.busboy);
				// req.busboy.on('file', async function(fieldname, file, filename) {
				// 	console.log('FileName:'+ filename);
				// 	file.on('data', async function (data) {
				// 			RequireFile = await data;
				// 			console.log('RequireFile:' + RequireFile);
				// 		}
				// 	);
				// });

				var bb = busboy({ headers: req.headers });
				bb.on('file', function(fieldname, file, filename, encoding, mimetype) {
					console.log('FileName:'+ filename.filename);
					file.on('data', async function (data) {
						RequireFile = await data;
						console.log('RequireFile:' + RequireFile);
						return RequireFile;
					});
				});
				req.pipe(bb);
				// await sleep(2000);
				// console.log('RequireFile2:' + RequireFile);
				
			}
			app.post("/ipfs", async (req, res) => {
				console.log("***********In the database API *****");
				const ipfsAPI = require('ipfs-api');
				const ipfs = ipfsAPI({host: 'localhost', port: '5001', protocol: 'http'});

				console.log('In the ParseFile ipfs!');
				var RequireFile = null;
				var FileName = null;

				var bb = busboy({ headers: req.headers });
				req.pipe(bb);
				bb.on('file', async function(fieldname, file, filename, encoding, mimetype){
					FileName = filename.filename;
					console.log('FileName:'+ FileName);
					file.on('data', async function (data) {
						if (RequireFile === null) {
							RequireFile = data;
						} else {
							RequireFile = Buffer.concat([RequireFile, data]);
						}
					});
					file.on('end', async function() {
						// let result = JSON.parse(await contract.evaluateTransaction('GetSymmetricKey'));
						// console.log(result);
						// let data = Buffer.from(result.data);
						// let cryptoMaterials = JSON.parse(data.toString());
						
						// let symmetricKey = Buffer.from(cryptoMaterials.symmetricKey,'hex');
						// let IV = Buffer.from(cryptoMaterials.IV,'hex');
						// let symmetricKey = Buffer.from("b0d2aad9db0ce0b379600225538c5642a793da7888e0e2e7559c8c64455cc322", 'hex');
						// let IV = Buffer.from("55fac4a1e8cdcd52456ba2f7d1b297db", 'hex');
						// console.log(symmetricKey);
						// console.log(IV);
						// console.log('RFile: ' + RequireFile);
						// var fileContent = Buffer.from(RequireFile, "utf-8");
						var fileContent = RequireFile;
						console.log("file size: "+fileContent.length)
						// const cipher = crypto.createCipheriv(algorithm, symmetricKey, IV);
						// var fileContentEncrypted = cipher.update(fileContent, "utf-8", "hex");
						// fileContentEncrypted += cipher.final("hex");
						// fs.writeFileSync("../../../test/temp.txt",fileContentEncrypted)
						// fileContentEncrypted = fileContent;
						// console.log(fileContentEncrypted);
						// var buff = {
						// 	path: FileName,
						// 	content: Buffer.from(fileContentEncrypted)
						// }

						// ipfs temporarily not available
						var hash = `fake link: ipfs not available`;
						console.log("new uploaded file: "+hash);
						await contract.submitTransaction('AddHash', hash);
						res.json(hash);
						// ipfs.add(buff, async (err,result)=>{
						// 	if(err) throw err;
						// 	console.log(result);
						// 	var hash = `http://127.0.0.1:8080/ipfs/${result[0].hash}?filename=${result[0].path}`;
						// 	console.log("new uploaded file: "+hash);
						// 	await contract.submitTransaction('AddHash', hash);
						// 	res.json(hash);
						// });
					})
				});
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
