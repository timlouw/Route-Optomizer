/// <reference types="@types/googlemaps" />
import { Component, AfterViewInit } from '@angular/core';
import { routes } from '../app/routeJson';
import { lineString, FeatureCollection, LineString } from '@turf/helpers';
// import { lineOverlap  } from '@turf/line-overlap';
import lineOverlap from '@turf/line-overlap'
import { LatLngLiteral } from '@agm/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit {
  private map: google.maps.Map;
  private directionsService: google.maps.DirectionsService;
  private polyLines: number[][][] = [];
  private mapOptions: google.maps.MapOptions = {
    zoom: 16,
    draggable: true,
    center: {
        lat: -25.791004,
        lng: 28.303009
    },
    mapTypeControl: false
  };
  private lineSymbol: google.maps.Symbol = {
    path: 'M 0,-1 0,1',
    strokeOpacity: 1,
    scale: 4,
    fillColor: '#ffffff'
  };
  private polyLineOptions: google.maps.PolylineOptions = {
    strokeOpacity: 0,
    icons: [{
      icon: this.lineSymbol,
      offset: '0',
      repeat: '20px'
    }],
    zIndex: 100,
    clickable: true
  }

  constructor() {
  }

  ngAfterViewInit() {
    this.initialize();
  }

  initialize() {
    this.map = new google.maps.Map(document.getElementById('map'), this.mapOptions);
    this.directionsService = new google.maps.DirectionsService();
    this.loadRoutes();
  }

  async loadRoutes() {
    for (let route of routes) {
      var request = {
        origin: new google.maps.LatLng(route.pickupLocationLat, route.pickupLocationLng),
        destination: new google.maps.LatLng(route.dropoffLocationLat, route.dropoffLocationLng),
        travelMode: google.maps.TravelMode.DRIVING
      };
      const directionsDisplay = new google.maps.DirectionsRenderer({ polylineOptions: { strokeColor: this.getRandomColor(), strokeWeight: 5, strokeOpacity: 0.5  }});
      directionsDisplay.setMap(this.map);
      await this.directionsService.route(request, (result, status) => {
        if (status.toString() === 'OK') {
          directionsDisplay.setDirections(result);
          this.polyLines.push(this.createPathArray(result.routes[0].legs));
          if (this.polyLines.length === routes.length) {
            this.findPolylineIntersections();
          }
        }
      });
    }
  }

  createPathArray(legs: any): number[][]  {
    let arrOfarrays: number[][] = [];
    for (let i = 0; i < legs.length; i++) {
      let steps = legs[i].steps;
      for (let j = 0; j < steps.length; j++) {
        let path = steps[j].path;
        for(let point of path) {
          arrOfarrays.push([point.lat(), point.lng()]);
        }
      }
    }
    return arrOfarrays;
  }

  findPolylineIntersections() {
    for (let i = 0; i < this.polyLines.length; i++) {
      for (let j = i+1; j < this.polyLines.length; j++) {
        let line1 = lineString(this.polyLines[i]);
        let line2 = lineString(this.polyLines[j])
        let overlapping = lineOverlap(line1, line2);
        if (overlapping) {
          this.drawIntersections(overlapping);
        }
      }
    }
  }

  drawIntersections(overlappingPoints: FeatureCollection<LineString>) {
    let formated: LatLngLiteral[] = [];
    for (let feature of overlappingPoints.features) {
      formated = feature.geometry.coordinates.map(e => {return {lat: e[0], lng: e[1]}});
      this.polyLineOptions.path = formated;
      this.polyLineOptions.strokeColor = this.getRandomColor();
      let line = new google.maps.Polyline(this.polyLineOptions);
      line.setMap(this.map);
      this.startHoverListners(line);
    }
  }

  startHoverListners(polyLineObj: google.maps.Polyline) {
    let infowindow = new google.maps.InfoWindow({
      content: "infowindow text content"
    });
    google.maps.event.addListener(polyLineObj,"mouseover", e => {
      let pos: google.maps.LatLngLiteral = {
        lat: e.latLng.lat(),
        lng: e.latLng.lng(), 
      }
      infowindow.setPosition(pos);
      infowindow.open(this.map);
    });
    google.maps.event.addListener(polyLineObj,"mouseout", e => {
      infowindow.close();
    })
  }

  getRandomColor() {
    return "#" + Math.floor(Math.random()*16777215).toString(16);
  }
}
