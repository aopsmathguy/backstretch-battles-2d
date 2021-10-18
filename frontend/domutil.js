function $e(id){
	return document.getElementById(id);
}
function setCanvas(canvas) {
	var scaleFactor = window.devicePixelRatio;
    // Set up CSS size.
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';

    // Resize canvas and scale future draws.
    canvas.width = Math.ceil(window.innerWidth * scaleFactor);
    canvas.height = Math.ceil(window.innerHeight * scaleFactor);
    var ctx = canvas.getContext('2d');
    ctx.scale(scaleFactor, scaleFactor);
}