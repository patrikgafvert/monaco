'use strict';
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

const monacoVersion = JSON.parse(
    fs.readFileSync(
        path.join(__dirname, 'node_modules', 'monaco-editor', 'package.json'),
        'utf8'
    )
).version;

const CONFIG_FILE = 'monaco_config.json';
const DEFAULT_FOLDER = path.join(__dirname, 'configFolder');

const DEFAULT_CONFIG = {
    theme: 'vs-dark',
    fontSize: 14,
    supported_extensions: ['.yaml', '.yml', '.py', '.js', '.json', '.html', '.css', '.txt', '.conf']
};

let editorConfig = { ...DEFAULT_CONFIG };

async function loadConfig() {
    try {
        const configData = await fs.promises.readFile(path.join(__dirname, CONFIG_FILE), 'utf8');
        editorConfig = { ...DEFAULT_CONFIG, ...JSON.parse(configData) };
        editorConfig.value = await fs.promises.readFile(path.join(__dirname, 'welcome.txt'), 'utf8');
    } catch (err) {
        editorConfig = { ...DEFAULT_CONFIG };
        editorConfig.value = 'Välkommen till HA-Editor! Välj en fil för att börja.';
    }
}

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.json({ limit: '50mb' }));

app.use('/bootstrap', express.static(path.join(__dirname, 'node_modules/bootstrap/dist')));
app.use('/jquery', express.static(path.join(__dirname, 'node_modules/jquery/dist')));
app.use('/monaco', express.static(path.join(__dirname, 'node_modules/monaco-editor/min/vs')));

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', async (req, res) => {
    await loadConfig();
    res.render('index', { config: JSON.stringify(editorConfig), monacoVersion });
});

app.post('/api/list', async (req, res) => {
    let targetDir = '';
    try {
        targetDir = (req.body.path === 'home' || !req.body.path) ? DEFAULT_FOLDER : req.body.path;
        const entries = await fs.promises.readdir(targetDir, { withFileTypes: true });

        const folders = entries.filter(e => e.isDirectory() && !e.name.startsWith('.')).map(e => e.name).sort();
        const allowedExtensions = editorConfig.supported_extensions || [];
        const files = entries.filter(e => {
            const ext = path.extname(e.name).toLowerCase();
            return !e.isDirectory() && allowedExtensions.includes(ext) && e.name !== CONFIG_FILE;
        }).map(e => e.name).sort();

        res.json({ currentFolder: targetDir, folders, files });
    } catch (err) {
        res.status(500).send(`Fel vid läsning: ${targetDir}. ${err.message}`);
    }
});

app.post('/api/read', async (req, res) => {
    try {
        const filePath = (req.body.path === CONFIG_FILE) ? path.join(__dirname, CONFIG_FILE) : req.body.path;
        const data = await fs.promises.readFile(filePath, 'utf8');
        res.send(data);
    } catch (err) {
        res.status(500).send('Kunde inte läsa fil: ' + err.message);
    }
});

app.post('/api/save', async (req, res) => {
    try {
        const { fileName, data } = req.body;
        const filePath = (fileName === CONFIG_FILE) ? path.join(__dirname, CONFIG_FILE) : fileName;
        await fs.promises.writeFile(filePath, data, 'utf8');
        res.send('✅ Sparad!');
    } catch (err) {
        res.status(500).send('Fel vid sparande: ' + err.message);
    }
});

loadConfig().catch(() => {});
app.listen(8099, '0.0.0.0', () => console.log('Server redo på port 8099'));
