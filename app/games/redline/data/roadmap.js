// KLYRA: Redline roadmap. Development order only, no dates.
// Status values: "planned" | "in-development" | "testing" | "completed" | "released".
// Only change a status when Cody has verified it.
const redlineRoadmap = [
  { id: "p1", title: "Vehicle Foundation", status: "planned", items: ["Acceleration and braking", "Automatic and manual transmissions", "Engine RPM simulation", "Realistic engine audio", "Gear shifting", "Suspension and handling", "Vehicle cameras", "Speedometer and tachometer", "Keyboard and controller support"] },
  { id: "p2", title: "Professional Racing Circuits", status: "planned", items: ["Circuits", "Elevation changes", "Banked turns", "Bridges and track crossings", "Pit lanes", "Starting grids", "Checkpoints", "Lap timing", "Spectator areas"], note: "Some circuits may have dramatic jumps and unconventional layouts." },
  { id: "p3", title: "Multiplayer Racing", status: "planned", items: ["Dedicated racing servers", "Lobbies", "Matchmaking", "Countdowns", "Vehicle sync", "Race results", "Finishing positions", "Friends and parties", "Returning to the KLYRA Social Hub"] },
  { id: "p4", title: "AI Racing", status: "planned", items: ["Racing lines", "Cornering and braking", "Overtaking", "Collision avoidance", "Adjustable difficulty", "Filling empty positions"] },
  { id: "p5", title: "Initial Redline Pro Release", status: "planned", items: ["2 circuits", "4 vehicles", "8 racers including bots", "Quick Race", "Time Trial", "Multiplayer Race", "Race HUD and results", "Basic leaderboards"], note: "Targets, not guarantees." },
  { id: "p6", title: "Pro Expansion", status: "planned", items: ["More vehicles and circuits", "Qualifying", "Championships", "Driver rankings", "Tuning", "Liveries", "Pit stops", "Tire wear", "Spectator systems", "Replays"], note: "Potential additions." },
  { id: "p7", title: "Redline Street", status: "planned", items: ["Urban environments", "Night racing", "Highway races", "Sprint races", "Drifting", "Customization", "Performance upgrades", "Street reputation", "Multiplayer street racing", "AI opponents"], note: "Its own visual identity and progression, sharing technology with Redline Pro." },
  { id: "p8", title: "Future Expansion", status: "planned", items: ["Rally", "Off-road", "Drag", "Endurance", "Stunt", "Demolition", "Community-created circuits"], note: "Ideas only." },
];
export default redlineRoadmap;
