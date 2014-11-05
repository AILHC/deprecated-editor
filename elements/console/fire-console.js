(function () {
    Polymer({
        created: function () {
            this.icon = new Image();
            this.icon.src = "fire://static/img/plugin-console.png";

            this.ipc = new Fire.IpcListener();
        },

        ready: function () {
            // register ipc
            this.ipc.on('console:log', function ( text ) {
                this.$.view.add( 'log', text );
            }.bind(this) );

            this.ipc.on('console:warn', function ( text ) {
                this.$.view.add( 'warn', text );
            }.bind(this) );

            this.ipc.on('console:error', function ( text ) {
                this.$.view.add( 'error', text );
            }.bind(this) );

            this.ipc.on('console:hint', function ( text ) {
                this.$.view.add( 'hint', text );
            }.bind(this) );
        },

        detached: function () {
            this.ipc.clear();
        },
    });
})();
