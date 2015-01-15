var Remote = require('remote');

Polymer({
    created: function () {
    },

    ready: function () {
        this.selectItem(0);
    },

    detached: function () {
    },

    selectItem: function ( index ) {
        for ( var i = 0; i < this.$.menu.children.length; ++i ) {
            if ( i === index ) {
                this.$.menu.children[i].classList.add('active');
                this.$.content.children[i].style.display = "";
            }
            else {
                this.$.menu.children[i].classList.remove('active');
                this.$.content.children[i].style.display = "none";
            }
        }
    },

    openAction: function ( event ) {
        var dialog = Remote.require('dialog');

        var result = dialog.showOpenDialog ( {
            title: "Choose a project",
            properties: [ 'openDirectory' ]
        } );

        if ( result ) {
            Fire.sendToCore( 'dashboard:add-project', result[0], true );
        }
    },

    projectAddedAction: function ( event ) {
        event.stopPropagation();

        this.selectItem(0);
    },

    recentAction: function ( event ) {
        event.stopPropagation();

        this.selectItem(0);
    },

    newTemplateAction: function ( event ) {
        event.stopPropagation();

        this.selectItem(1);
    },

    newKitAction: function ( event ) {
        event.stopPropagation();

        this.selectItem(2);
    },

    helpAction: function ( event ) {
        event.stopPropagation();

        this.selectItem(3);
    },
});
