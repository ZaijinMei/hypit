/**
 * [INPUT]: 依赖 @hypit/hypit/author-kit 的 Surface 宿主，依赖 renderEpisode 的画面
 * [OUTPUT]: 对外提供 Episode Surface，供 SVML 以 @realtryon/brand-film@1 引用
 * [POS]: packages/brand-film 的作者边界，把节拍、字体和实站素材收成一条轨道
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { ComponentPackage, ModuleManifest, StructuredSurfaceHandler } from "@hypit/hypit/author-kit";
export declare const manifest: ModuleManifest;
export declare const decodeSurface: StructuredSurfaceHandler;
export declare const hypitPackage: {
    format: "hypit.node-package@1";
    modules: {
        manifest: ModuleManifest;
    }[];
    components: ComponentPackage[];
    hostFacets: {
        readonly abi: string;
        readonly offers?: readonly string[];
        readonly implementation: unknown;
    }[];
};
export default hypitPackage;
