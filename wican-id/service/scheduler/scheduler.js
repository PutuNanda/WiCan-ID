const fs = require('fs').promises;
const path = require('path');

/**
 * Scheduler Service untuk menjalankan jadwal perangkat
 * Auto-reload setiap 5 detik, output minimal
 * OPTIMASI: Hanya menulis jika state berubah
 * OUTPUT: Hanya schedule-output.json (node-relay.json dihapus)
 */

class SchedulerService {
    constructor() {
        this.devices = new Map(); // Map deviceId -> schedules
        this.deviceStates = new Map(); // Map deviceId -> last written state
        this.isRunning = false;
        this.checkInterval = 1000; // Cek aksi setiap 1 detik
        this.reloadInterval = 5000; // Reload jadwal setiap 5 detik
        this.outputPath = path.join(__dirname, '..', '..', 'database', 'device');
        
        // Bind methods
        this.checkAllDevices = this.checkAllDevices.bind(this);
        this.reloadAllSchedules = this.reloadAllSchedules.bind(this);
    }

    /**
     * Start the scheduler service
     */
    async start() {
        if (this.isRunning) {
            return;
        }
        
        this.isRunning = true;

        try {
            // Initial load of all schedules
            await this.reloadAllSchedules();

            // Start checking interval (setiap 1 detik)
            this.checkTimer = setInterval(this.checkAllDevices, this.checkInterval);
            
            // Start reload interval (setiap 5 detik)
            this.reloadTimer = setInterval(this.reloadAllSchedules, this.reloadInterval);
            
        } catch (error) {
            this.isRunning = false;
        }
    }

    /**
     * Stop the scheduler service
     */
    stop() {
        this.isRunning = false;
        
        if (this.checkTimer) {
            clearInterval(this.checkTimer);
            this.checkTimer = null;
        }
        
        if (this.reloadTimer) {
            clearInterval(this.reloadTimer);
            this.reloadTimer = null;
        }
    }

    /**
     * Reload all schedules from all devices
     * Dipanggil setiap 5 detik
     */
    async reloadAllSchedules() {
        if (!this.isRunning) return;
        
        try {
            const devicePath = this.outputPath;
            
            try {
                await fs.access(devicePath);
            } catch (error) {
                return;
            }

            const deviceFolders = await fs.readdir(devicePath, { withFileTypes: true });
            
            for (const dirent of deviceFolders) {
                if (!dirent.isDirectory()) continue;
                
                const deviceId = dirent.name;
                const schedulePath = path.join(devicePath, deviceId, 'schedule-list.json');
                
                try {
                    await fs.access(schedulePath);
                    const data = await fs.readFile(schedulePath, 'utf8');
                    
                    let schedules = [];
                    try {
                        const parsed = JSON.parse(data);
                        
                        if (Array.isArray(parsed)) {
                            schedules = parsed;
                        } else if (parsed.schedules && Array.isArray(parsed.schedules)) {
                            schedules = parsed.schedules;
                        } else if (parsed && typeof parsed === 'object') {
                            schedules = [parsed];
                        }
                    } catch (parseError) {
                        schedules = [];
                    }
                    
                    // Filter only active schedules
                    const activeSchedules = schedules.filter(s => s["Schedule Status"] === "Active");
                    
                    this.devices.set(deviceId, activeSchedules);
                    
                } catch (error) {
                    // No schedule file, set empty
                    this.devices.set(deviceId, []);
                }
            }
            
        } catch (error) {
            // Silently handle error
        }
    }

    /**
     * Check all devices for scheduled actions
     * Dipanggil setiap 1 detik
     */
    async checkAllDevices() {
        if (!this.isRunning) return;
        
        const now = new Date();
        const currentTime = this.formatTime(now);
        const currentDay = this.getDayOfWeek(now);
        
        for (const [deviceId, schedules] of this.devices) {
            if (!schedules || schedules.length === 0) {
                const lastState = this.deviceStates.get(deviceId);
                if (lastState !== 'null') {
                    await this.writeRelayState(deviceId, 'null');
                    this.deviceStates.set(deviceId, 'null');
                }
                continue;
            }

            await this.checkDeviceSchedules(deviceId, schedules, currentTime, currentDay);
        }
    }

    /**
     * Check schedules for a specific device
     * Returns true if action executed
     */
    async checkDeviceSchedules(deviceId, schedules, currentTime, currentDay) {
        try {
            // Find all actions that should execute at this time
            const actions = this.getActionsForTime(schedules, currentTime, currentDay);
            
            if (actions.length === 0) {
                return false;
            }
            
            // Calculate final state based on all actions
            const finalState = this.resolveConflicts(actions);
            
            // Dapatkan state terakhir yang ditulis
            const lastState = this.deviceStates.get(deviceId);
            
            // Hanya tulis jika state berubah
            if (lastState !== finalState) {
                await this.writeRelayState(deviceId, finalState);
                this.deviceStates.set(deviceId, finalState);
            }
            
            return true;
            
        } catch (error) {
            return false;
        }
    }

    /**
     * Get all actions that should execute at current time
     */
    getActionsForTime(schedules, currentTime, currentDay) {
        const actions = [];
        
        for (const schedule of schedules) {
            // Check if schedule is active on this day
            if (!this.isActiveOnDay(schedule, currentDay)) {
                continue;
            }
            
            // Check Start Time
            if (schedule["Start Time"] === currentTime && schedule["Start Action"] !== 'None') {
                actions.push({
                    type: 'start',
                    action: schedule["Start Action"],
                    name: schedule["Schedule Name"]
                });
            }
            
            // Check End Time
            if (schedule["End Time"] === currentTime && schedule["End Action"] !== 'None') {
                actions.push({
                    type: 'end',
                    action: schedule["End Action"],
                    name: schedule["Schedule Name"]
                });
            }
        }
        
        return actions;
    }

    /**
     * Check if schedule is active on given day
     */
    isActiveOnDay(schedule, currentDay) {
        const activeDays = schedule["Only Active At Day"] || "ALL";
        
        if (activeDays === "ALL") return true;
        if (activeDays === "WEEKDAY") return currentDay >= 1 && currentDay <= 5; // Monday-Friday
        if (activeDays === "WEEKEND") return currentDay === 0 || currentDay === 6; // Saturday-Sunday
        
        // Map day names to numbers
        const dayMap = {
            "SUNDAY": 0,
            "MONDAY": 1,
            "TUESDAY": 2,
            "WEDNESDAY": 3,
            "THURSDAY": 4,
            "FRIDAY": 5,
            "SATURDAY": 6
        };
        
        return dayMap[activeDays] === currentDay;
    }

    /**
     * Resolve conflicts between multiple actions
     * Rules: 
     * - ON + ON = ON
     * - OFF + OFF = OFF
     * - ON + OFF = None
     * - OFF + ON = None
     */
    resolveConflicts(actions) {
        if (actions.length === 0) return 'off'; // Default
        
        // Count ON and OFF actions
        let onCount = 0;
        let offCount = 0;
        
        for (const action of actions) {
            if (action.action === 'ON') onCount++;
            else if (action.action === 'OFF') offCount++;
        }
        
        // Apply rules
        if (onCount > 0 && offCount === 0) {
            return 'on';
        } else if (offCount > 0 && onCount === 0) {
            return 'off';
        } else if (onCount > 0 && offCount > 0) {
            // Conflict: both ON and OFF at same time
            return 'none';
        }
        
        return 'off';
    }

    /**
     * Write relay state to output file
     * FORMAT MINIMAL: hanya {"relayState": "on/off/none"}
     * HANYA menulis ke schedule-output.json (node-relay.json TIDAK dibuat)
     */
    async writeRelayState(deviceId, state) {
        try {
            const devicePath = path.join(this.outputPath, deviceId);
            const outputPath = path.join(devicePath, 'schedule-output.json');
            
            // Check if device folder exists
            try {
                await fs.access(devicePath);
            } catch (error) {
                return;
            }
            
            // Format MINIMAL - hanya relayState!
            const output = {
                relayState: state
            };
            
            await fs.writeFile(outputPath, JSON.stringify(output));
            
        } catch (error) {
            // Silently handle error
        }
    }

    /**
     * Load initial states from existing output files
     */
    async loadInitialStates() {
        try {
            const devicePath = this.outputPath;
            
            try {
                await fs.access(devicePath);
            } catch (error) {
                return;
            }

            const deviceFolders = await fs.readdir(devicePath, { withFileTypes: true });
            
            for (const dirent of deviceFolders) {
                if (!dirent.isDirectory()) continue;
                
                const deviceId = dirent.name;
                const outputPath = path.join(devicePath, deviceId, 'schedule-output.json');
                
                try {
                    await fs.access(outputPath);
                    const data = await fs.readFile(outputPath, 'utf8');
                    const parsed = JSON.parse(data);
                    
                    if (parsed && parsed.relayState !== undefined) {
                        this.deviceStates.set(deviceId, parsed.relayState);
                    }
                } catch (error) {
                    // No output file or error reading
                }
            }
            
        } catch (error) {
            // Silently handle error
        }
    }

    /**
     * Format time as HH:MM
     */
    formatTime(date) {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    /**
     * Get day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
     */
    getDayOfWeek(date) {
        return date.getDay();
    }

    /**
     * Reload schedules for a specific device (dipanggil dari API)
     */
    async reloadDeviceSchedules(deviceId) {
        try {
            const schedulePath = path.join(this.outputPath, deviceId, 'schedule-list.json');
            
            try {
                await fs.access(schedulePath);
                const data = await fs.readFile(schedulePath, 'utf8');
                
                let schedules = [];
                try {
                    const parsed = JSON.parse(data);
                    if (Array.isArray(parsed)) {
                        schedules = parsed;
                    } else if (parsed.schedules && Array.isArray(parsed.schedules)) {
                        schedules = parsed.schedules;
                    }
                } catch (parseError) {
                    schedules = [];
                }
                
                const activeSchedules = schedules.filter(s => s["Schedule Status"] === "Active");
                this.devices.set(deviceId, activeSchedules);
                
            } catch (error) {
                this.devices.set(deviceId, []);
            }
            
        } catch (error) {
            // Silently handle error
        }
    }
}

// Create singleton instance
const scheduler = new SchedulerService();

// Load initial states before starting
scheduler.loadInitialStates().then(() => {
    // Auto-start when module is loaded
    scheduler.start().catch(() => {});
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    scheduler.stop();
    process.exit(0);
});

process.on('SIGTERM', () => {
    scheduler.stop();
    process.exit(0);
});

module.exports = scheduler;
