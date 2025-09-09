const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

const filesDir = path.join(__dirname, 'files');
if (!fs.existsSync(filesDir)) {
    fs.mkdirSync(filesDir);
}

// Serve static files from the root directory (for index.html, script.js, etc.)
app.use(express.static(__dirname));

// Serve uploaded files from the 'files' directory
app.use('/files', express.static(filesDir));

// Set up multer for file storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'files/');
    },
    filename: function (req, file, cb) {
        // Use a timestamp and the original name to avoid conflicts
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Set up the file upload endpoint
app.post('/upload', upload.single('attachment'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }
    // Respond with the path to the file
    res.json({ filePath: `files/${req.file.filename}` });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
