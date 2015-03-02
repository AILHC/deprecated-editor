﻿Fire._AssetsWatcher = (function () {

    function AssetsWatcher(owner) {
        this.owner = owner;

        /**
         *  {
         *      propName: {
         *          uuid: uuid,
         *          callback: callback,
         *      }
         *  }
         */
        this.watchingInfos = {};
    }

    // 如果该 component 不含任何需要检测的 asset，直接把 _assetsWatcher 置为该标记，这样能减少临时对象的创建。
    var EmptyWatcher = AssetsWatcher;

    AssetsWatcher.initComponent = function (component) {
        component._watcherHandler = null;
    };

    function forceSetterNotify(constructor, name, setter) {
        Object.defineProperty(constructor.prototype, name, {
            set: function (value, forceRefresh) {
                if (this._observing) {
                    Object.getNotifier(this).notify({
                        type: 'update',
                        name: name,
                        oldValue: this[name]
                    });
                }
                setter.call(this, value, forceRefresh);

                // 本来是应该用Object.observe，但既然这个 setter 要重载，不如就写在里面
                if (this._watcherHandler && this._watcherHandler !== EmptyWatcher) {
                    this._watcherHandler.changeWatchAsset(name, value);
                }
            },
            configurable: true
        });
    }

    function parseComponentProps (component) {
        var ctor = component.constructor;
        var assetPropsAttr = Fire.attr(ctor, 'A$$ETprops', {
            parsed: true,
            assetProps: null
        });
        for (var i = 0, props = ctor.__props__; i < props.length; i++) {
            var propName = props[i];
            var attrs = Fire.attr(ctor, propName);
            if (attrs.hasSetter && attrs.hasGetter) {
                var prop = component[propName];

                var isAssetType = (prop instanceof Fire.Asset || Fire.isChildClassOf(attrs.ctor, Fire.Asset));
                var maybeAsset = prop === null || typeof prop === 'undefined';
                if (isAssetType || maybeAsset) {
                    forceSetterNotify(ctor, propName, attrs.originalSetter);
                    if ( assetPropsAttr.assetProps ) {
                        assetPropsAttr.assetProps.push(propName);
                    }
                    else {
                        assetPropsAttr.assetProps = [propName];
                    }
                }
            }
        }
        return assetPropsAttr;
    }

    AssetsWatcher.initHandler = function (component) {
        var attrs = Fire.attr(component.constructor, 'A$$ETprops');
        if ( !(attrs && attrs.parsed) ) {
            attrs = parseComponentProps(component);
        }
        component._watcherHandler = attrs.assetProps ? (new AssetsWatcher(component)) : EmptyWatcher;
    };

    AssetsWatcher.start = function (component) {
        if (!component._watcherHandler) {
            AssetsWatcher.initHandler(component);
        }
        if (component._watcherHandler !== EmptyWatcher) {
            component._watcherHandler.start();
        }
    };

    AssetsWatcher.stop = function (component) {
        // if active, stop it
        if (component._watcherHandler && component._watcherHandler !== EmptyWatcher) {
            component._watcherHandler.stop();
        }
    };

    function invokeAssetSetter(component, propName, asset) {
        // TODO: 直接调用 set 方法，传入第二个参数，用于指明需要强制刷新
        component[propName] = asset;
    }

    AssetsWatcher.prototype.start = function () {
        var component = this.owner;
        var assetProps = Fire.attr(component.constructor, 'A$$ETprops', {}).assetProps;
        for (var i = 0; i < assetProps.length; i++) {
            var propName = assetProps[i];
            var prop = component[propName];
            if (prop && prop._uuid) {
                var onDirty = (function (propName) {
                    return function (asset) {
                        invokeAssetSetter(component, propName, asset);
                    };
                })(propName);
                Fire.AssetLibrary.assetListener.add(prop._uuid, onDirty);
                this.watchingInfos[propName] = {
                    uuid: prop._uuid,
                    callback: onDirty
                };
            }
        }
    };

    AssetsWatcher.prototype.stop = function () {
        for (var key in this.watchingInfos) {
            var info = this.watchingInfos[key];
            if (info) {
                Fire.AssetLibrary.assetListener.remove(info.uuid, info.callback);
            }
        }
        this.watchingInfos = {};
    };

    AssetsWatcher.prototype.changeWatchAsset = function (propName, newAsset) {
        // deregister old
        var info = this.watchingInfos[propName];
        if (info) {
            if (newAsset && info.uuid === newAsset._uuid) {
                return;
            }
            // if watching, remove
            this.watchingInfos[propName] = null;
            Fire.AssetLibrary.assetListener.remove(info.uuid, info.callback);
        }
        // register new
        if (newAsset) {
            var newUuid = newAsset._uuid;
            if (newUuid) {
                var component = this.owner;
                var onDirty = function (asset) {
                    invokeAssetSetter(component, propName, asset);
                };
                Fire.AssetLibrary.assetListener.add(newUuid, onDirty);
                this.watchingInfos[propName] = {
                    uuid: newUuid,
                    callback: onDirty
                };
            }
        }
    };

    return AssetsWatcher;
})();
