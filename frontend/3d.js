
var createPrismGeometry = function ( vertices, height ) {

	var Shape = new THREE.Shape();

	( function f( ctx ){

	ctx.moveTo( vertices[0].x, vertices[0].y );
	for (var i=1; i < vertices.length; i++)
		{
			ctx.lineTo( vertices[i].x, vertices[i].y );
		}
	ctx.lineTo( vertices[0].x, vertices[0].y );

	} )( Shape );
	
    var settings = {};
    settings.amount = height;
	settings.bevelEnabled = false;
    return new THREE.ExtrudeGeometry(Shape, settings);
};

let camera, scene, sceneObjects, renderer;

function initScene(canvas, staticBodies, finishLine, startBarriers) {

	camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 1000 );
	camera.position.y = 6;
	camera.position.z = 50;

	scene = new THREE.Scene();
	scene.background = new THREE.Color( 0.53, 0.81, 0.92 );

	sceneObjects = {
		lights : [],
		finishLine : null,
		plane : null,
		staticBodies : [],
		cars : {},
		startBarriers : []
	};
	const light = new THREE.AmbientLight( 0xa0a0a0 );
	sceneObjects.lights.push(light);

	const pointLight1 = new THREE.PointLight( 0xffffff );
	pointLight1.position.set( 50000, 50000, 50000 );
	sceneObjects.lights.push(pointLight1);

	// const pointLight2 = new THREE.PointLight( 0xffffff, 0.25 );
	// pointLight2.position.set( - 50000, - 50000, - 50000 );
	// sceneObjects.lights.push(pointLight2);
	
	const plane = new THREE.Mesh( new THREE.PlaneGeometry( 40000, 40000 ), new THREE.MeshBasicMaterial( { color: 0x404040 } ) );
	plane.rotation.x = -Math.PI/2
	sceneObjects.plane = plane;

	for (var i = 0; i < staticBodies.length; i++){
		var geometry = createPrismGeometry(staticBodies[i].points, 2);
	    var material = new THREE.MeshLambertMaterial( { color: Math.floor(16777216 * Math.random()) });
    	var prism1 = new THREE.Mesh( geometry, material );
		prism1.rotation.x = -Math.PI/2;
		sceneObjects.staticBodies.push(prism1);
	}
	for (var i = 0; i < startBarriers.bodies.length; i++){
		var geometry = createPrismGeometry(startBarriers.bodies[i].points, 2);
	    var material = new THREE.MeshLambertMaterial( { color: Math.floor(16777216 * Math.random()) });
    	var prism1 = new THREE.Mesh( geometry, material );
		prism1.rotation.x = -Math.PI/2;
		prism1.position.set(startBarriers.bodies[i].position.x, 0 , startBarriers.bodies[i].position.y);
		sceneObjects.startBarriers.push(prism1);
	}
	if (startBarriers.enabled){
    	sceneAddBarriers();
	}
	var geometry = createPrismGeometry(finishLine.body.points, 2);
    var material = new THREE.MeshLambertMaterial( { color: 0xe0e0e0, 
        transparent: true,
        opacity: 0.4});
	sceneObjects.finishLine =  new THREE.Mesh(geometry, material);
	sceneObjects.finishLine.rotation.x = -Math.PI/2;
	sceneObjects.finishLine.position.set(finishLine.body.position.x, 0 , finishLine.body.position.y);
	
	for (var i = 0; i < sceneObjects.lights.length; i++){
		scene.add(sceneObjects.lights[i]);
	}
	scene.add(sceneObjects.plane);
	for (var i = 0; i < sceneObjects.staticBodies.length; i++){
		scene.add(sceneObjects.staticBodies[i]);
	}
	scene.add(sceneObjects.finishLine);

	renderer = new THREE.WebGLRenderer();
	renderer.setSize( window.innerWidth, window.innerHeight );

	window.addEventListener( 'resize', onWindowResize );
	canvas.parentElement.insertBefore(renderer.domElement, canvas);
}
function addCar(c){
	var geometry = createPrismGeometry(c.body.points, 1.5);
    var material = new THREE.MeshLambertMaterial( { color: Math.floor(16777216 * Math.random()) });
    var prism1 = new THREE.Mesh( geometry, material );
    prism1.position.set(c.body.position.x, 0, c.body.position.y);
    prism1.rotation.x = -Math.PI/2;
    console.log(sceneObjects);
	sceneObjects.cars[c.id] = prism1;
	
	scene.add(prism1);
}
function setCarPositions(carWorld, timeDiff){
    for (var i in carWorld.cars){
        var c = carWorld.getCar(i);
        var state = c.body.lerpedState(timeDiff);
        sceneObjects.cars[i].position.set(state.position.x, 0, state.position.y);
        sceneObjects.cars[i].rotation.z = -state.angle;
    }
}
function removeCar(id){
	var obj = sceneObjects.cars[id];
	delete sceneObjects.cars[id];
	scene.remove(obj);
}
function sceneAddBarriers(){
	for (var i = 0; i < sceneObjects.startBarriers.length; i++){
		scene.add(sceneObjects.startBarriers[i]);
	}
}
function sceneRemoveBarriers(){
	for (var i = 0; i < sceneObjects.startBarriers.length; i++){
		scene.remove(sceneObjects.startBarriers[i]);
	}
}
function updateCamera(v,a){
	camera.position.set(v.x, 4, v.y);
	camera.rotation.order = "YXZ"
	camera.rotation.y = -a - Math.PI/2;
	camera.rotation.x = -0.4;
}
function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );
}

function render() {
	renderer.render( scene, camera );
}