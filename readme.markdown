# osm-pbf-parser

streaming [open street maps](https://wiki.openstreetmap.org) protocol buffer
parser

[![build status](https://secure.travis-ci.org/substack/osm-pbf-parser.png)](http://travis-ci.org/substack/osm-pbf-parser)

# example

First grab a pbf torrent from
http://osm-torrent.torres.voyager.hr/files/rss.xml or from http://download.geofabrik.de/

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
row= {
  type: 'node',
  id: 122321,
  lat: 53.527972600000005,
  lon: 10.0241143,
  tags: {},
  info: {
     version: 9,
     id: 122321,
     timestamp: 1329691614000,
     changeset: 10735897,
     uid: 349191,
     user: 'glühwürmchen'
  }
}
row= {
  type: 'way',
  id: 108,
  tags: {
     created_by: 'Potlatch 0.8',
     highway: 'living_street',
     name: 'Kitzbühler Straße',
     postal_code: '01217' },
  refs: [ 442752, 231712390, 442754 ],
  info: {
     version: 5,
     timestamp: 1227877069000,
     changeset: 805472,
     uid: 42123,
     user: 'Ropino'
  }
}
row= {
  type: 'relation',
  id: 3030,
  tags: { layer: '1', type: 'bridge' },
  members: [
     { type: 'way', id: 12156789, role: 'across' },
     { type: 'way', id: 12156793, role: 'under' },
     { type: 'way', id: 34235338, role: '' }
  ],
  info: {
     version: 3,
     timestamp: 1323359077000,
     changeset: 10066052,
     uid: 75154,
     user: 'RWR'
  }
}
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

# install

With [npm](https://npmjs.org) do:

```
npm install osm-pbf-parser
```

# license

MIT
