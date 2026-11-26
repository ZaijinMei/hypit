/**
 * [INPUT]: 依赖 @hypit/hypit/author-kit 的 Surface 宿主，依赖 renderEpisode 的画面
 * [OUTPUT]: 对外提供 Episode Surface，供 SVML 以 @realtryon/brand-film@1 引用
 * [POS]: packages/brand-film 的作者边界，把节拍、字体和实站素材收成一条轨道
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { assertAttributes, canonicalize, createMarkupSurfaceHostFacet, sameType, sealGraphFragment, textAttribute } from "@hypit/hypit/author-kit";
import { compositionTypes } from "@hypit/hypit/composition";
import { mediaTypes } from "@hypit/hypit/media";
import { timelineTypes } from "@hypit/hypit/timeline";
import { spatialTypes } from "@hypit/hypit/spatial";
import { assertTemporalInstantFor, temporalTypes } from "@hypit/hypit/temporal";
import { createTemporalInstantProjection, createTemporalWindowProjection, resolveTemporalContext, temporalContextAttributeVocabulary, temporalInstantAttributeVocabulary, temporalWindowAttributeNames, temporalWindowAttributeVocabulary } from "@hypit/hypit/temporal-markup";
import { renderEpisode } from "./render.js";
const module = { name: "@realtryon/brand-film", version: "1" };
const types = Object.fromEntries(["Beat", "Beats", "Options"].map(name => [name, { module, name }]));
const producers = Object.fromEntries(["empty", "append", "render"].map(name => [name, { module, name }]));
export const manifest = {
    format: "hypit.module@1", ...module,
    dependencies: [...new Map([compositionTypes.visualTrack, mediaTypes.fontStack, mediaTypes.synchronized, mediaTypes.blobArtifact, timelineTypes.track, spatialTypes.canvas, temporalTypes.instant].map(type => [`${type.module.name}@${type.module.version}`, { module: type.module }])).values()],
    types: Object.values(types).map(type => ({ name: type.name })), capabilities: [],
    producers: [
        { name: "empty", inputs: [], outputs: [{ name: "beats", type: types.Beats }], needs: [] },
        { name: "append", inputs: [
                { name: "beats", type: types.Beats }, { name: "beat", type: types.Beat },
                { name: "at", type: temporalTypes.instant }, { name: "timeline", type: timelineTypes.track },
            ], outputs: [{ name: "beats", type: types.Beats }], needs: [] },
        { name: "render", inputs: [
                { name: "beats", type: types.Beats }, { name: "timeline", type: timelineTypes.track },
                { name: "canvas", type: spatialTypes.canvas }, { name: "window", type: temporalTypes.window },
                { name: "display", type: mediaTypes.fontStack }, { name: "sans", type: mediaTypes.fontStack },
                { name: "mirror", type: mediaTypes.synchronized }, { name: "glasses", type: mediaTypes.synchronized },
                { name: "fitting", type: mediaTypes.blobArtifact }, { name: "studio", type: mediaTypes.blobArtifact },
            ], outputs: [{ name: "track", type: compositionTypes.visualTrack }], needs: [] },
    ],
};
const value = (data) => ({ kind: "inline", value: canonicalize(data) });
function inline(record, label) {
    if (record?.value.kind !== "inline")
        throw new Error(`${label} must be an inline value.`);
    return record.value.value;
}
function image(record, label) {
    const blob = record?.value;
    if (blob?.kind !== "blob" || !blob.mediaType.startsWith("image/"))
        throw new Error(`${label} must be an image.`);
    return blob;
}
const component = { producers: [
        { producer: producers.empty, handler: () => ({ outputs: { beats: value([]) }, needs: {} }) },
        { producer: producers.append, handler: ({ inputs }) => {
                const spec = inline(inputs.beat, "Beat");
                const at = inline(inputs.at, "Beat time");
                const beats = inline(inputs.beats, "Beats");
                const timeline = inline(inputs.timeline, "Timeline");
                assertTemporalInstantFor(at, { subjectId: spec.id, space: timeline });
                if (beats.some(item => item.id === spec.id))
                    throw new Error(`Beat ${spec.id} is duplicated.`);
                if ((beats.at(-1)?.at.frame ?? -1) > at.frame)
                    throw new Error("Beats must arrive in time order.");
                return { outputs: { beats: value([...beats, { ...spec, at }]) }, needs: {} };
            } },
        { producer: producers.render, handler: ({ inputs }) => {
                const media = {
                    mirror: inline(inputs.mirror, "Mirror"),
                    glasses: inline(inputs.glasses, "Glasses"),
                    fitting: image(inputs.fitting, "Fitting room"),
                    studio: image(inputs.studio, "Photo studio"),
                };
                return { outputs: { track: value(renderEpisode(inline(inputs.timeline, "Timeline"), inline(inputs.canvas, "Canvas"), inline(inputs.window, "Window"), inline(inputs.display, "Display").faces, inline(inputs.sans, "Sans").faces, media, inline(inputs.beats, "Beats"))) }, needs: {} };
            } },
    ] };
const INSETS = new Set(["mirror", "glasses", "fitting", "studio", "none"]);
function optionalText(element, name) {
    const raw = element.attributes[name];
    if (raw === undefined)
        return "";
    if (typeof raw !== "string")
        throw new Error(`${element.name}.${name} must be text.`);
    return raw.trim();
}
function beatSpec(element) {
    const id = textAttribute(element, "id");
    const inset = textAttribute(element, "inset");
    if (!INSETS.has(inset))
        throw new Error(`Beat ${id} inset must be mirror, glasses, fitting, studio or none.`);
    const hold = Number(textAttribute(element, "hold"));
    if (!Number.isFinite(hold) || hold <= 0)
        throw new Error(`Beat ${id} hold must be a positive number of seconds.`);
    const pills = optionalText(element, "pills").split("|").map(item => item.trim()).filter(item => item.length > 0);
    return {
        id, holdSeconds: hold, inset: inset, kicker: optionalText(element, "kicker"),
        line: textAttribute(element, "line"), emphasis: optionalText(element, "emphasis"),
        body: optionalText(element, "body"), pills, note: optionalText(element, "note"),
        cta: optionalText(element, "cta"), url: optionalText(element, "url"),
    };
}
export const decodeSurface = ({ element, resolveReference }) => {
    assertAttributes(element, ["id", "timeline", "canvas", "display", "sans", "mirror", "glasses", "fitting", "studio", ...temporalWindowAttributeNames]);
    const id = textAttribute(element, "id");
    const context = resolveTemporalContext({ element, resolveReference });
    const window = createTemporalWindowProjection({ id: `${id}.window`, subjectId: id, element, ...context, resolveReference });
    const reference = (name, type) => {
        const raw = element.attributes[name];
        if (typeof raw !== "object" || raw.kind !== "reference")
            throw new Error(`${name} must be a reference.`);
        const found = resolveReference(raw.path);
        if (found === undefined || !sameType(found.type, type))
            throw new Error(`${name} has the wrong type.`);
        return found;
    };
    const records = [...window.records];
    const components = [...window.components];
    const fragments = [...window.fragments];
    const inputs = [
        { name: "timeline", type: timelineTypes.track }, { name: "canvas", type: spatialTypes.canvas },
        { name: "window", type: temporalTypes.window }, { name: "display", type: mediaTypes.fontStack },
        { name: "sans", type: mediaTypes.fontStack }, { name: "mirror", type: mediaTypes.synchronized },
        { name: "glasses", type: mediaTypes.synchronized }, { name: "fitting", type: mediaTypes.blobArtifact },
        { name: "studio", type: mediaTypes.blobArtifact },
    ];
    const bindings = {
        timeline: context.timeline.ref,
        canvas: reference("canvas", spatialTypes.canvas).ref,
        window: window.ref,
        display: reference("display", mediaTypes.fontStack).ref,
        sans: reference("sans", mediaTypes.fontStack).ref,
        mirror: reference("mirror", mediaTypes.synchronized).ref,
        glasses: reference("glasses", mediaTypes.synchronized).ref,
        fitting: reference("fitting", mediaTypes.blobArtifact).ref,
        studio: reference("studio", mediaTypes.blobArtifact).ref,
    };
    const input = (name) => ({ kind: "fragment-input", name });
    const operation = (name) => ({ kind: "fragment-operation", operation: name });
    const operations = [{ id: "empty", producer: producers.empty, inputs: {}, result: { kind: "output", name: "beats" } }];
    let previous = "empty";
    let index = 0;
    for (const child of element.children) {
        if (child.kind === "text") {
            if (child.value.trim())
                throw new Error("Episode accepts Beat children.");
            continue;
        }
        if (child.name.split(":").at(-1) !== "Beat")
            throw new Error("Episode accepts Beat children.");
        assertAttributes(child, ["id", "at", "hold", "inset", "line", "kicker", "emphasis", "body", "pills", "note", "cta", "url"].filter(name => child.attributes[name] !== undefined || ["id", "at", "hold", "inset", "line"].includes(name)));
        const spec = beatSpec(child);
        const at = createTemporalInstantProjection({ id: `${id}.${spec.id}`, subjectId: spec.id, element: child, ...context, resolveReference });
        records.push(...at.records);
        components.push(...at.components);
        fragments.push(...at.fragments);
        const key = `beat-${++index}`;
        records.push({ id: `${id}.${key}`, type: types.Beat, value: value(spec), range: child.range });
        inputs.push({ name: key, type: types.Beat }, { name: `${key}-at`, type: temporalTypes.instant });
        bindings[key] = { kind: "record", id: `${id}.${key}` };
        bindings[`${key}-at`] = at.ref;
        operations.push({
            id: key, producer: producers.append,
            inputs: { beats: operation(previous), beat: input(key), at: input(`${key}-at`), timeline: input("timeline") },
            result: { kind: "output", name: "beats" },
        });
        previous = key;
    }
    if (!index)
        throw new Error("Episode requires a Beat.");
    operations.push({
        id: "render", producer: producers.render,
        inputs: {
            beats: operation(previous), timeline: input("timeline"), canvas: input("canvas"), window: input("window"),
            display: input("display"), sans: input("sans"), mirror: input("mirror"), glasses: input("glasses"),
            fitting: input("fitting"), studio: input("studio"),
        },
        result: { kind: "output", name: "track" },
    });
    const fragment = sealGraphFragment({
        inputs, operations,
        exports: [{ name: "track", type: compositionTypes.visualTrack, root: operation("render") }],
    });
    return {
        records, fragments: [...fragments, fragment],
        components: [...components, { id, fragment: fragment.id, inputs: bindings, outputs: { track: `${id}.track` }, range: element.range }],
        exports: [`${id}.track`],
    };
};
const literal = (name, required, summary) => ({ name, kind: "literal", required, summary });
const declaration = {
    name: "episode", tag: "Episode", mode: "structured",
    outputs: [compositionTypes.visualTrack, timelineTypes.track, temporalTypes.window, temporalTypes.instant, temporalTypes.windowSpec, temporalTypes.instantSpec, ...Object.values(types)],
    vocabulary: {
        summary: "A white typographic brand episode. Each Beat is one feature, and its inset is real product evidence.",
        attributes: [
            ...temporalContextAttributeVocabulary, ...temporalWindowAttributeVocabulary,
            ...["id", "canvas", "display", "sans", "mirror", "glasses", "fitting", "studio"].map(name => ({ name, kind: "expression", required: true, summary: name })),
        ],
        children: [{
                tag: "Beat", cardinality: "many",
                summary: "One on-screen claim, its reading time, and which real inset supports it.",
                attributes: [
                    ...["id", "hold", "inset", "line"].map(name => literal(name, true, name)),
                    ...["kicker", "emphasis", "body", "pills", "note", "cta", "url"].map(name => literal(name, false, name)),
                    ...temporalInstantAttributeVocabulary,
                ],
            }],
        ports: [{ name: "track", type: compositionTypes.visualTrack, summary: "The complete episode picture." }],
        example: '<brand:Episode id="episode" timeline={animation.timeline} canvas={canvas} display={display} sans={sans} during="program" mirror={mirror.media} glasses={glasses.media} fitting={fitting} studio={studio}><brand:Beat id="hook" at="0s" hold="4.5" inset="mirror" line="Try it on" emphasis="while you move."/></brand:Episode>',
    },
};
export const hypitPackage = {
    format: "hypit.node-package@1", modules: [{ manifest }], components: [component],
    hostFacets: [createMarkupSurfaceHostFacet({ module, declaration, handler: decodeSurface })],
};
export default hypitPackage;
//# sourceMappingURL=activation.js.map