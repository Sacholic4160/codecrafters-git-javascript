const fs = require("fs");
const { join } = require("path");
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
    case "write-tree":
        writeTree();
        break;
    case "commit-tree":
        commitTree();
        break
    default:
        throw new Error(`Unknown command ${command}`);
}

function createGitDirectory() {
    fs.mkdirSync(join(process.cwd(), ".git"), { recursive: true });
    fs.mkdirSync(join(process.cwd(), ".git", "objects"), { recursive: true });
    fs.mkdirSync(join(process.cwd(), ".git", "refs"), { recursive: true });

    fs.writeFileSync(join(process.cwd(), ".git", "HEAD"), "ref: refs/heads/main\n");
    console.log("Initialized git directory");
}

function catFile(hash) {
    const content = fs.readFileSync(join(process.cwd(), ".git", "objects", hash.slice(0, 2), hash.slice(2)));
    const dataUnzipped = zlib.inflateSync(content);
    const result = dataUnzipped.toString().split('\0')[1];
    process.stdout.write(result);
}

function hashObject(fileName, shouldWrite) {
    // 1. Read file content
    const filePath = join(process.cwd(), fileName);
    const fileContent = fs.readFileSync(filePath);

    // 2. Create the blob string: `blob <size>\0<content>`
    const blobHeader = `blob ${fileContent.length}\0`;
    const blob = Buffer.concat([Buffer.from(blobHeader), fileContent]);

    // 3. Compute the SHA-1 hash of the blob
    const sha1 = crypto.createHash("sha1").update(blob).digest("hex");

    // 4. Write the blob to .git/objects if the -w flag is present
    if (shouldWrite) {
        const objectDir = join(process.cwd(), ".git", "objects", sha1.slice(0, 2));
        const objectFile = sha1.slice(2);

        // Create the folder if it doesn't exist
        fs.mkdirSync(objectDir, { recursive: true });

        // Compress the blob
        const compressedBlob = zlib.deflateSync(blob);

        // Write the compressed blob to the objects directory
        fs.writeFileSync(join(objectDir, objectFile), compressedBlob);

        // 5. Output the hash
        process.stdout.write(sha1);
    }




}

function lsTree(flag) {
    if (flag == '--name-only') {
        const sha = process.argv[4];
        const directory = sha.slice(0, 2);
        const fileName = sha.slice(2);
        const filePath = join(process.cwd(), '.git', 'objects', directory, fileName);
        const inflattedData = zlib.inflateSync(fs.readFileSync(filePath)).toString().split('\0')
        const content = inflattedData.slice(1).filter(value => value.includes(" "));
        const names = content.map(value => value.split(" ")[1]);
        names.forEach(name => process.stdout.write(`${name}\n`));

    }
}

function writeTree() {
    const hash = writeTreeForPath(".");
    process.stdout.write(hash);
}

// function writeTreeForPath(path) {
//     const dirContent = fs.readdirSync(path)
//     //console.log('fullPath:',fullPath);
//     const entries = dirContent.filter((name) => name !== '.git' && name !== 'main.js')
//         .map((name) => {
//             const fullPath = join(path, name);
//            // console.log('fullPath:', fullPath);
//             const stat = fs.statSync(fullPath)
//            // console.log('stat:', stat);

//             if (stat.isDirectory()) {
//                 return ["40000", name, writeTreeForPath(name)];
//             }
//             else if (stat.isFile()) {
//                 return ["100644", name, saveFileToBlob(name)];
//             }
//             return ["", "", ""];
//         })
//      .sort((a,b) => a[1]- b[1])
//      .reduce((acc, [mode, name, hash]) => {
//         return Buffer.concat([acc, Buffer.from(`${mode} ${name} \x00`), Buffer.from(hash, "hex")])
//      }, Buffer.alloc(0))
//      console.log('entries:', entries)

//      const tree = Buffer.concat(Buffer.from(`tree ${entries.length}\x00`), entries);
//      console.log('tree:', tree)
//      const hash = crypto.createHash("sha1").update(tree).digest("hex")
//      console.log('hash:', hash)
//      writeObject(hash, tree);
//      return hash;

// }
function writeTreeForPath(path) {
    const dirContent = fs.readdirSync(path);
    const entries = dirContent.filter((name) => name !== ".git" && name !== "main.js")
        .map((name) => {
            const fullPath = join(path, name);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                return ["40000", name, writeTreeForPath(fullPath)];
            } else if (stat.isFile()) {
                return ["100644", name, saveFileAsBlob(fullPath)];
            }
            return ["", "", ""];
        })
        .sort((a, b) => (a[1] - b[1]))
        .reduce((acc, [mode, name, hash]) => {
            return Buffer.concat([acc, Buffer.from(`${mode} ${name}\x00`), Buffer.from(hash, "hex")]);
        }, Buffer.alloc(0));
    const tree = Buffer.concat([Buffer.from(`tree ${entries.length}\x00`), entries]);
    const hash = crypto.createHash("sha1").update(tree).digest("hex");
    writeObject(hash, tree);
    return hash;
}


// function saveFileAsBlob(file) {

//    // console.log('fs.readFileSync(file):', fs.readFileSync(file)) data inside the file using this 
//     const data = `blob ${fs.statSync(file).size}\x00${fs.readFileSync(file)}`
//     //console.log('data', data)
//     const hash = crypto.createHash("sha1").update(data).digest("hex");
//     console.log('hash', hash)
//     const dir = fs.mkdir(join(process.cwd(), ".git","objects", hash.slice(0,2)), {recursive: true})
//     fs.writeFileSync(join(dir, hash.slice(2)), zlib.deflateSync(data));
//     process.stdout.write(hash);
//     writeObject(hash, data);
//     return hash;
// }
function saveFileAsBlob(file) {
    const data = `blob ${fs.statSync(file).size}\x00${fs.readFileSync(file)}`;
    const hash = crypto.createHash("sha1").update(data).digest("hex");
    writeObject(hash, data);
    return hash;
}

function writeObject(hash, content) {
    const dir = join(process.cwd(), ".git", "objects", hash.slice(0, 2));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(join(dir, hash.slice(2)), zlib.deflateSync(content));
}


function commitTree() {
    const treeSha = process.argv[3];
   // console.log(treeSha);

    const parentTreeSha = process.argv.slice(process.argv.indexOf('-p'), process.argv.indexOf('-p')+2)[1];
    const message = process.argv.slice(process.argv.indexOf('-m'), process.argv.indexOf('-m')+2)[1];


    const commitContentBuffer = Buffer.concat([
        Buffer.from(`tree ${treeSha}\n`),
        Buffer.from(`parent ${parentTreeSha}\n`),
        Buffer.from(`author The Commiter <thecommitter@test.com> ${Date.now()} +0000\n`),
        Buffer.from(`Commiter The Commiter <thecommitter@test.com> ${Date.now()} +0000\n\n`),
        Buffer.from(`${message}\n`)
    ])
   // console.log(getTreeStructureFromBuffer(commitContentBuffer))
   const commitBuffer = Buffer.concat([
    Buffer.from(`commit ${commitContentBuffer.length}\0`,commitContentBuffer)
   ])

   const commitHash = crypto.createHash("sha1").update(commitBuffer).digest("hex");
   const compressedCommit = zlib.deflateSync(commitHash)

   const dir = commitHash.slice(0, 2);
    const fileName = commitHash.slice(2);
    const commitDir = path.resolve(__dirname, '.git', 'objects', dir);
    
    mkdirSync(commitDir, { recursive: true });
    writeFileSync(path.resolve(commitDir, fileName), compressedCommit);
    
    process.stdout.write(commitHash);
}