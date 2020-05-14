/// <reference types="@types/googlemaps" />
import { Component, AfterViewInit } from '@angular/core';
import { routes } from '../app/routeJson';
import { lineString, FeatureCollection, LineString, AllGeoJSON } from '@turf/helpers';
import { lineOverlap, lineDistance } from '@turf/turf';
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
    clickable: true,
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
        let overlapping = lineOverlap(lineString(this.polyLines[i]), lineString(this.polyLines[j]));
        if (overlapping.features.length > 0) {
          console.log("intersect slice slice");
          console.log(overlapping.features[0].geometry.coordinates.slice(0, 6));
          console.log(overlapping.features[1].geometry.coordinates.slice(0, 6));
          if (this.isOppositeDirection(
            this.polyLines[i],
            this.polyLines[j],
            overlapping.features[0].geometry.coordinates[0],
            overlapping.features[0].geometry.coordinates[1])
          ) {
            this.drawIntersections(overlapping);
          }
        }
      }
    }
  }

  isOppositeDirection(line1: number[][], line2: number[][], firstElement: number[], secondElement: number[]) {
    let index1 = line1.findIndex((obj: number[]) => (this.arePointsEqual(firstElement, obj)));
    let line1Direction = this.determineUpOrDown(line1, index1, secondElement);
    let index2 = line2.findIndex((obj: number[]) => (this.arePointsEqual(firstElement, obj)));
    let line2Direction = this.determineUpOrDown(line2, index2, secondElement);
    console.log("Line 1 at index");
    console.log(line1[index1]);
    console.log("Line 2 at index");
    console.log(line2[index2]);
    console.log("Line 1 slice");
    console.log(line1.slice(index1 - 3, index1 + 3))
    console.log("Line 2 slice");
    console.log(line2.slice(index2 - 3, index2 + 3))
    if (line1Direction === 0 || line2Direction === 0) {
      console.log('no direction becasue: ', line1Direction, ' ', line2Direction)
      return false;
    } else {
      if (line1Direction === line2Direction) {
        console.log('Same direction because: ', line1Direction, ' ', line2Direction)
        return false;
      } else {
        console.log('Opposite direction because: ', line1Direction, ' ', line2Direction)
        return true;
      }
    }
  }

  determineUpOrDown(line, index, secondEle): number {
    let num = 0;
    let oneElementUp = line[index + 1];
    let oneElementDown = line[index - 1];
    if (this.arePointsEqual(oneElementDown, secondEle)) {
      num = 1;
    } else if (this.arePointsEqual(oneElementUp, secondEle)) {
      num = 2;
    } else {
      console.log(oneElementDown)
      console.log(oneElementUp)
      console.log(secondEle)
    }
    return num;
    // return 0 = no match for second element when going up or down the array of points
    // return 1 = match found when going down the array of points
    // return 2 = match found when going up the array of points
  }

  drawIntersections(overlappingPoints: FeatureCollection<LineString>) {
    let formated: LatLngLiteral[] = [];
    for (let feature of overlappingPoints.features) {
      formated = feature.geometry.coordinates.map(e => {return {lat: e[0], lng: e[1]}});
      formated = feature.geometry.coordinates.map(e => {return {lat: e[0], lng: e[1]}});
      this.polyLineOptions.path = formated;
      this.polyLineOptions.strokeColor = this.getRandomColor();
      let line = new google.maps.Polyline(this.polyLineOptions);
      line.setMap(this.map);
      this.startHoverListners(line, feature);
    }
  }

  startHoverListners(polyLineObj: google.maps.Polyline, coords: AllGeoJSON) {
    let infowindow = new google.maps.InfoWindow({
      content: "This intersections is " + lineDistance(coords).toFixed(2) + "km long"
    });
    google.maps.event.addListener(polyLineObj,"mouseover", e => {
      infowindow.setPosition({
        lat: e.latLng.lat(),
        lng: e.latLng.lng(),
      });
      infowindow.open(this.map);
    });
    google.maps.event.addListener(polyLineObj,"mouseout", e => {
      infowindow.close();
    })
  }

  arePointsEqual(point1: number[], point2: number[]): boolean {
    if (!point1 || !point2) {
      console.log(point1, point2)
    }
    if (point1[0] === point2[0] && point1[1] === point2[1]) {
      return true;
    } else {
      return false;
    }
  }

  getRandomColor(): string {
    return "#" + Math.floor(Math.random()*16777215).toString(16);
  }
}
