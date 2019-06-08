require('./logBuffer');

const fs = require('fs');

class Logger {
    constructor(path) {

        this.path = path;
        this.data = '';

        fs.writeFileSync(this.path, '', 'utf8');
    }

    write(msg) {
        this.data += msg + '\n';

        if (this.data.length > 5000) {
            this.flushToFile();
        } 
    }

    flushToFile() {
        fs.appendFileSync(this.path, this.data, 'utf8');
        this.data = '';
    }
}

module.exports = Logger;