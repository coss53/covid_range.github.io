
  let clickedCoord = [];
  var moveendfunction={}
  let HeadmapLayer, AttributeLayer, ClusterLayer, ClusterColorLayer;
  const healthColors = {
    Healthy: '#28a745',
    Throat: '#007bff',
    Nose: '#6f42c1',
    Skin: '#fd7e14',
    Covid: '#dc3545'
  };
  const view = new ol.View({
    center: ol.proj.fromLonLat([37.41, 8.82]),
    zoom: 6,
    
  });

  const basemapLayer = new ol.layer.Tile({
    source: new ol.source.OSM()
  });

  const map = new ol.Map({
    target: 'mymap',
    view: view,
    layers: [basemapLayer]
  });

  const drawSource = new ol.source.Vector();

  const drawayer = new ol.layer.Heatmap({ source: drawSource });
  map.addLayer(drawayer);

  const draw = new ol.interaction.Draw({
    type: 'Point',
    source: drawSource
  });

  draw.on('drawstart', () => drawSource.clear());
  draw.on('drawend', (evt) => {
    clickedCoord = evt.feature.getGeometry().getFlatCoordinates();
    $('#pointadding').modal('show');
    console.log('clicked at', clickedCoord);
    map.removeInteraction(draw);
  });

  function startDrawing() {
    map.addInteraction(draw);
  }

  function SaveDatatodb() {
    const name = document.getElementById('userName').value;
    const cond = document.getElementById('usercondition').value;
    const long = clickedCoord[0];
    const lat = clickedCoord[1];

    if (name && cond && long && lat) {
      $.ajax({
        url: 'save.php',
        type: 'POST',
        data: { username: name, usercond: cond, userlong: long, userlat: lat },
        dataType: 'json',
        success: (response) => {
          if (response.statusCode == 200) {
            alert('User added successfully');
            $('#pointadding').modal('hide');
          } else {
            alert('Server error: ' + response.message);
          }
        },
        error: (xhr, status, error) => {
          console.error('AJAX Error:', error);
          alert('AJAX failed: ' + error);
        }
      });
    } else {
      alert('Please fill all fields');
    }
  }

  function creatinGeojson(arrayofdata) {
    const geojsonObj = {
      type: "FeatureCollection",
      features: arrayofdata.map(data => ({
        type: "Feature",
        properties: {
          name: data.name,
          condition: data.condition
        },
        geometry: JSON.parse(data.st_asgeojson)
      }))
    };

    const dataSource = new ol.source.Vector({
      features: new ol.format.GeoJSON().readFeatures(geojsonObj)
    });

    // Heatmap
    HeadmapLayer = new ol.layer.Heatmap({ source: dataSource });
    map.addLayer(HeadmapLayer);
    HeadmapLayer.setVisible(false);

    // Attribute layer
    // const healthColors = {
    //   Healthy: '#28a745', Throat: '#007bff', Nose: '#6f42c1',
    //   Skin: '#fd7e14', Covid: '#dc3545'
    // };

    const styleFunction = (feature) => {
      const condition = feature.get('condition');
      const color = healthColors[condition] || '#6c757d';
      return new ol.style.Style({
        image: new ol.style.Circle({
          radius: 6,
          fill: new ol.style.Fill({ color }),
          stroke: new ol.style.Stroke({ color: '#fff', width: 1 })
        })
      });
      
    };

    AttributeLayer = new ol.layer.Vector({ source: dataSource, style: styleFunction });
    map.addLayer(AttributeLayer);
    AttributeLayer.setVisible(false);

    // Cluster layer
    const clusterSource = new ol.source.Cluster({
      distance: 40,
      source: dataSource
    });

    const styleCache = {};
    ClusterLayer = new ol.layer.Vector({
      source: clusterSource,
      style: function (feature) {
        const size = feature.get('features').length;
        let style = styleCache[size];
        if (!style) {
          style = new ol.style.Style({
            image: new ol.style.Circle({
              radius: 10,
              stroke: new ol.style.Stroke({ color: '#fff' }),
              fill: new ol.style.Fill({ color: '#3399CC' })
            }),
            text: new ol.style.Text({
              text: size.toString(),
              fill: new ol.style.Fill({ color: '#fff' })
            })
          });
          styleCache[size] = style;
        }
        return style;
      }
    });

    map.addLayer(ClusterLayer);
    ClusterLayer.setVisible(false);

    // ClusterColorLayer (Hexbin)
    let hexbin, binSize;
    let style = 'color', minRadius = 1;
    let min, max, maxi;

    const styleFn = function (f, res) {
      const count = f.get('features').length;
      switch (style) {
        case 'point': {
          let radius = Math.round(binSize / res + 0.5) * Math.min(1, count / max);
          if (radius < minRadius) radius = minRadius;
          return [new ol.style.Style({
            image: new ol.style.RegularShape({
              points: 6,
              radius: radius,
              fill: new ol.style.Fill({ color: [0, 0, 255] }),
              rotateWithView: true
            }),
            geometry: new ol.geom.Point(f.get('center'))
          })];
        }
        case 'gradient': {
          const opacity = Math.min(1, count / max);
          return [new ol.style.Style({ fill: new ol.style.Fill({ color: [0, 0, 255, opacity] }) })];
        }
        case 'color':
        default: {
          let color = [0, 136, 0, 1];
          if (count > max) color = [136, 0, 0, 1];
          else if (count > min) color = [255, 165, 0, 1];
          return [new ol.style.Style({ fill: new ol.style.Fill({ color }) })];
        }
      }
    };

    function reset(givensize) {
      binSize = givensize;
      if (ClusterColorLayer) map.removeLayer(ClusterColorLayer);
      hexbin = new ol.source.HexBin({ source: dataSource, size: binSize });
      ClusterColorLayer = new ol.layer.Vector({
        source: hexbin,
        style: styleFn,
        renderMode: 'image',
        opacity: 0.5
      });

      const features = hexbin.getFeatures();
      min = Infinity; max = 0;
      features.forEach(f => {
        const n = f.get('features').length;
        if (n < min) min = n;
        if (n > max) max = n;
      });
      const dl = (max - min);
      maxi = max;
      min = Math.max(1, Math.round(dl / 4));
      max = Math.round(max - dl / 3);
      map.addLayer(ClusterColorLayer);
      ClusterColorLayer.setVisible(false);
    }
    


    map.on('moveend', function (evt) {
      const zoom = map.getView().getZoom();
      if (zoom > 18) reset(5000);
      else if (zoom > 16) reset(10000);
      else if (zoom > 14) reset(15000);
      else if (zoom > 12) reset(25000);
      else if (zoom > 8) reset(55000);
      else if (zoom > 6) reset(45000);
      else if (zoom > 3) reset(55000);
    });
  }

  

// ✅ Define this function before using it
function addLayer(type) {
  if (HeadmapLayer) HeadmapLayer.setVisible(type === 'Heatmap');
  if (AttributeLayer) AttributeLayer.setVisible(type === 'Attribute');
  if (ClusterLayer) ClusterLayer.setVisible(type === 'Cluster');
  if (ClusterColorLayer) ClusterColorLayer.setVisible(type === 'ClusterColoring');

  const legend = document.getElementById('legend');
  if (type === 'Attribute') {
    legend.style.display = 'block';
    populateLegendForAttributeLayer();
  } else {
    legend.style.display = 'none';
  }
}

function populateLegendForAttributeLayer() {
  const legendItems = document.getElementById("legendItems");
  legendItems.innerHTML = '';
  Object.keys(healthColors).forEach(condition => {
    const li = document.createElement('li');
    li.innerHTML = `<span style="display:inline-block;width:12px;height:12px;background-color:${healthColors[condition]};margin-right:6px;"></span>${condition}`;
    legendItems.appendChild(li);
  });
}


  
  
  

