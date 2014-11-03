﻿
// This adapter converts editor callbacks to ipc events

(function () {

    var editorCallback = Fire.Engine._editorCallback;

    // pre-declaration for unit tests, overridable for editor
    Fire.broadcast = function () {};

    editorCallback.onSceneLaunched = function (scene) {
        Fire.broadcast('scene:launched');
        Fire.broadcast('scene:dirty');
    };

    editorCallback.onSceneLoaded = function (scene) {
        Fire.broadcast('scene:loaded', scene.entities);
    };

    var onEntityCreated = 'entity:created';
    editorCallback.onEntityCreated = function (entity) {
        Fire.broadcast( onEntityCreated,
                        entity._name,
                        entity._objFlags,
                        entity.id//,
                        //entity.parent && entity.parent.id
                      );
    };

    var onEntityRemoved = 'entity:removed';
    editorCallback.onEntityRemoved = function (entity) {
        Fire.broadcast( onEntityRemoved, entity.id );
        Fire.broadcast('scene:dirty');
    };

    var onEntityParentChanged = 'entity:parentChanged';
    editorCallback.onEntityParentChanged = function (entity) {
        Fire.broadcast( onEntityParentChanged,
                        entity.id,
                        entity.parent && entity.parent.id
                      );
        Fire.broadcast('scene:dirty');
    };

    var onEntityIndexChanged = 'entity:indexChanged';
    editorCallback.onEntityIndexChanged = function (entity, oldIndex, newIndex) {
        // get next sibling, skip object hidden in editor
        var next = null;
        var i = newIndex;
        do {
            ++i;
            next = entity.getSibling(i);
        } while (next && (next._objFlags & Fire._ObjectFlags.HideInEditor));
        //
        Fire.broadcast( onEntityIndexChanged, entity.id, next && next.id );
        Fire.broadcast('scene:dirty');
    };

    editorCallback.onEntityRenamed = function (entity) {
        Fire.broadcast('entity:renamed',
                        entity.id,
                        entity._name
                      );
    };

    editorCallback.onComponentEnabled = function (component) {
        Fire.broadcast('component:enabled', component.id);
    };

    editorCallback.onComponentDisabled = function (component) {
        Fire.broadcast('component:disabled', component.id);
    };

})();