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
    .pipe(through.obj(function (items, enc, next) {
        items.forEach(function (item) {
            console.log('item=', item);
        });
        next();
    }))
;
```

Then you can parse the results:

```
$ node parser osm.pbf | head -n15
item= {
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
item= {
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
item= {
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

# parallel processing

The module exposes `BlobParser` and `BlobEncoder` so that you
distribute binary work units for parsing. See the `pstats` example.

# install

With [npm](https://npmjs.org) do:

```
npm install osm-pbf-parser
```

# license

MIT
