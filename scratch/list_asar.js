const fs = require('fs');

function listAsar(asarPath) {
    const fd = fs.openSync(asarPath, 'r');
    const headerSizeBuf = Buffer.alloc(8);
    fs.readSync(fd, headerSizeBuf, 0, 8, 0);
    const headerSize = headerSizeBuf.readUInt32LE(4);
    const headerBuf = Buffer.alloc(headerSize);
    fs.readSync(fd, headerBuf, 0, headerSize, 8);
    fs.closeSync(fd);
    
    // The first 8 bytes of headerBuf are: 4 bytes (always 4) + 4 bytes JSON size
    const jsonSize = headerBuf.readUInt32LE(4);
    const jsonString = headerBuf.toString('utf8', 8, 8 + jsonSize);
    const header = JSON.parse(jsonString);
    
    console.log('ASAR Header read successfully. Listing paths:');
    
    function walk(node, currentPath) {
        if (node.files) {
            for (const name in node.files) {
                walk(node.files[name], currentPath + '/' + name);
            }
        } else {
            console.log(currentPath);
        }
    }
    walk(header, '');
}

try {
    listAsar('C:/Users/MSİ/AppData/Local/Programs/antigravity/resources/app.asar');
} catch (e) {
    console.error(e);
}
