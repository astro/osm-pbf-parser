var test = require('tape');
var fs = require('fs');
var path = require('path');
var parser = require('../');
var through = require('through2');

test('auckland', function (t) {
    t.plan(1);
    var osm = parser();
    var counts = {};
    
    var file = path.join(__dirname, 'extracts/auckland.osm.pbf');
    var rs = fs.createReadStream(file);
    rs.pipe(osm).pipe(through.obj(write, end));
    
    function write (row, enc, next) {
        row.forEach(function (item) {
            if (!counts[item.type]) counts[item.type] = 0;
            counts[item.type] ++;
        });
        next();
    }
    
    function end () {
        console.error(counts);
        t.deepEqual(counts, {
            node: 1072847,
            way: 89306,
            relation: 848
        });
        t.end();
    }
});
