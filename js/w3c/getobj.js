function getObj(name) {
  if (document.getElementById) {
    this.obj = document.getElementById(name);
    this.style = document.getElementById(name).style;
  } else if (document.all) {
	this.obj = document.all[name];
	this.style = document.all[name].style;
  } else if (document.layers) {
   	this.obj = document.layers[name];
   	this.style = document.layers[name];
  }
}