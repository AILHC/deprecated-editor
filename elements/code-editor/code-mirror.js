var Fs = require("fire-fs");
var Path = require('fire-path');
var Watch = require('node-watch');

Polymer({
    value: null,
    mode: 'htmlmixed',
    theme: 'zenburn',
    tabSize: 4,
    keyMap: 'sublime',
    lineNumbers: true,
    filePath: "",
    uuid: "",
    jshintError: "",
    blur: false,
    reload: false,
    editStatus: false,

    created: function () {
        this.cursor = {
            "line" : 0,
            "ch" : 0
        };
    },

    ready: function () {

    },

    domReady: function () {
    },

    refresh: function() {
        if ( this.mirror )
            this.mirror.refresh();
    },

    valueChanged: function() {
        if ( this.mirror ) {
            this.mirror.setValue(this.value);
        }
        else {
            this.createEditor();
        }
    },

    createEditor: function () {
        ChangeEditStatus(Path.basename(this.filePath),this.editStatus);

        CodeMirror.commands.save = function () {
            this.save();
        }.bind(this);

        CodeMirror.commands.autoformat = function () {
            this.autoFormat();
        }.bind(this);

        CodeMirror.commands.customSearch = function () {
            // this.autoFormat();
            alert('serach');
        }.bind(this);

        var mac = CodeMirror.keyMap.default == CodeMirror.keyMap.macDefault;
        //autoformat
        var autoformat = (mac ? "Cmd" : "Ctrl") + "-O";
        var search = (mac ? "Cmd" : "Ctrl") + "-F";
        var extraKeys = {};
        extraKeys[autoformat] = "autoformat";
        extraKeys[search] = "customSearch";

        this.mirror = CodeMirror(this.shadowRoot, {
            value: this.value,
            mode: this.mode,
            theme: this.theme,
            scroll: false,
            tabSize: this.tabSize,
            lineNumbers: this.lineNumbers,
            foldGutter: true,
            autoCloseTags: true,
            matchBrackets: true,
            styleActiveLine: true,
            autoCloseBrackets: true,
            showCursorWhenSelecting: true,
            keyMap: this.keyMap,
            extraKeys: extraKeys,
            gutters: ["CodeMirror-linenumbers", "CodeMirror-lint-markers","CodeMirror-foldgutter","breakpoints"],
        });

        this.mirror.on('change',function () {
            if (this.mode === "javascript") {
                this.updateHints();
            }
            this.editStatus = true;
        }.bind(this));

        this.mirror.on('cursorActivity',function () {
            this.cursor = this.mirror.getCursor();
        }.bind(this));

        switch (Path.extname(this.filePath).toLowerCase()) {
            case ".js" || ".json":
                this.mode = "javascript";
                break;
            case ".html" || ".htm":
                this.mode = "htmlmixed";
                break;
            case ".css" || ".styl":
                this.mode = "css";
                break;
            case ".xml" || ".xaml":
                this.mode = "xml";
                break;
            default:
                this.mode = "";
                break;
        }

        Watch(this.filePath, function(filename) {
            if (this.blur) {
                this.reload = true;
            }
        }.bind(this));

        if (this.mode === "javascript") {
            this.updateHints();
        }
        this.mirror.focus();
    },

    blurChanged: function () {
        if (!this.blur) {
            if (this.reload) {
                var result = confirm(Path.basename(this.filePath) + " was modified,do you want to reload?");
                if (result) {
                    this.fire('file-changed');
                }
            }
            this.reload = false;
            this.blur = false;
        }
    },

    keyMapChanged: function () {
        this.mirror.setOption('keyMap', this.keyMap);
    },

    modeChanged: function() {
        this.mirror.setOption('mode', this.mode);
    },

    themeChanged: function() {
        this.mirror.setOption('theme', this.theme);
    },

    tabSizeChanged: function() {
        this.mirror.setOption('tabSize', this.tabSize);
    },

    lineNumbersChanged: function() {
        this.mirror.setOption('lineNumbers', this.lineNumbers);
    },

    editStatusChanged: function () {
        ChangeEditStatus(Path.basename(this.filePath),this.editStatus);
    },

    lineComment: function () {
        var range = { from: this.mirror.getCursor(true), to: this.mirror.getCursor(false) };
        this.mirror.lineComment(range.from, range.to);
    },

    autoFormat: function () {
        var range = { from: this.mirror.getCursor(true), to: this.mirror.getCursor(false) };
        this.mirror.autoFormatRange(range.from, range.to);
    },

    save: function () {
        Fs.writeFile(this.filePath, this.mirror.getValue(), 'utf8', function ( err ) {
            if ( err ) {
                Fire.error( err.message );
                return;
            }

            Fire.log( this.filePath + " saved!");
            this.editStatus = false;
            // TEMP HACK
            Fire.sendToAll('asset:changed', this.uuid);
            Fire.sendToAll('asset-db:synced');
        }.bind(this));
    },

    updateHints: function() {
        this.mirror.operation(function(){
            JSHINT(this.mirror.getValue());
            if (JSHINT.errors.length > 0) {
                var errorMsg = "Jshint: [ line " +
                               JSHINT.errors[0].line +
                               " column " + JSHINT.errors[0].character +
                               " " +  JSHINT.errors[0].reason + " ]"
                               ;
                this.jshintError = errorMsg;
                this.jshint = JSHINT;
            }
            else {
                this.jshintError = "";
            }
        }.bind(this));
    },

    resetValue: function () {
        this.mirror.setValue(this.value);
    },

});
