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

/* exported vGallery */
var vGallery = function(config) {
    var vg = this;

    /**
     * vg.init initializes the class.
     */
    vg.init = function() {
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
        for (var d in defaults) vg[d] = defaults[d];

        // Grab configuration values
        for (var c in config) {
            if (typeof config[c] != 'object' || config[c] instanceof Array)
                vg[c] = config[c];
            else if (vg[c]) {
                for (var a in config[c]) {
                    vg[c][a] = config[c][a];
                }
            }
        }

        // Rename thumbnails and indicators to save space
        vg.th = vg.thumbnails;
        vg.in = vg.indicators;

        // Show errors for missing required configuration options
        if (vg.gallery === null)    vg.log('gallery:missing');
        if (vg.images === null)     vg.log('images:missing');

        // Check that other configuration arrays have same length as images array
        if (vg.th.images && vg.images.length != vg.th.images.length)
            vg.log('thumbnails.images:count');
        if (vg.links && vg.images.length != vg.links.length)
            vg.log('links:count');
        if (vg.th.captions && vg.images.length != vg.th.captions.length)
            vg.log('thumbnails.captions:count');

        vg.active = vg.hover = false;
        vg.current = vg.images.length * 10000; // High number so we will never go below 0
        vg.preload = Array();
        vg.ratios = Array();
        vg.remaining = vg.delay;

        // Thumbnail navigator shows 5 images, so make sure we have enough in the rotation
        // that user never sees a blank thumbnail
        var iterations_array = {4:3, 3:4, 2:5, 1:10};
        if (iterations_array[vg.images.length])
            vg.th.iterations = iterations_array[vg.images.length];
        else
            vg.th.iterations = (vg.images.length > 10) ? 1 : 2;

        if (vg.th.element) vg.computeThumbSize();
        if (!vg.th.element && vg.in.element) vg.computeIndicatorSize();
    };

    /**
     * vg.computeThumbSize calculates the size and position of thumbnails based on the
     * thumbnail element.
     */
    vg.computeThumbSize = function() {
        var e = $(vg.th.element);

        // Calculate thumbnail size and padding based on how large the thumbnail element is
        vg.th.hpadding = Math.round(e.width() * 0.015);
        vg.th.vpadding = Math.round(e.width() * 0.01);

        vg.th.height = Math.round(e.height() - (vg.th.vpadding * 2));

        // Calculate button size
        vg.button_size = (vg.th.height > 60) ? 30 : (vg.th.height > 50) ? 25 : 20;

        vg.th.wrapper_width = e.width() - (vg.th.hpadding * 2);
        if (vg.th.buttons) vg.th.wrapper_width = vg.th.wrapper_width - vg.button_size * 2;
        vg.th.width = Math.round((vg.th.wrapper_width - (vg.th.hpadding * 4)) / 5);
        vg.th.wrapper_padding = (e.height() - vg.th.height) / 2;

        // Calculate position of thumbnails
        vg.th.offset = vg.th.width + vg.th.hpadding;
        vg.th.most_left = 3 * vg.th.offset * -1;
        vg.th.most_right = (vg.images.length * vg.th.iterations - 3) * vg.th.offset;
        vg.th.wrap = Math.abs(vg.th.most_left) + vg.th.most_right;
    };

    /**
     * vg.computeIndicatorSize calculates the size of indicators based on the
     * indicator element.
     */
    vg.computeIndicatorSize = function() {
        var e = $(vg.in.element);

        // Calculate indicator size and padding based on how large the indicator element is
        vg.in.size = Math.round(e.height() * 0.5);
        vg.in.hpadding = Math.round((e.height() - vg.in.size) / 4);
        vg.in.vpadding = Math.round((e.height() - vg.in.size) / 2);

        // Setup background variables
        vg.in.bg = (vg.in.image) ?
            'url("'+vg.in.image+'") no-repeat 50% 50%' : vg.in.color;
        vg.in.active_bg = (vg.in.aimage) ?
            'url("'+vg.in.aimage+'") no-repeat 50% 50%' : vg.in.acolor;
    };

    /**
     * vg.start is used to initialize the gallery and navigation elements
     * and start the rotation timer.
     */
    vg.start = function() {
        // Check that elements exist
        if ($(vg.gallery).length === 0) vg.log('gallery:exists');
        var elements = ['thumbnails', 'indicators', 'counter', 'prev', 'next', 'text'];
        for (var i = 0; i < elements.length; i++) {
            var e = elements[i];
            if (vg[e] && vg[e].element && $(vg[e].element).length === 0) vg.log(e+':exists');
        }

        // Check that gallery and thumbnail elements have a height and width greater than zero
        if ($(vg.gallery).height() === 0 || $(vg.gallery).width() === 0)
            vg.log('gallery:size');
        if (vg.th.element && ($(vg.th.element).height() === 0 || $(vg.th.element).width() === 0))
            vg.log('thumbnails:size');
        if (vg.in.element && ($(vg.in.element).height() === 0))
            vg.log('indicators:size');

        vg.active = true;

        vg.insertCSS();
        vg.createGallery();
        if (vg.th.element) vg.createThumbnailNavigator();
        if (!vg.th.element && vg.in.element) vg.createIndicatorNavigator();
        if (vg.prev.element) vg.createButton('prev', false);
        if (vg.next.element) vg.createButton('next', false);
        if (vg.text.items && vg.text.element) vg.createText();
        vg.updateCounter();

        vg.loadImage(0, function() {
            vg.setGallery();
            vg.active = false;
            vg.startTimer();
            vg.loadImage(1);
        });

        // Listen for window resizing. Nav elements need to be adjusted after
        var resize_timeout = false;
        $(window).resize(function() {
            if (resize_timeout) clearTimeout(resize_timeout);
            resize_timeout = setTimeout(function() {
                vg.setBackground('#vg_animator');

                if (vg.th.element) {
                    vg.computeThumbSize();
                    $('#vg_th_nav_wrapper').remove();
                    vg.createThumbnailNavigator();
                }

                if (!vg.th.element && vg.in.element) {
                    vg.computeIndicatorSize();
                    $('#vg_indicator_wrapper').remove();
                    vg.createIndicatorNavigator();
                }

                if (vg.prev.element) {
                    $('#vg_prev').remove();
                    vg.createButton('prev', false);
                }

                if (vg.next.element) {
                    $('#vg_next').remove();
                    vg.createButton('next', false);
                }
            }, 50);
        });

        if (vg.auto && vg.pause) {
            $(vg.gallery).hover(function() {
                vg.hover = true;
                vg.remaining -= new Date() - vg.timeoutStart;
                clearTimeout(vg.timeout);
            }, function() {
                vg.hover = false;
                vg.startTimer(vg.remaining);
            });
        }
    };

    /**
     * vg.startTimer starts the countdown until the gallery rotates
     *
     * @param delay The time in milliseconds to count down.
     */
    vg.startTimer = function(delay) {
        if (vg.auto) {
            clearTimeout(vg.timeout);
            vg.timeoutStart = new Date();
            vg.timeout = setTimeout(function(){vg.changeImage(1);}, (delay) ? delay : vg.delay);
        }
    };

    /**
     * vg.log displays a message to the Javascript console.
     *
     * @param value Key of message to display.
     */
    vg.log = function(value) {
        var values = value.split(':');

        switch (values[1]) {
            case 'missing':
                console.error("vGallery.js: '%s' is missing from the configuration. "+
                              "Please add it.", values[0]);
                break;
            case 'exists':
                console.error("vGallery.js: %s element does not exist. ", values[0]);
                break;
            case 'count':
                console.warn("vGallery.js: Number of %s does not equal number of "+
                             "images. This will cause unintended consequences.", values[0]);
                break;
            case 'size':
                console.warn("vGallery.js: %s element has a height or width of 0. "+
                             "This will cause nothing to show.", values[0]);
                break;
        }
    };

    /**
     * vg.insertCSS inserts the CSS rules into the DOM. This is so we don't have to
     * distribute a static CSS file.
     */
    vg.insertCSS = function() {
        $("<style>").prop("type", "text/css").html(
            "#vg_wrapper {position:relative;width:100%;height:100%;}"+
            "#vg_click {z-index:93;display:block;position:absolute;width:100%;height:100%;}"+
            "#vg_animator {z-index:95;position:absolute;width:100%;height:100%;}"+
            "#vg_background {z-index:94;position:absolute;width:100%;height:100%;}"+
            "#vg_loading {z-index:96;position:absolute;width:100%;height:100%;}"+
            ".vg_cover {background-size:cover !important;}"+
            ".vg_contain {background-size:contain !important;}"+
            "#vg_th_nav_wrapper {position:absolute;right:50%;}"+
            "#vg_thumbnails {z-index:97;position:relative;left:50%;}"+
            "#vg_prev, #vg_next {z-index:97;color:#FFF;}"+
            "#vg_th_nav_prev, #vg_th_nav_next {float:left;color:#000;}"+
            ".vg_button {position:relative;cursor:pointer;text-align:center;}"+
            ".vg_button > div {height:100%;width:100%;}"+
            "#vg_th_nav_thumbs {position:relative;float:left;overflow:hidden;}"+
            ".vg_th_nav_action {z-index:99;position:absolute;cursor:pointer;}"+
            ".vg_th_nav_thumb {z-index:98;position:absolute;top:0;overflow:hidden;}"+
            ".vg_thumb_caption {z-index:98;position:absolute;bottom:0px;width:100%;color:#FFF;"+
                "font-weight:bold;background:#000;background:rgba(0,0,0,0.7);text-align:center;}"+
            ".vg_thumb_border {z-index:99;position:absolute;opacity:0;}"+
            "#vg_indicator_wrapper {z-index:97;position:relative;}"+
            ".vg_indicator {float:left;cursor:pointer;background-size:contain !important;}"
        ).appendTo("head");
    };

    /**
     * vg.createGallery initializes the gallery element.
     */
    vg.createGallery = function() {
        $('<div/>', {id: 'vg_wrapper'}     ).appendTo(vg.gallery);
        $('<a/>',   {id: 'vg_click'}       ).appendTo('#vg_wrapper');
        $('<div/>', {id: 'vg_animator'}    ).appendTo('#vg_wrapper');
        $('<div/>', {id: 'vg_background'}  ).appendTo('#vg_wrapper');

        $('#vg_background').css('background', vg.bg_color);

        if (vg.loading.image) {
            $('<div />', {id: 'vg_loading'}).appendTo('#vg_wrapper');
            $('#vg_loading').css('opacity', 0)
                .css('background', vg.bg_color+' url("'+ vg.loading.image+'") no-repeat 50% 50%')
                .animate({opacity: 1}, vg.fade);
        }
    };

    /**
     * vg.setGallery preloads the first image.
     */
    vg.setGallery = function() {
        vg.setBackground('#vg_animator');
        vg.setBackground('#vg_background');
        if (vg.links) vg.setLink();
    };

    /**
     * vg.createText creates the initializes the text element.
     */
    vg.createText = function() {
        // Hide text element. We will display it when the first image loads.
        if (vg.loading.image) $(vg.text.element).css('visibility', 'hidden');

        $('<div/>', {id: 'vg_text_inner'} ).appendTo(vg.text.element);
        $('#vg_text_inner').html(vg.text.items[vg.current % vg.images.length]);
    };

    /**
     * vg.createThumbnailNavigator initializes the thumbnail navigation element.
     */
    vg.createThumbnailNavigator = function() {
        $('<div/>', {id: 'vg_th_nav_wrapper'}).appendTo(vg.th.element);
        var wrapper_style = 'height:'+vg.th.height+'px;'+
                            'width:'+$(vg.th.element).width()+'px;'+
                            'padding:'+vg.th.wrapper_padding+'px 0;';
        $('<div/>', {id: 'vg_thumbnails', style: wrapper_style}).appendTo('#vg_th_nav_wrapper');

        // Create previous button
        if (vg.th.buttons) vg.createButton('prev', true);

        var thumbs_style = 'height:'+$(vg.th.element).height()+'px;'+
                           'width:'+vg.th.wrapper_width+'px;'+
                           'margin:0 '+vg.th.hpadding+'px;';
        $('<div/>', {id: 'vg_th_nav_thumbs', style: thumbs_style}).appendTo('#vg_thumbnails');

        // Create clickable placeholders. The thumbnail images will move under these.
        var i, position, prop;
        for (i = -2; i <= 2; i++) {
            var width  = (i === 0) ? vg.th.width - 2  : vg.th.width;
            var height = (i === 0) ? vg.th.height - 2 : vg.th.height;

            position = vg.th.offset * (i + 2);
            prop = {
                class: 'vg_th_nav_action',
                'data-offset': i,
                style: 'left:'+position+'px;'+
                       'height:'+height+'px;'+
                       'width:'+width+'px;',
            };
            if (i === 0) prop.id = 'vg_th_nav_current';
            $('<div/>', prop).appendTo('#vg_th_nav_thumbs');
        }
        $('.vg_th_nav_action').each(function() {
            $(this).click(function() {
                vg.changeImage($(this).data('offset'));
            });
        });

        // Create thumbnail images
        for (i = 0; i < vg.images.length * vg.th.iterations; i++) {
            // Need to account for the fact the first image is the 6th (including hidden)
            // shown in the thumbnail rotator
            var adjust = i - 5 + vg.current;

            position = vg.th.offset * (i - 3);
            prop = {
                id: 'vg_thumb_'+i,
                class: 'vg_th_nav_thumb',
                style: 'left:'+position+'px;'+
                       'height:'+vg.th.height+'px;'+
                       'width:'+vg.th.width+'px;',
            };
            $('<div/>', prop).appendTo('#vg_th_nav_thumbs');

            if (vg.th.captions) {
                var caption_size  = (vg.th.height > 80) ? [18, 11] :
                                    (vg.th.height > 60) ? [15, 10] :
                                    (vg.th.height > 50) ? [12,  9] :
                                                          [10,  8] ;
                var caption_style = "line-height:"+caption_size[0]+"px;"+
                                    "font-size:"+caption_size[1]+"px;";
                $('<div/>', {class: 'vg_thumb_caption', style: caption_style})
                    .appendTo('#vg_thumb_'+i);
                var caption = vg.th.captions[adjust % vg.images.length];
                $('#vg_thumb_'+i+' .vg_thumb_caption').html(caption);
            }

            var border_style = 'height:'+(vg.th.height-2)+'px;'+
                               'width:'+(vg.th.width-2)+'px;'+
                               'border:1px solid '+vg.th.active_color+';';
            if (i == 5) border_style += 'opacity:1;';
            $('<div/>', {class: 'vg_thumb_border', style: border_style}).appendTo('#vg_thumb_'+i);

            var thumb = vg.getThumbImage(adjust);
            var thumb_style = 'background: '+vg.bg_color+' url('+thumb+') no-repeat 50% 50%;'+
                              'background-size: cover;'+
                              'height:'+vg.th.height+'px;'+
                              'width:'+vg.th.width+'px;';
            $('<div/>', {class: 'vg_thumb_image', style: thumb_style}).appendTo('#vg_thumb_'+i);
        }

        // Create next button
        if (vg.th.buttons) vg.createButton('next', true);
    };

    /**
     * vg.createIndicatorNavigator initializes the indicator navigation element.
     */
    vg.createIndicatorNavigator = function() {
        $('<div/>', {id: 'vg_indicator_wrapper'}).appendTo(vg.in.element);

        var handler = function() {
            vg.changeImage($(this).data('image') - (vg.current % vg.images.length));
        };

        for (var i = 0; i < vg.images.length; i++) {
            var prop = {
                id: 'vg_indicator_'+i,
                class: 'vg_indicator',
                'data-image': i,
                style: 'width:'+vg.in.size+'px;'+
                       'height:'+vg.in.size+'px;'+
                       'margin:'+vg.in.vpadding+'px '+vg.in.hpadding+'px;'+
                       'background:'+vg.in.bg+';'+
                       'opacity:'+vg.in.opacity+';'
            };
            if (vg.in.round) prop.style += 'border-radius:'+vg.in.size+'px;';

            $('<div/>', prop).appendTo('#vg_indicator_wrapper');

            $('#vg_indicator_'+i).click(handler);

            if (i == vg.current % vg.images.length)
                $('#vg_indicator_'+i).css('background', vg.in.active_bg).css('opacity', 1);
        }
    };

    /**
     * vg.createButton creates the 'prev' and 'next' buttons.
     *
     * @param button The button to create: 'prev' or 'next'.
     * @param nav Whether button appears in thumbnail nav or in free-standing element.
     */
    vg.createButton = function(button, nav) {
        var image = (button == 'prev') ? vg.prev.image : vg.next.image;
        var parent, element, button_style;

        if (nav) {
            parent = '#vg_thumbnails';
            element = 'vg_th_nav_'+button;
            button_style = 'line-height:'+(vg.th.height-6)+'px;'+
                           'height:'+vg.th.height+'px;'+
                           'width:'+vg.button_size+'px;'+
                           'font-size:'+vg.button_size+'px;'+
                           'color:'+vg.th.button_color+';';
        } else {
            parent = (button == 'prev') ? vg.prev.element : vg.next.element;
            element = 'vg_'+button;
            button_style = 'line-height:'+($(parent).height()-6)+'px;'+
                           'height:'+$(parent).height()+'px;'+
                           'width:'+$(parent).width()+'px;';
        }

        $('<div/>', {id: element, class: 'vg_button', style: button_style})
            .appendTo(parent);

        if (image) {
            var button_img_style = 'background: url('+image+') no-repeat 50% 50%;'+
                                   'background-size: contain;';
            $('<div/>', {style: button_img_style}).appendTo('#'+element);
        } else {
            $('#'+element).html((button == 'prev') ? vg.prev.text : vg.next.text);
        }

        $('#'+element).click(function() {
            vg.changeImage((button == 'prev') ? -1 : 1);
        });
    };

    /**
     * vg.updateCounter updates the counter element with the current position
     */
    vg.updateCounter = function() {
        if (vg.counter.element)
            $(vg.counter.element).html((vg.current % vg.images.length + 1)+
                                       vg.counter.separator+vg.images.length);
    };

    /**
     * vg.getImage returns a given image from the image array.
     *
     * @param image Image to fetch, defaults to vg.current.
     */
    vg.getImage = function(image) {
        if (!image) image = vg.current;
        return vg.images[image % vg.images.length];
    };

    /**
     * vg.getThumbImage returns a given thumbnail image if provided, or the full image.
     *
     * @param image Image to fetch, defaults to vg.current.
     */
    vg.getThumbImage = function(image) {
        if (!image) image = vg.current;
        if (vg.th.images)
            return vg.th.images[image % vg.images.length];
        else
            return vg.images[image % vg.images.length];
    };

    /**
     * vg.loadImage loads an image if it hasn't been loaded, then calls the onload function.
     *
     * @param offset The offset from the current image to preload.
     * @param onload A function to call after image has loaded.
     */
    vg.loadImage = function(offset, onload) {
        var imgSrc = vg.getImage(vg.current + offset);

        // Check if image has already been loaded
        if (vg.preload.indexOf(imgSrc) == -1) {
            var image = new Image();
            image.src = imgSrc;
            image.onload = function() {
                vg.preload.push(imgSrc);
                vg.ratios[vg.images.indexOf(imgSrc)] = this.width / this.height;
                $(vg.text.element).css('visibility', 'visible');
                $('#vg_loading').css('z-index', 0).css('opacity', 1);
                if (onload) onload();
            };
            image.onerror = function() {
                if (onload) onload();
                console.error("vGallery.js: '%s' not found.", imgSrc);
            };
        } else {
            $('#vg_loading').css('z-index', 0).css('opacity', 1);
            if (onload) onload();
        }
    };

    /**
     * vg.setBackground sets the css background property and cover/contain class
     * for the given element.
     *
     * @param e The element to modify.
     */
    vg.setBackground = function(e) {
        var background = vg.bg_color+' url('+vg.getImage()+') no-repeat 50% 50%';
        $(e).css('background', background);

        var ratio = vg.ratios[vg.current % vg.images.length];
        var parent_ratio = $(vg.gallery).width() / $(vg.gallery).height();

        if (vg.contain == 'all' ||
            (vg.contain == 'landscape' && ratio > 1) ||
            (vg.contain == 'portrait' && ratio <= 1) ||
            (vg.contain == 'parent' && ratio > 1 && parent_ratio <= 1) ||
            (vg.contain == 'parent' && ratio <= 1 && parent_ratio > 1)
           ) {
            $(e).removeClass('vg_cover').addClass('vg_contain');
        } else {
            $(e).removeClass('vg_contain').addClass('vg_cover');
        }
    };

    /**
     * vg.setLink attaches a URL to the #vg_click element above the image.
     */
    vg.setLink = function() {
        var link = vg.links[vg.current % vg.images.length];
        if (link) {
            $('#vg_click').css('cursor','pointer').css('z-index', 96).attr('href', link);
        } else {
            $('#vg_click').css('cursor','default').css('z-index', 93).attr('href','#');
        }
    };

    /**
     * vg.adjustThumb adjusts the position of thumbnails by the given offset.
     *
     * @param e The thumbnail element to adjust.
     * @param offset The offset to adjust the thumbnail element by.
     */
    vg.adjustThumb = function(e, offset) {
        var origin = parseInt($(e).css('left').replace('px', ''));
        var destination = origin + (vg.th.offset * offset * -1);
        var position;

        if (destination < vg.th.most_left) {
            position = destination + vg.th.wrap;
            $(e).css('left', position+'px');
        } else if (destination > vg.th.most_right) {
            position = destination - vg.th.wrap;
            $(e).css('left', position+'px');
        } else {
            $(e).animate({left: destination+'px'}, vg.fade);
        }

        if (destination == vg.th.offset * 2)
            $(e).children('.vg_thumb_border').animate({opacity: 1}, vg.fade);
        else if (origin == vg.th.offset * 2)
            $(e).children('.vg_thumb_border').animate({opacity: 0}, vg.fade);
    };

    /**
     * vg.updateIndicators updates the indicator navigation
     */
    vg.updateIndicators = function() {
        $('.vg_indicator').each(function() {
            $(this).css('background', vg.in.bg).css('opacity', vg.in.opacity);
        });
        $('#vg_indicator_'+(vg.current % vg.images.length))
            .css('background', vg.in.active_bg).css('opacity', 1);
    };

    /**
     * vg.changeImage is where the real action occurs. This animates the transition.
     *
     * @param offset The image offset to adjust to. Positive for forward in the
     *            image array and negative for backwards.
     */
    vg.changeImage = function(offset) {
        // Don't allow image to change if animation is occuring or no offset
        if (vg.active || offset === 0) return;

        vg.active = true;
        vg.current = vg.current + offset;

        if (vg.loading.all) $('#vg_loading').css('opacity', 0).css('z-index', 96)
                                            .animate({opacity: 0.5}, vg.fade);

        vg.loadImage(0, function() {
            if (vg.auto) clearTimeout(vg.timeout);
            vg.setBackground('#vg_background');

            $('#vg_animator').animate({opacity: 0}, vg.fade, function() {
                vg.setBackground(this);
                vg.updateCounter();
            }).animate({opacity: 1}, 200, function() {
                if (vg.links) vg.setLink();
                vg.active = false;
                vg.remaining = vg.delay;
                if (!vg.hover) vg.startTimer();
                vg.loadImage(1);
            });

            if (vg.th.element) {
                $('.vg_th_nav_thumb').each(function() {
                    vg.adjustThumb(this, offset);
                });
            }

            if (!vg.th.element && vg.in.element) vg.updateIndicators();

            if (vg.text.items && vg.text.element) {
                $('#vg_text_inner').animate({opacity: 0}, vg.fade / 2, function() {
                    $('#vg_text_inner').html(vg.text.items[vg.current % vg.images.length]);
                }).animate({opacity: 1}, vg.fade / 2);
            }
        });
    };

    vg.init();
};
