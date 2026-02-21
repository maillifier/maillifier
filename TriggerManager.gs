/**
 * Manages time-based triggers for the Mail Agent.
 */
const TriggerManager = {

  /**
   * Sets up or updates the trigger based on WAITING_INTERVAL.
   * Run this manually once or whenever you change the interval.
   */
  // Google Apps Script only allows: 1, 5, 10, 15, 30
  VALID_INTERVALS: [1, 5, 10, 15, 30],

  /**
   * Round to nearest valid interval for everyMinutes()
   */
  normalizeInterval(minutes) {
    const num = parseInt(minutes, 10) || 5;
    // Find closest valid value
    return this.VALID_INTERVALS.reduce((prev, curr) =>
      Math.abs(curr - num) < Math.abs(prev - num) ? curr : prev
    );
  },

  setupTrigger() {
    const raw = CONFIG.WAITING_INTERVAL;
    const interval = this.normalizeInterval(raw);

    if (interval !== parseInt(raw, 10)) {
      console.log(`Interval ${raw} min adjusted to ${interval} min (allowed: ${this.VALID_INTERVALS.join(', ')})`);
    }

    // 1. Remove existing triggers to avoid duplicates
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(t => {
      if (t.getHandlerFunction() === 'processEmails') {
        ScriptApp.deleteTrigger(t);
      }
    });

    // 2. Create new trigger
    ScriptApp.newTrigger('processEmails')
      .timeBased()
      .everyMinutes(interval)
      .create();

    console.log(`Trigger updated: System will check emails every ${interval} minutes.`);
  }
};

/**
 * Interface function to run TriggerManager from the UI.
 */
function setupTrigger() {
  TriggerManager.setupTrigger();
}