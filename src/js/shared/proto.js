import * as ParamsProto from "../struct/params.js";

export function initParams(parameters={}) {
    if (!ParamsProto?.params?.Obj) {
        console.error("load params: ParamsProto.Obj schema is not available");
        return null;
    }

    const err = ParamsProto.params.Obj.verify(parameters);
    if (err) {
        console.error("load params: not verify >> "+err, parameters);
        return null;
    }

    //

    if (!parameters?.routes || typeof parameters.routes !== "object") {
        console.error("load params: check >> routes cannot be empty");
        return null;
    }
    if (!parameters?.routes?.primary_source || typeof parameters.routes.primary_source !== "object") {
        console.error("load params: check >> routes.primary_source cannot be empty");
        return null;
    }
    if (!parameters?.routes?.github || typeof parameters.routes.github !== "object") {
        console.error("load params: check >> routes.github cannot be empty");
        return null;
    }
    if (!parameters?.routes?.homepage || typeof parameters.routes.homepage !== "object") {
        console.error("load params: check >> routes.homepage cannot be empty");
        return null;
    }
    if (!parameters?.routes?.cave || typeof parameters.routes.cave !== "object") {
        console.error("load params: check >> routes.cave cannot be empty");
        return null;
    }
    if (!parameters?.routes?.dwellings || typeof parameters.routes.dwellings !== "object") {
        console.error("load params: check >> routes.dwellings cannot be empty");
        return null;
    }
    if (!parameters?.routes?.mfcg || typeof parameters.routes.mfcg !== "object") {
        console.error("load params: check >> routes.mfcg cannot be empty");
        return null;
    }
    if (!parameters?.routes?.village || typeof parameters.routes.village !== "object") {
        console.error("load params: check >> routes.village cannot be empty");
        return null;
    }
    if (!parameters?.routes?.viewer || typeof parameters.routes.viewer !== "object") {
        console.error("load params: check >> routes.viewer cannot be empty");
        return null;
    }


    if (!parameters?.flags || typeof parameters.flags !== "object") {
        console.error("load params: check >> flags cannot be empty");
        return null;
    }


    return new ParamsProto.params.Obj(parameters);
}

export function paramsUrlString(adrObj = new ParamsProto.params.RoutAdrObj({})) {
    switch (adrObj.type) {
        case ParamsProto.params.RoutAdrType.local:
            return adrObj.url;

        case ParamsProto.params.RoutAdrType.global:
            return "https://"+adrObj.url;

        default:
            console.error("unknown type RoutAdrType", adrObj.type)
    }
    return adrObj.url;
}