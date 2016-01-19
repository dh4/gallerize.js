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
 * $ is a helper function to shorten document.querySelector.
 *
 * @function $
 * @param {string} selector The element to fetch.
 * @param {string} context The element to query.
 * @returns {Object} The element if found or null.
 */
var $ = function(selector, context) {
    context = (context) ? $(context) : document;
    return context.querySelector(selector);
};

/**
 * $$ is a helper function to create elements.
 *
 * @function $$
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
            hpadding: 0.125,
            vpadding: 0.125,
        },
        indicators: {
            element: null,
            color: '#999',
            acolor: '#FFF',
            round: false,
            opacity: 1,
            image: null,
            aimage: null,
            size: 0.5,
            padding: 0.25,
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

    // Create shortcuts
    self.th = self.thumbnails;
    self.in = self.indicators;
    self.g = self.gallery;
    var elements = [self.th, self.in, self.prev, self.next, self.text];
    for (var e in elements) elements[e].e = elements[e].element;

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
        if (self.th.e) computeThumbSize();
        if (!self.th.e && self.in.e) computeIndicatorSize();

        // Setup everything
        insertCSS();
        createGallery();
        if (self.th.e) createThumbnailNavigator();
        if (!self.th.e && self.in.e) createIndicatorNavigator();
        if (self.prev.e) createButton('prev', false);
        if (self.next.e) createButton('next', false);
        if (self.text.items && self.text.e) createText();
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
                setBackground('.gz_animator');

                if (self.th.e) {
                    computeThumbSize();
                    $('.gz_th_nav_wrapper', self.th.e).remove();
                    createThumbnailNavigator();
                }

                if (!self.th.e && self.in.e) {
                    computeIndicatorSize();
                    $('.gz_indicator_wrapper', self.in.e).remove();
                    createIndicatorNavigator();
                }

                if (self.prev.e) {
                    $('.gz_prev', self.prev.e).remove();
                    createButton('prev', false);
                }

                if (self.next.e) {
                    $('.gz_next', self.next.e).remove();
                    createButton('next', false);
                }
            }, 50);
        });

        // Pause timeout if mouse enters gallery, and resume once mouse leaves
        if (self.auto && self.pause) {
            $(self.g).addEventListener('mouseover', function() {
                self.hover = true;
                self.remaining -= new Date() - self.timeoutStart;
                clearTimeout(self.timeout);
            });
            $(self.g).addEventListener('mouseout', function() {
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
        if (self.g === null)        issue('gallery', 'missing');
        if (self.images === null)   issue('images', 'missing');

        // Check that other configuration arrays have same length as images array
        if (self.th.images && self.images.length != self.th.images.length)
            issue('thumbnails.images', 'count');
        if (self.links && self.images.length != self.links.length)
            issue('links', 'count');
        if (self.th.captions && self.images.length != self.th.captions.length)
            issue('thumbnails.captions', 'count');

        // Check that elements exist
        if ($(self.g).length === 0) issue('gallery', 'exists');
        var elements = ['thumbnails', 'indicators', 'counter', 'prev', 'next', 'text'];
        for (var i = 0; i < elements.length; i++) {
            var e = elements[i];
            if (self[e] && self[e].e && $(self[e].e).length === 0) issue(e+':exists');
        }

        // Check that gallery and thumbnail elements have a height and width greater than zero
        if ($(self.g).clientHeight === 0 || $(self.g).clientWidth === 0)
            issue('gallery', 'size');
        if (self.th.e && ($(self.th.e).clientHeight === 0 || $(self.th.e).clientWidth === 0))
            issue('thumbnails', 'size');
        if (self.in.e && ($(self.in.e).clientHeight === 0))
            issue('indicators', 'size');
    };

    /**
     * Calculates the size and position of thumbnails based on the thumbnail element.
     */
    var computeThumbSize = function() {
        var e = $(self.th.e);

        self.th.height = Math.round(e.clientHeight * (1 - self.th.vpadding));

        // Calculate button size
        self.button_size = (self.th.height > 60) ? 30 : (self.th.height > 50) ? 25 : 20;

        var wrapper_width = e.clientWidth;
        if (self.th.buttons) wrapper_width = wrapper_width - self.button_size * 2;
        var th_width = wrapper_width / 5;

        self.th.padding = Math.round((th_width - th_width * (1 - self.th.hpadding / 2)) * (6 / 5));
        self.th.wrapper_width = wrapper_width - (self.th.padding * 2);
        self.th.width = Math.round((self.th.wrapper_width - (self.th.padding * 4)) / 5);
        self.th.wrapper_vpadding = (e.clientHeight - self.th.height) / 2;

        // Calculate position of thumbnails
        self.th.offset = self.th.width + self.th.padding;
        self.th.most_left = 3 * self.th.offset * -1;
        self.th.most_right = (self.images.length * self.th.iterations - 3) * self.th.offset;
        self.th.wrap = Math.abs(self.th.most_left) + self.th.most_right;
    };

    /**
     * Calculates the size of indicators based on the indicator element.
     */
    var computeIndicatorSize = function() {
        var e = $(self.in.e);

        // Calculate indicator size and padding based on how large the indicator element is
        self.in.size_px = Math.round(e.clientHeight * self.in.size);
        self.in.hpadding = Math.round(self.in.size_px * self.in.padding);
        self.in.vpadding = Math.round((e.clientHeight - self.in.size_px) / 2);

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
            ".gz_wrapper {position:relative;width:100%;height:100%;}"+
            ".gz_click {z-index:90;display:block;position:absolute;width:100%;height:100%;}"+
            ".gz_animator {z-index:92;position:absolute;width:100%;height:100%;}"+
            ".gz_background {z-index:91;position:absolute;width:100%;height:100%;}"+
            self.g+" .gz_loading {z-index:100;position:absolute;width:100%;height:100%;"+
                "opacity:0;background:"+self.bg_color+" url("+self.loading.image+") "+
                "no-repeat 50% 50%;}"+
            ".gz_cover {background-size:cover !important;}"+
            ".gz_contain {background-size:contain !important;}"+
            ".gz_prev, .gz_next {z-index:94;color:#FFF;}"+
            ".gz_button {position:relative;cursor:pointer;text-align:center;}"+
            ".gz_button > div {height:100%;width:100%;}"+
            self.g+" .fadeIn {opacity:1 !important;transition:opacity "+self.fade+"ms;}"+
            self.g+" .fadeOut {opacity:0 !important;transition:opacity "+self.fade+"ms;}"+
            self.g+" .fadeInHalf{opacity:0.5 !important;transition:opacity "+self.fade+"ms;}";

        for (var i = 0; i < self.images.length; i++) {
            style.innerHTML += self.g+" .image_"+i+" {background:"+self.bg_color+
                               " url("+getImage(i)+") no-repeat 50% 50%;}";
        }

        if (self.th.e) {
            style.innerHTML +=
                ".gz_th_nav_wrapper {position:absolute;right:50%;}"+
                ".gz_thumbnails {z-index:94;position:relative;left:50%;}"+
                ".gz_th_nav_prev, .gz_th_nav_next {float:left;color:#000;}"+
                ".gz_th_nav_thumbs {position:relative;float:left;overflow:hidden;}"+
                ".gz_th_nav_action {z-index:96;position:absolute;cursor:pointer;}"+
                ".gz_th_nav_thumb {z-index:95;position:absolute;top:0;overflow:hidden;}"+
                self.th.e+" .gz_thumb_transition {transition:left "+self.fade+"ms;}"+
                ".gz_thumb_caption {z-index:95;position:absolute;bottom:0px;width:100%;color:#FFF;"+
                    "font-weight:bold;background:#000;background:rgba(0,0,0,0.7);"+
                    "text-align:center;}"+
                self.th.e+" .gz_thumb_border {z-index:96;position:absolute;opacity:0;"+
                    "border:1px solid "+self.th.active_color+";}"+
                ".gz_thumb_image {background-size:cover !important;}"+
                self.th.e+" .fadeIn {opacity:1 !important;transition:opacity "+self.fade+"ms;}"+
                self.th.e+" .fadeOut {opacity:0 !important;transition:opacity "+self.fade+"ms;}";
        }
        if (self.in.e) {
            style.innerHTML +=
                ".gz_indicator_wrapper {z-index:95;position:relative;}"+
                self.in.e+" .gz_indicator {float:left;cursor:pointer;"+
                    "background-size:contain !important;opacity:"+self.in.opacity+";}";
        }
        if (self.text.e) {
            style.innerHTML +=
                self.text.e+" .fadeInQuick {opacity:1 !important;transition:opacity "+
                    (self.fade / 2)+"ms;}"+
                self.text.e+" .fadeOutQuick {opacity:0 !important;transition:opacity "+
                    (self.fade / 2)+"ms;}";
        }

        document.head.appendChild(style);
    };

    /**
     * Initializes the gallery element.
     *
     * @example <caption>DOM nodes:</caption>
     *  <(self.gallery)>
     *      <div class="gz_wrapper">
     *          <a class="gz_click"></a>
     *          <div class="gz_animator"></div>
     *          <div class="gz_background"></div>
     *          <div class="gz_loading"></div>
     *      </div>
     *  </(self.gallery)>
     */
    var createGallery = function() {
        var wrapper = $$('div', {class: 'gz_wrapper'});
        $(self.g).appendChild(wrapper);
        wrapper.appendChild($$('a',   {class: 'gz_click'}));
        wrapper.appendChild($$('div', {class: 'gz_animator'}));
        wrapper.appendChild($$('div', {class: 'gz_background'}));

        if (self.loading.image) {
            var loading = $$('div', {class: 'gz_loading'});
            setTimeout(function() {loading.classList.add('fadeIn');}, 1000);
            wrapper.appendChild(loading);
        }
    };

    /**
     * Preloads the first image.
     */
    var setGallery = function() {
        setBackground('.gz_animator');
        setBackground('.gz_background');
        if (self.links) setLink();
    };

    /**
     * Creates the initializes the text element.
     *
     * @example <caption>DOM nodes:</caption>
     *  <(self.text.element)>
     *      <div class="gz_text_inner"></div>
     *  </(self.text.element)>
     */
    var createText = function() {
        // Hide text element. We will display it when the first image loads.
        if (self.loading.image) $(self.text.e).style.visibility = 'hidden';

        $(self.text.e).appendChild($$('div', {class: 'gz_text_inner'}));
        $('.gz_text_inner', self.text.e).innerHTML = self.text.items[getCurrent()];
    };

    /**
     * Initializes the thumbnail navigation element.
     *
     * @example <caption>DOM nodes:</caption>
     *  <(self.thumbnails.element)>
     *      <div class="gz_thumbnails">
     *
     *          (if self.thumbnails.buttons)
     *          <div class="gz_th_nav_prev gz_button" ></div>
     *          (endif)
     *
     *          <div class="gz_th_nav_thumbs">
     *              <div class="gz_th_nav_action"></div>
     *              <div class="gz_th_nav_action"></div>
     *              <div class="gz_th_nav_current gz_th_nav_action"></div>
     *              <div class="gz_th_nav_action"></div>
     *              <div class="gz_th_nav_action"></div>
     *
     *              (for self.images.length * self.thumbnails.iterations)
     *              <div class="gz_thumb_(number) gz_th_nav_thumb">
     *                  <div class="gz_thumb_caption"></div>
     *                  <div class="gz_thumb_border></div>
     *                  <div class="gz_thumb_image"></div>
     *              </div>
     *              (endfor)
     *
     *          </div>
     *
     *          (if self.thumbnails.buttons)
     *          <div class="gz_th_nav_prev gz_button" ></div>
     *          (endif)
     *
     *      </div>
     *  </(self.thumbnails.element)>
     */
    var createThumbnailNavigator = function() {
        var parent = self.th.e;
        $(parent).appendChild($$('div', {class: 'gz_th_nav_wrapper'}));
        var wrapper_attr = {
            class: 'gz_thumbnails',
            style: 'height:'+self.th.height+'px;'+
                   'width:'+$(parent).clientWidth+'px;'+
                   'padding:'+self.th.wrapper_vpadding+'px 0;',
        };
        $('.gz_th_nav_wrapper', parent).appendChild($$('div', wrapper_attr));

        // Create previous button
        if (self.th.buttons) createButton('prev', true);

        var thumbs_attr = {
            class: 'gz_th_nav_thumbs',
            style: 'height:'+$(parent).clientHeight+'px;'+
                   'width:'+self.th.wrapper_width+'px;'+
                   'margin:0 '+self.th.padding+'px;',
        };
        $('.gz_thumbnails', parent).appendChild($$('div', thumbs_attr));

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
            $('.gz_th_nav_thumbs', parent).appendChild($$('div', attr));
        }

        [].forEach.call($(parent).querySelectorAll('.gz_th_nav_action'), function(e) {
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
                class: 'gz_thumb_'+i+' gz_th_nav_thumb',
                style: 'left:'+position+'px;'+
                       'height:'+self.th.height+'px;'+
                       'width:'+self.th.width+'px;',
            };
            $('.gz_th_nav_thumbs', parent).appendChild($$('div', attr));

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
                $('.gz_thumb_'+i, parent).appendChild($$('div', caption_attr));
                var caption = self.th.captions[adjust % self.images.length];
                $('.gz_thumb_'+i+' .gz_thumb_caption', parent).innerHTML = caption;
            }

            var border_attr = {
                class: 'gz_thumb_border',
                style: 'height:'+(self.th.height-2)+'px;'+
                       'width:'+(self.th.width-2)+'px;',
            };
            if (i == 5) border_attr.class += ' fadeIn';
            $('.gz_thumb_'+i, parent).appendChild($$('div', border_attr));

            var thumb = getThumbImage(adjust);
            var thumb_attr = {
                class: 'gz_thumb_image',
                style: 'background: '+self.bg_color+' url('+thumb+') no-repeat 50% 50%;'+
                       'height:'+self.th.height+'px;'+
                       'width:'+self.th.width+'px;',
            };
            $('.gz_thumb_'+i, parent).appendChild($$('div', thumb_attr));
        }

        // Create next button
        if (self.th.buttons) createButton('next', true);
    };

    /**
     * Initializes the indicator navigation element.
     *
     * @example <caption>DOM nodes:</caption>
     *  <(self.indicators.element)>
     *      <div class="gz_indicator_wrapper">
     *
     *          (for self.images.length)
     *          <div class="gz_indicator_(number) gz_indicator"></div>
     *          (endfor)
     *
     *      </div>
     *  </(self.indicators.elements)>
     */
    var createIndicatorNavigator = function() {
        $(self.in.e).appendChild($$('div', {class: 'gz_indicator_wrapper'}));

        var handler = function() {
            changeImage(this.getAttribute('data-image') - getCurrent());
        };

        for (var i = 0; i < self.images.length; i++) {
            var attr = {
                class: 'gz_indicator_'+i+' gz_indicator',
                'data-image': i,
                style: 'width:'+self.in.size_px+'px;'+
                       'height:'+self.in.size_px+'px;'+
                       'margin:'+self.in.vpadding+'px '+self.in.hpadding+'px;'+
                       'background:'+self.in.bg+';'
            };
            if (self.in.round) attr.style += 'border-radius:'+self.in.size_px+'px;';

            $('.gz_indicator_wrapper', self.in.e).appendChild($$('div', attr));

            $('.gz_indicator_'+i, self.in.e).addEventListener('click', handler);

            if (i == getCurrent()) {
                $('.gz_indicator_'+i, self.in.e).style.background = self.in.active_bg;
                $('.gz_indicator_'+i, self.in.e).style.opacity = 1;
            }
        }
    };

    /**
     * Creates the 'prev' and 'next' buttons.
     *
     * @example <caption>DOM nodes:</caption>
     *  <(self.(button).element)>
     *      <div class="gz_(button) gz_button"></div>
     *  </(self.(button).element)>
     *
     * @param {string} button The button to create: 'prev' or 'next'.
     * @param {boolean} nav Whether button appears in thumbnail nav or in free-standing element.
     */
    var createButton = function(button, nav) {
        var image = (button == 'prev') ? self.prev.image : self.next.image;
        var parent, element, button_style;

        if (nav) {
            parent = self.th.e+' .gz_thumbnails';
            element = 'gz_th_nav_'+button;
            button_style = 'line-height:'+(self.th.height-6)+'px;'+
                           'height:'+self.th.height+'px;'+
                           'width:'+self.button_size+'px;'+
                           'font-size:'+self.button_size+'px;'+
                           'color:'+self.th.button_color+';';
        } else {
            parent = (button == 'prev') ? self.prev.e : self.next.e;
            element = 'gz_'+button;
            button_style = 'line-height:'+($(parent).clientHeight-6)+'px;'+
                           'height:'+$(parent).clientHeight+'px;'+
                           'width:'+$(parent).clientWidth+'px;';
        }

        $(parent).appendChild($$('div', {class: element+' gz_button', style: button_style}));

        if (image) {
            var button_img_style = 'background: url('+image+') no-repeat 50% 50%;'+
                                   'background-size: contain;';
            $('.'+element, parent).appendChild($$('div', {style: button_img_style}));
        } else {
            $('.'+element, parent).innerHTML = (button == 'prev') ? self.prev.text : self.next.text;
        }

        $('.'+element, parent).addEventListener('click', function() {
            changeImage((button == 'prev') ? -1 : 1);
        });
    };

    /**
     * Updates the counter element with the current position.
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

        // function to hide '.gz_loading' and call onload()
        var hideLoading = function() {
            var loading = $('.gz_loading', self.g);
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
                if (self.text.e) $(self.text.e).style.visibility = 'visible';
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
     * @param {string} e The element to modify. '.gz_animator' or '.gz_background'.
     */
    var setBackground = function(e) {
        e = $(e, self.g);
        for (var i = 0; i < self.images.length; i++) e.classList.remove('image_'+i);
        e.classList.add('image_'+getCurrent());

        var ratio = self.ratios[getCurrent()];
        var parent_ratio = $(self.g).clientWidth / $(self.g).clientHeight;

        if (self.contain == 'all' ||
            (self.contain == 'landscape' && ratio > 1) ||
            (self.contain == 'portrait' && ratio <= 1) ||
            (self.contain == 'parent' && ratio > 1 && parent_ratio <= 1) ||
            (self.contain == 'parent' && ratio <= 1 && parent_ratio > 1)
           ) {
            e.classList.remove('gz_cover');
            e.classList.add('gz_contain');
        } else {
            e.classList.remove('gz_contain');
            e.classList.add('gz_cover');
        }
    };

    /**
     * Attaches a URL to the '.gz_click' element above the image.
     */
    var setLink = function() {
        var click = $('.gz_click', self.g);
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
        [].forEach.call($(self.th.e).querySelectorAll('.gz_th_nav_thumb'), function(e) {
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
                if (offset <= 2 && offset >= -2)
                    e.classList.add('gz_thumb_transition');
                else
                    e.classList.remove('gz_thumb_transition');
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
     * Updates the indicator navigation.
     */
    var updateIndicators = function() {
        [].forEach.call($(self.in.e).querySelectorAll('.gz_indicator'), function(e) {
            e.style.background = self.in.bg;
            e.style.opacity = self.in.opacity;
        });
        var current = $('.gz_indicator_'+getCurrent(), self.in.e);
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
            var loading = $('.gz_loading', self.g);
            loading.classList.remove('fadeInHalf');
            self.loading_timeout = setTimeout(function() {
                loading.style['z-index'] = 96;
                loading.classList.add('fadeInHalf');
            }, 500);
        }

        loadImage(0, function() {
            if (self.auto) clearTimeout(self.timeout);
            setBackground('.gz_background');

            // Delay the animation by a small amount to prevent flickering
            // while the background is set
            setTimeout(function() {
                // Animate gallery
                $('.gz_animator', self.g).classList.add('fadeOut');
                setTimeout(function() {
                    setBackground('.gz_animator');
                    $('.gz_animator', self.g).classList.remove('fadeOut');
                    updateCounter();
                    if (self.links) setLink();
                    self.active = false;
                    self.remaining = self.delay;
                    if (!self.hover) startTimer();
                    loadImage(1);
                }, self.fade + 100);

                // Update thumbnails and indicators if they are showing
                if (self.th.e) adjustThumbs(offset);
                if (!self.th.e && self.in.e) updateIndicators();

                // Animate text
                if (self.text.items && self.text.e) {
                    var text = $('.gz_text_inner', self.text.e);
                    var animateText = function() {
                        text.innerHTML = self.text.items[getCurrent()];
                        text.classList.remove('fadeOutQuick');
                        text.classList.add('fadeInQuick');
                    };
                    text.classList.add('fadeOutQuick');
                    setTimeout(animateText, self.fade / 2);
                }
            }, 50);
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
