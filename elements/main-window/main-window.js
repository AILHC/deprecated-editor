var Remote = require('remote');
var Async = require('async');
var Url = require('fire-url');

Polymer({
    _scriptCompiled: false,

    created: function () {
        Fire.mainWindow = this;

        this.settings = {
            handle: "move", // move, rotate, scale
            coordinate: "local", // local, global
            pivot: "pivot", // pivot, center
        };
        this.sceneInfo = {};

        this.sceneNameObserver = null;
        this.ipc = new Fire.IpcListener();
    },

    ready: function () {
        window.addEventListener('resize', function() {
            this.$.mainDock._notifyResize();
        }.bind(this));
    },

    attached: function () {
        this.ipc.on('project:ready', this.init.bind(this));

        this.ipc.on('reload:window-scripts', function ( compiled ) {
            Fire._Sandbox.reloadScripts(compiled, function () {
                this._scriptCompiled = true;
            }.bind(this) );
        }.bind(this));

        this.ipc.on('asset-library:debugger:query-uuid-asset', function () {
            var results = [];
            for ( var p in Fire.AssetLibrary._uuidToAsset ) {
                var asset = Fire.AssetLibrary._uuidToAsset[p];
                results.push( { uuid: p, name: asset.name, type: Fire.JS.getClassName(asset) } );
            }
            Fire.sendToAll('asset-library:debugger:uuid-asset-results', results);
        }.bind(this));
    },

    detached: function () {
        this.ipc.clear();
    },

    domReady: function () {
        Fire.sendToCore('project:init');
    },

    init: function () {
        var self = this;

        Async.series([
            // init plugins
            function ( next ) {
                Polymer.import([
                    "fire://src/editor/fire-assets/fire-assets.html",
                    "fire://src/editor/fire-hierarchy/fire-hierarchy.html",
                    "fire://src/editor/fire-inspector/fire-inspector.html",
                    "fire://src/editor/fire-console/fire-console.html",
                    "fire://src/editor/fire-scene/fire-scene.html",
                    "fire://src/editor/fire-game/fire-game.html",
                ], function () {
                    self.addPlugin( self.$.hierarchyPanel, FireHierarchy, 'hierarchy', 'Hierarchy' );
                    self.addPlugin( self.$.assetsPanel, FireAssets, 'assets', 'Assets' );
                    self.addPlugin( self.$.inspectorPanel, FireInspector, 'inspector', 'Inspector' );
                    self.addPlugin( self.$.consolePanel, FireConsole, 'console', 'Console' );
                    self.addPlugin( self.$.editPanel, FireScene, 'scene', 'Scene' );
                    self.addPlugin( self.$.editPanel, FireGame, 'game', 'Game' );

                    // for each plugin
                    for ( var key in Fire.plugins) {
                        var plugin = Fire.plugins[key];

                        // init plugin
                        if ( plugin.init ) {
                            plugin.init();
                        }
                    }

                    next();
                });
            },

            // compile scripts
            function ( next ) {
                Fire.sendToCore('compiler:compile-and-reload');
                var id = setInterval( function () {
                    if ( self._scriptCompiled ) {
                        clearInterval(id);
                        next();
                    }
                }, 100 );
            },

            function ( next ) {
                // init AssetLibrary
                Fire.info('asset-library initializing...');
                Fire.AssetLibrary.init("library://");

                // query scenes
                var SCENE_ID = Fire.JS._getClassId(Fire._Scene);
                self.ipc.once('asset-db:query-results', function ( url, typeID, results ) {
                    console.timeEnd('query scenes');
                    if ( typeID === SCENE_ID ) {
                        for ( var i = 0; i < results.length; ++i ) {
                            var result = results[i];
                            var name = Url.basenameNoExt(result.url);
                            self.sceneInfo[result.uuid] = result.url;
                            Fire.Engine._sceneInfos[name] = result.uuid;
                        }
                        next();
                    }
                });
                console.time('query scenes');
                Fire.sendToCore('asset-db:query', "assets://", SCENE_ID);
            },

            function ( next ) {
                Fire.info('fire-engine initializing...');
                var renderContext = Fire.Engine.init( self.$.game.$.view.clientWidth,
                                                      self.$.game.$.view.clientHeight );

                // init game view
                self.$.game.setRenderContext(renderContext);

                // TODO: load last-open scene or init new
                var lastEditScene = null;
                if ( lastEditScene === null ) {
                    Fire.Engine._setCurrentScene(new Fire._Scene());

                    var camera = new Fire.Entity('Main Camera');
                    camera.addComponent(Fire.Camera);
                }

                // init scene view after Fire.Engine._setCurrentScene
                self.$.scene.initRenderContext();

                // observe the current scene name
                self.updateTitle();
                if ( self.sceneNameObserver ) {
                    self.sceneNameObserver.close();
                }
                self.sceneNameObserver = new PathObserver( Fire.Engine._scene, "_name" );
                self.sceneNameObserver.open( function ( newValue, oldValue ) {
                    self.updateTitle();
                }, self );

                next();
            },

        ], function ( err ) {
            if ( err ) {
                Fire.error( err.message );
            }
        } );
    },

    layoutToolsAction: function ( event ) {
        var layoutToolsSettings = this.$.toolbar.$.layoutTools.settings();
        Fire.JS.mixin( this.settings, layoutToolsSettings );

        this.$.scene.fire('layout-tools-changed');
        event.stopPropagation();
    },

    updateTitle: function () {
        var sceneName = Fire.Engine._scene.name;
        if ( !sceneName ) {
            sceneName = 'Untitled';
        }
        Remote.getCurrentWindow().setTitle( sceneName + " - Fireball Editor" );
    },

    addPlugin: function ( panel, plugin, id, name ) {
        var pluginInst = new plugin();
        pluginInst.setAttribute('id', id);
        pluginInst.setAttribute('name', name);
        pluginInst.setAttribute('fit', '');
        this.$[id] = pluginInst;
        panel.add(pluginInst);
        panel.$.tabs.select(0);
    },
});
