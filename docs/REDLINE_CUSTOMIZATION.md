# Redline garage customization (preview)

Web preview of planned in-game part customization in the Redline garage viewer (`/games/redline/garage/`). Source: Synty POLYGON Pro Racer and Street Racer part FBXs from the Unity project (read/copy only), converted with `cz.py` in Blender 4.2 into one Draco + WebP GLB per car, normalized exactly like the stock garage GLBs so parts line up.

## How it works

- Stock garage loads `/cars/<id>.glb` as before. Parts are lazy-loaded only when the user presses **Customize parts**: `/cars/custom/<id>.json` (slot list) and `/cars/custom/<id>.glb` (base + every variant), plus per-variant thumbnails in `/cars/custom/th/<id>/`.
- GLB node names: `V_<Slot>_<NN>` (part variant), `Wheel_<FL|FR|RL|RR>_Stock` and `W_Wheel_<pos>_<NN>` (wheel styles). Bonnet/Boot variants sit under the `Hood`/`Trunk` hinge so open-hood still works.
- Slots that have a factory default show only real variants; slots without one (Fenders, Rollcage, Spoiler on some cars, stickers…) add a **None** option.
- Wheel styles use the Pro Racer `SM_Veh_Wheel_Wide_01–07` set, scaled to each car's stock wheel. Not offered on kart, open-wheeler, vintage, race truck or motorbike (their wheels are bespoke).
- Paint swatches tint the existing `paint` material (body colour channel of the atlas); rims tint `rim`.
- Shareable URL: `?car=<id>&parts=<Slot>.<NN|none>-…-Wheels.<NN|stock>&paint=<hex>`.
- Dirt bike has no part FBXs and stays non-customizable.
- Excluded from conversion (not body parts / need rigs): netting, screen banners, trailer axle/hitch, seats, truck stock wheels, door-specific fender variants, flatbeds.

## Hotspot UI

- After **Customize parts**, each slot gets a small cyan hotspot (44px tap target) anchored on the part: top surface of solid parts (raycast down), or the camera-facing side for split parts (skirts, fenders); Wheels anchor on the front wheel facing the camera.
- Hotspots are projected every frame, so they follow the orbit; a throttled (120 ms) raycast hides ones behind the body (glass ignored), and overlapping ones are decluttered (38px).
- Tapping opens a pop-up next to the hotspot with thumbnails and the current choice; at stage widths under 600px it docks as a compact bottom sheet over the lower part of the stage. Esc / outside tap closes it.
- Stage bar: preview label, paint swatch button (paint pop-up), Reset, Share build (copies URL). Rims stay in Controls.

## Per car

| Car | id | Slots | Options | GLB | Thumbs |
|---|---|---|---|---|---|
| Kart | `redline_pro_kart` | 8 | 30 | 433 KB | 58 KB |
| Open-wheeler | `redline_pro_openwheeler` | 6 | 15 | 540 KB | 35 KB |
| Prototype | `redline_pro_prototype` | 4 | 16 | 1024 KB | 46 KB |
| Rally car | `redline_pro_rally` | 7 | 24 | 1003 KB | 44 KB |
| Stock car | `redline_pro_stock` | 2 | 10 | 1058 KB | 28 KB |
| Touring car | `redline_pro_touring` | 7 | 25 | 797 KB | 52 KB |
| Race truck | `redline_pro_truck` | 9 | 18 | 416 KB | 45 KB |
| Vintage racer | `redline_pro_vintage` | 3 | 5 | 383 KB | 10 KB |
| Exotic | `redline_street_exotic` | 11 | 32 | 1071 KB | 60 KB |
| Hot hatch | `redline_street_hatch` | 12 | 33 | 1030 KB | 61 KB |
| Motorbike | `redline_street_motorbike` | 5 | 15 | 366 KB | 23 KB |
| Muscle car | `redline_street_muscle` | 16 | 38 | 1109 KB | 70 KB |
| Sedan | `redline_street_sedan` | 12 | 33 | 1076 KB | 56 KB |
| Sports coupe | `redline_street_sports` | 12 | 35 | 1090 KB | 63 KB |
| Street truck | `redline_street_truck` | 12 | 27 | 972 KB | 54 KB |
| Ute | `redline_street_ute` | 13 | 35 | 1079 KB | 66 KB |

Total parts GLBs: 13.1 MB across 16 cars (each loaded only on demand). Thumbnails: 779 KB total.

## Slots and variants

- **Kart**: Engine (3), Exhaust (3), Front_Bumper (6), Rear_Bumper (5), Seat (2), Side_Skirts (6), Spoiler (4), Undercarriage (1)
- **Open-wheeler**: Air_Box (3), Front_Bumper (3), Halo (1), Rear_Bumper (2), Side_Skirts (3), Spoiler (3)
- **Prototype**: Front_Bumper (3), Rear_Bumper (3), Side_Skirts (3), Wheels (7 + Stock)
- **Rally car**: Bonnet (3), Front_Bumper (3), Rear_Bumper (3), Roof_Scoop (3), Side_Skirts (3), Spoiler (2), Wheels (7 + Stock)
- **Stock car**: Body (3), Wheels (7 + Stock)
- **Touring car**: Bonnet (3), Boot (3), Front_Bumper (3), Rear_Bumper (3), Side_Skirts (3), Spoiler (3), Wheels (7 + Stock)
- **Race truck**: Fairing_Back (1, +None), Fairing_Top (1), Front_Bumper (3), Front_Fender (3), Rear_Bumper (2, +None), RollCage (1, +None), Side_Skirts (3), Sideskirts (1, +None), Spoiler (3)
- **Vintage racer**: Front_Bumper (2), Rear_Bumper (1), Spoiler (2)
- **Exotic**: Bonnet (4), Fenders (2, +None), Front_Bumper (4), Light_Covers (1, +None), Rear_Bumper (4), Rollcage (1, +None), Side_Skirts (4), Spoiler (2, +None), Undercarriage (2, +None), Windscreen_Sticker (1, +None), Wheels (7 + Stock)
- **Hot hatch**: Bonnet (4), Fenders (3, +None), Front_Bumper (4), Light_Covers (1, +None), Rear_Bumper (4), Rollcage (1, +None), Roof_Scoop (1, +None), Side_Skirts (2, +None), Spoiler (3, +None), Undercarriage (2, +None), Windscreen_Sticker (1, +None), Wheels (7 + Stock)
- **Motorbike**: Fuel_Tank (3), Panel_Bottom (3), Panel_Front (3), Panel_Mid (3), Seat (3)
- **Muscle car**: Bonnet (4), Exhaust (3, +None), Fenders (2, +None), Front_Bumper (4), Light_Covers (1, +None), Louvers (1, +None), Nudge_Bar (1, +None), Rear_Bumper (3), Rollcage (1, +None), Roof (3), Side_Skirts (1, +None), Spoiler (3, +None), Undercarriage (2, +None), Wheelie_Bars (1, +None), Windscreen_Sticker (1, +None), Wheels (7 + Stock)
- **Sedan**: Bonnet (4), Fenders (3, +None), Front_Bumper (4), Light_Covers (1, +None), Rear_Bumper (4), Rollcage (1, +None), Roof_Scoop (1, +None), Side_Skirts (3, +None), Spoiler (2), Undercarriage (2, +None), Windscreen_Sticker (1, +None), Wheels (7 + Stock)
- **Sports coupe**: Bonnet (4), Fenders (3, +None), Front_Bumper (4), Light_Covers (1, +None), Rear_Bumper (4), Rollcage (1, +None), Roof_Scoop (1, +None), Side_Skirts (4), Spoiler (3, +None), Undercarriage (2, +None), Windscreen_Sticker (1, +None), Wheels (7 + Stock)
- **Street truck**: Engine (1, +None), Fenders (3), Front_Bumper (4), Intake (1, +None), Rear_Bumper (1, +None), Roof (3, +None), Side_Skirts (3), Spoiler (1, +None), Undercarriage (1, +None), Upper_Skirts (1, +None), Windscreen_Sticker (1, +None), Wheels (7 + Stock)
- **Ute**: Bonnet (4), Exhaust (3, +None), Fenders (2, +None), Front_Bumper (4), Ligh_Covers_Front (1, +None), Ligh_Covers_Rear (1, +None), Rear_Bumper (4), Rollcage (1, +None), Side_Skirts (3, +None), Spoiler (2, +None), Undercarriage (2, +None), Windscreen_Sticker (1, +None), Wheels (7 + Stock)

## Rebuild

`/workspace/cars/czall.sh` (cz.py per car) then `czthumb.py` for thumbnails; copy `out/cz_<id>.{glb,json}` to `public/cars/custom/`.
