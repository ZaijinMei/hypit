/**
 * [INPUT]: 依赖 @hypit/hypit/hyperframes 的 browserProgram，依赖已规范化的直播镜子视频与实站截图
 * [OUTPUT]: 对外提供 renderEpisode，把一集竖屏品牌片画成一条 VisualTrack
 * [POS]: packages/brand-film 的画面实现，被 activation 的 Episode Surface 调用
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { FontArtifactRef, SynchronizedMedia } from "@hypit/hypit/media";
import type { BlobRef } from "@hypit/hypit/author-kit";
import type { Timeline } from "@hypit/hypit/timeline";
import type { CanvasSpace } from "@hypit/hypit/spatial";
import type { TemporalInstant, TemporalWindow } from "@hypit/hypit/temporal";
export type InsetKind = "mirror" | "glasses" | "fitting" | "studio" | "none";
export type BeatSpec = {
    id: string;
    holdSeconds: number;
    inset: InsetKind;
    kicker: string;
    line: string;
    emphasis: string;
    body: string;
    pills: readonly string[];
    note: string;
    cta: string;
    url: string;
};
export type Beat = BeatSpec & {
    at: TemporalInstant;
};
export type EpisodeMedia = {
    mirror: SynchronizedMedia;
    glasses: SynchronizedMedia;
    fitting: BlobRef;
    studio: BlobRef;
};
export declare function assertBeatSpec(value: BeatSpec): void;
/** 白底排版广告框。产品内嵌只放实站截图和官网直播镜子录像。 */
export declare function renderEpisode(timeline: Timeline, canvas: CanvasSpace, window: TemporalWindow, display: readonly FontArtifactRef[], sans: readonly FontArtifactRef[], media: EpisodeMedia, beats: readonly Beat[]): import("@hypit/hypit/composition").VisualTrack;
