const fs = require("fs");
const path = require("path");
const zlib = require('zlib')
const crypto = require('crypto');


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
        hashObject(fileName, shouldWrite);
        break;
    case "ls-tree":
        const flag = process.argv[3];
        lsTree(flag);
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

function hashObject(fileName, shouldWrite) {
    // 1. Read file content
    const filePath = path.join(process.cwd(), fileName);
    const fileContent = fs.readFileSync(filePath);
  
    // 2. Create the blob string: `blob <size>\0<content>`
    const blobHeader = `blob ${fileContent.length}\0`;
    const blob = Buffer.concat([Buffer.from(blobHeader), fileContent]);
  
    // 3. Compute the SHA-1 hash of the blob
    const sha1 = crypto.createHash("sha1").update(blob).digest("hex");
  
    // 4. Write the blob to .git/objects if the -w flag is present
    if (shouldWrite) {
      const objectDir = path.join(process.cwd(), ".git", "objects", sha1.slice(0, 2));
      const objectFile = sha1.slice(2);
  
      // Create the folder if it doesn't exist
      fs.mkdirSync(objectDir, { recursive: true });
  
      // Compress the blob
      const compressedBlob = zlib.deflateSync(blob);
  
      // Write the compressed blob to the objects directory
      fs.writeFileSync(path.join(objectDir, objectFile), compressedBlob);
      
    // 5. Output the hash
    process.stdout.write(sha1);
    }
  

   

}

function lsTree(flag) {
    if(flag == '--name-only'){
        const sha = process.argv[4];
        console.log(sha)
        const directory = sha.slice(0,2);
        console.log(directory)
        const fileName = sha.slice(2);
        console.log(fileName)

        const filePath = path.join(process.cwd(), '.git', 'objects', directory, fileName);
        console.log(filePath)
      
        const inflattedData  = zlib.inflateSync(fs.readFileSync(filePath).toString().split('\0'))
      
       const content  = inflattedData.split(1).filter(value => value.includes(" "));
       console.log(content)
       const names = content.map(value => value.split(" ")[1]);
        console.log(names)

        names.forEach(name => process.stdout.write(`${name}\n`));

     




    }
}
