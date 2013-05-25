var page = {
  startX: 250,
  startY: 150,
  endX: 650,
  endY: 450,
  moveX: 0,
  moveY: 0,
  pageWidth: 0,
  pageHeight: 0,
  visibleWidth: 0,
  visibleHeight: 0,
  dragging: false,
  moving: false,
  resizing: false,
  isMouseDown: false,
  scrollXCount: 0,
  scrollYCount: 0,
  captureWidth: 0,
  captureHeight: 0,
  isSelectionAreaTurnOn: false,
  fixedElements_ : [],
  marginTop: 0,
  marginLeft: 0,
  modifiedBottomRightFixedElements: [],
  originalViewPortWidth: window.innerWidth,

  hookBodyScrollValue: function(needHook) {
    document.documentElement.setAttribute(
        "__screen_capture_need_hook_scroll_value__", needHook);
    var event = document.createEvent('Event');
    event.initEvent('__screen_capture_check_hook_status_event__', true, true);
    document.documentElement.dispatchEvent(event);
  },

  /**
   * Detect if the view port is located to the corner of page.
   */
  detectPagePosition: function() {

    var pageScrollTop = page.scrollYCount * page.visibleHeight;
    var pageScrollLeft = page.scrollXCount * page.visibleWidth;
    var right = (pageScrollLeft + page.visibleWidth) >= page.captureWidth;
    var bottom = (pageScrollTop + page.visibleHeight) >= page.captureHeight;

    if (pageScrollTop == 0 && pageScrollLeft == 0) {
      return 'top_left';
    } else if (pageScrollTop == 0 && right) {
      return 'top_right';
    } else if (bottom && pageScrollLeft == 0) {
      return 'bottom_left';
    } else if (bottom && right) {
      return 'bottom_right';
    } else if (pageScrollLeft == 0) {
        return "left";
    } else if (pageScrollTop == 0) {
        return "top";
    } else if (right) {
        return "right";
    } else if (bottom) {
        return "bottom";
    }

    return null;
  },

  /**
   * Detect fixed-positioned element's position in the view port.
   * @param {Element} elem
   * @return {String|Object} Return position of the element in the view port:
   *   top_left, top_right, bottom_left, bottom_right, or null.
   */
  detectCapturePositionOfFixedElement: function(elem) {
    var size = page.getViewPortSize();
    var viewPortWidth = size.width;
    var viewPortHeight = size.height;
    var offsetWidth = elem.offsetWidth;
    var offsetHeight = elem.offsetHeight;
    var offsetTop = elem.offsetTop;
    var offsetLeft = elem.offsetLeft;
    var result = [];

    // Compare distance between element and the edge of view port to determine
    // the capture position of element.
    if (offsetTop <= viewPortHeight - offsetTop - offsetHeight) {
      result.push('top');
    } else if (offsetTop < viewPortHeight) {
      result.push('bottom');
    }
    if (offsetLeft <= viewPortWidth - offsetLeft - offsetWidth) {
      result.push('left');
    } else if (offsetLeft < viewPortWidth) {
      result.push('right');
    }

    // If the element is out of view port, then ignore.
    if (result.length != 2)
      return null;

    return result.join('_');
  },

  restoreFixedElements: function() {
    this.fixedElements_.forEach(function(element) {
      element[1].style.visibility = 'visible';
    });
    this.fixedElements_ = [];
  },

  /**
   * Iterate DOM tree and cache visible fixed-position elements.
   */
  cacheVisibleFixedPositionedElements: function() {

    var nodeIterator = document.createNodeIterator(document.documentElement, NodeFilter.SHOW_ELEMENT, null, false);

    var currentNode;

    while (currentNode = nodeIterator.nextNode()) {
      var nodeComputedStyle =
          document.defaultView.getComputedStyle(currentNode, "");
      // Skip nodes which don't have computeStyle or are invisible.
      if (!nodeComputedStyle)
        continue;
      if (nodeComputedStyle.position == "fixed" &&
          nodeComputedStyle.display != 'none' &&
          nodeComputedStyle.visibility != 'hidden') {
        var position =
          this.detectCapturePositionOfFixedElement(currentNode);
        if (position)
          this.fixedElements_.push([position, currentNode]);
      }
    }
  },

  // Handle fixed-position elements for capture.
  handleFixedElements: function(capturePosition) {
    var docElement = document.documentElement;
    var body = document.body;

    // If page has no scroll bar, then return directly.
    if (docElement.clientHeight == body.scrollHeight &&
        docElement.clientWidth == body.scrollWidth)
      return;
    
    if (!this.fixedElements_.length) {
      this.cacheVisibleFixedPositionedElements();
    }

    this.fixedElements_.forEach(function(element) {
      if (element[0] == capturePosition)
        element[1].style.visibility = 'visible';
      else
        element[1].style.visibility = 'hidden';
    });
  },
  
  hideAllFixedPositionedElements: function() {
    this.fixedElements_.forEach(function(element) {
      element[1].style.visibility = 'hidden';
    });
  },

  getOriginalViewPortWidth: function() {
    page.originalViewPortWidth = window.innerWidth;
  },

  getViewPortSize: function() {
    return { width: window.innerWidth, height: window.innerHeight };
  },

  /**
  * Receive messages from background page, and then decide what to do next
  */
  addMessageListener: function() {

    chrome.runtime.onMessage.addListener(function(request, sender, response) {

      if (page.isSelectionAreaTurnOn) {
        page.removeSelectionArea();
      }
      
      switch (request.message) {
        case 'ktb_extension_capture_part':
          page.showSelectionArea();
          break;
        case 'ktb_extension_capture_hole':
          page.scrollInit(0, 0);
          break;
      }

      
    });
  },

  /**
  * Initialize scrollbar position, and get the data browser
  */
  scrollInit: function(startX, startY) {

    page.captureWidth = document.body.scrollWidth;
    page.captureHeight = document.body.scrollHeight;
    page.startX = startX;
    page.startY = startY;

    var viewPortSize = page.getViewPortSize();
    var canvas = page.createCanvas();

    canvas.width = page.captureWidth;
    canvas.height = page.captureHeight;

    this.hookBodyScrollValue(true);
    document.body.__prevOverflowStatus = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    page.visibleWidth = viewPortSize.width;
    page.visibleHeight = viewPortSize.height;

    window.scrollTo(startX, startY);

    this.handleFixedElements('top_left');

    page.scrollXCount = 0;
    page.scrollYCount = 0;

    page.captureAndScroll();
  },

  captureAndScroll: function(position){

    setTimeout(function(){
      chrome.runtime.sendMessage({ message: "capture_picture" }, function(data){
        var canvas = page.createCanvas();
        var image = new Image();

        image.onload = function(){

          var ctx = canvas.getContext("2d");
          var x = page.scrollXCount * page.visibleWidth;
          var y = page.scrollYCount * page.visibleHeight;


          // if is the last one;
          if (position && position.indexOf("bottom") >= 0) {
              y = page.captureHeight - page.visibleHeight;
          }

          if (position && position.indexOf("right") >= 0) {
              x = page.captureWidth - page.visibleWidth;
          }

          ctx.drawImage(image, x, y);

          page.scrollNext();

        };

        image.src = data;
      });
    }, 200);
  },

  /**
  * Calculate the next position of the scrollbar
  */
  scrollNext: function() {

    page.scrollXCount++;

    if (page.scrollXCount * page.visibleWidth >= page.captureWidth) {
      page.scrollYCount++;
      page.scrollXCount = 0;
    }

    if (page.scrollYCount * page.visibleHeight < page.captureHeight) {

      var viewPortSize = page.getViewPortSize();

      window.scrollTo( page.scrollXCount * viewPortSize.width, page.scrollYCount * viewPortSize.height);

      var pagePosition = this.detectPagePosition();

      if (pagePosition && pagePosition.split("_").length === 2) {
        this.handleFixedElements(pagePosition);
      } else {
        this.hideAllFixedPositionedElements();
      }

      page.captureAndScroll(pagePosition);

    } else {

      window.scrollTo(page.startX, page.startY);

      this.restoreFixedElements();
      this.hookBodyScrollValue(false);

      document.body.style.overflow = document.body.__prevOverflowStatus || "";
      delete document.body.__prevOverflowStatus;

      chrome.runtime.sendMessage({ message: "capture_data", data: page.canvas.toDataURL("image/jpeg", 0.95), location_href: location.href });
    }
  },

  /**
  * Show the selection Area
  */
  showSelectionArea: function() {
    page.createFloatLayer();
    setTimeout(page.createSelectionArea, 100);
  },

  /**
  * Create a float layer on the webpage
  */
  createFloatLayer: function() {
    page.createDiv(document.body, 'sc_drag_area_protector');
  },
  
  matchMarginValue: function(str) {
    return str.match(/\d+/);
  },

  /**
  * Load the screenshot area interface
  */
  createSelectionArea: function() {
    var areaProtector = $('sc_drag_area_protector');
    var bodyStyle = window.getComputedStyle(document.body, null);
    if ('relative' == bodyStyle['position']) {
      page.marginTop = page.matchMarginValue(bodyStyle['marginTop']);
      page.marginLeft = page.matchMarginValue(bodyStyle['marginLeft']);
      areaProtector.style.top =  - parseInt(page.marginTop) + 'px';
      areaProtector.style.left =  - parseInt(page.marginLeft) + 'px';
    }
    areaProtector.style.width =
      Math.round((document.width + parseInt(page.marginLeft))) + 'px';
    areaProtector.style.height =
      Math.round((document.height + parseInt(page.marginTop))) + 'px';
    areaProtector.onclick = function() {
      event.stopPropagation();
      return false;
    };

    // Create elements for area capture.
    page.createDiv(areaProtector, 'sc_drag_shadow_top');
    page.createDiv(areaProtector, 'sc_drag_shadow_bottom');
    page.createDiv(areaProtector, 'sc_drag_shadow_left');
    page.createDiv(areaProtector, 'sc_drag_shadow_right');

    var areaElement = page.createDiv(areaProtector, 'sc_drag_area');
    page.createDiv(areaElement, 'sc_drag_container');
    page.createDiv(areaElement, 'sc_drag_size');

    // Add event listener for 'cancel' and 'capture' button.
    var cancel = page.createDiv(areaElement, 'sc_drag_cancel');
    cancel.addEventListener('mousedown', function () {
      // Remove area capture containers and event listeners.
      page.removeSelectionArea();
    }, true);
    cancel.innerHTML = "取消"

    var crop = page.createDiv(areaElement, 'sc_drag_crop');

    crop.addEventListener('mousedown', function() {
      page.captureSelected();
    }, false);

    crop.innerHTML = "确定";

    page.createDiv(areaElement, 'sc_drag_north_west');
    page.createDiv(areaElement, 'sc_drag_north_east');
    page.createDiv(areaElement, 'sc_drag_south_east');
    page.createDiv(areaElement, 'sc_drag_south_west');

    areaProtector.addEventListener('mousedown', page.onMouseDown, false);
    document.addEventListener('mousemove', page.onMouseMove, false);
    document.addEventListener('mouseup', page.onMouseUp, false);

    $('sc_drag_container').addEventListener('dblclick', page.onMouseDBClick, false);

    page.pageHeight = $('sc_drag_area_protector').clientHeight;
    page.pageWidth = $('sc_drag_area_protector').clientWidth;

    page.startX = document.body.scrollLeft + 250;
    page.startY = document.body.scrollTop + 150;
    page.endX   = document.body.scrollLeft + 650;
    page.endY   = document.body.scrollTop + 450;

    areaElement.style.left = page.startX + 'px';
    areaElement.style.top = page.startY + 'px';

    areaElement.style.width = page.endX - page.startX + "px";
    areaElement.style.height = page.endY - page.startY + "px";
    
    page.isSelectionAreaTurnOn = true;
    page.updateShadow(areaElement);
    page.updateSize();

  },

  /**
  * Init selection area due to the position of the mouse when mouse down
  */
  onMouseDown: function() {
    if (event.button != 2) {
      var element = event.target;

      if (element) {
        var elementName = element.tagName;
        if (elementName && document) {
          page.isMouseDown = true;

          var areaElement = $('sc_drag_area');
          var xPosition = event.pageX;
          var yPosition = event.pageY;

          if (areaElement) {
            if (element == $('sc_drag_container')) {
              page.moving = true;
              page.moveX = xPosition - areaElement.offsetLeft;
              page.moveY = yPosition - areaElement.offsetTop;
            } else if (element == $('sc_drag_north_east')) {
              page.resizing = true;
              page.startX = areaElement.offsetLeft;
              page.startY = areaElement.offsetTop + areaElement.clientHeight;
            } else if (element == $('sc_drag_north_west')) {
              page.resizing = true;
              page.startX = areaElement.offsetLeft + areaElement.clientWidth;
              page.startY = areaElement.offsetTop + areaElement.clientHeight;
            } else if (element == $('sc_drag_south_east')) {
              page.resizing = true;
              page.startX = areaElement.offsetLeft;
              page.startY = areaElement.offsetTop;
            } else if (element == $('sc_drag_south_west')) {
              page.resizing = true;
              page.startX = areaElement.offsetLeft + areaElement.clientWidth;
              page.startY = areaElement.offsetTop;
            } else {
              page.dragging = true;
              page.endX = 0;
              page.endY = 0;
              page.endX = page.startX = xPosition;
              page.endY = page.startY = yPosition;
            }
          }
          event.preventDefault();
        }
      }
    }
  },

  /**
  * Change selection area position when mouse moved
  */
  onMouseMove: function() {
    var element = event.target;
    if (element && page.isMouseDown) {
      var areaElement = $('sc_drag_area');
      if (areaElement) {
        var xPosition = event.pageX;
        var yPosition = event.pageY;
        if (page.dragging || page.resizing) {
          var width = 0;
          var height = 0;
          var view = page.getViewPortSize();
          var viewWidth = view.width;
          var viewHeight = view.height;

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

          page.endX = xPosition;
          page.endY = yPosition;
          if (page.startX > page.endX) {
            width = page.startX - page.endX;
            areaElement.style.left = xPosition + 'px';
          } else {
            width = page.endX - page.startX;
            areaElement.style.left = page.startX + 'px';
          }
          if (page.startY > page.endY) {
            height = page.startY - page.endY;
            areaElement.style.top = page.endY + 'px';
          } else {
            height = page.endY - page.startY;
            areaElement.style.top = page.startY + 'px';
          }
          areaElement.style.height = height + 'px';
          areaElement.style.width  = width + 'px';
          if (window.innerWidth < xPosition) {
            document.body.scrollLeft = xPosition - window.innerWidth;
          }
          if (document.body.scrollTop + window.innerHeight < yPosition + 25) {
            document.body.scrollTop = yPosition - window.innerHeight + 25;
          }
          if (yPosition < document.body.scrollTop) {
            document.body.scrollTop -= 25;
          }
        } else if (page.moving) {
          var newXPosition = xPosition - page.moveX;
          var newYPosition = yPosition - page.moveY;
          if (newXPosition < 0) {
            newXPosition = 0;
          } else if (newXPosition + areaElement.clientWidth > page.pageWidth) {
            newXPosition = page.pageWidth - areaElement.clientWidth;
          }
          if (newYPosition < 0) {
            newYPosition = 0;
          } else if (newYPosition + areaElement.clientHeight >
                     page.pageHeight) {
            newYPosition = page.pageHeight - areaElement.clientHeight;
          }

          areaElement.style.left = newXPosition + 'px';
          areaElement.style.top = newYPosition + 'px';
          page.endX = newXPosition + areaElement.clientWidth;
          page.startX = newXPosition;
          page.endY = newYPosition + areaElement.clientHeight;
          page.startY = newYPosition;

        }
        var crop = document.getElementById('sc_drag_crop');
        var cancel = document.getElementById('sc_drag_cancel');
        if (event.pageY + 25 > document.height) {
          crop.style.bottom = 0;
          cancel.style.bottom = 0
        } else {
          crop.style.bottom = '-25px';
          cancel.style.bottom = '-25px';
        }

        var dragSizeContainer = document.getElementById('sc_drag_size');
        if (event.pageY < 18) {
          dragSizeContainer.style.top = 0;
        } else {
          dragSizeContainer.style.top = '-18px';
        }
        page.updateShadow(areaElement);
        page.updateSize();

      }
    }
  },

  onMouseDBClick: function(){
    page.captureSelected();
  },

  createCanvas: function(){

    if (page.canvas) {
        return page.canvas;
    }

    var canvas = document.createElement("canvas");

    canvas.style.display = "none";

    try {
      HtmlCollector.container.appendChild(canvas);
    } catch(e){
      document.body.appendChild(canvas);
    }

    page.canvas = canvas;

    return canvas;
  },

  captureSelected: function(){

    page.removeSelectionArea();

    setTimeout(function() {

      chrome.runtime.sendMessage({ message: "capture_picture" }, function(data){

        var canvas = page.createCanvas();

        var image = new Image();

        canvas.width = page.endX - page.startX;
        canvas.height = page.endY - page.startY;

        image.onload = function(){

          var ctx = canvas.getContext("2d");

          ctx.drawImage(image, document.body.scrollLeft - page.startX, document.body.scrollTop - page.startY);

          var dataUrl = canvas.toDataURL("image/jpeg", 0.95);

          chrome.runtime.sendMessage({ message: "capture_data", data: dataUrl, location_href: location.href });

        };

        image.src = data;
      });

    }, 200);

  },

 /**
  * Fix the selection area position when mouse up
  */
  onMouseUp: function() {
    page.isMouseDown = false;
    if (event.button != 2) {
      page.resizing = false;
      page.dragging = false;
      page.moving = false;
      page.moveX = 0;
      page.moveY = 0;
      var temp;
      if (page.endX < page.startX) {
        temp = page.endX;
        page.endX = page.startX;
        page.startX = temp;
      }
      if (page.endY < page.startY) {
        temp = page.endY;
        page.endY = page.startY;
        page.startY = temp;
      }
    }
  },

  /**
  * Update the location of the shadow layer
  */
  updateShadow: function(areaElement) {
    $('sc_drag_shadow_top').style.height =
        parseInt(areaElement.style.top) + 'px';
    $('sc_drag_shadow_top').style.width = (parseInt(areaElement.style.left) +
        parseInt(areaElement.style.width) + 1) + 'px';
    $('sc_drag_shadow_left').style.height =
        (page.pageHeight - parseInt(areaElement.style.top)) + 'px';
    $('sc_drag_shadow_left').style.width =
        parseInt(areaElement.style.left) + 'px';

    var height = (parseInt(areaElement.style.top) +
        parseInt(areaElement.style.height) + 1);
    height = (height < 0) ? 0 : height;
    var width = (page.pageWidth) - 1 - (parseInt(areaElement.style.left) +
        parseInt(areaElement.style.width));
    width = (width < 0) ? 0 : width;
    $('sc_drag_shadow_right').style.height = height + 'px';
    $('sc_drag_shadow_right').style.width =  width + 'px';

    height = (page.pageHeight - 1 - (parseInt(areaElement.style.top) +
        parseInt(areaElement.style.height)));
    height = (height < 0) ? 0 : height;
    width = (page.pageWidth) - parseInt(areaElement.style.left);
    width = (width < 0) ? 0 : width;
    $('sc_drag_shadow_bottom').style.height = height + 'px';
    $('sc_drag_shadow_bottom').style.width = width + 'px';
  },

  /**
  * Remove selection area
  */
  removeSelectionArea: function() {
    document.removeEventListener('mousedown', page.onMouseDown, false);
    document.removeEventListener('mousemove', page.onMouseMove, false);
    document.removeEventListener('mouseup', page.onMouseUp, false);
    $('sc_drag_container').removeEventListener('dblclick', page.onMouseDBClick, false);
      
    page.removeElement('sc_drag_area_protector');
    page.removeElement('sc_drag_area');
    page.isSelectionAreaTurnOn = false;
  },

  /**
  * Refresh the size info
  */
  updateSize: function() {
    var width = Math.abs(page.endX - page.startX);
    var height = Math.abs(page.endY - page.startY);

    $('sc_drag_size').innerText = width + ' x ' + height;
  },

  /**
  * create div
  */
  createDiv: function(parent, id) {
    var divElement = document.createElement('div');
    divElement.id = id;
    parent.appendChild(divElement);
    return divElement;
  },

  /**
  * Remove an element
  */
  removeElement: function(id) {
    var element = $(id);

    if(element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  },

  /**
  * Remove an element
  */
  init: function() {
    this.addMessageListener();
    page.getOriginalViewPortWidth();
  }
};


function $(id) {
  return document.getElementById(id);
}

page.init();

window.addEventListener('resize', function() {
  if (page.isSelectionAreaTurnOn) {
    page.removeSelectionArea();
    page.showSelectionArea();
  }

  // Reget original width of view port if browser window resized or page zoomed.
  page.getOriginalViewPortWidth();
}, false);
