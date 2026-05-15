
/*********MARKER*************/
window["markersito"]=null;
function createStyle(src, img) {
	console.log("agregando markerssssss");
	return new ol.style.Style({
	  image: new ol.style.Icon(/** @type {olx.style.IconOptions} */ ({
	        anchor: [0.5, 0.96],
	        src: src,
	        img: img,
	        imgSize: img ? [img.width, img.height] : undefined
	  }))
	});
}
function moverMarker(lat, lon){

	console.log("moviendo a","lat:"+lat+" lon:"+lon);
	if(window["markersito"])
		markersito.getSource().clear();
	else console.log("no entro");
	
	var iconFeature = new ol.Feature(new ol.geom.Point([lat,lon]));
	iconFeature.set('style', createStyle(imagenMarker, undefined));
	window["markersito"]=new ol.layer.Vector({
	    style: function(feature) {
	      return feature.get('style');
	    },
	    source: new ol.source.Vector({features: [iconFeature]})
	  });
    map.addLayer(window["markersito"]);
    
    var puntoInteres=[lat, lon];
    flyTo(puntoInteres,16, function() {
    	setTimeout(function(){
        	if(window["markersito"])
        		markersito.getSource().clear();
        },10000);
    	
    });
    
   
}


function flyTo(location,zoomFinal, done) {
    var duration = 2000;
    var zoom = zoomFinal;//view.getZoom();
    var parts = 2;
    var called = false;
    function callback(complete) {
      --parts;
      if (called) {
        return;
      }
      if (parts === 0 || !complete) {
        called = true;
        done(complete);
      }
    }
	console.log(view);
    view.animate({
      center: location,
      duration: duration
    }, callback);
    view.animate({
      zoom: zoom - 1,
      duration: duration / 2
    }, {
      zoom: zoom,
      duration: duration / 2
    }, callback);
  }

/**********************/

function visibilizarCapas(capas){
	$.each(capas, function(key,value){
		var layer=window[value];
		layer.setVisible(true);
	});
}

var view;



function construirMapa(capas){
	
	var scaleLineControl = new ol.control.ScaleLine();
	
	console.log("contruyendo zoom:",zoomActual);
	view = new ol.View({
		center: [latGlobal, lonGlobal],
		zoom: zoomActual,
		maxZoom: 18,
		minZoom: 11,
	});

	if(opcionMapaBase==3){
	    baseMap = new olgm.layer.Google();
	    baseMap.setVisible(true);
	    baseMap.setOpacity(.5);
	}else{
	    if(opcionMapaBase==2){
	        var urlArcGis = 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer';
	        baseMap=new ol.layer.Tile({
	        	title: "Mapa Base",
	            extent: [-2.0037508231469758E7,-1.997186888040859E7,2.0037508231469758E7,1.9971868880408563E7],
	            source: new ol.source.TileArcGISRest({
	              url: urlArcGis
	            }),
	            visible: true,
	            opacity:.5
	          });
	    }else{
	    	
	    	var estadoCapa=true;
	        baseMap = new ol.layer.Tile({
	    		title: "Mapa Base",
	    	    isBaseLayer: true,
	        	source: new ol.source.OSM(),
	        	visible: estadoCapa,
	        	opacity:.5
	        });
	        
	    }
	}
	
	if(zoomActual>=zoomDesvanecerMap)
		baseMap.setVisible(false);

	
    var layers=[
         baseMap,
   ];
    
    if(esGoogleMap){
    	map = new ol.Map({
    		controls: ol.control.defaults({
    	          attributionOptions: /** @type {olx.control.AttributionOptions} */ ({
    	            collapsible: false
    	          })
    	        }).extend([
    	          scaleLineControl
    	        ]),
            interactions: olgm.interaction.defaults(),
            layers: layers,
            target: 'map',
            loadTilesWhileAnimating: true,
            view: view
          });
    }else{
    	map = new ol.Map({
    		controls: ol.control.defaults({
    	          attributionOptions: /** @type {olx.control.AttributionOptions} */ ({
    	            collapsible: false
    	          })
    	        }).extend([
    	          scaleLineControl
    	        ]),
            layers: layers,
            target: 'map',
            view: view
          });
    }
    
    var ghostZoom = map.getView().getZoom();
    map.on('moveend', (function() {
    	
    	
    	var currentCenter=map.getView().getCenter();
    	latGlobal=currentCenter[0];
    	lonGlobal=currentCenter[1];
    	console.log("currentCenter ","Lat:"+currentCenter[0]+"  Lon:"+currentCenter[1]+"  zoomActual:"+zoomActual);
    	
    	
        if (ghostZoom != map.getView().getZoom()) {
            ghostZoom = map.getView().getZoom();
            zoomActual=ghostZoom;
            console.log('zoomend',ghostZoom);
            if(ghostZoom>zoomDesvanecerMap){//14
            	baseMap.setVisible(false);
            }else {
            	baseMap.setVisible(true);
            }
        }
    }));
    
    $.each(capas, function(key,value){
		map.addLayer(window[value]);
	});
    
    if(esGoogleMap){
		var olGM = new olgm.OLGoogleMaps({map: map}); // map is the ol.Map instance
		olGM.activate();
	}
    
    $("#iconoRegla").bind("click",function(e){
    	if($(".div-iconos-select").css("display")==="none"){
    		$(".div-iconos-select").show();
    		realizandoMediciones=true;
    		construirDibujo();
    	}else{
    		$(".div-iconos-select").hide();
    		realizandoMediciones=false;
    		eliminarTooltip();
    	}
    });
    
    popup = new ol.Overlay.Popup();
    map.addOverlay(popup);

    map.on('click', function(evt) {
    	//console.log("EVt",evt);
        var prettyCoord = ol.coordinate.toStringHDMS(ol.proj.transform(evt.coordinate, 'EPSG:3857', 'EPSG:4326'), 2);
        console.log("Coordenadas",evt.coordinate[0]+"   "+evt.coordinate[1]);
        //getInfoLayer(evt.coordinate,popup);
        //getInfoLayerRadio(evt.coordinate,popup);
        if(!realizandoMediciones){
        	getInfoLayerAprox(evt.coordinate,popup);
        }
        
        //popup.show(evt.coordinate, '<div><h3>Ubicacion</h3><p>' + prettyCoord + '</p></div>');
    });

}



function obtenerCapa(titulo,nombreCapa){
	var wmsCapa = new ol.layer.Image({
    	title: titulo,
    	source: new ol.source.ImageWMS({
    		url:'http://www.telocalizo-map.com/cgi-bin/mapserv?map=/var/www/vhosts/telocalizo-map.com/httpdocs/workshop-5.4/archmapcat0.map&FORMAT=application/openlayers',
        	params: {
        		'SERVICE':'WMS',
        		'VERSION':'1.3.0',
        		'REQUEST':'GetMap',
    			'LAYERS':nombreCapa,
    		},
        	serverType: 'mapserver'
      	})
    });
	return wmsCapa; 
}



