# The descent film

The film plays between the climb and the vase hall, scrubbed by scroll. Its
first frame continues the end of the climb, and its last frame matches the
WebGL vase exactly, so the hand-off to the live 3D scene is invisible.

Until a film exists the site plays a live WebGL version of the same beat
(boulders raining into the vase), so nothing is blocked on it.

**Format:** 16:9, 1920×1080, 8–10 s, 24 or 30 fps, one continuous shot, no
cuts, no text, no audio needed. Use any model with a first-frame/last-frame
mode (Kling, Veo, Runway, Luma).

**For consistency:** attach `public/art/sisyphus.jpg` and two or three of the
worker plates (`public/art/*.jpg`) as style references for the vase, plus the
amphora reference photo.

---

## First frame

> Cinematic side view at golden hour of the rounded summit of a smooth terracotta-orange hill, the hill's top edge traced by a crisp black line like the painted band on a Greek vase. Pale warm cream sky, soft and empty. On the crest at the exact centre of the frame sits an enormous perfectly polished mirror-chrome sphere, as tall as a man, reflecting the orange hill and cream sky; a thin inlaid band of black glaze with a fine gold Greek-key pattern runs around it on a tilted great circle. To its left, a classical white marble statue of Sisyphus stands upright, arms hanging, having just let go. The sphere is beginning to tip over the far, steeper side to the right. Photoreal, physically based reflections, soft long shadows, minimalist Apple product-film composition, generous negative space, 16:9.

## Last frame

> A single Attic black-figure amphora, terracotta orange with glossy black slip bands — palmettes on the neck, black tongues on the shoulder, a frieze of black-figure workers around the belly, a Greek-key band below, black rays rising from a black foot, two black loop handles — stands perfectly centred and straight-on, facing the camera, on a square polished black stone plinth whose top edge sits at 80% of the frame height and runs off the bottom of the frame; the plinth's top edge carries a thin terracotta Greek-key line. The vase spans from 20% to 80% of the frame height. Dark museum gallery, near-black warm background, one warm spotlight from directly above forming a faint visible cone of light with drifting dust motes, glossy reflections of soft rectangular studio lights on the black glaze, a dark polished floor faintly mirroring the plinth. A faint warm amber glow rises from inside the vase's mouth. Camera at the height of the vase's shoulder, 30° vertical field of view, no tilt. Photoreal, Apple product-film lighting, deep blacks, 16:9.

## Video prompt

> One continuous shot, no cuts. Start on the summit: the giant mirror-chrome boulder with its black-and-gold inlay band tips over the crest of the terracotta hill and rolls down the steep far side, gathering speed; the camera follows it, tilting down past the edge of the hill as the cream sky darkens to near-black. As it falls, the single boulder becomes many: dozens, then hundreds of identical chrome boulders roll and fall out of the dark from every direction, each one reflecting the warm orange light, all streaming downward like rain — every day of work, falling away. The camera keeps descending and slowly pulls back to reveal that every boulder is falling into the mouth of one large Attic black-figure amphora standing on a black stone plinth in a dark museum gallery under a single warm spotlight. The boulders vanish into the vase one after another, each landing sending a brief ring of warm light around the lip. The rain thins to the last boulder, which drops in; the glow inside the vase settles to a soft amber. The camera comes to rest straight-on at shoulder height with the vase centred, matching the final frame exactly, and holds for one second. Smooth, weighty, physically plausible motion; slow-motion feel; photoreal chrome and glaze reflections; shallow drifting dust in the spotlight; no people, no text, no logos, no camera shake.

**Negative prompt (if supported):** text, watermark, logo, cartoon, CGI plastic look, lens flare streaks, camera shake, cuts, extra vases, broken or cracked vase, people, hands.

---

## Dropping it in

```bash
scripts/prepare-video.sh ~/Downloads/descent.mp4
```

This writes `public/media/descent.mp4` (short GOP, no B-frames, so scrubbing
is smooth). The site picks it up automatically: the film plays through the
descent and crossfades into the live vase at the end.
