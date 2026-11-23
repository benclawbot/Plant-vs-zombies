# Behavior audit — original PC Plants vs. Zombies (2009)

Reviewed 2026-10-03. This is a source-level audit of all 49 plant definitions and 26 zombie definitions in this fan game, plus targeted automated regression checks. It is not a claim of frame-perfect parity. Original timings, collision boxes, random speed ranges, wave scripts and animations are still approximated.

Reference basis: the original game's Suburban Almanac entries reproduced in the [2009 game walkthrough](https://www.solitairelaboratory.com/solitairearcade/zombies/plantsvszombiesguide.html), [PvZ-specific encyclopedia entries](https://plantsvszombies.wiki.gg/wiki/Plants_vs._Zombies), and the [reconstructed PC implementation](https://github.com/Patoke/re-plants-vs-zombies/tree/main/Lawn). The reconstruction includes GOTY changes, so it is supporting evidence, not proof of exact 2009 behavior. Version-specific sources conflict on whether mine arming takes 14, 15 or about 16 seconds; this game retains its existing 14-second threshold. No source code or original game assets were copied.

## Fixed in this update

- Mine trigger now reaches the zombie bite collision distance, also handles arming beneath a biting zombie, and triggers once. Damage is restricted to nearby grounded enemies in its lane. Unarmed mines remain vulnerable. Pole-bearing vaulters jump over mines rather than detonating before takeoff.
- Pole vaulting uses a timed airborne state instead of teleportation. Tall-nuts (including inside Pumpkin) prevent crossing. The pole is discarded, the sprite changes to an empty-handed athlete, walking slows to normal zombie speed, and later plants are bitten. Freeze pauses the jump; chill slows it. Midair save/restore works.
- Explosion damage consumes armor rather than bypassing every helmet. Fumes bypass Screen Door/Ladder shields but consume Conehead/Buckethead helmets.
- Football Zombies retain their fast movement after helmet loss.
- Tangle Kelp can catch submerged Snorkel Zombies and drowns a single target rather than exploding across neighboring lanes.
- Hypno-shroom converts the zombie after consumption rather than on its first bite.
- Screen Door shields prevent Snow Pea chill; global freezing still works.
- Torchwood affects pea projectiles only, thawing icy peas and heating ordinary peas. It no longer turns stars and cactus needles into fireballs.
- Split Pea does not launch an extra forward pea when only a rear target exists.

## Plants: coverage and remaining differences

“Core” means the defining rule exists in source; exact balance and animation parity remain unverified. “Partial” identifies a known fidelity gap. Costs/recharge values remain the independently tuned catalog values unless stated above.

| Plant | Assessment and implementation |
|---|---|
| Peashooter | Core: lane-targeted single peas; fixed cadence, approximate muzzle/collision. |
| Sunflower | Core: 25-sun production; first drop and cadence simplified. |
| Cherry Bomb | Core: one-use area explosion; corrected armor handling. Circular area differs from exact original hitboxes. |
| Wall-nut | Core: durable edible blocker, optional first aid and ladder support. |
| Potato Mine | Fixed: contact detonation after 14 seconds, one-lane ground damage, edible while arming. |
| Snow Pea | Fixed shield interaction; core refreshed chill. Fire/ice sequencing simplified. |
| Chomper | Partial: instant swallow and digestion; giant bites supported. Digestion timer and vehicle exclusions need original calibration. |
| Repeater | Core: two-pea burst; cadence is approximate. |
| Puff-shroom | Core: free short-range shooter, sleeps by day. |
| Sun-shroom | Core: 15 then 25 sun after growth; no separate growth animation. |
| Fume-shroom | Fixed shield versus helmet handling; core lane piercing. Range/cadence approximate. |
| Grave Buster | Core: grave removal; completion time and coin reward simplified. |
| Hypno-shroom | Fixed consumption trigger; combat between hypnotized and ordinary zombies remains simplified. |
| Scaredy-shroom | Partial: stops firing near enemies ahead; fear should include nearby threats behind/across lanes. |
| Ice-shroom | Core: board freeze/chill; durations and thaw details approximate. |
| Doom-shroom | Core: area blast and temporary crater; exact crater timing differs. |
| Lily Pad | Core: pool-only support and upgrade to Cattail. |
| Squash | Core: local grounded damage; jump/landing sequence simplified. |
| Threepeater | Core: three neighboring lanes, respecting lawn edges. |
| Tangle Kelp | Fixed: one water target, including submerged zombies. Animation simplified. |
| Jalapeno | Core: full-lane damage, clears lane ice and thaw effects. |
| Spikeweed | Core: not bitten or vaulted, ground contact damage, wheel popping. Gargantuar smash interaction remains incomplete. |
| Torchwood | Fixed projectile classification; core pea heating and icy-pea thaw. Fire splash is approximate. |
| Tall-nut | Fixed layered vault blocking; core high durability and ladder interaction. |
| Sea-shroom | Core: water-only short-range mushroom, daylight sleep. |
| Plantern | Partial: reduces all fog opacity rather than revealing a local area. |
| Cactus | Core: balloon popping; extension/retraction and roof trajectory simplified. |
| Blover | Core: balloon removal and temporary fog clearing. |
| Split Pea | Fixed front/rear target separation; rear pair is simultaneous rather than staggered. |
| Starfruit | Partial: five rays exist but directions differ from original; exact collision/range needs work. |
| Pumpkin | Core: outer protection layer and removable armor. |
| Magnet-shroom | Partial: takes metal objects but often changes the entire zombie to basic type; preserve type-specific aftermath in future. |
| Cabbage-pult | Core: lobbed 40-damage attack, shield bypass; moving target landing approximate. |
| Flower Pot | Core: roof support; some original prohibited plant/support combinations are not enforced. |
| Kernel-pult | Core: probabilistic butter, stun, lower kernel damage; exact timings approximate. |
| Coffee Bean | Partial: wakes mushrooms immediately instead of a wake animation/delay. |
| Garlic | Partial: reroutes biting zombies, but boundary choices may leave them in the same lane. |
| Umbrella Leaf | Core: nearby Bungee/Catapult protection, simplified range. |
| Marigold | Partial: periodic coins; production limits and silver/gold distribution differ. |
| Melon-pult | Core: direct and splash damage; splash geometry differs. |
| Gatling Pea | Core: Repeater upgrade and four-pea burst. |
| Twin Sunflower | Core: Sunflower upgrade and two suns. |
| Gloom-shroom | Core: Fume upgrade and radial damage; range/cadence approximate. |
| Cattail | Core: Lily Pad upgrade, homing attacks and balloon priority; attack cadence approximate. |
| Winter Melon | Core: Melon upgrade, splash/chill. |
| Gold Magnet | Core: collects several coins per cycle; collection animation simplified. |
| Spikerock | Partial: upgraded double contact damage and multiple wheel pops; exact smash/wheel durability differs. |
| Cob Cannon | Core: two adjacent Kernel-pults, manual target, recharge. Blast/launch is immediate. |
| Imitater | Partial: aliases a selected seed, but picker/transformation delay and independent cooldown fidelity incomplete. |

## Zombies: coverage and remaining differences

| Zombie | Assessment and implementation |
|---|---|
| Zombie | Core: walks left, bites plants, consumes brains/activates mower. Speed and health are tuned. |
| Flag Zombie | Core: wave marker and faster movement; not exact original tuning. |
| Conehead | Core: helmet absorbs damage, then basic appearance. |
| Pole Vaulter | Fixed: animated one-use jump, pole-free appearance, normal walking afterward, Tall-nut blocking. Exact takeoff/landing timing approximate. |
| Buckethead | Core: strong helmet, basic appearance after loss. |
| Newspaper | Core: paper absorbs damage then accelerates; rage pause/animation absent. |
| Screen Door | Fixed chilling and fume interactions; basic appearance after shield loss. |
| Football | Fixed: remains fast after helmet loss; helmet-loss appearance still approximate. |
| Dancing Zombie | Partial: summons three backups periodically, rather than the original four-position coordinated dance formation. |
| Backup Dancer | Partial: ordinary walker, no leader-linked synchronized movement. |
| Ducky Tube | Core: water-row walker. Other armored tube variants aren't individually modeled. |
| Snorkel | Fixed Kelp vulnerability; core submerging and surfacing to bite. |
| Zomboni | Core: crushes plants, leaves ice, popped by spikes; acceleration and damage stages approximate. |
| Bobsled Team | Partial: one aggregate unit rather than separate four members; ice-entry requirements not enforced. |
| Dolphin Rider | Shares timed one-use vault/slowdown; dolphin-loss art and water animation remain approximate. |
| Jack-in-the-box | Core: delayed explosion destroys nearby plants; fuse randomness and opening animation simplified. |
| Balloon | Core: ignores plants, popped by air attackers, blown away by Blover. |
| Digger | Partial: tunnels left then reverses; emerging delay exists, exact back-walk and Magnet aftermath incomplete. |
| Pogo | Partial: repeat jumps over low plants, Tall-nut blocks; jumps still teleport and Magnet aftermath simplified. |
| Yeti | Core: retreats after a delay; availability and rewards differ. |
| Bungee | Core: hovers, steals, exits; protected by Umbrella. Spawn/target selection approximate. |
| Ladder | Partial: places ladders on nuts/Pumpkin; retains carrier speed after placement, original aftermath not fully modeled. |
| Catapult | Partial: throws at leftmost plant, Umbrella protects; driving/empty-ammunition behavior incomplete. |
| Gargantuar | Core: crushes, throws Imp at low health, high blast resistance. Crush windup and Spikeweed interactions incomplete. |
| Imp | Core: small fast walker; thrown trajectory is an effect, not a full arc. |
| Dr. Zomboss | Partial: moving boss, ice/fire balls and lane crushing; original phases, targeting, vulnerability windows and animation differ substantially. |

## Validation

Automated checks cover mine range/arming/damage, vault state transitions and animation transforms, Tall-nut/Pumpkin blocking, subsequent biting, slow/freeze, save/restore, armor/fumes, Football speed, Kelp/Snorkel, Hypno consumption, Torchwood and Split Pea. Existing campaign/catalog, placement, lane projectiles, mower, music, PWA and offline tests remain enabled. Camera tests cover every cell in all five environments at desktop, portrait and landscape sizes, including near cell edges.

The 64px single-row toolbar replaces the former 112px phone toolbar. Only seeds scroll, while sun and 44px action buttons stay fixed. The play camera trims background margins and keeps the lawn, mower entry and zombie entry visible. Automated geometry checks are not a physical-device usability check. Browser UI QA is unavailable in this environment because the required control-browser capability is absent; no browser visual pass is claimed.

Generated pole-free sprite: `public/assets/pole-vaulter-walking.png`, built-in image generation. Prompt: remove the athlete's yellow pole, restore empty hands, change running legs to slow walking, retain left-facing red uniform, headband, face and painterly style; transparent full-body output. Original sprite atlas is preserved. This sprite is included in the offline cache.

## Live difficulty update

The in-game slider selects 1–10 and defaults to 3. Level 6 matches the former wave budget and movement baseline. Relative to that baseline, level 3 uses 0.7× arrival-clock speed, 0.64× ordinary spawn budget and 0.76× zombie walking speed; level 1 uses 0.5× / 0.4× / 0.6×, and level 10 uses 1.4× / 1.48× / 1.32×. Flag events always retain at least one zombie; bosses are never duplicated. Difficulty changes affect existing walkers and the remaining wave immediately, without rewinding the spawn cursor, replacing plants, removing live zombies or resetting sun. Selection and the independent arrival clock persist in checkpoints. Old saves default to 3. These are explicit fan-game difficulty settings, not original 2009-game values.

The default opening campaign was simulated through victory using its unlocked Peashooter and collected sky sun, without using its mower. Regression tests check all ten levels, live changes, checkpoint migration and boss/win handling. Splash artwork now covers the whole viewport, with Play overlaid on the artwork. Browser visual QA remains unavailable.
