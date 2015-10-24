/***
 * Copyright (c) 2015, Dan Hasting
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the organization nor the names of its
 *    contributors may be used to endorse or promote products derived from
 *    this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 *
 ***/


(function(document, window, undefined) {

/**
 * Creates a Gallerize instance. You must call start() after for anything to happen.
 *
 * @example
 * var gallery = new Gallerize({
 *     gallery: '#gallery',
 *     images: [
 *         'path/to/image/one.jpg',
 *         'path/to/image/two.jpg',
 *     ],
 * });
 *
 * @class
 * @param {Object} config The configuration object. See the Github README for a description.
 * @see {@link https://github.com/dh4/gallerize.js}
 */
window.Gallerize = function(config) {
    var self = this;

    var defaults = {
        gallery: null,
        images: null,
        links: null,
        bg_color: '#FFF',
        auto: true,
        pause: true,
        delay: 5000,
        fade: 1000,
        contain: 'none',
        thumbnails: {
            element: null,
            images: null,
            captions: null,
            buttons: true,
            button_color: '#000',
            active_color: '#000',
        },
        indicators: {
            element: null,
            color: '#999',
            acolor: '#FFF',
            round: false,
            opacity: 1,
            image: null,
            aimage: null,
        },
        text: {
            element: null,
            items: null,
        },
        prev: {
            element: null,
            text: '&#10094;',
            image: null,
        },
        next: {
            element: null,
            text: '&#10095;',
            image: null,
        },
        counter: {
            element: null,
            separator: ' of ',
        },
        loading: {
            image: null,
            all: true,
        },
    };

    // Set default values
    for (var d in defaults) self[d] = defaults[d];

    // Grab configuration values
    for (var c in config) {
        if (typeof config[c] != 'object' || config[c] instanceof Array)
            self[c] = config[c];
        else if (self[c]) {
            for (var a in config[c]) {
                self[c][a] = config[c][a];
            }
        }
    }

    // Rename thumbnails and indicators to save space
    self.th = self.thumbnails;
    self.in = self.indicators;

    self.active = false;
    self.hover = false;
    self.current = self.images.length * 10000; // High number so we will never go below 0
    self.preload = [];
    self.ratios = [];
    self.remaining = self.delay;

    // Thumbnail navigator shows 5 images, so make sure we have enough in the rotation
    // that user never sees a blank thumbnail
    var iterations_array = {4:3, 3:4, 2:5, 1:10};
    if (iterations_array[self.images.length])
        self.th.iterations = iterations_array[self.images.length];
    else
        self.th.iterations = (self.images.length > 10) ? 1 : 2;

    /**
     * $ is a helper function to shorten document.querySelector.
     *
     * @param {string} e The selector of the element to fetch.
     * @returns {Object} The element if found or null.
     */
    var $ = function(e) {
        return document.querySelector(e);
    };

    /**
     * $$ is a helper function to create elements.
     *
     * @param {string} e The element to create. Usually 'div'.
     * @param {Object} attr An object of attributes to set on the element.
     * @returns {Object} The created element.
     */
    var $$ = function(e, attr) {
        var element = document.createElement(e);
        for (var a in attr) element.setAttribute(a, attr[a]);
        return element;
    };

    /**
     * Initializes the gallery and navigation elements and starts the rotation timer.
     *
     * @example <caption>Should be called after the DOM has loaded:</caption>
     * var gallery = new Gallerize(config);
     * document.addEventListener('DOMContentLoaded', function() {
     *     gallery.start();
     * });
     *
     * @memberof window.Gallerize
     */
    var start = function() {
        checkIssues();

        // Don't allow user to interact until first image loads
        self.active = true;

        // Compute size of thumbnails and indicators from their parent elements
        if (self.th.element) computeThumbSize();
        if (!self.th.element && self.in.element) computeIndicatorSize();

        // Setup everything
        insertCSS();
        createGallery();
        if (self.th.element) createThumbnailNavigator();
        if (!self.th.element && self.in.element) createIndicatorNavigator();
        if (self.prev.element) createButton('prev', false);
        if (self.next.element) createButton('next', false);
        if (self.text.items && self.text.element) createText();
        updateCounter();

        // Wait for first image to load
        loadImage(0, function() {
            setGallery();
            self.active = false;
            startTimer();
            loadImage(1);
        });

        // Listen for window resizing. Nav elements need to be adjusted after
        var resize_timeout = false;
        window.addEventListener('resize', function() {
            if (resize_timeout) clearTimeout(resize_timeout);
            resize_timeout = setTimeout(function() {
                setBackground('#gz_animator');

                if (self.th.element) {
                    computeThumbSize();
                    $('#gz_th_nav_wrapper').remove();
                    createThumbnailNavigator();
                }

                if (!self.th.element && self.in.element) {
                    computeIndicatorSize();
                    $('#gz_indicator_wrapper').remove();
                    createIndicatorNavigator();
                }

                if (self.prev.element) {
                    $('#gz_prev').remove();
                    createButton('prev', false);
                }

                if (self.next.element) {
                    $('#gz_next').remove();
                    createButton('next', false);
                }
            }, 50);
        });

        // Pause timeout if mouse enters gallery, and resume once mouse leaves
        if (self.auto && self.pause) {
            $(self.gallery).addEventListener('mouseover', function() {
                self.hover = true;
                self.remaining -= new Date() - self.timeoutStart;
                clearTimeout(self.timeout);
            });
            $(self.gallery).addEventListener('mouseout', function() {
                self.hover = false;
                startTimer(self.remaining);
            });
        }
    };

    /**
     * Checks the configuration object and elements specified for issues or errors.
     */
    var checkIssues = function() {
        // Show errors for missing required configuration options
        if (self.gallery === null)    issue('gallery', 'missing');
        if (self.images === null)     issue('images', 'missing');

        // Check that other configuration arrays have same length as images array
        if (self.th.images && self.images.length != self.th.images.length)
            issue('thumbnails.images', 'count');
        if (self.links && self.images.length != self.links.length)
            issue('links', 'count');
        if (self.th.captions && self.images.length != self.th.captions.length)
            issue('thumbnails.captions', 'count');

        // Check that elements exist
        if ($(self.gallery).length === 0) issue('gallery', 'exists');
        var elements = ['thumbnails', 'indicators', 'counter', 'prev', 'next', 'text'];
        for (var i = 0; i < elements.length; i++) {
            var e = elements[i];
            if (self[e] && self[e].element && $(self[e].element).length === 0) issue(e+':exists');
        }

        // Check that gallery and thumbnail elements have a height and width greater than zero
        if ($(self.gallery).clientHeight === 0 || $(self.gallery).clientWidth === 0)
            issue('gallery', 'size');
        if (self.th.element && ($(self.th.element).clientHeight === 0 ||
            $(self.th.element).clientWidth === 0)
           )
            issue('thumbnails', 'size');
        if (self.in.element && ($(self.in.element).clientHeight === 0))
            issue('indicators', 'size');
    };

    /**
     * Calculates the size and position of thumbnails based on the thumbnail element.
     */
    var computeThumbSize = function() {
        var e = $(self.th.element);

        // Calculate thumbnail size and padding based on how large the thumbnail element is
        self.th.hpadding = Math.round(e.clientWidth * 0.015);
        self.th.vpadding = Math.round(e.clientWidth * 0.01);

        self.th.height = Math.round(e.clientHeight - (self.th.vpadding * 2));

        // Calculate button size
        self.button_size = (self.th.height > 60) ? 30 : (self.th.height > 50) ? 25 : 20;

        self.th.wrapper_width = e.clientWidth - (self.th.hpadding * 2);
        if (self.th.buttons) self.th.wrapper_width = self.th.wrapper_width - self.button_size * 2;
        self.th.width = Math.round((self.th.wrapper_width - (self.th.hpadding * 4)) / 5);
        self.th.wrapper_padding = (e.clientHeight - self.th.height) / 2;

        // Calculate position of thumbnails
        self.th.offset = self.th.width + self.th.hpadding;
        self.th.most_left = 3 * self.th.offset * -1;
        self.th.most_right = (self.images.length * self.th.iterations - 3) * self.th.offset;
        self.th.wrap = Math.abs(self.th.most_left) + self.th.most_right;
    };

    /**
     * Calculates the size of indicators based on the indicator element.
     */
    var computeIndicatorSize = function() {
        var e = $(self.in.element);

        // Calculate indicator size and padding based on how large the indicator element is
        self.in.size = Math.round(e.clientHeight * 0.5);
        self.in.hpadding = Math.round((e.clientHeight - self.in.size) / 4);
        self.in.vpadding = Math.round((e.clientHeight - self.in.size) / 2);

        // Setup background variables
        self.in.bg = (self.in.image) ?
            'url("'+self.in.image+'") no-repeat 50% 50%' : self.in.color;
        self.in.active_bg = (self.in.aimage) ?
            'url("'+self.in.aimage+'") no-repeat 50% 50%' : self.in.acolor;
    };

    /**
     * Starts the countdown until the gallery rotates
     *
     * @param {number} delay The time in milliseconds to count down.
     */
    var startTimer = function(delay) {
        if (self.auto) {
            clearTimeout(self.timeout);
            self.timeoutStart = new Date();
            self.timeout = setTimeout(function(){changeImage(1);}, (delay) ? delay : self.delay);
        }
    };

    /**
     * Displays a message to the Javascript console.
     *
     * @param {string} value Value to display in message.
     * @param {string} reason Reason for the message. 'missing', 'exists', 'count', or 'size'
     */
    var issue = function(value, reason) {
        switch (reason) {
            case 'missing':
                console.error("gallerize.js: '%s' is missing from the configuration. "+
                              "Please add it.", value);
                break;
            case 'exists':
                console.error("gallerize.js: %s element does not exist. ", value);
                break;
            case 'count':
                console.warn("gallerize.js: Number of %s does not equal number of "+
                             "images. This will cause unintended consequences.", value);
                break;
            case 'size':
                console.warn("gallerize.js: %s element has a height or width of 0. "+
                             "This will cause nothing to show.", value);
                break;
        }
    };

    /**
     * Inserts the CSS rules into the DOM so we don't have to distribute a static CSS file.
     */
    var insertCSS = function() {
        var style = $$('style', {type: 'text/css'});
        style.innerHTML =
            "#gz_wrapper {position:relative;width:100%;height:100%;}"+
            "#gz_click {z-index:93;display:block;position:absolute;width:100%;height:100%;}"+
            "#gz_animator {z-index:95;position:absolute;width:100%;height:100%;}"+
            "#gz_background {z-index:94;position:absolute;width:100%;height:100%;}"+
            "#gz_loading {z-index:96;position:absolute;width:100%;height:100%;opacity:0;"+
                "background:"+self.bg_color+" url("+self.loading.image+") no-repeat 50% 50%;}"+
            ".gz_cover {background-size:cover !important;}"+
            ".gz_contain {background-size:contain !important;}"+
            "#gz_th_nav_wrapper {position:absolute;right:50%;}"+
            "#gz_thumbnails {z-index:97;position:relative;left:50%;}"+
            "#gz_prev, #gz_next {z-index:97;color:#FFF;}"+
            "#gz_th_nav_prev, #gz_th_nav_next {float:left;color:#000;}"+
            ".gz_button {position:relative;cursor:pointer;text-align:center;}"+
            ".gz_button > div {height:100%;width:100%;}"+
            "#gz_th_nav_thumbs {position:relative;float:left;overflow:hidden;}"+
            ".gz_th_nav_action {z-index:99;position:absolute;cursor:pointer;}"+
            ".gz_th_nav_thumb {z-index:98;position:absolute;top:0;overflow:hidden;}"+
            ".gz_thumb_transition {transition:left "+self.fade+"ms;}"+
            ".gz_thumb_caption {z-index:98;position:absolute;bottom:0px;width:100%;color:#FFF;"+
                "font-weight:bold;background:#000;background:rgba(0,0,0,0.7);text-align:center;}"+
            ".gz_thumb_border {z-index:99;position:absolute;opacity:0;"+
                "border:1px solid "+self.th.active_color+";}"+
            ".gz_thumb_image {background-size: cover;}"+
            "#gz_indicator_wrapper {z-index:97;position:relative;}"+
            ".gz_indicator {float:left;cursor:pointer;background-size:contain !important;"+
                "opacity:"+self.in.opacity+";}"+
            ".fadeIn {opacity:1 !important;transition:opacity "+self.fade+"ms;}"+
            ".fadeOut {opacity:0 !important;transition:opacity "+self.fade+"ms;}"+
            ".fadeInHalf {opacity:0.5 !important;transition:opacity "+self.fade+"ms;}"+
            ".fadeInQuick {opacity:1 !important;transition:opacity "+(self.fade / 2)+"ms;}"+
            ".fadeOutQuick {opacity:0 !important;transition:opacity "+(self.fade / 2)+"ms;}";
        for (var i = 0; i < self.images.length; i++) {
            style.innerHTML += ".image_"+i+" {background:"+self.bg_color+
                               " url("+getImage(i)+") no-repeat 50% 50%;}";
        }
        document.head.appendChild(style);
    };

    /**
     * Initializes the gallery element.
     *
     * @example <caption>DOM nodes:</caption>
     *  <(self.gallery)>
     *      <div id="gz_wrapper">
     *          <a id="gz_click"></a>
     *          <div id="gz_animator"></div>
     *          <div id="gz_background"></div>
     *          <div id="gz_loading"></div>
     *      </div>
     *  </(self.gallery)>
     */
    var createGallery = function() {
        var wrapper = $$('div', {id: 'gz_wrapper'});
        $(self.gallery).appendChild(wrapper);
        wrapper.appendChild($$('a',   {id: 'gz_click'}));
        wrapper.appendChild($$('div', {id: 'gz_animator'}));
        wrapper.appendChild($$('div', {id: 'gz_background'}));

        if (self.loading.image) {
            var loading = $$('div', {id: 'gz_loading'});
            setTimeout(function() {loading.classList.add('fadeIn');}, 1000);
            wrapper.appendChild(loading);
        }
    };

    /**
     * Preloads the first image.
     */
    var setGallery = function() {
        setBackground('#gz_animator');
        setBackground('#gz_background');
        if (self.links) setLink();
    };

    /**
     * Creates the initializes the text element.
     *
     * @example <caption>DOM nodes:</caption>
     *  <(self.text.element)>
     *      <div id="gz_text_inner"></div>
     *  </(self.text.element)>
     */
    var createText = function() {
        // Hide text element. We will display it when the first image loads.
        if (self.loading.image) $(self.text.element).style.visibility = 'hidden';

        $(self.text.element).appendChild($$('div', {id: 'gz_text_inner'}));
        $('#gz_text_inner').innerHTML = self.text.items[getCurrent()];
    };

    /**
     * Initializes the thumbnail navigation element.
     *
     * @example <caption>DOM nodes:</caption>
     *  <(self.th.element)>
     *      <div id="gz_thumbnails">
     *
     *          (if self.th.buttons)
     *          <div id="gz_th_nav_prev" class="gz_button" ></div>
     *          (endif)
     *
     *          <div id="gz_th_nav_thumbs">
     *              <div class="gz_th_nav_action"></div>
     *              <div class="gz_th_nav_action"></div>
     *              <div id="gz_th_nav_current" class="gz_th_nav_action"></div>
     *              <div class="gz_th_nav_action"></div>
     *              <div class="gz_th_nav_action"></div>
     *
     *              (for self.images.length * self.th.iterations)
     *              <div id="gz_thumb_(number)" class="gz_th_nav_thumb">
     *                  <div class="gz_thumb_caption"></div>
     *                  <div class="gz_thumb_border></div>
     *                  <div class="gz_thumb_image"></div>
     *              </div>
     *              (endfor)
     *
     *          </div>
     *
     *          (if self.th.buttons)
     *          <div id="gz_th_nav_prev" class="gz_button" ></div>
     *          (endif)
     *
     *      </div>
     *  </(self.th.element)>
     */
    var createThumbnailNavigator = function() {
        $(self.th.element).appendChild($$('div', {id: 'gz_th_nav_wrapper'}));
        var wrapper_style = 'height:'+self.th.height+'px;'+
                            'width:'+$(self.th.element).clientWidth+'px;'+
                            'padding:'+self.th.wrapper_padding+'px 0;';
        $('#gz_th_nav_wrapper').appendChild($$('div', {id: 'gz_thumbnails', style: wrapper_style}));

        // Create previous button
        if (self.th.buttons) createButton('prev', true);

        var thumbs_style = 'height:'+$(self.th.element).clientHeight+'px;'+
                           'width:'+self.th.wrapper_width+'px;'+
                           'margin:0 '+self.th.hpadding+'px;';
        $('#gz_thumbnails').appendChild($$('div', {id: 'gz_th_nav_thumbs', style: thumbs_style}));

        // Create clickable placeholders. The thumbnail images will move under these.
        var i, position, attr;
        for (i = -2; i <= 2; i++) {
            var width  = (i === 0) ? self.th.width - 2  : self.th.width;
            var height = (i === 0) ? self.th.height - 2 : self.th.height;

            position = self.th.offset * (i + 2);
            attr = {
                class: 'gz_th_nav_action',
                'data-offset': i,
                style: 'left:'+position+'px;'+
                       'height:'+height+'px;'+
                       'width:'+width+'px;',
            };
            if (i === 0) attr.id = 'gz_th_nav_current';
            $('#gz_th_nav_thumbs').appendChild($$('div', attr));
        }

        [].forEach.call(document.querySelectorAll('.gz_th_nav_action'), function(e) {
            e.addEventListener('click', function() {
                changeImage(e.getAttribute('data-offset'));
            });
        });

        // Create thumbnail images
        for (i = 0; i < self.images.length * self.th.iterations; i++) {
            // Need to account for the fact the first image is the 6th (including hidden)
            // shown in the thumbnail rotator
            var adjust = i - 5 + self.current;

            position = self.th.offset * (i - 3);
            attr = {
                id: 'gz_thumb_'+i,
                class: 'gz_th_nav_thumb',
                style: 'left:'+position+'px;'+
                       'height:'+self.th.height+'px;'+
                       'width:'+self.th.width+'px;',
            };
            $('#gz_th_nav_thumbs').appendChild($$('div', attr));

            if (self.th.captions) {
                var caption_size  = (self.th.height > 80) ? [18, 11] :
                                    (self.th.height > 60) ? [15, 10] :
                                    (self.th.height > 50) ? [12,  9] :
                                                            [10,  8] ;
                var caption_attr = {
                    class: 'gz_thumb_caption',
                    style: 'line-height:'+caption_size[0]+'px;'+
                           'font-size:'+caption_size[1]+'px;'
                };
                $('#gz_thumb_'+i).appendChild($$('div', caption_attr));
                var caption = self.th.captions[adjust % self.images.length];
                $('#gz_thumb_'+i+' .gz_thumb_caption').innerHTML = caption;
            }

            var border_style = 'height:'+(self.th.height-2)+'px;'+
                               'width:'+(self.th.width-2)+'px;';
            var border_class = 'gz_thumb_border';
            if (i == 5) border_class += ' fadeIn';
            $('#gz_thumb_'+i).appendChild($$('div', {class: border_class, style: border_style}));

            var thumb = getThumbImage(adjust);
            var thumb_style = 'background: '+self.bg_color+' url('+thumb+') no-repeat 50% 50%;'+
                              'height:'+self.th.height+'px;'+
                              'width:'+self.th.width+'px;';
            $('#gz_thumb_'+i).appendChild($$('div', {class: 'gz_thumb_image', style: thumb_style}));
        }

        // Create next button
        if (self.th.buttons) createButton('next', true);
    };

    /**
     * Initializes the indicator navigation element.
     *
     * @example <caption>DOM nodes:</caption>
     *  <(self.in.element)>
     *      <div id="gz_indicator_wrapper">
     *
     *          (for self.images.length)
     *          <div id="gz_indicator_(number)" class="gz_indicator"></div>
     *          (endfor)
     *
     *      </div>
     *  </(self.in.element)>
     */
    var createIndicatorNavigator = function() {
        $(self.in.element).appendChild($$('div', {id: 'gz_indicator_wrapper'}));

        var handler = function() {
            changeImage(this.getAttribute('data-image') - getCurrent());
        };

        for (var i = 0; i < self.images.length; i++) {
            var attr = {
                id: 'gz_indicator_'+i,
                class: 'gz_indicator',
                'data-image': i,
                style: 'width:'+self.in.size+'px;'+
                       'height:'+self.in.size+'px;'+
                       'margin:'+self.in.vpadding+'px '+self.in.hpadding+'px;'+
                       'background:'+self.in.bg+';'
            };
            if (self.in.round) attr.style += 'border-radius:'+self.in.size+'px;';

            $('#gz_indicator_wrapper').appendChild($$('div', attr));

            $('#gz_indicator_'+i).addEventListener('click', handler);

            if (i == getCurrent()) {
                $('#gz_indicator_'+i).style.background = self.in.active_bg;
                $('#gz_indicator_'+i).style.opacity = 1;
            }
        }
    };

    /**
     * Creates the 'prev' and 'next' buttons.
     *
     * @example <caption>DOM nodes:</caption>
     *  <(self.(button).element)>
     *      <div id="gz_(button)" class="gz_button"></div>
     *  </(self.(button).element)>
     *
     * @param {string} button The button to create: 'prev' or 'next'.
     * @param {boolean} nav Whether button appears in thumbnail nav or in free-standing element.
     */
    var createButton = function(button, nav) {
        var image = (button == 'prev') ? self.prev.image : self.next.image;
        var parent, element, button_style;

        if (nav) {
            parent = $('#gz_thumbnails');
            element = 'gz_th_nav_'+button;
            button_style = 'line-height:'+(self.th.height-6)+'px;'+
                           'height:'+self.th.height+'px;'+
                           'width:'+self.button_size+'px;'+
                           'font-size:'+self.button_size+'px;'+
                           'color:'+self.th.button_color+';';
        } else {
            parent = $((button == 'prev') ? self.prev.element : self.next.element);
            element = 'gz_'+button;
            button_style = 'line-height:'+(parent.clientHeight-6)+'px;'+
                           'height:'+parent.clientHeight+'px;'+
                           'width:'+parent.clientWidth+'px;';
        }

        parent.appendChild($$('div', {id: element, class: 'gz_button', style: button_style}));

        if (image) {
            var button_img_style = 'background: url('+image+') no-repeat 50% 50%;'+
                                   'background-size: contain;';
            $('#'+element).appendChild($$('div', {style: button_img_style}));
        } else {
            $('#'+element).innerHTML = (button == 'prev') ? self.prev.text : self.next.text;
        }

        $('#'+element).addEventListener('click', function() {
            changeImage((button == 'prev') ? -1 : 1);
        });
    };

    /**
     * Updates the counter element with the current position
     */
    var updateCounter = function() {
        if (self.counter.element) {
            var text = (getCurrent() + 1)+
                       self.counter.separator+self.images.length;
            $(self.counter.element).innerHTML = text;
        }
    };

    /**
     * Returns the index of the current image showing.
     *
     * @returns {number}
     */
    var getCurrent = function() {
        return self.current % self.images.length;
    };

    /**
     * Returns a given image from the image array.
     *
     * @param {number} image Image to fetch, defaults to self.current.
     * @returns {string} The path to the image.
     */
    var getImage = function(image) {
        if (!image) image = self.current;
        return self.images[image % self.images.length];
    };

    /**
     * Returns a given thumbnail image if provided, or the full image.
     *
     * @param {number} image Image to fetch, defaults to self.current.
     * @returns {string} The path to the thumbnail image.
     */
    var getThumbImage = function(image) {
        if (!image) image = self.current;
        if (self.th.images)
            return self.th.images[image % self.images.length];
        else
            return self.images[image % self.images.length];
    };

    /**
     * Loads an image if it hasn't been loaded, then calls the onload function.
     *
     * @param {number} offset The offset from the current image to preload.
     * @param {function} onload A function to call after image has loaded.
     */
    var loadImage = function(offset, onload) {
        var imgSrc = getImage(self.current + parseInt(offset));

        // function to hide '#gz_loading' and call onload()
        var hideLoading = function() {
            var loading = $('#gz_loading');
            if (loading) {
                clearTimeout(self.loading_timeout);
                loading.style['z-index'] = 0;
                loading.classList.remove('fadeIn');
            }
            if (onload) onload();
        };

        // Check if image has already been loaded
        if (self.preload.indexOf(imgSrc) == -1) {
            var image = new Image();
            image.src = imgSrc;
            image.onload = function() {
                self.preload.push(imgSrc);
                self.ratios[self.images.indexOf(imgSrc)] = this.width / this.height;
                if (self.text.element) $(self.text.element).style.visibility = 'visible';
                hideLoading();
            };
            image.onerror = function() {
                if (onload) onload();
                console.error("gallerize.js: '%s' not found.", imgSrc);
            };
        } else {
            hideLoading();
        }
    };

    /**
     * Sets the css background property and cover/contain class
     * for the given element.
     *
     * @param {string} e The element to modify. '#gz_animator' or '#gz_background'.
     */
    var setBackground = function(e) {
        for (var i = 0; i < self.images.length; i++) $(e).classList.remove('image_'+i);
        $(e).classList.add('image_'+getCurrent());

        var ratio = self.ratios[getCurrent()];
        var parent_ratio = $(self.gallery).clientWidth / $(self.gallery).clientHeight;

        if (self.contain == 'all' ||
            (self.contain == 'landscape' && ratio > 1) ||
            (self.contain == 'portrait' && ratio <= 1) ||
            (self.contain == 'parent' && ratio > 1 && parent_ratio <= 1) ||
            (self.contain == 'parent' && ratio <= 1 && parent_ratio > 1)
           ) {
            $(e).classList.remove('gz_cover');
            $(e).classList.add('gz_contain');
        } else {
            $(e).classList.remove('gz_contain');
            $(e).classList.add('gz_cover');
        }
    };

    /**
     * Attaches a URL to the '#gz_click' element above the image.
     */
    var setLink = function() {
        var click = $('#gz_click');
        var link = self.links[getCurrent()];
        if (link) {
            click.style.cursor = 'pointer';
            click.style['z-index'] = 96;
            click.href = link;
        } else {
            click.style.cursor = 'default';
            click.style['z-index'] = 93;
            click.href = '#';
        }
    };

    /**
     * Adjusts the position of thumbnails by the given offset.
     *
     * @param {number} offset The offset to adjust the thumbnail elements by.
     */
    var adjustThumbs = function(offset) {
        [].forEach.call(document.querySelectorAll('.gz_th_nav_thumb'), function(e) {
            var origin = parseInt(e.style.left.replace('px', ''));
            var destination = origin + (self.th.offset * offset * -1);
            var position;

            if (destination < self.th.most_left) {
                position = destination + self.th.wrap;
                e.classList.remove('gz_thumb_transition');
                e.style.left = position+'px';
            } else if (destination > self.th.most_right) {
                position = destination - self.th.wrap;
                e.classList.remove('gz_thumb_transition');
                e.style.left = position+'px';
            } else {
                e.classList.add('gz_thumb_transition');
                e.style.left = destination+'px';
            }

            var border = e.querySelector('.gz_thumb_border');
            if (destination == self.th.offset * 2) {
                border.classList.remove('fadeOut');
                border.classList.add('fadeIn');
            } else if (origin == self.th.offset * 2) {
                border.classList.remove('fadeIn');
                border.classList.add('fadeOut');
            }
        });
    };

    /**
     * Updates the indicator navigation
     */
    var updateIndicators = function() {
        [].forEach.call(document.querySelectorAll('.gz_indicator'), function(e) {
            e.style.background = self.in.bg;
            e.style.opacity = self.in.opacity;
        });
        var current = $('#gz_indicator_'+getCurrent());
        current.style.background = self.in.active_bg;
        current.style.opacity = 1;
    };

    /**
     * Where the real action occurs. This animates the transition.
     *
     * @example <caption>Can also be accessed publicly to bind to events. If using the
     * thumbnail nav, it's best not to go beyond a range of -2 to 2:</caption>
     * var gallery = new Gallerize(config);
     * document.querySelector('#random_element').addEventListener('click', function() {
     *     gallery.changeImage(1);
     * });
     *
     * @memberof window.Gallerize
     * @param {number} offset The image offset to adjust to. Positive for forward in the
     *            image array and negative for backwards.
     */
    var changeImage = function(offset) {
        offset = parseInt(offset);
        offset = offset || 0;

        // Don't allow image to change if animation is occuring or no offset
        if (self.active || offset === 0) return;

        self.active = true;
        self.current = self.current + offset;

        if (self.loading.image && self.loading.all) {
            var loading = $('#gz_loading');
            loading.classList.remove('fadeInHalf');
            self.loading_timeout = setTimeout(function() {
                loading.style['z-index'] = 96;
                loading.classList.add('fadeInHalf');
            }, 500);
        }

        loadImage(0, function() {
            if (self.auto) clearTimeout(self.timeout);

            // Animate gallery
            setBackground('#gz_background');
            $('#gz_animator').classList.add('fadeOut');
            setTimeout(function() {
                setBackground('#gz_animator');
                $('#gz_animator').classList.remove('fadeOut');
                updateCounter();
                if (self.links) setLink();
                self.active = false;
                self.remaining = self.delay;
                if (!self.hover) startTimer();
                loadImage(1);
            }, self.fade + 100);

            // Update thumbnails and indicators if they are showing
            if (self.th.element) adjustThumbs(offset);
            if (!self.th.element && self.in.element) updateIndicators();

            // Animate text
            if (self.text.items && self.text.element) {
                var text = $('#gz_text_inner');
                var animateText = function() {
                    text.innerHTML = self.text.items[getCurrent()];
                    text.classList.remove('fadeOutQuick');
                    text.classList.add('fadeInQuick');
                };
                text.classList.add('fadeOutQuick');
                setTimeout(animateText, self.fade / 2);
            }
        });
    };

    /**
     * Switches to a specific image rather than by an offset. It's best not to use this
     * with the thumbnail nav unless you have a small number of image (<= 4).
     *
     * @example <caption>Switching to the third image in the images array:</caption>
     * var gallery = new Gallerize(config);
     * document.querySelector('#random_element').addEventListener('click', function() {
     *     gallery.changeToImage(3);
     * });
     *
     * @memberof window.Gallerize
     * @param {number} index The image to switch to.
     */
    var changeToImage = function(index) {
        if (index < 1) index = 1;
        if (index > self.images.length + 1) index = self.images.length + 1;

        changeImage(index - 1 - getCurrent());
    };

    // Return public methods
    return {
        start: start,
        changeImage: changeImage,
        changeToImage: changeToImage,
    };
};

})(document, window);
