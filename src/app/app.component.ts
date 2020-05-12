/// <reference types="@types/googlemaps" />
import { Component, AfterViewInit } from '@angular/core';
import { routes } from '../app/routeJson';
import { lineOverlap, lineString } from '@turf/turf';

interface Feature {
  coordArray: number[][];
}

interface Overlap {
  features: Feature[];
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit {
  map: google.maps.Map;
  directionsService;
  bounds = new google.maps.LatLngBounds();
  polyLines = [];

  constructor() {
  }

  ngAfterViewInit() {
    this.initialize();
  }

  async loadRoutes() {
    for (let route of routes) {
      var request = {
        origin: new google.maps.LatLng(route.pickupLocationLat, route.pickupLocationLng),
        destination: new google.maps.LatLng(route.dropoffLocationLat, route.dropoffLocationLng),
        travelMode: google.maps.TravelMode.DRIVING
      };
      const directionsDisplay = new google.maps.DirectionsRenderer({ polylineOptions: { strokeColor: "#" + Math.floor(Math.random()*16777215).toString(16), strokeWeight: 5, strokeOpacity: 0.5  }});
      directionsDisplay.setMap(this.map);
      await this.directionsService.route(request, (result, status) => {
        if (status.toString() === 'OK') {
          directionsDisplay.setDirections(result);
          this.polyLines.push(this.createPathArray(result.routes[0].legs));
          if (this.polyLines.length === routes.length) {
            this.drawPolylineIntersections();
          }
        }
      });
    }
  }

  createPathArray(legs: any): any  {
    let arrOfarrays: number[][] = [];
    for (let i = 0; i < legs.length; i++) {
      var steps = legs[i].steps;
      for (let j = 0; j < steps.length; j++) {
        var path = steps[j].path;
        for(let point of path) {
          arrOfarrays.push([point.lat(), point.lng()]);
        }
      }
    }
    return arrOfarrays;
  }

  drawPolylineIntersections() {
    console.log(this.polyLines);
    for (let i = 0; i < this.polyLines.length; i++) {
      for (let j = i+1; j < this.polyLines.length; j++) {
        if (i !== j) {
          let line1 = lineString(this.polyLines[i]);
          let line2 = lineString(this.polyLines[j]);
          let overlapping = lineOverlap(line1, line2);
          if (overlapping) {
            for (let feature of overlapping.features) {
              let formated = feature.geometry.coordinates.map(e => {return {lat: e[0], lng: e[1]}});
              let lineSymbol = {
                path: 'M 0,-1 0,1',
                strokeOpacity: 1,
                scale: 4
              };
              let line = new google.maps.Polyline({
                path: formated,
                strokeOpacity: 0,
                icons: [{
                  icon: lineSymbol,
                  offset: '0',
                  repeat: '20px'
                }],
                map: this.map,
              });
            }
          }
        }
      }
    }
  }

  initialize() {
    let mapOptions = {
        zoom: 16,
        draggable: true,
        center: {
            lat: -25.791004,
            lng: 28.303009
        }
    };
    this.map = new google.maps.Map(document.getElementById('map'), mapOptions);
    this.directionsService = new google.maps.DirectionsService();
    this.loadRoutes();
  }
}
