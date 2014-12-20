(function () {
    Polymer({
        options: [
            { name: 'All'  , value: 0 },
            { name: 'Log'  , value: 1 },
            { name: 'Warn' , value: 2 },
            { name: 'Error', value: 3 },
            { name: 'Info' , value: 4 },
        ],

        created: function () {
            this.icon = new Image();
            this.icon.src = "fire://static/img/plugin-console.png";

            this.ipc = new Fire.IpcListener();

            this.option = 0;
            this.filterText = '';
            this.useRegex = false;
            this.logs = [];
            this._curSelected = null;
        },

        attached: function () {
            // register ipc
            this.ipc.on('console:log', function ( text ) {
                this.add( 'log', text );
            }.bind(this) );

            this.ipc.on('console:warn', function ( text ) {
                this.add( 'warn', text );
            }.bind(this) );

            this.ipc.on('console:error', function ( text ) {
                this.add( 'error', text );
            }.bind(this) );

            this.ipc.on('console:info', function ( text ) {
                this.add( 'info', text );
            }.bind(this) );
        },

        detached: function () {
            this.ipc.clear();
        },

        add: function ( type, text ) {
            this.logs.push({
                type: type,
                text: text
            });
            this.logs = this.applyFilter( this.logs, this.filterText, this.option, this.useRegex );
        },

        clear: function () {
            this.logs = [];
        },

        applyFilter: function ( logs, filterText, option, useRegex ) {
            var filterLogs = [];

            var type;
            switch(option) {
                case 0: type = ""; break;
                case 1: type = "log"; break;
                case 2: type = "warn"; break;
                case 3: type = "error"; break;
                case 4: type = "info"; break;
            }

            var filter;
            if ( useRegex ) {
                filter = new RegExp(filterText);
            }
            else {
                filter = filterText.toLowerCase();
            }

            for ( var i = 0; i < logs.length; ++i ) {
                var log = logs[i];

                if ( type !== "" && log.type !== type ) {
                    continue;
                }

                if ( useRegex ) {
                    if ( !filter.exec(log.text) ) {
                        continue;
                    }
                }
                else {
                    if ( log.text.toLowerCase().indexOf(filter) === -1 ) {
                        continue;
                    }
                }

                filterLogs.push(log);
            }

            return filterLogs;
        },

        itemClickAction: function (event) {
            event.stopPropagation();

            this.$.detail.type = event.target.type;
            this.$.detail.log = event.target.text;

            if ( this._curSelected !== null  ){
                this._curSelected.selected = false;
            }
            this._curSelected = event.target;
            if ( this._curSelected ) {
                this._curSelected.selected = true;
            }
        },

        clearAction: function (event) {
            this.clear();
            this.$.detail.clear();
        },
    });
})();
