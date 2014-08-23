var through = require('through2');
var parseOSM = require('../');


process.stdin
    .pipe(through.obj(function(buf, enc, next) {
        this.push(buf);
        next();
    }, function(next) {
        this.push(null);
        next();
    }))
    .pipe(parseOSM())
    .pipe(aggregateStats())
    .pipe(through.obj(function(stats, enc, next) {
        process.send({
            stats: stats
        });
        next();
        process.exit(0);
    }));

function aggregateStats() {
    var stats = { node: 0, way: 0, relation: 0 };
    return through.obj(function(values, enc, next) {
        values.forEach(function(value) {
            stats[value.type]++;
        });
        // console.error("stats", stats);
        next();
    }, function (next) {
        this.push(stats);
        next();
    });
}
