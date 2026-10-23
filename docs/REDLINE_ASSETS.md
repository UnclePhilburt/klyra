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

## Additional Pro pack vehicles

Every remaining vehicle in `PolygonProRacer/Models` that drives on wheels was added (tagged `pro`, from `/workspace/cars/run4.sh`). The panels that open are only the ones the pack ships as separate objects.

| Web model | Source FBX | Extra pack parts | Texture (Alts) | Opens |
|---|---|---|---|---|
| `redline_pro_prototype` | SM_Veh_Prototype_01 | Front/Rear_Bumper_01, Side_Skirts_01 | Vehicle_01 | nothing (no separate panels in pack) |
| `redline_pro_rally` | SM_Veh_Rally_01 | Bonnet_01, Front/Rear_Bumper_01, Side_Skirts_01, Roof_Scoop_01, Spoiler_02 | Vehicle_06 | hood, trunk, right door (main FBX has a separate boot and right-door object only) |
| `redline_pro_openwheeler` | SM_Veh_OpenWheeler_01 | Air_Box_01, Front/Rear_Bumper_01, Halo_01, Side_Skirts_01, Spoiler_01 | Vehicle_10 | nothing |
| `redline_pro_vintage` | SM_Veh_Vintage_01 | Front_Bumper_01, Rear_Bumper_02, Spoiler_01 | Vehicle_13 | nothing |
| `redline_pro_kart` | SM_Veh_Kart_01 | Engine_01, Exhaust_01, Front/Rear_Bumper_01, Seat_01, Side_Skirts_01, Spoiler_01, Undercarriage_01 | Vehicle_15 | nothing |
| `redline_pro_truck` | SM_Veh_Truck_01 | Fairing_Top_01, Front_Bumper_01, Front_Fender_01, Side_Skirts_01, Spoiler_01 | Vehicle_18 | left and right doors |
| `redline_pro_dirtbike` | SM_Veh_Dirtbike_01 | none | Vehicle_03 | nothing |
| `redline_pro_foodtruck` | SM_Veh_Food_Truck_01 (food trailer) | none | Vehicle_05 | nothing |
| `redline_pro_foodvan` | SM_Veh_Food_Truck_02 | none | Vehicle_09 | left and right doors |

Not added: SM_Veh_Blimp_01 (an airship, not a car), SM_Veh_Trailer_01 (unpowered trailer), and SM_Veh_Attach_Pace_Car_Siren_01 (an attachment, not a vehicle).

## Wheels: separate or baked in (from object names inside each FBX)

| Pack | Model | Wheels |
|---|---|---|
| Pro | Touring_01, Stock_Car_01, Prototype_01, Rally_01, OpenWheeler_01, Vintage_01, Kart_01, Truck_01, Food_Truck_02 | Separate: Wheel_FL/FR/RL/RR objects |
| Pro | Food_Truck_01 (trailer) | Separate: Food_Trailer_01_Wheel_FL/FR/RL/RR |
| Pro | Trailer_01 | Separate: Wheel_fl/fr/rl/rr |
| Pro | Dirtbike_01 | Separate: Wheel_Front, Wheel_Rear (skinned SK_ mesh) |
| Pro | Blimp_01 | No wheels |
| Street | Exotic_01, Hatch_01, Muscle_01, Sedan_01, Sports_01, Ute_01 | Separate: Wheel_fl/fr/rl/rr |
| Street | Truck_01 | Separate: Wheel_fl/fr/rl/rr plus separate _Tyre objects per wheel |
| Street | Motorbike_01 | Separate: Wheel_Front, Wheel_Rear |
| Street | Truck_Car_Trailer_01, Truck_Trailer_01 | Separate: Wheel_fl/fr/rl/rr |
| Street | Boat_Trailer_Large_01 | Separate: Wheel_L/R_01–03 + support wheel |
| Street | Boat_Trailer_Small_01 | Separate: Wheel_L/R_01 + support wheel |
| Street | ContainerCrane_01, StraddleCarrier_01 | Separate wheel objects (multiple per corner) |
| Street | Boat_01 | One separate wheel object (Boat_Wheel_01, a helm) |
| Street | Barge_01, ContainerShip_01, TenderBoat_01, Tugboat_01 | No wheels |

No car in either pack has wheels baked into the body.
