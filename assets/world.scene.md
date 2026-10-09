# Scene Reference

## Composition

An unlit workspace overlooks a procedural city. The desk holds one external monitor, a Mac mini, an open MacBook Pro, and a wireless mouse. All buildings, signs, streets, and vehicles are 3D geometry. The only raster asset is the sky, recorded in [night-sky.prompt.md](night-sky.prompt.md). Device screens and sign glyphs use canvas textures.

The perspective camera has clipping planes `0.1 / 120`. Desktop uses a `46°` field of view, position `[3.5, 2.2, 4.5]`, and target `[0.25, 1.85, -2.15]`. Mobile uses `48°`, position `[3.5, 2.35, 6.6]`, and target `[0.7, 1.8, -2]`; short mobile viewports lower target Y to `1.2`. City fog is `#111B2A` with density `0.026`.

## City

`src/city.js` uses seed `419` and a fixed stream offset of `6000`. It creates 65 box-shaped buildings in five rows of 13, with 2,982 warm-white and pale-yellow window instances. Buildings start at Y `-1.2`; rows are spaced seven units in depth. Static bodies, roofs, antennas, and facade strips are merged into material batches.

| Element | Palette |
| --- | --- |
| Near / far buildings | `#273747` / `#2B3D4E` |
| Roofs | `#435568` |
| Windows | `#D9DFDD` and `#E7D8B0` |
| Neon | Pink-red `#FF398B`, cyan `#73E5E2` |
| Site mark | Lime `#D8F36A`, dark `#101214` |

The city uses a generated blue-gray reflection cube with material environment intensity `2.8`.

## Signs

`src/neon-signs.js` constructs metal housings, rear brackets, luminous borders, and transparent glyph panels. Line-and-arc glyphs are abstract graphic shapes without language or meaning mappings.

| Sign | Position | Panel size |
| --- | --- | --- |
| Near horizontal | `[-5.2, 4.4, -8.1]` | `2.5 × 1.05` |
| Vertical | `[6.5, 5.8, -11]` | `1.2 × 2.9` |
| Far horizontal | `[1.7, 7.7, -17.5]` | `2.2 × 0.6` |

## Transportation

Two four-coach trains run at different depths. The front train uses Z `-7.5`, Y `1.45`, and speed `1.4` units/s. The rear train uses Z `-21`, Y `4.5`, and speed `1.1` in the opposite direction. An elevated road at Z `-14`, Y `2.6`, carries 36 desktop / 18 mobile vehicles at `1.8` units/s.

Ground streets include asphalt, curbs, center lines, warm-white lamps, and restrained diffuse light pools. Nine streets carry 108 desktop / 54 mobile cars and vans, at speeds `0.9–1.46` units/s.

| Ground route | Position | Length | Width |
| --- | --- | --- | --- |
| Front cross street | Z `-6.1` | `53` | `1.65` |
| Four cross streets | Z `-14`, `-21`, `-28`, `-35` | `53` each | `0.65` |
| Outer avenues | X `±25.5`, center Z `-23.5` | `36` each | `1.65` |
| West inner avenue | X `-8.65`, center Z `-17.05` | `21.9` | `0.85` |
| East inner avenue | X `2`, center Z `-20.55` | `28.9` | `0.9` |

The ground is at Y `-1.2`. Asphalt uses `#263540`, roughness `0.26`, and metalness `0.3`. Inner avenues follow free gaps between towers. Traffic follows ambient loops without junction simulation.

Four air fleets each contain five desktop / three mobile instances:

| Fleet | Shape | Speed, units/s |
| --- | --- | --- |
| Air taxi | Rounded cabin with lateral lift ducts | `1.8` |
| Passenger shuttle | Long cabin, segmented windows, rear nacelles | `1.05` |
| Cargo lifter | Box container, retaining bands, four lift ducts | `0.72` |
| Courier drone | Small cross frame, rotor rings, underslung sensor | `1.4` |

Six Catmull–Rom corridors use Z `-6.25` twice, `-14` twice, `-21`, and `-28`, at approximate Y ranges `3.6–4.3`, `6.1–6.7`, `5.3–6.1`, `7.8–8.6`, `9.2–10.1`, and `16.6–17.4`. Routes use X control points `±30` and `±10`, with alternating directions. Progression uses vehicle speed divided by route length.

## Room and Light

The floor ends at the window, Z `-3.8`. Its depth is `11.8`, centered at Z `2.1`. The desktop monitor sits at `[1.1, 2.02, -1.52]`. The laptop is on the left, and the Mac mini and mouse are on the right. These are procedural models rather than manufacturer CAD assets.

| Light | Color | Intensity |
| --- | --- | --- |
| Main screen area light | `#65EEE7` | `7` |
| Laptop point light | `#D8F36A` | `1.6` |
| Window neon area light | `#FF549F` | `0.9` |
| Window sky directional light | `#B8D8EA` | `0.5` |

Room fixtures are off. Render exposure is `1.1` normally and `0.9` during Scan. The hidden scan target is the Mac mini's indicator at `[2.466, 1.198, -0.787]`.

## Interaction and Rendering

The physical monitor, Open profile, and About share the profile action. Scan reveals a hidden signal and its detail panel. Sound is opt-in. Reduced motion stops rain, traffic, and camera parallax. Hidden pages pause rendering and suspend audio. WebGL failure uses the static sky theme with HTML content.

Static structures are batched by material. Vehicles use dynamic instancing. Aircraft do not cast room shadows or add room lights. Runtime resources are served from the site, and the production CSP permits only same-origin assets.
