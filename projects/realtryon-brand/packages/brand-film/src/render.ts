/**
 * [INPUT]: 依赖 @hypit/hypit/hyperframes 的 browserProgram，依赖已规范化的直播镜子视频与实站截图
 * [OUTPUT]: 对外提供 renderEpisode，把一集竖屏品牌片画成一条 VisualTrack
 * [POS]: packages/brand-film 的画面实现，被 activation 的 Episode Surface 调用
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { sealVisualTrack } from "@hypit/hypit/composition";
import type { VisualElement, VisualStyleDeclaration } from "@hypit/hypit/composition";
import { browserProgram } from "@hypit/hypit/hyperframes";
import type { FontArtifactRef, SynchronizedMedia } from "@hypit/hypit/media";
import type { BlobRef } from "@hypit/hypit/author-kit";
import { projectTimelineSpace } from "@hypit/hypit/timeline";
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

export type Beat = BeatSpec & { at: TemporalInstant };

export type EpisodeMedia = {
  mirror: SynchronizedMedia;
  glasses: SynchronizedMedia;
  fitting: BlobRef;
  studio: BlobRef;
};

const INSETS = new Set<InsetKind>(["mirror", "glasses", "fitting", "studio", "none"]);

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export function assertBeatSpec(value: BeatSpec): void {
  assert(/^[A-Za-z][A-Za-z0-9_-]{0,63}$/u.test(value.id), `Beat ${value.id} has an invalid id.`);
  assert(Number.isFinite(value.holdSeconds) && value.holdSeconds > 0, `Beat ${value.id} hold must be positive.`);
  assert(INSETS.has(value.inset), `Beat ${value.id} inset is not a known kind.`);
  assert(value.line.trim().length > 0, `Beat ${value.id} needs a line.`);
}

function framesFor(seconds: number, rate: { numerator: number; denominator: number }): number {
  const frames = seconds * rate.numerator / rate.denominator;
  assert(Number.isInteger(frames), `Hold ${seconds}s does not land on a frame.`);
  return frames;
}

function style(entries: Readonly<Record<string, string | number>>): VisualStyleDeclaration[] {
  return Object.entries(entries).map(([name, value]) => ({ name, value }));
}

function textElement(id: string, text: string, fonts: readonly FontArtifactRef[], order: number, look: Readonly<Record<string, string | number>>): VisualElement {
  return { id, parent: "scene", kind: "text", order, text, fonts, style: style(look) };
}

function videoElement(id: string, media: SynchronizedMedia, startFrame: number, endFrame: number, order: number): VisualElement {
  const visual = media.visual;
  assert(visual !== undefined, `${id} needs a picture.`);
  const available = Math.min(endFrame - startFrame, media.timeline.frameCount);
  assert(available > 0, `${id} has no frames to show.`);
  return {
    id, parent: "scene", kind: "video", order, artifact: visual.artifact, muted: true,
    style: style({ position: "absolute", inset: 0, width: "100%", height: "100%", "object-fit": "cover" }),
    sampling: {
      sourceFrameRate: media.timeline.frameRate,
      sourceFrameCount: media.timeline.frameCount,
      segments: [{
        target: { startFrame, endFrameExclusive: startFrame + available },
        sourceFrame: { numerator: 0, denominator: 1 },
        rate: { numerator: 1, denominator: 1 },
      }],
    },
  };
}

/** 白底排版广告框。产品内嵌只放实站截图和官网直播镜子录像。 */
export function renderEpisode(timeline: Timeline, canvas: CanvasSpace, window: TemporalWindow,
  display: readonly FontArtifactRef[], sans: readonly FontArtifactRef[], media: EpisodeMedia, beats: readonly Beat[]) {
  const space = projectTimelineSpace(timeline);
  assert(window.span.startFrame === 0, "The episode occupies the program from the first frame.");
  assert(beats.length > 0, "An episode needs at least one beat.");
  assert(canvas.widthPx === 1080 && canvas.heightPx === 1920, "This episode is authored for a 1080×1920 frame.");
  const placed = beats.map(beat => {
    assertBeatSpec(beat);
    assert(beat.at.frame >= 0, `Beat ${beat.id} starts before the program.`);
    const hold = framesFor(beat.holdSeconds, space.frameRate);
    return { ...beat, start: beat.at.frame, end: beat.at.frame + hold };
  });
  for (let index = 0; index < placed.length; index += 1) {
    const beat = placed[index]!;
    const previous = placed[index - 1];
    if (previous !== undefined && beat.start !== previous.end) {
      throw new Error(`Beat ${beat.id} must start when ${previous.id} ends.`);
    }
    if (beat.end > window.span.endFrameExclusive) throw new Error(`Beat ${beat.id} runs past the program.`);
  }

  const elements: VisualElement[] = [];
  const slots: string[] = [];
  let order = 1;
  const addText = (id: string, text: string, fonts: readonly FontArtifactRef[], look: Readonly<Record<string, string | number>>) => {
    if (text.trim().length === 0) return;
    elements.push(textElement(id, text, fonts, order, look));
    order += 1;
    slots.push(id);
  };

  const headline = { "font-size": "92px", color: "#160b14", "line-height": "0.92", "letter-spacing": "-1.5px", "white-space": "nowrap" };
  const emphasis = { "font-size": "64px", color: "#fffdfb", "line-height": "1", "letter-spacing": "-0.8px", "white-space": "nowrap" };
  const kicker = { "font-size": "22px", color: "#fffdfb", "letter-spacing": "3px", "line-height": "1", "white-space": "nowrap" };
  const body = { "font-size": "32px", color: "#5c4d55", "line-height": "1.25", "white-space": "normal" };
  const pill = { "font-size": "26px", color: "#fffdfb", "line-height": "1", "white-space": "nowrap" };
  const note = { "font-size": "24px", color: "#74666d", "line-height": "1.35", "white-space": "normal" };
  const urlLook = { "font-size": "42px", color: "#160b14", "line-height": "1", "letter-spacing": "-0.6px", "white-space": "nowrap" };

  const htmlBeats: string[] = [];
  for (const beat of placed) {
    const pieces: string[] = [`<div class="beat ${beat.inset === "none" ? "closing" : beat.inset === "mirror" || beat.inset === "glasses" ? "portrait" : "wide"}" data-beat="${beat.id}">`];
    if (beat.kicker) {
      addText(`${beat.id}-kicker`, beat.kicker, sans, kicker);
      pieces.push(`<div class="kicker"><span class="pill dark">{{${beat.id}-kicker}}</span></div>`);
    }
    addText(`${beat.id}-line`, beat.line, display, headline);
    pieces.push(`<div class="line">{{${beat.id}-line}}</div>`);
    if (beat.emphasis) {
      addText(`${beat.id}-em`, beat.emphasis, display, emphasis);
      pieces.push(`<div class="em"><span class="pill accent">{{${beat.id}-em}}</span></div>`);
    }
    if (beat.body) {
      addText(`${beat.id}-body`, beat.body, sans, body);
      pieces.push(`<div class="body">{{${beat.id}-body}}</div>`);
    }
    if (beat.inset === "mirror" || beat.inset === "glasses") {
      const source = beat.inset === "mirror" ? media.mirror : media.glasses;
      const id = `video-${beat.id}`;
      elements.push(videoElement(id, source, beat.start, beat.end, order));
      order += 1;
      slots.push(id);
      pieces.push(`<div class="inset"><div class="media">{{${id}}}</div>${beat.inset === "mirror" ? `<div class="play"></div>` : ""}</div>`);
    } else if (beat.inset === "fitting" || beat.inset === "studio") {
      const id = `still-${beat.id}`;
      const artifact = beat.inset === "fitting" ? media.fitting : media.studio;
      elements.push({
        id, parent: "scene", kind: "image", order, artifact,
        style: style({ position: "absolute", inset: 0, width: "100%", height: "100%", "object-fit": "contain", "object-position": "center top", background: "#f4f0ec" }),
      });
      order += 1;
      slots.push(id);
      pieces.push(`<div class="inset still"><div class="media">{{${id}}}</div></div>`);
    }
    if (beat.pills.length > 0) {
      const pills = beat.pills.map((label, index) => {
        const id = `${beat.id}-pill-${index}`;
        addText(id, label, sans, pill);
        return `<span class="pill dark">{{${id}}}</span>`;
      });
      pieces.push(`<div class="pills">${pills.join("")}</div>`);
    }
    if (beat.cta) {
      addText(`${beat.id}-cta`, beat.cta, sans, pill);
      pieces.push(`<div class="cta"><span class="pill dark">{{${beat.id}-cta}}</span></div>`);
    }
    if (beat.url) {
      addText(`${beat.id}-url`, beat.url, display, urlLook);
      pieces.push(`<div class="url">{{${beat.id}-url}}</div>`);
    }
    if (beat.note) {
      addText(`${beat.id}-note`, beat.note, sans, note);
      pieces.push(`<div class="note">{{${beat.id}-note}}</div>`);
    }
    pieces.push(`</div>`);
    htmlBeats.push(pieces.join(""));
  }

  const program = browserProgram({
    html: htmlBeats.join(""),
    css: `:scope { background:#f7f4f1; overflow:hidden; }
      .beat { position:absolute; inset:0; }
      .kicker,.line,.em,.body,.pills,.cta,.url,.note { position:absolute; left:0; right:0; text-align:center; }
      .kicker { top:78px; } .line { top:148px; } .em { top:258px; } .body { top:372px; left:80px; right:80px; }
      .pill { display:inline-flex; align-items:center; border-radius:999px; padding:12px 22px; }
      .pill.dark { background:#160b14; } .pill.accent { background:#f44356; padding:14px 26px; }
      .pills { display:flex; justify-content:center; gap:12px; flex-wrap:wrap; }
      .inset { position:absolute; overflow:hidden; border-radius:36px; box-shadow:0 28px 70px rgba(22,11,20,.18); background:#160b14; }
      .portrait .inset { top:500px; left:240px; width:600px; height:1040px; }
      .portrait .pills { top:1576px; }
      .wide .inset { top:500px; left:40px; width:1000px; height:760px; background:#f4f0ec; }
      .wide .pills { top:1300px; } .wide .note { top:1420px; left:90px; right:90px; }
      .media { position:absolute; inset:0; }
      .play { position:absolute; left:50%; top:46%; width:118px; height:118px; transform:translate(-50%,-50%);
        border-radius:50%; background:#fffdfb; box-shadow:0 12px 40px rgba(22,11,20,.28); }
      .play:before { content:""; position:absolute; left:48px; top:37px; border-style:solid; border-width:22px 0 22px 36px;
        border-color:transparent transparent transparent #160b14; }
      .closing .kicker { top:360px; } .closing .line { top:470px; } .closing .em { top:610px; }
      .closing .cta { top:780px; } .closing .url { top:940px; } .closing .note { top:1080px; left:120px; right:120px; }`,
    data: { beats: placed.map(beat => ({ id: beat.id, start: beat.start, end: beat.end, inset: beat.inset })) },
    setup: `const beats = data.beats;
      const play = root.querySelector('.play');
      return frame => {
        for (const beat of beats) {
          const el = root.querySelector('[data-beat="' + beat.id + '"]');
          const local = frame - beat.start;
          const dur = beat.end - beat.start;
          const fade = 8;
          let amount = 0;
          if (local >= 0 && local < dur) {
            const inn = Math.min(1, local / fade);
            const follows = beats.some(other => other.start === beat.end);
            const out = follows && local > dur - fade ? (dur - local) / fade : 1;
            const p = Math.max(0, Math.min(inn, out));
            amount = p * p * (3 - 2 * p);
          }
          el.style.opacity = String(amount);
          el.style.visibility = amount === 0 ? 'hidden' : 'visible';
        }
        if (play) {
          const hook = beats.find(beat => beat.inset === 'mirror');
          const local = hook ? frame - hook.start : -1;
          play.style.opacity = local >= 0 && local < 28 ? String(Math.max(0, 1 - Math.max(0, local - 10) / 18)) : '0';
        }
      };`,
  });

  const missing = elements.filter(element => !slots.includes(element.id));
  assert(missing.length === 0, "Every drawn element must be placed.");
  return sealVisualTrack({
    id: "episode", programSpaceId: space.id, visualIr: "hypit.visual-ir@1",
    presents: [{
      id: "episode", span: window.span, stacking: { order: 1, tieBreak: "episode" },
      elements: [{ id: "scene", kind: "program", order: 0, program, style: style({ position: "absolute", inset: 0 }) }, ...elements],
    }],
  });
}
