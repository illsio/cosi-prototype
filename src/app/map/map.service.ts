import { EventEmitter, Injectable } from '@angular/core';
import * as ol from 'openlayers';
import { environment } from '../../environments/environment';
import {LocalStorageService} from '../local-storage/local-storage.service';
import {LocalStorageMessage} from '../local-storage/local-storage-message.model';

const white = <ol.Color>[255, 255, 255, 1];
const blue = <ol.Color>[0, 153, 255, 1];
const lightskyblue = <ol.Color>[135, 206, 250, 1];
const red = <ol.Color>[255, 0, 0, 1];
const crimson = <ol.Color>[220, 20, 60, 1];
const font = '18px sans-serif';

@Injectable()
export class MapService {
  private instance: ol.Map;
  selectInteraction: ol.interaction.Select;
  baseLayers: { [key: string]: ol.layer.Layer };
  thematicLayers: { [key: string]: { [key: string]: ol.layer.Layer } };
  isFirstClick = false;
  mapClickEvent = new EventEmitter<any>();

  constructor(private localStorageService: LocalStorageService) {
    this.instance = new ol.Map({});
    this.addControls();
    this.addLayers();
    this.addInteractions();
  }

  setTarget(target: string) {
    this.instance.setTarget(target);
  }

  setView(view: ol.View) {
    this.instance.setView(view);
  }

  getView() {
    return this.instance.getView();
  }

  showBaseLayers(layerNames: string[]) {
    Object.values(this.baseLayers).forEach(layer => {
      layer.setVisible(false);
    });
    layerNames.forEach(layerName => {
      if (this.baseLayers.hasOwnProperty(layerName)) {
        this.baseLayers[layerName].setVisible(true);
      }
    });
  }

  showLayers(layerGroupNames: string[], layerName: string) {
    Object.entries(this.thematicLayers).forEach(([layerGroupName, layerGroup]) => {
      // Hide all layers
      Object.values(layerGroup).forEach(layer => {
        layer.setVisible(false);
      });
      if (layerGroupNames.indexOf(layerGroupName) > -1) {
        // Show requested layers
        if (layerGroup.hasOwnProperty(layerName)) {
          layerGroup[layerName].setVisible(true);
        }
        // Show static ('*') layers
        if (layerGroup.hasOwnProperty('*')) {
          layerGroup['*'].setVisible(true);
        }
      }
    });
  }

  getLayerByFeature(feature: ol.Feature): string {
    let matchingLayer;
    for (const [identifier, layerGroup] of Object.entries(this.thematicLayers)) {
      for (const layer of Object.values(layerGroup)) {
        const source = <ol.source.Vector>layer.getSource();

        // Skip non-vector sources
        if (typeof source.forEachFeature !== 'function') {
          continue;
        }
        source.forEachFeature(f => {
          if (feature.getId() === f.getId()) {
            matchingLayer = identifier;
            return;
          }
        });
      }
    }
    return matchingLayer;
  }

  private addControls() {
    const controls = ol.control.defaults().extend([new ol.control.ScaleLine()]);

    controls.forEach(control => {
      this.instance.addControl(control);
    });
  }

  private addLayers() {
    /* The ordering of the layers is important. The first layer is at the bottom, the last is at the top. */
    this.baseLayers = {
      'osm': new ol.layer.Tile({
        source: new ol.source.OSM()
      }),
      'dop20': new ol.layer.Tile({
        source: new ol.source.TileWMS({
          url: 'https://geodienste.hamburg.de/HH_WMS_DOP20',
          params: {
            LAYERS: '1',
            TILED: true,
            FORMAT: 'image/png',
            WIDTH: 256,
            HEIGHT: 256,
            SRS: 'EPSG:4326'
          }
        })
      }),
      'geobasis': new ol.layer.Tile({
        source: new ol.source.TileWMS({
          url: 'https://geodienste.hamburg.de/HH_WMS_Kombi_DISK_GB',
          params: {
            LAYERS: '1,5,9,13',
            TILED: true,
            FORMAT: 'image/png',
            WIDTH: 256,
            HEIGHT: 256,
            SRS: 'EPSG:4326'
          }
        })
      }),
      'stadtteile': new ol.layer.Image({
        source: new ol.source.ImageWMS({
          url: 'https://geodienste.hamburg.de/HH_WMS_Verwaltungsgrenzen',
          params: {
            LAYERS: 'stadtteile',
            FORMAT: 'image/png',
            SRS: 'EPSG:4326'
          },
          projection: 'EPSG:25832'
        }),
        zIndex: 10
      })
    };

    /* The ordering of the layers is important. The first layer is at the bottom, the last is at the top. */
    this.thematicLayers = {
      // Vector layers (self-hosted)
      'kitas': {
        'before': new ol.layer.Vector({
          source: new ol.source.Vector({
            url: environment.geoserverUrl + 'csl/wms?service=WFS&version=1.1.0&request=GetFeature&typeName=csl:kitas' +
              '&outputFormat=application/json&srsname=EPSG:4326',
            format: new ol.format.GeoJSON()
          }),
          zIndex: 1
        }),
        'after': new ol.layer.Vector({
          source: new ol.source.Vector({
            url: environment.geoserverUrl + 'csl/wms?service=WFS&version=1.1.0&request=GetFeature&typeName=csl:kitas_neu' +
              '&outputFormat=application/json&srsname=EPSG:4326',
            format: new ol.format.GeoJSON()
          }),
          zIndex: 1
        })
      },
      'kitasHeatmap': {
        'before': new ol.layer.Heatmap({
          source: new ol.source.Vector({
            url: environment.geoserverUrl + 'csl/wms?service=WFS&version=1.1.0&request=GetFeature&typeName=csl:kitas' +
              '&outputFormat=application/json&srsname=EPSG:4326',
            format: new ol.format.GeoJSON()
          }),
          gradient: ['#0ff', '#0f0', '#ff0', '#f00'],
          weight: feature => feature.get('KapKindneu') / 350,
          radius: 16,
          blur: 30,
          zIndex: 1
        }),
        'after': new ol.layer.Heatmap({
          source: new ol.source.Vector({
            url: environment.geoserverUrl + 'csl/wms?service=WFS&version=1.1.0&request=GetFeature&typeName=csl:kitas_neu' +
              '&outputFormat=application/json&srsname=EPSG:4326',
            format: new ol.format.GeoJSON()
          }),
          gradient: ['#0ff', '#0f0', '#ff0', '#f00'],
          weight: feature => feature.get('KapKindneu') / 350,
          radius: 16,
          blur: 30,
          zIndex: 1
        })
      },
      'einwohner': {
        'before': new ol.layer.Vector({
          source: new ol.source.Vector({
            url: environment.geoserverUrl + 'csl/wms?service=WFS&version=1.1.0&request=GetFeature&typeName=csl:einwohner_0bis6' +
              '&outputFormat=application/json&srsname=EPSG:4326',
            format: new ol.format.GeoJSON()
          })
        }),
        'after': new ol.layer.Vector({
          source: new ol.source.Vector({
            url: environment.geoserverUrl + 'csl/wms?service=WFS&version=1.1.0&request=GetFeature&typeName=csl:einwohner_0bis6_neu' +
              '&outputFormat=application/json&srsname=EPSG:4326',
            format: new ol.format.GeoJSON()
          })
        })
      },
      'gruenflaechen': {
        '*': new ol.layer.Vector({
          source: new ol.source.Vector({
            url: environment.geoserverUrl + 'csl/wms?service=WFS&version=1.1.0&request=GetFeature&typeName=csl:gruenflaechen' +
              '&outputFormat=application/json&srsname=EPSG:4326',
            format: new ol.format.GeoJSON()
          })
        })
      },
      // Vector layers (OpenStreetMap)
      'supermaerkte': {
        '*': new ol.layer.Vector({
          source: new ol.source.Vector({
            url: 'https://overpass-api.de/api/interpreter' +
              '?data=(area[name="Hamburg"];)->.a;node["shop"="supermarket"](area.a);out;',
            format: new ol.format.OSMXML()
          })
        })
      },
      'apotheken': {
        '*': new ol.layer.Vector({
          source: new ol.source.Vector({
            url: 'https://overpass-api.de/api/interpreter' +
              '?data=(area[name="Hamburg"];)->.a;node["amenity"="pharmacy"](area.a);out;',
            format: new ol.format.OSMXML()
          }),
          zIndex: 1
        })
      },
      // WMS layers
      'kitasGehzeit': {
        '*': new ol.layer.Tile({
          source: new ol.source.TileWMS({
            url: 'https://geodienste.hamburg.de/MRH_WMS_REA_Soziales',
            params: {
              LAYERS: '6',
              TILED: true,
              FORMAT: 'image/png',
              WIDTH: 256,
              HEIGHT: 256,
              SRS: 'EPSG:4326'
            }
          }),
          opacity: 0.6
        })
      },
      'supermaerkteGehzeit': {
        '*': new ol.layer.Tile({
          source: new ol.source.TileWMS({
            url: 'https://geodienste.hamburg.de/MRH_WMS_REA_Einzelhandel',
            params: {
              LAYERS: '2',
              TILED: true,
              FORMAT: 'image/png',
              WIDTH: 256,
              HEIGHT: 256,
              SRS: 'EPSG:4326'
            }
          }),
          opacity: 0.6
        })
      },
      'apothekenGehzeit': {
        '*': new ol.layer.Tile({
          source: new ol.source.TileWMS({
            url: 'https://geodienste.hamburg.de/MRH_WMS_REA_Gesundheit',
            params: {
              LAYERS: '2',
              TILED: true,
              FORMAT: 'image/png',
              WIDTH: 256,
              HEIGHT: 256,
              SRS: 'EPSG:4326'
            }
          }),
          opacity: 0.6
        })
      }
    };

    Object.values(this.baseLayers).forEach(layer => {
      this.instance.addLayer(layer);
    });

    Object.entries(this.thematicLayers).forEach(([layerGroupName, layerGroup]) => {
      Object.values(layerGroup).forEach(layer => {
        this.instance.addLayer(layer);
        // Set the default style for each vector layer
        if (layer.constructor === ol.layer.Vector) {
          (<ol.layer.Vector>layer).setStyle(this.getStyle(layerGroupName, false));
        }
        layer.setVisible(false);
      });
    });
  }

  private addInteractions() {
    const defaultInteractions = ol.interaction.defaults({
      altShiftDragRotate: false,
      pinchRotate: false
    });

    // Just for the 'start-click'
    this.instance.on('singleclick', this.mapClickHandler);

    this.selectInteraction = new ol.interaction.Select({
      // Because multiple select interactions for different layers don't work,
      // the layer needs to be determined within the style function. This way we can
      // use the styling associated with the layer the selected feature belongs to.
      style: (feature: ol.Feature) => {
        const selectedLayer = this.getLayerByFeature(feature);
        const styleFunction = this.getStyle(selectedLayer, true);
        if (typeof styleFunction !== 'function') {
          return;
        }
        return styleFunction(feature);
      },
      hitTolerance: 8
    });

    const interactions = defaultInteractions.extend([this.selectInteraction]);

    interactions.forEach(interaction => {
      this.instance.addInteraction(interaction);
    });
  }

  mapClickHandler = (evt) => {
    if (!this.isFirstClick) {
      this.isFirstClick = true;
      this.getView().animate({ zoom: 14}, { center: ol.proj.fromLonLat([9.9880, 53.6126]) });

      let message: LocalStorageMessage<{}> = { type: 'tool-interaction', data: {name : 'tool-start'} };
      this.localStorageService.sendMessage(message);

      this.mapClickEvent.emit('tool-start');
    }
  }

  private getStyle(layer: string, selected: boolean): (feature: ol.Feature) => ol.style.Style {
    // This map contains style definitions for all layers (deselected/selected)
    const styles = {
      'kitas': {
        default: (feature: ol.Feature, resolution: number) => new ol.style.Style({
          image: new ol.style.Circle({
            radius: 7,
            fill: new ol.style.Fill({ color: white }),
            stroke: new ol.style.Stroke({ color: blue, width: 1.5 })
          }),
          text: resolution < 10 ? new ol.style.Text({
            text: '' + (Math.round(feature.get('KapKindneu')) || 0),
            font: font,
            fill: new ol.style.Fill({ color: white }),
            stroke: new ol.style.Stroke({ color: blue, width: 2 }),
            offsetY: -16
          }) : null
        }),
        selected: (feature: ol.Feature, resolution: number) => new ol.style.Style({
          image: new ol.style.Circle({
            radius: 8,
            fill: new ol.style.Fill({ color: blue }),
            stroke: new ol.style.Stroke({ color: white, width: 1.5 })
          }),
          text: resolution < 10 ? new ol.style.Text({
            text: '' + (Math.round(feature.get('KapKindneu')) || 0),
            font: font,
            fill: new ol.style.Fill({ color: white }),
            stroke: new ol.style.Stroke({ color: blue, width: 2 }),
            offsetY: -16
          }) : null
        })
      },
      'einwohner': {
        default: (feature: ol.Feature, resolution: number) => new ol.style.Style({
          fill: new ol.style.Fill({
            color: this.getColor(feature, 'einwohner')
          }),
          stroke: new ol.style.Stroke({ color: lightskyblue, width: 1.5 }),
          text: resolution < 10 ? new ol.style.Text({
            text: '' + (feature.get('1bis6') || 0),
            font: font,
            fill: new ol.style.Fill({ color: white }),
            stroke: new ol.style.Stroke({ color: red, width: 2 })
          }) : null
        }),
        selected: (feature: ol.Feature, resolution: number) => new ol.style.Style({
          fill: new ol.style.Fill({
            color: this.getColor(feature, 'einwohner')
          }),
          stroke: new ol.style.Stroke({ color: blue, width: 2 }),
          text: resolution < 10 ? new ol.style.Text({
            text: '' + (feature.get('1bis6') || 0),
            font: font,
            fill: new ol.style.Fill({ color: white }),
            stroke: new ol.style.Stroke({ color: red, width: 2 })
          }) : null
        })
      },
      'apotheken': {
        default: (feature: ol.Feature) => new ol.style.Style({
          image: new ol.style.Circle({
            radius: 7,
            fill: new ol.style.Fill({ color: white }),
            stroke: new ol.style.Stroke({ color: crimson, width: 1.5 })
          })
        }),
        selected: (feature: ol.Feature) => new ol.style.Style({
          image: new ol.style.Circle({
            radius: 8,
            fill: new ol.style.Fill({ color: crimson }),
            stroke: new ol.style.Stroke({ color: white, width: 1.5 })
          })
        })
      },
      'supermaerkte': {
        default: (feature: ol.Feature) => new ol.style.Style({
          image: new ol.style.Circle({
            radius: 7,
            fill: new ol.style.Fill({ color: white }),
            stroke: new ol.style.Stroke({ color: blue, width: 1.5 })
          })
        }),
        selected: (feature: ol.Feature) => new ol.style.Style({
          image: new ol.style.Circle({
            radius: 8,
            fill: new ol.style.Fill({ color: blue }),
            stroke: new ol.style.Stroke({ color: white, width: 1.5 })
          })
        })
      },
      'gruenflaechen': {
        default: (feature: ol.Feature) => new ol.style.Style({
          fill: new ol.style.Fill({
            color: this.getColor(feature, 'gruenflaechen')
          }),
          stroke: new ol.style.Stroke({
            color: this.getColor(feature, 'gruenflaechen'),
            width: 2
          })
        }),
        selected: (feature: ol.Feature) => new ol.style.Style({
          fill: new ol.style.Fill({
            color: this.getColor(feature, 'gruenflaechen')
          }),
          stroke: new ol.style.Stroke({
            color: blue,
            width: 3
          })
        })
      }
    };

    if (!styles.hasOwnProperty(layer)) {
      return;
    }
    return styles[layer][selected ? 'selected' : 'default'];
  }

  private getColor(feature: ol.Feature, layer: string): ol.Color {
    const scales: { [key: string]: { [key: string]: ol.Color } } = {
      'einwohner': {
        0: [255, 0, 0, 0],    // 0-9
        10: [255, 0, 0, 0.2], // 10-24
        25: [255, 0, 0, 0.4], // 25-49
        50: [255, 0, 0, 0.6], // 50-89
        90: [255, 0, 0, 0.8]  // 90-
      }
    };
    const categories: { [key: string]: { [key: string]: ol.Color } } = {
      'gruenflaechen': {
        'Kleingarten': [160, 82, 45, 0.6],
        'Dauerkleingarten': [160, 82, 45, 0.6],
        'Grün an Kleingärten': [160, 82, 45, 0.6],
        'Parkanlage': [60, 179, 113, 0.6],
        'Spielplatz': [124, 252, 0, 0.6],
        'Friedhof': [72, 209, 204, 0.6],
        'Schutzgrün': [199, 21, 133, 0.6],
        'anderweitige Nutzung': [106, 90, 205, 0.6]
      }
    };

    const fillFunctions = {
      'einwohner': (f: ol.Feature) => {
        return this.getColorFromScale(scales['einwohner'], f.get('1bis6'));
      },
      'gruenflaechen': (f: ol.Feature) => {
        return categories['gruenflaechen'][f.get('gruenart')];
      }
    };

    if (!fillFunctions.hasOwnProperty(layer)) {
      return;
    }
    return fillFunctions[layer](feature);
  }

  private getColorFromScale(scale: { [key: string]: ol.Color }, value: number): ol.Color {
    if (value === null) {
      value = 0;
    }
    return Object.entries(scale).reduce((previous, current) => {
      const limit = parseInt(current[0], 10);
      if (value < limit) {
        return previous;
      }
      return current[1];
    }, <ol.Color>[0, 0, 0, 1]);
  }
}
