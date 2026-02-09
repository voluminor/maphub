export function handleSensorEvent(a) {
    this.accelerometer.onUpdate.dispatch(a.accelerationIncludingGravity.x, a.accelerationIncludingGravity.y, a.accelerationIncludingGravity.z)
}
export function addModule(a) {
    a.__registerLimeModule(this);
    this.modules.push(a)
}
export function __onWindowClose(a) {
    if (this.__window == a) this.onWindowClose();
    this.__removeWindow(a)
}

export function registerLimeProject(root, globalRef, projectName, projectFactory) {
    root.lime = root.lime || {};
    root.lime.$scripts = root.lime.$scripts || {};
    root.lime.$scripts[projectName] = projectFactory;

    if (!root.lime.embed || !root.lime.embed.__shared_lime_embed__) {
        const embed = function (name) {
            const locals = {};
            const scriptFn = root.lime.$scripts[name];
            if (!scriptFn) throw Error('Cannot find project name "' + name + '"');

            scriptFn(locals, globalRef);

            for (const k in locals) root[k] = root[k] || locals[k];

            const win = typeof window !== "undefined" ? window : root;
            const limeRef = (locals.lime || win.lime);
            if (limeRef && limeRef.embed && this !== limeRef.embed) {
                return limeRef.embed.apply(limeRef, arguments);
            }

            return locals;
        };

        Object.defineProperty(embed, "__shared_lime_embed__", { value: true });
        root.lime.embed = embed;
    }

    return root.lime;
}

export function registerAmdLime(root) {
    if (typeof define === "function" && define.amd) {
        define([], function () {
            return root.lime;
        });
        define.__amd = define.amd;
        define.amd = null;
    }
}
