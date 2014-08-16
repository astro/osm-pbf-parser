var test = require('tape');
var fs = require('fs');
var path = require('path');
var parser = require('../');
var through = require('through2');

var expected = require('./data/auckland_first_50.json');

test('auckland first 50 rows', function (t) {
    t.plan(expected.length);
    var osm = parser();
    var counts = {};
    
    var file = path.join(__dirname, 'extracts/auckland.osm.pbf');
    var rs = fs.createReadStream(file);
    rs.pipe(osm).pipe(through.obj(write));
    
    function write (items, enc, next) {
        for (var i = 0; i < items.length; i++) {
            t.deepEqual(items[i], expected.shift());
            if (expected.length === 0) break;
        }
        if (expected.length > 0) next();
        else rs.close();
    }
});
