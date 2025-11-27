// Controller Manager - Handles gamepad input
class ControllerManager {
    constructor(scene) {
        this.scene = scene;
        this.pad = null;
        this.enabled = false;

        // Hotbar selection
        this.selectedHotbarSlot = 0; // 0-4 for slots 1-5

        // Right stick auto-attack toggle
        this.rightStickAttackEnabled = false;

        // Button state tracking (for edge detection)
        this.lastButtonState = {
            A: false,
            B: false,
            X: false,
            Y: false,
            LB: false,
            RB: false,
            Start: false,
            Select: false, // Menu/Back button
            R3: false, // Right stick click
            DPadUp: false,
            DPadDown: false,
            DPadLeft: false,
            DPadRight: false
        };

        // Deadzone for analog sticks
        this.deadzone = 0.2;
        this.attackStickDeadzone = 0.3; // Higher deadzone for attack stick

        // Track last input type for UI switching
        this.lastInputType = 'keyboard'; // 'keyboard' or 'controller'
        this.lastInputTime = 0;

        // Vibration settings
        this.vibrationEnabled = true;
        this.vibrationIntensity = 1.0; // 0.0 to 1.0 multiplier

        // Check for controller
        this.checkForController();

        console.log('🎮 ControllerManager initialized');
    }

    checkForController() {
        // Phaser's gamepad plugin
        if (this.scene.input.gamepad) {
            this.scene.input.gamepad.once('connected', (pad) => {
                this.pad = pad;
                this.enabled = true;
                console.log('🎮 Controller connected:', pad.id);
                this.showControllerNotification('Controller Connected!');
            });

            this.scene.input.gamepad.once('disconnected', (pad) => {
                if (this.pad === pad) {
                    this.pad = null;
                    this.enabled = false;
                    console.log('🎮 Controller disconnected');
                    this.showControllerNotification('Controller Disconnected');
                }
            });

            // Check if already connected
            const pads = this.scene.input.gamepad.gamepads;
            if (pads.length > 0 && pads[0]) {
                this.pad = pads[0];
                this.enabled = true;
                console.log('🎮 Controller already connected:', this.pad.id);
            }
        }
    }

    update() {
        if (!this.enabled || !this.pad) return;

        // Update button states ONCE at the start of frame
        this.updateButtonStates();

        // Detect if controller is being used
        this.detectControllerInput();

        // Check if menu is open - if so, skip game input handling
        const isMenuOpen = this.scene.modernHUD?.menuOpen;

        if (isMenuOpen) {
            // Menu is open - only handle menu navigation (let ModernHUD handle it)
            return;
        }

        // Handle movement (left stick)
        this.handleMovement();

        // Handle right stick attack toggle
        this.handleRightStickToggle();

        // Handle right stick attacks
        this.handleRightStickAttack();

        // Handle interact FIRST (A button when near NPCs) - returns true if handled
        const interactHandled = this.handleInteract();

        // Handle abilities (face buttons) - only if interact didn't handle A button
        this.handleAbilities(interactHandled);

        // Handle hotbar navigation (bumpers)
        this.handleHotbarNavigation();

        // Handle hotbar use (Y button)
        this.handleHotbarUse();

        // Handle menus
        this.handleMenus();

        // Handle auto-attack toggle (R3 button for Bastion)
        this.handleAutoAttackToggle();

        // Update button states for next frame
        this.finishFrame();
    }

    updateButtonStates() {
        // Capture button states once per frame
        this.currentButtonState = {
            A: this.pad.A,
            B: this.pad.B,
            X: this.pad.X,
            Y: this.pad.Y,
            LB: this.pad.L1,
            RB: this.pad.R1,
            Start: this.pad.buttons[9] ? this.pad.buttons[9].pressed : false,
            Select: this.pad.buttons[8] ? this.pad.buttons[8].pressed : false,
            R3: this.pad.buttons[11] ? this.pad.buttons[11].pressed : false,
            DPadUp: this.pad.up,
            DPadDown: this.pad.down,
            DPadLeft: this.pad.left,
            DPadRight: this.pad.right
        };
    }

    detectControllerInput() {
        // Only check if we're not already in controller mode
        if (this.lastInputType === 'controller') return;

        // Check if any controller input is happening
        const stickMoved = Math.abs(this.pad.leftStick.x) > 0.1 ||
                          Math.abs(this.pad.leftStick.y) > 0.1 ||
                          Math.abs(this.pad.rightStick.x) > 0.1 ||
                          Math.abs(this.pad.rightStick.y) > 0.1;

        const buttonPressed = this.pad.buttons.some(btn => btn && btn.pressed);

        if (stickMoved || buttonPressed) {
            this.switchToControllerUI();
        }
    }

    detectKeyboardInput() {
        // This will be called from GameScene when keyboard input is detected
        this.switchToKeyboardUI();
    }

    switchToControllerUI() {
        if (this.lastInputType !== 'controller') {
            this.lastInputType = 'controller';
            console.log('🎮 Switched to controller UI');

            // Notify all UI elements to show controller buttons
            if (this.scene.abilityManager) {
                this.scene.abilityManager.setInputMode('controller');
            }
            if (this.scene.inventoryUI) {
                this.scene.inventoryUI.setInputMode('controller');
            }
            if (this.scene.merchantNPC) {
                this.scene.merchantNPC.setInputMode('controller');
            }
            if (this.scene.skillShopNPC) {
                this.scene.skillShopNPC.setInputMode('controller');
            }
            if (this.scene.bankerNPC) {
                this.scene.bankerNPC.setInputMode('controller');
            }
            if (this.scene.petMerchantNPC) {
                this.scene.petMerchantNPC.setInputMode('controller');
            }
            if (this.scene.petStorageNPC) {
                this.scene.petStorageNPC.setInputMode('controller');
            }
            if (this.scene.blackjackDealerNPC) {
                this.scene.blackjackDealerNPC.setInputMode('controller');
            }
            if (this.scene.chunk5NPCs) {
                this.scene.chunk5NPCs.forEach(npc => {
                    if (npc && npc.setInputMode) {
                        npc.setInputMode('controller');
                    }
                });
            }
        }
    }

    switchToKeyboardUI() {
        if (this.lastInputType !== 'keyboard') {
            this.lastInputType = 'keyboard';
            console.log('⌨️ Switched to keyboard UI');

            // Notify all UI elements to show keyboard keys
            if (this.scene.abilityManager) {
                this.scene.abilityManager.setInputMode('keyboard');
            }
            if (this.scene.inventoryUI) {
                this.scene.inventoryUI.setInputMode('keyboard');
            }
            if (this.scene.merchantNPC) {
                this.scene.merchantNPC.setInputMode('keyboard');
            }
            if (this.scene.skillShopNPC) {
                this.scene.skillShopNPC.setInputMode('keyboard');
            }
            if (this.scene.bankerNPC) {
                this.scene.bankerNPC.setInputMode('keyboard');
            }
            if (this.scene.petMerchantNPC) {
                this.scene.petMerchantNPC.setInputMode('keyboard');
            }
            if (this.scene.petStorageNPC) {
                this.scene.petStorageNPC.setInputMode('keyboard');
            }
            if (this.scene.blackjackDealerNPC) {
                this.scene.blackjackDealerNPC.setInputMode('keyboard');
            }
            if (this.scene.chunk5NPCs) {
                this.scene.chunk5NPCs.forEach(npc => {
                    if (npc && npc.setInputMode) {
                        npc.setInputMode('keyboard');
                    }
                });
            }
        }
    }

    handleMovement() {
        // Movement is handled by GameScene.update() which calls getMovementInput()
        // This method is kept for compatibility but does nothing
    }

    handleRightStickToggle() {
        // R3 (right stick click) = Toggle right stick attack mode
        // (Only for non-Bastion characters, Bastion uses R3 for auto-attack toggle)
        if (this.isButtonPressed('R3')) {
            const player = this.scene.localPlayer;
            const characterClass = (player.data?.characterId || player.class)?.toUpperCase();

            // Skip for Bastion (handled by handleAutoAttackToggle instead)
            if (characterClass === 'BASTION') {
                return;
            }

            this.rightStickAttackEnabled = !this.rightStickAttackEnabled;

            // Disable automatic auto-attack when right stick mode is enabled
            if (this.scene.localPlayer) {
                this.scene.localPlayer.disableAutoAttack = this.rightStickAttackEnabled;
            }

            const status = this.rightStickAttackEnabled ? 'ON (Manual)' : 'OFF (Auto)';
            console.log(`🎮 Right Stick Attack: ${status}`);
            this.showControllerNotification(`Right Stick Attack: ${status}`);
        }
    }

    handleRightStickAttack() {
        if (!this.scene.localPlayer) {
            console.log('⚠️ No local player');
            return;
        }

        // Get right stick axes
        const rightStickX = this.pad.rightStick.x;
        const rightStickY = this.pad.rightStick.y;

        // Apply deadzone
        const magnitude = Math.sqrt(rightStickX * rightStickX + rightStickY * rightStickY);
        if (magnitude < this.attackStickDeadzone) {
            return; // No attack
        }

        const player = this.scene.localPlayer;
        const characterClass = (player.data?.characterId || player.class)?.toUpperCase();

        // Handle Bastion's manual aiming through his ability handler
        // (Bastion's right stick ALWAYS works, regardless of toggle)
        if (characterClass === 'BASTION') {
            const abilityManager = this.scene.abilityManager;
            if (abilityManager && abilityManager.characterHandler && abilityManager.characterHandler.manualShoot) {
                const handler = abilityManager.characterHandler;

                // Calculate normalized direction from right stick
                const direction = {
                    x: rightStickX / magnitude,
                    y: rightStickY / magnitude
                };

                // Manual aiming with right stick (always available for Bastion)
                handler.manualShoot(direction);
            }
            return;
        }

        // For other characters, check if right stick attack mode is enabled
        if (!this.rightStickAttackEnabled) {
            return;
        }

        console.log(`🎮 Right stick moved past deadzone: ${magnitude.toFixed(2)}`);

        if (!player.autoAttackConfig) {
            console.log('⚠️ Player has no autoAttackConfig');
            return;
        }

        // Check cooldown manually
        const now = Date.now();
        const cooldown = player.autoAttackConfig.cooldown || 1000; // Already in milliseconds
        if (player.lastAutoAttackTime && (now - player.lastAutoAttackTime < cooldown)) {
            console.log(`⏱️ Still on cooldown: ${((cooldown - (now - player.lastAutoAttackTime)) / 1000).toFixed(2)}s remaining`);
            return; // Still on cooldown
        }

        // Calculate attack direction from right stick (NORMALIZED)
        const attackDirection = {
            x: rightStickX / magnitude,
            y: rightStickY / magnitude
        };

        // Trigger auto-attack with forceAnimation=true and custom direction
        console.log(`🎮 Triggering auto-attack via right stick, normalized direction: ${attackDirection.x.toFixed(2)}, ${attackDirection.y.toFixed(2)}`);
        player.executeAutoAttack(true, attackDirection);

        // Vibrate on attack
        this.vibrateAttack();
    }

    getMovementInput() {
        if (!this.enabled || !this.pad) {
            return { x: 0, y: 0, active: false };
        }

        // Get left stick axes
        const leftStickX = this.pad.leftStick.x;
        const leftStickY = this.pad.leftStick.y;

        // Apply deadzone
        const magnitude = Math.sqrt(leftStickX * leftStickX + leftStickY * leftStickY);
        if (magnitude < this.deadzone) {
            return { x: 0, y: 0, active: false };
        }

        // Normalize direction
        const normalizedX = leftStickX / magnitude;
        const normalizedY = leftStickY / magnitude;

        return { x: normalizedX, y: normalizedY, active: true };
    }

    handleAbilities(interactHandled = false) {
        if (!this.scene.abilityManager) return;

        // A Button = E ability (only if not used for interaction)
        if (this.isButtonPressed('A')) {
            console.log('🎮 A pressed in handleAbilities, interactHandled:', interactHandled);
        }
        if (!interactHandled && this.isButtonPressed('A')) {
            console.log('🎮 Controller: A pressed (E ability) - calling useAbility');
            this.scene.abilityManager.useAbility('e');
            this.vibrateAbility('e'); // Pass ability key for custom vibration
        }

        // B Button = R ability
        if (this.isButtonPressed('B')) {
            console.log('🎮 Controller: B pressed (R ability)');
            this.scene.abilityManager.useAbility('r');
            this.vibrateAbility('r'); // Pass ability key for custom vibration
        }

        // X Button = Q ability
        if (this.isButtonPressed('X')) {
            console.log('🎮 Controller: X pressed (Q ability)');
            this.scene.abilityManager.useAbility('q');
            this.vibrateAbility('q'); // Pass ability key for custom vibration
        }
    }

    handleHotbarNavigation() {
        // Right Bumper = Cycle right
        if (this.isButtonPressed('RB')) {
            this.selectedHotbarSlot = (this.selectedHotbarSlot + 1) % 5;
            console.log(`🎮 Hotbar slot: ${this.selectedHotbarSlot + 1}`);
            this.updateHotbarHighlight();
            this.vibrateLight();
        }

        // Left Bumper = Cycle left
        if (this.isButtonPressed('LB')) {
            this.selectedHotbarSlot = (this.selectedHotbarSlot - 1 + 5) % 5;
            console.log(`🎮 Hotbar slot: ${this.selectedHotbarSlot + 1}`);
            this.updateHotbarHighlight();
            this.vibrateLight();
        }
    }

    handleHotbarUse() {
        // Y Button = Use selected hotbar slot
        if (this.isButtonPressed('Y')) {
            const slotNumber = this.selectedHotbarSlot + 1; // 1-5
            console.log(`🎮 Using hotbar slot ${slotNumber}`);

            // Trigger the hotbar slot (simulate number key press)
            if (this.scene.inventoryUI) {
                this.scene.inventoryUI.useHotbarItem(this.selectedHotbarSlot); // 0-indexed
                this.vibrateMedium();
            }
        }
    }

    handleMenus() {
        // Select/Back/Menu Button = Open Inventory (I key)
        if (this.isButtonPressed('Select')) {
            console.log('🎮 Menu button pressed (Inventory)');
            if (this.scene.inventoryUI) {
                this.scene.inventoryUI.toggleInventory();
                this.vibrateLight();
            }
        }

        // Start Button = ESC (close menus)
        if (this.isButtonPressed('Start')) {
            console.log('🎮 Start button pressed (ESC)');

            // Close any open menus
            if (this.scene.inventoryUI && this.scene.inventoryUI.isOpen) {
                this.scene.inventoryUI.toggleInventory();
                this.vibrateLight();
            } else if (this.scene.merchantNPC && this.scene.merchantNPC.isShopOpen) {
                this.scene.merchantNPC.closeShop();
                this.vibrateLight();
            } else if (this.scene.skillShopNPC && this.scene.skillShopNPC.isShopOpen) {
                this.scene.skillShopNPC.closeShop();
                this.vibrateLight();
            } else if (this.scene.bankerNPC && this.scene.bankerNPC.isBankOpen) {
                this.scene.bankerNPC.closeBank();
                this.vibrateLight();
            } else if (this.scene.petStorageNPC && this.scene.petStorageNPC.isStorageOpen) {
                this.scene.petStorageNPC.closeStorage();
                this.vibrateLight();
            } else if (this.scene.blackjackDealerNPC && this.scene.blackjackDealerNPC.isGameOpen) {
                this.scene.blackjackDealerNPC.closeGame();
                this.vibrateLight();
            } else if (this.scene.chunk5NPCs) {
                // Close chunk5 NPC menus
                this.scene.chunk5NPCs.forEach(npc => {
                    if (npc && npc.isShopOpen) {
                        npc.closeShop();
                        this.vibrateLight();
                    } else if (npc && npc.isBankOpen) {
                        npc.closeBank();
                        this.vibrateLight();
                    }
                });
            }
        }
    }

    handleAutoAttackToggle() {
        // R3 Button (right stick click) = Toggle auto-attack mode for Bastion
        if (this.isButtonPressed('R3')) {
            const player = this.scene.localPlayer;
            const characterClass = (player.data?.characterId || player.class)?.toUpperCase();

            // Only for Bastion
            if (characterClass === 'BASTION') {
                const abilityManager = this.scene.abilityManager;
                if (abilityManager && abilityManager.characterHandler) {
                    const handler = abilityManager.characterHandler;

                    // Toggle auto-attack mode
                    handler.autoShootEnabled = !handler.autoShootEnabled;

                    const mode = handler.autoShootEnabled ? 'AUTO-ATTACK' : 'MANUAL';
                    console.log(`🎯 Bastion switched to ${mode} mode`);

                    // Vibrate to confirm toggle
                    this.vibrateMedium();

                    // TODO: Show on-screen indicator
                    // You could add a visual indicator here later
                }
            }
        }
    }

    handleInteract() {
        // A button works as interact/purchase, B button closes shops
        // Returns true if interaction was handled, false otherwise

        // Check if A button is pressed
        if (this.isButtonPressed('A')) {
            console.log('🎮 A button pressed in handleInteract');
            console.log('  merchantNPC exists:', !!this.scene.merchantNPC);
            console.log('  merchantNPC.isShopOpen:', this.scene.merchantNPC ? this.scene.merchantNPC.isShopOpen : 'N/A');
            console.log('  skillShopNPC exists:', !!this.scene.skillShopNPC);
            console.log('  skillShopNPC.isShopOpen:', this.scene.skillShopNPC ? this.scene.skillShopNPC.isShopOpen : 'N/A');

            // If merchant shop is open, purchase selected item
            if (this.scene.merchantNPC && this.scene.merchantNPC.isShopOpen) {
                console.log('  → Handling merchant purchase');
                this.scene.merchantNPC.purchaseSelectedItem();
                this.vibrateMedium();
                return true;
            }

            // If skill shop is open, purchase selected skill
            if (this.scene.skillShopNPC && this.scene.skillShopNPC.isShopOpen) {
                this.scene.skillShopNPC.tryPurchaseSkill(
                    this.scene.skillShopNPC.currentSkills[this.scene.skillShopNPC.selectedSkillIndex]?.keyBind
                );
                this.vibrateMedium();
                return true;
            }

            // If banker is open, deposit selected amount
            if (this.scene.bankerNPC && this.scene.bankerNPC.isBankOpen) {
                this.scene.bankerNPC.depositSelectedOption();
                this.vibrateMedium();
                return true;
            }

            // If pet merchant shop is open, purchase selected pet
            if (this.scene.petMerchantNPC && this.scene.petMerchantNPC.isShopOpen) {
                this.scene.petMerchantNPC.purchaseSelectedItem();
                this.vibrateMedium();
                return true;
            }

            // If pet storage is open, confirm selection (deposit or withdraw)
            if (this.scene.petStorageNPC && this.scene.petStorageNPC.isStorageOpen) {
                this.scene.petStorageNPC.confirmSelection();
                this.vibrateMedium();
                return true;
            }

            // If blackjack game is open, execute selected action
            if (this.scene.blackjackDealerNPC && this.scene.blackjackDealerNPC.isGameOpen) {
                this.scene.blackjackDealerNPC.executeSelectedAction();
                this.vibrateMedium();
                return true;
            }

            // Check chunk5 NPCs for open shops
            if (this.scene.chunk5NPCs) {
                for (const npc of this.scene.chunk5NPCs) {
                    if (npc && npc.isShopOpen) {
                        // MerchantNPC uses purchaseSelectedItem()
                        if (npc.purchaseSelectedItem) {
                            npc.purchaseSelectedItem();
                        }
                        // SkillShopNPC uses tryPurchaseSkill()
                        else if (npc.tryPurchaseSkill && npc.currentSkills && npc.selectedSkillIndex !== undefined) {
                            npc.tryPurchaseSkill(
                                npc.currentSkills[npc.selectedSkillIndex]?.keyBind
                            );
                        }
                        this.vibrateMedium();
                        return true;
                    } else if (npc && npc.isBankOpen) {
                        this.vibrateMedium();
                        return true;
                    }
                }
            }

            // Otherwise check for NPC interaction
            if (this.scene.localPlayer) {
                const playerX = this.scene.localPlayer.sprite.x;
                const playerY = this.scene.localPlayer.sprite.y;

                // Check merchant NPC
                if (this.scene.merchantNPC) {
                    const merchantInRange = this.scene.merchantNPC.checkPlayerDistance(playerX, playerY);
                    if (merchantInRange) {
                        this.scene.merchantNPC.toggleShop();
                        this.vibrateLight();
                        return true; // Interaction handled
                    }
                }

                // Check skill shop NPC
                if (this.scene.skillShopNPC) {
                    const skillShopInRange = this.scene.skillShopNPC.checkPlayerDistance(playerX, playerY);
                    if (skillShopInRange) {
                        this.scene.skillShopNPC.toggleShop();
                        this.vibrateLight();
                        return true; // Interaction handled
                    }
                }

                // Check banker NPC
                if (this.scene.bankerNPC) {
                    const bankerInRange = this.scene.bankerNPC.checkPlayerDistance(playerX, playerY);
                    if (bankerInRange) {
                        this.scene.bankerNPC.toggleBank();
                        this.vibrateLight();
                        return true; // Interaction handled
                    }
                }

                // Check pet merchant NPC
                if (this.scene.petMerchantNPC) {
                    const petMerchantInRange = this.scene.petMerchantNPC.checkPlayerDistance(playerX, playerY);
                    if (petMerchantInRange) {
                        this.scene.petMerchantNPC.toggleShop();
                        this.vibrateLight();
                        return true; // Interaction handled
                    }
                }

                // Check pet storage NPC
                if (this.scene.petStorageNPC) {
                    const petStorageInRange = this.scene.petStorageNPC.checkPlayerDistance(playerX, playerY);
                    if (petStorageInRange) {
                        this.scene.petStorageNPC.toggleStorage();
                        this.vibrateLight();
                        return true; // Interaction handled
                    }
                }

                // Check blackjack NPC
                if (this.scene.blackjackDealerNPC) {
                    const blackjackInRange = this.scene.blackjackDealerNPC.checkPlayerDistance(playerX, playerY);
                    if (blackjackInRange) {
                        this.scene.blackjackDealerNPC.toggleGame();
                        this.vibrateLight();
                        return true; // Interaction handled
                    }
                }

                // Check chunk5 NPCs
                if (this.scene.chunk5NPCs) {
                    for (const npc of this.scene.chunk5NPCs) {
                        if (!npc) continue;

                        const npcInRange = npc.checkPlayerDistance(playerX, playerY);
                        if (npcInRange) {
                            // Toggle appropriate menu based on NPC type
                            if (npc.toggleShop) {
                                npc.toggleShop();
                            } else if (npc.toggleBank) {
                                npc.toggleBank();
                            }
                            this.vibrateLight();
                            return true; // Interaction handled
                        }
                    }
                }
            }
        }

        // B button closes shops
        if (this.isButtonPressed('B')) {
            if (this.scene.merchantNPC && this.scene.merchantNPC.isShopOpen) {
                this.scene.merchantNPC.closeShop();
                return true;
            }
            if (this.scene.skillShopNPC && this.scene.skillShopNPC.isShopOpen) {
                this.scene.skillShopNPC.closeShop();
                return true;
            }
            if (this.scene.bankerNPC && this.scene.bankerNPC.isBankOpen) {
                this.scene.bankerNPC.closeBank();
                return true;
            }
            if (this.scene.petMerchantNPC && this.scene.petMerchantNPC.isShopOpen) {
                this.scene.petMerchantNPC.closeShop();
                return true;
            }
            if (this.scene.petStorageNPC && this.scene.petStorageNPC.isStorageOpen) {
                this.scene.petStorageNPC.closeStorage();
                return true;
            }
            if (this.scene.blackjackDealerNPC && this.scene.blackjackDealerNPC.isGameOpen) {
                this.scene.blackjackDealerNPC.closeGame();
                return true;
            }
            if (this.scene.chunk5NPCs) {
                for (const npc of this.scene.chunk5NPCs) {
                    if (npc && npc.isShopOpen) {
                        npc.closeShop();
                        return true;
                    } else if (npc && npc.isBankOpen) {
                        npc.closeBank();
                        return true;
                    }
                }
            }
        }

        // D-pad navigation in merchant menus
        if (this.isButtonPressed('DPadUp')) {
            if (this.scene.merchantNPC && this.scene.merchantNPC.isShopOpen) {
                this.scene.merchantNPC.moveSelectionUp();
                this.vibrateLight();
                return true;
            }
            if (this.scene.skillShopNPC && this.scene.skillShopNPC.isShopOpen) {
                this.scene.skillShopNPC.moveSelectionUp();
                this.vibrateLight();
                return true;
            }
            if (this.scene.bankerNPC && this.scene.bankerNPC.isBankOpen) {
                this.scene.bankerNPC.moveSelectionUp();
                this.vibrateLight();
                return true;
            }
            if (this.scene.petStorageNPC && this.scene.petStorageNPC.isStorageOpen) {
                this.scene.petStorageNPC.moveSelectionUp();
                this.vibrateLight();
                return true;
            }
            if (this.scene.chunk5NPCs) {
                for (const npc of this.scene.chunk5NPCs) {
                    if (npc && npc.isShopOpen && npc.moveSelectionUp) {
                        npc.moveSelectionUp();
                        this.vibrateLight();
                        return true;
                    }
                }
            }
        }

        if (this.isButtonPressed('DPadDown')) {
            if (this.scene.merchantNPC && this.scene.merchantNPC.isShopOpen) {
                this.scene.merchantNPC.moveSelectionDown();
                this.vibrateLight();
                return true;
            }
            if (this.scene.skillShopNPC && this.scene.skillShopNPC.isShopOpen) {
                this.scene.skillShopNPC.moveSelectionDown();
                this.vibrateLight();
                return true;
            }
            if (this.scene.bankerNPC && this.scene.bankerNPC.isBankOpen) {
                this.scene.bankerNPC.moveSelectionDown();
                this.vibrateLight();
                return true;
            }
            if (this.scene.petStorageNPC && this.scene.petStorageNPC.isStorageOpen) {
                this.scene.petStorageNPC.moveSelectionDown();
                this.vibrateLight();
                return true;
            }
            if (this.scene.chunk5NPCs) {
                for (const npc of this.scene.chunk5NPCs) {
                    if (npc && npc.isShopOpen && npc.moveSelectionDown) {
                        npc.moveSelectionDown();
                        this.vibrateLight();
                        return true;
                    }
                }
            }
        }

        // D-pad left/right navigation for blackjack action buttons
        if (this.isButtonPressed('DPadLeft')) {
            if (this.scene.blackjackDealerNPC && this.scene.blackjackDealerNPC.isGameOpen) {
                this.scene.blackjackDealerNPC.moveSelectionLeft();
                this.vibrateLight();
                return true;
            }
        }

        if (this.isButtonPressed('DPadRight')) {
            if (this.scene.blackjackDealerNPC && this.scene.blackjackDealerNPC.isGameOpen) {
                this.scene.blackjackDealerNPC.moveSelectionRight();
                this.vibrateLight();
                return true;
            }
        }

        return false; // No interaction handled
    }

    updateHotbarHighlight() {
        // Update visual highlight on inventory UI
        if (this.scene.inventoryUI) {
            this.scene.inventoryUI.setControllerSelection(this.selectedHotbarSlot);
        }
    }

    isButtonPressed(buttonName) {
        if (!this.pad || !this.currentButtonState) return false;

        // Use the cached current state from updateButtonStates()
        const currentState = this.currentButtonState[buttonName];
        const wasPressed = this.lastButtonState[buttonName];

        // Edge detection: only return true on button down (not held)
        const pressed = currentState && !wasPressed;

        if (buttonName === 'A' && pressed) {
            console.log('🎮 A button NEWLY PRESSED (edge detected)');
        }

        return pressed;
    }

    finishFrame() {
        // Update lastButtonState at the END of the frame
        if (this.currentButtonState) {
            this.lastButtonState = { ...this.currentButtonState };
        }
    }

    showControllerNotification(text) {
        const notification = this.scene.add.text(
            this.scene.cameras.main.centerX,
            100,
            text,
            {
                font: 'bold 20px monospace',
                fill: '#00ff00',
                stroke: '#000000',
                strokeThickness: 4
            }
        ).setOrigin(0.5);
        notification.setScrollFactor(0);
        notification.setDepth(100001);

        this.scene.tweens.add({
            targets: notification,
            alpha: 0,
            y: 50,
            duration: 2000,
            ease: 'Power2',
            onComplete: () => notification.destroy()
        });
    }

    /**
     * Vibrate the controller
     * @param {number} duration - Duration in milliseconds (default: 200)
     * @param {number} weakMagnitude - Weak motor intensity 0.0-1.0 (default: 0.5)
     * @param {number} strongMagnitude - Strong motor intensity 0.0-1.0 (default: 0.5)
     */
    vibrate(duration = 200, weakMagnitude = 0.5, strongMagnitude = 0.5) {
        if (!this.vibrationEnabled || !this.enabled || !this.pad) {
            return;
        }

        // Get the raw gamepad from the browser API
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        const gamepad = gamepads[this.pad.index];

        if (!gamepad || !gamepad.vibrationActuator) {
            // Vibration not supported
            return;
        }

        // Apply intensity multiplier
        const adjustedWeak = Math.min(1.0, weakMagnitude * this.vibrationIntensity);
        const adjustedStrong = Math.min(1.0, strongMagnitude * this.vibrationIntensity);

        // Use the Gamepad API vibration
        try {
            gamepad.vibrationActuator.playEffect('dual-rumble', {
                startDelay: 0,
                duration: duration,
                weakMagnitude: adjustedWeak,
                strongMagnitude: adjustedStrong
            });
        } catch (err) {
            console.warn('⚠️ Vibration failed:', err);
        }
    }

    /**
     * Quick vibration presets for common game events
     */
    vibrateLight() {
        this.vibrate(100, 0.3, 0.3); // Light tap
    }

    vibrateMedium() {
        this.vibrate(200, 0.5, 0.5); // Medium feedback
    }

    vibrateHeavy() {
        this.vibrate(300, 0.8, 0.8); // Heavy impact
    }

    vibrateDamage() {
        this.vibrate(250, 0.7, 0.9); // Taking damage
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CHARACTER-SPECIFIC VIBRATIONS - Auto Attacks
    // ═══════════════════════════════════════════════════════════════════════

    vibrateAttack() {
        // Get character-specific auto-attack vibration
        const player = this.scene.localPlayer;
        const characterClass = (player.data?.characterId || player.class)?.toUpperCase();

        switch (characterClass) {
            case 'KELISE':
                // Swift Strike - rapid light tap (fast assassin)
                this.vibrate(80, 0.3, 0.5);
                break;

            case 'ALDRIC':
                // Crushing Blow - heavy thud (tank warrior)
                this.vibrate(250, 0.6, 0.9);
                break;

            case 'ZENRYU':
                // Dragon Slash - sharp precise cut
                this.vibrate(150, 0.4, 0.7);
                setTimeout(() => this.vibrate(50, 0.3, 0.4), 150); // Echo
                break;

            case 'ORION':
                // Arcane Arrow - bow release (weak pull, strong release)
                this.vibrate(120, 0.2, 0.6);
                break;

            case 'LUNARE':
                // Shadow Bolt - dark magic pulse
                this.vibrate(140, 0.5, 0.3); // Reverse pattern for eerie feel
                break;

            case 'BASTION':
                // Weapon-specific (handled separately by BastionAbilityHandler)
                this.vibrate(100, 0.3, 0.5);
                break;

            default:
                this.vibrate(150, 0.4, 0.6); // Generic attack
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CHARACTER-SPECIFIC VIBRATIONS - Abilities
    // ═══════════════════════════════════════════════════════════════════════

    vibrateAbility(abilityKey) {
        const player = this.scene.localPlayer;
        const characterClass = (player.data?.characterId || player.class)?.toUpperCase();

        // Character + ability specific patterns
        const vibrationKey = `${characterClass}_${abilityKey?.toUpperCase()}`;

        switch (vibrationKey) {
            // ──────── KELISE ────────
            case 'KELISE_E': // Dash Strike
                // Quick double tap (dash momentum)
                this.vibrate(60, 0.4, 0.6);
                setTimeout(() => this.vibrate(60, 0.5, 0.7), 80);
                break;

            case 'KELISE_Q': // Life Drain
                // Pulsing suction effect
                this.vibrate(150, 0.6, 0.4);
                setTimeout(() => this.vibrate(150, 0.5, 0.3), 150);
                setTimeout(() => this.vibrate(150, 0.4, 0.2), 300);
                break;

            // ──────── ALDRIC ────────
            case 'ALDRIC_E': // Shockwave
                // Building earthquake then explosion
                this.vibrate(100, 0.3, 0.3);
                setTimeout(() => this.vibrate(200, 0.7, 0.9), 100);
                setTimeout(() => this.vibrate(150, 0.5, 0.6), 300);
                break;

            case 'ALDRIC_R': // Titan's Fury
                // Massive power-up surge
                this.vibrate(200, 0.5, 0.7);
                setTimeout(() => this.vibrate(250, 0.7, 0.9), 200);
                setTimeout(() => this.vibrate(300, 0.9, 1.0), 450);
                break;

            // ──────── ZENRYU ────────
            case 'ZENRYU_E':
            case 'ZENRYU_Q':
            case 'ZENRYU_R':
                // Martial arts precision strike
                this.vibrate(80, 0.4, 0.7);
                setTimeout(() => this.vibrate(120, 0.5, 0.8), 80);
                break;

            // ──────── ORION ────────
            case 'ORION_E': // Shadow Roll
                // Quick tumble
                this.vibrate(100, 0.3, 0.5);
                setTimeout(() => this.vibrate(50, 0.2, 0.3), 100);
                break;

            case 'ORION_Q': // Arrow Barrage
                // Rapid fire sequence
                for (let i = 0; i < 5; i++) {
                    setTimeout(() => this.vibrate(60, 0.3, 0.5), i * 80);
                }
                break;

            // ──────── LUNARE ────────
            case 'LUNARE_E': // Shadow Vortex
                // Swirling pull effect
                this.vibrate(200, 0.4, 0.6);
                setTimeout(() => this.vibrate(180, 0.5, 0.7), 150);
                setTimeout(() => this.vibrate(160, 0.6, 0.8), 280);
                setTimeout(() => this.vibrate(100, 0.7, 0.9), 380); // Vortex peak
                break;

            case 'LUNARE_Q': // Dark Veil
                // Protective shadow wrapping
                this.vibrate(250, 0.5, 0.3); // Weak strong, strong weak (dark magic)
                setTimeout(() => this.vibrate(150, 0.3, 0.2), 250);
                break;

            // ──────── BASTION ────────
            case 'BASTION_E': // Tactical Stance (weapon switch)
                // Mechanical click and lock
                this.vibrate(120, 0.6, 0.4);
                setTimeout(() => this.vibrate(80, 0.4, 0.6), 120);
                break;

            case 'BASTION_Q': // Reload
                // Magazine out, magazine in, chamber
                this.vibrate(100, 0.4, 0.3); // Eject
                setTimeout(() => this.vibrate(120, 0.3, 0.4), 200); // Insert
                setTimeout(() => this.vibrate(80, 0.5, 0.5), 400); // Chamber
                break;

            // ──────── DEFAULT ────────
            default:
                this.vibrate(200, 0.5, 0.7); // Generic ability
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // BASTION WEAPON-SPECIFIC VIBRATIONS
    // ═══════════════════════════════════════════════════════════════════════

    vibrateBastionWeapon(weaponType) {
        switch (weaponType) {
            case 'SCAR':
                // Assault rifle - short punchy
                this.vibrate(80, 0.3, 0.5);
                break;

            case 'SHIELD_PISTOL':
                // Pistol - controlled single shot
                this.vibrate(120, 0.4, 0.6);
                break;

            case 'SHOTGUN':
                // Shotgun - heavy blast with kickback
                this.vibrate(200, 0.7, 0.9);
                setTimeout(() => this.vibrate(100, 0.4, 0.5), 200); // Recoil
                break;

            default:
                this.vibrate(100, 0.4, 0.6);
        }
    }

    destroy() {
        this.enabled = false;
        this.pad = null;
    }
}
