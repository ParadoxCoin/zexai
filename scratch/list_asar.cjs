const fs = require('fs');

function listAsar(asarPath) {
    const fd = fs.openSync(asarPath, 'r');
    const headerSizeBuf = Buffer.alloc(8);
    fs.readSync(fd, headerSizeBuf, 0, 8, 0);
    const headerSize = headerSizeBuf.readUInt32LE(4);
    const headerBuf = Buffer.alloc(headerSize);
    fs.readSync(fd, headerBuf, 0, headerSize, 8);
    fs.closeSync(fd);
    
    const jsonSize = headerBuf.readUInt32LE(4);
    const jsonString = headerBuf.toString('utf8', 8, 8 + jsonSize);
    const header = JSON.parse(jsonString);
    
    console.log('ASAR Header read. Searching for "datacloud", "mcp_proxy", or "googlecloudtools":');
    
    function walk(node, currentPath) {
        if (node.files) {
            for (const name in node.files) {
                walk(node.files[name], currentPath + '/' + name);
            }
        } else {
            if (currentPath.toLowerCase().includes('datacloud') || 
                currentPath.toLowerCase().includes('mcp_proxy') || 
                currentPath.toLowerCase().includes('googlecloudtools')) {
                console.log(currentPath);
            }
        }
    }
    walk(header, '');
}

try {
    listAsar('C:/Users/MSİ/AppData/Local/Programs/antigravity/resources/app.asar');
} catch (e) {
    console.error(e);
}
