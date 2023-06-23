const officegen = require('officegen')
const fs = require('fs')

module.exports = {
    exportLatestBlockToWord
}

function exportToWord(data, file){
    let docx = officegen('docx')
    let obj = docx.createP()
    obj.addText(data);
    out = fs.createWriteStream(file)
    docx.generate(out)
    console.log('saved in word:', file)
}

function exportLatestBlockToWord(block, folder){
    var block_str = JSON.stringify(block, null, 4)
    var timestamp = block.timestamp
    console.log("export lastest block to Word")
    var cnt = 0
    fs.readdir(folder, function(err, files){
        if(err)
            throw err
        // console.log(files)
        for(const f of files){
            if(f.slice(0,2)=='DR')
                cnt++
        }
        cnt++
        let date_dmy = timestamp.split('.')
        // timestamp = format("{}_{}_{}", date_dmy[2],date_dmy[1],date_dmy[0])
        timestamp = `${date_dmy[2]}_${date_dmy[1]}_${date_dmy[0]}`
        // let newWord = format("DR_{}_{}.docx", ("000"+cnt).slice(-3), timestamp)
        let newWord = `DR_${("000"+cnt).slice(-3)}_${timestamp}.docx`
        exportToWord(block_str, folder+'/'+newWord)
    })
}
