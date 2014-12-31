Polymer({

    created: function () {
        this.ipc = new Fire.IpcListener(this);
    },

    attached: function () {
        var typename = "";
        // get typename from url query
        var queryString = decodeURIComponent(location.search.substr(1));
        var queryList = queryString.split('&');
        for ( var i = 0; i < queryList.length; ++i ) {
            var pair = queryList[i].split("=");
            if ( pair[0] === "typename" ) {
                typename = pair[1];
            }
        }

        this.ipc.on('asset-db:query-results', function ( url, typename, results ) {
            this.$.dataView.dataList = results;
            this.$.dataView.typename = typename;
            this.$.dataView.update();
            Fire.log("load:"+typename+" array!");
        }.bind(this) );

        if (typename.toString() != "Fire.Texture") {
            this.$.btnGroup.style.display = "none";
        }
        this.$.btnGroup.select(0);

        Fire.sendToCore('asset-db:query', "assets://", typename );
    },

    detached: function () {
        this.ipc.clear();
    },

    oninput: function () {
        console.log('ipt');
    },

    listViewAction: function () {
        this.$.dataView.viewMode = "list";
    },

    gridViewAction: function () {
        this.$.dataView.viewMode = "grid";
    },

    inputAction: function ( event ) {
        this.datalist = event.detail.value;
    },

});
