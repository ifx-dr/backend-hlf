const exportToWord = require('./word');
const email = require('./email')
const BC = require('./blockchain')

// 0. save the previous blocks in a Excel file (once)
// 1. read the file to get old blocks and build the chain
// 2. add a new block with date and link
// 3. output the latest block to a Word file and a email based on the template

// specify the files and folder
var file_xlsx = "blockchain_hist.xlsx"
var email_template = "email_template.txt"
var word_folder = "DR_Blockchain_Status"

// deal with different input
var arguments = process.argv; 
var op = arguments[2]
if(op=="reset"){
    // reset the chain with code, run only once
    console.log("reset the blockchain")
    BC.resetChain(file_xlsx)
    return
}

// read the data from the file
let DRchain = BC.loadChainFromExcel(file_xlsx)
var num  = DRchain.chain.length - 1

if(op=="count"){
    console.log("counting number of blocks")
    console.log("number of blocks:", num)
}
else if(op=="latest"){
    console.log("checking latest block")
    BC.printBlockToConsole(DRchain.getLatestBlock())
}
else if(op=="check"){
    console.log("checking whole chain")
    BC.printChainToConsole(DRchain)
}
else if(op=="add"){
    // add new block, save the latest block to Word and email
    if (arguments.length-2 != 3){
        console.log("add: invalid parameters")
        return
    }
    console.log("adding a new block")
    let timestamp = arguments[3]
    let link = arguments[4] 
    num = num + 1
    let newBlock = [num, timestamp, link]
    DRchain.addBlock(new BC.Block(newBlock[0], newBlock[1], newBlock[2]))
    let LatestBlock = DRchain.getLatestBlock();
    BC.printBlockToConsole(LatestBlock)

    BC.exportChainToExcel(DRchain, file_xlsx)
    // BC.exportChainToWord(DRchain, file_doxc)
    exportToWord.exportLatestBlockToWord(LatestBlock, word_folder)
    email.generateEmail(LatestBlock, email_template)
}
