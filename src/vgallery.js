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
     * vg.init initializes the class parameters
     */
    vg.init = function() {
        var c = config;

        // Show errors for missing required configuration options
        if (c.gallery === undefined)    vg.log('gallery_missing');
        if (c.images === undefined)     vg.log('images_missing');

        // Grab configuration options or set default values
        vg.gallery      = (c.gallery !== undefined)         ? c.gallery         : null;
        vg.images       = (c.images !== undefined)          ? c.images          : null;
        vg.thumbs       = (c.thumbs !== undefined)          ? c.thumbs          : null;
        vg.nav          = (c.nav !== undefined)             ? c.nav             : null;
        vg.nav_buttons  = (c.nav_buttons !== undefined)     ? c.nav_buttons     : true;
        vg.prev         = (c.prev !== undefined)            ? c.prev            : null;
        vg.next         = (c.next !== undefined)            ? c.next            : null;
        vg.prev_text    = (c.prev_text !== undefined)       ? c.prev_text       : '&laquo;';
        vg.next_text    = (c.next_text !== undefined)       ? c.next_text       : '&raquo;';
        vg.prev_image   = (c.prev_image !== undefined)      ? c.prev_image      : null;
        vg.next_image   = (c.next_image !== undefined)      ? c.next_image      : null;
        vg.captions     = (c.captions !== undefined)        ? c.captions        : null;
        vg.links        = (c.links !== undefined)           ? c.links           : null;
        vg.text         = (c.text !== undefined)            ? c.text            : null;
        vg.text_element = (c.text_element !== undefined)    ? c.text_element    : null;
        vg.auto         = (c.auto !== undefined)            ? c.auto            : true;
        vg.delay        = (c.delay !== undefined)           ? c.delay           : 5000;
        vg.fade         = (c.fade !== undefined)            ? c.fade            : 1000;
        vg.bg_color     = (c.bg_color !== undefined)        ? c.bg_color        : '#FFF';
        vg.button_color = (c.button_color !== undefined)    ? c.button_color    : '#000';
        vg.active_color = (c.active_color !== undefined)    ? c.active_color    : '#000';
        vg.contain      = (c.contain !== undefined)         ? c.contain         : 'none';

        // Check that other configuration arrays have same length as images array
        if (vg.thumbs && vg.images.length != vg.thumbs.length)       vg.log('thumbs_count');
        if (vg.links && vg.images.length != vg.links.length)         vg.log('links_count');
        if (vg.captions && vg.images.length != vg.captions.length)   vg.log('captions_count');

        // Check that gallery and nav elements have a height and width greater than zero
        if ($(vg.gallery).height() === 0 || $(vg.gallery).width() === 0)     vg.log('gallery_size');
        if (vg.nav && ($(vg.nav).height() === 0 || $(vg.nav).width() === 0)) vg.log('nav_size');

        vg.active = false;
        vg.current = vg.images.length * 10000; // High number so we will never go below 0
        vg.preload = Array();
        vg.ratios = Array();

        // Thumbnail navigator shows 5 images, so make sure we have enough in the rotation
        // that user never sees a blank thumbnail
        var iterations_array = {4:3, 3:4, 2:5, 1:10};
        if (iterations_array[vg.images.length])
            vg.thumb_iterations = iterations_array[vg.images.length];
        else
            vg.thumb_iterations = (vg.images.length > 10) ? 1 : 2;

        vg.computeThumbSize();
    };

    /**
     * vg.computeThumbSize calculates the size and position of thumbnails based on the nav element
     */
    vg.computeThumbSize = function() {
        // Calculate thumbnail size and padding based on how large the nav element is
        vg.thumb_hpadding = Math.round($(vg.nav).width() * 0.015);
        vg.thumb_vpadding = Math.round($(vg.nav).width() * 0.01);

        vg.thumb_height = Math.round($(vg.nav).height() - (vg.thumb_vpadding * 2));

        // Calculate button size
        vg.button_size = (vg.thumb_height > 60) ? 40 : (vg.thumb_height > 50) ? 30 : 20;

        vg.thumbs_wrapper_width = $(vg.nav).width() - (vg.thumb_hpadding * 2);
        if (vg.nav_buttons) vg.thumbs_wrapper_width = vg.thumbs_wrapper_width - vg.button_size * 2;
        vg.thumb_width = Math.round((vg.thumbs_wrapper_width - (vg.thumb_hpadding * 4)) / 5);
        vg.nav_wrapper_padding = ($(vg.nav).height() - vg.thumb_height) / 2;

        // Calculate position of thumbnails
        vg.thumb_offset = vg.thumb_width + vg.thumb_hpadding;
        vg.thumb_most_left = 3 * vg.thumb_offset * -1;
        vg.thumb_most_right = (vg.images.length * vg.thumb_iterations - 3) * vg.thumb_offset;
        vg.thumb_wrap = Math.abs(vg.thumb_most_left) + vg.thumb_most_right;
    };

    /**
     * vg.start is used to initialize the gallery and navigation elements
     * and start the rotation timer.
     */
    vg.start = function() {
        vg.active = true;

        vg.insertCSS();
        vg.createGallery();
        if (vg.nav) vg.createNavigator();
        if (vg.prev) vg.createButton('prev', false);
        if (vg.next) vg.createButton('next', false);
        if (vg.text && vg.text_element) vg.createText();

        vg.loadImage(0, function() {
            vg.setGallery();
            vg.active = false;
            if (vg.auto) vg.timeout = setTimeout(function(){vg.changeImage(1);}, vg.delay);
            vg.loadImage(1);
        });

        // Listen for window resizing. Nav elements need to be adjusted after
        var resize_timeout = false;
        $(window).resize(function() {
            if (resize_timeout) clearTimeout(resize_timeout);
            resize_timeout = setTimeout(function() {
                vg.setBackground('#vg_animator');

                if (vg.nav) {
                    vg.computeThumbSize();
                    $('#vg_navigator_wrapper').remove();
                    vg.createNavigator();
                }

                if (vg.prev) {
                    $('#vg_prev').remove();
                    vg.createButton('prev', false);
                }

                if (vg.next) {
                    $('#vg_next').remove();
                    vg.createButton('next', false);
                }
            }, 50);
        });
    };

    /**
     * vg.log displays a message to the Javascript console
     *
     * @param value Key of message to display.
     */
    vg.log = function(value) {
        var values = value.split('_');

        switch (values[1]) {
            case 'missing':
                console.error("vGallery.js: '%s' is missing from the class "+
                              "initialization. Please add it.", values[0]);
                break;
            case 'count':
                console.warn("vGallery.js: Number of %s does not equal number of "+
                             "images. This will cause unintended consequences.", values[0]);
                break;
            case 'size':
                console.warn("vGallery.js: %s element has a height or width of 0. "+
                             "This will cause nothing to show.", values[0]);
        }
    };

    /**
     * vg.insertCSS inserts the CSS rules into the DOM. This is so we don't have to
     * distribute a static CSS file.
     */
    vg.insertCSS = function() {
        $("<style>").prop("type", "text/css").html(
            "#vg_wrapper {position:relative;width:100%;height:100%;}"+
            "#vg_click {z-index:93;display:block;position:absolute;top:0;left:0;width:100%;"+
                "height:100%;}"+
            "#vg_animator {z-index:95;position:absolute;top:0px;left:0px;width:100%;height:100%;}"+
            "#vg_background {z-index:94;position:absolute;top:0px;left:0px;width:100%;"+
                "height:100%;}"+
            ".vg_cover {background-size:cover !important;}"+
            ".vg_contain {background-size:contain !important;}"+
            "#vg_navigator_wrapper {position:absolute;right:50%;}"+
            "#vg_navigator {z-index:97;position:relative;left:50%;}"+
            "#vg_prev, #vg_next {z-index:97;color:#FFF;}"+
            "#vg_navigator_prev, #vg_navigator_next {float:left;color:#000;}"+
            ".vg_button {position:relative;cursor:pointer;text-align:center;}"+
            ".vg_button > div {height:100%;width:100%;}"+
            "#vg_navigator_thumbs {position:relative;float:left;overflow:hidden;}"+
            ".vg_navigator_action {z-index:99;position:absolute;cursor:pointer;}"+
            ".vg_navigator_thumb {z-index:98;position:absolute;top:0;overflow:hidden;}"+
            ".vg_thumb_caption {z-index:98;position:absolute;bottom:0px;width:100%;color:#FFF;"+
                "font-weight:bold;background:#000;background:rgba(0,0,0,0.7);text-align:center;}"+
            ".vg_thumb_border {z-index:99;position:absolute;opacity:0;}"
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
        $('<div/>', {id: 'vg_text_inner'} ).appendTo(vg.text_element);
        $('#vg_text_inner').html(vg.text[vg.current % vg.images.length]);
    };

    /**
     * vg.createNavigator initializes the navigation element.
     */
    vg.createNavigator = function() {
        $('<div/>', {id: 'vg_navigator_wrapper'}).appendTo(vg.nav);
        var wrapper_style = 'height:'+vg.thumb_height+'px;'+
                            'width:'+$(vg.nav).width()+'px;'+
                            'padding:'+vg.nav_wrapper_padding+'px 0;';
        $('<div/>', {id: 'vg_navigator', style: wrapper_style}).appendTo('#vg_navigator_wrapper');

        // Create previous button
        if (vg.nav_buttons) vg.createButton('prev', true);

        var thumbs_style = 'height:'+$(vg.nav).height()+'px;'+
                           'width:'+vg.thumbs_wrapper_width+'px;'+
                           'margin:0 '+vg.thumb_hpadding+'px;';
        $('<div/>', {id: 'vg_navigator_thumbs', style: thumbs_style}).appendTo('#vg_navigator');

        // Create clickable placeholders. The thumbnail images will move under these.
        var i, position, prop;
        for (i = -2; i <= 2; i++) {
            var width  = (i === 0) ? vg.thumb_width - 2  : vg.thumb_width;
            var height = (i === 0) ? vg.thumb_height - 2 : vg.thumb_height;

            position = vg.thumb_offset * (i + 2);
            prop = {
                class: 'vg_navigator_action',
                'data-offset': i,
                style: 'left:'+position+'px;'+
                       'height:'+height+'px;'+
                       'width:'+width+'px;',
            };
            if (i === 0) prop.id = 'vg_navigator_current';
            $('<div/>', prop).appendTo('#vg_navigator_thumbs');
        }
        $('.vg_navigator_action').each(function() {
            $(this).click(function() {
                vg.changeImage($(this).data('offset'));
            });
        });

        // Create thumbnail images
        for (i = 0; i < vg.images.length * vg.thumb_iterations; i++) {
            // Need to account for the fact the first image is the 6th (including hidden)
            // shown in the thumbnail rotator
            var adjust = i - 5 + vg.current;

            position = vg.thumb_offset * (i - 3);
            prop = {
                id: 'vg_thumb_'+i,
                class: 'vg_navigator_thumb',
                style: 'left:'+position+'px;'+
                       'height:'+vg.thumb_height+'px;'+
                       'width:'+vg.thumb_width+'px;',
            };
            $('<div/>', prop).appendTo('#vg_navigator_thumbs');

            if (vg.captions) {
                var caption_size  = (vg.thumb_height > 80) ? [18, 11] :
                                    (vg.thumb_height > 60) ? [15, 10] :
                                    (vg.thumb_height > 50) ? [12,  9] :
                                                             [10,  8] ;
                var caption_style = "line-height:"+caption_size[0]+"px;"+
                                    "font-size:"+caption_size[1]+"px;";
                $('<div/>', {class:'vg_thumb_caption', style: caption_style})
                    .appendTo('#vg_thumb_'+i);
                var caption = vg.captions[adjust % vg.images.length];
                $('#vg_thumb_'+i+' .vg_thumb_caption').html(caption);
            }

            var border_style = 'height:'+(vg.thumb_height-2)+'px;'+
                               'width:'+(vg.thumb_width-2)+'px;'+
                               'border:1px solid '+vg.active_color+';';
            if (i == 5) border_style += 'opacity:1;';
            $('<div/>', {class:'vg_thumb_border', style: border_style}).appendTo('#vg_thumb_'+i);

            var thumbnail = vg.getThumbImage(adjust);
            var thumb_style = 'background: '+vg.bg_color+' url('+thumbnail+') no-repeat 50% 50%;'+
                              'background-size: cover;'+
                              'height:'+vg.thumb_height+'px;'+
                              'width:'+vg.thumb_width+'px;';
            $('<div/>', {class:'vg_thumb_image', style: thumb_style}).appendTo('#vg_thumb_'+i);
        }

        // Create next button
        if (vg.nav_buttons) vg.createButton('next', true);
    };

    /**
     * vg.createButton creates the 'prev' and 'next' buttons
     *
     * @param button The button to create: 'prev' or 'next'.
     * @param nav Whether button appears in nav or in free-standing element
     */
    vg.createButton = function(button, nav) {
        var image = (button == 'prev') ? vg.prev_image : vg.next_image;
        var parent, element, button_style;

        if (nav) {
            parent = '#vg_navigator';
            element = 'vg_navigator_'+button;
            button_style = 'line-height:'+(vg.thumb_height-6)+'px;'+
                           'height:'+vg.thumb_height+'px;'+
                           'width:'+vg.button_size+'px;'+
                           'font-size:'+vg.button_size+'px;';
        } else {
            parent = (button == 'prev') ? vg.prev : vg.next;
            element = 'vg_'+button;
            button_style = 'line-height:'+($(parent).height()-6)+'px;'+
                           'height:'+$(parent).height()+'px;'+
                           'width:'+$(parent).width()+'px;';
        }
        if (!image)
            button_style += 'color:'+vg.button_color+';';

        $('<div/>', {id: element, class: 'vg_button', style: button_style})
            .appendTo(parent);

        if (image) {
            var button_img_style = 'background: url('+image+') no-repeat 50% 50%;'+
                                   'background-size: contain;';
            $('<div/>', {style: button_img_style}).appendTo('#'+element);
        } else {
            $('#'+element).html((button == 'prev') ? vg.prev_text : vg.next_text);
        }

        $('#'+element).click(function() {
            vg.changeImage((button == 'prev') ? -1 : 1);
        });
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
        if (vg.thumbs)
            return vg.thumbs[image % vg.images.length];
        else
            return vg.images[image % vg.images.length];
    };

    /**
     * vg.loadImage loads an image if it hasn't been loaded, then calls the onload function.
     *
     * @param offset The offset from the current image to preload
     * @param onload A function to call after image has loaded
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
                if (onload) onload();
            };
            image.onerror = function() {
                if (onload) onload();
            };
        } else {
            if (onload) onload();
        }
    };

    /**
     * vg.setBackground sets the css background property and cover/contain class
     * for the given element
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
     * vg.setLink attaches a URL to the #vg_click element above the image
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
     * vg.adjustThumb adjusts the position of thumbnails by the given offset
     *
     * @param e The thumbnail element to adjust.
     * @param offset The offset to adjust the thumbnail element by.
     */
    vg.adjustThumb = function(e, offset) {
        var origin = parseInt($(e).css('left').replace('px', ''));
        var destination = origin + (vg.thumb_offset * offset * -1);
        var position;

        if (destination < vg.thumb_most_left) {
            position = destination + vg.thumb_wrap;
            $(e).css('left', position+'px');
        } else if (destination > vg.thumb_most_right) {
            position = destination - vg.thumb_wrap;
            $(e).css('left', position+'px');
        } else {
            $(e).animate({left: destination+'px'}, vg.fade);
        }

        if (destination == vg.thumb_offset * 2)
            $(e).children('.vg_thumb_border').animate({opacity: 1}, vg.fade);
        else if (origin == vg.thumb_offset * 2)
            $(e).children('.vg_thumb_border').animate({opacity: 0}, vg.fade);
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

        vg.loadImage(0, function() {
            if (vg.auto) clearTimeout(vg.timeout);
            vg.setBackground('#vg_background');

            $('#vg_animator').animate({opacity: 0}, vg.fade, function() {
                vg.setBackground(this);
            }).animate({opacity: 1}, 200, function() {
                if (vg.links) vg.setLink();
                vg.active = false;
                if (vg.auto) vg.timeout = setTimeout(function(){vg.changeImage(1);}, vg.delay);
                vg.loadImage(1);
            });

            if (vg.nav) {
                $('.vg_navigator_thumb').each(function() {
                    vg.adjustThumb(this, offset);
                });
            }

            if (vg.text && vg.text_element) {
                $('#vg_text_inner').animate({opacity: 0}, vg.fade / 2, function() {
                    $('#vg_text_inner').html(vg.text[vg.current % vg.images.length]);
                }).animate({opacity: 1}, vg.fade / 2);
            }
        });
    };

    // Initialize the class parameters
    vg.init();
};
