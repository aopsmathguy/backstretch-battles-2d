var controls = {
  keys: {},
  mouse: 0,
  mouseDown: false,
  start: (function() {
    this.mouse = new Vector(0, 0);
    window.addEventListener('keydown', function(e) {
      if (!controls.keys[e.key]) {
        controls.keys[e.key] = true;
        socket.emit('keydown', e.key);
      }
    });
    window.addEventListener('keyup', function(e) {
      if (controls.keys[e.key]) {
        controls.keys[e.key] = false;
        socket.emit('keyup', e.key);
      }
    });
    const rect = canvas.getBoundingClientRect();
    window.addEventListener('mousemove', function(e) {
      controls.mouse = new Vector(e.clientX - rect.left, e.clientY - rect.top);
    });
    window.addEventListener('mousedown', function(e) {
      if (e.button == 0) {
        controls.mouseDown = true;
      }
    });
    window.addEventListener('mouseup', function(e) {
      if (e.button == 0) {
        controls.mouseDown = false;
      }
    });
    return true;
  })()
};
