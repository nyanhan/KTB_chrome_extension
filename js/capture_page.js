var page = {
  visibleWidth: 0,
  visibleHeight: 0,
  scrollXCount: 0,
  scrollYCount: 0,
  captureWidth: 0,
  captureHeight: 0,
  fixedElements_ : [],
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

      if (page.area) {
        page.area.hide();
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
    page.area = Crop.init(document.body, {
      onselect: function(sx, sy, ex, ey){
        page.captureSelected(sx, sy, ex, ey);
      }
    });

    page.area.showAt(document.body.scrollLeft + 300, document.body.scrollTop + 200, 400, 200);
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

  captureSelected: function(sx, sy, ex, ey){

    setTimeout(function() {

      chrome.runtime.sendMessage({ message: "capture_picture" }, function(data){

        var canvas = page.createCanvas();

        var image = new Image();

        canvas.width = ex - sx;
        canvas.height = ey - sy;

        image.onload = function(){

          var ctx = canvas.getContext("2d");
          var bodyOffset = document.body.getBoundingClientRect();

          ctx.drawImage(image, document.body.scrollLeft - bodyOffset.left - sx, document.body.scrollTop - bodyOffset.top - sy);

          var dataUrl = canvas.toDataURL("image/jpeg", 0.95);

          chrome.runtime.sendMessage({ message: "capture_data", data: dataUrl, location_href: location.href });

        };

        image.src = data;
      });

    }, 200);

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
  // Reget original width of view port if browser window resized or page zoomed.
  page.getOriginalViewPortWidth();
}, false);
