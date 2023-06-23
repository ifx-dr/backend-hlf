const fs = require('fs')

module.exports = {
    generateEmail
}

function generateEmail(newest_block, template){
    fs.readFile(template, function(err, data){
        let newest_block_str = JSON.stringify(newest_block, null, 4)
        console.log("generate email with template, paste output in Outlook")
        console.log('-----------generating Email-----------')
        let content = data.toString()
        // console.log(data.toString())
        let block_start_symbol = "++++++"
        let block_end_symbol = "------"
        let start = content.indexOf(block_start_symbol)
        let end = content.indexOf(block_end_symbol) + block_end_symbol.length
        console.log(content.slice(0, start))
        console.log(newest_block_str)
        console.log(content.slice(end))
        console.log('-----------Email generated-----------')
    });
}
