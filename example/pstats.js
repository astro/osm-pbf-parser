var through = require('through2');
var parseOSM = require('../');
var fork = require('child_process').fork;
var numCPUs = require('os').cpus().length;

var workers = [], idleWorkers = [];
var idleCallback;
var statsSum = { node: 0, way: 0, relation: 0 };

// Fork workers.
for (var i = 0; i < numCPUs; i++) {
    (function(proc) {

        var worker;
        var stream = through.obj(function(blob, enc, next) {
            idleWorkers.push(worker);
            this.push(blob);
            next();

            if (idleCallback) {
                var cb = idleCallback;
                idleCallback = null;
                cb();
            }
        });
        stream
            .pipe(new parseOSM.BlobEncoder())
            .pipe(proc.stdin);

        worker = {
            write: function(blob) {
                if (blob) {
                    stream.write(blob);
                } else {
                    stream.end();
                }
            }
        };
        workers.push(worker);

        proc.on('message', function(msg) {
            if (msg.stats) {
                statsSum.node += msg.stats.node;
                statsSum.way += msg.stats.way;
                statsSum.relation += msg.stats.relation;
            }
        });

        proc.stderr.pipe(process.stderr);
        proc.on('exit', function(code, signal) {
            if (code !== 0) {
                console.error('worker', proc.pid, 'died with', code);
            }
            workers.shift();  // Remove unrelated worker for counting
            if (workers.length < 1) {
                console.log("statsSum", statsSum);
                process.exit(1);
            }
        });

    })(fork('./pstats_worker', { silent: true }));
}


var i = 0;
var count = 0;
process.stdin
    .pipe(new parseOSM.BlobParser())
    .pipe(through.obj(function(blob, enc, next) {
        count += blob.zlib_data.length;
        if (blob.type === 'OSMHeader') {
            workers.forEach(function(worker) {
                worker.write(blob);
            });
            next();
        } else {
            function write() {
                var worker = idleWorkers.shift();
                if (idleCallback) {
                    console.warn("Previous idleCallback found");
                }
                if (worker) {
                    idleCallback = next;
                    worker.write(blob);
                } else {
                    idleCallback = write;
                }
            }
            write();
        }
    }, function(next) {
        workers.forEach(function(worker) {
            worker.write(null);
        });
        next();
    }));
