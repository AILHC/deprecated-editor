var Remote = require('remote');
var Menu = Remote.require('menu');

Polymer({
    created: function () {
        this.icon = new Image();
        this.icon.src = "fire://static/img/plugin-assets.png";

        this.ipc = new Editor.IpcListener();
    },

    attached: function () {
        this.ipc.on('selection:asset:selected', this.select.bind(this, true));
        this.ipc.on('selection:asset:unselected', this.select.bind(this, false));
        this.ipc.on('selection:asset:activated', this.active.bind(this, true));
        this.ipc.on('selection:asset:deactivated', this.active.bind(this, false));
        this.ipc.on('asset:hint', this.hint.bind(this));
    },

    detached: function () {
        this.ipc.clear();
    },

    domReady: function () {
        Fire.info("browse assets://");
        this.$.assetsTree.browse("assets://");
    },

    select: function (selected, ids) {
        for (var i = 0; i < ids.length; ++i) {
            var id = ids[i];
            var el = this.$.assetsTree.idToItem[id];
            if (el) {
                el.selected = selected;
            }
        }
    },

    active: function (activated, id) {
        if ( activated ) {
            var el = this.$.assetsTree.idToItem[id];
            this.$.assetsTree.active(el);
        }
        else {
            this.$.assetsTree.active(null);
        }
    },

    hint: function (uuid) {
        this.$.assetsTree.hintItem(uuid);
    },

    createAction: function () {
        var rect = this.$.addIcon.getBoundingClientRect();
        var template = this.$.assetsTree.getCreateMenuTemplate();
        var menu = Menu.buildFromTemplate(template);
        menu.popup(Remote.getCurrentWindow(),
                   Math.floor(rect.left + 5),
                   Math.floor(rect.bottom + 10));
    },

});
