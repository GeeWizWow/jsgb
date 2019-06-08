class EventManager {
    constructor() {
        this.listeners = [];
    }

    register(cb) {
        this.listeners.push(
            cb
        );
    }

    remove(cb) {
        this.listeners = this.listeners.filter(
            c => c !== cb
        );
    }

    invoke() {
        for (let i = 0; i < this.listeners.length; i++) {
            this.listeners[i](...arguments);
        }
    }
}

module.exports = EventManager;