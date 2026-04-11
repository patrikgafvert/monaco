const EditorApp = {
    editor: null,
    currentFile: null,
    currentFolder: "",

    init: function(config) {
        require.config({ paths: { 'vs': 'monaco' }});
        require(['vs/editor/editor.main'], () => {
            this.editor = monaco.editor.create(document.getElementById('editor'), {
                ...config
            });
            this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
                this.saveFile();
            });            this.getFiles("home");
        });
    },

    showStatus: function(text, color, sticky) {
        $("#saveStatus").stop(true, true).text(text).css("color", color).show();
        if (!sticky) $("#saveStatus").delay(4000).fadeOut(500);
    },

    apiCall: function(endpoint, data, successFn) {
        $.ajax({
            url: endpoint,
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify(data),
            success: successFn,
            error: (e) => this.showStatus(`Fel: ${e.responseText || e.statusText}`, "#ff4444", true)
        });
    },

    getFiles: function(path) {
        const target = path || "home";
        this.apiCall("api/list", { path: target }, (data) => {
            this.currentFolder = data.currentFolder;
            $("#currentFolder").text(this.currentFolder);
            
            const $list = $('#fileList').empty();
            $list.append('<div class="list-group-item text-warning pointer" onclick="EditorApp.getFiles(\'home\')">📁 HOME</div>');

            data.folders.forEach(f => {
                const p = `${this.currentFolder}/${f}`.replace(/\/+/g, '/');
                $list.append(`<div class="list-group-item text-info pointer" onclick="EditorApp.getFiles('${p}')">📂 ${f}</div>`);
            });

            data.files.forEach(f => {
                const p = `${this.currentFolder}/${f}`.replace(/\/+/g, '/');
                const active = (this.currentFile === p) ? "active-file" : "";
                $list.append(`<div class="list-group-item ${active} pointer" data-path="${p}" onclick="EditorApp.loadFile('${f}')">📄 ${f}</div>`);
            });
        });
    },

    loadFile: function(name) {
        const p = `${this.currentFolder}/${name}`.replace(/\/+/g, '/');
        this.apiCall("api/read", { path: p }, (content) => {
            this.editor.setValue(content);
            this.currentFile = p;
            $("#editorTitle").text(name);
            $("#saveBtn").prop("disabled", false);
            $(".list-group-item").removeClass("active-file");
            $(`[data-path="${p}"]`).addClass("active-file");

            const ext = name.split('.').pop().toLowerCase();
            const langMap = { 'py':'python', 'yaml':'yaml', 'yml':'yaml', 'js':'javascript', 'json':'json' };
            monaco.editor.setModelLanguage(this.editor.getModel(), langMap[ext] || 'plaintext');
        });
    },

    loadConfig: function() {
        this.apiCall("api/read", { path: "monaco_config.json" }, (content) => {
            this.editor.setValue(content);
            this.currentFile = "monaco_config.json";
            $("#editorTitle").html("<strong>Inställningar</strong>");
            $("#saveBtn").prop("disabled", false);
            $(".list-group-item").removeClass("active-file");
            monaco.editor.setModelLanguage(this.editor.getModel(), 'json');
        });
    },

    saveFile: function() {
        if (!this.currentFile) return;
        
        const content = this.editor.getValue();
        
        if (this.currentFile === "monaco_config.json") {
            try {
                const newConfig = JSON.parse(content);
                this.editor.updateOptions(newConfig);
            } catch (e) {
                this.showStatus("Fel: Ogiltig JSON-syntax. Kan inte spara.", "#ff4444", true);
                return; 
            }
        }

        this.showStatus("Sparar...", "white", true);
        this.apiCall("api/save", { fileName: this.currentFile, data: content }, (msg) => {
            this.showStatus(msg, "#00ff00", false);
        });
    }
};
