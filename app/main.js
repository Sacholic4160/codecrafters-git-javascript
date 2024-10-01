const fs = require("fs");
const path = require("path");
const zlib = require('zlib')
const crypto = require('crypto')

// You can use print statements as follows for debugging, they'll be visible when running tests.
//console.log("Logs from your program will appear here!");

// Uncomment this block to pass the first stage
const command = process.argv[2];
const hash = process.argv[4];

switch (command) {
    case "init":
        createGitDirectory();
        break;
    case "cat-file":
        catFile(hash);
        break;
    case "hash-object":
        const fileName = process.argv[4];
        const shouldWrite = process.argv[3] === '-w'
        hashGitObject(fileName, shouldWrite);
        break;
    default:
        throw new Error(`Unknown command ${command}`);
}

function createGitDirectory() {
    fs.mkdirSync(path.join(process.cwd(), ".git"), { recursive: true });
    fs.mkdirSync(path.join(process.cwd(), ".git", "objects"), { recursive: true });
    fs.mkdirSync(path.join(process.cwd(), ".git", "refs"), { recursive: true });

    fs.writeFileSync(path.join(process.cwd(), ".git", "HEAD"), "ref: refs/heads/main\n");
    console.log("Initialized git directory");
}

function catFile(hash) {
    const content = fs.readFileSync(path.join(process.cwd(), ".git", "objects", hash.slice(0, 2), hash.slice(2)));
    const dataUnzipped = zlib.inflateSync(content);
    const result = dataUnzipped.toString().split('\0')[1];
    process.stdout.write(result);
}

function hashGitObject(fileName, shouldWrite) {
     const filePath = path.join(process.cwd, fileName);
   const  fileContent = fs.readFileSync(filePath);
    
    const blob = `blob ${fileContent.length()} \0 ${fileContent}`
    console.log(blob)
}
