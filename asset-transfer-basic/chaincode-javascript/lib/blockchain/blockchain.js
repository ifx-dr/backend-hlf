
// const XLSX_test = require('node-xlsx')
// const XLSX = require('xlsx')
const fs = require('fs') 
// const officegen = require('officegen')

const SHA256 = require('sha256');

class Block {
    constructor(index, timestamp, data, previousHash = ''){
        this.index = index;
        this.timestamp = timestamp;
        this.data = data; 
        this.previousHash = previousHash;
        this.hash = this.calculateHash();
    }

    calculateHash(){
        // console.log("mytest: "+ this.previousHash+'\n')
return SHA256(this.index + this.previousHash + this.timestamp + JSON.stringify(this.data)).toString();
// return (this.index + this.previousHash + this.timestamp + JSON.stringify(this.data)).toString();

    }
}

class Blockchain{
    constructor(){
        this.chain = [this.createGenesisBlock()];
    }

    createGenesisBlock(){
        return new Block(0, "01/01/2021", "Genesis Block", "0")
    }

    getLatestBlock(){

        return this.chain[this.chain.length - 1];
    }

    addBlock(newBlock){

        newBlock.previousHash = this.getLatestBlock().hash;
        newBlock.hash = newBlock.calculateHash();
        this.chain.push(newBlock);

    }
}

// function loadChainFromExcel(file_xlsx){
//     let blockchain = new Blockchain()
//     var oldChain = XLSX_test.parse(file_xlsx)
//     var num = oldChain[0].data.length-1

//     // build old chain
//     for(let i=1;i<=num;i++){
//         if(oldChain[0].data[i][0]==null)
//             break
//         oldBlock = oldChain[0].data[i]
//         console.log(oldBlock[0], oldBlock[1], oldBlock[2])
//         blockchain.addBlock(new Block(oldBlock[0], oldBlock[1], oldBlock[2]))
//     }
//     return blockchain
// }

// function loadChainFromExcel(file_xlsx="DR_Weekly_Update.xlsx"){
//     let blockchain = new Blockchain()
//     var workbook = XLSX.readFile(file_xlsx)
//     block_info = workbook.Sheets[workbook.SheetNames[0]]
//     total = Number(block_info['!ref'].slice(-2))
//     for(let i=3;i<=total;i++){
//         if(block_info['A'+i]==null)
//             break

//         index = Number(block_info['A'+i].v.slice(0,-1))

//         // convert m/d/yy to dd.mm.yyyy
//         date_mdy = block_info['B'+i].w
//         _date = date_mdy.split('/')
//         timestamp = ("0"+_date[1]).slice(-2) +'.'+ ("0"+_date[0]).slice(-2) +'.'+ ("20"+_date[2])
//         // typo fix: 02.15.2021 >> 15.12.2021
//         if(index==3)
//             timestamp = "15.12.2021"
//         // get from hyperlink
//         data = block_info['C'+i].l.Target

//         blockchain.addBlock(new Block(index, timestamp, data))
//     }
//     return blockchain
// }

function printBlockToConsole(block){
    console.log(JSON.stringify(block, null, 4)); //four spaces to format it 
}

function printChainToConsole(blockchain){
    console.log("See complete Blockchain of Digital Reference Updates: \n"); 
    console.log(JSON.stringify(blockchain, null, 4)); //four spaces to format it 
}

// function exportChainToExcel(blockchain, out_file){
//     chain_info = [
//         {
//             name: "sheet",
//             data: [["index", "timestamp", "data", "hash"]]
//         }
//     ]
//     for(let i=1;i<=blockchain.chain.length-1;i++){
//         chain_info[0].data.push([blockchain.chain[i].index, blockchain.chain[i].timestamp, blockchain.chain[i].data, blockchain.chain[i].hash])
//     }
//     buffer = XLSX_test.build(chain_info)
//     fs.writeFile(out_file, buffer, function(err){
//         if(err)
//             throw err
//         console.log("saved in excel:", out_file)
//     })
// }

// function exportChainToWord(blockchain, out_file){
//     // console.log("Digital Reference Blockchain \n ");
//     // console.log("See newest Block added: \n");
//     const docx = officegen('docx')
//     let obj = docx.createP()
//     obj.addText(JSON.stringify(blockchain, null, 4));
//     out = fs.createWriteStream(out_file)
//     docx.generate(out)

//     console.log('saved in word:', out_file)
// }

function resetChain(){
    // save blockchain to excel
    let DRchain = new Blockchain(); 
    DRchain.addBlock(new Block( 1, "18.09.2020", "https://github.com/tibonto/dr/commit/53d314176ecf10561ff29f53aca1ba865c930bec"))
    DRchain.addBlock(new Block( 2, "07.10.2020", "https://github.com/tibonto/dr/commit/23dbc54f1a0bb9d507e75ca4522610976e334fbf"));
    DRchain.addBlock(new Block( 3, "15.12.2021", "https://github.com/tibonto/dr/commit/8920b95f1cd211c6410c1afd7bb8c97bb12bea33#diff-737d24d6a48ad5213e68f61ba9be0902f83b27a61fcc8fe1fda190d874221029"));
    DRchain.addBlock(new Block( 4, "26.03.2021", "https://github.com/tibonto/dr/commit/4a75916ca89d5da7695b2adb64dedb77c5629c48"));
    DRchain.addBlock(new Block( 5, "01.04.2021", "https://github.com/tibonto/dr/commit/524d5218726c3f2b43d383bbb047ecbf7a225063"));
    DRchain.addBlock(new Block( 6, "09.04.2021", "https://github.com/tibonto/dr/commit/885db0a52231f4bf20658f6c174ed069e0a493b6"));
    DRchain.addBlock(new Block( 7, "16.04.2021", "https://github.com/tibonto/dr/commit/d5119b74be556adf61ab38c5ad3066bf8feaa2fc"));
    DRchain.addBlock(new Block( 8, "23.04.2021", "https://github.com/tibonto/dr/commit/dfdf70e6d62fc1a3f0bdcc29715f9815e2512ea7"));
    DRchain.addBlock(new Block( 9, "30.04.2021", "https://github.com/tibonto/dr/commit/966a8b5e5d5b96a7216feda828ee91689d8fa639"));
    DRchain.addBlock(new Block(10, "07.05.2021", "https://github.com/tibonto/dr/commit/c7689fa12f8aee95c9cfe607892674dfde9e2b94"));
    DRchain.addBlock(new Block(11, "14.05.2021", "https://github.com/tibonto/dr/commit/01a29bd48bd2357baf05ed3277903b804707ed02"));
    DRchain.addBlock(new Block(12, "21.05.2021", "https://github.com/tibonto/dr/commit/01a29bd48bd2357baf05ed3277903b804707ed02"));
    DRchain.addBlock(new Block(13, "28.05.2021", "https://github.com/tibonto/dr/commit/594944f62961e528da6d70c97382e47dbffc0b3d"));
    DRchain.addBlock(new Block(14, "04.06.2021", "https://github.com/tibonto/dr/commit/1c4fb03f9e99febb73ce7f729b7338a15960cdef"));
    DRchain.addBlock(new Block(15, "11.06.2021", "https://github.com/tibonto/dr/commit/38a85601575464d0d80932ac35e95835df1809f7"));
    DRchain.addBlock(new Block(16, "18.06.2021", "https://github.com/tibonto/dr/commit/b84b930c5add59e764636da663c8f14575cc5997"));
    DRchain.addBlock(new Block(17, "25.06.2021", "https://github.com/tibonto/dr/commit/2885b777e58c0b2c205dcf9936a0eb1fa6728f8d"));
    DRchain.addBlock(new Block(18, "02.07.2021", "https://github.com/tibonto/dr/commit/3bec095b369bc1faa5f3cbb665d925b20f0a5b2d"));
    DRchain.addBlock(new Block(19, "09.07.2021", "https://github.com/tibonto/dr/commit/ee5bba99487e6072a6d38b064eb3af44ba51311e"));
    DRchain.addBlock(new Block(20, "16.07.2021", "https://github.com/tibonto/dr/commit/456adbbf2b41a4b19a047f4cd7480db31ec39040"));
    DRchain.addBlock(new Block(21, "23.07.2021", "https://github.com/tibonto/dr/commit/aec64fed0b7a7762bb41b8bf37696304d9dd59c8"));
    DRchain.addBlock(new Block(22, "30.07.2021", "https://github.com/tibonto/dr/commit/9f405cbd7b2c74cab49cf7655e5c472b326caba5#diff-737d24d6a48ad5213e68f61ba9be0902f83b27a61fcc8fe1fda190d874221029"));
    DRchain.addBlock(new Block(23, "06.08.2021", "https://github.com/tibonto/dr/commit/002561cc8ae82e806d0d4f88be348786306f23f5"));
    DRchain.addBlock(new Block(24, "13.08.2021", "https://github.com/tibonto/dr/commit/78afa80106fa24e487a89a07f7d3fdd9b940fbdb"));
    DRchain.addBlock(new Block(25, "10.09.2021", "https://github.com/tibonto/dr/commit/1388590c64afc54825d114aa0ed60bad11edd253#diff-737d24d6a48ad5213e68f61ba9be0902f83b27a61fcc8fe1fda190d874221029"));
    DRchain.addBlock(new Block(26, "17.09.2021", "https://github.com/tibonto/dr/commit/991f3e674560e0dd56a8eabdd4f9e8e3d29e0ff6#diff-737d24d6a48ad5213e68f61ba9be0902f83b27a61fcc8fe1fda190d874221029"));
    DRchain.addBlock(new Block(27, "24.09.2021", "https://github.com/tibonto/dr/commit/d698e689eeff992a1f8fbd302d10153720d7cfc5"));
    DRchain.addBlock(new Block(28, "01.10.2021", "https://github.com/tibonto/dr/commit/a7dbc7a73d8017603ebec99f101d28b10273f1a7"));
    DRchain.addBlock(new Block(29, "11.10.2021", "https://github.com/tibonto/dr/commit/9db47057f9f71963d28b105627ff084bf936965f"));
    DRchain.addBlock(new Block(30, "18.10.2021", "https://github.com/tibonto/dr/commit/707317591da7f599cd39047e7386aac59963ae04"));
    DRchain.addBlock(new Block(31, "7.11.2021", "https://github.com/tibonto/dr/commit/58fea869ce4a712da9c8e6ed7086a34509c271fb"));
    DRchain.addBlock(new Block(32, "10.12.2021", "https://github.com/tibonto/dr/commit/310c40cc28e6e1dc38080e671861970d9b418e8f"));
    DRchain.addBlock(new Block(33, "31.01.2022", "https://github.com/tibonto/dr/commit/2b6218453ed75b40bedd7c341ab0fb855a468c98"));
    DRchain.addBlock(new Block(34, "14.02.2022", "https://github.com/tibonto/dr/commit/6d6fe56fb547a1ec46606c012e677594a28c7590"));
    DRchain.addBlock(new Block(35, "21.03.2022", "https://github.com/tibonto/dr/commit/8a00854ba39401248efcb1d490f431a27624635f"));
    DRchain.addBlock(new Block(36, "04.04.2022", "https://github.com/tibonto/dr/commit/a7536f9c2aba8b439af05b2e6f1a2fb0df81b126"));
    DRchain.addBlock(new Block(37, "13.06.2022", "https://github.com/tibonto/dr/commit/4c4f33ba014b4bee177143f7d5a2ed1cfc1fffb1"));
    DRchain.addBlock(new Block(38, "19.08.2022", "https://github.com/tibonto/dr/commit/1bbbfd860a20920ce221cbb915e1d7a72f1a59fc"));
    // DRchain.addBlock(new Block(39, "10.11.2022", "https://github.com/tibonto/dr/commit/50d0834deba2ce791772be7932055cf1a7bb9545"));
    
    // exportChainToExcel(DRchain, file_xlsx)
    // exportChainToWord(DRchain, file_doxc)
    return DRchain;
}

module.exports = {
    Block,
    // loadChainFromExcel,
    // exportChainToExcel, 
    // printBlockToConsole,
    // printChainToConsole,
    resetChain,
}
