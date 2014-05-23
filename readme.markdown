# osm-pbf-parser

streaming [open street maps](https://wiki.openstreetmap.org) protocol buffer
parser

# example

First grab a pbf torrent from: http://osm-torrent.torres.voyager.hr/files/rss.xml

``` js
var fs = require('fs');
var through = require('through2');
var parseOSM = require('osm-pbf-parser');

var osm = parseOSM();
fs.createReadStream(process.argv[2])
    .pipe(osm)
    .pipe(through.obj(function (row, enc, next) {
        console.log('row=', row);
        next();
    }))
;
```

Then you can parse the results:

```
$ node parser osm.pbf | head -n15
row= { type: 'group',
  points: 
   [ [ 50.1241068, 14.4525579 ],
     [ 1.2565819, -5.0923996 ],
     [ -47.296883400000006, 64.1520888 ],
     [ 47.2562488, -64.030435 ],
     [ 0.0330501, 0.0311937 ],
     [ 0.5727711000000001, -9.7199858 ],
     [ -0.007692300000000001, -0.061653000000000006 ],
     [ -0.007973000000000001, -0.005645000000000001 ],
     [ -0.07851000000000001, 0.01217 ],
     [ 0.047546000000000005, 0.149149 ],
     [ -0.0029237, -0.035571200000000004 ],
     [ 0.0001663, 0.0005541000000000001 ],
     [ 0.0037239, 0.0021202 ],
```

# methods

``` js
var parseOSM = require('osm-pbf-parser')
```

## var stream = parseOSM()

Return a transform parser `stream` that takes a binary OSM protocol buffer
stream as input and produces parsed objectMode rows as output.

# rows

Each `row` from the output stream has a `row.type`.

## row.type === 'group'

Group rows have these properties:

* `row.points` - an array of `[lat,lon]` arrays describing a polygon

# install

With [npm](https://npmjs.org) do:

```
npm install osm-pbf-parser
```

# license

MIT
