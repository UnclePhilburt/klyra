# Redline preview assets

Source: Cody's Unity project `C:\Users\CodyW\OneDrive\Documents\Klyra Broken Fronts\Assets\Synty\` (read and copied only; the project was not modified).

| Web model | Discipline | Source FBX | Panels added from pack | Texture |
|---|---|---|---|---|
| `public/cars/redline_pro_touring.glb` | Pro | `PolygonProRacer/Models/SM_Veh_Touring_01.fbx` | Bonnet_01, Boot_01, Front/Rear_Bumper_01, Side_Skirts_01, Spoiler_01 | `PolygonProRacer/Textures/Alts/PolygonProRacer_Vehicle_04.png` |
| `public/cars/redline_pro_stock.glb` | Pro | `PolygonProRacer/Models/SM_Veh_Stock_Car_01.fbx` | Body_01 | `.../Alts/PolygonProRacer_Vehicle_08.png` |
| `public/cars/redline_street_sports.glb` | Street | `PolygonStreetRacer/Models/SM_Veh_Sports_01.fbx` | Bonnet_01, Front/Rear_Bumper_01, Side_Skirts_01 | `PolygonStreetRacer/Textures/PolygonStreetRacer_01_A.png` |
| `public/cars/redline_street_muscle.glb` | Street | `PolygonStreetRacer/Models/SM_Veh_Muscle_01.fbx` | Bonnet_01, Front/Rear_Bumper_01, Roof_01 | `.../PolygonStreetRacer_02_A.png` |

Nodes in every GLB: `Body`, `Glass`, `Wheel_FL/FR/RL/RR` (pivot at wheel centre), plus where the pack has them `Hood` (pivot at the cabin-side hinge), `Trunk` (hinge), `Door_L`/`Door_R` (pivot at front edge). The Stock car body is a single shell in the pack: it has a separate hood, but no separate doors or trunk, so those stay closed.

Conversion: Blender 4.2 headless (`/workspace/cars/build3.py` on the box), Draco level 7, WebP textures. Each GLB is about 0.4–0.5 MB.

Licence: these are Synty POLYGON packs (Pro Racer, Street Racer). Synty's standard licence allows using the assets in games and related promotional material. Cody should confirm the web display of the models on klyra.lol (downloadable GLBs) is covered by his licence tier.
