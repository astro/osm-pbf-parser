var test = require('tape');
var parseOSM = require('../');
var fs = require('fs');
var through = require('through2');
var expected = require('./nodes/expected.json');

test('nodes', function (t) {
console.error('TEST DISABLED');
return t.end();
    t.plan(1);
    
    var osm = parseOSM();
    fs.createReadStream(__dirname + '/nodes/data.pbf')
        .pipe(osm)
        .pipe(through.obj(function (row, enc, next) {
            t.deepEqual(row, expected.shift());
            next();
        }))
    ;
});
