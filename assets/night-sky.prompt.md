# Night Sky — Generation Record

## Purpose

A sky-only texture behind the procedural city. Buildings, signs, and traffic are rendered as 3D geometry.

## Tool and Parameters

- Tool: built-in `image_gen.imagegen`.
- Date: 2026-10-09, Asia/Shanghai.
- Mode: new image generation.
- `transparent_background`: `false`.
- `referenced_image_paths` and `num_last_images_to_include`: omitted.
- Model name, model version, seed, sampling, quality, output size, and format settings were not exposed by the tool.

## Exact Prompt

```text
Use case: photorealistic-natural.
Asset type: wide 16:9 atmospheric night-sky texture for the sky behind a real-time 3D cyberpunk city.
Primary request: ONLY an empty modern metropolitan night sky, with restrained natural cloud and atmospheric haze. Every building, billboard, vehicle and city light source will be rendered separately in 3D; none may appear in this texture.
Composition: uninterrupted sky across the whole frame. Deep dark steel-blue overhead, smooth blue-gray atmospheric glow toward the lower edge. A few broad, thin, soft low cloud layers create subtle depth. Keep cloud detail low contrast, with plenty of quiet negative space. No visible ground, horizon silhouette or objects.
Lighting and palette: sophisticated cold night atmosphere, dark navy and neutral steel-blue. A very faint, diffuse, desaturated pink-red urban light spill can touch the bottommost cloud layer, as reflected light from an unseen city below the frame. This is a subtle secondary tint, not a purple wash. Preserve shadow detail and smooth gradients. No bright cloud edges, no magical glow, no storm drama.
Style: realistic cinematic night-sky photography, quiet, restrained, modern science fiction atmosphere. The image should support sharper real-time buildings rather than compete with them.
Constraints: absolutely NO buildings, skyline, towers, windows, architecture, signs, roads, trains, cars, aircraft, people, mountains, landscape, sea, water, ground, moon, planets, stars, lightning, aurora, orbital rings, fantasy forms, horror imagery, logos, text or watermark. Sky and thin clouds only.
```

## Files

The source PNG is the unchanged generated output. The WebP applies compression while retaining its dimensions and composition.

| File | Format | Dimensions | Bytes | SHA-256 |
| --- | --- | --- | ---: | --- |
| `night-sky.original.png` | PNG | 1672 × 941 | 1,530,066 | `e495a445c8fd8cb8105a442f626192d741cc15e8be9c7c3707c4fce5ba773dde` |
| `night-sky.webp` | WebP | 1672 × 941 | 33,544 | `b13b4ac851d1d6818cc9f01780c46cc2e1b00e6c96ec170a7f0707b26ebae7d2` |

```sh
cwebp -q 90 -m 6 assets/night-sky.original.png -o assets/night-sky.webp
```

## Integration

The sRGB texture maps onto an inward-facing sky sphere, radius `90`, with `48 × 24` segments and Y rotation `0.45` radians. Its unlit material does not write depth and is excluded from fog. The CSS fallback uses the same image beneath a dark gradient. See [world.scene.md](world.scene.md) for the scene configuration.
