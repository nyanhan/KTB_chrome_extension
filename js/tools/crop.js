(function(window){

  var crop = window.Crop = {};

  var Cp = function(element, config){
    this.init(element, config);
  };

  Cp.prototype = {
    init: function(element, config){

      this.element = element;
      this.overlay = null;

      this._sx = 0;
      this._sy = 0;

      this._ex = 0;
      this._ey = 0;

      this._mx = 0;
      this._my = 0;

      this._draging   = false;
      this._moving    = false;
      this._resizing  = false;
      this._mousedown = false;
      this._isturnon  = false;

      this._onselect = config.onselect || function(){};
      this._oncancel = config.oncancel || function(){};

    },

    create: function(){

      var self = this;

      this.overlay = crop.createElement("div", {
        "class": "sc_drag_area_protector"
      }, document.body);

      this.overlay.style.width = this._elementw + "px";
      this.overlay.style.height = this._elementy + "px";

      var offset = this.element.getBoundingClientRect();

      this.overlay.style.top = offset.top + document.body.scrollTop + "px";
      this.overlay.style.left = offset.left + document.body.scrollLeft + "px";

      this.overlay.onclick = function(e){ e.stopPropagation(); return false; }

      crop.createElement("div", { "class": "sc_drag_shadow_top" }, this.overlay);
      crop.createElement("div", { "class": "sc_drag_shadow_bottom" }, this.overlay);
      crop.createElement("div", { "class": "sc_drag_shadow_left" }, this.overlay);
      crop.createElement("div", { "class": "sc_drag_shadow_right" }, this.overlay);

      var area = crop.createElement("div", { "class": "sc_drag_area" }, this.overlay);
      crop.createElement("div", { "class": "sc_drag_container" }, area);
      crop.createElement("div", { "class": "sc_drag_size" }, area);

      this.area = area;

      var cancel = crop.createElement("div", { "class": "sc_drag_cancel" }, area);
      var ok = crop.createElement("div", { "class": "sc_drag_crop" }, area);

      cancel.addEventListener("mousedown", function(){
        self._oncancel.call(self);
        self.hide();
      }, true);

      ok.addEventListener("mousedown", function(){
        self._onselect.call(self, self._sx, self._sy, self._ex, self._ey);
        self.hide();
      }, true);

      cancel.innerHTML = "取消";
      ok.innerHTML = "确定";


      crop.createElement("div", { "class": "sc_drag_north_west" }, area);
      crop.createElement("div", { "class": "sc_drag_north_east" }, area);
      crop.createElement("div", { "class": "sc_drag_south_east" }, area);
      crop.createElement("div", { "class": "sc_drag_south_west" }, area);

      this.events = {
        mousemove: this.onMouseMove.bind(self),
        mouseup: this.onMouseUp.bind(self),
        resize: this.onResize.bind(self),
        mousedown: this.onMouseDown.bind(self),
        dblclick: this.onMouseDblclick.bind(this)
      }

      this.overlay.addEventListener("mousedown", this.events.mousedown, false);
      document.addEventListener('mousemove', this.events.mousemove, false);
      document.addEventListener('mouseup', this.events.mouseup, false);
      window.addEventListener("resize", this.events.resize, false);

      this.overlay.querySelector(".sc_drag_container").addEventListener("dblclick", this.events.dblclick, false);
    },

    onResize: function(){
      this._oncancel.call(this);
      this.hide();
    },

    refresh: function(){
      var element = this.element;

      this._elementw = element.offsetWidth;
      this._elementy = element.offsetHeight;

      this.hide();
    },

    hide: function(){

      if (this.overlay) {
        this.overlay.removeEventListener('mousedown', this.events.mousedown, false);
        document.removeEventListener('mousemove', this.events.mousemove, false);
        document.removeEventListener('mouseup', this.events.mouseup, false);
        
        this.overlay.querySelector(".sc_drag_container").removeEventListener("dblclick", this.events.dblclick, false);
        this.overlay.parentNode.removeChild(this.overlay);
        window.removeEventListener("resize", this.events.resize, false);
        this.overlay = null;
      }

      this._isturnon = false;
    },

    showAt: function(left, top, width, height){

      this.refresh();
      this.create();

      this._sx = left;
      this._sy = top;
      this._ex = left + width;
      this._ey = top + height;

      this.area.style.left   = left + "px";
      this.area.style.top    = top + "px";
      this.area.style.width  = width + "px";
      this.area.style.height = height + "px";

      this._isturnon = true;
      this.updateShadow();
      this.updateSize();
    },
    updateShadow: function(){

      var top = this.overlay.querySelector('.sc_drag_shadow_top');

      top.style.height = parseInt(this.area.style.top, 10) + "px";
      top.style.width = parseInt(this.area.style.left, 10) + parseInt(this.area.style.width, 10) + 1 + "px";

      var left = this.overlay.querySelector('.sc_drag_shadow_left');

      left.style.height = this._elementy - parseInt(this.area.style.top, 10) + "px";
      left.style.width = parseInt(this.area.style.left, 10) + "px";
      
      var height = (parseInt(this.area.style.top, 10) + parseInt(this.area.style.height, 10) + 1);

      height = (height < 0) ? 0 : height;

      var width = (this._elementw) - 1 - (parseInt(this.area.style.left, 10) + parseInt(this.area.style.width, 10));

      width = (width < 0) ? 0 : width;

      var right = this.overlay.querySelector('.sc_drag_shadow_right');

      right.style.height = height + "px";
      right.style.width  = width + "px";

      height = (this._elementy - 1 - (parseInt(this.area.style.top, 10) + parseInt(this.area.style.height, 10)));

      height = (height < 0) ? 0 : height;

      width = (this._elementw) - parseInt(this.area.style.left, 10);

      width = (width < 0) ? 0 : width;

      var bottom = this.overlay.querySelector(".sc_drag_shadow_bottom");

      bottom.style.height = height + "px";
      bottom.style.width  = width + "px";
    },

    updateSize: function(){
      var width = Math.abs(this._ex - this._sx);
      var height = Math.abs(this._ey - this._sy);

      this.overlay.querySelector('.sc_drag_size').innerText = width + ' x ' + height;
    },

    onMouseDown: function(e){

      e.preventDefault();

      if (e.button === 2) {
        return;
      }

      var element = e.target;

      if (!element || element.nodeType !== 1) {
        return;
      }

      this._mousedown = true;

      var xPosition = e.pageX - parseInt(this.overlay.style.left, 10);
      var yPosition = e.pageY - parseInt(this.overlay.style.top, 10);

      if (element.className === "sc_drag_container") {
        this._moving = true;
        this._mx = xPosition - parseInt(this.area.style.left, 10);
        this._my = yPosition - parseInt(this.area.style.top, 10);
      } else if (element.className === "sc_drag_north_east") {
        this._resizing = true;
        this._sx = parseInt(this.area.style.left, 10);
        this._sy = parseInt(this.area.style.top, 10) + this.area.offsetHeight;
      } else if (element.className === "sc_drag_north_west") {
        this._resizing = true;
        this._sx = parseInt(this.area.style.left, 10) + this.area.offsetWidth;
        this._sy = parseInt(this.area.style.top, 10) + this.area.offsetHeight;
      } else if (element.className === "sc_drag_south_east") {
        this._resizing = true;
        this._sx = parseInt(this.area.style.left, 10);
        this._sy = parseInt(this.area.style.top, 10);
      } else if (element.className === "sc_drag_south_west") {
        this._resizing = true;
        this._sx = parseInt(this.area.style.left, 10) + this.area.offsetWidth;
        this._sy = parseInt(this.area.style.top, 10);
      } else {
        this._draging = true;
        this._ex = this._sx = xPosition;
        this._ey = this._sy = yPosition;
      }

    },

    onMouseMove: function(e){
      if (!e.target || !this._mousedown) {
          return;
      }

      var xPosition = e.pageX - parseInt(this.overlay.style.left, 10);
      var yPosition = e.pageY - parseInt(this.overlay.style.top, 10);

      if (this._draging || this._resizing) {
        var width = 0, height = 0,
          viewWidth = this._elementw,
          viewHeight = this._elementy;

          if (xPosition > viewWidth) {
            xPosition = viewWidth;
          } else if (xPosition < 0) {
            xPosition = 0;
          }

          if (yPosition > viewHeight) {
            yPosition = viewHeight;
          } else if (yPosition < 0) {
            yPosition = 0;
          }

          this._ex = xPosition;
          this._ey = yPosition;

          if (this._sx > this._ex) {
            width = this._sx - this._ex;
            this.area.style.left = this._ex + 'px';
          } else {
            width = this._ex - this._sx;
            this.area.style.left = this._sx + 'px';
          }

          if (this._sy > this._ey) {
            height = this._sy - this._ey;
            this.area.style.top = this._ey + 'px';
          } else {
            height = this._ey - this._sy;
            this.area.style.top = this._sy + 'px';
          }

          this.area.style.width = width + 'px';
          this.area.style.height = height + 'px';
          
      } else if (this._moving) {
        xPosition = xPosition - this._mx;
        yPosition = yPosition - this._my;

        if (xPosition < 0) {
          xPosition = 0;
        } else if (xPosition + this.area.offsetWidth > this._elementw) {
          xPosition = this._elementw - this.area.offsetWidth;
        }

        if (yPosition < 0) {
          yPosition = 0;
        } else if (yPosition + this.area.offsetHeight > this._elementy) {
          yPosition = this._elementy - this.area.offsetHeight;
        }

        this.area.style.left = xPosition + "px";
        this.area.style.top = yPosition + "px";

        this._ex = xPosition + this.area.offsetWidth;
        this._sx = xPosition;

        this._ey = yPosition + this.area.offsetHeight;
        this._sy = yPosition;
      }

      this.updateShadow();
      this.updateSize();
    },

    onMouseDblclick: function(){
      var self = this;
      
      self._onselect.call(self, self._sx, self._sy, self._ex, self._ey);
      self.hide();
    },

    onMouseUp: function(e) {

      this._mousedown = false;

      if (e.button == 2) {
          return;
      }

      this._resizing = false;
      this._draging = false;
      this._moving = false;
      this._mx = 0;
      this._my = 0;

      var temp;

      if (this._ex < this._sx) {
        temp = this._ex;
        this._ex = this._sx;
        this._sx = temp;
      }
      
      if (this._ey < this._sy) {
        temp = this._ey;
        this._ey = this._sy;
        this._sy = temp;
      }
    }
  };

  crop.createElement = function(tagName, prop, parent) {
    var tag = document.createElement(tagName);

    for (var k in prop) {
      if (prop.hasOwnProperty(k)) {
        tag.setAttribute(k, prop[k]);
      }
    }

    if (parent) {
      parent.appendChild(tag);
    }

    return tag;
  };

  crop.init = function(element, config){
    /*
     * onselect
     * oncancel
     */
    
    return new Cp(element, config || {});
  };

  crop.getStyle = function(element, prop){
    return window.getComputedStyle(element, null).getPropertyValue(prop);
  };

})(this);