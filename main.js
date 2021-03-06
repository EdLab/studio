function slugify(text) {
    if (!text) {
        return;
    }
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
}

accessToken = 'pk.eyJ1Ijoic2hvaGE5OSIsImEiOiJaMTFkbWtZIn0.2ohvXTb0qeQUH2I-flBkmg';
var mapLoaded = false;
var dataLoaded = false;
var geojson_data = null;
var latest_data = null;
var detectClose = null;

mapboxgl.accessToken = accessToken.toString();
var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/shoha99/cj19t72h4004h2soe7d2an5qd',
    scrollZoom: false,
    center: [-73.965, 40.785],
    zoom: 10
});

// Add zoom and rotation controls to the map.
map.addControl(new mapboxgl.NavigationControl());

map.on('load', function () {
    console.log("map loaded");
    mapLoaded = true;
    if (dataLoaded === true) {
        render_map();
    };
})

var dataset_api = "https://api.mapbox.com/datasets/v1/shoha99/ciyloqvms00302wk1sl0tpt1c/features";
var allFeatures = [];
$.get(dataset_api, {access_token: accessToken}, function (data) {
    geojson_data = {type: "FeatureCollection", features: []};
    latest_data = {type: "FeatureCollection", features: []};

    var features = data.features;
    features.sort(function (a, b) {
        var dateOfA = a.properties.date,
            dateOfB = b.properties.date;
        if(!dateOfA && !dateOfB) {
            return 0;
        }
        if(!dateOfA || !dateOfB) {
            return 1;
        }
        return new Date(dateOfA).getTime() - new Date(dateOfB).getTime();
    })

    allFeatures = features.slice();
    allFeatures.sort(function (a, b) {
        if (a.properties.title < b.properties.title) {
            return -1;
        }
        if (a.properties.title > b.properties.title) {
            return 1;
        }
        return 0;
    })
    var html = '';
    for (var i = 0; i < allFeatures.length; i++) {
        html = html + '<div class="marker-list-item" onclick="pre_render_popup(' + i + ')"><i class="fa fa-map-marker" aria-hidden="true"></i>' + allFeatures[i].properties.title +'</div>';
    }
    $list = $('#markerList');
    $list.html(html);

    $count = $('#markerCount');
    $count.append(features.length);

    var latest = features.pop();
    latest_data.features.push(latest);
    geojson_data.features = features;

    console.log("data loaded");
    dataLoaded = true;
    if (mapLoaded === true) {
        render_map();
    };
})

var toggle_list = function () {
  var $listBox = $('#markerListBox');
  var $list = $('#markerList');
  var $listBoxContent = $('#markerListBoxContent');
  if ($listBox.width() > 0) {
    $list.hide();
    setTimeout(function () {
      $listBoxContent.hide();
    }, 125)
    $listBox.width(0);
  } else {
    $listBox.width(350);
    setTimeout(function () {
      $listBoxContent.show();
    }, 100)
    setTimeout(function () {
      $list.show();
    }, 500)
  }
}
setTimeout(function () {
  toggle_list()
}, 1000)

var pre_render_popup = function (i) {
  render_popup(allFeatures[i]);
}

var render_map = function () {
    console.log("rendering data");
    map.addSource('siny_points', {
        type: 'geojson',
        data: geojson_data
    });
    map.addLayer({
        'id': 'siny_points',
        'type': 'symbol',
        'source': 'siny_points',
        'layout': {
            'icon-image': 'marker-15-green',
            'icon-allow-overlap': true,
        }
    });

    map.addSource('siny_latest_point', {
        type: 'geojson',
        data: latest_data
    });
    map.addLayer({
        'id': 'siny_latest_point',
        'type': 'symbol',
        'source': 'siny_latest_point',
        'layout': {
            'icon-image': 'marker-15-yellow',
            'icon-allow-overlap': true,
        }
    });

    map.on('click', function (e) {
        var features = map.queryRenderedFeatures(e.point, {layers: ['siny_points', 'siny_latest_point']});
        if (!features.length) {
            return;
        }
        var feature = features[0];
        render_popup(feature);
    });

    map.on('mousemove', function (e) {
        var features = map.queryRenderedFeatures(e.point, { layers: ['siny_points', 'siny_latest_point']});
        map.getCanvas().style.cursor = features.length ? 'pointer' : '';
    });

    var current_url = window.location.href;
    var split = current_url.split('/#');
    if (split.length > 1) {
        var feature_slug = split[1];
        if (slugify(latest_data.features[0].properties.title) === feature_slug) {
            render_popup(latest_data.features[0])
        } else {
            for (var i = 0; i < geojson_data.features.length; i++) {
                if (slugify(geojson_data.features[i].properties.title) === feature_slug) {
                    render_popup(geojson_data.features[i])
                    break;
                }
            }
        }
    }
};

var popup = null;
var render_popup = function (feature) {
    var description = feature.properties.description === undefined ?
        "<a target='_blank' href='" + feature.properties.vialogue + "'><img width=275 src='" + feature.properties.image + "'></a>" : feature.properties.description;

    if (popup) {
        popup.remove();
    }
    popup = new mapboxgl.Popup({offset: [0,-15]})
        .setLngLat(feature.geometry.coordinates)
        .setHTML('<h3>' + feature.properties.title + '</h3><p>' + description + '</p>')
        .setLngLat(feature.geometry.coordinates)
        .addTo(map);

    setTimeout(function () {
        history.pushState(null, null, '#' + slugify(feature.properties.title));
    }, 0);
    popup.on('close', function (e) {
        history.pushState(null, null, '/');
    })
}
