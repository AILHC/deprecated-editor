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
        this.collapse = true;
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
        this.logs = this.logs.slice();
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
            try {
                filter = new RegExp(filterText);
            }
            catch ( err ) {
                filter = new RegExp("");
            }
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


        filterLogs = filterLogs.map(function (item) {
            return {type:item.type,text:item.text,count:0}
        });

        var CollapseLogs = [];
        var count = 1;
        var index = 0;
        for (var i = 0 ;i < filterLogs.length-1; i++) {
            if (filterLogs[i+1].text !== filterLogs[i].text && this.collapse === true) {
                CollapseLogs.push(filterLogs[i]);
                index++;
                if (count !== 1) {
                    CollapseLogs[index-1].count = count;
                }
                count = 1;
            }else {
                count ++;
            }

            if (i === filterLogs.length-2 && this.collapse === true) {
                CollapseLogs.push(filterLogs[i+1]);
                if (filterLogs[i].text == filterLogs[i+1].text) {
                    CollapseLogs[index].count = count;
                }
            }
        }

        if (this.collapse) {
            return CollapseLogs;
        }else {
            return filterLogs;
        }
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
