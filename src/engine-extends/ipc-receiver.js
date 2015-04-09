﻿if (!Fire.isAtomShell) {
    return;
}

var Ipc = require('ipc');
var Url = require('fire-url');

var Engine = Fire.Engine;
var Entity = Fire.Entity;
var FObject = Fire.FObject;

Ipc.on('engine:rename-entity', function ( detail ) {
    var id = detail.id;
    var name = detail.name;

    var entity = Editor.getInstanceById(id);
    if (entity) {
        entity.name = name;
    }
});

Ipc.on('engine:delete-entities', function ( detail ) {
    var idList = detail['entity-id-list'];
    for (var i = 0; i < idList.length; i++) {
        var id = idList[i];
        var entity = Editor.getInstanceById(id);
        if (entity) {
            entity.destroy();
        }
    }
    if ( !Engine.isPlaying ) {
        FObject._deferredDestroy();
    }
});

Ipc.on('engine:create-entity', function (detail) {
    var parentId;
    if ( detail ) {
        parentId = detail['parent-id'];
    }
    var ent = new Entity();
    if (parentId) {
        var parent = Editor.getInstanceById(parentId);
        if (parent) {
            ent.parent = parent;
        }
    }
});

Ipc.on('engine:move-entities', function ( detail ) {
    var idList = detail['entity-id-list'];
    var parentId = detail['parent-id'];
    var nextSiblingId = detail['next-sibling-id'];

    var parent = parentId && Editor.getInstanceById(parentId);
    var next = nextSiblingId ? Editor.getInstanceById(nextSiblingId) : null;
    var nextIndex = next ? next.getSiblingIndex() : -1;

    for (var i = 0; i < idList.length; i++) {
        var id = idList[i];
        var entity = Editor.getInstanceById(id);
        if (entity && (!parent || !parent.isChildOf(entity))) {
            if (entity.parent !== parent) {
                // keep world transform not changed
                var worldPos = entity.transform.worldPosition;
                var worldRotation = entity.transform.worldRotation;
                var lossyScale = entity.transform.worldScale;
                entity.parent = parent;
                // restore world transform
                entity.transform.worldPosition = worldPos;
                entity.transform.worldRotation = worldRotation;
                if (parent) {
                    entity.transform.scale = lossyScale.divSelf(parent.transform.worldScale);
                }
                else {
                    entity.transform.scale = lossyScale;
                }
                if (next) {
                    entity.setSiblingIndex(nextIndex);
                    ++nextIndex;
                }
            }
            else if (next) {
                var lastIndex = entity.getSiblingIndex();
                var newIndex = nextIndex;
                if (newIndex > lastIndex) {
                    --newIndex;
                }
                if (newIndex !== lastIndex) {
                    entity.setSiblingIndex(newIndex);
                    if (lastIndex > newIndex) {
                        ++nextIndex;
                    }
                    else {
                        --nextIndex;
                    }
                }
            }
            else {
                entity.setAsLastSibling();
            }
        }
    }
});

Ipc.on('engine:duplicate-entities', function ( detail ) {
    var idList = detail['entity-id-list'];

    for (var i = 0; i < idList.length; i++) {
        var id = idList[i];
        var entity = Editor.getInstanceById(id);
        if (entity) {
            // duplicate
            var clone = Fire.instantiate(entity);
            clone.parent = entity.parent;
        }
    }
});

Ipc.on('engine:add-component', function ( detail ) {
    var entityId = detail['entity-id'];
    var componentClassId = detail['component-class-id'];

    var entity = Editor.getInstanceById(entityId);
    if (entity) {
        var CompCtor = Fire.JS._getClassById(componentClassId);
        if (CompCtor) {
            entity.addComponent(CompCtor);
        }
    }
});

Ipc.on('engine:remove-component', function ( detail ) {
    var componentId = detail['component-id'];
    var comp = Editor.getInstanceById(componentId);
    if (comp) {
        comp.destroy();
    }
    if ( !Engine.isPlaying ) {
        FObject._deferredDestroy();
    }
});

Ipc.on('engine:open-scene', function ( detail ) {
    var uuid = detail.uuid;
    if (! Fire.Engine.loadingScene) {
        Fire.AssetLibrary.clearAllCache();
        Fire.Engine._loadSceneByUuid(uuid, null, function () {
            Fire.Engine.stop();
        });
    }
});

Ipc.on('asset:moved', function ( detail ) {
    var uuid = detail.uuid;
    var destUrl = detail['dest-url'];

    // rename asset
    var newName, asset = Fire.AssetLibrary.getAssetByUuid(uuid);
    if (asset) {
        newName = Url.basenameNoExt(destUrl);
        asset.name = newName;
    }

    // rename scene
    if (Url.extname(destUrl) === '.fire') {
        for (var key in Fire.Engine._sceneInfos) {
            if (Fire.Engine._sceneInfos[key] === uuid) {
                delete Fire.Engine._sceneInfos[key];
                newName = Url.basenameNoExt(destUrl);
                Fire.Engine._sceneInfos[newName] = uuid;
                break;
            }
        }
    }
});

Ipc.on('assets:deleted', function (detail) {
    var results = detail.results;
    for ( var i = 0; i < results.length; ++i ) {
        var cachedAsset = Fire.AssetLibrary.getCachedAsset(results[i].uuid);
        if (cachedAsset) {
            if (cachedAsset instanceof Fire._Scene) {
                // unregister scene
                // 如果是场景反注册就行了，不用销毁，因为可能还正在编辑。
                var name = Url.basenameNoExt(results[i].url);
                delete Fire.Engine._sceneInfos[name];
            }
            else {
                Fire.AssetLibrary.unloadAsset(cachedAsset, true);
            }
        }
    }
});

Ipc.on('asset:changed', function (detail) {
    var uuid = detail.uuid;
    // 某些 Importer 会依据修改后的 meta 重新 import 一次，
    // 对它们来说 asset 需要重新导入才能得到真正结果。
    Fire.AssetLibrary.onAssetReimported(uuid);
});

Ipc.on('asset:created', function ( detail ) {
    var url = detail.url;
    var id = detail.uuid;

    // register scene
    if (Url.extname(url) === '.fire') {
        var name = Url.basenameNoExt(url);
        Fire.Engine._sceneInfos[name] = id;
    }
});

Ipc.on('assets:created', function ( detail ) {
    var results = detail.results;
    for ( var i = 0; i < results.length; ++i ) {
        var info = results[i];
        // register scene
        if (Url.extname(info.url) === '.fire') {
            var name = Url.basenameNoExt(info.url);
            Fire.Engine._sceneInfos[name] = info.uuid;
        }
    }
});
